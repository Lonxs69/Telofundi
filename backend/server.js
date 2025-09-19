// server.js - TELOFUNDI SERVER CON ORDEN CRÍTICO ARREGLADO
// ✅ ORDEN CRÍTICO DE IMPORTS - NO CAMBIAR EL ORDEN

// ✅ PASO 1: Cargar env-loader PRIMERO (antes que dotenv y cualquier cosa)
// Esto mapea todas las variables dinámicas ANTES que Prisma las necesite
require('./env-loader');

// ✅ PASO 2: Ahora cargar configuración (ya tiene variables mapeadas)
const { config } = require('./src/config/environment');

// ✅ PASO 3: Importar el resto (Prisma ya tiene DATABASE_URL disponible)
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = require('./src/app');
const { setupSocketAuth, setupChatSocket } = require('./src/sockets');
const logger = require('./src/utils/logger');
const { configureCloudinary } = require('./src/config/cloudinary');

// ✅ BANNER DE INICIO
console.log('🚀 === TELOFUNDI SERVER STARTUP v2.0 ===');
console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
console.log(`🌍 Entorno: ${config.environment.NODE_ENV}`);
console.log(`🚪 Puerto: ${config.environment.PORT}`);
console.log('==========================================');

// ✅ VERIFICACIÓN INICIAL COMPLETA
const initialVerification = () => {
  console.log('🔍 Verificando configuración inicial...');
  
  const checks = {
    NODE_ENV: config.environment.NODE_ENV,
    PORT: config.environment.PORT,
    DATABASE_URL: config.database.url ? '✅ CONFIGURADA' : '❌ FALTANTE',
    JWT_SECRET: config.jwt.secret ? '✅ CONFIGURADO' : '❌ FALTANTE',
    FRONTEND_URL: config.urls.frontend || '❌ FALTANTE',
    GOOGLE_CLIENT_ID: config.google.clientId ? '✅ CONFIGURADO' : '❌ FALTANTE',
    CLOUDINARY: config.cloudinary.cloudName ? '✅ CONFIGURADO' : '❌ FALTANTE',
    RATE_LIMITING: config.rateLimit.disabled ? '❌ DESACTIVADO' : '✅ ACTIVADO'
  };
  
  console.log('📋 Estado de configuración:');
  Object.entries(checks).forEach(([key, value]) => {
    const status = value.toString().includes('✅') ? '✅' : 
                   value.toString().includes('❌') ? '❌' : '🔧';
    console.log(`   ${status} ${key}: ${value}`);
  });
  
  // Verificar variables críticas
  const critical = ['DATABASE_URL', 'JWT_SECRET'];
  const missing = critical.filter(key => !config.database.url && key === 'DATABASE_URL' || 
                                        !config.jwt.secret && key === 'JWT_SECRET');
  
  if (missing.length > 0) {
    console.error('💥 Variables críticas faltantes:', missing);
    if (config.environment.isProduction) {
      process.exit(1);
    }
  }
  
  console.log('✅ Verificación inicial completada');
  return checks;
};

// Ejecutar verificación inicial
const serverStatus = initialVerification();

// ✅ PUERTO DINÁMICO
const PORT = config.environment.PORT;

// ✅ INICIALIZACIÓN DE SERVICIOS MEJORADA
const initializeServices = async () => {
  try {
    console.log('🔧 Inicializando servicios...');
    
    // ✅ 1. Configurar Cloudinary
    const cloudinaryConfigured = configureCloudinary();
    
    if (cloudinaryConfigured) {
      logger.info('✅ Cloudinary configurado correctamente');
      logger.info(`📦 Cloud Name: ${config.cloudinary.cloudName}`);
      logger.info('🔄 Modo: Memory storage (Production ready)');
    } else {
      logger.warn('⚠️  Cloudinary no configurado - usando almacenamiento local');
      logger.warn('🔧 Para producción, configura las variables CLOUDINARY_*');
    }

    // ✅ 2. Verificar variables críticas una vez más (redundancia de seguridad)
    const criticalVars = [
      { name: 'DATABASE_URL', value: config.database.url, description: 'URL de base de datos' },
      { name: 'JWT_SECRET', value: config.jwt.secret, description: 'Secreto JWT' },
      { name: 'JWT_REFRESH_SECRET', value: config.jwt.refreshSecret, description: 'Secreto JWT Refresh' }
    ];
    
    const missingVars = criticalVars.filter(item => !item.value);
    
    if (missingVars.length > 0) {
      logger.error('❌ Variables de entorno críticas faltantes:');
      missingVars.forEach(item => {
        logger.error(`   - ${item.name}: ${item.description}`);
      });
      logger.error('💡 Verifica tu archivo .env y que env-loader.js se ejecutó correctamente');
      process.exit(1);
    }

    // ✅ 3. Log de variables críticas confirmadas
    logger.info('✅ Variables críticas verificadas:');
    criticalVars.forEach(item => {
      if (item.value) {
        const displayValue = item.name.includes('SECRET') ? `***CONFIGURADO*** (${item.value.length} chars)` : 
                           item.name.includes('DATABASE') ? `${item.value.split('@')[1]?.split('/')[0] || 'configurado'}` :
                           item.value;
        logger.info(`   ✅ ${item.name}: ${displayValue}`);
      }
    });

    // ✅ 4. Verificar servicios opcionales
    const optionalServices = [
      { name: 'Google OAuth', configured: !!config.google.clientId },
      { name: 'Cloudinary', configured: !!config.cloudinary.cloudName },
      { name: 'Stripe', configured: !!config.stripe.secretKey },
      { name: 'Email', configured: !!config.email.user }
    ];

    const configuredServices = optionalServices.filter(s => s.configured);
    const missingServices = optionalServices.filter(s => !s.configured);
    
    if (configuredServices.length > 0) {
      logger.info('🔗 Servicios externos configurados:');
      configuredServices.forEach(service => {
        logger.info(`   ✅ ${service.name}: Disponible`);
      });
    }
    
    if (missingServices.length > 0 && config.environment.isDevelopment) {
      logger.warn('⚠️  Servicios opcionales no configurados:');
      missingServices.forEach(service => {
        logger.warn(`   - ${service.name}: No disponible`);
      });
    }

    // ✅ 5. Log de configuración de uploads
    logger.info('📁 Configuración de uploads:', {
      provider: cloudinaryConfigured ? 'cloudinary' : 'local',
      environment: config.environment.NODE_ENV,
      maxFileSize: {
        avatar: '3MB',
        post: '8MB',
        chat: '5MB',
        document: '10MB'
      },
      allowedTypes: config.upload.allowedTypes
    });

    // ✅ 6. Configurar logging según entorno
    if (config.environment.isDevelopment) {
      logger.info('🔧 Modo desarrollo: Logging detallado activado');
    } else {
      logger.info('🚀 Modo producción: Logging optimizado activado');
    }

    logger.info('✅ Todos los servicios inicializados correctamente');

  } catch (error) {
    logger.error('💥 Error crítico inicializando servicios:', error);
    process.exit(1);
  }
};

// ✅ CREAR SERVIDOR HTTP
const server = http.createServer(app);

