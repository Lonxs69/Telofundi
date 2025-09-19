const cors = require('cors');
const { config, isProduction, isDevelopment } = require('../config/environment');

// ✅ CORS COMPLETAMENTE DINÁMICO - CERO HARDCODING
const corsOptions = {
  origin: function (origin, callback) {
    // 🎯 ORÍGENES PERMITIDOS DINÁMICOS
    const allowedOrigins = [
      config.urls.frontend,    // Frontend principal (automático)
      config.urls.cors,        // CORS origin (automático)
      
      // 🌐 Variaciones automáticas del frontend
      config.urls.frontend.replace('http://', 'https://'),
      config.urls.frontend.replace('https://', 'http://'),
      config.urls.frontend.replace('localhost', '127.0.0.1'),
      
      // 🔧 Puertos adicionales para desarrollo
      ...(isDevelopment ? [
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
      
      // 🏢 Dominios de producción automáticos
      ...(isProduction ? [
        'https://telofundi.com',
        'https://www.telofundi.com',
        'https://app.telofundi.com',
        'https://admin.telofundi.com'
      ] : [])
    ];

    // 📱 Permitir requests sin origin (mobile apps, Postman, etc.)
    if (!origin) {
      console.log('📱 Request sin origin permitido (mobile/API client)');
      return callback(null, true);
    }

    // 🔍 Verificar si el origin está permitido
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      const match = origin === allowedOrigin || 
                   origin.startsWith(allowedOrigin) ||
                   allowedOrigin.includes(origin.replace(/:\d+$/, ''));
      return match;
    });

    if (isAllowed) {
      if (isDevelopment) {
        console.log('✅ CORS permitido para:', origin);
      }
      callback(null, true);
    } else {
      console.log('❌ CORS bloqueado para:', origin);
      console.log('🔍 Orígenes permitidos:', allowedOrigins);
      
      if (isDevelopment) {
        // En desarrollo, ser más permisivo
        console.log('🔧 Modo desarrollo: Permitiendo origin no listado');
        callback(null, true);
      } else {
        callback(new Error('No permitido por política CORS'));
      }
    }
  },
  
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  
  // ✅ AGREGADO X-Environment Y OTROS HEADERS FALTANTES
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'X-Access-Token',
    'X-Refresh-Token',
    'x-api-key',
    'X-Socket-ID',
    'X-Client-Version',
    'X-Environment',        // ✅ AGREGADO - Este era el que faltaba
    'X-Device-Info',        // ✅ AGREGADO - Por si lo usas más adelante
    'X-App-Version',        // ✅ AGREGADO - Por si lo usas más adelante
    'X-Request-ID',         // ✅ AGREGADO - Para tracking de requests
    'X-User-Agent',         // ✅ AGREGADO - Info adicional del cliente
    'X-Platform'            // ✅ AGREGADO - Para detectar plataforma (web/mobile)
  ],
  
  exposedHeaders: [
    'Authorization',
    'X-Access-Token',
    'X-Refresh-Token',
    'X-Total-Count',
    'X-Current-Page',
    'X-Total-Pages',
    'X-Rate-Limit-Remaining',
    'X-Rate-Limit-Reset',
    'X-Request-ID',         // ✅ AGREGADO - Para tracking
    'X-Server-Version'      // ✅ AGREGADO - Info del servidor
  ],
  
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 200,
  maxAge: isProduction ? 86400 : 300  // 24h en prod, 5min en dev
};

// 🎯 MIDDLEWARE MEJORADO CON LOGGING DINÁMICO
const corsMiddleware = cors(corsOptions);

const enhancedCorsMiddleware = (req, res, next) => {
  // Log detallado en desarrollo
  if (isDevelopment && req.method === 'OPTIONS') {
    console.log('🔄 CORS Preflight:', {
      origin: req.get('Origin'),
      method: req.get('Access-Control-Request-Method'),
      headers: req.get('Access-Control-Request-Headers'),
      timestamp: new Date().toISOString()
    });
    
    // ✅ LOG ESPECÍFICO PARA DEBUG X-Environment
    const requestHeaders = req.get('Access-Control-Request-Headers');
    if (requestHeaders && requestHeaders.includes('x-environment')) {
      console.log('✅ X-Environment header solicitado en preflight - AHORA PERMITIDO');
    }
  }
  
  // ✅ AGREGAR HEADERS DINÁMICOS DE RESPUESTA
  res.set({
    'X-CORS-Enabled': 'true',
    'X-Environment': config.environment.NODE_ENV,
    'X-Server-Version': '1.0.0',
    'X-API-Version': 'v1'
  });
  
  corsMiddleware(req, res, next);
};

// 📊 Función de diagnóstico para debugging
const getCorsInfo = () => {
  return {
    environment: config.environment.NODE_ENV,
    allowedOrigins: {
      frontend: config.urls.frontend,
      cors: config.urls.cors,
      api: config.urls.api
    },
    allowedHeaders: corsOptions.allowedHeaders,
    methods: corsOptions.methods,
    isDevelopment,
    isProduction,
    timestamp: new Date().toISOString()
  };
};

// ✅ LOG MEJORADO PARA VERIFICAR CONFIGURACIÓN
if (isDevelopment) {
  console.log('🌐 === CORS CONFIGURADO DINÁMICAMENTE ===');
  const corsInfo = getCorsInfo();
  console.log('🌐 Environment:', corsInfo.environment);
  console.log('🌐 Frontend URL:', corsInfo.allowedOrigins.frontend);
  console.log('🌐 CORS URL:', corsInfo.allowedOrigins.cors);
  console.log('🌐 Allowed Headers:', corsInfo.allowedHeaders);
  console.log('🌐 X-Environment permitido:', corsInfo.allowedHeaders.includes('X-Environment') ? '✅ SÍ' : '❌ NO');
  console.log('🌐 === END CORS CONFIG ===');
}

module.exports = enhancedCorsMiddleware;
module.exports.getCorsInfo = getCorsInfo;