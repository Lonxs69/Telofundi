// api.js - FIXED TOKEN HANDLING
/**
 * ====================================================================
 * 🚀 API.JS - MANEJO CORREGIDO DE TOKENS
 * ====================================================================
 * 
 * ✅ PROBLEMA IDENTIFICADO: Auto-logout agresivo en 401
 * ✅ SOLUCIÓN: Diferenciación entre errores 401 y manejo inteligente
 * ✅ NO hacer logout automático en TODOS los 401
 * ✅ Solo logout en casos específicos de token expirado
 * 
 * ====================================================================
 */

import config, { getApiUrl, getSocketUrl } from '../config/config.js';

// ✅ CONFIGURACIÓN SIN CAMBIOS
export const API_CONFIG = {
  BASE_URL: config.urls.api,
  SOCKET_URL: config.urls.socket,
  TIMEOUT: config.api.timeout,
  RETRY_ATTEMPTS: config.api.retryAttempts,
  MAX_FILE_SIZE: config.limits.maxFileSize,
  MAX_POST_FILE_SIZE: config.limits.maxFileSize * 1.6,
  MAX_CHAT_FILE_SIZE: config.limits.maxFileSize,
  DEBUG_MODE: config.environment.debugMode
};

if (!API_CONFIG.BASE_URL) {
  console.error('❌ CRÍTICO: API_CONFIG.BASE_URL no está configurada');
  throw new Error('API URL no configurada - revisa tu .env y config.js');
}

export const STORAGE_KEYS = {
  USER_DATA: config.auth.tokenKey,
  REFRESH_TOKEN: config.auth.refreshKey,
  THEME: 'telofundi_theme',
  SEARCH_FILTERS: 'telofundi_search_filters'
};

export const getDefaultHeaders = () => ({
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'X-Requested-With': 'XMLHttpRequest',
  'X-Client-Version': config.app.version,
  'X-Environment': config.environment.NODE_ENV
});

export const fetchWithTimeout = (url, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
    if (API_CONFIG.DEBUG_MODE) {
      console.warn(`⚠️ Request timeout after ${options.timeout || API_CONFIG.TIMEOUT}ms:`, url);
    }
  }, options.timeout || API_CONFIG.TIMEOUT);
  
  return fetch(url, {
    ...options,
    signal: controller.signal
  }).finally(() => {
    clearTimeout(timeoutId);
  });
};
export const addAuthToken = (options = {}) => {
  try {
    console.log('🔍 DEBUG: addAuthToken called');
    console.log('🔍 STORAGE_KEYS.USER_DATA:', STORAGE_KEYS.USER_DATA);
    
    const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA);
    console.log('🔍 Raw userData from localStorage:', userData ? 'EXISTS' : 'NULL');
    
    if (userData) {
      const user = JSON.parse(userData);
      console.log('🔍 Parsed user data:', {
        id: user.id,
        userType: user.userType,
        hasToken: !!user.token,
        tokenLength: user.token?.length || 0,
        isPremium: user.isPremium,
        client: user.client // ✅ IMPORTANTE: Verificar estructura client
      });
      
      if (user.token) {
        options.headers = {
          ...options.headers,
          'Authorization': `Bearer ${user.token}`
        };
        console.log('✅ Token added to headers:', `Bearer ${user.token.substring(0, 20)}...`);
      } else {
        console.error('❌ User has no token!');
      }
    } else {
      console.error('❌ No userData in localStorage!');
    }
  } catch (error) {
    console.error('❌ Error in addAuthToken:', error);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
  }
  return options;
};


