/**
 * ====================================================================
 * 💰 POINTS SERVICE - LÓGICA DE NEGOCIO TELOPOINTS SIMPLIFICADA
 * ====================================================================
 * Maneja toda la lógica del sistema de puntos TeloFundi
 * ✅ PREMIUM SIMPLIFICADO: Solo 2 funciones (acceso posts premium + chat prioritario)
 */

const { prisma } = require('../config/database');
const logger = require('../utils/logger');

// ============================================================================
// CONFIGURACIONES DEL SISTEMA DE PUNTOS - ✅ SIMPLIFICADO
// ============================================================================

const POINTS_CONFIG = {
  // Puntos por login diario
  DAILY_LOGIN_POINTS: 5,
  
  // Configuración de rachas
  MAX_STREAK_DAYS: 30,
  STREAK_BONUS_THRESHOLD: 7, // A partir de 7 días da bonus
  STREAK_BONUS_MULTIPLIER: 1.5, // 50% más puntos
  
  // Registro inicial
  REGISTRATION_BONUS: 10,
  
  // ✅ MANTENER chat_priority separado + premium por tiempo
  ACTIONS: {
    chat_priority: 10,        // Chat priority por 24 horas (función separada)
    premium_1_day: 25,        // Premium por 1 día (2 funciones)
    premium_3_days: 60,       // Premium por 3 días (2 funciones)
    premium_1_week: 120,      // Premium por 1 semana (2 funciones)
    premium_1_month: 400      // Premium por 1 mes (2 funciones)
  },
  
  // ✅ SIMPLIFICADO: Duración en horas para cada tipo de premium
  PREMIUM_DURATIONS: {
    premium_1_day: 24,
    premium_3_days: 72,
    premium_1_week: 168,      // 7 días * 24 horas
    premium_1_month: 720      // 30 días * 24 horas
  },
  
  // ✅ SIMPLIFICADO - Solo BASIC y PREMIUM (2 funciones únicamente)
  TIER_LIMITS: {
    BASIC: {
      // Sin acceso premium
      canAccessPremiumProfiles: false,
      chatPriorityActive: false
    },
    PREMIUM: {
      // ✅ SOLO 2 FUNCIONES - NADA MÁS
      canAccessPremiumProfiles: true,  // 1. Acceso a posts premium
      chatPriorityActive: true         // 2. Chat prioritario
    }
  }
};

// ============================================================================
// FUNCIONES PRINCIPALES DE PUNTOS
// ============================================================================

/**
 * Obtener balance y estadísticas de puntos de un cliente
 */
const getClientPoints = async (clientId) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        points: true,
        isPremium: true,
        premiumUntil: true,
        premiumTier: true,
        lastDailyPointsClaim: true,
        dailyLoginStreak: true,
        totalDailyPointsEarned: true,
        totalPointsEarned: true,
        totalPointsSpent: true,
        pointsLastUpdated: true,
        chatPriorityUntil: true,
        canAccessPremiumProfiles: true, // ✅ INCLUIR ESTADO ACTUAL
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!client) {
      throw new Error('Cliente no encontrado');
    }

    // Verificar elegibilidad para puntos diarios
    const dailyEligibility = await checkDailyLoginEligibility(clientId);
    
    // Verificar estado de premium temporal
    const premiumStatus = await checkPremiumExpiration(clientId);

    return {
      currentBalance: client.points,
      totalEarned: client.totalPointsEarned,
      totalSpent: client.totalPointsSpent,
      dailyStreak: client.dailyLoginStreak,
      totalDailyEarned: client.totalDailyPointsEarned,
      lastUpdate: client.pointsLastUpdated,
      
      // ✅ SIMPLIFICADO - Solo 2 funciones premium
      premium: {
        isActive: premiumStatus.isActive,
        tier: premiumStatus.tier,
        expiresAt: premiumStatus.expiresAt,
        timeRemaining: premiumStatus.timeRemaining,
        // ✅ FUNCIONES PREMIUM ACTIVAS
        functions: {
          canAccessPremiumProfiles: premiumStatus.isActive,
          chatPriorityActive: premiumStatus.isActive
        }
      },
      
      dailyLogin: {
        eligible: dailyEligibility.eligible,
        nextClaimAt: dailyEligibility.nextClaimAt,
        streak: client.dailyLoginStreak,
        bonusMultiplier: calculateStreakBonus(client.dailyLoginStreak)
      },
      user: client.user
    };
  } catch (error) {
    logger.error('Error getting client points:', error);
    throw error;
  }
};

