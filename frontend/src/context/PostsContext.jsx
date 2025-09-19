import React, { createContext, useContext, useState, useEffect } from 'react';
import { postsAPI, handleApiError } from '../utils/api';

const PostsContext = createContext();

export const usePosts = () => {
  const context = useContext(PostsContext);
  if (!context) {
    throw new Error('usePosts must be used within a PostsProvider');
  }
  return context;
};

export const PostsProvider = ({ children }) => {
  const [posts, setPosts] = useState([]);
  const [myPosts, setMyPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    location: '',
    userType: '',
    services: [],
    minAge: '',
    maxAge: '',
    verified: false,
    sortBy: 'recent'
  });

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
    hasNext: false,
    hasPrev: false
  });

  // Cargar posts del feed
  const loadFeed = async (params = {}) => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = {
        page: params.page || pagination.page,
        limit: params.limit || pagination.limit,
        ...filters,
        ...params
      };

      // Limpiar parámetros vacíos
      Object.keys(queryParams).forEach(key => {
        if (queryParams[key] === '' || queryParams[key] === null || queryParams[key] === undefined) {
          delete queryParams[key];
        }
        if (Array.isArray(queryParams[key]) && queryParams[key].length === 0) {
          delete queryParams[key];
        }
      });

      const response = await postsAPI.getFeed(queryParams);
      
      if (response.success) {
        const { posts: newPosts, pagination: newPagination } = response.data;
        
        // Si es página 1, reemplazar posts. Si no, agregar al final
        if (queryParams.page === 1) {
          setPosts(newPosts || []);
        } else {
          setPosts(prev => [...prev, ...(newPosts || [])]);
        }
        
        setPagination(newPagination || {
          page: 1,
          limit: 20,
          total: 0,
          pages: 0,
          hasNext: false,
          hasPrev: false
        });
      }
    } catch (error) {
      console.error('Error loading feed:', error);
      setError(handleApiError(error));
    } finally {
      setLoading(false);
    }
  };

  // Cargar posts del usuario autenticado
  const loadMyPosts = async (params = {}) => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = {
        status: 'active',
        limit: 20,
        ...params
      };

      const response = await postsAPI.getMyPosts(queryParams);
      
      if (response.success) {
        setMyPosts(response.data.posts || []);
      }
    } catch (error) {
      console.error('Error loading my posts:', error);
      setError(handleApiError(error));
    } finally {
      setLoading(false);
    }
  };

  // Crear nuevo post
  const createPost = async (formData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await postsAPI.createPost(formData);
      
      if (response.success) {
        const newPost = response.data;
        
        // Agregar al inicio de la lista de posts
        setPosts(prev => [newPost, ...prev]);
        setMyPosts(prev => [newPost, ...prev]);
        
        return { success: true, data: newPost };
      }
    } catch (error) {
      console.error('Error creating post:', error);
      const errorMessage = handleApiError(error);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Actualizar post existente
  const updatePost = async (postId, formData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await postsAPI.updatePost(postId, formData);
      
      if (response.success) {
        const updatedPost = response.data;
        
        // Actualizar en todas las listas donde aparezca el post
        setPosts(prev => prev.map(post => 
          post.id === postId ? updatedPost : post
        ));
        setMyPosts(prev => prev.map(post => 
          post.id === postId ? updatedPost : post
        ));
        
        return { success: true, data: updatedPost };
      }
    } catch (error) {
      console.error('Error updating post:', error);
      const errorMessage = handleApiError(error);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Eliminar post
  const deletePost = async (postId) => {
    try {
      setLoading(true);
      setError(null);

      const response = await postsAPI.deletePost(postId);
      
      if (response.success) {
        // Remover de todas las listas
        setPosts(prev => prev.filter(post => post.id !== postId));
        setMyPosts(prev => prev.filter(post => post.id !== postId));
        
        return { success: true };
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      const errorMessage = handleApiError(error);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Dar/quitar like a un post
  const toggleLike = async (postId) => {
    try {
      const response = await postsAPI.likePost(postId);
      
      if (response.success) {
        const { isLiked } = response.data;
        
        // Actualizar estado local optimísticamente
        const updatePostLike = (post) => {
          if (post.id === postId) {
            return {
              ...post,
              isLiked,
              likesCount: isLiked 
                ? (post.likesCount || 0) + 1 
                : Math.max(0, (post.likesCount || 0) - 1)
            };
          }
          return post;
        };

        setPosts(prev => prev.map(updatePostLike));
        setMyPosts(prev => prev.map(updatePostLike));
        
        return { success: true, isLiked };
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      return { success: false, error: handleApiError(error) };
    }
  };

  // Agregar/quitar favorito
  const toggleFavorite = async (postId) => {
    try {
      const response = await postsAPI.toggleFavorite(postId);
      
      if (response.success) {
        const { isFavorited } = response.data;
        
        // Actualizar estado local optimísticamente
        const updatePostFavorite = (post) => {
          if (post.id === postId) {
            return {
              ...post,
              isFavorited,
              favoritesCount: isFavorited 
                ? (post.favoritesCount || 0) + 1 
                : Math.max(0, (post.favoritesCount || 0) - 1)
            };
          }
          return post;
        };

        setPosts(prev => prev.map(updatePostFavorite));
        setMyPosts(prev => prev.map(updatePostFavorite));
        
        return { success: true, isFavorited };
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      return { success: false, error: handleApiError(error) };
    }
  };

  // Obtener post por ID
  const getPostById = async (postId) => {
    try {
      setLoading(true);
      setError(null);

      const response = await postsAPI.getPostById(postId);
      
      if (response.success) {
        return { success: true, data: response.data };
      }
    } catch (error) {
      console.error('Error getting post:', error);
      const errorMessage = handleApiError(error);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Obtener posts en tendencia
  const getTrendingPosts = async (params = {}) => {
    try {
      setLoading(true);
      setError(null);

      const response = await postsAPI.getTrending(params);
      
      if (response.success) {
        return { success: true, data: response.data.posts || [] };
      }
    } catch (error) {
      console.error('Error getting trending posts:', error);
      const errorMessage = handleApiError(error);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Obtener posts para descubrir
  const getDiscoverPosts = async (params = {}) => {
    try {
      setLoading(true);
      setError(null);

      const response = await postsAPI.getDiscover(params);
      
      if (response.success) {
        return { success: true, data: response.data.posts || [] };
      }
    } catch (error) {
      console.error('Error getting discover posts:', error);
      const errorMessage = handleApiError(error);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Impulsar post
  const boostPost = async (postId, boostData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await postsAPI.boostPost(postId, boostData);
      
      if (response.success) {
        // Actualizar post con información de boost
        const updatePostBoost = (post) => {
          if (post.id === postId) {
            return {
              ...post,
              isBoosted: true,
              lastBoosted: new Date().toISOString(),
              activeBoost: response.data.boost || null
            };
          }
          return post;
        };

        setPosts(prev => prev.map(updatePostBoost));
        setMyPosts(prev => prev.map(updatePostBoost));
        
        return { success: true, data: response.data };
      }
    } catch (error) {
      console.error('Error boosting post:', error);
      const errorMessage = handleApiError(error);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Aplicar filtros
  const applyFilters = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, page: 1 }));
    // Los posts se cargarán automáticamente por el useEffect
  };

  // Limpiar filtros
  const clearFilters = () => {
    setFilters({
      location: '',
      userType: '',
      services: [],
      minAge: '',
      maxAge: '',
      verified: false,
      sortBy: 'recent'
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Cargar más posts (paginación infinita)
  const loadMorePosts = async () => {
    if (!pagination.hasNext || loading) return;
    
    await loadFeed({ page: pagination.page + 1 });
  };

  // Refrescar posts
  const refreshPosts = async () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    await loadFeed({ page: 1 });
  };

  // Limpiar errores
  const clearError = () => {
    setError(null);
  };

  // Cargar posts iniciales cuando cambian los filtros
  useEffect(() => {
    loadFeed({ page: 1 });
  }, [filters]);

  // Valor del contexto
  const value = {
    // Estado
    posts,
    myPosts,
    loading,
    error,
    filters,
    pagination,
    
    // Funciones de carga
    loadFeed,
    loadMyPosts,
    refreshPosts,
    loadMorePosts,
    
    // Funciones CRUD
    createPost,
    updatePost,
    deletePost,
    getPostById,
    
    // Funciones de interacción
    toggleLike,
    toggleFavorite,
    boostPost,
    
    // Funciones especiales
    getTrendingPosts,
    getDiscoverPosts,
    
    // Funciones de filtros
    applyFilters,
    clearFilters,
    setFilters,
    
    // Utilidades
    clearError
  };

  return (
    <PostsContext.Provider value={value}>
      {children}
    </PostsContext.Provider>
  );
};