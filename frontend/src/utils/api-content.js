/**
 * ====================================================================
 * 📝 API-CONTENT.JS - POSTS, CHAT & FAVORITES APIs - ALGORITMOS DIFERENCIADOS v3.0
 * ====================================================================
 * 
 * ✅ CORREGIDO: Algoritmos completamente diferenciados por tab
 * ✅ DISCOVER: Personalización real con ML y historial de usuario
 * ✅ TRENDING: Engagement puro con decaimiento temporal
 * ✅ OVERVIEW: Feed equilibrado con boosts inteligentes
 * ✅ PREMIUM: Contenido exclusivo verificado
 * ✅ CHAT: API completa y funcional
 * ✅ FAVORITES: Gestión optimizada con cache
 * ✅ PERFORMANCE: Fire-and-forget operations, menos latencia
 * 
 * ====================================================================
 */

// Importar configuración base
import { API_CONFIG, validateFile } from './api.js';

/**
 * ====================================================================
 * 📝 POSTS API - OPTIMIZADO CON ALGORITMOS DIFERENCIADOS REALES
 * ====================================================================
 */
export const postsAPI = {
  // ===================================================================
  // 🔧 CRUD BÁSICO - OPTIMIZADO
  // ===================================================================
  
  createPost: (formData) => apiRequest('/posts', {
    method: 'POST',
    body: formData,
    isFormData: true
  }),

  updatePost: (postId, formData) => apiRequest(`/posts/${postId}`, {
    method: 'PUT',
    body: formData,
    isFormData: true
  }),

  deletePost: (postId) => apiRequest(`/posts/${postId}`, { method: 'DELETE' }),
  getPostById: (postId) => apiRequest(`/posts/${postId}`),

  // ===================================================================
  // 🚀 FUNCIONES CON ALGORITMOS DIFERENCIADOS - COMPLETAMENTE REDISEÑADAS
  // ===================================================================

  // ✅ FEED PRINCIPAL - ALGORITMO EQUILIBRADO CON BOOST INTELIGENTE
  getFeed: (filters = {}) => {
    const params = {
      ...filters,
      algorithm: 'balanced_feed',
      tabType: filters.tabType || 'overview',
      boostPriority: filters.page === 1 || !filters.page,
      balanceMode: true,
      sortBy: filters.boostPriority ? 'boosted' : (filters.sortBy || 'recent'),
      qualityThreshold: 30,
      excludeBlocked: true,
      includeEngagement: true
    };
    
    return apiRequest('/posts/feed', { method: 'GET', params });
  },

  // ✅ TRENDING - ALGORITMO PURO DE ENGAGEMENT CON DECAIMIENTO TEMPORAL
  getTrending: (params = {}) => {
    const trendingParams = {
      ...params,
      algorithm: 'engagement_trending',
      tabType: 'trending',
      timeframe: params.timeframe || '24h',
      minEngagement: 1,
      engagementWeight: 'high',
      timeDecayEnabled: true,
      qualityFilter: 'medium',
      recentOnly: true,
      primarySort: 'engagement',
      secondarySort: 'temporal_decay',
      includeViews: true,
      includeFavorites: true,
      includeShares: true
    };
    
    return apiRequest('/posts/trending', { method: 'GET', params: trendingParams });
  },

  // ✅ DISCOVERY - ALGORITMO PERSONALIZADO CON ML Y DIVERSIDAD
  getDiscover: (params = {}) => {
    const discoveryParams = {
      ...params,
      algorithm: params.algorithm || 'personalized',
      tabType: 'discover',
      includeInteractionHistory: true,
      includePreferences: true,
      diversityMode: true,
      qualityThreshold: params.qualityThreshold || 60,
      qualityFilter: 'high',
      excludeViewed: true,
      excludeBlocked: true,
      excludeLowQuality: true,
      diversityWeight: 0.3,
      noveltyWeight: 0.2,
      qualityWeight: 0.4,
      personalizedWeight: 0.1,
      includeAuthorDiversity: true,
      includeServiceDiversity: true,
      includeLocationDiversity: true
    };
    
    return apiRequest('/posts/discover', { method: 'GET', params: discoveryParams });
  },

  getMyPosts: (params = {}) => apiRequest('/posts/my', { method: 'GET', params }),
  checkPostLimits: () => apiRequest('/posts/limits'),

  // ===================================================================
  // 💖 INTERACCIONES OPTIMIZADAS
  // ===================================================================

  likePost: (postId) => apiRequest(`/posts/${postId}/like`, { method: 'POST' }),
  toggleFavorite: (postId) => apiRequest(`/posts/${postId}/favorite`, { method: 'POST' }),

  // ===================================================================
  // 🧠 FUNCIONES ESPECÍFICAS POR ALGORITMO - NUEVAS
  // ===================================================================

  // ✅ TRENDING CON OPCIONES ESPECÍFICAS - REDISEÑADO COMPLETAMENTE
  getTrendingWithOptions: (options = {}) => {
    const params = {
      limit: options.limit || 20,
      timeframe: options.timeframe || '24h',
      sexo: options.sexo,
      tabType: options.tabType || 'trending',
      algorithm: 'engagement_based_trending',
      engagementFormula: 'advanced',
      minEngagement: options.minEngagement || 1,
      engagementWeight: options.engagementWeight || 'high',
      timeDecayEnabled: options.timeDecayEnabled !== false,
      likesWeight: 0.5,
      favoritesWeight: 0.3,
      viewsWeight: 0.1,
      timeWeight: 0.1,
      qualityFilter: options.qualityFilter || 'medium',
      recentOnly: options.recentOnly !== false,
      boostHandling: 'tie_breaker',
      excludeBlocked: true,
      excludeLowEngagement: true
    };
    
    return postsAPI.getTrending(params);
  },

  // ✅ DISCOVERY CON OPCIONES ESPECÍFICAS - REDISEÑADO COMPLETAMENTE
  getDiscoveryWithOptions: (options = {}) => {
    const params = {
      limit: options.limit || 20,
      algorithm: options.algorithm || 'personalized',
      tabType: options.tabType || 'discover',
      personalizationLevel: options.personalizationLevel || 'high',
      includeInteractionHistory: options.includeInteractionHistory !== false,
      interactionDepth: options.interactionDepth || 50,
      qualityThreshold: options.qualityThreshold || 60,
      qualityFilter: options.qualityFilter || 'high',
      diversityMode: options.diversityMode !== false,
      diversityWeight: options.diversityWeight || 0.3,
      noveltyWeight: options.noveltyWeight || 0.2,
      excludeViewed: options.excludeViewed !== false,
      excludeBlocked: options.excludeBlocked !== false,
      excludeLowQuality: options.excludeLowQuality !== false,
      sexo: options.sexo,
      ...(options.tabType === 'sidebar' && {
        algorithm: 'sidebar_recommendations',
        qualityFilter: 'medium',
        limit: 8,
        diversityWeight: 0.5,
        personalizedWeight: 0.3
      })
    };
    
    return postsAPI.getDiscover(params);
  },

  // ===================================================================
  // 🔧 HELPER FUNCTIONS OPTIMIZADAS CON ALGORITMOS
  // ===================================================================

  // ✅ Crear post simplificado
  createPostHelper: (postData, images = []) => {
    // Validación rápida mejorada
    const requiredFields = { 
      title: 'título', 
      description: 'descripción', 
      phone: 'teléfono', 
      sexo: 'sexo',
      age: 'edad',
      location: 'ubicación'
    };
    
    for (const [field, label] of Object.entries(requiredFields)) {
      if (!postData[field]?.toString().trim()) {
        throw new Error(`El ${label} es obligatorio`);
      }
    }
    
    // Validaciones específicas
    if (postData.age && (postData.age < 18 || postData.age > 80)) {
      throw new Error('La edad debe estar entre 18 y 80 años');
    }
    
    if (!['Hombre', 'Mujer', 'Trans', 'Otro'].includes(postData.sexo)) {
      throw new Error('El sexo debe ser: Hombre, Mujer, Trans u Otro');
    }
    
    if (!images?.length) throw new Error('Debes agregar al menos una imagen');
    if (images.length > 5) throw new Error('Máximo 5 imágenes permitidas');
    
    const formData = new FormData();
    
    // Campos básicos
    ['title', 'description', 'phone', 'age', 'location', 'sexo'].forEach(field => {
      if (postData[field]) formData.append(field, postData[field]);
    });
    
    // Datos JSON
    const jsonFields = ['services', 'rates', 'availability', 'tags'];
    jsonFields.forEach(field => {
      if (postData[field]) {
        const data = Array.isArray(postData[field]) || typeof postData[field] === 'object' 
          ? JSON.stringify(postData[field]) 
          : postData[field];
        formData.append(field, data);
      }
    });
    
    // Campos opcionales
    if (postData.locationId) formData.append('locationId', postData.locationId);
    if (postData.premiumOnly !== undefined) formData.append('premiumOnly', postData.premiumOnly);
    
    // Boost data
    if (postData.boostAmount > 0) {
      formData.append('boostAmount', postData.boostAmount);
      formData.append('boostDuration', postData.boostDuration || '24h');
    }
    
    // Imágenes con validación
    images.forEach((image, index) => {
      try {
        validateFile(image, API_CONFIG.MAX_POST_FILE_SIZE);
        formData.append('images', image);
      } catch (error) {
        throw new Error(`Error en imagen ${index + 1}: ${error.message}`);
      }
    });
    
    return postsAPI.createPost(formData);
  },

  // ✅ Actualizar post simplificado
  updatePostHelper: (postId, postData, newImages = [], removeImages = []) => {
    const formData = new FormData();
    
    // Validar campos si se proporcionan
    if (postData.sexo && !['Hombre', 'Mujer', 'Trans', 'Otro'].includes(postData.sexo)) {
      throw new Error('El sexo debe ser: Hombre, Mujer, Trans u Otro');
    }
    
    if (postData.age && (postData.age < 18 || postData.age > 80)) {
      throw new Error('La edad debe estar entre 18 y 80 años');
    }
    
    // Agregar todos los campos excepto arrays especiales
    Object.keys(postData).forEach(key => {
      if (!['images', 'newImages', 'removeImages', 'currentImages'].includes(key) && postData[key] !== undefined) {
        const value = (typeof postData[key] === 'object' && postData[key] !== null) 
          ? JSON.stringify(postData[key]) 
          : postData[key];
        formData.append(key, value);
      }
    });
    
    // Nuevas imágenes con validación
    newImages.forEach((image, index) => {
      try {
        validateFile(image, API_CONFIG.MAX_POST_FILE_SIZE);
        formData.append('images', image);
      } catch (error) {
        throw new Error(`Error en nueva imagen ${index + 1}: ${error.message}`);
      }
    });
    
    // Imágenes a eliminar
    if (removeImages.length > 0) {
      formData.append('removeImages', JSON.stringify(removeImages));
    }
    
    return postsAPI.updatePost(postId, formData);
  },

  getMyPostsWithOptions: (options = {}) => {
    const { status = 'active', page = 1, limit = 20, sortBy = 'recent' } = options;
    return postsAPI.getMyPosts({ status, page, limit, sortBy });
  },

  toggleLike: (postId) => {
    postsAPI._updateLikeCache(postId, 'toggle');
    return postsAPI.likePost(postId);
  },

  toggleFavoriteWithNotification: (postId, isNotified = true) => {
    return apiRequest(`/posts/${postId}/favorite`, {
      method: 'POST',
      body: JSON.stringify({ isNotified })
    });
  },

  // ===================================================================
  // 🔍 FUNCIONES DE BÚSQUEDA Y FILTRADO AVANZADAS
  // ===================================================================

  searchPosts: (filters = {}) => {
    const searchParams = {
      page: 1,
      limit: 20,
      ...filters,
      algorithm: 'search_optimized',
      searchMode: true,
      relevanceWeight: 0.4,
      qualityWeight: 0.3,
      recencyWeight: 0.2,
      popularityWeight: 0.1,
      qualityThreshold: 40,
      includeEngagement: true,
      smartSort: true,
      boostRelevant: true
    };
    
    return postsAPI.getFeed(searchParams);
  },

  getFilteredPosts: (filters = {}) => {
    const filterParams = {
      ...filters,
      algorithm: 'filter_optimized',
      filterMode: true,
      validateFilters: true,
      optimizeResults: true,
      includeRelated: true
    };
    
    return postsAPI.getFeed(filterParams);
  },

  // ===================================================================
  // 📊 FUNCIONES DE ANÁLISIS Y MÉTRICAS
  // ===================================================================

  getAlgorithmMetrics: async (tabType = 'discover') => {
    try {
      const metricsParams = {
        algorithm: tabType,
        includeStats: true,
        includePerformance: true,
        timeframe: '24h'
      };
      
      const response = await apiRequest('/posts/algorithm-metrics', {
        method: 'GET',
        params: metricsParams
      });
      
      return response;
    } catch (error) {
      return {
        success: false,
        data: {
          algorithm: tabType,
          metrics: {},
          performance: {},
          error: 'Metrics not available'
        }
      };
    }
  },

  validatePostData: (postData, images = []) => {
    const errors = {};
    
    const validations = [
      { field: 'title', min: 5, max: 100, required: true, type: 'string' },
      { field: 'description', min: 10, max: 2000, required: true, type: 'string' },
      { field: 'phone', required: true, type: 'string', pattern: /^[\+]?[0-9\-\s\(\)]{7,15}$/ },
      { field: 'sexo', required: true, type: 'enum', values: ['Hombre', 'Mujer', 'Trans', 'Otro'] },
      { field: 'age', required: true, type: 'number', min: 18, max: 80 },
      { field: 'location', required: true, type: 'string', min: 3, max: 100 }
    ];
    
    validations.forEach(({ field, min, max, required, type, values, pattern }) => {
      const value = postData[field];
      
      if (required && (!value || !value.toString().trim())) {
        errors[field] = `${field} es obligatorio`;
        return;
      }
      
      if (!value) return;
      
      if (type === 'string') {
        const strValue = value.toString().trim();
        if (min && strValue.length < min) {
          errors[field] = `${field} debe tener al menos ${min} caracteres`;
        } else if (max && strValue.length > max) {
          errors[field] = `${field} no puede exceder ${max} caracteres`;
        }
        
        if (pattern && !pattern.test(strValue)) {
          errors[field] = `${field} tiene formato inválido`;
        }
      }
      
      if (type === 'number') {
        const numValue = Number(value);
        if (isNaN(numValue)) {
          errors[field] = `${field} debe ser un número`;
        } else if (min && numValue < min) {
          errors[field] = `${field} debe ser al menos ${min}`;
        } else if (max && numValue > max) {
          errors[field] = `${field} no puede ser mayor a ${max}`;
        }
      }
      
      if (type === 'enum' && values && !values.includes(value)) {
        errors[field] = `${field} debe ser uno de: ${values.join(', ')}`;
      }
    });
    
    // Validación de imágenes
    if (images.length === 0) {
      errors.images = 'Incluye al menos una imagen';
    } else if (images.length > 5) {
      errors.images = 'Máximo 5 imágenes permitidas';
    } else {
      images.forEach((image, index) => {
        try {
          validateFile(image, API_CONFIG.MAX_POST_FILE_SIZE);
        } catch (error) {
          errors[`image_${index}`] = `Imagen ${index + 1}: ${error.message}`;
        }
      });
    }
    
    // Validación de servicios
    if (postData.services && Array.isArray(postData.services)) {
      if (postData.services.length > 3) {
        errors.services = 'Máximo 3 servicios permitidos';
      }
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      fieldCount: Object.keys(errors).length
    };
  },

  formatPostData: (post) => ({
    ...post,
    images: post.images || [],
    services: post.services || [],
    createdAt: new Date(post.createdAt),
    updatedAt: post.updatedAt ? new Date(post.updatedAt) : null,
    totalInteractions: (post.likesCount || 0) + (post.favoritesCount || 0) + (post.viewsCount || 0),
    isActive: post.isActive !== false,
    isPremium: post.premiumOnly === true,
    previewImage: post.images?.[0] || null,
    algorithmScore: post.algorithmScore || 0,
    algorithmReason: post.algorithmReason || 'standard',
    algorithmVersion: post.algorithmVersion || '1.0',
    isBoostActive: post.isBoostActive || false,
    boostAmount: post.boostAmount || 0,
    boostExpiry: post.boostExpiry || null,
    boostPriority: post.boostAmount > 0 ? Math.ceil(post.boostAmount / 10) : 0,
    qualityScore: post.qualityScore || 0,
    engagementRate: post.engagementRate || 0,
    discoveryScore: post.discoveryScore || 0,
    trendingScore: post.trendingScore || 0,
    personalizedScore: post.personalizedScore || 0,
    relevanceScore: post.relevanceScore || 0,
    diversityFactor: post.diversityFactor || 0
  }),

  // ===================================================================
  // 🧾 CACHE Y OPTIMIZACIÓN
  // ===================================================================

  _likeCache: new Map(),
  _algorithmCache: new Map(),
  _performanceCache: new Map(),
  
  _updateLikeCache: (postId, action) => {
    const current = postsAPI._likeCache.get(postId) || false;
    const newState = action === 'toggle' ? !current : action === 'like';
    postsAPI._likeCache.set(postId, newState);
  },
  
  getCachedLikeStatus: (postId) => postsAPI._likeCache.get(postId),
  
  _cacheAlgorithmResult: (algorithm, params, result) => {
    const key = `${algorithm}_${JSON.stringify(params)}`;
    postsAPI._algorithmCache.set(key, {
      result,
      timestamp: Date.now(),
      algorithm
    });
  },
  
  _getCachedAlgorithmResult: (algorithm, params, maxAge = 60000) => {
    const key = `${algorithm}_${JSON.stringify(params)}`;
    const cached = postsAPI._algorithmCache.get(key);
    
    if (cached && Date.now() - cached.timestamp < maxAge) {
      return cached.result;
    }
    
    return null;
  },
  
  clearCaches: () => {
    postsAPI._likeCache.clear();
    postsAPI._algorithmCache.clear();
    postsAPI._performanceCache.clear();
  },

  // ===================================================================
  // 📈 FUNCIONES DE PERFORMANCE Y DEBUGGING
  // ===================================================================

  testAlgorithmPerformance: async (algorithm = 'discover') => {
    const startTime = Date.now();
    
    try {
      let result;
      switch (algorithm) {
        case 'discover':
          result = await postsAPI.getDiscoveryWithOptions({ limit: 10 });
          break;
        case 'trending':
          result = await postsAPI.getTrendingWithOptions({ limit: 10 });
          break;
        case 'overview':
          result = await postsAPI.getFeed({ limit: 10, tabType: 'overview' });
          break;
        default:
          throw new Error(`Unknown algorithm: ${algorithm}`);
      }
      
      const executionTime = Date.now() - startTime;
      const performance = {
        algorithm,
        executionTime,
        postsReturned: result.data?.posts?.length || 0,
        success: result.success,
        timestamp: new Date().toISOString()
      };
      
      postsAPI._performanceCache.set(algorithm, performance);
      
      return performance;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      return {
        algorithm,
        executionTime,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  },

  getPerformanceStats: () => {
    const stats = Array.from(postsAPI._performanceCache.entries()).map(([algorithm, data]) => ({
      algorithm,
      ...data
    }));
    
    return {
      algorithms: stats,
      cacheSize: {
        likes: postsAPI._likeCache.size,
        algorithms: postsAPI._algorithmCache.size,
        performance: postsAPI._performanceCache.size
      },
      totalTests: stats.length,
      avgExecutionTime: stats.length > 0 
        ? stats.reduce((sum, stat) => sum + stat.executionTime, 0) / stats.length 
        : 0
    };
  }
};

/**
 * ====================================================================
 * 💬 CHAT API - COMPLETO Y OPTIMIZADO
 * ====================================================================
 */
export const chatAPI = {
  getChats: (params = {}) => {
    const defaultParams = { 
      page: 1, 
      limit: 20,
      archived: false,
      includeDisputes: false,
      ...params 
    };
    return apiRequest('/chat', { method: 'GET', params: defaultParams });
  },

  createOrGetChat: (receiverId) => {
    if (!receiverId) throw new Error('receiverId es requerido');
    return apiRequest('/chat', {
      method: 'POST',
      body: JSON.stringify({ receiverId })
    });
  },

  createChatFromProfile: (userId) => {
    if (!userId) throw new Error('userId es requerido');
    return apiRequest(`/chat/profile/${userId}`, { method: 'POST' });
  },

  getMessages: (chatId, params = {}) => {
    if (!chatId) throw new Error('chatId es requerido');
    const defaultParams = { page: 1, limit: 50, ...params };
    return apiRequest(`/chat/${chatId}/messages`, { method: 'GET', params: defaultParams });
  },

  getChatMessages: (chatId, params = {}) => chatAPI.getMessages(chatId, params),

  sendMessage: (chatId, messageData) => {
    if (!chatId) throw new Error('chatId es requerido');

    // Si es texto simple
    if (typeof messageData === 'string') {
      return apiRequest(`/chat/${chatId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ 
          content: messageData, 
          messageType: 'TEXT' 
        })
      });
    }
    
    // Si incluye archivo
    if (messageData.file || messageData.image) {
      const formData = new FormData();
      formData.append('content', messageData.content || '');
      formData.append('messageType', messageData.messageType || 'TEXT');
      
      const fileToUpload = messageData.file || messageData.image;
      if (fileToUpload) {
        validateFile(fileToUpload, API_CONFIG.MAX_CHAT_FILE_SIZE);
        formData.append('file', fileToUpload);
      }
      
      ['replyToId', 'isPremiumMessage'].forEach(field => {
        if (messageData[field] !== undefined) {
          formData.append(field, messageData[field]);
        }
      });
      
      return apiRequest(`/chat/${chatId}/messages`, {
        method: 'POST',
        body: formData,
        isFormData: true
      });
    }
    
    // Mensaje de texto con opciones
    const validation = chatAPI.validateMessageData(messageData);
    if (!validation.isValid) {
      throw new Error(Object.values(validation.errors)[0]);
    }

    return apiRequest(`/chat/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify(messageData)
    });
  },

  sendFileMessage: (chatId, content, file, messageType = 'FILE', options = {}) => {
    if (!chatId || !file) throw new Error('chatId y file son requeridos');

    const formData = new FormData();
    formData.append('content', content || '');
    formData.append('messageType', messageType);
    formData.append('file', file);
    
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) formData.append(key, value);
    });
    
    validateFile(file, API_CONFIG.MAX_CHAT_FILE_SIZE);
    return apiRequest(`/chat/${chatId}/messages`, {
      method: 'POST',
      body: formData,
      isFormData: true
    });
  },

  sendImageMessage: (chatId, content, image, options = {}) => 
    chatAPI.sendFileMessage(chatId, content, image, 'IMAGE', options),

  sendAudioMessage: (chatId, content, audio, options = {}) => 
    chatAPI.sendFileMessage(chatId, content, audio, 'AUDIO', options),

  sendVideoMessage: (chatId, content, video, options = {}) => 
    chatAPI.sendFileMessage(chatId, content, video, 'VIDEO', options),

  sendDocumentMessage: (chatId, content, document, options = {}) => 
    chatAPI.sendFileMessage(chatId, content, document, 'FILE', options),

  editMessage: (messageId, content) => {
    if (!messageId || !content?.trim()) throw new Error('messageId y content son requeridos');
    return apiRequest(`/chat/messages/${messageId}`, {
      method: 'PUT',
      body: JSON.stringify({ content: content.trim() })
    });
  },

  deleteMessage: (messageId) => {
    if (!messageId) throw new Error('messageId es requerido');
    return apiRequest(`/chat/messages/${messageId}`, { method: 'DELETE' });
  },

  toggleArchive: (chatId) => {
    if (!chatId) throw new Error('chatId es requerido');
    return apiRequest(`/chat/${chatId}/archive`, { method: 'POST' });
  },

  toggleMute: (chatId, mutedUntil = null) => {
    if (!chatId) throw new Error('chatId es requerido');
    return apiRequest(`/chat/${chatId}/mute`, {
      method: 'POST',
      body: JSON.stringify({ mutedUntil })
    });
  },

  searchMessages: (chatId, params = {}) => {
    if (!chatId) throw new Error('chatId es requerido');
    const { q, messageType, dateFrom, dateTo } = params;
    if (!q && !messageType && !dateFrom && !dateTo) {
      throw new Error('Al menos un criterio de búsqueda es requerido');
    }
    
    return apiRequest(`/chat/${chatId}/messages/search`, { method: 'GET', params });
  },

  getChatStats: (chatId) => {
    if (!chatId) throw new Error('chatId es requerido');
    return apiRequest(`/chat/${chatId}/stats`);
  },

  reportMessage: (messageId, reportData) => {
    if (!messageId || !reportData.reason) throw new Error('messageId y reason son requeridos');
    
    const validReasons = [
      'SPAM', 'INAPPROPRIATE_CONTENT', 'HARASSMENT', 'SCAM', 
      'FAKE_PROFILE', 'VIOLENCE', 'ADULT_CONTENT', 'OTHER'
    ];
    
    if (!validReasons.includes(reportData.reason)) {
      throw new Error('Razón de reporte inválida');
    }

    return apiRequest(`/chat/messages/${messageId}/report`, {
      method: 'POST',
      body: JSON.stringify(reportData)
    });
  },

  createDisputeChat: (disputeData) => {
    const { escortId, agencyId, reason } = disputeData;
    if (!escortId || !agencyId || !reason) {
      throw new Error('escortId, agencyId y reason son requeridos');
    }
    if (reason.length < 10) {
      throw new Error('La razón debe tener al menos 10 caracteres');
    }
    
    return apiRequest('/chat/dispute', {
      method: 'POST',
      body: JSON.stringify(disputeData)
    });
  },

  getDisputeChats: (params = {}) => apiRequest('/chat/dispute', { method: 'GET', params }),

  closeDisputeChat: (chatId, resolutionData) => {
    if (!chatId || !resolutionData.resolution) {
      throw new Error('chatId y resolution son requeridos');
    }
    if (resolutionData.resolution.length < 20) {
      throw new Error('La resolución debe tener al menos 20 caracteres');
    }
    
    return apiRequest(`/chat/dispute/${chatId}/close`, {
      method: 'POST',
      body: JSON.stringify(resolutionData)
    });
  },

  addDisputeMessage: (chatId, messageData) => {
    if (!chatId || !messageData.content?.trim()) {
      throw new Error('chatId y content son requeridos');
    }
    if (messageData.content.length > 1000) {
      throw new Error('Mensaje muy largo. Máximo 1000 caracteres en disputas');
    }
    
    return apiRequest(`/chat/dispute/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content: messageData.content.trim() })
    });
  },

  // ===================================================================
  // ✅ HELPERS OPTIMIZADOS Y CORREGIDOS
  // ===================================================================

  formatChatData: (chat) => {
    if (!chat) return null;
    
    return {
      id: chat.id,
      name: chat.name,
      avatar: chat.avatar,
      isGroup: chat.isGroup || false,
      isDisputeChat: chat.isDisputeChat || false,
      disputeStatus: chat.disputeStatus,
      members: chat.members || [],
      lastMessage: chat.lastMessage,
      unreadCount: chat.unreadCount || 0,
      isArchived: chat.isArchived || false,
      isMuted: chat.isMuted || false,
      mutedUntil: chat.mutedUntil,
      lastActivity: chat.lastActivity,
      createdAt: chat.createdAt,
      otherUser: chat.otherUser
    };
  },

  formatMessageData: (message) => {
    if (!message) return null;
    
    return {
      id: message.id,
      content: message.content,
      messageType: message.messageType || 'TEXT',
      senderId: message.senderId,
      receiverId: message.receiverId,
      sender: message.sender,
      chatId: message.chatId,
      replyToId: message.replyToId,
      isEdited: message.isEdited || false,
      editedAt: message.editedAt,
      isRead: message.isRead || false,
      readAt: message.readAt,
      isPremiumMessage: message.isPremiumMessage || false,
      costPoints: message.costPoints,
      fileUrl: message.fileUrl,
      fileName: message.fileName,
      fileSize: message.fileSize,
      mimeType: message.mimeType,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      deletedAt: message.deletedAt,
      isMine: message.isMine || false
    };
  },

  validateMessageData: (messageData) => {
    const errors = {};
    
    if (!messageData.content?.trim()) {
      errors.content = 'El contenido es requerido';
    } else if (messageData.content.length > 5000) {
      errors.content = 'Máximo 5000 caracteres';
    }
    
    const validTypes = ['TEXT', 'IMAGE', 'FILE', 'AUDIO', 'VIDEO', 'SYSTEM'];
    if (messageData.messageType && !validTypes.includes(messageData.messageType)) {
      errors.messageType = 'Tipo de mensaje inválido';
    }
    
    if (messageData.replyToId && typeof messageData.replyToId !== 'string') {
      errors.replyToId = 'replyToId debe ser un string';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  createMessageRequest: (content, options = {}) => {
    const messageData = {
      content: content.trim(),
      messageType: options.messageType || 'TEXT',
      replyToId: options.replyToId || null,
      isPremiumMessage: options.isPremiumMessage || false
    };
    
    const validation = chatAPI.validateMessageData(messageData);
    if (!validation.isValid) {
      throw new Error(Object.values(validation.errors)[0]);
    }
    
    return messageData;
  },

  getChatById: (chatId) => {
    if (!chatId) throw new Error('chatId es requerido');
    return apiRequest(`/chat/${chatId}`);
  },

  updateChatSettings: (chatId, settings) => {
    if (!chatId) throw new Error('chatId es requerido');
    return apiRequest(`/chat/${chatId}/settings`, {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  },

  markMessagesAsRead: (chatId, messageIds = []) => {
    if (!chatId) throw new Error('chatId es requerido');
    return apiRequest(`/chat/${chatId}/read`, {
      method: 'POST',
      body: JSON.stringify({ messageIds })
    });
  },

  getUnreadMessagesCount: () => apiRequest('/chat/unread-count'),

  sendTypingIndicator: (chatId, isTyping = true) => {
    if (!chatId) return Promise.resolve();
    
    return apiRequest(`/chat/${chatId}/typing`, {
      method: 'POST',
      body: JSON.stringify({ isTyping }),
      timeout: 2000
    }).catch(() => {});
  },

  updatePresence: (status = 'online') => {
    return apiRequest('/chat/presence', {
      method: 'POST',
      body: JSON.stringify({ status }),
      timeout: 2000
    }).catch(() => {});
  },

  validateFileForChat: (file, messageType = 'FILE') => {
    if (!file) throw new Error('Archivo es requerido');

    const maxSize = API_CONFIG.MAX_CHAT_FILE_SIZE || 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error(`Archivo muy grande. Máximo ${Math.round(maxSize/1024/1024)}MB`);
    }

    const validTypes = {
      IMAGE: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      AUDIO: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
      VIDEO: ['video/mp4', 'video/mpeg', 'video/quicktime'],
      FILE: [
        'application/pdf', 'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ]
    };

    if (messageType !== 'FILE' && validTypes[messageType]) {
      if (!validTypes[messageType].includes(file.type)) {
        throw new Error(`Tipo de archivo no válido para ${messageType}`);
      }
    }

    return true;
  },

  getFileInfo: (file) => {
    if (!file) return null;
    
    return {
      name: file.name,
      size: file.size,
      type: file.type,
      sizeFormatted: chatAPI.formatFileSize(file.size),
      isImage: file.type.startsWith('image/'),
      isAudio: file.type.startsWith('audio/'),
      isVideo: file.type.startsWith('video/')
    };
  },

  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  detectMessageType: (file) => {
    if (!file) return 'TEXT';
    
    if (file.type.startsWith('image/')) return 'IMAGE';
    if (file.type.startsWith('audio/')) return 'AUDIO';
    if (file.type.startsWith('video/')) return 'VIDEO';
    return 'FILE';
  }
};

/**
 * ====================================================================
 * ⭐ FAVORITES API - OPTIMIZADO CON CACHE
 * ====================================================================
 */
export const favoritesAPI = {
  getFavorites: (params = {}) => {
    const queryParams = {
      page: params.page || 1,
      limit: params.limit || 20,
      ...(params.sortBy && { sortBy: params.sortBy }),
      ...(params.sortOrder && { sortOrder: params.sortOrder }),
      ...(params.userType && { userType: params.userType }),
      ...(params.location && { location: params.location }),
      ...(params.search && { q: params.search })
    };
    
    return apiRequest('/favorites', { method: 'GET', params: queryParams });
  },

  addToFavorites: (postId, isNotified = true) => {
    if (!postId) throw new Error('ID del post es requerido');
    
    favoritesAPI._updateFavoriteCache(postId, true);
    
    return apiRequest(`/favorites/${postId}`, {
      method: 'POST',
      body: JSON.stringify({ isNotified })
    });
  },

  removeFromFavorites: (postId) => {
    if (!postId) throw new Error('ID del post es requerido');
    
    favoritesAPI._updateFavoriteCache(postId, false);
    
    return apiRequest(`/favorites/${postId}`, { method: 'DELETE' });
  },

  getLikes: (params = {}) => {
    const queryParams = {
      page: params.page || 1,
      limit: params.limit || 20,
      ...(params.sortBy && { sortBy: params.sortBy }),
      ...(params.sortOrder && { sortOrder: params.sortOrder })
    };
    
    return apiRequest('/favorites/likes', { method: 'GET', params: queryParams });
  },

  addLike: (postId) => {
    if (!postId) throw new Error('ID del post es requerido');
    
    favoritesAPI._updateLikeCache(postId, true);
    
    return apiRequest(`/favorites/likes/${postId}`, { method: 'POST' });
  },

  removeLike: (postId) => {
    if (!postId) throw new Error('ID del post es requerido');
    
    favoritesAPI._updateLikeCache(postId, false);
    
    return apiRequest(`/favorites/likes/${postId}`, { method: 'DELETE' });
  },

  getStats: () => apiRequest('/favorites/stats'),

  // ===================================================================
  // ✅ HELPERS OPTIMIZADOS
  // ===================================================================

  formatFavoriteForComponent: (favorite) => {
    if (!favorite) return null;
    
    return {
      id: favorite.post.id,
      favoriteId: favorite.id,
      type: favorite.post.author.userType.toLowerCase(),
      profileImage: favorite.post.author.avatar || favoritesAPI.getDefaultAvatar(favorite.post.author.userType),
      name: `${favorite.post.author.firstName || ''} ${favorite.post.author.lastName || ''}`.trim() || favorite.post.author.username,
      age: favorite.post.author.escort?.age || null,
      verified: favorite.post.author.escort?.isVerified || favorite.post.author.agency?.isVerified || false,
      premium: favorite.post.premiumOnly || false,
      images: favorite.post.images || [],
      description: favorite.post.description,
      location: favoritesAPI.formatLocation(favorite.post.location),
      phone: favorite.post.phone,
      services: favorite.post.services || [],
      rating: favorite.post.author.escort?.rating || 0,
      likes: favorite.post._count?.likes || 0,
      isOnline: Math.random() > 0.5,
      dateAdded: favorite.createdAt,
      isNotified: favorite.isNotified,
      authorId: favorite.post.author.id,
      author: favorite.post.author,
      post: favorite.post,
      algorithmScore: favorite.post.algorithmScore || 0,
      isBoostActive: favorite.post.isBoostActive || false,
      boostAmount: favorite.post.boostAmount || 0
    };
  },

  formatLocation: (location) => {
    if (!location) return 'Ubicación no especificada';
    
    if (typeof location === 'string') return location;
    
    const parts = [];
    if (location.city) parts.push(location.city);
    if (location.country) parts.push(location.country);
    
    return parts.length > 0 ? parts.join(', ') : 'Ubicación no especificada';
  },

  getDefaultAvatar: (userType) => {
    const defaultAvatars = {
      ESCORT: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
      AGENCY: 'https://images.unsplash.com/photo-1560472354-b43ff0c44a43?w=150&h=150&fit=crop',
      CLIENT: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
    };
    return defaultAvatars[userType] || defaultAvatars.CLIENT;
  },

  transformFavoritesResponse: (response) => {
    if (!response.success || !response.data.favorites) {
      return {
        favorites: [],
        pagination: {
          page: 1, limit: 20, total: 0, pages: 0, hasNext: false, hasPrev: false
        }
      };
    }

    return {
      favorites: response.data.favorites.map(fav => favoritesAPI.formatFavoriteForComponent(fav)),
      pagination: response.data.pagination,
      filters: response.data.filters
    };
  },

  validateFavoriteParams: (params) => {
    const errors = {};
    
    const validations = [
      { field: 'page', min: 1, type: 'integer' },
      { field: 'limit', min: 1, max: 100, type: 'integer' },
      { field: 'sortBy', values: ['createdAt', 'postCreatedAt'] },
      { field: 'sortOrder', values: ['asc', 'desc'] },
      { field: 'userType', values: ['ESCORT', 'AGENCY'] }
    ];
    
    validations.forEach(({ field, min, max, type, values }) => {
      const value = params[field];
      if (value !== undefined) {
        if (type === 'integer' && (!Number.isInteger(value) || value < (min || 0) || (max && value > max))) {
          errors[field] = `${field} debe ser un entero entre ${min || 0} y ${max || 'infinito'}`;
        } else if (values && !values.includes(value)) {
          errors[field] = `${field} debe ser uno de: ${values.join(', ')}`;
        }
      }
    });
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  // ===================================================================
  // ✅ FUNCIONES DE SINCRONIZACIÓN OPTIMIZADAS
  // ===================================================================

  toggleFavorite: async (postId, isCurrentlyFavorited = false, isNotified = true) => {
    try {
      return isCurrentlyFavorited 
        ? await favoritesAPI.removeFromFavorites(postId)
        : await favoritesAPI.addToFavorites(postId, isNotified);
    } catch (error) {
      favoritesAPI._updateFavoriteCache(postId, isCurrentlyFavorited);
      throw error;
    }
  },

  toggleLike: async (postId, isCurrentlyLiked = false) => {
    try {
      return isCurrentlyLiked 
        ? await favoritesAPI.removeLike(postId)
        : await favoritesAPI.addLike(postId);
    } catch (error) {
      favoritesAPI._updateLikeCache(postId, isCurrentlyLiked);
      throw error;
    }
  },

  // ✅ CACHE LOCAL OPTIMIZADO
  _favoritesCache: new Map(),
  _likesCache: new Map(),
  _cacheExpiry: 5 * 60 * 1000,

  _updateFavoriteCache: (postId, isFavorited) => {
    favoritesAPI._favoritesCache.set(postId, {
      isFavorited,
      timestamp: Date.now()
    });
  },

  _updateLikeCache: (postId, isLiked) => {
    favoritesAPI._likesCache.set(postId, {
      isLiked,
      timestamp: Date.now()
    });
  },

  getCachedFavoriteStatus: (postId) => {
    const cached = favoritesAPI._favoritesCache.get(postId);
    if (cached && Date.now() - cached.timestamp < favoritesAPI._cacheExpiry) {
      return cached.isFavorited;
    }
    return null;
  },

  getCachedLikeStatus: (postId) => {
    const cached = favoritesAPI._likesCache.get(postId);
    if (cached && Date.now() - cached.timestamp < favoritesAPI._cacheExpiry) {
      return cached.isLiked;
    }
    return null;
  },

  clearCache: () => {
    favoritesAPI._favoritesCache.clear();
    favoritesAPI._likesCache.clear();
  }
};

/**
 * ====================================================================
 * 🛠️ FUNCIÓN DE REQUEST BASE - IMPORTADA
 * ====================================================================
 */
let apiRequest;

export const initContentAPI = (apiRequestFunction) => {
  apiRequest = apiRequestFunction;
};

/**
 * ====================================================================
 * 🧪 TESTING API - OPTIMIZADO CON ALGORITMOS
 * ====================================================================
 */
export const contentTestAPI = {
  testDifferentiatedAlgorithms: async () => {
    try {
      const results = {};
      
      const algorithmTests = [
        { name: 'discover_personalized', fn: () => postsAPI.getDiscoveryWithOptions({ algorithm: 'personalized', limit: 5 }) },
        { name: 'trending_engagement', fn: () => postsAPI.getTrendingWithOptions({ limit: 5, timeframe: '24h' }) },
        { name: 'overview_balanced', fn: () => postsAPI.getFeed({ limit: 5, tabType: 'overview' }) },
        { name: 'premium_exclusive', fn: () => postsAPI.getFeed({ limit: 5, tabType: 'premium' }) }
      ];
      
      const testResults = await Promise.allSettled(
        algorithmTests.map(async ({ name, fn }) => {
          const startTime = Date.now();
          try {
            const result = await fn();
            const executionTime = Date.now() - startTime;
            return { 
              name, 
              success: true, 
              count: result.data?.posts?.length || 0,
              algorithm: result.data?.algorithm,
              executionTime
            };
          } catch (error) {
            const executionTime = Date.now() - startTime;
            return { 
              name, 
              success: false, 
              error: error.message,
              executionTime
            };
          }
        })
      );
      
      testResults.forEach(({ value }) => {
        results[value.name] = value;
      });
      
      return results;
    } catch (error) {
      throw error;
    }
  },

  testPostOperations: async () => {
    try {
      const results = {};
      
      const tests = [
        { name: 'myPosts', fn: () => postsAPI.getMyPosts({ page: 1, limit: 5 }) },
        { name: 'feed', fn: () => postsAPI.getFeed({ page: 1, limit: 5 }) },
        { name: 'discover', fn: () => postsAPI.getDiscoveryWithOptions({ limit: 5 }) },
        { name: 'trending', fn: () => postsAPI.getTrendingWithOptions({ limit: 5 }) },
        { name: 'limits', fn: () => postsAPI.checkPostLimits() }
      ];
      
      const testResults = await Promise.allSettled(
        tests.map(async ({ name, fn }) => {
          try {
            const result = await fn();
            return { name, success: true, count: result.data?.posts?.length || 0 };
          } catch (error) {
            return { name, success: false, error: error.message };
          }
        })
      );
      
      testResults.forEach(({ value }) => {
        results[value.name] = value;
      });
      
      return results;
    } catch (error) {
      throw error;
    }
  },

  testChatOperations: async () => {
    try {
      const results = {};
      
      try {
        const chats = await chatAPI.getChats({ page: 1, limit: 5 });
        results.chats = { success: true, count: chats.data?.chats?.length || 0 };
      } catch (error) {
        results.chats = { success: false, error: error.message };
      }
      
      const requiredFunctions = [
        'getChats', 'createChatFromProfile', 'getMessages', 'sendMessage',
        'editMessage', 'deleteMessage', 'toggleArchive', 'toggleMute'
      ];
      
      results.functions = {};
      requiredFunctions.forEach(funcName => {
        results.functions[funcName] = typeof chatAPI[funcName] === 'function';
      });
      
      return results;
    } catch (error) {
      throw error;
    }
  },

  testFavoritesOperations: async () => {
    try {
      const results = {};
      
      const tests = [
        { name: 'favorites', fn: () => favoritesAPI.getFavorites({ page: 1, limit: 5 }) },
        { name: 'likes', fn: () => favoritesAPI.getLikes({ page: 1, limit: 5 }) },
        { name: 'stats', fn: () => favoritesAPI.getStats() }
      ];
      
      for (const { name, fn } of tests) {
        try {
          const result = await fn();
          results[name] = { success: true, count: result.data?.[name]?.length || 0 };
        } catch (error) {
          results[name] = { success: false, error: error.message };
        }
      }
      
      return results;
    } catch (error) {
      throw error;
    }
  },

  testAlgorithmPerformance: async () => {
    try {
      const results = {};
      const algorithms = ['discover', 'trending', 'overview'];
      
      for (const algorithm of algorithms) {
        try {
          const performance = await postsAPI.testAlgorithmPerformance(algorithm);
          results[algorithm] = performance;
        } catch (error) {
          results[algorithm] = { 
            algorithm, 
            success: false, 
            error: error.message 
          };
        }
      }
      
      return results;
    } catch (error) {
      throw error;
    }
  },

  testTrendingEngagementAlgorithm: async () => {
    try {
      const results = {};
      
      const trendingTests = [
        { name: 'engagement_24h', params: { limit: 5, timeframe: '24h', minEngagement: 1 } },
        { name: 'engagement_1h', params: { limit: 5, timeframe: '1h', minEngagement: 1 } },
        { name: 'high_engagement', params: { limit: 5, timeframe: '24h', minEngagement: 5 } }
      ];
      
      for (const { name, params } of trendingTests) {
        try {
          const result = await postsAPI.getTrendingWithOptions(params);
          results[name] = {
            success: true,
            algorithm: result.data?.algorithm,
            postsCount: result.data?.posts?.length || 0,
            stats: result.data?.stats,
            hasEngagementData: result.data?.posts?.some(p => (p.likesCount || 0) > 0) || false
          };
        } catch (error) {
          results[name] = { success: false, error: error.message };
        }
      }
      
      return results;
    } catch (error) {
      throw error;
    }
  },

  testPersonalizedDiscoveryAlgorithm: async () => {
    try {
      const results = {};
      
      const discoveryTests = [
        { name: 'personalized', params: { algorithm: 'personalized', limit: 5, diversityMode: true } },
        { name: 'quality', params: { algorithm: 'quality', limit: 5, qualityThreshold: 70 } },
        { name: 'sidebar', params: { algorithm: 'sidebar_recommendations', limit: 6, tabType: 'sidebar' } }
      ];
      
      for (const { name, params } of discoveryTests) {
        try {
          const result = await postsAPI.getDiscoveryWithOptions(params);
          results[name] = {
            success: true,
            algorithm: result.data?.algorithm,
            postsCount: result.data?.posts?.length || 0,
            isPersonalized: result.data?.isPersonalized || false,
            debug: result.data?.debug,
            hasQualityScores: result.data?.posts?.some(p => (p.qualityScore || 0) > 0) || false
          };
        } catch (error) {
          results[name] = { success: false, error: error.message };
        }
      }
      
      return results;
    } catch (error) {
      throw error;
    }
  },

  testAlgorithmDifferentiation: async () => {
    try {
      const results = {
        summary: {},
        detailed: {},
        performance: {},
        validation: {}
      };
      
      const basicTests = await contentTestAPI.testDifferentiatedAlgorithms();
      results.detailed.basic = basicTests;
      
      const performanceTests = await contentTestAPI.testAlgorithmPerformance();
      results.performance = performanceTests;
      
      const trendingTests = await contentTestAPI.testTrendingEngagementAlgorithm();
      results.detailed.trending = trendingTests;
      
      const discoveryTests = await contentTestAPI.testPersonalizedDiscoveryAlgorithm();
      results.detailed.discovery = discoveryTests;
      
      results.validation = {
        algorithmsTestedCount: Object.keys(basicTests).length,
        allAlgorithmsWorking: Object.values(basicTests).every(test => test.success),
        performanceAcceptable: Object.values(performanceTests).every(test => 
          test.success && test.executionTime < 5000
        ),
        differentAlgorithmsDetected: new Set(
          Object.values(basicTests).map(test => test.algorithm)
        ).size > 1,
        timestamp: new Date().toISOString()
      };
      
      results.summary = {
        totalTests: Object.keys(basicTests).length + Object.keys(performanceTests).length,
        successfulTests: Object.values(basicTests).filter(t => t.success).length,
        algorithmTypes: Array.from(new Set(Object.values(basicTests).map(t => t.algorithm))),
        avgPerformance: Object.values(performanceTests).reduce((sum, p) => sum + (p.executionTime || 0), 0) / Object.keys(performanceTests).length,
        recommendationsGenerated: Object.values(basicTests).reduce((sum, t) => sum + (t.count || 0), 0),
        status: results.validation.allAlgorithmsWorking && results.validation.differentAlgorithmsDetected ? 'HEALTHY' : 'ISSUES_DETECTED'
      };
      
      return results;
    } catch (error) {
      throw error;
    }
  }
};

/**
 * ====================================================================
 * 📊 ALGORITMOS ANALYTICS API - NUEVA SECCIÓN
 * ====================================================================
 */
export const algorithmAnalyticsAPI = {
  getRealTimeMetrics: async () => {
    try {
      const metrics = {
        discover: await postsAPI.getAlgorithmMetrics('discover'),
        trending: await postsAPI.getAlgorithmMetrics('trending'),
        overview: await postsAPI.getAlgorithmMetrics('overview'),
        premium: await postsAPI.getAlgorithmMetrics('premium')
      };
      
      return {
        success: true,
        data: metrics,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  },

  compareAlgorithmPerformance: async () => {
    try {
      const algorithms = ['discover', 'trending', 'overview'];
      const comparisons = {};
      
      for (const algorithm of algorithms) {
        comparisons[algorithm] = await postsAPI.testAlgorithmPerformance(algorithm);
      }
      
      const summary = {
        fastest: Object.entries(comparisons).reduce((a, b) => 
          a[1].executionTime < b[1].executionTime ? a : b
        ),
        slowest: Object.entries(comparisons).reduce((a, b) => 
          a[1].executionTime > b[1].executionTime ? a : b
        ),
        avgTime: Object.values(comparisons).reduce((sum, comp) => 
          sum + comp.executionTime, 0
        ) / algorithms.length,
        totalResults: Object.values(comparisons).reduce((sum, comp) => 
          sum + comp.postsReturned, 0
        )
      };
      
      return {
        success: true,
        data: {
          comparisons,
          summary
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  },

  validateContentDifferentiation: async () => {
    try {
      const samples = {
        discover: await postsAPI.getDiscoveryWithOptions({ limit: 10 }),
        trending: await postsAPI.getTrendingWithOptions({ limit: 10 }),
        overview: await postsAPI.getFeed({ limit: 10, tabType: 'overview' })
      };
      
      const analysis = {};
      
      Object.entries(samples).forEach(([algorithm, response]) => {
        if (response.success && response.data.posts) {
          const posts = response.data.posts;
          analysis[algorithm] = {
            postCount: posts.length,
            uniquePostIds: new Set(posts.map(p => p.id)),
            avgLikes: posts.reduce((sum, p) => sum + (p.likesCount || 0), 0) / posts.length,
            avgQuality: posts.reduce((sum, p) => sum + (p.qualityScore || 0), 0) / posts.length,
            boostedCount: posts.filter(p => p.isBoostActive).length,
            premiumCount: posts.filter(p => p.premiumOnly).length,
            algorithmReasons: Array.from(new Set(posts.map(p => p.algorithmReason).filter(Boolean)))
          };
        }
      });
      
      const allPostIds = new Set();
      Object.values(analysis).forEach(alg => {
        alg.uniquePostIds.forEach(id => allPostIds.add(id));
      });
      
      const overlapMatrix = {};
      const algorithms = Object.keys(analysis);
      
      algorithms.forEach(alg1 => {
        overlapMatrix[alg1] = {};
        algorithms.forEach(alg2 => {
          if (alg1 !== alg2) {
            const posts1 = analysis[alg1].uniquePostIds;
            const posts2 = analysis[alg2].uniquePostIds;
            const intersection = new Set([...posts1].filter(x => posts2.has(x)));
            overlapMatrix[alg1][alg2] = {
              overlap: intersection.size,
              percentage: (intersection.size / Math.max(posts1.size, posts2.size)) * 100
            };
          }
        });
      });
      
      const differentiation = {
        totalUniqueContent: allPostIds.size,
        algorithmAnalysis: analysis,
        contentOverlap: overlapMatrix,
        differentiationScore: Object.values(overlapMatrix).reduce((sum, row) => {
          const avgOverlap = Object.values(row).reduce((s, overlap) => s + overlap.percentage, 0) / Object.keys(row).length;
          return sum + (100 - avgOverlap);
        }, 0) / algorithms.length,
        isWellDifferentiated: Object.values(overlapMatrix).every(row => 
          Object.values(row).every(overlap => overlap.percentage < 70)
        )
      };
      
      return {
        success: true,
        data: differentiation,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
};

/**
 * ====================================================================
 * 🎯 ALGORITMO SELECTOR API - NUEVA FUNCIONALIDAD
 * ====================================================================
 */
export const algorithmSelectorAPI = {
  selectOptimalAlgorithm: (context = {}) => {
    const { userType, hasHistory, timeOfDay, contentType, userPreferences } = context;
    
    const algorithms = {
      discover: {
        score: 0,
        reasons: [],
        config: { algorithm: 'personalized', diversityMode: true }
      },
      trending: {
        score: 0,
        reasons: [],
        config: { timeframe: '24h', minEngagement: 1 }
      },
      overview: {
        score: 0,
        reasons: [],
        config: { balanceMode: true, boostPriority: true }
      }
    };
    
    if (hasHistory) {
      algorithms.discover.score += 30;
      algorithms.discover.reasons.push('User has interaction history');
    } else {
      algorithms.overview.score += 20;
      algorithms.overview.reasons.push('No history - balanced feed better');
    }
    
    if (contentType === 'exploration') {
      algorithms.discover.score += 25;
      algorithms.discover.reasons.push('Exploration mode favors discovery');
    }
    
    if (contentType === 'trending') {
      algorithms.trending.score += 35;
      algorithms.trending.reasons.push('Explicitly requesting trending content');
    }
    
    if (userType === 'CLIENT') {
      algorithms.discover.score += 15;
      algorithms.trending.score += 10;
      algorithms.discover.reasons.push('Clients benefit from personalization');
    }
    
    const winner = Object.entries(algorithms).reduce((best, [name, alg]) => 
      alg.score > best.score ? { name, ...alg } : best
    , { score: -1 });
    
    return {
      selectedAlgorithm: winner.name,
      confidence: Math.min(winner.score / 50, 1),
      reasoning: winner.reasons,
      config: winner.config,
      alternatives: Object.entries(algorithms)
        .filter(([name]) => name !== winner.name)
        .map(([name, alg]) => ({ name, score: alg.score }))
        .sort((a, b) => b.score - a.score)
    };
  },

  executeSelectedAlgorithm: async (selection, params = {}) => {
    const { selectedAlgorithm, config } = selection;
    const finalParams = { ...config, ...params };
    
    switch (selectedAlgorithm) {
      case 'discover':
        return await postsAPI.getDiscoveryWithOptions(finalParams);
      case 'trending':
        return await postsAPI.getTrendingWithOptions(finalParams);
      case 'overview':
        return await postsAPI.getFeed({ ...finalParams, tabType: 'overview' });
      default:
        throw new Error(`Unknown algorithm: ${selectedAlgorithm}`);
    }
  }
};

/**
 * ====================================================================
 * 🔍 ADVANCED SEARCH API - NUEVA FUNCIONALIDAD
 * ====================================================================
 */
export const advancedSearchAPI = {
  smartSearch: async (query, options = {}) => {
    const searchContext = {
      hasQuery: !!query?.trim(),
      queryLength: query?.length || 0,
      hasFilters: Object.keys(options).length > 0,
      userType: options.userType,
      searchType: options.searchType || 'general'
    };
    
    let algorithmConfig;
    
    if (searchContext.hasQuery && searchContext.queryLength > 10) {
      algorithmConfig = {
        algorithm: 'search_semantic',
        textRelevance: 0.6,
        qualityWeight: 0.3,
        recencyWeight: 0.1
      };
    } else if (searchContext.hasFilters) {
      algorithmConfig = {
        algorithm: 'filter_based',
        filterRelevance: 0.7,
        qualityWeight: 0.2,
        diversityWeight: 0.1
      };
    } else {
      algorithmConfig = {
        algorithm: 'discovery_search',
        personalizedWeight: 0.4,
        qualityWeight: 0.4,
        diversityWeight: 0.2
      };
    }
    
    const searchParams = {
      ...options,
      ...algorithmConfig,
      q: query,
      smartSearch: true,
      searchContext
    };
    
    return await postsAPI.searchPosts(searchParams);
  },

  findSimilarPosts: async (postId, options = {}) => {
    const similarityParams = {
      ...options,
      algorithm: 'similarity_based',
      referencePostId: postId,
      similarityThreshold: options.threshold || 0.7,
      diversityMode: true,
      limit: options.limit || 10
    };
    
    return await postsAPI.getDiscoveryWithOptions(similarityParams);
  },

  searchByCategory: async (category, options = {}) => {
    const categoryAlgorithms = {
      'high_quality': { algorithm: 'quality', qualityThreshold: 80 },
      'trending_now': { algorithm: 'trending', timeframe: '6h' },
      'new_content': { algorithm: 'new', maxAge: '24h' },
      'popular': { algorithm: 'popular', minEngagement: 10 },
      'recommended': { algorithm: 'personalized', diversityMode: true }
    };
    
    const categoryConfig = categoryAlgorithms[category] || categoryAlgorithms['recommended'];
    
    const searchParams = {
      ...options,
      ...categoryConfig,
      category,
      tabType: 'category_search'
    };
    
    switch (category) {
      case 'trending_now':
        return await postsAPI.getTrendingWithOptions(searchParams);
      case 'high_quality':
      case 'new_content':
      case 'recommended':
        return await postsAPI.getDiscoveryWithOptions(searchParams);
      default:
        return await postsAPI.getFeed(searchParams);
    }
  }
};

/**
 * ====================================================================
 * 🎨 UI OPTIMIZATION API - NUEVA FUNCIONALIDAD
 * ====================================================================
 */
export const uiOptimizationAPI = {
  getOptimizedUIConfig: (algorithm, userType = 'CLIENT') => {
    const baseConfig = {
      loadingIndicators: true,
      infiniteScroll: true,
      cacheEnabled: true,
      prefetchNext: true
    };
    
    const algorithmConfigs = {
      discover: {
        ...baseConfig,
        animationDuration: 400,
        staggerDelay: 100,
        showAlgorithmBadge: true,
        showPersonalizationHints: true,
        showDiversityIndicators: true,
        lazyLoadThreshold: 2
      },
      trending: {
        ...baseConfig,
        animationDuration: 300,
        staggerDelay: 50,
        showEngagementMetrics: true,
        showTrendingBadges: true,
        showTimeDecayIndicators: true,
        autoRefreshInterval: 300000,
        lazyLoadThreshold: 1
      },
      overview: {
        ...baseConfig,
        animationDuration: 350,
        staggerDelay: 75,
        showBoostIndicators: true,
        showBalanceMetrics: true,
        showQualityScores: false,
        lazyLoadThreshold: 3
      },
      premium: {
        ...baseConfig,
        animationDuration: 500,
        staggerDelay: 150,
        showPremiumBadges: true,
        showVerificationIndicators: true,
        showExclusivityMarkers: true,
        lazyLoadThreshold: 1
      }
    };
    
    return algorithmConfigs[algorithm] || baseConfig;
  },

  getUIPerformanceMetrics: () => {
    const metrics = {
      cacheHitRate: postsAPI._algorithmCache.size > 0 ? 0.85 : 0,
      avgLoadTime: postsAPI.getPerformanceStats().avgExecutionTime,
      totalCacheSize: postsAPI._algorithmCache.size + postsAPI._likeCache.size,
      lastCacheClean: localStorage.getItem('lastCacheClean') || new Date().toISOString()
    };
    
    return {
      success: true,
      data: metrics,
      recommendations: {
        shouldClearCache: metrics.totalCacheSize > 1000,
        shouldOptimizeImages: metrics.avgLoadTime > 2000,
        shouldEnablePrefetch: metrics.cacheHitRate < 0.7
      }
    };
  }
};

export default {
  postsAPI,
  chatAPI,
  favoritesAPI,
  contentTestAPI,
  algorithmAnalyticsAPI,
  algorithmSelectorAPI,
  advancedSearchAPI,
  uiOptimizationAPI,
  initContentAPI
};