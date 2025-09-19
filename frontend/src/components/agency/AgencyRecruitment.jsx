import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserPlus, Search, CheckCircle, XCircle, Clock, Calendar, X, Eye, Verified, AlertTriangle,
  Loader, Check, Info, Inbox, Users, Filter, Star, Phone, MapPin, Award, Shield, Lock,
  RefreshCw, Settings, AlertCircle, Trash2, Bug
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { agencyAPI, handleApiError } from '../../utils/api';

const AgencyRecruitment = () => {
  const { user, isAuthenticated } = useAuth();
  
  // ✅ ESTADOS PRINCIPALES
  const [searchTerm, setSearchTerm] = useState('');
  const [showCandidateModal, setShowCandidateModal] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(null);
  const [showPerfilEscort, setShowPerfilEscort] = useState(null);
  const [showDebugModal, setShowDebugModal] = useState(false);
  
  // ✅ SISTEMA DE NOTIFICACIONES MEJORADO
  const [notification, setNotification] = useState(null);
  const [processingResults, setProcessingResults] = useState(null);
  
  // ✅ ESTADOS DEL BACKEND
  const [receivedCandidates, setReceivedCandidates] = useState([]);
  const [loading, setLoading] = useState({ received: false, action: false, cleanup: false });
  const [errors, setErrors] = useState({});
  const [debugInfo, setDebugInfo] = useState(null);
  
  // ✅ PAGINACIÓN
  const [pagination, setPagination] = useState({
    page: 1, limit: 20, total: 0, pages: 0, hasNext: false, hasPrev: false
  });

  // ✅ CONFIGURACIÓN DE DEBUGGING
  const [debugMode, setDebugMode] = useState(false);
  const [lastFetchInfo, setLastFetchInfo] = useState(null);

  // ✅ VERIFICAR PERMISOS
  if (!isAuthenticated || user?.userType !== 'AGENCY') {
    return (
      <div className="agency-recruitment-page" style={{
        minHeight: '100vh', background: '#000000', color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '80px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <AlertTriangle size={64} color="#ef4444" />
          <h2 style={{ margin: '1rem 0', color: '#ef4444' }}>Acceso Restringido</h2>
          <p style={{ color: '#9CA3AF' }}>Esta página es solo para agencias autenticadas.</p>
        </div>
      </div>
    );
  }

  // ✅ FUNCIÓN PARA MOSTRAR NOTIFICACIONES MEJORADAS
  const showNotification = useCallback((type, title, message, extraData = null) => {
    console.log('📢 Showing notification:', { type, title, message, extraData });
    setNotification({ type, title, message, extraData });
    setTimeout(() => setNotification(null), 8000); // Duración aumentada para leer
  }, []);

  // ✅ VALIDAR CANDIDATO ANTES DE MOSTRAR (NUEVA FUNCIÓN)
  const validateCandidate = useCallback((candidate) => {
    const issues = [];
    
    // Verificar estructura básica
    if (!candidate.membershipId) issues.push('Missing membershipId');
    if (!candidate.escortId) issues.push('Missing escortId');
    if (!candidate.name) issues.push('Missing name');
    if (candidate.hasActiveMembership === true) issues.push('Has active membership elsewhere');
    if (candidate.status !== 'PENDING') issues.push(`Status is ${candidate.status}, not PENDING`);
    
    return {
      isValid: issues.length === 0,
      issues,
      candidate
    };
  }, []);

  // ✅ OBTENER SOLICITUDES RECIBIDAS DESDE EL BACKEND - MEJORADO
  const fetchReceivedCandidates = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, received: true }));
      setErrors(prev => ({ ...prev, received: null }));
      
      console.log('🔍 === FETCHING RECEIVED CANDIDATES (ENHANCED) ===');
      console.log('🔍 Search term:', searchTerm);
      console.log('🔍 Pagination:', pagination.page, pagination.limit);
      
      const requestParams = {
        page: pagination.page,
        limit: pagination.limit,
        status: 'pending',
        search: searchTerm
      };
      
      console.log('📤 Request params:', requestParams);
      
      const response = await agencyAPI.getAgencyEscorts(requestParams);
      
      console.log('📥 === BACKEND RESPONSE (ENHANCED) ===');
      console.log('📥 Success:', response.success);
      console.log('📥 Data keys:', Object.keys(response.data || {}));
      
      if (response.success && response.data) {
        const candidatesData = response.data.escorts || [];
        console.log('📥 Raw candidates count:', candidatesData.length);
        
        // ✅ VALIDACIÓN ADICIONAL EN EL FRONTEND
        const validatedCandidates = candidatesData.map(candidate => {
          const validation = validateCandidate(candidate);
          if (!validation.isValid && debugMode) {
            console.warn('⚠️ Invalid candidate filtered:', {
              name: candidate.name,
              issues: validation.issues,
              candidate
            });
          }
          return { ...candidate, ...validation };
        }).filter(candidate => candidate.isValid);
        
        console.log('✅ Valid candidates after frontend validation:', validatedCandidates.length);
        console.log('✅ Filtered out:', candidatesData.length - validatedCandidates.length);
        
        setReceivedCandidates(validatedCandidates);
        setPagination(response.data.pagination || pagination);
        
        // ✅ GUARDAR INFO DE DEBUG
        setLastFetchInfo({
          timestamp: new Date().toISOString(),
          requestParams,
          totalReceived: candidatesData.length,
          validAfterFiltering: validatedCandidates.length,
          filteredOut: candidatesData.length - validatedCandidates.length,
          pagination: response.data.pagination
        });
        
        // ✅ MOSTRAR ALERTA SI SE FILTRARON CANDIDATOS
        if (candidatesData.length > validatedCandidates.length) {
          const filteredCount = candidatesData.length - validatedCandidates.length;
          console.warn(`⚠️ Filtered out ${filteredCount} invalid candidate(s) - they may already be in other agencies`);
          
          if (debugMode) {
            showNotification('warning', 'Candidatos Filtrados', 
              `Se filtraron ${filteredCount} candidato(s) que ya podrían estar en otras agencias.`);
          }
        }
        
      } else {
        throw new Error(response.message || 'Error obteniendo solicitudes recibidas');
      }
    } catch (error) {
      console.error('❌ === ERROR FETCHING RECEIVED CANDIDATES ===');
      console.error('❌ Error details:', error);
      setErrors(prev => ({ ...prev, received: handleApiError(error) }));
      setReceivedCandidates([]);
      
      // ✅ NOTIFICACIÓN DE ERROR MÁS ESPECÍFICA
      if (error.status === 500) {
        showNotification('error', 'Error del Servidor', 
          'Hubo un problema al obtener las solicitudes. Inténtalo de nuevo en unos momentos.');
      } else if (error.status === 403) {
        showNotification('error', 'Sin Permisos', 
          'No tienes permisos para ver las solicitudes de esta agencia.');
      } else {
        showNotification('error', 'Error de Conexión', handleApiError(error));
      }
    } finally {
      setLoading(prev => ({ ...prev, received: false }));
    }
  }, [pagination.page, pagination.limit, searchTerm, user, validateCandidate, debugMode, showNotification]);

  // ✅ APROBAR CANDIDATA - MEJORADO CON VALIDACIONES ADICIONALES
  const handleApproveCandidate = async (candidate) => {
    try {
      setLoading(prev => ({ ...prev, action: true }));
      
      console.log('📤 === APPROVING CANDIDATE (ENHANCED V2) ===');
      console.log('📤 Candidate:', candidate.name);
      console.log('📤 Membership ID:', candidate.membershipId);
      console.log('📤 Escort ID:', candidate.escortId);
      console.log('📤 Current status:', candidate.status);
      
      // ✅ VALIDACIÓN PREVIA
      const validation = validateCandidate(candidate);
      if (!validation.isValid) {
        console.error('❌ Candidate validation failed:', validation.issues);
        throw new Error(`No se puede aprobar: ${validation.issues.join(', ')}`);
      }
      
      if (!candidate.membershipId) {
        console.error('❌ No membershipId found in candidate');
        throw new Error('ID de membresía no encontrado en los datos del candidato');
      }
      
      const requestData = {
        action: 'approve',
        message: 'Bienvenida a nuestra agencia',
        commissionRate: 0.15
      };
      
      console.log('📤 Calling manageMembershipRequest with:', {
        membershipId: candidate.membershipId,
        ...requestData
      });
      
      const response = await agencyAPI.manageMembershipRequest(
        candidate.membershipId,
        requestData
      );
      
      console.log('📥 === APPROVAL RESPONSE (ENHANCED) ===');
      console.log('📥 Success:', response.success);
      console.log('📥 Data:', response.data);
      console.log('📥 Cancelled other requests:', response.data?.cancelledOtherRequests);
      
      if (response.success) {
        // ✅ REMOVER DE LA LISTA DE CANDIDATOS
        setReceivedCandidates(prev => {
          const beforeCount = prev.length;
          const updated = prev.filter(c => c.membershipId !== candidate.membershipId);
          const afterCount = updated.length;
          
          console.log('✅ Candidates before removal:', beforeCount);
          console.log('✅ Candidates after removal:', afterCount);
          
          return updated;
        });
        
        // ✅ NOTIFICACIÓN MEJORADA CON INFORMACIÓN DE AUTO-CANCELACIÓN
        const cancelledCount = response.data?.cancelledOtherRequests || 0;
        let notificationMessage = `${candidate.name} ha sido aprobada y añadida a tu agencia exitosamente.`;
        
        if (cancelledCount > 0) {
          notificationMessage += ` Se han cancelado automáticamente ${cancelledCount} solicitud(es) pendiente(s) que tenía con otras agencias.`;
        }
        
        showNotification(
          'success',
          '¡Candidata Aprobada!',
          notificationMessage,
          {
            candidateName: candidate.name,
            cancelledRequests: cancelledCount,
            newMember: true,
            escortId: candidate.escortId
          }
        );
        
        // ✅ ACTUALIZAR ESTADÍSTICAS LOCALES
        if (cancelledCount > 0) {
          console.log(`✅ Auto-cancelled ${cancelledCount} other requests for ${candidate.name}`);
        }
        
        console.log('✅ Candidata aprobada exitosamente');
        
        // ✅ REFRESCAR DATOS DESPUÉS DE UN BREVE DELAY
        setTimeout(() => {
          console.log('🔄 Refreshing data after approval...');
          fetchReceivedCandidates();
        }, 1500);
        
      } else {
        throw new Error(response.message || 'Error aprobando candidata');
      }
    } catch (error) {
      console.error('❌ === ERROR APPROVING CANDIDATE ===');
      console.error('❌ Error:', error);
      
      // ✅ MANEJO DE ERRORES ESPECÍFICOS DEL BACKEND
      if (error.status === 409) {
        if (error.message?.includes('ya fue aceptada') || error.message?.includes('ESCORT_ALREADY_ACCEPTED_ELSEWHERE')) {
          showNotification('warning', 'Candidata ya Aceptada', 
            `${candidate.name} ya fue aceptada por otra agencia mientras procesábamos su solicitud. Su solicitud ha sido removida automáticamente.`);
          
          // ✅ REMOVER DE LA LISTA LOCAL TAMBIÉN
          setReceivedCandidates(prev => 
            prev.filter(c => c.membershipId !== candidate.membershipId)
          );
          
        } else if (error.message?.includes('ya es miembro')) {
          showNotification('warning', 'Candidata ya es Miembro', 
            `${candidate.name} ya es miembro activo de otra agencia.`);
        } else if (error.message?.includes('no encontrada')) {
          showNotification('warning', 'Solicitud no Válida', 
            'Esta solicitud ya no está disponible o ha sido procesada.');
        } else {
          showNotification('warning', 'Conflicto', error.message);
        }
      } else if (error.status === 404) {
        showNotification('warning', 'Solicitud no Encontrada', 
          'Esta solicitud ya no existe o fue procesada por otra agencia.');
        
        // ✅ REMOVER DE LA LISTA LOCAL
        setReceivedCandidates(prev => 
          prev.filter(c => c.membershipId !== candidate.membershipId)
        );
      } else {
        showNotification('error', 'Error al Aprobar', handleApiError(error));
      }
    } finally {
      setLoading(prev => ({ ...prev, action: false }));
      setShowCandidateModal(null);
      setShowConfirmModal(null);
    }
  };

  // ✅ RECHAZAR CANDIDATA - MEJORADO
  const handleRejectCandidate = async (candidate) => {
    try {
      setLoading(prev => ({ ...prev, action: true }));
      
      console.log('📤 === REJECTING CANDIDATE (ENHANCED) ===');
      console.log('📤 Candidate:', candidate.name);
      console.log('📤 Membership ID:', candidate.membershipId);
      
      if (!candidate.membershipId) {
        throw new Error('ID de membresía no encontrado en los datos del candidato');
      }
      
      const response = await agencyAPI.manageMembershipRequest(
        candidate.membershipId,
        {
          action: 'reject',
          message: 'En este momento no podemos proceder con tu solicitud. Te deseamos éxito en tu búsqueda.'
        }
      );
      
      console.log('📥 === REJECTION RESPONSE ===');
      console.log('📥 Success:', response.success);
      
      if (response.success) {
        // ✅ REMOVER DE LA LISTA
        setReceivedCandidates(prev => 
          prev.filter(c => c.membershipId !== candidate.membershipId)
        );
        
        // ✅ NOTIFICACIÓN AMIGABLE
        showNotification(
          'info',
          'Solicitud Rechazada',
          `La solicitud de ${candidate.name} ha sido rechazada. Podrá volver a aplicar en el futuro si lo desea.`
        );
        
        console.log('✅ Candidata rechazada exitosamente');
        
        // ✅ REFRESCAR DATOS
        setTimeout(() => fetchReceivedCandidates(), 1000);
      } else {
        throw new Error(response.message || 'Error rechazando candidata');
      }
    } catch (error) {
      console.error('❌ === ERROR REJECTING CANDIDATE ===');
      
      if (error.status === 404) {
        showNotification('warning', 'Solicitud no Encontrada', 
          'Esta solicitud ya no está disponible o ha sido procesada.');
        
        // ✅ REMOVER DE LA LISTA LOCAL
        setReceivedCandidates(prev => 
          prev.filter(c => c.membershipId !== candidate.membershipId)
        );
      } else {
        showNotification('error', 'Error al Rechazar', handleApiError(error));
      }
    } finally {
      setLoading(prev => ({ ...prev, action: false }));
      setShowCandidateModal(null);
      setShowConfirmModal(null);
    }
  };

  // ✅ FUNCIÓN DE LIMPIEZA MANUAL (NUEVA)
  const handleCleanupObsoleteRequests = async () => {
    try {
      setLoading(prev => ({ ...prev, cleanup: true }));
      
      console.log('🧹 === MANUAL CLEANUP TRIGGERED ===');
      
      // Nota: Esta función requiere privilegios de admin
      // Por ahora, solo refrescamos los datos
      showNotification('info', 'Refrescando Datos', 
        'Actualizando la lista de solicitudes para remover candidatos que ya están en otras agencias...');
      
      await fetchReceivedCandidates();
      
      showNotification('success', 'Datos Actualizados', 
        'La lista ha sido actualizada. Los candidatos que ya están en otras agencias han sido filtrados.');
      
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      showNotification('error', 'Error en Limpieza', handleApiError(error));
    } finally {
      setLoading(prev => ({ ...prev, cleanup: false }));
    }
  };

  // ✅ MANEJAR BÚSQUEDA
  const handleSearch = useCallback((searchValue) => {
    console.log('🔍 Search triggered with term:', searchValue);
    setSearchTerm(searchValue);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  // ✅ MANEJAR CAMBIO DE PAGINACIÓN
  const handlePageChange = useCallback((newPage) => {
    console.log('📄 Page change requested:', newPage);
    setPagination(prev => ({ ...prev, page: newPage }));
  }, []);

  // ✅ EFECTOS
  useEffect(() => {
    console.log('🔄 === MAIN EFFECT TRIGGERED ===');
    console.log('🔄 isAuthenticated:', isAuthenticated);
    console.log('🔄 user?.userType:', user?.userType);
    console.log('🔄 user?.agency:', user?.agency);
    
    if (isAuthenticated && user?.userType === 'AGENCY') {
      console.log('✅ Conditions met, fetching data...');
      fetchReceivedCandidates();
    } else {
      console.log('❌ Conditions not met for fetching data');
    }
  }, [isAuthenticated, user, fetchReceivedCandidates]);

  // ✅ EFECTO PARA CAMBIOS DE PAGINACIÓN Y BÚSQUEDA
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (isAuthenticated && user?.userType === 'AGENCY') {
        console.log('🔄 Re-fetching due to pagination/search change');
        fetchReceivedCandidates();
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [pagination.page, searchTerm, isAuthenticated, user?.userType, fetchReceivedCandidates]);

  // ✅ FILTRAR CANDIDATOS LOCALMENTE
  const filteredCandidates = useMemo(() => {
    if (!searchTerm) return receivedCandidates;
    
    const searchLower = searchTerm.toLowerCase();
    return receivedCandidates.filter(candidate => {
      return (
        candidate.name?.toLowerCase().includes(searchLower) ||
        candidate.location?.toLowerCase().includes(searchLower) ||
        candidate.description?.toLowerCase().includes(searchLower)
      );
    });
  }, [receivedCandidates, searchTerm]);

  // ✅ HANDLERS PARA MODALES
  const handleAvatarClick = (candidate) => {
    console.log('👤 Avatar clicked for candidate:', candidate.name);
    setShowPerfilEscort(candidate);
  };

  // ✅ FUNCIÓN PARA FORMATEAR FECHAS
  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha no disponible';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  // ✅ DEBUGGING EN EL RENDER
  console.log('🖼️ === RENDER DEBUG ===');
  console.log('🖼️ Loading received:', loading.received);
  console.log('🖼️ Received candidates count:', receivedCandidates.length);
  console.log('🖼️ Filtered candidates count:', filteredCandidates.length);
  console.log('🖼️ Current errors:', errors);
  console.log('🖼️ Current pagination:', pagination);
  console.log('🖼️ Search term:', searchTerm);
  console.log('🖼️ Debug mode:', debugMode);

  if (receivedCandidates.length > 0) {
    console.log('🖼️ Sample candidate:', receivedCandidates[0]);
  }

  // ✅ COMPONENTE DE NOTIFICACIÓN MEJORADO
  const NotificationModal = ({ notification, onClose }) => {
    const getIcon = () => {
      switch (notification.type) {
        case 'success': return <CheckCircle size={48} color="#10b981" />;
        case 'error': return <XCircle size={48} color="#ef4444" />;
        case 'warning': return <AlertTriangle size={48} color="#f59e0b" />;
        case 'info': default: return <Info size={48} color="#3b82f6" />;
      }
    };

    const getColors = () => {
      switch (notification.type) {
        case 'success': return { iconColor: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)', bgColor: 'rgba(16, 185, 129, 0.1)' };
        case 'error': return { iconColor: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', bgColor: 'rgba(239, 68, 68, 0.1)' };
        case 'warning': return { iconColor: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.3)', bgColor: 'rgba(245, 158, 11, 0.1)' };
        case 'info': default: return { iconColor: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.3)', bgColor: 'rgba(59, 130, 246, 0.1)' };
      }
    };

    const colors = getColors();

    return (
      <div 
        className="notification-modal-overlay"
        onClick={onClose}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.9)', backdropFilter: 'blur(24px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem', zIndex: 10000
        }}
      >
        <motion.div 
          className="notification-modal"
          initial={{ opacity: 0, scale: 0.8, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 50 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: '#000000', border: `1px solid ${colors.borderColor}`,
            borderRadius: '16px', padding: '2rem', maxWidth: '500px', width: '90%',
            textAlign: 'center', boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)'
          }}
        >
          <div style={{ marginBottom: '1.5rem' }}>
            {getIcon()}
          </div>
          
          <h3 style={{
            fontSize: '1.25rem', fontWeight: '700', color: 'white',
            margin: '0 0 1rem 0'
          }}>
            {notification.title}
          </h3>
          
          <p style={{
            fontSize: '1rem', color: '#9CA3AF', margin: '0 0 2rem 0',
            lineHeight: '1.5'
          }}>
            {notification.message}
          </p>

          {/* ✅ INFORMACIÓN ADICIONAL SI ES APROBACIÓN CON CANCELACIONES */}
          {notification.extraData?.cancelledRequests > 0 && (
            <div style={{
              background: colors.bgColor, border: `1px solid ${colors.borderColor}`,
              borderRadius: '8px', padding: '1rem', margin: '1rem 0',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Lock size={16} color={colors.iconColor} />
                <span style={{ color: colors.iconColor, fontWeight: '600', fontSize: '0.875rem' }}>
                  Auto-cancelación de Solicitudes
                </span>
              </div>
              <p style={{ color: '#d1d5db', fontSize: '0.875rem', margin: 0 }}>
                {notification.extraData.candidateName} tenía {notification.extraData.cancelledRequests} solicitud(es) 
                pendiente(s) con otras agencias que fueron canceladas automáticamente. 
                Ahora es miembro exclusivo de tu agencia.
              </p>
            </div>
          )}
          
          <motion.button
            onClick={onClose}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '0.5rem', padding: '0.75rem 2rem',
              background: colors.bgColor, border: `1px solid ${colors.borderColor}`,
              borderRadius: '8px', color: colors.iconColor, fontSize: '0.875rem',
              fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s ease',
              margin: '0 auto'
            }}
          >
            <Check size={16} />
            Entendido
          </motion.button>
        </motion.div>
      </div>
    );
  };

  // ✅ MODAL DE CONFIRMACIÓN MEJORADO
  const ConfirmationModal = ({ candidate, action, onConfirm, onCancel }) => (
    <div 
      className="recruitment-modal-overlay"
      onClick={onCancel}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0, 0, 0, 0.9)', backdropFilter: 'blur(24px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem', zIndex: 9000
      }}
    >
      <motion.div 
        className="confirmation-modal"
        initial={{ opacity: 0, scale: 0.9, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 50 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#000000', borderRadius: '16px', width: '100%',
          maxWidth: '480px', border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)'
        }}
      >
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            {action === 'approve' ? (
              <CheckCircle size={48} color="#10b981" />
            ) : (
              <AlertTriangle size={48} color="#ef4444" />
            )}
          </div>
          
          <h3 style={{
            fontSize: '1.5rem', fontWeight: '700', color: 'white',
            margin: '0 0 1rem 0'
          }}>
            {action === 'approve' ? 'Aprobar Candidata' : 'Rechazar Solicitud'}
          </h3>
          
          <p style={{
            fontSize: '1rem', color: '#9CA3AF', margin: '0 0 1.5rem 0',
            lineHeight: '1.5'
          }}>
            {action === 'approve' 
              ? `¿Estás seguro de que quieres aprobar a ${candidate.name} y añadirla a tu agencia?` 
              : `¿Estás seguro de que quieres rechazar la solicitud de ${candidate.name}?`
            }
          </p>

          {/* ✅ ADVERTENCIA SOBRE AUTO-CANCELACIÓN */}
          {action === 'approve' && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: '8px', padding: '1rem', margin: '1rem 0', textAlign: 'left'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Info size={16} color="#10b981" />
                <span style={{ color: '#10b981', fontWeight: '600', fontSize: '0.875rem' }}>
                  Importante
                </span>
              </div>
              <p style={{ color: '#d1d5db', fontSize: '0.875rem', margin: 0 }}>
                Al aprobar esta solicitud, cualquier otra solicitud pendiente que tenga esta escort 
                con otras agencias será cancelada automáticamente. Se convertirá en miembro exclusivo de tu agencia.
              </p>
            </div>
          )}
          
          <div style={{
            display: 'flex', alignItems: 'center', gap: '1rem',
            justifyContent: 'center', padding: '1rem',
            background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px',
            marginBottom: '1.5rem'
          }}>
            <img 
              src={candidate.avatar} 
              alt={candidate.name}
              style={{
                width: '48px', height: '48px', borderRadius: '50%',
                objectFit: 'cover', border: '2px solid #ff6b35'
              }}
            />
            <div>
              <span style={{
                display: 'block', fontSize: '1rem', fontWeight: '600', color: 'white'
              }}>
                {candidate.name}, {candidate.age}
              </span>
              <span style={{
                display: 'block', fontSize: '0.875rem', color: '#9CA3AF'
              }}>
                {candidate.location}
              </span>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <motion.button
              onClick={onCancel}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={loading.action}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '0.5rem', padding: '0.75rem 1.5rem',
                border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px',
                fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer',
                transition: 'all 0.3s ease', flex: 1,
                background: 'transparent', color: '#D1D5DB'
              }}
            >
              Cancelar
            </motion.button>
            
            <motion.button
              onClick={onConfirm}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={loading.action}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '0.5rem', padding: '0.75rem 1.5rem', border: 'none',
                borderRadius: '8px', fontSize: '0.875rem', fontWeight: '600',
                cursor: 'pointer', transition: 'all 0.3s ease', flex: 1,
                background: action === 'approve' 
                  ? 'linear-gradient(135deg, #10b981, #059669)' 
                  : 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: 'white', opacity: loading.action ? 0.5 : 1
              }}
            >
              {loading.action ? (
                <>
                  <Loader className="mini-spinner" size={16} />
                  Procesando...
                </>
              ) : (
                <>
                  {action === 'approve' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                  {action === 'approve' ? 'Sí, Aprobar' : 'Sí, Rechazar'}
                </>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );

  // ✅ MODAL DE CANDIDATO MEJORADO
  const CandidateModal = ({ candidate, onClose }) => (
    <div 
      className="recruitment-modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0, 0, 0, 0.9)', backdropFilter: 'blur(24px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem', zIndex: 8000
      }}
    >
      <motion.div 
        className="recruitment-modal"
        initial={{ opacity: 0, scale: 0.9, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 50 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#000000', borderRadius: '16px', width: '100%',
          maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)'
        }}
      >
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          background: '#000000', borderRadius: '16px 16px 0 0'
        }}>
          <h2 style={{
            fontSize: '1.25rem', fontWeight: '700', color: 'white', margin: 0
          }}>
            Solicitud de {candidate.name}
          </h2>
          <motion.button 
            onClick={onClose}
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            style={{
              width: '40px', height: '40px', background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '50%',
              color: '#9CA3AF', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.3s ease'
            }}
          >
            <X size={20} />
          </motion.button>
        </div>
        
        <div style={{ padding: '1.5rem', background: '#000000' }}>
          <div style={{
            display: 'flex', gap: '1rem', marginBottom: '1.5rem',
            padding: '1rem', background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '12px'
          }}>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem'
            }}>
              <img 
                src={candidate.avatar} 
                alt={candidate.name}
                style={{
                  width: '80px', height: '80px', borderRadius: '50%',
                  objectFit: 'cover', border: '3px solid #ff6b35'
                }}
              />
              {candidate.verified && (
                <span style={{ color: '#3b82f6', fontSize: '0.75rem', fontWeight: '600' }}>
                  Verificada
                </span>
              )}
            </div>
            
            <div style={{ flex: 1 }}>
              <h3 style={{
                fontSize: '1.25rem', fontWeight: '700', color: 'white',
                margin: '0 0 0.25rem 0'
              }}>
                {candidate.name}, {candidate.age}
              </h3>
              <p style={{ color: '#9CA3AF', margin: '0 0 0.5rem 0' }}>
                {candidate.location}
              </p>
              <div style={{ fontSize: '0.875rem', color: '#9CA3AF', marginBottom: '0.5rem' }}>
                <strong>Idiomas:</strong> {candidate.languages?.join(', ') || 'No especificado'}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>
                <strong>Disponibilidad:</strong> {candidate.availability || 'No especificado'}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#9CA3AF', marginTop: '0.5rem' }}>
                <strong>Estado:</strong> {candidate.status}
              </div>
            </div>
          </div>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{
              fontSize: '1rem', fontWeight: '600', color: 'white',
              margin: '0 0 0.75rem 0'
            }}>
              Descripción del perfil:
            </h4>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px', padding: '1rem', color: '#D1D5DB',
              lineHeight: '1.6'
            }}>
              {candidate.description || 'Sin descripción disponible'}
            </div>
          </div>
          
          {candidate.services && candidate.services.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{
                fontSize: '1rem', fontWeight: '600', color: 'white',
                margin: '0 0 0.5rem 0'
              }}>
                Servicios:
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {candidate.services.map((service, index) => (
                  <span
                    key={index}
                    style={{
                      background: 'rgba(255, 107, 53, 0.1)',
                      color: '#ff6b35', padding: '0.25rem 0.5rem',
                      borderRadius: '4px', fontSize: '0.75rem',
                      border: '1px solid rgba(255, 107, 53, 0.2)'
                    }}
                  >
                    {service}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          <div style={{ 
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '1rem', background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '8px', marginBottom: '1rem'
          }}>
            <span style={{ color: '#9CA3AF' }}>Fecha de solicitud:</span>
            <span style={{ color: '#ff6b35', fontWeight: '600' }}>
              {formatDate(candidate.applicationDate)}
            </span>
          </div>
          
          {/* ✅ INFORMACIÓN DE DEBUG SI ESTÁ HABILITADO */}
          {debugMode && (
            <div style={{
              background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: '8px', padding: '1rem', marginBottom: '1rem'
            }}>
              <h4 style={{ color: '#3b82f6', margin: '0 0 0.5rem 0', fontSize: '0.875rem' }}>
                Debug Info:
              </h4>
              <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                <div>Membership ID: {candidate.membershipId}</div>
                <div>Escort ID: {candidate.escortId}</div>
                <div>Has Active Membership: {candidate.hasActiveMembership ? 'Yes' : 'No'}</div>
                <div>Validation Issues: {candidate.issues?.join(', ') || 'None'}</div>
              </div>
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <motion.button
              onClick={() => setShowConfirmModal({ candidate, action: 'reject' })}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={loading.action}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '0.5rem', padding: '0.75rem 1.5rem',
                border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px',
                fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer',
                transition: 'all 0.3s ease', flex: 1,
                background: 'transparent', color: '#D1D5DB'
              }}
            >
              <XCircle size={16} />
              Rechazar
            </motion.button>
            
            <motion.button
              onClick={() => setShowConfirmModal({ candidate, action: 'approve' })}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={loading.action}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '0.5rem', padding: '0.75rem 1.5rem', border: 'none',
                borderRadius: '8px', fontSize: '0.875rem', fontWeight: '600',
                cursor: 'pointer', transition: 'all 0.3s ease', flex: 1,
                background: 'linear-gradient(135deg, #ff6b35, #ff8f35)',
                color: 'white'
              }}
            >
              <CheckCircle size={16} />
              Aprobar y Añadir
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );

  // ✅ MODAL DE DEBUG (NUEVO)
  const DebugModal = ({ isOpen, onClose }) => (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="debug-modal-overlay"
          onClick={onClose}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.9)', backdropFilter: 'blur(24px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem', zIndex: 11000
          }}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#000000', borderRadius: '16px', width: '100%',
              maxWidth: '700px', maxHeight: '80vh', overflowY: 'auto',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)'
            }}
          >
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '1.5rem', borderBottom: '1px solid rgba(59, 130, 246, 0.2)',
              background: 'rgba(59, 130, 246, 0.1)', borderRadius: '16px 16px 0 0'
            }}>
              <h2 style={{
                fontSize: '1.25rem', fontWeight: '700', color: '#3b82f6', margin: 0
              }}>
                Debug Information
              </h2>
              <motion.button 
                onClick={onClose}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                style={{
                  width: '40px', height: '40px', background: 'transparent',
                  border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '50%',
                  color: '#3b82f6', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.3s ease'
                }}
              >
                <X size={20} />
              </motion.button>
            </div>
            
            <div style={{ padding: '1.5rem' }}>
              {/* Last Fetch Info */}
              {lastFetchInfo && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ color: '#3b82f6', fontSize: '1rem', marginBottom: '0.5rem' }}>
                    Last Fetch Information:
                  </h3>
                  <div style={{
                    background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: '8px', padding: '1rem', fontSize: '0.875rem', color: '#d1d5db'
                  }}>
                    <div><strong>Timestamp:</strong> {lastFetchInfo.timestamp}</div>
                    <div><strong>Total Received:</strong> {lastFetchInfo.totalReceived}</div>
                    <div><strong>Valid After Filtering:</strong> {lastFetchInfo.validAfterFiltering}</div>
                    <div><strong>Filtered Out:</strong> {lastFetchInfo.filteredOut}</div>
                    <div><strong>Search Term:</strong> {lastFetchInfo.requestParams.search || 'None'}</div>
                    <div><strong>Page:</strong> {lastFetchInfo.requestParams.page}</div>
                  </div>
                </div>
              )}

              {/* Current State */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ color: '#3b82f6', fontSize: '1rem', marginBottom: '0.5rem' }}>
                  Current State:
                </h3>
                <div style={{
                  background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: '8px', padding: '1rem', fontSize: '0.875rem', color: '#d1d5db'
                }}>
                  <div><strong>Candidates Count:</strong> {receivedCandidates.length}</div>
                  <div><strong>Filtered Count:</strong> {filteredCandidates.length}</div>
                  <div><strong>Loading:</strong> {JSON.stringify(loading)}</div>
                  <div><strong>Errors:</strong> {JSON.stringify(errors)}</div>
                  <div><strong>Search Term:</strong> {searchTerm || 'None'}</div>
                </div>
              </div>

              {/* Sample Candidates */}
              {receivedCandidates.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ color: '#3b82f6', fontSize: '1rem', marginBottom: '0.5rem' }}>
                    Sample Candidates:
                  </h3>
                  <div style={{
                    background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: '8px', padding: '1rem', fontSize: '0.75rem', color: '#d1d5db',
                    maxHeight: '200px', overflowY: 'auto'
                  }}>
                    {receivedCandidates.slice(0, 3).map((candidate, index) => (
                      <div key={index} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(59, 130, 246, 0.2)' }}>
                        <div><strong>Name:</strong> {candidate.name}</div>
                        <div><strong>Membership ID:</strong> {candidate.membershipId}</div>
                        <div><strong>Escort ID:</strong> {candidate.escortId}</div>
                        <div><strong>Status:</strong> {candidate.status}</div>
                        <div><strong>Has Active Membership:</strong> {candidate.hasActiveMembership ? 'Yes' : 'No'}</div>
                        <div><strong>Validation Issues:</strong> {candidate.issues?.join(', ') || 'None'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="agency-recruitment-page" style={{
      minHeight: '100vh', background: '#000000', color: 'white', paddingTop: '80px'
    }}>
      {/* Hero Section */}
      <div style={{
        background: '#000000', padding: '2rem 0',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              background: '#1a1a1a', backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px',
              padding: '1.5rem', display: 'flex', alignItems: 'center', 
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '64px', height: '64px',
                background: 'linear-gradient(135deg, #ff6b35, #ff8f35)',
                borderRadius: '16px', display: 'flex', alignItems: 'center',
                justifyContent: 'center'
              }}>
                <UserPlus size={32} color="white" />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '700' }}>
                  Solicitudes de Reclutamiento
                </h1>
                <p style={{ margin: 0, color: '#9CA3AF', fontSize: '1rem' }}>
                  Revisa y gestiona las solicitudes para unirse a tu agencia
                </p>
              </div>
            </div>

            {/* ✅ CONTROLES DE DEBUG Y LIMPIEZA */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <motion.button
                onClick={() => setDebugMode(!debugMode)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.5rem 1rem', borderRadius: '8px',
                  background: debugMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                  border: `1px solid ${debugMode ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                  color: debugMode ? '#3b82f6' : '#9CA3AF',
                  fontSize: '0.875rem', cursor: 'pointer'
                }}
              >
                <Bug size={16} />
                Debug
              </motion.button>

              {debugMode && (
                <motion.button
                  onClick={() => setShowDebugModal(true)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.5rem 1rem', borderRadius: '8px',
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    color: '#3b82f6', fontSize: '0.875rem', cursor: 'pointer'
                  }}
                >
                  <Info size={16} />
                  Info
                </motion.button>
              )}

              <motion.button
                onClick={handleCleanupObsoleteRequests}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={loading.cleanup}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.5rem 1rem', borderRadius: '8px',
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  color: '#22c55e', fontSize: '0.875rem', cursor: 'pointer',
                  opacity: loading.cleanup ? 0.5 : 1
                }}
              >
                {loading.cleanup ? (
                  <Loader className="spin" size={16} />
                ) : (
                  <RefreshCw size={16} />
                )}
                Actualizar
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Controles */}
      <div style={{ padding: '1rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header con contador */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '1rem',
            padding: '1rem', background: '#1a1a1a',
            border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px'
          }}>
            <Inbox size={20} color="#ff6b35" />
            <span style={{ fontSize: '1rem', fontWeight: '600', color: 'white' }}>
              Solicitudes Pendientes
            </span>
            <span style={{
              background: 'rgba(255, 107, 53, 0.2)', color: '#ff6b35',
              padding: '0.25rem 0.75rem', borderRadius: '8px',
              fontSize: '0.875rem', fontWeight: '700'
            }}>
              {filteredCandidates.length}
            </span>
            
            {debugMode && lastFetchInfo && (
              <span style={{
                background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6',
                padding: '0.25rem 0.75rem', borderRadius: '8px',
                fontSize: '0.75rem', fontWeight: '600'
              }}>
                Filtrados: {lastFetchInfo.filteredOut}
              </span>
            )}
          </div>
        </div>

        {/* Búsqueda */}
        <div style={{ position: 'relative', maxWidth: '400px', marginBottom: '1rem' }}>
          <Search 
            size={20} 
            style={{
              position: 'absolute', left: '1rem', top: '50%',
              transform: 'translateY(-50%)', color: '#9CA3AF'
            }}
          />
          <input
            type="text"
            placeholder="Buscar candidatas..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            style={{
              width: '100%', background: '#1a1a1a',
              border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px',
              padding: '0.75rem 1rem 0.75rem 2.5rem', color: 'white',
              fontSize: '0.875rem', outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Error Banner */}
      {errors.received && (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem 1rem' }}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px',
            padding: '1rem', display: 'flex', alignItems: 'center',
            gap: '0.5rem', color: '#ef4444'
          }}>
            <AlertTriangle size={16} />
            <span>{errors.received}</span>
          </div>
        </div>
      )}

      {/* Contenido Principal */}
      <div style={{ paddingBottom: '2rem' }}>
        {/* Loading State */}
        {loading.received ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '3rem', color: '#9CA3AF'
          }}>
            <Loader className="spin" size={48} />
            <p style={{ marginTop: '1rem' }}>
              Cargando solicitudes recibidas...
            </p>
          </div>
        ) : (
          <>
            {/* Grid de Candidatos */}
            {filteredCandidates.length > 0 ? (
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                gap: '1.5rem', padding: '0 2rem', maxWidth: '1200px', margin: '0 auto'
              }}>
                {filteredCandidates.map((candidate, index) => (
                  <motion.div
                    key={candidate.membershipId || candidate.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ y: -5 }}
                    style={{
                      background: '#1a1a1a', backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px',
                      overflow: 'hidden',
                      transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                      ...(debugMode && !candidate.isValid && {
                        border: '2px solid rgba(239, 68, 68, 0.5)',
                        background: 'rgba(239, 68, 68, 0.05)'
                      })
                    }}
                  >
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'flex-start', padding: '1.5rem 1.5rem 0'
                    }}>
                      <div style={{
                        position: 'relative', display: 'flex', flexDirection: 'column',
                        alignItems: 'center'
                      }}>
                        <motion.img 
                          src={candidate.avatar} 
                          alt={candidate.name}
                          onClick={() => handleAvatarClick(candidate)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          style={{
                            width: '64px', height: '64px', borderRadius: '50%',
                            objectFit: 'cover', border: '3px solid #ff6b35',
                            cursor: 'pointer', transition: 'all 0.3s ease'
                          }}
                        />
                        {candidate.verified && (
                          <div style={{
                            position: 'absolute', top: '-2px', right: '-2px',
                            width: '20px', height: '20px', background: '#3b82f6',
                            border: '2px solid #0a0a0a', borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            <Verified size={12} color="white" />
                          </div>
                        )}
                        
                        {/* ✅ INDICADOR DE DEBUG */}
                        {debugMode && candidate.issues && candidate.issues.length > 0 && (
                          <div style={{
                            position: 'absolute', bottom: '-10px', left: '50%',
                            transform: 'translateX(-50%)', fontSize: '0.6rem',
                            background: 'rgba(239, 68, 68, 0.9)', color: 'white',
                            padding: '2px 6px', borderRadius: '4px'
                          }}>
                            Issues: {candidate.issues.length}
                          </div>
                        )}
                      </div>
                      
                      <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem'
                      }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '0.25rem',
                          fontSize: '0.75rem', color: '#6B7280'
                        }}>
                          <Calendar size={12} />
                          {formatDate(candidate.applicationDate)}
                        </div>
                        
                        {/* ✅ INDICADORES DE ESTADO */}
                        {debugMode && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{
                              fontSize: '0.6rem', padding: '1px 4px', borderRadius: '3px',
                              background: candidate.hasActiveMembership ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                              color: candidate.hasActiveMembership ? '#ef4444' : '#22c55e'
                            }}>
                              {candidate.hasActiveMembership ? 'Has Active' : 'Available'}
                            </span>
                            <span style={{
                              fontSize: '0.6rem', padding: '1px 4px', borderRadius: '3px',
                              background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6'
                            }}>
                              {candidate.status}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                      <h3 style={{
                        fontSize: '1.125rem', fontWeight: '700', color: 'white',
                        margin: '0 0 0.25rem 0'
                      }}>
                        {candidate.name}, {candidate.age}
                      </h3>
                      <p style={{
                        fontSize: '0.875rem', color: '#9CA3AF',
                        margin: '0 0 1rem 0'
                      }}>
                        {candidate.location?.split(', ')[1] || candidate.location}
                      </p>
                      
                      <div style={{
                        fontSize: '0.875rem', color: '#D1D5DB', marginBottom: '1rem',
                        padding: '0.75rem', background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '8px', borderLeft: '3px solid #ff6b35',
                        lineHeight: '1.5', textAlign: 'left', maxHeight: '100px',
                        overflow: 'hidden', display: '-webkit-box',
                        WebkitLineClamp: '3', WebkitBoxOrient: 'vertical'
                      }}>
                        {candidate.description || 'Sin descripción disponible'}
                      </div>

                      {/* ✅ INFORMACIÓN DE DEBUG EXPANDIDA */}
                      {debugMode && (
                        <div style={{
                          background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)',
                          borderRadius: '6px', padding: '0.5rem', marginBottom: '1rem', textAlign: 'left'
                        }}>
                          <div style={{ fontSize: '0.7rem', color: '#3b82f6', fontWeight: '600', marginBottom: '0.25rem' }}>
                            Debug Info:
                          </div>
                          <div style={{ fontSize: '0.65rem', color: '#9CA3AF' }}>
                            <div>Membership: {candidate.membershipId}</div>
                            <div>Escort: {candidate.escortId}</div>
                            <div>Valid: {candidate.isValid ? 'Yes' : 'No'}</div>
                            {candidate.issues && candidate.issues.length > 0 && (
                              <div>Issues: {candidate.issues.join(', ')}</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div style={{
                      display: 'flex', gap: '0.5rem', padding: '1rem 1.5rem 1.5rem',
                      justifyContent: 'center'
                    }}>
                      <motion.button
                        onClick={() => setShowConfirmModal({ candidate, action: 'reject' })}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        disabled={loading.action}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          gap: '0.5rem', padding: '0.5rem 1rem',
                          border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px',
                          fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer',
                          transition: 'all 0.3s ease', flex: 1,
                          background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
                          opacity: loading.action ? 0.5 : 1
                        }}
                      >
                        <XCircle size={14} />
                        Rechazar
                      </motion.button>
                      
                      <motion.button
                        onClick={() => setShowConfirmModal({ candidate, action: 'approve' })}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        disabled={loading.action}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          gap: '0.5rem', padding: '0.5rem 1rem',
                          border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px',
                          fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer',
                          transition: 'all 0.3s ease', flex: 1,
                          background: 'rgba(16, 185, 129, 0.1)', color: '#10b981',
                          opacity: loading.action ? 0.5 : 1
                        }}
                      >
                        <CheckCircle size={14} />
                        Aprobar
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              /* Empty State */
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', textAlign: 'center', padding: '3rem',
                color: '#9CA3AF'
              }}>
                <UserPlus size={64} color="#6B7280" />
                <h3 style={{
                  fontSize: '1.25rem', fontWeight: '600', color: '#D1D5DB',
                  margin: '1rem 0 0.5rem'
                }}>
                  No hay solicitudes pendientes
                </h3>
                <p style={{ color: '#6B7280', maxWidth: '400px' }}>
                  Cuando recibas nuevas solicitudes para unirse a tu agencia, aparecerán aquí.
                </p>
                
                {/* ✅ MENSAJE DE DEBUG SI HAY CANDIDATOS FILTRADOS */}
                {debugMode && lastFetchInfo && lastFetchInfo.filteredOut > 0 && (
                  <div style={{
                    marginTop: '1rem', padding: '1rem', background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px',
                    color: '#f59e0b', fontSize: '0.875rem'
                  }}>
                    <strong>Debug:</strong> Se filtraron {lastFetchInfo.filteredOut} candidato(s) que ya están en otras agencias.
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modales */}
      <AnimatePresence>
        {showCandidateModal && (
          <CandidateModal 
            candidate={showCandidateModal} 
            onClose={() => setShowCandidateModal(null)} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showConfirmModal && (
          <ConfirmationModal
            candidate={showConfirmModal.candidate}
            action={showConfirmModal.action}
            onConfirm={() => {
              if (showConfirmModal.action === 'approve') {
                handleApproveCandidate(showConfirmModal.candidate);
              } else {
                handleRejectCandidate(showConfirmModal.candidate);
              }
            }}
            onCancel={() => setShowConfirmModal(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {notification && (
          <NotificationModal
            notification={notification}
            onClose={() => setNotification(null)}
          />
        )}
      </AnimatePresence>

      {/* ✅ MODAL DE DEBUG */}
      <DebugModal 
        isOpen={showDebugModal}
        onClose={() => setShowDebugModal(false)}
      />

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
        .agency-recruitment-page {
          min-height: 100vh;
          background: #000000;
          color: white;
          padding-top: 80px;
        }

        .spin {
          animation: spin 1s linear infinite;
        }
        
        .mini-spinner {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .agency-recruitment-page {
            padding-top: 70px;
          }
          
          .candidates-grid {
            grid-template-columns: 1fr !important;
            padding: 0 1rem !important;
            gap: 1rem !important;
          }
        }

        @media (max-width: 480px) {
          .agency-recruitment-page {
            padding-top: 60px;
          }
        }

        /* ✅ ESTILOS MEJORADOS PARA INDICADORES */
        .candidate-card:hover {
          transform: translateY(-8px) !important;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3) !important;
        }

        .candidate-card[data-priority="high"] {
          border-left: 4px solid #10b981 !important;
        }

        .candidate-card[data-verified="true"] {
          background: linear-gradient(135deg, #1a1a1a 0%, rgba(59, 130, 246, 0.05) 100%) !important;
        }

        .candidate-card[data-debug="invalid"] {
          border: 2px solid rgba(239, 68, 68, 0.5) !important;
          background: rgba(239, 68, 68, 0.05) !important;
        }

        .btn-approve:hover {
          background: linear-gradient(135deg, #059669, #047857) !important;
          transform: translateY(-2px) !important;
          box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3) !important;
        }

        .btn-reject:hover {
          background: rgba(239, 68, 68, 0.2) !important;
          transform: translateY(-2px) !important;
          box-shadow: 0 8px 20px rgba(239, 68, 68, 0.3) !important;
        }

        .notification-enter {
          opacity: 0;
          transform: scale(0.8) translateY(50px);
        }

        .notification-enter-active {
          opacity: 1;
          transform: scale(1) translateY(0);
          transition: all 0.3s ease;
        }

        .notification-exit {
          opacity: 1;
          transform: scale(1) translateY(0);
        }

        .notification-exit-active {
          opacity: 0;
          transform: scale(0.8) translateY(-50px);
          transition: all 0.3s ease;
        }

        /* ✅ ESTILOS PARA DEBUG MODE */
        .debug-mode .candidate-card {
          position: relative;
        }

        .debug-info {
          position: absolute;
          top: 5px;
          right: 5px;
          background: rgba(59, 130, 246, 0.9);
          color: white;
          font-size: 0.6rem;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 600;
        }

        .debug-invalid {
          background: rgba(239, 68, 68, 0.9) !important;
        }

        /* ✅ ANIMACIONES DE FILTRADO */
        .filtered-out {
          opacity: 0.3;
          transform: scale(0.95);
          transition: all 0.3s ease;
        }

        .validation-error {
          border: 2px solid #ef4444 !important;
          background: rgba(239, 68, 68, 0.1) !important;
        }

        .validation-success {
          border: 2px solid #10b981 !important;
          background: rgba(16, 185, 129, 0.1) !important;
        }

        /* ✅ RESPONSIVE IMPROVEMENTS */
        @media (max-width: 640px) {
          .debug-controls {
            flex-direction: column !important;
            gap: 0.5rem !important;
          }
          
          .debug-info {
            position: static !important;
            margin-top: 0.5rem !important;
          }
        }
      `}</style>
    </div>
  );
};

export default AgencyRecruitment;