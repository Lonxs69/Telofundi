const express = require('express');
const router = express.Router();

// Middleware
const { authenticate } = require('../middleware/auth');

// ✅ CONTROLLERS - TODAS LAS FUNCIONES IMPORTADAS
const {
  searchAgencies,
  requestToJoinAgency,
  cancelOwnRequest, // ✅ NUEVA FUNCIÓN AÑADIDA
  inviteEscort,
  respondToInvitation,
  manageMembershipRequest,
  getAgencyEscorts,
  getVerificationPricing,
  verifyEscort,
  getAgencyStats,
  getEscortInvitations,
  getEscortMembershipStatus,
  leaveCurrentAgency,
  renewEscortVerification,
  getExpiringVerifications,
  cleanupObsoleteRequests
} = require('../controllers/agencyController');

/**
 * @swagger
 * components:
 *   schemas:
 *     Agency:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         user:
 *           $ref: '#/components/schemas/User'
 *         isVerified:
 *           type: boolean
 *         totalEscorts:
 *           type: integer
 *         verifiedEscorts:
 *           type: integer
 *         activeEscorts:
 *           type: integer
 *         defaultCommissionRate:
 *           type: number
 *           format: float
 *     
 *     AgencyInvitation:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         agencyId:
 *           type: string
 *         escortId:
 *           type: string
 *         status:
 *           type: string
 *           enum: [PENDING, ACCEPTED, REJECTED, EXPIRED, CANCELLED]
 *         message:
 *           type: string
 *         proposedCommission:
 *           type: number
 *           format: float
 *         proposedRole:
 *           type: string
 *           enum: [OWNER, ADMIN, MANAGER, MEMBER]
 *         expiresAt:
 *           type: string
 *           format: date-time
 *     
 *     MembershipStatus:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [independent, agency, pending]
 *         hasActiveMembership:
 *           type: boolean
 *         hasPendingRequests:
 *           type: boolean
 *         currentAgency:
 *           type: object
 *           nullable: true
 *         pendingRequests:
 *           type: array
 *           items:
 *             type: object
 *     
 *     VerificationPricing:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *           example: "Premium Verification"
 *         cost:
 *           type: number
 *           example: 49.99
 *         description:
 *           type: string
 *           example: "Verificación premium con beneficios adicionales"
 *         features:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Badge verificado", "Prioridad en búsquedas", "Soporte premium"]
 *         duration:
 *           type: integer
 *           nullable: true
 *           example: 365
 *           description: "Duración en días (null = permanente)"
 *         isActive:
 *           type: boolean
 *           example: true
 *     
 *     CleanupResult:
 *       type: object
 *       properties:
 *         totalCleaned:
 *           type: integer
 *           description: "Total de solicitudes canceladas"
 *         affectedEscorts:
 *           type: integer
 *           description: "Número de escorts afectados"
 *         details:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               escortId:
 *                 type: string
 *               escortName:
 *                 type: string
 *               activeAgency:
 *                 type: string
 *               cancelledRequests:
 *                 type: integer
 *               affectedAgencies:
 *                 type: array
 *                 items:
 *                   type: string
 *     
 *     CancelledRequest:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: "ID de la solicitud cancelada"
 *         status:
 *           type: string
 *           enum: [CANCELLED]
 *         cancelledAt:
 *           type: string
 *           format: date-time
 *         agency:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             name:
 *               type: string
 */

/**
 * @swagger
 * /api/agency/search:
 *   get:
 *     summary: Buscar agencias (para escorts)
 *     tags: [Agency]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Término de búsqueda
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filtrar por ubicación
 *       - in: query
 *         name: verified
 *         schema:
 *           type: boolean
 *         description: Solo agencias verificadas
 *       - in: query
 *         name: minEscorts
 *         schema:
 *           type: integer
 *         description: Mínimo número de escorts
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [relevance, newest, oldest, escorts, verified]
 *           default: relevance
 *     responses:
 *       200:
 *         description: Lista de agencias encontradas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     agencies:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Agency'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 */
router.get('/search', searchAgencies);