/**
 * ✅ SIMPLIFICADO: Verificar y actualizar expiración de premium
 */
const checkPremiumExpiration = async (clientId) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        isPremium: true,
        premiumUntil: true,
        premiumTier: true,
        chatPriorityUntil: true,
        canAccessPremiumProfiles: true
      }
    });

    if (!client) {
      throw new Error('Cliente no encontrado');
    }

    const now = new Date();
    let isActive = client.isPremium;
    let timeRemaining = null;

    // Verificar si el premium ha expirado
    if (client.isPremium && client.premiumUntil && client.premiumUntil <= now) {
      // ✅ SIMPLIFICADO - Premium expirado, revertir a BASIC (quitar las 2 funciones)
      await prisma.client.update({
        where: { id: clientId },
        data: {
          isPremium: false,
          premiumTier: 'BASIC',
          premiumUntil: null,
          chatPriorityUntil: null,           // ✅ Quitar chat priority
          canAccessPremiumProfiles: false   // ✅ Quitar acceso premium
        }
      });

      // Desactivar activaciones vencidas
      await prisma.premiumActivation.updateMany({
        where: {
          clientId,
          isActive: true,
          expiresAt: { lte: now }
        },
        data: { isActive: false }
      });

      isActive = false;

      logger.info('Premium expired and reverted to BASIC (2 functions removed)', { clientId });
    } else if (client.isPremium && client.premiumUntil) {
      // Calcular tiempo restante
      timeRemaining = Math.max(0, client.premiumUntil - now);
    }

    return {
      isActive,
      tier: isActive ? client.premiumTier : 'BASIC',
      expiresAt: isActive ? client.premiumUntil : null,
      timeRemaining
    };
  } catch (error) {
    logger.error('Error checking premium expiration:', error);
    throw error;
  }
};

/**
 * Agregar puntos a un cliente
 */
const addPoints = async (clientId, amount, type, description, metadata = {}) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Obtener saldo actual
      const currentClient = await tx.client.findUnique({
        where: { id: clientId },
        select: { points: true }
      });

      if (!currentClient) {
        throw new Error('Cliente no encontrado');
      }

      const balanceBefore = currentClient.points;
      const balanceAfter = balanceBefore + amount;

      // Actualizar puntos del cliente
      const updatedClient = await tx.client.update({
        where: { id: clientId },
        data: {
          points: { increment: amount },
          totalPointsEarned: { increment: amount },
          pointsLastUpdated: new Date()
        }
      });

      // Crear transacción de puntos
      const transaction = await tx.pointTransaction.create({
        data: {
          clientId,
          amount,
          type,
          description,
          balanceBefore,
          balanceAfter,
          metadata,
          source: metadata.source || 'system'
        }
      });

      // Crear registro en historial
      await tx.pointsHistory.create({
        data: {
          clientId,
          type,
          amount,
          description,
          balanceBefore,
          balanceAfter,
          metadata,
          source: metadata.source || 'system'
        }
      });

      return {
        transaction,
        newBalance: balanceAfter,
        pointsAdded: amount
      };
    });

    logger.info('Points added successfully', {
      clientId,
      amount,
      type,
      newBalance: result.newBalance
    });

    return result;
  } catch (error) {
    logger.error('Error adding points:', error);
    throw error;
  }
};

/**
 * Gastar puntos de un cliente
 */
const spendPoints = async (clientId, amount, type, description, metadata = {}) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Verificar saldo suficiente
      const currentClient = await tx.client.findUnique({
        where: { id: clientId },
        select: { points: true }
      });

      if (!currentClient) {
        throw new Error('Cliente no encontrado');
      }

      if (currentClient.points < amount) {
        throw new Error('Saldo insuficiente de puntos');
      }

      const balanceBefore = currentClient.points;
      const balanceAfter = balanceBefore - amount;

      // Actualizar puntos del cliente
      const updatedClient = await tx.client.update({
        where: { id: clientId },
        data: {
          points: { decrement: amount },
          totalPointsSpent: { increment: amount },
          pointsLastUpdated: new Date()
        }
      });

      // Crear transacción de puntos (negativa)
      const transaction = await tx.pointTransaction.create({
        data: {
          clientId,
          amount: -amount,
          type,
          description,
          balanceBefore,
          balanceAfter,
          metadata,
          source: metadata.source || 'system'
        }
      });

      // Crear registro en historial (negativo)
      await tx.pointsHistory.create({
        data: {
          clientId,
          type,
          amount: -amount,
          description,
          balanceBefore,
          balanceAfter,
          metadata,
          source: metadata.source || 'system'
        }
      });

      return {
        transaction,
        newBalance: balanceAfter,
        pointsSpent: amount
      };
    });

    logger.info('Points spent successfully', {
      clientId,
      amount,
      type,
      newBalance: result.newBalance
    });

    return result;
  } catch (error) {
    logger.error('Error spending points:', error);
    throw error;
  }
};

