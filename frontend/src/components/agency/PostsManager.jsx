import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import {
  Plus, ImageIcon, Heart, Rocket, Edit3, Trash2, Loader, Phone, Star, Crown, X, Save, AlertTriangle, MapPin, User, Hash, Camera
} from 'lucide-react';
import { postsAPI, handleApiError } from '../../utils/api.js';

// Constantes y estilos
const STYLES = {
  buttonBase: { borderRadius: '10px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', transition: 'all 0.2s ease', border: '1px solid rgba(255, 255, 255, 0.1)' },
  buttonMobile: { padding: '0.6rem 0.4rem', fontSize: '0.75rem' },
  buttonDesktop: { padding: '0.7rem', fontSize: '0.8rem' },
  input: { width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(0, 0, 0, 0.25)', color: 'white', fontSize: '0.9rem', transition: 'all 0.2s ease', outline: 'none', boxSizing: 'border-box' },
  gradientOrange: 'linear-gradient(135deg, #ff6b35, #e85d04)',
  darkBg: 'linear-gradient(145deg, #1a1a1a 0%, #111111 100%)'
};

// ✅ CONSTANTE PARA VALORES VÁLIDOS DE SEXO
const VALID_SEXO_VALUES = ['Hombre', 'Mujer', 'Trans', 'Otro'];

const BOOST_DURATIONS = [
  { days: 1, label: '24 horas', price: 10 },
  { days: 4, label: '4 días', price: 25 },
  { days: 7, label: '1 semana', price: 40 }
];

const PostsManager = ({ user, onError }) => {
  const [modals, setModals] = useState({ post: false, boost: false, delete: false });
  const [editingPost, setEditingPost] = useState(null);
  const [boostingPost, setBoostingPost] = useState(null);
  const [deletingPost, setDeletingPost] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [userPosts, setUserPosts] = useState([]);
  const [postsStats, setPostsStats] = useState({ totalPosts: 0, activePosts: 0, totalViews: 0, totalLikes: 0 });

  // ✅ CORRECCIÓN 1: useEffect para cargar posts de ESCORT y AGENCY
  useEffect(() => { 
    // ✅ CAMBIO: Incluir AGENCY además de ESCORT
    if (user?.userType === 'ESCORT' || user?.userType === 'AGENCY') {
      console.log('🔍 Loading posts for user type:', user.userType);
      loadUserPosts(); 
    }
  }, [user]);

  // ✅ CORRECCIÓN 2: Función loadUserPosts mejorada
  const loadUserPosts = async () => {
    try {
      setLoadingPosts(true);
      onError(null);
      
      console.log('📋 Loading posts for user:', {
        userType: user?.userType,
        userId: user?.id
      });
      
      if (!postsAPI?.getMyPostsWithOptions) {
        throw new Error('API de posts no está disponible. Verifica la configuración.');
      }
      
      const response = await postsAPI.getMyPostsWithOptions({ 
        status: 'active', 
        page: 1, 
        limit: 50, 
        sortBy: 'recent' 
      });
      
      console.log('📊 Posts API Response:', response);
      
      if (response.success && response.data) {
        const posts = response.data.posts || [];
        console.log('✅ Posts loaded successfully:', posts.length);
        setUserPosts(posts);
        setPostsStats(response.data.stats || {
          totalPosts: posts.length,
          activePosts: posts.filter(p => p.isActive).length,
          totalViews: posts.reduce((sum, p) => sum + (p.viewsCount || 0), 0),
          totalLikes: posts.reduce((sum, p) => sum + (p.likesCount || 0), 0)
        });
      } else {
        console.warn('⚠️ No posts data received or request failed');
        setUserPosts([]);
      }
    } catch (error) {
      console.error('❌ Error cargando posts:', error);
      onError('Error cargando tus anuncios: ' + handleApiError(error));
      setUserPosts([]);
    } finally { 
      setLoadingPosts(false); 
    }
  };

  const toggleModal = (type, state, data = null) => {
    setModals(prev => ({ ...prev, [type]: state }));
    if (type === 'post') setEditingPost(state ? data : null);
    if (type === 'boost') setBoostingPost(state ? data : null);
    if (type === 'delete') setDeletingPost(state ? data : null);
  };

  const handleSavePost = async (postFormData) => {
    try {
      setLoading(true);
      onError(null);
      
      if (!postsAPI) throw new Error('API de posts no está disponible');
      if (!(postFormData instanceof FormData)) throw new Error('Los datos no son FormData válido');

      let hasImages = false, fieldsCount = 0;
      for (let [key, value] of postFormData.entries()) {
        fieldsCount++;
        if (key === 'images' && value instanceof File) hasImages = true;
      }
      if (fieldsCount === 0) throw new Error('FormData está vacío');
      if (!editingPost && !hasImages) throw new Error('Se requiere al menos una imagen para nuevos posts');

      const response = editingPost 
        ? await postsAPI.updatePost(editingPost.id, postFormData) 
        : await postsAPI.createPost(postFormData);
        
      if (response?.success) {
        console.log('✅ Post saved successfully, reloading posts...');
        await loadUserPosts();
        toggleModal('post', false);
        onError(null);
      } else {
        throw new Error(response?.message || 'Error desconocido guardando el post');
      }
    } catch (error) {
      console.error('❌ Error guardando post:', error);
      onError(handleApiError ? handleApiError(error) : error.message || 'Error guardando el anuncio');
    } finally { 
      setLoading(false); 
    }
  };

  // ✅ CORRECCIÓN 3: Función confirmDeletePost corregida
  const confirmDeletePost = async () => {
    if (!deletingPost) return;
    
    try {
      setLoading(true);
      onError(null);
      
      // ✅ VERIFICAR QUE LA API EXISTE
      if (!postsAPI?.deletePost) {
        console.error('❌ postsAPI.deletePost no está disponible');
        console.log('📋 Funciones disponibles en postsAPI:', Object.keys(postsAPI || {}));
        throw new Error('API de eliminación no está disponible - función deletePost no encontrada');
      }
      
      console.log('🗑️ Eliminando post con ID:', deletingPost.id);
      
      // ✅ USAR LA FUNCIÓN CORRECTA: deletePost (no deletePostHelper)
      const response = await postsAPI.deletePost(deletingPost.id);
      
      console.log('📋 Respuesta del servidor:', response);
      
      if (response?.success) {
        console.log('✅ Post eliminado exitosamente, recargando lista...');
        
        // Recargar la lista de posts
        await loadUserPosts();
        
        // Cerrar el modal
        toggleModal('delete', false);
        
        // Limpiar errores
        onError(null);
        
      } else {
        const errorMsg = response?.message || response?.error || 'Error eliminando el post';
        console.error('❌ Error en respuesta del servidor:', errorMsg);
        throw new Error(errorMsg);
      }
      
    } catch (error) {
      console.error('❌ Error completo eliminando post:', {
        error: error.message,
        stack: error.stack,
        postId: deletingPost?.id,
        apiAvailable: !!postsAPI,
        deletePostAvailable: !!postsAPI?.deletePost
      });
      
      const errorMessage = handleApiError ? handleApiError(error) : error.message;
      onError(`Error eliminando el anuncio: ${errorMessage}`);
      
    } finally {
      setLoading(false);
    }
  };

  // ✅ DEBUG: Agregar logging para debugging
  useEffect(() => {
    console.log('🔍 DEBUG: PostsManager state:', {
      userType: user?.userType,
      postsCount: userPosts.length,
      loading: loadingPosts,
      apiAvailable: !!postsAPI
    });
  }, [user, userPosts, loadingPosts]);

  if (loadingPosts) {
    return (
      <div style={{ padding: '1rem', '@media (min-width: 768px)': { padding: '2rem' } }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', flexDirection: 'column', gap: '1rem' }}>
          <Loader className="animate-spin" size={32} color="#ff6b35" />
          <p style={{ color: '#9ca3af', fontSize: '1.1rem' }}>Cargando tus anuncios...</p>
          <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Tipo de usuario: {user?.userType}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ padding: '1rem', maxWidth: '1400px', margin: '0 auto', '@media (min-width: 768px)': { padding: '2rem' } }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem', '@media (min-width: 768px)': { gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '2rem' } }}>
          <CreatePostCard onOpen={() => toggleModal('post', true)} userPosts={userPosts} user={user} />
          {userPosts.map((post, index) => (
            <PostCard key={post.id} post={post} index={index}
              onEdit={() => toggleModal('post', true, post)}
              onBoost={() => toggleModal('boost', true, post)}
              onDelete={() => toggleModal('delete', true, post)}
              loading={loading} />
          ))}
        </div>
        {userPosts.length === 0 && <EmptyState onCreatePost={() => toggleModal('post', true)} userType={user?.userType} />}
      </div>

      {modals.post && createPortal(<ModalOverlay onClose={() => toggleModal('post', false)}><PostFormModal editingPost={editingPost} onSave={handleSavePost} onClose={() => toggleModal('post', false)} loading={loading} user={user} /></ModalOverlay>, document.body)}
      {modals.boost && createPortal(<ModalOverlay onClose={() => toggleModal('boost', false)}><BoostModal post={boostingPost} onClose={() => toggleModal('boost', false)} /></ModalOverlay>, document.body)}
      {modals.delete && createPortal(<ModalOverlay onClose={() => toggleModal('delete', false)}><DeleteModal post={deletingPost} onConfirm={confirmDeletePost} onCancel={() => toggleModal('delete', false)} loading={loading} /></ModalOverlay>, document.body)}
    </>
  );
};

const ModalOverlay = ({ children, onClose }) => {
  const [scrollPosition, setScrollPosition] = useState(0);
  
  useEffect(() => {
    const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
    setScrollPosition(currentScroll);
    
    const dashboardMain = document.querySelector('.dashboard-main');
    const escortDashboard = document.querySelector('.escort-dashboard');
    const originalBodyStyles = { position: document.body.style.position, top: document.body.style.top, width: document.body.style.width, overflow: document.body.style.overflow, height: document.body.style.height };
    const originalHtmlStyles = { overflow: document.documentElement.style.overflow, height: document.documentElement.style.height };
    
    Object.assign(document.body.style, { position: 'fixed', top: `-${currentScroll}px`, left: '0', width: '100%', height: '100vh', overflow: 'hidden' });
    Object.assign(document.documentElement.style, { overflow: 'hidden', height: '100vh' });
    if (dashboardMain) Object.assign(dashboardMain.style, { overflow: 'hidden', position: 'relative' });
    if (escortDashboard) Object.assign(escortDashboard.style, { overflow: 'hidden', position: 'relative' });
    
    return () => {
      Object.entries(originalBodyStyles).forEach(([key, value]) => value ? document.body.style[key] = value : document.body.style.removeProperty(key));
      Object.entries(originalHtmlStyles).forEach(([key, value]) => value ? document.documentElement.style[key] = value : document.documentElement.style.removeProperty(key));
      if (dashboardMain) Object.assign(dashboardMain.style, { overflow: '', position: '' });
      if (escortDashboard) Object.assign(escortDashboard.style, { overflow: '', position: '' });
      window.scrollTo(0, currentScroll);
    };
  }, []);

  useEffect(() => {
    const handleEscape = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        zIndex: 999999, 
        backgroundColor: 'rgba(0, 0, 0, 0.85)', 
        backdropFilter: 'blur(8px)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '20px',
        overflow: 'auto'
      }} 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {children}
    </div>
  );
};

const ModalContainer = ({ children, maxWidth = '500px', onClick }) => {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => { setTimeout(() => setIsVisible(true), 10); }, []);
  return (
    <div style={{ backgroundColor: '#1a1a1a', borderRadius: '20px', border: '1px solid rgba(255, 107, 53, 0.2)', boxShadow: '0 25px 50px rgba(0, 0, 0, 0.8)', width: '100%', maxWidth: maxWidth, maxHeight: '90vh', overflow: 'hidden', transform: isVisible ? 'scale(1)' : 'scale(0.95)', opacity: isVisible ? 1 : 0, transition: 'all 0.2s ease-out', pointerEvents: 'auto' }} onClick={onClick}>
      {children}
    </div>
  );
};