/**
 * @swagger
 * /api/agency/verification/pricing:
 *   get:
 *     summary: Obtener precios de verificación disponibles (agencias)
 *     tags: [Agency]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Precios de verificación obtenidos exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/VerificationPricing'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/verification/pricing', authenticate, getVerificationPricing);

// ===================================================================
// ✅ RUTAS PARA ESCORTS
// ===================================================================

/**
 * @swagger
 * /api/agency/{agencyId}/join:
 *   post:
 *     summary: Solicitar unirse a una agencia (escort)
 *     tags: [Agency - Escort]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agencyId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del usuario de la agencia (userId, no agency.id)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 description: Mensaje opcional para la agencia
 *                 maxLength: 500
 *     responses:
 *       201:
 *         description: Solicitud enviada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     membership:
 *                       type: object
 *       403:
 *         description: Solo escorts pueden solicitar unirse
 *       409:
 *         description: Ya existe una membresía activa o pendiente
 */
router.post('/:agencyId/join', authenticate, requestToJoinAgency);

/**
 * @swagger
 * /api/agency/escort/requests/{membershipId}/cancel:
 *   delete:
 *     summary: Cancelar solicitud propia (escort) - NUEVA FUNCIÓN
 *     tags: [Agency - Escort]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: membershipId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la solicitud de membresía a cancelar
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Razón opcional para cancelar la solicitud
 *                 maxLength: 500
 *                 example: "Encontré otra agencia que se adapta mejor a mis necesidades"
 *     responses:
 *       200:
 *         description: Solicitud cancelada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Solicitud cancelada exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     membership:
 *                       $ref: '#/components/schemas/CancelledRequest'
 *       403:
 *         description: Solo escorts pueden cancelar sus solicitudes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Solo escorts pueden cancelar sus solicitudes"
 *                 errorCode:
 *                   type: string
 *                   example: "ESCORT_ONLY"
 *       404:
 *         description: Solicitud no encontrada o no se puede cancelar
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Solicitud no encontrada o no se puede cancelar"
 *                 errorCode:
 *                   type: string
 *                   example: "REQUEST_NOT_FOUND"
 */
router.delete('/escort/requests/:membershipId/cancel', authenticate, cancelOwnRequest);

/**
 * @swagger
 * /api/agency/escort/invitations:
 *   get:
 *     summary: Obtener invitaciones recibidas (escort)
 *     tags: [Agency - Escort]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, ACCEPTED, REJECTED]
 *           default: PENDING
 *     responses:
 *       200:
 *         description: Lista de invitaciones recibidas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     invitations:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AgencyInvitation'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       403:
 *         description: Solo escorts pueden ver sus invitaciones
 */
router.get('/escort/invitations', authenticate, getEscortInvitations);

/**
 * @swagger
 * /api/agency/escort/membership/status:
 *   get:
 *     summary: Obtener estado de membresía del escort
 *     tags: [Agency - Escort]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estado actual de membresía
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/MembershipStatus'
 *       403:
 *         description: Solo escorts pueden ver su estado de membresía
 */
router.get('/escort/membership/status', authenticate, getEscortMembershipStatus);

/**
 * @swagger
 * /api/agency/escort/membership/leave:
 *   post:
 *     summary: Salir de agencia actual (escort)
 *     tags: [Agency - Escort]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Razón opcional para dejar la agencia
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Has dejado la agencia exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     formerAgency:
 *                       type: string
 *                     leftAt:
 *                       type: string
 *                       format: date-time
 *                     verificationRemoved:
 *                       type: boolean
 *       403:
 *         description: Solo escorts pueden salir de agencias
 *       404:
 *         description: No tienes una membresía activa en ninguna agencia
 *       409:
 *         description: No puedes dejar la agencia durante el período de gracia
 */
router.post('/escort/membership/leave', authenticate, leaveCurrentAgency);

