// config/environment.js - CONFIGURACIÓN SIMPLIFICADA Y ARREGLADA
// ✅ IMPORTANTE: Las variables ya fueron mapeadas por env-loader.js
// ✅ Este archivo solo organiza y valida la configuración

// Cargar la configuración ya mapeada desde env-loader
const envLoaderConfig = require('../../env-loader');

console.log('📋 Environment.js: Cargando configuración ya mapeada...');

// ✅ CONFIGURACIÓN PRINCIPAL USANDO VARIABLES YA MAPEADAS
const config = {
  // 🌍 Información del entorno
  environment: {
    NODE_ENV: envLoaderConfig.NODE_ENV,
    PORT: parseInt(process.env.PORT) || 3000,
    isProduction: envLoaderConfig.isProd,
    isDevelopment: envLoaderConfig.isDev,
    debugMode: envLoaderConfig.isDev,
    timestamp: new Date().toISOString()
  },

  // 💾 Base de datos (ya mapeada por env-loader)
  database: {
    url: process.env.DATABASE_URL
  },

  // 🔐 JWT (ya mapeada)
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET
  },

  // 🟦 Google OAuth (ya mapeada)
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL,
    
    // URLs fijas de Google
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo'
  },

  // 🔐 NUEVO: Cloudflare Turnstile
  turnstile: {
    secretKey: process.env.TURNSTILE_SECRET_KEY,
    verificationUrl: 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    enabled: !!process.env.TURNSTILE_SECRET_KEY
  },

  // ☁️ Cloudinary
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET
  },

  // 📧 Email
  email: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    from: process.env.EMAIL_FROM,
    fromName: process.env.EMAIL_FROM_NAME
  },

  // 💳 Stripe
  stripe: {
    publicKey: process.env.STRIPE_PUBLIC_KEY,
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
  },

  // 🌐 URLs (ya mapeadas)
  urls: {
    frontend: process.env.FRONTEND_URL,
    api: process.env.API_URL,
    cors: process.env.CORS_ORIGIN
  },

  // 🛡️ Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutos
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    disabled: process.env.DISABLE_RATE_LIMIT === 'true'
  },

  // 📁 File upload
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880, // 5MB
    allowedTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || ['jpg', 'jpeg', 'png', 'gif']
  },

  // 🔒 Security
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12
  },

  // 🔑 Auth configuración
  auth: {
    tokenExpiry: '24h',
    rememberMeExpiry: '30d',
    passwordResetExpiry: 3600000, // 1 hora en ms
    successRedirectPath: '/auth/success?',
    errorRedirectPath: '/auth/error?error=',
    tokenKey: 'telofundi_user',
    refreshKey: 'telofundi_refresh'
  },

  // 🏢 Business logic
  business: {
    agencyReviewTime: '24-48 horas'
  },

  // ⚙️ Defaults para la aplicación
  defaults: {
    escort: {
      maxPosts: 5
    },
    client: {
      welcomePoints: 10,
      dailyMessageLimit: 10,
      maxFavorites: 50,
      dailyLoginPoints: 2
    }
  },

  // 🔌 API configuración
  api: {
    timeout: 30000,
    retryAttempts: 3
  },

  // 📊 Límites globales
  limits: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880,
    bioMaxLength: 1000,
    messageMaxLength: 5000
  },

  // 🚀 Features toggles (actualizado con Turnstile)
  features: {
    googleAuth: true,
    emailNotifications: true,
    fileUploads: true,
    rateLimit: !envLoaderConfig.isDev,
    debugMode: envLoaderConfig.isDev,
    turnstile: !!process.env.TURNSTILE_SECRET_KEY // 🔐 NUEVO: Feature toggle para Turnstile
  },

  // 📱 App metadata
  app: {
    name: 'TeLoFundi',
    version: '1.0.0',
    description: 'Plataforma de acompañantes del Caribe'
  }
};

