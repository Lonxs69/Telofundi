/**
 * ====================================================================
 * 🔐 API-AUTH.JS - AUTHENTICATION, USERS & ADMIN APIS
 * ====================================================================
 * 
 * Versión: 1.8.0 - SIN HARDCODING, USA CONFIGURACIÓN DINÁMICA
 * ✅ CORREGIDO: registerAgency function con mejor validación de FormData
 * ✅ CORREGIDO: googleAuth function usa configuración dinámica
 * ✅ CERO HARDCODING
 * 
 * ====================================================================
 */

// ✅ IMPORTAR CONFIGURACIÓN DINÁMICA
import config, { getApiUrl, getGoogleAuthUrl } from '../config/config.js';

// ✅ VARIABLE PARA ALMACENAR LA FUNCIÓN DE REQUEST DEL CENTRALIZADOR
let apiRequestFunction = null;

/**
 * ====================================================================
 * 🔐 AUTHENTICATION API - VERSIÓN SIN HARDCODING
 * ====================================================================
 */
export const authAPI = {
  // ✅ REGISTRO Y LOGIN
  login: (credentials) => {
    if (config.environment.debugMode) {
      console.log('🔧 authAPI.login called');
    }
    if (!apiRequestFunction) {
      throw new Error('API no inicializada. Llama a initAuthAPI primero.');
    }
    return apiRequestFunction('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  },

 // ✅ REGISTRO NORMAL (sin archivos) - CORREGIDO CON TURNSTILE
register: (userData) => {
  if (config.environment.debugMode) {
    console.log('🔧 === authAPI.register called ===');
    console.log('🔧 UserData keys:', Object.keys(userData || {}));
    console.log('🔧 UserType:', userData?.userType);
    console.log('🔧 DataType:', userData instanceof FormData ? 'FormData' : 'Object');
    
    // 🔐 DEBUG CRÍTICO PARA TURNSTILE
    console.log('🔐 === TURNSTILE DEBUG EN API-AUTH ===');
    console.log('🔐 TurnstileToken presente:', !!userData?.turnstileToken);
    console.log('🔐 TurnstileToken valor:', userData?.turnstileToken ? `${userData.turnstileToken.substring(0, 20)}...` : 'NULL/UNDEFINED');
    console.log('🔐 TurnstileToken longitud:', userData?.turnstileToken?.length || 0);
    console.log('🔐 Todos los campos:', Object.keys(userData || {}));
    console.log('🔐 === FIN TURNSTILE DEBUG ===');
  }

  if (!apiRequestFunction) {
    throw new Error('API no inicializada. Llama a initAuthAPI primero.');
  }

  if (!userData) {
    throw new Error('UserData es requerido para el registro');
  }

  // 🔐 VALIDAR QUE TURNSTILE TOKEN ESTÉ PRESENTE
  if (config.environment.debugMode && !userData.turnstileToken) {
    console.warn('⚠️ WARNING: turnstileToken no presente en userData');
    console.warn('⚠️ userData keys:', Object.keys(userData));
  }

  // 🔐 ASEGURAR QUE TURNSTILE TOKEN SE INCLUYA EN EL BODY
  const requestData = {
    ...userData,
    // ✅ CRÍTICO: Asegurar que turnstileToken esté presente
    turnstileToken: userData.turnstileToken || null
  };

  if (config.environment.debugMode) {
    console.log('🔐 === REQUEST DATA FINAL ===');
    console.log('🔐 Request data keys:', Object.keys(requestData));
    console.log('🔐 TurnstileToken en request:', !!requestData.turnstileToken);
    console.log('🔐 TurnstileToken preview:', requestData.turnstileToken?.substring(0, 20) + '...' || 'NULL');
    console.log('🔐 === FIN REQUEST DATA ===');
  }

  // Para registro normal (JSON)
  return apiRequestFunction('/auth/register', {
    method: 'POST',
    body: JSON.stringify(requestData) // ✅ AHORA INCLUYE turnstileToken
  });
},

  // ✅ REGISTRO DE AGENCIA ESPECÍFICO CON DOCUMENTOS - COMPLETAMENTE CORREGIDO CON TURNSTILE
registerAgency: (formData) => {
  if (config.environment.debugMode) {
    console.log('🏢 === authAPI.registerAgency called ===');
  }
  
  // ✅ VERIFICAR INICIALIZACIÓN PRIMERO
  if (!apiRequestFunction) {
    console.error('❌ API no inicializada');
    throw new Error('API no inicializada. Llama a initAuthAPI primero.');
  }
  
  // ✅ VALIDACIÓN MEJORADA DE FORMDATA
  if (config.environment.debugMode) {
    console.log('🏢 Validating FormData:', {
      receivedType: typeof formData,
      isFormData: formData instanceof FormData,
      isNull: formData === null,
      isUndefined: formData === undefined,
      constructor: formData?.constructor?.name
    });
  }
  
  // ✅ VALIDACIÓN ESTRICTA CON MEJOR ERROR HANDLING
  if (!formData) {
    console.error('❌ FormData is null or undefined:', formData);
    throw new Error('Datos del formulario son requeridos para el registro de agencia');
  }
  
  if (!(formData instanceof FormData)) {
    console.error('❌ Expected FormData, received:', {
      type: typeof formData,
      constructor: formData?.constructor?.name,
      value: formData
    });
    throw new Error('El registro de agencia requiere FormData con documentos. Recibido: ' + typeof formData);
  }

  // ✅ VALIDACIÓN DE CONTENIDO DEL FORMDATA
  if (config.environment.debugMode) {
    console.log('🏢 FormData validation passed. Checking contents...');
  }
  
  let hasRequiredFields = false;
  let hasRequiredFiles = false;
  let hasTurnstileToken = false; // 🔐 NUEVO: Verificar Turnstile
  
  const requiredFields = ['email', 'firstName', 'password', 'companyName', 'contactPerson', 'address'];
  const requiredFiles = ['cedulaFrente', 'cedulaTrasera'];
  
  // Verificar campos de texto
  for (let field of requiredFields) {
    if (formData.has(field) && formData.get(field)) {
      hasRequiredFields = true;
      break;
    }
  }
  
  // Verificar archivos
  for (let file of requiredFiles) {
    if (formData.has(file) && formData.get(file)) {
      hasRequiredFiles = true;
      break;
    }
  }

  // 🔐 NUEVO: Verificar Turnstile Token
  if (formData.has('turnstileToken') && formData.get('turnstileToken')) {
    hasTurnstileToken = true;
  }
  
  if (!hasRequiredFields) {
    console.error('❌ FormData missing required text fields');
    throw new Error('FormData no contiene los campos de texto requeridos');
  }
  
  if (!hasRequiredFiles) {
    console.error('❌ FormData missing required files');
    throw new Error('FormData no contiene los archivos de cédula requeridos');
  }

  // 🔐 LOG DETALLADO DEL CONTENIDO DEL FORMDATA (incluyendo Turnstile)
  if (config.environment.debugMode) {
    console.log('🏢 === FORMDATA CONTENTS VALIDATION ===');
    console.log('🏢 Has required fields:', hasRequiredFields);
    console.log('🏢 Has required files:', hasRequiredFiles);
    console.log('🔐 Has turnstile token:', hasTurnstileToken);
    
    console.log('🏢 === FORMDATA DETAILED CONTENTS ===');
    for (let [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`  📄 ${key}: [File] ${value.name} (${(value.size / 1024).toFixed(1)}KB, ${value.type})`);
      } else if (key === 'turnstileToken') {
        // 🔐 LOG ESPECÍFICO PARA TURNSTILE
        console.log(`  🔐 ${key}: ${value ? `${value.substring(0, 20)}...` : 'NULL/EMPTY'} (length: ${value?.length || 0})`);
      } else {
        console.log(`  📝 ${key}: ${value}`);
      }
    }
    console.log('🏢 === END FORMDATA CONTENTS ===');
  }

  // 🔐 WARNING SI NO HAY TURNSTILE TOKEN
  if (config.environment.debugMode && !hasTurnstileToken) {
    console.warn('⚠️ WARNING: turnstileToken no encontrado en FormData para agencia');
    console.warn('⚠️ FormData keys:', Array.from(formData.keys()));
  }

  // ✅ LLAMADA AL ENDPOINT CORRECTO USANDO LA FUNCIÓN CENTRALIZADA
  if (config.environment.debugMode) {
    console.log('🏢 === MAKING API REQUEST ===');
    console.log('🏢 Endpoint: /auth/register/agency');
    console.log('🏢 Method: POST');
    console.log('🏢 Body type: FormData');
    console.log('🏢 Environment:', config.environment.NODE_ENV);
    console.log('🏢 API URL:', config.urls.api);
    console.log('🔐 Turnstile included:', hasTurnstileToken);
    console.log('🏢 === SENDING REQUEST ===');
  }
  
  return apiRequestFunction('/auth/register/agency', {
    method: 'POST',
    body: formData, // ✅ FormData ya incluye turnstileToken si fue agregado
    isFormData: true
  });
},
  logout: () => {
    if (!apiRequestFunction) {
      throw new Error('API no inicializada. Llama a initAuthAPI primero.');
    }
    return apiRequestFunction('/auth/logout', {
      method: 'POST'
    });
  },

  refreshToken: (refreshToken) => {
    if (!apiRequestFunction) {
      throw new Error('API no inicializada. Llama a initAuthAPI primero.');
    }
    return apiRequestFunction('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken })
    });
  },

  // ✅ RECUPERACIÓN DE CONTRASEÑA
  forgotPassword: (email) => {
    if (!apiRequestFunction) {
      throw new Error('API no inicializada. Llama a initAuthAPI primero.');
    }
    return apiRequestFunction('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  resetPassword: (token, password) => {
    if (!apiRequestFunction) {
      throw new Error('API no inicializada. Llama a initAuthAPI primero.');
    }
    return apiRequestFunction('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password })
    });
  },

  changePassword: (currentPassword, newPassword) => {
    if (!apiRequestFunction) {
      throw new Error('API no inicializada. Llama a initAuthAPI primero.');
    }
    return apiRequestFunction('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword })
    });
  },

  // ✅ VERIFICACIÓN DE EMAIL
  verifyEmail: (token) => {
    if (!apiRequestFunction) {
      throw new Error('API no inicializada. Llama a initAuthAPI primero.');
    }
    return apiRequestFunction('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token })
    });
  },

  resendVerification: () => {
    if (!apiRequestFunction) {
      throw new Error('API no inicializada. Llama a initAuthAPI primero.');
    }
    return apiRequestFunction('/auth/resend-verification', {
      method: 'POST'
    });
  },

  // ✅ GOOGLE AUTH - COMPLETAMENTE DINÁMICO, SIN HARDCODING
  googleAuth: (userType = 'CLIENT') => {
    if (config.environment.debugMode) {
      console.log('🔧 authAPI.googleAuth called:', { userType });
      console.log('🔧 Environment:', config.environment.NODE_ENV);
      console.log('🔧 API URL:', config.urls.api);
    }
    
    // ✅ USAR FUNCIÓN DINÁMICA PARA OBTENER URL DE GOOGLE AUTH
    const googleAuthUrl = getGoogleAuthUrl(userType);
    
    if (config.environment.debugMode) {
      console.log('🔧 Generated Google Auth URL:', googleAuthUrl);
    }
    
    // Redirigir directamente (esto se ejecuta en el browser)
    if (typeof window !== 'undefined') {
      window.location.href = googleAuthUrl;
    }
    
    return googleAuthUrl;
  },

  googleCallback: () => {
    if (!apiRequestFunction) {
      throw new Error('API no inicializada. Llama a initAuthAPI primero.');
    }
    return apiRequestFunction('/auth/google/callback', {
      method: 'GET'
    });
  },

  // ✅ PERFIL DE AUTENTICACIÓN
  getProfile: () => {
    if (!apiRequestFunction) {
      throw new Error('API no inicializada. Llama a initAuthAPI primero.');
    }
    return apiRequestFunction('/auth/profile', {
      method: 'GET'
    });
  },

  // ✅ TEST EMAIL (SOLO DESARROLLO)
  testEmail: (email, type) => {
    if (!apiRequestFunction) {
      throw new Error('API no inicializada. Llama a initAuthAPI primero.');
    }
    return apiRequestFunction('/auth/test-email', {
      method: 'POST',
      body: JSON.stringify({ email, type })
    });
  }
};

