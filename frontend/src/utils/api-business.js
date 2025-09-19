/**
 * ====================================================================
 * 🏢 API-BUSINESS.JS - AGENCY & PAYMENTS APIS
 * ====================================================================
 * 
 * Versión: 1.0.2 - CORREGIDO PARA PUNTOS Y PREMIUM + POINTS API
 * Descripción: Módulo especializado para funciones de negocio (agencias y pagos)
 * 
 * INCLUYE:
 * - Agency API (search, membership, verification, stats, etc.)
 * - Payment API (boost, verification, points, premium, history, etc.)
 * - Points API (balance, packages, actions, daily login, etc.) ✅ NUEVO
 * - System API (status, metrics, info)
 * 
 * ====================================================================
 */

// Importar la configuración base
import { API_CONFIG } from './api.js';

/**
 * ====================================================================
 * 🎯 POINTS API - NUEVA SECCIÓN COMPLETA
 * ====================================================================
 */
export const pointsAPI = {
  // ✅ OBTENER BALANCE Y ESTADÍSTICAS
  getBalance: () => {
    console.log('🎯 === GET POINTS BALANCE API CALL ===');
    return apiRequest('/points/balance', {
      method: 'GET'
    });
  },

  // ✅ OBTENER HISTORIAL DE PUNTOS
  getHistory: (params = {}) => {
    console.log('🎯 === GET POINTS HISTORY API CALL ===');
    console.log('🎯 Params:', params);
    
    const searchParams = {
      page: params.page || 1,
      limit: params.limit || 20,
      ...(params.type && { type: params.type })
    };
    
    return apiRequest('/points/history', {
      method: 'GET',
      params: searchParams
    });
  },

  // ✅ OBTENER PAQUETES DISPONIBLES
  getPackages: () => {
    console.log('🎯 === GET POINTS PACKAGES API CALL ===');
    return apiRequest('/points/packages', {
      method: 'GET'
    });
  },

  // ✅ OBTENER ACCIONES DISPONIBLES
  getActions: () => {
    console.log('🎯 === GET POINTS ACTIONS API CALL ===');
    return apiRequest('/points/actions', {
      method: 'GET'
    });
  },

  // ✅ ESTADO DEL LOGIN DIARIO
  getDailyStatus: () => {
    console.log('🎯 === GET DAILY LOGIN STATUS API CALL ===');
    return apiRequest('/points/daily-status', {
      method: 'GET'
    });
  },

  // ✅ RECLAMAR PUNTOS DIARIOS
  claimDaily: () => {
    console.log('🎯 === CLAIM DAILY POINTS API CALL ===');
    return apiRequest('/points/daily-login', {
      method: 'POST'
    });
  },

  // ✅ OBTENER INFORMACIÓN DE RACHA
  getStreak: () => {
    console.log('🎯 === GET STREAK INFO API CALL ===');
    return apiRequest('/points/streak', {
      method: 'GET'
    });
  },

  // ✅ USAR PUNTOS PARA ACCIÓN
  spendPoints: (action, targetData = {}) => {
    console.log('🎯 === SPEND POINTS API CALL ===');
    console.log('🎯 Action:', action);
    console.log('🎯 Target Data:', targetData);
    
    return apiRequest('/points/spend', {
      method: 'POST',
      body: JSON.stringify({
        action,
        targetData
      })
    });
  },

  // ✅ ACTIVAR PREMIUM CON PUNTOS
  activatePremium: (tier, duration = 24) => {
    console.log('🎯 === ACTIVATE PREMIUM WITH POINTS API CALL ===');
    console.log('🎯 Tier:', tier);
    console.log('🎯 Duration:', duration);
    
    return apiRequest('/points/premium', {
      method: 'POST',
      body: JSON.stringify({
        tier,
        duration
      })
    });
  },

  // ✅ OBTENER CONFIGURACIÓN DEL SISTEMA
  getConfig: () => {
    console.log('🎯 === GET POINTS CONFIG API CALL ===');
    return apiRequest('/points/config', {
      method: 'GET'
    });
  },

  // ✅ COMPRAR PUNTOS (crear intención)
  createPurchaseIntent: (packageId) => {
    console.log('🎯 === CREATE POINTS PURCHASE INTENT API CALL ===');
    console.log('🎯 Package ID:', packageId);
    
    return apiRequest('/points/purchase', {
      method: 'POST',
      body: JSON.stringify({
        packageId
      })
    });
  },

  // ✅ CONFIRMAR COMPRA DE PUNTOS
  confirmPurchase: (paymentId) => {
    console.log('🎯 === CONFIRM POINTS PURCHASE API CALL ===');
    console.log('🎯 Payment ID:', paymentId);
    
    return apiRequest(`/points/purchase/${paymentId}`, {
      method: 'PUT'
    });
  },

  // ✅ HISTORIAL DE COMPRAS
  getPurchaseHistory: (params = {}) => {
    console.log('🎯 === GET PURCHASE HISTORY API CALL ===');
    console.log('🎯 Params:', params);
    
    const searchParams = {
      page: params.page || 1,
      limit: params.limit || 20,
      ...(params.status && { status: params.status })
    };
    
    return apiRequest('/points/purchase-history', {
      method: 'GET',
      params: searchParams
    });
  }
};

/**
 * ====================================================================
 * 🏢 AGENCY API
 * ====================================================================
 */
