const { prisma } = require('../config/database');
const { AppError, catchAsync } = require('../middleware/errorHandler');
const { sanitizeString } = require('../utils/validators');
const { uploadToCloudinary, deleteFromCloudinary } = require('../services/uploadService');
const chatService = require('../services/chatService');
const logger = require('../utils/logger');

// ✅ HELPERS OPTIMIZADOS CON PRIORIDAD CORREGIDA
const getUserSelect = () => ({
  id: true, firstName: true, lastName: true, username: true, 
  avatar: true, userType: true, lastActiveAt: true
});

// ✅ CORREGIDO: getChatInclude ahora incluye correctamente los datos del cliente
const getChatInclude = (includeMessages = true) => ({
  members: {
    include: { 
      user: { 
        select: {
          ...getUserSelect(),
          // ✅ CRÍTICO: Incluir datos del cliente para chat priority
          client: {
            select: {
              id: true,
              chatPriorityUntil: true,
              points: true,
              premiumTier: true,
              isPremium: true
            }
          }
        }
      } 
    }
  },
  ...(includeMessages && {
    messages: {
      take: 1, orderBy: { createdAt: 'desc' },
      select: {
        content: true, createdAt: true, messageType: true,
        sender: { select: { firstName: true, userType: true } }
      }
    }
  }),
  _count: {
    select: {
      messages: { where: { isRead: false } }
    }
  }
});

const validateChatAccess = async (userId, chatId) => {
  const member = await prisma.chatMember.findUnique({
    where: { userId_chatId: { userId, chatId } },
    include: { chat: { select: { isDisputeChat: true, disputeStatus: true } } }
  });
  
  if (!member) throw new AppError('No tienes acceso a este chat', 403, 'CHAT_ACCESS_DENIED');
  return member;
};

const checkUserBlocking = async (userId1, userId2) => {
  const [blocked, hasBlocked] = await Promise.all([
    prisma.userBlock.findUnique({
      where: { blockerId_blockedId: { blockerId: userId2, blockedId: userId1 } }
    }),
    prisma.userBlock.findUnique({
      where: { blockerId_blockedId: { blockerId: userId1, blockedId: userId2 } }
    })
  ]);

  if (blocked) throw new AppError('No puedes enviar mensajes a este usuario', 403, 'USER_BLOCKED_YOU');
  if (hasBlocked) throw new AppError('Has bloqueado a este usuario', 403, 'YOU_BLOCKED_USER');
};

const validateUserCanChat = async (senderId, receiverId) => {
  if (senderId === receiverId) {
    throw new AppError('No puedes chatear contigo mismo', 400, 'CANNOT_CHAT_WITH_SELF');
  }

  const receiver = await prisma.user.findUnique({
    where: { id: receiverId, isActive: true, isBanned: false },
    include: {
      settings: { select: { allowDirectMessages: true } }
    }
  });

  if (!receiver) throw new AppError('Usuario no encontrado o no disponible', 404, 'USER_NOT_FOUND');
  if (!receiver.settings?.allowDirectMessages) {
    throw new AppError('El usuario no permite mensajes directos', 403, 'DIRECT_MESSAGES_DISABLED');
  }

  await checkUserBlocking(senderId, receiverId);
  return receiver;
};

// ✅ FUNCIÓN HELPER PARA VERIFICAR CHAT PRIORITY - CORREGIDA
const hasChatPriority = (user) => {
  if (!user?.client?.chatPriorityUntil) {
    return false;
  }
  
  const now = new Date();
  const priorityUntil = new Date(user.client.chatPriorityUntil);
  
  return priorityUntil > now;
};

// ✅ FUNCIÓN HELPER PARA ORDENAR CHATS CON PRIORIDAD - CORREGIDA
const sortChatsWithPriority = (chats, currentUserId) => {
  return chats.sort((a, b) => {
    // Obtener el otro usuario en cada chat
    const otherUserA = a.members?.find(member => member.userId !== currentUserId)?.user;
    const otherUserB = b.members?.find(member => member.userId !== currentUserId)?.user;
    
    // Verificar si tienen chat priority activo
    const aPriority = hasChatPriority(otherUserA);
    const bPriority = hasChatPriority(otherUserB);
    
    // Log para debugging
    logger.debug('Sorting chats with priority', {
      chatA: a.id,
      userA: otherUserA?.username,
      priorityA: aPriority,
      priorityUntilA: otherUserA?.client?.chatPriorityUntil,
      chatB: b.id,
      userB: otherUserB?.username,
      priorityB: bPriority,
      priorityUntilB: otherUserB?.client?.chatPriorityUntil
    });
    
    // Si uno tiene prioridad y otro no, el que tiene prioridad va primero
    if (aPriority && !bPriority) return -1;
    if (!aPriority && bPriority) return 1;
    
    // Si ambos tienen prioridad o ninguno la tiene, ordenar por lastActivity
    const dateA = new Date(a.lastActivity || a.createdAt);
    const dateB = new Date(b.lastActivity || b.createdAt);
    
    return dateB - dateA; // Más reciente primero
  });
};

// ✅ CREAR CHAT DESDE PERFIL
const createChatFromProfile = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.user.id;

  const targetUser = await validateUserCanChat(currentUserId, userId);

  // Verificar límites de cliente si aplica
  if (req.user.userType === 'CLIENT') {
    const canCreate = await chatService.canCreateNewChat(currentUserId, req.user.userType);
    if (!canCreate.canCreate) {
      throw new AppError(canCreate.error, 400, 'CHAT_LIMIT_REACHED');
    }
  }

  // Buscar o crear chat
  let chat = await prisma.chat.findFirst({
    where: {
      isGroup: false, isDisputeChat: false,
      AND: [
        { members: { some: { userId: currentUserId } } },
        { members: { some: { userId } } }
      ]
    },
    include: getChatInclude(false)
  });

  let isNewChat = false;

  if (!chat) {
    chat = await prisma.chat.create({
      data: {
        isGroup: false, isPrivate: true, isDisputeChat: false,
        members: {
          create: [
            { userId: currentUserId, role: 'MEMBER' },
            { userId, role: 'MEMBER' }
          ]
        }
      },
      include: getChatInclude(false)
    });
    isNewChat = true;

    // Crear interacción para algoritmos
    try {
      await prisma.userInteraction.create({
        data: {
          userId: currentUserId, targetUserId: userId, type: 'CHAT',
          weight: 3.0, source: 'profile',
          deviceType: req.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'desktop'
        }
      });
    } catch (error) {
      logger.warn('Failed to create interaction:', error);
    }
  } else {
    await prisma.chat.update({
      where: { id: chat.id },
      data: { lastActivity: new Date() }
    });
  }

  // Marcar chat como prioritario si es cliente premium
  if (req.user.userType === 'CLIENT' && req.user.client) {
    try {
      await chatService.markChatAsPriority(chat.id, userId, req.user.client.id);
    } catch (error) {
      logger.warn('Failed to mark chat as priority:', error);
    }
  }

  // ✅ FORMATEAR RESPUESTA CON INFORMACIÓN DE PRIORIDAD
  const otherUser = chat.members?.find(member => member.userId !== currentUserId)?.user;

  logger.info(`${isNewChat ? 'New' : 'Existing'} chat opened from profile`, {
    chatId: chat.id, currentUserId, targetUserId: userId,
    otherUserHasPriority: hasChatPriority(otherUser)
  });

  res.status(200).json({
    success: true,
    message: isNewChat ? 'Chat iniciado exitosamente' : 'Chat abierto exitosamente',
    data: {
      chatId: chat.id, isNewChat,
      otherUser: {
        id: targetUser.id, firstName: targetUser.firstName, lastName: targetUser.lastName,
        username: targetUser.username, avatar: targetUser.avatar, 
        userType: targetUser.userType, lastActiveAt: targetUser.lastActiveAt
      },
      redirectUrl: `/chat/${chat.id}`
    },
    timestamp: new Date().toISOString()
  });
});

