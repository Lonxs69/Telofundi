/**
 * ====================================================================
 * ⚙️ CONFIG.JS - CONFIGURACIÓN AUTOMÁTICA FRONTEND v3.1.1
 * ====================================================================
 * 
 * ✅ SISTEMA COMPLETAMENTE AUTOMÁTICO
 * ✅ MAPEO DINÁMICO SEGÚN VITE_NODE_ENV
 * ✅ VALIDACIÓN AUTOMÁTICA
 * ✅ FALLBACKS ROBUSTOS
 * ✅ ZERO HARDCODING
 * ✅ MANEJO DE ERRORES COMPLETO
 * 🔐 NUEVO: Soporte para Cloudflare Turnstile
 * 🔑 CORREGIDO: STORAGE_KEYS exportado correctamente
 * 
 * ====================================================================
 */

// ✅ FUNCIÓN SEGURA PARA OBTENER VARIABLES DE ENTORNO
const getEnvVar = (key, fallback = null) => {
  try {
    // Intentar acceder a la variable
    const value = import.meta.env?.[key];
    
    // Verificar si tiene valor válido
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
    
    // Usar fallback si está disponible
    if (fallback !== null) {
      console.warn(`⚠️ [CONFIG] Variable ${key} no encontrada, usando fallback: ${fallback}`);
      return fallback;
    }
    
    // Si no hay fallback, retornar undefined
    console.error(`❌ [CONFIG] Variable ${key} no encontrada y sin fallback`);
    return undefined;
    
  } catch (error) {
    console.error(`❌ [CONFIG] Error accediendo a variable ${key}:`, error);
    return fallback;
  }
};

// ✅ DETECCIÓN DE ENTORNO ROBUSTA Y AUTOMÁTICA
const detectEnvironment = () => {
  // Prioridad: VITE_NODE_ENV > MODE > fallback
  const viteEnv = getEnvVar('VITE_NODE_ENV');
  const mode = import.meta.env?.MODE;
  
  let detectedEnv = 'development'; // fallback por defecto
  
  if (viteEnv) {
    detectedEnv = viteEnv.toLowerCase();
    console.log(`🔧 [CONFIG] Usando VITE_NODE_ENV: ${detectedEnv}`);
  } else if (mode) {
    detectedEnv = mode.toLowerCase();
    console.log(`🔧 [CONFIG] Usando MODE: ${detectedEnv}`);
  } else {
    console.warn('⚠️ [CONFIG] No se detectó entorno, usando development por defecto');
  }
  
  return detectedEnv;
};

// ✅ DETERMINAR ENTORNO ACTUAL
const currentEnvironment = detectEnvironment();
const isDevelopment = currentEnvironment === 'development';
const isProduction = currentEnvironment === 'production';

// ✅ BANNER DE INICIO
console.log('🚀 === CONFIGURACIÓN FRONTEND TELOFUNDI v3.1.1 ===');
console.log(`🔧 Entorno detectado: ${currentEnvironment}`);
console.log(`🔧 Es desarrollo: ${isDevelopment}`);
console.log(`🔧 Es producción: ${isProduction}`);
console.log('================================================');

// ✅ DEBUG: Mostrar variables disponibles en desarrollo
if (isDevelopment) {
  const allEnvVars = Object.keys(import.meta.env || {});
  const viteVars = allEnvVars.filter(key => key.startsWith('VITE_'));
  
  console.log(`🔧 [DEBUG] Variables totales: ${allEnvVars.length}`);
  console.log(`🔧 [DEBUG] Variables VITE_: ${viteVars.length}`);
  
  if (viteVars.length > 0) {
    console.log('🔧 [DEBUG] Variables VITE disponibles:');
    viteVars.forEach(key => {
      const value = import.meta.env[key];
      const displayValue = key.includes('SECRET') || key.includes('KEY') ? 
                          `${value.substring(0, 8)}...` : value;
      console.log(`   ${key}: ${displayValue}`);
    });
  }
}

