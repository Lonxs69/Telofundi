// src/utils/constants.js - VERSIÓN DINÁMICA SIN HARDCODING - COMPLETAMENTE CORREGIDA
import config, { getApiUrl, getFrontendUrl, getSocketUrl, getGoogleAuthUrl } from '../config/config.js';

// ? CONFIGURACIÓN DINÁMICA - USA CONFIG.JS
export const ENV_CONFIG = {
  CURRENT: config.environment.NODE_ENV,
  IS_DEVELOPMENT: config.environment.isDevelopment,
  IS_PRODUCTION: config.environment.isProduction,
  DEBUG_MODE: config.environment.debugMode,
  
  // ?? URLs dinámicas
  API_URL: config.urls.api,
  FRONTEND_URL: config.urls.frontend,
  SOCKET_URL: config.urls.socket,
  
  // ?? Debug info
  DEBUG: config.environment.debugMode ? {
    environment: config.environment.NODE_ENV,
    apiUrl: config.urls.api,
    frontendUrl: config.urls.frontend,
    socketUrl: config.urls.socket
  } : null
};

// ?? URLs DE API DINÁMICAS
export const API_ENDPOINTS = {
  BASE_URL: config.urls.api,
  
  // Endpoints principales
  AUTH: '/auth',
  USERS: '/users', 
  POSTS: '/posts',
  CHAT: '/chat',
  NOTIFICATIONS: '/notifications',
  TELOPOINTS: '/telopoints',
  AGENCIES: '/agencies',
  VERIFICATION: '/verification',
  ADMIN: '/admin',
  PAYMENTS: '/payments',
  FAVORITES: '/favorites',
  
  // ?? URLs completas dinámicas
  getFullUrl: (endpoint) => getApiUrl(endpoint),
  
  // ?? Endpoints específicos dinámicos
  LOGIN: () => getApiUrl('/auth/login'),
  REGISTER: () => getApiUrl('/auth/register'),
  REGISTER_AGENCY: () => getApiUrl('/auth/register/agency'),
  GOOGLE_AUTH: (userType = 'CLIENT') => getGoogleAuthUrl(userType),
  UPLOAD: () => getApiUrl('/upload'),
  SOCKET: () => getSocketUrl(),
  
  // ?? OAuth endpoints
  GOOGLE_CALLBACK: () => getApiUrl('/auth/google/callback'),
  FORGOT_PASSWORD: () => getApiUrl('/auth/forgot-password'),
  RESET_PASSWORD: () => getApiUrl('/auth/reset-password'),
  
  // ?? Específicos para cada módulo
  USER_PROFILE: () => getApiUrl('/users/profile'),
  USER_UPLOAD_AVATAR: () => getApiUrl('/users/profile/picture'),
  POSTS_SEARCH: () => getApiUrl('/posts/search'),
  POSTS_TRENDING: () => getApiUrl('/posts/trending'),
  CHAT_MESSAGES: (chatId) => getApiUrl(`/chat/${chatId}/messages`),
  ADMIN_METRICS: () => getApiUrl('/admin/metrics'),
  AGENCY_PENDING: () => getApiUrl('/admin/agencies/pending')
};

// ? RUTAS PRINCIPALES DE LA APLICACIÓN - CORREGIDAS PARA HOMEPAGE INICIAL
export const ROUTES = {
  // ? CAMBIO CLAVE: HOME como página inicial por defecto
  HOME: 'home',
  ABOUT: 'about', 
  TERMS: 'terms',
  FEED: 'feed',
  AUTH: 'auth',
  SUPPORT: 'support',
  // ? CORREGIDO: Sin barra inicial, formato consistente
  RESET_PASSWORD: 'reset-password',
  
  // Rutas de dashboard por tipo de usuario
  CLIENT_DASHBOARD: 'client-dashboard',
  ESCORT_DASHBOARD: 'escort-dashboard', 
  AGENCY_DASHBOARD: 'agency-dashboard',
  ADMIN_DASHBOARD: 'admin-dashboard',
  
  // Rutas específicas de cliente
  CLIENT_FAVORITES: 'client-favorites',
  CLIENT_POINTS: 'client-points',
  CLIENT_CHAT: 'client-chat',
  
  // Rutas específicas de escort
  ESCORT_POSTS: 'escort-posts',
  ESCORT_METRICS: 'escort-metrics',
  ESCORT_AGENCY: 'escort-agency',
  ESCORT_CHAT: 'escort-chat',
  
  // Rutas específicas de agencia
  AGENCY_ESCORTS: 'agency-escorts',
  AGENCY_VERIFICATION: 'agency-verification',
  AGENCY_RECRUITMENT: 'agency-recruitment',
  AGENCY_CHAT: 'agency-chat',
  
  // Rutas específicas de admin
  ADMIN_MODERATION: 'admin-moderation',
  ADMIN_CHAT: 'admin-chat',
  
  // Rutas compartidas
  PROFILE_VIEW: 'profile-view',
  NOTIFICATIONS: 'notifications',
  AGENCIES: 'agencies',
  SEARCH_FILTERS: 'search-filters',
  PREMIUM: 'premium',
  EVENTS: 'events',
  MATCHES: 'matches',
  MESSAGES: 'messages'
};

