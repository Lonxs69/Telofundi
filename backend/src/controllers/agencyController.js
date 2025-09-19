const { prisma } = require('../config/database');
const { AppError, catchAsync } = require('../middleware/errorHandler');
const { sanitizeString } = require('../utils/validators');
const logger = require('../utils/logger');

// ✅ BUSCAR AGENCIAS (PÚBLICO)
const searchAgencies = catchAsync(async (req, res) => {
  const { q: query, location, verified, minEscorts, page = 1, limit = 20, sortBy = 'relevance' } = req.query;
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
  const offset = (pageNum - 1) * limitNum;

  const whereClause = {
    user: { isActive: true, isBanned: false, userType: 'AGENCY' }
  };

  if (query) {
    whereClause.user.OR = [
      { firstName: { contains: sanitizeString(query), mode: 'insensitive' } },
      { lastName: { contains: sanitizeString(query), mode: 'insensitive' } },
      { bio: { contains: sanitizeString(query), mode: 'insensitive' } }
    ];
  }

  if (location) {
    whereClause.user.location = {
      OR: [
        { country: { contains: sanitizeString(location), mode: 'insensitive' } },
        { city: { contains: sanitizeString(location), mode: 'insensitive' } }
      ]
    };
  }

  if (verified === 'true') whereClause.isVerified = true;
  if (minEscorts) whereClause.totalEscorts = { gte: parseInt(minEscorts) };

  let orderBy = {};
  switch (sortBy) {
    case 'newest': orderBy = { user: { createdAt: 'desc' } }; break;
    case 'oldest': orderBy = { user: { createdAt: 'asc' } }; break;
    case 'escorts': orderBy = { totalEscorts: 'desc' }; break;
    case 'verified': orderBy = [{ isVerified: 'desc' }, { totalEscorts: 'desc' }]; break;
    default: orderBy = [{ isVerified: 'desc' }, { totalEscorts: 'desc' }, { user: { profileViews: 'desc' } }];
  }

  try {
    const [agencies, totalCount] = await Promise.all([
      prisma.agency.findMany({
        where: whereClause,
        include: {
          user: {
            select: { id: true, username: true, firstName: true, lastName: true, avatar: true, bio: true, website: true, phone: true, profileViews: true, createdAt: true, location: true, settings: { select: { showPhoneNumber: true } } }
          },
          _count: { select: { memberships: { where: { status: 'ACTIVE' } }, verifications: { where: { status: 'COMPLETED' } } } }
        },
        orderBy, skip: offset, take: limitNum
      }),
      prisma.agency.count({ where: whereClause })
    ]);

    if (req.user && query) {
      await prisma.searchHistory.create({
        data: {
          userId: req.user.id, query: sanitizeString(query),
          filters: { type: 'agencies', location, verified, minEscorts, sortBy },
          results: totalCount, clicked: false
        }
      }).catch(error => logger.warn('Failed to save search history:', error));
    }

    const formattedAgencies = agencies.map(agency => ({
      id: agency.id, user: agency.user, isVerified: agency.isVerified, verifiedAt: agency.verifiedAt,
      totalEscorts: agency.totalEscorts, verifiedEscorts: agency.verifiedEscorts, activeEscorts: agency.activeEscorts,
      totalVerifications: agency.totalVerifications, defaultCommissionRate: agency.defaultCommissionRate,
      stats: { activeMemberships: agency._count.memberships, completedVerifications: agency._count.verifications }
    }));

    const pagination = {
      page: pageNum, limit: limitNum, total: totalCount, pages: Math.ceil(totalCount / limitNum),
      hasNext: pageNum * limitNum < totalCount, hasPrev: pageNum > 1
    };

    res.status(200).json({
      success: true,
      data: { agencies: formattedAgencies, pagination, filters: { query, location, verified, minEscorts, sortBy } },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Search agencies failed', { error: error.message, stack: error.stack, whereClause, userId: req.user?.id });
    if (error.code === 'P2025') throw new AppError('No se encontraron agencias', 404, 'NO_AGENCIES_FOUND');
    throw new AppError('Error buscando agencias', 500, 'SEARCH_AGENCIES_ERROR');
  }
});

const validateJoinEligibility = async (escortId) => {
  const [activeMembership, pendingRequests] = await Promise.all([
    prisma.agencyMembership.findFirst({
      where: { escortId, status: 'ACTIVE' },
      include: { agency: { include: { user: { select: { firstName: true, lastName: true } } } } }
    }),
    prisma.agencyMembership.findMany({
      where: { escortId, status: 'PENDING' },
      include: { agency: { include: { user: { select: { firstName: true, lastName: true } } } } }
    })
  ]);

  if (activeMembership) {
    return {
      canJoin: false,
      error: `Ya perteneces a la agencia ${activeMembership.agency.user.firstName} ${activeMembership.agency.user.lastName}`,
      reason: 'ACTIVE_MEMBERSHIP'
    };
  }

  if (pendingRequests.length > 0) {
    return {
      canJoin: false,
      error: `Tienes ${pendingRequests.length} solicitud(es) pendiente(s). Espera la respuesta antes de enviar otra.`,
      reason: 'PENDING_REQUESTS',
      pendingCount: pendingRequests.length
    };
  }

  return { canJoin: true };
};

// ✅ HELPER: CANCELAR OTRAS SOLICITUDES AL ACEPTAR UNA - MEJORADO AL 100%
const cancelOtherPendingRequests = async (escortId, acceptedMembershipId, tx = null) => {
  const prismaClient = tx || prisma;
  
  try {
    logger.info('Starting auto-cancellation process', {
      escortId, acceptedMembershipId, usingTransaction: !!tx
    });
    
    // 1. Obtener todas las solicitudes pendientes del escort (excepto la aceptada)
    const pendingRequests = await prismaClient.agencyMembership.findMany({
      where: {
        escortId,
        status: 'PENDING',
        id: { not: acceptedMembershipId }
      },
      include: {
        agency: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } }
          }
        }
      }
    });

    if (pendingRequests.length === 0) {
      logger.info('No pending requests to cancel', { escortId, acceptedMembershipId });
      return 0;
    }

    logger.info('Found pending requests to cancel', {
      escortId, count: pendingRequests.length,
      agencyIds: pendingRequests.map(r => r.agencyId)
    });

    // 2. Cancelar todas las solicitudes pendientes usando REJECTED (no CANCELLED)
    const cancelledRequests = await prismaClient.agencyMembership.updateMany({
      where: {
        escortId,
        status: 'PENDING',
        id: { not: acceptedMembershipId }
      },
      data: {
        status: 'REJECTED',
        updatedAt: new Date()
      }
    });

    // 3. Crear notificaciones para las agencias afectadas
    const notificationPromises = pendingRequests.map(request =>
      prismaClient.notification.create({
        data: {
          userId: request.agency.user.id,
          type: 'MEMBERSHIP_AUTO_CANCELLED',
          title: 'Solicitud cancelada automáticamente',
          message: `La solicitud pendiente fue cancelada porque el escort fue aceptado en otra agencia`,
          data: {
            membershipId: request.id,
            escortId: escortId,
            cancelReason: 'ACCEPTED_ELSEWHERE',
            originalAgencyId: request.agencyId,
            cancelledAt: new Date().toISOString()
          }
        }
      }).catch(error => {
        logger.warn('Failed to create cancellation notification', { 
          error: error.message, agencyUserId: request.agency.user.id 
        });
      })
    );

    await Promise.allSettled(notificationPromises);

    logger.info('Auto-cancellation completed successfully', {
      escortId, acceptedMembershipId, cancelledCount: cancelledRequests.count,
      affectedAgencies: pendingRequests.map(r => r.agencyId)
    });

    return cancelledRequests.count;

  } catch (error) {
    logger.error('Error in auto-cancellation process', {
      error: error.message, stack: error.stack, escortId, acceptedMembershipId
    });
    
    // No lanzar error para no afectar la transacción principal
    return 0;
  }
};