/**
 * Verificar elegibilidad para reclamar puntos diarios
 */
const checkDailyLoginEligibility = async (clientId) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        lastDailyPointsClaim: true,
        dailyLoginStreak: true
      }
    });

    if (!client) {
      throw new Error('Cliente no encontrado');
    }

    const now = new Date();
    const lastClaim = client.lastDailyPointsClaim;

    // Si nunca ha reclamado, es elegible
    if (!lastClaim) {
      return {
        eligible: true,
        nextClaimAt: null,
        hoursSinceLastClaim: null
      };
    }

    // Calcular tiempo desde la última reclamación
    const hoursSinceLastClaim = (now - lastClaim) / (1000 * 60 * 60);
    
    // Debe esperar al menos 20 horas desde la última reclamación
    const isEligible = hoursSinceLastClaim >= 20;
    
    let nextClaimAt = null;
    if (!isEligible) {
      nextClaimAt = new Date(lastClaim.getTime() + 20 * 60 * 60 * 1000);
    }

    return {
      eligible: isEligible,
      nextClaimAt,
      hoursSinceLastClaim: Math.floor(hoursSinceLastClaim)
    };
  } catch (error) {
    logger.error('Error checking daily login eligibility:', error);
    throw error;
  }
};

/**
 * Procesar login diario y otorgar puntos
 */
const processDailyLogin = async (clientId) => {
  try {
    // Verificar elegibilidad
    const eligibility = await checkDailyLoginEligibility(clientId);
    
    if (!eligibility.eligible) {
      throw new Error('No elegible para reclamar puntos diarios aún');
    }

    const result = await prisma.$transaction(async (tx) => {
      const client = await tx.client.findUnique({
        where: { id: clientId },
        select: {
          points: true,
          lastDailyPointsClaim: true,
          dailyLoginStreak: true,
          totalDailyPointsEarned: true
        }
      });

      const now = new Date();
      const lastClaim = client.lastDailyPointsClaim;
      
      // Calcular nueva racha
      let newStreak = 1;
      if (lastClaim) {
        const daysSinceLastClaim = Math.floor((now - lastClaim) / (1000 * 60 * 60 * 24));
        
        if (daysSinceLastClaim === 1) {
          // Mantener racha si fue ayer
          newStreak = Math.min(client.dailyLoginStreak + 1, POINTS_CONFIG.MAX_STREAK_DAYS);
        } else if (daysSinceLastClaim === 0) {
          // Mismo día, mantener racha actual
          newStreak = client.dailyLoginStreak;
        }
        // Si es más de 1 día, la racha se reinicia a 1
      }

      // Calcular puntos base y bonus
      const basePoints = POINTS_CONFIG.DAILY_LOGIN_POINTS;
      const streakMultiplier = calculateStreakBonus(newStreak);
      const pointsToGive = Math.floor(basePoints * streakMultiplier);

      const balanceBefore = client.points;
      const balanceAfter = balanceBefore + pointsToGive;

      // Actualizar cliente
      const updatedClient = await tx.client.update({
        where: { id: clientId },
        data: {
          points: { increment: pointsToGive },
          totalPointsEarned: { increment: pointsToGive },
          totalDailyPointsEarned: { increment: pointsToGive },
          lastDailyPointsClaim: now,
          dailyLoginStreak: newStreak,
          pointsLastUpdated: now
        }
      });

      // Crear transacción
      const transaction = await tx.pointTransaction.create({
        data: {
          clientId,
          amount: pointsToGive,
          type: newStreak >= POINTS_CONFIG.STREAK_BONUS_THRESHOLD ? 'STREAK_BONUS' : 'DAILY_LOGIN',
          description: `Login diario - Día ${newStreak} de racha${newStreak >= POINTS_CONFIG.STREAK_BONUS_THRESHOLD ? ' (Bonus de racha!)' : ''}`,
          balanceBefore,
          balanceAfter,
          metadata: {
            streakDay: newStreak,
            basePoints,
            streakMultiplier,
            isStreakBonus: newStreak >= POINTS_CONFIG.STREAK_BONUS_THRESHOLD
          },
          source: 'daily_login'
        }
      });

      // Crear historial
      await tx.pointsHistory.create({
        data: {
          clientId,
          type: newStreak >= POINTS_CONFIG.STREAK_BONUS_THRESHOLD ? 'STREAK_BONUS' : 'DAILY_LOGIN',
          amount: pointsToGive,
          description: `Login diario - Día ${newStreak} de racha`,
          balanceBefore,
          balanceAfter,
          metadata: {
            streakDay: newStreak,
            basePoints,
            streakMultiplier,
            timestamp: now.toISOString()
          },
          source: 'daily_login'
        }
      });

      return {
        pointsEarned: pointsToGive,
        streakDay: newStreak,
        basePoints,
        streakMultiplier,
        newBalance: balanceAfter,
        nextEligibleAt: new Date(now.getTime() + 20 * 60 * 60 * 1000),
        isStreakBonus: newStreak >= POINTS_CONFIG.STREAK_BONUS_THRESHOLD
      };
    });

    logger.info('Daily login processed', {
      clientId,
      pointsEarned: result.pointsEarned,
      streakDay: result.streakDay,
      newBalance: result.newBalance
    });

    return result;
  } catch (error) {
    logger.error('Error processing daily login:', error);
    throw error;
  }
};