// ? NUEVO: Configuración de página inicial
export const APP_CONFIG = {
  // ? HOMEPAGE SIEMPRE COMO PÁGINA INICIAL
  DEFAULT_PAGE: ROUTES.HOME,
  INITIAL_PAGE: ROUTES.HOME,
  
  // Páginas que requieren autenticación
  PROTECTED_PAGES: [
    ROUTES.CLIENT_DASHBOARD,
    ROUTES.ESCORT_DASHBOARD,
    ROUTES.AGENCY_DASHBOARD,
    ROUTES.ADMIN_DASHBOARD,
    ROUTES.CLIENT_FAVORITES,
    ROUTES.CLIENT_POINTS,
    ROUTES.CLIENT_CHAT,
    ROUTES.ESCORT_POSTS,
    ROUTES.ESCORT_METRICS,
    ROUTES.ESCORT_AGENCY,
    ROUTES.ESCORT_CHAT,
    ROUTES.AGENCY_ESCORTS,
    ROUTES.AGENCY_VERIFICATION,
    ROUTES.AGENCY_RECRUITMENT,
    ROUTES.AGENCY_CHAT,
    ROUTES.ADMIN_MODERATION,
    ROUTES.ADMIN_CHAT,
    ROUTES.NOTIFICATIONS,
    ROUTES.PREMIUM,
    ROUTES.MATCHES,
    ROUTES.MESSAGES
  ],
  
  // Páginas públicas (accesibles sin autenticación)
  PUBLIC_PAGES: [
    ROUTES.HOME,
    ROUTES.ABOUT,
    ROUTES.TERMS,
    ROUTES.FEED,
    ROUTES.AUTH,
    ROUTES.SUPPORT,
    ROUTES.RESET_PASSWORD,
    ROUTES.AGENCIES
  ]
};

// TIPOS DE USUARIO
export const USER_TYPES = {
  CLIENT: 'CLIENT',
  ESCORT: 'ESCORT', 
  AGENCY: 'AGENCY',
  ADMIN: 'ADMIN'
};

// ESTADOS DE VERIFICACIÓN
export const VERIFICATION_STATUS = {
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED'
};

// TIPOS DE PUBLICACIONES
export const POST_TYPES = {
  STANDARD: 'STANDARD',
  PREMIUM: 'PREMIUM',
  VIP: 'VIP',
  FEATURED: 'FEATURED'
};

// CATEGORÍAS DE SERVICIOS
export const SERVICE_CATEGORIES = {
  ESCORT_FEMALE: 'ESCORT_FEMALE',
  ESCORT_MALE: 'ESCORT_MALE', 
  ESCORT_TRANS: 'ESCORT_TRANS',
  MASSAGE: 'MASSAGE',
  COMPANIONSHIP: 'COMPANIONSHIP',
  VIP_SERVICES: 'VIP_SERVICES'
};

// UBICACIONES EN REPÚBLICA DOMINICANA
export const LOCATIONS = {
  SANTO_DOMINGO: 'SANTO_DOMINGO',
  SANTIAGO: 'SANTIAGO',
  PUNTA_CANA: 'PUNTA_CANA',
  PUERTO_PLATA: 'PUERTO_PLATA',
  SAN_PEDRO: 'SAN_PEDRO_DE_MACORIS',
  LA_ROMANA: 'LA_ROMANA',
  BARAHONA: 'BARAHONA',
  MONTECRISTI: 'MONTECRISTI'
};

// RANGOS DE PRECIOS
export const PRICE_RANGES = {
  BUDGET: { min: 0, max: 5000, label: 'Económico' },
  STANDARD: { min: 5000, max: 15000, label: 'Estándar' },
  PREMIUM: { min: 15000, max: 30000, label: 'Premium' },
  VIP: { min: 30000, max: 100000, label: 'VIP' },
  LUXURY: { min: 100000, max: null, label: 'Lujo' }
};