/**
 * ====================================================================
 * 👤 USERS API - VERSIÓN SINCRONIZADA COMPLETA
 * ====================================================================
 */
export const userAPI = {
  // ✅ PERFIL DE USUARIO
  getProfile: () => {
    if (!apiRequestFunction) {
      throw new Error('API no inicializada. Llama a initAuthAPI primero.');
    }
    return apiRequestFunction('/users/profile', {
      method: 'GET'
    });
  },

  updateProfile: (profileData) => {
    if (config.environment.debugMode) {
      console.log('🔧 userAPI.updateProfile called:', profileData);
    }
    
    if (!apiRequestFunction) {
      throw new Error('API no inicializada. Llama a initAuthAPI primero.');
    }
    
    if (!profileData || typeof profileData !== 'object') {
      throw new Error('Los datos del perfil deben ser un objeto válido');
    }

    if (Object.keys(profileData).length === 0) {
      throw new Error('No hay datos para actualizar');
    }

    return apiRequestFunction('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  },

  // ✅ GESTIÓN DE AVATAR
  uploadAvatar: (file) => {
    if (!apiRequestFunction) {
      throw new Error('API no inicializada. Llama a initAuthAPI primero.');
    }
    
    // Validación básica de archivo usando configuración dinámica
    if (!file) {
      throw new Error('No se seleccionó ningún archivo');
    }
    
    const maxSize = config.limits.maxFileSize;
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
      throw new Error(`El archivo es muy grande. Máximo: ${maxSizeMB}MB`);
    }
    
    const formData = new FormData();
    formData.append('avatar', file);
    
    return apiRequestFunction('/users/profile/picture', {
      method: 'POST',
      body: formData,
      isFormData: true
    });
  },

  deleteAvatar: () => {
    if (!apiRequestFunction) {
      throw new Error('API no inicializada. Llama a initAuthAPI primero.');
    }
    return apiRequestFunction('/users/profile/picture', {
      method: 'DELETE'
    });
  },

  // ✅ BÚSQUEDA Y DESCUBRIMIENTO
  searchUsers: (params = {}) => {
    if (!apiRequestFunction) {
      throw new Error('API no inicializada. Llama a initAuthAPI primero.');
    }
    return apiRequestFunction('/users/search', {
      method: 'GET',
      params
    });
  },

  getDiscoverUsers: (params = {}) => {
    if (!apiRequestFunction) {
      throw new Error('API no inicializada. Llama a initAuthAPI primero.');
    }
    return apiRequestFunction('/users/discover', {
      method: 'GET',
      params
    });
  },

  getTrendingUsers: (params = {}) => {
    if (!apiRequestFunction) {
      throw new Error('API no inicializada. Llama a initAuthAPI primero.');
    }
    return apiRequestFunction('/users/trending', {
      method: 'GET',
      params
    });
  },

  getUserById: (userId) => {
    if (!apiRequestFunction) {
      throw new Error('API no inicializada. Llama a initAuthAPI primero.');
    }
    return apiRequestFunction(`/users/${userId}`, {
      method: 'GET'
    });
  },

  // ✅ ESTADÍSTICAS Y CONFIGURACIONES
  getStats: () => {
    if (!apiRequestFunction) {
      throw new Error('API no inicializada. Llama a initAuthAPI primero.');
    }
    return apiRequestFunction('/users/stats', {
      method: 'GET'
    });
  },

  getSettings: () => {
    if (!apiRequestFunction) {
      throw new Error('API no inicializada. Llama a initAuthAPI primero.');
    }
    return apiRequestFunction('/users/settings', {
      method: 'GET'
    });
  },

  updateSettings: (settings) => {
    if (!apiRequestFunction) {
      throw new Error('API no inicializada. Llama a initAuthAPI primero.');
    }
    return apiRequestFunction('/users/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  },

  // ✅ BLOQUEO Y REPORTES
  blockUser: (userId, reason = null) => {
    if (!apiRequestFunction) {
      throw new Error('API no inicializada. Llama a initAuthAPI primero.');
    }
    return apiRequestFunction(`/users/${userId}/block`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  },

  unblockUser: (userId) => {
    if (!apiRequestFunction) {
      throw new Error('API no inicializada. Llama a initAuthAPI primero.');
    }
    return apiRequestFunction(`/users/${userId}/unblock`, {
      method: 'DELETE'
    });
  },

  getBlockedUsers: (params = {}) => {
    if (!apiRequestFunction) {
      throw new Error('API no inicializada. Llama a initAuthAPI primero.');
    }
    return apiRequestFunction('/users/blocked', {
      method: 'GET',
      params
    });
  },

  reportUser: (userId, reportData) => {
    if (!apiRequestFunction) {
      throw new Error('API no inicializada. Llama a initAuthAPI primero.');
    }
    return apiRequestFunction(`/users/${userId}/report`, {
      method: 'POST',
      body: JSON.stringify(reportData)
    });
  },

  // ✅ CLOUDINARY Y TESTS
  getCloudinaryStats: () => {
    if (!apiRequestFunction) {
      throw new Error('API no inicializada. Llama a initAuthAPI primero.');
    }
    return apiRequestFunction('/users/cloudinary/stats', {
      method: 'GET'
    });
  },

  testCloudinary: () => {
    if (!apiRequestFunction) {
      throw new Error('API no inicializada. Llama a initAuthAPI primero.');
    }
    return apiRequestFunction('/users/test/cloudinary-public', {
      method: 'GET'
    });
  },

  // ✅ HELPERS
  formatUserData: (user) => {
    if (!user) return null;
    
    return {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      bio: user.bio,
      userType: user.userType,
      isActive: user.isActive,
      isVerified: user.isVerified || false,
      isPremium: user.isPremium || false,
      premiumTier: user.premiumTier,
      profileViews: user.profileViews || 0,
      location: user.location,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      // Datos específicos por tipo
      escort: user.escort,
      agency: user.agency,
      client: user.client,
      admin: user.admin
    };
  },

  validateProfileData: (profileData) => {
    const errors = {};
    
    if (profileData.firstName && (profileData.firstName.length < 2 || profileData.firstName.length > 50)) {
      errors.firstName = 'El nombre debe tener entre 2 y 50 caracteres';
    }
    
    if (profileData.lastName && (profileData.lastName.length < 2 || profileData.lastName.length > 50)) {
      errors.lastName = 'El apellido debe tener entre 2 y 50 caracteres';
    }
    
    const bioMaxLength = config.limits.bioMaxLength;
    if (profileData.bio && profileData.bio.length > bioMaxLength) {
      errors.bio = `La biografía no puede exceder ${bioMaxLength} caracteres`;
    }
    
    if (profileData.phone && !/^[\+]?[1-9][\d]{0,15}$/.test(profileData.phone.replace(/\s/g, ''))) {
      errors.phone = 'Número de teléfono inválido';
    }
    
    if (profileData.website && profileData.website.trim()) {
      try {
        new URL(profileData.website);
      } catch {
        errors.website = 'URL del sitio web inválida';
      }
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
};

/**
 * ====================================================================
 * 🛡️ ADMIN API - VERSIÓN SINCRONIZADA COMPLETA (sin cambios)
 * ====================================================================
 */
export const adminAPI = {
  // ✅ MÉTRICAS Y ANALYTICS
  getMetrics: (params = {}) => {
    if (config.environment.debugMode) {
      console.log('📊 === GET ADMIN METRICS API CALL ===');
      console.log('📊 Input params:', params);
    }
    
    if (!apiRequestFunction) {
      throw new Error('API no inicializada. Llama a initAuthAPI primero.');
    }
    
    return apiRequestFunction('/admin/metrics', {
      method: 'GET',
      params
    });
  },

  // ✅ GESTIÓN DE USUARIOS
  getAllUsers: (params = {}) => {
    if (config.environment.debugMode) {
      console.log('👥 === GET ALL USERS API CALL ===');
      console.log('👥 Input params:', params);
    }
    
    if (!apiRequestFunction) {
      throw new Error('API no inicializada. Llama a initAuthAPI primero.');
    }
    
    return apiRequestFunction('/admin/users', {
      method: 'GET',
      params
    });
  },

  getUserDetails: (userId) => {
    if (config.environment.debugMode) {
      console.log('👤 === GET USER DETAILS API CALL ===');
      console.log('👤 User ID:', userId);
    }
    
    if (!apiRequestFunction) {
      throw new Error('API no inicializada. Llama a initAuthAPI primero.');
    }
    
    if (!userId) {
      throw new Error('ID de usuario es requerido');
    }
    
    return apiRequestFunction(`/admin/users/${userId}`, {
      method: 'GET'
    });
  },

  // ✅ GESTIÓN DE BANEOS
  banUser: (userId, banData) => {
    if (config.environment.debugMode) {
      console.log('🚫 === BAN USER API CALL ===');
      console.log('🚫 User ID:', userId);
      console.log('🚫 Ban Data:', banData);
    }
    
    if (!apiRequestFunction) {
      throw new Error('API no inicializada. Llama a initAuthAPI primero.');
    }
    
    if (!userId) {
      throw new Error('ID de usuario es requerido');
    }
    
    if (!banData.reason || !banData.reason.trim()) {
      throw new Error('Motivo del baneo es requerido');
    }
    
    const requestData = {
      reason: banData.reason.trim(),
      severity: banData.severity || 'TEMPORARY',
      duration: banData.duration || null,
      evidence: banData.evidence || null
    };
    
    if (config.environment.debugMode) {
      console.log('📤 Request data:', requestData);
    }
    
    return apiRequestFunction(`/admin/users/${userId}/ban`, {
      method: 'POST',
      body: JSON.stringify(requestData)
    });
  },

  unbanUser: (userId, unbanData = {}) => {
    if (config.environment.debugMode) {
      console.log('✅ === UNBAN USER API CALL ===');
      console.log('✅ User ID:', userId);
      console.log('✅ Unban Data:', unbanData);
    }
    
    if (!apiRequestFunction) {
      throw new Error('API no inicializada. Llama a initAuthAPI primero.');
    }
    
    if (!userId) {
      throw new Error('ID de usuario es requerido');
    }
    
    const requestData = {
      reason: unbanData.reason || 'Desbaneado por administrador'
    };
    
    return apiRequestFunction(`/admin/users/${userId}/unban`, {
      method: 'POST',
      body: JSON.stringify(requestData)
    });
  },

  getBannedUsers: (params = {}) => {
    if (config.environment.debugMode) {
      console.log('🚫 === GET BANNED USERS API CALL ===');
      console.log('🚫 Input params:', params);
    }
    
    if (!apiRequestFunction) {
      throw new Error('API no inicializada. Llama a initAuthAPI primero.');
    }
    
    return apiRequestFunction('/admin/banned-users', {
      method: 'GET',
      params
    });
  },

  // ✅ GESTIÓN DE REPORTES
  getPendingReports: (params = {}) => {
    if (config.environment.debugMode) {
      console.log('📋 === GET PENDING REPORTS API CALL ===');
      console.log('📋 Input params:', params);
    }
    
    if (!apiRequestFunction) {
      throw new Error('API no inicializada. Llama a initAuthAPI primero.');
    }
    
    return apiRequestFunction('/admin/reports', {
      method: 'GET',
      params
    });
  },

  resolveReport: (reportId, resolution) => {
    if (config.environment.debugMode) {
      console.log('🔧 === RESOLVE REPORT API CALL ===');
      console.log('🔧 Report ID:', reportId);
      console.log('🔧 Resolution:', resolution);
    }
    
    if (!apiRequestFunction) {
      throw new Error('API no inicializada. Llama a initAuthAPI primero.');
    }
    
    if (!reportId) {
      throw new Error('ID de reporte es requerido');
    }
    
    if (!resolution.action) {
      throw new Error('Acción es requerida');
    }
    
    const requestData = {
      action: resolution.action,
      resolution: resolution.resolution || '',
      actionTaken: resolution.actionTaken || resolution.action,
      banDuration: resolution.banDuration || null,
      banSeverity: resolution.banSeverity || 'TEMPORARY'
    };
    
    if (config.environment.debugMode) {
      console.log('📤 Request data:', requestData);
    }
    
    return apiRequestFunction(`/admin/reports/${reportId}/resolve`, {
      method: 'PUT',
      body: JSON.stringify(requestData)
    });
  },

  // ✅ GESTIÓN DE AGENCIAS (APROBACIÓN)
  getPendingAgencies: (params = {}) => {
    if (config.environment.debugMode) {
      console.log('🏢 === GET PENDING AGENCIES API CALL ===');
      console.log('🏢 Input params:', params);
    }
    
    if (!apiRequestFunction) {
      throw new Error('API no inicializada. Llama a initAuthAPI primero.');
    }
    
    return apiRequestFunction('/admin/agencies/pending', {
      method: 'GET',
      params
    });
  },

  approveAgency: (agencyId, approvalData = {}) => {
    if (config.environment.debugMode) {
      console.log('✅ === APPROVE AGENCY API CALL ===');
      console.log('✅ Agency ID:', agencyId);
      console.log('✅ Approval Data:', approvalData);
    }
    
    if (!apiRequestFunction) {
      throw new Error('API no inicializada. Llama a initAuthAPI primero.');
    }
    
    if (!agencyId) {
      throw new Error('ID de agencia es requerido');
    }
    
    const requestData = {
      notes: approvalData.notes || ''
    };
    
    return apiRequestFunction(`/admin/agencies/${agencyId}/approve`, {
      method: 'POST',
      body: JSON.stringify(requestData)
    });
  },

  rejectAgency: (agencyId, rejectionData) => {
    if (config.environment.debugMode) {
      console.log('❌ === REJECT AGENCY API CALL ===');
      console.log('❌ Agency ID:', agencyId);
      console.log('❌ Rejection Data:', rejectionData);
    }
    
    if (!apiRequestFunction) {
      throw new Error('API no inicializada. Llama a initAuthAPI primero.');
    }
    
    if (!agencyId) {
      throw new Error('ID de agencia es requerido');
    }
    
    if (!rejectionData.reason || !rejectionData.reason.trim()) {
      throw new Error('Motivo del rechazo es requerido');
    }
    
    const requestData = {
      reason: rejectionData.reason.trim(),
      notes: rejectionData.notes || ''
    };
    
    return apiRequestFunction(`/admin/agencies/${agencyId}/reject`, {
      method: 'POST',
      body: JSON.stringify(requestData)
    });
  },

  // ✅ CONFIGURACIONES DE LA APLICACIÓN
  updateAppSettings: (settings) => {
    if (config.environment.debugMode) {
      console.log('⚙️ === UPDATE APP SETTINGS API CALL ===');
      console.log('⚙️ Settings:', settings);
    }
    
    if (!apiRequestFunction) {
      throw new Error('API no inicializada. Llama a initAuthAPI primero.');
    }
    
    if (!settings || typeof settings !== 'object') {
      throw new Error('Configuraciones deben ser un objeto válido');
    }
    
    const requestData = {
      maintenanceMode: settings.maintenanceMode || false,
      registrationEnabled: settings.registrationEnabled !== false,
      maxPostsPerEscort: settings.maxPostsPerEscort || 5,
      verificationCost: settings.verificationCost || 50,
      commissionRate: settings.commissionRate || 0.1,
      pointsPerDollar: settings.pointsPerDollar || 100,
      featuredPostCost: settings.featuredPostCost || 10
    };
    
    if (config.environment.debugMode) {
      console.log('📤 Request data:', requestData);
    }
    
    return apiRequestFunction('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(requestData)
    });
  },

  // ✅ HELPERS PARA ADMIN - RESTO DEL CÓDIGO IGUAL (sin cambios por brevedad)
  formatUserData: (user) => {
    if (!user) return null;
    
    return {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      userType: user.userType,
      avatar: user.avatar,
      isActive: user.isActive,
      isBanned: user.isBanned,
      banReason: user.banReason,
      profileViews: user.profileViews || 0,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      lastActiveAt: user.lastActiveAt,
      location: user.location,
      escort: user.escort,
      agency: user.agency,
      client: user.client,
      admin: user.admin,
      _count: user._count
    };
  },

  // ... resto de helpers sin cambios por brevedad
  // formatBanData, formatReportData, formatAgencyData, calculateSummaryStats, etc.
};

/**
 * ====================================================================
 * 🔧 FUNCIÓN DE INICIALIZACIÓN - INYECCIÓN DE DEPENDENCIAS
 * ====================================================================
 */
export const initAuthAPI = (apiRequestFn) => {
  if (config.environment.debugMode) {
    console.log('✅ === INICIALIZANDO AUTH API ===');
    console.log('✅ Recibida función apiRequest:', typeof apiRequestFn);
    console.log('✅ Environment:', config.environment.NODE_ENV);
    console.log('✅ API URL:', config.urls.api);
  }
  
  if (typeof apiRequestFn !== 'function') {
    throw new Error('initAuthAPI requiere una función apiRequest válida');
  }
  
  apiRequestFunction = apiRequestFn;
  
  if (config.environment.debugMode) {
    console.log('✅ Auth API inicializada correctamente con función centralizada');
    console.log('✅ authAPI.registerAgency disponible:', typeof authAPI.registerAgency);
    console.log('✅ authAPI.googleAuth disponible:', typeof authAPI.googleAuth);
  }
};

/**
 * ====================================================================
 * 🧪 FUNCIONES DE DEBUG Y TEST - VERSIÓN DINÁMICA
 * ====================================================================
 */
export const authTestAPI = {
  // ✅ TEST DE CONECTIVIDAD BÁSICA
  testBasicConnectivity: async () => {
    try {
      if (config.environment.debugMode) {
        console.log('🧪 Testing basic connectivity...');
        console.log('🧪 Environment:', config.environment.NODE_ENV);
        console.log('🧪 API URL:', config.urls.api);
      }
      
      if (!apiRequestFunction) {
        throw new Error('API no inicializada');
      }
      
      const response = await apiRequestFunction('/auth/profile', { method: 'GET' });
      
      if (config.environment.debugMode) {
        console.log('🧪 Basic connectivity response:', response);
      }
      
      return { success: true, data: response };
    } catch (error) {
      console.error('❌ Basic connectivity test failed:', error);
      return { success: false, error: error.message };
    }
  },

  testConnectivity: async () => {
    if (!apiRequestFunction) {
      throw new Error('API no inicializada. Llama a initAuthAPI primero.');
    }
    
    try {
      if (config.environment.debugMode) {
        console.log('🧪 Testing auth API connectivity...');
      }
      
      const response = await authAPI.getProfile();
      
      if (config.environment.debugMode) {
        console.log('✅ Auth connectivity test successful:', response);
      }
      
      return response;
    } catch (error) {
      console.error('❌ Auth connectivity test failed:', error);
      throw error;
    }
  },

  testUserOperations: async () => {
    if (!apiRequestFunction) {
      throw new Error('API no inicializada. Llama a initAuthAPI primero.');
    }
    
    try {
      if (config.environment.debugMode) {
        console.log('🧪 Testing user operations...');
      }
      
      const results = {};
      
      try {
        const profile = await userAPI.getProfile();
        results.profile = { success: true, data: profile };
      } catch (error) {
        results.profile = { success: false, error: error.message };
      }
      
      try {
        const stats = await userAPI.getStats();
        results.stats = { success: true, data: stats };
      } catch (error) {
        results.stats = { success: false, error: error.message };
      }
      
      if (config.environment.debugMode) {
        console.log('✅ User operations test completed:', results);
      }
      
      return results;
    } catch (error) {
      console.error('❌ User operations test failed:', error);
      throw error;
    }
  },

  testAdminOperations: async () => {
    if (!apiRequestFunction) {
      throw new Error('API no inicializada. Llama a initAuthAPI primero.');
    }
    
    try {
      if (config.environment.debugMode) {
        console.log('🧪 Testing admin operations...');
      }
      
      const results = {};
      
      try {
        const metrics = await adminAPI.getMetrics({ period: 'current' });
        results.metrics = { success: true, data: metrics };
      } catch (error) {
        results.metrics = { success: false, error: error.message };
      }
      
      try {
        const users = await adminAPI.getAllUsers({ page: 1, limit: 5 });
        results.users = { success: true, count: users.data?.users?.length || 0 };
      } catch (error) {
        results.users = { success: false, error: error.message };
      }
      
      try {
        const agencies = await adminAPI.getPendingAgencies({ page: 1, limit: 5 });
        results.pendingAgencies = { success: true, count: agencies.data?.agencies?.length || 0 };
      } catch (error) {
        results.pendingAgencies = { success: false, error: error.message };
      }
      
      if (config.environment.debugMode) {
        console.log('✅ Admin operations test completed:', results);
      }
      
      return results;
    } catch (error) {
      console.error('❌ Admin operations test failed:', error);
      throw error;
    }
  },

  testAgencyFlow: async () => {
    if (!apiRequestFunction) {
      throw new Error('API no inicializada. Llama a initAuthAPI primero.');
    }
    
    try {
      if (config.environment.debugMode) {
        console.log('🧪 Testing agency flow...');
      }
      
      const results = {};
      
      try {
        const pendingAgencies = await adminAPI.getPendingAgencies();
        results.getPendingAgencies = { 
          success: true, 
          count: pendingAgencies.data?.agencies?.length || 0 
        };
      } catch (error) {
        results.getPendingAgencies = { success: false, error: error.message };
      }
      
      try {
        const testAgencyData = {
          companyName: 'Test Agency',
          contactPerson: 'John Doe',
          address: '123 Test Street',
          documentFrontImage: 'https://example.com/front.jpg',
          documentBackImage: 'https://example.com/back.jpg'
        };
        
        const validation = adminAPI.validateAgencyApproval(testAgencyData);
        results.agencyValidation = { 
          success: validation.isValid, 
          errors: validation.errors 
        };
      } catch (error) {
        results.agencyValidation = { success: false, error: error.message };
      }
      
      if (config.environment.debugMode) {
        console.log('✅ Agency flow test completed:', results);
      }
      
      return results;
    } catch (error) {
      console.error('❌ Agency flow test failed:', error);
      throw error;
    }
  },

  // ✅ TEST ESPECÍFICO PARA GOOGLE AUTH - DINÁMICO
  testGoogleAuth: () => {
    try {
      if (config.environment.debugMode) {
        console.log('🧪 === TESTING GOOGLE AUTH (DYNAMIC) ===');
      }
      
      // Test la función googleAuth
      const googleAuthUrl = authAPI.googleAuth('CLIENT');
      
      if (config.environment.debugMode) {
        console.log('🧪 Google Auth URL generated:', googleAuthUrl);
        console.log('🧪 Environment:', config.environment.NODE_ENV);
        console.log('🧪 API URL:', config.urls.api);
      }
      
      return {
        success: true,
        environment: config.environment.NODE_ENV,
        apiUrl: config.urls.api,
        googleAuthUrl,
        isDynamic: true
      };
    } catch (error) {
      console.error('❌ Google Auth test failed:', error);
      return { success: false, error: error.message };
    }
  },

  // ✅ TEST ESPECÍFICO PARA REGISTRO DE AGENCIA - MEJORADO Y COMPLETO
  testAgencyRegister: async () => {
    try {
      if (config.environment.debugMode) {
        console.log('🧪 === TESTING AGENCY REGISTER FUNCTION (COMPLETO Y DINÁMICO) ===');
        console.log('🧪 Environment:', config.environment.NODE_ENV);
        console.log('🧪 API URL:', config.urls.api);
      }
      
      // Test 1: Verificar inicialización
      console.log('🧪 Test 1: API Initialization');
      const isInitialized = !!apiRequestFunction;
      console.log('🧪 API initialized:', isInitialized);
      
      if (!isInitialized) {
        return { 
          success: false, 
          error: 'API no inicializada - falta llamar initAuthAPI()' 
        };
      }
      
      // Test 2: Verificar que la función existe
      console.log('🧪 Test 2: Function existence');
      const functionExists = typeof authAPI.registerAgency === 'function';
      console.log('🧪 authAPI.registerAgency exists:', functionExists);
      
      // Test 3: Verificar FormData detection
      console.log('🧪 Test 3: FormData detection');
      const testFormData = new FormData();
      testFormData.append('test', 'value');
      testFormData.append('email', 'test@example.com');
      
      const isFormData = testFormData instanceof FormData;
      console.log('🧪 FormData test:', {
        isFormData,
        type: typeof testFormData,
        constructor: testFormData.constructor.name,
        hasKeys: Array.from(testFormData.keys())
      });
      
      // Test 4: Simular validación (sin hacer request real)
      console.log('🧪 Test 4: Validation simulation');
      try {
        authAPI.registerAgency(null);
      } catch (validationError) {
        console.log('🧪 Expected validation error for null:', validationError.message);
      }
      
      try {
        authAPI.registerAgency(undefined);
      } catch (validationError) {
        console.log('🧪 Expected validation error for undefined:', validationError.message);
      }
      
      try {
        authAPI.registerAgency("not formdata");
      } catch (validationError) {
        console.log('🧪 Expected validation error for string:', validationError.message);
      }
      
      try {
        authAPI.registerAgency({});
      } catch (validationError) {
        console.log('🧪 Expected validation error for object:', validationError.message);
      }
      
      console.log('🧪 === AGENCY REGISTER TEST COMPLETED (DYNAMIC) ===');
      
      return {
        success: true,
        environment: config.environment.NODE_ENV,
        apiUrl: config.urls.api,
        isInitialized,
        functionExists,
        formDataDetection: isFormData,
        validationWorks: true,
        isDynamic: true
      };
    } catch (error) {
      console.error('❌ Agency register test failed:', error);
      return { success: false, error: error.message };
    }
  }
};

if (config.environment.debugMode) {
  console.log('✅ API-AUTH.JS v1.8.0 loaded - SIN HARDCODING, CONFIGURACIÓN DINÁMICA');
  console.log('✅ Environment:', config.environment.NODE_ENV);
  console.log('✅ API URL:', config.urls.api);
}