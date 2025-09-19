// ✅ CARGAR POSTS ESPECÍFICOS DEL PERFIL DESDE EL BACKEND - CORREGIDO
  const loadProfilePosts = async (userId) => {
    try {
      setPostsLoading(true);
      
      console.log('📸 Loading posts for specific user:', userId);
      
      // ✅ MÉTODO 1: INTENTAR CON ENDPOINT DE BÚSQUEDA ESPECÍFICO
      try {
        const response = await postsAPI.searchPosts({
          authorId: userId, // ✅ FILTRO ESPECÍFICO POR AUTOR
          page: 1,
          limit: 50, // Cargar más posts del perfil
          sortBy: filterPosts === 'recent' ? 'recent' : 
                  filterPosts === 'popular' ? 'popular' : 'recent'
        });
        
        if (response.success && response.data.posts && response.data.posts.length > 0) {
          console.log('✅ Profile posts loaded via search:', response.data);
          const posts = response.data.posts || [];
          
          // ✅ VERIFICAR QUE LOS POSTS PERTENECEN AL USUARIO CORRECTO
          const userPosts = posts.filter(post => 
            post.author?.id === userId || 
            post.authorId === userId ||
            post.userId === userId
          );
          
          console.log('✅ Filtered user posts:', userPosts.length, 'of', posts.length);
          setProfilePosts(userPosts);
          
          // Calcular estadísticas reales
          const totalLikes = userPosts.reduce((sum, post) => sum + (post.likesCount || 0), 0);
          const totalViews = userPosts.reduce((sum, post) => sum + (post.viewsCount || 0), 0);
          
          setStats(prev => ({
            ...prev,
            totalPosts: userPosts.length,
            totalLikes,
            totalViews
          }));
          
          return; // ✅ SALIR SI ÉXITO
        }
      } catch (searchError) {
        console.warn('⚠️ Search endpoint failed, trying fallback:', searchError.message);
      }
      
      // ✅ MÉTODO 2: FALLBACK - OBTENER TODOS LOS POSTS Y FILTRAR LOCALMENTE
      console.log('📋 Fallback: Loading all posts and filtering locally');
      
      const fallbackResponse = await postsAPI.getFeed({
        page: 1,
        limit: 100, // Obtener más posts para filtrar
        sortBy: filterPosts === 'recent' ? 'recent' : 
                filterPosts === 'popular' ? 'popular' : 'recent'
      });
      
      if (fallbackResponse.success) {
        console.log('✅ All posts loaded for filtering:', fallbackResponse.data);
        const allPosts = fallbackResponse.data.posts || [];
        
        // ✅ FILTRAR POSTS DEL USUARIO ESPECÍFICO
        const userPosts = allPosts.filter(post => {
          const authorMatch = post.author?.id === userId || 
                             post.authorId === userId ||
                             post.userId === userId;
          
          if (authorMatch) {
            console.log('📌 Found matching post:', {
              postId: post.id,
              title: post.title,
              authorId: post.author?.id,
              authorName: post.author?.firstName
            });
          }
          
          return authorMatch;
        });
        
        console.log('✅ Filtered user posts (fallback):', userPosts.length, 'of', allPosts.length);
        setProfilePosts(userPosts);
        
        // Calcular estadísticas reales
        const totalLikes = userPosts.reduce((sum, post) => sum + (post.likesCount || 0), 0);
        const totalViews = userPosts.reduce((sum, post) => sum + (post.viewsCount || 0), 0);
        
        setStats(prev => ({
          ...prev,
          totalPosts: userPosts.length,
          totalLikes,
          totalViews
        }));
      } else {
        throw new Error(fallbackResponse.message || 'Error cargando posts');
      }
    } catch (error) {
      console.error('❌ Error loading profile posts:', error);
      // No mostrar error aquí, ya que los posts son secundarios
      setProfilePosts([]);
      setStats(prev => ({
        ...prev,
        totalPosts: 0,
        totalLikes: 0,
        totalViews: 0
      }));
    } finally {
      setPostsLoading(false);
    }
  };import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, ChevronLeft, ChevronRight, Verified, MapPin, Phone, Calendar,
  Star, Heart, MessageCircle, Share2, Flame, TrendingUp, Users,
  Shield, Camera, Grid, List, Filter, Search, Clock, Eye,
  Ban, AlertTriangle, CheckCircle, Building2, Award, Loader,
  Mail, Globe, Instagram, Twitter, Menu, MoreVertical, X
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { userAPI, postsAPI, handleApiError } from '../../../utils/api';