// ✅ CREAR CHAT TRIPARTITO (ADMINS) - MANTENIDO
const createDisputeChat = catchAsync(async (req, res) => {
  const { escortId, agencyId, reason } = req.body;
  const adminId = req.user.id;

  if (req.user.userType !== 'ADMIN') {
    throw new AppError('Solo administradores pueden crear chats de disputa', 403, 'ADMIN_ONLY');
  }

  const membership = await prisma.agencyMembership.findFirst({
    where: { escortId, agencyId, status: 'ACTIVE' },
    include: {
      escort: { include: { user: { select: getUserSelect() } } },
      agency: { include: { user: { select: getUserSelect() } } }
    }
  });

  if (!membership) {
    throw new AppError('No existe una relación activa entre el escort y la agencia', 400, 'NO_ACTIVE_MEMBERSHIP');
  }

  const existingDispute = await prisma.chat.findFirst({
    where: {
      isDisputeChat: true, disputeStatus: 'ACTIVE',
      members: {
        every: {
          userId: { in: [adminId, membership.escort.user.id, membership.agency.user.id] }
        }
      }
    }
  });

  if (existingDispute) {
    throw new AppError('Ya existe un chat de disputa activo entre estos usuarios', 400, 'DISPUTE_ALREADY_EXISTS');
  }

  const disputeChat = await prisma.chat.create({
    data: {
      isGroup: true, isDisputeChat: true, disputeStatus: 'ACTIVE', disputeReason: reason,
      name: `Disputa: ${membership.escort.user.firstName} - ${membership.agency.user.firstName}`,
      description: `Chat tripartito para resolver disputa. Razón: ${reason}`,
      members: {
        create: [
          { userId: adminId, role: 'ADMIN', maxMessages: 10 },
          { userId: membership.escort.user.id, role: 'MEMBER', maxMessages: 3 },
          { userId: membership.agency.user.id, role: 'MEMBER', maxMessages: 3 }
        ]
      }
    },
    include: getChatInclude(false)
  });

  // Mensaje inicial del sistema
  await prisma.message.create({
    data: {
      content: `Chat de disputa iniciado por el administrador. Razón: ${reason}. Cada parte puede enviar máximo 3 mensajes para exponer su caso.`,
      messageType: 'SYSTEM', senderId: adminId, chatId: disputeChat.id
    }
  });

  await chatService.createDisputeNotification(
    disputeChat.id,
    [membership.escort.user.id, membership.agency.user.id],
    'DISPUTE_CREATED',
    `Se ha creado un chat de disputa. Razón: ${reason}`
  );

  logger.info('Dispute chat created', { chatId: disputeChat.id, adminId, escortId, agencyId, reason });

  res.status(201).json({
    success: true,
    message: 'Chat de disputa creado exitosamente',
    data: { chat: disputeChat },
    timestamp: new Date().toISOString()
  });
});

// ✅ OBTENER CHATS DE DISPUTA (ADMINS) - MANTENIDO
const getDisputeChats = catchAsync(async (req, res) => {
  const { status = 'ACTIVE' } = req.query;
  const userId = req.user.id;

  if (req.user.userType !== 'ADMIN') {
    throw new AppError('Solo administradores pueden ver chats de disputa', 403, 'ADMIN_ONLY');
  }

  const [disputeChats, summary] = await Promise.all([
    prisma.chat.findMany({
      where: {
        isDisputeChat: true,
        ...(status && { disputeStatus: status }),
        members: { some: { userId } }
      },
      include: getChatInclude(),
      orderBy: { createdAt: 'desc' }
    }),
    chatService.getDisputeChatsummary()
  ]);

  res.status(200).json({
    success: true,
    data: { disputeChats, summary, total: disputeChats.length },
    timestamp: new Date().toISOString()
  });
});

// ✅ CERRAR CHAT DE DISPUTA (ADMINS) - MANTENIDO
const closeDisputeChat = catchAsync(async (req, res) => {
  const { chatId } = req.params;
  const { resolution, finalDecision } = req.body;
  const adminId = req.user.id;

  if (req.user.userType !== 'ADMIN') {
    throw new AppError('Solo administradores pueden cerrar disputas', 403, 'ADMIN_ONLY');
  }

  const disputeChat = await prisma.chat.findFirst({
    where: {
      id: chatId, isDisputeChat: true,
      members: { some: { userId: adminId } }
    },
    include: {
      members: {
        include: { user: { select: { id: true, firstName: true, userType: true } } }
      }
    }
  });

  if (!disputeChat) {
    throw new AppError('Chat de disputa no encontrado', 404, 'DISPUTE_CHAT_NOT_FOUND');
  }
  if (disputeChat.disputeStatus === 'CLOSED') {
    throw new AppError('La disputa ya está cerrada', 400, 'DISPUTE_ALREADY_CLOSED');
  }

  await Promise.all([
    prisma.chat.update({
      where: { id: chatId },
      data: { disputeStatus: 'CLOSED' }
    }),
    prisma.message.create({
      data: {
        content: `DISPUTA CERRADA POR ADMINISTRADOR\n\nResolución: ${resolution}\n\nDecisión final: ${finalDecision}\n\nEste chat queda cerrado y no se pueden enviar más mensajes.`,
        messageType: 'SYSTEM', senderId: adminId, chatId
      }
    })
  ]);

  const participantIds = disputeChat.members
    .filter(m => m.user.userType !== 'ADMIN')
    .map(m => m.userId);

  await chatService.createDisputeNotification(
    chatId, participantIds, 'DISPUTE_CLOSED',
    `La disputa ha sido cerrada. Resolución: ${resolution}`
  );

  logger.info('Dispute chat closed', { chatId, adminId, resolution, finalDecision });

  res.status(200).json({
    success: true,
    message: 'Chat de disputa cerrado exitosamente',
    data: { chatId, disputeStatus: 'CLOSED', resolution, finalDecision },
    timestamp: new Date().toISOString()
  });
});