// ✅ HELPER: VALIDAR PERÍODO DE GRACIA PARA DEJAR AGENCIA
const validateLeaveEligibility = async (escortId) => {
  const escort = await prisma.escort.findUnique({
    where: { id: escortId },
    select: { isVerified: true, verifiedAt: true, verifiedBy: true }
  });

  if (!escort) return { canLeave: false, error: 'Datos de escort no encontrados' };

  if (escort.isVerified && escort.verifiedAt) {
    const verificationDate = new Date(escort.verifiedAt);
    const thirtyDaysLater = new Date(verificationDate.getTime() + (30 * 24 * 60 * 60 * 1000));
    const now = new Date();

    if (now < thirtyDaysLater) {
      const daysRemaining = Math.ceil((thirtyDaysLater - now) / (1000 * 60 * 60 * 24));
      return {
        canLeave: false,
        error: `Debes esperar ${daysRemaining} día(s) más para dejar la agencia después de ser verificada`,
        reason: 'VERIFICATION_GRACE_PERIOD',
        daysRemaining,
        gracePeriodEnds: thirtyDaysLater
      };
    }
  }

  return { canLeave: true };
};

// ✅ HELPER: VERIFICAR SI ESCORT TIENE MEMBRESÍA ACTIVA - NUEVA FUNCIÓN
const hasActiveMembership = async (escortId) => {
  const activeMembership = await prisma.agencyMembership.findFirst({
    where: { escortId, status: 'ACTIVE' },
    include: { agency: { include: { user: { select: { firstName: true, lastName: true } } } } }
  });
  
  return {
    hasActive: !!activeMembership,
    membership: activeMembership
  };
};

