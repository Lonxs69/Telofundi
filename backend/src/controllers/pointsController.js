/**
 * ====================================================================
 * 🎯 POINTS CONTROLLER - ENDPOINTS SISTEMA TELOPOINTS SIMPLIFICADO
 * ====================================================================
 * Maneja todos los endpoints del sistema de puntos
 * ✅ PREMIUM SIMPLIFICADO: Solo 2 funciones (acceso posts premium + chat prioritario)
 * ✅ CORREGIDO PARA AGENCIES: Permite verificaciones de $1.00
 */

const { prisma } = require('../config/database');
const { AppError, catchAsync } = require('../middleware/errorHandler');
const pointsService = require('../services/pointsService');
const paymentService = require('../services/paymentService');
const userService = require('../services/userService');
const logger = require('../utils/logger');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// ============================================================================
// 💰 OBTENER BALANCE Y ESTADÍSTICAS DE PUNTOS
// ============================================================================

/**
 * GET /api/points/balance
 * Obtener balance actual + estadísticas completas
 */
const getPointsBalance = catchAsync(async (req, res) => {
  const userId = req.user.id;

  // ✅ CORREGIDO: Solo CLIENTs tienen puntos
  if (req.user.userType !== 'CLIENT') {
    throw new AppError('Solo los clientes tienen puntos', 403, 'CLIENT_ONLY');
  }

  if (!req.user.client) {
    throw new AppError('Datos de cliente no encontrados', 500, 'CLIENT_DATA_MISSING');
  }

  const pointsData = await pointsService.getClientPoints(req.user.client.id);

  logger.info('Points balance retrieved', {
    userId,
    clientId: req.user.client.id,
    currentBalance: pointsData.currentBalance
  });

  res.status(200).json({
    success: true,
    data: pointsData,
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// 📋 HISTORIAL DE PUNTOS CON PAGINACIÓN
// ============================================================================

/**
 * GET /api/points/history
 * Obtener historial paginado de transacciones
 */
const getPointsHistory = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 20, type } = req.query;

  // ✅ CORREGIDO: Solo CLIENTs tienen historial de puntos
  if (req.user.userType !== 'CLIENT') {
    throw new AppError('Solo los clientes tienen historial de puntos', 403, 'CLIENT_ONLY');
  }

  if (!req.user.client) {
    throw new AppError('Datos de cliente no encontrados', 500, 'CLIENT_DATA_MISSING');
  }

  const pagination = {
    page: parseInt(page),
    limit: parseInt(limit),
    type
  };

  const result = await pointsService.getPointsHistory(req.user.client.id, pagination);

  logger.info('Points history retrieved', {
    userId,
    clientId: req.user.client.id,
    page: pagination.page,
    limit: pagination.limit,
    type,
    total: result.pagination.total
  });

  res.status(200).json({
    success: true,
    data: result,
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// 📦 PAQUETES DISPONIBLES PARA COMPRAR
// ============================================================================

/**
 * GET /api/points/packages
 * Obtener todos los paquetes de puntos disponibles
 */
const getPointsPackages = catchAsync(async (req, res) => {
  const packages = await pointsService.getAvailablePackages();

  res.status(200).json({
    success: true,
    data: {
      packages,
      currency: 'USD',
      paymentMethods: ['card', 'paypal']
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/points/packages-simple
 * Obtener paquetes de puntos disponibles - versión simplificada
 */
const getPackages = catchAsync(async (req, res) => {
  const packages = await prisma.pointsPackage.findMany({
    where: { isActive: true },
    orderBy: [
      { isPopular: 'desc' },
      { points: 'asc' }
    ]
  });

  res.status(200).json({
    success: true,
    data: { packages },
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// 🎁 LOGIN DIARIO Y RACHA
// ============================================================================

/**
 * GET /api/points/daily-status
 * Verificar estado del login diario
 */
const getDailyLoginStatus = catchAsync(async (req, res) => {
  const userId = req.user.id;

  // ✅ CORREGIDO: Solo CLIENTs tienen login diario
  if (req.user.userType !== 'CLIENT') {
    throw new AppError('Solo los clientes pueden reclamar puntos diarios', 403, 'CLIENT_ONLY');
  }

  if (!req.user.client) {
    throw new AppError('Datos de cliente no encontrados', 500, 'CLIENT_DATA_MISSING');
  }

  const eligibility = await pointsService.checkDailyLoginEligibility(req.user.client.id);
  const pointsData = await pointsService.getClientPoints(req.user.client.id);

  res.status(200).json({
    success: true,
    data: {
      eligible: eligibility.eligible,
      nextClaimAt: eligibility.nextClaimAt,
      hoursSinceLastClaim: eligibility.hoursSinceLastClaim,
      currentStreak: pointsData.dailyLogin.streak,
      bonusMultiplier: pointsData.dailyLogin.bonusMultiplier,
      basePoints: pointsService.POINTS_CONFIG.DAILY_LOGIN_POINTS,
      estimatedPoints: Math.floor(
        pointsService.POINTS_CONFIG.DAILY_LOGIN_POINTS * 
        pointsData.dailyLogin.bonusMultiplier
      )
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/points/daily-login
 * Reclamar puntos diarios
 */
const claimDailyPoints = catchAsync(async (req, res) => {
  const userId = req.user.id;

  // ✅ CORREGIDO: Solo CLIENTs pueden reclamar puntos
  if (req.user.userType !== 'CLIENT') {
    throw new AppError('Solo los clientes pueden reclamar puntos diarios', 403, 'CLIENT_ONLY');
  }

  if (!req.user.client) {
    throw new AppError('Datos de cliente no encontrados', 500, 'CLIENT_DATA_MISSING');
  }

  const result = await pointsService.processDailyLogin(req.user.client.id);

  // Crear notificación
  try {
    await prisma.notification.create({
      data: {
        userId,
        type: 'DAILY_POINTS_AVAILABLE',
        title: '¡Puntos diarios reclamados!',
        message: `Has ganado ${result.pointsEarned} puntos. Racha: ${result.streakDay} días`,
        data: {
          pointsEarned: result.pointsEarned,
          streakDay: result.streakDay,
          newBalance: result.newBalance,
          isStreakBonus: result.isStreakBonus
        }
      }
    });
  } catch (error) {
    logger.warn('Failed to create daily points notification:', error);
  }

  logger.info('Daily points claimed', {
    userId,
    clientId: req.user.client.id,
    pointsEarned: result.pointsEarned,
    streakDay: result.streakDay,
    newBalance: result.newBalance
  });

  res.status(200).json({
    success: true,
    message: `¡Has ganado ${result.pointsEarned} puntos!`,
    data: result,
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// 💳 COMPRA DE PUNTOS - ✅ CORREGIDO PARA AGENCIES
// ============================================================================

/**
 * POST /api/points/purchase
 * Iniciar compra de puntos (crear PaymentIntent) - ✅ CORREGIDO PARA AGENCIES
 */
const purchasePoints = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { packageId } = req.body;

  // ✅ PERMITIR CLIENT Y AGENCY
  if (req.user.userType !== 'CLIENT' && req.user.userType !== 'AGENCY') {
    throw new AppError('Solo clientes y agencias pueden hacer pagos', 403, 'CLIENT_OR_AGENCY_ONLY');
  }

  if (!packageId) {
    throw new AppError('ID del paquete es requerido', 400, 'MISSING_PACKAGE_ID');
  }

  // ✅ VALIDACIÓN ESPECÍFICA POR TIPO DE USUARIO
  let entityId = null;
  let result = null;

  if (req.user.userType === 'CLIENT') {
    // ✅ FLUJO NORMAL PARA CLIENTES
    if (!req.user.client) {
      throw new AppError('Datos de cliente no encontrados', 500, 'CLIENT_DATA_MISSING');
    }
    entityId = req.user.client.id;

    // Validar compra usando el servicio de pagos
    await paymentService.validatePointsPurchase(entityId, packageId);

    // Crear PaymentIntent normal
    result = await paymentService.createPointsPaymentIntent(entityId, packageId);

    logger.info('Points purchase initiated', {
      userId,
      clientId: entityId,
      packageId,
      totalPoints: result.totalPoints,
      amount: result.package.price
    });

  } else if (req.user.userType === 'AGENCY') {
    // ✅ FLUJO ESPECIAL PARA AGENCIES (VERIFICACIÓN)
    if (!req.user.agency) {
      throw new AppError('Datos de agencia no encontrados', 500, 'AGENCY_DATA_MISSING');
    }
    entityId = req.user.agency.id;

    console.log('🔐 === AGENCY VERIFICATION PAYMENT ===');
    console.log('🔐 Agency ID:', entityId);
    console.log('🔐 Package ID:', packageId);

    // ✅ CREAR PAYMENTINTENT DIRECTO PARA VERIFICACIÓN ($1.00)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 100, // $1.00 en centavos
      currency: 'usd',
      metadata: {
        type: 'verification',
        userId,
        userType: 'AGENCY',
        agencyId: entityId,
        packageId,
        packageName: 'Verificación de Escort'
      },
      description: `Verificación de Escort - $1.00`,
      automatic_payment_methods: { enabled: true }
    });

    // ✅ CREAR REGISTRO DE PAGO PARA AGENCY
    const payment = await prisma.payment.create({
      data: {
        amount: 1.00,
        currency: 'USD',
        status: 'PENDING',
        type: 'VERIFICATION', // ✅ TIPO ESPECÍFICO
        description: 'Verificación de Escort - $1.00',
        stripePaymentId: paymentIntent.id,
        agencyId: entityId, // ✅ USAR agencyId
        metadata: {
          packageId,
          packageName: 'Verificación de Escort',
          totalPoints: 0, // No son puntos reales
          userId,
          userType: 'AGENCY',
          verificationType: 'escort_verification'
        }
      }
    });

    result = {
      paymentIntent,
      payment,
      package: {
        id: packageId,
        name: 'Verificación de Escort',
        points: 0,
        bonus: 0,
        price: 1.00
      },
      totalPoints: 0
    };

    logger.info('Verification purchase initiated', {
      userId,
      agencyId: entityId,
      packageId,
      amount: 1.00,
      type: 'verification'
    });
  }

  res.status(200).json({
    success: true,
    message: req.user.userType === 'AGENCY' ? 'Verificación iniciada - $1.00' : 'Compra de puntos iniciada',
    data: {
      clientSecret: result.paymentIntent.client_secret,
      paymentId: result.payment.id,
      package: {
        id: result.package.id,
        name: result.package.name,
        basePoints: result.package.points || 0,
        bonusPoints: result.package.bonus || 0,
        totalPoints: result.totalPoints || 0,
        price: result.package.price
      }
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * PUT /api/points/purchase/:id
 * Confirmar compra de puntos (webhook alternativo) - ✅ CORREGIDO PARA AGENCIES
 */
const confirmPointsPurchase = catchAsync(async (req, res) => {
  const { id: paymentId } = req.params;
  const userId = req.user.id;

  // ✅ PERMITIR CLIENT Y AGENCY
  if (req.user.userType !== 'CLIENT' && req.user.userType !== 'AGENCY') {
    throw new AppError('Solo clientes y agencias pueden confirmar pagos', 403, 'CLIENT_OR_AGENCY_ONLY');
  }

  // ✅ VALIDACIÓN ESPECÍFICA POR TIPO DE USUARIO
  let payment = null;

  if (req.user.userType === 'CLIENT') {
    if (!req.user.client) {
      throw new AppError('Datos de cliente no encontrados', 500, 'CLIENT_DATA_MISSING');
    }

    // Buscar pago de cliente
    payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        clientId: req.user.client.id,
        status: 'PENDING',
        type: 'POINTS'
      }
    });

  } else if (req.user.userType === 'AGENCY') {
    if (!req.user.agency) {
      throw new AppError('Datos de agencia no encontrados', 500, 'AGENCY_DATA_MISSING');
    }

    // Buscar pago de agencia
    payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        agencyId: req.user.agency.id,
        status: 'PENDING',
        type: 'VERIFICATION'
      }
    });
  }

  if (!payment) {
    throw new AppError('Pago no encontrado o ya procesado', 404, 'PAYMENT_NOT_FOUND');
  }

  // ✅ PROCESAR SEGÚN TIPO
  if (req.user.userType === 'AGENCY' && payment.type === 'VERIFICATION') {
    // ✅ CONFIRMAR VERIFICACIÓN PARA AGENCY
    console.log('🔐 === CONFIRMING AGENCY VERIFICATION PAYMENT ===');

    // Verificar estado en Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(payment.stripePaymentId);

    if (paymentIntent.status !== 'succeeded') {
      throw new AppError('El pago no ha sido completado', 400, 'PAYMENT_NOT_COMPLETED');
    }

    // Actualizar pago como completado
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        processorFee: paymentIntent.application_fee_amount ? 
          paymentIntent.application_fee_amount / 100 : null,
        netAmount: (paymentIntent.amount - (paymentIntent.application_fee_amount || 0)) / 100
      }
    });

    logger.info('Verification payment confirmed for agency', {
      userId,
      paymentId,
      agencyId: req.user.agency.id,
      amount: payment.amount,
      transactionId: payment.stripePaymentId
    });

    res.status(200).json({
      success: true,
      message: 'Verificación pagada exitosamente - $1.00 cobrado',
      data: {
        paymentConfirmed: true,
        amountCharged: `$${payment.amount}`,
        transactionId: payment.stripePaymentId,
        completedAt: updatedPayment.completedAt,
        type: 'verification',
        escortId: payment.metadata?.escortId,
        escortName: payment.metadata?.escortName || 'Escort'
      },
      timestamp: new Date().toISOString()
    });

  } else {
    // ✅ PROCESAR PUNTOS PARA CLIENT
    const result = await paymentService.processStripePayment(payment.stripePaymentId);

    if (result.alreadyProcessed) {
      return res.status(200).json({
        success: true,
        message: 'Compra ya procesada',
        data: { alreadyProcessed: true },
        timestamp: new Date().toISOString()
      });
    }

    logger.info('Points purchase confirmed manually', {
      userId,
      paymentId,
      processingResult: result.processingResult
    });

    res.status(200).json({
      success: true,
      message: 'Compra de puntos confirmada',
      data: result.processingResult,
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================================================
// 💸 GASTAR PUNTOS EN ACCIONES - ✅ SIMPLIFICADO
// ============================================================================

/**
 * GET /api/points/actions
 * Obtener acciones disponibles con puntos
 */
const getAvailableActions = catchAsync(async (req, res) => {
  const userId = req.user.id;

  // ✅ CORREGIDO: Solo CLIENTs pueden usar puntos
  if (req.user.userType !== 'CLIENT') {
    throw new AppError('Solo los clientes pueden usar puntos', 403, 'CLIENT_ONLY');
  }

  if (!req.user.client) {
    throw new AppError('Datos de cliente no encontrados', 500, 'CLIENT_DATA_MISSING');
  }

  const actions = await pointsService.getAvailableActions(req.user.client.id);

  res.status(200).json({
    success: true,
    data: actions,
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/points/spend
 * Usar puntos para una acción específica - ✅ SIMPLIFICADO
 */
const spendPoints = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { action, targetData = {} } = req.body;

  // ✅ CORREGIDO: Solo CLIENTs pueden gastar puntos
  if (req.user.userType !== 'CLIENT') {
    throw new AppError('Solo los clientes pueden usar puntos', 403, 'CLIENT_ONLY');
  }

  if (!req.user.client) {
    throw new AppError('Datos de cliente no encontrados', 500, 'CLIENT_DATA_MISSING');
  }

  if (!action) {
    throw new AppError('Acción es requerida', 400, 'MISSING_ACTION');
  }

  // ✅ SIMPLIFICADO: Solo estas acciones permitidas
  const validActions = [
    'chat_priority',     // Chat priority separado (10 puntos)
    'premium_1_day',     // Premium por 1 día (2 funciones)
    'premium_3_days',    // Premium por 3 días (2 funciones)
    'premium_1_week',    // Premium por 1 semana (2 funciones)
    'premium_1_month'    // Premium por 1 mes (2 funciones)
  ];

  if (!validActions.includes(action)) {
    throw new AppError('Acción no válida', 400, 'INVALID_ACTION');
  }

  let result;

  try {
    if (action === 'chat_priority') {
      // ✅ Chat priority separado
      result = await pointsService.activateChatPriority(req.user.client.id);
      
      result = {
        action: 'chat_priority',
        pointsSpent: result.pointsCost,
        newBalance: result.newBalance,
        description: 'Prioridad en chat por 24 horas',
        expiresAt: result.expiresAt,
        duration: result.duration,
        type: 'standalone'
      };
    } else if (action.startsWith('premium_')) {
      // ✅ Premium con 2 funciones incluidas
      result = await pointsService.activatePremiumWithPoints(req.user.client.id, action);
      
      result = {
        action: result.action,
        pointsSpent: result.pointsCost,
        newBalance: result.newBalance,
        description: `Premium activado por ${result.duration} horas (2 funciones incluidas)`,
        expiresAt: result.expiresAt,
        duration: result.duration,
        tier: result.tier,
        benefits: result.benefits,
        type: 'premium',
        // ✅ SIMPLIFICADO: Mostrar las 2 funciones incluidas
        functionsIncluded: [
          'Acceso a posts premium',
          'Chat prioritario'
        ]
      };
    } else {
      throw new AppError('Acción no implementada', 400, 'ACTION_NOT_IMPLEMENTED');
    }

    // Crear notificación
    try {
      const notificationTitle = action === 'chat_priority' 
        ? 'Chat Priority Activado' 
        : 'Premium Activado';
      
      const notificationMessage = action === 'chat_priority'
        ? `Has activado prioridad en chat por 24 horas usando ${result.pointsSpent} puntos`
        : `Has activado Premium por ${result.duration} horas usando ${result.pointsSpent} puntos. Incluye: acceso a posts premium y chat prioritario`;

      await prisma.notification.create({
        data: {
          userId,
          type: 'PAYMENT_SUCCESS',
          title: notificationTitle,
          message: notificationMessage,
          data: {
            action: result.action,
            pointsSpent: result.pointsSpent,
            newBalance: result.newBalance,
            description: result.description,
            expiresAt: result.expiresAt,
            type: result.type,
            functionsIncluded: result.functionsIncluded || ['Prioridad en chat']
          }
        }
      });
    } catch (error) {
      logger.warn('Failed to create points spend notification:', error);
    }

    logger.info('Points spent on action', {
      userId,
      clientId: req.user.client.id,
      action: result.action,
      pointsSpent: result.pointsSpent,
      newBalance: result.newBalance,
      type: result.type
    });

    res.status(200).json({
      success: true,
      message: `Puntos utilizados exitosamente para: ${result.description}`,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    // Manejar errores específicos
    if (error.message.includes('Puntos insuficientes')) {
      throw new AppError(error.message, 400, 'INSUFFICIENT_POINTS');
    }
    throw error;
  }
});

// ============================================================================
// ⭐ PREMIUM TEMPORAL CON PUNTOS - ✅ SIMPLIFICADO PARA COMPATIBILIDAD
// ============================================================================

/**
 * POST /api/points/premium
 * Activar premium temporal con puntos (función de compatibilidad)
 */
const activatePremiumWithPoints = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { tier = 'PREMIUM', duration = 24 } = req.body;

  // ✅ CORREGIDO: Solo CLIENTs pueden activar premium
  if (req.user.userType !== 'CLIENT') {
    throw new AppError('Solo los clientes pueden activar premium', 403, 'CLIENT_ONLY');
  }

  if (!req.user.client) {
    throw new AppError('Datos de cliente no encontrados', 500, 'CLIENT_DATA_MISSING');
  }

  // ✅ SIMPLIFICADO: Convertir duración a acción correspondiente
  let action;
  if (duration <= 24) {
    action = 'premium_1_day';
  } else if (duration <= 72) {
    action = 'premium_3_days';
  } else if (duration <= 168) {
    action = 'premium_1_week';
  } else {
    action = 'premium_1_month';
  }

  const result = await pointsService.activatePremiumWithPoints(req.user.client.id, action);

  // Crear notificación
  try {
    await prisma.notification.create({
      data: {
        userId,
        type: 'PAYMENT_SUCCESS',
        title: `¡${result.tier} activado!`,
        message: `Has activado ${result.tier} por ${result.duration} horas usando ${result.pointsCost} puntos. Incluye: acceso a posts premium y chat prioritario`,
        data: {
          tier: result.tier,
          duration: result.duration,
          pointsCost: result.pointsCost,
          expiresAt: result.expiresAt,
          newBalance: result.newBalance,
          benefits: result.benefits,
          // ✅ SIMPLIFICADO: Las 2 funciones
          functionsIncluded: [
            'Acceso a posts premium',
            'Chat prioritario'
          ]
        }
      }
    });
  } catch (error) {
    logger.warn('Failed to create premium activation notification:', error);
  }

  logger.info('Premium activated with points (compatibility endpoint)', {
    userId,
    clientId: req.user.client.id,
    tier: result.tier,
    duration: result.duration,
    pointsCost: result.pointsCost,
    expiresAt: result.expiresAt
  });

  res.status(200).json({
    success: true,
    message: `¡${result.tier} activado exitosamente! Incluye 2 funciones: acceso a posts premium y chat prioritario`,
    data: {
      ...result,
      // ✅ SIMPLIFICADO: Mostrar claramente las funciones
      functionsIncluded: [
        'Acceso a posts premium',
        'Chat prioritario'
      ],
      description: `Premium activado por ${result.duration} horas con 2 funciones incluidas`
    },
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// 📊 ESTADÍSTICAS Y INFORMACIÓN
// ============================================================================

/**
 * GET /api/points/streak
 * Obtener información detallada de la racha
 */
const getStreakInfo = catchAsync(async (req, res) => {
  const userId = req.user.id;

  // ✅ CORREGIDO: Solo CLIENTs tienen racha
  if (req.user.userType !== 'CLIENT') {
    throw new AppError('Solo los clientes tienen racha de puntos', 403, 'CLIENT_ONLY');
  }

  if (!req.user.client) {
    throw new AppError('Datos de cliente no encontrados', 500, 'CLIENT_DATA_MISSING');
  }

  const pointsData = await pointsService.getClientPoints(req.user.client.id);
  const eligibility = await pointsService.checkDailyLoginEligibility(req.user.client.id);

  const streakInfo = {
    currentStreak: pointsData.dailyStreak,
    totalDailyEarned: pointsData.totalDailyEarned,
    canClaim: eligibility.eligible,
    nextClaimAt: eligibility.nextClaimAt,
    bonusMultiplier: pointsService.calculateStreakBonus(pointsData.dailyStreak),
    milestones: {
      next: pointsData.dailyStreak < 7 ? 7 : 
            pointsData.dailyStreak < 15 ? 15 : 
            pointsData.dailyStreak < 30 ? 30 : null,
      rewards: {
        7: 'Bonus de racha del 50%',
        15: 'Bonus de racha del 100%',
        30: 'Bonus máximo alcanzado'
      }
    },
    config: {
      basePoints: pointsService.POINTS_CONFIG.DAILY_LOGIN_POINTS,
      maxStreak: pointsService.POINTS_CONFIG.MAX_STREAK_DAYS,
      bonusThreshold: pointsService.POINTS_CONFIG.STREAK_BONUS_THRESHOLD
    }
  };

  res.status(200).json({
    success: true,
    data: streakInfo,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/points/config
 * Obtener configuración pública del sistema de puntos - ✅ SIMPLIFICADO
 */
const getPointsConfig = catchAsync(async (req, res) => {
  const config = {
    dailyLogin: {
      basePoints: pointsService.POINTS_CONFIG.DAILY_LOGIN_POINTS,
      maxStreak: pointsService.POINTS_CONFIG.MAX_STREAK_DAYS,
      bonusThreshold: pointsService.POINTS_CONFIG.STREAK_BONUS_THRESHOLD,
      bonusMultiplier: pointsService.POINTS_CONFIG.STREAK_BONUS_MULTIPLIER
    },
    // ✅ SIMPLIFICADO: Solo las acciones actualizadas
    actions: pointsService.POINTS_CONFIG.ACTIONS,
    premiumDurations: pointsService.POINTS_CONFIG.PREMIUM_DURATIONS,
    tiers: pointsService.POINTS_CONFIG.TIER_LIMITS,
    currency: 'USD',
    minimumBalance: 1,
    // ✅ NUEVO: Descripción del sistema simplificado
    systemInfo: {
      description: "Sistema simplificado con chat priority separado y premium con 2 funciones",
      chatPriority: {
        standalone: true,
        cost: pointsService.POINTS_CONFIG.ACTIONS.chat_priority,
        duration: "24 horas",
        description: "Solo chat prioritario"
      },
      premium: {
        functionsCount: 2,
        functions: [
          "Acceso a posts premium",
          "Chat prioritario"
        ],
        options: [
          { key: 'premium_1_day', cost: pointsService.POINTS_CONFIG.ACTIONS.premium_1_day, duration: '1 día' },
          { key: 'premium_3_days', cost: pointsService.POINTS_CONFIG.ACTIONS.premium_3_days, duration: '3 días' },
          { key: 'premium_1_week', cost: pointsService.POINTS_CONFIG.ACTIONS.premium_1_week, duration: '7 días' },
          { key: 'premium_1_month', cost: pointsService.POINTS_CONFIG.ACTIONS.premium_1_month, duration: '30 días' }
        ]
      }
    }
  };

  res.status(200).json({
    success: true,
    data: config,
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// 🛠️ FUNCIONES ADMINISTRATIVAS
// ============================================================================

/**
 * POST /api/points/admin/adjust
 * Ajustar puntos manualmente (solo admins)
 */
const adminAdjustPoints = catchAsync(async (req, res) => {
  const { clientId, amount, reason } = req.body;
  const adminUserId = req.user.id;

  // Verificar que es admin
  if (req.user.userType !== 'ADMIN') {
    throw new AppError('Solo administradores pueden ajustar puntos', 403, 'ADMIN_ONLY');
  }

  if (!clientId || !amount || !reason) {
    throw new AppError('ClientId, amount y reason son requeridos', 400, 'MISSING_FIELDS');
  }

  // Verificar que el cliente existe
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { user: { select: { id: true, username: true } } }
  });

  if (!client) {
    throw new AppError('Cliente no encontrado', 404, 'CLIENT_NOT_FOUND');
  }

  const amountNum = parseInt(amount);
  if (amountNum === 0) {
    throw new AppError('Amount no puede ser 0', 400, 'INVALID_AMOUNT');
  }

  // Ajustar puntos
  const result = amountNum > 0 
    ? await pointsService.addPoints(
        clientId, 
        amountNum, 
        'ADMIN_ADJUSTMENT', 
        `Ajuste manual por admin: ${reason}`,
        { adminId: adminUserId, reason }
      )
    : await pointsService.spendPoints(
        clientId, 
        Math.abs(amountNum), 
        'ADMIN_ADJUSTMENT', 
        `Ajuste manual por admin: ${reason}`,
        { adminId: adminUserId, reason }
      );

  // Crear notificación para el cliente
  try {
    await prisma.notification.create({
      data: {
        userId: client.user.id,
        type: 'PAYMENT_SUCCESS',
        title: 'Ajuste de puntos',
        message: `Tu balance ha sido ajustado: ${amountNum > 0 ? '+' : ''}${amountNum} puntos`,
        data: {
          adjustment: amountNum,
          reason,
          newBalance: result.newBalance,
          adminAdjustment: true
        }
      }
    });
  } catch (error) {
    logger.warn('Failed to create admin adjustment notification:', error);
  }

  logger.info('Admin points adjustment', {
    adminUserId,
    clientId,
    clientUsername: client.user.username,
    adjustment: amountNum,
    reason,
    newBalance: result.newBalance
  });

  res.status(200).json({
    success: true,
    message: `Puntos ajustados exitosamente: ${amountNum > 0 ? '+' : ''}${amountNum}`,
    data: {
      adjustment: amountNum,
      newBalance: result.newBalance,
      reason,
      client: {
        id: client.id,
        username: client.user.username
      }
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/points/admin/stats
 * Estadísticas del sistema de puntos (solo admins)
 */
const getPointsSystemStats = catchAsync(async (req, res) => {
  const { timeframe = '30d' } = req.query;

  // Verificar que es admin
  if (req.user.userType !== 'ADMIN') {
    throw new AppError('Solo administradores pueden ver estadísticas', 403, 'ADMIN_ONLY');
  }

  // Obtener estadísticas usando el servicio de pagos
  const paymentStats = await paymentService.getPaymentStats(timeframe);

  // Estadísticas adicionales de puntos
  const [
    totalClientsWithPoints,
    averageBalance,
    topSpenders,
    dailyLoginStats
  ] = await Promise.all([
    prisma.client.count({
      where: { points: { gt: 0 } }
    }),
    prisma.client.aggregate({
      _avg: { points: true }
    }),
    prisma.client.findMany({
      where: { totalPointsSpent: { gt: 0 } },
      orderBy: { totalPointsSpent: 'desc' },
      take: 10,
      include: {
        user: {
          select: { username: true, firstName: true }
        }
      }
    }),
    prisma.client.aggregate({
      _avg: { dailyLoginStreak: true },
      _max: { dailyLoginStreak: true }
    })
  ]);

  const stats = {
    timeframe,
    overview: {
      totalClientsWithPoints,
      averageBalance: Math.round(averageBalance._avg.points || 0),
      averageStreak: Math.round(dailyLoginStats._avg.dailyLoginStreak || 0),
      maxStreak: dailyLoginStats._max.dailyLoginStreak || 0
    },
    points: paymentStats.points,
    revenue: paymentStats.revenue,
    topSpenders: topSpenders.map(client => ({
      username: client.user.username,
      name: client.user.firstName,
      totalSpent: client.totalPointsSpent,
      currentBalance: client.points
    })),
    // ✅ NUEVO: Estadísticas del sistema simplificado
    systemStats: {
      chatPriorityActivations: await prisma.client.count({
        where: {
          chatPriorityUntil: { gt: new Date() }
        }
      }),
      premiumActiveClients: await prisma.client.count({
        where: {
          isPremium: true,
          premiumUntil: { gt: new Date() }
        }
      }),
      premiumWithBothFunctions: await prisma.client.count({
        where: {
          isPremium: true,
          premiumUntil: { gt: new Date() },
          canAccessPremiumProfiles: true
        }
      })
    },
    generatedAt: new Date().toISOString()
  };

  res.status(200).json({
    success: true,
    data: stats,
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// EXPORTAR MÓDULO
// ============================================================================

module.exports = {
  // Balance y estadísticas
  getPointsBalance,
  getPointsHistory,
  getPointsPackages,
  getPackages,
  
  // Login diario
  getDailyLoginStatus,
  claimDailyPoints,
  getStreakInfo,
  
  // Compra de puntos - ✅ CORREGIDO PARA AGENCIES
  purchasePoints,
  confirmPointsPurchase,
  
  // Uso de puntos - ✅ SIMPLIFICADO
  getAvailableActions,
  spendPoints,
  activatePremiumWithPoints, // Mantenido para compatibilidad
  
  // Configuración
  getPointsConfig,
  
  // Funciones administrativas
  adminAdjustPoints,
  getPointsSystemStats
};