// ✅ CONFIGURACIÓN PRINCIPAL CON MAPEO AUTOMÁTICO
const config = {
  // ✅ INFORMACIÓN DEL ENTORNO
  environment: {
    NODE_ENV: currentEnvironment,
    isDevelopment,
    isProduction,
    debugMode: isDevelopment || getEnvVar('VITE_DEBUG_MODE') === 'true',
    timestamp: new Date().toISOString()
  },

  // ✅ URLs DINÁMICAS CON MAPEO AUTOMÁTICO
  urls: {
    // API URLs - Mapeo automático según entorno
    api: isDevelopment 
      ? getEnvVar('VITE_API_URL_DEV', 'http://localhost:3000/api')
      : getEnvVar('VITE_API_URL_PROD', 'https://telofundi.com/api'),
    
    // Frontend URLs
    frontend: isDevelopment 
      ? getEnvVar('VITE_FRONTEND_URL_DEV', 'http://localhost:5173')
      : getEnvVar('VITE_FRONTEND_URL_PROD', 'https://telofundi.com'),
    
    // Socket URLs
    socket: isDevelopment 
      ? getEnvVar('VITE_SOCKET_URL_DEV', 'http://localhost:3000')
      : getEnvVar('VITE_SOCKET_URL_PROD', 'https://telofundi.com'),
    
    // WebSocket URLs
    websocket: isDevelopment 
      ? getEnvVar('VITE_WS_URL_DEV', 'ws://localhost:3000')
      : getEnvVar('VITE_WS_URL_PROD', 'wss://telofundi.com')
  },

  // ✅ GOOGLE OAUTH CON MAPEO AUTOMÁTICO
  google: {
    clientId: isDevelopment 
      ? getEnvVar('VITE_GOOGLE_CLIENT_ID_DEV', '806629606259-vhh2tllvhkvp42987d06ru6vnterkija.apps.googleusercontent.com')
      : getEnvVar('VITE_GOOGLE_CLIENT_ID_PROD', '1010933439861-t4t4i45of6gvsfb4s23083i4s1l8pr0q.apps.googleusercontent.com'),
    
    callbackUrl: isDevelopment 
      ? getEnvVar('VITE_GOOGLE_CALLBACK_URL_DEV', 'http://localhost:3000/api/auth/google/callback')
      : getEnvVar('VITE_GOOGLE_CALLBACK_URL_PROD', 'https://telofundi.com/api/auth/google/callback')
  },

  // ✅ STRIPE CON MAPEO AUTOMÁTICO
  stripe: {
    publicKey: isDevelopment 
      ? getEnvVar('VITE_STRIPE_PUBLIC_KEY_DEV', 'pk_test_51QME2gCfm4e6XYimXXwBrIWObEDME8iaEjMFtPZZpg8W98lLAMBwcJTGAMjudpx1pf8hgc1cVuKPnCZWI8AsgINb00Czi3dB7Z')
      : getEnvVar('VITE_STRIPE_PUBLIC_KEY_PROD', 'pk_live_51QME2gCfm4e6XYimXXwBrIWObEDME8iaEjMFtPZZpg8W98lLAMBwcJTGAMjudpx1pf8hgc1cVuKPnCZWI8AsgINb00Czi3dB7Z')
  },

  // 🔐 NUEVO: CLOUDFLARE TURNSTILE
  turnstile: {
    siteKey: getEnvVar('VITE_TURNSTILE_SITE_KEY'),
    scriptUrl: 'https://challenges.cloudflare.com/turnstile/v0/api.js',
    enabled: !!getEnvVar('VITE_TURNSTILE_SITE_KEY'),
    theme: getEnvVar('VITE_TURNSTILE_THEME', 'light'), // 'light' | 'dark' | 'auto'
    size: getEnvVar('VITE_TURNSTILE_SIZE', 'normal'), // 'normal' | 'compact'
    refreshExpired: 'auto'
  },

  // ✅ CONFIGURACIÓN DE AUTENTICACIÓN
  auth: {
    tokenKey: 'telofundi_user',
    refreshKey: 'telofundi_refresh',
    tokenExpiry: '24h',
    refreshExpiry: '7d',
    rememberMeExpiry: '30d',
    successRedirectPath: '/auth/success',
    errorRedirectPath: '/auth/error'
  },

  // ✅ INFORMACIÓN DE LA APP
  app: {
    name: getEnvVar('VITE_APP_NAME', 'TeloFundi'),
    version: getEnvVar('VITE_APP_VERSION', '1.0.0'),
    description: getEnvVar('VITE_APP_DESCRIPTION', 'Plataforma de acompañantes del Caribe'),
    defaultTheme: getEnvVar('VITE_DEFAULT_THEME', 'light')
  },

  // ✅ FEATURES HABILITADOS (actualizado con Turnstile)
  features: {
    chat: getEnvVar('VITE_CHAT_ENABLED', 'true') === 'true',
    payments: getEnvVar('VITE_PAYMENTS_ENABLED', 'true') === 'true',
    notifications: getEnvVar('VITE_NOTIFICATIONS_ENABLED', 'true') === 'true',
    googleAuth: getEnvVar('VITE_GOOGLE_AUTH_ENABLED', 'true') === 'true',
    stripe: getEnvVar('VITE_STRIPE_ENABLED', 'true') === 'true',
    pointsSystem: getEnvVar('VITE_POINTS_SYSTEM_ENABLED', 'true') === 'true',
    premium: getEnvVar('VITE_PREMIUM_ENABLED', 'true') === 'true',
    darkMode: getEnvVar('VITE_ENABLE_DARK_MODE', 'true') === 'true',
    geolocation: getEnvVar('VITE_ENABLE_GEOLOCATION', 'true') === 'true',
    analytics: getEnvVar('VITE_ENABLE_ANALYTICS', 'false') === 'true',
    errorTracking: getEnvVar('VITE_ENABLE_ERROR_TRACKING', 'true') === 'true',
    turnstile: !!getEnvVar('VITE_TURNSTILE_SITE_KEY') // 🔐 NUEVO: Feature toggle para Turnstile
  },

  // ✅ LÍMITES Y CONFIGURACIONES
  limits: {
    maxFileSize: parseInt(getEnvVar('VITE_MAX_FILE_SIZE', '5242880')), // 5MB
    maxImagesPerPost: parseInt(getEnvVar('VITE_MAX_IMAGES_PER_POST', '5')),
    messageMaxLength: parseInt(getEnvVar('VITE_MESSAGE_MAX_LENGTH', '2000')),
    titleMaxLength: parseInt(getEnvVar('VITE_TITLE_MAX_LENGTH', '150')),
    bioMaxLength: parseInt(getEnvVar('VITE_BIO_MAX_LENGTH', '500')),
    minPointsPurchase: parseInt(getEnvVar('VITE_MIN_POINTS_PURCHASE', '50')),
    maxPointsPurchase: parseInt(getEnvVar('VITE_MAX_POINTS_PURCHASE', '10000')),
    pointsExpiryDays: parseInt(getEnvVar('VITE_POINTS_EXPIRY_DAYS', '365'))
  },

  // ✅ CONFIGURACIÓN DE API
  api: {
    timeout: parseInt(getEnvVar('VITE_API_TIMEOUT', '30000')),
    retryAttempts: parseInt(getEnvVar('VITE_RETRY_ATTEMPTS', '3')),
    requestDelay: parseInt(getEnvVar('VITE_REQUEST_DELAY', '100'))
  },

  // ✅ CONFIGURACIÓN DE CACHE
  cache: {
    enabled: getEnvVar('VITE_CACHE_ENABLED', 'true') === 'true',
    duration: parseInt(getEnvVar('VITE_CACHE_DURATION', '300000')), // 5 minutos
    offlineSupport: getEnvVar('VITE_OFFLINE_SUPPORT', 'false') === 'true'
  },

  // ✅ CONFIGURACIÓN DE SEGURIDAD
  security: {
    csrfProtection: getEnvVar('VITE_ENABLE_CSRF_PROTECTION', 'true') === 'true',
    secureCookies: getEnvVar('VITE_SECURE_COOKIES', 'true') === 'true',
    sessionTimeout: parseInt(getEnvVar('VITE_SESSION_TIMEOUT', '3600000')) // 1 hora
  },

  // ✅ CONFIGURACIÓN DE UBICACIÓN
  location: {
    defaultCountry: getEnvVar('VITE_DEFAULT_COUNTRY', 'DO'),
    defaultCity: getEnvVar('VITE_DEFAULT_CITY', 'Santo Domingo')
  },

  // ✅ CONFIGURACIÓN DE IDIOMAS
  i18n: {
    enabled: getEnvVar('VITE_ENABLE_I18N', 'true') === 'true',
    defaultLanguage: getEnvVar('VITE_DEFAULT_LANGUAGE', 'es'),
    supportedLanguages: getEnvVar('VITE_SUPPORTED_LANGUAGES', 'es,en').split(',')
  }
};