// ✅ ENVIAR MENSAJE EN DISPUTA - MANTENIDO
const addDisputeMessage = catchAsync(async (req, res) => {
  const { chatId } = req.params;
  const { content } = req.body;
  const userId = req.user.id;

  if (!content?.trim()) {
    throw new AppError('Contenido del mensaje es requerido', 400, 'MISSING_MESSAGE_CONTENT');
  }
  if (content.length > 1000) {
    throw new AppError('Mensaje muy largo. Máximo 1000 caracteres en disputas', 400, 'MESSAGE_TOO_LONG');
  }

  const disputeChat = await prisma.chat.findFirst({
    where: { id: chatId, isDisputeChat: true, disputeStatus: 'ACTIVE' },
    include: { members: { where: { userId } } }
  });

  if (!disputeChat || !disputeChat.members[0]) {
    throw new AppError('Chat de disputa no encontrado o cerrado', 404, 'DISPUTE_CHAT_NOT_FOUND');
  }

  const member = disputeChat.members[0];
  if (req.user.userType !== 'ADMIN' && member.messageCount >= member.maxMessages) {
    throw new AppError(
      `Has alcanzado el límite de ${member.maxMessages} mensajes en este chat de disputa`,
      400, 'DISPUTE_MESSAGE_LIMIT'
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const message = await tx.message.create({
      data: {
        content: sanitizeString(content), messageType: 'TEXT',
        senderId: userId, chatId
      },
      include: {
        sender: { select: { ...getUserSelect(), userType: true } }
      }
    });

    await Promise.all([
      tx.chatMember.update({
        where: { userId_chatId: { userId, chatId } },
        data: { messageCount: { increment: 1 } }
      }),
      tx.chat.update({
        where: { id: chatId },
        data: { lastActivity: new Date() }
      })
    ]);

    return message;
  });

  // Emitir evento de socket
  try {
    req.app.get('io')?.to(chatId).emit('newDisputeMessage', { ...result, isMine: false });
  } catch (error) {
    logger.warn('Failed to emit socket event:', error);
  }

  logger.info('Dispute message sent', {
    messageId: result.id, chatId, userId, userType: req.user.userType,
    messageCount: member.messageCount + 1, maxMessages: member.maxMessages
  });

  res.status(201).json({
    success: true,
    message: 'Mensaje de disputa enviado exitosamente',
    data: {
      ...result, isMine: true,
      remainingMessages: req.user.userType === 'ADMIN' ? 'unlimited' 
        : Math.max(0, member.maxMessages - (member.messageCount + 1))
    },
    timestamp: new Date().toISOString()
  });
});

// ✅ CREAR O OBTENER CHAT - CORREGIDO CON PRIORIDAD
const createOrGetChat = catchAsync(async (req, res) => {
  const senderId = req.user.id;
  const { receiverId } = req.body;

  if (!receiverId) throw new AppError('ID del receptor es requerido', 400, 'MISSING_RECEIVER_ID');

  const receiver = await validateUserCanChat(senderId, receiverId);

  if (req.user.userType === 'CLIENT') {
    await checkClientMessageLimits(req.user);
  }

  let chat = await prisma.chat.findFirst({
    where: {
      isGroup: false, isDisputeChat: false,
      AND: [
        { members: { some: { userId: senderId } } },
        { members: { some: { userId: receiverId } } }
      ]
    },
    include: getChatInclude()
  });

  if (!chat) {
    chat = await prisma.chat.create({
      data: {
        isGroup: false, isPrivate: true, isDisputeChat: false,
        members: {
          create: [
            { userId: senderId, role: 'MEMBER' },
            { userId: receiverId, role: 'MEMBER' }
          ]
        }
      },
      include: getChatInclude()
    });
    logger.info('New chat created', { chatId: chat.id, senderId, receiverId });
  }

  await prisma.chat.update({
    where: { id: chat.id },
    data: { lastActivity: new Date() }
  });

  // ✅ FORMATEAR RESPONSE CON INFORMACIÓN COMPLETA INCLUYENDO PRIORIDAD
  const otherMember = chat.members?.find(member => member.userId !== senderId);
  const otherUser = otherMember?.user;

  res.status(200).json({
    success: true,
    data: {
      chat: {
        id: chat.id, 
        isGroup: chat.isGroup, 
        isDisputeChat: chat.isDisputeChat,
        members: chat.members, 
        lastMessage: chat.messages?.[0] || null,
        lastActivity: chat.lastActivity, 
        createdAt: chat.createdAt,
        // ✅ AGREGAR INFORMACIÓN DEL OTRO USUARIO CON PRIORIDAD
        otherUser: otherUser ? {
          id: otherUser.id,
          firstName: otherUser.firstName,
          lastName: otherUser.lastName,
          username: otherUser.username,
          avatar: otherUser.avatar,
          userType: otherUser.userType,
          lastActiveAt: otherUser.lastActiveAt,
          client: otherUser.client
        } : null
      }
    },
    timestamp: new Date().toISOString()
  });
});