// ✅ CORRECCIÓN 4: CreatePostCard actualizada para mostrar límites apropiados
const CreatePostCard = ({ onOpen, userPosts, user }) => (
  <motion.div style={{ background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.05) 0%, rgba(255, 107, 53, 0.02) 100%)', border: '2px dashed rgba(255, 107, 53, 0.3)', borderRadius: '20px', padding: '2rem 1rem', textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '250px', transition: 'all 0.3s ease', '@media (min-width: 768px)': { padding: '3rem 2rem', minHeight: '280px' } }} onClick={onOpen} whileHover={{ scale: 1.02, borderColor: 'rgba(255, 107, 53, 0.5)' }} whileTap={{ scale: 0.98 }}>
    <div style={{ background: 'rgba(255, 107, 53, 0.1)', borderRadius: '50%', padding: '1.5rem', marginBottom: '1.5rem' }}><Plus size={32} style={{ color: '#ff6b35' }} /></div>
    <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'white', margin: 0, marginBottom: '0.5rem', '@media (min-width: 768px)': { fontSize: '1.3rem' } }}>Crear Nuevo Anuncio</h3>
    <p style={{ color: '#9ca3af', fontSize: '0.9rem', margin: '0.5rem 0', '@media (min-width: 768px)': { fontSize: '1rem' } }}>Publica anuncios de tus servicios</p>
    {/* ✅ CORRECCIÓN: Mostrar límites solo para ESCORTS */}
    {user?.userType === 'ESCORT' && (
      <div style={{ background: 'rgba(255, 107, 53, 0.1)', border: '1px solid rgba(255, 107, 53, 0.3)', borderRadius: '20px', padding: '0.5rem 1rem', fontSize: '0.9rem', color: '#ff6b35', fontWeight: '600' }}>
        {userPosts.length}/5 anuncios activos
      </div>
    )}
    {user?.userType === 'AGENCY' && (
      <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '20px', padding: '0.5rem 1rem', fontSize: '0.9rem', color: '#22c55e', fontWeight: '600' }}>
        {userPosts.length} anuncios activos
      </div>
    )}
  </motion.div>
);

