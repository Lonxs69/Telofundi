// database.js
// ✅ CRÍTICO: Importar y ejecutar environment.js ANTES que cualquier otra cosa
const { config, getDatabaseUrl } = require('../config/environment');

// ✅ CRÍTICO: Establecer DATABASE_URL dinámicamente ANTES de importar PrismaClient
process.env.DATABASE_URL = getDatabaseUrl();

const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

// ✅ VERIFICACIÓN CRÍTICA: Confirmar que DATABASE_URL está configurada
if (!process.env.DATABASE_URL) {
  logger.error('❌ CRITICAL ERROR: DATABASE_URL no está configurada después de la configuración dinámica');
  logger.error('📋 Variables disponibles:', {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL_DEV: process.env.DATABASE_URL_DEV ? 'SET' : 'NOT SET',
    DATABASE_URL_PROD: process.env.DATABASE_URL_PROD ? 'SET' : 'NOT SET',
    configDatabaseUrl: getDatabaseUrl()
  });
  throw new Error('DATABASE_URL not configured - check environment.js');
}

// ✅ LOG DE CONFIRMACIÓN (sin mostrar credenciales completas)
const dbUrl = process.env.DATABASE_URL;
const maskedUrl = dbUrl.replace(/:\/\/.*@/, '://***@');
logger.info(`💾 DATABASE_URL configurada dinámicamente: ${maskedUrl}`);

// ✅ CONFIGURACIÓN OPTIMIZADA DE PRISMA - SIN LOGS GIGANTESCOS
const prismaConfig = {
  // 🔥 CAMBIO PRINCIPAL: Solo errores en desarrollo, nada en producción
  log: config.environment.isDevelopment 
    ? [
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' }
      ]
    : [],
  errorFormat: 'minimal' // ✅ Cambiar de 'pretty' a 'minimal'
};

// Crear instancia de Prisma
const prisma = new PrismaClient(prismaConfig);