const EscortProfile = ({ 
  profileId,
  initialData = null,
  onBack,
  onStartChat, 
  onToggleLike, 
  onWhatsApp, 
  onBanUser, 
  onReportUser,
  userType 
}) => {
  const { isAuthenticated, user } = useAuth();
  
  // Estados locales
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' o 'list'
  const [filterPosts, setFilterPosts] = useState('all'); // 'all', 'recent', 'popular'
  const [isImageExpanded, setIsImageExpanded] = useState(false);
  const [selectedPostImage, setSelectedPostImage] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showMoreActions, setShowMoreActions] = useState(false);
  
  // Estados para datos del backend
  const [loading, setLoading] = useState(false);
  const [profileDetails, setProfileDetails] = useState(initialData);
  const [profilePosts, setProfilePosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalPosts: 0,
    totalLikes: 0,
    totalViews: 0,
    joinedDate: null
  });

  // APLICAR ESTILOS ESPECÍFICOS PARA LA PÁGINA COMPLETA
  React.useLayoutEffect(() => {
    const escortProfileCSS = `
      /* ===== ESCORT PROFILE PAGE STYLES - MEJORADO ===== */
      
      .escort-profile-page {
        width: 100vw !important;
        max-width: 100vw !important;
        min-height: 100vh !important;
        background: linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 50%, #0f0f0f 100%) !important;
        overflow-x: hidden !important;
        position: relative !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      
      /* Background Pattern */
      .escort-profile-page::before {
        content: '' !important;
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        background: 
          radial-gradient(circle at 20% 30%, rgba(255, 107, 53, 0.15) 0%, transparent 50%),
          radial-gradient(circle at 80% 70%, rgba(255, 107, 53, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 50% 50%, rgba(0, 0, 0, 0.8) 0%, transparent 70%) !important;
        pointer-events: none !important;
        z-index: 0 !important;
      }
      
      .escort-profile-header {
        position: sticky !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        z-index: 1000 !important;
        background: rgba(15, 15, 15, 0.95) !important;
        backdrop-filter: blur(20px) !important;
        border-bottom: 1px solid rgba(255, 107, 53, 0.2) !important;
        padding: 1rem !important;
        display: flex !important;
        align-items: center !important;
        gap: 1rem !important;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3) !important;
      }
      
      .escort-profile-back-btn {
        width: 44px !important;
        height: 44px !important;
        border-radius: 50% !important;
        background: linear-gradient(135deg, rgba(255, 107, 53, 0.2), rgba(255, 107, 53, 0.1)) !important;
        border: 1px solid rgba(255, 107, 53, 0.3) !important;
        color: white !important;
        cursor: pointer !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        transition: all 0.3s ease !important;
        box-shadow: 0 4px 12px rgba(255, 107, 53, 0.2) !important;
      }
      
      .escort-profile-back-btn:hover {
        background: linear-gradient(135deg, rgba(255, 107, 53, 0.4), rgba(255, 107, 53, 0.2)) !important;
        border-color: rgba(255, 107, 53, 0.5) !important;
        transform: scale(1.05) !important;
        box-shadow: 0 6px 20px rgba(255, 107, 53, 0.3) !important;
      }
      
      .escort-profile-title {
        flex: 1 !important;
        color: white !important;
        font-size: 1.3rem !important;
        font-weight: 700 !important;
        margin: 0 !important;
        background: linear-gradient(135deg, #ffffff, #f0f0f0) !important;
        -webkit-background-clip: text !important;
        -webkit-text-fill-color: transparent !important;
        background-clip: text !important;
      }
      
      .escort-profile-content {
        padding: 0 !important;
        max-width: 600px !important;
        margin: 0 auto !important;
        position: relative !important;
        z-index: 1 !important;
      }
      
      .escort-profile-hero {
        position: relative !important;
        padding: 2rem 1rem !important;
        background: linear-gradient(135deg, 
          rgba(255, 107, 53, 0.15) 0%, 
          rgba(255, 107, 53, 0.08) 50%,
          rgba(255, 107, 53, 0.05) 100%) !important;
        border-bottom: 1px solid rgba(255, 107, 53, 0.2) !important;
        border-radius: 0 0 2rem 2rem !important;
        margin-bottom: 2rem !important;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important;
      }
      
      .escort-profile-avatar {
        width: 130px !important;
        height: 130px !important;
        border-radius: 50% !important;
        object-fit: cover !important;
        border: 4px solid rgba(255, 107, 53, 0.6) !important;
        margin: 0 auto 1.5rem auto !important;
        display: block !important;
        box-shadow: 
          0 0 0 3px rgba(255, 107, 53, 0.2),
          0 12px 40px rgba(0, 0, 0, 0.5),
          inset 0 0 0 1px rgba(255, 255, 255, 0.1) !important;
        transition: all 0.3s ease !important;
      }
      
      .escort-profile-avatar:hover {
        transform: scale(1.05) !important;
        box-shadow: 
          0 0 0 3px rgba(255, 107, 53, 0.4),
          0 16px 50px rgba(0, 0, 0, 0.6),
          inset 0 0 0 1px rgba(255, 255, 255, 0.2) !important;
      }
      
      .escort-profile-info {
        text-align: center !important;
        margin-bottom: 2rem !important;
      }
      
      .escort-profile-name {
        font-size: 2.2rem !important;
        font-weight: 800 !important;
        color: white !important;
        margin: 0 0 0.5rem 0 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 0.5rem !important;
        background: linear-gradient(135deg, #ffffff, #f0f0f0) !important;
        -webkit-background-clip: text !important;
        -webkit-text-fill-color: transparent !important;
        background-clip: text !important;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
      }
      
      .escort-profile-location {
        color: #d1d5db !important;
        font-size: 1rem !important;
        margin: 0 0 1rem 0 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 0.5rem !important;
        font-weight: 500 !important;
      }
      
      .escort-profile-bio {
        color: #e5e7eb !important;
        font-size: 1rem !important;
        line-height: 1.6 !important;
        margin: 0 0 2rem 0 !important;
        max-width: 500px !important;
        margin-left: auto !important;
        margin-right: auto !important;
        padding: 0 1rem !important;
        font-weight: 400 !important;
      }
      
      .escort-profile-actions {
        display: flex !important;
        gap: 1rem !important;
        justify-content: center !important;
        flex-wrap: wrap !important;
        margin-bottom: 2rem !important;
      }
      
      .escort-profile-action-btn {
        padding: 1rem 2rem !important;
        border-radius: 1rem !important;
        border: none !important;
        font-size: 1rem !important;
        font-weight: 600 !important;
        cursor: pointer !important;
        display: flex !important;
        align-items: center !important;
        gap: 0.5rem !important;
        transition: all 0.3s ease !important;
        min-width: 140px !important;
        justify-content: center !important;
        position: relative !important;
        overflow: hidden !important;
      }
      
      .escort-profile-action-btn::before {
        content: '' !important;
        position: absolute !important;
        top: 0 !important;
        left: -100% !important;
        width: 100% !important;
        height: 100% !important;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent) !important;
        transition: left 0.5s !important;
      }
      
      .escort-profile-action-btn:hover::before {
        left: 100% !important;
      }
      
      .escort-profile-action-btn.primary {
        background: linear-gradient(145deg, #ff6b35 0%, #e85a2e 100%) !important;
        color: white !important;
        box-shadow: 0 6px 20px rgba(255, 107, 53, 0.4) !important;
      }
      
      .escort-profile-action-btn.primary:hover {
        transform: translateY(-2px) !important;
        box-shadow: 0 10px 30px rgba(255, 107, 53, 0.5) !important;
      }
      
      .escort-profile-action-btn.whatsapp {
        background: linear-gradient(145deg, #25d366 0%, #20ba5a 100%) !important;
        color: white !important;
        box-shadow: 0 6px 20px rgba(37, 211, 102, 0.4) !important;
      }
      
      .escort-profile-action-btn.whatsapp:hover {
        transform: translateY(-2px) !important;
        box-shadow: 0 10px 30px rgba(37, 211, 102, 0.5) !important;
      }
      
      .escort-profile-action-btn.secondary {
        background: linear-gradient(145deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.05)) !important;
        color: white !important;
        border: 1px solid rgba(255, 255, 255, 0.2) !important;
        backdrop-filter: blur(10px) !important;
      }
      
      .escort-profile-action-btn.secondary:hover {
        background: linear-gradient(145deg, rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.15)) !important;
        transform: translateY(-2px) !important;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3) !important;
      }
      
      .escort-profile-stats {
        display: flex !important;
        justify-content: space-around !important;
        padding: 2rem 1.5rem !important;
        background: linear-gradient(135deg, 
          rgba(255, 255, 255, 0.08) 0%, 
          rgba(255, 255, 255, 0.03) 100%) !important;
        border-radius: 1.5rem !important;
        margin: 0 1rem 2rem 1rem !important;
        border: 1px solid rgba(255, 107, 53, 0.2) !important;
        backdrop-filter: blur(10px) !important;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important;
      }
      
      .escort-profile-stat {
        text-align: center !important;
        position: relative !important;
      }
      
      .escort-profile-stat::after {
        content: '' !important;
        position: absolute !important;
        top: 50% !important;
        right: -1px !important;
        transform: translateY(-50%) !important;
        width: 1px !important;
        height: 30px !important;
        background: linear-gradient(to bottom, transparent, rgba(255, 107, 53, 0.3), transparent) !important;
      }
      
      .escort-profile-stat:last-child::after {
        display: none !important;
      }
      
      .escort-profile-stat-value {
        font-size: 2.2rem !important;
        font-weight: 800 !important;
        color: white !important;
        margin: 0 !important;
        background: linear-gradient(135deg, #ff6b35, #ff8a5b) !important;
        -webkit-background-clip: text !important;
        -webkit-text-fill-color: transparent !important;
        background-clip: text !important;
      }
      
      .escort-profile-stat-label {
        font-size: 0.9rem !important;
        color: #9ca3af !important;
        margin: 0 !important;
        font-weight: 500 !important;
        margin-top: 0.5rem !important;
      }
      
      .escort-profile-posts-section {
        padding: 0 1rem 2rem 1rem !important;
      }
      
      .escort-profile-posts-header {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        margin-bottom: 2rem !important;
        flex-wrap: wrap !important;
        gap: 1rem !important;
        padding: 1.5rem !important;
        background: linear-gradient(135deg, 
          rgba(255, 255, 255, 0.05) 0%, 
          rgba(255, 255, 255, 0.02) 100%) !important;
        border-radius: 1rem !important;
        border: 1px solid rgba(255, 107, 53, 0.1) !important;
      }
      
      .escort-profile-posts-title {
        color: white !important;
        font-size: 1.4rem !important;
        font-weight: 700 !important;
        margin: 0 !important;
        display: flex !important;
        align-items: center !important;
        gap: 0.5rem !important;
      }
      
      .escort-profile-posts-filters {
        display: flex !important;
        gap: 0.5rem !important;
        flex-wrap: wrap !important;
      }
      
      .escort-profile-filter-btn {
        padding: 0.6rem 1.2rem !important;
        border-radius: 0.7rem !important;
        border: none !important;
        font-size: 0.9rem !important;
        font-weight: 600 !important;
        cursor: pointer !important;
        transition: all 0.3s ease !important;
        position: relative !important;
        overflow: hidden !important;
      }
      
      .escort-profile-filter-btn.active {
        background: linear-gradient(145deg, #ff6b35, #e85a2e) !important;
        color: white !important;
        box-shadow: 0 4px 15px rgba(255, 107, 53, 0.3) !important;
      }
      
      .escort-profile-filter-btn:not(.active) {
        background: rgba(255, 255, 255, 0.1) !important;
        color: #9ca3af !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
      }
      
      .escort-profile-filter-btn:not(.active):hover {
        background: rgba(255, 255, 255, 0.15) !important;
        color: white !important;
        border-color: rgba(255, 107, 53, 0.3) !important;
      }
      
      .escort-profile-posts-grid {
        display: grid !important;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)) !important;
        gap: 1.5rem !important;
        margin-bottom: 2rem !important;
      }
      
      .escort-profile-post-card {
        position: relative !important;
        aspect-ratio: 1 !important;
        border-radius: 1.2rem !important;
        overflow: hidden !important;
        cursor: pointer !important;
        background: linear-gradient(135deg, 
          rgba(255, 255, 255, 0.08) 0%, 
          rgba(255, 255, 255, 0.03) 100%) !important;
        transition: all 0.3s ease !important;
        border: 1px solid rgba(255, 107, 53, 0.1) !important;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3) !important;
      }
      
      .escort-profile-post-card:hover {
        transform: translateY(-6px) scale(1.02) !important;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5) !important;
        border-color: rgba(255, 107, 53, 0.3) !important;
      }
      
      .escort-profile-post-image {
        width: 100% !important;
        height: 100% !important;
        object-fit: cover !important;
        transition: transform 0.3s ease !important;
      }
      
      .escort-profile-post-card:hover .escort-profile-post-image {
        transform: scale(1.05) !important;
      }
      
      .escort-profile-post-overlay {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        background: linear-gradient(to top, 
          rgba(0,0,0,0.8) 0%, 
          transparent 40%,
          transparent 60%,
          rgba(0,0,0,0.4) 100%) !important;
        display: flex !important;
        align-items: flex-end !important;
        padding: 1rem !important;
        opacity: 0 !important;
        transition: opacity 0.3s ease !important;
      }
      
      .escort-profile-post-card:hover .escort-profile-post-overlay {
        opacity: 1 !important;
      }
      
      .escort-profile-post-stats {
        display: flex !important;
        align-items: center !important;
        gap: 1rem !important;
        width: 100% !important;
      }
      
      .escort-profile-post-stat {
        display: flex !important;
        align-items: center !important;
        gap: 0.3rem !important;
        color: white !important;
        font-size: 0.9rem !important;
        font-weight: 600 !important;
        background: rgba(0, 0, 0, 0.6) !important;
        padding: 0.3rem 0.6rem !important;
        border-radius: 0.5rem !important;
        backdrop-filter: blur(10px) !important;
      }
      
      .escort-profile-loading {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        min-height: 300px !important;
        flex-direction: column !important;
        gap: 1rem !important;
      }
      
      .escort-profile-empty {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        min-height: 300px !important;
        flex-direction: column !important;
        gap: 1rem !important;
        text-align: center !important;
        padding: 2rem !important;
        background: linear-gradient(135deg, 
          rgba(255, 255, 255, 0.05) 0%, 
          rgba(255, 255, 255, 0.02) 100%) !important;
        border-radius: 1rem !important;
        border: 1px solid rgba(255, 107, 53, 0.1) !important;
      }
      
      /* RESPONSIVE MEJORADO */
      @media (max-width: 768px) {
        .escort-profile-header {
          padding: 0.75rem !important;
        }
        
        .escort-profile-hero {
          padding: 1.5rem 1rem !important;
          border-radius: 0 0 1.5rem 1.5rem !important;
        }
        
        .escort-profile-avatar {
          width: 110px !important;
          height: 110px !important;
        }
        
        .escort-profile-name {
          font-size: 1.8rem !important;
        }
        
        .escort-profile-actions {
          flex-direction: column !important;
          align-items: stretch !important;
        }
        
        .escort-profile-action-btn {
          min-width: auto !important;
          justify-content: center !important;
        }
        
        .escort-profile-stats {
          margin: 0 0.5rem 1.5rem 0.5rem !important;
          padding: 1.5rem 1rem !important;
        }
        
        .escort-profile-posts-section {
          padding: 0 0.5rem 2rem 0.5rem !important;
        }
        
        .escort-profile-posts-grid {
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)) !important;
          gap: 1rem !important;
        }
        
        .escort-profile-posts-header {
          flex-direction: column !important;
          align-items: flex-start !important;
          padding: 1rem !important;
        }
      }
      
      @media (max-width: 480px) {
        .escort-profile-posts-grid {
          grid-template-columns: repeat(2, 1fr) !important;
        }
        
        .escort-profile-stats {
          padding: 1rem !important;
        }
        
        .escort-profile-stat-value {
          font-size: 1.8rem !important;
        }
        
        .escort-profile-name {
          font-size: 1.6rem !important;
        }
      }
    `;
    
    // Remover estilos anteriores
    const existingStyle = document.getElementById('escort-profile-styles');
    if (existingStyle) existingStyle.remove();
    
    const style = document.createElement('style');
    style.id = 'escort-profile-styles';
    style.textContent = escortProfileCSS;
    document.head.appendChild(style);
    
    return () => {
      const styleToRemove = document.getElementById('escort-profile-styles');
      if (styleToRemove) styleToRemove.remove();
    };
  }, []);

  // ✅ CARGAR DATOS COMPLETOS DEL PERFIL DESDE EL BACKEND
  const loadProfileDetails = async (userId) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Loading profile details for user:', userId);
      
      const response = await userAPI.getUserById(userId);
      
      if (response.success) {
        console.log('✅ Profile details loaded:', response.data);
        setProfileDetails(response.data);
      } else {
        throw new Error(response.message || 'Error cargando perfil');
      }
    } catch (error) {
      console.error('❌ Error loading profile details:', error);
      setError(handleApiError(error));
    } finally {
      setLoading(false);
    }
  };

  // ✅ CARGAR POSTS ESPECÍFICOS DEL PERFIL DESDE EL BACKEND - CORREGIDO
  const loadProfilePosts = async (userId) => {
    try {
      setPostsLoading(true);
      
      console.log('📸 Loading posts for specific user:', userId);
      
      // ✅ USAR PARÁMETRO authorId PARA FILTRAR POR USUARIO ESPECÍFICO
      const response = await postsAPI.searchPosts({
        authorId: userId, // ✅ FILTRO ESPECÍFICO POR AUTOR
        page: 1,
        limit: 50, // Cargar más posts del perfil
        sortBy: filterPosts === 'recent' ? 'recent' : 
                filterPosts === 'popular' ? 'popular' : 'recent'
      });
      
      if (response.success) {
        console.log('✅ Profile posts loaded:', response.data);
        const posts = response.data.posts || [];
        
        // ✅ VERIFICAR QUE LOS POSTS PERTENECEN AL USUARIO CORRECTO
        const userPosts = posts.filter(post => 
          post.author?.id === userId || 
          post.authorId === userId ||
          post.userId === userId
        );
        
        console.log('✅ Filtered user posts:', userPosts.length, 'of', posts.length);
        setProfilePosts(userPosts);
        
        // Calcular estadísticas reales
        const totalLikes = userPosts.reduce((sum, post) => sum + (post.likesCount || 0), 0);
        const totalViews = userPosts.reduce((sum, post) => sum + (post.viewsCount || 0), 0);
        
        setStats(prev => ({
          ...prev,
          totalPosts: userPosts.length,
          totalLikes,
          totalViews
        }));
      } else {
        throw new Error(response.message || 'Error cargando posts');
      }
    } catch (error) {
      console.error('❌ Error loading profile posts:', error);
      // No mostrar error aquí, ya que los posts son secundarios
      setProfilePosts([]);
    } finally {
      setPostsLoading(false);
    }
  };

  // Efecto para cargar datos cuando se monta el componente
  useEffect(() => {
    if (profileId) {
      console.log('🚀 EscortProfile mounted for profile:', profileId);
      if (!profileDetails || profileDetails.id !== profileId) {
        loadProfileDetails(profileId);
      }
      loadProfilePosts(profileId);
    }
  }, [profileId]);

  // Recargar posts cuando cambia el filtro
  useEffect(() => {
    if (profileId && filterPosts) {
      loadProfilePosts(profileId);
    }
  }, [filterPosts]);

  // Combinar datos iniciales con datos completos del backend
  const profile = profileDetails ? {
    // Datos básicos
    id: profileDetails.id,
    name: `${profileDetails.firstName} ${profileDetails.lastName}`.trim() || profileDetails.username,
    firstName: profileDetails.firstName || '',
    lastName: profileDetails.lastName || '',
    username: profileDetails.username || '',
    email: profileDetails.email || '',
    avatar: profileDetails.avatar || '',
    bio: profileDetails.bio || '',
    phone: profileDetails.phone || '',
    
    // Verificación y premium
    verified: profileDetails.isVerified || 
              profileDetails.escort?.isVerified || 
              profileDetails.agency?.isVerified || false,
    premium: profileDetails.isPremium || false,
    premiumTier: profileDetails.premiumTier || null,
    
    // Tipo de usuario
    userType: profileDetails.userType || 'ESCORT',
    
    // Ubicación
    location: profileDetails.location ? 
              `${profileDetails.location.city || ''}, ${profileDetails.location.country || ''}`.replace(/^,\s*|,\s*$/g, '') : 
              'República Dominicana',
    
    // Datos específicos según tipo de usuario
    escort: profileDetails.escort ? {
      age: profileDetails.escort.age,
      height: profileDetails.escort.height,
      weight: profileDetails.escort.weight,
      bust: profileDetails.escort.bust,
      waist: profileDetails.escort.waist,
      hips: profileDetails.escort.hips,
      hairColor: profileDetails.escort.hairColor,
      eyeColor: profileDetails.escort.eyeColor,
      ethnicity: profileDetails.escort.ethnicity,
      bodyType: profileDetails.escort.bodyType,
      services: profileDetails.escort.services || [],
      rates: profileDetails.escort.rates || {},
      availability: profileDetails.escort.availability || {},
      languages: profileDetails.escort.languages || ['Español'],
      rating: profileDetails.escort.rating || 0,
      reviewsCount: profileDetails.escort.reviewsCount || 0,
      isIndependent: profileDetails.escort.isIndependent !== false,
      acceptsClients: profileDetails.escort.acceptsClients !== false
    } : null,
    
    agency: profileDetails.agency ? {
      companyName: profileDetails.agency.companyName,
      description: profileDetails.agency.description,
      contactPerson: profileDetails.agency.contactPerson,
      address: profileDetails.agency.address,
      website: profileDetails.agency.website,
      socialMedia: profileDetails.agency.socialMedia || {},
      verification: profileDetails.agency.verification || {},
      escortsCount: profileDetails.agency._count?.escorts || 0,
      rating: profileDetails.agency.rating || 0,
      reviewsCount: profileDetails.agency.reviewsCount || 0
    } : null,
    
    // Estadísticas
    profileViews: profileDetails.profileViews || 0,
    postsCount: profileDetails._count?.posts || 0,
    
    // Estados
    isOnline: profileDetails.isOnline || false,
    lastSeen: profileDetails.lastActiveAt || profileDetails.lastLogin,
    createdAt: profileDetails.createdAt,
    
    // Relaciones
    canJoinAgency: !profileDetails.agency && profileDetails.userType === 'ESCORT'
  } : null;

  // Función para expandir imagen
  const expandImage = (post, imageIndex = 0) => {
    setSelectedPost(post);
    setSelectedPostImage({ post, imageIndex });
    setIsImageExpanded(true);
  };

  // Función para manejar acciones
  const handleAction = (action, data) => {
    if (!isAuthenticated && action !== 'back') {
      // Mostrar modal de login o registro
      return;
    }

    switch (action) {
      case 'back':
        if (onBack) onBack();
        break;
      case 'chat':
        if (onStartChat) onStartChat(profile);
        break;
      case 'like':
        if (onToggleLike) onToggleLike(data);
        break;
      case 'whatsapp':
        if (onWhatsApp) onWhatsApp(profile.phone);
        break;
      case 'ban':
        if (onBanUser) onBanUser(profile);
        break;
      case 'report':
        if (onReportUser) onReportUser(profile);
        break;
      default:
        break;
    }
  };

  // Función para compartir perfil
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${profile.name} - TeloFundi`,
        text: profile.bio || `Perfil de ${profile.name}`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      // Mostrar toast de "Enlace copiado"
    }
  };

  // Filtrar posts según el filtro seleccionado
  const filteredPosts = profilePosts.filter(post => {
    switch (filterPosts) {
      case 'recent':
        return true; // Ya viene ordenado por fecha
      case 'popular':
        return (post.likesCount || 0) > 0;
      default:
        return true;
    }
  });

  // WhatsApp Icon Component
  const WhatsAppIcon = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.465 3.488"/>
    </svg>
  );

  return (
    <div className="escort-profile-page">
      {/* HEADER CON BOTÓN DE VOLVER */}
      <div className="escort-profile-header">
        <motion.button
          onClick={() => handleAction('back')}
          className="escort-profile-back-btn"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft size={24} />
        </motion.button>
        
        <h1 className="escort-profile-title">
          {loading ? 'Cargando perfil...' : profile?.name || 'Perfil'}
        </h1>
        
        <motion.button
          onClick={() => setShowMoreActions(!showMoreActions)}
          className="escort-profile-back-btn"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <MoreVertical size={24} />
        </motion.button>
      </div>

      <div className="escort-profile-content">
        {/* LOADING STATE */}
        {loading && !profile && (
          <div className="escort-profile-loading">
            <Loader size={48} className="animate-spin" style={{ color: '#ff6b35' }} />
            <p style={{ color: '#9ca3af', fontSize: '1.1rem', margin: 0 }}>
              Cargando perfil...
            </p>
          </div>
        )}

        {/* ERROR STATE */}
        {error && !loading && !profile && (
          <div className="escort-profile-loading">
            <AlertTriangle size={48} style={{ color: '#ef4444' }} />
            <h3 style={{ color: 'white', fontSize: '1.2rem', margin: 0 }}>
              Error cargando perfil
            </h3>
            <p style={{ color: '#9ca3af', fontSize: '1rem', textAlign: 'center', margin: 0 }}>
              {error}
            </p>
            <motion.button
              onClick={() => loadProfileDetails(profileId)}
              className="escort-profile-action-btn primary"
              style={{ marginTop: '1rem' }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Reintentar
            </motion.button>
          </div>
        )}

        {/* PROFILE CONTENT */}
        {profile && (
          <>
            {/* HERO SECTION */}
            <div className="escort-profile-hero">
              {/* AVATAR */}
              <div style={{ position: 'relative', display: 'inline-block', margin: '0 auto' }}>
                <img
                  src={profile.avatar || 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=200&h=200&fit=crop&crop=face'}
                  alt={profile.name}
                  className="escort-profile-avatar"
                />
                {profile.verified && (
                  <Verified 
                    size={28} 
                    style={{ 
                      position: 'absolute', 
                      bottom: '12px', 
                      right: '12px',
                      color: '#3b82f6', 
                      background: 'white', 
                      borderRadius: '50%',
                      padding: '2px'
                    }} 
                  />
                )}
                {profile.isOnline && (
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    width: '24px',
                    height: '24px',
                    background: '#10b981',
                    borderRadius: '50%',
                    border: '3px solid white',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)'
                  }} />
                )}
              </div>

              {/* INFO */}
              <div className="escort-profile-info">
                <h1 className="escort-profile-name">
                  {profile.name}
                  {profile.escort?.age && (
                    <span style={{ 
                      color: '#d1d5db', 
                      fontSize: '1.8rem',
                      fontWeight: 400
                    }}>
                      , {profile.escort.age}
                    </span>
                  )}
                  {profile.premium && (
                    <Award size={28} style={{ color: '#fbbf24' }} />
                  )}
                </h1>

                <div className="escort-profile-location">
                  <MapPin size={20} style={{ color: '#ff6b35' }} />
                  <span>{profile.location}</span>
                </div>

                {profile.userType === 'ESCORT' && profile.escort?.rating > 0 && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    gap: '0.5rem',
                    marginBottom: '1rem'
                  }}>
                    <Star size={18} style={{ color: '#fbbf24', fill: '#fbbf24' }} />
                    <span style={{ color: '#e5e7eb', fontSize: '1rem' }}>
                      {profile.escort.rating.toFixed(1)} ({profile.escort.reviewsCount} reseñas)
                    </span>
                  </div>
                )}

                {profile.bio && (
                  <p className="escort-profile-bio">
                    {profile.bio}
                  </p>
                )}
              </div>

              {/* ACTION BUTTONS */}
              <div className="escort-profile-actions">
                <motion.button
                  onClick={() => handleAction('chat')}
                  className="escort-profile-action-btn primary"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <MessageCircle size={20} />
                  Chatear
                </motion.button>

                {profile.phone && (
                  <motion.button
                    onClick={() => handleAction('whatsapp')}
                    className="escort-profile-action-btn whatsapp"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <WhatsAppIcon size={20} />
                    WhatsApp
                  </motion.button>
                )}

                <motion.button
                  onClick={handleShare}
                  className="escort-profile-action-btn secondary"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Share2 size={20} />
                  Compartir
                </motion.button>

                {userType === 'admin' && (
                  <motion.button
                    onClick={() => handleAction('ban')}
                    className="escort-profile-action-btn secondary"
                    style={{ 
                      background: 'linear-gradient(145deg, rgba(239, 68, 68, 0.3), rgba(239, 68, 68, 0.1))',
                      borderColor: 'rgba(239, 68, 68, 0.4)',
                      color: '#ef4444'
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Ban size={20} />
                    Banear
                  </motion.button>
                )}
              </div>
            </div>

            {/* STATS SECTION */}
            <div className="escort-profile-stats">
              <div className="escort-profile-stat">
                <div className="escort-profile-stat-value">{stats.totalPosts}</div>
                <div className="escort-profile-stat-label">Posts</div>
              </div>
              <div className="escort-profile-stat">
                <div className="escort-profile-stat-value">{stats.totalLikes}</div>
                <div className="escort-profile-stat-label">Likes</div>
              </div>
              <div className="escort-profile-stat">
                <div className="escort-profile-stat-value">{profile.profileViews}</div>
                <div className="escort-profile-stat-label">Vistas</div>
              </div>
              <div className="escort-profile-stat">
                <div className="escort-profile-stat-value">
                  {new Date(profile.createdAt).getFullYear()}
                </div>
                <div className="escort-profile-stat-label">Se unió</div>
              </div>
            </div>

            {/* POSTS SECTION */}
            <div className="escort-profile-posts-section">
              <div className="escort-profile-posts-header">
                <h2 className="escort-profile-posts-title">
                  <Camera size={24} style={{ color: '#ff6b35' }} />
                  Publicaciones ({filteredPosts.length})
                </h2>

                <div className="escort-profile-posts-filters">
                  <motion.button
                    onClick={() => setFilterPosts('all')}
                    className={`escort-profile-filter-btn ${filterPosts === 'all' ? 'active' : ''}`}
                    whileHover={{ scale: 1.02 }}
                  >
                    Todos
                  </motion.button>
                  <motion.button
                    onClick={() => setFilterPosts('recent')}
                    className={`escort-profile-filter-btn ${filterPosts === 'recent' ? 'active' : ''}`}
                    whileHover={{ scale: 1.02 }}
                  >
                    Recientes
                  </motion.button>
                  <motion.button
                    onClick={() => setFilterPosts('popular')}
                    className={`escort-profile-filter-btn ${filterPosts === 'popular' ? 'active' : ''}`}
                    whileHover={{ scale: 1.02 }}
                  >
                    Populares
                  </motion.button>
                </div>
              </div>

              {/* POSTS GRID */}
              {postsLoading && (
                <div className="escort-profile-loading">
                  <Loader size={32} className="animate-spin" style={{ color: '#ff6b35' }} />
                  <p style={{ color: '#9ca3af', fontSize: '1rem', margin: 0 }}>
                    Cargando publicaciones...
                  </p>
                </div>
              )}

              {!postsLoading && filteredPosts.length === 0 && (
                <div className="escort-profile-empty">
                  <Camera size={48} style={{ color: '#9ca3af' }} />
                  <h3 style={{ color: 'white', fontSize: '1.1rem', margin: 0 }}>
                    No hay publicaciones
                  </h3>
                  <p style={{ color: '#9ca3af', fontSize: '0.9rem', margin: 0 }}>
                    Este perfil aún no ha publicado contenido
                  </p>
                </div>
              )}

              {!postsLoading && filteredPosts.length > 0 && (
                <div className="escort-profile-posts-grid">
                  {filteredPosts.map((post, index) => (
                    <motion.div
                      key={post.id}
                      onClick={() => expandImage(post, 0)}
                      className="escort-profile-post-card"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {post.images && post.images.length > 0 ? (
                        <img
                          src={post.images[0]}
                          alt={post.title || `Post ${index + 1}`}
                          className="escort-profile-post-image"
                        />
                      ) : (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(255, 255, 255, 0.1)'
                        }}>
                          <Camera size={32} style={{ color: '#9ca3af' }} />
                        </div>
                      )}

                      <div className="escort-profile-post-overlay">
                        <div className="escort-profile-post-stats">
                          <div className="escort-profile-post-stat">
                            <Heart size={16} style={{ color: '#ff6b35' }} />
                            <span>{post.likesCount || 0}</span>
                          </div>
                          <div className="escort-profile-post-stat">
                            <Eye size={16} style={{ color: '#9ca3af' }} />
                            <span>{post.viewsCount || 0}</span>
                          </div>
                        </div>
                      </div>

                      {post.images && post.images.length > 1 && (
                        <div style={{
                          position: 'absolute',
                          top: '1rem',
                          right: '1rem',
                          background: 'rgba(0, 0, 0, 0.7)',
                          color: 'white',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '0.25rem',
                          fontSize: '0.8rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}>
                          <Camera size={12} />
                          {post.images.length}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* IMAGE EXPANSION MODAL */}
      <AnimatePresence>
        {isImageExpanded && selectedPostImage && (
          <motion.div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.98)',
              zIndex: 2000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem'
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsImageExpanded(false)}
          >
            <motion.button
              onClick={() => setIsImageExpanded(false)}
              style={{
                position: 'absolute',
                top: '2rem',
                right: '2rem',
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: 'rgba(0, 0, 0, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2001
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <X size={24} />
            </motion.button>

            <img
              src={selectedPostImage.post.images[selectedPostImage.imageIndex]}
              alt="Imagen expandida"
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                borderRadius: '0.75rem'
              }}
              onClick={(e) => e.stopPropagation()}
            />

            {selectedPostImage.post.images.length > 1 && (
              <>
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    const newIndex = selectedPostImage.imageIndex === 0 
                      ? selectedPostImage.post.images.length - 1 
                      : selectedPostImage.imageIndex - 1;
                    setSelectedPostImage(prev => ({ ...prev, imageIndex: newIndex }));
                  }}
                  style={{
                    position: 'absolute',
                    left: '2rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    background: 'rgba(0, 0, 0, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ChevronLeft size={24} />
                </motion.button>

                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    const newIndex = selectedPostImage.imageIndex === selectedPostImage.post.images.length - 1 
                      ? 0 
                      : selectedPostImage.imageIndex + 1;
                    setSelectedPostImage(prev => ({ ...prev, imageIndex: newIndex }));
                  }}
                  style={{
                    position: 'absolute',
                    right: '2rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    background: 'rgba(0, 0, 0, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ChevronRight size={24} />
                </motion.button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EscortProfile;