const PostCard = ({ post, index, onEdit, onBoost, onDelete, loading }) => (
  <motion.div style={{ background: STYLES.darkBg, borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.1)', transition: 'all 0.3s ease' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} whileHover={{ y: -8, boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)' }}>
    <div style={{ position: 'relative', width: '100%', paddingTop: '65%', background: '#000', overflow: 'hidden' }}>
      <img src={post.images?.[0] || 'https://via.placeholder.com/400x260?text=Sin+Imagen'} alt="Post" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }} onError={(e) => { e.target.src = 'https://via.placeholder.com/400x260?text=Sin+Imagen'; }} />
      <PostBadges post={post} />
      <div style={{ position: 'absolute', bottom: '1rem', right: '1rem' }}><div style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(10px)', color: 'white', padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}><Heart size={12} style={{ color: '#ff6b35' }} />{post.likesCount || 0}</div></div>
    </div>
    <div style={{ padding: '1rem 1rem 1.5rem', '@media (min-width: 768px)': { padding: '1.5rem' } }}>
      <PostContent post={post} />
      <PostActions onEdit={onEdit} onBoost={onBoost} onDelete={onDelete} loading={loading} />
    </div>
  </motion.div>
);

const PostBadges = ({ post }) => (
  <div style={{ position: 'absolute', top: '1rem', left: '1rem', display: 'flex', gap: '0.5rem' }}>
    {post.isBoosted && <div style={{ background: STYLES.gradientOrange, color: 'white', padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px', backdropFilter: 'blur(10px)' }}><Rocket size={12} />Impulsado</div>}
    {post.premiumOnly && <div style={{ background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.9), rgba(255, 193, 7, 0.9))', color: '#000', padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}><Crown size={12} />Premium</div>}
  </div>
);

const PostContent = ({ post }) => (
  <>
    <h4 style={{ color: 'white', fontSize: '1rem', fontWeight: '700', marginBottom: '0.8rem', lineHeight: '1.3', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', '@media (min-width: 768px)': { fontSize: '1.1rem' } }}>{post.title}</h4>
    <p style={{ color: '#d1d5db', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '1.2rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{post.description}</p>
    
    {/* ✅ MOSTRAR EDAD, SEXO Y UBICACIÓN DEL POST */}
    {(post.age || post.sexo || post.location) && (
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {post.age && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', background: 'rgba(255, 107, 53, 0.05)', borderRadius: '12px', border: '1px solid rgba(255, 107, 53, 0.1)' }}>
            <User size={12} style={{ color: '#ff6b35' }} />
            <span style={{ color: '#e5e7eb', fontSize: '0.8rem' }}>{post.age} años</span>
          </div>
        )}
        {post.sexo && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', background: 'rgba(255, 107, 53, 0.05)', borderRadius: '12px', border: '1px solid rgba(255, 107, 53, 0.1)' }}>
            <User size={12} style={{ color: '#ff6b35' }} />
            <span style={{ color: '#e5e7eb', fontSize: '0.8rem' }}>{post.sexo}</span>
          </div>
        )}
        {post.location && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', background: 'rgba(255, 107, 53, 0.05)', borderRadius: '12px', border: '1px solid rgba(255, 107, 53, 0.1)' }}>
            <MapPin size={12} style={{ color: '#ff6b35' }} />
            <span style={{ color: '#e5e7eb', fontSize: '0.8rem' }}>{post.location}</span>
          </div>
        )}
      </div>
    )}

    {post.phone && <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', padding: '0.6rem', background: 'rgba(255, 107, 53, 0.05)', borderRadius: '10px', border: '1px solid rgba(255, 107, 53, 0.1)' }}><Phone size={14} style={{ color: '#ff6b35' }} /><span style={{ color: '#e5e7eb', fontSize: '0.9rem' }}>{post.phone}</span></div>}
    {post.services && Array.isArray(post.services) && post.services.length > 0 && (
      <div style={{ marginBottom: '1.2rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {post.services.slice(0, 3).map((service, idx) => <span key={idx} style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#d1d5db', padding: '0.3rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem', border: '1px solid rgba(255, 255, 255, 0.1)' }}>{service}</span>)}
          {post.services.length > 3 && <span style={{ color: '#9ca3af', fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}>+{post.services.length - 3} más</span>}
        </div>
      </div>
    )}
  </>
);

const PostActions = ({ onEdit, onBoost, onDelete, loading }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', '@media (min-width: 768px)': { gap: '0.8rem' } }}>
    {[
      { onClick: onEdit, bg: 'rgba(255, 255, 255, 0.05)', color: '#e5e7eb', hoverBg: 'rgba(255, 255, 255, 0.1)', icon: Edit3, text: 'Editar' },
      { onClick: onBoost, bg: 'rgba(255, 107, 53, 0.1)', color: '#ff6b35', hoverBg: 'rgba(255, 107, 53, 0.2)', icon: Rocket, text: 'Promocionar', border: '1px solid rgba(255, 107, 53, 0.3)' },
      { onClick: onDelete, bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', hoverBg: 'rgba(239, 68, 68, 0.2)', icon: Trash2, text: 'Eliminar', border: '1px solid rgba(239, 68, 68, 0.3)' }
    ].map(({ onClick, bg, color, hoverBg, icon: Icon, text, border }, idx) => (
      <motion.button key={idx} style={{ ...STYLES.buttonBase, ...STYLES.buttonMobile, background: bg, color, border: border || STYLES.buttonBase.border, '@media (min-width: 768px)': STYLES.buttonDesktop }} onClick={onClick} whileHover={{ scale: 1.05, backgroundColor: hoverBg }} whileTap={{ scale: 0.95 }} disabled={loading}>
        <Icon size={14} />{text}
      </motion.button>
    ))}
  </div>
);

// ✅ CORRECCIÓN 5: EmptyState mejorado con userType
const EmptyState = ({ onCreatePost, userType }) => (
  <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#9ca3af', '@media (min-width: 768px)': { padding: '4rem 2rem' } }}>
    <div style={{ background: 'rgba(255, 107, 53, 0.1)', borderRadius: '50%', padding: '2rem', display: 'inline-block', marginBottom: '2rem' }}><ImageIcon size={64} style={{ color: '#ff6b35', opacity: 0.7 }} /></div>
    <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem', color: 'white', fontWeight: '700', '@media (min-width: 768px)': { fontSize: '1.5rem' } }}>Aún no tienes anuncios</h3>
    <p style={{ fontSize: '1rem', marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem', '@media (min-width: 768px)': { fontSize: '1.1rem' } }}>
      {userType === 'AGENCY' 
        ? 'Crea tu primer anuncio para promocionar tus servicios de agencia'
        : 'Crea tu primer anuncio para empezar a recibir clientes y hacer crecer tu negocio'
      }
    </p>
    <motion.button style={{ background: STYLES.gradientOrange, border: 'none', borderRadius: '12px', color: 'white', padding: '1rem 2rem', fontSize: '1rem', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }} onClick={onCreatePost} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
      <Plus size={20} />Crear mi primer anuncio
    </motion.button>
  </div>
);

// ✅ COMPONENTE LOCATIONINPUT CON GEOLOCALIZACIÓN AUTOMÁTICA
const LocationInput = ({ location, onChange, placeholder }) => {
  const [inputValue, setInputValue] = useState(location || '');
  const [isDetecting, setIsDetecting] = useState(false);
  const [hasAutoDetected, setHasAutoDetected] = useState(false);

  useEffect(() => {
    if (!location && !hasAutoDetected) {
      detectLocationAutomatically();
    }
  }, [location, hasAutoDetected]);

  const detectLocationAutomatically = () => {
    if (isDetecting || hasAutoDetected) return;
    
    setIsDetecting(true);
    setHasAutoDetected(true);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=es`);
            const data = await response.json();
            const locationString = `${data.city || data.locality || ''}, ${data.countryName || ''}`.trim().replace(/^,\s*/, '');
            
            if (locationString && locationString !== ', ') {
              setInputValue(locationString);
              onChange(locationString);
            }
          } catch (error) {
            console.log('Geolocalización no disponible:', error);
          } finally { 
            setIsDetecting(false); 
          }
        },
        (error) => { 
          console.log('Geolocalización no permitida:', error); 
          setIsDetecting(false); 
        },
        { 
          timeout: 5000, 
          enableHighAccuracy: false, 
          maximumAge: 300000 
        }
      );
    } else { 
      setIsDetecting(false); 
    }
  };

  const handleManualChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    onChange(value);
  };

  return (
    <div style={{ position: 'relative' }}>
      <input 
        type="text" 
        value={inputValue} 
        onChange={handleManualChange}
        placeholder={isDetecting ? 'Detectando ubicación...' : placeholder} 
        disabled={isDetecting}
        style={{ 
          ...STYLES.input, 
          paddingRight: '45px',
          opacity: isDetecting ? 0.7 : 1,
          cursor: isDetecting ? 'wait' : 'text'
        }} 
        onFocus={(e) => e.target.style.borderColor = 'rgba(255, 107, 53, 0.4)'} 
        onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'} 
      />
      
      <div style={{ 
        position: 'absolute', 
        right: '12px', 
        top: '50%', 
        transform: 'translateY(-50%)',
        display: 'flex',
        alignItems: 'center',
        pointerEvents: 'none'
      }}>
        {isDetecting ? (
          <Loader size={16} className="animate-spin" style={{ color: '#ff6b35' }} />
        ) : (
          <MapPin size={16} style={{ color: '#9ca3af' }} />
        )}
      </div>
    </div>
  );
};

// ✅ COMPONENTE SEXOINPUT
const SexoInput = ({ sexo, onChange, error, required = true }) => {
  const [selectedSexo, setSelectedSexo] = useState(sexo || '');

  useEffect(() => {
    console.log('🔍 SexoInput useEffect - sexo prop changed:', sexo);
    setSelectedSexo(sexo || '');
  }, [sexo]);

  const handleChange = (value) => {
    console.log('🔍 SexoInput handleChange called with:', value);
    setSelectedSexo(value);
    onChange(value);
    console.log('✅ SexoInput onChange called with:', value);
  };

  return (
    <div>
      <label style={{ 
        fontSize: '0.85rem', 
        fontWeight: '600', 
        color: 'white', 
        marginBottom: '6px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '6px' 
      }}>
        <User size={14} style={{ color: '#ff6b35' }} />
        Sexo {required && '*'}
      </label>
      
      <select
        value={selectedSexo}
        onChange={(e) => {
          console.log('🔍 Select onChange triggered:', e.target.value);
          handleChange(e.target.value);
        }}
        style={{
          ...STYLES.input,
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml;charset=UTF-8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6,9 12,15 18,9'></polyline></svg>")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 12px center',
          backgroundSize: '16px',
          paddingRight: '40px',
          border: `1px solid ${error ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`
        }}
        onFocus={(e) => e.target.style.borderColor = error ? 'rgba(239, 68, 68, 0.6)' : 'rgba(255, 107, 53, 0.4)'}
        onBlur={(e) => e.target.style.borderColor = error ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.08)'}
        required={required}
      >
        <option value="" style={{ background: '#1a1a1a', color: '#9ca3af' }}>
          {required ? 'Selecciona tu sexo' : 'Selecciona (opcional)'}
        </option>
        {VALID_SEXO_VALUES.map((sexoOption) => (
          <option 
            key={sexoOption} 
            value={sexoOption}
            style={{ background: '#1a1a1a', color: 'white' }}
          >
            {sexoOption}
          </option>
        ))}
      </select>
      
      {error && (
        <span style={{ 
          color: '#ef4444', 
          fontSize: '0.75rem', 
          marginTop: '4px', 
          display: 'block' 
        }}>
          {error}
        </span>
      )}
    </div>
  );
};

const ServicesInput = ({ services, onChange, maxServices, placeholder }) => {
  const [inputValue, setInputValue] = useState('');
  
  const safeServices = Array.isArray(services) ? services : [];

  const addService = () => {
    if (inputValue.trim() && safeServices.length < maxServices) {
      onChange([...safeServices, inputValue.trim()]);
      setInputValue('');
    }
  };

  const removeService = (index) => onChange(safeServices.filter((_, i) => i !== index));
  const handleKeyPress = (e) => { if (e.key === 'Enter') { e.preventDefault(); addService(); } };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: safeServices.length > 0 ? '12px' : '0' }}>
        <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyPress={handleKeyPress} placeholder={safeServices.length >= maxServices ? `Máximo ${maxServices} servicios` : placeholder} disabled={safeServices.length >= maxServices} style={{ ...STYLES.input, flex: 1, opacity: safeServices.length >= maxServices ? 0.5 : 1 }} onFocus={(e) => e.target.style.borderColor = 'rgba(255, 107, 53, 0.4)'} onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'} />
        <button type="button" onClick={addService} disabled={!inputValue.trim() || safeServices.length >= maxServices} style={{ padding: '12px 16px', borderRadius: '10px', border: 'none', background: !inputValue.trim() || safeServices.length >= maxServices ? 'rgba(156, 163, 175, 0.15)' : STYLES.gradientOrange, color: 'white', fontSize: '0.85rem', cursor: !inputValue.trim() || safeServices.length >= maxServices ? 'not-allowed' : 'pointer', opacity: !inputValue.trim() || safeServices.length >= maxServices ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s ease' }}>
          <Plus size={16} />
        </button>
      </div>

      {safeServices.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
          {safeServices.map((service, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(255, 107, 53, 0.08)', border: '1px solid rgba(255, 107, 53, 0.2)', borderRadius: '20px', color: '#ff6b35', fontSize: '0.85rem', fontWeight: '500' }}>
              <span>{service}</span>
              <button type="button" onClick={() => removeService(index)} style={{ background: 'none', border: 'none', color: '#ff6b35', cursor: 'pointer', fontSize: '16px', padding: '0', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', transition: 'background 0.2s ease' }} onMouseEnter={(e) => e.target.style.background = 'rgba(255, 107, 53, 0.2)'} onMouseLeave={(e) => e.target.style.background = 'none'}>×</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ color: '#6b7280', fontSize: '0.75rem', textAlign: 'right', marginTop: '4px' }}>{safeServices.length}/{maxServices} servicios</div>
    </div>
  );
};

const PostFormModal = ({ editingPost, onSave, onClose, loading, user }) => {
  // ✅ FORMDATA INICIAL CON CAMPO SEXO
  const [formData, setFormData] = useState({ 
    title: editingPost?.title || '', 
    description: editingPost?.description || '', 
    phone: editingPost?.phone || '', 
    services: Array.isArray(editingPost?.services) ? editingPost.services : [], 
    premiumOnly: editingPost?.premiumOnly || false, 
    images: [], 
    currentImages: editingPost?.images || [], 
    removeImages: [], 
    age: editingPost?.age || user?.escort?.age || '', 
    location: editingPost?.location || '',
    sexo: editingPost?.sexo || '' // ✅ NUEVO: Campo sexo agregado
  });
  const [validationErrors, setValidationErrors] = useState({});
  const postFileInputRef = useRef(null);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .PhoneInput {
        width: 100% !important;
      }
      .PhoneInputInput {
        width: 100% !important;
        padding: 12px 14px !important;
        padding-left: 52px !important;
        border-radius: 10px !important;
        border: 1px solid rgba(255, 255, 255, 0.08) !important;
        background: rgba(0, 0, 0, 0.25) !important;
        color: white !important;
        fontSize: 0.9rem !important;
        outline: none !important;
        box-sizing: border-box !important;
        transition: all 0.2s ease !important;
      }
      .PhoneInputInput:focus {
        border-color: rgba(255, 107, 53, 0.4) !important;
      }
      .PhoneInputInput::placeholder {
        color: rgba(156, 163, 175, 0.7) !important;
      }
      .PhoneInputCountrySelect {
        background: rgba(0, 0, 0, 0.25) !important;
        border: 1px solid rgba(255, 255, 255, 0.08) !important;
        border-radius: 10px 0 0 10px !important;
        border-right: none !important;
        padding-left: 12px !important;
        padding-right: 8px !important;
      }
      .PhoneInputCountrySelectArrow {
        color: white !important;
        opacity: 0.7 !important;
      }
      .PhoneInputCountryIcon {
        width: 1.2em !important;
        height: 1.2em !important;
      }
      .phone-input-error .PhoneInputInput {
        border-color: rgba(239, 68, 68, 0.4) !important;
      }
      .phone-input-error .PhoneInputCountrySelect {
        border-color: rgba(239, 68, 68, 0.4) !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  const validateForm = () => {
    const errors = {};
    if (!formData.title?.trim()) errors.title = 'El título es obligatorio';
    else if (formData.title.length < 5) errors.title = 'El título debe tener al menos 5 caracteres';
    else if (formData.title.length > 100) errors.title = 'El título no puede exceder 100 caracteres';
    if (!formData.description?.trim()) errors.description = 'La descripción es obligatoria';
    else if (formData.description.length < 10) errors.description = 'La descripción debe tener al menos 10 caracteres';
    else if (formData.description.length > 2000) errors.description = 'La descripción no puede exceder 2000 caracteres';
    if (!formData.phone?.trim()) errors.phone = 'El teléfono es obligatorio';
    if (!formData.age) errors.age = 'La edad es obligatoria';
    else if (formData.age < 18) errors.age = 'Debes ser mayor de 18 años';
    else if (formData.age > 80) errors.age = 'Edad máxima permitida: 80 años';
    if (!formData.location?.trim()) errors.location = 'La ubicación es obligatoria';
    
    // ✅ VALIDACIÓN MEJORADA DEL CAMPO SEXO CON DEBUG
    console.log('🔍 Validando campo sexo:', {
      value: formData.sexo,
      type: typeof formData.sexo,
      trimmed: formData.sexo?.trim(),
      isEmpty: !formData.sexo?.trim()
    });

    if (!formData.sexo?.trim()) {
      console.error('❌ Validación fallida: Campo sexo vacío');
      errors.sexo = 'El sexo es obligatorio';
    } else if (!VALID_SEXO_VALUES.includes(formData.sexo.trim())) {
      console.error('❌ Validación fallida: Valor de sexo inválido:', formData.sexo);
      errors.sexo = `El sexo debe ser uno de: ${VALID_SEXO_VALUES.join(', ')}`;
    } else {
      console.log('✅ Campo sexo validado correctamente:', formData.sexo.trim());
    }
    
    if (formData.services.length === 0) errors.services = 'Agrega al menos un servicio';
    else if (formData.services.length > 3) errors.services = 'Máximo 3 servicios permitidos';
    const totalImages = formData.images.length + formData.currentImages.length - formData.removeImages.length;
    if (totalImages === 0) errors.images = 'Debes tener al menos una imagen';
    else if (totalImages > 5) errors.images = 'Máximo 5 imágenes permitidas';
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field, value) => {
    console.log(`🔍 handleInputChange called - Field: ${field}, Value:`, value);
    
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      console.log(`✅ FormData updated - ${field}:`, newData[field]);
      return newData;
    });
    
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: null }));
      console.log(`✅ Validation error cleared for field: ${field}`);
    }
  };

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);
    const maxFiles = 5 - (formData.currentImages.length - formData.removeImages.length);
    if (files.length > maxFiles) { alert(`Solo puedes agregar ${maxFiles} imágenes más`); return; }

    const validFiles = files.filter(file => {
      if (file.size > 8 * 1024 * 1024) { alert(`El archivo ${file.name} es muy grande. Máximo 8MB por imagen.`); return false; }
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) { alert(`El archivo ${file.name} no es un formato de imagen válido.`); return false; }
      return true;
    });

    setFormData(prev => ({ ...prev, images: [...prev.images, ...validFiles] }));
    event.target.value = '';
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      const postFormData = new FormData();
      
      // ✅ DEBUG: Verificar datos antes de enviar
      console.log('🔍 DEBUG FormData - Datos antes de enviar:', {
        title: formData.title?.trim(),
        description: formData.description?.trim(),
        phone: formData.phone?.trim(),
        age: formData.age?.toString(),
        location: formData.location?.trim(),
        sexo: formData.sexo?.trim(), // ✅ VERIFICAR QUE NO ESTÉ VACÍO
        servicesLength: formData.services?.length || 0,
        imagesLength: formData.images?.length || 0
      });

      // ✅ VERIFICACIÓN ADICIONAL DEL CAMPO SEXO
      if (!formData.sexo || formData.sexo.trim() === '') {
        console.error('❌ ERROR: Campo sexo está vacío antes de enviar');
        alert('Error: El campo sexo es obligatorio y está vacío');
        return;
      }

      // ✅ VERIFICACIÓN QUE EL VALOR SEA VÁLIDO
      if (!VALID_SEXO_VALUES.includes(formData.sexo.trim())) {
        console.error('❌ ERROR: Valor de sexo inválido:', formData.sexo);
        alert(`Error: Valor de sexo inválido. Debe ser uno de: ${VALID_SEXO_VALUES.join(', ')}`);
        return;
      }

      // ✅ AGREGAR CAMPOS AL FORMDATA
      postFormData.append('title', formData.title.trim());
      postFormData.append('description', formData.description.trim());
      postFormData.append('phone', formData.phone.trim());
      postFormData.append('age', formData.age.toString());
      postFormData.append('location', formData.location.trim());
      
      // ✅ CAMPO SEXO - ASEGURAR QUE SE ENVÍE
      postFormData.append('sexo', formData.sexo.trim());
      console.log('✅ Campo sexo agregado al FormData:', formData.sexo.trim());
      
      if (formData.services?.length > 0) postFormData.append('services', JSON.stringify(formData.services));
      if (formData.premiumOnly !== undefined) postFormData.append('premiumOnly', formData.premiumOnly.toString());
      
      formData.images.forEach((image, index) => {
        postFormData.append('images', image);
        console.log(`✅ Imagen ${index + 1} agregada:`, image.name);
      });
      
      if (editingPost && formData.removeImages.length > 0) postFormData.append('removeImages', JSON.stringify(formData.removeImages));

      // ✅ DEBUG: Verificar contenido del FormData
      console.log('🔍 DEBUG: Contenido completo del FormData:');
      for (let [key, value] of postFormData.entries()) {
        console.log(`  ${key}:`, typeof value === 'object' ? `[File: ${value.name}]` : value);
      }

      console.log('📤 Enviando FormData al servidor...');
      await onSave(postFormData);
      
    } catch (error) { 
      console.error('❌ Error en handleSubmit:', error); 
    }
  };

  const currentVisibleImages = formData.currentImages.filter(img => !formData.removeImages.includes(img));
  const totalImages = formData.images.length + currentVisibleImages.length;
  const isDesktop = window.innerWidth >= 768;

  return (
    <ModalContainer maxWidth="min(1100px, 95vw)" onClick={(e) => e.stopPropagation()}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.06) 0%, rgba(255, 107, 53, 0.01) 100%)', borderBottom: '1px solid rgba(255, 107, 53, 0.1)', backdropFilter: 'blur(10px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: 'rgba(255, 107, 53, 0.1)', borderRadius: '10px', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageIcon size={18} style={{ color: '#ff6b35' }} /></div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'white', margin: 0 }}>{editingPost ? 'Editar Anuncio' : 'Nuevo Anuncio'}</h2>
        </div>
        <button onClick={onClose} disabled={loading} style={{ width: '36px', height: '36px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold', transition: 'all 0.2s ease' }} onMouseEnter={(e) => { e.target.style.background = 'rgba(239, 68, 68, 0.1)'; e.target.style.borderColor = 'rgba(239, 68, 68, 0.3)'; e.target.style.color = '#ef4444'; }} onMouseLeave={(e) => { e.target.style.background = 'rgba(255, 255, 255, 0.05)'; e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'; e.target.style.color = '#9ca3af'; }}>×</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '280px 1fr' : '1fr', gap: isDesktop ? '20px' : '0', padding: '20px', maxHeight: 'calc(90vh - 80px)', overflow: 'hidden' }}>
        <div style={{ background: 'rgba(0, 0, 0, 0.15)', borderRadius: '16px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.05)', height: 'fit-content' }}>
          <h3 style={{ color: 'white', fontSize: '0.9rem', fontWeight: '600', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}><Camera size={16} style={{ color: '#ff6b35' }} />Imágenes ({totalImages}/5)</h3>
          
          <div style={{ border: '2px dashed rgba(255, 107, 53, 0.25)', borderRadius: '12px', padding: '20px', textAlign: 'center', cursor: totalImages < 5 ? 'pointer' : 'not-allowed', background: totalImages < 5 ? 'rgba(255, 107, 53, 0.02)' : 'rgba(156, 163, 175, 0.02)', transition: 'all 0.2s ease', opacity: totalImages >= 5 ? 0.5 : 1, minHeight: '100px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }} onClick={() => totalImages < 5 && postFileInputRef.current?.click()} onMouseEnter={(e) => { if (totalImages < 5) { e.target.style.borderColor = 'rgba(255, 107, 53, 0.4)'; e.target.style.background = 'rgba(255, 107, 53, 0.04)'; } }} onMouseLeave={(e) => { if (totalImages < 5) { e.target.style.borderColor = 'rgba(255, 107, 53, 0.25)'; e.target.style.background = 'rgba(255, 107, 53, 0.02)'; } }}>
            <input type="file" ref={postFileInputRef} onChange={handleImageUpload} accept="image/*" multiple style={{ display: 'none' }} disabled={totalImages >= 5 || loading} />
            <ImageIcon size={28} style={{ color: '#ff6b35', marginBottom: '8px' }} />
            <div style={{ color: 'white', fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px' }}>{totalImages === 0 ? 'Subir Fotos' : `${totalImages}/5 fotos`}</div>
            <div style={{ color: '#9ca3af', fontSize: '0.75rem', marginBottom: '10px' }}>{totalImages < 5 ? 'JPG, PNG hasta 8MB' : 'Máximo alcanzado'}</div>
            {totalImages < 5 && <button onClick={(e) => { e.stopPropagation(); postFileInputRef.current?.click(); }} disabled={loading} style={{ background: STYLES.gradientOrange, color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '0.8rem', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s ease' }}><Plus size={14} />{loading ? 'Subiendo...' : 'Agregar'}</button>}
          </div>

          {(formData.images.length > 0 || currentVisibleImages.length > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: '12px' }}>
              {editingPost && currentVisibleImages.map((imageUrl, index) => (
                <div key={`current-${index}`} style={{ position: 'relative', aspectRatio: '1', borderRadius: '10px', overflow: 'hidden', border: '2px solid rgba(255, 255, 255, 0.1)', group: 'image-container' }}>
                  <img src={imageUrl} alt={`${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.2s ease' }} />
                  <button onClick={() => setFormData(prev => ({ ...prev, removeImages: [...prev.removeImages, imageUrl] }))} disabled={loading} style={{ position: 'absolute', top: '6px', right: '6px', width: '24px', height: '24px', background: 'rgba(239, 68, 68, 0.9)', border: 'none', borderRadius: '50%', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', transition: 'all 0.2s ease', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)', opacity: '0.8' }} onMouseEnter={(e) => e.target.style.opacity = '1'} onMouseLeave={(e) => e.target.style.opacity = '0.8'}>×</button>
                </div>
              ))}
              
              {formData.images.map((file, index) => (
                <div key={`new-${index}`} style={{ position: 'relative', aspectRatio: '1', borderRadius: '10px', overflow: 'hidden', border: '2px solid rgba(34, 197, 94, 0.6)', boxShadow: '0 4px 12px rgba(34, 197, 94, 0.2)' }}>
                  <img src={URL.createObjectURL(file)} alt={`${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button onClick={() => setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }))} disabled={loading} style={{ position: 'absolute', top: '6px', right: '6px', width: '24px', height: '24px', background: 'rgba(239, 68, 68, 0.9)', border: 'none', borderRadius: '50%', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', transition: 'all 0.2s ease', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)' }}>×</button>
                  <div style={{ position: 'absolute', top: '6px', left: '6px', background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: 'white', padding: '4px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '600', boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)' }}>Nueva</div>
                </div>
              ))}
            </div>
          )}
          
          {validationErrors.images && <div style={{ marginTop: '10px', padding: '8px 12px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: '#ef4444', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}><AlertTriangle size={14} />{validationErrors.images}</div>}
        </div>

        <div style={{ overflowY: 'auto', paddingRight: '4px', maxHeight: isDesktop ? 'calc(90vh - 120px)' : 'calc(70vh - 120px)' }}>
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ display: 'grid', gap: '16px' }}>
              
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'white', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}><Edit3 size={14} style={{ color: '#ff6b35' }} />Título *</label>
                <input type="text" placeholder="Título del anuncio" value={formData.title} onChange={(e) => handleInputChange('title', e.target.value)} maxLength={100} style={{ ...STYLES.input, border: `1px solid ${validationErrors.title ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`, padding: '14px 16px', borderRadius: '12px' }} onFocus={(e) => e.target.style.borderColor = validationErrors.title ? 'rgba(239, 68, 68, 0.6)' : 'rgba(255, 107, 53, 0.4)'} onBlur={(e) => e.target.style.borderColor = validationErrors.title ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.08)'} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  {validationErrors.title && <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>{validationErrors.title}</span>}
                  <span style={{ color: '#6b7280', fontSize: '0.75rem', marginLeft: 'auto' }}>{formData.title.length}/100</span>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'white', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}><Edit3 size={14} style={{ color: '#ff6b35' }} />Descripción *</label>
                <textarea placeholder="Describe tus servicios..." value={formData.description} maxLength={2000} onChange={(e) => handleInputChange('description', e.target.value)} rows={4} style={{ ...STYLES.input, minHeight: '100px', padding: '14px 16px', borderRadius: '12px', border: `1px solid ${validationErrors.description ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`, lineHeight: '1.5', resize: 'vertical', fontFamily: 'inherit' }} onFocus={(e) => e.target.style.borderColor = validationErrors.description ? 'rgba(239, 68, 68, 0.6)' : 'rgba(255, 107, 53, 0.4)'} onBlur={(e) => e.target.style.borderColor = validationErrors.description ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.08)'} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  {validationErrors.description && <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>{validationErrors.description}</span>}
                  <span style={{ color: '#6b7280', fontSize: '0.75rem', marginLeft: 'auto' }}>{formData.description.length}/2000</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'white', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={14} style={{ color: '#ff6b35' }} />Contacto *</label>
                  <PhoneInput 
                    placeholder="+1-829-XXX-XXXX" 
                    value={formData.phone} 
                    onChange={(value) => handleInputChange('phone', value || '')} 
                    defaultCountry="DO" 
                    international 
                    countryCallingCodeEditable={false}
                    className={validationErrors.phone ? 'phone-input-error' : ''}
                  />
                  {validationErrors.phone && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{validationErrors.phone}</span>}
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'white', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}><User size={14} style={{ color: '#ff6b35' }} />Edad *</label>
                  <input type="number" placeholder="Tu edad" value={formData.age} min={18} max={80} onChange={(e) => handleInputChange('age', parseInt(e.target.value) || '')} style={{ ...STYLES.input, flex: 1, border: `1px solid ${validationErrors.age ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`, WebkitAppearance: 'none', MozAppearance: 'textfield' }} onFocus={(e) => e.target.style.borderColor = validationErrors.age ? 'rgba(239, 68, 68, 0.6)' : 'rgba(255, 107, 53, 0.4)'} onBlur={(e) => e.target.style.borderColor = validationErrors.age ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.08)'} />
                  {validationErrors.age && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{validationErrors.age}</span>}
                </div>
              </div>

              {/* ✅ NUEVA GRILLA: Ubicación y Sexo */}
              <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'white', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={14} style={{ color: '#ff6b35' }} />Ubicación *</label>
                  <LocationInput location={formData.location} onChange={(value) => handleInputChange('location', value)} placeholder="Tu ubicación" />
                  {validationErrors.location && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{validationErrors.location}</span>}
                </div>

                {/* ✅ NUEVO: Campo Sexo */}
                <SexoInput
                  sexo={formData.sexo}
                  onChange={(value) => handleInputChange('sexo', value)}
                  error={validationErrors.sexo}
                  required={true}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'white', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}><Star size={14} style={{ color: '#ff6b35' }} />Servicios (máx 3) *</label>
                <ServicesInput services={formData.services} onChange={(value) => handleInputChange('services', value)} maxServices={3} placeholder="Agrega tus servicios principales" />
                {validationErrors.services && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{validationErrors.services}</span>}
              </div>

              <div style={{ padding: '16px', background: 'rgba(255, 215, 0, 0.05)', border: '1px solid rgba(255, 215, 0, 0.15)', borderRadius: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', fontWeight: '600', color: 'white', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formData.premiumOnly} onChange={(e) => handleInputChange('premiumOnly', e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#ff6b35', cursor: 'pointer' }} />
                  <Crown size={16} style={{ color: '#ffd700' }} />
                  <span>Solo para usuarios premium</span>
                </label>
                <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: '6px 0 0 44px', lineHeight: '1.4' }}>Tu anuncio solo será visible para usuarios con membresía premium</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', paddingTop: '20px', borderTop: '1px solid rgba(255, 107, 53, 0.1)', marginTop: '8px' }}>
              <button onClick={onClose} disabled={loading} style={{ flex: 1, padding: '14px 20px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: '600', background: 'rgba(255, 255, 255, 0.05)', color: '#d1d5db', border: '1px solid rgba(255, 255, 255, 0.1)', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s ease' }} onMouseEnter={(e) => { if (!loading) { e.target.style.background = 'rgba(255, 255, 255, 0.08)'; e.target.style.transform = 'translateY(-1px)'; } }} onMouseLeave={(e) => { if (!loading) { e.target.style.background = 'rgba(255, 255, 255, 0.05)'; e.target.style.transform = 'translateY(0)'; } }}>
                <X size={16} />Cancelar
              </button>
              
              <button onClick={handleSubmit} disabled={loading || Object.keys(validationErrors).length > 0} style={{ flex: 2, padding: '14px 20px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: '600', background: loading || Object.keys(validationErrors).length > 0 ? 'rgba(156, 163, 175, 0.2)' : STYLES.gradientOrange, color: 'white', border: 'none', cursor: loading || Object.keys(validationErrors).length > 0 ? 'not-allowed' : 'pointer', opacity: loading || Object.keys(validationErrors).length > 0 ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s ease', boxShadow: loading || Object.keys(validationErrors).length > 0 ? 'none' : '0 4px 12px rgba(255, 107, 53, 0.25)' }} onMouseEnter={(e) => { if (!loading && Object.keys(validationErrors).length === 0) { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 6px 20px rgba(255, 107, 53, 0.35)'; } }} onMouseLeave={(e) => { if (!loading && Object.keys(validationErrors).length === 0) { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 12px rgba(255, 107, 53, 0.25)'; } }}>
                {loading ? (<><Loader size={16} className="animate-spin" />{editingPost ? 'Actualizando...' : 'Publicando...'}</>) : (<><Save size={16} />{editingPost ? 'Actualizar Anuncio' : 'Publicar Anuncio'}</>)}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalContainer>
  );
};

const BoostModal = ({ post, onClose }) => {
  const [selectedDuration, setSelectedDuration] = useState(1);
  const selectedOption = BOOST_DURATIONS.find((d) => d.days === selectedDuration) || BOOST_DURATIONS[0];

  return (
    <ModalContainer maxWidth="500px" onClick={(e) => e.stopPropagation()}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 16px', background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.08) 0%, rgba(255, 107, 53, 0.02) 50%, transparent 100%)', borderBottom: '1px solid rgba(255, 107, 53, 0.15)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}><Rocket size={20} />Impulsar Anuncio</h2>
        <button onClick={onClose} style={{ width: '36px', height: '36px', background: 'rgba(17, 17, 17, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold' }}>×</button>
      </div>
      <div style={{ padding: '24px' }}>
        <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '24px', textAlign: 'center' }}>Elige la duración para impulsar tu anuncio y obtener mayor visibilidad</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {BOOST_DURATIONS.map((option) => (
            <div key={option.days} style={{ background: selectedDuration === option.days ? 'rgba(255, 107, 53, 0.1)' : '#2a2a2a', border: selectedDuration === option.days ? '2px solid #ff6b35' : '1px solid #333333', borderRadius: '12px', padding: '16px 20px', cursor: 'pointer', transition: 'all 0.3s ease', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => setSelectedDuration(option.days)}>
              <div>
                <div style={{ fontSize: '1rem', fontWeight: '600', color: 'white', marginBottom: '4px' }}>{option.label}</div>
                <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Mayor visibilidad durante {option.label.toLowerCase()}</div>
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ff6b35' }}>${option.price}</div>
            </div>
          ))}
        </div>
        <div style={{ background: '#2a2a2a', border: '1px solid #333333', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ color: 'white', fontSize: '1rem', fontWeight: '600' }}>Total a pagar</span>
            <span style={{ color: '#ff6b35', fontSize: '1.3rem', fontWeight: '700' }}>${selectedOption.price}</span>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={onClose} style={{ flex: 1, padding: '12px', background: 'rgba(17, 17, 17, 0.6)', color: '#d1d5db', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer' }}>Cancelar</button>
            <button onClick={() => { alert(`Anuncio impulsado por ${selectedOption.label}. Total: ${selectedOption.price}`); onClose(); }} style={{ flex: 2, padding: '12px', background: STYLES.gradientOrange, color: 'white', border: 'none', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Rocket size={16} />Impulsar por {selectedOption.label}
            </button>
          </div>
        </div>
      </div>
    </ModalContainer>
  );
};

const DeleteModal = ({ post, onConfirm, onCancel, loading }) => {
  const isDesktop = window.innerWidth >= 768;
  
  return (
    <ModalContainer maxWidth={isDesktop ? "400px" : "min(450px, 95vw)"} onClick={(e) => e.stopPropagation()}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: isDesktop ? '10px 16px' : '16px 20px', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.02) 50%, transparent 100%)', borderBottom: '1px solid rgba(239, 68, 68, 0.15)' }}>
        <h2 style={{ fontSize: isDesktop ? '1rem' : 'clamp(1rem, 4vw, 1.2rem)', fontWeight: '700', color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: isDesktop ? '6px' : '8px' }}>
          <AlertTriangle size={isDesktop ? 16 : 18} style={{ color: '#ef4444' }} />Eliminar
        </h2>
        <button onClick={!loading ? onCancel : undefined} disabled={loading} style={{ width: isDesktop ? '26px' : '32px', height: isDesktop ? '26px' : '32px', background: 'rgba(17, 17, 17, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: isDesktop ? '6px' : '8px', color: 'white', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isDesktop ? '14px' : '16px', fontWeight: 'bold' }}>×</button>
      </div>

      <div style={{ padding: isDesktop ? '16px' : '20px' }}>
        <div style={{ background: '#2a2a2a', border: '1px solid #333333', borderRadius: isDesktop ? '8px' : '10px', overflow: 'hidden', marginBottom: isDesktop ? '12px' : '16px' }}>
          <img src={post?.images?.[0] || 'https://via.placeholder.com/150?text=Sin+Imagen'} alt="Post" style={{ width: '100%', height: isDesktop ? '80px' : '100px', objectFit: 'cover' }} onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=Sin+Imagen'; }} />
          <div style={{ padding: isDesktop ? '8px 10px' : '12px' }}>
            <h4 style={{ color: 'white', fontSize: isDesktop ? '0.8rem' : '0.85rem', marginBottom: isDesktop ? '4px' : '6px', fontWeight: '600', lineHeight: '1.3' }}>{post?.title || 'Anuncio'}</h4>
            <p style={{ color: '#d1d5db', fontSize: isDesktop ? '0.7rem' : '0.75rem', lineHeight: '1.3', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{post?.description || 'Sin descripción'}</p>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: isDesktop ? '16px' : '20px' }}>
          <div style={{ width: isDesktop ? '36px' : '48px', height: isDesktop ? '36px' : '48px', background: 'rgba(239, 68, 68, 0.1)', border: '2px solid rgba(239, 68, 68, 0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: isDesktop ? '0 auto 8px' : '0 auto 12px' }}>
            <Trash2 size={isDesktop ? 16 : 20} style={{ color: '#ef4444' }} />
          </div>
          <h3 style={{ fontSize: isDesktop ? '0.9rem' : '1rem', fontWeight: '600', color: 'white', marginBottom: isDesktop ? '4px' : '6px' }}>¿Eliminar este anuncio?</h3>
          <p style={{ color: '#9ca3af', fontSize: isDesktop ? '0.75rem' : '0.8rem', lineHeight: '1.4', margin: 0 }}>Esta acción es permanente y no se puede deshacer.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: isDesktop ? 'row' : (window.innerWidth >= 480 ? 'row' : 'column'), gap: isDesktop ? '8px' : '10px' }}>
          <button onClick={onCancel} disabled={loading} style={{ flex: 1, padding: isDesktop ? '8px 12px' : '12px', background: 'rgba(17, 17, 17, 0.6)', color: '#d1d5db', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: isDesktop ? '6px' : '8px', fontSize: isDesktop ? '0.8rem' : '0.85rem', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: isDesktop ? '4px' : '6px' }}>
            <X size={isDesktop ? 12 : 14} />Cancelar
          </button>
          <button onClick={onConfirm} disabled={loading} style={{ flex: 1, padding: isDesktop ? '8px 12px' : '12px', background: loading ? 'rgba(156, 163, 175, 0.3)' : 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'white', border: 'none', borderRadius: isDesktop ? '6px' : '8px', fontSize: isDesktop ? '0.8rem' : '0.85rem', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: isDesktop ? '4px' : '6px' }}>
            {loading ? (<><Loader size={isDesktop ? 12 : 14} className="animate-spin" />Eliminando...</>) : (<><Trash2 size={isDesktop ? 12 : 14} />Eliminar</>)}
          </button>
        </div>
      </div>
    </ModalContainer>
  );
};

export default PostsManager;