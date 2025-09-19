// test-database.js - Script para diagnosticar conexión a PostgreSQL
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const testDatabaseConnection = async () => {
  console.log('🔍 === DIAGNÓSTICO DE BASE DE DATOS ===');
  
  // 1. Verificar variables de entorno
  console.log('📋 Variables de entorno:');
  console.log('   DATABASE_URL_DEV:', process.env.DATABASE_URL_DEV ? '✅ Configurada' : '❌ No encontrada');
  console.log('   NODE_ENV:', process.env.NODE_ENV || 'undefined');
  
  // 2. Importar configuración dinámica
  try {
    const { config } = require('./src/config/environment');
    console.log('📋 Configuración dinámica:');
    console.log('   Database URL:', config.database.url);
    console.log('   Environment:', config.environment.NODE_ENV);
  } catch (error) {
    console.error('❌ Error importando configuración:', error.message);
    return;
  }
  
  // 3. Test de conexión básica con node-postgres
  console.log('\n🔌 Probando conexión básica con node-postgres...');
  try {
    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL_DEV || 'postgresql://postgres:123@localhost:5432/TeLoFundi'
    });
    
    console.log('   Conectando...');
    await client.connect();
    console.log('   ✅ Conexión exitosa con node-postgres');
    
    // Test query básica
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('   ✅ Query test exitosa:', {
      time: result.rows[0].current_time,
      version: result.rows[0].pg_version.split(' ')[0] + ' ' + result.rows[0].pg_version.split(' ')[1]
    });
    
    await client.end();
  } catch (pgError) {
    console.error('   ❌ Error con node-postgres:', {
      message: pgError.message,
      code: pgError.code,
      errno: pgError.errno,
      syscall: pgError.syscall,
      address: pgError.address,
      port: pgError.port
    });
    
    // Diagnóstico específico
    if (pgError.code === 'ECONNREFUSED') {
      console.log('\n💡 DIAGNÓSTICO: PostgreSQL no está corriendo o no acepta conexiones');
      console.log('   Soluciones:');
      console.log('   1. Verifica que PostgreSQL esté corriendo: services.msc → PostgreSQL');
      console.log('   2. Verifica el puerto: psql -U postgres -c "SHOW port;"');
      console.log('   3. Verifica pg_hba.conf para permitir conexiones locales');
    } else if (pgError.code === 'ENOTFOUND') {
      console.log('\n💡 DIAGNÓSTICO: Hostname no encontrado');
      console.log('   Solución: Verifica que "localhost" resuelva correctamente');
    } else if (pgError.message.includes('authentication')) {
      console.log('\n💡 DIAGNÓSTICO: Error de autenticación');
      console.log('   Solución: Verifica usuario/contraseña en DATABASE_URL_DEV');
    } else if (pgError.message.includes('database') && pgError.message.includes('does not exist')) {
      console.log('\n💡 DIAGNÓSTICO: Base de datos no existe');
      console.log('   Solución: Crear base de datos TeLoFundi');
    }
  }
  
  // 4. Test con Prisma
  console.log('\n🔌 Probando conexión con Prisma...');
  const prisma = new PrismaClient({
    log: ['error', 'warn'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL_DEV || 'postgresql://postgres:123@localhost:5432/TeLoFundi'
      }
    }
  });
  
  try {
    console.log('   Conectando con Prisma...');
    await prisma.$connect();
    console.log('   ✅ Conexión exitosa con Prisma');
    
    // Test query con Prisma
    const result = await prisma.$queryRaw`SELECT NOW() as current_time`;
    console.log('   ✅ Query test exitosa con Prisma:', result[0]);
    
  } catch (prismaError) {
    console.error('   ❌ Error con Prisma:', {
      message: prismaError.message,
      code: prismaError.code,
      meta: prismaError.meta
    });
    
    if (prismaError.code === 'P1001') {
      console.log('\n💡 DIAGNÓSTICO PRISMA: No puede conectar al servidor de base de datos');
      console.log('   Esto confirma que PostgreSQL no está disponible en localhost:5432');
    }
  } finally {
    await prisma.$disconnect();
  }
  
  // 5. Sugerencias de solución
  console.log('\n🔧 === PASOS PARA SOLUCIONAR ===');
  console.log('1. Verifica que PostgreSQL esté corriendo:');
  console.log('   Windows: services.msc → buscar "postgresql" → iniciar servicio');
  console.log('   O: pg_ctl -D "C:\\Program Files\\PostgreSQL\\[VERSION]\\data" start');
  
  console.log('\n2. Verifica la configuración del puerto:');
  console.log('   psql -U postgres -c "SHOW port;"');
  
  console.log('\n3. Crea la base de datos si no existe:');
  console.log('   psql -U postgres');
  console.log('   CREATE DATABASE "TeLoFundi";');
  console.log('   \\q');
  
  console.log('\n4. Ejecuta las migraciones de Prisma:');
  console.log('   npx prisma migrate dev');
  console.log('   npx prisma generate');
  
  console.log('\n5. Si sigue fallando, verifica pg_hba.conf:');
  console.log('   Debe tener: host all all 127.0.0.1/32 md5');
  
  console.log('\n=== FIN DIAGNÓSTICO ===');
};

// Ejecutar diagnóstico
testDatabaseConnection().catch(console.error);