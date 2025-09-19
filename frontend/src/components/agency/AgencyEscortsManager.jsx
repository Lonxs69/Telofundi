import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Search, 
  Eye,
  MessageCircle,
  TrendingUp,
  TrendingDown,
  Shield,
  X,
  MoreVertical,
  Trash2,
  UserX,
  BarChart3,
  Heart,
  ThumbsUp,
  MessageSquare,
  UserCheck,
  Crown,
  Star,
  Phone,
  MapPin,
  Calendar,
  AlertTriangle,
  Loader
} from 'lucide-react';

import './AgencyEscortsManager.css';
import { useAuth } from '../../context/AuthContext';
import { agencyAPI, handleApiError } from '../../utils/api';

const AgencyEscortsManager = () => {
  const { user, isAuthenticated } = useAuth();
  
  // ✅ ESTADOS PRINCIPALES CONECTADOS AL BACKEND
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showMetricsModal, setShowMetricsModal] = useState(null);
  const [showPerfilEscort, setShowPerfilEscort] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(null);
  
  // ✅ ESTADOS DEL BACKEND
  const [escorts, setEscorts] = useState([]);
  const [agencyStats, setAgencyStats] = useState(null);
  const [loading, setLoading] = useState({
    escorts: false,
    stats: false,
    action: false
  });
  const [errors, setErrors] = useState({});
  
  // ✅ PAGINACIÓN
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
    hasNext: false,
    hasPrev: false
  });

  // ✅ VERIFICAR PERMISOS
  if (!isAuthenticated || user?.userType !== 'AGENCY') {
    return (
      <div className="client-points-page" style={{
        minHeight: '100vh',
        background: '#000000',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <AlertTriangle size={64} color="#ef4444" />
          <h2 style={{ margin: '1rem 0', color: '#ef4444' }}>Acceso Restringido</h2>
          <p style={{ color: '#9CA3AF' }}>Esta página es solo para agencias autenticadas.</p>
        </div>
      </div>
    );
  }

  // ✅ HELPER: Setear loading de forma segura
  const setLoadingState = useCallback((key, value) => {
    setLoading(prev => ({ ...prev, [key]: value }));
  }, []);

  // ✅ HELPER: Setear errores
  const setError = useCallback((key, error) => {
    setErrors(prev => ({ 
      ...prev, 
      [key]: error?.message || error || 'Error desconocido' 
    }));
  }, []);

  // ✅ HELPER: Limpiar error específico
  const clearError = useCallback((key) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[key];
      return newErrors;
    });
  }, []);

  // ✅ OBTENER ESCORTS ACTIVOS DESDE EL BACKEND
  const fetchActiveEscorts = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoadingState('escorts', true);
      clearError('escorts');
      
      console.log('🔍 === FETCHING ACTIVE ESCORTS ===');
      console.log('🔍 User type:', user?.userType);
      console.log('🔍 Agency ID:', user?.agency?.id);
      
      const response = await agencyAPI.getAgencyEscorts({
        page: pagination.page,
        limit: pagination.limit,
        status: 'active', // ✅ Solo escorts activos
        search: searchTerm
      });
      
      console.log('📥 === BACKEND RESPONSE ===');
      console.log('📥 Success:', response.success);
      console.log('📥 Data exists:', !!response.data);
      console.log('📥 Escorts array:', response.data?.escorts);
      console.log('📥 Escorts count:', response.data?.escorts?.length || 0);
      
      if (response.success && response.data) {
        const escortsData = response.data.escorts || [];
        
        // ✅ TRANSFORMAR DATOS PARA EL COMPONENTE
        const transformedEscorts = escortsData.map(escortMembership => {
          const escort = escortMembership.escort;
          const user = escort.user;
          
          return {
            // IDs
            id: escort.id,
            membershipId: escortMembership.membershipId,
            userId: user.id,
            
            // Datos básicos
            name: `${user.firstName} ${user.lastName}`,
            avatar: user.avatar || '/default-avatar.png',
            profileImage: user.avatar || '/default-avatar.png',
            age: escort.age || 25,
            location: `República Dominicana, Santo Domingo`, // Placeholder
            description: user.bio || 'Escort profesional',
            
            // Estado y verificación
            verified: escort.isVerified || false,
            status: escortMembership.status?.toLowerCase() || 'active',
            isOnline: true, // Placeholder
            
            // Membership info
            joinDate: escortMembership.joinedAt,
            role: escortMembership.role,
            commissionRate: escortMembership.commissionRate,
            
            // Servicios y contacto
            services: escort.services || ['Acompañamiento'],
            phone: user.phone || '+1-829-XXX-XXXX',
            
            // Métricas
            rating: escort.rating || 4.5,
            totalRatings: escort.totalRatings || 0,
            
            // Agency info
            canJoinAgency: false,
            agency: {
              name: `${user.firstName} ${user.lastName}`, // Nombre de la agencia
              logo: user.avatar
            },
            
            // Métricas detalladas (solo vistas al perfil)
            metrics: {
              profileViews: user.profileViews || 0,
              totalInteractions: user.profileViews || 0,
              responseRate: 95, // Placeholder
              avgResponseTime: 5 // Placeholder
            }
          };
        });
        
        setEscorts(transformedEscorts);
        setPagination(response.data.pagination || pagination);
        
        console.log('✅ Escorts loaded and transformed:', transformedEscorts.length);
      } else {
        throw new Error(response.message || 'Error obteniendo escorts');
      }
    } catch (error) {
      console.error('❌ Error fetching escorts:', error);
      setError('escorts', handleApiError(error));
      setEscorts([]);
    } finally {
      setLoadingState('escorts', false);
    }
  }, [isAuthenticated, pagination.page, pagination.limit, searchTerm, user, setLoadingState, clearError, setError]);

  // ✅ OBTENER ESTADÍSTICAS DE LA AGENCIA
  const fetchAgencyStats = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoadingState('stats', true);
      clearError('stats');
      
      console.log('📊 Fetching agency stats...');
      
      const response = await agencyAPI.getAgencyStats();
      
      if (response.success && response.data) {
        setAgencyStats(response.data);
        console.log('✅ Agency stats loaded:', response.data);
      } else {
        throw new Error(response.message || 'Error obteniendo estadísticas');
      }
    } catch (error) {
      console.error('❌ Error fetching agency stats:', error);
      setError('stats', handleApiError(error));
    } finally {
      setLoadingState('stats', false);
    }
  }, [isAuthenticated, setLoadingState, clearError, setError]);

  // ✅ MANEJAR BÚSQUEDA
  const handleSearch = useCallback((searchValue) => {
    console.log('🔍 Search triggered with term:', searchValue);
    setSearchTerm(searchValue);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset a primera página
  }, []);

  // ✅ EFECTOS DE INICIALIZACIÓN
  useEffect(() => {
    if (isAuthenticated && user?.userType === 'AGENCY') {
      fetchActiveEscorts();
      fetchAgencyStats();
    }
  }, [isAuthenticated, user, fetchActiveEscorts, fetchAgencyStats]);

  // ✅ EFECTO PARA CAMBIOS DE BÚSQUEDA
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (isAuthenticated && user?.userType === 'AGENCY') {
        fetchActiveEscorts();
      }
    }, 300); // Debounce de 300ms

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, isAuthenticated, user?.userType, fetchActiveEscorts]);

  // ✅ FILTRAR ESCORTS LOCALMENTE
  const filteredEscorts = escorts.filter(escort => {
    const matchesSearch = escort.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         escort.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (selectedFilter === 'all') return matchesSearch;
    if (selectedFilter === 'verified') return matchesSearch && escort.verified;
    
    return matchesSearch;
  });

  // ✅ MÉTRICAS CALCULADAS (solo vistas al perfil)
  const agencyMetrics = agencyStats ? {
    totalEscorts: agencyStats.memberships?.active || 0,
    activeEscorts: agencyStats.memberships?.active || 0,
    totalViews: escorts.reduce((sum, e) => sum + (e.metrics?.profileViews || 0), 0)
  } : {
    totalEscorts: escorts.length,
    activeEscorts: escorts.filter(e => e.status === 'active').length,
    totalViews: escorts.reduce((sum, e) => sum + (e.metrics?.profileViews || 0), 0)
  };

  // ✅ HANDLERS
  const handleViewProfile = (escort) => {
    console.log('👤 Viewing profile for:', escort.name);
    setShowPerfilEscort(escort);
  };

  const handleViewMetrics = (escort) => {
    console.log('📊 Viewing metrics for:', escort.name);
    setShowMetricsModal(escort);
  };

  const handleRemoveEscort = (escort) => {
    setShowConfirmModal({
      type: 'remove',
      escort: escort,
      title: '¿Remover Escort?',
      message: `¿Estás seguro de que quieres remover a ${escort.name} de tu agencia? Esta acción no se puede deshacer.`,
      onConfirm: async () => {
        try {
          setLoadingState('action', true);
          
          // TODO: Implementar endpoint para remover escort
          // const response = await agencyAPI.removeEscort(escort.membershipId);
          
          // Por ahora, simular remoción
          setEscorts(prev => prev.filter(e => e.id !== escort.id));
          alert(`${escort.name} ha sido removida de la agencia`);
          
        } catch (error) {
          console.error('❌ Error removing escort:', error);
          alert(`Error: ${handleApiError(error)}`);
        } finally {
          setLoadingState('action', false);
          setShowConfirmModal(null);
        }
      }
    });
  };

  // ✅ HELPERS
  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha no disponible';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatNumber = (number) => {
    return new Intl.NumberFormat('es-DO').format(number || 0);
  };

  // ✅ MODAL DE CONFIRMACIÓN
  const ConfirmationModal = ({ modalData, onClose }) => (
    <motion.div 
      className="verification-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem'
      }}
    >
      <motion.div 
        className="verification-modal"
        initial={{ opacity: 0, scale: 0.9, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 50 }}
        onClick={(e) => e.stopPropagation()}
        style={{ 
          maxWidth: '500px',
          background: '#000000',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <h2 style={{ color: 'white', margin: 0 }}>{modalData.title}</h2>
          <motion.button 
            onClick={onClose} 
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9CA3AF',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '6px'
            }}
          >
            <X size={20} />
          </motion.button>
        </div>
        
        <div style={{ padding: '1.5rem' }}>
          <div style={{ textAlign: 'center', padding: '1rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <img 
                src={modalData.escort.avatar} 
                alt={modalData.escort.name}
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid #ff6b35'
                }}
              />
            </div>
            <h3 style={{ color: 'white', marginBottom: '0.5rem' }}>{modalData.escort.name}</h3>
            <p style={{ color: '#9CA3AF', marginBottom: '1.5rem' }}>{modalData.message}</p>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <motion.button
                onClick={onClose}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#D1D5DB',
                  cursor: 'pointer'
                }}
                whileHover={{ scale: 1.05, backgroundColor: '#1f1f1f' }}
                whileTap={{ scale: 0.95 }}
              >
                Cancelar
              </motion.button>
              
              <motion.button
                onClick={modalData.onConfirm}
                disabled={loading.action}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  cursor: loading.action ? 'not-allowed' : 'pointer',
                  opacity: loading.action ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                whileHover={!loading.action ? { scale: 1.05 } : {}}
                whileTap={!loading.action ? { scale: 0.95 } : {}}
              >
                {loading.action ? (
                  <>
                    <Loader className="spin" size={16} />
                    Removiendo...
                  </>
                ) : (
                  <>
                    <UserX size={16} />
                    Sí, Remover
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );

  // ✅ MODAL DE MÉTRICAS (solo vistas al perfil)
  const MetricsModal = ({ escort, onClose }) => (
    <motion.div 
      className="verification-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem'
      }}
    >
      <motion.div 
        className="verification-modal"
        initial={{ opacity: 0, scale: 0.9, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 50 }}
        onClick={(e) => e.stopPropagation()}
        style={{ 
          maxWidth: '600px',
          background: '#000000',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <h2 style={{ color: 'white', margin: 0 }}>Métricas de {escort.name}</h2>
          <motion.button 
            onClick={onClose} 
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9CA3AF',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '6px'
            }}
          >
            <X size={20} />
          </motion.button>
        </div>
        
        <div style={{ padding: '1.5rem' }}>
          {/* Información básica del escort */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem', 
            marginBottom: '2rem',
            padding: '1rem',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '12px'
          }}>
            <img 
              src={escort.avatar} 
              alt={escort.name}
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid #ff6b35'
              }}
            />
            <div>
              <h3 style={{ color: 'white', margin: '0 0 0.25rem 0' }}>{escort.name}, {escort.age}</h3>
              <p style={{ color: '#9CA3AF', margin: '0 0 0.25rem 0', fontSize: '0.875rem' }}>
                <MapPin size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                {escort.location}
              </p>
              <p style={{ color: '#9CA3AF', margin: '0', fontSize: '0.875rem' }}>
                <Calendar size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                Miembro desde {formatDate(escort.joinDate)}
              </p>
            </div>
            {escort.verified && (
              <div style={{ marginLeft: 'auto' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'rgba(59, 130, 246, 0.1)',
                  color: '#3b82f6',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}>
                  <Shield size={16} />
                  Verificada
                </div>
              </div>
            )}
          </div>

          {/* Solo métricas de vistas al perfil */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '1.5rem',
                textAlign: 'center'
              }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                background: '#3b82f6',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem'
              }}>
                <Eye size={20} color="white" />
              </div>
              <h3 style={{ color: 'white', margin: '0 0 0.5rem 0', fontSize: '2rem', fontWeight: '700' }}>
                {formatNumber(escort.metrics.profileViews)}
              </h3>
              <p style={{ color: '#9CA3AF', margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: '600' }}>
                Vistas de Perfil
              </p>
              <span style={{ color: '#10b981', fontSize: '0.875rem', fontWeight: '500' }}>
                +8% este mes
              </span>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '1.5rem',
                textAlign: 'center'
              }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                background: '#10b981',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem'
              }}>
                <Star size={20} color="white" />
              </div>
              <h3 style={{ color: 'white', margin: '0 0 0.5rem 0', fontSize: '2rem', fontWeight: '700' }}>
                {escort.rating}/5.0
              </h3>
              <p style={{ color: '#9CA3AF', margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: '600' }}>
                Rating Promedio
              </p>
              <span style={{ color: '#9CA3AF', fontSize: '0.875rem', fontWeight: '500' }}>
                {escort.totalRatings} reseñas
              </span>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '1.5rem',
                textAlign: 'center'
              }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                background: '#6366f1',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem'
              }}>
                <Crown size={20} color="white" />
              </div>
              <h3 style={{ color: 'white', margin: '0 0 0.5rem 0', fontSize: '2rem', fontWeight: '700' }}>
                {(escort.commissionRate * 100).toFixed(0)}%
              </h3>
              <p style={{ color: '#9CA3AF', margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: '600' }}>
                Comisión
              </p>
              <span style={{ color: '#9CA3AF', fontSize: '0.875rem', fontWeight: '500' }}>
                Rol: {escort.role}
              </span>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );

  return (
    <div className="client-points-page" style={{ background: '#000000' }}>
      {/* Hero Section */}
      <div className="points-hero" style={{ background: '#000000' }}>
        <div className="points-hero-content">
          <motion.div 
            className="balance-card"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{ background: '#1a1a1a' }}
          >
            <div className="balance-main">
              <div className="balance-info">
                <div className="points-icon-large">
                  <Users size={32} />
                </div>
                <div className="balance-details">
                  <h1>Gestión de Escorts</h1>
                  <p className="balance-subtitle">Administra tu equipo de acompañantes</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Error Banner */}
      {errors.escorts && (
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 2rem 1rem'
        }}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#ef4444'
          }}>
            <AlertTriangle size={16} />
            <span>{errors.escorts}</span>
          </div>
        </div>
      )}

      {/* Métricas generales (solo escorts y vistas) */}
      <div className="points-navigation">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem',
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 2rem'
        }}>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{
              background: '#1a1a1a',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              background: '#10b981',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Users size={20} color="white" />
            </div>
            <div>
              <h3 style={{ color: 'white', margin: '0 0 0.25rem 0', fontSize: '1.5rem', fontWeight: '700' }}>
                {formatNumber(agencyMetrics.totalEscorts)}
              </h3>
              <p style={{ color: '#9CA3AF', margin: '0', fontSize: '0.875rem' }}>Total Escorts</p>
              <span style={{ color: '#10b981', fontSize: '0.75rem' }}>
                {agencyMetrics.activeEscorts} activas
              </span>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              background: '#1a1a1a',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              background: '#3b82f6',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Eye size={20} color="white" />
            </div>
            <div>
              <h3 style={{ color: 'white', margin: '0 0 0.25rem 0', fontSize: '1.5rem', fontWeight: '700' }}>
                {formatNumber(agencyMetrics.totalViews)}
              </h3>
              <p style={{ color: '#9CA3AF', margin: '0', fontSize: '0.875rem' }}>Vistas Totales</p>
              <span style={{ color: '#3b82f6', fontSize: '0.75rem' }}>
                Promedio: {agencyMetrics.totalEscorts > 0 ? Math.round(agencyMetrics.totalViews / agencyMetrics.totalEscorts) : 0} por escort
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="escorts-controls" style={{ background: '#000000' }}>
        <div className="search-filter-container">
          <div className="search-wrapper">
            <Search className="search-icon" size={20} />
            <input
              type="text"
              placeholder="Buscar escorts por nombre..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="search-input"
              style={{ background: '#1a1a1a' }}
            />
          </div>
          
          <div className="filter-tabs">
            {[
              { id: 'all', label: 'Todas', count: filteredEscorts.length },
              { id: 'verified', label: 'Verificadas', count: filteredEscorts.filter(e => e.verified).length }
            ].map((filter) => (
              <motion.button
                key={filter.id}
                className={`filter-tab ${selectedFilter === filter.id ? 'active' : ''}`}
                onClick={() => setSelectedFilter(filter.id)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{ background: selectedFilter === filter.id ? '#ff6b35' : '#1a1a1a' }}
              >
                {filter.label}
                <span className="filter-count" style={{ 
                  background: selectedFilter === filter.id ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)' 
                }}>
                  {filter.count}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Lista de escorts */}
      <div className="points-content">
        {loading.escorts ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '3rem',
            color: '#9CA3AF'
          }}>
            <Loader className="spin" size={48} />
            <p style={{ marginTop: '1rem' }}>Cargando escorts...</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '1.5rem',
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '0 2rem'
          }}>
            {filteredEscorts.map((escort, index) => (
              <motion.div
                key={escort.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                style={{
                  background: '#1a1a1a',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  padding: '1.5rem 1.5rem 0'
                }}>
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{ cursor: 'pointer', position: 'relative' }}
                    onClick={() => handleViewProfile(escort)}
                  >
                    <img 
                      src={escort.avatar} 
                      alt={escort.name} 
                      style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '3px solid #ff6b35'
                      }}
                    />
                    {escort.verified && (
                      <div style={{
                        position: 'absolute',
                        top: '-2px',
                        right: '-2px',
                        width: '24px',
                        height: '24px',
                        background: '#3b82f6',
                        border: '2px solid #1a1a1a',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Shield size={12} color="white" />
                      </div>
                    )}
                  </motion.div>
                  
                  <div style={{ position: 'relative' }}>
                    <motion.button 
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#9CA3AF',
                        cursor: 'pointer',
                        padding: '0.5rem',
                        borderRadius: '6px'
                      }}
                      onClick={() => handleRemoveEscort(escort)}
                    >
                      <MoreVertical size={16} />
                    </motion.button>
                  </div>
                </div>
                
                <div style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                  <h3 style={{
                    color: 'white',
                    margin: '0 0 0.25rem 0',
                    fontSize: '1.125rem',
                    fontWeight: '600'
                  }}>
                    {escort.name}, {escort.age}
                  </h3>
                  <p style={{
                    color: '#9CA3AF',
                    margin: '0 0 0.75rem 0',
                    fontSize: '0.875rem'
                  }}>
                    {escort.location.split(', ')[1] || escort.location}
                  </p>
                  <p style={{
                    color: '#D1D5DB',
                    margin: '0 0 1rem 0',
                    fontSize: '0.875rem',
                    lineHeight: '1.4',
                    maxHeight: '40px',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {escort.description}
                  </p>
                  
                  {/* Métricas rápidas (solo vistas y rating) */}
                  <div style={{ 
                    display: 'flex', 
                    gap: '1rem', 
                    marginTop: '1rem',
                    fontSize: '0.75rem',
                    color: '#9CA3AF',
                    justifyContent: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Eye size={12} />
                      {formatNumber(escort.metrics.profileViews)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Star size={12} />
                      {escort.rating}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Crown size={12} />
                      {(escort.commissionRate * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
                
                <div style={{
                  padding: '1rem 1.5rem 1.5rem',
                  display: 'flex',
                  justifyContent: 'center'
                }}>
                  <motion.button
                    onClick={() => handleViewMetrics(escort)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 1rem',
                      background: 'rgba(59, 130, 246, 0.1)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: '8px',
                      color: '#3b82f6',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    <BarChart3 size={16} />
                    Ver Métricas
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
        
        {!loading.escorts && filteredEscorts.length === 0 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '3rem',
            color: '#9CA3AF'
          }}>
            <Users size={64} color="#6B7280" />
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#D1D5DB',
              margin: '1rem 0 0.5rem'
            }}>
              No se encontraron escorts
            </h3>
            <p style={{ color: '#6B7280', maxWidth: '400px' }}>
              {searchTerm ? 
                'Ajusta los filtros de búsqueda para ver más resultados' : 
                'No tienes escorts activas en tu agencia aún'
              }
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showMetricsModal && (
          <MetricsModal 
            escort={showMetricsModal} 
            onClose={() => setShowMetricsModal(null)} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showConfirmModal && (
          <ConfirmationModal 
            modalData={showConfirmModal} 
            onClose={() => setShowConfirmModal(null)} 
          />
        )}
      </AnimatePresence>

      {/* Modal de Perfil Escort */}
      <AnimatePresence>
        {showPerfilEscort && (
          <PerfilEscort 
            escort={showPerfilEscort} 
            isOpen={!!showPerfilEscort}
            onClose={() => setShowPerfilEscort(null)} 
          />
        )}
      </AnimatePresence>

      <style jsx>{`
        .client-points-page {
          min-height: 100vh;
          background: #000000;
          color: white;
        }

        .points-hero {
          background: #000000;
          padding: 2rem 0;
        }

        .points-hero-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 2rem;
        }

        .balance-card {
          background: #1a1a1a;
          border-radius: 16px;
          padding: 2rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .balance-main {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .balance-info {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          flex: 1;
        }

        .points-icon-large {
          background: linear-gradient(135deg, #ff6b35, #ff8f35);
          border-radius: 16px;
          padding: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .balance-details h1 {
          margin: 0 0 0.5rem 0;
          font-size: 2rem;
          font-weight: 700;
          color: white;
        }

        .balance-subtitle {
          margin: 0;
          color: #9ca3af;
          font-size: 1rem;
        }

        .points-navigation {
          padding: 2rem;
          background: #000000;
        }

        .escorts-controls {
          background: #000000;
          padding: 1rem 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .search-filter-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        @media (min-width: 768px) {
          .search-filter-container {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }
        }

        .search-wrapper {
          position: relative;
          flex: 1;
          max-width: 400px;
        }

        .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: #6b7280;
        }

        .search-input {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 2.5rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          borderRadius: 8px;
          fontSize: 1rem;
          outline: none;
          transition: border-color 0.2s;
          background: #1a1a1a;
          color: white;
        }

        .search-input:focus {
          border-color: #ff6b35;
          box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);
        }

        .filter-tabs {
          display: flex;
          gap: 0.5rem;
        }

        .filter-tab {
          padding: 0.5rem 1rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          background: #1a1a1a;
          color: #9ca3af;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.2s;
        }

        .filter-tab:hover {
          border-color: #ff6b35;
        }

        .filter-tab.active {
          background: #ff6b35;
          color: white;
          border-color: #ff6b35;
        }

        .filter-count {
          background: rgba(0, 0, 0, 0.1);
          color: inherit;
          padding: 0.125rem 0.375rem;
          border-radius: 10px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .filter-tab.active .filter-count {
          background: rgba(255, 255, 255, 0.2);
        }

        .points-content {
          padding: 2rem;
          background: #000000;
        }

        .spin {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AgencyEscortsManager;