// ✅ OBTENER CHATS - COMPLETAMENTE CORREGIDO CON CHAT PRIORITY
const getChats = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 20, archived = false, includeDisputes = false } = req.query;

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));

  const whereClause = {
    members: {
      some: {
        userId,
        ...(archived === 'true' ? {} : { chat: { isArchived: false } })
      }
    },
    deletedAt: null
  };

  if (!(includeDisputes === 'true' && req.user.userType === 'ADMIN')) {
    whereClause.isDisputeChat = false;
  }

  // ✅ OBTENER TODOS LOS CHATS SIN PAGINACIÓN PARA PODER ORDENAR CORRECTAMENTE
  let allChats = await prisma.chat.findMany({
    where: whereClause,
    include: {
      members: {
        where: { userId: { not: userId } },
        include: { 
          user: { 
            select: { 
              ...getUserSelect(), 
              settings: { select: { showOnline: true, showLastSeen: true } },
              // ✅ CRÍTICO: Incluir datos del cliente para chat priority
              client: {
                select: {
                  id: true,
                  chatPriorityUntil: true,
                  points: true,
                  premiumTier: true,
                  isPremium: true
                }
              }
            } 
          } 
        }
      },
      messages: {
        take: 1, orderBy: { createdAt: 'desc' },
        select: { id: true, content: true, messageType: true, isRead: true, createdAt: true, senderId: true }
      },
      _count: {
        select: {
          messages: { where: { isRead: false, senderId: { not: userId } } }
        }
      }
    }
  });

  // ✅ APLICAR ORDENAMIENTO CON CHAT PRIORITY
  const sortedChats = sortChatsWithPriority(allChats, userId);

  // ✅ APLICAR PAGINACIÓN DESPUÉS DEL ORDENAMIENTO
  const offset = (pageNum - 1) * limitNum;
  const paginatedChats = sortedChats.slice(offset, offset + limitNum);

  const formattedChats = paginatedChats.map(chat => {
    const otherUser = chat.members[0]?.user || null;
    const hasPriority = hasChatPriority(otherUser);
    
    // Log detallado para debugging
    logger.debug('Chat formatting with priority', {
      chatId: chat.id,
      otherUserId: otherUser?.id,
      otherUserType: otherUser?.userType,
      chatPriorityUntil: otherUser?.client?.chatPriorityUntil,
      hasPriority,
      now: new Date().toISOString()
    });

    return {
      id: chat.id, 
      isGroup: chat.isGroup, 
      isDisputeChat: chat.isDisputeChat,
      disputeStatus: chat.disputeStatus, 
      name: chat.name, 
      avatar: chat.avatar,
      isArchived: chat.isArchived, 
      lastActivity: chat.lastActivity,
      // ✅ INFORMACIÓN COMPLETA DEL OTRO USUARIO CON PRIORIDAD
      otherUser: otherUser ? {
        id: otherUser.id,
        firstName: otherUser.firstName,
        lastName: otherUser.lastName,
        username: otherUser.username,
        avatar: otherUser.avatar,
        userType: otherUser.userType,
        lastActiveAt: otherUser.lastActiveAt,
        client: otherUser.client
      } : null,
      lastMessage: chat.messages[0] || null,
      unreadCount: chat._count.messages,
      createdAt: chat.createdAt,
      // ✅ INFORMACIÓN DE PRIORIDAD PARA DEBUG
      _priority: hasPriority ? {
        hasPriority: true,
        expiresAt: otherUser?.client?.chatPriorityUntil
      } : { hasPriority: false }
    };
  });

  logger.info('Chats loaded with priority sorting', {
    userId,
    totalChats: sortedChats.length,
    paginatedCount: formattedChats.length,
    priorityChats: formattedChats.filter(c => c._priority?.hasPriority).length,
    priorityDetails: formattedChats
      .filter(c => c._priority?.hasPriority)
      .map(c => ({
        chatId: c.id,
        otherUser: c.otherUser?.username,
        expiresAt: c._priority.expiresAt
      }))
  });

  res.status(200).json({
    success: true,
    data: {
      chats: formattedChats,
      pagination: { 
        page: pageNum, 
        limit: limitNum, 
        total: sortedChats.length, 
        hasMore: sortedChats.length > offset + limitNum 
      }
    },
    timestamp: new Date().toISOString()
  });
});

// ✅ OBTENER MENSAJES DE CHAT - MANTENIDO
const getChatMessages = catchAsync(async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;
  const { page = 1, limit = 50, before } = req.query;

  if (!chatId) throw new AppError('ID del chat es requerido', 400, 'MISSING_CHAT_ID');

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
  const offset = (pageNum - 1) * limitNum;

  const chatMember = await validateChatAccess(userId, chatId);

  const whereClause = {
    chatId, deletedAt: null,
    ...(before && { createdAt: { lt: new Date(before) } })
  };

  const messages = await prisma.message.findMany({
    where: whereClause,
    include: {
      sender: { select: getUserSelect() }
    },
    orderBy: { createdAt: 'desc' },
    skip: offset,
    take: limitNum
  });

  // Marcar mensajes como leídos
  const unreadMessageIds = messages
    .filter(msg => msg.senderId !== userId && !msg.isRead)
    .map(msg => msg.id);

  if (unreadMessageIds.length > 0 && 
      (!chatMember.chat.isDisputeChat || chatMember.chat.disputeStatus === 'ACTIVE')) {
    await Promise.all([
      prisma.message.updateMany({
        where: { id: { in: unreadMessageIds } },
        data: { isRead: true, readAt: new Date() }
      }),
      prisma.chatMember.update({
        where: { userId_chatId: { userId, chatId } },
        data: { lastRead: new Date() }
      })
    ]);
  }

  const formattedMessages = messages.reverse().map(message => ({
    id: message.id, content: message.content, messageType: message.messageType,
    fileUrl: message.fileUrl, fileName: message.fileName, fileSize: message.fileSize,
    mimeType: message.mimeType, isRead: message.isRead, readAt: message.readAt,
    isEdited: message.isEdited, editedAt: message.editedAt,
    costPoints: message.costPoints, isPremiumMessage: message.isPremiumMessage,
    replyToId: message.replyToId, createdAt: message.createdAt,
    senderId: message.senderId, sender: message.sender,
    isMine: message.senderId === userId
  }));

  let chatInfo = {};
  if (chatMember.chat.isDisputeChat) {
    chatInfo = {
      isDisputeChat: true, disputeStatus: chatMember.chat.disputeStatus,
      remainingMessages: req.user.userType === 'ADMIN' ? 'unlimited' 
        : Math.max(0, chatMember.maxMessages - chatMember.messageCount)
    };
  }

  res.status(200).json({
    success: true,
    data: {
      messages: formattedMessages, chatInfo,
      pagination: { page: pageNum, limit: limitNum, hasMore: messages.length === limitNum }
    },
    timestamp: new Date().toISOString()
  });
});

