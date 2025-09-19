import { useState, useEffect, useCallback, useRef } from 'react';
import { postsAPI, agencyAPI, userAPI, chatAPI, handleApiError } from '../../../utils/api';
import { useAuth } from '../../../context/AuthContext';

export const useFeedLogic = (userType) => {
  const { user, isAdminUser, logAdminAction } = useAuth();
  
  // ===================================================================
  // 🔧 ESTADOS PRINCIPALES - OPTIMIZADOS
  // ===================================================================
  
  // Estados para datos del backend
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [refreshing, setRefreshing] = useState(false);
  
  // Estados de la UI
  const [activeTab, setActiveTab] = useState('overview');
  const [currentImageIndex, setCurrentImageIndex] = useState({});
  const [userLikesAndFavorites, setUserLikesAndFavorites] = useState(new Set());
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(null);
  const [showBanModal, setShowBanModal] = useState(null);
  const [showJoinModal, setShowJoinModal] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(null);
  const [bannedUsers, setBannedUsers] = useState(new Set());
  
  // Estados para perfiles recomendados
  const [recommendedProfiles, setRecommendedProfiles] = useState([]);
  const [loadingRecommended, setLoadingRecommended] = useState(false);
  
  // Estados de filtros
  const [filters, setFilters] = useState({
    location: '',
    userType: '',
    services: [],
    minAge: '',
    maxAge: '',
    verified: false,
    sexo: '',
    sortBy: 'recent',
    search: ''
  });

  // Estados para el modal de perfil
  const [profileModalData, setProfileModalData] = useState(null);
  const [profileModalLoading, setProfileModalLoading] = useState(false);
  const [profileModalError, setProfileModalError] = useState(null);

  // Estados para chat
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState(null);

  // Estados para algoritmos diferenciados
  const [algorithmStats, setAlgorithmStats] = useState({
    discover: { personalizedCount: 0, qualityScore: 0 },
    trending: { engagementScore: 0, timeDecay: 0 },
    overview: { boostPriority: 0, balanceScore: 0 },
    premium: { exclusiveCount: 0, verifiedCount: 0 }
  });

  // Estado para debugging de algoritmos
  const [algorithmDebug, setAlgorithmDebug] = useState({
    lastAlgorithm: '',
    executionTime: 0,
    topReasons: []
  });

  // Estados para boost tracking
  const [boostStats, setBoostStats] = useState({
    totalBoosted: 0,
    totalBoostAmount: 0,
    averageBoostAmount: 0
  });

  // ===================================================================
  // 🤖 ESTADOS ANTI-BOT SIMPLES - CHECKBOX "NO SOY UN ROBOT"
  // ===================================================================
  
  const [showWhatsAppVerification, setShowWhatsAppVerification] = useState(false);
  const [pendingWhatsAppPhone, setPendingWhatsAppPhone] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [verificationError, setVerificationError] = useState(null);
  
  // Estados para detectar comportamiento humano
  const [humanBehavior, setHumanBehavior] = useState({
    mouseMovements: 0,
    clickPattern: [],
    timeOnPage: 0,
    scrollEvents: 0,
    startTime: Date.now()
  });

  const actualUserType = user?.userType || userType || 'CLIENT';

  // ===================================================================
  // 🤖 DETECTOR DE COMPORTAMIENTO HUMANO SIMPLE
  // ===================================================================

  // Inicializar detector de comportamiento humano
  useEffect(() => {
    let mouseMovements = 0;
    let scrollEvents = 0;
    let clickPattern = [];
    const startTime = Date.now();
    
    const handleMouseMove = () => {
      mouseMovements++;
    };

    const handleScroll = () => {
      scrollEvents++;
    };

    const handleClick = (e) => {
      const clickTime = Date.now();
      clickPattern = [...clickPattern.slice(-4), clickTime];
    };

    // Agregar listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('scroll', handleScroll);
    document.addEventListener('click', handleClick);

    // Función para obtener datos actuales sin actualizar estado
    window.getHumanBehavior = () => ({
      mouseMovements,
      scrollEvents,
      clickPattern,
      timeOnPage: Date.now() - startTime,
      startTime
    });

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('scroll', handleScroll);
      document.removeEventListener('click', handleClick);
      delete window.getHumanBehavior;
    };
  }, []);

  // ===================================================================
  // 🤖 FUNCIÓN DE VERIFICACIÓN ANTI-BOT
  // ===================================================================

  const verifyHumanBehavior = useCallback(() => {
    // Obtener datos actuales sin depender del estado
    const behavior = window.getHumanBehavior ? window.getHumanBehavior() : {
      mouseMovements: 0,
      scrollEvents: 0,
      clickPattern: [],
      timeOnPage: 0
    };

    console.log('🤖 Verificando comportamiento humano:', {
      mouseMovements: behavior.mouseMovements,
      clicksCount: behavior.clickPattern.length,
      timeOnPage: Math.round(behavior.timeOnPage / 1000) + 's',
      scrollEvents: behavior.scrollEvents
    });

    // Verificaciones básicas de comportamiento humano
    const checks = {
      hasMouseMovement: behavior.mouseMovements >= 10,
      hasTimeOnPage: behavior.timeOnPage > 3000,
      hasScrolled: behavior.scrollEvents > 0,
      hasClicks: behavior.clickPattern.length > 0,
      clickPatternNormal: true
    };

    // Verificar patrones de clicks muy rápidos (posible bot)
    if (behavior.clickPattern.length >= 2) {
      const intervals = [];
      for (let i = 1; i < behavior.clickPattern.length; i++) {
        intervals.push(behavior.clickPattern[i] - behavior.clickPattern[i - 1]);
      }
      const veryFastClicks = intervals.filter(interval => interval < 50).length;
      checks.clickPatternNormal = veryFastClicks < intervals.length * 0.8;
    }

    const passedChecks = Object.values(checks).filter(Boolean).length;
    const totalChecks = Object.keys(checks).length;
    const humanScore = (passedChecks / totalChecks) * 100;

    console.log('🔍 Resultado verificación:', {
      checks,
      humanScore: Math.round(humanScore) + '%',
      isHuman: humanScore >= 60
    });

    return {
      isHuman: humanScore >= 60,
      score: humanScore,
      details: checks
    };
  }, []);

  // ===================================================================
  // 🤖 FUNCIONES PARA WHATSAPP CON VERIFICACIÓN SIMPLE
  // ===================================================================

  const handleWhatsAppWithVerification = useCallback((phone) => {
    console.log('📱 WhatsApp solicitado con verificación anti-bot para:', phone);
    
    if (!phone) {
      setVerificationError('Número de teléfono no disponible');
      return;
    }
    
    // Resetear estado
    setIsVerifying(false);
    setIsVerified(false);
    setVerificationError(null);
    
    setPendingWhatsAppPhone(phone);
    setShowWhatsAppVerification(true);
  }, []);

  const handleVerifyRobot = useCallback(() => {
    setIsVerifying(true);
    setVerificationError(null);

    // Simular verificación con delay realista
    setTimeout(() => {
      const verification = verifyHumanBehavior();
      
      if (verification.isHuman) {
        setIsVerified(true);
        setIsVerifying(false);
        
        // Auto-redirigir a WhatsApp después de 1 segundo
        setTimeout(() => {
          if (pendingWhatsAppPhone) {
            const cleanPhone = pendingWhatsAppPhone.replace(/[^0-9]/g, '');
            window.open(`https://wa.me/${cleanPhone}`, '_blank');
            handleCloseVerificationModal();
          }
        }, 1000);
        
      } else {
        setIsVerifying(false);
        setVerificationError(
          `Comportamiento sospechoso detectado. Score: ${Math.round(verification.score)}%. 
          Intenta mover el mouse, hacer scroll y pasar más tiempo en la página.`
        );
        
        // Permitir reintento después de 3 segundos
        setTimeout(() => {
          setVerificationError(null);
        }, 3000);
      }
    }, 1500); // 1.5 segundos de "verificación"
  }, [verifyHumanBehavior, pendingWhatsAppPhone]);

  const handleCloseVerificationModal = useCallback(() => {
    console.log('🤖 Cerrando modal de verificación');
    
    setShowWhatsAppVerification(false);
    setPendingWhatsAppPhone(null);
    setIsVerifying(false);
    setIsVerified(false);
    setVerificationError(null);
  }, []);

  // ===================================================================
  // 🔧 VERIFICACIÓN DE PREMIUM
  // ===================================================================

  const isClientPremium = useCallback(() => {
    console.log('🔍 DEBUG: isClientPremium called');
    console.log('🔍 User object:', {
      user: !!user,
      userId: user?.id,
      userType: user?.userType,
      client: user?.client,
      isPremium: user?.isPremium,
      clientIsPremium: user?.client?.isPremium
    });
    
    if (!user) {
      console.log('❌ isClientPremium: No user');
      return false;
    }
    
    const isPremium = (
      user?.client?.isPremium === true ||
      user?.isPremium === true ||
      user?.premium === true ||
      user?.premiumTier ||
      user?.subscription?.active === true
    );
    
    console.log('🔍 Premium check result:', {
      clientIsPremium: user?.client?.isPremium,
      directIsPremium: user?.isPremium,
      premiumField: user?.premium,
      premiumTier: user?.premiumTier,
      finalResult: isPremium
    });
    
    return isPremium;
  }, [user]);

  // ===================================================================
  // 🔧 CONFIGURACIÓN CON ACCESO CORREGIDO
  // ===================================================================

  const getUserConfig = useCallback((customTitle, customSubtitle, customIcon) => {
    const canAccessDiscoverTab = () => {
      if (!user) return false;
      return true;
    };

    const canSeePremiumTab = () => {
      return actualUserType === 'CLIENT' || actualUserType === 'ADMIN';
    };

    const baseTabs = [
      { id: 'overview', label: 'Feed Principal', icon: 'Heart', description: 'Posts equilibrados con boosts' },
      { id: 'trending', label: 'Tendencias', icon: 'TrendingUp', description: 'Posts más populares por engagement' }
    ];

    const discoverTab = { id: 'discover', label: 'Para Ti', icon: 'Star', description: 'Contenido personalizado con IA' };
    const premiumTab = { id: 'premium', label: 'Premium', icon: 'Shield', description: 'Contenido exclusivo verificado' };

    let finalTabs = [...baseTabs];

    if (canAccessDiscoverTab()) {
      finalTabs.unshift(discoverTab);
    }

    if (canSeePremiumTab()) {
      finalTabs.push(premiumTab);
    }

    const configs = {
      client: {
        title: customTitle || 'Descubre',
        subtitle: customSubtitle || 'Acompañantes verificadas con algoritmos inteligentes',
        icon: customIcon || 'Search',
        tabs: finalTabs,
        actionButtons: ['chat', 'like', 'whatsapp'],
        sidebarContent: 'recommendations',
        algorithms: {
          discover: 'Recomendaciones personalizadas basadas en tu historial e interacciones',
          overview: 'Feed equilibrado priorizando posts con boost activo',
          trending: 'Algoritmo de engagement: likes + favoritos + views + temporalidad',
          premium: 'Contenido exclusivo y perfiles verificados de alta calidad'
        }
      },
      escort: {
        title: customTitle || 'Red de Escorts',
        subtitle: customSubtitle || 'Conecta con colegas usando algoritmos inteligentes',
        icon: customIcon || 'Users',
        tabs: finalTabs.filter(tab => tab.id !== 'premium'),
        actionButtons: ['chat'],
        sidebarContent: 'recommendations',
        algorithms: {
          discover: 'Descubre colegas y contenido de calidad personalizado',
          overview: 'Red profesional con posts destacados por boost',
          trending: 'Contenido más popular entre escorts y agencias'
        }
      },
      agency: {
        title: customTitle || 'Feed Agencia',
        subtitle: customSubtitle || 'Gestiona y descubre talentos con IA avanzada',
        icon: customIcon || 'Building2',
        tabs: finalTabs.filter(tab => tab.id !== 'premium'),
        actionButtons: ['chat', 'whatsapp'],
        sidebarContent: 'activity',
        algorithms: {
          discover: 'Descubre talentos potenciales usando algoritmos de matching',
          overview: 'Dashboard de gestión con posts priorizados por inversión',
          trending: 'Tendencias del mercado y perfiles más solicitados'
        }
      },
      admin: {
        title: customTitle || 'Moderación Feed',
        subtitle: customSubtitle || 'Supervisión de contenido con algoritmos de detección',
        icon: customIcon || 'Shield',
        tabs: finalTabs,
        actionButtons: ['chat', 'whatsapp'],
        sidebarContent: 'recommendations',
        algorithms: {
          discover: 'Contenido curado con detección automática de calidad',
          overview: 'Feed general con métricas de moderación y boost',
          trending: 'Análisis de tendencias para detección de patrones',
          premium: 'Herramientas de moderación avanzada y reportes'
        }
      }
    };
    
    return configs[actualUserType.toLowerCase()] || configs.client;
  }, [user, actualUserType]);

  const hasAccessToPremium = useCallback(() => {
    console.log('🔍 DEBUG: hasAccessToPremium called');
    console.log('🔍 actualUserType:', actualUserType);
    console.log('🔍 user exists:', !!user);
    
    if (actualUserType === 'ADMIN') {
      console.log('✅ Admin access granted');
      return true;
    }
    
    if (!user) {
      console.log('❌ No user authenticated');
      return false;
    }
    
    if (actualUserType === 'CLIENT') {
      const premiumAccess = isClientPremium();
      console.log('🔍 Client premium access:', premiumAccess);
      return premiumAccess;
    }
    
    console.log('❌ Non-client user type');
    return false;
  }, [actualUserType, user, isClientPremium]);

  const hasAccessToDiscover = useCallback(() => {
    console.log('🔍 DEBUG: hasAccessToDiscover called', {
      hasUser: !!user,
      userType: actualUserType,
      userId: user?.id
    });
    
    if (!user) {
      console.log('❌ Discover access denied: No user authenticated');
      return false;
    }
    
    console.log('✅ Discover access granted for authenticated user:', actualUserType);
    return true;
  }, [user, actualUserType]);

  // ===================================================================
  // 🚀 FUNCIÓN PRINCIPAL PARA CARGAR POSTS
  // ===================================================================

  const loadPosts = useCallback(async (tab = activeTab, page = 1, isRefresh = false) => {
    const startTime = Date.now();
    
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      console.log(`🚀 Loading posts for tab: "${tab}" with user:`, {
        hasUser: !!user,
        userType: actualUserType,
        userId: user?.id || 'anonymous'
      });

      if (tab === 'discover') {
        if (!user) {
          console.log('❌ Discover access denied - user not authenticated');
          setError('Debes iniciar sesión para ver contenido personalizado');
          setPosts([]);
          return;
        }
        console.log('✅ Discover access granted for:', actualUserType);
      }

      if (tab === 'premium') {
        if (actualUserType === 'ADMIN') {
          console.log('✅ Admin access to premium - no restrictions');
        } else if (!hasAccessToPremium()) {
          console.log('❌ Premium access denied - user not premium client');
          setError('Debes ser Cliente Premium para acceder a este contenido');
          setPosts([]);
          return;
        } else {
          console.log('✅ Premium client access granted:', { 
            userType: actualUserType, 
            isPremium: isClientPremium(),
            userId: user?.id 
          });
        }
      }

      const baseParams = {
        page,
        limit: pagination.limit,
        tabType: tab,
        ...filters
      };

      Object.keys(baseParams).forEach(key => {
        if (baseParams[key] === '' || baseParams[key] === null || 
            (Array.isArray(baseParams[key]) && baseParams[key].length === 0)) {
          delete baseParams[key];
        }
      });

      let response;
      let algorithmInfo = {};

      switch (tab) {
        case 'discover':
          console.log('🎯 DISCOVER: Loading personalized content with ML algorithm...');
          
          response = await postsAPI.getDiscoveryWithOptions({
            limit: baseParams.limit,
            algorithm: user ? 'personalized' : 'quality',
            sexo: baseParams.sexo,
            tabType: 'discover',
            includeInteractionHistory: !!user,
            diversityMode: true,
            qualityThreshold: 60
          });
          
          algorithmInfo = {
            type: 'personalized_discovery',
            description: user 
              ? 'Recomendaciones basadas en tu historial y preferencias'
              : 'Contenido de alta calidad curado automáticamente',
            factors: ['Historial personal', 'Calidad de contenido', 'Diversidad', 'Novedad']
          };
          break;

        case 'trending':
          console.log('🔥 TRENDING: Loading engagement-based trending with time decay...');
          
          response = await postsAPI.getTrendingWithOptions({
            limit: baseParams.limit,
            timeframe: '24h',
            sexo: baseParams.sexo,
            tabType: 'trending',
            minEngagement: 1,
            engagementWeight: 'high',
            timeDecayEnabled: true
          });
          
          algorithmInfo = {
            type: 'engagement_trending',
            description: 'Posts más populares con decaimiento temporal inteligente',
            factors: ['Likes recientes', 'Favoritos', 'Visualizaciones', 'Tiempo desde publicación']
          };
          break;

        case 'overview':
          console.log('📋 OVERVIEW: Loading balanced feed with boost priority...');
          
          response = await postsAPI.getFeed({
            ...baseParams,
            tabType: 'overview',
            boostPriority: page === 1,
            balanceMode: true,
            sortBy: page === 1 ? 'boosted' : 'recent'
          });
          
          algorithmInfo = {
            type: 'balanced_feed',
            description: page === 1 
              ? 'Posts destacados con boost y contenido balanceado' 
              : 'Contenido cronológico con calidad balanceada',
            factors: page === 1 
              ? ['Boost activo', 'Score general', 'Calidad', 'Novedad']
              : ['Cronológico', 'Score de calidad', 'Engagement']
          };
          break;

        case 'premium':
          console.log('🔒 PREMIUM: Loading exclusive verified content...');
          
          if (actualUserType === 'ADMIN') {
            response = await postsAPI.getFeed({
              ...baseParams,
              tabType: 'premium',
              adminAccess: true,
              showAllPremium: true,
              includeStats: true
            });
          } else {
            response = await postsAPI.getFeed({
              ...baseParams,
              tabType: 'premium',
              premiumOnly: true,
              verifiedOnly: true,
              qualityFilter: 'high',
              exclusiveMode: true,
              userPremiumStatus: isClientPremium()
            });
          }
          
          algorithmInfo = {
            type: actualUserType === 'ADMIN' ? 'admin_premium_access' : 'premium_exclusive',
            description: actualUserType === 'ADMIN' 
              ? 'Acceso administrativo completo a contenido premium'
              : 'Contenido premium exclusivo de usuarios verificados',
            factors: actualUserType === 'ADMIN'
              ? ['Acceso completo', 'Moderación', 'Estadísticas', 'Control total']
              : ['Verificación', 'Calidad premium', 'Exclusividad', 'Confiabilidad']
          };
          break;

        default:
          response = await postsAPI.getFeed({
            ...baseParams,
            tabType: 'overview'
          });
          algorithmInfo = { type: 'fallback', description: 'Algoritmo por defecto' };
          break;
      }

      const executionTime = Date.now() - startTime;
      console.log(`⚡ Algorithm execution completed in ${executionTime}ms`);

      console.log('📥 Posts response received:', {
        success: response.success,
        postsCount: response.data?.posts?.length || 0,
        tabType: tab,
        algorithm: response.data?.algorithm || algorithmInfo.type,
        userType: actualUserType,
        isAuthenticated: !!user,
        isPremium: tab === 'premium' ? isClientPremium() : null,
        debug: response.data?.debug
      });

      if (response.success) {
        const postsData = response.data.posts || response.data || [];
        
        const normalizedPosts = postsData.map(post => ({
          ...post,
          sexo: post.sexo || 'No especificado',
          algorithmScore: post.algorithmScore || 0,
          algorithmReason: post.algorithmReason || algorithmInfo.type,
          isBoostActive: post.isBoostActive || false,
          boostAmount: post.boostAmount || 0,
          boostExpiry: post.boostExpiry || null,
          boostPriority: post.boostPriority || 0
        }));
        
        const boostedPosts = normalizedPosts.filter(p => p.isBoostActive);
        const totalBoostAmount = boostedPosts.reduce((sum, p) => sum + (p.boostAmount || 0), 0);
        
        setBoostStats({
          totalBoosted: boostedPosts.length,
          totalBoostAmount: totalBoostAmount,
          averageBoostAmount: boostedPosts.length > 0 ? totalBoostAmount / boostedPosts.length : 0
        });
        
        setAlgorithmStats(prev => ({
          ...prev,
          [tab]: {
            personalizedCount: normalizedPosts.filter(p => p.algorithmReason?.includes('personalized')).length,
            qualityScore: normalizedPosts.reduce((sum, p) => sum + (p.qualityScore || 0), 0) / normalizedPosts.length || 0,
            engagementScore: normalizedPosts.reduce((sum, p) => sum + ((p._count?.likes || 0) + (p._count?.favorites || 0)), 0),
            boostPriority: normalizedPosts.filter(p => p.isBoostActive).length,
            verifiedCount: normalizedPosts.filter(p => p.author?.escort?.isVerified || p.author?.agency?.isVerified).length,
            exclusiveCount: normalizedPosts.filter(p => p.premiumOnly).length,
            timeDecay: tab === 'trending' ? response.data?.stats?.avgEngagement || 0 : 0,
            balanceScore: tab === 'overview' ? response.data?.stats?.balanceScore || 0 : 0
          }
        }));

        setAlgorithmDebug({
          lastAlgorithm: algorithmInfo.type,
          executionTime,
          topReasons: normalizedPosts.slice(0, 5).map(p => ({
            id: p.id.substring(0, 8),
            reason: p.algorithmReason,
            score: p.algorithmScore
          }))
        });
        
        let filteredPosts = normalizedPosts;
        
        if (tab === 'premium') {
          filteredPosts = normalizedPosts.filter(post => post.premiumOnly === true);
        } else if (tab !== 'premium') {
          filteredPosts = normalizedPosts.filter(post => post.premiumOnly !== true);
        }
        
        console.log('📊 Algorithm processing completed:', {
          tab,
          algorithm: algorithmInfo.type,
          userType: actualUserType,
          isAuthenticated: !!user,
          isPremium: tab === 'premium' ? isClientPremium() : 'N/A',
          originalPosts: normalizedPosts.length,
          filteredPosts: filteredPosts.length,
          boostedPosts: filteredPosts.filter(p => p.isBoostActive).length,
          personalizedPosts: filteredPosts.filter(p => p.algorithmReason?.includes('personalized')).length,
          trendingPosts: filteredPosts.filter(p => p.algorithmReason?.includes('trending')).length,
          qualityPosts: filteredPosts.filter(p => (p.qualityScore || 0) > 70).length,
          executionTime: `${executionTime}ms`
        });
        
        setPosts(filteredPosts);
        
        if (response.data.pagination) {
          setPagination(response.data.pagination);
        } else if (filteredPosts.length > 0) {
          setPagination(prev => ({
            ...prev,
            total: filteredPosts.length,
            pages: Math.ceil(filteredPosts.length / prev.limit)
          }));
        }

        const unifiedIds = new Set();
        filteredPosts.forEach(post => {
          if (post.isLiked && post.isFavorited) {
            unifiedIds.add(post.id);
          }
          if (post.isLiked !== undefined) {
            postsAPI._updateLikeCache(post.id, post.isLiked ? 'like' : 'unlike');
          }
        });
        setUserLikesAndFavorites(unifiedIds);

        console.log(`✅ Tab "${tab}" loaded successfully with algorithm "${algorithmInfo.type}":`, {
          postsCount: filteredPosts.length,
          algorithmDescription: algorithmInfo.description,
          algorithmFactors: algorithmInfo.factors,
          userHasPremiumAccess: hasAccessToPremium(),
          userHasDiscoverAccess: hasAccessToDiscover(),
          isAuthenticated: !!user,
          boostStats: {
            totalBoosted: boostedPosts.length,
            totalAmount: totalBoostAmount,
            avgAmount: boostedPosts.length > 0 ? totalBoostAmount / boostedPosts.length : 0
          },
          executionTime: `${executionTime}ms`
        });

      } else {
        throw new Error(response.message || 'Error cargando posts con algoritmo diferenciado');
      }

    } catch (error) {
      console.error(`❌ Error loading posts for tab "${tab}":`, error);
      setError(handleApiError(error));
      setPosts([]);
      
      const errorMessages = {
        discover: 'Debes iniciar sesión para ver contenido personalizado. El algoritmo de descubrimiento requiere autenticación.',
        trending: 'No se pudieron cargar las tendencias. El algoritmo de engagement está temporalmente indisponible.',
        premium: 'Debes ser Cliente Premium para visualizar este contenido exclusivo. Te invitamos a adquirir el paquete PREMIUM en la seccion de PREMIUM de tu barra de navegacion, Ahi tendras Acceso a los Paquetes de TELOPOINTS que te permitiran Adquirir el PREMIUM PACK :)',
        overview: 'No se pudo cargar el feed principal. El algoritmo equilibrado no está respondiendo.'
      };
      
      setError(errorMessages[tab] || 'Error cargando contenido con algoritmo diferenciado. Inténtalo de nuevo.');
      
      setAlgorithmStats(prev => ({
        ...prev,
        [tab]: {
          personalizedCount: 0,
          qualityScore: 0,
          engagementScore: 0,
          boostPriority: 0,
          verifiedCount: 0,
          exclusiveCount: 0,
          timeDecay: 0,
          balanceScore: 0
        }
      }));

    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, filters, pagination.limit, hasAccessToPremium, hasAccessToDiscover, user, actualUserType, isClientPremium]);

  // ===================================================================
  // 🔍 FUNCIÓN PARA CARGAR PERFILES RECOMENDADOS
  // ===================================================================

  const loadRecommendedProfiles = useCallback(async () => {
    try {
      setLoadingRecommended(true);
      
      let response;
      
      if (actualUserType === 'AGENCY') {
        response = await agencyAPI.searchAgencies({
          page: 1,
          limit: 6,
          algorithm: 'network_expansion',
          includeMetrics: true
        });
        
        if (response.success && response.data.agencies) {
          const transformedProfiles = response.data.agencies.map(agency => 
            agencyAPI.formatAgencyData(agency)
          );
          setRecommendedProfiles(transformedProfiles);
        }
      } else {
        response = await postsAPI.getDiscoveryWithOptions({
          limit: 8,
          algorithm: 'sidebar_recommendations',
          tabType: 'sidebar',
          qualityFilter: 'medium',
          diversityMode: true,
          excludeViewed: !!user
        });
        
        if (response.success && response.data.posts) {
          const transformedProfiles = response.data.posts
            .filter(post => !post.premiumOnly)
            .map(post => ({
              id: post.id,
              name: `${post.author.firstName} ${post.author.lastName}`,
              age: post.author.escort?.age || post.age || 25,
              sexo: post.sexo || 'No especificado',
              image: post.author.avatar || post.images?.[0],
              location: post.location || 'República Dominicana',
              verified: post.author.escort?.isVerified || post.author.agency?.isVerified || false,
              profileImage: post.author.avatar || post.images?.[0],
              images: post.images || [],
              description: post.description,
              phone: post.phone,
              services: post.services || [],
              rating: post.author.escort?.rating || 0,
              likes: post.likesCount || 0,
              isOnline: true,
              agency: post.author.agency || null,
              canJoinAgency: !post.author.agency && post.author.userType === 'ESCORT',
              author: post.author,
              authorId: post.author.id,
              userId: post.author.id,
              premiumOnly: false,
              algorithmScore: post.algorithmScore || 0,
              algorithmReason: post.algorithmReason || 'sidebar_recommendation',
              isBoostActive: post.isBoostActive || false,
              boostAmount: post.boostAmount || 0
            }));
          
          setRecommendedProfiles(transformedProfiles.slice(0, 6));
          
          console.log('⭐ Sidebar recommendations loaded:', {
            algorithm: 'sidebar_recommendations',
            profilesCount: transformedProfiles.length,
            qualityScores: transformedProfiles.map(p => p.algorithmScore),
            boostCount: transformedProfiles.filter(p => p.isBoostActive).length
          });
        }
      }
    } catch (error) {
      console.error('❌ Error loading recommended profiles with algorithm:', error);
      setRecommendedProfiles([]);
    } finally {
      setLoadingRecommended(false);
    }
  }, [actualUserType, user]);

  // ===================================================================
  // 📑 FUNCIÓN PARA CAMBIAR TAB
  // ===================================================================

  const handleTabChange = useCallback((tabId) => {
    console.log(`📑 Changing tab from "${activeTab}" to "${tabId}" with algorithm switch`);
    console.log(`🔍 User status:`, { 
      hasUser: !!user, 
      userType: actualUserType,
      isAuthenticated: !!user,
      isPremium: isClientPremium()
    });
    
    const config = getUserConfig();
    const tabExists = config.tabs.some(tab => tab.id === tabId);
    
    if (!tabExists) {
      console.log('❌ Tab not available for this user type:', { 
        tabId, 
        userType: actualUserType, 
        authenticated: !!user,
        availableTabs: config.tabs.map(t => t.id)
      });
      return;
    }
    
    if (tabId === 'discover') {
      if (!user) {
        console.log('❌ Discover access denied - user not authenticated');
        setError('Debes iniciar sesión para ver contenido personalizado.');
        return;
      }
      console.log('✅ Discover access granted for authenticated user:', actualUserType);
      setError(null);
    }
    
    if (tabId === 'premium') {
      console.log(`🔒 Switching to Premium tab - verification:`, {
        userType: actualUserType,
        isAdmin: actualUserType === 'ADMIN',
        isPremium: isClientPremium(),
        hasAccess: hasAccessToPremium()
      });
      
      setError(null);
    }
    
    if (tabId === 'overview' || tabId === 'trending') {
      console.log(`✅ ${tabId} tab access granted - accessible to all users`);
      setError(null);
    }
    
    const algorithmInfo = {
      discover: 'Switching to PERSONALIZED DISCOVERY algorithm (ML-based recommendations)',
      overview: 'Switching to BALANCED FEED algorithm (boost priority + quality balance)',
      trending: 'Switching to ENGAGEMENT TRENDING algorithm (likes + favorites + time decay)',
      premium: `Switching to PREMIUM EXCLUSIVE algorithm (${actualUserType === 'ADMIN' ? 'admin access' : 'verified + high quality only'})`
    };
    
    console.log(`🧠 Algorithm Switch: ${algorithmInfo[tabId] || 'Unknown algorithm for ' + tabId}`);
    
    setAlgorithmStats(prev => ({
      ...prev,
      [tabId]: {
        personalizedCount: 0,
        qualityScore: 0,
        engagementScore: 0,
        boostPriority: 0,
        verifiedCount: 0,
        exclusiveCount: 0,
        timeDecay: 0,
        balanceScore: 0
      }
    }));
    
    console.log(`✅ Tab change approved: ${activeTab} → ${tabId}`);
    setActiveTab(tabId);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [activeTab, user, actualUserType, getUserConfig, isClientPremium, hasAccessToPremium]);

  // ===================================================================
  // 🔄 EFECTOS PARA CARGAR DATOS
  // ===================================================================

  useEffect(() => {
    console.log('🔄 Auth status change detected:', { 
      hasUser: !!user, 
      currentTab: activeTab,
      userType: actualUserType,
      isPremium: isClientPremium()
    });
    
    const config = getUserConfig();
    const isCurrentTabValid = config.tabs.some(tab => tab.id === activeTab);
    
    if (!isCurrentTabValid) {
      console.log(`🔄 Current tab "${activeTab}" not valid for user type "${actualUserType}", switching to overview`);
      setActiveTab('overview');
    }
  }, [user, getUserConfig, activeTab, actualUserType, isClientPremium]);

  useEffect(() => {
    console.log(`🔄 Loading initial data for tab: "${activeTab}" with differentiated algorithm`);
    loadPosts(activeTab, 1);
    loadRecommendedProfiles();
  }, [activeTab, loadPosts, loadRecommendedProfiles]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      console.log(`🔍 Applying filters for tab "${activeTab}" with algorithm:`, filters);
      loadPosts(activeTab, 1);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [filters, loadPosts, activeTab]);

  // ===================================================================
  // RESTO DE FUNCIONES SIN CAMBIOS
  // ===================================================================

  const loadProfileData = useCallback(async (profileId, initialData = null) => {
    try {
      console.log('👤 Loading complete profile data for ID:', profileId);
      setProfileModalLoading(true);
      setProfileModalError(null);
      
      if (initialData) {
        setProfileModalData({
          ...initialData,
          sexo: initialData.sexo || 'No especificado'
        });
      }

      const response = await userAPI.getUserById(profileId);
      
      if (response.success) {
        console.log('✅ Complete profile data loaded:', response.data);
        setProfileModalData({
          ...response.data,
          sexo: response.data.sexo || 'No especificado'
        });
      } else {
        throw new Error(response.message || 'Error cargando perfil completo');
      }
    } catch (error) {
      console.error('❌ Error loading profile data:', error);
      setProfileModalError(handleApiError(error));
    } finally {
      setProfileModalLoading(false);
    }
  }, []);

  const createChatWithUser = useCallback(async (targetUserId, targetUserData = null) => {
    try {
      console.log('💬 Creating/getting chat with user:', {
        targetUserId,
        currentUserId: user?.id,
        targetUserData: targetUserData ? `${targetUserData.firstName} ${targetUserData.lastName}` : 'Unknown'
      });

      setChatLoading(true);
      setChatError(null);

      const response = await chatAPI.createChatFromProfile(targetUserId);

      if (response.success) {
        console.log('✅ Chat created/retrieved successfully:', {
          chatId: response.data.chatId,
          isNewChat: response.data.isNewChat,
          otherUser: response.data.otherUser
        });

        return {
          success: true,
          chatId: response.data.chatId,
          isNewChat: response.data.isNewChat,
          otherUser: response.data.otherUser,
          redirectUrl: response.data.redirectUrl
        };
      } else {
        throw new Error(response.message || 'Error al crear/obtener el chat');
      }
    } catch (error) {
      console.error('❌ Error creating/getting chat:', error);
      const errorMessage = handleApiError(error);
      setChatError(errorMessage);
      
      const errorCodes = {
        'CANNOT_CHAT_WITH_SELF': 'No puedes chatear contigo mismo',
        'USER_NOT_FOUND': 'Usuario no encontrado o no disponible',
        'DIRECT_MESSAGES_DISABLED': 'Este usuario no permite mensajes directos',
        'USER_BLOCKED_YOU': 'No puedes enviar mensajes a este usuario',
        'YOU_BLOCKED_USER': 'Has bloqueado a este usuario',
        'CHAT_LIMIT_REACHED': 'Has alcanzado el límite de chats permitidos'
      };
      
      const specificError = errorCodes[error.response?.data?.errorCode];
      setChatError(specificError || errorMessage);

      return {
        success: false,
        error: specificError || errorMessage
      };
    } finally {
      setChatLoading(false);
    }
  }, [user?.id]);

  const handleToggleLikeAndFavorite = useCallback(async (postId) => {
    if (actualUserType === 'ADMIN') {
      console.log('❌ Admin no puede dar likes');
      return;
    }

    try {
      const currentPost = posts.find(p => p.id === postId);
      const isCurrentlyActive = (currentPost?.isLiked && currentPost?.isFavorited) || userLikesAndFavorites.has(postId);
      
      const newActiveState = !isCurrentlyActive;
      
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                isLiked: newActiveState,
                isFavorited: newActiveState,
                likesCount: newActiveState 
                  ? (post.likesCount + 1) 
                  : Math.max(0, post.likesCount - 1),
                favoritesCount: newActiveState 
                  ? (post.favoritesCount + 1) 
                  : Math.max(0, post.favoritesCount - 1)
              }
            : post
        )
      );

      setUserLikesAndFavorites(prev => {
        const newState = new Set(prev);
        if (newActiveState) {
          newState.add(postId);
        } else {
          newState.delete(postId);
        }
        return newState;
      });

      if (navigator.vibrate && newActiveState) {
        navigator.vibrate(50);
      }

      const [likeResponse, favoriteResponse] = await Promise.all([
        postsAPI.toggleLike(postId),
        postsAPI.toggleFavoriteWithNotification(postId, true)
      ]);
      
      if (!likeResponse.success || !favoriteResponse.success) {
        setPosts(prevPosts => 
          prevPosts.map(post => 
            post.id === postId 
              ? { 
                  ...post, 
                  isLiked: isCurrentlyActive,
                  isFavorited: isCurrentlyActive,
                  likesCount: isCurrentlyActive 
                    ? (post.likesCount + 1) 
                    : Math.max(0, post.likesCount - 1),
                  favoritesCount: isCurrentlyActive 
                    ? (post.favoritesCount + 1) 
                    : Math.max(0, post.favoritesCount - 1)
                }
              : post
          )
        );

        setUserLikesAndFavorites(prev => {
          const revertedState = new Set(prev);
          if (isCurrentlyActive) {
            revertedState.add(postId);
          } else {
            revertedState.delete(postId);
          }
          return revertedState;
        });

        throw new Error('Error al sincronizar con el servidor');
      }

    } catch (error) {
      console.error('❌ Error toggling like + favorite:', error);
    }
  }, [actualUserType, posts, userLikesAndFavorites]);

  const handleRefresh = useCallback(() => {
    console.log(`🔄 Refreshing feed for tab "${activeTab}" with differentiated algorithm`);
    loadPosts(activeTab, 1, true);
  }, [activeTab, loadPosts]);

  const nextImage = useCallback((postId, totalImages) => {
    setCurrentImageIndex(prev => ({
      ...prev,
      [postId]: ((prev[postId] || 0) + 1) % totalImages
    }));
  }, []);

  const prevImage = useCallback((postId, totalImages) => {
    setCurrentImageIndex(prev => ({
      ...prev,
      [postId]: prev[postId] === 0 ? totalImages - 1 : (prev[postId] || 0) - 1
    }));
  }, []);

  const handleStartChat = useCallback(async (post) => {
    console.log(`💬 Iniciando chat con: ${post.author?.firstName || post.name}`);
    
    const targetUserId = post.author?.id || post.authorId || post.userId;
    
    if (!targetUserId) {
      console.error('❌ No se pudo extraer el ID del usuario del post:', post);
      setChatError('Error: No se pudo identificar al usuario');
      return null;
    }

    const targetUserData = {
      id: targetUserId,
      firstName: post.author?.firstName || '',
      lastName: post.author?.lastName || '',
      username: post.author?.username || '',
      avatar: post.author?.avatar || post.profileImage || post.images?.[0] || '',
      userType: post.author?.userType || 'ESCORT'
    };

    return await createChatWithUser(targetUserId, targetUserData);
  }, [createChatWithUser]);

  const handleProfileClick = useCallback((post) => {
    console.log('👤 Profile clicked:', post.id);
    
    const userId = post.authorId || post.userId || post.author?.id;
    
    if (!userId) {
      console.error('❌ No se pudo extraer el ID del usuario del post:', post);
      return;
    }
    
    const initialProfileData = {
      id: userId,
      authorId: userId,
      userId: userId,
      name: post.author ? `${post.author.firstName} ${post.author.lastName}` : post.name,
      firstName: post.author?.firstName || '',
      lastName: post.author?.lastName || '',
      username: post.author?.username || '',
      avatar: post.author?.avatar || post.profileImage || post.images?.[0] || '',
      age: post.age || post.author?.escort?.age || null,
      sexo: post.sexo || 'No especificado',
      location: post.location || post.author?.location || 'República Dominicana',
      phone: post.phone || post.author?.phone || '',
      bio: post.description || post.author?.bio || '',
      title: post.title || post.name || '',
      verified: post.verified || post.author?.escort?.isVerified || post.author?.agency?.isVerified || false,
      premium: post.premium || post.author?.isPremium || false,
      userType: post.type || post.userType || post.author?.userType || 'ESCORT',
      rating: post.rating || post.author?.escort?.rating || 0,
      reviewsCount: post.reviewsCount || post.author?.escort?.reviewsCount || 0,
      services: post.services || post.author?.escort?.services || [],
      rates: post.rates || post.author?.escort?.rates || {},
      availability: post.availability || post.author?.escort?.availability || {},
      languages: post.languages || post.author?.escort?.languages || ['Español'],
      isOnline: post.isOnline || Math.random() > 0.5,
      lastSeen: post.lastSeen || post.author?.lastActiveAt || new Date().toISOString(),
      createdAt: post.createdAt || post.author?.createdAt || new Date().toISOString(),
      agency: post.agency || post.author?.agency || null,
      canJoinAgency: post.canJoinAgency || (!post.author?.agency && post.author?.userType === 'ESCORT'),
      profileViews: post.profileViews || post.author?.profileViews || 0,
      images: post.images || [], 
      author: post.author,
      premiumOnly: post.premiumOnly || false,
      algorithmScore: post.algorithmScore || 0,
      algorithmReason: post.algorithmReason || 'direct_access',
      isBoostActive: post.isBoostActive || false,
      boostAmount: post.boostAmount || 0,
      boostExpiry: post.boostExpiry || null
    };
    
    setShowProfileModal(initialProfileData);
    loadProfileData(userId, initialProfileData);
  }, [loadProfileData]);

  const handleRecommendedProfileClick = useCallback((profile) => {
    console.log('⭐ Recommended profile clicked:', profile.id);
    
    const userId = profile.id || profile.authorId || profile.userId;
    
    if (!userId) {
      console.error('❌ No se pudo extraer el ID del perfil recomendado:', profile);
      return;
    }
    
    setShowProfileModal({
      ...profile,
      sexo: profile.sexo || 'No especificado'
    });
    loadProfileData(userId, profile);
  }, [loadProfileData]);

  const handleViewProfile = useCallback((post) => {
    console.log('🔍 Opening profile modal for:', post.author?.firstName || post.name);
    setShowProfileModal(post);
  }, []);

  const handleWhatsApp = useCallback((phone) => {
    console.log('📱 Opening WhatsApp for:', phone);
    if (phone) {
      handleWhatsAppWithVerification(phone);
    }
  }, [handleWhatsAppWithVerification]);

  const handleShare = useCallback((post) => {
    if (navigator.share) {
      navigator.share({
        title: `${post.author?.firstName || post.title} - TeloFundi`,
        text: post.description,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      setShowInfoModal({
        type: 'success',
        title: 'Enlace copiado',
        message: 'El enlace ha sido copiado al portapapeles',
        icon: 'Share2'
      });
    }
  }, []);

  const handleSendJoinRequest = useCallback(async (post) => {
    if (actualUserType !== 'AGENCY') return;
    
    if (post.author?.userType !== 'ESCORT' || post.author?.agency) {
      setShowInfoModal({
        type: 'error',
        title: 'No disponible',
        message: 'Solo puedes enviar invitaciones a escorts que no tengan agencia',
        icon: 'X'
      });
      return;
    }
    
    try {
      const response = await agencyAPI.requestToJoinAgency(
        post.author.id, 
        `Invitación para unirse a nuestra agencia`
      );
      
      if (response.success) {
        setShowInfoModal({
          type: 'success',
          title: 'Invitación enviada',
          message: `Se ha enviado la invitación a ${post.author.firstName} exitosamente`,
          icon: 'Users'
        });
      }
    } catch (error) {
      console.error('❌ Error sending join request:', error);
      setShowInfoModal({
        type: 'error',
        title: 'Error',
        message: handleApiError(error),
        icon: 'X'
      });
    }
    
    setShowJoinModal(null);
  }, [actualUserType]);

  const handleBanUser = useCallback((post) => {
    console.log('🚫 Ban function disabled for admin in feed');
    return;
  }, []);

  const confirmBan = useCallback(() => {
    console.log('🚫 Ban confirm function disabled for admin in feed');
    return;
  }, []);

  const handleUnbanUser = useCallback((postId) => {
    console.log('🚫 Unban function disabled for admin in feed');
    return;
  }, []);

  const shouldShowButton = useCallback((buttonType, post) => {
    const config = getUserConfig();
    
    if (!config.actionButtons.includes(buttonType)) {
      return false;
    }

    if (actualUserType === 'ADMIN') {
      if (buttonType === 'like' || buttonType === 'ban') {
        return false;
      }
    }
    
    if (actualUserType === 'AGENCY') {
      if (buttonType !== 'chat' && buttonType !== 'whatsapp') {
        return false;
      }
    }
    
    if (buttonType === 'invite') {
      if (actualUserType !== 'AGENCY') return false;
      if (post.author?.userType !== 'ESCORT') return false;
      if (post.author?.agency) return false;
      return true;
    }
    
    return true;
  }, [actualUserType, getUserConfig]);

  const handleAuthRequiredAction = useCallback((action, onOpenAuthModal) => {
    if (action === 'chat' || action === 'like') {
      if (onOpenAuthModal) {
        onOpenAuthModal('login');
      }
      return false;
    }
    
    return true;
  }, []);

  const handleProfileModalClose = useCallback(() => {
    setShowProfileModal(null);
    setProfileModalData(null);
    setProfileModalError(null);
    setProfileModalLoading(false);
  }, []);

  const handleProfileModalStartChat = useCallback(async (profile) => {
    console.log('💬 Starting chat from profile modal:', profile.name);
    
    const targetUserId = profile.id || profile.authorId || profile.userId;
    
    if (!targetUserId) {
      console.error('❌ No se pudo extraer el ID del perfil:', profile);
      setChatError('Error: No se pudo identificar al usuario');
      return null;
    }

    const result = await createChatWithUser(targetUserId, profile);
    
    if (result.success) {
      handleProfileModalClose();
      return result;
    }
    
    return result;
  }, [createChatWithUser, handleProfileModalClose]);

  const handleProfileModalToggleLike = useCallback((postData) => {
    console.log('❤️ Toggle like from profile modal:', postData);
    if (postData && postData.id) {
      handleToggleLikeAndFavorite(postData.id);
    }
  }, [handleToggleLikeAndFavorite]);

  const handleProfileModalWhatsApp = useCallback((phone) => {
    console.log('📱 WhatsApp from profile modal:', phone);
    handleWhatsApp(phone);
  }, [handleWhatsApp]);

  const handleProfileModalBanUser = useCallback((profile) => {
    console.log('🚫 Ban user from profile modal:', profile.name);
    if (actualUserType === 'ADMIN') {
      setShowBanModal(profile);
      handleProfileModalClose();
    }
  }, [actualUserType, handleProfileModalClose]);

  const handleProfileModalReportUser = useCallback((profile) => {
    console.log('🚨 Report user from profile modal:', profile.name);
    setShowInfoModal({
      type: 'info',
      title: 'Función en desarrollo',
      message: 'La función de reportar usuarios estará disponible pronto',
      icon: 'AlertTriangle'
    });
  }, []);

  const getCurrentAlgorithmInfo = useCallback(() => {
    const config = getUserConfig();
    return {
      tabType: activeTab,
      algorithm: algorithmDebug.lastAlgorithm,
      description: config.algorithms?.[activeTab] || 'Algoritmo estándar',
      stats: algorithmStats[activeTab] || {},
      debug: algorithmDebug,
      executionTime: algorithmDebug.executionTime,
      boostStats: boostStats
    };
  }, [activeTab, algorithmDebug, algorithmStats, getUserConfig, boostStats]);

  // ===================================================================
  // 📤 RETORNO DEL HOOK - ORGANIZADO Y OPTIMIZADO
  // ===================================================================

  return {
    // Estados principales
    posts,
    loading,
    error,
    refreshing,
    pagination,
    activeTab,
    currentImageIndex,
    userLikesAndFavorites,
    bannedUsers,
    recommendedProfiles,
    loadingRecommended,
    filters,
    
    // Estados de algoritmos y boost
    algorithmStats,
    algorithmDebug,
    boostStats,
    
    // Estados de modales
    showFiltersModal,
    showProfileModal,
    showBanModal,
    showJoinModal,
    showInfoModal,
    
    // Estados para el modal de perfil
    profileModalData,
    profileModalLoading,
    profileModalError,
    
    // Estados para chat
    chatLoading,
    chatError,
    
    // ✅ ESTADOS ANTI-BOT SIMPLES (CHECKBOX "NO SOY UN ROBOT")
    showWhatsAppVerification,
    pendingWhatsAppPhone,
    isVerifying,
    isVerified,
    verificationError,
    humanBehavior,
    
    // Setters de estados
    setFilters,
    setShowFiltersModal,
    setShowProfileModal,
    setShowBanModal,
    setShowJoinModal,
    setShowInfoModal,
    setCurrentImageIndex,
    
    // Configuración
    getUserConfig,
    hasAccessToPremium,
    hasAccessToDiscover,
    isClientPremium,
    
    // Funciones principales
    loadPosts,
    loadRecommendedProfiles,
    loadProfileData,
    handleRefresh,
    handleTabChange,
    
    // Función para info de algoritmos
    getCurrentAlgorithmInfo,
    
    // Funciones de navegación
    nextImage,
    prevImage,
    
    // Funciones de acciones
    handleToggleLikeAndFavorite,
    handleStartChat,
    handleViewProfile,
    handleWhatsApp,
    handleShare,
    handleProfileClick,
    handleRecommendedProfileClick,
    handleSendJoinRequest,
    handleBanUser,
    confirmBan,
    handleUnbanUser,
    handleAuthRequiredAction,
    
    // ✅ FUNCIONES ANTI-BOT SIMPLES (CHECKBOX)
    handleWhatsAppWithVerification,
    handleVerifyRobot,
    handleCloseVerificationModal,
    verifyHumanBehavior,
    
    // Funciones para el modal de perfil
    handleProfileModalClose,
    handleProfileModalStartChat,
    handleProfileModalToggleLike,
    handleProfileModalWhatsApp,
    handleProfileModalBanUser,
    handleProfileModalReportUser,
    
    // Funciones de chat
    createChatWithUser,
    
    // Función para verificar botones - CORREGIDA PARA AGENCIAS
    shouldShowButton
  };
};