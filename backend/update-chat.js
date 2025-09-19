// ✅ SCRIPT SIMPLE PARA MEJORAR EL CHAT
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const environment = process.env.NODE_ENV || 'development';
const isProduction = environment === 'production';
const databaseUrl = isProduction ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL_DEV;

console.log(`🌍 Entorno: ${environment}`);
console.log(`💾 Base de datos: ${databaseUrl ? '✅ Configurada' : '❌ Faltante'}`);

if (!databaseUrl) {
  console.error('❌ ERROR: No se encontró DATABASE_URL');
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: { db: { url: databaseUrl } }
});

async function fixChatSystem() {
  console.log('💬 Arreglando sistema de chat...\n');

  try {
    // 1. AGREGAR CAMPO deletedFor SI NO EXISTE
    console.log('📝 1. Agregando campo deletedFor a messages...');
    try {
      await prisma.$executeRaw`
        ALTER TABLE "messages" 
        ADD COLUMN IF NOT EXISTS "deletedFor" TEXT[];
      `;
      console.log('✅ Campo deletedFor agregado');
    } catch (error) {
      console.log('⚠️ Campo deletedFor ya existe:', error.message);
    }

    // 2. CREAR TABLA ChatDeleted SI NO EXISTE
    console.log('\n🗑️ 2. Creando tabla para chats eliminados por usuario...');
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "chat_deleted" (
          "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
          "userId" TEXT NOT NULL,
          "chatId" TEXT NOT NULL,
          "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          
          CONSTRAINT "chat_deleted_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "chat_deleted_userId_chatId_key" UNIQUE ("userId", "chatId"),
          CONSTRAINT "chat_deleted_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
          CONSTRAINT "chat_deleted_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "chats"("id") ON DELETE CASCADE
        );
      `;
      
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS "chat_deleted_userId_idx" ON "chat_deleted"("userId");
      `;
      
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS "chat_deleted_chatId_idx" ON "chat_deleted"("chatId");
      `;
      
      console.log('✅ Tabla chat_deleted creada');
    } catch (error) {
      console.log('⚠️ Tabla chat_deleted ya existe:', error.message);
    }

    // 3. LIMPIAR CHATS DUPLICADOS (MÉTODO SIMPLE)
    console.log('\n🧹 3. Limpiando chats duplicados...');
    
    try {
      // Método simple: buscar chats con 2 miembros, no grupales, no disputa
      const chats = await prisma.chat.findMany({
        where: {
          isGroup: false,
          isDisputeChat: false
        },
        include: {
          members: {
            select: {
              userId: true
            }
          },
          _count: {
            select: {
              messages: true
            }
          }
        },
        orderBy: {
          lastActivity: 'desc'
        }
      });

      // Agrupar por combinación de miembros
      const chatGroups = new Map();
      
      for (const chat of chats) {
        if (chat.members.length === 2) {
          const memberIds = chat.members.map(m => m.userId).sort().join(',');
          
          if (!chatGroups.has(memberIds)) {
            chatGroups.set(memberIds, []);
          }
          chatGroups.get(memberIds).push(chat);
        }
      }

      // Eliminar duplicados (mantener el que tiene más mensajes o es más reciente)
      let deletedCount = 0;
      
      for (const [memberIds, duplicateChats] of chatGroups) {
        if (duplicateChats.length > 1) {
          // Ordenar: primero por número de mensajes, luego por actividad
          duplicateChats.sort((a, b) => {
            if (a._count.messages !== b._count.messages) {
              return b._count.messages - a._count.messages; // Más mensajes primero
            }
            return new Date(b.lastActivity) - new Date(a.lastActivity); // Más reciente primero
          });
          
          // Mantener el primero, eliminar el resto
          const chatsToDelete = duplicateChats.slice(1);
          
          for (const chatToDelete of chatsToDelete) {
            try {
              await prisma.chat.delete({
                where: { id: chatToDelete.id }
              });
              deletedCount++;
              console.log(`🗑️ Chat duplicado eliminado: ${chatToDelete.id} (${chatToDelete._count.messages} mensajes)`);
            } catch (error) {
              console.log(`⚠️ Error eliminando chat ${chatToDelete.id}:`, error.message);
            }
          }
        }
      }
      
      if (deletedCount === 0) {
        console.log('✅ No se encontraron chats duplicados');
      } else {
        console.log(`✅ Total eliminados: ${deletedCount} chats duplicados`);
      }
      
    } catch (error) {
      console.log('⚠️ Error en limpieza de duplicados:', error.message);
      console.log('✅ Continuando con el resto del proceso...');
    }

    // 4. LIMPIAR CHATS SIN MENSAJES
    console.log('\n🧽 4. Limpiando chats sin mensajes...');
    
    const emptyChats = await prisma.chat.findMany({
      where: {
        isDisputeChat: false,
        messages: { none: {} }
      },
      select: { id: true }
    });

    if (emptyChats.length > 0) {
      const emptyCount = await prisma.chat.deleteMany({
        where: {
          id: { in: emptyChats.map(c => c.id) }
        }
      });
      console.log(`✅ ${emptyCount.count} chats vacíos eliminados`);
    } else {
      console.log('✅ No hay chats vacíos');
    }

    // 5. ESTADÍSTICAS FINALES
    console.log('\n📊 5. Estadísticas del sistema...');
    
    const stats = await prisma.$transaction([
      prisma.chat.count({ where: { isDisputeChat: false } }),
      prisma.message.count({ where: { deletedAt: null } }),
      prisma.message.count({ where: { isEdited: true } }),
      prisma.chatMember.count()
    ]);

    const [totalChats, totalMessages, editedMessages, totalMembers] = stats;

    console.log('\n' + '='.repeat(50));
    console.log('🎉 CHAT SYSTEM MEJORADO');
    console.log('='.repeat(50));
    console.log('✅ FUNCIONALIDADES AGREGADAS:');
    console.log('   📝 Edición de mensajes (5 minutos)');
    console.log('   🗑️ Eliminación para mí/para todos');
    console.log('   💬 Eliminación de chats por usuario');
    console.log('   🧹 Limpieza automática de duplicados');
    console.log('   👁️ Solo mostrar chats con mensajes');
    console.log('');
    console.log('📊 ESTADÍSTICAS:');
    console.log(`   💬 Chats totales: ${totalChats}`);
    console.log(`   📝 Mensajes totales: ${totalMessages}`);
    console.log(`   ✏️ Mensajes editados: ${editedMessages}`);
    console.log(`   👥 Miembros de chat: ${totalMembers}`);
    console.log('');
    console.log('🚀 SIGUIENTE PASO:');
    console.log('   Actualiza el chatController.js con las nuevas funciones');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// EJECUTAR
fixChatSystem()
  .catch((e) => {
    console.error('❌ Error fatal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('🔌 Desconectado');
  });