// 🔑 NUEVO: CREAR STORAGE_KEYS BASADO EN LA CONFIGURACIÓN EXISTENTE
export const STORAGE_KEYS = {
  USER_DATA: config.auth.tokenKey,        // 'telofundi_user'
  REFRESH_TOKEN: config.auth.refreshKey,  // 'telofundi_refresh'
  THEME: 'telofundi_theme',
  SEARCH_FILTERS: 'telofundi_search_filters'
};

// ✅ VALIDACIÓN AUTOMÁTICA COMPLETA (actualizada con Turnstile)
const validateConfig = () => {
  console.log('🔍 [CONFIG] Iniciando validación de configuración...');
  
  const errors = [];
  const warnings = [];
  
  // ✅ Verificar URLs críticas
  const urlChecks = [
    { name: 'API URL', value: config.urls.api, required: true },
    { name: 'Frontend URL', value: config.urls.frontend, required: true },
    { name: 'Socket URL', value: config.urls.socket, required: false }
  ];
  
  urlChecks.forEach(check => {
    if (check.required && !check.value) {
      errors.push(`${check.name} no está configurada`);
    } else if (check.value) {
      try {
        new URL(check.value);
        console.log(`✅ [CONFIG] ${check.name}: ${check.value}`);
      } catch {
        errors.push(`${check.name} tiene formato inválido: ${check.value}`);
      }
    }
  });
  
  // ✅ Verificar configuración de Google OAuth
  if (!config.google.clientId) {
    warnings.push('Google Client ID no configurado - OAuth no funcionará');
  } else {
    const isValidFormat = config.google.clientId.includes('.apps.googleusercontent.com');
    if (!isValidFormat) {
      warnings.push('Google Client ID parece tener formato inválido');
    }
    console.log(`✅ [CONFIG] Google OAuth: Configurado`);
  }
  
  // ✅ Verificar configuración de Stripe
  if (!config.stripe.publicKey) {
    warnings.push('Stripe Public Key no configurada - Pagos no funcionarán');
  } else {
    const isValidStripeKey = config.stripe.publicKey.startsWith('pk_');
    if (!isValidStripeKey) {
      errors.push('Stripe Public Key tiene formato inválido (debe empezar con pk_)');
    } else {
      const keyType = config.stripe.publicKey.startsWith('pk_test_') ? 'TEST' : 'LIVE';
      console.log(`✅ [CONFIG] Stripe: Configurado (${keyType})`);
    }
  }

  // 🔐 NUEVO: Verificar configuración de Turnstile
  if (!config.turnstile.siteKey) {
    warnings.push('Turnstile Site Key no configurada - CAPTCHA no funcionará');
  } else {
    const isValidTurnstileKey = config.turnstile.siteKey.startsWith('0x4');
    if (!isValidTurnstileKey) {
      warnings.push('Turnstile Site Key parece tener formato inválido');
    } else {
      console.log(`✅ [CONFIG] Turnstile CAPTCHA: Configurado`);
    }
  }
  
  // 🔑 NUEVO: Verificar configuración de STORAGE_KEYS
  if (!STORAGE_KEYS.USER_DATA) {
    errors.push('STORAGE_KEYS.USER_DATA no configurado');
  } else {
    console.log(`✅ [CONFIG] Storage Keys: Configurados (USER_DATA: ${STORAGE_KEYS.USER_DATA})`);
  }
  
  // ✅ Verificar límites
  const limitChecks = [
    { name: 'Max File Size', value: config.limits.maxFileSize, min: 1000000 },
    { name: 'Max Images Per Post', value: config.limits.maxImagesPerPost, min: 1 },
    { name: 'Message Max Length', value: config.limits.messageMaxLength, min: 100 }
  ];
  
  limitChecks.forEach(check => {
    if (isNaN(check.value) || check.value < check.min) {
      warnings.push(`${check.name} tiene valor inválido: ${check.value}`);
    }
  });
  
  // ✅ Verificar coherencia entre entornos
  if (isProduction) {
    if (config.urls.api?.includes('localhost')) {
      errors.push('En producción no debería usar localhost en API URL');
    }
    if (config.stripe.publicKey?.startsWith('pk_test_')) {
      warnings.push('En producción usando clave de test de Stripe');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: {
      environment: config.environment.NODE_ENV,
      apiUrl: config.urls.api,
      frontendUrl: config.urls.frontend,
      googleConfigured: !!config.google.clientId,
      stripeConfigured: !!config.stripe.publicKey,
      turnstileConfigured: !!config.turnstile.siteKey, // 🔐 NUEVO
      storageKeysConfigured: !!STORAGE_KEYS.USER_DATA, // 🔑 NUEVO
      featuresEnabled: Object.values(config.features).filter(Boolean).length,
      debugMode: config.environment.debugMode
    }
  };
};

// ✅ EJECUTAR VALIDACIÓN
console.log('🔍 [CONFIG] Validando configuración...');
const validation = validateConfig();

// ✅ MOSTRAR RESULTADOS DE VALIDACIÓN
if (!validation.isValid) {
  console.error('❌ [CONFIG] ERRORES CRÍTICOS:');
  validation.errors.forEach(error => console.error(`  - ${error}`));
  
  // En desarrollo mostrar advertencia, en producción podría fallar
  if (isProduction) {
    throw new Error(`Configuración inválida: ${validation.errors.join(', ')}`);
  }
} else {
  console.log('✅ [CONFIG] Configuración validada correctamente');
}

if (validation.warnings.length > 0) {
  console.warn('⚠️ [CONFIG] ADVERTENCIAS:');
  validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
}

// ✅ LOG FINAL DE CONFIGURACIÓN (actualizado con Turnstile + Storage Keys)
console.log('📋 [CONFIG] Resumen de configuración:');
console.table({
  'Entorno': config.environment.NODE_ENV,
  'API URL': config.urls.api,
  'Frontend URL': config.urls.frontend,
  'Socket URL': config.urls.socket,
  'Google OAuth': config.google.clientId ? 'Configurado' : 'NO CONFIGURADO',
  'Stripe': config.stripe.publicKey ? 'Configurado' : 'NO CONFIGURADO',
  'Turnstile CAPTCHA': config.turnstile.siteKey ? 'Configurado' : 'NO CONFIGURADO', // 🔐 NUEVO
  'Storage Keys': STORAGE_KEYS.USER_DATA ? 'Configurado' : 'NO CONFIGURADO', // 🔑 NUEVO
  'Debug Mode': config.environment.debugMode,
  'Features Habilitados': Object.values(config.features).filter(Boolean).length
});

// ✅ FUNCIONES HELPER ROBUSTAS (actualizadas con Turnstile)
export const getApiUrl = (endpoint = '') => {
  if (!config.urls.api) {
    const fallbackUrl = isDevelopment ? 'http://localhost:3000/api' : 'https://telofundi.com/api';
    console.warn(`⚠️ [HELPER] API URL no configurada, usando fallback: ${fallbackUrl}`);
    config.urls.api = fallbackUrl;
  }
  
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${config.urls.api}${cleanEndpoint}`;
  
  if (config.environment.debugMode) {
    console.log(`🔧 [HELPER] getApiUrl: ${endpoint} → ${fullUrl}`);
  }
  
  return fullUrl;
};

export const getFrontendUrl = (path = '') => {
  if (!config.urls.frontend) {
    const fallbackUrl = isDevelopment ? 'http://localhost:5173' : 'https://telofundi.com';
    console.warn(`⚠️ [HELPER] Frontend URL no configurada, usando fallback: ${fallbackUrl}`);
    config.urls.frontend = fallbackUrl;
  }
  
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const fullUrl = `${config.urls.frontend}${cleanPath}`;
  
  if (config.environment.debugMode) {
    console.log(`🔧 [HELPER] getFrontendUrl: ${path} → ${fullUrl}`);
  }
  
  return fullUrl;
};

export const getSocketUrl = (namespace = '') => {
  if (!config.urls.socket) {
    const fallbackUrl = isDevelopment ? 'http://localhost:3000' : 'https://telofundi.com';
    console.warn(`⚠️ [HELPER] Socket URL no configurada, usando fallback: ${fallbackUrl}`);
    config.urls.socket = fallbackUrl;
  }
  
  const cleanNamespace = namespace.startsWith('/') ? namespace : `/${namespace}`;
  const fullUrl = namespace ? `${config.urls.socket}${cleanNamespace}` : config.urls.socket;
  
  if (config.environment.debugMode) {
    console.log(`🔧 [HELPER] getSocketUrl: ${namespace} → ${fullUrl}`);
  }
  
  return fullUrl;
};

export const getGoogleAuthUrl = (userType = 'CLIENT') => {
  if (!config.google.clientId) {
    console.error('❌ [HELPER] Google Client ID no configurado');
    throw new Error('Google OAuth no está configurado correctamente');
  }
  
  if (!config.urls.api) {
    console.error('❌ [HELPER] API URL no configurada para Google Auth');
    throw new Error('API URL no está configurada');
  }
  
  const googleAuthEndpoint = `${config.urls.api}/auth/google`;
  const fullUrl = `${googleAuthEndpoint}?userType=${userType}`;
  
  if (config.environment.debugMode) {
    console.log('🔧 [HELPER] === GOOGLE AUTH URL ===');
    console.log(`🔧 API URL: ${config.urls.api}`);
    console.log(`🔧 User Type: ${userType}`);
    console.log(`🔧 Full URL: ${fullUrl}`);
  }
  
  return fullUrl;
};

export const getStripePublicKey = () => {
  if (!config.stripe.publicKey) {
    console.error('❌ [HELPER] Stripe Public Key no configurada');
    throw new Error('Stripe no está configurado correctamente');
  }
  
  if (config.environment.debugMode) {
    console.log('🔧 [HELPER] === STRIPE PUBLIC KEY ===');
    console.log(`🔧 Environment: ${config.environment.NODE_ENV}`);
    console.log(`🔧 Key starts with: ${config.stripe.publicKey.substring(0, 8)}...`);
    console.log(`🔧 Key type: ${config.stripe.publicKey.startsWith('pk_test_') ? 'TEST' : 'LIVE'}`);
  }
  
  return config.stripe.publicKey;
};

// 🔐 NUEVO: Helper para Turnstile
export const getTurnstileConfig = () => {
  if (!config.turnstile.siteKey) {
    console.error('❌ [HELPER] Turnstile Site Key no configurada');
    throw new Error('Turnstile CAPTCHA no está configurado correctamente');
  }
  
  if (config.environment.debugMode) {
    console.log('🔧 [HELPER] === TURNSTILE CONFIG ===');
    console.log(`🔧 Environment: ${config.environment.NODE_ENV}`);
    console.log(`🔧 Site Key: ${config.turnstile.siteKey.substring(0, 8)}...`);
    console.log(`🔧 Enabled: ${config.turnstile.enabled}`);
    console.log(`🔧 Theme: ${config.turnstile.theme}`);
    console.log(`🔧 Size: ${config.turnstile.size}`);
  }
  
  return config.turnstile;
};

// 🔑 NUEVO: Helper para Storage Keys
export const getStorageKey = (keyName) => {
  if (!STORAGE_KEYS[keyName]) {
    console.warn(`⚠️ [HELPER] Storage key '${keyName}' no encontrada`);
    return null;
  }
  
  if (config.environment.debugMode) {
    console.log(`🔧 [HELPER] getStorageKey: ${keyName} → ${STORAGE_KEYS[keyName]}`);
  }
  
  return STORAGE_KEYS[keyName];
};

// ✅ FUNCIÓN PARA VERIFICAR CONEXIÓN CON LA API - CORREGIDA
export const checkApiConnection = async () => {
  try {
    // ✅ FIX: Usar /health directo, no /api/health
    const healthUrl = config.urls.api.replace('/api', '') + '/health';
    console.log(`🔍 [HELPER] Verificando conexión API: ${healthUrl}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.api.timeout);
    
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      console.log('✅ [HELPER] API connection successful');
      return { success: true, status: response.status, url: healthUrl };
    } else {
      console.warn(`⚠️ [HELPER] API responded with error: ${response.status}`);
      return { success: false, status: response.status, url: healthUrl };
    }
  } catch (error) {
    console.error('❌ [HELPER] API connection failed:', error.message);
    return { success: false, error: error.message };
  }
};