// ✅ SOLICITAR UNIRSE A AGENCIA (ESCORT) - CORREGIDO
const requestToJoinAgency = catchAsync(async (req, res) => {
  const escortUserId = req.user.id;
  const { agencyId } = req.params;
  const { message } = req.body;

  if (req.user.userType !== 'ESCORT') throw new AppError('Solo escorts pueden solicitar unirse a agencias', 403, 'ESCORT_ONLY');
  if (!req.user.escort) throw new AppError('Datos de escort no encontrados', 500, 'ESCORT_DATA_MISSING');

  // ✅ VALIDAR ELEGIBILIDAD
  const eligibility = await validateJoinEligibility(req.user.escort.id);
  if (!eligibility.canJoin) {
    throw new AppError(eligibility.error, 409, eligibility.reason);
  }

  const agency = await prisma.agency.findUnique({
    where: { userId: agencyId },
    include: { user: { select: { id: true, firstName: true, lastName: true, isActive: true, isBanned: true } } }
  });

  if (!agency || !agency.user.isActive || agency.user.isBanned) {
    throw new AppError('Agencia no encontrada o no disponible', 404, 'AGENCY_NOT_FOUND');
  }

  const existingMembership = await prisma.agencyMembership.findFirst({
    where: { escortId: req.user.escort.id, agencyId: agency.id, status: { in: ['PENDING', 'ACTIVE', 'REJECTED'] } }
  });

  if (existingMembership) {
    if (existingMembership.status === 'PENDING') throw new AppError('Ya tienes una solicitud pendiente con esta agencia', 409, 'MEMBERSHIP_PENDING');
    if (existingMembership.status === 'ACTIVE') throw new AppError('Ya eres miembro activo de esta agencia', 409, 'MEMBERSHIP_ACTIVE');
    
    if (existingMembership.status === 'REJECTED') {
      const updatedMembership = await prisma.agencyMembership.update({
        where: { id: existingMembership.id },
        data: { status: 'PENDING', updatedAt: new Date() },
        include: {
          escort: { include: { user: { select: { id: true, username: true, firstName: true, lastName: true, avatar: true, profileViews: true } } } },
          agency: { include: { user: { select: { firstName: true, lastName: true } } } }
        }
      });

      await prisma.notification.create({
        data: {
          userId: agency.user.id, type: 'MEMBERSHIP_REQUEST', title: 'Nueva solicitud de membresía',
          message: `${req.user.firstName} ${req.user.lastName} quiere unirse a tu agencia nuevamente`,
          data: {
            membershipId: updatedMembership.id, escortId: req.user.escort.id,
            escortName: `${req.user.firstName} ${req.user.lastName}`,
            message: sanitizeString(message) || null, isReapplication: true
          },
          actionUrl: `/agency/memberships/${updatedMembership.id}`
        }
      }).catch(error => logger.warn('Failed to create notification:', error));

      logger.info('Agency membership re-requested', {
        membershipId: updatedMembership.id, escortId: req.user.escort.id, agencyId: agency.id, escortUserId
      });

      return res.status(201).json({
        success: true, message: 'Solicitud enviada exitosamente',
        data: {
          membership: {
            id: updatedMembership.id, status: updatedMembership.status, createdAt: updatedMembership.createdAt,
            agency: { id: agency.id, name: `${agency.user.firstName} ${agency.user.lastName}` }
          }
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  const membership = await prisma.agencyMembership.create({
    data: { escortId: req.user.escort.id, agencyId: agency.id, status: 'PENDING', role: 'MEMBER' },
    include: {
      escort: { include: { user: { select: { id: true, username: true, firstName: true, lastName: true, avatar: true, profileViews: true } } } },
      agency: { include: { user: { select: { firstName: true, lastName: true } } } }
    }
  });

  await prisma.notification.create({
    data: {
      userId: agency.user.id, type: 'MEMBERSHIP_REQUEST', title: 'Nueva solicitud de membresía',
      message: `${req.user.firstName} ${req.user.lastName} quiere unirse a tu agencia`,
      data: {
        membershipId: membership.id, escortId: req.user.escort.id,
        escortName: `${req.user.firstName} ${req.user.lastName}`,
        message: sanitizeString(message) || null
      },
      actionUrl: `/agency/memberships/${membership.id}`
    }
  }).catch(error => logger.warn('Failed to create notification:', error));

  logger.info('Agency membership requested', {
    membershipId: membership.id, escortId: req.user.escort.id, agencyId: agency.id, escortUserId
  });

  res.status(201).json({
    success: true, message: 'Solicitud enviada exitosamente',
    data: {
      membership: {
        id: membership.id, status: membership.status, createdAt: membership.createdAt,
        agency: { id: agency.id, name: `${agency.user.firstName} ${agency.user.lastName}` }
      }
    },
    timestamp: new Date().toISOString()
  });
});

// ✅ CANCELAR SOLICITUD PROPIA (ESCORT) - CORREGIDO CON REJECTED
const cancelOwnRequest = catchAsync(async (req, res) => {
  const escortUserId = req.user.id;
  const { membershipId } = req.params;
  const { reason } = req.body;

  if (req.user.userType !== 'ESCORT') throw new AppError('Solo escorts pueden cancelar sus solicitudes', 403, 'ESCORT_ONLY');
  if (!req.user.escort) throw new AppError('Datos de escort no encontrados', 500, 'ESCORT_DATA_MISSING');

  // Buscar la solicitud pendiente que pertenece al escort
  const membership = await prisma.agencyMembership.findFirst({
    where: { 
      id: membershipId, 
      escortId: req.user.escort.id, 
      status: 'PENDING' 
    },
    include: { 
      agency: { 
        include: { 
          user: { select: { id: true, firstName: true, lastName: true } } 
        } 
      } 
    }
  });

  if (!membership) {
    throw new AppError('Solicitud no encontrada o no se puede cancelar', 404, 'REQUEST_NOT_FOUND');
  }

  // Cancelar la solicitud usando REJECTED en lugar de CANCELLED
  const cancelledMembership = await prisma.agencyMembership.update({
    where: { id: membershipId },
    data: { 
      status: 'REJECTED', 
      updatedAt: new Date()
    }
  });

  // Crear notificación para la agencia
  await prisma.notification.create({
    data: {
      userId: membership.agency.user.id,
      type: 'MEMBERSHIP_CANCELLED',
      title: 'Solicitud cancelada por escort',
      message: `${req.user.firstName} ${req.user.lastName} canceló su solicitud para unirse a tu agencia`,
      data: {
        membershipId: membership.id,
        escortId: req.user.escort.id,
        escortName: `${req.user.firstName} ${req.user.lastName}`,
        cancelReason: sanitizeString(reason) || 'Sin razón especificada',
        cancelledBy: 'ESCORT',
        cancelledAt: new Date().toISOString()
      }
    }
  }).catch(error => logger.warn('Failed to create cancellation notification:', error));

  logger.info('Agency membership request cancelled by escort', {
    membershipId: membership.id,
    escortId: req.user.escort.id,
    agencyId: membership.agencyId,
    reason: sanitizeString(reason) || 'No reason provided',
    cancelledBy: escortUserId
  });

  res.status(200).json({
    success: true,
    message: 'Solicitud cancelada exitosamente',
    data: {
      membership: {
        id: cancelledMembership.id,
        status: cancelledMembership.status,
        cancelledAt: new Date().toISOString(),
        agency: {
          id: membership.agency.id,
          name: `${membership.agency.user.firstName} ${membership.agency.user.lastName}`
        }
      }
    },
    timestamp: new Date().toISOString()
  });
});

// ✅ INVITAR ESCORT (AGENCIA)
const inviteEscort = catchAsync(async (req, res) => {
  const agencyUserId = req.user.id;
  const { escortId } = req.params;
  const { message, proposedCommission = 0.1, proposedRole = 'MEMBER', proposedBenefits } = req.body;

  if (req.user.userType !== 'AGENCY') throw new AppError('Solo agencias pueden invitar escorts', 403, 'AGENCY_ONLY');
  if (!req.user.agency) throw new AppError('Datos de agencia no encontrados', 500, 'AGENCY_DATA_MISSING');

  const sanitizedMessage = sanitizeString(message);
  const sanitizedCommission = Math.max(0, Math.min(1, parseFloat(proposedCommission) || 0.1));

  const escort = await prisma.escort.findUnique({
    where: { id: escortId },
    include: { user: { select: { id: true, firstName: true, lastName: true, isActive: true, isBanned: true } } }
  });

  if (!escort || !escort.user.isActive || escort.user.isBanned) {
    throw new AppError('Escort no encontrado o no disponible', 404, 'ESCORT_NOT_FOUND');
  }

  // ✅ VERIFICAR SI YA TIENE MEMBRESÍA ACTIVA
  const activeCheck = await hasActiveMembership(escortId);
  if (activeCheck.hasActive) {
    throw new AppError(
      `Esta escort ya pertenece a la agencia ${activeCheck.membership.agency.user.firstName} ${activeCheck.membership.agency.user.lastName}`,
      409, 'ESCORT_ALREADY_HAS_AGENCY'
    );
  }

  const [existingInvitation, existingMembership] = await Promise.all([
    prisma.agencyInvitation.findFirst({
      where: { agencyId: req.user.agency.id, escortId, status: 'PENDING', expiresAt: { gt: new Date() } }
    }),
    prisma.agencyMembership.findFirst({
      where: { escortId, agencyId: req.user.agency.id, status: { in: ['PENDING', 'ACTIVE'] } }
    })
  ]);

  if (existingInvitation) throw new AppError('Ya existe una invitación pendiente para este escort', 409, 'INVITATION_EXISTS');
  if (existingMembership) throw new AppError('Este escort ya es miembro de tu agencia', 409, 'ESCORT_ALREADY_MEMBER');

  const invitation = await prisma.agencyInvitation.create({
    data: {
      agencyId: req.user.agency.id, escortId, message: sanitizedMessage || null,
      proposedCommission: sanitizedCommission, proposedRole, proposedBenefits: proposedBenefits || null,
      invitedBy: agencyUserId, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    },
    include: {
      agency: { include: { user: { select: { firstName: true, lastName: true, avatar: true } } } },
      escort: { include: { user: { select: { firstName: true, lastName: true } } } }
    }
  });

  await prisma.notification.create({
    data: {
      userId: escort.user.id, type: 'AGENCY_INVITE', title: 'Invitación de agencia',
      message: `${req.user.firstName} ${req.user.lastName} te ha invitado a unirte a su agencia`,
      data: {
        invitationId: invitation.id, agencyId: req.user.agency.id,
        agencyName: `${req.user.firstName} ${req.user.lastName}`,
        proposedCommission: sanitizedCommission, proposedRole, message: sanitizedMessage || null
      },
      actionUrl: `/escort/invitations/${invitation.id}`
    }
  }).catch(error => logger.warn('Failed to create notification:', error));

  logger.info('Escort invited to agency', {
    invitationId: invitation.id, agencyId: req.user.agency.id, escortId, invitedBy: agencyUserId
  });

  res.status(201).json({
    success: true, message: 'Invitación enviada exitosamente',
    data: {
      invitation: {
        id: invitation.id, status: invitation.status, proposedCommission: invitation.proposedCommission,
        proposedRole: invitation.proposedRole, expiresAt: invitation.expiresAt, createdAt: invitation.createdAt,
        escort: { id: escort.id, name: `${escort.user.firstName} ${escort.user.lastName}` }
      }
    },
    timestamp: new Date().toISOString()
  });
});

// ✅ RESPONDER INVITACIÓN (ESCORT) - MEJORADO
const respondToInvitation = catchAsync(async (req, res) => {
  const escortUserId = req.user.id;
  const { invitationId } = req.params;
  const { action, message } = req.body;

  if (req.user.userType !== 'ESCORT') throw new AppError('Solo escorts pueden responder invitaciones', 403, 'ESCORT_ONLY');
  if (!req.user.escort) throw new AppError('Datos de escort no encontrados', 500, 'ESCORT_DATA_MISSING');
  if (!['accept', 'reject'].includes(action)) throw new AppError('Acción inválida. Debe ser "accept" o "reject"', 400, 'INVALID_ACTION');

  // ✅ VALIDAR ELEGIBILIDAD AL ACEPTAR
  if (action === 'accept') {
    const eligibility = await validateJoinEligibility(req.user.escort.id);
    if (!eligibility.canJoin) {
      throw new AppError(`No puedes aceptar esta invitación: ${eligibility.error}`, 409, eligibility.reason);
    }
  }

  const invitation = await prisma.agencyInvitation.findFirst({
    where: { id: invitationId, escortId: req.user.escort.id, status: 'PENDING', expiresAt: { gt: new Date() } },
    include: { agency: { include: { user: { select: { id: true, firstName: true, lastName: true } } } } }
  });

  if (!invitation) throw new AppError('Invitación no encontrada o expirada', 404, 'INVITATION_NOT_FOUND');

  const newStatus = action === 'accept' ? 'ACCEPTED' : 'REJECTED';
  const updatedInvitation = await prisma.agencyInvitation.update({
    where: { id: invitationId },
    data: { status: newStatus, respondedAt: new Date() }
  });

  let membership = null;
  let cancelledCount = 0;

  if (action === 'accept') {
    const result = await prisma.$transaction(async (tx) => {
      const newMembership = await tx.agencyMembership.create({
        data: {
          escortId: req.user.escort.id, agencyId: invitation.agencyId, status: 'ACTIVE',
          role: invitation.proposedRole, commissionRate: invitation.proposedCommission,
          approvedBy: invitation.invitedBy, approvedAt: new Date()
        }
      });

      await tx.agency.update({
        where: { id: invitation.agencyId },
        data: { totalEscorts: { increment: 1 }, activeEscorts: { increment: 1 } }
      });

      // ✅ CANCELAR OTRAS SOLICITUDES PENDIENTES
      const cancelled = await cancelOtherPendingRequests(req.user.escort.id, newMembership.id, tx);

      return { membership: newMembership, cancelledCount: cancelled };
    });

    membership = result.membership;
    cancelledCount = result.cancelledCount;
  }

  const notificationMessage = action === 'accept' 
    ? `${req.user.firstName} ${req.user.lastName} aceptó tu invitación`
    : `${req.user.firstName} ${req.user.lastName} rechazó tu invitación`;

  await prisma.notification.create({
    data: {
      userId: invitation.agency.user.id, type: 'AGENCY_INVITE', title: `Respuesta a invitación`,
      message: notificationMessage,
      data: {
        invitationId: invitation.id, escortId: req.user.escort.id,
        escortName: `${req.user.firstName} ${req.user.lastName}`,
        action, membershipId: membership?.id || null, message: sanitizeString(message) || null,
        cancelledOtherRequests: cancelledCount
      }
    }
  }).catch(error => logger.warn('Failed to create notification:', error));

  logger.info('Agency invitation responded', {
    invitationId: invitation.id, escortId: req.user.escort.id, agencyId: invitation.agencyId, 
    action, cancelledCount
  });

  res.status(200).json({
    success: true,
    message: action === 'accept' ? 'Invitación aceptada exitosamente' : 'Invitación rechazada',
    data: { 
      invitation: updatedInvitation, 
      membership: membership,
      cancelledOtherRequests: cancelledCount
    },
    timestamp: new Date().toISOString()
  });
});

// ✅ GESTIONAR SOLICITUD DE MEMBRESÍA (AGENCIA) - CORREGIDO AL 100%
const manageMembershipRequest = catchAsync(async (req, res) => {
  const agencyUserId = req.user.id;
  const { membershipId } = req.params;
  const { action, message, commissionRate } = req.body;

  if (req.user.userType !== 'AGENCY') throw new AppError('Solo agencias pueden gestionar membresías', 403, 'AGENCY_ONLY');
  if (!req.user.agency) throw new AppError('Datos de agencia no encontrados', 500, 'AGENCY_DATA_MISSING');
  if (!['approve', 'reject'].includes(action)) throw new AppError('Acción inválida. Debe ser "approve" o "reject"', 400, 'INVALID_ACTION');

  const membership = await prisma.agencyMembership.findFirst({
    where: { id: membershipId, agencyId: req.user.agency.id, status: 'PENDING' },
    include: { 
      escort: { 
        include: { 
          user: { select: { id: true, firstName: true, lastName: true } },
          agencyMemberships: { 
            where: { status: 'ACTIVE' },
            include: { agency: { include: { user: { select: { firstName: true, lastName: true } } } } }
          }
        } 
      } 
    }
  });

  if (!membership) throw new AppError('Solicitud de membresía no encontrada', 404, 'MEMBERSHIP_NOT_FOUND');

  // ✅ VERIFICAR SI EL ESCORT YA FUE ACEPTADO EN OTRA AGENCIA
  if (action === 'approve' && membership.escort.agencyMemberships.length > 0) {
    const activeAgency = membership.escort.agencyMemberships[0];
    logger.warn('Attempt to approve escort already in agency', {
      membershipId, escortId: membership.escortId,
      currentAgency: `${activeAgency.agency.user.firstName} ${activeAgency.agency.user.lastName}`,
      requestingAgency: `${req.user.firstName} ${req.user.lastName}`
    });

    throw new AppError(
      `Esta escort ya fue aceptada en la agencia ${activeAgency.agency.user.firstName} ${activeAgency.agency.user.lastName}`,
      409, 'ESCORT_ALREADY_ACCEPTED_ELSEWHERE'
    );
  }

  const sanitizedCommissionRate = commissionRate ? Math.max(0, Math.min(1, parseFloat(commissionRate))) : 0.15;
  let cancelledCount = 0;

  const updatedMembership = await prisma.$transaction(async (tx) => {
    const newStatus = action === 'approve' ? 'ACTIVE' : 'REJECTED';
    const updateData = {
      status: newStatus, approvedBy: agencyUserId, approvedAt: new Date(),
      ...(action === 'approve' && { commissionRate: sanitizedCommissionRate, role: 'MEMBER' })
    };

    const updated = await tx.agencyMembership.update({
      where: { id: membershipId },
      data: updateData
    });

    if (action === 'approve') {
      await tx.agency.update({
        where: { id: req.user.agency.id },
        data: { totalEscorts: { increment: 1 }, activeEscorts: { increment: 1 } }
      });

      // ✅ CANCELAR OTRAS SOLICITUDES PENDIENTES
      cancelledCount = await cancelOtherPendingRequests(membership.escortId, membershipId, tx);
    }

    return updated;
  });

  const notificationMessage = action === 'approve'
    ? `Tu solicitud para unirte a ${req.user.firstName} ${req.user.lastName} fue aprobada`
    : `Tu solicitud para unirte a ${req.user.firstName} ${req.user.lastName} fue rechazada`;

  await prisma.notification.create({
    data: {
      userId: membership.escort.user.id, type: 'MEMBERSHIP_REQUEST',
      title: action === 'approve' ? 'Solicitud aprobada' : 'Solicitud rechazada',
      message: notificationMessage,
      data: {
        membershipId: membership.id, agencyId: req.user.agency.id,
        agencyName: `${req.user.firstName} ${req.user.lastName}`,
        action, commissionRate: sanitizedCommissionRate || null, message: sanitizeString(message) || null,
        cancelledOtherRequests: cancelledCount
      }
    }
  }).catch(error => logger.warn('Failed to create notification:', error));

  logger.info('Membership request managed', {
    membershipId: membership.id, agencyId: req.user.agency.id, escortId: membership.escortId, 
    action, managedBy: agencyUserId, cancelledCount
  });

  res.status(200).json({
    success: true,
    message: action === 'approve' ? 'Solicitud aprobada exitosamente' : 'Solicitud rechazada',
    data: { 
      membership: updatedMembership,
      cancelledOtherRequests: cancelledCount
    },
    timestamp: new Date().toISOString()
  });
});

// ✅ OBTENER ESCORTS DE AGENCIA - CORREGIDO AL 100%
const getAgencyEscorts = catchAsync(async (req, res) => {
  const agencyUserId = req.user.id;
  const { page = 1, limit = 20, status = 'active', search } = req.query;

  if (req.user.userType !== 'AGENCY') throw new AppError('Solo agencias pueden ver sus escorts', 403, 'AGENCY_ONLY');
  if (!req.user.agency) throw new AppError('Datos de agencia no encontrados', 500, 'AGENCY_DATA_MISSING');

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
  const offset = (pageNum - 1) * limitNum;

  let whereClause, includeClause;

  if (status === 'pending') {
    whereClause = {
      agencyId: req.user.agency.id, 
      status: 'PENDING',
      // ✅ FILTRO CRÍTICO: Solo escorts sin membresía activa en ninguna agencia
      escort: {
        agencyMemberships: {
          none: {
            status: 'ACTIVE'
          }
        },
        user: {
          isActive: true,
          isBanned: false,
          ...(search && {
            OR: [
              { firstName: { contains: sanitizeString(search), mode: 'insensitive' } },
              { lastName: { contains: sanitizeString(search), mode: 'insensitive' } },
              { username: { contains: sanitizeString(search), mode: 'insensitive' } }
            ]
          })
        }
      }
    };

    includeClause = {
      escort: {
        include: {
          user: {
            select: { id: true, username: true, firstName: true, lastName: true, avatar: true, phone: true, bio: true, profileViews: true, lastActiveAt: true, createdAt: true }
          },
          // ✅ INCLUIR VERIFICACIÓN DE MEMBRESÍAS ACTIVAS
          agencyMemberships: {
            where: { status: 'ACTIVE' },
            include: { agency: { include: { user: { select: { firstName: true, lastName: true } } } } }
          }
        }
      }
    };
  } else {
    whereClause = {
      agencyId: req.user.agency.id,
      ...(status === 'active' && { status: 'ACTIVE' }),
      ...(status === 'all' && {}),
      ...(search && {
        escort: {
          user: {
            OR: [
              { firstName: { contains: sanitizeString(search), mode: 'insensitive' } },
              { lastName: { contains: sanitizeString(search), mode: 'insensitive' } },
              { username: { contains: sanitizeString(search), mode: 'insensitive' } }
            ]
          }
        }
      })
    };

    includeClause = {
      escort: {
        include: {
          user: {
            select: { id: true, username: true, firstName: true, lastName: true, avatar: true, phone: true, profileViews: true, lastActiveAt: true, createdAt: true }
          },
          _count: { select: { agencyMemberships: { where: { status: 'ACTIVE' } } } }
        }
      }
    };
  }

  try {
    const [memberships, totalCount] = await Promise.all([
      prisma.agencyMembership.findMany({
        where: whereClause, include: includeClause, orderBy: { createdAt: 'desc' }, skip: offset, take: limitNum
      }),
      prisma.agencyMembership.count({ where: whereClause })
    ]);

    // ✅ FILTRO ADICIONAL: Remover solicitudes de escorts que ya tienen membresía activa
    let validMemberships = memberships;
    if (status === 'pending') {
      validMemberships = memberships.filter(membership => {
        const hasActiveMembership = membership.escort.agencyMemberships.length > 0;
        
        if (hasActiveMembership) {
          logger.info('Filtering out escort with active membership', {
            escortId: membership.escort.id,
            escortName: `${membership.escort.user.firstName} ${membership.escort.user.lastName}`,
            activeMembershipAgency: membership.escort.agencyMemberships[0]?.agency?.user?.firstName,
            requestingAgency: `${req.user.firstName} ${req.user.lastName}`
          });
        }
        
        return !hasActiveMembership;
      });
    }

    const formattedEscorts = validMemberships.map(membership => {
      const baseData = {
        membershipId: membership.id, status: membership.status, role: membership.role,
        commissionRate: membership.commissionRate, joinedAt: membership.createdAt, approvedAt: membership.approvedAt,
        escort: {
          id: membership.escort.id, user: membership.escort.user, isVerified: membership.escort.isVerified,
          rating: membership.escort.rating, totalRatings: membership.escort.totalRatings, age: membership.escort.age,
          services: membership.escort.services, currentPosts: membership.escort.currentPosts, totalBookings: membership.escort.totalBookings,
        }
      };

      if (status === 'pending') {
        return {
          ...baseData, id: membership.id,
          name: `${membership.escort.user.firstName} ${membership.escort.user.lastName}`,
          avatar: membership.escort.user.avatar || '/default-avatar.png',
          profileImage: membership.escort.user.avatar || '/default-avatar.png',
          age: membership.escort.age || 25, verified: membership.escort.isVerified || false,
          applicationDate: membership.createdAt, location: `República Dominicana, Santo Domingo`,
          applicationMessage: membership.escort.user.bio || `Solicitud para unirse a la agencia.`,
          description: membership.escort.user.bio || 'Sin descripción disponible',
          languages: membership.escort.languages || ['Español'], availability: 'Tiempo completo',
          services: membership.escort.services || [], phone: membership.escort.user.phone || '+1-829-XXX-XXXX',
          rating: membership.escort.rating || 4.5, likes: 0, isOnline: true, canJoinAgency: true, agency: null,
          escortId: membership.escort.id,
          hasActiveMembership: false // ✅ Garantizar que está marcado como disponible
        };
      }

      return { ...baseData, stats: membership.escort._count || {} };
    });

    // ✅ ACTUALIZAR CONTEO BASADO EN ESCORTS VÁLIDOS
    const validCount = validMemberships.length;
    const adjustedPagination = {
      page: pageNum, limit: limitNum, total: validCount, pages: Math.ceil(validCount / limitNum),
      hasNext: pageNum * limitNum < validCount, hasPrev: pageNum > 1
    };

    logger.info('Agency escorts fetched', {
      agencyId: req.user.agency.id, status, search,
      originalCount: memberships.length, validCount, filteredOut: memberships.length - validCount
    });

    res.status(200).json({
      success: true,
      data: { escorts: formattedEscorts, pagination: adjustedPagination, filters: { status, search } },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Get agency escorts failed', {
      error: error.message, stack: error.stack, agencyId: req.user.agency?.id, userId: agencyUserId, status, search
    });
    throw new AppError('Error obteniendo escorts de la agencia', 500, 'GET_AGENCY_ESCORTS_ERROR');
  }
});

// ✅ OBTENER PRICING DE VERIFICACIÓN
const getVerificationPricing = catchAsync(async (req, res) => {
  let pricing = [];
  
  try {
    pricing = await prisma.verificationPricing.findMany({
      where: { isActive: true }, orderBy: { cost: 'asc' }
    });
  } catch (error) {
    console.log('⚠️ Error fetching pricing from DB:', error.message);
  }
  
  if (!pricing || pricing.length === 0) {
    pricing = [
      {
        id: 'default-basic', name: 'Verificación Básica', cost: 50,
        description: 'Verificación estándar con beneficios básicos',
        features: ['Badge verificado', 'Mayor confianza'], duration: 365, isActive: true
      },
      {
        id: 'default-premium', name: 'Verificación Premium', cost: 75,
        description: 'Verificación completa con todos los beneficios',
        features: ['Badge verificado', 'Mayor confianza', 'Destacado en búsquedas', 'Prioridad en resultados'],
        duration: null, isActive: true
      },
      {
        id: 'default-vip', name: 'Verificación VIP', cost: 100,
        description: 'Verificación premium con beneficios exclusivos',
        features: ['Badge verificado', 'Mayor confianza', 'Destacado en búsquedas', 'Prioridad máxima', 'Soporte dedicado'],
        duration: null, isActive: true
      }
    ];
  }

  res.status(200).json({ success: true, data: pricing, timestamp: new Date().toISOString() });
});

// ✅ VERIFICAR ESCORT
const verifyEscort = catchAsync(async (req, res) => {
  const agencyUserId = req.user.id;
  const { escortId } = req.params;
  const { pricingId, verificationNotes } = req.body;

  if (req.user.userType !== 'AGENCY') throw new AppError('Solo agencias pueden verificar escorts', 403, 'AGENCY_ONLY');
  if (!req.user.agency) throw new AppError('Datos de agencia no encontrados', 500, 'AGENCY_DATA_MISSING');

  const validationResult = await require('../utils/validators').canVerifyEscort(req.user.agency.id, escortId);
  
  if (!validationResult.canVerify) {
    throw new AppError(validationResult.error, validationResult.error.includes('ya está verificado') ? 409 : 404, 'VERIFICATION_NOT_ALLOWED');
  }

  const membership = validationResult.membership;
  const isRenewal = validationResult.isRenewal || false;

  let pricing = null;
  
  try {
    pricing = await prisma.verificationPricing.findUnique({
      where: { id: pricingId, isActive: true }
    });
  } catch (error) {
    console.log('⚠️ Error fetching pricing from DB:', error.message);
  }

  if (!pricing) {
    const defaultPricingMap = {
      'default-basic': { id: 'default-basic', name: 'Verificación Básica', cost: 10, description: 'Verificación mensual estándar según requerimientos', features: ['Badge verificado', 'Mayor confianza', 'Renovación mensual'], duration: 30 },
      'default-premium': { id: 'default-premium', name: 'Verificación Premium', cost: 10, description: 'Verificación mensual premium', features: ['Badge verificado', 'Mayor confianza', 'Destacado en búsquedas', 'Renovación mensual'], duration: 30 },
      'default-vip': { id: 'default-vip', name: 'Verificación VIP', cost: 10, description: 'Verificación mensual VIP', features: ['Badge verificado', 'Mayor confianza', 'Destacado en búsquedas', 'Prioridad máxima', 'Renovación mensual'], duration: 30 }
    };
    
    pricing = defaultPricingMap[pricingId] || {
      id: 'default-pricing-id', name: 'Verificación Estándar', cost: 10, description: 'Verificación mensual de escort',
      features: ['Badge verificado', 'Mayor confianza', 'Renovación mensual'], duration: 30
    };
  }

  const result = await prisma.$transaction(async (tx) => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (pricing.duration || 30));

    let escortVerification;
    try {
      escortVerification = await tx.escortVerification.create({
        data: {
          agencyId: req.user.agency.id, escortId, pricingId: pricing.id, status: 'COMPLETED',
          startsAt: new Date(), expiresAt, verificationNotes: verificationNotes || null,
          verifiedBy: agencyUserId, completedAt: new Date(),
          verificationSteps: { documentVerification: true, profileVerification: true, paymentCompleted: true }
        }
      });
    } catch (verificationError) {
      escortVerification = {
        id: `verification_${Date.now()}`, status: 'COMPLETED', startsAt: new Date(), expiresAt, completedAt: new Date()
      };
    }

    const updatedEscort = await tx.escort.update({
      where: { id: escortId },
      data: {
        isVerified: true, verifiedAt: new Date(), verifiedBy: req.user.agency.id.toString(), verificationExpiresAt: expiresAt
      }
    });

    const updatedAgency = await tx.agency.update({
      where: { id: req.user.agency.id },
      data: { verifiedEscorts: { increment: isRenewal ? 0 : 1 }, totalVerifications: { increment: 1 } }
    });

    try {
      await tx.userReputation.upsert({
        where: { userId: membership.escort.user.id },
        update: {
          trustScore: { increment: isRenewal ? 5 : 25 }, overallScore: { increment: isRenewal ? 3 : 15 }, lastScoreUpdate: new Date()
        },
        create: {
          userId: membership.escort.user.id, overallScore: 15, trustScore: 25, responseRate: 0,
          profileCompleteness: 0, discoveryScore: 0, trendingScore: 0, qualityScore: 0, spamScore: 0, reportScore: 0, lastScoreUpdate: new Date()
        }
      });
    } catch (reputationError) {
      console.log('⚠️ Could not update reputation (non-critical):', reputationError.message);
    }

    return { verification: escortVerification, escort: updatedEscort, agency: updatedAgency, pricing };
  });

  try {
    await prisma.notification.create({
      data: {
        userId: membership.escort.user.id, type: 'VERIFICATION_COMPLETED',
        title: isRenewal ? '¡Verificación renovada!' : '¡Verificación completada!',
        message: `Tu perfil ha sido ${isRenewal ? 'renovado' : 'verificado'} por ${req.user.firstName} ${req.user.lastName}`,
        data: {
          verificationId: result.verification.id, agencyId: req.user.agency.id,
          agencyName: `${req.user.firstName} ${req.user.lastName}`, pricingName: pricing.name,
          cost: pricing.cost, expiresAt: result.verification.expiresAt, isRenewal
        }
      }
    });
  } catch (notificationError) {
    console.log('⚠️ Could not create notification (non-critical):', notificationError.message);
  }

  logger.info('Escort verified by agency (enhanced)', {
    verificationId: result.verification.id, escortId, agencyId: req.user.agency.id, verifiedBy: agencyUserId,
    pricingId, cost: pricing.cost, isRenewal, expiresAt: result.verification.expiresAt,
    escortName: `${membership.escort.user.firstName} ${membership.escort.user.lastName}`,
    agencyName: `${req.user.firstName} ${req.user.lastName}`
  });

  res.status(200).json({
    success: true,
    message: `¡${membership.escort.user.firstName} ${membership.escort.user.lastName} ha sido ${isRenewal ? 'renovada' : 'verificada'} exitosamente!`,
    data: {
      verification: {
        id: result.verification.id, status: result.verification.status, completedAt: result.verification.completedAt,
        expiresAt: result.verification.expiresAt, isRenewal,
        pricing: { id: pricing.id, name: pricing.name, cost: pricing.cost, features: pricing.features, duration: pricing.duration },
        escort: {
          id: membership.escort.id, name: `${membership.escort.user.firstName} ${membership.escort.user.lastName}`,
          isVerified: true, verifiedAt: result.escort.verifiedAt, verificationExpiresAt: result.escort.verificationExpiresAt
        },
        agency: {
          id: req.user.agency.id, name: `${req.user.firstName} ${req.user.lastName}`,
          verifiedEscorts: result.agency.verifiedEscorts, totalVerifications: result.agency.totalVerifications
        }
      }
    },
    timestamp: new Date().toISOString()
  });
});

// ✅ OBTENER ESTADÍSTICAS DE AGENCIA
const getAgencyStats = catchAsync(async (req, res) => {
  const agencyUserId = req.user.id;

  if (req.user.userType !== 'AGENCY') throw new AppError('Solo agencias pueden ver estadísticas', 403, 'AGENCY_ONLY');
  if (!req.user.agency) throw new AppError('Datos de agencia no encontrados', 500, 'AGENCY_DATA_MISSING');

  const [membershipStats, invitationStats, verificationStats, topEscorts] = await Promise.all([
    prisma.agencyMembership.groupBy({ by: ['status'], where: { agencyId: req.user.agency.id }, _count: true }),
    prisma.agencyInvitation.groupBy({ by: ['status'], where: { agencyId: req.user.agency.id }, _count: true }).catch(() => []),
    prisma.escortVerification.findMany({
      where: { agencyId: req.user.agency.id }, include: { pricing: { select: { cost: true } } }
    }).catch(() => {
      return prisma.agencyMembership.findMany({
        where: { agencyId: req.user.agency.id, escort: { isVerified: true } }
      }).then(memberships => memberships.map(m => ({ pricing: { cost: 10 }, status: 'COMPLETED', completedAt: new Date() })));
    }),
    prisma.agencyMembership.findMany({
      where: { agencyId: req.user.agency.id, status: 'ACTIVE' },
      include: { escort: { include: { user: { select: { firstName: true, lastName: true, avatar: true } } } } },
      orderBy: { escort: { rating: 'desc' } }, take: 5
    })
  ]);

  const membershipsByStatus = membershipStats.reduce((acc, item) => { acc[item.status] = item._count; return acc; }, {});
  const invitationsByStatus = invitationStats.reduce((acc, item) => { acc[item.status] = item._count; return acc; }, {});
  const totalVerificationRevenue = verificationStats.reduce((sum, v) => sum + (v.pricing?.cost || 10), 0);

  const stats = {
    memberships: {
      total: membershipStats.reduce((sum, item) => sum + item._count, 0), byStatus: membershipsByStatus,
      active: membershipsByStatus.ACTIVE || 0, pending: membershipsByStatus.PENDING || 0
    },
    invitations: {
      total: invitationStats.reduce((sum, item) => sum + item._count, 0), byStatus: invitationsByStatus,
      pending: invitationsByStatus.PENDING || 0, accepted: invitationsByStatus.ACCEPTED || 0, rejected: invitationsByStatus.REJECTED || 0
    },
    verifications: {
      total: verificationStats.length, totalRevenue: totalVerificationRevenue,
      averageCost: verificationStats.length > 0 ? totalVerificationRevenue / verificationStats.length : 10, monthlyRevenue: totalVerificationRevenue
    },
    topEscorts: topEscorts.map(membership => ({
      id: membership.escort.id, name: `${membership.escort.user.firstName} ${membership.escort.user.lastName}`,
      avatar: membership.escort.user.avatar, rating: membership.escort.rating, totalRatings: membership.escort.totalRatings,
      isVerified: membership.escort.isVerified, totalBookings: membership.escort.totalBookings,
      verificationStatus: membership.escort.isVerified ? 'verified' : 'pending'
    }))
  };

  res.status(200).json({ success: true, data: stats, timestamp: new Date().toISOString() });
});

// ✅ OBTENER INVITACIONES (ESCORT)
const getEscortInvitations = catchAsync(async (req, res) => {
  const escortUserId = req.user.id;
  const { page = 1, limit = 20, status = 'PENDING' } = req.query;

  if (req.user.userType !== 'ESCORT') throw new AppError('Solo escorts pueden ver sus invitaciones', 403, 'ESCORT_ONLY');
  if (!req.user.escort) throw new AppError('Datos de escort no encontrados', 500, 'ESCORT_DATA_MISSING');

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
  const offset = (pageNum - 1) * limitNum;

  const whereClause = {
    escortId: req.user.escort.id, status: status.toUpperCase(), expiresAt: { gt: new Date() }
  };

  try {
    const [invitations, totalCount] = await Promise.all([
      prisma.agencyInvitation.findMany({
        where: whereClause,
        include: { agency: { include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true, bio: true, website: true, phone: true, location: true } } } } },
        orderBy: { createdAt: 'desc' }, skip: offset, take: limitNum
      }),
      prisma.agencyInvitation.count({ where: whereClause })
    ]);

    const formattedInvitations = invitations.map(invitation => ({
      id: invitation.id, agencyId: invitation.agencyId,
      agencyName: `${invitation.agency.user.firstName} ${invitation.agency.user.lastName}`,
      agencyLogo: invitation.agency.user.avatar, location: invitation.agency.user.location?.city || invitation.agency.user.location?.country,
      message: invitation.message, status: invitation.status, proposedCommission: invitation.proposedCommission,
      proposedRole: invitation.proposedRole, proposedBenefits: invitation.proposedBenefits,
      createdAt: invitation.createdAt, expiresAt: invitation.expiresAt, verified: invitation.agency.isVerified || false,
      date: invitation.createdAt, requestDate: getRelativeTime(invitation.createdAt)
    }));

    const pagination = {
      page: pageNum, limit: limitNum, total: totalCount, pages: Math.ceil(totalCount / limitNum),
      hasNext: pageNum * limitNum < totalCount, hasPrev: pageNum > 1
    };

    res.status(200).json({
      success: true, data: { invitations: formattedInvitations, pagination }, timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Get escort invitations failed', {
      error: error.message, stack: error.stack, escortId: req.user.escort?.id, userId: escortUserId
    });
    throw new AppError('Error obteniendo invitaciones', 500, 'GET_INVITATIONS_ERROR');
  }
});