// ✅ FUNCIÓN CORREGIDA: handleResponse - SIN AUTO-LOGOUT AGRESIVO
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
    if (API_CONFIG.DEBUG_MODE) {
      console.error('Error parsing response:', parseError);
    }
    data = { message: 'Error procesando la respuesta del servidor' };
  }
  
  if (!response.ok) {
    if (API_CONFIG.DEBUG_MODE) {
      console.error('🔥 API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        data: data
      });
    }
    
    if (data.errorCode === 'VALIDATION_ERROR' && data.errors && API_CONFIG.DEBUG_MODE) {
      console.error('🔥 VALIDATION ERRORS:', data.errors);
      data.errors.forEach(error => {
        console.error(`Campo "${error.field}": ${error.message}`, error.value);
      });
    }
    
    // ✅ CRÍTICO: MANEJO INTELIGENTE DE 401 - NO AUTO-LOGOUT AGRESIVO
    if (response.status === 401) {
      if (API_CONFIG.DEBUG_MODE) {
        console.warn('🔐 401 Unauthorized received:', {
          url: response.url,
          errorCode: data.errorCode,
          message: data.message
        });
      }
      
      // ✅ SOLO hacer logout automático en casos específicos
      const shouldAutoLogout = (
        data.errorCode === 'TOKEN_EXPIRED' ||
        data.errorCode === 'TOKEN_INVALID' ||
        data.message?.includes('token expirado') ||
        data.message?.includes('token inválido') ||
        // ✅ NO hacer logout para errores de acceso premium
        (data.errorCode !== 'AUTHENTICATION_REQUIRED' && 
         data.errorCode !== 'PREMIUM_REQUIRED' &&
         !data.message?.includes('premium') &&
         !data.message?.includes('Premium'))
      );
      
      if (shouldAutoLogout) {
        if (API_CONFIG.DEBUG_MODE) {
          console.warn('🚪 Auto-logout triggered for token expiration');
        }
        localStorage.removeItem(STORAGE_KEYS.USER_DATA);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        window.dispatchEvent(new CustomEvent('auth:logout'));
      } else {
        if (API_CONFIG.DEBUG_MODE) {
          console.log('ℹ️ 401 received but NOT triggering auto-logout:', {
            errorCode: data.errorCode,
            reason: 'Not a token expiration error'
          });
        }
      }
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

// ✅ FUNCIÓN PARA VALIDAR ARCHIVOS - SIN CAMBIOS
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

// ✅ FUNCIÓN BASE PARA REALIZAR PETICIONES - SIN CAMBIOS
export const apiRequest = async (endpoint, options = {}) => {
  if (!API_CONFIG.BASE_URL) {
    const error = new Error('API_CONFIG.BASE_URL no está configurada. Revisa tu configuración.');
    console.error('❌ CRÍTICO:', error.message);
    throw error;
  }

  const url = getApiUrl(endpoint);
  
  if (API_CONFIG.DEBUG_MODE) {
    console.log('🌐 === API REQUEST DEBUG ===');
    console.log('🌐 Endpoint:', endpoint);
    console.log('🌐 Full URL:', url);
    console.log('🌐 Method:', options.method || 'GET');
    console.log('🌐 Environment:', config.environment.NODE_ENV);
    console.log('🌐 Base URL:', API_CONFIG.BASE_URL);
  }
  
  let finalUrl = url;
  if (options.params) {
    const queryString = new URLSearchParams(options.params).toString();
    finalUrl = queryString ? `${url}?${queryString}` : url;
  }
  
  const isFormData = options.body instanceof FormData || options.isFormData === true;
  
  if (API_CONFIG.DEBUG_MODE) {
    console.log('🌐 FormData detection:', {
      isFormData,
      bodyInstanceOfFormData: options.body instanceof FormData,
      isFormDataFlag: options.isFormData,
      bodyConstructor: options.body?.constructor?.name
    });
  }
  
  let requestOptions;
  
  if (isFormData) {
    if (API_CONFIG.DEBUG_MODE) {
      console.log('🔧 FormData detected - using minimal headers for multipart/form-data');
    }
    requestOptions = {
      method: options.method || 'POST',
      body: options.body,
      headers: {},
      timeout: options.timeout || API_CONFIG.TIMEOUT
    };
  } else {
    if (API_CONFIG.DEBUG_MODE) {
      console.log('🔧 JSON data detected - using full headers');
    }
    requestOptions = {
      method: options.method || 'GET',
      headers: getDefaultHeaders(),
      timeout: options.timeout || API_CONFIG.TIMEOUT,
      ...(options.body && { body: options.body })
    };
    
    if (options.headers) {
      requestOptions.headers = {
        ...requestOptions.headers,
        ...options.headers
      };
    }
  }
  
  addAuthToken(requestOptions);

  if (API_CONFIG.DEBUG_MODE) {
    console.log(`🌐 Final API Request: ${requestOptions.method} ${finalUrl}`);
    if (requestOptions.body && !isFormData) {
      try {
        const bodyData = JSON.parse(requestOptions.body);
        console.log('📤 Request body (JSON):', bodyData);
      } catch (e) {
        console.log('📤 Request body (raw):', requestOptions.body);
      }
    } else if (isFormData) {
      console.log('📤 Request body: FormData (entries below)');
      if (requestOptions.body instanceof FormData) {
        for (let [key, value] of requestOptions.body.entries()) {
          if (value instanceof File) {
            console.log(`  📄 ${key}: [File] ${value.name} (${(value.size / 1024).toFixed(1)}KB)`);
          } else {
            console.log(`  📝 ${key}: ${value}`);
          }
        }
      }
    }
  }

  // ✅ RETRY LOGIC - SIN CAMBIOS
  let lastError;
  for (let attempt = 0; attempt < API_CONFIG.RETRY_ATTEMPTS; attempt++) {
    try {
      if (API_CONFIG.DEBUG_MODE) {
        console.log(`🌐 Attempt ${attempt + 1}/${API_CONFIG.RETRY_ATTEMPTS} for ${requestOptions.method} ${finalUrl}`);
      }
      
      const response = await fetchWithTimeout(finalUrl, requestOptions);
      const data = await handleResponse(response);
      
      if (API_CONFIG.DEBUG_MODE) {
        console.log(`✅ API Response: ${response.status}`, data);
      }
      
      return data;
    } catch (error) {
      lastError = error;
      
      if (API_CONFIG.DEBUG_MODE) {
        console.error(`❌ API Request failed (attempt ${attempt + 1}):`, {
          error: error.message,
          status: error.status,
          url: finalUrl,
          method: requestOptions.method
        });
      }
      
      if (error.name === 'AbortError' || 
          error.status === 401 || 
          error.status === 403 || 
          error.status === 404 ||
          (error.status >= 400 && error.status < 500)) {
        break;
      }
      
      if (attempt < API_CONFIG.RETRY_ATTEMPTS - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 3000);
        if (API_CONFIG.DEBUG_MODE) {
          console.warn(`⚠️ Reintentando petición en ${delay}ms (intento ${attempt + 1}/${API_CONFIG.RETRY_ATTEMPTS})`);
        }
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  if (API_CONFIG.DEBUG_MODE) {
    console.error('❌ Todos los intentos fallaron:', lastError);
  }
  throw lastError;
};

// ✅ MÉTODOS HTTP BASE - SIN CAMBIOS
export const api = {
  get: (endpoint, params = {}) => {
    return apiRequest(endpoint, { 
      method: 'GET',
      params 
    });
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
      isFormData: true,
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
      isFormData: true,
      timeout: options.timeout || 30000
    };
    
    return apiRequest(endpoint, requestOptions);
  }
};

// ✅ IMPORT MODULES - SIN CAMBIOS
import { 
  initAuthAPI,
  authAPI,
  userAPI,
  adminAPI,
  authTestAPI
} from './api-auth.js';

import { 
  initContentAPI,
  postsAPI,
  chatAPI,
  favoritesAPI,
  contentTestAPI
} from './api-content.js';

import { 
  initBusinessAPI,
  agencyAPI,
  paymentAPI,
  systemAPI,
  businessTestAPI,
  pointsAPI
} from './api-business.js';

if (API_CONFIG.DEBUG_MODE) {
  console.log('🔧 Initializing all API modules with corrected token handling...');
  console.log('🔧 API Base URL:', API_CONFIG.BASE_URL);
  console.log('🔧 Environment:', config.environment.NODE_ENV);
}

initAuthAPI(apiRequest);
initContentAPI(apiRequest);
initBusinessAPI(apiRequest);

if (API_CONFIG.DEBUG_MODE) {
  console.log('✅ All API modules initialized with corrected 401 handling');
}

// ✅ RE-EXPORTACIONES - SIN CAMBIOS
export {
  authAPI,
  userAPI,
  adminAPI,
  authTestAPI,
  postsAPI,
  chatAPI,
  favoritesAPI,
  contentTestAPI,
  agencyAPI,
  paymentAPI,
  systemAPI,
  businessTestAPI,
  pointsAPI
};

// ✅ TESTING API - SIN CAMBIOS
export const testAPI = {
  testConnectivity: async () => {
    try {
      if (API_CONFIG.DEBUG_MODE) {
        console.log('🧪 Testing API connectivity...');
      }
      
      const response = await systemAPI.getStatus();
      
      if (API_CONFIG.DEBUG_MODE) {
        console.log('✅ Connectivity test successful:', response);
      }
      
      return response;
    } catch (error) {
      if (API_CONFIG.DEBUG_MODE) {
        console.error('❌ Connectivity test failed:', error);
      }
      throw error;
    }
  },

  testConfiguration: () => {
    if (API_CONFIG.DEBUG_MODE) {
      console.log('🧪 === TESTING CONFIGURATION ===');
    }
    
    const results = {
      success: true,
      environment: config.environment.NODE_ENV,
      apiUrl: API_CONFIG.BASE_URL,
      socketUrl: API_CONFIG.SOCKET_URL,
      debugMode: API_CONFIG.DEBUG_MODE,
      version: config.app.version
    };
    
    if (API_CONFIG.DEBUG_MODE) {
      console.log('✅ Configuration test results:', results);
    }
    
    return results;
  },

  testAllModules: async () => {
    try {
      if (API_CONFIG.DEBUG_MODE) {
        console.log('🧪 === TESTING ALL MODULES ===');
      }
      
      const results = {
        connectivity: null,
        auth: null,
        content: null,
        business: null,
        points: null,
        system: null
      };
      
      try {
        results.connectivity = await testAPI.testConnectivity();
      } catch (error) {
        results.connectivity = { success: false, error: error.message };
      }
      
      try {
        results.auth = await authTestAPI.testBasicConnectivity();
      } catch (error) {
        results.auth = { success: false, error: error.message };
      }
      
      try {
        results.content = await contentTestAPI.testPostOperations();
      } catch (error) {
        results.content = { success: false, error: error.message };
      }
      
      try {
        results.business = await businessTestAPI.testSystemOperations();
      } catch (error) {
        results.business = { success: false, error: error.message };
      }
      
      try {
        results.points = await businessTestAPI.testPointsFlow();
      } catch (error) {
        results.points = { success: false, error: error.message };
      }
      
      try {
        results.system = testAPI.testConfiguration();
      } catch (error) {
        results.system = { success: false, error: error.message };
      }
      
      if (API_CONFIG.DEBUG_MODE) {
        console.log('✅ All modules test completed:', results);
      }
      
      return {
        success: true,
        results,
        summary: {
          totalTests: Object.keys(results).length,
          successfulTests: Object.values(results).filter(r => r?.success !== false).length,
          failedTests: Object.values(results).filter(r => r?.success === false).length
        }
      };
      
    } catch (error) {
      console.error('❌ All modules testing failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};

// ✅ MANEJO DE ERRORES CORREGIDO
export const handleApiError = (error) => {
  if (API_CONFIG.DEBUG_MODE) {
    console.error('🔥 API Error Details:', {
      name: error.name,
      message: error.message,
      status: error.status,
      errorCode: error.errorCode,
      details: error.details,
      response: error.response,
      environment: config.environment.NODE_ENV,
      apiUrl: API_CONFIG.BASE_URL
    });
  }
  
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
        // ✅ CAMBIO CRÍTICO: NO hacer logout automático desde handleApiError
        // El logout se maneja en handleResponse según el tipo de error 401
        return error.message || 'Error de autenticación. Verifica tu acceso.';
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

// ✅ CONSTANTES - SIN CAMBIOS
export const USER_TYPES = {
  ESCORT: 'ESCORT',
  AGENCY: 'AGENCY', 
  CLIENT: 'CLIENT',
  ADMIN: 'ADMIN'
};

export const PREMIUM_TIERS = {
  BASIC: 'BASIC',
  PREMIUM: 'PREMIUM',
  VIP: 'VIP'
};

export const apiDebug = {
  logRequests: API_CONFIG.DEBUG_MODE,
  
  log: (message, data = null) => {
    if (apiDebug.logRequests) {
      console.log(`🔧 API Debug [${config.environment.NODE_ENV}]: ${message}`, data);
    }
  },
  
  error: (message, error = null) => {
    if (apiDebug.logRequests) {
      console.error(`🔧 API Debug Error [${config.environment.NODE_ENV}]: ${message}`, error);
    }
  },

  getConfigInfo: () => {
    if (!API_CONFIG.DEBUG_MODE) return null;
    
    return {
      environment: config.environment.NODE_ENV,
      apiUrl: API_CONFIG.BASE_URL,
      socketUrl: API_CONFIG.SOCKET_URL,
      timeout: API_CONFIG.TIMEOUT,
      retryAttempts: API_CONFIG.RETRY_ATTEMPTS,
      maxFileSize: API_CONFIG.MAX_FILE_SIZE,
      debugMode: API_CONFIG.DEBUG_MODE,
      appVersion: config.app.version,
      features: config.features
    };
  }
};

// ✅ DEFAULT EXPORT - SIN CAMBIOS
export default {
  api,
  apiRequest,
  auth: authAPI,
  user: userAPI,
  admin: adminAPI,
  posts: postsAPI,
  chat: chatAPI,
  favorites: favoritesAPI,
  agency: agencyAPI,
  payment: paymentAPI,
  points: pointsAPI,
  system: systemAPI,
  API_CONFIG,
  testAPI,
  authTestAPI,
  contentTestAPI,
  businessTestAPI,
  handleApiError,
  formatValidationErrors,
  validateFile,
  apiDebug,
  getApiUrl,
  getSocketUrl,
  config,
  USER_TYPES,
  PREMIUM_TIERS,
  STORAGE_KEYS
};

if (API_CONFIG.DEBUG_MODE) {
  console.log('✅ API.JS v2.2.1 FIXED TOKEN HANDLING - No auto-logout agresivo en 401s de premium');
  console.log('🔧 Environment:', config.environment.NODE_ENV);
  console.log('🔧 API URL:', API_CONFIG.BASE_URL);
  console.log('🔧 Debug Mode:', API_CONFIG.DEBUG_MODE);
  console.log('🚀 === API.JS TOKEN HANDLING FIXED - PREMIUM ACCESS CORREGIDO ===');
}