// CONFIGURACIÓN DE TELOPOINTS
export const TELOPOINTS = {
  // Acciones que otorgan puntos
  DAILY_LOGIN: 10,
  PROFILE_COMPLETE: 50,
  FIRST_POST: 100,
  VERIFICATION: 200,
  PREMIUM_UPGRADE: 500,
  REFERRAL: 250,
  REVIEW_LEFT: 25,
  PHOTO_UPLOAD: 15,
  
  // Acciones que consumen puntos
  BOOST_POST: 100,
  PREMIUM_MESSAGE: 25,
  PROFILE_HIGHLIGHT: 150,
  ADVANCED_SEARCH: 50,
  CONTACT_INFO_VIEW: 75
};

// CONFIGURACIÓN DE MENSAJERÍA
export const MESSAGE_CONFIG = {
  MAX_MESSAGE_LENGTH: config.limits.messageMaxLength,
  MAX_IMAGES_PER_MESSAGE: 5,
  FREE_MESSAGES_PER_DAY: 3,
  PREMIUM_UNLIMITED: true,
  AUTO_DELETE_DAYS: 30
};

// CONFIGURACIÓN DE ARCHIVOS DINÁMICA
export const FILE_CONFIG = {
  MAX_IMAGE_SIZE: config.limits.maxFileSize,
  MAX_VIDEO_SIZE: config.environment.isProduction ? 100 * 1024 * 1024 : 50 * 1024 * 1024,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm', 'video/mov'],
  MAX_IMAGES_PER_POST: config.limits.maxImagesPerPost,
  MAX_VIDEOS_PER_POST: config.environment.isProduction ? 5 : 3
};

// CONFIGURACIÓN DE CHAT DINÁMICA
export const CHAT_CONFIG = {
  TYPING_TIMEOUT: 3000,
  MESSAGE_BATCH_SIZE: config.environment.isProduction ? 50 : 20,
  AUTO_SCROLL_THRESHOLD: 100,
  EMOJI_LIMIT: 10,
  STICKER_LIMIT: 5,
  SOCKET_RECONNECT_ATTEMPTS: config.environment.isProduction ? 10 : 5,
  SOCKET_URL: config.urls.socket,
  WS_URL: config.urls.websocket
};

// CONFIGURACIÓN DE NOTIFICACIONES
export const NOTIFICATION_TYPES = {
  NEW_MESSAGE: 'NEW_MESSAGE',
  NEW_MATCH: 'NEW_MATCH',
  PROFILE_VIEW: 'PROFILE_VIEW',
  POST_LIKED: 'POST_LIKED',
  VERIFICATION_STATUS: 'VERIFICATION_STATUS',
  TELOPOINTS_EARNED: 'TELOPOINTS_EARNED',
  PREMIUM_EXPIRING: 'PREMIUM_EXPIRING',
  AGENCY_INVITATION: 'AGENCY_INVITATION'
};

// CONFIGURACIÓN DE BÚSQUEDA
export const SEARCH_CONFIG = {
  MIN_AGE: 18,
  MAX_AGE: 65,
  DEFAULT_RADIUS: 50,
  MAX_RADIUS: 500,
  RESULTS_PER_PAGE: config.environment.isProduction ? 30 : 20
};

// CONFIGURACIÓN DE AGENCIAS
export const AGENCY_CONFIG = {
  MAX_ESCORTS_FREE: 5,
  MAX_ESCORTS_PREMIUM: 50,
  VERIFICATION_REQUIRED: true,
  COMMISSION_RATE: 0.15,
  MIN_RATING_REQUIRED: 4.0
};

// PREMIUM TIERS
export const PREMIUM_TIERS = {
  BASIC: 'BASIC',
  PREMIUM: 'PREMIUM',
  VIP: 'VIP'
};

// BOOST TYPES
export const BOOST_TYPES = {
  BASIC: 'BASIC',
  PREMIUM: 'PREMIUM',
  FEATURED: 'FEATURED',
  SUPER: 'SUPER',
  MEGA: 'MEGA'
};