/**
 * @swagger
 * /api/agency/invitations/{invitationId}/respond:
 *   put:
 *     summary: Responder a invitación de agencia (escort)
 *     tags: [Agency - Escort]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: invitationId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [accept, reject]
 *               message:
 *                 type: string
 *                 description: Mensaje opcional de respuesta
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Respuesta procesada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     invitation:
 *                       type: object
 *                     membership:
 *                       type: object
 *                       nullable: true
 *                     cancelledOtherRequests:
 *                       type: integer
 *                       description: "Número de otras solicitudes canceladas automáticamente"
 *       403:
 *         description: Solo escorts pueden responder invitaciones
 *       404:
 *         description: Invitación no encontrada o expirada
 *       409:
 *         description: No puedes aceptar - ya tienes membresía activa o solicitudes pendientes
 */
router.put('/invitations/:invitationId/respond', authenticate, respondToInvitation);

// ===================================================================
// ✅ RUTAS PARA AGENCIAS
// ===================================================================

/**
 * @swagger
 * /api/agency/escorts/{escortId}/invite:
 *   post:
 *     summary: Invitar escort a la agencia
 *     tags: [Agency]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: escortId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 maxLength: 500
 *               proposedCommission:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 maximum: 1
 *                 default: 0.1
 *               proposedRole:
 *                 type: string
 *                 enum: [MEMBER, MANAGER]
 *                 default: MEMBER
 *               proposedBenefits:
 *                 type: object
 *                 description: "Beneficios propuestos (JSON)"
 *     responses:
 *       201:
 *         description: Invitación enviada exitosamente
 *       403:
 *         description: Solo agencias pueden invitar escorts
 *       409:
 *         description: Ya existe una invitación, membresía, o el escort ya pertenece a otra agencia
 */
router.post('/escorts/:escortId/invite', authenticate, inviteEscort);

/**
 * @swagger
 * /api/agency/memberships/{membershipId}/manage:
 *   put:
 *     summary: Gestionar solicitud de membresía (agencia) - MEJORADO
 *     tags: [Agency]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: membershipId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [approve, reject]
 *               message:
 *                 type: string
 *                 maxLength: 500
 *               commissionRate:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 maximum: 1
 *                 default: 0.15
 *     responses:
 *       200:
 *         description: Solicitud procesada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     membership:
 *                       type: object
 *                     cancelledOtherRequests:
 *                       type: integer
 *                       description: "Solicitudes canceladas automáticamente"
 *       403:
 *         description: Solo agencias pueden gestionar membresías
 *       404:
 *         description: Solicitud no encontrada
 *       409:
 *         description: El escort ya fue aceptado en otra agencia
 */
router.put('/memberships/:membershipId/manage', authenticate, manageMembershipRequest);

/**
 * @swagger
 * /api/agency/escorts:
 *   get:
 *     summary: Obtener escorts de la agencia - FILTRADO MEJORADO
 *     tags: [Agency]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, pending, all]
 *           default: active
 *         description: "pending = solicitudes recibidas, active = miembros actuales"
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar por nombre o username
 *     responses:
 *       200:
 *         description: Lista de escorts de la agencia (filtrada automáticamente)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     escorts:
 *                       type: array
 *                       items:
 *                         type: object
 *                       description: "Solo escorts válidos (sin membresía activa en otras agencias)"
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *                 message:
 *                   type: string
 *                   description: "Información sobre filtros aplicados"
 *       403:
 *         description: Solo agencias pueden ver sus escorts
 */
router.get('/escorts', authenticate, getAgencyEscorts);

/**
 * @swagger
 * /api/agency/escorts/{escortId}/verify:
 *   post:
 *     summary: Verificar escort (agencia) - FUNCIÓN CLAVE
 *     tags: [Agency]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: escortId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pricingId
 *             properties:
 *               pricingId:
 *                 type: string
 *                 description: ID del plan de verificación
 *               verificationNotes:
 *                 type: string
 *                 description: Notas adicionales sobre la verificación
 *                 maxLength: 1000
 *     responses:
 *       200:
 *         description: Escort verificado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     verification:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         status:
 *                           type: string
 *                         completedAt:
 *                           type: string
 *                           format: date-time
 *                         expiresAt:
 *                           type: string
 *                           format: date-time
 *                         isRenewal:
 *                           type: boolean
 *                         pricing:
 *                           type: object
 *                         escort:
 *                           type: object
 *                         agency:
 *                           type: object
 *       403:
 *         description: Solo agencias pueden verificar escorts
 *       404:
 *         description: Escort no es miembro activo de la agencia
 *       409:
 *         description: Escort ya está verificado
 */