/**
 * ✅ MANTENER: Activar chat priority con puntos (función separada)
 */
const activateChatPriority = async (clientId) => {
  try {
    const pointsCost = POINTS_CONFIG.ACTIONS.chat_priority;
    
    const result = await prisma.$transaction(async (tx) => {
      // Verificar saldo
      const client = await tx.client.findUnique({
        where: { id: clientId },
        select: {
          points: true,
          chatPriorityUntil: true
        }
      });

      if (!client) {
        throw new Error('Cliente no encontrado');
      }

      if (client.points < pointsCost) {
        throw new Error(`Puntos insuficientes. Necesitas ${pointsCost} puntos para chat priority`);
      }

      // Calcular nueva fecha de expiración (24 horas desde ahora)
      const now = new Date();
      let newExpirationDate;
      
      if (client.chatPriorityUntil && client.chatPriorityUntil > now) {
        // Si ya tiene chat priority activo, extender desde la fecha actual de expiración
        newExpirationDate = new Date(client.chatPriorityUntil.getTime() + 24 * 60 * 60 * 1000);
      } else {
        // Si no tiene o ya expiró, comenzar desde ahora
        newExpirationDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      }

      // Gastar puntos
      await spendPoints(clientId, pointsCost, 'CHAT_PRIORITY', 
        'Prioridad en chat por 24 horas', 
        { duration: 24, source: 'chat_priority_activation' }
      );

      // Actualizar cliente con nueva fecha de expiración
      const updatedClient = await tx.client.update({
        where: { id: clientId },
        data: {
          chatPriorityUntil: newExpirationDate
        }
      });

      return {
        pointsCost,
        expiresAt: newExpirationDate,
        duration: 24,
        newBalance: client.points - pointsCost
      };
    });

    logger.info('Chat priority activated with points', {
      clientId,
      pointsCost,
      expiresAt: result.expiresAt
    });

    return result;
  } catch (error) {
    logger.error('Error activating chat priority with points:', error);
    throw error;
  }
};

/**
 * ✅ MANTENER: Verificar y actualizar expiración de chat priority
 */
const checkChatPriorityExpiration = async (clientId) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        chatPriorityUntil: true
      }
    });

    if (!client) {
      throw new Error('Cliente no encontrado');
    }

    const now = new Date();
    let isActive = false;
    let timeRemaining = null;

    if (client.chatPriorityUntil && client.chatPriorityUntil > now) {
      isActive = true;
      timeRemaining = Math.max(0, client.chatPriorityUntil - now);
    } else if (client.chatPriorityUntil && client.chatPriorityUntil <= now) {
      // Chat priority expirado, limpiar campo
      await prisma.client.update({
        where: { id: clientId },
        data: { chatPriorityUntil: null }
      });

      logger.info('Chat priority expired and cleared', { clientId });
    }

    return {
      isActive,
      expiresAt: isActive ? client.chatPriorityUntil : null,
      timeRemaining
    };
  } catch (error) {
    logger.error('Error checking chat priority expiration:', error);
    throw error;
  }
};