// ? CONFIGURACIÓN DE TEMA - CORREGIDA SIN config.ui
export const THEME_CONFIG = {
  COLORS: {
    PRIMARY: '#D2421A',
    SECONDARY: '#9E2B0E',
    ACCENT: '#FF6B35',
    SUCCESS: '#28A745',
    WARNING: '#FFC107',
    ERROR: '#DC3545',
    INFO: '#17A2B8'
  },
  // ? BREAKPOINTS DEFINIDOS DIRECTAMENTE
  BREAKPOINTS: {
    xs: '0px',
    sm: '576px',
    md: '768px',
    lg: '992px',
    xl: '1200px',
    xxl: '1400px'
  }
};

// ? CONFIGURACIÓN DE ANIMACIONES - CORREGIDA SIN config.ui
export const ANIMATION_CONFIG = {
  DURATION: {
    FAST: 150,     // ? Valores fijos en lugar de config.ui
    NORMAL: 300,   // ? Valores fijos en lugar de config.ui
    SLOW: 450,     // ? Valores fijos en lugar de config.ui
    VERY_SLOW: 600 // ? Valores fijos en lugar de config.ui
  },
  // ? CONFIGURACIONES FIJAS EN LUGAR DE config.ui
  PAGE_TRANSITION: 400,
  TOAST_DURATION: 4000,
  LOADING_DELAY: 200,
  EASING: {
    EASE_IN_OUT: 'cubic-bezier(0.4, 0, 0.2, 1)',
    EASE_OUT: 'cubic-bezier(0.0, 0, 0.2, 1)',
    EASE_IN: 'cubic-bezier(0.4, 0, 1, 1)',
    BOUNCE: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
  }
};

// PATRONES DE VALIDACIÓN
export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_DO: /^(\+1\s?)?(\(809\)|\(829\)|\(849\))\s?\d{3}-?\d{4}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  USERNAME: /^[a-zA-Z0-9_]{3,20}$/
};

// MENSAJES DE ERROR COMUNES
export const ERROR_MESSAGES = {
  REQUIRED_FIELD: 'Este campo es obligatorio',
  INVALID_EMAIL: 'Ingresa un email válido',
  INVALID_PHONE: 'Ingresa un teléfono válido de RD',
  WEAK_PASSWORD: 'La contraseña debe tener al menos 8 caracteres, mayúscula, minúscula, número y símbolo',
  PASSWORDS_NO_MATCH: 'Las contraseñas no coinciden',
  INVALID_USERNAME: 'El usuario debe tener 3-20 caracteres (letras, números, _)',
  FILE_TOO_LARGE: 'El archivo es muy grande',
  INVALID_FILE_TYPE: 'Tipo de archivo no permitido',
  NETWORK_ERROR: 'Error de conexión. Intenta nuevamente',
  UNAUTHORIZED: 'No tienes permisos para esta acción',
  NOT_FOUND: 'Recurso no encontrado',
  SERVER_ERROR: 'Error del servidor. Intenta más tarde'
};

// MENSAJES DE ÉXITO
export const SUCCESS_MESSAGES = {
  PROFILE_UPDATED: 'Perfil actualizado correctamente',
  POST_CREATED: 'Publicación creada exitosamente',
  MESSAGE_SENT: 'Mensaje enviado',
  VERIFICATION_REQUESTED: 'Solicitud de verificación enviada',
  TELOPOINTS_EARNED: 'TeloPoints ganados',
  PASSWORD_CHANGED: 'Contraseña actualizada',
  ACCOUNT_CREATED: 'Cuenta creada exitosamente',
  LOGIN_SUCCESS: 'Bienvenido a TeloFundi'
};

// CONFIGURACIÓN LOCAL STORAGE
export const STORAGE_KEYS = {
  USER_TOKEN: config.auth.tokenKey,
  USER_DATA: config.auth.tokenKey,
  REFRESH_TOKEN: config.auth.refreshKey,
  THEME: 'telofundi_theme',
  SEARCH_FILTERS: 'telofundi_search_filters',
  RECENT_SEARCHES: 'telofundi_recent_searches',
  NOTIFICATIONS_SETTINGS: 'telofundi_notifications',
  CHAT_DRAFTS: 'telofundi_chat_drafts',
  AGE_VERIFIED: 'telofundi_age_verified'
};

// CONFIGURACIÓN DE SEO DINÁMICA
export const SEO_CONFIG = {
  DEFAULT_TITLE: `${config.app.name} - Plataforma Premium de Acompañamiento en República Dominicana`,
  DEFAULT_DESCRIPTION: 'La plataforma líder para servicios de acompañamiento premium en RD. Conecta con escorts verificados y agencias de élite.',
  DEFAULT_KEYWORDS: 'escorts, acompañantes, república dominicana, servicios premium, teloFundi',
  SITE_NAME: config.app.name,
  TWITTER_HANDLE: '@telofundi',
  OG_IMAGE: `${config.urls.frontend}/og-image.jpg`,
  CANONICAL_URL: config.urls.frontend
};

