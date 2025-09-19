import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, User, ChevronLeft, ChevronRight, Verified, MapPin, 
  Search, Heart, Send, Star, X, Users, RefreshCw, Loader, Check, UserPlus, Ban, TrendingUp, Shield, Building2, Flame, Zap, Lock, AlertCircle, Crown
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import EscortProfile from '../Profiles/EscortModal';
import ChatPage from '../chat/ChatPage';

export const FeedPageDesign = (props) => {
  const { isAuthenticated, user } = useAuth();
  
  // ===================================================================
  // 🔧 ESTADOS LOCALES OPTIMIZADOS
  // ===================================================================
  
  const [currentView, setCurrentView] = React.useState('feed');
  const [selectedProfileId, setSelectedProfileId] = React.useState(null);
  const [selectedProfileData, setSelectedProfileData] = React.useState(null);
  const [likeAnimations, setLikeAnimations] = React.useState({});
  const [mobilePostsVisible, setMobilePostsVisible] = React.useState({});
  const [showAuthModal, setShowAuthModal] = React.useState(null);
  const [expandedDescriptions, setExpandedDescriptions] = React.useState({});
  const [chatTargetUserId, setChatTargetUserId] = React.useState(null);
  const [chatTargetUserData, setChatTargetUserData] = React.useState(null);
  const [isCreatingChat, setIsCreatingChat] = React.useState(false);

  // ✅ Estados para boosts
  const [showBoostInfo, setShowBoostInfo] = React.useState({});
  const [boostAnimations, setBoostAnimations] = React.useState({});

  // ===================================================================
  // 🔧 DESTRUCTURING PROPS CON NUEVAS CARACTERÍSTICAS - CHECKBOX ANTI-BOT
  // ===================================================================
  
  const {
    userType, customTitle, customSubtitle, customIcon, posts, loading, error, 
    refreshing, activeTab, currentImageIndex, userLikesAndFavorites, 
    showBanModal, setShowBanModal, setCurrentImageIndex, getUserConfig, 
    handleRefresh, handleTabChange, nextImage, prevImage, handleToggleLikeAndFavorite,
    handleStartChat, handleShare, handleProfileClick: originalHandleProfileClick,
    handleRecommendedProfileClick, handleSendJoinRequest, handleBanUser,
    confirmBan, onOpenAuthModal, shouldShowButton,
    // ✅ Props relacionadas con boosts
    boostStats,
    // ✅ Props para verificar acceso
    hasAccessToDiscover,
    hasAccessToPremium,
    isClientPremium,
    // ✅ NUEVOS: Props para Checkbox Anti-Bot Simple
    showWhatsAppVerification,
    pendingWhatsAppPhone,
    isVerifying,
    isVerified,
    verificationError,
    humanBehavior,
    handleWhatsAppWithVerification,
    handleVerifyRobot,
    handleCloseVerificationModal
  } = props;

  const config = getUserConfig(customTitle, customSubtitle, customIcon);
  const isMobile = () => window.innerWidth <= 768;
  const actualUserType = user?.userType || userType || 'CLIENT';

  // ===================================================================
  // 🔧 FUNCIONES DE LAYOUT OPTIMIZADAS
  // ===================================================================

  const updateLayoutPositions = React.useCallback(() => {
    const navElement = document.querySelector('.feed-navigation');
    const feedContent = document.querySelector('.feed-content');
    
    if (!navElement || !feedContent) return;

    const isMobileDevice = window.innerWidth <= 768;
    
    if (isMobileDevice) {
      navElement.style.top = '40px'; // ✅ CAMBIO: Movido más abajo (antes era 10px)
      navElement.style.position = 'absolute';
      navElement.style.left = '0';
      navElement.style.right = '0';
      navElement.style.zIndex = '999';
      navElement.style.background = 'transparent';
      navElement.style.backdropFilter = 'blur(20px)';
      navElement.style.padding = '0.3rem';
      
      feedContent.style.marginTop = '95px'; // ✅ CAMBIO: Reducido para móviles (antes era 120px)
    } else {
      navElement.style.top = isAuthenticated ? '50px' : '60px'; // ✅ CAMBIO: Movido más abajo (antes era 10px/20px)
      navElement.style.position = 'absolute';
      navElement.style.left = '0';
      navElement.style.right = '0';
      navElement.style.zIndex = '999';
      navElement.style.padding = '0.5rem 1rem';
      
      feedContent.style.marginTop = isAuthenticated ? '120px' : '130px'; // ✅ CAMBIO: Más espacio (antes era 70px/80px)
    }
    
    const imageContainers = document.querySelectorAll('.instagram-image-container');
    imageContainers.forEach(container => {
      container.style.minHeight = '400px';
      container.style.maxHeight = '600px';
    });
    
  }, [isAuthenticated]);

  // ===================================================================
  // 🔧 EFECTOS PARA LAYOUT Y PERFORMANCE
  // ===================================================================

  React.useEffect(() => {
    updateLayoutPositions();
    
    const handleResize = () => updateLayoutPositions();
    const handleOrientationChange = () => setTimeout(updateLayoutPositions, 200);
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [updateLayoutPositions, posts, activeTab]);

  React.useEffect(() => {
    if (posts.length > 0) {
      setTimeout(updateLayoutPositions, 200);
    }
  }, [posts, updateLayoutPositions]);

  // ===================================================================
  // 🔧 COMPONENTE AVATAR OPTIMIZADO
  // ===================================================================

  const ProfileAvatar = React.memo(({ src, alt, className, style, onClick }) => {
    const [imageState, setImageState] = React.useState({ loaded: false, error: false, validSrc: false });

    React.useEffect(() => {
      if (!src?.trim()) {
        setImageState({ loaded: false, error: false, validSrc: false });
        return;
      }

      setImageState(prev => ({ ...prev, validSrc: true, loaded: false, error: false }));
      const img = new Image();
      img.onload = () => setImageState(prev => ({ ...prev, loaded: true, error: false }));
      img.onerror = () => setImageState(prev => ({ ...prev, loaded: false, error: true }));
      img.src = src;

      return () => { img.onload = null; img.onerror = null; };
    }, [src]);

    const showImage = imageState.validSrc && !imageState.error && imageState.loaded;
    const showPlaceholder = !showImage;

    return (
      <div style={{ position: 'relative', cursor: onClick ? 'pointer' : 'default', ...style }} onClick={onClick}>
        {showImage && <img src={src} alt={alt} className={className} style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} />}
        {showPlaceholder && (
          <div className={className} style={{
            background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#9ca3af', fontSize: className?.includes('modern-profile-image') ? '18px' : '32px', fontWeight: 500, width: '100%', height: '100%'
          }}>
            <User size={className?.includes('modern-profile-image') ? 20 : 40} />
          </div>
        )}
      </div>
    );
  });

  // ===================================================================
  // 🚀 COMPONENTE BOOST INDICATOR
  // ===================================================================

  const BoostIndicator = React.memo(({ post, className = '' }) => {
    if (!post.isBoostActive) return null;

    const boostLevel = post.boostAmount > 100 ? 'high' : post.boostAmount > 50 ? 'medium' : 'low';
    const boostColors = {
      high: { bg: 'from-yellow-400 to-orange-500', text: 'text-white', glow: 'shadow-yellow-400/50' },
      medium: { bg: 'from-blue-400 to-purple-500', text: 'text-white', glow: 'shadow-blue-400/50' },
      low: { bg: 'from-green-400 to-blue-500', text: 'text-white', glow: 'shadow-green-400/50' }
    };

    const colors = boostColors[boostLevel];

    return (
      <motion.div
        className={`boost-indicator ${className}`}
        style={{
          position: 'absolute',
          top: '8px',
          left: '8px',
          background: `linear-gradient(135deg, ${colors.bg.split(' ')[1]}, ${colors.bg.split(' ')[3]})`,
          borderRadius: '12px',
          padding: '4px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '10px',
          fontWeight: 700,
          color: 'white',
          boxShadow: `0 4px 12px ${colors.glow.split('/')[0]}/30, 0 2px 4px rgba(0, 0, 0, 0.2)`,
          zIndex: 10,
          backdropFilter: 'blur(8px)'
        }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.05 }}
        onMouseEnter={() => setShowBoostInfo(prev => ({ ...prev, [post.id]: true }))}
        onMouseLeave={() => setShowBoostInfo(prev => ({ ...prev, [post.id]: false }))}
      >
        <Zap size={12} />
        <span>BOOST</span>
        
        <AnimatePresence>
          {showBoostInfo[post.id] && (
            <motion.div
              style={{
                position: 'absolute',
                top: '100%',
                left: '0',
                marginTop: '4px',
                background: 'rgba(0, 0, 0, 0.9)',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '11px',
                whiteSpace: 'nowrap',
                zIndex: 20,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
              }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div>💰 Boost: ${post.boostAmount}</div>
              {post.boostExpiry && (
                <div>⏰ Expira: {new Date(post.boostExpiry).toLocaleDateString()}</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  });

  // ===================================================================
  // 🔧 ICONOS Y HELPERS
  // ===================================================================

  const WhatsAppIcon = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.465 3.488"/>
    </svg>
  );

  // ===================================================================
  // 🔧 FUNCIONES DE INTERACCIÓN OPTIMIZADAS - CORRECCIÓN DE STALE CLOSURES
  // ===================================================================

  const handleProfileClick = React.useCallback((post) => {
    const userId = post.authorId || post.userId || post.author?.id;
    if (!userId) return;
    
    const initialProfileData = {
      id: userId, authorId: userId, userId: userId,
      name: post.author ? `${post.author.firstName} ${post.author.lastName}` : post.name,
      firstName: post.author?.firstName || '', lastName: post.author?.lastName || '',
      username: post.author?.username || '', avatar: post.author?.avatar || post.profileImage || post.images?.[0] || '',
      age: post.age || post.author?.escort?.age || null, sexo: post.sexo || 'No especificado',
      location: post.location || post.author?.location || 'República Dominicana',
      phone: post.phone || post.author?.phone || '', bio: post.description || post.author?.bio || '',
      title: post.title || post.name || '', verified: post.verified || post.author?.escort?.isVerified || post.author?.agency?.isVerified || false,
      premium: post.premium || post.author?.isPremium || false, userType: post.type || post.userType || post.author?.userType || 'ESCORT',
      rating: post.rating || post.author?.escort?.rating || 0, reviewsCount: post.reviewsCount || post.author?.escort?.reviewsCount || 0,
      services: post.services || post.author?.escort?.services || [], rates: post.rates || post.author?.escort?.rates || {},
      availability: post.availability || post.author?.escort?.availability || {}, languages: post.languages || post.author?.escort?.languages || ['Español'],
      isOnline: post.isOnline || Math.random() > 0.5, lastSeen: post.lastSeen || post.author?.lastActiveAt || new Date().toISOString(),
      createdAt: post.createdAt || post.author?.createdAt || new Date().toISOString(),
      agency: post.agency || post.author?.agency || null, canJoinAgency: post.canJoinAgency || (!post.author?.agency && post.author?.userType === 'ESCORT'),
      profileViews: post.profileViews || post.author?.profileViews || 0, images: post.images || [], author: post.author,
      premiumOnly: post.premiumOnly || false,
      isBoostActive: post.isBoostActive || false,
      boostAmount: post.boostAmount || 0,
      boostExpiry: post.boostExpiry || null
    };
    
    setSelectedProfileId(userId);
    setSelectedProfileData(initialProfileData);
    setCurrentView('profile');
    originalHandleProfileClick?.(post);
  }, [originalHandleProfileClick]);

  const handleRecommendedProfileClickNavigation = React.useCallback((profile) => {
    const userId = profile.id || profile.authorId || profile.userId;
    if (!userId) return;
    setSelectedProfileId(userId);
    setSelectedProfileData({ ...profile, sexo: profile.sexo || 'No especificado' });
    setCurrentView('profile');
    handleRecommendedProfileClick?.(profile);
  }, [handleRecommendedProfileClick]);

  const handleBackToFeed = React.useCallback(() => {
    setCurrentView('feed');
    setSelectedProfileId(null);
    setSelectedProfileData(null);
    setChatTargetUserId(null);
    setChatTargetUserData(null);
    setIsCreatingChat(false);
  }, []);

  const handleBackToFeedFromChat = React.useCallback(() => {
    setCurrentView('feed');
    setChatTargetUserId(null);
    setChatTargetUserData(null);
    setIsCreatingChat(false);
  }, []);

  // ✅ CORRECCIÓN CRÍTICA: Agregar dependencies correctas para evitar stale closure
  const handleAuthRequiredAction = React.useCallback((actionType = 'general') => {
    if (!isAuthenticated) { setShowAuthModal('login'); return false; }
    return true;
  }, [isAuthenticated]); // ✅ CORRECCIÓN: Agregar isAuthenticated a dependencies

  const handleMobilePostToggle = React.useCallback((postId, event) => {
    if (!isMobile()) return;
    const target = event.target;
    const clickedOnButton = target.closest('button') || target.closest('.modern-action-btn') || target.closest('.modern-nav-button') || target.closest('[data-interactive="true"]');
    if (clickedOnButton) return;
    setMobilePostsVisible(prev => ({ ...prev, [postId]: !prev[postId] }));
    event.stopPropagation();
  }, []);

  const handleChatAction = React.useCallback((post) => {
    if (isCreatingChat) return;
    if (!handleAuthRequiredAction('chat')) return;
    
    const targetUserId = post.author?.id || post.authorId || post.userId;
    if (!targetUserId) return;

    setIsCreatingChat(true);
    
    const targetUserData = {
      id: targetUserId, firstName: post.author?.firstName || '', lastName: post.author?.lastName || '',
      username: post.author?.username || '', avatar: post.author?.avatar || post.profileImage || post.images?.[0] || '',
      userType: post.author?.userType || 'ESCORT', isActive: true,
      phone: post.phone || post.author?.phone || '', location: post.location || post.author?.location || 'República Dominicana'
    };
    
    setChatTargetUserId(targetUserId);
    setChatTargetUserData(targetUserData);
    setCurrentView('chat');
    
    setTimeout(() => setIsCreatingChat(false), 1000);
    if (handleStartChat && typeof handleStartChat === 'function') handleStartChat(post);
  }, [isCreatingChat, handleAuthRequiredAction, handleStartChat]);

  const handleLikeWithAnimation = React.useCallback((postId, event) => {
    if (!handleAuthRequiredAction('like')) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const container = event.currentTarget.closest('.instagram-post-container');
    const containerRect = container.getBoundingClientRect();
    
    const x = rect.left - containerRect.left + rect.width / 2;
    const y = rect.top - containerRect.top + rect.height / 2;
    const animationId = `${postId}-${Date.now()}`;
    
    const currentPost = posts.find(p => p.id === postId);
    const isBoostActive = currentPost?.isBoostActive || false;
    
    const heartTypes = isBoostActive 
      ? ['⚡', '💫', '✨', '🌟', '💎', '🔥', '💥', '🚀']
      : ['❤️', '🧡', '💖', '💕', '💗', '💓', '♥️', '💘', '💝', '❣️'];
    
    const hearts = Array.from({ length: isBoostActive ? 30 : 25 }, (_, i) => {
      const angle = (Math.PI * 2 * i) / (isBoostActive ? 30 : 25);
      const distance = (isBoostActive ? 40 : 30) + Math.random() * (isBoostActive ? 50 : 40);
      return {
        id: `${animationId}-${i}`, 
        x: x + Math.cos(angle) * distance + (Math.random() - 0.5) * (isBoostActive ? 40 : 30),
        y: y + Math.sin(angle) * distance + (Math.random() - 0.5) * (isBoostActive ? 40 : 30), 
        delay: i * (isBoostActive ? 30 : 50),
        heart: heartTypes[Math.floor(Math.random() * heartTypes.length)], 
        size: (isBoostActive ? 1.0 : 0.8) + Math.random() * (isBoostActive ? 1.0 : 0.7),
        rotation: Math.random() * 360, 
        duration: (isBoostActive ? 3.0 : 2.5) + Math.random() * (isBoostActive ? 2.0 : 1.5), 
        curve: Math.random() > 0.5 ? 1 : -1
      };
    });
    
    setLikeAnimations(prev => ({ ...prev, [postId]: hearts }));
    setTimeout(() => setLikeAnimations(prev => { 
      const newAnimations = { ...prev }; 
      delete newAnimations[postId]; 
      return newAnimations; 
    }), isBoostActive ? 6000 : 4500);
    
    handleToggleLikeAndFavorite?.(postId);
  }, [handleAuthRequiredAction, handleToggleLikeAndFavorite, posts]);

  const toggleDescriptionExpansion = React.useCallback((postId, event) => {
    event.preventDefault();
    event.stopPropagation();
    setExpandedDescriptions(prev => ({ ...prev, [postId]: !prev[postId] }));
  }, []);

  // ===================================================================
  // 🔧 CONFIGURACIÓN DE BOTONES DE ACCIÓN CON BOOST AWARENESS - CORREGIDO PARA AGENCY
  // ===================================================================

  const actionButtonsConfig = React.useMemo(() => ({
    chat: { Component: MessageCircle, className: 'chat-btn', size: 20, handler: handleChatAction, title: 'Chatear' },
    like: { Component: Flame, className: 'flame-btn', size: 24, handler: handleLikeWithAnimation, title: 'Me gusta' },
    whatsapp: { Component: WhatsAppIcon, className: 'whatsapp-btn', size: 20, handler: (post) => handleWhatsAppWithVerification(post.phone || post.author?.phone), title: 'WhatsApp' }, // ✅ ACTUALIZADO: Usar Checkbox Anti-Bot
    invite: { Component: UserPlus, className: 'invite-btn', size: 20, handler: handleSendJoinRequest, title: 'Enviar solicitud' },
    ban: { Component: Ban, className: 'ban-btn', size: 20, handler: handleBanUser, title: 'Banear usuario' }
  }), [handleChatAction, handleLikeWithAnimation, handleWhatsAppWithVerification, handleSendJoinRequest, handleBanUser]); // ✅ ACTUALIZADO: dependencies

  // ✅ CORRECCIÓN CRÍTICA: Agregar dependencies para evitar stale closure con actualUserType
  const renderActionButtons = React.useCallback((post) => {
    const isOwnPost = post.author?.id === user?.id;
    
    if (isOwnPost) {
      return (
        <div className="modern-actions-overlay single-button" data-interactive="true">
          <div className="own-post-indicator" style={{
            background: post.isBoostActive 
              ? 'linear-gradient(135deg, #ffd700, #ffed4e)'
              : 'rgba(16, 185, 129, 0.9)',
            border: '2px solid rgba(255, 255, 255, 0.4)', borderRadius: '20px',
            padding: '8px 16px', color: post.isBoostActive ? '#000' : 'white', 
            fontSize: '12px', fontWeight: 600, display: 'flex',
            alignItems: 'center', gap: '6px', 
            boxShadow: post.isBoostActive 
              ? '0 6px 18px rgba(255, 215, 0, 0.4), 0 3px 8px rgba(0, 0, 0, 0.2)'
              : '0 6px 18px rgba(16, 185, 129, 0.4), 0 3px 8px rgba(0, 0, 0, 0.2)',
            textShadow: 'none', whiteSpace: 'nowrap'
          }}>
            {post.isBoostActive ? <Zap size={14} /> : <User size={14} />}
            {post.isBoostActive ? 'Tu post (Boost activo)' : 'Tu publicación'}
          </div>
        </div>
      );
    }

    // ✅ FILTRAR BOTONES BASADO EN shouldShowButton Y TIPO DE USUARIO
    let validButtons = config.actionButtons.filter(buttonType => shouldShowButton(buttonType, post));
    
    // ✅ FILTRO ESPECÍFICO PARA AGENCIAS: Solo mostrar CHAT y WHATSAPP
    if (actualUserType === 'AGENCY') {
      validButtons = validButtons.filter(buttonType => 
        buttonType === 'chat' || buttonType === 'whatsapp'
      );
    }
    
    if (validButtons.length === 0) return null;

    const buttons = validButtons.map(buttonType => {
      const btnConfig = actionButtonsConfig[buttonType];
      if (!btnConfig) return null;
      
      const { Component, className, size, handler, title } = btnConfig;
      const isActive = buttonType === 'like' && ((post.isLiked && post.isFavorited) || userLikesAndFavorites.has(post.id));
      const isDisabled = buttonType === 'chat' && isCreatingChat;
      
      return (
        <motion.button
          key={buttonType}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isDisabled) return;
            handler(buttonType === 'like' ? post.id : post, e);
          }}
          className={`modern-action-btn ${className} ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
          disabled={isDisabled}
          whileHover={isDisabled ? {} : { scale: 1.1, y: -2 }}
          whileTap={isDisabled ? {} : { scale: 0.95 }}
          title={isDisabled ? 'Creando chat...' : title}
          style={{ opacity: isDisabled ? 0.6 : 1, cursor: isDisabled ? 'not-allowed' : 'pointer' }}
        >
          <Component size={size} style={{ color: 'white' }} />
          {buttonType === 'chat' && isDisabled && (
            <motion.div
              style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                width: '12px', height: '12px', border: '2px solid transparent', borderTop: '2px solid white', borderRadius: '50%'
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          )}
        </motion.button>
      );
    }).filter(Boolean);

    const containerClass = `modern-actions-overlay ${buttons.length === 1 ? 'single-button' : buttons.length === 2 ? 'two-buttons' : 'multiple-buttons'}`;
    return (
      <div className={containerClass} data-interactive="true">
        <div className="action-buttons-left">
          {buttons}
        </div>
        {post.likesCount > 0 && (
          <div className="likes-counter-right" style={{
            background: post.isBoostActive 
              ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.9), rgba(255, 107, 53, 0.9))'
              : 'rgba(0, 0, 0, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '8px',
            padding: '6px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            fontWeight: 600,
            color: 'white'
          }}>
            <Heart size={12} style={{ color: post.isBoostActive ? '#fff' : '#ff6b35' }} />
            <span>{post.likesCount}</span>
            {post.isBoostActive && <Zap size={10} style={{ marginLeft: '2px' }} />}
          </div>
        )}
      </div>
    );
  }, [user?.id, config.actionButtons, shouldShowButton, actionButtonsConfig, userLikesAndFavorites, isCreatingChat, actualUserType]); // ✅ CORRECCIÓN: Agregar dependencies correctas

  // ===================================================================
  // 🔧 RENDERIZACIÓN DE POSTS GRID CON BOOST INDICATORS
  // ===================================================================

  const renderPostsGrid = React.useCallback((postsArray) => (
    <div className="feed-posts-container">
      {postsArray.map((post, index) => (
        <motion.div
          key={post.id}
          className={`feed-post-card ${mobilePostsVisible[post.id] ? 'mobile-active' : ''} ${post.isBoostActive ? 'boosted-post' : ''}`}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            delay: index * 0.1,
            duration: post.isBoostActive ? 0.8 : 0.6,
            ease: post.isBoostActive ? [0.25, 0.46, 0.45, 0.94] : "easeOut"
          }}
          onClick={(e) => handleMobilePostToggle(post.id, e)}
          style={{ 
            cursor: isMobile() ? 'pointer' : 'default',
            boxShadow: post.isBoostActive 
              ? '0 8px 32px rgba(255, 215, 0, 0.2), 0 4px 16px rgba(0, 0, 0, 0.1)'
              : undefined
          }}
        >
          <div className="instagram-post-container">
            <div className="instagram-header" data-interactive="true">
              <ProfileAvatar
                src={post.author?.avatar || post.profileImage || post.images?.[0]}
                alt={post.author ? `${post.author.firstName} ${post.author.lastName}` : post.name}
                className="instagram-profile-image"
                onClick={() => handleProfileClick(post)}
              />
              
              <div className="instagram-profile-info">
                <h3 onClick={() => handleProfileClick(post)} className="instagram-profile-name" style={{ cursor: 'pointer' }} data-interactive="true">
                  {post.author ? `${post.author.firstName} ${post.author.lastName}` : post.name}
                  {(post.verified || post.author?.escort?.isVerified || post.author?.agency?.isVerified) && (
                    <Verified size={16} style={{ color: '#3b82f6', marginLeft: '6px', flexShrink: 0 }} />
                  )}
                  {(post.age || post.author?.escort?.age) && (
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#737373', marginLeft: '6px' }}>
                      • {post.age || post.author?.escort?.age} años
                    </span>
                  )}
                  {post.premiumOnly && (
                    <div style={{ 
                      marginLeft: '8px', 
                      background: 'linear-gradient(135deg, #ffd700, #ffed4e)', 
                      color: '#000', 
                      padding: '2px 6px', 
                      borderRadius: '8px', 
                      fontSize: '10px', 
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '2px'
                    }}>
                      <Crown size={10} />
                      PREMIUM
                    </div>
                  )}
                  {post.isBoostActive && (
                    <motion.div 
                      style={{ 
                        marginLeft: '8px', 
                        background: 'linear-gradient(135deg, #ff6b35, #e85a2e)', 
                        color: 'white', 
                        padding: '2px 6px', 
                        borderRadius: '8px', 
                        fontSize: '10px', 
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px'
                      }}
                      animate={{ 
                        boxShadow: [
                          '0 2px 8px rgba(255, 107, 53, 0.3)',
                          '0 4px 16px rgba(255, 107, 53, 0.5)',
                          '0 2px 8px rgba(255, 107, 53, 0.3)'
                        ]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Zap size={10} />
                      BOOST
                    </motion.div>
                  )}
                </h3>
                
                <div className="instagram-profile-location">
                  <MapPin size={12} style={{ color: '#737373' }} />
                  <span>{post.location?.city || post.location || 'República Dominicana'}</span>
                </div>
              </div>
            </div>

            <div className="instagram-image-container">
              <BoostIndicator post={post} />
              
              {post.images?.length > 0 ? (
                <img
                  src={post.images[currentImageIndex[post.id] || 0]}
                  alt={`${post.author?.firstName || post.title} - Imagen`}
                  className="instagram-post-image"
                />
              ) : (
                <div className="instagram-no-image"><User size={64} /></div>
              )}
              
              {post.images?.length > 1 && (
                <>
                  <motion.div
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); prevImage(post.id, post.images.length); }}
                    className="elegant-arrow elegant-prev"
                    data-interactive="true"
                    whileHover={{ scale: 1.1, x: -2 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', width: '40px', height: '40px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 15,
                      background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)', borderRadius: '50%',
                      border: '2px solid rgba(255, 255, 255, 0.2)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  >
                    <ChevronLeft size={20} color="white" strokeWidth={2.5} style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))' }} />
                  </motion.div>

                  <motion.div
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); nextImage(post.id, post.images.length); }}
                    className="elegant-arrow elegant-next"
                    data-interactive="true"
                    whileHover={{ scale: 1.1, x: 2 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', width: '40px', height: '40px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 15,
                      background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)', borderRadius: '50%',
                      border: '2px solid rgba(255, 255, 255, 0.2)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  >
                    <ChevronRight size={20} color="white" strokeWidth={2.5} style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))' }} />
                  </motion.div>
                </>
              )}



              {post.images?.length > 1 && (
                <div className="instagram-image-indicators" data-interactive="true">
                  {post.images.map((_, imageIndex) => (
                    <motion.div
                      key={imageIndex}
                      onClick={(e) => {
                        e.preventDefault(); e.stopPropagation();
                        setCurrentImageIndex(prev => ({ ...prev, [post.id]: imageIndex }));
                      }}
                      className={`instagram-indicator ${imageIndex === (currentImageIndex[post.id] || 0) ? 'active' : ''}`}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }} 
                      data-interactive="true"
                      style={{
                        background: post.isBoostActive && imageIndex === (currentImageIndex[post.id] || 0)
                          ? '#ffd700'
                          : undefined
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {renderActionButtons(post)}

            <div className="instagram-content">
              {post.title && <h4 className="instagram-title">{post.title}</h4>}

              {post.description && (
                <div className="instagram-description-container">
                  <p className="instagram-description">
                    {expandedDescriptions[post.id] 
                      ? post.description 
                      : (post.description.length > 100 
                          ? `${post.description.substring(0, 100)}...` 
                          : post.description)
                    }
                    {post.description.length > 100 && (
                      <motion.button
                        onClick={(e) => toggleDescriptionExpansion(post.id, e)}
                        className="instagram-read-more"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        data-interactive="true"
                      >
                        {expandedDescriptions[post.id] ? ' mostrar menos' : ' más'}
                      </motion.button>
                    )}
                  </p>
                </div>
              )}

              {post.sexo && post.sexo !== 'No especificado' && (
                <div className="instagram-sexo">
                  <span className="instagram-sexo-tag">{post.sexo}</span>
                </div>
              )}

              {(post.services || post.author?.escort?.services)?.length > 0 && (
                <div className="instagram-services">
                  {(post.services || post.author?.escort?.services).slice(0, 3).map((service, index) => (
                    <span key={index} className="instagram-service-tag">
                      #{service.toLowerCase().replace(/\s+/g, '')}
                    </span>
                  ))}
                  {(post.services || post.author?.escort?.services).length > 3 && (
                    <span className="instagram-more-services">
                      +{(post.services || post.author?.escort?.services).length - 3} más
                    </span>
                  )}
                </div>
              )}
            </div>

            {likeAnimations[post.id] && (
              <div className="like-hearts-container">
                {likeAnimations[post.id].map((heart) => (
                  <motion.div
                    key={heart.id} 
                    className="floating-heart"
                    style={{ 
                      fontSize: `${20 * heart.size}px`, 
                      transform: `rotate(${heart.rotation}deg)`,
                      filter: post.isBoostActive ? 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.6))' : 'none'
                    }}
                    initial={{ x: heart.x, y: heart.y, opacity: 0, scale: 0, rotate: heart.rotation }}
                    animate={{ 
                      x: heart.x + (heart.curve * 50), y: heart.y - 150 - (Math.random() * 100),
                      opacity: [0, 1, 1, 0.8, 0], scale: [0, heart.size * 1.5, heart.size * 1.2, heart.size * 0.8, 0],
                      rotate: heart.rotation + (heart.curve * 180)
                    }}
                    transition={{ duration: heart.duration, delay: heart.delay / 1000, ease: [0.25, 0.46, 0.45, 0.94] }}
                  >
                    {heart.heart}
                  </motion.div>
                ))}
                
                <motion.div
                  className="explosion-center"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ 
                    scale: [0, post.isBoostActive ? 2.5 : 2, 0], 
                    opacity: [0, 1, 0], 
                    rotate: [0, 180] 
                  }}
                  transition={{ duration: post.isBoostActive ? 1.0 : 0.8, ease: "easeOut" }}
                  style={{
                    position: 'absolute', 
                    left: likeAnimations[post.id][0]?.x || 0, 
                    top: likeAnimations[post.id][0]?.y || 0,
                    fontSize: post.isBoostActive ? '40px' : '30px', 
                    transform: 'translate(-50%, -50%)', 
                    pointerEvents: 'none', 
                    zIndex: 30,
                    filter: post.isBoostActive ? 'drop-shadow(0 0 12px rgba(255, 215, 0, 0.8))' : 'none'
                  }}
                >
                  {post.isBoostActive ? '⚡' : '💥'}
                </motion.div>
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  ), [mobilePostsVisible, currentImageIndex, handleMobilePostToggle, handleProfileClick, prevImage, nextImage, setCurrentImageIndex, renderActionButtons, expandedDescriptions, toggleDescriptionExpansion, likeAnimations]);

  // ===================================================================
  // 🤖 COMPONENTE CHECKBOX ANTI-BOT LIMPIO Y ESTÉTICO
  // ===================================================================

  const SimpleRobotCheckModal = React.memo(() => {
    return (
      <motion.div 
        style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(20px)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          zIndex: 3000, padding: '1rem' 
        }}
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={handleCloseVerificationModal}
      >
        <motion.div 
          style={{
            background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)', 
            borderRadius: '20px', width: '100%', maxWidth: '380px',
            border: '1px solid rgba(255, 255, 255, 0.1)', 
            boxShadow: '0 30px 60px rgba(0, 0, 0, 0.8)', 
            overflow: 'hidden'
          }}
          initial={{ opacity: 0, scale: 0.95, y: 30 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          exit={{ opacity: 0, scale: 0.95, y: 30 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header limpio */}
          <div style={{ padding: '2rem 2rem 1rem', textAlign: 'center', position: 'relative' }}>
            <motion.button 
              onClick={handleCloseVerificationModal} 
              style={{ 
                position: 'absolute', top: '1rem', right: '1rem', 
                background: 'rgba(255, 255, 255, 0.1)', border: 'none', 
                borderRadius: '50%', width: '28px', height: '28px', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                cursor: 'pointer', color: 'rgba(255, 255, 255, 0.6)' 
              }}
              whileHover={{ background: 'rgba(255, 255, 255, 0.15)', scale: 1.1 }} 
              whileTap={{ scale: 0.95 }}
            >
              <X size={14} />
            </motion.button>
            
            <h3 style={{ 
              color: 'white', fontSize: '1.2rem', fontWeight: 600, 
              margin: 0, marginBottom: '0.5rem' 
            }}>
              Verificación de Seguridad
            </h3>
            <p style={{ 
              color: '#9ca3af', fontSize: '0.85rem', margin: 0, lineHeight: 1.4 
            }}>
              Confirma que eres humano para continuar
            </p>
          </div>

          {/* Contenido principal */}
          <div style={{ padding: '0 2rem 2rem' }}>
            {/* Info de WhatsApp minimalista */}
            <div style={{ 
              background: 'rgba(37, 211, 102, 0.1)', 
              border: '1px solid rgba(37, 211, 102, 0.2)', 
              borderRadius: '12px', 
              padding: '12px 16px', 
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <WhatsAppIcon size={18} />
              <div>
                <div style={{ color: '#25d366', fontSize: '0.85rem', fontWeight: 600 }}>
                  Contactar: {pendingWhatsAppPhone}
                </div>
                <div style={{ color: '#9ca3af', fontSize: '0.7rem' }}>
                  Serás redirigido automáticamente
                </div>
              </div>
            </div>

            {/* Checkbox principal - DISEÑO LIMPIO */}
            <div style={{ marginBottom: '1rem' }}>
              <motion.div 
                style={{ 
                  background: 'rgba(255, 255, 255, 0.05)', 
                  border: isVerified ? '2px solid #10b981' : '2px solid rgba(255, 255, 255, 0.1)', 
                  borderRadius: '16px', 
                  padding: '20px', 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  cursor: isVerified ? 'default' : 'pointer',
                  transition: 'all 0.3s ease'
                }}
                whileHover={!isVerified && !isVerifying ? { 
                  background: 'rgba(255, 255, 255, 0.08)',
                  borderColor: 'rgba(255, 255, 255, 0.2)'
                } : {}}
                onClick={!isVerified && !isVerifying ? handleVerifyRobot : undefined}
              >
                {/* Checkbox estético */}
                <motion.div 
                  style={{
                    width: '32px',
                    height: '32px',
                    border: isVerified ? '3px solid #10b981' : '3px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isVerified ? '#10b981' : 'transparent',
                    position: 'relative',
                    flexShrink: 0
                  }}
                  animate={{
                    scale: isVerifying ? [1, 1.1, 1] : 1
                  }}
                  transition={{
                    scale: { duration: 0.6, repeat: isVerifying ? Infinity : 0 }
                  }}
                >
                  {isVerifying && (
                    <motion.div
                      style={{
                        width: '20px',
                        height: '20px',
                        border: '3px solid transparent',
                        borderTop: '3px solid #ff6b35',
                        borderRadius: '50%'
                      }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                  )}
                  {isVerified && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    >
                      <Check size={20} color="white" strokeWidth={3} />
                    </motion.div>
                  )}
                </motion.div>
                
                {/* Texto principal */}
                <div style={{ flex: 1 }}>
                  <motion.div 
                    style={{ 
                      color: 'white', 
                      fontSize: '16px', 
                      fontWeight: 600 
                    }}
                    animate={{
                      color: isVerified ? '#10b981' : 'white'
                    }}
                  >
                    {isVerified ? '✅ Verificado correctamente' : 
                     isVerifying ? 'Verificando...' : 'No soy un robot'}
                  </motion.div>
                </div>
              </motion.div>

              {/* Error message si es necesario */}
              <AnimatePresence>
                {verificationError && (
                  <motion.div 
                    style={{ 
                      marginTop: '12px',
                      padding: '12px 16px', 
                      border: '1px solid #ef4444', 
                      borderRadius: '12px', 
                      background: 'rgba(239, 68, 68, 0.1)', 
                      color: '#ef4444', 
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    ⚠️ {verificationError}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer minimalista */}
            <div style={{ 
              textAlign: 'center', 
              fontSize: '0.7rem', 
              color: '#6b7280',
              paddingTop: '1rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
              🛡️ Sistema de seguridad TeloFundi
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  });

  // ===================================================================
  // 🔧 COMPONENTES DE MODALES OPTIMIZADOS
  // ===================================================================

  const AuthModal = React.memo(() => (
    <motion.div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.95)', backdropFilter: 'blur(24px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 3001, padding: '1rem' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAuthModal(null)}>
      <motion.div style={{ background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.98) 0%, rgba(30, 30, 30, 0.95) 100%)', borderRadius: '16px 16px 0 0', width: '100%', maxWidth: '400px', border: '1px solid rgba(255, 255, 255, 0.1)', borderBottom: 'none', boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.8)', overflow: 'hidden', marginBottom: 0 }}
        initial={{ opacity: 0, scale: 0.95, y: 300 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 300 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '2rem 2rem 1rem', textAlign: 'center', position: 'relative' }}>
          <motion.button onClick={() => setShowAuthModal(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255, 255, 255, 0.7)' }}
            whileHover={{ background: 'rgba(255, 255, 255, 0.2)' }} whileTap={{ scale: 0.95 }}><X size={16} /></motion.button>
          <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, #ff6b35, #e85a2e)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: 'white', fontSize: '1.5rem', fontWeight: 'bold' }}>TF</div>
          <h3 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 700, margin: 0, marginBottom: '0.5rem' }}>¡Únete a TeloFundi!</h3>
          <p style={{ color: '#9ca3af', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>Para chatear y contactar con los perfiles necesitas una cuenta</p>
        </div>
        <div style={{ padding: '0 2rem 2rem' }}>
          <div style={{ background: 'rgba(255, 107, 53, 0.1)', border: '1px solid rgba(255, 107, 53, 0.2)', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Star size={16} style={{ color: '#ff6b35' }} />
              <span style={{ color: '#ff6b35', fontSize: '0.9rem', fontWeight: 600 }}>Beneficios de tener cuenta:</span>
            </div>
            <ul style={{ color: '#d1d5db', fontSize: '0.8rem', margin: 0, paddingLeft: '1rem', lineHeight: 1.4 }}>
              <li>Chat directo con escorts y agencias</li>
              <li>Contacto por WhatsApp verificado</li>
              <li>Favoritos y historial personalizado</li>
              <li>Contenido premium exclusivo</li>
              <li>🚀 Boost para destacar tus anuncios</li>
            </ul>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <motion.button onClick={() => { setShowAuthModal(null); if (onOpenAuthModal) onOpenAuthModal('register'); }} style={{ width: '100%', padding: '0.875rem 1.5rem', background: 'linear-gradient(145deg, #ff6b35 0%, #e85a2e 100%)', border: 'none', borderRadius: '10px', color: 'white', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              whileHover={{ scale: 1.02, background: 'linear-gradient(145deg, #e85a2e 0%, #d14a22 100%)' }} whileTap={{ scale: 0.98 }}><UserPlus size={18} />Crear Cuenta Gratis</motion.button>
            <motion.button onClick={() => { setShowAuthModal(null); if (onOpenAuthModal) onOpenAuthModal('login'); }} style={{ width: '100%', padding: '0.875rem 1.5rem', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '10px', color: 'white', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              whileHover={{ scale: 1.02, background: 'rgba(255, 255, 255, 0.15)' }} whileTap={{ scale: 0.98 }}><User size={18} />Ya tengo cuenta - Iniciar Sesión</motion.button>
          </div>
          <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.75rem', marginTop: '1rem', marginBottom: 0 }}>Es rápido, seguro y completamente gratis</p>
        </div>
      </motion.div>
    </motion.div>
  ));

  // ===================================================================
  // 🔧 COMPONENTES DE ESTADO DE LOADING Y EMPTY
  // ===================================================================

  const LoadingComponent = React.memo(({ showError = true }) => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', flexDirection: 'column', gap: '1rem' }}>
      <Loader size={40} className="animate-spin" style={{ color: '#ff6b35' }} />
      {showError && error && (
        <>
          <p style={{ color: '#9ca3af', fontSize: '0.9rem', margin: 0 }}>{error}</p>
          <motion.button onClick={handleRefresh} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', background: 'linear-gradient(145deg, #ff6b35 0%, #e85a2e 100%)', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}><RefreshCw size={16} />Reintentar</motion.button>
        </>
      )}
    </div>
  ));

  const EmptyPostsComponent = React.memo(() => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', flexDirection: 'column', gap: '1rem', padding: '2rem', textAlign: 'center' }}>
      <Search size={48} style={{ color: '#9ca3af' }} />
      <h3 style={{ color: 'white', fontSize: '1.1rem', margin: 0 }}>No hay posts disponibles</h3>
      <p style={{ color: '#9ca3af', fontSize: '0.9rem', margin: 0 }}>
        {activeTab === 'trending' ? 'No hay posts en tendencia en este momento' : 
         activeTab === 'discover' ? 'No hay posts para descubrir en este momento' : 'No se encontraron posts'}
      </p>
    </div>
  ));

  const EmptyTrendingComponent = React.memo(() => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', flexDirection: 'column', gap: '1rem', padding: '2rem', textAlign: 'center' }}>
      <TrendingUp size={48} style={{ color: '#ff6b35' }} />
      <h3 style={{ color: 'white', fontSize: '1.1rem', margin: 0 }}>No hay tendencias disponibles</h3>
      <p style={{ color: '#9ca3af', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
        Los posts en tendencias se ordenan por: <strong>boosts activos primero</strong>, luego por cantidad de likes. 
        Cuando los usuarios interactúen más o activen boosts, aparecerán aquí.
      </p>
      <div style={{ 
        background: 'rgba(255, 107, 53, 0.1)', 
        border: '1px solid rgba(255, 107, 53, 0.2)', 
        borderRadius: '12px', 
        padding: '1rem', 
        marginTop: '1rem',
        maxWidth: '300px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Zap size={16} style={{ color: '#ff6b35' }} />
          <span style={{ color: '#ff6b35', fontSize: '0.85rem', fontWeight: 600 }}>Algoritmo de Trending:</span>
        </div>
        <ol style={{ color: '#d1d5db', fontSize: '0.75rem', margin: 0, paddingLeft: '1rem', lineHeight: 1.4, textAlign: 'left' }}>
          <li>🚀 Posts con boost activo (por cantidad invertida)</li>
          <li>❤️ Posts con más likes</li>
          <li>👀 Posts con más visualizaciones</li>
          <li>🕒 Posts más recientes</li>
        </ol>
      </div>
      <motion.button 
        onClick={handleRefresh} 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          padding: '0.75rem 1.5rem', 
          background: 'linear-gradient(145deg, #ff6b35 0%, #e85a2e 100%)', 
          color: 'white', 
          border: 'none', 
          borderRadius: '0.5rem', 
          fontSize: '0.9rem', 
          fontWeight: 600, 
          cursor: 'pointer',
          marginTop: '1rem'
        }}
        whileHover={{ scale: 1.05 }} 
        whileTap={{ scale: 0.95 }}
      >
        <TrendingUp size={16} />
        Actualizar Tendencias
      </motion.button>
    </div>
  ));

  const UnauthenticatedDiscoverComponent = React.memo(() => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', flexDirection: 'column', gap: '1rem', padding: '2rem', textAlign: 'center' }}>
      <Star size={48} style={{ color: '#9ca3af' }} />
      <h3 style={{ color: 'white', fontSize: '1.1rem', margin: 0 }}>Contenido personalizado</h3>
      <p style={{ color: '#9ca3af', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
        Para ver el contenido personalizado "Para Ti" necesitas tener una cuenta. 
        Nuestro algoritmo usa tu historial e interacciones para recomendarte el mejor contenido.
      </p>
      <div style={{ 
        background: 'rgba(255, 107, 53, 0.1)', 
        border: '1px solid rgba(255, 107, 53, 0.2)', 
        borderRadius: '12px', 
        padding: '1rem', 
        marginTop: '1rem',
        maxWidth: '300px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Star size={16} style={{ color: '#ff6b35' }} />
          <span style={{ color: '#ff6b35', fontSize: '0.85rem', fontWeight: 600 }}>Con tu cuenta tendrás:</span>
        </div>
        <ul style={{ color: '#d1d5db', fontSize: '0.75rem', margin: 0, paddingLeft: '1rem', lineHeight: 1.4, textAlign: 'left' }}>
          <li>🎯 Recomendaciones personalizadas con IA</li>
          <li>💬 Chat directo con perfiles</li>
          <li>❤️ Guarda tus favoritos</li>
          <li>🔒 Acceso a contenido premium</li>
        </ul>
      </div>
      <motion.button 
        onClick={() => setShowAuthModal('register')} 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          padding: '0.75rem 1.5rem', 
          background: 'linear-gradient(145deg, #ff6b35 0%, #e85a2e 100%)', 
          color: 'white', 
          border: 'none', 
          borderRadius: '0.5rem', 
          fontSize: '0.9rem', 
          fontWeight: 600, 
          cursor: 'pointer',
          marginTop: '1rem'
        }}
        whileHover={{ scale: 1.05 }} 
        whileTap={{ scale: 0.95 }}
      >
        <UserPlus size={16} />
        Crear Cuenta Gratis
      </motion.button>
    </div>
  ));

  // ✅ COMPONENTE PARA USUARIOS NO AUTENTICADOS QUE INTENTAN ACCEDER A PREMIUM
  const UnauthenticatedPremiumComponent = React.memo(() => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', flexDirection: 'column', gap: '1rem', padding: '2rem', textAlign: 'center' }}>
      <Crown size={48} style={{ color: '#ffd700' }} />
      <h3 style={{ color: 'white', fontSize: '1.1rem', margin: 0 }}>Debes acceder a TeloFundi</h3>
      <p style={{ color: '#9ca3af', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
        Para poder visualizar contenido premium necesitas tener una cuenta en TeloFundi. 
        Registrate gratis y accede a perfiles verificados y contenido exclusivo.
      </p>
      <div style={{ 
        background: 'rgba(255, 215, 0, 0.1)', 
        border: '1px solid rgba(255, 215, 0, 0.2)', 
        borderRadius: '12px', 
        padding: '1rem', 
        marginTop: '1rem',
        maxWidth: '300px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Crown size={16} style={{ color: '#ffd700' }} />
          <span style={{ color: '#ffd700', fontSize: '0.85rem', fontWeight: 600 }}>Contenido Premium incluye:</span>
        </div>
        <ul style={{ color: '#d1d5db', fontSize: '0.75rem', margin: 0, paddingLeft: '1rem', lineHeight: 1.4, textAlign: 'left' }}>
          <li>✅ Perfiles verificados exclusivos</li>
          <li>✅ Contenido de alta calidad</li>
          <li>✅ Chat directo con escorts</li>
          <li>✅ Experiencia premium completa</li>
        </ul>
      </div>
      <motion.button 
        onClick={() => setShowAuthModal('register')} 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          padding: '0.75rem 1.5rem', 
          background: 'linear-gradient(145deg, #ffd700 0%, #ffed4e 100%)', 
          color: '#000', 
          border: 'none', 
          borderRadius: '0.5rem', 
          fontSize: '0.9rem', 
          fontWeight: 600, 
          cursor: 'pointer',
          marginTop: '1rem'
        }}
        whileHover={{ scale: 1.05 }} 
        whileTap={{ scale: 0.95 }}
      >
        <UserPlus size={16} />
        Acceder a TeloFundi
      </motion.button>
    </div>
  ));

  // ✅ COMPONENTE PREMIUM PARA CLIENTES NO PREMIUM
  const NonPremiumClientComponent = React.memo(() => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', flexDirection: 'column', gap: '1rem', padding: '2rem', textAlign: 'center' }}>
      <Crown size={48} style={{ color: '#ffd700' }} />
      <h3 style={{ color: 'white', fontSize: '1.1rem', margin: 0 }}>Necesitas ser Cliente Premium</h3>
      <p style={{ color: '#9ca3af', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
        Para acceder a contenido premium exclusivo necesitas activar tu membresía premium. 
        Obtén TeloPoints y activa tu acceso premium para disfrutar del mejor contenido.

        Puedes hacer todo esto yendo al apartado de PREMIUM.
      </p>
      <div style={{ 
        background: 'rgba(255, 215, 0, 0.1)', 
        border: '1px solid rgba(255, 215, 0, 0.2)', 
        borderRadius: '12px', 
        padding: '1rem', 
        marginTop: '1rem',
        maxWidth: '320px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Crown size={16} style={{ color: '#ffd700' }} />
          <span style={{ color: '#ffd700', fontSize: '0.85rem', fontWeight: 600 }}>Con Premium obtienes:</span>
        </div>
        <ul style={{ color: '#d1d5db', fontSize: '0.75rem', margin: 0, paddingLeft: '1rem', lineHeight: 1.4, textAlign: 'left' }}>
          <li>🔥 Contenido exclusivo de alta calidad</li>
          <li>✅ Perfiles verificados premium</li>
          <li>💬 Chat prioritario con escorts</li>
          <li>🚀 Funciones avanzadas de la plataforma</li>
          <li>⭐ Experiencia sin restricciones</li>
        </ul>
      </div>
    </div>
  ));

  // ✅ COMPONENTE PREMIUM PARA USUARIOS AUTENTICADOS SIN POSTS
  const EmptyPremiumComponent = React.memo(() => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', flexDirection: 'column', gap: '1rem', padding: '2rem', textAlign: 'center' }}>
      <Crown size={48} style={{ color: '#ffd700' }} />
      <h3 style={{ color: 'white', fontSize: '1.1rem', margin: 0 }}>No hay contenido premium disponible</h3>
      <p style={{ color: '#9ca3af', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
        En este momento no hay posts premium publicados. El contenido premium incluye perfiles verificados y contenido exclusivo de alta calidad.
      </p>
      <div style={{ 
        background: 'rgba(255, 215, 0, 0.1)', 
        border: '1px solid rgba(255, 215, 0, 0.2)', 
        borderRadius: '12px', 
        padding: '1rem', 
        marginTop: '1rem',
        maxWidth: '300px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Crown size={16} style={{ color: '#ffd700' }} />
          <span style={{ color: '#ffd700', fontSize: '0.85rem', fontWeight: 600 }}>Tu Acceso Premium:</span>
        </div>
        <ul style={{ color: '#d1d5db', fontSize: '0.75rem', margin: 0, paddingLeft: '1rem', lineHeight: 1.4, textAlign: 'left' }}>
          <li>✅ Contenido exclusivo sin restricciones</li>
          <li>✅ Perfiles verificados premium</li>
          <li>✅ Posts de alta calidad</li>
          <li>✅ Acceso completo cuando haya contenido</li>
        </ul>
      </div>
      <motion.button 
        onClick={handleRefresh} 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          padding: '0.75rem 1.5rem', 
          background: 'linear-gradient(145deg, #ffd700 0%, #ffed4e 100%)', 
          color: '#000', 
          border: 'none', 
          borderRadius: '0.5rem', 
          fontSize: '0.9rem', 
          fontWeight: 600, 
          cursor: 'pointer',
          marginTop: '1rem'
        }}
        whileHover={{ scale: 1.05 }} 
        whileTap={{ scale: 0.95 }}
      >
        <RefreshCw size={16} />
        Actualizar
      </motion.button>
    </div>
  ));

  // ===================================================================
  // 📑 CONTENIDO DE PESTAÑAS CORREGIDO - CON VERIFICACIONES PREMIUM ACTUALIZADAS
  // ===================================================================

  const tabContent = {
    discover: () => {
      // ✅ VERIFICAR SI EL USUARIO TIENE ACCESO A DISCOVER
      if (!hasAccessToDiscover || !hasAccessToDiscover()) {
        return <UnauthenticatedDiscoverComponent />;
      }
      
      // ✅ CONTENIDO NORMAL PARA USUARIOS AUTENTICADOS
      if (loading && !refreshing) return <LoadingComponent />;
      if (error) return <LoadingComponent />;
      if (posts.length === 0) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', flexDirection: 'column', gap: '1rem', padding: '2rem', textAlign: 'center' }}>
          <Star size={48} style={{ color: '#9ca3af' }} />
          <h3 style={{ color: 'white', fontSize: '1.1rem', margin: 0 }}>No hay posts recomendados</h3>
          <p style={{ color: '#9ca3af', fontSize: '0.9rem', margin: 0 }}>Explora más contenido para recibir recomendaciones personalizadas. Los posts con boost aparecen primero.</p>
          {boostStats && boostStats.totalBoosted > 0 && (
            <div style={{ 
              background: 'rgba(255, 107, 53, 0.1)', 
              border: '1px solid rgba(255, 107, 53, 0.2)', 
              borderRadius: '8px', 
              padding: '0.5rem 1rem', 
              marginTop: '0.5rem'
            }}>
              <span style={{ color: '#ff6b35', fontSize: '0.75rem', fontWeight: 600 }}>
                🚀 {boostStats.totalBoosted} posts con boost activo en el feed
              </span>
            </div>
          )}
        </div>
      );
      return renderPostsGrid(posts);
    },
    
    overview: () => {
      if (loading && !refreshing) return <LoadingComponent />;
      if (error) return <LoadingComponent />;
      if (posts.length === 0) return <EmptyPostsComponent />;
      return renderPostsGrid(posts);
    },
    
    // ✅ TAB PREMIUM - MANEJO COMPLETO DE VERIFICACIONES
    premium: () => {
      // ✅ PRIMERA VERIFICACIÓN: Usuario no autenticado
      if (!user) {
        return <UnauthenticatedPremiumComponent />;
      }
      
      // ✅ SEGUNDA VERIFICACIÓN: Admin tiene acceso completo
      if (actualUserType === 'ADMIN') {
        if (loading && !refreshing) return <LoadingComponent showError={false} />;
        if (error) return <LoadingComponent />;
        if (posts.length === 0) return <EmptyPremiumComponent />;
        return renderPostsGrid(posts);
      }
      
      // ✅ TERCERA VERIFICACIÓN: Solo clientes pueden ver premium
      if (actualUserType !== 'CLIENT') {
        // ✅ Esta condición no debería ocurrir porque escorts/agencias no ven el tab
        // pero por seguridad adicional
        return (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', flexDirection: 'column', gap: '1rem', padding: '2rem', textAlign: 'center' }}>
            <Lock size={48} style={{ color: '#ef4444' }} />
            <h3 style={{ color: 'white', fontSize: '1.1rem', margin: 0 }}>Acceso no disponible</h3>
            <p style={{ color: '#9ca3af', fontSize: '0.9rem', margin: 0 }}>
              El contenido premium está disponible solo para clientes.
            </p>
          </div>
        );
      }
      
      // ✅ CUARTA VERIFICACIÓN: Cliente debe ser premium (usando isClientPremium)
      if (!isClientPremium || !isClientPremium()) {
        return <NonPremiumClientComponent />;
      }
      
      // ✅ VERIFICAR ERROR DE LOADING (NO mostrar error si es restricción de acceso)
      if (loading && !refreshing) {
        return <LoadingComponent showError={false} />;
      }
      
      // ✅ ERRORES TÉCNICOS REALES (no restricciones de acceso)
      if (error) {
        return (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', flexDirection: 'column', gap: '1rem', padding: '2rem', textAlign: 'center' }}>
            <Shield size={48} style={{ color: '#ef4444' }} />
            <h3 style={{ color: 'white', fontSize: '1.1rem', margin: 0 }}>No fue posible cargar el contenido PREMIUM </h3>
            <p style={{ color: '#9ca3af', fontSize: '0.9rem', margin: 0 }}>{error}</p>
            
          </div>
        );
      }
      
      // ✅ CONTENIDO NORMAL PARA CLIENTES PREMIUM
      if (posts.length === 0) return <EmptyPremiumComponent />;
      return renderPostsGrid(posts);
    },
    
    trending: () => {
      if (loading && !refreshing) return <LoadingComponent />;
      
      if (error) {
        return (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', flexDirection: 'column', gap: '1rem', padding: '2rem', textAlign: 'center' }}>
            <TrendingUp size={48} style={{ color: '#ef4444' }} />
            <h3 style={{ color: 'white', fontSize: '1.1rem', margin: 0 }}>Error cargando tendencias</h3>
            <p style={{ color: '#9ca3af', fontSize: '0.9rem', margin: 0 }}>{error}</p>
            <motion.button onClick={handleRefresh} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', background: 'linear-gradient(145deg, #ff6b35 0%, #e85a2e 100%)', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}><RefreshCw size={16} />Reintentar</motion.button>
          </div>
        );
      }
      
      if (posts.length === 0) return <EmptyTrendingComponent />;
      return renderPostsGrid(posts);
    }
  };

  // ===================================================================
  // 🎨 CSS OPTIMIZADO CON BOOST STYLES Y BOTONES REDISEÑADOS
  // ===================================================================

  React.useLayoutEffect(() => {
    const instagramCSS = `
      * { box-sizing: border-box !important; }
      body, html { overflow-x: hidden !important; max-width: 100vw !important; margin: 0 !important; padding: 0 !important; }
      
      .feed-page { width: 100vw !important; max-width: 100vw !important; overflow-x: hidden !important; min-height: 100vh !important; margin: 0 !important; padding: 0 !important; position: relative !important; }
      .feed-content { width: 100% !important; max-width: 100% !important; margin: 0 auto !important; padding: 1rem !important; display: flex !important; justify-content: center !important; position: relative !important; z-index: 1 !important; margin-top: ${isAuthenticated ? '120px' : '130px'} !important; }
      .feed-overview-container { width: 100% !important; max-width: 480px !important; margin: 0 auto !important; display: flex !important; flex-direction: column !important; align-items: center !important; }
      
      .feed-navigation { position: absolute !important; top: ${isAuthenticated ? '50px' : '60px'} !important; left: 0 !important; right: 0 !important; z-index: 999 !important; background: transparent !important; backdrop-filter: blur(20px) !important; padding: 0.5rem 1rem !important; display: flex !important; justify-content: center !important; margin-bottom: 0px !important; }
      .feed-tabs-container { display: flex !important; gap: 0.3rem !important; background: rgba(20, 20, 20, 0.85) !important; padding: 0.35rem !important; border-radius: 0.8rem !important; border: 1px solid rgba(255, 255, 255, 0.1) !important; overflow-x: auto !important; scrollbar-width: none !important; max-width: 95vw !important; width: fit-content !important; }
      .feed-tabs-container::-webkit-scrollbar { display: none !important; }
      .feed-tab-button { display: flex !important; align-items: center !important; gap: 0.3rem !important; padding: 0.5rem 0.8rem !important; border: none !important; border-radius: 0.6rem !important; font-size: 0.75rem !important; font-weight: 600 !important; cursor: pointer !important; white-space: nowrap !important; flex-shrink: 0 !important; transition: all 0.3s ease !important; min-width: fit-content !important; }
      .feed-tab-button.active { background: linear-gradient(135deg, #ff6b35, #e85a2e) !important; color: white !important; }
      .feed-tab-button.inactive { background: transparent !important; color: #9ca3af !important; }
      
      .feed-main-content { width: 100% !important; max-width: 480px !important; margin: 0 auto !important; }
      .feed-posts-container { display: flex !important; flex-direction: column !important; align-items: center !important; gap: 1.5rem !important; width: 100% !important; margin-bottom: 100px !important; }
      .feed-post-card { width: 100% !important; max-width: 480px !important; margin: 0 auto !important; position: relative !important; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important; }
      
      .feed-post-card.boosted-post { 
        animation: boostGlow 3s ease-in-out infinite !important;
      }
      
      @keyframes boostGlow {
        0%, 100% { 
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3) !important;
        }
        50% { 
          box-shadow: 0 8px 32px rgba(255, 215, 0, 0.3), 0 4px 16px rgba(255, 107, 53, 0.2) !important;
        }
      }

      @keyframes spin { 
        0% { transform: rotate(0deg); } 
        100% { transform: rotate(360deg); } 
      }
      
      .instagram-post-container { background: #1a1a1a !important; border-radius: 8px !important; overflow: hidden !important; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3) !important; border: 1px solid rgba(255, 255, 255, 0.1) !important; position: relative !important; }
      .instagram-header { display: flex !important; align-items: center !important; padding: 12px 16px !important; background: #1a1a1a !important; border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important; }
      .instagram-profile-image { width: 32px !important; height: 32px !important; border-radius: 50% !important; object-fit: cover !important; margin-right: 12px !important; cursor: pointer !important; }
      .instagram-profile-info { flex: 1 !important; }
      .instagram-profile-name { font-size: 14px !important; font-weight: 600 !important; color: #ffffff !important; margin: 0 !important; display: flex !important; align-items: center !important; gap: 4px !important; cursor: pointer !important; line-height: 1.2 !important; }
      .instagram-profile-location { display: flex !important; align-items: center !important; gap: 4px !important; color: #9ca3af !important; font-size: 11px !important; font-weight: 400 !important; margin-top: 2px !important; }
      
      .instagram-image-container { position: relative !important; width: 100% !important; min-height: 400px !important; max-height: 600px !important; background: #000000 !important; display: flex !important; align-items: center !important; justify-content: center !important; overflow: hidden !important; }
      .instagram-post-image { width: 100% !important; height: 100% !important; object-fit: contain !important; object-position: center !important; display: block !important; }
      .instagram-no-image { width: 100% !important; height: 100% !important; display: flex !important; align-items: center !important; justify-content: center !important; color: #737373 !important; background: #fafafa !important; }
      
      .boost-indicator {
        animation: boostPulse 2s ease-in-out infinite !important;
      }
      
      @keyframes boostPulse {
        0%, 100% { transform: scale(1) !important; }
        50% { transform: scale(1.05) !important; }
      }
      
      .elegant-arrow { position: absolute !important; top: 50% !important; transform: translateY(-50%) !important; width: 40px !important; height: 40px !important; display: flex !important; align-items: center !important; justify-content: center !important; cursor: pointer !important; z-index: 15 !important; background: rgba(0, 0, 0, 0.5) !important; backdrop-filter: blur(8px) !important; border-radius: 50% !important; border: 2px solid rgba(255, 255, 255, 0.2) !important; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important; opacity: 0 !important; }
      .elegant-prev { left: 16px !important; }
      .elegant-next { right: 16px !important; }
      .instagram-image-container:hover .elegant-arrow { opacity: 0.8 !important; }
      .elegant-arrow:hover { opacity: 1 !important; background: rgba(0, 0, 0, 0.7) !important; border-color: rgba(255, 255, 255, 0.4) !important; transform: translateY(-50%) scale(1.1) !important; }
      .elegant-arrow:active { transform: translateY(-50%) scale(0.95) !important; }
      
      .instagram-stats-overlay { position: absolute !important; top: 8px !important; right: 8px !important; background: rgba(0, 0, 0, 0.8) !important; border-radius: 12px !important; padding: 4px 8px !important; color: white !important; font-size: 11px !important; font-weight: 600 !important; display: flex !important; align-items: center !important; gap: 4px !important; }
      .instagram-image-indicators { position: absolute !important; bottom: 12px !important; left: 50% !important; transform: translateX(-50%) !important; display: flex !important; gap: 6px !important; z-index: 10 !important; background: rgba(0, 0, 0, 0.4) !important; padding: 6px 10px !important; border-radius: 12px !important; backdrop-filter: blur(8px) !important; }
      .instagram-indicator { width: 8px !important; height: 8px !important; border-radius: 50% !important; background: rgba(255, 255, 255, 0.5) !important; cursor: pointer !important; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important; border: 1px solid rgba(255, 255, 255, 0.2) !important; }
      .instagram-indicator:hover { background: rgba(255, 107, 53, 0.8) !important; transform: scale(1.2) !important; border-color: rgba(255, 107, 53, 0.4) !important; }
      .instagram-indicator.active { background: #ff6b35 !important; transform: scale(1.3) !important; border-color: rgba(255, 107, 53, 0.6) !important; box-shadow: 0 2px 8px rgba(255, 107, 53, 0.4) !important; }
      
      /* ✅ BOTONES REDISEÑADOS - MÁS CUADRADOS Y POSICIONADOS A LA IZQUIERDA CON LIKES A LA DERECHA */
      .modern-actions-overlay { 
        padding: 8px 16px !important; 
        background: #1a1a1a !important; 
        border-top: 1px solid rgba(255, 255, 255, 0.1) !important; 
        display: flex !important; 
        align-items: center !important; 
        justify-content: space-between !important; /* ✅ CAMBIO: Space-between para separar botones y likes */
      }
      
      .action-buttons-left {
        display: flex !important;
        gap: 12px !important;
        align-items: center !important;
      }
      
      .likes-counter-right {
        margin-left: auto !important;
      }
      
      .modern-action-btn { 
        width: 36px !important; 
        height: 36px !important; 
        padding: 0 !important; 
        background: rgba(0, 0, 0, 0.7) !important; 
        border: 1px solid rgba(255, 255, 255, 0.3) !important; 
        cursor: pointer !important; 
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important; 
        border-radius: 8px !important; /* ✅ CAMBIO: Menos redondos (antes 50%) */
        display: flex !important; 
        align-items: center !important; 
        justify-content: center !important; 
        box-shadow: 0 3px 12px rgba(0, 0, 0, 0.3), 0 1px 4px rgba(0, 0, 0, 0.2) !important; 
        position: relative !important; 
      }
      
      .modern-action-btn.disabled { opacity: 0.6 !important; cursor: not-allowed !important; pointer-events: none !important; }
      
      .modern-actions-overlay.single-button .modern-action-btn { width: 40px !important; height: 40px !important; }
      .modern-actions-overlay.two-buttons .modern-action-btn { width: 38px !important; height: 38px !important; }
      .modern-actions-overlay.multiple-buttons .modern-action-btn { width: 36px !important; height: 36px !important; }
      
      .modern-action-btn:hover { transform: scale(1.1) translateY(-1px) !important; background: rgba(0, 0, 0, 0.85) !important; border-color: rgba(255, 255, 255, 0.6) !important; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4), 0 2px 6px rgba(0, 0, 0, 0.3) !important; }
      .modern-action-btn:active { transform: scale(0.95) !important; }
      
      .modern-action-btn.flame-btn { background: linear-gradient(145deg, #ff6b35 0%, #e85a2e 100%) !important; border: 1px solid rgba(255, 255, 255, 0.4) !important; box-shadow: 0 3px 12px rgba(255, 107, 53, 0.4), 0 1px 4px rgba(0, 0, 0, 0.2) !important; width: 40px !important; height: 40px !important; }
      .modern-action-btn.flame-btn:hover { background: linear-gradient(145deg, #e85a2e 0%, #d14a22 100%) !important; border-color: rgba(255, 255, 255, 0.7) !important; box-shadow: 0 4px 16px rgba(255, 107, 53, 0.5), 0 2px 6px rgba(0, 0, 0, 0.3) !important; }
      .modern-action-btn.flame-btn.active { background: linear-gradient(145deg, #dc2626 0%, #b91c1c 100%) !important; border-color: rgba(255, 255, 255, 0.7) !important; box-shadow: 0 4px 16px rgba(220, 38, 38, 0.4), 0 2px 6px rgba(0, 0, 0, 0.3) !important; }
      .modern-action-btn.flame-btn.active:hover { background: linear-gradient(145deg, #b91c1c 0%, #991b1b 100%) !important; box-shadow: 0 5px 20px rgba(220, 38, 38, 0.5), 0 3px 8px rgba(0, 0, 0, 0.4) !important; }
      
      .modern-action-btn.whatsapp-btn { background: rgba(37, 211, 102, 0.9) !important; border: 1px solid rgba(255, 255, 255, 0.4) !important; box-shadow: 0 3px 12px rgba(37, 211, 102, 0.3), 0 1px 4px rgba(0, 0, 0, 0.2) !important; }
      .modern-action-btn.whatsapp-btn:hover { background: rgba(37, 211, 102, 1) !important; border-color: rgba(255, 255, 255, 0.7) !important; box-shadow: 0 4px 16px rgba(37, 211, 102, 0.4), 0 2px 6px rgba(0, 0, 0, 0.3) !important; }
      
      .modern-action-btn.chat-btn { background: rgba(255, 107, 53, 0.9) !important; border: 1px solid rgba(255, 255, 255, 0.4) !important; box-shadow: 0 3px 12px rgba(255, 107, 53, 0.3), 0 1px 4px rgba(0, 0, 0, 0.2) !important; }
      .modern-action-btn.chat-btn:hover { background: rgba(255, 107, 53, 1) !important; border-color: rgba(255, 255, 255, 0.7) !important; box-shadow: 0 4px 16px rgba(255, 107, 53, 0.4), 0 2px 6px rgba(0, 0, 0, 0.3) !important; }
      
      .modern-action-btn.invite-btn { background: rgba(59, 130, 246, 0.9) !important; border: 1px solid rgba(255, 255, 255, 0.4) !important; box-shadow: 0 3px 12px rgba(59, 130, 246, 0.3), 0 1px 4px rgba(0, 0, 0, 0.2) !important; }
      .modern-action-btn.invite-btn:hover { background: rgba(59, 130, 246, 1) !important; border-color: rgba(255, 255, 255, 0.7) !important; box-shadow: 0 4px 16px rgba(59, 130, 246, 0.4), 0 2px 6px rgba(0, 0, 0, 0.3) !important; }
      
      .modern-action-btn.ban-btn { background: rgba(239, 68, 68, 0.9) !important; border: 1px solid rgba(255, 255, 255, 0.4) !important; box-shadow: 0 3px 12px rgba(239, 68, 68, 0.3), 0 1px 4px rgba(0, 0, 0, 0.2) !important; }
      .modern-action-btn.ban-btn:hover { background: rgba(239, 68, 68, 1) !important; border-color: rgba(255, 255, 255, 0.7) !important; box-shadow: 0 4px 16px rgba(239, 68, 68, 0.4), 0 2px 6px rgba(0, 0, 0, 0.3) !important; }
      
      .own-post-indicator { background: rgba(16, 185, 129, 0.9) !important; border: 1px solid rgba(255, 255, 255, 0.4) !important; border-radius: 18px !important; padding: 6px 14px !important; color: white !important; font-size: 11px !important; font-weight: 600 !important; display: flex !important; align-items: center !important; gap: 5px !important; box-shadow: 0 3px 12px rgba(16, 185, 129, 0.3), 0 1px 4px rgba(0, 0, 0, 0.2) !important; text-shadow: none !important; white-space: nowrap !important; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important; user-select: none !important; pointer-events: none !important; }
      .own-post-indicator:hover { transform: scale(1.05) !important; background: rgba(16, 185, 129, 1) !important; border-color: rgba(255, 255, 255, 0.6) !important; box-shadow: 0 4px 16px rgba(16, 185, 129, 0.4), 0 2px 6px rgba(0, 0, 0, 0.3) !important; }
      
      .instagram-content { padding: 8px 16px 12px 16px !important; background: #1a1a1a !important; }
      .instagram-title { font-size: 14px !important; font-weight: 600 !important; color: #ffffff !important; margin: 0 0 4px 0 !important; line-height: 1.3 !important; }
      .instagram-description-container { margin-bottom: 8px !important; }
      .instagram-description { font-size: 14px !important; font-weight: 400 !important; color: #ffffff !important; margin: 0 !important; line-height: 1.4 !important; }
      .instagram-read-more { color: #9ca3af !important; background: none !important; border: none !important; font-size: 14px !important; font-weight: 400 !important; cursor: pointer !important; padding: 0 !important; }
      .instagram-sexo { margin-bottom: 8px !important; }
      .instagram-sexo-tag { background: linear-gradient(135deg, #ff6b35, #e85a2e) !important; color: white !important; font-size: 11px !important; font-weight: 600 !important; padding: 2px 6px !important; border-radius: 4px !important; }
      .instagram-services { display: flex !important; flex-wrap: wrap !important; gap: 4px !important; margin-bottom: 4px !important; }
      .instagram-service-tag { color: #0095f6 !important; font-size: 13px !important; font-weight: 400 !important; cursor: pointer !important; }
      .instagram-more-services { color: #9ca3af !important; font-size: 13px !important; font-weight: 400 !important; }
      
      .like-hearts-container { position: absolute !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; pointer-events: none !important; z-index: 20 !important; overflow: hidden !important; }
      .floating-heart { position: absolute !important; color: #ed4956 !important; font-size: 24px !important; pointer-events: none !important; z-index: 25 !important; }
      
      @media (max-width: 768px) {
        .feed-navigation { position: absolute !important; top: 40px !important; z-index: 999 !important; padding: 0.3rem !important; }
        .feed-content { margin-top: 95px !important; padding: 0.5rem !important; }
        .feed-tabs-container { gap: 0.2rem !important; padding: 0.3rem !important; border-radius: 0.6rem !important; max-width: 92vw !important; }
        .feed-tab-button { padding: 0.4rem 0.6rem !important; gap: 0.2rem !important; font-size: 0.7rem !important; border-radius: 0.5rem !important; min-width: auto !important; }
        .instagram-post-container { border-radius: 6px !important; }
        .instagram-header { padding: 10px 12px !important; }
        .instagram-profile-image { width: 28px !important; height: 28px !important; margin-right: 10px !important; }
        .instagram-profile-name { font-size: 13px !important; }
        .instagram-profile-location { font-size: 10px !important; }
        .instagram-content { padding: 6px 12px 10px 12px !important; }
        .instagram-title { font-size: 13px !important; }
        .instagram-description { font-size: 13px !important; }
        .instagram-read-more { font-size: 13px !important; }
        .instagram-service-tag { font-size: 12px !important; }
        .instagram-more-services { font-size: 12px !important; }
        .modern-actions-overlay { padding: 6px 12px !important; }
        .action-buttons-left { gap: 10px !important; }
        .elegant-arrow { width: 32px !important; height: 32px !important; }
        .elegant-prev { left: 12px !important; }
        .elegant-next { right: 12px !important; }
        .modern-action-btn { width: 32px !important; height: 32px !important; }
        .modern-actions-overlay.single-button .modern-action-btn { width: 36px !important; height: 36px !important; }
        .modern-actions-overlay.two-buttons .modern-action-btn { width: 34px !important; height: 34px !important; }
        .modern-action-btn.flame-btn { width: 36px !important; height: 36px !important; }
        .instagram-image-indicators { bottom: 10px !important; padding: 4px 8px !important; }
        .instagram-indicator { width: 6px !important; height: 6px !important; }
      }
      
      @media (max-width: 480px) {
        .feed-tabs-container { max-width: 90vw !important; gap: 0.15rem !important; }
        .feed-tab-button { padding: 0.35rem 0.5rem !important; font-size: 0.65rem !important; gap: 0.15rem !important; }
        .feed-tab-button svg { width: 14px !important; height: 14px !important; }
      }
    `;
    
    ['optimized-feed-fix', 'forced-navigation-top', 'instagram-card-styles', 'modern-post-styles', 'modern-post-styles-updated', 'modern-post-styles-optimized', 'modern-post-styles-refactored', 'modern-post-styles-with-sexo', 'instagram-feed-styles', 'instagram-feed-styles-elegant-arrows', 'instagram-feed-styles-fixed', 'instagram-feed-styles-final', 'instagram-feed-styles-optimized', 'instagram-feed-styles-fixed-spacing', 'instagram-feed-styles-with-navigation-fix', 'instagram-feed-styles-absolute-navigation', 'instagram-feed-styles-premium-trending-fixed', 'instagram-feed-styles-trending-complete-fixed', 'instagram-feed-styles-boost-optimized', 'instagram-feed-styles-unauthenticated-restrictions', 'instagram-feed-styles-premium-verified', 'instagram-feed-styles-agency-fix', 'instagram-feed-styles-stale-closure-fix', 'instagram-feed-styles-turnstile-complete', 'instagram-feed-styles-turnstile-fixed', 'instagram-feed-styles-antibot-system', 'instagram-feed-styles-simple-checkbox'].forEach(id => {
      const style = document.getElementById(id);
      if (style) style.remove();
    });
    
    const style = document.createElement('style');
    style.id = 'instagram-feed-styles-redesigned-buttons';
    style.textContent = instagramCSS;
    document.head.appendChild(style);
    
    return () => {
      const styleToRemove = document.getElementById('instagram-feed-styles-redesigned-buttons');
      if (styleToRemove) styleToRemove.remove();
    };
  }, [isAuthenticated]);

  // ===================================================================
  // 🔧 RENDERIZADO CONDICIONAL PRINCIPAL
  // ===================================================================

  if (currentView === 'profile' && selectedProfileId) {
    return (
      <EscortProfile
        profileId={selectedProfileId}
        initialData={selectedProfileData}
        onBack={handleBackToFeed}
        onStartChat={() => handleBackToFeed()}
        onToggleLike={(postData) => postData?.id && handleToggleLikeAndFavorite(postData.id)}
        onWhatsApp={handleWhatsAppWithVerification} // ✅ ACTUALIZADO: Usar Checkbox Anti-Bot
        onBanUser={(profile) => {
          if (actualUserType === 'ADMIN') {
            setShowBanModal(profile);
            handleBackToFeed();
          }
        }}
        userType={actualUserType}
      />
    );
  }

  if (currentView === 'chat' && chatTargetUserId) {
    return (
      <ChatPage
        userType={actualUserType.toLowerCase()}
        targetUserId={chatTargetUserId}
        onBack={handleBackToFeedFromChat}
      />
    );
  }

  return (
    <div className="feed-page">
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: `radial-gradient(circle at 20% 30%, rgba(255, 107, 53, 0.2) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(255, 107, 53, 0.15) 0%, transparent 50%), radial-gradient(circle at 50% 50%, rgba(0, 0, 0, 0.7) 0%, transparent 70%)`, pointerEvents: 'none', zIndex: 0 }} />

      <div className="feed-navigation">
        <div className="feed-tabs-container">
          {config.tabs.map((tab) => (
            <motion.button
              key={tab.id}
              className={`feed-tab-button ${activeTab === tab.id ? 'active' : 'inactive'}`}
              onClick={() => handleTabChange(tab.id)}
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }}
            >
              {tab.icon === 'Heart' && <Heart size={16} style={{ color: activeTab === tab.id ? 'white' : '#e91e63' }} />}
              {tab.icon === 'Search' && <Search size={16} style={{ color: activeTab === tab.id ? 'white' : '#2196f3' }} />}
              {tab.icon === 'Star' && <Star size={16} style={{ color: activeTab === tab.id ? 'white' : '#ff9800' }} />}
              {tab.icon === 'TrendingUp' && <TrendingUp size={16} style={{ color: activeTab === tab.id ? 'white' : '#4caf50' }} />}
              {tab.icon === 'Shield' && <Crown size={16} style={{ color: activeTab === tab.id ? 'white' : '#ffd700' }} />}
              {tab.icon === 'Building2' && <Building2 size={16} style={{ color: activeTab === tab.id ? 'white' : '#9c27b0' }} />}
              <span>{tab.label}</span>
              {boostStats && boostStats.totalBoosted > 0 && (tab.id === 'trending' || tab.id === 'discover') && (
                <motion.div
                  style={{
                    background: 'linear-gradient(135deg, #ffd700, #ffed4e)',
                    color: '#000',
                    borderRadius: '50%',
                    width: '16px',
                    height: '16px',
                    fontSize: '8px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: '4px'
                  }}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {boostStats.totalBoosted}
                </motion.div>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      <div className="feed-content">
        <AnimatePresence mode="wait">
          {(['discover', 'overview', 'premium', 'trending'].includes(activeTab)) && (
            <motion.div 
              key={activeTab} 
              className="feed-overview-container"
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="feed-main-content">
                {tabContent[activeTab]()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showAuthModal && <AuthModal />}
        
        {/* ✅ MODAL CHECKBOX ANTI-BOT PARA WHATSAPP (REEMPLAZA TURNSTILE) */}
        {showWhatsAppVerification && <SimpleRobotCheckModal />}
        
        {showBanModal && (
          <motion.div
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.9)', backdropFilter: 'blur(20px)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowBanModal(null)}
          >
            <motion.div
              style={{ background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.98) 0%, rgba(30, 30, 30, 0.95) 100%)', borderRadius: '1rem', padding: '2rem', width: '100%', maxWidth: '400px', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)' }}
              initial={{ opacity: 0, scale: 0.9, y: 50 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 50 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <Ban size={48} style={{ color: '#ef4444', marginBottom: '1rem' }} />
                <h3 style={{ color: 'white', fontSize: '1.2rem', margin: 0, marginBottom: '0.5rem' }}>Banear Usuario</h3>
                <p style={{ color: '#9ca3af', fontSize: '0.9rem', margin: 0 }}>
                  ¿Estás seguro de que quieres banear a {showBanModal.author?.firstName || showBanModal.name}?
                </p>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <motion.button
                  onClick={() => setShowBanModal(null)}
                  style={{ flex: 1, padding: '0.75rem 1.5rem', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '0.5rem', color: 'white', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}
                  whileHover={{ scale: 1.02, background: 'rgba(255, 255, 255, 0.15)' }} whileTap={{ scale: 0.98 }}
                >
                  Cancelar
                </motion.button>
                <motion.button
                  onClick={confirmBan}
                  style={{ flex: 1, padding: '0.75rem 1.5rem', background: 'linear-gradient(145deg, #ef4444 0%, #dc2626 100%)', border: 'none', borderRadius: '0.5rem', color: 'white', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                >
                  Banear
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FeedPageDesign;