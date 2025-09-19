import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building, Users, MapPin, MessageCircle, Send, X, CheckCircle, Clock, AlertTriangle,
  Crown, Shield, TrendingUp, Award, UserPlus, LogOut, Mail, Check, XCircle,
  Star, Calendar, Heart, Briefcase, Phone, ArrowRight, Sparkles, Search, Filter,
  Globe, ChevronLeft, ChevronRight, Image, Share2, ShieldCheck, User, BarChart3,
  Timer, Lock, Info, Ban, Loader
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { agencyAPI, handleApiError } from '../../utils/api';

const EscortAgencyStatusPage = () => {
  const { user, isAuthenticated } = useAuth();
  
  // Estados principales optimizados
  const [activeTab, setActiveTab] = useState('overview');
  const [userStatus, setUserStatus] = useState('free');
  const [currentAgency, setCurrentAgency] = useState(null);
  const [availableAgencies, setAvailableAgencies] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados de membresía consolidados
  const [membershipData, setMembershipData] = useState({
    status: 'independent',
    hasActiveMembership: false,
    hasPendingRequests: false,
    pendingCount: 0,
    pendingRequests: [],
    gracePeriod: null,
    verificationStatus: null,
    currentAgencyId: null
  });
  
  // Estados de UI simplificados
  const [activeModal, setActiveModal] = useState(null);
  const [modalData, setModalData] = useState(null);
  
  // Estados de loading y errores
  const [loading, setLoading] = useState({ agencies: false, status: false, action: false });
  const [errors, setErrors] = useState({});
  
  // Estados de paginación
  const [agencyFilters, setAgencyFilters] = useState({ page: 1, limit: 20, search: '', sortBy: 'relevance' });
  const [agencyPagination, setAgencyPagination] = useState({ page: 1, total: 0, pages: 0, hasNext: false, hasPrev: false });

  // Helpers optimizados
  const setLoadingState = useCallback((key, value) => {
    setLoading(prev => ({ ...prev, [key]: value }));
  }, []);
  
  const setError = useCallback((key, error) => {
    setErrors(prev => ({ ...prev, [key]: error?.message || error || 'Error desconocido' }));
  }, []);
  
  const clearError = useCallback((key) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[key];
      return newErrors;
    });
  }, []);
  
  const showNotification = useCallback((type, title, message) => {
    setActiveModal('notification');
    setModalData({ type, title, message });
  }, []);
  
  // ✅ FUNCIÓN CORREGIDA PARA CERRAR MODALES
  const closeModal = useCallback(() => {
    setActiveModal(null);
    setModalData(null);
    
    // Restaurar scroll sin setTimeout innecesario
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
  }, []);

  // ✅ FUNCIÓN SIMPLIFICADA: VALIDAR TIPO DE INTERACCIÓN CON AGENCIA
  const getAgencyInteractionType = (agency) => {
    const agencyId = agency.userId || agency.id;
    const isCurrentAgency = membershipData.currentAgencyId === agencyId || 
                           (currentAgency && (currentAgency.id === agencyId || currentAgency.name === agency.name));

    if (isCurrentAgency) {
      return { type: 'current', buttonText: 'Tu Agencia Actual', buttonColor: '#6b7280', disabled: true };
    }

    if (membershipData.hasActiveMembership || userStatus === 'agency') {
      return { type: 'blocked', buttonText: 'Ya en Agencia', buttonColor: '#f59e0b', disabled: true };
    }

    const hasPendingToThisAgency = membershipData.pendingRequests?.some(request => 
      request.agencyId === agencyId || request.agencyName === agency.name
    );

    if (hasPendingToThisAgency) {
      return { type: 'pending', buttonText: 'Solicitud Enviada', buttonColor: '#8b5cf6', disabled: true };
    }

    if (membershipData.hasPendingRequests && membershipData.pendingCount > 0) {
      return { type: 'warning', buttonText: `${membershipData.pendingCount} Pendientes`, buttonColor: '#f59e0b', disabled: false };
    }

    return { type: 'available', buttonText: 'Solicitar Unirse', buttonColor: '#3b82f6', disabled: false };
  };

  // ✅ FUNCIÓN SIMPLIFICADA: MANEJAR CLICK EN AGENCIA
  const handleAgencyClick = (agency) => {
    const interaction = getAgencyInteractionType(agency);

    switch (interaction.type) {
      case 'current':
        setActiveModal('alreadyInAgency');
        setModalData({
          type: 'current',
          title: 'Tu Agencia Actual',
          message: `Ya perteneces a ${agency.name}. Esta es tu agencia actual.`,
          agency
        });
        break;

      case 'blocked':
        setActiveModal('alreadyInAgency');
        setModalData({
          type: 'blocked',
          title: 'Ya perteneces a una agencia',
          message: `No puedes enviar solicitudes porque ya perteneces a ${currentAgency?.name}. Debes dejar tu agencia actual primero.`,
          agency,
          currentAgency
        });
        break;

      case 'pending':
        setActiveModal('alreadyInAgency');
        setModalData({
          type: 'pending',
          title: 'Solicitud ya enviada',
          message: `Ya tienes una solicitud pendiente con ${agency.name}. Espera su respuesta antes de enviar otra.`,
          agency
        });
        break;

      case 'warning':
        setActiveModal('pendingWarning');
        setModalData({
          title: 'Solicitudes Pendientes',
          message: `Tienes ${membershipData.pendingCount} solicitud(es) pendiente(s) con otras agencias. Si envías una nueva solicitud, las anteriores podrían ser canceladas automáticamente.`,
          pendingCount: membershipData.pendingCount,
          targetAgency: agency,
          onConfirm: () => {
            closeModal();
            proceedWithJoinRequest(agency);
          }
        });
        break;

      default:
        proceedWithJoinRequest(agency);
        break;
    }
  };

  // ✅ FUNCIÓN PARA PROCEDER CON SOLICITUD
  const proceedWithJoinRequest = (agency) => {
    setActiveModal('joinConfirmation');
    setModalData({
      agency,
      title: 'Confirmar Solicitud',
      message: `¿Deseas enviar una solicitud para unirte a ${agency.name}?`,
      onConfirm: () => {
        closeModal();
        forceJoinAgency(agency);
      }
    });
  };

  // ✅ FUNCIÓN OPTIMIZADA PARA ENVIAR SOLICITUD
  const forceJoinAgency = async (agency) => {
    try {
      setLoadingState('action', true);
      
      const response = await agencyAPI.requestToJoinAgency(
        agency.userId, 
        'Solicitud enviada desde TeLoFundi - Me interesa formar parte de su equipo.'
      );
      
      if (response.success) {
        showNotification('success', 'Solicitud Enviada', 
          `¡Solicitud enviada exitosamente a ${agency.name}! Te contactarán pronto.`);
        
        // Actualizar estado local
        setUserStatus('pending');
        setMembershipData(prev => ({
          ...prev,
          status: 'pending',
          hasPendingRequests: true,
          pendingCount: (prev.pendingCount || 0) + 1
        }));
        
        await fetchMembershipStatus();
      } else {
        if (response.errorCode === 'ACTIVE_MEMBERSHIP') {
          showNotification('warning', 'Ya perteneces a una agencia', response.message);
        } else if (response.errorCode === 'PENDING_REQUESTS') {
          showNotification('warning', 'Solicitudes pendientes', response.message);
        } else {
          showNotification('error', 'Error', response.message || 'Error enviando solicitud');
        }
      }
    } catch (error) {
      console.error('❌ Error in forceJoinAgency:', error);
      
      if (error.status === 409) {
        if (error.message?.includes('perteneces')) {
          showNotification('warning', 'Ya en agencia', error.message);
        } else if (error.message?.includes('pendiente')) {
          showNotification('warning', 'Solicitud pendiente', error.message);
        } else {
          showNotification('warning', 'Conflicto', error.message);
        }
      } else {
        showNotification('error', 'Error', handleApiError(error));
      }
    } finally {
      setLoadingState('action', false);
    }
  };

  // ✅ FUNCIÓN PARA VALIDAR PERÍODO DE GRACIA
  const validateLeaveEligibility = () => {
    if (membershipData.verificationStatus?.isVerified) {
      const verifiedAt = new Date(membershipData.verificationStatus.verifiedAt);
      const thirtyDaysLater = new Date(verifiedAt.getTime() + (30 * 24 * 60 * 60 * 1000));
      const now = new Date();

      if (now < thirtyDaysLater) {
        const daysRemaining = Math.ceil((thirtyDaysLater - now) / (1000 * 60 * 60 * 24));
        
        setActiveModal('gracePeriod');
        setModalData({
          title: 'Período de Gracia Activo',
          message: `Debes esperar ${daysRemaining} día(s) más para dejar la agencia después de ser verificada.`,
          daysRemaining,
          gracePeriodEnds: thirtyDaysLater,
          verifiedAt: membershipData.verificationStatus.verifiedAt,
          agencyName: currentAgency?.name
        });
        return false;
      }
    }
    return true;
  };

  // ✅ FUNCIÓN OPTIMIZADA PARA DEJAR AGENCIA
  const handleLeaveAgency = () => {
    if (!validateLeaveEligibility()) return;

    setActiveModal('confirmation');
    setModalData({
      type: 'leave',
      title: 'Confirmar Salida',
      message: '¿Estás segura que deseas dejar la agencia? Tu verificación será removida.',
      onConfirm: async () => {
        try {
          setLoadingState('action', true);
          const response = await agencyAPI.leaveCurrentAgency('Decisión personal');
          
          if (response.success) {
            setUserStatus('free');
            setCurrentAgency(null);
            setMembershipData(prev => ({
              ...prev,
              status: 'independent',
              hasActiveMembership: false,
              verificationStatus: null,
              gracePeriod: null,
              currentAgencyId: null
            }));
            
            await fetchMembershipStatus();
            showNotification('success', 'Agencia Abandonada', 
              'Has dejado la agencia exitosamente. Tu verificación ha sido removida.');
          } else {
            if (response.errorCode === 'VERIFICATION_GRACE_PERIOD') {
              const daysRemaining = response.data?.daysRemaining || 'varios';
              showNotification('warning', 'Período de Gracia', 
                `Debes esperar ${daysRemaining} día(s) más para dejar la agencia.`);
            } else {
              throw new Error(response.message || 'Error dejando agencia');
            }
          }
        } catch (error) {
          if (error.status === 409 && error.message?.includes('esperar')) {
            showNotification('warning', 'Período de Gracia', error.message);
          } else {
            showNotification('error', 'Error', handleApiError(error));
          }
        } finally {
          setLoadingState('action', false);
          closeModal();
        }
      }
    });
  };

  // Funciones de fetch optimizadas
  const fetchAvailableAgencies = useCallback(async (filters = agencyFilters) => {
    if (!isAuthenticated) return;
    
    try {
      setLoadingState('agencies', true);
      clearError('agencies');
      
      const searchParams = {
        page: filters.page,
        limit: filters.limit,
        ...(filters.search && { q: filters.search }),
        sortBy: filters.sortBy
      };
      
      const response = await agencyAPI.searchAgencies(searchParams);
      
      if (response.success && response.data) {
        setAvailableAgencies(response.data.agencies.map(agency => agencyAPI.formatAgencyData(agency)));
        setAgencyPagination(response.data.pagination);
      } else {
        throw new Error(response.message || 'Error obteniendo agencias');
      }
    } catch (error) {
      setError('agencies', handleApiError(error));
      setAvailableAgencies([]);
    } finally {
      setLoadingState('agencies', false);
    }
  }, [isAuthenticated, agencyFilters, setLoadingState, clearError, setError]);

  // ✅ FUNCIÓN OPTIMIZADA: OBTENER ESTADO DE MEMBRESÍA
  const fetchMembershipStatus = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoadingState('status', true);
      clearError('status');
      
      const response = await agencyAPI.getEscortMembershipStatus();
      
      if (response.success && response.data) {
        const data = response.data;
        
        // Mapear estado
        let mappedStatus = 'free';
        if (data.status === 'agency') mappedStatus = 'agency';
        else if (data.status === 'pending' || data.hasPendingRequests) mappedStatus = 'pending';
        
        setUserStatus(mappedStatus);
        setCurrentAgency(data.currentAgency);
        
        // Extraer ID de agencia actual
        const currentAgencyId = data.currentAgency ? (
          data.currentAgency.userId || 
          data.currentAgency.id || 
          data.currentAgency.user?.id
        ) : null;
        
        // Actualizar datos de membresía
        setMembershipData({
          status: data.status,
          hasActiveMembership: data.hasActiveMembership,
          hasPendingRequests: data.hasPendingRequests,
          pendingCount: data.pendingRequests?.length || 0,
          currentAgencyId,
          pendingRequests: (data.pendingRequests || []).map(req => ({
            id: req.id,
            membershipId: req.id, // ✅ Añadido para cancelaciones
            agencyId: req.agencyId || req.agency?.user?.id || req.agency?.userId,
            agencyName: req.agencyName || `${req.agency?.user?.firstName} ${req.agency?.user?.lastName}` || req.agency?.name,
            agencyLogo: req.agencyLogo || req.agency?.user?.avatar,
            createdAt: req.createdAt,
            status: req.status || 'PENDING'
          })),
          verificationStatus: data.verificationStatus,
          gracePeriod: data.verificationStatus?.isVerified ? {
            isActive: true,
            verifiedAt: data.verificationStatus.verifiedAt,
            canLeaveAt: new Date(new Date(data.verificationStatus.verifiedAt).getTime() + (30 * 24 * 60 * 60 * 1000))
          } : null
        });
      } else {
        // Estado por defecto
        setUserStatus('free');
        setCurrentAgency(null);
        setMembershipData({
          status: 'independent',
          hasActiveMembership: false,
          hasPendingRequests: false,
          pendingCount: 0,
          pendingRequests: [],
          gracePeriod: null,
          verificationStatus: null,
          currentAgencyId: null
        });
      }
    } catch (error) {
      console.error('❌ Error fetching membership status:', error);
      setUserStatus('free');
      setCurrentAgency(null);
      setMembershipData({
        status: 'independent',
        hasActiveMembership: false,
        hasPendingRequests: false,
        pendingCount: 0,
        pendingRequests: [],
        gracePeriod: null,
        verificationStatus: null,
        currentAgencyId: null
      });
    } finally {
      setLoadingState('status', false);
    }
  }, [isAuthenticated, setLoadingState, clearError]);

  const handleSearchAgencies = useCallback(async (searchValue) => {
    const newFilters = { ...agencyFilters, search: searchValue, page: 1 };
    setAgencyFilters(newFilters);
    setSearchTerm(searchValue);
    setTimeout(() => fetchAvailableAgencies(newFilters), 300);
  }, [agencyFilters, fetchAvailableAgencies]);

  // ✅ FUNCIÓN NUEVA: CANCELAR SOLICITUD PENDIENTE
  const cancelPendingRequest = async (membershipId, agencyName) => {
    setActiveModal('confirmCancel');
    setModalData({
      title: 'Cancelar Solicitud',
      message: `¿Estás segura de que quieres cancelar tu solicitud con ${agencyName}? Esta acción no se puede deshacer.`,
      agencyName,
      membershipId,
      onConfirm: async () => {
        try {
          setLoadingState('action', true);
          closeModal();
          
          const response = await agencyAPI.cancelOwnRequest(membershipId, 'Decidí no continuar con esta solicitud');
          
          if (response.success) {
            // Actualizar estado local
            const newPendingRequests = membershipData.pendingRequests.filter(req => req.membershipId !== membershipId);
            const newPendingCount = newPendingRequests.length;
            
            setMembershipData(prev => ({
              ...prev,
              pendingRequests: newPendingRequests,
              pendingCount: newPendingCount,
              hasPendingRequests: newPendingCount > 0
            }));
            
            // Si no quedan solicitudes pendientes, cambiar estado a 'free'
            if (newPendingCount === 0) {
              setUserStatus('free');
              setMembershipData(prev => ({ 
                ...prev, 
                status: 'independent', 
                hasPendingRequests: false 
              }));
            }
            
            showNotification('success', 'Solicitud Cancelada', 
              `Tu solicitud con ${agencyName} ha sido cancelada exitosamente.`);
            
            // Refrescar estado desde el servidor
            await fetchMembershipStatus();
          } else {
            showNotification('error', 'Error', response.message || 'Error cancelando solicitud');
          }
        } catch (error) {
          console.error('❌ Error canceling request:', error);
          
          if (error.status === 404) {
            showNotification('warning', 'Solicitud no encontrada', 'La solicitud ya no existe o fue procesada por la agencia.');
            // Refrescar estado desde el servidor
            await fetchMembershipStatus();
          } else {
            showNotification('error', 'Error', handleApiError(error));
          }
        } finally {
          setLoadingState('action', false);
        }
      }
    });
  };

  // ✅ COMPONENTE MODAL SIMPLIFICADO Y CORREGIDO
  const Modal = ({ children }) => {
    useEffect(() => {
      // Prevenir scroll
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflowY = 'hidden';

      return () => {
        // Restaurar scroll
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflowY = '';
        window.scrollTo(0, scrollY);
      };
    }, []);

    return ReactDOM.createPortal(
      <motion.div 
        className="modal-overlay" 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={closeModal}
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 1000,
          padding: '1rem'
        }}
      >
        {children}
      </motion.div>,
      document.body
    );
  };

  // Componentes auxiliares optimizados
  const AgencyImage = ({ src, alt, size = 40, onClick, style }) => {
    const [hasError, setHasError] = useState(false);
    
    if (!src || hasError) {
      return (
        <div 
          onClick={onClick}
          style={{ 
            width: size, 
            height: size, 
            backgroundColor: '#6b7280', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            cursor: onClick ? 'pointer' : 'default', 
            ...style 
          }}
        >
          <User size={size * 0.6} color="#9ca3af" />
        </div>
      );
    }

    return (
      <img 
        src={src} 
        alt={alt} 
        onClick={onClick} 
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          cursor: onClick ? 'pointer' : 'default',
          ...style
        }} 
        onError={() => setHasError(true)} 
      />
    );
  };

  const VerifiedBadge = ({ size = 14 }) => (
    <span style={{ 
      display: 'inline-flex', 
      alignItems: 'center', 
      gap: '4px', 
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      color: '#10b981', 
      padding: '2px 8px', 
      borderRadius: '12px', 
      fontSize: '11px', 
      fontWeight: '500',
      border: '1px solid rgba(16, 185, 129, 0.2)' 
    }}>
      <ShieldCheck size={size} />
      Verificada
    </span>
  );

  // ✅ CONFIGURACIÓN DE ESTADO OPTIMIZADA
  const getStatusConfig = () => {
    const configs = {
      agency: {
        title: currentAgency?.name || 'Agencia',
        subtitle: membershipData.verificationStatus?.isVerified ? 'Miembro verificado' : 'Miembro activo',
        icon: <Building size={20} />,
        color: '#10b981',
        bgColor: 'rgba(16, 185, 129, 0.1)',
        borderColor: 'rgba(16, 185, 129, 0.2)',
        extra: membershipData.gracePeriod?.isActive ? {
          icon: <Lock size={16} />,
          text: 'Período de gracia activo',
          color: '#f59e0b'
        } : null
      },
      pending: {
        title: 'Solicitudes Pendientes',
        subtitle: `${membershipData.pendingCount} solicitud(es) en proceso`,
        icon: <Clock size={20} />,
        color: '#f59e0b',
        bgColor: 'rgba(245, 158, 11, 0.1)',
        borderColor: 'rgba(245, 158, 11, 0.2)'
      },
      free: {
        title: 'Independiente',
        subtitle: 'Trabajando libre',
        icon: <UserPlus size={20} />,
        color: '#6366f1',
        bgColor: 'rgba(99, 102, 241, 0.1)',
        borderColor: 'rgba(99, 102, 241, 0.2)'
      }
    };
    return configs[userStatus] || configs.free;
  };

  // ✅ MODALES OPTIMIZADOS
  const renderModal = () => {
    if (!activeModal || !modalData) return null;

    const modalProps = {
      initial: { opacity: 0, scale: 0.9, y: 50 },
      animate: { opacity: 1, scale: 1, y: 0 },
      exit: { opacity: 0, scale: 0.9, y: 50 }
    };

    if (activeModal === 'notification') {
      const icons = {
        success: <CheckCircle size={24} style={{ color: '#10b981' }} />,
        error: <XCircle size={24} style={{ color: '#ef4444' }} />,
        warning: <AlertTriangle size={24} style={{ color: '#f59e0b' }} />,
        info: <MessageCircle size={24} style={{ color: '#3b82f6' }} />
      };
      const colors = { success: '#10b981', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };
      
      return (
        <motion.div 
          {...modalProps} 
          onClick={(e) => e.stopPropagation()}
          style={{ 
            backgroundColor: '#111111', 
            border: '1px solid rgba(255, 255, 255, 0.2)', 
            borderRadius: '16px', 
            padding: '2rem', 
            maxWidth: '400px', 
            width: '90%'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            {icons[modalData.type] || icons.info}
            <h3 style={{ color: colors[modalData.type] || colors.info, margin: 0, flex: 1 }}>
              {modalData.title}
            </h3>
            <button onClick={closeModal} style={{ 
              background: 'transparent', 
              border: 'none', 
              color: '#9ca3af', 
              cursor: 'pointer', 
              padding: '0.5rem' 
            }}>
              <X size={20} />
            </button>
          </div>
          <p style={{ color: '#d1d5db', margin: '0 0 1.5rem 0', lineHeight: '1.5' }}>
            {modalData.message}
          </p>
          <button onClick={closeModal} style={{ 
            backgroundColor: colors[modalData.type] || colors.info, 
            color: 'white', 
            border: 'none',
            borderRadius: '8px', 
            padding: '0.75rem 1.5rem', 
            cursor: 'pointer', 
            fontWeight: '600',
            width: '100%'
          }}>
            Entendido
          </button>
        </motion.div>
      );
    }

    // ✅ MODAL PARA CONFIRMAR CANCELACIÓN DE SOLICITUD
    if (activeModal === 'confirmCancel') {
      return (
        <motion.div 
          {...modalProps} 
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: '#111111', 
            border: '1px solid rgba(239, 68, 68, 0.3)', 
            borderRadius: '16px', 
            padding: '2rem', 
            maxWidth: '500px', 
            width: '90%',
            textAlign: 'center'
          }}
        >
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ 
              width: '64px', 
              height: '64px', 
              margin: '0 auto 1rem',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center'
            }}>
              <XCircle size={32} color="#ef4444" />
            </div>
            <h3 style={{ color: '#ef4444', margin: '0 0 0.5rem 0', fontSize: '1.25rem' }}>
              {modalData.title}
            </h3>
          </div>
          
          <p style={{ color: '#d1d5db', margin: '0 0 1rem 0', lineHeight: '1.6' }}>
            {modalData.message}
          </p>
          
          <div style={{ 
            backgroundColor: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '12px', 
            padding: '1rem', 
            margin: '1rem 0' 
          }}>
            <p style={{ color: '#ef4444', margin: 0, fontSize: '0.875rem', fontWeight: '600' }}>
              Agencia: {modalData.agencyName}
            </p>
            <p style={{ color: '#9ca3af', margin: '0.25rem 0 0 0', fontSize: '0.75rem' }}>
              Esta acción no se puede deshacer
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={closeModal} style={{
              flex: 1, 
              backgroundColor: 'transparent', 
              color: '#9ca3af', 
              border: '1px solid rgba(255, 255, 255, 0.1)', 
              borderRadius: '8px', 
              padding: '0.75rem', 
              cursor: 'pointer'
            }}>
              Mantener Solicitud
            </button>
            <button onClick={modalData.onConfirm} disabled={loading.action} style={{
              flex: 1, 
              backgroundColor: '#ef4444', 
              color: 'white', 
              border: 'none',
              borderRadius: '8px', 
              padding: '0.75rem', 
              cursor: 'pointer', 
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              opacity: loading.action ? 0.6 : 1
            }}>
              {loading.action ? (
                <>
                  <Loader size={16} className="spin" />
                  Cancelando...
                </>
              ) : (
                <>
                  <X size={16} />
                  Cancelar Solicitud
                </>
              )}
            </button>
          </div>
        </motion.div>
      );
    }

    if (activeModal === 'alreadyInAgency') {
      const getIcon = () => {
        switch (modalData.type) {
          case 'current': return <Building size={48} color="#10b981" />;
          case 'blocked': return <Ban size={48} color="#f59e0b" />;
          case 'pending': return <Clock size={48} color="#8b5cf6" />;
          default: return <Info size={48} color="#3b82f6" />;
        }
      };

      const getColors = () => {
        switch (modalData.type) {
          case 'current': return { iconColor: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)', bgColor: 'rgba(16, 185, 129, 0.1)' };
          case 'blocked': return { iconColor: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.3)', bgColor: 'rgba(245, 158, 11, 0.1)' };
          case 'pending': return { iconColor: '#8b5cf6', borderColor: 'rgba(139, 92, 246, 0.3)', bgColor: 'rgba(139, 92, 246, 0.1)' };
          default: return { iconColor: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.3)', bgColor: 'rgba(59, 130, 246, 0.1)' };
        }
      };

      const colors = getColors();

      return (
        <motion.div 
          {...modalProps} 
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: '#111111', 
            border: `1px solid ${colors.borderColor}`, 
            borderRadius: '16px', 
            padding: '2rem', 
            maxWidth: '500px', 
            width: '90%',
            textAlign: 'center'
          }}
        >
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ 
              width: '64px', 
              height: '64px', 
              margin: '0 auto 1rem',
              backgroundColor: colors.bgColor,
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              {getIcon()}
            </div>
            <h3 style={{ color: colors.iconColor, margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>
              {modalData.title}
            </h3>
          </div>
          
          <p style={{ color: '#d1d5db', margin: '0 0 1rem 0', lineHeight: '1.6' }}>
            {modalData.message}
          </p>
          
          <div style={{
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem', 
            padding: '1rem',
            backgroundColor: 'rgba(255, 255, 255, 0.05)', 
            borderRadius: '12px', 
            margin: '1rem 0'
          }}>
            <AgencyImage src={modalData.agency?.avatar} alt={modalData.agency?.name} size={48} />
            <div style={{ textAlign: 'left', flex: 1 }}>
              <p style={{ color: 'white', margin: '0 0 0.25rem 0', fontWeight: '600' }}>
                {modalData.agency?.name}
              </p>
              <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.875rem' }}>
                {modalData.agency?.location || 'Ubicación no disponible'}
              </p>
              {modalData.agency?.isVerified && (
                <div style={{ marginTop: '0.25rem' }}>
                  <VerifiedBadge size={10} />
                </div>
              )}
            </div>
          </div>
          
          <button onClick={closeModal} style={{
            backgroundColor: colors.iconColor, 
            color: 'white', 
            border: 'none',
            borderRadius: '8px', 
            padding: '0.75rem 2rem', 
            cursor: 'pointer', 
            fontWeight: '600',
            width: '100%'
          }}>
            Cerrar
          </button>
        </motion.div>
      );
    }

    if (activeModal === 'gracePeriod') {
      return (
        <motion.div 
          {...modalProps} 
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: '#111111', 
            border: '1px solid rgba(245, 158, 11, 0.3)', 
            borderRadius: '16px', 
            padding: '2rem', 
            maxWidth: '500px', 
            width: '90%',
            textAlign: 'center'
          }}
        >
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ 
              width: '64px', 
              height: '64px', 
              margin: '0 auto 1rem',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center'
            }}>
              <Timer size={32} color="#f59e0b" />
            </div>
            <h3 style={{ color: '#f59e0b', margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>
              {modalData.title}
            </h3>
          </div>
          
          <p style={{ color: '#d1d5db', margin: '0 0 1rem 0', lineHeight: '1.6' }}>
            {modalData.message}
          </p>
          
          <div style={{ 
            backgroundColor: 'rgba(245, 158, 11, 0.1)', 
            border: '1px solid rgba(245, 158, 11, 0.2)',
            borderRadius: '12px', 
            padding: '1rem', 
            margin: '1rem 0' 
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', textAlign: 'left' }}>
              <div>
                <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Verificado en:</span>
                <p style={{ color: 'white', margin: '0.25rem 0 0 0', fontWeight: '600' }}>
                  {new Date(modalData.verifiedAt).toLocaleDateString('es-ES')}
                </p>
              </div>
              <div>
                <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Disponible en:</span>
                <p style={{ color: '#f59e0b', margin: '0.25rem 0 0 0', fontWeight: '600' }}>
                  {modalData.daysRemaining} días
                </p>
              </div>
            </div>
          </div>
          
          <button onClick={closeModal} style={{
            backgroundColor: '#f59e0b', 
            color: 'white', 
            border: 'none',
            borderRadius: '8px', 
            padding: '0.75rem 2rem', 
            cursor: 'pointer', 
            fontWeight: '600',
            width: '100%'
          }}>
            Entendido
          </button>
        </motion.div>
      );
    }

    if (activeModal === 'pendingWarning') {
      return (
        <motion.div 
          {...modalProps} 
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: '#111111', 
            border: '1px solid rgba(245, 158, 11, 0.3)', 
            borderRadius: '16px', 
            padding: '2rem', 
            maxWidth: '500px', 
            width: '90%'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ 
              width: '64px', 
              height: '64px', 
              margin: '0 auto 1rem',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center'
            }}>
              <AlertTriangle size={32} color="#f59e0b" />
            </div>
            <h3 style={{ color: '#f59e0b', margin: '0 0 0.5rem 0', fontSize: '1.25rem' }}>
              {modalData.title}
            </h3>
          </div>
          
          <p style={{ color: '#d1d5db', margin: '0 0 1rem 0', lineHeight: '1.5' }}>
            {modalData.message}
          </p>
          
          <div style={{
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem', 
            padding: '1rem',
            backgroundColor: 'rgba(255, 255, 255, 0.05)', 
            borderRadius: '12px',
            marginBottom: '1.5rem'
          }}>
            <AgencyImage src={modalData.targetAgency?.avatar} alt={modalData.targetAgency?.name} size={48} />
            <div>
              <p style={{ color: 'white', margin: '0 0 0.25rem 0', fontWeight: '600' }}>
                {modalData.targetAgency?.name}
              </p>
              <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.875rem' }}>
                Nueva solicitud
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={closeModal} style={{
              flex: 1, 
              backgroundColor: 'transparent', 
              color: '#9ca3af', 
              border: '1px solid rgba(255, 255, 255, 0.1)', 
              borderRadius: '8px', 
              padding: '0.75rem', 
              cursor: 'pointer'
            }}>
              Cancelar
            </button>
            <button onClick={modalData.onConfirm} style={{
              flex: 1, 
              backgroundColor: '#f59e0b', 
              color: 'white', 
              border: 'none',
              borderRadius: '8px', 
              padding: '0.75rem', 
              cursor: 'pointer', 
              fontWeight: '600'
            }}>
              Continuar de todas formas
            </button>
          </div>
        </motion.div>
      );
    }

    // Modal de confirmación genérico
    return (
      <motion.div 
        {...modalProps} 
        onClick={(e) => e.stopPropagation()}
        style={{ 
          backgroundColor: '#111111', 
          border: '1px solid rgba(255, 255, 255, 0.2)', 
          borderRadius: '16px', 
          padding: '2rem', 
          maxWidth: '500px', 
          width: '90%'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ color: 'white', margin: 0 }}>{modalData.title}</h3>
          <button onClick={closeModal} style={{ 
            background: 'transparent', 
            border: 'none', 
            color: '#9ca3af', 
            cursor: 'pointer',
            padding: '0.5rem' 
          }}>
            <X size={20} />
          </button>
        </div>
        
        {modalData.agency && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem', 
            marginBottom: '1rem', 
            padding: '1rem', 
            backgroundColor: '#1a1a1a',
            borderRadius: '12px' 
          }}>
            <AgencyImage src={modalData.agency.avatar} alt={modalData.agency.name} size={48} />
            <div>
              <h4 style={{ color: 'white', margin: '0 0 0.25rem 0' }}>{modalData.agency.name}</h4>
              <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.875rem' }}>{modalData.agency.location}</p>
            </div>
          </div>
        )}
        
        <p style={{ color: '#d1d5db', margin: '0 0 1.5rem 0', lineHeight: '1.5' }}>
          {modalData.message}
        </p>
        
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button onClick={closeModal} style={{
            backgroundColor: 'transparent', 
            color: '#9ca3af', 
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px', 
            padding: '0.75rem 1.5rem', 
            cursor: 'pointer'
          }}>
            Cancelar
          </button>
          <button onClick={modalData.onConfirm} disabled={loading.action} style={{
            backgroundColor: modalData.type === 'leave' ? '#ef4444' : '#3b82f6', 
            color: 'white', 
            border: 'none',
            borderRadius: '8px', 
            padding: '0.75rem 1.5rem', 
            cursor: 'pointer', 
            fontWeight: '600',
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            opacity: loading.action ? 0.5 : 1
          }}>
            {modalData.type === 'leave' ? <LogOut size={16} /> : <Send size={16} />}
            {loading.action ? `${modalData.type === 'leave' ? 'Dejando' : 'Enviando'}...` :
             modalData.type === 'leave' ? 'Dejar Agencia' : 'Enviar Solicitud'}
          </button>
        </div>
      </motion.div>
    );
  };

  // Effects
  useEffect(() => {
    if (isAuthenticated && user?.userType === 'ESCORT') {
      fetchMembershipStatus();
      if (activeTab === 'explore') fetchAvailableAgencies();
    }
  }, [isAuthenticated, user, activeTab, fetchMembershipStatus, fetchAvailableAgencies]);

  useEffect(() => {
    if (activeTab === 'explore' && availableAgencies.length === 0 && !loading.agencies) {
      fetchAvailableAgencies();
    }
  }, [activeTab, availableAgencies.length, loading.agencies, fetchAvailableAgencies]);

  // Verificación de autenticación
  if (!isAuthenticated || user?.userType !== 'ESCORT') {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#000000', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <AlertTriangle size={48} color="#ef4444" />
          <h3 style={{ color: '#ef4444', margin: '1rem 0' }}>Acceso Restringido</h3>
          <p style={{ color: '#9ca3af' }}>Esta página es solo para escorts autenticados.</p>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig();
  const filteredAgencies = availableAgencies.filter(agency => 
    agency.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000000', color: 'white' }}>
      {/* Header */}
      <div style={{ padding: '2rem', backgroundColor: '#000000', borderBottom: '1px solid #1f2937' }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          flexWrap: 'wrap', 
          gap: '1rem' 
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '700', color: 'white' }}>
              Estado de Agencia
            </h1>
            <p style={{ margin: '0.5rem 0 0 0', color: '#9ca3af' }}>
              Administra tu relación con agencias
            </p>
          </div>
          
          <div style={{
            backgroundColor: statusConfig.bgColor,
            borderColor: statusConfig.borderColor,
            color: statusConfig.color,
            border: `1px solid ${statusConfig.borderColor}`,
            borderRadius: '12px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            {statusConfig.icon}
            <div>
              <span style={{ display: 'block', fontWeight: '600', fontSize: '1rem' }}>
                {statusConfig.title}
              </span>
              <span style={{ display: 'block', fontSize: '0.875rem', opacity: 0.8 }}>
                {statusConfig.subtitle}
              </span>
              {statusConfig.extra && (
                <span style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.25rem', 
                  fontSize: '0.75rem', 
                  marginTop: '0.25rem', 
                  color: statusConfig.extra.color 
                }}>
                  {statusConfig.extra.icon}
                  {statusConfig.extra.text}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ padding: '1rem 2rem', backgroundColor: '#000000', borderBottom: '1px solid #1f2937' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '0.5rem' }}>
          {[
            { id: 'overview', label: 'Resumen', icon: <BarChart3 size={16} /> },
            { id: 'explore', label: 'Explorar', icon: <Search size={16} /> }
          ].map((tab) => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                padding: '0.75rem 1rem',
                backgroundColor: activeTab === tab.id ? '#1f2937' : 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.1)', 
                borderRadius: '8px',
                color: activeTab === tab.id ? 'white' : '#9ca3af', 
                cursor: 'pointer',
                transition: 'all 0.2s' 
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '2rem', backgroundColor: '#000000' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div 
                key="overview" 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -20 }}
              >
                {userStatus === 'agency' && currentAgency ? (
                  <div style={{ 
                    backgroundColor: '#1a1a1a', 
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '16px', 
                    padding: '2rem' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
                      <AgencyImage src={currentAgency.logo} alt={currentAgency.name} size={60} />
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          backgroundColor: '#10b981', 
                          color: 'white', 
                          padding: '0.25rem 0.75rem',
                          borderRadius: '12px', 
                          fontSize: '0.75rem', 
                          fontWeight: '600',
                          display: 'inline-block', 
                          marginBottom: '0.5rem' 
                        }}>
                          TU AGENCIA
                        </div>
                        <h3 style={{ margin: '0 0 0.5rem 0', color: 'white', fontSize: '1.5rem' }}>
                          {currentAgency.name}
                        </h3>
                        <p style={{ margin: '0 0 0.5rem 0', color: '#9ca3af' }}>
                          {currentAgency.description}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#9ca3af' }}>
                          <MapPin size={14} />
                          {currentAgency.location}
                        </div>
                        
                        {membershipData.verificationStatus?.isVerified && (
                          <div style={{ 
                            marginTop: '0.75rem', 
                            padding: '0.75rem', 
                            backgroundColor: 'rgba(16, 185, 129, 0.1)', 
                            border: '1px solid rgba(16, 185, 129, 0.2)', 
                            borderRadius: '8px' 
                          }}>
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.5rem', 
                              marginBottom: '0.5rem' 
                            }}>
                              <ShieldCheck size={16} color="#10b981" />
                              <span style={{ color: '#10b981', fontWeight: '600', fontSize: '0.875rem' }}>
                                Perfil Verificado
                              </span>
                            </div>
                            
                            {membershipData.gracePeriod?.isActive && (
                              <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.5rem', 
                                color: '#f59e0b', 
                                fontSize: '0.75rem' 
                              }}>
                                <Lock size={12} />
                                <span>
                                  Período de gracia activo hasta {new Date(membershipData.gracePeriod.canLeaveAt).toLocaleDateString('es-ES')}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <button 
                      onClick={handleLeaveAgency} 
                      disabled={loading.action}
                      style={{ 
                        width: '100%', 
                        backgroundColor: '#ef4444', 
                        color: 'white', 
                        border: 'none',
                        borderRadius: '8px', 
                        padding: '0.75rem 1rem', 
                        cursor: 'pointer', 
                        fontWeight: '600',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '0.5rem',
                        opacity: loading.action ? 0.5 : 1 
                      }}
                    >
                      <LogOut size={16} />
                      {loading.action ? 'Dejando...' : 'Dejar agencia'}
                    </button>
                  </div>
                ) : userStatus === 'pending' ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '3rem', 
                    backgroundColor: '#1a1a1a',
                    border: '1px solid rgba(255, 255, 255, 0.1)', 
                    borderRadius: '16px' 
                  }}>
                    <div style={{ marginBottom: '1rem' }}>
                      <Clock size={32} color="#f59e0b" />
                    </div>
                    <h3 style={{ margin: '0 0 1rem 0', color: 'white' }}>
                      {membershipData.pendingCount > 1 ? 'Solicitudes en Proceso' : 'Solicitud en Proceso'}
                    </h3>
                    <p style={{ margin: '0 0 1rem 0', color: '#9ca3af' }}>
                      {membershipData.pendingCount > 1 
                        ? `Tienes ${membershipData.pendingCount} solicitudes pendientes. Te contactarán pronto con respuestas.`
                        : 'Tu solicitud está siendo revisada. Te contactarán pronto con una respuesta.'
                      }
                    </p>
                    
                    {membershipData.pendingRequests && membershipData.pendingRequests.length > 0 && (
                      <div style={{ marginTop: '1.5rem' }}>
                        <h4 style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                          SOLICITUDES PENDIENTES:
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {membershipData.pendingRequests.map((request, index) => (
                            <div 
                              key={index} 
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.75rem', 
                                padding: '0.75rem', 
                                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                border: '1px solid rgba(245, 158, 11, 0.2)', 
                                borderRadius: '8px'
                              }}
                            >
                              <AgencyImage src={request.agencyLogo} alt={request.agencyName} size={32} />
                              <div style={{ flex: 1, textAlign: 'left' }}>
                                <p style={{ color: 'white', margin: 0, fontSize: '0.875rem', fontWeight: '600' }}>
                                  {request.agencyName}
                                </p>
                                <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.75rem' }}>
                                  Enviada {new Date(request.createdAt).toLocaleDateString('es-ES')}
                                </p>
                              </div>
                              
                              {/* ✅ BOTÓN MEJORADO PARA CANCELAR SOLICITUD */}
                              <button
                                onClick={() => cancelPendingRequest(request.membershipId || request.id, request.agencyName)}
                                disabled={loading.action}
                                style={{
                                  backgroundColor: '#ef4444',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '0.5rem 0.75rem',
                                  fontSize: '0.75rem',
                                  cursor: loading.action ? 'not-allowed' : 'pointer',
                                  opacity: loading.action ? 0.6 : 1,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  transition: 'all 0.2s',
                                  fontWeight: '600'
                                }}
                                title={`Cancelar solicitud con ${request.agencyName}`}
                                onMouseEnter={(e) => {
                                  if (!loading.action) {
                                    e.target.style.backgroundColor = '#dc2626';
                                    e.target.style.transform = 'scale(1.05)';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!loading.action) {
                                    e.target.style.backgroundColor = '#ef4444';
                                    e.target.style.transform = 'scale(1)';
                                  }
                                }}
                              >
                                {loading.action ? (
                                  <>
                                    <Loader size={12} className="spin" />
                                    Cancelando...
                                  </>
                                ) : (
                                  <>
                                    <X size={12} />
                                    Cancelar
                                  </>
                                )}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '3rem', 
                    backgroundColor: '#1a1a1a',
                    border: '1px solid rgba(255, 255, 255, 0.1)', 
                    borderRadius: '16px' 
                  }}>
                    <div style={{ marginBottom: '1rem' }}>
                      <UserPlus size={32} color="#6366f1" />
                    </div>
                    <h3 style={{ margin: '0 0 1rem 0', color: 'white' }}>Trabajando Independiente</h3>
                    <p style={{ margin: '0 0 2rem 0', color: '#9ca3af' }}>
                      Tienes total libertad, pero puedes considerar unirte a una agencia para obtener beneficios adicionales.
                    </p>
                    
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'center', 
                      gap: '2rem', 
                      marginBottom: '2rem' 
                    }}>
                      {[
                        { icon: <Shield size={16} />, text: 'Control total del perfil' },
                        { icon: <Award size={16} />, text: 'Flexibilidad completa' }
                      ].map((benefit, index) => (
                        <div 
                          key={index} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem', 
                            color: '#9ca3af' 
                          }}
                        >
                          {benefit.icon}
                          <span>{benefit.text}</span>
                        </div>
                      ))}
                    </div>
                    
                    <button 
                      onClick={() => setActiveTab('explore')}
                      style={{ 
                        backgroundColor: '#3b82f6', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '8px',
                        padding: '0.75rem 1.5rem', 
                        cursor: 'pointer', 
                        fontWeight: '600', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem', 
                        margin: '0 auto' 
                      }}
                    >
                      <Search size={16} />
                      Explorar Agencias
                      <ArrowRight size={16} />
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'explore' && (
              <motion.div 
                key="explore" 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ position: 'relative', maxWidth: '400px' }}>
                    <Search size={18} style={{ 
                      position: 'absolute', 
                      left: '1rem', 
                      top: '50%', 
                      transform: 'translateY(-50%)', 
                      color: '#6b7280' 
                    }} />
                    <input 
                      type="text" 
                      placeholder="Buscar agencias..." 
                      value={searchTerm}
                      onChange={(e) => handleSearchAgencies(e.target.value)}
                      style={{ 
                        width: '100%', 
                        backgroundColor: '#1a1a1a', 
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px', 
                        padding: '0.75rem 1rem 0.75rem 2.5rem', 
                        color: 'white',
                        fontSize: '1rem', 
                        outline: 'none' 
                      }} 
                    />
                  </div>
                </div>

                {errors.agencies && (
                  <div style={{ 
                    backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                    border: '1px solid rgba(239, 68, 68, 0.3)', 
                    borderRadius: '8px',
                    padding: '1rem', 
                    marginBottom: '1rem', 
                    display: 'flex',
                    alignItems: 'center', 
                    gap: '0.5rem', 
                    color: '#ef4444' 
                  }}>
                    <AlertTriangle size={16} />
                    <span>{errors.agencies}</span>
                  </div>
                )}

                {loading.agencies ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
                    <div style={{ 
                      width: '32px', 
                      height: '32px', 
                      border: '3px solid #374151',
                      borderTop: '3px solid #3b82f6', 
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite', 
                      margin: '0 auto 1rem' 
                    }}></div>
                    <p>Cargando agencias...</p>
                  </div>
                ) : (
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                    gap: '1.5rem' 
                  }}>
                    {filteredAgencies.map((agency, index) => {
                      const interaction = getAgencyInteractionType(agency);
                      
                      return (
                        <motion.div 
                          key={agency.id}
                          initial={{ opacity: 0, y: 20 }} 
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }} 
                          whileHover={{ y: -4 }}
                          style={{ 
                            backgroundColor: '#1a1a1a', 
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '16px', 
                            padding: '1.5rem', 
                            transition: 'all 0.3s ease'
                          }}
                        >
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '1rem', 
                            marginBottom: '1rem' 
                          }}>
                            <AgencyImage 
                              src={agency.avatar} 
                              alt={agency.name} 
                              size={48}
                              onClick={() => {
                                setActiveModal('profile');
                                setModalData(agency);
                              }}
                              style={{ cursor: 'pointer' }} 
                            />
                            <div style={{ flex: 1 }}>
                              <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.5rem', 
                                marginBottom: '0.25rem' 
                              }}>
                                <h4 style={{ 
                                  margin: 0, 
                                  color: 'white', 
                                  fontSize: '1.125rem', 
                                  fontWeight: '600' 
                                }}>
                                  {agency.name}
                                </h4>
                                {interaction.type === 'current' && (
                                  <span style={{
                                    backgroundColor: 'rgba(16, 185, 129, 0.2)', 
                                    color: '#10b981',
                                    padding: '2px 6px', 
                                    borderRadius: '6px', 
                                    fontSize: '0.7rem', 
                                    fontWeight: '600'
                                  }}>
                                    ACTUAL
                                  </span>
                                )}
                                {interaction.type === 'pending' && (
                                  <span style={{
                                    backgroundColor: 'rgba(139, 92, 246, 0.2)', 
                                    color: '#8b5cf6',
                                    padding: '2px 6px', 
                                    borderRadius: '6px', 
                                    fontSize: '0.7rem', 
                                    fontWeight: '600'
                                  }}>
                                    ENVIADO
                                  </span>
                                )}
                              </div>
                              <div style={{ margin: '0.25rem 0', color: '#9ca3af', fontSize: '0.875rem' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <MapPin size={12} /> {agency.location}
                                </span>
                              </div>
                              {agency.isVerified && (
                                <div style={{ marginTop: '4px' }}>
                                  <VerifiedBadge size={10} />
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <p style={{ margin: '0 0 1rem 0', color: '#9ca3af', lineHeight: '1.5' }}>
                            {agency.bio}
                          </p>
                          
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              handleAgencyClick(agency); 
                            }}
                            disabled={interaction.disabled || loading.action}
                            style={{ 
                              width: '100%',
                              backgroundColor: interaction.buttonColor,
                              color: 'white', 
                              border: 'none',
                              borderRadius: '8px', 
                              padding: '0.75rem 1rem', 
                              fontWeight: '600',
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              gap: '0.5rem',
                              cursor: interaction.disabled || loading.action ? 'not-allowed' : 'pointer',
                              opacity: interaction.disabled || loading.action ? 0.6 : 1,
                              transition: 'all 0.3s ease'
                            }}
                            title={(() => {
                              switch (interaction.type) {
                                case 'current': return 'Esta es tu agencia actual';
                                case 'blocked': return `Ya perteneces a ${currentAgency?.name}`;
                                case 'pending': return 'Ya tienes una solicitud pendiente con esta agencia';
                                case 'warning': return `Tienes ${membershipData.pendingCount} solicitud(es) pendiente(s)`;
                                default: return 'Enviar solicitud para unirse';
                              }
                            })()}
                          >
                            {(() => {
                              if (loading.action) return <><Loader className="spin" size={14} /> Enviando...</>;
                              
                              switch (interaction.type) {
                                case 'current':
                                  return <><Building size={14} /> {interaction.buttonText}</>;
                                case 'blocked':
                                  return <><Ban size={14} /> {interaction.buttonText}</>;
                                case 'pending':
                                  return <><Check size={14} /> {interaction.buttonText}</>;
                                case 'warning':
                                  return <><AlertTriangle size={14} /> {interaction.buttonText}</>;
                                default:
                                  return <><Send size={14} /> {interaction.buttonText}</>;
                              }
                            })()}
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {agencyPagination.pages > 1 && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    gap: '1rem', 
                    marginTop: '2rem' 
                  }}>
                    <button 
                      disabled={!agencyPagination.hasPrev || loading.agencies}
                      onClick={() => {
                        const newFilters = { ...agencyFilters, page: agencyPagination.page - 1 };
                        setAgencyFilters(newFilters);
                        fetchAvailableAgencies(newFilters);
                      }}
                      style={{ 
                        backgroundColor: agencyPagination.hasPrev && !loading.agencies ? '#1a1a1a' : '#374151',
                        color: agencyPagination.hasPrev && !loading.agencies ? 'white' : '#6b7280',
                        border: '1px solid rgba(255, 255, 255, 0.1)', 
                        borderRadius: '8px',
                        padding: '0.5rem 1rem', 
                        cursor: agencyPagination.hasPrev && !loading.agencies ? 'pointer' : 'not-allowed',
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem' 
                      }}
                    >
                      <ChevronLeft size={16} />
                      Anterior
                    </button>
                    
                    <span style={{ color: '#9ca3af' }}>
                      Página {agencyPagination.page} de {agencyPagination.pages}
                    </span>
                    
                    <button 
                      disabled={!agencyPagination.hasNext || loading.agencies}
                      onClick={() => {
                        const newFilters = { ...agencyFilters, page: agencyPagination.page + 1 };
                        setAgencyFilters(newFilters);
                        fetchAvailableAgencies(newFilters);
                      }}
                      style={{ 
                        backgroundColor: agencyPagination.hasNext && !loading.agencies ? '#1a1a1a' : '#374151',
                        color: agencyPagination.hasNext && !loading.agencies ? 'white' : '#6b7280',
                        border: '1px solid rgba(255, 255, 255, 0.1)', 
                        borderRadius: '8px',
                        padding: '0.5rem 1rem', 
                        cursor: agencyPagination.hasNext && !loading.agencies ? 'pointer' : 'not-allowed',
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem' 
                      }}
                    >
                      Siguiente
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Modales */}
      <AnimatePresence>
        {activeModal && modalData && (
          <Modal>
            {renderModal()}
          </Modal>
        )}
      </AnimatePresence>

      {/* Estilos CSS */}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        /* Estilos para hover effects */
        button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
        }

        button:disabled {
          cursor: not-allowed !important;
          opacity: 0.6 !important;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .modal-overlay {
            padding: 0.5rem !important;
          }
          
          .modal-overlay > div {
            max-width: 95vw !important;
            max-height: 95vh !important;
            padding: 1.5rem !important;
          }
        }

        @media (max-width: 480px) {
          .modal-overlay {
            padding: 0.25rem !important;
          }
          
          .modal-overlay > div {
            max-width: 98vw !important;
            max-height: 98vh !important;
            padding: 1rem !important;
          }
        }

        /* Asegurar que los modales no interfieran */
        .modal-overlay {
          backdrop-filter: blur(8px);
        }

        .modal-overlay > div {
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.7);
        }
      `}</style>
    </div>
  );
};

export default EscortAgencyStatusPage;