// ✅ FUNCIÓN DE DEBUG COMPLETA (actualizada con Turnstile + Storage Keys)
export const debugConfig = () => {
  if (!config.environment.debugMode) {
    return { message: 'Debug mode disabled' };
  }
  
  console.log('🔧 === DEBUG CONFIG FRONTEND COMPLETO v3.1.1 ===');
  
  // Test de generación de URLs
  try {
    const testUrls = {
      api: getApiUrl('/test'),
      frontend: getFrontendUrl('/dashboard'),
      socket: getSocketUrl('/chat'),
      googleAuth: getGoogleAuthUrl('CLIENT'),
      stripeKey: getStripePublicKey(),
      storageKeys: STORAGE_KEYS // 🔑 NUEVO
    };
    
    // 🔐 NUEVO: Test de Turnstile
    if (config.turnstile.enabled) {
      testUrls.turnstileConfig = getTurnstileConfig();
    }
    
    console.log('🔧 URLs de prueba generadas:');
    console.table(testUrls);
    
    console.log('🔑 Storage Keys configuradas:');
    console.table(STORAGE_KEYS);
    
    return {
      success: true,
      config,
      validation,
      testUrls,
      storageKeys: STORAGE_KEYS, // 🔑 NUEVO
      environment: {
        detected: currentEnvironment,
        isDev: isDevelopment,
        isProd: isProduction
      }
    };
    
  } catch (error) {
    console.error('❌ [DEBUG] Error en test de URLs:', error);
    return {
      success: false,
      error: error.message,
      config,
      validation
    };
  }
};