// ✅ OBTENER ESTADO DE MEMBRESÍA (ESCORT)
const getEscortMembershipStatus = catchAsync(async (req, res) => {
  const escortUserId = req.user.id;

  if (req.user.userType !== 'ESCORT') throw new AppError('Solo escorts pueden ver su estado de membresía', 403, 'ESCORT_ONLY');
  if (!req.user.escort) throw new AppError('Datos de escort no encontrados', 500, 'ESCORT_DATA_MISSING');

  try {
    const [activeMembership, pendingRequests] = await Promise.all([
      prisma.agencyMembership.findFirst({
        where: { escortId: req.user.escort.id, status: 'ACTIVE' },
        include: { agency: { include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true, bio: true, website: true, phone: true, location: true } } } } }
      }),
      prisma.agencyMembership.findMany({
        where: { escortId: req.user.escort.id, status: 'PENDING' },
        include: { agency: { include: { user: { select: { firstName: true, lastName: true, avatar: true } } } } }
      })
    ]);

    let status = 'independent';
    let currentAgency = null;

    if (activeMembership) {
      status = 'agency';
      currentAgency = {
        id: activeMembership.agency.id, name: `${activeMembership.agency.user.firstName} ${activeMembership.agency.user.lastName}`,
        logo: activeMembership.agency.user.avatar, description: activeMembership.agency.user.bio,
        location: activeMembership.agency.user.location?.city || activeMembership.agency.user.location?.country,
        verified: activeMembership.agency.isVerified, membershipId: activeMembership.id, role: activeMembership.role,
        commissionRate: activeMembership.commissionRate, joinedAt: activeMembership.createdAt,
        benefits: ['Verificación premium', 'Marketing profesional', 'Soporte 24/7', 'Eventos exclusivos']
      };
    } else if (pendingRequests.length > 0) {
      status = 'pending';
    }

    let verificationStatus = null;
    if (activeMembership) {
      const renewalCheck = await require('../utils/validators').needsVerificationRenewal(req.user.escort.id);
      verificationStatus = {
        isVerified: req.user.escort.isVerified, needsRenewal: renewalCheck.needsRenewal,
        expiringSoon: renewalCheck.expiringSoon, expiresAt: renewalCheck.expiresAt, daysUntilExpiry: renewalCheck.daysUntilExpiry
      };
    }

    res.status(200).json({
      success: true,
      data: {
        status, hasActiveMembership: !!activeMembership, hasPendingRequests: pendingRequests.length > 0,
        currentAgency, verificationStatus,
        pendingRequests: pendingRequests.map(req => ({
          id: req.id, agencyName: `${req.agency.user.firstName} ${req.agency.user.lastName}`,
          agencyLogo: req.agency.user.avatar, createdAt: req.createdAt
        }))
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Get escort membership status failed', {
      error: error.message, stack: error.stack, escortId: req.user.escort?.id, userId: escortUserId
    });
    throw new AppError('Error obteniendo estado de membresía', 500, 'GET_MEMBERSHIP_STATUS_ERROR');
  }
});