// LÍMITES DE LA APLICACIÓN DINÁMICOS
export const APP_LIMITS = {
  ESCORT_MAX_POSTS: 5,
  POST_MAX_IMAGES: config.limits.maxImagesPerPost,
  POST_TITLE_MAX_LENGTH: 150, // ? Valor fijo ya que config.limits.titleMaxLength no existe en tu config
  POST_DESCRIPTION_MAX_LENGTH: 2000,
  BIO_MAX_LENGTH: 500, // ? Valor fijo ya que config.limits.bioMaxLength no existe en tu config
  SERVICES_MAX_COUNT: 15,
  MESSAGE_MAX_LENGTH: config.limits.messageMaxLength,
  CHAT_RATE_LIMIT_PER_MINUTE: 30
};

// TIPOS DE ARCHIVOS PERMITIDOS
export const ALLOWED_FILE_TYPES = {
  IMAGES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  DOCUMENTS: ['application/pdf'],
  AUDIO: ['audio/mpeg', 'audio/wav'],
  VIDEO: ['video/mp4', 'video/webm']
};

// SEVERIDADES DE BAN
export const BAN_SEVERITIES = {
  WARNING: 'WARNING',
  TEMPORARY: 'TEMPORARY',
  PERMANENT: 'PERMANENT',
  SHADOW: 'SHADOW'
};

// RAZONES DE REPORTE
export const REPORT_REASONS = {
  SPAM: 'SPAM',
  INAPPROPRIATE_CONTENT: 'INAPPROPRIATE_CONTENT',
  FAKE_PROFILE: 'FAKE_PROFILE',
  SCAM: 'SCAM',
  HARASSMENT: 'HARASSMENT',
  COPYRIGHT: 'COPYRIGHT',
  UNDERAGE: 'UNDERAGE',
  VIOLENCE: 'VIOLENCE',
  FRAUD: 'FRAUD',
  IMPERSONATION: 'IMPERSONATION',
  ADULT_CONTENT: 'ADULT_CONTENT',
  OTHER: 'OTHER'
};

// ESTADOS DE REPORTES
export const REPORT_STATUSES = {
  PENDING: 'PENDING',
  REVIEWED: 'REVIEWED',
  RESOLVED: 'RESOLVED',
  REJECTED: 'REJECTED',
  ESCALATED: 'ESCALATED'
};

// ?? FUNCIÓN DE DEBUG PARA DESARROLLO
export const getDebugInfo = () => {
  if (!config.environment.debugMode) return null;
  
  const debugInfo = {
    environment: config.environment.NODE_ENV,
    apiUrl: config.urls.api,
    frontendUrl: config.urls.frontend,
    socketUrl: config.urls.socket,
    features: config.features,
    limits: config.limits,
    // ? NUEVO: Debug de páginas
    defaultPage: APP_CONFIG.DEFAULT_PAGE,
    publicPages: APP_CONFIG.PUBLIC_PAGES.length,
    protectedPages: APP_CONFIG.PROTECTED_PAGES.length
  };
  
  console.log('?? TeloFundi Constants - Configuración dinámica:', debugInfo);
  return debugInfo;
};

// Auto-ejecutar debug en desarrollo
if (config.environment.debugMode) {
  getDebugInfo();
}

// ? EXPORT DEFAULT COMPLETO
export default {
  ROUTES,
  APP_CONFIG, // ? NUEVO: Configuración de app
  USER_TYPES,
  VERIFICATION_STATUS,
  POST_TYPES,
  SERVICE_CATEGORIES,
  LOCATIONS,
  PRICE_RANGES,
  TELOPOINTS,
  MESSAGE_CONFIG,
  FILE_CONFIG,
  CHAT_CONFIG,
  NOTIFICATION_TYPES,
  SEARCH_CONFIG,
  AGENCY_CONFIG,
  ENV_CONFIG,
  API_ENDPOINTS,
  THEME_CONFIG,
  ANIMATION_CONFIG,
  VALIDATION_PATTERNS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  STORAGE_KEYS,
  SEO_CONFIG,
  PREMIUM_TIERS,
  BOOST_TYPES,
  APP_LIMITS,
  ALLOWED_FILE_TYPES,
  BAN_SEVERITIES,
  REPORT_REASONS,
  REPORT_STATUSES,
  getDebugInfo
};