router.post('/escorts/:escortId/verify', authenticate, verifyEscort);

/**
 * @swagger
 * /api/agency/escorts/{escortId}/verify/renew:
 *   post:
 *     summary: Renovar verificación de escort
 *     tags: [Agency]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: escortId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pricingId
 *             properties:
 *               pricingId:
 *                 type: string
 *                 description: ID del plan de verificación
 *     responses:
 *       200:
 *         description: Verificación renovada exitosamente
 *       400:
 *         description: La verificación aún no necesita renovación
 *       403:
 *         description: Solo agencias pueden renovar verificaciones
 */
router.post('/escorts/:escortId/verify/renew', authenticate, renewEscortVerification);

/**
 * @swagger
 * /api/agency/verifications/expiring:
 *   get:
 *     summary: Obtener verificaciones próximas a expirar
 *     tags: [Agency]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Lista de verificaciones próximas a expirar
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     expiringVerifications:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           escortId:
 *                             type: string
 *                           name:
 *                             type: string
 *                           daysUntilExpiry:
 *                             type: integer
 *                           isUrgent:
 *                             type: boolean
 *                             description: "Expira en 3 días o menos"
 *                     summary:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         urgent:
 *                           type: integer
 *       403:
 *         description: Solo agencias pueden ver verificaciones
 */
router.get('/verifications/expiring', authenticate, getExpiringVerifications);

/**
 * @swagger
 * /api/agency/stats:
 *   get:
 *     summary: Obtener estadísticas de la agencia
 *     tags: [Agency]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas de la agencia
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     memberships:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         byStatus:
 *                           type: object
 *                         active:
 *                           type: integer
 *                         pending:
 *                           type: integer
 *                     invitations:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         byStatus:
 *                           type: object
 *                         pending:
 *                           type: integer
 *                         accepted:
 *                           type: integer
 *                         rejected:
 *                           type: integer
 *                     verifications:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         totalRevenue:
 *                           type: number
 *                         averageCost:
 *                           type: number
 *                     topEscorts:
 *                       type: array
 *                       items:
 *                         type: object
 *       403:
 *         description: Solo agencias pueden ver estadísticas
 */
router.get('/stats', authenticate, getAgencyStats);

// ===================================================================
// ✅ RUTAS DE ADMINISTRACIÓN Y MANTENIMIENTO
// ===================================================================

/**
 * @swagger
 * /api/agency/admin/cleanup-requests:
 *   post:
 *     summary: Limpiar solicitudes obsoletas (ADMIN) - NUEVA FUNCIÓN
 *     tags: [Agency - Admin]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Cancela automáticamente todas las solicitudes pendientes de escorts 
 *       que ya tienen membresía activa en otra agencia. Útil para casos como 
 *       el de María García que aparece en bandejas cuando ya está en una agencia.
 *     responses:
 *       200:
 *         description: Limpieza completada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/CleanupResult'
 *       403:
 *         description: Solo administradores pueden ejecutar limpieza
 *       500:
 *         description: Error ejecutando limpieza
 */
router.post('/admin/cleanup-requests', authenticate, cleanupObsoleteRequests);

/**
 * @swagger
 * /api/agency/admin/system-health:
 *   get:
 *     summary: Verificar salud del sistema de agencias (ADMIN)
 *     tags: [Agency - Admin]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Verifica la integridad del sistema de agencias:
 *       - Escorts con múltiples membresías activas
 *       - Solicitudes pendientes obsoletas
 *       - Inconsistencias en contadores
 *     responses:
 *       200:
 *         description: Reporte de salud del sistema
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     duplicateActiveMemberships:
 *                       type: array
 *                       description: "Escorts con múltiples membresías activas"
 *                     obsoletePendingRequests:
 *                       type: array
 *                       description: "Solicitudes pendientes de escorts ya en agencias"
 *                     inconsistentCounters:
 *                       type: array
 *                       description: "Agencias con contadores incorrectos"
 *                     recommendations:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: "Acciones recomendadas"
 *       403:
 *         description: Solo administradores pueden ver salud del sistema
 */