// ✅ ENVIAR MENSAJE - CORREGIDO
const sendMessage = catchAsync(async (req, res) => {
  const { chatId } = req.params;
  const senderId = req.user.id;
  const { content, messageType = 'TEXT', replyToId, isPremiumMessage = false } = req.body;

  if (!chatId) throw new AppError('ID del chat es requerido', 400, 'MISSING_CHAT_ID');
  if (!content && !req.file) throw new AppError('Contenido del mensaje o archivo es requerido', 400, 'MISSING_MESSAGE_CONTENT');
  if (!['TEXT', 'IMAGE', 'FILE', 'AUDIO', 'VIDEO'].includes(messageType)) {
    throw new AppError('Tipo de mensaje inválido', 400, 'INVALID_MESSAGE_TYPE');
  }

  const chatMember = await prisma.chatMember.findUnique({
    where: { userId_chatId: { userId: senderId, chatId } },
    include: {
      chat: {
        include: {
          members: {
            where: { userId: { not: senderId } },
            include: { user: { select: { id: true, userType: true, settings: { select: { allowDirectMessages: true } } } } }
          }
        }
      }
    }
  });

  if (!chatMember) throw new AppError('No tienes acceso a este chat', 403, 'CHAT_ACCESS_DENIED');

  // Validaciones para chat de disputa
  if (chatMember.chat.isDisputeChat) {
    if (chatMember.chat.disputeStatus !== 'ACTIVE') {
      throw new AppError('No se pueden enviar mensajes en un chat de disputa cerrado', 403, 'DISPUTE_CHAT_CLOSED');
    }
    if (messageType !== 'TEXT') {
      throw new AppError('Solo se permiten mensajes de texto en chats de disputa', 400, 'DISPUTE_TEXT_ONLY');
    }
    if (req.user.userType !== 'ADMIN' && chatMember.messageCount >= chatMember.maxMessages) {
      throw new AppError(
        `Has alcanzado el límite de ${chatMember.maxMessages} mensajes en este chat de disputa`,
        400, 'DISPUTE_MESSAGE_LIMIT'
      );
    }
    if (content && content.length > 1000) {
      throw new AppError('Mensaje muy largo. Máximo 1000 caracteres en disputas', 400, 'MESSAGE_TOO_LONG');
    }
  }

  let pointsCost = 0; // Simplificado sin sistema de puntos

  // Procesar archivo con Cloudinary si existe
  let fileData = {};
  if (req.file && ['IMAGE', 'FILE', 'AUDIO', 'VIDEO'].includes(messageType)) {
    try {
      const uploadResult = await uploadToCloudinary(req.file.buffer, {
        folder: 'telofundi/chat',
        resource_type: 'auto',
        public_id: `chat_${senderId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });

      fileData = {
        fileUrl: uploadResult.secure_url,
        fileName: req.file.originalname || 'archivo_chat',
        fileSize: req.file.size || uploadResult.bytes || 0,
        mimeType: req.file.mimetype || uploadResult.format || 'application/octet-stream'
      };

      logger.info('Chat file uploaded to Cloudinary', {
        chatId, senderId, fileUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id, fileSize: fileData.fileSize, messageType
      });
    } catch (uploadError) {
      logger.error('Error uploading chat file to Cloudinary:', uploadError);
      throw new AppError('Error subiendo archivo', 500, 'FILE_UPLOAD_ERROR');
    }
  }

  // ✅ CORREGIDO: receiverId solo para chats directos
  let receiverId = null;
  if (!chatMember.chat.isGroup && !chatMember.chat.isDisputeChat) {
    const otherMembers = chatMember.chat.members;
    if (otherMembers.length > 0) {
      receiverId = otherMembers[0].userId;
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const message = await tx.message.create({
      data: {
        content: sanitizeString(content) || '',
        messageType, senderId, chatId,
        receiverId, // ✅ Ahora correctamente manejado
        replyToId: replyToId || null,
        isPremiumMessage, costPoints: pointsCost,
        ...fileData
      },
      include: {
        sender: { select: getUserSelect() },
        chat: { select: { id: true, isGroup: true, isDisputeChat: true } }
      }
    });

    await tx.chat.update({
      where: { id: chatId },
      data: { lastActivity: new Date() }
    });

    // Para chats de disputa, actualizar contador de mensajes
    if (chatMember.chat.isDisputeChat && req.user.userType !== 'ADMIN') {
      await tx.chatMember.update({
        where: { userId_chatId: { userId: senderId, chatId } },
        data: { messageCount: { increment: 1 } }
      });
    }

    // Para chats normales, actualizar contador
    if (!chatMember.chat.isDisputeChat) {
      await tx.chatMember.update({
        where: { userId_chatId: { userId: senderId, chatId } },
        data: { messagesCount: { increment: 1 } }
      });
    }

    return message;
  });

  // Registrar interacción para algoritmos
  const otherMembers = chatMember.chat.members;
  if (otherMembers.length > 0 && !chatMember.chat.isDisputeChat) {
    try {
      await prisma.userInteraction.create({
        data: {
          userId: senderId, targetUserId: otherMembers[0].userId,
          type: 'CHAT',
          weight: isPremiumMessage ? 5.0 : (messageType === 'IMAGE' ? 3.0 : 2.0),
          source: 'chat',
          deviceType: req.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'desktop'
        }
      });

      await prisma.userReputation.upsert({
        where: { userId: senderId },
        update: { totalMessages: { increment: 1 }, lastScoreUpdate: new Date() },
        create: {
          userId: senderId, overallScore: 0, responseRate: 0, averageResponseTime: null,
          profileCompleteness: 0, trustScore: 0, totalViews: 0, totalLikes: 0,
          totalMessages: 1, totalFavorites: 0, discoveryScore: 0, trendingScore: 0,
          qualityScore: 0, spamScore: 0, reportScore: 0, lastScoreUpdate: new Date()
        }
      });
    } catch (error) {
      logger.warn('Failed to create user interaction or update reputation:', error);
    }
  }

  logger.info('Message sent', {
    messageId: result.id, chatId, senderId, messageType, pointsCost,
    isPremiumMessage, hasFile: !!fileData.fileUrl, isDisputeChat: chatMember.chat.isDisputeChat
  });

  // Emitir evento de socket
  try {
    req.app.get('io')?.to(chatId).emit('newMessage', { ...result, isMine: false });
  } catch (error) {
    logger.warn('Failed to emit socket event:', error);
  }

  let additionalInfo = {};
  if (chatMember.chat.isDisputeChat && req.user.userType !== 'ADMIN') {
    additionalInfo.remainingMessages = Math.max(0, chatMember.maxMessages - (chatMember.messageCount + 1));
  }

  res.status(201).json({
    success: true,
    message: 'Mensaje enviado exitosamente',
    data: { ...result, isMine: true, ...additionalInfo },
    timestamp: new Date().toISOString()
  });
});

// ✅ RESTO DE FUNCIONES MANTENIDAS IGUALES (editar, eliminar, etc.)
const editMessage = catchAsync(async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user.id;
  const { content } = req.body;

  if (!messageId) throw new AppError('ID del mensaje es requerido', 400, 'MISSING_MESSAGE_ID');
  if (!content?.trim()) throw new AppError('Contenido del mensaje es requerido', 400, 'MISSING_MESSAGE_CONTENT');

  const message = await prisma.message.findFirst({
    where: { id: messageId, senderId: userId, deletedAt: null },
    include: { chat: { select: { isDisputeChat: true, disputeStatus: true } } }
  });

  if (!message) throw new AppError('Mensaje no encontrado o no tienes permisos', 404, 'MESSAGE_NOT_FOUND');
  if (message.chat.isDisputeChat) throw new AppError('No se pueden editar mensajes en chats de disputa', 400, 'CANNOT_EDIT_DISPUTE_MESSAGE');
  if (Date.now() - message.createdAt.getTime() > 24 * 60 * 60 * 1000) {
    throw new AppError('El mensaje es muy antiguo para editar', 400, 'MESSAGE_TOO_OLD');
  }
  if (message.messageType !== 'TEXT') throw new AppError('Solo puedes editar mensajes de texto', 400, 'CANNOT_EDIT_FILE_MESSAGE');

  const updatedMessage = await prisma.message.update({
    where: { id: messageId },
    data: {
      content: sanitizeString(content),
      isEdited: true,
      editedAt: new Date()
    },
    include: { sender: { select: { id: true, username: true, firstName: true, lastName: true, avatar: true } } }
  });

  logger.info('Message edited', { messageId, userId, chatId: message.chatId });

  try {
    req.app.get('io')?.to(message.chatId).emit('messageEdited', updatedMessage);
  } catch (error) {
    logger.warn('Failed to emit socket event:', error);
  }

  res.status(200).json({
    success: true,
    message: 'Mensaje editado exitosamente',
    data: updatedMessage,
    timestamp: new Date().toISOString()
  });
});

const deleteMessage = catchAsync(async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user.id;

  if (!messageId) throw new AppError('ID del mensaje es requerido', 400, 'MISSING_MESSAGE_ID');

  const message = await prisma.message.findFirst({
    where: { id: messageId, senderId: userId, deletedAt: null },
    include: { chat: { select: { isDisputeChat: true, disputeStatus: true } } }
  });

  if (!message) throw new AppError('Mensaje no encontrado o no tienes permisos', 404, 'MESSAGE_NOT_FOUND');
  if (message.chat.isDisputeChat) throw new AppError('No se pueden eliminar mensajes en chats de disputa', 400, 'CANNOT_DELETE_DISPUTE_MESSAGE');

  // Eliminar archivo de Cloudinary si existe
  if (message.fileUrl?.includes('cloudinary')) {
    try {
      const publicId = extractPublicIdFromUrl(message.fileUrl);
      if (publicId) {
        await deleteFromCloudinary(publicId);
        logger.info('Chat file deleted from Cloudinary', { messageId, publicId, fileUrl: message.fileUrl });
      }
    } catch (error) {
      logger.warn('Could not delete chat file from Cloudinary', { messageId, fileUrl: message.fileUrl, error: error.message });
    }
  }

  await prisma.message.update({
    where: { id: messageId },
    data: { deletedAt: new Date() }
  });

  logger.info('Message deleted', { messageId, userId, chatId: message.chatId, hadFile: !!message.fileUrl });

  try {
    req.app.get('io')?.to(message.chatId).emit('messageDeleted', { messageId });
  } catch (error) {
    logger.warn('Failed to emit socket event:', error);
  }

  res.status(200).json({
    success: true,
    message: 'Mensaje eliminado exitosamente',
    timestamp: new Date().toISOString()
  });
});

const toggleChatArchive = catchAsync(async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;

  if (!chatId) throw new AppError('ID del chat es requerido', 400, 'MISSING_CHAT_ID');

  const chatMember = await prisma.chatMember.findUnique({
    where: { userId_chatId: { userId, chatId } },
    include: { chat: { select: { id: true, isArchived: true, isDisputeChat: true } } }
  });

  if (!chatMember) throw new AppError('No tienes acceso a este chat', 403, 'CHAT_ACCESS_DENIED');
  if (chatMember.chat.isDisputeChat) throw new AppError('No se pueden archivar chats de disputa', 400, 'CANNOT_ARCHIVE_DISPUTE_CHAT');

  const updatedChat = await prisma.chat.update({
    where: { id: chatId },
    data: { isArchived: !chatMember.chat.isArchived }
  });

  logger.info('Chat archive toggled', { chatId, userId, isArchived: updatedChat.isArchived });

  res.status(200).json({
    success: true,
    message: updatedChat.isArchived ? 'Chat archivado' : 'Chat desarchivado',
    data: { chatId, isArchived: updatedChat.isArchived },
    timestamp: new Date().toISOString()
  });
});

const toggleChatMute = catchAsync(async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;
  const { mutedUntil } = req.body;

  if (!chatId) throw new AppError('ID del chat es requerido', 400, 'MISSING_CHAT_ID');

  const chatMember = await prisma.chatMember.findUnique({
    where: { userId_chatId: { userId, chatId } }
  });

  if (!chatMember) throw new AppError('No tienes acceso a este chat', 403, 'CHAT_ACCESS_DENIED');

  let mutedUntilDate = null;
  if (mutedUntil) {
    mutedUntilDate = new Date(mutedUntil);
    if (isNaN(mutedUntilDate.getTime())) {
      throw new AppError('Fecha de silenciado inválida', 400, 'INVALID_MUTE_DATE');
    }
  }

  await prisma.chatMember.update({
    where: { userId_chatId: { userId, chatId } },
    data: {
      isMuted: !!mutedUntilDate,
      chat: { update: { mutedUntil: mutedUntilDate } }
    }
  });

  logger.info('Chat mute toggled', { chatId, userId, isMuted: !!mutedUntilDate, mutedUntil: mutedUntilDate });

  res.status(200).json({
    success: true,
    message: mutedUntilDate ? 'Chat silenciado' : 'Notificaciones activadas',
    data: { chatId, isMuted: !!mutedUntilDate, mutedUntil: mutedUntilDate },
    timestamp: new Date().toISOString()
  });
});

const searchMessages = catchAsync(async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;
  const { q: query, messageType, dateFrom, dateTo, page = 1, limit = 20 } = req.query;

  if (!chatId) throw new AppError('ID del chat es requerido', 400, 'MISSING_CHAT_ID');
  if (!query && !messageType && !dateFrom && !dateTo) {
    throw new AppError('Al menos un criterio de búsqueda es requerido', 400, 'MISSING_SEARCH_CRITERIA');
  }

  await validateChatAccess(userId, chatId);

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
  const offset = (pageNum - 1) * limitNum;

  const whereClause = {
    chatId, deletedAt: null,
    ...(query && { content: { contains: sanitizeString(query), mode: 'insensitive' } }),
    ...(messageType && { messageType }),
    ...(dateFrom && { createdAt: { gte: new Date(dateFrom) } }),
    ...(dateTo && { createdAt: { ...whereClause.createdAt, lte: new Date(dateTo) } })
  };

  const [messages, totalCount] = await Promise.all([
    prisma.message.findMany({
      where: whereClause,
      include: { sender: { select: { id: true, username: true, firstName: true, lastName: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limitNum
    }),
    prisma.message.count({ where: whereClause })
  ]);

  const pagination = {
    page: pageNum, limit: limitNum, total: totalCount,
    pages: Math.ceil(totalCount / limitNum),
    hasNext: pageNum * limitNum < totalCount,
    hasPrev: pageNum > 1
  };

  res.status(200).json({
    success: true,
    data: {
      messages: messages.map(msg => ({ ...msg, isMine: msg.senderId === userId })),
      pagination,
      filters: { query, messageType, dateFrom, dateTo }
    },
    timestamp: new Date().toISOString()
  });
});

const getChatStats = catchAsync(async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;

  if (!chatId) throw new AppError('ID del chat es requerido', 400, 'MISSING_CHAT_ID');

  await validateChatAccess(userId, chatId);

  const stats = await chatService.getChatAnalytics(chatId, userId);

  res.status(200).json({
    success: true,
    data: stats,
    timestamp: new Date().toISOString()
  });
});

const reportMessage = catchAsync(async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user.id;
  const { reason, description } = req.body;

  if (!messageId) throw new AppError('ID del mensaje es requerido', 400, 'MISSING_MESSAGE_ID');
  if (!reason) throw new AppError('Razón del reporte es requerida', 400, 'MISSING_REPORT_REASON');

  const message = await prisma.message.findUnique({
    where: { id: messageId, deletedAt: null },
    include: {
      chat: {
        include: { members: { where: { userId }, select: { id: true } } }
      }
    }
  });

  if (!message) throw new AppError('Mensaje no encontrado', 404, 'MESSAGE_NOT_FOUND');
  if (message.chat.members.length === 0) throw new AppError('No tienes acceso a este chat', 403, 'CHAT_ACCESS_DENIED');
  if (message.senderId === userId) throw new AppError('No puedes reportar tu propio mensaje', 400, 'CANNOT_REPORT_OWN_MESSAGE');

  const report = await prisma.report.create({
    data: {
      reason, description: sanitizeString(description) || null,
      authorId: userId, targetUserId: message.senderId,
      evidence: {
        messageId, chatId: message.chatId,
        messageContent: message.content,
        messageType: message.messageType,
        fileUrl: message.fileUrl || null
      },
      severity: 'MEDIUM'
    }
  });

  logger.info('Message reported', {
    reportId: report.id, messageId, reporterId: userId,
    reportedUserId: message.senderId, reason, hadFile: !!message.fileUrl
  });

  res.status(200).json({
    success: true,
    message: 'Mensaje reportado exitosamente',
    data: { reportId: report.id },
    timestamp: new Date().toISOString()
  });
});

// ✅ FUNCIÓN HELPER PARA LÍMITES DE CLIENTE - MANTENIDA
const checkClientMessageLimits = async (user) => {
  if (user.userType !== 'CLIENT') return { canSend: true };

  const client = user.client;
  if (!client) throw new AppError('Datos de cliente no encontrados', 500, 'CLIENT_DATA_MISSING');

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Resetear contador diario si es necesario
  if (!client.lastMessageReset || client.lastMessageReset < today) {
    await prisma.client.update({
      where: { id: client.id },
      data: { messagesUsedToday: 0, lastMessageReset: today }
    });
    client.messagesUsedToday = 0;
  }

  let dailyLimit = client.dailyMessageLimit || 5;
  if (client.isPremium || ['PREMIUM', 'VIP'].includes(client.premiumTier)) {
    dailyLimit = -1; // Ilimitado
  }

  const messagesUsed = client.messagesUsedToday || 0;
  if (dailyLimit !== -1 && messagesUsed >= dailyLimit) {
    throw new AppError(
      `Has alcanzado tu límite diario de ${dailyLimit} mensajes. Actualiza tu cuenta para enviar más.`,
      400, 'DAILY_MESSAGE_LIMIT_REACHED'
    );
  }

  return {
    canSend: true, messagesUsed, 
    dailyLimit: dailyLimit === -1 ? 'unlimited' : dailyLimit,
    pointsAvailable: client.points || 0
  };
};

// ✅ FUNCIÓN HELPER PARA EXTRAER PUBLIC_ID DE CLOUDINARY - MANTENIDA
const extractPublicIdFromUrl = (cloudinaryUrl) => {
  try {
    if (!cloudinaryUrl?.includes('cloudinary')) return null;
    
    const matches = cloudinaryUrl.match(/\/v\d+\/([^/.]+)(?:\.[^/]*)?$/) ||
                   cloudinaryUrl.match(/\/upload\/([^/.]+)(?:\.[^/]*)?$/) ||
                   cloudinaryUrl.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^/.]*)?$/);
    
    return matches?.[1] || null;
  } catch (error) {
    logger.error('Error extracting public_id from Cloudinary URL', { url: cloudinaryUrl, error: error.message });
    return null;
  }
};

// ✅ FUNCIONES DE DEBUG PARA TESTING
const debugChatPriority = catchAsync(async (req, res) => {
  const userId = req.user.id;
  
  // Obtener todos los chats del usuario con información detallada
  const chats = await prisma.chat.findMany({
    where: {
      members: { some: { userId } },
      isDisputeChat: false,
      deletedAt: null
    },
    include: {
      members: {
        where: { userId: { not: userId } },
        include: { 
          user: { 
            select: { 
              id: true, 
              firstName: true, 
              lastName: true, 
              username: true, 
              avatar: true, 
              userType: true, 
              lastActiveAt: true,
              client: {
                select: {
                  id: true,
                  chatPriorityUntil: true,
                  points: true,
                  premiumTier: true
                }
              }
            } 
          } 
        }
      },
      messages: {
        take: 1, 
        orderBy: { createdAt: 'desc' },
        select: { content: true, createdAt: true, messageType: true }
      }
    },
    orderBy: { lastActivity: 'desc' }
  });

  const now = new Date();
  
  const debugInfo = chats.map(chat => {
    const otherUser = chat.members[0]?.user;
    const client = otherUser?.client;
    const chatPriorityUntil = client?.chatPriorityUntil;
    
    const hasPriority = chatPriorityUntil && new Date(chatPriorityUntil) > now;
    
    return {
      chatId: chat.id,
      otherUser: {
        id: otherUser?.id,
        username: otherUser?.username,
        firstName: otherUser?.firstName,
        userType: otherUser?.userType
      },
      priority: {
        hasPriority,
        chatPriorityUntil,
        isActive: hasPriority,
        remainingTime: chatPriorityUntil ? Math.max(0, new Date(chatPriorityUntil) - now) : 0,
        remainingHours: chatPriorityUntil ? Math.max(0, (new Date(chatPriorityUntil) - now) / (1000 * 60 * 60)) : 0
      },
      client: {
        id: client?.id,
        points: client?.points,
        premiumTier: client?.premiumTier
      },
      lastActivity: chat.lastActivity,
      lastMessage: chat.messages[0]?.content || 'Sin mensajes'
    };
  });

  // Ordenar aplicando la misma lógica del frontend
  const sortedChats = debugInfo.sort((a, b) => {
    const aPriority = a.priority.hasPriority;
    const bPriority = b.priority.hasPriority;
    
    // Si uno tiene prioridad y otro no, el que tiene prioridad va primero
    if (aPriority && !bPriority) return -1;
    if (!aPriority && bPriority) return 1;
    
    // Si ambos tienen prioridad o ninguno la tiene, ordenar por lastActivity
    const dateA = new Date(a.lastActivity);
    const dateB = new Date(b.lastActivity);
    
    return dateB - dateA; // Más reciente primero
  });

  // Estadísticas del sistema
  const stats = {
    totalChats: debugInfo.length,
    chatsWithPriority: debugInfo.filter(c => c.priority.hasPriority).length,
    chatsWithoutPriority: debugInfo.filter(c => !c.priority.hasPriority).length,
    currentTime: now.toISOString(),
    priorityUsers: debugInfo
      .filter(c => c.priority.hasPriority)
      .map(c => ({
        username: c.otherUser.username,
        expiresAt: c.priority.chatPriorityUntil,
        remainingHours: Math.round(c.priority.remainingHours * 100) / 100
      }))
  };

  logger.info('Chat priority debug info', {
    userId,
    stats,
    totalChats: debugInfo.length,
    priorityChats: stats.chatsWithPriority
  });

  res.status(200).json({
    success: true,
    data: {
      stats,
      chats: sortedChats,
      debugInfo: {
        message: 'Información de debug del sistema de prioridad en chat',
        instructions: 'Los chats con hasPriority=true deberían aparecer primero',
        currentTime: now.toISOString()
      }
    },
    timestamp: new Date().toISOString()
  });
});

const checkUserPriority = catchAsync(async (req, res) => {
  const { userId: targetUserId } = req.params;
  const currentUserId = req.user.id;
  
  // Buscar el usuario objetivo
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    include: {
      client: {
        select: {
          id: true,
          chatPriorityUntil: true,
          points: true,
          premiumTier: true,
          totalPointsSpent: true
        }
      }
    }
  });

  if (!targetUser) {
    throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
  }

  const now = new Date();
  const chatPriorityUntil = targetUser.client?.chatPriorityUntil;
  const hasPriority = chatPriorityUntil && new Date(chatPriorityUntil) > now;

  // Buscar si existe chat entre los usuarios
  const existingChat = await prisma.chat.findFirst({
    where: {
      isGroup: false,
      isDisputeChat: false,
      AND: [
        { members: { some: { userId: currentUserId } } },
        { members: { some: { userId: targetUserId } } }
      ]
    },
    select: { id: true, lastActivity: true }
  });

  const result = {
    targetUser: {
      id: targetUser.id,
      username: targetUser.username,
      firstName: targetUser.firstName,
      userType: targetUser.userType
    },
    priority: {
      hasPriority,
      chatPriorityUntil,
      isActive: hasPriority,
      remainingTime: chatPriorityUntil ? Math.max(0, new Date(chatPriorityUntil) - now) : 0,
      remainingHours: chatPriorityUntil ? Math.max(0, (new Date(chatPriorityUntil) - now) / (1000 * 60 * 60)) : 0
    },
    client: targetUser.client ? {
      id: targetUser.client.id,
      points: targetUser.client.points,
      premiumTier: targetUser.client.premiumTier,
      totalPointsSpent: targetUser.client.totalPointsSpent
    } : null,
    existingChat: existingChat ? {
      id: existingChat.id,
      lastActivity: existingChat.lastActivity
    } : null,
    currentTime: now.toISOString()
  };

  logger.info('User priority check', {
    currentUserId,
    targetUserId,
    hasPriority,
    chatPriorityUntil,
    remainingHours: result.priority.remainingHours
  });

  res.status(200).json({
    success: true,
    data: result,
    timestamp: new Date().toISOString()
  });
});

const activatePriorityManual = catchAsync(async (req, res) => {
  const { clientId, hours = 24 } = req.body;
  const adminUserId = req.user.id;

  // Verificar que es admin
  if (req.user.userType !== 'ADMIN') {
    throw new AppError('Solo administradores pueden activar prioridad manual', 403, 'ADMIN_ONLY');
  }

  if (!clientId) {
    throw new AppError('ClientId es requerido', 400, 'MISSING_CLIENT_ID');
  }

  // Verificar que el cliente existe
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { user: { select: { id: true, username: true } } }
  });

  if (!client) {
    throw new AppError('Cliente no encontrado', 404, 'CLIENT_NOT_FOUND');
  }

  const hoursNum = parseInt(hours);
  if (hoursNum < 1 || hoursNum > 168) { // máximo 1 semana
    throw new AppError('Horas debe estar entre 1 y 168', 400, 'INVALID_HOURS');
  }

  // Activar prioridad
  const expiresAt = new Date(Date.now() + hoursNum * 60 * 60 * 1000);
  
  const updatedClient = await prisma.client.update({
    where: { id: clientId },
    data: { chatPriorityUntil: expiresAt }
  });

  // Crear transacción de puntos ficticia para el log
  await prisma.pointsTransaction.create({
    data: {
      clientId,
      amount: 0, // No cobrar puntos en activación manual
      type: 'ADMIN_MANUAL',
      description: `Prioridad en chat activada manualmente por admin por ${hoursNum} horas`,
      balance: client.points,
      metadata: {
        adminId: adminUserId,
        originalHours: hoursNum,
        activatedAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        manual: true
      }
    }
  });

  logger.info('Chat priority activated manually', {
    adminUserId,
    clientId,
    clientUsername: client.user.username,
    hours: hoursNum,
    expiresAt: expiresAt.toISOString()
  });

  res.status(200).json({
    success: true,
    message: `Prioridad en chat activada para ${client.user.username} por ${hoursNum} horas`,
    data: {
      clientId,
      clientUsername: client.user.username,
      hours: hoursNum,
      activatedAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      remainingHours: hoursNum
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = {
  // Funciones principales
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
  
  // Funciones de disputa
  createDisputeChat, 
  getDisputeChats, 
  closeDisputeChat, 
  addDisputeMessage, 
  
  // Funciones de perfil
  createChatFromProfile,
  
  // Funciones de debug
  debugChatPriority,
  checkUserPriority,
  activatePriorityManual
};