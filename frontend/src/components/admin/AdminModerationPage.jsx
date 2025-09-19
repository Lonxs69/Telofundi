import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Search, MessageCircle, Ban, CheckCircle, AlertTriangle, X, User, Users,
  Building2, MapPin, Clock, Loader, RefreshCw, Calendar, Eye, Crown
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { adminAPI, chatAPI, handleApiError } from '../../utils/api';
import ChatPage from '../shared/chat/ChatPage';
import './AdminModerationPage.css';

const AdminUsersManagement = () => {
  const { user } = useAuth();
  
  // Estados principales
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1, limit: 20, total: 0, pages: 0, hasNext: false, hasPrev: false
  });

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserType, setSelectedUserType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Estados de modales
  const [showBanModal, setShowBanModal] = useState(false);
  const [showUnbanModal, setShowUnbanModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [processingAction, setProcessingAction] = useState(false);

  // ✅ ESTADOS DE CHAT - INTEGRACIÓN
  const [currentView, setCurrentView] = useState('admin');
  const [chatTargetUserId, setChatTargetUserId] = useState(null);
  const [chatTargetUserData, setChatTargetUserData] = useState(null);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [chatError, setChatError] = useState(null);

  // ✅ FUNCIÓN PARA CREAR CHAT
  const createChatWithUser = useCallback(async (targetUserId, targetUserData = null) => {
    try {
      console.log('💬 Admin creando chat con usuario:', targetUserId);
      const response = await chatAPI.createChatFromProfile(targetUserId);
      
      if (response.success) {
        console.log('✅ Chat admin creado exitosamente');
        return { success: true, chatId: response.data.chatId };
      } else {
        throw new Error(response.message || 'Error al crear chat');
      }
    } catch (error) {
      console.error('❌ Error creating admin chat:', error);
      const errorMessage = handleApiError(error);
      setChatError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  // ✅ FUNCIÓN PARA INICIAR CHAT CON VALIDACIONES
  const handleStartChat = useCallback(async (targetUser) => {
    if (isCreatingChat) return;
    
    // ✅ VALIDACIÓN: No puede chatear consigo mismo
    if (targetUser.id === user?.id) {
      setChatError('No puedes iniciar un chat contigo mismo');
      return;
    }
    
    console.log(`💬 Iniciando chat con: ${targetUser.firstName} ${targetUser.lastName}`);
    
    setIsCreatingChat(true);
    setChatError(null);
    
    const targetUserData = {
      id: targetUser.id,
      firstName: targetUser.firstName || '',
      lastName: targetUser.lastName || '',
      username: targetUser.username || '',
      avatar: targetUser.avatar || '',
      userType: targetUser.userType || 'USER'
    };
    
    setChatTargetUserId(targetUser.id);
    setChatTargetUserData(targetUserData);
    setCurrentView('chat');
    
    setTimeout(() => setIsCreatingChat(false), 1000);
    
    return await createChatWithUser(targetUser.id, targetUserData);
  }, [isCreatingChat, createChatWithUser, user?.id]);

  // ✅ FUNCIÓN PARA VOLVER DESDE CHAT
  const handleBackFromChat = () => {
    setCurrentView('admin');
    setChatTargetUserId(null);
    setChatTargetUserData(null);
    setIsCreatingChat(false);
    setChatError(null);
  };

  // Cargar usuarios
  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: pagination.page,
        limit: pagination.limit,
        status: selectedStatus,
        sortBy
      };

      if (selectedUserType !== 'all') {
        params.userType = selectedUserType.toUpperCase();
      }
      if (searchTerm && searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      const response = await adminAPI.getAllUsers(params);

      if (response.success && response.data) {
        setUsers(response.data.users);
        setPagination(response.data.pagination);
      } else {
        throw new Error(response.message || 'Error cargando usuarios');
      }
    } catch (error) {
      console.error('❌ Error cargando usuarios:', error);
      setError(handleApiError(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.userType === 'ADMIN') {
      loadUsers();
    }
  }, [user, pagination.page, selectedUserType, selectedStatus, sortBy, searchTerm]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadUsers();
    } catch (error) {
      console.error('❌ Error actualizando usuarios:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (filterType, value) => {
    if (filterType === 'userType') {
      setSelectedUserType(value);
    } else if (filterType === 'status') {
      setSelectedStatus(value);
    } else if (filterType === 'sortBy') {
      setSortBy(value);
      // Agregar clase de animación
      const selectElement = document.querySelector('.sort-select');
      if (selectElement) {
        selectElement.classList.add('changing');
        setTimeout(() => selectElement.classList.remove('changing'), 300);
      }
    }
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // ✅ FUNCIONES DE BANEO RESTAURADAS CON VALIDACIONES
  const handleBanUser = useCallback((userToBan) => {
    // ✅ VALIDACIÓN: No puede banearse a sí mismo
    if (userToBan.id === user?.id) {
      setError('No puedes banearte a ti mismo');
      return;
    }
    
    // ✅ VALIDACIÓN: No puede banear a otros admins
    if (userToBan.userType === 'ADMIN') {
      setError('No puedes banear a otros administradores');
      return;
    }
    
    setSelectedUser(userToBan);
    setShowBanModal(true);
  }, [user?.id]);

  const handleUnbanUser = useCallback((userToUnban) => {
    // ✅ VALIDACIÓN: No puede desbanearse a sí mismo (aunque no debería estar baneado)
    if (userToUnban.id === user?.id) {
      setError('Operación no permitida');
      return;
    }
    
    setSelectedUser(userToUnban);
    setShowUnbanModal(true);
  }, [user?.id]);

  const closeBanModal = useCallback(() => {
    setShowBanModal(false);
    setSelectedUser(null);
  }, []);

  const closeUnbanModal = useCallback(() => {
    setShowUnbanModal(false);
    setSelectedUser(null);
  }, []);

  // Helper functions
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#10b981';
      case 'banned': return '#ef4444';
      case 'inactive': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getStatusText = (user) => {
    if (user.isBanned) return 'Baneado';
    if (user.isActive) return 'Activo';
    return 'Inactivo';
  };

  const getUserTypeColor = (userType) => {
    switch (userType) {
      case 'ESCORT': return '#10b981';
      case 'CLIENT': return '#3b82f6';
      case 'AGENCY': return '#f59e0b';
      case 'ADMIN': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const getUserTypeText = (userType) => {
    switch (userType) {
      case 'ESCORT': return 'Escort';
      case 'CLIENT': return 'Cliente';
      case 'AGENCY': return 'Agencia';
      case 'ADMIN': return 'Admin';
      default: return 'Usuario';
    }
  };

  const getUserTypeIcon = (userType) => {
    switch (userType) {
      case 'ESCORT': return <User size={16} />;
      case 'CLIENT': return <User size={16} />;
      case 'AGENCY': return <Building2 size={16} />;
      case 'ADMIN': return <Crown size={16} />;
      default: return <User size={16} />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const stats = {
    total: pagination.total,
    banned: users.filter(u => u.isBanned).length,
    active: users.filter(u => u.isActive && !u.isBanned).length
  };

  // ✅ RENDERIZADO CONDICIONAL - MOSTRAR CHAT
  if (currentView === 'chat' && chatTargetUserId) {
    return (
      <ChatPage
        userType="admin"
        targetUserId={chatTargetUserId}
        onBack={handleBackFromChat}
      />
    );
  }

  // Loading inicial
  if (loading && users.length === 0) {
    return (
      <div className="client-points-page">
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          minHeight: '50vh', flexDirection: 'column', gap: '1rem'
        }}>
          <Loader className="animate-spin" size={32} color="#dc2626" />
          <p style={{ color: '#9ca3af' }}>Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="client-points-page">
      {/* Hero Section */}
      <div className="points-hero">
        <div className="points-hero-content">
          <motion.div 
            className="balance-card"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="balance-main">
              <div className="balance-info">
                <div className="points-icon-large">
                  <Shield size={32} />
                </div>
                <div className="balance-details">
                  <h1>Gestión de Usuarios</h1>
                  <p className="balance-subtitle">
                    Administra todos los usuarios de la plataforma • Último actualizado: {new Date().toLocaleTimeString('es-ES')}
                    <motion.button
                      onClick={handleRefresh}
                      disabled={refreshing}
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        color: '#9ca3af',
                        cursor: refreshing ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.8rem'
                      }}
                      whileHover={!refreshing ? { scale: 1.05 } : {}}
                      whileTap={!refreshing ? { scale: 0.95 } : {}}
                    >
                      <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                      {refreshing ? 'Actualizando...' : 'Actualizar'}
                    </motion.button>
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Errores */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '12px 16px',
            margin: '0 2rem 1rem',
            color: '#ef4444',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <AlertTriangle size={16} />
          {error}
        </motion.div>
      )}

      {chatError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '12px 16px',
            margin: '0 2rem 1rem',
            color: '#ef4444',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <MessageCircle size={16} />
          <span>Error de chat: {chatError}</span>
          <button 
            onClick={() => setChatError(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ef4444',
              cursor: 'pointer',
              marginLeft: 'auto'
            }}
          >
            <X size={14} />
          </button>
        </motion.div>
      )}

      {/* Estadísticas */}
      <div className="points-navigation">
        <div className="moderation-stats-grid">
          <motion.div 
            className="moderation-stat-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="stat-icon" style={{ background: '#3b82f6' }}>
              <Users size={20} />
            </div>
            <div className="stat-content">
              <h3>{stats.total}</h3>
              <p>Usuarios Totales</p>
              <span className="stat-detail">En la plataforma</span>
            </div>
          </motion.div>
          
          <motion.div 
            className="moderation-stat-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="stat-icon" style={{ background: '#ef4444' }}>
              <Ban size={20} />
            </div>
            <div className="stat-content">
              <h3>{stats.banned}</h3>
              <p>Usuarios Baneados</p>
              <span className="stat-detail">
                {stats.total > 0 ? Math.round((stats.banned / stats.total) * 100) : 0}% del total
              </span>
            </div>
          </motion.div>
          
          <motion.div 
            className="moderation-stat-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="stat-icon" style={{ background: '#10b981' }}>
              <CheckCircle size={20} />
            </div>
            <div className="stat-content">
              <h3>{stats.active}</h3>
              <p>Usuarios Activos</p>
              <span className="stat-detail">Cuentas activas</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Controles de búsqueda y filtros MEJORADOS */}
      <div className="moderation-controls">
        <div className="search-filter-container">
          {/* Primera fila: Búsqueda y Ordenamiento */}
          <div className="filter-row">
            <div className="search-wrapper">
              <Search className="search-icon" size={20} />
              <input
                type="text"
                placeholder="Buscar por nombre, email, usuario..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="search-input"
              />
            </div>
            
            <div className="sort-controls">
              <span className="sort-label">Ordenar por:</span>
              <select
                value={sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="sort-select"
              >
                <option value="newest">Más recientes</option>
                <option value="oldest">Más antiguos</option>
                <option value="lastLogin">Última actividad</option>
                <option value="profileViews">Más vistos</option>
                <option value="alphabetical">Alfabético</option>
              </select>
            </div>
          </div>
          
          {/* Segunda fila: Filtros por tipo de usuario */}
          <div className="user-type-filters">
            {[
              { id: 'all', label: 'Todos', icon: <Users size={16} /> },
              { id: 'ESCORT', label: 'Escorts', icon: <User size={16} /> },
              { id: 'CLIENT', label: 'Clientes', icon: <User size={16} /> },
              { id: 'AGENCY', label: 'Agencias', icon: <Building2 size={16} /> },
              { id: 'ADMIN', label: 'Admins', icon: <Crown size={16} /> }
            ].map((type) => (
              <motion.button
                key={type.id}
                className={`user-type-tab ${selectedUserType === type.id ? 'active' : ''}`}
                onClick={() => handleFilterChange('userType', type.id)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {type.icon}
                {type.label}
              </motion.button>
            ))}
          </div>
          
          {/* Tercera fila: Filtros por estado */}
          <div className="filter-tabs">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'active', label: 'Activos' },
              { id: 'banned', label: 'Baneados' },
              { id: 'inactive', label: 'Inactivos' }
            ].map((filter) => (
              <motion.button
                key={filter.id}
                className={`filter-tab ${selectedStatus === filter.id ? 'active' : ''}`}
                onClick={() => handleFilterChange('status', filter.id)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {filter.label}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Lista de usuarios */}
      <div className="points-content">
        <div className="users-grid">
          {users.map((targetUser, index) => (
            <motion.div
              key={targetUser.id}
              className="user-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5 }}
            >
              <div className="user-card-header">
                <div className="user-avatar-section">
                  <img 
                    src={targetUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(targetUser.firstName + ' ' + targetUser.lastName)}&background=random`}
                    alt={`${targetUser.firstName} ${targetUser.lastName}`}
                    className="user-avatar"
                  />
                </div>
                
                <div className="user-type-badge">
                  <span 
                    className="type-label"
                    style={{ 
                      background: `${getUserTypeColor(targetUser.userType)}20`,
                      color: getUserTypeColor(targetUser.userType)
                    }}
                  >
                    {getUserTypeIcon(targetUser.userType)}
                    {getUserTypeText(targetUser.userType)}
                  </span>
                </div>
              </div>
              
              <div className="user-card-content">
                <h3 className="user-name">
                  {targetUser.firstName} {targetUser.lastName}
                  {targetUser.escort?.age && `, ${targetUser.escort.age}`}
                </h3>
                <p className="user-email">{targetUser.email}</p>
                <p className="user-username">@{targetUser.username}</p>
                
                {targetUser.location && (
                  <p className="user-location">
                    <MapPin size={12} />
                    {targetUser.location.city || targetUser.location}, {targetUser.location.country || 'RD'}
                  </p>
                )}
                
                <div className="user-metrics-preview">
                  <div className="user-activity">
                    <span style={{ color: getStatusColor(getStatusText(targetUser)) }}>
                      {getStatusText(targetUser)}
                    </span>
                    {targetUser.isBanned && targetUser.banReason && (
                      <span className="ban-reason" title={targetUser.banReason}>
                        • {targetUser.banReason.length > 30 ? `${targetUser.banReason.substring(0, 30)}...` : targetUser.banReason}
                      </span>
                    )}
                  </div>
                  
                  <div className="user-stats">
                    <div className="stat-item">
                      <Eye size={12} />
                      <span>{targetUser.profileViews || 0}</span>
                    </div>
                    <div className="stat-item">
                      <Calendar size={12} />
                      <span>{formatDate(targetUser.createdAt)}</span>
                    </div>
                    {targetUser.lastLogin && (
                      <div className="stat-item">
                        <Clock size={12} />
                        <span>{formatDate(targetUser.lastLogin)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="user-card-footer">
                <div className="user-actions-centered">
                  {/* ✅ BOTÓN DE CHAT INTEGRADO CON VALIDACIONES */}
                  {user?.id !== targetUser.id ? (
                    <motion.button
                      className="user-action-btn secondary"
                      onClick={() => handleStartChat(targetUser)}
                      disabled={isCreatingChat}
                      whileHover={!isCreatingChat ? { scale: 1.05 } : {}}
                      whileTap={!isCreatingChat ? { scale: 0.95 } : {}}
                      style={{ 
                        opacity: isCreatingChat ? 0.6 : 1,
                        cursor: isCreatingChat ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {isCreatingChat ? (
                        <>
                          <Loader size={14} className="animate-spin" />
                          Creando...
                        </>
                      ) : (
                        <>
                          <MessageCircle size={14} />
                          Chat
                        </>
                      )}
                    </motion.button>
                  ) : (
                    <div 
                      className="user-action-btn disabled"
                      style={{ 
                        opacity: 0.5,
                        cursor: 'not-allowed',
                        background: 'rgba(107, 114, 128, 0.3)',
                        border: '1px solid rgba(107, 114, 128, 0.3)',
                        color: '#6b7280',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <User size={14} />
                      Tu Cuenta
                    </div>
                  )}
                  
                  {/* ✅ BOTONES DE BANEO RESTAURADOS CON VALIDACIONES */}
                  {user?.id !== targetUser.id && targetUser.userType !== 'ADMIN' ? (
                    targetUser.isBanned ? (
                      <motion.button
                        className="user-action-btn success"
                        onClick={() => handleUnbanUser(targetUser)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <CheckCircle size={14} />
                        Desbanear
                      </motion.button>
                    ) : (
                      <motion.button
                        className="user-action-btn danger"
                        onClick={() => handleBanUser(targetUser)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Ban size={14} />
                        Banear
                      </motion.button>
                    )
                  ) : (
                    <div 
                      className="user-action-btn disabled"
                      style={{ 
                        opacity: 0.5,
                        cursor: 'not-allowed',
                        background: 'rgba(107, 114, 128, 0.3)',
                        border: '1px solid rgba(107, 114, 128, 0.3)',
                        color: '#6b7280',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {targetUser.userType === 'ADMIN' ? (
                        <>
                          <Crown size={14} />
                          Admin
                        </>
                      ) : (
                        <>
                          <User size={14} />
                          Tu Cuenta
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        
        {users.length === 0 && !loading && (
          <div className="empty-state">
            <Users size={64} color="#6B7280" />
            <h3>No se encontraron usuarios</h3>
            <p>Ajusta los filtros de búsqueda para encontrar usuarios</p>
          </div>
        )}

        {/* ✅ PAGINACIÓN RESTAURADA */}
        {pagination.pages > 1 && (
          <div className="pagination-controls">
            <motion.button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={!pagination.hasPrev}
              className="pagination-btn"
              whileHover={pagination.hasPrev ? { scale: 1.05 } : {}}
            >
              Anterior
            </motion.button>
            
            <span className="pagination-info">
              Página {pagination.page} de {pagination.pages} ({pagination.total} usuarios)
            </span>
            
            <motion.button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={!pagination.hasNext}
              className="pagination-btn"
              whileHover={pagination.hasNext ? { scale: 1.05 } : {}}
            >
              Siguiente
            </motion.button>
          </div>
        )}
      </div>

      {/* ✅ LOADING OVERLAY RESTAURADO */}
      <AnimatePresence>
        {processingAction && (
          <motion.div
            className="admin-moderation-loading-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
              background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', zIndex: 999998,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <div style={{
              background: 'rgba(17, 24, 39, 0.95)', border: '1px solid rgba(55, 65, 81, 0.5)',
              borderRadius: '12px', padding: '24px', textAlign: 'center', color: '#f9fafb'
            }}>
              <Loader size={40} className="animate-spin" style={{ marginBottom: '16px' }} />
              <h3>Procesando acción...</h3>
              <p style={{ color: '#9ca3af' }}>Esto puede tomar unos momentos</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ✅ MODALES DE BANEO RESTAURADOS */}
      <AnimatePresence>
        {showBanModal && selectedUser && (
          <BanModal 
            user={selectedUser}
            onClose={closeBanModal}
            onBan={loadUsers}
            setProcessingAction={setProcessingAction}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showUnbanModal && selectedUser && (
          <UnbanModal 
            user={selectedUser}
            onClose={closeUnbanModal}
            onUnban={loadUsers}
            setProcessingAction={setProcessingAction}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ✅ MODAL DE BANEO RESTAURADO
const BanModal = React.memo(({ user, onClose, onBan, setProcessingAction }) => {
  const [banData, setBanData] = useState({
    reason: '', severity: 'TEMPORARY', duration: 7, evidence: ''
  });
  const [processing, setProcessing] = useState(false);

  const handleBanSubmit = async () => {
    if (!banData.reason.trim()) return;
    
    try {
      setProcessing(true);
      setProcessingAction(true);
      
      const response = await adminAPI.banUser(user.id, banData);

      if (response.success) {
        console.log('✅ Usuario baneado exitosamente');
        await onBan();
        onClose();
      } else {
        throw new Error(response.message || 'Error baneando usuario');
      }
    } catch (error) {
      console.error('❌ Error baneando usuario:', error);
    } finally {
      setProcessing(false);
      setProcessingAction(false);
    }
  };

  return (
    <motion.div 
      className="admin-dashboard-modal-overlay"
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100vw', 
        height: '100vh',
        background: 'rgba(0, 0, 0, 0.85)', 
        backdropFilter: 'blur(12px)', 
        zIndex: 999999,
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '20px',
        // ✅ CRÍTICO: Forzar posicionamiento absoluto relativo al viewport
        transform: 'translate3d(0, 0, 0)',
        isolation: 'isolate'
      }}
    >
      <motion.div 
        className="admin-dashboard-modal ban-modal"
        initial={{ opacity: 0, scale: 0.9, y: 50 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 50 }} 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(145deg, rgba(17, 24, 39, 0.98), rgba(31, 41, 55, 0.98))',
          border: '1px solid rgba(55, 65, 81, 0.5)', borderRadius: '20px',
          width: '100%', maxWidth: '480px', maxHeight: '85vh',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}
      >
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '24px', borderBottom: '1px solid rgba(55, 65, 81, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px', background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Ban size={20} color="#ef4444" />
            </div>
            <div>
              <h2 style={{ margin: 0, color: '#f9fafb', fontSize: '1.4rem', fontWeight: '600' }}>
                Banear Usuario
              </h2>
              <p style={{ margin: '4px 0 0 0', color: '#9ca3af', fontSize: '0.85rem' }}>
                {user.firstName} {user.lastName}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer',
            padding: '8px', borderRadius: '8px', transition: 'all 0.2s ease'
          }}>
            <X size={18} />
          </button>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <div style={{
            textAlign: 'center', marginBottom: '24px', padding: '20px',
            background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '16px'
          }}>
            <AlertTriangle size={32} color="#ef4444" style={{ marginBottom: '12px' }} />
            <h3 style={{ color: '#f9fafb', margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: '600' }}>
              ¿Estás seguro de continuar?
            </h3>
            <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.9rem', lineHeight: '1.5' }}>
              Esta acción suspenderá la cuenta del usuario y no podrá acceder a la plataforma.
            </p>
          </div>
          
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block', marginBottom: '8px', color: '#f9fafb',
              fontWeight: '500', fontSize: '0.9rem'
            }}>Motivo del baneo *</label>
            <textarea
              value={banData.reason}
              onChange={(e) => setBanData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Describe claramente el motivo del baneo..."
              required
              style={{
                width: '100%', background: 'rgba(17, 24, 39, 0.8)',
                border: '1px solid rgba(55, 65, 81, 0.5)', color: '#f9fafb',
                padding: '12px', borderRadius: '12px', fontSize: '0.9rem',
                resize: 'vertical', minHeight: '90px', maxHeight: '120px',
                boxSizing: 'border-box', fontFamily: 'inherit'
              }}
            />
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: banData.severity === 'TEMPORARY' ? '1fr 120px' : '1fr',
            gap: '16px', marginBottom: '20px'
          }}>
            <div className="form-group">
              <label style={{
                display: 'block', marginBottom: '8px', color: '#f9fafb',
                fontWeight: '500', fontSize: '0.9rem'
              }}>Tipo de baneo</label>
              <select
                value={banData.severity}
                onChange={(e) => setBanData(prev => ({ ...prev, severity: e.target.value }))}
                style={{
                  width: '100%', background: 'rgba(17, 24, 39, 0.8)',
                  border: '1px solid rgba(55, 65, 81, 0.5)', color: '#f9fafb',
                  padding: '12px', borderRadius: '12px', fontSize: '0.9rem',
                  boxSizing: 'border-box', cursor: 'pointer'
                }}
              >
                <option value="TEMPORARY">Temporal</option>
                <option value="PERMANENT">Permanente</option>
              </select>
            </div>
            
            {banData.severity === 'TEMPORARY' && (
              <div className="form-group">
                <label style={{
                  display: 'block', marginBottom: '8px', color: '#f9fafb',
                  fontWeight: '500', fontSize: '0.9rem'
                }}>Días</label>
                <input
                  type="number"
                  value={banData.duration}
                  onChange={(e) => setBanData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                  min="1" max="365"
                  style={{
                    width: '100%', background: 'rgba(17, 24, 39, 0.8)',
                    border: '1px solid rgba(55, 65, 81, 0.5)', color: '#f9fafb',
                    padding: '12px', borderRadius: '12px', fontSize: '0.9rem',
                    boxSizing: 'border-box', textAlign: 'center'
                  }}
                />
              </div>
            )}
          </div>
        </div>
        
        <div style={{
          padding: '20px 24px', borderTop: '1px solid rgba(55, 65, 81, 0.3)',
          display: 'flex', gap: '12px', justifyContent: 'flex-end'
        }}>
          <motion.button
            onClick={onClose} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            style={{
              background: 'rgba(55, 65, 81, 0.6)', border: '1px solid rgba(75, 85, 99, 0.5)',
              color: '#f9fafb', padding: '12px 20px', borderRadius: '12px',
              cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            <X size={16} />
            Cancelar
          </motion.button>
          
          <motion.button
            onClick={handleBanSubmit}
            disabled={!banData.reason.trim() || processing}
            whileHover={!banData.reason.trim() || processing ? {} : { scale: 1.02 }}
            whileTap={!banData.reason.trim() || processing ? {} : { scale: 0.98 }}
            style={{
              background: processing || !banData.reason.trim() 
                ? 'rgba(239, 68, 68, 0.4)' 
                : 'linear-gradient(135deg, rgba(239, 68, 68, 0.9), rgba(220, 38, 38, 0.9))',
              border: '1px solid rgba(239, 68, 68, 0.8)', color: '#ffffff',
              padding: '12px 20px', borderRadius: '12px',
              cursor: processing || !banData.reason.trim() ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem', fontWeight: '600', display: 'flex',
              alignItems: 'center', gap: '8px',
              opacity: processing || !banData.reason.trim() ? 0.6 : 1
            }}
          >
            {processing ? (
              <>
                <Loader size={16} className="animate-spin" />
                Baneando...
              </>
            ) : (
              <>
                <Ban size={16} />
                Confirmar Baneo
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
});

// ✅ MODAL DE DESBANEO RESTAURADO
const UnbanModal = React.memo(({ user, onClose, onUnban, setProcessingAction }) => {
  const [processing, setProcessing] = useState(false);

  const handleUnbanSubmit = async () => {
    try {
      setProcessing(true);
      setProcessingAction(true);
      
      const response = await adminAPI.unbanUser(user.id, {
        reason: 'Desbaneado por administrador'
      });

      if (response.success) {
        console.log('✅ Usuario desbaneado exitosamente');
        await onUnban();
        onClose();
      } else {
        throw new Error(response.message || 'Error desbaneando usuario');
      }
    } catch (error) {
      console.error('❌ Error desbaneando usuario:', error);
    } finally {
      setProcessing(false);
      setProcessingAction(false);
    }
  };

  return (
    <motion.div 
      className="admin-dashboard-modal-overlay"
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100vw', 
        height: '100vh',
        background: 'rgba(0, 0, 0, 0.85)', 
        backdropFilter: 'blur(12px)', 
        zIndex: 999999,
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '20px',
        // ✅ CRÍTICO: Forzar posicionamiento absoluto relativo al viewport
        transform: 'translate3d(0, 0, 0)',
        isolation: 'isolate'
      }}
    >
      <motion.div 
        className="admin-dashboard-modal unban-modal"
        initial={{ opacity: 0, scale: 0.9, y: 50 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 50 }} 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(145deg, rgba(17, 24, 39, 0.98), rgba(31, 41, 55, 0.98))',
          border: '1px solid rgba(55, 65, 81, 0.5)', borderRadius: '20px',
          width: '100%', maxWidth: '420px', maxHeight: '80vh',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}
      >
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '24px', borderBottom: '1px solid rgba(55, 65, 81, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px', background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <CheckCircle size={20} color="#10b981" />
            </div>
            <div>
              <h2 style={{ margin: 0, color: '#f9fafb', fontSize: '1.4rem', fontWeight: '600' }}>
                Desbanear Usuario
              </h2>
              <p style={{ margin: '4px 0 0 0', color: '#9ca3af', fontSize: '0.85rem' }}>
                {user.firstName} {user.lastName}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer',
            padding: '8px', borderRadius: '8px'
          }}>
            <X size={18} />
          </button>
        </div>
        
        <div style={{
          flex: 1, padding: '32px 24px', display: 'flex',
          flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center'
        }}>
          <div style={{
            marginBottom: '32px', padding: '24px',
            background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '16px', width: '100%', maxWidth: '320px'
          }}>
            <CheckCircle size={48} color="#10b981" style={{ marginBottom: '16px' }} />
            <h3 style={{ color: '#f9fafb', margin: '0 0 12px 0', fontSize: '1.2rem', fontWeight: '600' }}>
              ¿Restaurar acceso?
            </h3>
            <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.9rem', lineHeight: '1.5' }}>
              Esta acción restaurará el acceso del usuario a la plataforma y podrá volver a usarla normalmente.
            </p>
          </div>
        </div>
        
        <div style={{
          padding: '20px 24px', borderTop: '1px solid rgba(55, 65, 81, 0.3)',
          display: 'flex', gap: '12px', justifyContent: 'flex-end'
        }}>
          <motion.button
            onClick={onClose} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            style={{
              background: 'rgba(55, 65, 81, 0.6)', border: '1px solid rgba(75, 85, 99, 0.5)',
              color: '#f9fafb', padding: '12px 20px', borderRadius: '12px',
              cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            <X size={16} />
            Cancelar
          </motion.button>
          
          <motion.button
            onClick={handleUnbanSubmit} disabled={processing}
            whileHover={processing ? {} : { scale: 1.02 }}
            whileTap={processing ? {} : { scale: 0.98 }}
            style={{
              background: processing 
                ? 'rgba(16, 185, 129, 0.4)' 
                : 'linear-gradient(135deg, rgba(16, 185, 129, 0.9), rgba(5, 150, 105, 0.9))',
              border: '1px solid rgba(16, 185, 129, 0.8)', color: '#ffffff',
              padding: '12px 20px', borderRadius: '12px',
              cursor: processing ? 'not-allowed' : 'pointer', fontSize: '0.9rem', fontWeight: '600',
              display: 'flex', alignItems: 'center', gap: '8px',
              opacity: processing ? 0.6 : 1
            }}
          >
            {processing ? (
              <>
                <Loader size={16} className="animate-spin" />
                Desbaneando...
              </>
            ) : (
              <>
                <CheckCircle size={16} />
                Confirmar Desbaneo
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
});

export default AdminUsersManagement;