/**
 * ✅ SIMPLIFICADO: Activar premium temporal con puntos (solo 2 funciones)
 */
const activatePremiumWithPoints = async (clientId, action) => {
  try {
    // Validar acción
    if (!POINTS_CONFIG.ACTIONS[action]) {
      throw new Error('Acción premium inválida');
    }

    // Obtener costo y duración
    const pointsCost = POINTS_CONFIG.ACTIONS[action];
    const duration = POINTS_CONFIG.PREMIUM_DURATIONS[action];
    
    if (!duration) {
      throw new Error('Duración no configurada para esta acción');
    }

    const result = await prisma.$transaction(async (tx) => {
      // Verificar saldo
      const client = await tx.client.findUnique({
        where: { id: clientId },
        select: {
          points: true,
          isPremium: true,
          premiumUntil: true,
          premiumTier: true
        }
      });

      if (!client) {
        throw new Error('Cliente no encontrado');
      }

      if (client.points < pointsCost) {
        throw new Error(`Puntos insuficientes. Necesitas ${pointsCost} puntos para ${action}`);
      }

      // Calcular nueva fecha de expiración
      const now = new Date();
      let newExpirationDate;
      
      if (client.isPremium && client.premiumUntil && client.premiumUntil > now) {
        // Si ya tiene premium activo, extender desde la fecha actual de expiración
        newExpirationDate = new Date(client.premiumUntil.getTime() + duration * 60 * 60 * 1000);
      } else {
        // Si no tiene premium o ya expiró, comenzar desde ahora
        newExpirationDate = new Date(now.getTime() + duration * 60 * 60 * 1000);
      }

      // Gastar puntos
      await spendPoints(clientId, pointsCost, 'PREMIUM_DAY', 
        `Activación Premium - ${action}`, 
        { action, duration, source: 'premium_activation' }
      );

      // ✅ SIMPLIFICADO - Aplicar solo las 2 funciones premium
      const updatedClient = await tx.client.update({
        where: { id: clientId },
        data: {
          isPremium: true,
          premiumTier: 'PREMIUM',
          premiumUntil: newExpirationDate,
          chatPriorityUntil: newExpirationDate,    // ✅ Función 1: Chat prioritario
          canAccessPremiumProfiles: true          // ✅ Función 2: Acceso posts premium
        }
      });

      // Crear registro de activación
      const activation = await tx.premiumActivation.create({
        data: {
          clientId,
          tier: 'PREMIUM',
          duration,
          pointsCost,
          activatedAt: now,
          expiresAt: newExpirationDate,
          isActive: true,
          activatedBy: 'points'
        }
      });

      return {
        activation,
        action,
        tier: 'PREMIUM',
        duration,
        pointsCost,
        expiresAt: newExpirationDate,
        // ✅ SIMPLIFICADO - Solo 2 funciones
        benefits: {
          canAccessPremiumProfiles: true,
          chatPriorityActive: true
        },
        newBalance: client.points - pointsCost
      };
    });

    logger.info('Premium activated with points (2 functions)', {
      clientId,
      action,
      duration,
      pointsCost,
      expiresAt: result.expiresAt
    });

    return result;
  } catch (error) {
    logger.error('Error activating premium with points:', error);
    throw error;
  }
};

/**
 * Obtener historial de puntos con paginación
 */
const getPointsHistory = async (clientId, pagination = {}) => {
  const { page = 1, limit = 50, type = null } = pagination;
  const skip = (page - 1) * limit;

  try {
    const where = { clientId };
    if (type) {
      where.type = type;
    }

    const [history, total] = await Promise.all([
      prisma.pointsHistory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.pointsHistory.count({ where })
    ]);

    return {
      history,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };
  } catch (error) {
    logger.error('Error getting points history:', error);
    throw error;
  }
};

/**
 * Obtener paquetes de puntos disponibles
 */
