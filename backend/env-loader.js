// env-loader.js - CARGA Y MAPEA VARIABLES ANTES QUE CUALQUIER COSA
// ✅ ESTE ARCHIVO SE EJECUTA ANTES QUE PRISMA, ANTES QUE TODO
const dotenv = require('dotenv');
const path = require('path');

// Cargar .env desde la raíz del proyecto
const envPath = path.resolve(__dirname, '.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.warn(`⚠️  No se pudo cargar .env desde ${envPath}`);
  // Intentar cargar desde directorio actual
  dotenv.config();
}

// Detectar entorno
const NODE_ENV = process.env.NODE_ENV || 'development';
const isDev = NODE_ENV === 'development';
const isProd = NODE_ENV === 'production';

console.log(`🔧 ENV-LOADER: Iniciando configuración para entorno ${NODE_ENV}`);
console.log(`📂 Archivo .env cargado desde: ${envPath}`);

// ✅ MAPEO AUTOMÁTICO DE VARIABLES DINÁMICAS
const dynamicVars = {
  // Base de datos - LA MÁS CRÍTICA PARA PRISMA
  'DATABASE_URL': isDev ? 'DATABASE_URL_DEV' : 'DATABASE_URL_PROD',
  
  // JWT
  'JWT_SECRET': isDev ? 'JWT_SECRET_DEV' : 'JWT_SECRET_PROD',
  'JWT_REFRESH_SECRET': isDev ? 'JWT_REFRESH_SECRET_DEV' : 'JWT_REFRESH_SECRET_PROD',
  
  // Google OAuth
  'GOOGLE_CLIENT_ID': isDev ? 'GOOGLE_CLIENT_ID_DEV' : 'GOOGLE_CLIENT_ID_PROD',
  'GOOGLE_CLIENT_SECRET': isDev ? 'GOOGLE_CLIENT_SECRET_DEV' : 'GOOGLE_CLIENT_SECRET_PROD',
  'GOOGLE_CALLBACK_URL': isDev ? 'GOOGLE_CALLBACK_URL_DEV' : 'GOOGLE_CALLBACK_URL_PROD',
  
  // URLs
  'FRONTEND_URL': isDev ? 'FRONTEND_URL_DEV' : 'FRONTEND_URL_PROD',
  'CORS_ORIGIN': isDev ? 'CORS_ORIGIN_DEV' : 'CORS_ORIGIN_PROD',
  'API_URL': isDev ? 'API_URL_DEV' : 'API_URL_PROD'
};

// ✅ REALIZAR MAPEO INMEDIATO - ANTES QUE CUALQUIER IMPORT
console.log('🔄 Iniciando mapeo de variables dinámicas...');

let mappedCount = 0;
let warningCount = 0;

for (const [target, source] of Object.entries(dynamicVars)) {
  if (process.env[source]) {
    const oldValue = process.env[target];
    process.env[target] = process.env[source];
    mappedCount++;
    
    console.log(`✅ ${source} → ${target}`);
    
    // Debug para DATABASE_URL específicamente
    if (target === 'DATABASE_URL') {
      const dbUrl = process.env[target];
      const isLocal = dbUrl?.includes('localhost') || dbUrl?.includes('127.0.0.1');
      console.log(`💾 DATABASE_URL configurada: ${isLocal ? 'LOCAL' : 'REMOTA'}`);
    }
    
  } else {
    console.warn(`⚠️  Variable faltante: ${source} (para ${target})`);
    warningCount++;
  }
}

console.log(`📊 Mapeo completado: ${mappedCount} variables mapeadas, ${warningCount} advertencias`);

// ✅ VALIDAR VARIABLES CRÍTICAS PARA PRISMA Y APP
const criticalVars = [
  'DATABASE_URL',
  'JWT_SECRET', 
  'JWT_REFRESH_SECRET'
];

console.log('🔍 Validando variables críticas...');

const missing = [];
const configured = [];

criticalVars.forEach(key => {
  if (process.env[key]) {
    configured.push(key);
    
    // Log especial para DATABASE_URL
    if (key === 'DATABASE_URL') {
      const dbUrl = process.env[key];
      const host = dbUrl.split('@')[1]?.split('/')[0] || 'unknown';
      console.log(`✅ ${key}: conectando a ${host}`);
    } else if (key.includes('SECRET')) {
      console.log(`✅ ${key}: configurado (${process.env[key].length} caracteres)`);
    } else {
      console.log(`✅ ${key}: ${process.env[key]}`);
    }
  } else {
    missing.push(key);
    console.error(`❌ ${key}: NO CONFIGURADA`);
  }
});