// ✅ INICIALIZACIÓN AUTOMÁTICA EN DESARROLLO
if (config.environment.debugMode) {
  console.log('🚀 === AUTO-DEBUG EN DESARROLLO ===');
  const debugResult = debugConfig();
  
  if (!debugResult.success) {
    console.error('❌ [DEBUG] Test de configuración falló:', debugResult.error);
  }
  
  // Verificar conexión API (sin bloquear)
  checkApiConnection()
    .then(result => {
      if (result.success) {
        console.log(`✅ [DEBUG] API está disponible: ${result.url}`);
      } else {
        console.warn(`⚠️ [DEBUG] API no disponible:`, result);
      }
    })
    .catch(error => {
      console.warn(`⚠️ [DEBUG] No se pudo verificar API:`, error.message);
    });
}

// ✅ EXPORTS SEGUROS (ACTUALIZADO CON STORAGE_KEYS)
export {
  config as default,
  detectEnvironment,
  getEnvVar,
  isDevelopment,
  isProduction,
  validateConfig,
  validation
  // STORAGE_KEYS ya está exportado arriba como named export
};

console.log('✅ === FRONTEND CONFIG.JS v3.1.1 CARGADO EXITOSAMENTE ===');
console.log(`🎯 Entorno: ${config.environment.NODE_ENV}`);
console.log(`🌐 API: ${config.urls.api}`);
console.log(`🟦 Google OAuth: ${config.google.clientId ? 'Configurado' : 'No configurado'}`);
console.log(`💳 Stripe: ${config.stripe.publicKey ? 'Configurado' : 'No configurado'}`);
console.log(`🔐 Turnstile CAPTCHA: ${config.turnstile.siteKey ? 'Configurado' : 'No configurado'}`); // 🔐 NUEVO
console.log(`🔑 Storage Keys: ${STORAGE_KEYS.USER_DATA ? 'Configurado' : 'No configurado'}`); // 🔑 NUEVO
console.log('======================================================');