const getAvailablePackages = async () => {
  try {
    const packages = await prisma.pointsPackage.findMany({
      where: { isActive: true },
      orderBy: [
        { isPopular: 'desc' },
        { price: 'asc' }
      ]
    });

    return packages.map(pkg => ({
      ...pkg,
      totalPoints: pkg.points + pkg.bonus,
      pricePerPoint: (pkg.price / (pkg.points + pkg.bonus)).toFixed(3)
    }));
  } catch (error) {
    logger.error('Error getting available packages:', error);
    throw error;
  }
};

/**
 * Crear compra de puntos
 */
const createPointsPurchase = async (clientId, packageId, paymentData = {}) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Obtener paquete
      const package = await tx.pointsPackage.findUnique({
        where: { id: packageId, isActive: true }
      });

      if (!package) {
        throw new Error('Paquete de puntos no encontrado o no disponible');
      }

      // Verificar cliente
      const client = await tx.client.findUnique({
        where: { id: clientId },
        select: { id: true, userId: true }
      });

      if (!client) {
        throw new Error('Cliente no encontrado');
      }

      const totalPoints = package.points + package.bonus;

      // Crear registro de compra
      const purchase = await tx.pointsPurchase.create({
        data: {
          clientId,
          packageId,
          pointsPurchased: package.points,
          bonusPoints: package.bonus,
          totalPoints,
          amountPaid: package.price,
          status: 'PENDING',
          stripePaymentId: paymentData.stripePaymentId || null
        }
      });

      return {
        purchase,
        package,
        totalPoints,
        client
      };
    });

    logger.info('Points purchase created', {
      clientId,
      packageId,
      purchaseId: result.purchase.id,
      totalPoints: result.totalPoints,
      amount: result.package.price
    });

    return result;
  } catch (error) {
    logger.error('Error creating points purchase:', error);
    throw error;
  }
};

/**
 * Confirmar compra de puntos (cuando el pago es exitoso)
 */
const confirmPointsPurchase = async (purchaseId, paymentData = {}) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Obtener compra pendiente
      const purchase = await tx.pointsPurchase.findUnique({
        where: { id: purchaseId },
        include: {
          client: { select: { points: true } },
          package: true
        }
      });

      if (!purchase) {
        throw new Error('Compra no encontrada');
      }

      if (purchase.status !== 'PENDING') {
        throw new Error('La compra ya fue procesada');
      }

      const balanceBefore = purchase.client.points;
      const pointsToAdd = purchase.totalPoints;
      const balanceAfter = balanceBefore + pointsToAdd;

      // Actualizar estado de la compra
      const updatedPurchase = await tx.pointsPurchase.update({
        where: { id: purchaseId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          stripePaymentId: paymentData.stripePaymentId || purchase.stripePaymentId
        }
      });

      // Actualizar puntos del cliente
      await tx.client.update({
        where: { id: purchase.clientId },
        data: {
          points: { increment: pointsToAdd },
          totalPointsEarned: { increment: pointsToAdd },
          totalPointsPurchased: { increment: pointsToAdd },
          pointsLastUpdated: new Date()
        }
      });

      // Crear transacciones
      await tx.pointTransaction.create({
        data: {
          clientId: purchase.clientId,
          amount: purchase.pointsPurchased,
          type: 'PURCHASE',
          description: `Compra de puntos - ${purchase.package.name}`,
          cost: purchase.amountPaid,
          purchaseId: purchase.id,
          balanceBefore,
          balanceAfter: balanceBefore + purchase.pointsPurchased,
          metadata: {
            packageName: purchase.package.name,
            packageId: purchase.packageId,
            stripePaymentId: paymentData.stripePaymentId
          },
          source: 'purchase'
        }
      });

      // Si hay puntos bonus, crear transacción separada
      if (purchase.bonusPoints > 0) {
        await tx.pointTransaction.create({
          data: {
            clientId: purchase.clientId,
            amount: purchase.bonusPoints,
            type: 'BONUS_POINTS',
            description: `Puntos bonus - ${purchase.package.name}`,
            purchaseId: purchase.id,
            balanceBefore: balanceBefore + purchase.pointsPurchased,
            balanceAfter,
            metadata: {
              packageName: purchase.package.name,
              packageId: purchase.packageId,
              bonusFromPurchase: true
            },
            source: 'purchase_bonus'
          }
        });
      }

      // Crear registros en historial
      await tx.pointsHistory.create({
        data: {
          clientId: purchase.clientId,
          type: 'PURCHASE',
          amount: pointsToAdd,
          description: `Compra de ${purchase.package.name} - ${purchase.pointsPurchased} puntos + ${purchase.bonusPoints} bonus`,
          balanceBefore,
          balanceAfter,
          purchaseId: purchase.id,
          metadata: {
            packageName: purchase.package.name,
            basePoints: purchase.pointsPurchased,
            bonusPoints: purchase.bonusPoints,
            amountPaid: purchase.amountPaid,
            timestamp: new Date().toISOString()
          },
          source: 'purchase'
        }
      });

      return {
        purchase: updatedPurchase,
        pointsAdded: pointsToAdd,
        newBalance: balanceAfter,
        package: purchase.package
      };
    });

    logger.info('Points purchase confirmed', {
      purchaseId,
      clientId: result.purchase.clientId,
      pointsAdded: result.pointsAdded,
      newBalance: result.newBalance
    });

    return result;
  } catch (error) {
    logger.error('Error confirming points purchase:', error);
    throw error;
  }
};

