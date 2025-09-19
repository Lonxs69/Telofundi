/**
 * ====================================================================
 * 🔧 API UTILS - CONFIGURACIÓN, ERRORES, CONSTANTS, HELPERS Y VALIDATORS
 * ====================================================================
 * Archivo central para toda la configuración base, manejo de errores,
 * constantes de la aplicación, helpers y validadores
 */

// ✅ CONFIGURACIÓN PRINCIPAL
export const API_CONFIG = {
  BASE_URL: process.env.NODE_ENV === 'production'
    ? 'https://telofundi.com/api'
    : 'http://localhost:3000/api',
  TIMEOUT: 20000,
  RETRY_ATTEMPTS: 2,
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB para avatars
  MAX_POST_FILE_SIZE: 8 * 1024 * 1024, // 8MB para posts
  MAX_CHAT_FILE_SIZE: 5 * 1024 * 1024 // 5MB para chat
};

// ✅ HEADERS POR DEFECTO
export const getDefaultHeaders = () => ({
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'X-Requested-With': 'XMLHttpRequest'
});

// ✅ FUNCIÓN PARA MANEJAR TIMEOUT
export const fetchWithTimeout = (url, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
    console.warn(`⚠️ Request timeout after ${options.timeout || API_CONFIG.TIMEOUT}ms:`, url);
  }, options.timeout || API_CONFIG.TIMEOUT);
  
  return fetch(url, {
    ...options,
    signal: controller.signal
  }).finally(() => {
    clearTimeout(timeoutId);
  });
};

// ✅ INTERCEPTOR PARA TOKEN DE AUTENTICACIÓN
export const addAuthToken = (options = {}) => {
  try {
    const userData = localStorage.getItem('telofundi_user');
    if (userData) {
      const user = JSON.parse(userData);
      if (user.token) {
        options.headers = {
          ...options.headers,
          'Authorization': `Bearer ${user.token}`
        };
      }
    }
  } catch (error) {
    console.error('Error parsing user data from localStorage:', error);
    localStorage.removeItem('telofundi_user');
  }
  return options;
};

// ✅ FUNCIÓN PARA MANEJAR RESPUESTAS
export const handleResponse = async (response) => {
  const contentType = response.headers.get('content-type');
  let data;
  
  try {
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const textData = await response.text();
      data = { message: textData || 'Respuesta sin contenido' };
    }
  } catch (parseError) {
    console.error('Error parsing response:', parseError);
    data = { message: 'Error procesando la respuesta del servidor' };
  }
  
  if (!response.ok) {
    console.error('🔥 API Error Response:', {
      status: response.status,
      statusText: response.statusText,
      url: response.url,
      data: data
    });
    
    if (data.errorCode === 'VALIDATION_ERROR' && data.errors) {
      console.error('🔥 VALIDATION ERRORS:', data.errors);
      data.errors.forEach(error => {
        console.error(`Campo "${error.field}": ${error.message}`, error.value);
      });
    }
    
    if (response.status === 401) {
      console.warn('🔐 Token expirado - redirigiendo al login');
      localStorage.removeItem('telofundi_user');
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
    
    const error = new Error(data.message || `HTTP Error: ${response.status}`);
    error.status = response.status;
    error.errorCode = data.errorCode;
    error.details = data.errors || data.details;
    error.response = { status: response.status, data };
    throw error;
  }
  
  return data;
};