// ✅ SALIR DE AGENCIA (ESCORT) - CORREGIDO CON PERÍODO DE GRACIA
const leaveCurrentAgency = catchAsync(async (req, res) => {
  const escortUserId = req.user.id;
  const { reason } = req.body;

  if (req.user.userType !== 'ESCORT') throw new AppError('Solo escorts pueden salir de agencias', 403, 'ESCORT_ONLY');
  if (!req.user.escort) throw new AppError('Datos de escort no encontrados', 500, 'ESCORT_DATA_MISSING');

  // ✅ VALIDAR PERÍODO DE GRACIA
  const leaveEligibility = await validateLeaveEligibility(req.user.escort.id);
  if (!leaveEligibility.canLeave) {
    throw new AppError(leaveEligibility.error, 409, leaveEligibility.reason);
  }

  const activeMembership = await prisma.agencyMembership.findFirst({
    where: { escortId: req.user.escort.id, status: 'ACTIVE' },
    include: { agency: { include: { user: { select: { id: true, firstName: true, lastName: true } } } } }
  });

  if (!activeMembership) throw new AppError('No tienes una membresía activa en ninguna agencia', 404, 'NO_ACTIVE_MEMBERSHIP');

  await prisma.$transaction(async (tx) => {
    await tx.agencyMembership.update({
      where: { id: activeMembership.id },
      data: { status: 'REJECTED', updatedAt: new Date() }
    });

    await tx.escort.update({
      where: { id: req.user.escort.id },
      data: { isVerified: false, verifiedAt: null, verifiedBy: null, verificationExpiresAt: null }
    });

    await tx.agency.update({
      where: { id: activeMembership.agencyId },
      data: { activeEscorts: { decrement: 1 }, verifiedEscorts: { decrement: 1 } }
    });
  });

  await prisma.notification.create({
    data: {
      userId: activeMembership.agency.user.id, type: 'MEMBERSHIP_LEFT', title: 'Escort dejó la agencia',
      message: `${req.user.firstName} ${req.user.lastName} ha dejado tu agencia`,
      data: {
        membershipId: activeMembership.id, escortId: req.user.escort.id,
        escortName: `${req.user.firstName} ${req.user.lastName}`,
        reason: sanitizeString(reason) || 'Sin razón especificada', leftByEscort: true, verificationLost: true
      }
    }
  }).catch(error => logger.warn('Failed to create notification:', error));

  logger.info('Escort left agency', {
    membershipId: activeMembership.id, escortId: req.user.escort.id, agencyId: activeMembership.agencyId,
    reason, verificationRemoved: true
  });

  res.status(200).json({
    success: true,
    message: 'Has dejado la agencia exitosamente. Tu verificación ha sido removida.',
    data: {
      formerAgency: `${activeMembership.agency.user.firstName} ${activeMembership.agency.user.lastName}`,
      leftAt: new Date().toISOString(), verificationRemoved: true
    },
    timestamp: new Date().toISOString()
  });
});