/**
 * Procesar reembolso de puntos
 */
const processPointsRefund = async (purchaseId, reason = 'Reembolso solicitado') => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Obtener compra
      const purchase = await tx.pointsPurchase.findUnique({
        where: { id: purchaseId },
        include: { client: { select: { points: true } } }
      });

      if (!purchase || purchase.status !== 'COMPLETED') {
        throw new Error('Compra no encontrada o no completada');
      }

      const currentBalance = purchase.client.points;
      const pointsToDeduct = purchase.totalPoints;

      // Verificar que el cliente tenga suficientes puntos
      if (currentBalance < pointsToDeduct) {
        throw new Error('El cliente no tiene suficientes puntos para el reembolso');
      }

      // Actualizar estado de la compra
      await tx.pointsPurchase.update({
        where: { id: purchaseId },
        data: { status: 'REFUNDED' }
      });

      // Deducir puntos
      await tx.client.update({
        where: { id: purchase.clientId },
        data: {
          points: { decrement: pointsToDeduct },
          totalPointsSpent: { increment: pointsToDeduct },
          pointsLastUpdated: new Date()
        }
      });

      // Crear transacción de reembolso
      await tx.pointTransaction.create({
        data: {
          clientId: purchase.clientId,
          amount: -pointsToDeduct,
          type: 'REFUND',
          description: `Reembolso de compra - ${reason}`,
          purchaseId: purchase.id,
          balanceBefore: currentBalance,
          balanceAfter: currentBalance - pointsToDeduct,
          metadata: {
            originalPurchaseId: purchase.id,
            refundReason: reason,
            refundedPoints: pointsToDeduct,
            refundedAmount: purchase.amountPaid
          },
          source: 'refund'
        }
      });

      return {
        purchase,
        pointsDeducted: pointsToDeduct,
        newBalance: currentBalance - pointsToDeduct,
        refundReason: reason
      };
    });

    logger.info('Points refund processed', {
      purchaseId,
      clientId: result.purchase.clientId,
      pointsDeducted: result.pointsDeducted,
      newBalance: result.newBalance
    });

    return result;
  } catch (error) {
    logger.error('Error processing points refund:', error);
    throw error;
  }
};

/**
 * Calcular bonus de racha
 */
const calculateStreakBonus = (streakDays) => {
  if (streakDays >= POINTS_CONFIG.STREAK_BONUS_THRESHOLD) {
    return POINTS_CONFIG.STREAK_BONUS_MULTIPLIER;
  }
  return 1.0;
};

/**
 * Limpiar datos antiguos de puntos
 */
const cleanupExpiredPremium = async () => {
  try {
    const now = new Date();

    // Buscar activaciones expiradas
    const expiredActivations = await prisma.premiumActivation.findMany({
      where: {
        isActive: true,
        expiresAt: { lte: now }
      },
      include: {
        client: {
          select: {
            id: true,
            userId: true,
            user: { select: { username: true } }
          }
        }
      }
    });

    if (expiredActivations.length === 0) {
      logger.info('No expired premium activations found');
      return { processedCount: 0 };
    }

    // Procesar cada expiración
    for (const activation of expiredActivations) {
      await prisma.$transaction(async (tx) => {
        // Desactivar la activación
        await tx.premiumActivation.update({
          where: { id: activation.id },
          data: { isActive: false }
        });

        // Verificar si el cliente tiene otras activaciones activas
        const otherActiveActivations = await tx.premiumActivation.count({
          where: {
            clientId: activation.clientId,
            isActive: true,
            expiresAt: { gt: now }
          }
        });

        // Si no tiene otras activaciones activas, revertir a BASIC
        if (otherActiveActivations === 0) {
          await tx.client.update({
            where: { id: activation.clientId },
            data: {
              isPremium: false,
              premiumTier: 'BASIC',
              premiumUntil: null,
              chatPriorityUntil: null,           // ✅ Quitar chat priority
              canAccessPremiumProfiles: false   // ✅ Quitar acceso premium
            }
          });

          logger.info('Client premium reverted to BASIC (2 functions removed)', {
            clientId: activation.clientId,
            username: activation.client.user.username
          });
        }
      });
    }

    logger.info('Expired premium cleanup completed', {
      processedCount: expiredActivations.length
    });

    return { processedCount: expiredActivations.length };
  } catch (error) {
    logger.error('Error cleaning up expired premium:', error);
    throw error;
  }
};