// ✅ MIDDLEWARE OPTIMIZADO - LOGS CONCISOS
prisma.$use(async (params, next) => {
  const before = Date.now();
  
  try {
    const result = await next(params);
    const duration = Date.now() - before;
    
    // Solo log queries lentas (más de 500ms)
    if (duration > 500) {
      logger.warn(`🐌 Slow DB Query: ${params.model}.${params.action} - ${duration}ms`, {
        model: params.model,
        action: params.action,
        duration: `${duration}ms`
      });
    }
    
    // Log muy conciso para desarrollo
    if (config.environment.isDevelopment && duration > 100) {
      logger.debug(`🔍 DB Query: ${params.model}.${params.action} - ${duration}ms`);
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - before;
    
    // Log de errores de base de datos - CONCISO
    logger.error(`💥 DB Error: ${params.model}.${params.action}`, {
      model: params.model,
      action: params.action,
      duration: `${duration}ms`,
      error: error.message
    });
    
    throw error;
  }
});

// ✅ CORREGIDO: Lista actualizada SOLO con modelos que tienen deletedAt en el schema
const modelsWithDeletedAt = [
  'User', 'Post', 'Message', 
  'AgencyMembership', 'AgencyInvitation', 'EscortVerification',
  'Review', 'Report', 'Notification', 'Payment', 'Boost', 'Ban'
  // ❌ REMOVIDO: 'Escort', 'Client' - estos NO tienen deletedAt en el schema
];

// ✅ CORREGIDO: Middleware para soft deletes - SOLO modelos que TIENEN deletedAt
prisma.$use(async (params, next) => {
  if (params.action === 'delete' && modelsWithDeletedAt.includes(params.model)) {
    params.action = 'update';
    params.args['data'] = { deletedAt: new Date() };
  }
  
  if (params.action === 'deleteMany' && modelsWithDeletedAt.includes(params.model)) {
    params.action = 'updateMany';
    if (params.args.data != undefined) {
      params.args.data['deletedAt'] = new Date();
    } else {
      params.args['data'] = { deletedAt: new Date() };
    }
  }
  
  return next(params);
});

// ✅ CORREGIDO: Middleware para filtrar registros eliminados - SOLO modelos con deletedAt
prisma.$use(async (params, next) => {
  // ✅ VERIFICAR que el modelo esté en la lista de modelos con deletedAt
  if (modelsWithDeletedAt.includes(params.model)) {
    if (params.action === 'findUnique' || params.action === 'findFirst') {
      // ✅ VERIFICAR que args.where existe antes de agregar deletedAt
      if (!params.args) {
        params.args = {};
      }
      if (!params.args.where) {
        params.args.where = {};
      }
      params.args.where['deletedAt'] = null;
    }
    
    if (params.action === 'findMany') {
      if (!params.args) {
        params.args = {};
      }
      if (params.args.where) {
        if (params.args.where.deletedAt == undefined) {
          params.args.where['deletedAt'] = null;
        }
      } else {
        params.args['where'] = { deletedAt: null };
      }
    }
    
    if (params.action === 'count') {
      if (!params.args) {
        params.args = {};
      }
      if (params.args.where) {
        if (params.args.where.deletedAt == undefined) {
          params.args.where['deletedAt'] = null;
        }
      } else {
        params.args['where'] = { deletedAt: null };
      }
    }
  }
  
  return next(params);
});

// ✅ EVENTOS DE PRISMA OPTIMIZADOS - LOGS CONCISOS
prisma.$on('error', (e) => {
  logger.error('💥 Prisma Error:', {
    message: e.message,
    timestamp: new Date().toISOString()
  });
});

prisma.$on('warn', (e) => {
  logger.warn('⚠️  Prisma Warning:', {
    message: e.message,
    timestamp: new Date().toISOString()
  });
});

// ✅ CONEXIÓN MEJORADA CON RETRY Y MEJOR ERROR HANDLING
const connectToDatabase = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      await prisma.$connect();
      logger.info('🗄️  Database connected successfully');
      
      // Hacer una query de prueba
      await prisma.$queryRaw`SELECT 1`;
      logger.info('✅ Database health check passed');
      
      return true;
    } catch (error) {
      logger.error(`❌ Database connection attempt ${i + 1}/${retries} failed:`, {
        error: error.message,
        code: error.code,
        databaseUrl: maskedUrl
      });
      
      if (i === retries - 1) {
        logger.error('💥 CRITICAL: All database connection attempts failed');
        logger.error('📋 Troubleshooting info:', {
          NODE_ENV: config.environment.NODE_ENV,
          databaseUrl: maskedUrl,
          configDatabaseUrl: getDatabaseUrl() ? 'SET' : 'NOT SET',
          environmentLoaded: !!config
        });
        throw error;
      }
      
      // Esperar antes del siguiente intento
      await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
    }
  }
};

// Iniciar conexión
connectToDatabase().catch((error) => {
  logger.error('❌ Failed to connect to database after all retries');
  process.exit(1);
});

// Función para cerrar conexión gracefully
const closePrisma = async () => {
  await prisma.$disconnect();
  logger.info('🗄️  Database connection closed');
};

// Función para verificar la salud de la base de datos
const checkDatabaseHealth = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'healthy', timestamp: new Date().toISOString() };
  } catch (error) {
    logger.error('Database health check failed:', { error: error.message });
    return { 
      status: 'unhealthy', 
      error: error.message,
      timestamp: new Date().toISOString() 
    };
  }
};

// Función para limpiar datos de prueba (solo en desarrollo)
const cleanupTestData = async () => {
  if (!config.environment.isDevelopment) {
    throw new Error('Cleanup solo disponible en desarrollo');
  }
  
  try {
    const deleted = await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'test'
        }
      }
    });
    
    logger.info(`🧹 Test data cleanup: ${deleted.count} records deleted`);
    return deleted.count;
  } catch (error) {
    logger.error('Error cleaning test data:', { error: error.message });
    throw error;
  }
};

// Función para estadísticas de la base de datos
const getDatabaseStats = async () => {
  try {
    const [users, posts, messages, favorites, likes] = await Promise.all([
      prisma.user.count(),
      prisma.post.count(),
      prisma.message.count(),
      prisma.favorite.count(),
      prisma.like.count()
    ]);

    const stats = {
      users,
      posts,
      messages,
      favorites,
      likes,
      timestamp: new Date().toISOString()
    };

    logger.info('📊 Database stats retrieved', stats);
    return stats;
  } catch (error) {
    logger.error('Error getting database stats:', { error: error.message });
    throw error;
  }
};

module.exports = {
  prisma,
  closePrisma,
  checkDatabaseHealth,
  cleanupTestData,
  getDatabaseStats
};