// ✅ FUNCIÓN BASE PARA REALIZAR PETICIONES
export const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;
  
  // ✅ DETECCIÓN AUTOMÁTICA DE FORMDATA
  const isFormData = options.body instanceof FormData;
  
  let requestOptions;
  
  if (isFormData) {
    // ✅ PARA FORMDATA: Headers mínimos - NO Content-Type
    console.log('📝 FormData detected - using minimal headers');
    requestOptions = {
      ...options,
      headers: {}
    };
  } else {
    // ✅ PARA JSON: Headers completos normales
    requestOptions = {
      headers: getDefaultHeaders(),
      ...options,
      headers: {
        ...getDefaultHeaders(),
        ...options.headers
      }
    };
  }
  
  // ✅ AGREGAR TOKEN DE AUTENTICACIÓN
  addAuthToken(requestOptions);

  // ✅ DEBUG GENERAL
  if (process.env.NODE_ENV === 'development') {
    console.log(`🌐 API Request: ${requestOptions.method || 'GET'} ${url}`);
    if (requestOptions.body && !isFormData) {
      try {
        const bodyData = JSON.parse(requestOptions.body);
        console.log('📤 Request body:', bodyData);
      } catch (e) {
        console.log('📤 Request body (raw):', requestOptions.body);
      }
    }
  }

  let lastError;
  for (let attempt = 0; attempt < API_CONFIG.RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await fetchWithTimeout(url, requestOptions);
      const data = await handleResponse(response);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ API Response: ${response.status}`, data);
      }
      
      return data;
    } catch (error) {
      lastError = error;
      
      if (error.name === 'AbortError' || 
          error.status === 401 || 
          error.status === 403 || 
          error.status === 404 ||
          (error.status >= 400 && error.status < 500)) {
        break;
      }
      
      if (attempt < API_CONFIG.RETRY_ATTEMPTS - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 3000);
        console.warn(`⚠️ Reintentando petición en ${delay}ms (intento ${attempt + 1}/${API_CONFIG.RETRY_ATTEMPTS})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error('❌ Todos los intentos fallaron:', lastError);
  throw lastError;
};

