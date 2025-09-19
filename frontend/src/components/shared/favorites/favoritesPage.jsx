import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, 
  Search, 
  User,
  MessageCircle,
  MapPin,
  Verified,
  ChevronLeft,
  ChevronRight,
  X,
  Flame,
  Loader,
  AlertCircle,
  RefreshCw,
  UserPlus,
  Ban
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { favoritesAPI, chatAPI, handleApiError } from '../../../utils/api';
import EscortProfile from '../Profiles/EscortModal';
import ChatPage from '../chat/ChatPage';

const FavoritesPage = () => {
  const { user, isAuthenticated } = useAuth();
  
  // Estados principales
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Estados para navegación
  const [currentView, setCurrentView] = useState('favorites');
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [selectedProfileData, setSelectedProfileData] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState({});
  const [userLikesAndFavorites, setUserLikesAndFavorites] = useState(new Set());
  const [likeAnimations, setLikeAnimations] = useState({});
  const [mobilePostsVisible, setMobilePostsVisible] = useState({});
  
  // ✅ NUEVOS ESTADOS PARA CHAT - IGUAL QUE FEEDPAGE
  const [chatTargetUserId, setChatTargetUserId] = useState(null);
  const [chatTargetUserData, setChatTargetUserData] = useState(null);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    userType: '',
    location: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
    hasNext: false,
    hasPrev: false
  });

  // ✅ FUNCIÓN PARA CREAR/OBTENER CHAT - IGUAL QUE FEEDPAGE
  const createChatWithUser = useCallback(async (targetUserId, targetUserData = null) => {
    try {
      console.log('💬 Creating/getting chat with user:', {
        targetUserId,
        currentUserId: user?.id,
        targetUserData: targetUserData ? `${targetUserData.firstName} ${targetUserData.lastName}` : 'Unknown'
      });

      setIsCreatingChat(true);

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
      
      // ✅ MANEJO DE ERRORES ESPECÍFICOS OPTIMIZADO
      const errorCodes = {
        'CANNOT_CHAT_WITH_SELF': 'No puedes chatear contigo mismo',
        'USER_NOT_FOUND': 'Usuario no encontrado o no disponible',
        'DIRECT_MESSAGES_DISABLED': 'Este usuario no permite mensajes directos',
        'USER_BLOCKED_YOU': 'No puedes enviar mensajes a este usuario',
        'YOU_BLOCKED_USER': 'Has bloqueado a este usuario',
        'CHAT_LIMIT_REACHED': 'Has alcanzado el límite de chats permitidos'
      };
      
      const specificError = errorCodes[error.response?.data?.errorCode];

      return {
        success: false,
        error: specificError || errorMessage
      };
    } finally {
      setIsCreatingChat(false);
    }
  }, [user?.id]);

  // ✅ FUNCIÓN PARA CARGAR FAVORITOS - SIMPLIFICADA Y CON MEJOR MANEJO DE ERRORES
  const loadFavorites = useCallback(async (showLoader = true) => {
    try {
      console.log('🔍 === INICIANDO CARGA DE FAVORITOS ===');
      console.log('🔍 Parámetros:', { showLoader, page: pagination.page, filters, searchTerm });
      
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      
      setError(null);

      const requestParams = {
        page: pagination.page,
        limit: pagination.limit,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        ...(filters.userType && { userType: filters.userType }),
        ...(searchTerm.trim() && { q: searchTerm.trim() })
      };

      console.log('📤 Llamando a favoritesAPI.getFavorites con:', requestParams);
      
      const response = await favoritesAPI.getFavorites(requestParams);
      
      console.log('📦 Respuesta recibida:', response);
      
      if (response.success && response.data) {
        console.log('✅ Respuesta exitosa, procesando datos...');
        
        if (response.data.favorites && Array.isArray(response.data.favorites)) {
          // ✅ TRANSFORMAR FAVORITOS A FORMATO DE POSTS DEL FEED
          const postsFromFavorites = response.data.favorites.map((fav, index) => {
            console.log(`📋 Procesando favorito ${index + 1}:`, fav);
            
            const post = fav.post;
            const author = post.author;
            
            return {
              id: post.id,
              authorId: author.id,
              title: post.title,
              description: post.description,
              images: post.images || [],
              services: Array.isArray(post.services) ? post.services : [],
              phone: post.phone,
              location: post.locationRef ? {
                city: post.locationRef.city,
                country: post.locationRef.country,
                state: post.locationRef.state
              } : null,
              age: author.escort?.age || null,
              verified: author.escort?.isVerified || author.agency?.isVerified || false,
              premium: post.premiumOnly || false,
              isActive: post.isActive,
              createdAt: post.createdAt,
              updatedAt: post.updatedAt,
              likesCount: post._count?.likes || 0,
              favoritesCount: post._count?.favorites || 0,
              views: post.views || 0,
              score: post.score || 0,
              engagementRate: post.engagementRate || 0,
              isLiked: true,
              isFavorited: true,
              author: {
                id: author.id,
                username: author.username,
                firstName: author.firstName,
                lastName: author.lastName,
                avatar: author.avatar,
                userType: author.userType,
                isActive: author.isActive,
                isBanned: author.isBanned,
                escort: author.escort,
                agency: author.agency
              },
              favoriteId: fav.id,
              favoriteCreatedAt: fav.createdAt,
              isNotified: fav.isNotified
            };
          });

          console.log('🎯 Posts transformados:', postsFromFavorites.length);
          
          setFavorites(postsFromFavorites);
          
          if (response.data.pagination) {
            setPagination(response.data.pagination);
          }

          const favoritedIds = new Set(postsFromFavorites.map(post => post.id));
          setUserLikesAndFavorites(favoritedIds);

          console.log('✅ Favoritos cargados exitosamente:', postsFromFavorites.length);
        } else {
          console.log('⚠️ No hay favoritos en la respuesta');
          setFavorites([]);
          setPagination(prev => ({ ...prev, total: 0, pages: 0 }));
        }
      } else {
        console.log('❌ Respuesta no exitosa:', response);
        setFavorites([]);
        setError(response.message || 'Error cargando favoritos');
      }
    } catch (error) {
      console.error('❌ Error completo cargando favoritos:', error);
      setError(error.message || 'Error de conexión al cargar favoritos');
      setFavorites([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      console.log('🏁 Carga de favoritos finalizada');
    }
  }, [pagination.page, pagination.limit, filters.sortBy, filters.sortOrder, filters.userType, searchTerm]);

  // ✅ FUNCIÓN PARA REMOVER FAVORITO
  const handleToggleLikeAndFavorite = async (postId) => {
    try {
      const originalFavorites = [...favorites];
      const originalTotal = pagination.total;
      
      const updatedFavorites = favorites.filter(fav => fav.id !== postId);
      setFavorites(updatedFavorites);
      setPagination(prev => ({ ...prev, total: prev.total - 1 }));
      
      setUserLikesAndFavorites(prev => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });

      const response = await favoritesAPI.removeFromFavorites(postId);
      
      if (!response.success) {
        setFavorites(originalFavorites);
        setPagination(prev => ({ ...prev, total: originalTotal }));
        setUserLikesAndFavorites(prev => {
          const newSet = new Set(prev);
          newSet.add(postId);
          return newSet;
        });
        throw new Error(response.message || 'Error removiendo favorito');
      }

    } catch (error) {
      console.error('❌ Error removiendo favorito:', error);
      setError(handleApiError(error));
    }
  };

  // ✅ COMPONENT AVATAR REUTILIZABLE
  const ProfileAvatar = ({ src, alt, className, style, verified = false, onClick }) => {
    const [imageError, setImageError] = React.useState(false);
    const [imageLoaded, setImageLoaded] = React.useState(false);

    const hasValidSrc = src && src.trim() !== '';

    return (
      <div 
        style={{ 
          position: 'relative', 
          cursor: onClick ? 'pointer' : 'default',
          ...style 
        }} 
        onClick={onClick}
      >
        {hasValidSrc && !imageError ? (
          <img
            src={src}
            alt={alt}
            className={className}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            style={{
              opacity: imageLoaded ? 1 : 0,
              transition: 'opacity 0.3s ease'
            }}
          />
        ) : null}
        
        {(!hasValidSrc || imageError || !imageLoaded) && (
          <div 
            className={className}
            style={{
              background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9ca3af',
              fontSize: className?.includes('modern-profile-image') ? '18px' : '32px',
              fontWeight: 500,
              position: hasValidSrc && !imageError ? 'absolute' : 'static',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: (!hasValidSrc || imageError) ? 1 : (imageLoaded ? 0 : 1),
              transition: 'opacity 0.3s ease'
            }}
          >
            <User size={className?.includes('modern-profile-image') ? 20 : 40} />
          </div>
        )}
        
        {verified && (
          <Verified 
            size={16} 
            style={{ 
              position: 'absolute', 
              bottom: '0px', 
              right: '0px', 
              color: '#3b82f6', 
              background: 'white', 
              borderRadius: '50%', 
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)' 
            }} 
          />
        )}
      </div>
    );
  };

  // ✅ FUNCIONES DE NAVEGACIÓN
  const nextImage = (postId) => {
    const post = favorites.find(p => p.id === postId);
    if (!post || !post.images || post.images.length <= 1) return;
    
    const currentIndex = currentImageIndex[postId] || 0;
    const nextIndex = (currentIndex + 1) % post.images.length;
    
    setCurrentImageIndex(prev => ({
      ...prev,
      [postId]: nextIndex
    }));
  };

  const prevImage = (postId) => {
    const post = favorites.find(p => p.id === postId);
    if (!post || !post.images || post.images.length <= 1) return;
    
    const currentIndex = currentImageIndex[postId] || 0;
    const prevIndex = currentIndex === 0 ? post.images.length - 1 : currentIndex - 1;
    
    setCurrentImageIndex(prev => ({
      ...prev,
      [postId]: prevIndex
    }));
  };

  const handleProfileClick = (post) => {
    const userId = post.authorId || post.userId || post.author?.id;
    if (!userId) return;
    
    const initialProfileData = {
      id: userId, authorId: userId, userId: userId,
      name: post.author ? `${post.author.firstName} ${post.author.lastName}` : post.name,
      firstName: post.author?.firstName || '', 
      lastName: post.author?.lastName || '',
      username: post.author?.username || '', 
      avatar: post.author?.avatar || post.profileImage || post.images?.[0] || '',
      age: post.age || post.author?.escort?.age || null,
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
      author: post.author
    };
    
    setSelectedProfileId(userId);
    setSelectedProfileData(initialProfileData);
    setCurrentView('profile');
  };

  // ✅ FUNCIONES DE NAVEGACIÓN ENTRE VISTAS - IGUAL QUE FEEDPAGE
  const handleBackToFeed = useCallback(() => {
    setCurrentView('favorites');
    setSelectedProfileId(null);
    setSelectedProfileData(null);
    setChatTargetUserId(null);
    setChatTargetUserData(null);
    setIsCreatingChat(false);
  }, []);

  const handleBackToFeedFromChat = useCallback(() => {
    setCurrentView('favorites');
    setChatTargetUserId(null);
    setChatTargetUserData(null);
    setIsCreatingChat(false);
  }, []);

  const isMobile = () => window.innerWidth <= 768;

  const handleMobilePostToggle = (postId, event) => {
    if (!isMobile()) return;
    
    const target = event.target;
    const clickedOnButton = target.closest('button') || 
                           target.closest('.modern-action-btn') ||
                           target.closest('.modern-nav-button') ||
                           target.closest('[data-interactive="true"]');
    
    if (clickedOnButton) return;
    
    setMobilePostsVisible(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
    
    event.stopPropagation();
  };

  const handleLikeWithAnimation = (postId, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const container = event.currentTarget.closest('.modern-post-container');
    const containerRect = container.getBoundingClientRect();
    
    const x = rect.left - containerRect.left + rect.width / 2;
    const y = rect.top - containerRect.top + rect.height / 2;
    
    const animationId = `${postId}-${Date.now()}`;
    const hearts = Array.from({ length: 5 }, (_, i) => ({
      id: `${animationId}-${i}`,
      x: x + (Math.random() - 0.5) * 40,
      y: y + (Math.random() - 0.5) * 20,
      delay: i * 100
    }));
    
    setLikeAnimations(prev => ({ ...prev, [postId]: hearts }));
    
    setTimeout(() => {
      setLikeAnimations(prev => {
        const newAnimations = { ...prev };
        delete newAnimations[postId];
        return newAnimations;
      });
    }, 2500);
    
    handleToggleLikeAndFavorite(postId);
  };

  // ✅ FUNCIÓN DE CHAT - IGUAL QUE FEEDPAGE
  const handleChatAction = useCallback((post) => {
    if (isCreatingChat) return;
    
    const targetUserId = post.author?.id || post.authorId || post.userId;
    if (!targetUserId) return;

    setIsCreatingChat(true);
    
    const targetUserData = {
      id: targetUserId, 
      firstName: post.author?.firstName || '', 
      lastName: post.author?.lastName || '',
      username: post.author?.username || '', 
      avatar: post.author?.avatar || post.profileImage || post.images?.[0] || '',
      userType: post.author?.userType || 'ESCORT', 
      isActive: true,
      phone: post.phone || post.author?.phone || '', 
      location: post.location || post.author?.location || 'República Dominicana'
    };
    
    setChatTargetUserId(targetUserId);
    setChatTargetUserData(targetUserData);
    setCurrentView('chat');
    
    setTimeout(() => setIsCreatingChat(false), 1000);
  }, [isCreatingChat]);

  // ✅ FUNCIÓN PARA INICIAR CHAT - IGUAL QUE FEEDPAGE
  const handleStartChat = useCallback(async (post) => {
    console.log(`💬 Iniciando chat con: ${post.author?.firstName || post.name}`);
    
    const targetUserId = post.author?.id || post.authorId || post.userId;
    
    if (!targetUserId) {
      console.error('❌ No se pudo extraer el ID del usuario del post:', post);
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

  const WhatsAppIcon = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.465 3.488"/>
    </svg>
  );

  const handleWhatsApp = (phone) => {
    if (phone) {
      window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}`, '_blank');
    }
  };

  // ✅ RENDERIZAR POSTS GRID - CON INTEGRACIÓN DE CHAT
  const renderPostsGrid = () => (
    <div className="feed-posts-container">
      {favorites.map((post, index) => (
        <motion.div
          key={post.id}
          className={`feed-post-card ${mobilePostsVisible[post.id] ? 'mobile-active' : ''}`}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          onClick={(e) => handleMobilePostToggle(post.id, e)}
          style={{ cursor: isMobile() ? 'pointer' : 'default' }}
        >
          <div className="modern-post-container" style={{ height: 'auto', aspectRatio: 'auto', minHeight: '400px', maxHeight: '700px' }}>
            {/* IMAGEN PRINCIPAL */}
            {post.images?.length > 0 ? (
              <img
                src={post.images[currentImageIndex[post.id] || 0]}
                alt={`${post.author?.firstName || post.title} - Imagen`}
                className="modern-post-image"
                onLoad={(e) => {
                  const img = e.target;
                  const container = img.parentElement;
                  const aspectRatio = img.naturalWidth / img.naturalHeight;
                  container.style.height = aspectRatio > 1.5 ? '450px' : aspectRatio < 0.7 ? '650px' : '550px';
                }}
                style={{ objectFit: 'contain', width: '100%', height: '100%' }}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', background: '#1a1a1a' }}>
                <User size={64} />
              </div>
            )}
            
            <div className="modern-overlay-gradient" />
            
            {/* HEADER FLOTANTE */}
            <div className="modern-header-overlay" data-interactive="true">
              <ProfileAvatar
                src={post.author?.avatar || post.profileImage || post.images?.[0]}
                alt={post.author ? `${post.author.firstName} ${post.author.lastName}` : post.name}
                className="modern-profile-image"
                verified={post.verified || post.author?.escort?.isVerified || post.author?.agency?.isVerified}
                onClick={() => handleProfileClick(post)}
              />
              
              <div className="modern-profile-info">
                <h3 onClick={() => handleProfileClick(post)} className="modern-profile-name" style={{ cursor: 'pointer' }} data-interactive="true">
                  {post.author ? `${post.author.firstName} ${post.author.lastName}` : post.name}
                  {(post.age || post.author?.escort?.age) && (
                    <span style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255, 255, 255, 0.9)', marginLeft: '6px' }}>
                      ({post.age || post.author?.escort?.age})
                    </span>
                  )}
                </h3>
                
                <div className="modern-profile-location">
                  <MapPin size={12} style={{ color: '#ff6b35' }} />
                  <span>{post.location?.city || post.location || 'República Dominicana'}</span>
                </div>
              </div>
            </div>

            {/* STATS FLOTANTES */}
            {post.likesCount > 0 && (
              <div className="modern-stats-overlay">
                <Heart size={12} style={{ color: '#ff6b35' }} />
                <span>{post.likesCount}</span>
              </div>
            )}

            {/* NAVEGACIÓN DE IMÁGENES */}
            {post.images?.length > 1 && (
              <>
                <motion.button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); prevImage(post.id); }}
                  className="modern-nav-button modern-nav-prev"
                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} data-interactive="true"
                >
                  <ChevronLeft size={20} />
                </motion.button>

                <motion.button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); nextImage(post.id); }}
                  className="modern-nav-button modern-nav-next"
                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} data-interactive="true"
                >
                  <ChevronRight size={20} />
                </motion.button>
              </>
            )}

            {/* DESCRIPCIÓN FLOTANTE */}
            {(post.title || post.description) && (
              <div className="modern-description-overlay">
                {post.title && (
                  <h4 className="modern-title-text">{post.title}</h4>
                )}
                {post.description && (
                  <div className="modern-description-container">
                    <p className="modern-description-text modern-description-preview">
                      {post.description.length > 100 
                        ? `${post.description.substring(0, 100)}...` 
                        : post.description
                      }
                    </p>
                    {post.description.length > 100 && (
                      <motion.button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleProfileClick(post);
                        }}
                        className="modern-read-more-btn"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        data-interactive="true"
                      >
                        Leer descripción
                      </motion.button>
                    )}
                  </div>
                )}
                
                {/* SERVICIOS */}
                {post.services?.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '8px', justifyContent: 'center' }}>
                    {post.services.slice(0, 3).map((service, index) => (
                      <span key={index} style={{
                        background: 'rgba(255, 107, 53, 0.9)', color: 'white', fontSize: '10px', fontWeight: 600,
                        padding: '4px 8px', borderRadius: '10px', textShadow: 'none',
                        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.4)', border: '1px solid rgba(255, 255, 255, 0.3)'
                      }}>
                        {service}
                      </span>
                    ))}
                    {post.services.length > 3 && (
                      <span style={{
                        background: 'rgba(255, 255, 255, 0.3)', color: 'white', fontSize: '10px', fontWeight: 600,
                        padding: '4px 8px', borderRadius: '10px', textShadow: 'none',
                        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.4)', border: '1px solid rgba(255, 255, 255, 0.3)'
                      }}>
                        +{post.services.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* INDICADORES DE IMÁGENES */}
                {post.images?.length > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '12px' }} data-interactive="true">
                    {post.images.map((_, imageIndex) => (
                      <motion.div
                        key={imageIndex}
                        onClick={(e) => {
                          e.preventDefault(); e.stopPropagation();
                          setCurrentImageIndex(prev => ({ ...prev, [post.id]: imageIndex }));
                        }}
                        style={{
                          width: '8px', height: '8px', borderRadius: '50%', cursor: 'pointer',
                          background: imageIndex === (currentImageIndex[post.id] || 0) ? 'rgba(255, 107, 53, 0.9)' : 'rgba(255, 255, 255, 0.4)',
                          border: '1px solid rgba(255, 255, 255, 0.3)', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                        whileHover={{ scale: 1.2, background: 'rgba(255, 107, 53, 0.7)' }}
                        whileTap={{ scale: 0.9 }} data-interactive="true"
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ✅ BOTONES DE ACCIÓN - CON CHAT INTEGRADO */}
            <div className="modern-actions-overlay multiple-buttons" data-interactive="true">
              {/* ✅ Botón de Chat - CON LÓGICA COMPLETA */}
              <motion.button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (isCreatingChat) return;
                  handleChatAction(post);
                }}
                className={`modern-action-btn chat-btn ${isCreatingChat ? 'disabled' : ''}`}
                disabled={isCreatingChat}
                whileHover={isCreatingChat ? {} : { scale: 1.1, y: -2 }}
                whileTap={isCreatingChat ? {} : { scale: 0.95 }}
                title={isCreatingChat ? 'Creando chat...' : 'Chatear'}
                style={{ opacity: isCreatingChat ? 0.6 : 1, cursor: isCreatingChat ? 'not-allowed' : 'pointer' }}
              >
                <MessageCircle size={20} style={{ color: 'white' }} />
                {isCreatingChat && (
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

              {/* Botón de WhatsApp */}
              {post.phone && (
                <motion.button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleWhatsApp(post.phone);
                  }}
                  className="modern-action-btn whatsapp-btn"
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  title="WhatsApp"
                >
                  <WhatsAppIcon size={20} />
                </motion.button>
              )}

              {/* Botón para quitar de favoritos */}
              <motion.button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleLikeWithAnimation(post.id, e);
                }}
                className="modern-action-btn flame-btn active"
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.95 }}
                title="Quitar de favoritos"
              >
                <Flame size={24} style={{ color: 'white' }} />
              </motion.button>
            </div>

            {/* ANIMACIÓN DE CORAZONES */}
            {likeAnimations[post.id] && (
              <div className="like-hearts-container">
                {likeAnimations[post.id].map((heart) => (
                  <motion.div
                    key={heart.id} className="floating-heart"
                    initial={{ x: heart.x, y: heart.y, opacity: 0, scale: 0 }}
                    animate={{ y: heart.y - 120, opacity: [0, 1, 1, 0], scale: [0, 1.2, 1, 0.8] }}
                    transition={{ duration: 2, delay: heart.delay / 1000, ease: "easeOut" }}
                  >
                    💔
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );

  // ✅ APLICAR ESTILOS DEL FEED
  React.useLayoutEffect(() => {
    const modernPostCSS = `
      * { box-sizing: border-box !important; }
      body, html { overflow-x: hidden !important; max-width: 100vw !important; margin: 0 !important; padding: 0 !important; }
      
      .favorites-page { width: 100vw !important; max-width: 100vw !important; overflow-x: hidden !important; min-height: 100vh !important; margin: 0 !important; padding: 0 !important; position: relative !important; background: #0a0a0a !important; }
      .favorites-content { width: 100% !important; max-width: 100% !important; margin: ${isAuthenticated ? '80px' : '67px'} auto 0 !important; padding: 1rem !important; display: flex !important; justify-content: center !important; }
      .favorites-overview-container { width: 100% !important; max-width: 480px !important; margin: 0 auto !important; display: flex !important; flex-direction: column !important; align-items: center !important; }
      
      .favorites-hero { padding: 2rem 0; margin-bottom: 2rem; width: 100%; text-align: center; }
      .favorites-hero h1 { color: white !important; font-size: 2.5rem; font-weight: 800; margin: 0; display: flex !important; align-items: center !important; justify-content: center !important; text-shadow: none !important; }
      .favorites-hero p { color: #9ca3af; font-size: 1.1rem; margin: 0; }
      
      .favorites-search-container { margin-bottom: 2rem; display: flex; justify-content: center; width: 100%; }
      .favorites-search-input { background: rgba(26, 26, 26, 0.8); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 1rem; padding: 0.75rem 1.5rem; color: white; font-size: 1rem; width: 100%; max-width: 500px; outline: none; transition: all 0.3s ease; }
      .favorites-search-input:focus { border-color: #ff6b35; box-shadow: 0 0 0 2px rgba(255, 107, 53, 0.2); }
      .favorites-search-input::placeholder { color: #6b7280; }
      
      .feed-posts-container { display: flex !important; flex-direction: column !important; align-items: center !important; gap: 2.5rem !important; width: 100% !important; margin-bottom: 100px !important; }
      
      .feed-post-card { width: 100% !important; max-width: 480px !important; margin: 0 auto !important; position: relative !important; border-radius: 20px !important; overflow: hidden !important; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important; transform: translateY(0) !important; }
      .feed-post-card:hover { transform: translateY(-4px) !important; }
      
      .modern-post-container { position: relative !important; width: 100% !important; min-height: 400px !important; max-height: 700px !important; border-radius: 20px !important; overflow: hidden !important; background: transparent !important; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3), 0 4px 16px rgba(0, 0, 0, 0.15) !important; display: flex !important; align-items: center !important; justify-content: center !important; }
      .modern-post-image { width: 100% !important; height: 100% !important; object-fit: cover !important; object-position: center !important; transition: transform 0.3s ease !important; border-radius: 20px !important; }
      .feed-post-card:hover .modern-post-image { transform: scale(1.01) !important; }
      
      .modern-overlay-gradient { display: none !important; }
      
      .modern-header-overlay { position: absolute !important; top: 0 !important; left: 0 !important; right: 0 !important; z-index: 10 !important; padding: 20px !important; display: flex !important; align-items: center !important; gap: 12px !important; opacity: 0 !important; transform: translateY(-10px) !important; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important; pointer-events: none !important; }
      
      @media (min-width: 769px) {
        .feed-post-card:hover .modern-header-overlay { opacity: 1 !important; transform: translateY(0) !important; pointer-events: auto !important; }
      }
      @media (max-width: 768px) {
        .feed-post-card.mobile-active .modern-header-overlay { opacity: 1 !important; transform: translateY(0) !important; pointer-events: auto !important; }
      }
      
      .modern-profile-image { width: 44px !important; height: 44px !important; border-radius: 50% !important; border: 3px solid white !important; object-fit: cover !important; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6) !important; }
      .modern-profile-info { flex: 1 !important; }
      .modern-profile-name { font-size: 16px !important; font-weight: 700 !important; color: white !important; margin: 0 !important; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8) !important; display: flex !important; align-items: center !important; gap: 6px !important; cursor: pointer !important; }
      .modern-profile-name:hover { text-shadow: 0 2px 8px rgba(255, 107, 53, 0.6) !important; }
      .modern-profile-location { display: flex !important; align-items: center !important; gap: 4px !important; color: rgba(255, 255, 255, 0.95) !important; font-size: 13px !important; font-weight: 500 !important; margin-top: 2px !important; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8) !important; }
      
      .modern-actions-overlay { position: absolute !important; bottom: 0 !important; left: 0 !important; right: 0 !important; z-index: 10 !important; padding: 20px !important; display: flex !important; align-items: center !important; justify-content: center !important; gap: 1.2rem !important; }
      
      .modern-action-btn { width: 42px !important; height: 42px !important; padding: 0 !important; background: rgba(0, 0, 0, 0.7) !important; border: 2px solid rgba(255, 255, 255, 0.3) !important; cursor: pointer !important; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important; border-radius: 50% !important; display: flex !important; align-items: center !important; justify-content: center !important; box-shadow: 0 6px 18px rgba(0, 0, 0, 0.4), 0 3px 8px rgba(0, 0, 0, 0.2) !important; position: relative !important; }
      .modern-action-btn.disabled { opacity: 0.6 !important; cursor: not-allowed !important; pointer-events: none !important; }
      
      .modern-action-btn.chat-btn { background: rgba(255, 107, 53, 0.9) !important; border: 2px solid rgba(255, 255, 255, 0.4) !important; box-shadow: 0 6px 18px rgba(255, 107, 53, 0.3), 0 3px 8px rgba(0, 0, 0, 0.2) !important; }
      .modern-action-btn.chat-btn:hover { background: rgba(255, 107, 53, 1) !important; border-color: rgba(255, 255, 255, 0.7) !important; box-shadow: 0 8px 24px rgba(255, 107, 53, 0.5), 0 4px 12px rgba(0, 0, 0, 0.3) !important; }
      
      .modern-action-btn.whatsapp-btn { background: rgba(37, 211, 102, 0.9) !important; border: 2px solid rgba(255, 255, 255, 0.4) !important; box-shadow: 0 6px 18px rgba(37, 211, 102, 0.3), 0 3px 8px rgba(0, 0, 0, 0.2) !important; }
      .modern-action-btn.whatsapp-btn:hover { background: rgba(37, 211, 102, 1) !important; border-color: rgba(255, 255, 255, 0.7) !important; box-shadow: 0 8px 24px rgba(37, 211, 102, 0.5), 0 4px 12px rgba(0, 0, 0, 0.3) !important; }
      
      .modern-actions-overlay.multiple-buttons .modern-action-btn { width: 42px !important; height: 42px !important; }
      
      .modern-action-btn:hover { transform: scale(1.1) translateY(-3px) !important; background: rgba(0, 0, 0, 0.85) !important; border-color: rgba(255, 255, 255, 0.6) !important; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6), 0 4px 12px rgba(0, 0, 0, 0.4) !important; }
      .modern-action-btn:active { transform: scale(0.95) !important; }
      
      .modern-action-btn.flame-btn { background: linear-gradient(145deg, #ff6b35 0%, #e85a2e 100%) !important; border: 2px solid rgba(255, 255, 255, 0.4) !important; box-shadow: 0 6px 18px rgba(255, 107, 53, 0.4), 0 3px 8px rgba(0, 0, 0, 0.2) !important; width: 48px !important; height: 48px !important; }
      .modern-action-btn.flame-btn:hover { background: linear-gradient(145deg, #e85a2e 0%, #d14a22 100%) !important; border-color: rgba(255, 255, 255, 0.7) !important; box-shadow: 0 8px 24px rgba(255, 107, 53, 0.6), 0 4px 12px rgba(0, 0, 0, 0.3) !important; }
      .modern-action-btn.flame-btn.active { background: linear-gradient(145deg, #dc2626 0%, #b91c1c 100%) !important; border-color: rgba(255, 255, 255, 0.7) !important; box-shadow: 0 8px 24px rgba(220, 38, 38, 0.5), 0 4px 12px rgba(0, 0, 0, 0.3) !important; }
      .modern-action-btn.flame-btn.active:hover { background: linear-gradient(145deg, #b91c1c 0%, #991b1b 100%) !important; box-shadow: 0 10px 28px rgba(220, 38, 38, 0.6), 0 5px 14px rgba(0, 0, 0, 0.4) !important; }
      
      .modern-nav-button { position: absolute !important; top: 50% !important; transform: translateY(-50%) !important; width: 40px !important; height: 40px !important; border-radius: 50% !important; background: rgba(0, 0, 0, 0.7) !important; border: 2px solid rgba(255, 255, 255, 0.3) !important; color: white !important; cursor: pointer !important; display: flex !important; align-items: center !important; justify-content: center !important; z-index: 15 !important; opacity: 0 !important; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5) !important; }
      .feed-post-card:hover .modern-nav-button { opacity: 0.9 !important; }
      .modern-nav-button:hover { background: rgba(0, 0, 0, 0.85) !important; border-color: rgba(255, 255, 255, 0.6) !important; transform: translateY(-50%) scale(1.1) !important; opacity: 1 !important; box-shadow: 0 6px 16px rgba(0, 0, 0, 0.7) !important; }
      .modern-nav-prev { left: 16px !important; }
      .modern-nav-next { right: 16px !important; }
      
      .modern-description-overlay { position: absolute !important; bottom: 80px !important; left: 20px !important; right: 20px !important; z-index: 12 !important; border-radius: 12px !important; padding: 12px 16px !important; opacity: 0 !important; transform: translateY(15px) !important; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important; pointer-events: none !important; }
      @media (min-width: 769px) {
        .feed-post-card:hover .modern-description-overlay { opacity: 1 !important; transform: translateY(0) !important; }
      }
      @media (max-width: 768px) {
        .feed-post-card.mobile-active .modern-description-overlay { opacity: 1 !important; transform: translateY(0) !important; }
      }
      
      .modern-description-text { color: white !important; font-size: 11px !important; font-weight: 500 !important; line-height: 1.3 !important; margin: 0 !important; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8) !important; text-align: center !important; opacity: 0.9 !important; }
      
      .modern-title-text { color: white !important; font-size: 13px !important; font-weight: 600 !important; line-height: 1.2 !important; margin: 0 0 4px 0 !important; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8) !important; text-align: center !important; }
      
      .modern-description-container { display: flex !important; flex-direction: column !important; align-items: center !important; gap: 6px !important; }
      
      .modern-description-preview { margin: 0 !important; }
      
      .modern-read-more-btn { background: rgba(255, 107, 53, 0.8) !important; border: 1px solid rgba(255, 255, 255, 0.2) !important; color: white !important; padding: 4px 8px !important; border-radius: 8px !important; font-size: 10px !important; font-weight: 500 !important; cursor: pointer !important; transition: all 0.3s ease !important; text-shadow: none !important; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3) !important; opacity: 0.9 !important; }
      .modern-read-more-btn:hover { background: rgba(255, 107, 53, 1) !important; border-color: rgba(255, 255, 255, 0.3) !important; box-shadow: 0 3px 8px rgba(255, 107, 53, 0.3) !important; opacity: 1 !important; }
      
      .modern-stats-overlay { position: absolute !important; top: 20px !important; right: 20px !important; z-index: 15 !important; background: rgba(0, 0, 0, 0.7) !important; border-radius: 20px !important; padding: 8px 12px !important; border: 2px solid rgba(255, 255, 255, 0.3) !important; color: white !important; font-size: 13px !important; font-weight: 600 !important; text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6) !important; display: flex !important; align-items: center !important; gap: 6px !important; opacity: 0 !important; transform: translateX(15px) !important; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5) !important; }
      .feed-post-card:hover .modern-stats-overlay { opacity: 1 !important; transform: translateX(0) !important; }
      
      .like-hearts-container { position: absolute !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; pointer-events: none !important; z-index: 20 !important; overflow: hidden !important; border-radius: 20px !important; }
      .floating-heart { position: absolute !important; color: #ff6b35 !important; font-size: 24px !important; pointer-events: none !important; z-index: 25 !important; animation: floatUp 2s ease-out forwards !important; }
      
      @keyframes floatUp {
        0% { opacity: 1 !important; transform: translateY(0) scale(1) !important; }
        20% { opacity: 1 !important; transform: translateY(-20px) scale(1.2) !important; }
        100% { opacity: 0 !important; transform: translateY(-120px) scale(0.8) !important; }
      }
      
      @media (max-width: 768px) {
        .favorites-content { margin-top: ${isAuthenticated ? '65px' : '47px'} !important; padding: 0.5rem !important; }
        .modern-post-container { height: 500px !important; border-radius: 16px !important; }
        .modern-action-btn { width: 38px !important; height: 38px !important; }
        .modern-actions-overlay.multiple-buttons .modern-action-btn { width: 38px !important; height: 38px !important; }
        .modern-action-btn.flame-btn { width: 40px !important; height: 40px !important; }
        .modern-actions-overlay { padding: 18px !important; gap: 1rem !important; }
        .modern-header-overlay { padding: 16px !important; }
        .modern-profile-image { width: 36px !important; height: 36px !important; }
        .modern-description-overlay { bottom: 70px !important; }
        
        .favorites-hero { padding: 1.5rem 1rem; }
        .favorites-hero h1 { font-size: 2rem; }
      }
      
      @media (max-width: 480px) {
        .modern-action-btn { width: 36px !important; height: 36px !important; }
        .modern-actions-overlay.multiple-buttons .modern-action-btn { width: 36px !important; height: 36px !important; }
        .modern-action-btn.flame-btn { width: 38px !important; height: 38px !important; }
        .modern-actions-overlay { padding: 16px !important; gap: 0.8rem !important; }
      }
    `;
    
    ['favorites-feed-styles', 'optimized-feed-fix', 'forced-navigation-top', 'instagram-card-styles', 'modern-post-styles', 'modern-post-styles-updated', 'modern-post-styles-optimized'].forEach(id => {
      const style = document.getElementById(id);
      if (style) style.remove();
    });
    
    const style = document.createElement('style');
    style.id = 'favorites-feed-modern-styles';
    style.textContent = modernPostCSS;
    document.head.appendChild(style);
    
    return () => {
      const styleToRemove = document.getElementById('favorites-feed-modern-styles');
      if (styleToRemove) styleToRemove.remove();
    };
  }, [isAuthenticated]);

  // ✅ EFECTOS CORREGIDOS
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // ✅ EFECTO PRINCIPAL - CARGAR FAVORITOS AL MONTAR
  useEffect(() => {
    if (!mounted || !isAuthenticated || !user) return;
    
    console.log('🔄 Iniciando carga de favoritos...');
    loadFavorites(true);
  }, [mounted, isAuthenticated, user]);

  // ✅ EFECTO PARA CAMBIOS DE PAGINACIÓN Y FILTROS
  useEffect(() => {
    if (!mounted || !isAuthenticated || !user) return;
    
    console.log('📄 Cambio en paginación/filtros, recargando...');
    loadFavorites(false);
  }, [pagination.page, filters.sortBy, filters.sortOrder, filters.userType]);

  // ✅ EFECTO PARA BÚSQUEDA CON DEBOUNCE
  useEffect(() => {
    if (!mounted || !isAuthenticated || !user) return;
    
    const timeoutId = setTimeout(() => {
      console.log('🔍 Búsqueda cambiada, recargando...');
      setPagination(prev => ({ ...prev, page: 1 }));
      loadFavorites(false);
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // ✅ RENDERIZADO CONDICIONAL - CON CHAT INTEGRADO
  if (!mounted) {
    return (
      <div className="favorites-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0a' }}>
        <Loader className="animate-spin" size={32} style={{ color: '#ff6b35' }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="favorites-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: '1rem', background: '#0a0a0a' }}>
        <User size={64} style={{ color: '#9ca3af' }} />
        <h2 style={{ color: 'white', margin: 0 }}>No Autenticado</h2>
        <p style={{ color: '#9ca3af', margin: 0 }}>Debes iniciar sesión para ver tus favoritos.</p>
      </div>
    );
  }

  // ✅ RENDERIZADO CONDICIONAL PARA CHAT - IGUAL QUE FEEDPAGE
  if (currentView === 'chat' && chatTargetUserId) {
    return (
      <ChatPage
        userType={user?.userType?.toLowerCase() || 'client'}
        targetUserId={chatTargetUserId}
        onBack={handleBackToFeedFromChat}
      />
    );
  }

  if (currentView === 'profile' && selectedProfileId) {
    return (
      <EscortProfile
        profileId={selectedProfileId}
        initialData={selectedProfileData}
        onBack={handleBackToFeed}
        onStartChat={() => handleBackToFeed()}
        onToggleLike={(postData) => postData?.id && handleToggleLikeAndFavorite(postData.id)}
        onWhatsApp={handleWhatsApp}
        onBanUser={(profile) => {
          if (user?.userType === 'ADMIN') {
            console.log('🚫 Ban function called from favorites');
          }
        }}
        userType={user?.userType || 'CLIENT'}
      />
    );
  }

  return (
    <div className="favorites-page">
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: `radial-gradient(circle at 20% 30%, rgba(255, 107, 53, 0.2) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(255, 107, 53, 0.15) 0%, transparent 50%), radial-gradient(circle at 50% 50%, rgba(0, 0, 0, 0.7) 0%, transparent 70%)`, pointerEvents: 'none', zIndex: 0 }} />

      <div className="favorites-content">
        <AnimatePresence mode="wait">
          <motion.div 
            className="favorites-overview-container"
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {/* Hero Section */}
            <div className="favorites-hero">
              <h1>
                <Heart size={40} style={{ color: '#ff6b35', marginRight: '12px', verticalAlign: 'middle' }} />
                Mis Favoritos
              </h1>
            </div>

            {/* Buscador */}
            {favorites.length > 0 && (
              <div className="favorites-search-container">
                <input
                  type="text"
                  placeholder="Buscar en favoritos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="favorites-search-input"
                />
              </div>
            )}

            {/* Loading mejorado */}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', flexDirection: 'column', gap: '1rem' }}>
                <Loader className="animate-spin" size={40} style={{ color: '#ff6b35' }} />
                <p style={{ color: '#9ca3af', fontSize: '0.9rem', margin: 0 }}>Cargando favoritos...</p>
                <p style={{ color: '#6b7280', fontSize: '0.8rem', margin: 0 }}>Esto puede tomar unos segundos</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', flexDirection: 'column', gap: '1rem' }}>
                <AlertCircle size={40} style={{ color: '#ef4444' }} />
                <p style={{ color: '#ef4444', fontSize: '0.9rem', margin: 0 }}>{error}</p>
                <motion.button
                  onClick={() => loadFavorites(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', background: 'linear-gradient(145deg, #ff6b35 0%, #e85a2e 100%)', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                >
                  <RefreshCw size={16} />
                  Reintentar
                </motion.button>
              </div>
            )}

            {/* Posts Grid - Solo mostrar si NO está cargando */}
            {!loading && !error && favorites.length > 0 && renderPostsGrid()}

            {/* Empty State - Solo mostrar si NO está cargando */}
            {!loading && !error && favorites.length === 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', flexDirection: 'column', gap: '1rem', padding: '2rem', textAlign: 'center' }}>
                <Heart size={48} style={{ color: '#9ca3af' }} />
                <h3 style={{ color: 'white', fontSize: '1.1rem', margin: 0 }}>No tienes favoritos</h3>
                <p style={{ color: '#9ca3af', fontSize: '0.9rem', margin: 0 }}>
                  {searchTerm 
                    ? `No se encontraron favoritos que coincidan con "${searchTerm}"`
                    : 'Aún no has marcado ninguna publicación como favorita'
                  }
                </p>
                {searchTerm && (
                  <motion.button
                    onClick={() => setSearchTerm('')}
                    style={{ padding: '0.5rem 1rem', background: '#ff6b35', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  >
                    Limpiar búsqueda
                  </motion.button>
                )}
              </div>
            )}

            {/* Paginación */}
            {!loading && pagination.pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '2rem', padding: '1rem' }}>
                <motion.button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={!pagination.hasPrev || loading}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', 
                    background: pagination.hasPrev ? '#ff6b35' : 'rgba(107, 114, 128, 0.5)', 
                    color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem', 
                    cursor: pagination.hasPrev ? 'pointer' : 'not-allowed'
                  }}
                  whileHover={pagination.hasPrev ? { scale: 1.05 } : {}}
                  whileTap={pagination.hasPrev ? { scale: 0.95 } : {}}
                >
                  <ChevronLeft size={16} />
                  Anterior
                </motion.button>
                
                <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
                  Página {pagination.page} de {pagination.pages}
                </span>
                
                <motion.button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={!pagination.hasNext || loading}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', 
                    background: pagination.hasNext ? '#ff6b35' : 'rgba(107, 114, 128, 0.5)', 
                    color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem', 
                    cursor: pagination.hasNext ? 'pointer' : 'not-allowed'
                  }}
                  whileHover={pagination.hasNext ? { scale: 1.05 } : {}}
                  whileTap={pagination.hasNext ? { scale: 0.95 } : {}}
                >
                  Siguiente
                  <ChevronRight size={16} />
                </motion.button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default FavoritesPage;