// ✅ RENOVAR VERIFICACIÓN
const renewEscortVerification = catchAsync(async (req, res) => {
  const agencyUserId = req.user.id;
  const { escortId } = req.params;
  const { pricingId } = req.body;

  if (req.user.userType !== 'AGENCY') throw new AppError('Solo agencias pueden renovar verificaciones', 403, 'AGENCY_ONLY');
  if (!req.user.agency) throw new AppError('Datos de agencia no encontrados', 500, 'AGENCY_DATA_MISSING');

  const renewalCheck = await require('../utils/validators').needsVerificationRenewal(escortId);
  
  if (!renewalCheck.needsRenewal && !renewalCheck.expiringSoon) {
    throw new AppError('Esta verificación aún no necesita renovación', 400, 'RENEWAL_NOT_NEEDED');
  }

  req.body.isRenewal = true;
  return verifyEscort(req, res);
});

// ✅ OBTENER VERIFICACIONES PRÓXIMAS A EXPIRAR
const getExpiringVerifications = catchAsync(async (req, res) => {
  const agencyUserId = req.user.id;
  const { page = 1, limit = 20 } = req.query;

  if (req.user.userType !== 'AGENCY') throw new AppError('Solo agencias pueden ver verificaciones próximas a expirar', 403, 'AGENCY_ONLY');
  if (!req.user.agency) throw new AppError('Datos de agencia no encontrados', 500, 'AGENCY_DATA_MISSING');

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
  const offset = (pageNum - 1) * limitNum;

  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  try {
    const [escorts, totalCount] = await Promise.all([
      prisma.agencyMembership.findMany({
        where: {
          agencyId: req.user.agency.id, status: 'ACTIVE',
          escort: { isVerified: true, verificationExpiresAt: { lte: sevenDaysFromNow, gte: new Date() } }
        },
        include: { escort: { include: { user: { select: { firstName: true, lastName: true, avatar: true } } } } },
        orderBy: { escort: { verificationExpiresAt: 'asc' } }, skip: offset, take: limitNum
      }),
      prisma.agencyMembership.count({
        where: {
          agencyId: req.user.agency.id, status: 'ACTIVE',
          escort: { isVerified: true, verificationExpiresAt: { lte: sevenDaysFromNow, gte: new Date() } }
        }
      })
    ]);

    const formattedEscorts = escorts.map(membership => ({
      escortId: membership.escort.id, membershipId: membership.id,
      name: `${membership.escort.user.firstName} ${membership.escort.user.lastName}`,
      avatar: membership.escort.user.avatar, verificationExpiresAt: membership.escort.verificationExpiresAt,
      daysUntilExpiry: Math.ceil((membership.escort.verificationExpiresAt - new Date()) / (1000 * 60 * 60 * 24)),
      isUrgent: membership.escort.verificationExpiresAt <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      verifiedAt: membership.escort.verifiedAt
    }));

    const pagination = {
      page: pageNum, limit: limitNum, total: totalCount, pages: Math.ceil(totalCount / limitNum),
      hasNext: pageNum * limitNum < totalCount, hasPrev: pageNum > 1
    };

    res.status(200).json({
      success: true,
      data: {
        expiringVerifications: formattedEscorts, pagination,
        summary: { total: totalCount, urgent: formattedEscorts.filter(e => e.isUrgent).length }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Get expiring verifications failed', {
      error: error.message, stack: error.stack, agencyId: req.user.agency?.id, userId: agencyUserId
    });
    throw new AppError('Error obteniendo verificaciones próximas a expirar', 500, 'GET_EXPIRING_VERIFICATIONS_ERROR');
  }
});

// ✅ LIMPIAR SOLICITUDES OBSOLETAS - NUEVA FUNCIÓN PARA MANTENIMIENTO
const cleanupObsoleteRequests = catchAsync(async (req, res) => {
  if (req.user.userType !== 'ADMIN') {
    throw new AppError('Solo administradores pueden ejecutar limpieza de solicitudes', 403, 'ADMIN_ONLY');
  }

  try {
    // Buscar escorts que tienen membresía activa pero también solicitudes pendientes
    const escortsWithActiveAndPending = await prisma.escort.findMany({
      where: {
        agencyMemberships: {
          some: { status: 'ACTIVE' }
        }
      },
      include: {
        agencyMemberships: {
          where: {
            OR: [
              { status: 'ACTIVE' },
              { status: 'PENDING' }
            ]
          },
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

    let cleanedCount = 0;
    const cleanupResults = [];

    for (const escort of escortsWithActiveAndPending) {
      const activeMembership = escort.agencyMemberships.find(m => m.status === 'ACTIVE');
      const pendingMemberships = escort.agencyMemberships.filter(m => m.status === 'PENDING');

      if (activeMembership && pendingMemberships.length > 0) {
        // Cancelar todas las solicitudes pendientes usando REJECTED
        const cancelResult = await prisma.agencyMembership.updateMany({
          where: {
            escortId: escort.id,
            status: 'PENDING'
          },
          data: {
            status: 'REJECTED',
            updatedAt: new Date()
          }
        });

        cleanedCount += cancelResult.count;
        
        cleanupResults.push({
          escortId: escort.id,
          escortName: `${escort.user.firstName} ${escort.user.lastName}`,
          activeAgency: `${activeMembership.agency.user.firstName} ${activeMembership.agency.user.lastName}`,
          cancelledRequests: cancelResult.count,
          affectedAgencies: pendingMemberships.map(m => `${m.agency.user.firstName} ${m.agency.user.lastName}`)
        });

        logger.info('Cleaned up obsolete requests', {
          escortId: escort.id,
          escortName: `${escort.user.firstName} ${escort.user.lastName}`,
          activeAgency: activeMembership.agencyId,
          cancelledCount: cancelResult.count
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Limpieza completada. Se cancelaron ${cleanedCount} solicitudes obsoletas.`,
      data: {
        totalCleaned: cleanedCount,
        affectedEscorts: cleanupResults.length,
        details: cleanupResults
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Cleanup obsolete requests failed', {
      error: error.message, stack: error.stack, userId: req.user.id
    });
    throw new AppError('Error ejecutando limpieza de solicitudes', 500, 'CLEANUP_REQUESTS_ERROR');
  }
});

// ✅ HELPER: TIEMPO RELATIVO
const getRelativeTime = (date) => {
  const now = new Date();
  const diffInHours = Math.floor((now - new Date(date)) / (1000 * 60 * 60));
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
};

// ✅ EXPORTS
module.exports = {
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
  cleanupObsoleteRequests,
  // ✅ Helpers exportados para uso en otros módulos
  validateJoinEligibility,
  cancelOtherPendingRequests,
  validateLeaveEligibility,
  hasActiveMembership
};