// ✅ CONFIGURAR SOCKET.IO CON CONFIGURACIÓN DINÁMICA MEJORADA
const io = socketIo(server, {
  cors: {
    origin: [
      config.urls.frontend,
      config.urls.cors,
      
      // Permitir variaciones automáticas
      config.urls.frontend?.replace('http://', 'https://'),
      config.urls.frontend?.replace('https://', 'http://'),
      config.urls.frontend?.replace('localhost', '127.0.0.1'),
      
      // Puertos adicionales en desarrollo
      ...(config.environment.isDevelopment ? [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
        'http://localhost:4173',  // Vite preview
        'http://127.0.0.1:4173'
      ] : []),
      
      // Dominios de producción
      ...(config.environment.isProduction ? [
        'https://telofundi.com',
        'https://www.telofundi.com',
        'https://app.telofundi.com',
        'https://admin.telofundi.com'
      ] : [])
    ].filter(Boolean), // Filtrar valores undefined/null
    
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// ✅ LOGGING PARA SOCKET.IO OPTIMIZADO
io.on('connection', (socket) => {
  if (config.environment.isDevelopment) {
    logger.info('🔌 SOCKET CONNECTED:', {
      socketId: socket.id,
      ip: socket.handshake.address,
      timestamp: new Date().toISOString()
    });
  }

  socket.on('disconnect', (reason) => {
    if (config.environment.isDevelopment) {
      logger.info('🔌 SOCKET DISCONNECTED:', {
        socketId: socket.id,
        reason,
        timestamp: new Date().toISOString()
      });
    }
  });

  socket.on('error', (error) => {
    logger.error('💥 SOCKET ERROR:', {
      socketId: socket.id,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  });
});

// ✅ CONFIGURAR AUTENTICACIÓN Y EVENTOS DE SOCKETS
setupSocketAuth(io);
setupChatSocket(io);

// Hacer io disponible globalmente para la app
app.set('io', io);

// ✅ FUNCIÓN DE INICIO OPTIMIZADA
const startServer = async () => {
  try {
    console.log('🚀 Iniciando servidor TeLoFundi...');
    
    // Inicializar servicios primero
    await initializeServices();

    // Iniciar servidor HTTP
    server.listen(PORT, () => {
      console.log('🎉 === SERVIDOR INICIADO EXITOSAMENTE ===');
      logger.info('🚀 Servidor TeLoFundi iniciado exitosamente');
      logger.info(`📱 API URL: ${config.urls.api}`);
      logger.info(`🌐 Frontend URL: ${config.urls.frontend}`);
      logger.info(`📚 Documentación: ${config.urls.api?.replace('/api', '') || 'http://localhost:3000'}/api-docs`);
      logger.info(`🌍 Entorno: ${config.environment.NODE_ENV}`);
      logger.info(`🔌 Socket.IO: Habilitado para ${config.urls.frontend}`);
      logger.info(`💾 Base de datos: ${config.database.url ? 'Conectada' : 'No configurada'}`);
      logger.info(`📋 Configuración: Dinámica y automática`);
      
      // ✅ Información detallada de desarrollo
      if (config.environment.isDevelopment) {
        logger.info('🔧 === INFORMACIÓN DE DESARROLLO ===');
        logger.info(`   • CORS Origins: Frontend=${config.urls.frontend}, CORS=${config.urls.cors}`);
        logger.info(`   • Database: ${config.database.url?.includes('localhost') ? 'Local PostgreSQL' : 'Remote Database'}`);
        logger.info(`   • Google OAuth: ${config.google.clientId ? '✅ Configurado' : '❌ No configurado'}`);
        logger.info(`   • Cloudinary: ${config.cloudinary.cloudName ? '✅ Configurado' : '❌ No configurado'}`);
        logger.info(`   • Rate Limiting: ${config.rateLimit.disabled ? '❌ DESACTIVADO' : '✅ ACTIVADO'}`);
        logger.info(`   • Bcrypt Rounds: ${config.security.bcryptRounds}`);
        logger.info('🔧 ===================================');
      }

      // ✅ URLs de testing
      const baseUrl = config.urls.api || `http://localhost:${PORT}/api`;
      logger.info('=====================================');
      logger.info('🧪 URLs DE PRUEBA:');
      logger.info(`   Health Check: curl -X GET ${baseUrl}/health`);
      logger.info(`   Test JSON: curl -X POST ${baseUrl}/test/json -H "Content-Type: application/json" -d '{"test":"data"}'`);
      logger.info(`   FormData Test: curl -X POST ${baseUrl}/test/formdata -F "test=data"`);
      if (config.environment.isDevelopment) {
        logger.info(`   Frontend: ${config.urls.frontend}`);
        logger.info(`   Docs: ${baseUrl.replace('/api', '')}/api-docs`);
      }
      logger.info('=====================================');
      
      console.log('✅ Servidor listo para recibir conexiones');
    });

  } catch (error) {
    logger.error('💥 Error crítico iniciando servidor:', error);
    process.exit(1);
  }
};

// ✅ MANEJO MEJORADO DE ERRORES DEL SERVIDOR
server.on('error', (error) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;

  switch (error.code) {
    case 'EACCES':
      logger.error(`❌ ${bind} requiere privilegios elevados`);
      console.error(`💥 ERROR: Puerto ${PORT} requiere privilegios de administrador`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      logger.error(`❌ ${bind} ya está en uso`);
      console.error(`💥 ERROR: Puerto ${PORT} ya está siendo usado por otro proceso`);
      console.error(`💡 Solución: Cambiar PORT en .env o detener el proceso que usa el puerto`);
      process.exit(1);
      break;
    default:
      logger.error('Error del servidor:', error);
      throw error;
  }
});

// ✅ MANEJO DE CIERRE GRACEFUL MEJORADO
const gracefulShutdown = (signal) => {
  console.log(`📡 Señal ${signal} recibida, iniciando cierre graceful...`);
  logger.info(`📡 ${signal} recibido, iniciando cierre graceful del servidor...`);
  
  server.close((err) => {
    if (err) {
      logger.error('Error cerrando servidor HTTP:', err);
      process.exit(1);
    }
    
    logger.info('✅ Servidor HTTP cerrado correctamente');
    
    io.close(() => {
      logger.info('✅ Socket.IO cerrado correctamente');
    });
    
    logger.info('✅ Aplicación cerrada correctamente');
    console.log('👋 TeLoFundi cerrado exitosamente');
    process.exit(0);
  });

  // Forzar cierre después de 30 segundos
  setTimeout(() => {
    logger.error('⏰ Tiempo de cierre excedido (30s), forzando salida...');
    console.error('💥 Forzando cierre del servidor...');
    process.exit(1);
  }, 30000);
};

// ✅ MANEJO DE SEÑALES DEL SISTEMA
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ✅ MANEJO DE ERRORES NO CAPTURADOS MEJORADO
process.on('uncaughtException', (error) => {
  logger.error('💥 Error no capturado:', {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
  
  console.error('💥 ERROR NO CAPTURADO:', error.message);
  
  if (config.environment.isDevelopment) {
    console.error(error.stack);
  }
  
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('💥 Promise rechazada no manejada:', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: promise,
    timestamp: new Date().toISOString()
  });
  
  console.error('💥 PROMISE RECHAZADA:', reason instanceof Error ? reason.message : reason);
  
  if (config.environment.isDevelopment) {
    console.error('Promise:', promise);
    if (reason instanceof Error) {
      console.error('Stack:', reason.stack);
    }
  }
  
  process.exit(1);
});

// ✅ LOGGING FINAL Y ARRANQUE
console.log('🎯 Configuración cargada, iniciando servidor...');
startServer();

// ✅ EXPORTAR SERVIDOR PARA TESTING
module.exports = server;