export const agencyAPI = {
  // ✅ BÚSQUEDA DE AGENCIAS (PÚBLICO)
  searchAgencies: (params = {}) => {
    console.log('🔍 === AGENCY SEARCH API CALL ===');
    console.log('🔍 Input params:', params);
    
    const searchParams = {
      page: params.page || 1,
      limit: params.limit || 20,
      ...(params.q && { q: params.q }),
      ...(params.location && { location: params.location }),
      ...(params.verified !== undefined && { verified: params.verified }),
      ...(params.minEscorts && { minEscorts: params.minEscorts }),
      sortBy: params.sortBy || 'relevance'
    };
    
    console.log('📤 Final search params:', searchParams);
    console.log('📤 URL will be: /agency/search?' + new URLSearchParams(searchParams).toString());
    
    return apiRequest('/agency/search', {
      method: 'GET',
      params: searchParams
    });
  },

  // ✅ PRICING DE VERIFICACIÓN
  getVerificationPricing: () => {
    console.log('💰 === GET VERIFICATION PRICING API CALL ===');
    console.log('📤 URL: /agency/verification/pricing');
    
    return apiRequest('/agency/verification/pricing', {
      method: 'GET'
    });
  },

  // ✅ GESTIÓN DE ESCORTS (AGENCIA)
  getAgencyEscorts: (params = {}) => {
    console.log('🔍 === GET AGENCY ESCORTS API CALL ===');
    console.log('🔍 Input params:', params);
    console.log('🔍 Status filter:', params.status);
    
    const searchParams = {
      page: params.page || 1,
      limit: params.limit || 20,
      ...(params.status && { status: params.status }),
      ...(params.search && { search: params.search })
    };
    
    console.log('📤 Final search params:', searchParams);
    console.log('📤 URL will be: /agency/escorts?' + new URLSearchParams(searchParams).toString());
    
    // ✅ DEBUGGING ESPECÍFICO PARA STATUS PENDING
    if (params.status === 'pending') {
      console.log('🚨 === PENDING REQUESTS DEBUG ===');
      console.log('🚨 This should fetch AgencyMembership records with status PENDING');
      console.log('🚨 Backend should format them as candidates for AgencyRecruitment');
      console.log('🚨 === END PENDING DEBUG ===');
    }
    
    return apiRequest('/agency/escorts', {
      method: 'GET',
      params: searchParams
    });
  },

  inviteEscort: (escortId, invitationData) => {
    console.log('📧 === INVITE ESCORT API CALL ===');
    console.log('📧 Escort ID:', escortId);
    console.log('📧 Invitation Data:', invitationData);
    
    if (!escortId) {
      throw new Error('ID de escort es requerido');
    }
    
    const requestData = {
      message: invitationData.message || '',
      proposedCommission: invitationData.proposedCommission || 0.1,
      proposedRole: invitationData.proposedRole || 'MEMBER',
      proposedBenefits: invitationData.proposedBenefits || {}
    };
    
    return apiRequest(`/agency/escorts/${escortId}/invite`, {
      method: 'POST',
      body: JSON.stringify(requestData)
    });
  },

  verifyEscort: (escortId, verificationData) => {
    console.log('🔍 === VERIFY ESCORT API CALL ===');
    console.log('🔍 Escort ID:', escortId);
    console.log('🔍 Verification Data:', verificationData);
    
    if (!escortId) {
      console.error('❌ escortId is required but not provided');
      throw new Error('ID de escort es requerido');
    }
    
    if (!verificationData.pricingId) {
      console.error('❌ pricingId is required but not provided');
      throw new Error('ID de pricing es requerido');
    }
    
    const url = `/agency/escorts/${escortId}/verify`;
    console.log('📤 URL:', url);
    console.log('📤 Method: POST');
    console.log('📤 Request data:', {
      pricingId: verificationData.pricingId,
      verificationNotes: verificationData.verificationNotes
    });
    
    return apiRequest(url, {
      method: 'POST',
      body: JSON.stringify(verificationData)
    });
  },

  // ✅ GESTIÓN DE MEMBRESÍAS
  manageMembershipRequest: (membershipId, requestData) => {
    console.log('📤 === MANAGE MEMBERSHIP REQUEST API CALL ===');
    console.log('📤 Membership ID:', membershipId);
    console.log('📤 Request Data:', requestData);
    
    if (!membershipId) {
      console.error('❌ membershipId is required but not provided');
      throw new Error('ID de membresía es requerido');
    }
    
    if (!requestData.action || !['approve', 'reject'].includes(requestData.action)) {
      console.error('❌ Invalid action:', requestData.action);
      throw new Error('Acción debe ser "approve" o "reject"');
    }
    
    const url = `/agency/memberships/${membershipId}/manage`;
    console.log('📤 URL:', url);
    console.log('📤 Method: PUT');
    console.log('📤 Full request data:', {
      action: requestData.action,
      message: requestData.message,
      commissionRate: requestData.commissionRate
    });
    
    return apiRequest(url, {
      method: 'PUT',
      body: JSON.stringify(requestData)
    });
  },

  // ===================================================================
  // ✅ FUNCIONES PARA ESCORTS
  // ===================================================================

  // ✅ SOLICITAR UNIRSE A AGENCIA (ESCORT)
  requestToJoinAgency: (agencyUserId, message = '') => {
    console.log('📤 === REQUEST TO JOIN AGENCY API CALL ===');
    console.log('📤 Agency User ID:', agencyUserId);
    console.log('📤 Message:', message);
    
    if (!agencyUserId) {
      console.error('❌ agencyUserId is required but not provided');
      throw new Error('ID de agencia es requerido');
    }
    
    const url = `/agency/${agencyUserId}/join`;
    const requestData = {
      message: message.trim()
    };
    
    console.log('📤 URL:', url);
    console.log('📤 Method: POST');
    console.log('📤 Request data:', requestData);
    
    return apiRequest(url, {
      method: 'POST',
      body: JSON.stringify(requestData)
    });
  },

  // ✅ CANCELAR SOLICITUD PROPIA (ESCORT) - NUEVA FUNCIÓN
  cancelOwnRequest: (membershipId, reason = '') => {
    console.log('🚫 === CANCEL OWN REQUEST API CALL ===');
    console.log('🚫 Membership ID:', membershipId);
    console.log('🚫 Reason:', reason);
    
    if (!membershipId) {
      console.error('❌ membershipId is required but not provided');
      throw new Error('ID de membresía es requerido');
    }
    
    const url = `/agency/escort/requests/${membershipId}/cancel`;
    const requestData = {
      reason: reason.trim()
    };
    
    console.log('📤 URL:', url);
    console.log('📤 Method: DELETE');
    console.log('📤 Request data:', requestData);
    
    return apiRequest(url, {
      method: 'DELETE',
      body: JSON.stringify(requestData)
    });
  },

  // ✅ OBTENER INVITACIONES (ESCORT)
  getEscortInvitations: (params = {}) => {
    console.log('🔍 === GET ESCORT INVITATIONS API CALL ===');
    console.log('🔍 Input params:', params);
    
    const searchParams = {
      page: params.page || 1,
      limit: params.limit || 20,
      status: params.status || 'PENDING'
    };
    
    console.log('📤 Final search params:', searchParams);
    console.log('📤 URL will be: /agency/escort/invitations?' + new URLSearchParams(searchParams).toString());
    
    return apiRequest('/agency/escort/invitations', {
      method: 'GET',
      params: searchParams
    });
  },

  // ✅ OBTENER ESTADO DE MEMBRESÍA (ESCORT)
  getEscortMembershipStatus: () => {
    console.log('🔍 === GET ESCORT MEMBERSHIP STATUS API CALL ===');
    console.log('📤 URL: /agency/escort/membership/status');
    
    return apiRequest('/agency/escort/membership/status', {
      method: 'GET'
    });
  },

  // ✅ SALIR DE AGENCIA ACTUAL (ESCORT)
  leaveCurrentAgency: (reason = '') => {
    console.log('📤 === LEAVE CURRENT AGENCY API CALL ===');
    console.log('📤 Reason:', reason);
    
    const requestData = {
      reason: reason.trim()
    };
    
    console.log('📤 URL: /agency/escort/membership/leave');
    console.log('📤 Method: POST');
    console.log('📤 Request data:', requestData);
    
    return apiRequest('/agency/escort/membership/leave', {
      method: 'POST',
      body: JSON.stringify(requestData)
    });
  },

  // ✅ RESPONDER A INVITACIÓN (ESCORT)
  respondToInvitation: (invitationId, action, message = '') => {
    console.log('📤 === RESPOND TO INVITATION API CALL ===');
    console.log('📤 Invitation ID:', invitationId);
    console.log('📤 Action:', action);
    console.log('📤 Message:', message);
    
    if (!invitationId) {
      console.error('❌ invitationId is required but not provided');
      throw new Error('ID de invitación es requerido');
    }
    
    if (!['accept', 'reject'].includes(action)) {
      console.error('❌ Invalid action:', action);
      throw new Error('Acción debe ser "accept" o "reject"');
    }
    
    const url = `/agency/invitations/${invitationId}/respond`;
    const requestData = {
      action,
      message: message.trim()
    };
    
    console.log('📤 URL:', url);
    console.log('📤 Method: PUT');
    console.log('📤 Request data:', requestData);
    
    return apiRequest(url, {
      method: 'PUT',
      body: JSON.stringify(requestData)
    });
  },

  // ===================================================================
  // ✅ FUNCIONES PARA AGENCIAS
  // ===================================================================

  // ✅ ESTADÍSTICAS DE AGENCIA
  getAgencyStats: () => {
    console.log('📊 === GET AGENCY STATS API CALL ===');
    console.log('📤 URL: /agency/stats');
    
    return apiRequest('/agency/stats', {
      method: 'GET'
    });
  },

  // ✅ OBTENER VERIFICACIONES PRÓXIMAS A EXPIRAR
  getExpiringVerifications: (params = {}) => {
    console.log('⏰ === GET EXPIRING VERIFICATIONS API CALL ===');
    console.log('⏰ Input params:', params);
    
    const searchParams = {
      page: params.page || 1,
      limit: params.limit || 20
    };
    
    console.log('📤 Final search params:', searchParams);
    console.log('📤 URL will be: /agency/verifications/expiring?' + new URLSearchParams(searchParams).toString());
    
    return apiRequest('/agency/verifications/expiring', {
      method: 'GET',
      params: searchParams
    });
  },

  // ✅ RENOVAR VERIFICACIÓN DE ESCORT
  renewEscortVerification: (escortId, pricingId) => {
    console.log('🔄 === RENEW ESCORT VERIFICATION API CALL ===');
    console.log('🔄 Escort ID:', escortId);
    console.log('🔄 Pricing ID:', pricingId);
    
    if (!escortId) {
      console.error('❌ escortId is required but not provided');
      throw new Error('ID de escort es requerido');
    }
    
    if (!pricingId) {
      console.error('❌ pricingId is required but not provided');
      throw new Error('ID de pricing es requerido');
    }
    
    const url = `/agency/escorts/${escortId}/verify/renew`;
    const requestData = {
      pricingId
    };
    
    console.log('📤 URL:', url);
    console.log('📤 Method: POST');
    console.log('📤 Request data:', requestData);
    
    return apiRequest(url, {
      method: 'POST',
      body: JSON.stringify(requestData)
    });
  },

  // ===================================================================
  // ✅ FUNCIONES ADMINISTRATIVAS
  // ===================================================================

  // ✅ LIMPIAR SOLICITUDES OBSOLETAS (ADMIN)
  cleanupObsoleteRequests: () => {
    console.log('🧹 === CLEANUP OBSOLETE REQUESTS API CALL ===');
    console.log('🧹 Admin function - requires ADMIN permissions');
    console.log('📤 URL: /agency/admin/cleanup-requests');
    console.log('📤 Method: POST');
    
    return apiRequest('/agency/admin/cleanup-requests', {
      method: 'POST'
    });
  },

  // ✅ VERIFICAR SALUD DEL SISTEMA (ADMIN)
  getSystemHealth: () => {
    console.log('🏥 === GET SYSTEM HEALTH API CALL ===');
    console.log('🏥 Admin function - requires ADMIN permissions');
    console.log('📤 URL: /agency/admin/system-health');
    console.log('📤 Method: GET');
    
    return apiRequest('/agency/admin/system-health', {
      method: 'GET'
    });
  },

  // ===================================================================
  // ✅ HELPERS Y UTILIDADES PARA AGENCIAS
  // ===================================================================

  formatAgencyData: (agency) => {
    if (!agency) return null;
    
    return {
      id: agency.id,
      userId: agency.user?.id || agency.userId,
      name: agency.user ? `${agency.user.firstName} ${agency.user.lastName}` : agency.name,
      avatar: agency.user?.avatar || agency.logo,
      bio: agency.user?.bio || agency.description,
      website: agency.user?.website,
      phone: agency.user?.phone,
      location: agency.user?.location?.city || agency.location,
      isVerified: agency.isVerified,
      verifiedAt: agency.verifiedAt,
      stats: {
        totalEscorts: agency.totalEscorts || 0,
        verifiedEscorts: agency.verifiedEscorts || 0,
        activeEscorts: agency.activeEscorts || 0
      },
      rating: agency.rating || 0,
      createdAt: agency.user?.createdAt || agency.createdAt,
      posts: agency.posts || []
    };
  },

  formatRequestData: (request) => {
    if (!request) return null;
    
    return {
      id: request.id,
      membershipId: request.membershipId || request.id, // ✅ Añadido para cancelaciones
      agencyId: request.agencyId,
      agencyName: request.agencyName || request.agency?.name,
      agencyLogo: request.agencyLogo || request.agency?.user?.avatar,
      location: request.location || request.agency?.user?.location?.city,
      message: request.message || '',
      status: request.status,
      date: request.date || request.createdAt,
      requestDate: agencyAPI.formatRelativeDate(request.createdAt),
      verified: request.verified || request.agency?.isVerified || false,
      proposedCommission: request.proposedCommission,
      proposedRole: request.proposedRole,
      expiresAt: request.expiresAt,
      // ✅ Nuevos campos para cancelaciones
      cancelledAt: request.cancelledAt,
      cancelReason: request.cancelReason,
      canCancel: request.status === 'PENDING' // Helper para UI
    };
  },

  formatRelativeDate: (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInHours < 1) return 'Hace menos de 1 hora';
    if (diffInHours < 24) return `Hace ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
    if (diffInDays < 7) return `Hace ${diffInDays} día${diffInDays > 1 ? 's' : ''}`;
    if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7);
      return `Hace ${weeks} semana${weeks > 1 ? 's' : ''}`;
    }
    
    const months = Math.floor(diffInDays / 30);
    return `Hace ${months} mes${months > 1 ? 'es' : ''}`;
  },

  // ✅ VALIDACIONES
  validateJoinRequest: (agencyData, message = '') => {
    const errors = {};
    
    if (!agencyData || !agencyData.userId) {
      errors.agency = 'Datos de agencia inválidos';
    }
    
    if (message && message.length > 500) {
      errors.message = 'El mensaje no puede exceder 500 caracteres';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  validateCancelRequest: (membershipId, reason = '') => {
    const errors = {};
    
    if (!membershipId) {
      errors.membershipId = 'ID de membresía es requerido';
    }
    
    if (reason && reason.length > 500) {
      errors.reason = 'La razón no puede exceder 500 caracteres';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  validateInvitationResponse: (invitationId, action, message = '') => {
    const errors = {};
    
    if (!invitationId) {
      errors.invitationId = 'ID de invitación es requerido';
    }
    
    if (!['accept', 'reject'].includes(action)) {
      errors.action = 'Acción debe ser "accept" o "reject"';
    }
    
    if (message && message.length > 500) {
      errors.message = 'El mensaje no puede exceder 500 caracteres';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  // ✅ TRANSFORMADORES PARA COMPONENTES
  transformAgenciesForComponent: (agencies) => {
    return agencies.map(agency => agencyAPI.formatAgencyData(agency));
  },

  transformRequestsForComponent: (requests) => {
    return requests.map(request => agencyAPI.formatRequestData(request));
  },

  // ✅ HELPERS DE ESTADO
  getRequestStatusText: (status) => {
    const statusMap = {
      'PENDING': 'Pendiente',
      'ACTIVE': 'Activa',
      'REJECTED': 'Rechazada',
      'CANCELLED': 'Cancelada'
    };
    
    return statusMap[status] || status;
  },

  getRequestStatusColor: (status) => {
    const colorMap = {
      'PENDING': 'warning',
      'ACTIVE': 'success',
      'REJECTED': 'error',
      'CANCELLED': 'secondary'
    };
    
    return colorMap[status] || 'default';
  },

  // ✅ HELPER PARA VERIFICAR SI SE PUEDE CANCELAR
  canCancelRequest: (request) => {
    return request && request.status === 'PENDING';
  },

  // ✅ HELPER PARA OBTENER MENSAJE DE CONFIRMACIÓN DE CANCELACIÓN
  getCancelConfirmationMessage: (agencyName) => {
    return `¿Estás seguro de que quieres cancelar tu solicitud para unirte a ${agencyName}? Esta acción no se puede deshacer.`;
  },

  // ✅ WRAPPER PARA MANEJAR ERRORES DE CANCELACIÓN
  handleCancelRequest: async (membershipId, reason, options = {}) => {
    try {
      console.log('🚫 === HANDLING CANCEL REQUEST ===');
      console.log('🚫 Membership ID:', membershipId);
      console.log('🚫 Reason:', reason);
      console.log('🚫 Options:', options);
      
      // Validar datos
      const validation = agencyAPI.validateCancelRequest(membershipId, reason);
      if (!validation.isValid) {
        throw new Error(Object.values(validation.errors)[0]);
      }
      
      // Ejecutar cancelación
      const result = await agencyAPI.cancelOwnRequest(membershipId, reason);
      
      console.log('✅ Cancel request successful:', result);
      
      // Callback de éxito si se proporciona
      if (options.onSuccess) {
        options.onSuccess(result);
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Cancel request failed:', error);
      
      // Callback de error si se proporciona
      if (options.onError) {
        options.onError(error);
      }
      
      throw error;
    }
  }
};

/**
 * ====================================================================
 * 💳 PAYMENT API - CORREGIDO PARA CLIENTES
 * ====================================================================
 */
export const paymentAPI = {
  // ✅ PRICING
  getBoostPricing: () => apiRequest('/payments/boost/pricing', {
    method: 'GET'
  }),

  getVerificationPricing: () => apiRequest('/payments/verification/pricing', {
    method: 'GET'
  }),

  // ✅ BOOST PAYMENTS
  createBoostIntent: (postId, pricingId) => {
    console.log('💰 === CREATE BOOST INTENT API CALL ===');
    console.log('💰 Post ID:', postId);
    console.log('💰 Pricing ID:', pricingId);
    
    return apiRequest('/payments/boost/create-intent', {
      method: 'POST',
      body: JSON.stringify({ postId, pricingId })
    });
  },

  confirmBoostPayment: (paymentId) => {
    console.log('✅ === CONFIRM BOOST PAYMENT API CALL ===');
    console.log('✅ Payment ID:', paymentId);
    
    return apiRequest(`/payments/boost/confirm/${paymentId}`, {
      method: 'POST'
    });
  },

  // ✅ VERIFICATION PAYMENTS
  createVerificationIntent: (escortId, pricingId) => {
    console.log('💰 === CREATE VERIFICATION INTENT API CALL ===');
    console.log('💰 Escort ID:', escortId);
    console.log('💰 Pricing ID:', pricingId);
    
    return apiRequest('/payments/verification/create-intent', {
      method: 'POST',
      body: JSON.stringify({ escortId, pricingId })
    });
  },

  confirmVerificationPayment: (paymentId) => {
    console.log('✅ === CONFIRM VERIFICATION PAYMENT API CALL ===');
    console.log('✅ Payment ID:', paymentId);
    
    return apiRequest(`/payments/verification/confirm/${paymentId}`, {
      method: 'POST'
    });
  },

  // ✅ ADDITIONAL POST PAYMENTS
  createAdditionalPostIntent: (postData) => {
    console.log('💰 === CREATE ADDITIONAL POST INTENT API CALL ===');
    console.log('💰 Post Data:', postData);
    
    return apiRequest('/payments/additional-post/create-intent', {
      method: 'POST',
      body: JSON.stringify({ postData })
    });
  },

  confirmAdditionalPostPayment: (paymentId) => {
    console.log('✅ === CONFIRM ADDITIONAL POST PAYMENT API CALL ===');
    console.log('✅ Payment ID:', paymentId);
    
    return apiRequest(`/payments/additional-post/confirm/${paymentId}`, {
      method: 'POST'
    });
  },

  // ✅ POINTS PAYMENTS - USANDO ENDPOINTS ESPECÍFICOS DE PUNTOS
  createPointsIntent: (data) => {
    console.log('💰 === CREATE POINTS INTENT API CALL ===');
    console.log('💰 Data:', data);
    
    return apiRequest('/payments/points/create-intent', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  confirmPointsPayment: (paymentId) => {
    console.log('✅ === CONFIRM POINTS PAYMENT API CALL ===');
    console.log('✅ Payment ID:', paymentId);
    
    return apiRequest(`/payments/points/confirm/${paymentId}`, {
      method: 'POST'
    });
  },

  // ✅ PREMIUM PAYMENTS - CORREGIDO
  createPremiumIntent: (data) => {
    console.log('💰 === CREATE PREMIUM INTENT API CALL ===');
    console.log('💰 Data:', data);
    
    return apiRequest('/payments/premium/create-intent', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  confirmPremiumPayment: (paymentId) => {
    console.log('✅ === CONFIRM PREMIUM PAYMENT API CALL ===');
    console.log('✅ Payment ID:', paymentId);
    
    return apiRequest(`/payments/premium/confirm/${paymentId}`, {
      method: 'POST'
    });
  },

  // ===================================================================
  // ✅ FUNCIONES ESPECÍFICAS PARA CLIENTES - PUNTOS Y PREMIUM
  // ===================================================================

  // ✅ COMPRA DE PUNTOS SIMPLIFICADA PARA CLIENTES
  buyPoints: async (packageData, paymentMethod = 'stripe') => {
    console.log('🛒 === BUY POINTS API CALL ===');
    console.log('🛒 Package:', packageData);
    console.log('🛒 Payment Method:', paymentMethod);
    
    try {
      // Asegurar formato correcto
      const requestData = typeof packageData === 'string' ? 
        { pointsPackage: packageData } : 
        packageData;

      // 1. Crear intención de pago
      const intent = await paymentAPI.createPointsIntent(requestData);
      console.log('✅ Points intent created:', intent);
      
      return {
        success: true,
        paymentId: intent.data.paymentId,
        clientSecret: intent.data.clientSecret,
        amount: intent.data.amount,
        package: intent.data.package,
        instructions: 'Use clientSecret with Stripe to complete payment, then call confirmPointsPayment'
      };
    } catch (error) {
      console.error('❌ Error buying points:', error);
      throw error;
    }
  },

  // ✅ COMPRA DE PREMIUM SIMPLIFICADA PARA CLIENTES
  buyPremium: async (tier, duration, paymentMethod = 'stripe') => {
    console.log('🛒 === BUY PREMIUM API CALL ===');
    console.log('🛒 Tier:', tier);
    console.log('🛒 Duration:', duration);
    console.log('🛒 Payment Method:', paymentMethod);
    
    try {
      // 1. Crear intención de pago
      const intent = await paymentAPI.createPremiumIntent({ tier, duration });
      console.log('✅ Premium intent created:', intent);
      
      return {
        success: true,
        paymentId: intent.data.paymentId,
        clientSecret: intent.data.clientSecret,
        amount: intent.data.amount,
        tier: intent.data.tier,
        duration: intent.data.duration,
        price: intent.data.price,
        type: intent.data.type,
        instructions: 'Use clientSecret with Stripe to complete payment, then call confirmPremiumPayment'
      };
    } catch (error) {
      console.error('❌ Error buying premium:', error);
      throw error;
    }
  },

  // ✅ OBTENER PLANES Y PRECIOS DISPONIBLES
  getPointsPackages: () => {
    console.log('📋 === GET POINTS PACKAGES ===');
    
    const packages = {
      starter: {
        id: 'starter',
        points: 50,
        price: 4.99,
        bonus: 0,
        popular: false,
        description: 'Para empezar'
      },
      basic: {
        id: 'basic',
        points: 100,
        price: 9.99,
        bonus: 10,
        popular: false,
        description: 'Uso moderado'
      },
      standard: {
        id: 'standard',
        points: 250,
        price: 19.99,
        bonus: 50,
        popular: true,
        description: 'Más popular'
      },
      premium: {
        id: 'premium',
        points: 500,
        price: 34.99,
        bonus: 100,
        popular: false,
        description: 'Uso intensivo'
      },
      mega: {
        id: 'mega',
        points: 1000,
        price: 59.99,
        bonus: 250,
        popular: false,
        description: 'Máximo valor'
      }
    };
    
    console.log('✅ Points packages loaded:', packages);
    
    return {
      success: true,
      data: packages
    };
  },

  getPremiumPlans: () => {
    console.log('📋 === GET PREMIUM PLANS ===');
    
    const plans = {
      PREMIUM: {
        name: 'Premium',
        features: [
          'Mensajes ilimitados',
          'Ver números de teléfono',
          'Enviar imágenes',
          'Acceso a perfiles premium',
          'Soporte prioritario'
        ],
        prices: {
          1: 19.99,
          3: 49.99,
          6: 89.99,
          12: 149.99
        }
      },
      VIP: {
        name: 'VIP',
        features: [
          'Todo de Premium',
          'Mensajes de voz',
          'Ver estado online',
          'Perfil destacado',
          'Análisis avanzados',
          'Gerente de cuenta'
        ],
        prices: {
          1: 39.99,
          3: 99.99,
          6: 179.99,
          12: 299.99
        }
      }
    };
    
    console.log('✅ Premium plans loaded:', plans);
    
    return {
      success: true,
      data: plans
    };
  },

  // ✅ VERIFICAR ESTADO DE SUSCRIPCIÓN PREMIUM
  checkPremiumStatus: () => {
    console.log('🔍 === CHECK PREMIUM STATUS ===');
    
    // Esta función usaría userAPI.getProfile() para obtener el estado actual
    return userAPI.getProfile().then(profile => {
      const user = profile.data;
      
      return {
        success: true,
        data: {
          isPremium: user.isPremium || false,
          premiumTier: user.premiumTier || 'BASIC',
          premiumExpiresAt: user.premiumExpiresAt,
          daysRemaining: user.premiumExpiresAt ? 
            Math.max(0, Math.ceil((new Date(user.premiumExpiresAt) - new Date()) / (1000 * 60 * 60 * 24))) : 0,
          canUpgrade: !user.isPremium || user.premiumTier === 'PREMIUM',
          benefits: paymentAPI.getPremiumBenefits(user.premiumTier)
        }
      };
    });
  },

  // ✅ OBTENER BALANCE DE PUNTOS
  getPointsBalance: () => {
    console.log('🔍 === GET POINTS BALANCE ===');
    
    return userAPI.getProfile().then(profile => {
      const user = profile.data;
      
      return {
        success: true,
        data: {
          currentPoints: user.client?.points || 0,
          totalEarned: user.client?.totalPointsEarned || 0,
          totalSpent: user.client?.totalPointsSpent || 0,
          lastUpdated: user.client?.pointsLastUpdated,
          breakdown: {
            fromReferrals: user.client?.pointsFromReferrals || 0,
            fromPurchases: user.client?.pointsFromPurchases || 0,
            fromActions: user.client?.pointsFromActions || 0
          }
        }
      };
    });
  },

  // ✅ CALCULAR COSTOS DE ACCIONES EN PUNTOS
  calculatePointsCost: (action, data = {}) => {
    console.log('🧮 === CALCULATE POINTS COST ===');
    console.log('🧮 Action:', action);
    console.log('🧮 Data:', data);
    
    const pointsCosts = {
      // Acciones de comunicación
      'premium_message': 25,
      'view_phone_number': 75,
      'send_voice_message': 50,
      'send_image_message': 15,
      
      // Acciones de interacción
      'boost_profile': 100,
      'super_like': 50,
      'view_who_liked_me': 200,
      'unlock_premium_photo': 30,
      
      // Acciones de búsqueda
      'advanced_filters': 40,
      'location_search': 25,
      'age_search': 20,
      
      // Acciones especiales
      'priority_support': 150,
      'read_receipt': 10,
      'typing_indicator': 5
    };
    
    const baseCost = pointsCosts[action] || 0;
    
    // Aplicar modificadores según los datos
    let finalCost = baseCost;
    
    if (action === 'premium_message' && data.messageLength > 500) {
      finalCost += 10; // Mensajes largos cuestan más
    }
    
    if (action === 'boost_profile' && data.duration > 24) {
      finalCost += Math.floor(data.duration / 24) * 50; // Boost más largo
    }
    
    return {
      success: true,
      data: {
        action,
        baseCost,
        finalCost,
        modifier: finalCost - baseCost,
        currency: 'points'
      }
    };
  },

  // ✅ OBTENER BENEFICIOS POR TIER PREMIUM
  getPremiumBenefits: (tier = 'BASIC') => {
    const benefits = {
      BASIC: {
        dailyMessageLimit: 3,
        canViewPhoneNumbers: false,
        canSendImages: false,
        canSendVoiceMessages: false,
        canAccessPremiumProfiles: false,
        prioritySupport: false,
        canSeeOnlineStatus: false,
        adFree: false,
        profileBoost: false
      },
      PREMIUM: {
        dailyMessageLimit: -1, // Unlimited
        canViewPhoneNumbers: true,
        canSendImages: true,
        canSendVoiceMessages: false,
        canAccessPremiumProfiles: true,
        prioritySupport: true,
        canSeeOnlineStatus: false,
        adFree: true,
        profileBoost: 'monthly'
      },
      VIP: {
        dailyMessageLimit: -1, // Unlimited
        canViewPhoneNumbers: true,
        canSendImages: true,
        canSendVoiceMessages: true,
        canAccessPremiumProfiles: true,
        prioritySupport: true,
        canSeeOnlineStatus: true,
        adFree: true,
        profileBoost: 'weekly',
        exclusiveContent: true,
        accountManager: true
      }
    };
    
    return benefits[tier] || benefits.BASIC;
  },

  // ✅ PAYMENT HISTORY
  getPaymentHistory: (params = {}) => {
    console.log('📊 === GET PAYMENT HISTORY API CALL ===');
    console.log('📊 Input params:', params);
    
    return apiRequest('/payments/history', {
      method: 'GET',
      params
    });
  },

  // ✅ STRIPE WEBHOOK
  handleStripeWebhook: (payload) => apiRequest('/payments/webhook/stripe', {
    method: 'POST',
    body: payload
  }),

  // ===================================================================
  // ✅ HELPERS PARA PAYMENTS
  // ===================================================================

  formatPaymentData: (payment) => {
    if (!payment) return null;
    
    return {
      id: payment.id,
      amount: payment.amount,
      currency: payment.currency || 'USD',
      status: payment.status,
      type: payment.type,
      description: payment.description,
      createdAt: payment.createdAt,
      completedAt: payment.completedAt,
      failedAt: payment.failedAt,
      refundedAt: payment.refundedAt,
      // Datos específicos por tipo
      postId: payment.postId,
      escortId: payment.escortId,
      pricingId: payment.pricingId,
      // Stripe data
      stripePaymentIntentId: payment.stripePaymentIntentId,
      clientSecret: payment.clientSecret
    };
  },

  calculateTotal: (baseAmount, taxes = 0, fees = 0) => {
    const subtotal = parseFloat(baseAmount);
    const taxAmount = parseFloat(taxes);
    const feeAmount = parseFloat(fees);
    
    return {
      subtotal: subtotal.toFixed(2),
      taxes: taxAmount.toFixed(2),
      fees: feeAmount.toFixed(2),
      total: (subtotal + taxAmount + feeAmount).toFixed(2)
    };
  },

  validatePaymentData: (paymentData) => {
    const errors = {};
    
    if (!paymentData.amount || paymentData.amount <= 0) {
      errors.amount = 'El monto debe ser mayor a 0';
    }
    
    if (!paymentData.type) {
      errors.type = 'El tipo de pago es requerido';
    }
    
    if (!['BOOST', 'VERIFICATION', 'POINTS', 'PREMIUM', 'POST_ADDITIONAL'].includes(paymentData.type)) {
      errors.type = 'Tipo de pago inválido';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  // ✅ FORMATEAR PACKAGES DE PUNTOS
  formatPointsPackages: () => {
    return {
      BASIC: { points: 50, price: 5.00, bonus: 0, description: 'Paquete básico' },
      STANDARD: { points: 120, price: 10.00, bonus: 20, description: 'Paquete estándar' },
      PREMIUM: { points: 300, price: 20.00, bonus: 50, description: 'Paquete premium' },
      VIP: { points: 750, price: 45.00, bonus: 150, description: 'Paquete VIP' },
      MEGA: { points: 1500, price: 80.00, bonus: 400, description: 'Paquete mega' }
    };
  },

  // ✅ FORMATEAR PLANES PREMIUM
  formatPremiumPlans: () => {
    return {
      PREMIUM: {
        name: 'Premium',
        features: [
          'Mensajes ilimitados',
          'Ver números de teléfono',
          'Enviar imágenes',
          'Acceso a perfiles premium',
          'Soporte prioritario'
        ],
        prices: {
          1: 19.99,
          3: 49.99,
          6: 89.99,
          12: 149.99
        }
      },
      VIP: {
        name: 'VIP',
        features: [
          'Todo de Premium',
          'Mensajes de voz',
          'Ver estado online',
          'Perfil destacado',
          'Análisis avanzados',
          'Gerente de cuenta'
        ],
        prices: {
          1: 39.99,
          3: 99.99,
          6: 179.99,
          12: 299.99
        }
      }
    };
  }
};

/**
 * ====================================================================
 * 🔧 SYSTEM API
 * ====================================================================
 */
export const systemAPI = {
  // ✅ ESTADO Y MÉTRICAS DEL SISTEMA
  getStatus: () => apiRequest('/status', {
    method: 'GET'
  }),

  getMetrics: () => apiRequest('/metrics', {
    method: 'GET'
  }),

  // ✅ INFORMACIÓN DE LA API
  getApiInfo: () => ({
    version: '2.7.0',
    baseUrl: API_CONFIG.BASE_URL,
    timeout: API_CONFIG.TIMEOUT,
    retryAttempts: API_CONFIG.RETRY_ATTEMPTS,
    maxFileSizes: {
      avatar: API_CONFIG.MAX_FILE_SIZE,
      post: API_CONFIG.MAX_POST_FILE_SIZE,
      chat: API_CONFIG.MAX_CHAT_FILE_SIZE
    },
    supportedFeatures: [
      'authentication',
      'file-upload',
      'real-time-chat',
      'payment-processing',
      'agency-management',
      'admin-panel',
      'points-system'
    ]
  }),

  // ✅ HELPERS DEL SISTEMA
  formatSystemStats: (stats) => {
    if (!stats) return {};
    
    return {
      uptime: stats.uptime,
      memory: {
        used: Math.round(stats.memory?.rss / 1024 / 1024) || 0,
        heap: Math.round(stats.memory?.heapUsed / 1024 / 1024) || 0,
        external: Math.round(stats.memory?.external / 1024 / 1024) || 0
      },
      database: stats.database,
      version: stats.version || '1.0.0',
      environment: stats.environment || 'development',
      timestamp: stats.timestamp
    };
  }
};

/**
 * ====================================================================
 * 🛠️ FUNCIÓN DE REQUEST BASE (IMPORTADA DESDE API.JS)
 * ====================================================================
 */
// Esta función será importada desde api.js
let apiRequest;

// Función de inicialización que recibe apiRequest desde api.js
export const initBusinessAPI = (apiRequestFunction) => {
  apiRequest = apiRequestFunction;
  console.log('✅ Business API initialized with apiRequest function');
};

/**
 * ====================================================================
 * 🧪 FUNCIONES DE DEBUG Y TEST
 * ====================================================================
 */
export const businessTestAPI = {
  // ✅ TEST COMPLETO DEL MÓDULO DE AGENCIAS
  testAgencyFlow: async (userType = 'AGENCY') => {
    try {
      console.log('🧪 === TESTING AGENCY FLOW ===');
      console.log('🧪 User type:', userType);
      
      const results = {};
      
      if (userType === 'AGENCY') {
        // 1. Test obtener escorts pendientes
        console.log('🧪 1. Testing get pending escorts...');
        try {
          const pendingResponse = await agencyAPI.getAgencyEscorts({
            page: 1,
            limit: 10,
            status: 'pending'
          });
          results.pendingEscorts = {
            success: pendingResponse.success,
            count: pendingResponse.data?.escorts?.length || 0,
            total: pendingResponse.data?.pagination?.total || 0
          };
          console.log('✅ Pending escorts:', results.pendingEscorts);
        } catch (error) {
          results.pendingEscorts = { success: false, error: error.message };
          console.log('❌ Pending escorts failed:', error.message);
        }
        
        // 2. Test obtener escorts activos
        console.log('🧪 2. Testing get active escorts...');
        try {
          const activeResponse = await agencyAPI.getAgencyEscorts({
            page: 1,
            limit: 10,
            status: 'active'
          });
          results.activeEscorts = {
            success: activeResponse.success,
            count: activeResponse.data?.escorts?.length || 0,
            total: activeResponse.data?.pagination?.total || 0
          };
          console.log('✅ Active escorts:', results.activeEscorts);
        } catch (error) {
          results.activeEscorts = { success: false, error: error.message };
          console.log('❌ Active escorts failed:', error.message);
        }
        
        // 3. Test estadísticas
        console.log('🧪 3. Testing agency stats...');
        try {
          const statsResponse = await agencyAPI.getAgencyStats();
          results.stats = {
            success: statsResponse.success,
            data: statsResponse.data
          };
          console.log('✅ Agency stats:', results.stats);
        } catch (error) {
          results.stats = { success: false, error: error.message };
          console.log('❌ Agency stats failed:', error.message);
        }
        
        // 4. Test verification pricing
        console.log('🧪 4. Testing verification pricing...');
        try {
          const pricingResponse = await agencyAPI.getVerificationPricing();
          results.verificationPricing = {
            success: pricingResponse.success,
            data: pricingResponse.data
          };
          console.log('✅ Verification pricing:', results.verificationPricing);
        } catch (error) {
          results.verificationPricing = { success: false, error: error.message };
          console.log('❌ Verification pricing failed:', error.message);
        }
        
      } else if (userType === 'ESCORT') {
        // 1. Test estado de membresía
        console.log('🧪 1. Testing membership status...');
        try {
          const statusResponse = await agencyAPI.getEscortMembershipStatus();
          results.membershipStatus = {
            success: statusResponse.success,
            status: statusResponse.data?.status,
            hasActiveMembership: statusResponse.data?.hasActiveMembership,
            hasPendingRequests: statusResponse.data?.hasPendingRequests
          };
          console.log('✅ Membership status:', results.membershipStatus);
        } catch (error) {
          results.membershipStatus = { success: false, error: error.message };
          console.log('❌ Membership status failed:', error.message);
        }
        
        // 2. Test invitaciones
        console.log('🧪 2. Testing escort invitations...');
        try {
          const invitationsResponse = await agencyAPI.getEscortInvitations({
            page: 1,
            limit: 10,
            status: 'PENDING'
          });
          results.invitations = {
            success: invitationsResponse.success,
            count: invitationsResponse.data?.invitations?.length || 0,
            total: invitationsResponse.data?.pagination?.total || 0
          };
          console.log('✅ Escort invitations:', results.invitations);
        } catch (error) {
          results.invitations = { success: false, error: error.message };
          console.log('❌ Escort invitations failed:', error.message);
        }
        
        // 3. Test búsqueda de agencias
        console.log('🧪 3. Testing agency search...');
        try {
          const searchResponse = await agencyAPI.searchAgencies({
            page: 1,
            limit: 5
          });
          results.agencySearch = {
            success: searchResponse.success,
            count: searchResponse.data?.agencies?.length || 0,
            total: searchResponse.data?.pagination?.total || 0
          };
          console.log('✅ Agency search:', results.agencySearch);
        } catch (error) {
          results.agencySearch = { success: false, error: error.message };
          console.log('❌ Agency search failed:', error.message);
        }
      }
      
      console.log('🧪 === AGENCY TESTING COMPLETE ===');
      console.log('🧪 Full results:', results);
      
      return {
        success: true,
        userType,
        results,
        summary: {
          totalTests: Object.keys(results).length,
          successfulTests: Object.values(results).filter(r => r.success !== false).length,
          failedTests: Object.values(results).filter(r => r.success === false).length
        }
      };
      
    } catch (error) {
      console.error('❌ Agency flow testing failed:', error);
      return {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }
  },

  // ✅ TEST DEL MÓDULO DE PAGOS (INCLUYENDO PUNTOS Y PREMIUM)
  testPaymentFlow: async () => {
    try {
      console.log('🧪 === TESTING PAYMENT FLOW (INCLUDING POINTS & PREMIUM) ===');
      
      const results = {};
      
      // 1. Test boost pricing
      console.log('🧪 1. Testing boost pricing...');
      try {
        const boostPricing = await paymentAPI.getBoostPricing();
        results.boostPricing = {
          success: boostPricing.success,
          count: boostPricing.data?.length || 0
        };
        console.log('✅ Boost pricing:', results.boostPricing);
      } catch (error) {
        results.boostPricing = { success: false, error: error.message };
        console.log('❌ Boost pricing failed:', error.message);
      }
      
      // 2. Test verification pricing
      console.log('🧪 2. Testing verification pricing...');
      try {
        const verificationPricing = await paymentAPI.getVerificationPricing();
        results.verificationPricing = {
          success: verificationPricing.success,
          count: verificationPricing.data?.length || 0
        };
        console.log('✅ Verification pricing:', results.verificationPricing);
      } catch (error) {
        results.verificationPricing = { success: false, error: error.message };
        console.log('❌ Verification pricing failed:', error.message);
      }
      
      // 3. Test points packages
      console.log('🧪 3. Testing points packages...');
      try {
        const pointsPackages = paymentAPI.getPointsPackages();
        results.pointsPackages = {
          success: pointsPackages.success,
          count: Object.keys(pointsPackages.data || {}).length
        };
        console.log('✅ Points packages:', results.pointsPackages);
      } catch (error) {
        results.pointsPackages = { success: false, error: error.message };
        console.log('❌ Points packages failed:', error.message);
      }
      
      // 4. Test premium plans
      console.log('🧪 4. Testing premium plans...');
      try {
        const premiumPlans = paymentAPI.getPremiumPlans();
        results.premiumPlans = {
          success: premiumPlans.success,
          count: Object.keys(premiumPlans.data || {}).length
        };
        console.log('✅ Premium plans:', results.premiumPlans);
      } catch (error) {
        results.premiumPlans = { success: false, error: error.message };
        console.log('❌ Premium plans failed:', error.message);
      }
      
      // 5. Test points balance
      console.log('🧪 5. Testing points balance...');
      try {
        const pointsBalance = await paymentAPI.getPointsBalance();
        results.pointsBalance = {
          success: pointsBalance.success,
          currentPoints: pointsBalance.data?.currentPoints || 0
        };
        console.log('✅ Points balance:', results.pointsBalance);
      } catch (error) {
        results.pointsBalance = { success: false, error: error.message };
        console.log('❌ Points balance failed:', error.message);
      }
      
      // 6. Test premium status
      console.log('🧪 6. Testing premium status...');
      try {
        const premiumStatus = await paymentAPI.checkPremiumStatus();
        results.premiumStatus = {
          success: premiumStatus.success,
          isPremium: premiumStatus.data?.isPremium || false,
          tier: premiumStatus.data?.premiumTier || 'BASIC'
        };
        console.log('✅ Premium status:', results.premiumStatus);
      } catch (error) {
        results.premiumStatus = { success: false, error: error.message };
        console.log('❌ Premium status failed:', error.message);
      }
      
      // 7. Test payment history
      console.log('🧪 7. Testing payment history...');
      try {
        const paymentHistory = await paymentAPI.getPaymentHistory({
          page: 1,
          limit: 5
        });
        results.paymentHistory = {
          success: paymentHistory.success,
          count: paymentHistory.data?.payments?.length || 0
        };
        console.log('✅ Payment history:', results.paymentHistory);
      } catch (error) {
        results.paymentHistory = { success: false, error: error.message };
        console.log('❌ Payment history failed:', error.message);
      }
      
      // 8. Test points cost calculation
      console.log('🧪 8. Testing points cost calculation...');
      try {
        const pointsCost = paymentAPI.calculatePointsCost('premium_message', { messageLength: 300 });
        results.pointsCost = {
          success: pointsCost.success,
          cost: pointsCost.data?.finalCost || 0
        };
        console.log('✅ Points cost calculation:', results.pointsCost);
      } catch (error) {
        results.pointsCost = { success: false, error: error.message };
        console.log('❌ Points cost calculation failed:', error.message);
      }
      
      console.log('🧪 === PAYMENT TESTING COMPLETE (WITH CLIENT FEATURES) ===');
      console.log('🧪 Full results:', results);
      
      return {
        success: true,
        results,
        summary: {
          totalTests: Object.keys(results).length,
          successfulTests: Object.values(results).filter(r => r.success !== false).length,
          failedTests: Object.values(results).filter(r => !r.success).length,
          clientFeatures: {
            pointsSupported: results.pointsPackages?.success || false,
            premiumSupported: results.premiumPlans?.success || false,
            paymentHistoryAvailable: results.paymentHistory?.success || false
          }
        }
      };
      
    } catch (error) {
      console.error('❌ Payment flow testing failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // ✅ TEST DEL SISTEMA DE PUNTOS
  testPointsFlow: async () => {
    try {
      console.log('🧪 === TESTING POINTS FLOW ===');
      
      const results = {};
      
      // 1. Test points balance
      console.log('🧪 1. Testing points balance...');
      try {
        const balance = await pointsAPI.getBalance();
        results.balance = {
          success: balance.success,
          currentBalance: balance.data?.currentBalance || 0
        };
        console.log('✅ Points balance:', results.balance);
      } catch (error) {
        results.balance = { success: false, error: error.message };
        console.log('❌ Points balance failed:', error.message);
      }
      
      // 2. Test points packages
      console.log('🧪 2. Testing points packages...');
      try {
        const packages = await pointsAPI.getPackages();
        results.packages = {
          success: packages.success,
          count: packages.data?.packages?.length || 0
        };
        console.log('✅ Points packages:', results.packages);
      } catch (error) {
        results.packages = { success: false, error: error.message };
        console.log('❌ Points packages failed:', error.message);
      }
      
      // 3. Test points actions
      console.log('🧪 3. Testing points actions...');
      try {
        const actions = await pointsAPI.getActions();
        results.actions = {
          success: actions.success,
          count: actions.data?.length || 0
        };
        console.log('✅ Points actions:', results.actions);
      } catch (error) {
        results.actions = { success: false, error: error.message };
        console.log('❌ Points actions failed:', error.message);
      }
      
      // 4. Test daily status
      console.log('🧪 4. Testing daily login status...');
      try {
        const dailyStatus = await pointsAPI.getDailyStatus();
        results.dailyStatus = {
          success: dailyStatus.success,
          eligible: dailyStatus.data?.eligible || false
        };
        console.log('✅ Daily status:', results.dailyStatus);
      } catch (error) {
        results.dailyStatus = { success: false, error: error.message };
        console.log('❌ Daily status failed:', error.message);
      }
      
      // 5. Test streak info
      console.log('🧪 5. Testing streak info...');
      try {
        const streak = await pointsAPI.getStreak();
        results.streak = {
          success: streak.success,
          currentStreak: streak.data?.currentStreak || 0
        };
        console.log('✅ Streak info:', results.streak);
      } catch (error) {
        results.streak = { success: false, error: error.message };
        console.log('❌ Streak info failed:', error.message);
      }
      
      // 6. Test points history
      console.log('🧪 6. Testing points history...');
      try {
        const history = await pointsAPI.getHistory({ limit: 5 });
        results.history = {
          success: history.success,
          count: history.data?.history?.length || 0
        };
        console.log('✅ Points history:', results.history);
      } catch (error) {
        results.history = { success: false, error: error.message };
        console.log('❌ Points history failed:', error.message);
      }
      
      console.log('🧪 === POINTS TESTING COMPLETE ===');
      console.log('🧪 Full results:', results);
      
      return {
        success: true,
        results,
        summary: {
          totalTests: Object.keys(results).length,
          successfulTests: Object.values(results).filter(r => r.success !== false).length,
          failedTests: Object.values(results).filter(r => r.success === false).length
        }
      };
      
    } catch (error) {
      console.error('❌ Points flow testing failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // ✅ TEST DEL SISTEMA
  testSystemOperations: async () => {
    try {
      console.log('🧪 === TESTING SYSTEM OPERATIONS ===');
      
      const results = {};
      
      // 1. Test system status
      console.log('🧪 1. Testing system status...');
      try {
        const status = await systemAPI.getStatus();
        results.status = {
          success: status.success,
          data: status.data || status
        };
        console.log('✅ System status:', results.status);
      } catch (error) {
        results.status = { success: false, error: error.message };
        console.log('❌ System status failed:', error.message);
      }
      
      // 2. Test API info
      console.log('🧪 2. Testing API info...');
      try {
        const apiInfo = systemAPI.getApiInfo();
        results.apiInfo = {
          success: true,
          data: apiInfo
        };
        console.log('✅ API info:', results.apiInfo);
      } catch (error) {
        results.apiInfo = { success: false, error: error.message };
        console.log('❌ API info failed:', error.message);
      }
      
      console.log('🧪 === SYSTEM TESTING COMPLETE ===');
      console.log('🧪 Full results:', results);
      
      return {
        success: true,
        results,
        summary: {
          totalTests: Object.keys(results).length,
          successfulTests: Object.values(results).filter(r => r.success).length,
          failedTests: Object.values(results).filter(r => !r.success).length
        }
      };
      
    } catch (error) {
      console.error('❌ System testing failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};
// ===================================================================
// 📝 POSTS API CON PAGOS REALES - PARA AGREGAR A api-business.js
// ===================================================================

export const postsPaymentAPI = {
  // ===================================================================
  // 💳 FUNCIONES DE PAGO PARA POSTS
  // ===================================================================

  /**
   * Crear PaymentIntent para anuncio adicional ($1.00)
   * Se usa cuando el escort ya tiene 2 posts y quiere crear el tercero
   */
  createAdditionalPostPayment: (postData) => {
    console.log('💰 === CREATE ADDITIONAL POST PAYMENT API CALL ===');
    console.log('💰 Post Data:', postData);
    
    if (!postData || !postData.title || !postData.description) {
      throw new Error('Datos del post incompletos');
    }
    
    return apiRequest('/posts/payment/additional', {
      method: 'POST',
      body: JSON.stringify({ postData })
    });
  },

  /**
   * Confirmar pago de anuncio adicional y crear el post
   */
  confirmAdditionalPostPayment: (paymentId) => {
    console.log('✅ === CONFIRM ADDITIONAL POST PAYMENT API CALL ===');
    console.log('✅ Payment ID:', paymentId);
    
    if (!paymentId) {
      throw new Error('Payment ID es requerido');
    }
    
    return apiRequest(`/posts/payment/additional/${paymentId}/confirm`, {
      method: 'PUT'
    });
  },

  /**
   * Crear PaymentIntent para promocionar/boost un post ($1.00)
   */
  createBoostPayment: (postId) => {
    console.log('🚀 === CREATE BOOST PAYMENT API CALL ===');
    console.log('🚀 Post ID:', postId);
    
    if (!postId) {
      throw new Error('Post ID es requerido');
    }
    
    return apiRequest('/posts/payment/boost', {
      method: 'POST',
      body: JSON.stringify({ postId })
    });
  },

  /**
   * Confirmar pago de boost y activar promoción
   */
  confirmBoostPayment: (paymentId) => {
    console.log('✅ === CONFIRM BOOST PAYMENT API CALL ===');
    console.log('✅ Payment ID:', paymentId);
    
    if (!paymentId) {
      throw new Error('Payment ID es requerido');
    }
    
    return apiRequest(`/posts/payment/boost/${paymentId}/confirm`, {
      method: 'PUT'
    });
  },

  // ===================================================================
  // 🔧 HELPERS PARA MANEJO DE PAGOS DE POSTS
  // ===================================================================

  /**
   * Verificar si el usuario necesita pagar por un nuevo post
   */
  checkPostPaymentRequired: async () => {
    try {
      const response = await apiRequest('/posts/limits', { method: 'GET' });
      
      if (response.success && response.data) {
        return {
          needsPayment: response.data.needsPayment || false,
          freePostsRemaining: response.data.freePostsRemaining || 0,
          totalPosts: response.data.totalPosts || 0,
          additionalPostPrice: response.data.additionalPostPrice || 1.00,
          canCreateFree: response.data.canCreateFreePost || false
        };
      }
      
      return { needsPayment: false, canCreateFree: true };
    } catch (error) {
      console.error('Error checking post payment requirements:', error);
      return { needsPayment: false, canCreateFree: true };
    }
  },

  /**
   * Flujo completo para crear post con manejo automático de pagos
   */
  createPostWithPaymentFlow: async (postData, images = []) => {
    try {
      console.log('📝 === STARTING POST CREATION WITH PAYMENT FLOW ===');
      
      // 1. Verificar si necesita pagar
      const paymentCheck = await postsPaymentAPI.checkPostPaymentRequired();
      console.log('💰 Payment check result:', paymentCheck);
      
      if (!paymentCheck.needsPayment) {
        // Crear post gratis usando el postsAPI existente
        console.log('✅ Creating free post...');
        return await postsAPI.createPostHelper(postData, images);
      }
      
      // 2. Necesita pagar - crear PaymentIntent
      console.log('💳 Payment required - creating PaymentIntent...');
      const paymentIntent = await postsPaymentAPI.createAdditionalPostPayment(postData);
      
      if (!paymentIntent.success) {
        throw new Error(paymentIntent.message || 'Error creating payment intent');
      }
      
      // 3. Retornar datos para que el frontend maneje Stripe
      return {
        success: true,
        requiresPayment: true,
        paymentData: {
          paymentId: paymentIntent.data.paymentId,
          clientSecret: paymentIntent.data.clientSecret,
          amount: paymentIntent.data.amount,
          currency: paymentIntent.data.currency,
          description: paymentIntent.data.description
        },
        postData,
        message: 'Pago requerido para crear anuncio adicional'
      };
      
    } catch (error) {
      console.error('❌ Error in createPostWithPaymentFlow:', error);
      throw error;
    }
  },

  /**
   * Flujo completo para promocionar post
   */
  boostPostWithPaymentFlow: async (postId) => {
    try {
      console.log('🚀 === STARTING BOOST WITH PAYMENT FLOW ===');
      console.log('🚀 Post ID:', postId);
      
      // 1. Crear PaymentIntent para boost
      const paymentIntent = await postsPaymentAPI.createBoostPayment(postId);
      
      if (!paymentIntent.success) {
        throw new Error(paymentIntent.message || 'Error creating boost payment intent');
      }
      
      // 2. Retornar datos para que el frontend maneje Stripe
      return {
        success: true,
        requiresPayment: true,
        paymentData: {
          paymentId: paymentIntent.data.paymentId,
          clientSecret: paymentIntent.data.clientSecret,
          amount: paymentIntent.data.amount,
          currency: paymentIntent.data.currency,
          description: paymentIntent.data.description,
          post: paymentIntent.data.post
        },
        message: 'Pago requerido para promocionar anuncio'
      };
      
    } catch (error) {
      console.error('❌ Error in boostPostWithPaymentFlow:', error);
      throw error;
    }
  },

  /**
   * Validar datos de post antes del pago
   */
  validatePostForPayment: (postData, images = []) => {
    const validation = postsAPI.validatePostData(postData, images);
    
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      throw new Error(firstError);
    }
    
    return validation;
  },

  /**
   * Formatear datos de post para el pago
   */
  formatPostDataForPayment: (postData, images = []) => {
    // Validar primero
    postsPaymentAPI.validatePostForPayment(postData, images);
    
    return {
      title: postData.title?.trim(),
      description: postData.description?.trim(),
      phone: postData.phone?.trim(),
      age: parseInt(postData.age),
      location: postData.location?.trim(),
      sexo: postData.sexo?.trim(),
      services: Array.isArray(postData.services) ? postData.services : [],
      rates: postData.rates || null,
      availability: postData.availability || null,
      tags: Array.isArray(postData.tags) ? postData.tags : [],
      locationId: postData.locationId || null,
      premiumOnly: postData.premiumOnly === true || postData.premiumOnly === 'true',
      // Las imágenes se manejan por separado en el frontend
      images: images.map(img => img.name || 'uploaded_image'), // Solo para validación
      imageCount: images.length
    };
  },

  // ===================================================================
  // 📊 FUNCIONES DE ESTADO Y INFORMACIÓN
  // ===================================================================

  /**
   * Obtener información de límites y pagos
   */
  getPostLimitsInfo: async () => {
    try {
      const response = await apiRequest('/posts/limits', { method: 'GET' });
      
      if (response.success && response.data) {
        return {
          success: true,
          data: {
            canCreateFree: response.data.canCreateFreePost || false,
            freePostsRemaining: response.data.freePostsRemaining || 0,
            totalPosts: response.data.totalPosts || 0,
            freePostsLimit: response.data.freePostsLimit || 2,
            needsPayment: response.data.needsPayment || false,
            additionalPostPrice: response.data.additionalPostPrice || 1.00,
            message: response.data.message || ''
          }
        };
      }
      
      return {
        success: false,
        data: {
          canCreateFree: false,
          needsPayment: true,
          additionalPostPrice: 1.00
        }
      };
    } catch (error) {
      console.error('Error getting post limits:', error);
      return {
        success: false,
        error: error.message,
        data: {
          canCreateFree: false,
          needsPayment: true,
          additionalPostPrice: 1.00
        }
      };
    }
  },

  /**
   * Verificar si un post puede ser promocionado
   */
  canBoostPost: (post) => {
    if (!post || !post.id) return false;
    
    // No se puede promocionar si ya está activo un boost
    if (post.isBoostActive || post.isFeatured) {
      return {
        canBoost: false,
        reason: 'El anuncio ya está promocionado'
      };
    }
    
    // Verificar que el post esté activo
    if (!post.isActive) {
      return {
        canBoost: false,
        reason: 'Solo se pueden promocionar anuncios activos'
      };
    }
    
    return {
      canBoost: true,
      reason: 'El anuncio puede ser promocionado',
      price: 1.00
    };
  },

  // ===================================================================
  // 🔄 FUNCIONES DE INTEGRACIÓN CON postsAPI EXISTENTE
  // ===================================================================

  /**
   * Extender postsAPI con funciones de pago
   */
  extendPostsAPI: () => {
    if (typeof postsAPI !== 'undefined') {
      // Agregar funciones de pago al postsAPI existente
      postsAPI.createAdditionalPostPayment = postsPaymentAPI.createAdditionalPostPayment;
      postsAPI.confirmAdditionalPostPayment = postsPaymentAPI.confirmAdditionalPostPayment;
      postsAPI.createBoostPayment = postsPaymentAPI.createBoostPayment;
      postsAPI.confirmBoostPayment = postsPaymentAPI.confirmBoostPayment;
      postsAPI.createPostWithPaymentFlow = postsPaymentAPI.createPostWithPaymentFlow;
      postsAPI.boostPostWithPaymentFlow = postsPaymentAPI.boostPostWithPaymentFlow;
      postsAPI.checkPostPaymentRequired = postsPaymentAPI.checkPostPaymentRequired;
      postsAPI.getPostLimitsInfo = postsPaymentAPI.getPostLimitsInfo;
      postsAPI.canBoostPost = postsPaymentAPI.canBoostPost;
      
      console.log('✅ postsAPI extended with payment functions');
    }
  },

  // ===================================================================
  // 🧪 FUNCIONES DE TESTING Y DEBUG
  // ===================================================================

  /**
   * Probar flujo completo de pagos
   */
  testPaymentFlow: async () => {
    try {
      console.log('🧪 === TESTING POSTS PAYMENT FLOW ===');
      
      const results = {};
      
      // 1. Test límites
      console.log('🧪 1. Testing post limits...');
      try {
        const limits = await postsPaymentAPI.getPostLimitsInfo();
        results.limits = {
          success: limits.success,
          needsPayment: limits.data?.needsPayment,
          freeRemaining: limits.data?.freePostsRemaining
        };
        console.log('✅ Limits test:', results.limits);
      } catch (error) {
        results.limits = { success: false, error: error.message };
        console.log('❌ Limits test failed:', error.message);
      }
      
      // 2. Test validación
      console.log('🧪 2. Testing post validation...');
      try {
        const testPostData = {
          title: 'Test Post',
          description: 'Test description for payment flow',
          phone: '+1234567890',
          age: 25,
          location: 'Test Location',
          sexo: 'Mujer'
        };
        
        const validation = postsPaymentAPI.validatePostForPayment(testPostData, []);
        results.validation = { isValid: validation.isValid };
        console.log('✅ Validation test:', results.validation);
      } catch (error) {
        results.validation = { isValid: false, error: error.message };
        console.log('❌ Validation test failed:', error.message);
      }
      
      console.log('🧪 === POSTS PAYMENT TESTING COMPLETE ===');
      console.log('🧪 Full results:', results);
      
      return {
        success: true,
        results,
        summary: {
          totalTests: Object.keys(results).length,
          successfulTests: Object.values(results).filter(r => r.success !== false).length,
          failedTests: Object.values(results).filter(r => r.success === false).length
        }
      };
      
    } catch (error) {
      console.error('❌ Posts payment testing failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};

// ===================================================================
// 🔗 AUTO-EXTEND postsAPI SI EXISTE
// ===================================================================

// Ejecutar automáticamente la extensión si postsAPI está disponible
if (typeof postsAPI !== 'undefined') {
  postsPaymentAPI.extendPostsAPI();
}

console.log('✅ POSTS PAYMENT API loaded - Ready for $1.00 real payments');
console.log('✅ API-BUSINESS.JS (MODULAR) v1.0.2 loaded successfully - Puntos y Premium corregidos + pointsAPI añadido');