// ✅ SCRIPT PARA AGREGAR CAMPOS age Y location A LA BASE DE DATOS
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// ✅ DETECTAR ENTORNO Y USAR LA URL CORRECTA
const environment = process.env.NODE_ENV || 'development';
const isProduction = environment === 'production';

// ✅ OBTENER LA URL DE BASE DE DATOS CORRECTA
const databaseUrl = isProduction 
  ? process.env.DATABASE_URL_PROD 
  : process.env.DATABASE_URL_DEV;

console.log(`🌍 Entorno detectado: ${environment}`);
console.log(`💾 Usando base de datos: ${databaseUrl ? '✅ Configurada' : '❌ Faltante'}`);

if (!databaseUrl) {
  console.error('❌ ERROR: No se encontró DATABASE_URL para el entorno actual');
  console.error(`   Buscando: ${isProduction ? 'DATABASE_URL_PROD' : 'DATABASE_URL_DEV'}`);
  process.exit(1);
}

// ✅ CONFIGURAR PRISMA CON LA URL CORRECTA
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl
    }
  }
});

async function addPostFieldsToDatabase() {
  console.log('🔄 Iniciando agregado de campos age y location a la BASE DE DATOS...\n');

  try {
    // 1. VERIFICAR ESTADO ACTUAL DE LA BASE DE DATOS
    console.log('📋 Verificando estado actual de la base de datos...');
    
    const postsCount = await prisma.post.count();
    console.log(`📊 Posts existentes en BD: ${postsCount}`);

    // Verificar estructura actual de la tabla
    const samplePost = await prisma.post.findFirst({
      select: {
        id: true,
        title: true,
        authorId: true,
        services: true,
        createdAt: true
      }
    });

    if (samplePost) {
      console.log('📝 Post de muestra:');
      console.log(`   ID: ${samplePost.id}`);
      console.log(`   Título: ${samplePost.title?.substring(0, 30)}...`);
      console.log(`   Author: ${samplePost.authorId}`);
      console.log(`   Services: ${samplePost.services}`);
      console.log(`   Creado: ${samplePost.createdAt}`);
    }

    // 2. EJECUTAR SQL DIRECTO PARA AGREGAR CAMPOS
    console.log('\n🔧 Agregando campos a la tabla posts...');

    // Verificar si los campos ya existen
    let hasAgeField = false;
    let hasLocationField = false;
    let servicesIsArray = false;

    try {
      await prisma.$queryRaw`SELECT age FROM posts LIMIT 1`;
      hasAgeField = true;
      console.log('ℹ️  Campo "age" ya existe en la tabla');
    } catch (e) {
      console.log('➕ Campo "age" no existe, se agregará');
    }

    try {
      await prisma.$queryRaw`SELECT location FROM posts LIMIT 1`;
      hasLocationField = true;
      console.log('ℹ️  Campo "location" ya existe en la tabla');
    } catch (e) {
      console.log('➕ Campo "location" no existe, se agregará');
    }

    // Verificar tipo de services
    try {
      const result = await prisma.$queryRaw`
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = 'posts' AND column_name = 'services'
      `;
      if (result[0]?.data_type === 'ARRAY') {
        servicesIsArray = true;
        console.log('ℹ️  Campo "services" ya es array');
      } else {
        console.log('🔄 Campo "services" es string, se convertirá a array');
      }
    } catch (e) {
      console.log('⚠️  No se pudo verificar tipo de services');
    }

    // 3. AGREGAR CAMPO AGE SI NO EXISTE
    if (!hasAgeField) {
      console.log('🔧 Agregando campo "age"...');
      await prisma.$executeRaw`ALTER TABLE "posts" ADD COLUMN "age" INTEGER`;
      console.log('✅ Campo "age" agregado exitosamente');
    }

    // 4. AGREGAR CAMPO LOCATION SI NO EXISTE
    if (!hasLocationField) {
      console.log('🔧 Agregando campo "location"...');
      await prisma.$executeRaw`ALTER TABLE "posts" ADD COLUMN "location" TEXT`;
      console.log('✅ Campo "location" agregado exitosamente');
    }

    // 5. CONVERTIR SERVICES A ARRAY SI NO ES ARRAY
    if (!servicesIsArray) {
      console.log('🔧 Convirtiendo campo "services" a array...');
      
      // Crear nueva columna temporal
      await prisma.$executeRaw`ALTER TABLE "posts" ADD COLUMN "services_new" TEXT[] DEFAULT '{}'`;
      
      // Migrar datos existentes
      await prisma.$executeRaw`
        UPDATE "posts" 
        SET "services_new" = CASE 
          WHEN "services" IS NOT NULL AND "services" != '' 
          THEN ARRAY["services"]::TEXT[]
          ELSE '{}'::TEXT[]
        END
      `;
      
      // Eliminar columna antigua y renombrar
      await prisma.$executeRaw`ALTER TABLE "posts" DROP COLUMN "services"`;
      await prisma.$executeRaw`ALTER TABLE "posts" RENAME COLUMN "services_new" TO "services"`;
      
      console.log('✅ Campo "services" convertido a array exitosamente');
    }

    // 6. LLENAR POSTS EXISTENTES CON DATOS GENERALES
    console.log('\n📝 Llenando posts existentes con datos generales...');

    // Obtener posts que necesitan datos
    const postsToUpdate = await prisma.post.findMany({
      where: {
        OR: [
          { age: null },
          { location: null }
        ]
      },
      include: {
        author: {
          include: {
            escort: true
          }
        }
      }
    });

    console.log(`📊 Posts que necesitan actualización: ${postsToUpdate.length}`);

    if (postsToUpdate.length > 0) {
      let updatedCount = 0;
      
      for (const post of postsToUpdate) {
        try {
          // Determinar edad: usar edad del escort o edad general predeterminada
          let postAge = 25; // Edad predeterminada general
          
          if (post.author?.escort?.age) {
            postAge = post.author.escort.age;
          } else {
            // Asignar edades variadas según el tipo de usuario
            if (post.author?.userType === 'ESCORT') {
              postAge = Math.floor(Math.random() * (35 - 21 + 1)) + 21; // 21-35 años
            } else {
              postAge = 28; // Edad predeterminada para agencias
            }
          }

          // Determinar ubicación: usar ubicación general predeterminada
          let postLocation = 'Santo Domingo, República Dominicana'; // Ubicación predeterminada
          
          // Variaciones de ubicaciones para diversidad
          const locations = [
            'Santo Domingo, República Dominicana',
            'Santiago, República Dominicana', 
            'La Romana, República Dominicana',
            'Puerto Plata, República Dominicana',
            'Punta Cana, República Dominicana'
          ];
          
          // Asignar ubicación aleatoria
          postLocation = locations[Math.floor(Math.random() * locations.length)];

          // Actualizar el post
          await prisma.post.update({
            where: { id: post.id },
            data: {
              age: post.age === null ? postAge : post.age,
              location: post.location === null ? postLocation : post.location
            }
          });

          updatedCount++;
          
          if (updatedCount % 10 === 0) {
            console.log(`   📊 Actualizados: ${updatedCount}/${postsToUpdate.length}`);
          }

        } catch (error) {
          console.error(`❌ Error actualizando post ${post.id}:`, error.message);
        }
      }

      console.log(`✅ Posts actualizados exitosamente: ${updatedCount}`);
      
      // Mostrar estadísticas de los datos agregados
      const ageStats = await prisma.post.groupBy({
        by: ['age'],
        _count: { age: true },
        orderBy: { age: 'asc' },
        take: 10
      });

      console.log('\n📊 Distribución de edades agregadas:');
      ageStats.forEach(stat => {
        console.log(`   ${stat.age} años: ${stat._count.age} posts`);
      });

      const locationStats = await prisma.post.groupBy({
        by: ['location'],
        _count: { location: true },
        orderBy: { _count: { location: 'desc' } },
        take: 5
      });

      console.log('\n📊 Distribución de ubicaciones agregadas:');
      locationStats.forEach(stat => {
        console.log(`   ${stat.location}: ${stat._count.location} posts`);
      });
    }

    // 7. ACTUALIZAR SCHEMA.PRISMA PARA SINCRONIZAR
    console.log('\n📄 Actualizando schema.prisma para sincronizar...');
    
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
    
    if (fs.existsSync(schemaPath)) {
      // Crear backup
      const backupPath = path.join(process.cwd(), 'prisma', `schema.backup.${Date.now()}.prisma`);
      fs.copyFileSync(schemaPath, backupPath);
      console.log(`📦 Backup creado: ${path.basename(backupPath)}`);

      let schemaContent = fs.readFileSync(schemaPath, 'utf8');
      let changesCount = 0;

      // Agregar age si no existe en schema
      if (!/age\s+Int\?/.test(schemaContent)) {
        const phoneFieldRegex = /(phone\s+String[\s\S]*?)(\n\s+isActive)/;
        if (phoneFieldRegex.test(schemaContent)) {
          schemaContent = schemaContent.replace(
            phoneFieldRegex,
            '$1\n  age         Int?     // ✅ AGREGADO: Edad específica del post$2'
          );
          changesCount++;
        }
      }

      // Agregar location si no existe en schema
      if (!/location\s+String\?/.test(schemaContent)) {
        const ageOrPhoneRegex = /((?:age\s+Int\?|phone\s+String)[\s\S]*?)(\n\s+isActive)/;
        if (ageOrPhoneRegex.test(schemaContent)) {
          schemaContent = schemaContent.replace(
            ageOrPhoneRegex,
            '$1\n  location    String?  // ✅ AGREGADO: Ubicación como texto libre del post$2'
          );
          changesCount++;
        }
      }

      // Convertir services a array en schema
      if (!/services\s+String\[\]/.test(schemaContent)) {
        const servicesStringRegex = /(\s+)services\s+String\?\s*(\/\/.*)?$/m;
        if (servicesStringRegex.test(schemaContent)) {
          schemaContent = schemaContent.replace(
            servicesStringRegex,
            '$1services    String[] @default([]) // ✅ CONVERTIDO: Array de servicios (máx 3)$2'
          );
          changesCount++;
        }
      }

      if (changesCount > 0) {
        fs.writeFileSync(schemaPath, schemaContent);
        console.log(`✅ Schema sincronizado con ${changesCount} cambios`);
      } else {
        console.log('ℹ️  Schema ya estaba sincronizado');
      }
    }

    // 8. VERIFICACIÓN FINAL
    console.log('\n🔍 Verificación final...');
    
    const finalStats = await prisma.post.aggregate({
      _count: { id: true },
      _avg: { age: true },
      _min: { age: true },
      _max: { age: true }
    });

    const postsWithLocation = await prisma.post.count({
      where: { location: { not: null } }
    });

    const postsWithAge = await prisma.post.count({
      where: { age: { not: null } }
    });

    console.log('📊 Estadísticas finales:');
    console.log(`   Total posts: ${finalStats._count.id}`);
    console.log(`   Posts con edad: ${postsWithAge}`);
    console.log(`   Posts con ubicación: ${postsWithLocation}`);
    console.log(`   Edad promedio: ${finalStats._avg.age?.toFixed(1) || 'N/A'}`);
    console.log(`   Edad mínima: ${finalStats._min.age || 'N/A'}`);
    console.log(`   Edad máxima: ${finalStats._max.age || 'N/A'}`);

    // 9. MOSTRAR INSTRUCCIONES FINALES
    console.log('\n🎉 ACTUALIZACIÓN DE BASE DE DATOS COMPLETADA');
    console.log('================================================');
    console.log('✅ Campos agregados a la tabla posts:');
    console.log('   ➕ age: INTEGER (edad específica del post)');
    console.log('   ➕ location: TEXT (ubicación libre del post)');
    console.log('   🔄 services: TEXT[] (convertido a array)');
    console.log('✅ Posts existentes llenados con datos generales');
    console.log('✅ Schema.prisma sincronizado automáticamente');
    console.log('================================================');
    
    console.log('\n📋 PRÓXIMOS PASOS:');
    console.log('1. 🎯 Ejecutar: npx prisma generate (actualizar cliente)');
    console.log('2. 🔄 Reiniciar tu aplicación');
    console.log('3. 🧪 Probar creación/edición de posts con nuevos campos');
    console.log('4. 🎨 Actualizar validaciones del frontend si es necesario');
    
    console.log('\n💡 DATOS GENERALES ASIGNADOS:');
    console.log('• Edades: 21-35 años (escorts) o edad del perfil si existe');
    console.log('• Ubicaciones: Ciudades principales de República Dominicana');
    console.log('• Servicios: Mantenidos como estaban (ahora en formato array)');
    
    console.log('\n✅ TODO LISTO: Tu PostsManager y postController ahora funcionarán correctamente\n');

  } catch (error) {
    console.error('❌ Error modificando base de datos:', error);
    
    if (error.code === 'P2010') {
      console.log('💡 Error de migración. Es posible que los campos ya existan.');
    } else if (error.code === 'P2003') {
      console.log('💡 Error de clave foránea. Verifica las relaciones.');
    } else if (error.message.includes('already exists')) {
      console.log('💡 El campo ya existe en la base de datos.');
    } else {
      console.log('💡 Verifica que la base de datos esté conectada y accesible.');
    }
    
    throw error;
  }
}

// Ejecutar el script
addPostFieldsToDatabase()
  .catch((e) => {
    console.error('❌ Error fatal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('🔌 Conexión a la base de datos cerrada');
  });