router.get('/admin/system-health', authenticate, async (req, res) => {
  if (req.user.userType !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Solo administradores pueden ver la salud del sistema',
      errorCode: 'ADMIN_ONLY'
    });
  }

  try {
    const { prisma } = require('../config/database');
    
    // 1. Buscar escorts con múltiples membresías activas
    const duplicateActive = await prisma.escort.findMany({
      where: {
        agencyMemberships: {
          some: { status: 'ACTIVE' }
        }
      },
      include: {
        agencyMemberships: {
          where: { status: 'ACTIVE' },
          include: {
            agency: {
              include: {
                user: { select: { firstName: true, lastName: true } }
              }
            }
          }
        },
        user: { select: { firstName: true, lastName: true } }
      }
    });

    const problematicEscorts = duplicateActive.filter(escort => 
      escort.agencyMemberships.length > 1
    );

    // 2. Buscar solicitudes pendientes obsoletas
    const obsoleteRequests = await prisma.agencyMembership.findMany({
      where: {
        status: 'PENDING',
        escort: {
          agencyMemberships: {
            some: { status: 'ACTIVE' }
          }
        }
      },
      include: {
        escort: {
          include: {
            user: { select: { firstName: true, lastName: true } },
            agencyMemberships: {
              where: { status: 'ACTIVE' },
              include: {
                agency: {
                  include: {
                    user: { select: { firstName: true, lastName: true } }
                  }
                }
              }
            }
          }
        },
        agency: {
          include: {
            user: { select: { firstName: true, lastName: true } }
          }
        }
      }
    });

    // 3. Generar recomendaciones
    const recommendations = [];
    
    if (problematicEscorts.length > 0) {
      recommendations.push(`Encontrados ${problematicEscorts.length} escorts con múltiples membresías activas - requiere investigación manual`);
    }
    
    if (obsoleteRequests.length > 0) {
      recommendations.push(`Ejecutar limpieza automática para cancelar ${obsoleteRequests.length} solicitudes obsoletas`);
      recommendations.push('Usar endpoint POST /api/agency/admin/cleanup-requests');
    }
    
    if (problematicEscorts.length === 0 && obsoleteRequests.length === 0) {
      recommendations.push('✅ Sistema de agencias funcionando correctamente');
    }

    res.status(200).json({
      success: true,
      data: {
        duplicateActiveMemberships: problematicEscorts.map(escort => ({
          escortId: escort.id,
          escortName: `${escort.user.firstName} ${escort.user.lastName}`,
          activeMemberships: escort.agencyMemberships.map(m => ({
            membershipId: m.id,
            agencyName: `${m.agency.user.firstName} ${m.agency.user.lastName}`,
            joinedAt: m.createdAt
          }))
        })),
        obsoletePendingRequests: obsoleteRequests.map(req => ({
          requestId: req.id,
          escortName: `${req.escort.user.firstName} ${req.escort.user.lastName}`,
          requestingAgency: `${req.agency.user.firstName} ${req.agency.user.lastName}`,
          currentAgency: req.escort.agencyMemberships[0] ? 
            `${req.escort.agencyMemberships[0].agency.user.firstName} ${req.escort.agencyMemberships[0].agency.user.lastName}` : 
            'Sin agencia activa',
          requestDate: req.createdAt
        })),
        summary: {
          totalIssues: problematicEscorts.length + obsoleteRequests.length,
          duplicateMembers: problematicEscorts.length,
          obsoleteRequests: obsoleteRequests.length
        },
        recommendations
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('System health check failed:', error);
    res.status(500).json({
      success: false,
      message: 'Error verificando salud del sistema',
      errorCode: 'SYSTEM_HEALTH_ERROR'
    });
  }
});

module.exports = router;