// ✅ VALIDACIÓN AUTOMÁTICA MEJORADA (actualizada con Turnstile)
const validateConfig = () => {
  console.log('🔍 Validando configuración de environment.js...');
  
  const errors = [];
  const warnings = [];
  
  // ✅ Validar variables críticas (ya deben estar mapeadas)
  const criticalChecks = [
    { key: 'database.url', value: config.database.url, name: 'DATABASE_URL' },
    { key: 'jwt.secret', value: config.jwt.secret, name: 'JWT_SECRET' },
    { key: 'jwt.refreshSecret', value: config.jwt.refreshSecret, name: 'JWT_REFRESH_SECRET' },
    { key: 'urls.frontend', value: config.urls.frontend, name: 'FRONTEND_URL' },
    { key: 'urls.cors', value: config.urls.cors, name: 'CORS_ORIGIN' }
  ];
  
  criticalChecks.forEach(check => {
    if (!check.value) {
      errors.push(`${check.name} no está configurada (${check.key})`);
    }
  });
  
  // ✅ Validar BCRYPT_ROUNDS específicamente (era un error común)
  if (!config.security.bcryptRounds || !Number.isInteger(config.security.bcryptRounds)) {
    errors.push('BCRYPT_SALT_ROUNDS debe ser un número entero válido');
  }
  
  if (config.security.bcryptRounds < 10 || config.security.bcryptRounds > 15) {
    warnings.push('BCRYPT_SALT_ROUNDS recomendado entre 10-15 para balance seguridad/performance');
  }
  
  // ✅ Verificar formato de URLs
  const urlChecks = [
    { name: 'FRONTEND_URL', value: config.urls.frontend },
    { name: 'API_URL', value: config.urls.api }
  ];
  
  urlChecks.forEach(check => {
    if (check.value) {
      try {
        new URL(check.value);
      } catch {
        errors.push(`${check.name} tiene formato inválido: ${check.value}`);
      }
    }
  });
  
  // ✅ Warnings para variables opcionales importantes (incluyendo Turnstile)
  const optionalChecks = [
    { name: 'Google OAuth', value: config.google.clientId },
    { name: 'Cloudinary', value: config.cloudinary.cloudName },
    { name: 'Email', value: config.email.user },
    { name: 'Stripe', value: config.stripe.secretKey },
    { name: 'Turnstile CAPTCHA', value: config.turnstile.secretKey } // 🔐 NUEVO
  ];
  
  optionalChecks.forEach(check => {
    if (!check.value) {
      warnings.push(`${check.name} no configurado - funcionalidad limitada`);
    }
  });

  // ✅ Mostrar resultados
  if (errors.length > 0) {
    console.error('❌ ERRORES CRÍTICOS EN CONFIGURACIÓN:');
    errors.forEach(error => console.error(`   - ${error}`));
    
    if (config.environment.isProduction) {
      throw new Error(`Configuración inválida en producción: ${errors.join(', ')}`);
    }
  }

  if (warnings.length > 0 && config.environment.isDevelopment) {
    console.warn('⚠️  ADVERTENCIAS DE CONFIGURACIÓN:');
    warnings.forEach(warning => console.warn(`   - ${warning}`));
  }

  if (errors.length === 0) {
    console.log('✅ Configuración validada correctamente');
    console.log(`🔐 Bcrypt Rounds: ${config.security.bcryptRounds}`);
    console.log(`🌐 Entorno: ${config.environment.NODE_ENV}`);
    console.log(`💾 Database: ${config.database.url ? 'CONFIGURADA' : 'FALTANTE'}`);
    console.log(`🔐 Turnstile: ${config.turnstile.secretKey ? 'CONFIGURADO' : 'NO CONFIGURADO'}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: {
      environment: config.environment.NODE_ENV,
      database: config.database.url ? 'CONFIGURADA' : 'FALTANTE',
      frontendUrl: config.urls.frontend,
      googleOAuth: config.google.clientId ? 'CONFIGURADO' : 'FALTANTE',
      cloudinary: config.cloudinary.cloudName ? 'CONFIGURADO' : 'FALTANTE',
      turnstile: config.turnstile.secretKey ? 'CONFIGURADO' : 'FALTANTE', // 🔐 NUEVO
      rateLimiting: config.rateLimit.disabled ? 'DESACTIVADO' : 'ACTIVADO'
    }
  };
};

// ✅ EJECUTAR VALIDACIÓN AL CARGAR
console.log('📋 Validando configuración final...');
const validation = validateConfig();

// ✅ LOG FINAL DE CONFIGURACIÓN (actualizado con Turnstile)
console.log('📋 === RESUMEN DE CONFIGURACIÓN ===');
console.log(`🌍 Entorno: ${config.environment.NODE_ENV}`);
console.log(`🚪 Puerto: ${config.environment.PORT}`);
console.log(`💾 Base de datos: ${config.database.url ? '✅ Configurada' : '❌ Faltante'}`);
console.log(`🌐 Frontend URL: ${config.urls.frontend}`);
console.log(`🔗 API URL: ${config.urls.api}`);
console.log(`🔄 CORS Origin: ${config.urls.cors}`);
console.log(`🟦 Google OAuth: ${config.google.clientId ? '✅ Configurado' : '❌ Faltante'}`);
console.log(`☁️  Cloudinary: ${config.cloudinary.cloudName ? '✅ Configurado' : '❌ Faltante'}`);
console.log(`🔐 Turnstile CAPTCHA: ${config.turnstile.secretKey ? '✅ Configurado' : '❌ Faltante'}`); // 🔐 NUEVO
console.log(`🛡️  Rate Limiting: ${config.rateLimit.disabled ? '❌ Desactivado' : '✅ Activado'}`);
console.log(`🔐 Bcrypt Rounds: ${config.security.bcryptRounds}`);
console.log('===================================');

// ✅ HELPERS PARA ACCESO RÁPIDO (actualizados con Turnstile)
const helpers = {
  // Database
  getDatabaseUrl: () => config.database.url,
  
  // URLs
  getFrontendUrl: () => config.urls.frontend,
  getApiUrl: () => config.urls.api,
  getCorsOrigin: () => config.urls.cors,
  
  // Funciones de URLs dinámicas
  getApiUrlFor: (endpoint) => {
    const baseUrl = config.urls.api;
    return endpoint.startsWith('/') ? `${baseUrl}${endpoint}` : `${baseUrl}/${endpoint}`;
  },
  
  getGoogleAuthUrl: (userType = 'CLIENT') => {
    const baseUrl = config.urls.api;
    return `${baseUrl}/auth/google?userType=${userType}`;
  },
  
  // Configuraciones específicas
  getGoogleConfig: () => config.google,
  getEmailConfig: () => config.email,
  getStripeConfig: () => config.stripe,
  getCloudinaryConfig: () => config.cloudinary,
  getSecurityConfig: () => config.security,
  getAuthConfig: () => config.auth,
  getDefaultsConfig: () => config.defaults,
  getTurnstileConfig: () => config.turnstile, // 🔐 NUEVO: Helper para Turnstile
  
  // Estado
  isProduction: config.environment.isProduction,
  isDevelopment: config.environment.isDevelopment
};

// ✅ EXPORTAR CONFIGURACIÓN Y HELPERS
module.exports = {
  config,
  validation,
  ...helpers
};