// ✅ MÉTODOS HTTP BASE
export const api = {
  get: (endpoint, params = {}) => {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${endpoint}?${query}` : endpoint;
    return apiRequest(url, { method: 'GET' });
  },

  post: (endpoint, data) => {
    return apiRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  put: (endpoint, data) => {
    return apiRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  patch: (endpoint, data) => {
    return apiRequest(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  delete: (endpoint, data = null) => {
    const options = { method: 'DELETE' };
    if (data) {
      options.body = JSON.stringify(data);
    }
    return apiRequest(endpoint, options);
  },

  upload: (endpoint, formData, options = {}) => {
    if (!(formData instanceof FormData)) {
      throw new Error('Se esperaba FormData, recibido: ' + typeof formData);
    }
    
    const requestOptions = {
      method: 'POST',
      body: formData,
      timeout: options.timeout || 30000
    };
    
    return apiRequest(endpoint, requestOptions);
  },

  uploadPut: (endpoint, formData, options = {}) => {
    if (!(formData instanceof FormData)) {
      throw new Error('Se esperaba FormData, recibido: ' + typeof formData);
    }
    
    const requestOptions = {
      method: 'PUT',
      body: formData,
      timeout: options.timeout || 30000
    };
    
    return apiRequest(endpoint, requestOptions);
  }
};

// ✅ FUNCIÓN HELPER PARA VALIDAR ARCHIVOS
export const validateFile = (file, maxSize = API_CONFIG.MAX_FILE_SIZE) => {
  if (!file) {
    throw new Error('No se seleccionó ningún archivo');
  }
  
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
    throw new Error(`El archivo es muy grande. Máximo permitido: ${maxSizeMB}MB`);
  }
  
  return true;
};

// ====================================================================
// 🚨 UTILIDADES PARA MANEJO DE ERRORES
// ====================================================================

export const handleApiError = (error) => {
  console.error('🔥 API Error Details:', {
    name: error.name,
    message: error.message,
    status: error.status,
    errorCode: error.errorCode,
    details: error.details,
    response: error.response
  });
  
  const errorMessages = {
    'AbortError': 'La petición tardó demasiado. Inténtalo de nuevo.',
    'NetworkError': 'Error de conexión. Verifica tu internet.',
    'TypeError': 'Error de red. Verifica tu conexión.',
  };
  
  if (errorMessages[error.name]) {
    return errorMessages[error.name];
  }
  
  if (error.status) {
    switch (error.status) {
      case 400:
        return error.message || 'Datos inválidos enviados al servidor.';
      case 401:
        localStorage.removeItem('telofundi_user');
        window.dispatchEvent(new CustomEvent('auth:logout'));
        return 'Sesión expirada. Por favor, inicia sesión nuevamente.';
      case 403:
        return 'No tienes permisos para realizar esta acción.';
      case 404:
        return 'El recurso solicitado no existe.';
      case 409:
        return error.message || 'Conflicto con el estado actual del recurso.';
      case 422:
        return error.message || 'Error de validación en los datos enviados.';
      case 429:
        return 'Demasiadas peticiones. Espera un momento antes de intentar de nuevo.';
      case 500:
        return 'Error interno del servidor. Inténtalo más tarde.';
      case 502:
        return 'Servidor no disponible temporalmente.';
      case 503:
        return 'Servicio no disponible. Inténtalo más tarde.';
      default:
        return error.message || `Error del servidor (${error.status}). Inténtalo de nuevo.`;
    }
  }
  
  return error.message || 'Error desconocido. Inténtalo de nuevo.';
};

export const formatValidationErrors = (error) => {
  if (error.errorCode === 'VALIDATION_ERROR' && error.details) {
    return error.details.reduce((acc, err) => {
      acc[err.field] = err.message;
      return acc;
    }, {});
  }
  return {};
};

// ====================================================================
// 🎯 CONSTANTES DE LA APLICACIÓN (MIGRADAS DE constants.js)
// ====================================================================

// RUTAS PRINCIPALES DE LA APLICACIÓN
export const ROUTES = {
  // Rutas públicas
  HOME: 'home',
  ABOUT: 'about', 
  TERMS: 'terms',
  FEED: 'feed',
  AUTH: 'auth',
  SUPPORT: 'support',
  RESET_PASSWORD: '/reset-password',
  
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
  STANDARD: 'standard',
  PREMIUM: 'premium',
  VIP: 'vip',
  FEATURED: 'featured'
};

// UBICACIONES EN REPÚBLICA DOMINICANA
export const LOCATIONS = {
  SANTO_DOMINGO: 'santo-domingo',
  SANTIAGO: 'santiago',
  PUNTA_CANA: 'punta-cana',
  PUERTO_PLATA: 'puerto-plata',
  SAN_PEDRO: 'san-pedro-de-macoris',
  LA_ROMANA: 'la-romana',
  BARAHONA: 'barahona',
  MONTECRISTI: 'montecristi'
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

// CONFIGURACIÓN DE ARCHIVOS
export const FILE_CONFIG = {
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_VIDEO_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm'],
  MAX_IMAGES_PER_POST: 10,
  MAX_VIDEOS_PER_POST: 3
};

// LÍMITES DE LA APLICACIÓN
export const APP_LIMITS = {
  ESCORT_MAX_POSTS: 5,
  POST_MAX_IMAGES: 5,
  POST_TITLE_MAX_LENGTH: 100,
  POST_DESCRIPTION_MAX_LENGTH: 2000,
  BIO_MAX_LENGTH: 500,
  SERVICES_MAX_COUNT: 15,
  MESSAGE_MAX_LENGTH: 2000,
  CHAT_RATE_LIMIT_PER_MINUTE: 30
};

// TIPOS DE ARCHIVOS PERMITIDOS
export const ALLOWED_FILE_TYPES = {
  IMAGES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  DOCUMENTS: ['application/pdf'],
  AUDIO: ['audio/mpeg', 'audio/wav'],
  VIDEO: ['video/mp4', 'video/webm']
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
  USER_TOKEN: 'telofundi_token',
  USER_DATA: 'telofundi_user',
  THEME: 'telofundi_theme',
  SEARCH_FILTERS: 'telofundi_search_filters',
  RECENT_SEARCHES: 'telofundi_recent_searches',
  NOTIFICATIONS_SETTINGS: 'telofundi_notifications',
  CHAT_DRAFTS: 'telofundi_chat_drafts',
  AGE_VERIFIED: 'telofundi_age_verified'
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

// ====================================================================
// 🔧 VALIDADORES (MIGRADOS DE validators.js)
// ====================================================================

// Validadores básicos
export const required = (value) => {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return 'Este campo es requerido';
  }
  return null;
};

export const email = (value) => {
  if (!value) return null;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return 'Introduce un email válido';
  }
  return null;
};

export const minLength = (min) => (value) => {
  if (!value) return null;
  if (value.length < min) {
    return `Debe tener al menos ${min} caracteres`;
  }
  return null;
};

export const maxLength = (max) => (value) => {
  if (!value) return null;
  if (value.length > max) {
    return `No puede tener más de ${max} caracteres`;
  }
  return null;
};

export const password = (value) => {
  if (!value) return null;
  
  const errors = [];
  
  if (value.length < 8) {
    errors.push('al menos 8 caracteres');
  }
  
  if (!/[A-Z]/.test(value)) {
    errors.push('una letra mayúscula');
  }
  
  if (!/[a-z]/.test(value)) {
    errors.push('una letra minúscula');
  }
  
  if (!/\d/.test(value)) {
    errors.push('un número');
  }
  
  if (errors.length > 0) {
    return `La contraseña debe contener ${errors.join(', ')}`;
  }
  
  return null;
};

export const confirmPassword = (originalPassword) => (value) => {
  if (!value) return null;
  if (value !== originalPassword) {
    return 'Las contraseñas no coinciden';
  }
  return null;
};

export const phone = (value) => {
  if (!value) return null;
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  const cleanPhone = value.replace(/\s/g, '');
  
  if (!phoneRegex.test(cleanPhone)) {
    return 'Introduce un número de teléfono válido';
  }
  return null;
};

export const age = (value) => {
  if (!value) return null;
  const numValue = parseInt(value);
  
  if (isNaN(numValue)) {
    return 'La edad debe ser un número';
  }
  
  if (numValue < 18) {
    return 'Debes ser mayor de 18 años';
  }
  
  if (numValue > 65) {
    return 'La edad máxima es 65 años';
  }
  
  return null;
};

export const username = (value) => {
  if (!value) return null;
  
  if (value.length < 3) {
    return 'El nombre de usuario debe tener al menos 3 caracteres';
  }
  
  if (value.length > 20) {
    return 'El nombre de usuario no puede tener más de 20 caracteres';
  }
  
  if (!/^[a-zA-Z0-9_]+$/.test(value)) {
    return 'Solo se permiten letras, números y guiones bajos';
  }
  
  return null;
};

export const url = (value) => {
  if (!value) return null;
  
  try {
    new URL(value);
    return null;
  } catch {
    return 'Introduce una URL válida';
  }
};

// Validadores para archivos
export const fileSize = (maxSizeMB) => (file) => {
  if (!file) return null;
  
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return `El archivo no puede ser mayor a ${maxSizeMB}MB`;
  }
  
  return null;
};

export const fileType = (allowedTypes) => (file) => {
  if (!file) return null;
  
  if (!allowedTypes.includes(file.type)) {
    return `Tipo de archivo no permitido. Tipos válidos: ${allowedTypes.join(', ')}`;
  }
  
  return null;
};

export const imageFile = (file) => {
  if (!file) return null;
  
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return 'Solo se permiten imágenes (JPG, PNG, WebP)';
  }
  
  return null;
};

// Validadores compuestos
export const profileValidation = {
  email: [required, email],
  username: [required, username],
  password: [required, password],
  confirmPassword: [], // Se configura dinámicamente
  phone: [phone],
  age: [required, age],
  description: [maxLength(500)],
  profileImage: [imageFile, fileSize(5)]
};

export const postValidation = {
  description: [required, minLength(10), maxLength(500)],
  phone: [required, phone],
  images: [required], // Validación personalizada para array de imágenes
  location: [required, minLength(2)]
};

export const agencyValidation = {
  ...profileValidation,
  companyName: [required, minLength(2), maxLength(100)],
  companyDescription: [required, minLength(20), maxLength(1000)],
  website: [url],
  license: [required]
};

// Función principal de validación
export const validateField = (value, validators) => {
  if (!validators || validators.length === 0) return null;
  
  for (const validator of validators) {
    const error = validator(value);
    if (error) return error;
  }
  
  return null;
};

export const validateForm = (formData, validationRules) => {
  const errors = {};
  let isValid = true;
  
  Object.keys(validationRules).forEach(field => {
    const value = formData[field];
    const validators = validationRules[field];
    const error = validateField(value, validators);
    
    if (error) {
      errors[field] = error;
      isValid = false;
    }
  });
  
  return { isValid, errors };
};

// Validaciones específicas para TeloFundi
export const validateImages = (images) => {
  if (!images || images.length === 0) {
    return 'Debes subir al menos una imagen';
  }
  
  if (images.length > 5) {
    return 'No puedes subir más de 5 imágenes';
  }
  
  for (let i = 0; i < images.length; i++) {
    const imageError = imageFile(images[i]) || fileSize(5)(images[i]);
    if (imageError) {
      return `Imagen ${i + 1}: ${imageError}`;
    }
  }
  
  return null;
};

export const validateTeloPoints = (currentPoints, requiredPoints) => {
  if (currentPoints < requiredPoints) {
    return `Necesitas ${requiredPoints - currentPoints} TeloPoints adicionales`;
  }
  return null;
};

export const validateUserType = (userType, allowedTypes) => {
  if (!allowedTypes.includes(userType)) {
    return 'Tipo de usuario no válido para esta acción';
  }
  return null;
};

export const validatePremiumFeature = (user, feature) => {
  if (!user.isPremium) {
    return `Esta función (${feature}) requiere una cuenta premium`;
  }
  return null;
};

// Sanitizadores
export const sanitizeHtml = (str) => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

export const sanitizePhone = (phone) => {
  return phone.replace(/[^\d+]/g, '');
};

export const sanitizeUsername = (username) => {
  return username.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
};

export const sanitizeDescription = (description) => {
  return description.trim().replace(/\s+/g, ' ');
};

// ====================================================================
// 🛠️ HELPERS UTILITIES (MIGRADOS DE helpers.js) 
// ====================================================================

// Formateo de fechas
export const formatDate = (date, options = {}) => {
  if (!date) return '';
  
  const d = new Date(date);
  const now = new Date();
  const diffInMs = now - d;
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (options.relative) {
    if (diffInDays === 0) return 'Hoy';
    if (diffInDays === 1) return 'Ayer';
    if (diffInDays < 7) return `Hace ${diffInDays} días`;
    if (diffInDays < 30) return `Hace ${Math.floor(diffInDays / 7)} semanas`;
    if (diffInDays < 365) return `Hace ${Math.floor(diffInDays / 30)} meses`;
    return `Hace ${Math.floor(diffInDays / 365)} años`;
  }
  
  return d.toLocaleDateString('es-DO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  });
};

// Formateo de precios
export const formatPrice = (price, currency = 'DOP') => {
  if (!price && price !== 0) return '';
  
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
};

// Formateo de números
export const formatNumber = (number) => {
  if (!number && number !== 0) return '0';
  
  if (number >= 1000000) {
    return (number / 1000000).toFixed(1) + 'M';
  }
  if (number >= 1000) {
    return (number / 1000).toFixed(1) + 'K';
  }
  return number.toString();
};

// Truncar texto
export const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Generar avatar por defecto
export const getDefaultAvatar = (userType, gender = null) => {
  const avatars = {
    ESCORT: gender === 'female' 
      ? 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face'
      : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    AGENCY: 'https://images.unsplash.com/photo-1560472354-b43ff0c44a43?w=150&h=150&fit=crop',
    CLIENT: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    ADMIN: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
  };
  return avatars[userType] || avatars.CLIENT;
};

// Calcular tiempo desde
export const timeAgo = (date) => {
  if (!date) return '';
  
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now - past) / 1000);
  
  if (diffInSeconds < 60) return 'Hace un momento';
  if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} min`;
  if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} h`;
  if (diffInSeconds < 2592000) return `Hace ${Math.floor(diffInSeconds / 86400)} d`;
  if (diffInSeconds < 31536000) return `Hace ${Math.floor(diffInSeconds / 2592000)} mes`;
  return `Hace ${Math.floor(diffInSeconds / 31536000)} año`;
};

// Generar slug desde texto
export const generateSlug = (text) => {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .replace(/[^a-z0-9\s-]/g, '') // Solo letras, números, espacios y guiones
    .trim()
    .replace(/\s+/g, '-') // Espacios a guiones
    .replace(/-+/g, '-'); // Múltiples guiones a uno solo
};

// Calcular distancia entre coordenadas
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Verificar si es móvil
export const isMobile = () => {
  return window.innerWidth <= 768;
};

// Capitalizar texto
export const capitalize = (text) => {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

// Formatear teléfono dominicano
export const formatDominicanPhone = (phone) => {
  if (!phone) return '';
  
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 10 && cleaned.startsWith('1')) {
    // +1 809 123 4567
    return `+${cleaned.slice(0, 1)} ${cleaned.slice(1, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  
  if (cleaned.length === 10) {
    // 809 123 4567
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }
  
  return phone;
};

// Utilidades de localStorage
export const storage = {
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return defaultValue;
    }
  },
  
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Error writing to localStorage:', error);
      return false;
    }
  },
  
  remove: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error removing from localStorage:', error);
      return false;
    }
  },
  
  clear: () => {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      return false;
    }
  }
};

// Debug helpers
export const apiDebug = {
  logRequests: process.env.NODE_ENV === 'development',
  
  log: (message, data = null) => {
    if (apiDebug.logRequests) {
      console.log(`🔧 API Debug: ${message}`, data);
    }
  },
  
  error: (message, error = null) => {
    if (apiDebug.logRequests) {
      console.error(`🔧 API Debug Error: ${message}`, error);
    }
  }
};