/**
 * ✅ MANTENER chat priority separado + premium simplificado
 */
const getAvailableActions = async (clientId) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        points: true,
        isPremium: true,
        premiumTier: true,
        premiumUntil: true,
        chatPriorityUntil: true,
        canAccessPremiumProfiles: true
      }
    });

    if (!client) {
      throw new Error('Cliente no encontrado');
    }

    const now = new Date();
    const actions = [];

    // ✅ MANTENER - Chat Priority como función separada
    const chatPriorityActive = client.chatPriorityUntil && client.chatPriorityUntil > now;
    actions.push({
      id: 'chat_priority',
      name: 'Prioridad en Chat',
      description: 'Aparecer primero en las conversaciones por 24 horas',
      cost: POINTS_CONFIG.ACTIONS.chat_priority,
      available: client.points >= POINTS_CONFIG.ACTIONS.chat_priority,
      duration: '24 horas',
      type: 'temporary',
      currentlyActive: chatPriorityActive,
      expiresAt: chatPriorityActive ? client.chatPriorityUntil : null
    });

    // ✅ Premium Options (2 funciones incluidas)
    const premiumActive = client.isPremium && client.premiumUntil && client.premiumUntil > now;
    
    const premiumActions = [
      { key: 'premium_1_day', name: 'Premium 1 Día', description: 'Acceso Premium por 1 día (2 funciones)', duration: '1 día' },
      { key: 'premium_3_days', name: 'Premium 3 Días', description: 'Acceso Premium por 3 días (2 funciones)', duration: '3 días' },
      { key: 'premium_1_week', name: 'Premium 1 Semana', description: 'Acceso Premium por 1 semana (2 funciones)', duration: '7 días' },
      { key: 'premium_1_month', name: 'Premium 1 Mes', description: 'Acceso Premium por 1 mes (2 funciones)', duration: '30 días' }
    ];

    premiumActions.forEach(premium => {
      const cost = POINTS_CONFIG.ACTIONS[premium.key];
      actions.push({
        id: premium.key,
        name: premium.name,
        description: premium.description,
        cost,
        available: client.points >= cost,
        duration: premium.duration,
        type: 'premium',
        currentlyActive: premiumActive,
        expiresAt: premiumActive ? client.premiumUntil : null,
        // ✅ Premium incluye 2 funciones
        benefits: [
          'Acceso a posts premium',
          'Chat prioritario'
        ]
      });
    });

    return {
      currentPoints: client.points,
      actions,
      premiumStatus: {
        isActive: premiumActive,
        tier: client.premiumTier,
        expiresAt: client.premiumUntil
      },
      chatPriorityStatus: {
        isActive: chatPriorityActive,
        expiresAt: client.chatPriorityUntil
      }
    };
  } catch (error) {
    logger.error('Error getting available actions:', error);
    throw error;
  }
};

// ============================================================================
// EXPORTAR MÓDULO
// ============================================================================

module.exports = {
  getClientPoints,
  addPoints,
  spendPoints,
  checkDailyLoginEligibility,
  processDailyLogin,
  activatePremiumWithPoints,
  activateChatPriority, // ✅ MANTENER función separada
  checkChatPriorityExpiration, // ✅ MANTENER función separada
  checkPremiumExpiration,
  getPointsHistory,
  getAvailablePackages,
  createPointsPurchase,
  confirmPointsPurchase,
  processPointsRefund,
  calculateStreakBonus,
  cleanupExpiredPremium,
  getAvailableActions,
  POINTS_CONFIG
};