// ✅ VALIDAR VARIABLES OPCIONALES (incluir Turnstile)
const optionalVars = [
  'CLOUDINARY_CLOUD_NAME',
  'STRIPE_SECRET_KEY',
  'EMAIL_USER',
  'TURNSTILE_SECRET_KEY' // 🔐 NUEVA: Turnstile para backend
];

console.log('🔍 Validando variables opcionales...');
optionalVars.forEach(key => {
  if (process.env[key]) {
    if (key.includes('SECRET') || key.includes('KEY')) {
      console.log(`✅ ${key}: configurado (${process.env[key].length} caracteres)`);
    } else {
      console.log(`✅ ${key}: ${process.env[key]}`);
    }
  } else {
    console.warn(`⚠️  ${key}: no configurada (funcionalidad limitada)`);
  }
});

// ✅ MANEJO DE ERRORES CRÍTICOS
if (missing.length > 0) {
  console.error('💥 VARIABLES CRÍTICAS FALTANTES:', missing.join(', '));
  
  if (isProd) {
    console.error('💥 EN PRODUCCIÓN ESTO ES FATAL - DETENIENDO APLICACIÓN');
    process.exit(1);
  } else {
    console.warn('⚠️  En desarrollo, continuando con advertencias...');
  }
}

// ✅ VERIFICACIÓN ESPECIAL PARA PRISMA
if (process.env.DATABASE_URL) {
  console.log('🎯 PRISMA: DATABASE_URL está disponible para generación del cliente');
  
  // Verificar formato básico de la URL
  try {
    const url = new URL(process.env.DATABASE_URL);
    console.log(`🔗 Protocolo: ${url.protocol}`);
    console.log(`🏠 Host: ${url.hostname}:${url.port}`);
    console.log(`📁 Database: ${url.pathname.slice(1)}`);
  } catch (error) {
    console.warn('⚠️  DATABASE_URL tiene formato inválido:', error.message);
  }
} else {
  console.error('💥 PRISMA: DATABASE_URL NO DISPONIBLE - Prisma Generate fallará');
}

// ✅ CONFIGURACIÓN PARA EXPORT (con Turnstile agregado)
const envConfig = {
  NODE_ENV,
  isDev,
  isProd,
  timestamp: new Date().toISOString(),
  
  // Configuración exportada
  config: {
    environment: {
      NODE_ENV,
      isDevelopment: isDev,
      isProduction: isProd,
      PORT: parseInt(process.env.PORT) || 3000
    },
    
    database: { 
      url: process.env.DATABASE_URL 
    },
    
    jwt: { 
      secret: process.env.JWT_SECRET,
      refreshSecret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    },
    
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl: process.env.GOOGLE_CALLBACK_URL
    },
    
    // 🔐 NUEVO: Turnstile configuration
    turnstile: {
      secretKey: process.env.TURNSTILE_SECRET_KEY,
      verificationUrl: 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
    },
    
    urls: {
      frontend: process.env.FRONTEND_URL,
      api: process.env.API_URL,
      cors: process.env.CORS_ORIGIN
    },
    
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET
    },
    
    stripe: {
      publicKey: process.env.STRIPE_PUBLIC_KEY,
      secretKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
    },
    
    email: {
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
      from: process.env.EMAIL_FROM,
      fromName: process.env.EMAIL_FROM_NAME
    },
    
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
      max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
      disabled: process.env.DISABLE_RATE_LIMIT === 'true'
    },
    
    security: {
      bcryptRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12
    }
  }
};

// ✅ LOG FINAL DE ESTADO (actualizado con Turnstile)
console.log('✅ ENV-LOADER: Configuración completada exitosamente');
console.log(`📊 Variables críticas configuradas: ${configured.length}/${criticalVars.length}`);
console.log(`💾 DATABASE_URL: ${process.env.DATABASE_URL ? 'DISPONIBLE' : 'NO DISPONIBLE'}`);
console.log(`🔐 Secrets: ${configured.filter(v => v.includes('SECRET')).length} configurados`);
console.log(`🌐 URLs: ${process.env.FRONTEND_URL ? 'Frontend OK' : 'Frontend faltante'}`);
console.log(`🔐 Turnstile: ${process.env.TURNSTILE_SECRET_KEY ? 'Configurado' : 'No configurado'}`);
console.log('==========================================');

// ✅ EXPORT PARA USO EN OTROS ARCHIVOS
module.exports = envConfig;