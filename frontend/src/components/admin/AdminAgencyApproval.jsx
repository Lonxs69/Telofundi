import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle,
  XCircle,
  Mail,
  Building2,
  X,
  ZoomIn,
  Check,
  RefreshCw,
  Search,
  Calendar,
  MapPin,
  Phone,
  Globe,
  AlertTriangle,
  Eye,
  Clock,
  FileText
} from 'lucide-react';
import { adminAPI } from '../../utils/api';
import './AdminAgencyApproval.css';

const AdminAgencyApproval = () => {
  // ✅ ESTADOS REALES CONECTADOS AL BACKEND (SIN CAMBIOS)
  const [pendingAgencies, setPendingAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: null,
    agency: null,
    reason: ''
  });

  // ✅ FUNCIONES ORIGINALES SIN CAMBIOS
  const loadPendingAgencies = async (page = 1, search = '') => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await adminAPI.getPendingAgencies({
        page,
        limit: 10,
        ...(search && { search })
      });
      
      if (response.success) {
        const formattedAgencies = (response.data.agencies || []).map(agency => ({
          requestId: agency.requestId,
          userId: agency.userId,
          fullName: agency.fullName || agency.userData?.firstName || 'Sin nombre',
          documentNumber: agency.documentNumber,
          businessEmail: agency.businessEmail || agency.userData?.email,
          businessPhone: agency.businessPhone || agency.userData?.phone,
          documentFrontImage: agency.documentFrontImage,
          documentBackImage: agency.documentBackImage,
          status: agency.status,
          submittedAt: agency.submittedAt,
          reviewNotes: agency.reviewNotes,
          rejectionReason: agency.rejectionReason,
          userData: agency.userData
        }));
        
        setPendingAgencies(formattedAgencies);
        setCurrentPage(response.data.pagination?.page || 1);
        setTotalPages(response.data.pagination?.pages || 1);
        setTotalCount(response.data.pagination?.total || 0);
      } else {
        throw new Error(response.message || 'Error cargando agencias');
      }
    } catch (error) {
      setError(error.message || 'Error cargando las agencias pendientes');
      setPendingAgencies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingAgencies(1, searchTerm);
  }, []);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (currentPage === 1) {
        loadPendingAgencies(1, searchTerm);
      } else {
        setCurrentPage(1);
        loadPendingAgencies(1, searchTerm);
      }
    }, 500);
    return () => clearTimeout(delayedSearch);
  }, [searchTerm]);

  useEffect(() => {
    if (currentPage > 1) {
      loadPendingAgencies(currentPage, searchTerm);
    }
  }, [currentPage]);

  const handleImageClick = (imageUrl, imageName) => {
    setSelectedImage({ url: imageUrl, name: imageName });
  };

  const openConfirmModal = (type, agency) => {
    setConfirmModal({ isOpen: true, type, agency, reason: '' });
  };

  const closeConfirmModal = () => {
    setConfirmModal({ isOpen: false, type: null, agency: null, reason: '' });
  };

  const handleApproveAgency = async (agency) => {
    const actionId = `approve-${agency.requestId}`;
    setActionLoading(actionId);
    
    try {
      const response = await adminAPI.approveAgency(agency.requestId, {
        notes: confirmModal.reason || 'Agencia aprobada por administrador'
      });
      
      if (response.success) {
        setPendingAgencies(prev => prev.filter(a => a.requestId !== agency.requestId));
        setTotalCount(prev => Math.max(0, prev - 1));
        showNotification('success', `Agencia "${agency.fullName}" aprobada exitosamente`);
      } else {
        throw new Error(response.message || 'Error aprobando agencia');
      }
    } catch (error) {
      showNotification('error', error.message || 'Error aprobando la agencia');
    } finally {
      setActionLoading(null);
      closeConfirmModal();
    }
  };

  const handleRejectAgency = async (agency, reason) => {
    if (!reason?.trim()) {
      showNotification('error', 'Debes proporcionar un motivo para el rechazo');
      return;
    }
    
    const actionId = `reject-${agency.requestId}`;
    setActionLoading(actionId);
    
    try {
      const response = await adminAPI.rejectAgency(agency.requestId, {
        reason: reason.trim(),
        notes: 'Rechazado por administrador'
      });
      
      if (response.success) {
        setPendingAgencies(prev => prev.filter(a => a.requestId !== agency.requestId));
        setTotalCount(prev => Math.max(0, prev - 1));
        showNotification('success', `Agencia "${agency.fullName}" rechazada`);
      } else {
        throw new Error(response.message || 'Error rechazando agencia');
      }
    } catch (error) {
      showNotification('error', error.message || 'Error rechazando la agencia');
    } finally {
      setActionLoading(null);
      closeConfirmModal();
    }
  };

  const executeAction = () => {
    if (!confirmModal.agency) return;
    
    if (confirmModal.type === 'approve') {
      handleApproveAgency(confirmModal.agency);
    } else if (confirmModal.type === 'reject') {
      if (!confirmModal.reason?.trim()) {
        showNotification('error', 'Debes proporcionar un motivo para el rechazo');
        return;
      }
      handleRejectAgency(confirmModal.agency, confirmModal.reason);
    }
  };

  const [notification, setNotification] = useState(null);
  
  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Intl.DateTimeFormat('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(dateString));
    } catch {
      return 'Fecha inválida';
    }
  };

  // Estados de carga y error simplificados
  if (loading && pendingAgencies.length === 0) {
    return (
      <div className="admin-agency-approval-dark">
        <div className="loading-container-dark">
          <RefreshCw className="loading-spinner" size={32} />
          <p>Cargando solicitudes de agencias...</p>
        </div>
      </div>
    );
  }

  if (error && pendingAgencies.length === 0) {
    return (
      <div className="admin-agency-approval-dark">
        <div className="error-container-dark">
          <AlertTriangle size={48} color="#ef4444" />
          <h3>Error cargando solicitudes</h3>
          <p>{error}</p>
          <button onClick={() => loadPendingAgencies(1, searchTerm)} className="retry-button-dark">
            <RefreshCw size={16} />
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-agency-approval-dark">
      {/* Notificaciones */}
      <AnimatePresence>
        {notification && (
          <motion.div
            className={`notification-dark ${notification.type}`}
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.3 }}
          >
            {notification.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header mejorado */}
      <div className="header-dark">
        <div className="header-content-dark">
          <div className="header-main-dark">
            <div className="header-icon-dark">
              <Building2 size={32} />
            </div>
            <div className="header-text-dark">
              <h1>Solicitudes de Agencias</h1>
              <p>Gestiona las solicitudes para unirse a TELOFUNDI</p>
            </div>
          </div>
          <div className="header-stats-dark">
            <div className="stat-card-dark">
              <Clock size={16} />
              <div>
                <span className="stat-number">{totalCount}</span>
                <span className="stat-label">Pendientes</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controles de búsqueda */}
      <div className="controls-dark">
        <div className="search-container-dark">
          <Search size={20} />
          <input
            type="text"
            placeholder="Buscar por nombre, email o empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input-dark"
          />
        </div>
        <button 
          onClick={() => loadPendingAgencies(currentPage, searchTerm)}
          className="refresh-button-dark"
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'spinning' : ''} />
          Actualizar
        </button>
      </div>

      {/* Lista de solicitudes mejorada */}
      <div className="requests-container-dark">
        {pendingAgencies.length === 0 ? (
          <div className="empty-state-dark">
            <Building2 size={64} />
            <h3>No hay solicitudes pendientes</h3>
            <p>
              {searchTerm 
                ? 'No se encontraron solicitudes que coincidan con tu búsqueda'
                : 'Todas las solicitudes han sido procesadas'
              }
            </p>
          </div>
        ) : (
          pendingAgencies.map((agency, index) => (
            <motion.div
              key={agency.requestId}
              className="request-card-dark"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              {/* Header de la tarjeta */}
              <div className="card-header-dark">
                <div className="agency-info-dark">
                  <div className="agency-avatar-dark">
                    <Building2 size={24} />
                  </div>
                  <div className="agency-details-dark">
                    <h3>{agency.fullName}</h3>
                    <p><Mail size={14} />{agency.businessEmail}</p>
                    <span><Building2 size={12} />{agency.userData?.agency?.companyName || 'No especificada'}</span>
                  </div>
                </div>
                <div className="time-info-dark">
                  <span className="status-badge-dark">Pendiente</span>
                  <span className="date-dark">{formatDate(agency.submittedAt)}</span>
                </div>
              </div>

              {/* Información adicional */}
              <div className="info-grid-dark">
                {agency.businessPhone && (
                  <div className="info-item-dark">
                    <Phone size={14} />
                    <span>{agency.businessPhone}</span>
                  </div>
                )}
                {agency.userData?.website && (
                  <div className="info-item-dark">
                    <Globe size={14} />
                    <span>{agency.userData.website}</span>
                  </div>
                )}
                {agency.userData?.location && (
                  <div className="info-item-dark">
                    <MapPin size={14} />
                    <span>{agency.userData.location.city}, {agency.userData.location.country}</span>
                  </div>
                )}
                {agency.documentNumber && (
                  <div className="info-item-dark">
                    <FileText size={14} />
                    <span>Doc: {agency.documentNumber}</span>
                  </div>
                )}
              </div>

              {/* Documentos */}
              <div className="documents-section-dark">
                <h4>Documentos de Identificación</h4>
                <div className="documents-grid-dark">
                  {agency.documentFrontImage && (
                    <div className="document-card-dark">
                      <div className="document-preview-dark">
                        <img src={agency.documentFrontImage} alt="Cédula Frontal" />
                        <div className="document-overlay-dark">
                          <button
                            className="zoom-button-dark"
                            onClick={() => handleImageClick(agency.documentFrontImage, 'Cédula Frontal')}
                          >
                            <ZoomIn size={16} />
                          </button>
                        </div>
                      </div>
                      <div className="document-info-dark">
                        <span>Frontal</span>
                        <div className="status-verified"><Eye size={10} />Subida</div>
                      </div>
                    </div>
                  )}

                  {agency.documentBackImage && (
                    <div className="document-card-dark">
                      <div className="document-preview-dark">
                        <img src={agency.documentBackImage} alt="Cédula Posterior" />
                        <div className="document-overlay-dark">
                          <button
                            className="zoom-button-dark"
                            onClick={() => handleImageClick(agency.documentBackImage, 'Cédula Posterior')}
                          >
                            <ZoomIn size={16} />
                          </button>
                        </div>
                      </div>
                      <div className="document-info-dark">
                        <span>Posterior</span>
                        <div className="status-verified"><Eye size={10} />Subida</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Botones de acción */}
              <div className="action-buttons-dark">
                <button
                  className="approve-button-dark"
                  onClick={() => openConfirmModal('approve', agency)}
                  disabled={actionLoading === `approve-${agency.requestId}` || actionLoading === `reject-${agency.requestId}`}
                >
                  {actionLoading === `approve-${agency.requestId}` ? (
                    <div className="loading-spinner-small" />
                  ) : (
                    <CheckCircle size={18} />
                  )}
                  {actionLoading === `approve-${agency.requestId}` ? 'Aprobando...' : 'Aprobar'}
                </button>

                <button
                  className="reject-button-dark"
                  onClick={() => openConfirmModal('reject', agency)}
                  disabled={actionLoading === `approve-${agency.requestId}` || actionLoading === `reject-${agency.requestId}`}
                >
                  {actionLoading === `reject-${agency.requestId}` ? (
                    <div className="loading-spinner-small" />
                  ) : (
                    <XCircle size={18} />
                  )}
                  {actionLoading === `reject-${agency.requestId}` ? 'Rechazando...' : 'Rechazar'}
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="pagination-dark">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1 || loading}
            className="pagination-button-dark"
          >
            Anterior
          </button>
          <span className="pagination-info-dark">
            Página {currentPage} de {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages || loading}
            className="pagination-button-dark"
          >
            Siguiente
          </button>
        </div>
      )}

      {/* Modal de confirmación CENTRADO */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <motion.div
            className="modal-overlay-centered"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeConfirmModal}
          >
            <motion.div
              className="confirm-modal-dark"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header-dark">
                <h3>{confirmModal.type === 'approve' ? 'Aprobar Agencia' : 'Rechazar Agencia'}</h3>
                <button onClick={closeConfirmModal} className="close-button-dark">
                  <X size={20} />
                </button>
              </div>
              
              <div className="modal-content-dark">
                <p>
                  ¿Estás seguro de que quieres{' '}
                  <strong>{confirmModal.type === 'approve' ? 'aprobar' : 'rechazar'}</strong>{' '}
                  la solicitud de <strong>{confirmModal.agency?.fullName}</strong>?
                </p>
                
                {confirmModal.type === 'reject' && (
                  <div className="reason-input-dark">
                    <label>Motivo del rechazo *</label>
                    <textarea
                      value={confirmModal.reason}
                      onChange={(e) => setConfirmModal(prev => ({ ...prev, reason: e.target.value }))}
                      placeholder="Explica por qué se rechaza la solicitud..."
                      rows={4}
                      required
                    />
                  </div>
                )}
                
                {confirmModal.type === 'approve' && (
                  <textarea
                    value={confirmModal.reason}
                    onChange={(e) => setConfirmModal(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="Notas adicionales (opcional)..."
                    rows={3}
                  />
                )}
              </div>
              
              <div className="modal-actions-dark">
                <button onClick={closeConfirmModal} className="cancel-button-dark">
                  Cancelar
                </button>
                <button
                  onClick={executeAction}
                  className={confirmModal.type === 'approve' ? 'approve-button-dark' : 'reject-button-dark'}
                  disabled={confirmModal.type === 'reject' && !confirmModal.reason?.trim()}
                >
                  {confirmModal.type === 'approve' ? (
                    <><CheckCircle size={16} />Aprobar</>
                  ) : (
                    <><XCircle size={16} />Rechazar</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de imagen CENTRADO */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            className="image-modal-overlay-centered"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
          >
            <motion.div
              className="image-modal-dark"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="image-modal-header-dark">
                <h3>{selectedImage.name}</h3>
                <button onClick={() => setSelectedImage(null)} className="close-button-dark">
                  <X size={20} />
                </button>
              </div>
              <div className="image-modal-content-dark">
                <img src={selectedImage.url} alt={selectedImage.name} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CSS conciso y oscuro */}
      <style jsx>{`
        .admin-agency-approval-dark {
          width: 100%;
          min-height: 100vh;
          background: #0a0a0a;
          color: #ffffff;
          padding: 80px 20px 100px;
          box-sizing: border-box;
        }

        .loading-container-dark, .error-container-dark {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          text-align: center;
        }

        .retry-button-dark {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #dc2626;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          margin-top: 16px;
        }

        .notification-dark {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 100000;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
        }

        .notification-dark.success { border-color: #16a34a; color: #16a34a; }
        .notification-dark.error { border-color: #dc2626; color: #dc2626; }

        .header-dark {
          margin-bottom: 30px;
        }

        .header-content-dark {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
        }

        .header-main-dark {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .header-icon-dark {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .header-text-dark h1 {
          font-size: 28px;
          font-weight: 700;
          margin: 0 0 4px 0;
        }

        .header-text-dark p {
          font-size: 16px;
          color: #9ca3af;
          margin: 0;
        }

        .header-stats-dark {
          display: flex;
          gap: 12px;
        }

        .stat-card-dark {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .stat-card-dark .stat-number {
          font-size: 20px;
          font-weight: 700;
          display: block;
        }

        .stat-card-dark .stat-label {
          font-size: 12px;
          color: #9ca3af;
          display: block;
        }

        .controls-dark {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 30px;
          flex-wrap: wrap;
        }

        .search-container-dark {
          flex: 1;
          min-width: 300px;
          display: flex;
          align-items: center;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 0 16px;
        }

        .search-container-dark svg {
          color: #9ca3af;
          margin-right: 12px;
        }

        .search-input-dark {
          flex: 1;
          border: none;
          outline: none;
          padding: 14px 0;
          font-size: 14px;
          color: white;
          background: transparent;
        }

        .search-input-dark::placeholder {
          color: #6b7280;
        }

        .refresh-button-dark {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .refresh-button-dark:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.15);
        }

        .requests-container-dark {
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-bottom: 40px;
        }

        .empty-state-dark {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 300px;
          text-align: center;
          color: #9ca3af;
        }

        .request-card-dark {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 24px;
          transition: all 0.3s ease;
        }

        .request-card-dark:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .card-header-dark {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }

        .agency-info-dark {
          display: flex;
          gap: 12px;
          flex: 1;
        }

        .agency-avatar-dark {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #9ca3af;
        }

        .agency-details-dark h3 {
          font-size: 18px;
          font-weight: 600;
          margin: 0 0 4px 0;
        }

        .agency-details-dark p {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          color: #9ca3af;
          margin: 0 0 8px 0;
        }

        .agency-details-dark span {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: #6b7280;
        }

        .time-info-dark {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
        }

        .status-badge-dark {
          font-size: 12px;
          background: #f59e0b;
          color: #000;
          padding: 4px 8px;
          border-radius: 6px;
          font-weight: 500;
        }

        .date-dark {
          font-size: 11px;
          color: #6b7280;
        }

        .info-grid-dark {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
          margin-bottom: 20px;
        }

        .info-item-dark {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          font-size: 13px;
        }

        .info-item-dark svg {
          color: #9ca3af;
        }

        .documents-section-dark {
          margin-bottom: 24px;
        }

        .documents-section-dark h4 {
          font-size: 14px;
          font-weight: 600;
          margin: 0 0 16px 0;
          color: #e5e7eb;
        }

        .documents-grid-dark {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .document-card-dark {
          border-radius: 12px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .document-preview-dark {
          position: relative;
          aspect-ratio: 1.6;
          overflow: hidden;
        }

        .document-preview-dark img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .document-overlay-dark {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .document-card-dark:hover .document-overlay-dark {
          opacity: 1;
        }

        .zoom-button-dark {
          background: white;
          border: none;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #000;
          cursor: pointer;
        }

        .document-info-dark {
          padding: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .document-info-dark span {
          font-size: 13px;
          font-weight: 500;
        }

        .status-verified {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: #16a34a;
        }

        .action-buttons-dark {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .approve-button-dark,
        .reject-button-dark {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: none;
          border-radius: 8px;
          padding: 14px 20px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .approve-button-dark {
          background: #16a34a;
          color: white;
        }

        .reject-button-dark {
          background: #dc2626;
          color: white;
        }

        .approve-button-dark:hover:not(:disabled) {
          background: #15803d;
        }

        .reject-button-dark:hover:not(:disabled) {
          background: #b91c1c;
        }

        .approve-button-dark:disabled,
        .reject-button-dark:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .loading-spinner-small {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .pagination-dark {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 20px;
          padding: 20px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .pagination-button-dark {
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .pagination-button-dark:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.15);
        }

        .pagination-button-dark:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .pagination-info-dark {
          color: #9ca3af;
          font-weight: 500;
        }

        /* MODALES CENTRADOS */
        .modal-overlay-centered,
        .image-modal-overlay-centered {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(5px);
          z-index: 100000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .confirm-modal-dark,
        .image-modal-dark {
          background: #1a1a1a;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 16px;
          max-width: 500px;
          width: 100%;
          max-height: 90vh;
          overflow: auto;
        }

        .image-modal-dark {
          max-width: 800px;
        }

        .modal-header-dark {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .image-modal-header-dark {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .modal-header-dark h3 {
          font-size: 18px;
          font-weight: 600;
          margin: 0;
        }

        .close-button-dark {
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: color 0.2s ease;
        }

        .close-button-dark:hover {
          color: white;
        }

        .modal-content-dark {
          padding: 20px 24px;
        }

        .image-modal-content-dark {
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          max-height: 70vh;
        }

        .image-modal-content-dark img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .reason-input-dark {
          margin-top: 16px;
        }

        .reason-input-dark label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 8px;
        }

        .reason-input-dark textarea,
        .modal-content-dark textarea {
          width: 100%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          padding: 12px;
          color: white;
          font-family: inherit;
          resize: vertical;
        }

        .reason-input-dark textarea::placeholder,
        .modal-content-dark textarea::placeholder {
          color: #6b7280;
        }

        .modal-actions-dark {
          display: flex;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .cancel-button-dark {
          flex: 1;
          padding: 10px 20px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .cancel-button-dark:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        .modal-actions-dark .approve-button-dark,
        .modal-actions-dark .reject-button-dark {
          flex: 1;
          padding: 10px 20px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .admin-agency-approval-dark {
            padding: 70px 16px 90px;
          }

          .header-content-dark {
            flex-direction: column;
            align-items: flex-start;
          }

          .controls-dark {
            flex-direction: column;
          }

          .search-container-dark {
            min-width: auto;
            width: 100%;
          }

          .documents-grid-dark {
            grid-template-columns: 1fr;
          }

          .action-buttons-dark {
            grid-template-columns: 1fr;
          }

          .confirm-modal-dark,
          .image-modal-dark {
            margin: 16px;
            max-width: calc(100vw - 32px);
          }

          .modal-actions-dark {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminAgencyApproval;