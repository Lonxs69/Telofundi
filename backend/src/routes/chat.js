const express = require('express');
const router = express.Router();
const multer = require('multer');
const { AppError } = require('../middleware/errorHandler');
const { prisma } = require('../config/database');
const logger = require('../utils/logger');

// Middleware de autenticación
const { authenticate } = require('../middleware/auth');

// ✅ IMPORTAR VALIDACIONES EXISTENTES
const { 
  validateChatMessage,
  validatePagination
} = require('../middleware/validation');

// ✅ CONFIGURACIÓN DE UPLOAD OPTIMIZADA
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
      'audio/mpeg', 'audio/wav', 'audio/ogg',
      'video/mp4', 'video/mpeg', 'video/quicktime',
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Tipo de archivo no permitido en chat', 400, 'INVALID_FILE_TYPE'), false);
    }
  }
});

// ✅ MIDDLEWARE OPTIMIZADO PARA VALIDAR CAPACIDADES DE CHAT
const validateChatCapabilities = async (req, res, next) => {
  try {
    const user = req.user;
    const { messageType = 'TEXT', isPremiumMessage = false } = req.body;

    // Solo validar límites para clientes
    if (user.userType === 'CLIENT') {
      const client = user.client;
      if (!client) {
        return next(new AppError('Datos de cliente no encontrados', 500, 'CLIENT_DATA_MISSING'));
      }

      // Verificar y resetear límites diarios
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (!client.lastMessageReset || client.lastMessageReset < today) {
        await prisma.client.update({
          where: { id: client.id },
          data: {
            messagesUsedToday: 0,
            lastMessageReset: today
          }
        });
        client.messagesUsedToday = 0;
        client.lastMessageReset = today;
      }

      // Verificar límite diario (solo para clientes básicos)
      if (!client.isPremium && client.premiumTier === 'BASIC') {
        const dailyLimit = client.dailyMessageLimit || 5;
        if (client.messagesUsedToday >= dailyLimit) {
          return next(new AppError(
            `Has alcanzado tu límite diario de ${dailyLimit} mensajes. Actualiza a premium para mensajes ilimitados.`,
            400, 'DAILY_MESSAGE_LIMIT_REACHED'
          ));
        }
      }

      // Verificar capacidades según tipo de mensaje y tier
      const restrictions = {
        IMAGE: !client.canSendImages && !client.isPremium && client.premiumTier === 'BASIC',
        AUDIO: !client.canSendVoiceMessages && client.premiumTier !== 'VIP',
        VIDEO: client.premiumTier === 'BASIC',
        FILE: client.premiumTier === 'BASIC'
      };

      if (restrictions[messageType]) {
        const requiredTier = messageType === 'AUDIO' ? 'VIP' : 'Premium';
        return next(new AppError(
          `Los mensajes de tipo ${messageType} requieren cuenta ${requiredTier}.`, 
          403, `${messageType}_NOT_ALLOWED`
        ));
      }

      // Verificar mensajes premium
      if (isPremiumMessage && client.premiumTier === 'BASIC') {
        return next(new AppError(
          'Los mensajes premium requieren cuenta Premium o VIP.', 
          403, 'PREMIUM_MESSAGE_NOT_ALLOWED'
        ));
      }

      // Calcular costo en puntos (simplificado)
      let pointsCost = 0;
      if (!client.isPremium) {
        const costs = {
          TEXT: isPremiumMessage ? 5 : 1,
          IMAGE: isPremiumMessage ? 7 : 2,
          AUDIO: isPremiumMessage ? 9 : 4,
          VIDEO: isPremiumMessage ? 9 : 4,
          FILE: isPremiumMessage ? 8 : 3
        };
        pointsCost = costs[messageType] || 1;

        // Verificar puntos suficientes
        if (client.points < pointsCost) {
          return next(new AppError(
            'Puntos insuficientes para enviar mensaje', 
            400, 'INSUFFICIENT_POINTS'
          ));
        }
      }

      req.pointsCost = pointsCost;
      req.clientData = client;
    }

    next();
  } catch (error) {
    logger.error('Error validating chat capabilities:', error);
    next(new AppError('Error validando capacidades de chat', 500, 'CHAT_VALIDATION_ERROR'));
  }
};

// ✅ VALIDACIONES SIMPLIFICADAS Y OPTIMIZADAS
const validateFileUpload = (options = {}) => {
  return (req, res, next) => {
    if (!req.file && options.required) {
      return next(new AppError('Archivo requerido', 400, 'FILE_REQUIRED'));
    }
    
    if (req.file) {
      const { maxSize = 5 * 1024 * 1024 } = options;
      
      if (req.file.size > maxSize) {
        return next(new AppError(`Archivo muy grande. Máximo ${Math.round(maxSize/1024/1024)}MB`, 400, 'FILE_TOO_LARGE'));
      }

      // Validar tipo de mensaje según archivo
      const { messageType } = req.body;
      const fileType = req.file.mimetype;
      
      const typeValidations = {
        IMAGE: fileType.startsWith('image/'),
        AUDIO: fileType.startsWith('audio/'),
        VIDEO: fileType.startsWith('video/'),
        FILE: true // FILE acepta cualquier tipo permitido
      };

      if (messageType && messageType !== 'FILE' && !typeValidations[messageType]) {
        return next(new AppError(
          `Tipo de archivo no coincide con messageType ${messageType}`, 
          400, 'FILE_TYPE_MISMATCH'
        ));
      }
    }
    
    next();
  };
};

// ✅ VALIDACIONES ESPECÍFICAS PARA DISPUTAS
const validateDisputeMessage = (req, res, next) => {
  const { content } = req.body;
  
  if (!content || content.trim().length === 0) {
    return next(new AppError('Contenido del mensaje es requerido', 400, 'MISSING_MESSAGE_CONTENT'));
  }
  
  if (content.length > 1000) {
    return next(new AppError('Mensaje muy largo. Máximo 1000 caracteres en disputas', 400, 'MESSAGE_TOO_LONG'));
  }
  
  // No permitir archivos en disputas
  if (req.file) {
    return next(new AppError('No se permiten archivos en chats de disputa', 400, 'DISPUTE_NO_FILES'));
  }
  
  next();
};

const validateCreateDisputeChat = (req, res, next) => {
  const { escortId, agencyId, reason } = req.body;
  
  if (!escortId || !agencyId || !reason) {
    return next(new AppError('escortId, agencyId y reason son requeridos', 400, 'MISSING_REQUIRED_FIELDS'));
  }
  
  if (typeof reason !== 'string' || reason.trim().length < 10) {
    return next(new AppError('La razón debe tener al menos 10 caracteres', 400, 'REASON_TOO_SHORT'));
  }
  
  if (reason.length > 500) {
    return next(new AppError('La razón es muy larga. Máximo 500 caracteres', 400, 'REASON_TOO_LONG'));
  }
  
  next();
};

const validateCloseDisputeChat = (req, res, next) => {
  const { resolution, finalDecision } = req.body;
  
  if (!resolution || resolution.trim().length === 0) {
    return next(new AppError('Resolución es requerida', 400, 'MISSING_RESOLUTION'));
  }
  
  if (resolution.length < 20) {
    return next(new AppError('La resolución debe tener al menos 20 caracteres', 400, 'RESOLUTION_TOO_SHORT'));
  }
  
  if (resolution.length > 2000) {
    return next(new AppError('La resolución es muy larga. Máximo 2000 caracteres', 400, 'RESOLUTION_TOO_LONG'));
  }
  
  next();
};

const validateMessageSearch = (req, res, next) => {
  const { q: query, messageType, dateFrom, dateTo } = req.query;
  
  if (!query && !messageType && !dateFrom && !dateTo) {
    return next(new AppError('Al menos un criterio de búsqueda es requerido', 400, 'MISSING_SEARCH_CRITERIA'));
  }
  
  if (query && (typeof query !== 'string' || query.trim().length < 2)) {
    return next(new AppError('La búsqueda debe tener al menos 2 caracteres', 400, 'QUERY_TOO_SHORT'));
  }
  
  if (messageType && !['TEXT', 'IMAGE', 'FILE', 'AUDIO', 'VIDEO', 'SYSTEM'].includes(messageType)) {
    return next(new AppError('Tipo de mensaje inválido', 400, 'INVALID_MESSAGE_TYPE'));
  }
  
  if (dateFrom && isNaN(Date.parse(dateFrom))) {
    return next(new AppError('Fecha desde inválida', 400, 'INVALID_DATE_FROM'));
  }
  
  if (dateTo && isNaN(Date.parse(dateTo))) {
    return next(new AppError('Fecha hasta inválida', 400, 'INVALID_DATE_TO'));
  }
  
  if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
    return next(new AppError('La fecha desde no puede ser mayor que la fecha hasta', 400, 'INVALID_DATE_RANGE'));
  }
  
  next();
};

const validateChatMute = (req, res, next) => {
  const { mutedUntil } = req.body;
  
  if (mutedUntil) {
    if (isNaN(Date.parse(mutedUntil))) {
      return next(new AppError('Fecha de silenciado inválida', 400, 'INVALID_MUTE_DATE'));
    }
    
    const muteDate = new Date(mutedUntil);
    const now = new Date();
    
    if (muteDate <= now) {
      return next(new AppError('La fecha de silenciado debe ser en el futuro', 400, 'MUTE_DATE_IN_PAST'));
    }
    
    // Máximo 30 días de silencio
    const maxMuteDate = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
    if (muteDate > maxMuteDate) {
      return next(new AppError('No se puede silenciar por más de 30 días', 400, 'MUTE_DATE_TOO_FAR'));
    }
  }
  
  next();
};

// ✅ VALIDACIÓN PARA REPORTES
const validateReportMessage = (req, res, next) => {
  const { reason, description } = req.body;
  
  const validReasons = [
    'SPAM', 'INAPPROPRIATE_CONTENT', 'HARASSMENT', 'SCAM', 
    'FAKE_PROFILE', 'VIOLENCE', 'ADULT_CONTENT', 'OTHER'
  ];
  
  if (!reason || !validReasons.includes(reason)) {
    return next(new AppError('Razón de reporte inválida', 400, 'INVALID_REPORT_REASON'));
  }
  
  if (description && description.length > 1000) {
    return next(new AppError('Descripción muy larga. Máximo 1000 caracteres', 400, 'DESCRIPTION_TOO_LONG'));
  }
  
  if (reason === 'OTHER' && (!description || description.trim().length < 10)) {
    return next(new AppError('Descripción requerida para reportes de tipo "OTHER"', 400, 'DESCRIPTION_REQUIRED'));
  }
  
  next();
};

// ✅ CONTROLADORES IMPORTADOS (INCLUYE FUNCIONES DE DEBUG)
const {
  createOrGetChat,
  getChats,
  getChatMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  toggleChatArchive,
  toggleChatMute,
  searchMessages,
  getChatStats,
  reportMessage,
  createDisputeChat,
  getDisputeChats,
  closeDisputeChat,
  addDisputeMessage,
  createChatFromProfile,
  // ✅ FUNCIONES DE DEBUG IMPORTADAS
  debugChatPriority,
  checkUserPriority,
  activatePriorityManual
} = require('../controllers/chatController');

/**
 * @swagger
 * components:
 *   schemas:
 *     Chat:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "cm123chat456"
 *         name:
 *           type: string
 *           nullable: true
 *         isGroup:
 *           type: boolean
 *         isDisputeChat:
 *           type: boolean
 *         disputeStatus:
 *           type: string
 *           enum: [ACTIVE, RESOLVED, ESCALATED, CLOSED]
 *         members:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ChatMember'
 *         lastMessage:
 *           $ref: '#/components/schemas/Message'
 *         unreadCount:
 *           type: integer
 *         lastActivity:
 *           type: string
 *           format: date-time
 *         otherUser:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             firstName:
 *               type: string
 *             lastName:
 *               type: string
 *             username:
 *               type: string
 *             avatar:
 *               type: string
 *             userType:
 *               type: string
 *             client:
 *               type: object
 *               properties:
 *                 chatPriorityUntil:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *     Message:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         content:
 *           type: string
 *         messageType:
 *           type: string
 *           enum: [TEXT, IMAGE, FILE, AUDIO, VIDEO, SYSTEM]
 *         fileUrl:
 *           type: string
 *           nullable: true
 *         fileName:
 *           type: string
 *           nullable: true
 *         senderId:
 *           type: string
 *         receiverId:
 *           type: string
 *           nullable: true
 *         chatId:
 *           type: string
 *         isRead:
 *           type: boolean
 *         isPremiumMessage:
 *           type: boolean
 *         costPoints:
 *           type: integer
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *     ChatMember:
 *       type: object
 *       properties:
 *         userId:
 *           type: string
 *         chatId:
 *           type: string
 *         role:
 *           type: string
 *           enum: [ADMIN, MODERATOR, MEMBER]
 *         messageCount:
 *           type: integer
 *         maxMessages:
 *           type: integer
 *         lastRead:
 *           type: string
 *           format: date-time
 */

// ============================================================================
// 🎯 RUTAS PRINCIPALES DE CHAT
// ============================================================================

/**
 * @swagger
 * /api/chat:
 *   get:
 *     summary: Obtener lista de chats del usuario (con ordenamiento por prioridad)
 *     tags: [Chat]
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
 *           maximum: 100
 *       - in: query
 *         name: archived
 *         schema:
 *           type: boolean
 *           default: false
 *       - in: query
 *         name: includeDisputes
 *         schema:
 *           type: boolean
 *           default: false
 *     responses:
 *       200:
 *         description: Lista de chats obtenida exitosamente (ordenada por prioridad)
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
 *                     chats:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Chat'
 *                     pagination:
 *                       type: object
 */
router.get('/', authenticate, validatePagination, getChats);

/**
 * @swagger
 * /api/chat:
 *   post:
 *     summary: Crear o obtener chat con otro usuario
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - receiverId
 *             properties:
 *               receiverId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Chat obtenido o creado exitosamente
 */
router.post('/', authenticate, createOrGetChat);

/**
 * @swagger
 * /api/chat/profile/{userId}:
 *   post:
 *     summary: Crear chat desde perfil de usuario
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chat creado/encontrado exitosamente
 */
router.post('/profile/:userId', authenticate, createChatFromProfile);

// ============================================================================
// 🏛️ RUTAS DE DISPUTA (ADMIN ONLY)
// ============================================================================

/**
 * @swagger
 * /api/chat/dispute:
 *   post:
 *     summary: Crear chat tripartito para disputa (solo admins)
 *     tags: [Chat - Disputes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - escortId
 *               - agencyId
 *               - reason
 *             properties:
 *               escortId:
 *                 type: string
 *               agencyId:
 *                 type: string
 *               reason:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 500
 *     responses:
 *       201:
 *         description: Chat de disputa creado exitosamente
 */
router.post('/dispute', authenticate, validateCreateDisputeChat, createDisputeChat);

/**
 * @swagger
 * /api/chat/dispute:
 *   get:
 *     summary: Obtener chats de disputa (solo admins)
 *     tags: [Chat - Disputes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, RESOLVED, ESCALATED, CLOSED]
 *     responses:
 *       200:
 *         description: Lista de chats de disputa
 */
router.get('/dispute', authenticate, getDisputeChats);

/**
 * @swagger
 * /api/chat/dispute/{chatId}/close:
 *   post:
 *     summary: Cerrar chat de disputa (solo admins)
 *     tags: [Chat - Disputes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
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
 *               - resolution
 *             properties:
 *               resolution:
 *                 type: string
 *                 minLength: 20
 *                 maxLength: 2000
 *               finalDecision:
 *                 type: string
 *     responses:
 *       200:
 *         description: Chat de disputa cerrado exitosamente
 */
router.post('/dispute/:chatId/close', authenticate, validateCloseDisputeChat, closeDisputeChat);

/**
 * @swagger
 * /api/chat/dispute/{chatId}/messages:
 *   post:
 *     summary: Enviar mensaje en chat tripartito
 *     tags: [Chat - Disputes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
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
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 maxLength: 1000
 *     responses:
 *       201:
 *         description: Mensaje de disputa enviado exitosamente
 */
router.post('/dispute/:chatId/messages', authenticate, validateDisputeMessage, addDisputeMessage);

// ============================================================================
// 💬 RUTAS DE MENSAJES
// ============================================================================

/**
 * @swagger
 * /api/chat/{chatId}/messages:
 *   get:
 *     summary: Obtener mensajes de un chat
 *     tags: [Chat - Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *       - in: query
 *         name: before
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Mensajes obtenidos exitosamente
 */
router.get('/:chatId/messages', authenticate, validatePagination, getChatMessages);

/**
 * @swagger
 * /api/chat/{chatId}/messages:
 *   post:
 *     summary: Enviar mensaje a un chat
 *     tags: [Chat - Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
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
 *               content:
 *                 type: string
 *                 maxLength: 5000
 *               messageType:
 *                 type: string
 *                 enum: [TEXT, IMAGE, FILE, AUDIO, VIDEO]
 *                 default: TEXT
 *               replyToId:
 *                 type: string
 *                 nullable: true
 *               isPremiumMessage:
 *                 type: boolean
 *                 default: false
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *               messageType:
 *                 type: string
 *                 enum: [TEXT, IMAGE, FILE, AUDIO, VIDEO]
 *               file:
 *                 type: string
 *                 format: binary
 *               replyToId:
 *                 type: string
 *               isPremiumMessage:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Mensaje enviado exitosamente
 */
router.post('/:chatId/messages', 
  authenticate,
  validateChatCapabilities,
  upload.single('file'),
  validateFileUpload({
    maxSize: 5 * 1024 * 1024,
    required: false
  }),
  validateChatMessage,
  sendMessage
);

/**
 * @swagger
 * /api/chat/messages/{messageId}:
 *   put:
 *     summary: Editar mensaje
 *     tags: [Chat - Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
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
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 maxLength: 5000
 *     responses:
 *       200:
 *         description: Mensaje editado exitosamente
 */
router.put('/messages/:messageId', authenticate, editMessage);

/**
 * @swagger
 * /api/chat/messages/{messageId}:
 *   delete:
 *     summary: Eliminar mensaje
 *     tags: [Chat - Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Mensaje eliminado exitosamente
 */
router.delete('/messages/:messageId', authenticate, deleteMessage);

// ============================================================================
// ⚙️ RUTAS DE GESTIÓN DE CHAT
// ============================================================================

/**
 * @swagger
 * /api/chat/{chatId}/archive:
 *   post:
 *     summary: Archivar/desarchivar chat
 *     tags: [Chat - Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Estado de archivo actualizado
 */
router.post('/:chatId/archive', authenticate, toggleChatArchive);

/**
 * @swagger
 * /api/chat/{chatId}/mute:
 *   post:
 *     summary: Silenciar/desilenciar chat
 *     tags: [Chat - Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mutedUntil:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Estado de silenciado actualizado
 */
router.post('/:chatId/mute', authenticate, validateChatMute, toggleChatMute);

/**
 * @swagger
 * /api/chat/{chatId}/stats:
 *   get:
 *     summary: Obtener estadísticas del chat
 *     tags: [Chat - Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 */
router.get('/:chatId/stats', authenticate, getChatStats);

// ============================================================================
// 🔍 RUTAS DE BÚSQUEDA Y REPORTES
// ============================================================================

/**
 * @swagger
 * /api/chat/{chatId}/messages/search:
 *   get:
 *     summary: Buscar mensajes en un chat
 *     tags: [Chat - Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *           minLength: 2
 *       - in: query
 *         name: messageType
 *         schema:
 *           type: string
 *           enum: [TEXT, IMAGE, FILE, AUDIO, VIDEO, SYSTEM]
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
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
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Resultados de búsqueda obtenidos
 */
router.get('/:chatId/messages/search', authenticate, validateMessageSearch, validatePagination, searchMessages);

/**
 * @swagger
 * /api/chat/messages/{messageId}/report:
 *   post:
 *     summary: Reportar un mensaje
 *     tags: [Chat - Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
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
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 enum: [SPAM, INAPPROPRIATE_CONTENT, HARASSMENT, SCAM, FAKE_PROFILE, VIOLENCE, ADULT_CONTENT, OTHER]
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *     responses:
 *       200:
 *         description: Mensaje reportado exitosamente
 */
router.post('/messages/:messageId/report', authenticate, validateReportMessage, reportMessage);

// ============================================================================
// 🐛 RUTAS DE DEBUG PARA SISTEMA DE PRIORIDAD EN CHAT
// ============================================================================

/**
 * @swagger
 * /api/chat/debug/priority:
 *   get:
 *     summary: Debug del sistema de prioridad en chat
 *     description: Muestra información detallada de todos los chats del usuario con su estado de prioridad
 *     tags: [Chat - Debug]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Información detallada del sistema de prioridad
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
 *                     stats:
 *                       type: object
 *                       properties:
 *                         totalChats:
 *                           type: integer
 *                         chatsWithPriority:
 *                           type: integer
 *                         chatsWithoutPriority:
 *                           type: integer
 *                         currentTime:
 *                           type: string
 *                           format: date-time
 *                         priorityUsers:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               username:
 *                                 type: string
 *                               expiresAt:
 *                                 type: string
 *                                 format: date-time
 *                               remainingHours:
 *                                 type: number
 *                     chats:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           chatId:
 *                             type: string
 *                           otherUser:
 *                             type: object
 *                           priority:
 *                             type: object
 *                             properties:
 *                               hasPriority:
 *                                 type: boolean
 *                               chatPriorityUntil:
 *                                 type: string
 *                                 format: date-time
 *                               remainingHours:
 *                                 type: number
 */
router.get('/debug/priority', authenticate, debugChatPriority);

/**
 * @swagger
 * /api/chat/debug/user-priority/{userId}:
 *   get:
 *     summary: Verificar estado de prioridad de un usuario específico
 *     description: Verifica si un usuario tiene prioridad en chat activa y por cuánto tiempo
 *     tags: [Chat - Debug]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del usuario a verificar
 *     responses:
 *       200:
 *         description: Estado de prioridad del usuario
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
 *                     targetUser:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         username:
 *                           type: string
 *                         firstName:
 *                           type: string
 *                         userType:
 *                           type: string
 *                     priority:
 *                       type: object
 *                       properties:
 *                         hasPriority:
 *                           type: boolean
 *                         chatPriorityUntil:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *                         isActive:
 *                           type: boolean
 *                         remainingTime:
 *                           type: number
 *                         remainingHours:
 *                           type: number
 *                     client:
 *                       type: object
 *                       nullable: true
 *                     existingChat:
 *                       type: object
 *                       nullable: true
 *       404:
 *         description: Usuario no encontrado
 */
router.get('/debug/user-priority/:userId', authenticate, checkUserPriority);

/**
 * @swagger
 * /api/chat/debug/activate-priority:
 *   post:
 *     summary: Activar prioridad manualmente (solo admins)
 *     description: Permite a los administradores activar prioridad en chat para un cliente específico
 *     tags: [Chat - Debug]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - clientId
 *             properties:
 *               clientId:
 *                 type: string
 *                 description: ID del cliente al que activar la prioridad
 *               hours:
 *                 type: integer
 *                 default: 24
 *                 minimum: 1
 *                 maximum: 168
 *                 description: Horas de duración de la prioridad (máximo 1 semana)
 *     responses:
 *       200:
 *         description: Prioridad activada exitosamente
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
 *                     clientId:
 *                       type: string
 *                     clientUsername:
 *                       type: string
 *                     hours:
 *                       type: integer
 *                     activatedAt:
 *                       type: string
 *                       format: date-time
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                     remainingHours:
 *                       type: integer
 *       403:
 *         description: Solo administradores pueden activar prioridad manual
 *       404:
 *         description: Cliente no encontrado
 */
router.post('/debug/activate-priority', authenticate, activatePriorityManual);

// ============================================================================
// 🛠️ MIDDLEWARE DE MANEJO DE ERRORES ESPECÍFICO OPTIMIZADO
// ============================================================================

router.use((error, req, res, next) => {
  logger.error('Chat route error:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id
  });

  // Errores específicos de chat con respuestas mejoradas
  const chatErrors = {
    'INVALID_FILE_TYPE': {
      status: 400,
      message: 'Tipo de archivo no permitido en chat',
      details: 'Solo se permiten imágenes, audio, video y documentos específicos',
      allowedTypes: [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'audio/mpeg', 'audio/wav', 'audio/ogg',
        'video/mp4', 'video/mpeg', 'video/quicktime',
        'application/pdf', 'application/msword'
      ]
    },
    'FILE_TOO_LARGE': {
      status: 400,
      message: 'Archivo muy grande para chat',
      details: 'Máximo 5MB para archivos de chat'
    },
    'DISPUTE_MESSAGE_LIMIT': {
      status: 400,
      message: 'Límite de mensajes alcanzado en chat tripartito',
      details: 'Máximo 3 mensajes por usuario en chats de disputa'
    },
    'INSUFFICIENT_POINTS': {
      status: 400,
      message: 'Puntos insuficientes para enviar mensaje',
      details: 'Compra más puntos o espera hasta mañana para obtener puntos gratuitos'
    },
    'DAILY_MESSAGE_LIMIT_REACHED': {
      status: 400,
      message: error.message || 'Límite diario de mensajes alcanzado',
      details: 'Actualiza a premium para mensajes ilimitados'
    }
  };

  // Verificar si es un error específico de chat
  const chatError = chatErrors[error.code] || 
                   Object.values(chatErrors).find(e => error.message?.includes(e.message));

  if (chatError) {
    return res.status(chatError.status).json({
      success: false,
      message: chatError.message,
      errorCode: error.code || 'CHAT_ERROR',
      details: chatError.details,
      ...(chatError.allowedTypes && { allowedTypes: chatError.allowedTypes }),
      timestamp: new Date().toISOString()
    });
  }

  // Errores de validación de multer
  if (error.message?.includes('File too large')) {
    return res.status(400).json({
      success: false,
      message: 'Archivo muy grande',
      errorCode: 'FILE_TOO_LARGE',
      details: 'Máximo 5MB para archivos de chat',
      timestamp: new Date().toISOString()
    });
  }

  if (error.message?.includes('Unexpected field')) {
    return res.status(400).json({
      success: false,
      message: 'Campo de archivo no esperado',
      errorCode: 'UNEXPECTED_FILE_FIELD',
      details: 'Use el campo "file" para subir archivos',
      timestamp: new Date().toISOString()
    });
  }

  // Pasar otros errores al siguiente middleware
  next(error);
});

// ============================================================================
// 📝 LOG DE CONFIGURACIÓN COMPLETADA
// ============================================================================

logger.info('✅ Chat routes configured with complete optimized features including priority system');
logger.info('🐛 Debug routes available: /debug/priority, /debug/user-priority/:userId, /debug/activate-priority');

module.exports = router;