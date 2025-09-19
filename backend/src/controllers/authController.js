const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const axios = require('axios');
const { prisma } = require('../config/database');
const { config } = require('../config/environment');
const { AppError, catchAsync } = require('../middleware/errorHandler');
const { generateToken, generateRefreshToken, verifyRefreshToken } = require('../middleware/auth');
const { isEmailUnique, isUsernameUnique, sanitizeString } = require('../utils/validators');
const { sendPasswordResetEmail, sendWelcomeEmail, sendAgencyPendingEmail } = require('../services/authService');
const logger = require('../utils/logger');

// 🔧 ALMACENAMIENTO TEMPORAL PARA TOKENS DE AUTENTICACIÓN
global.tempAuthTokens = global.tempAuthTokens || {};

// 🔧 FUNCIÓN PARA LIMPIAR TOKENS ANTIGUOS
const cleanupOldTokens = () => {
  const now = Date.now();
  const FIVE_MINUTES = 5 * 60 * 1000;
  
  Object.keys(global.tempAuthTokens).forEach(key => {
    if (now - global.tempAuthTokens[key].createdAt > FIVE_MINUTES) {
      delete global.tempAuthTokens[key];
    }
  });
};

// 🔧 FUNCIÓN VALIDAR TOKEN DE TURNSTILE
const validateTurnstileToken = async (token, clientIP = null) => {
  try {
    if (!config.turnstile?.secretKey) {
      logger.warn('⚠️ Turnstile Secret Key no configurada - saltando validación');
      return { success: true, skipped: true, reason: 'TURNSTILE_NOT_CONFIGURED' };
    }

    if (!token || typeof token !== 'string' || token.trim() === '') {
      logger.warn('❌ Token de Turnstile inválido:', { token: typeof token });
      return { success: false, error: 'Token de verificación inválido', errorCode: 'INVALID_TOKEN' };
    }

    const cleanToken = token.trim();
    logger.info('🔐 Validando token de Turnstile...', {
      tokenLength: cleanToken.length,
      clientIP: clientIP || 'not provided'
    });

    const verificationData = { secret: config.turnstile.secretKey, response: cleanToken };
    if (clientIP) verificationData.remoteip = clientIP;

    const response = await axios.post(config.turnstile.verificationUrl, verificationData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000
    });

    const result = response.data;
    logger.info('🔐 Respuesta de Cloudflare Turnstile:', {
      success: result.success,
      errorCodes: result['error-codes'] || [],
      challengeTs: result.challenge_ts,
      hostname: result.hostname
    });

    if (result.success) {
      logger.info('✅ Turnstile validado correctamente');
      return { success: true, data: result };
    } else {
      logger.warn('❌ Turnstile falló validación:', {
        errorCodes: result['error-codes'] || [],
        action: result.action
      });
      return {
        success: false,
        error: 'Verificación de seguridad falló',
        errorCode: 'TURNSTILE_VALIDATION_FAILED',
        details: result['error-codes'] || []
      };
    }
  } catch (error) {
    logger.error('💥 Error validando Turnstile:', {
      error: error.message,
      code: error.code,
      response: error.response?.data
    });

    if (config.environment?.isDevelopment && (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT')) {
      logger.warn('⚠️ En desarrollo: saltando validación Turnstile por error de conexión');
      return { success: true, skipped: true, reason: 'DEV_CONNECTION_ERROR' };
    }

    return { success: false, error: 'Error verificando seguridad. Intenta de nuevo.', errorCode: 'TURNSTILE_SERVICE_ERROR' };
  }
};

// 🔧 HELPER PARA COMPLETITUD DEL PERFIL
const calculateInitialProfileCompleteness = (userData, userType) => {
  const fields = ['firstName', 'lastName', 'bio', 'phone'];
  if (userType === 'AGENCY') fields.push('website', 'companyName', 'businessLicense', 'contactPerson', 'address');
  
  const completeness = fields.reduce((acc, field) => acc + (userData[field] ? 100 / fields.length : 0), 0);
  return Math.round(completeness);
};

// 🔧 GENERAR USERNAME ÚNICO
const generateUniqueUsername = async (firstName, email) => {
  if (!firstName || !email || typeof firstName !== 'string' || typeof email !== 'string') {
    console.error('❌ generateUniqueUsername: parámetros inválidos:', { firstName, email });
    throw new AppError('Datos insuficientes para generar username', 400, 'INSUFFICIENT_DATA');
  }

  const namePart = firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const emailPart = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  
  const strategies = [
    () => `${namePart}${Math.floor(Math.random() * 9999) + 1}`,
    () => `${namePart}_${Math.floor(Math.random() * 9999) + 1}`,
    () => `${emailPart}${Math.floor(Math.random() * 9999) + 1}`,
    () => `${namePart}${emailPart}${Math.floor(Math.random() * 9999) + 1}`.substring(0, 20),
    () => `user_${Date.now()}${Math.floor(Math.random() * 999)}`.substring(0, 20)
  ];

  for (let i = 0; i < strategies.length; i++) {
    let username = strategies[i]();
    if (!username || username.trim() === '' || username.length < 3) {
      username = `user${Math.floor(Math.random() * 9999) + 1}`;
    }
    
    try {
      if (await isUsernameUnique(username)) {
        logger.info('✅ Username único generado:', { username, attempts: i + 1 });
        return username;
      }
    } catch (error) {
      console.error('❌ Error verificando unicidad del username:', error);
    }
  }
  
  const fallbackUsername = `user_${Date.now()}_${Math.floor(Math.random() * 999)}`;
  logger.warn('⚠️ Usando username fallback:', fallbackUsername);
  return fallbackUsername;
};

// 🔧 RESPUESTA DE USUARIO ESTÁNDAR
const createUserResponse = (user) => ({
  id: user.id,
  email: user.email,
  username: user.username,
  firstName: user.firstName,
  lastName: user.lastName || '',
  avatar: user.avatar,
  userType: user.userType,
  phone: user.phone || '',
  bio: user.bio || '',
  website: user.website || '',
  isActive: user.isActive,
  profileViews: user.profileViews,
  lastLogin: user.lastLogin,
  createdAt: user.createdAt,
  location: user.location,
  settings: user.settings,
  reputation: user.reputation,
  [user.userType.toLowerCase()]: user[user.userType.toLowerCase()],
  profileIncomplete: !user.lastName || !user.bio || !user.phone
});

// 🔧 RESPUESTA ESPECÍFICA DE AGENCIA
const createAgencyResponse = (user, agencyData, agencyRequest) => ({
  id: user.id,
  email: user.email,
  username: user.username,
  firstName: user.firstName,
  lastName: user.lastName,
  userType: user.userType,
  accountStatus: user.accountStatus,
  canLogin: user.canLogin,
  agencyData: {
    companyName: agencyData.companyName,
    businessLicense: agencyData.businessLicense,
    contactPerson: agencyData.contactPerson,
    address: agencyData.address,
    verificationStatus: 'PENDING',
    requestId: agencyRequest.id
  }
});

// 🔧 VALIDAR CONFIGURACIÓN Y HASHEAR PASSWORD
const validateConfigAndHashPassword = async (password) => {
  if (!config?.security?.bcryptRounds) {
    console.error('❌ config.security.bcryptRounds no está definido');
    throw new AppError('Error de configuración del servidor - bcryptRounds', 500, 'SERVER_CONFIG_ERROR');
  }

  const saltRounds = config.security.bcryptRounds;
  if (!Number.isInteger(saltRounds) || saltRounds < 10 || saltRounds > 15) {
    console.error('❌ saltRounds inválido:', saltRounds);
    throw new AppError('Error de configuración de seguridad', 500, 'SECURITY_CONFIG_ERROR');
  }

  if (!password || typeof password !== 'string' || password.trim() === '') {
    throw new AppError('Contraseña inválida', 400, 'INVALID_PASSWORD');
  }

  try {
    return await bcrypt.hash(password, saltRounds);
  } catch (bcryptError) {
    console.error('💥 Error crítico en bcrypt.hash:', bcryptError);
    throw new AppError('Error procesando la contraseña', 500, 'BCRYPT_ERROR');
  }
};

// 🔧 VALIDAR ACCESO DE AGENCIA
const validateAgencyAccess = (user, context = 'login') => {
  const logData = {
    userId: user.id,
    username: user.username,
    accountStatus: user.accountStatus,
    canLogin: user.canLogin,
    verificationStatus: user.agency?.verificationStatus,
    isVerified: user.agency?.isVerified
  };

  console.log(`🏢 VALIDANDO ACCESO DE AGENCIA (${context}):`, logData);

  const statusChecks = [
    { condition: user.accountStatus === 'PENDING_APPROVAL', message: 'Tu solicitud está siendo revisada. Te notificaremos cuando sea aprobada.', code: 'AGENCY_PENDING_APPROVAL' },
    { condition: !user.canLogin, message: 'Tu solicitud está siendo revisada. Te notificaremos cuando sea aprobada.', code: 'AGENCY_PENDING_APPROVAL' },
    { condition: user.agency?.verificationStatus === 'REJECTED', message: 'Tu solicitud de agencia fue rechazada. Contacta al soporte para más información.', code: 'AGENCY_REJECTED' },
    { condition: user.accountStatus === 'SUSPENDED', message: 'Tu cuenta de agencia ha sido suspendida temporalmente.', code: 'AGENCY_SUSPENDED' },
    { condition: user.accountStatus !== 'ACTIVE' || !user.agency?.isVerified, message: 'Tu solicitud está siendo revisada. Te notificaremos cuando sea aprobada.', code: 'AGENCY_PENDING_APPROVAL' }
  ];

  for (const check of statusChecks) {
    if (check.condition) {
      logger.warn(`❌ Agencia ${check.code.toLowerCase()}:`, logData);
      throw new AppError(check.message, 403, check.code);
    }
  }

  console.log('✅ Agencia verificada, permitiendo acceso:', logData);
};

// 🔧 CREAR DEFAULTS PARA TIPO DE USUARIO
const createUserTypeDefaults = (userType) => {
  const defaults = {};

  if (userType === 'ESCORT') {
    defaults.escort = {
      create: {
        age: null,
        services: [],
        maxPosts: config.defaults.escort.maxPosts,
        currentPosts: 0,
        isVerified: false
      }
    };
  } else if (userType === 'CLIENT') {
    defaults.client = {
      create: {
        points: config.defaults.client.welcomePoints,
        isPremium: false,
        premiumTier: 'BASIC',
        dailyMessageLimit: config.defaults.client.dailyMessageLimit,
        canViewPhoneNumbers: false,
        canSendImages: false,
        canSendVoiceMessages: false,
        canAccessPremiumProfiles: false,
        prioritySupport: false,
        canSeeOnlineStatus: false,
        messagesUsedToday: 0,
        lastMessageReset: new Date(),
        maxFavorites: config.defaults.client.maxFavorites,
        currentFavorites: 0
      }
    };
  }

  return defaults;
};

// 🔧 REGISTRO UNIFICADO
const register = catchAsync(async (req, res) => {
  console.log('📝 REGISTRO - DATOS RECIBIDOS:', JSON.stringify({
    email: req.body.email ? 'PRESENTE' : 'FALTANTE',
    firstName: req.body.firstName ? 'PRESENTE' : 'FALTANTE', 
    userType: req.body.userType,
    companyName: req.body.companyName || 'NO_COMPANY',
    hasFiles: req.uploadedFiles ? Object.keys(req.uploadedFiles).length : 0
  }, null, 2));

  const {
    email, firstName, password, userType, companyName, businessLicense,
    contactPerson, address, phone, bio, website, locationId, turnstileToken
  } = req.body;

  // 🔧 VALIDACIONES CRÍTICAS INICIALES
  const requiredFields = { email, firstName, password, userType };
  const missingFields = Object.entries(requiredFields).filter(([key, value]) => !value).map(([key]) => key);
  
  if (missingFields.length > 0) {
    console.error('❌ Faltan campos obligatorios:', missingFields);
    throw new AppError(`Faltan campos obligatorios: ${missingFields.join(', ')}`, 400, 'MISSING_REQUIRED_FIELDS');
  }

  const invalidTypes = Object.entries(requiredFields).filter(([key, value]) => typeof value !== 'string').map(([key]) => key);
  if (invalidTypes.length > 0) {
    console.error('❌ Tipos de datos incorrectos:', invalidTypes);
    throw new AppError('Los datos deben ser texto válido', 400, 'INVALID_DATA_TYPES');
  }

  // 🔧 VALIDAR TURNSTILE
  console.log('🔐 Validando Turnstile token...');
  const turnstileResult = await validateTurnstileToken(turnstileToken, req.ip);
  
  if (!turnstileResult.success && !turnstileResult.skipped) {
    logger.warn('❌ Registro bloqueado por Turnstile:', { email, userType, error: turnstileResult.error, ip: req.ip });
    throw new AppError(turnstileResult.error || 'Verificación de seguridad falló', 400, turnstileResult.errorCode || 'TURNSTILE_VALIDATION_FAILED');
  }

  logger.info(turnstileResult.skipped ? `⚠️ Turnstile validation skipped: ${turnstileResult.reason}` : '✅ Turnstile validation successful');

  // 🔧 VALIDACIONES ESPECÍFICAS PARA AGENCIAS
  if (userType === 'AGENCY') {
    if (!req.uploadedFiles || Object.keys(req.uploadedFiles).length === 0) {
      throw new AppError('No se pudieron procesar las fotos de cédula. Verifica que los archivos sean JPG, PNG o GIF y menores a 5MB.', 400, 'NO_FILES_UPLOADED');
    }

    const requiredFiles = ['cedulaFrente', 'cedulaTrasera'];
    const missingFiles = requiredFiles.filter(file => !req.uploadedFiles[file]?.secure_url);
    
    if (missingFiles.length > 0) {
      const fileNames = { cedulaFrente: 'foto frontal de la cédula', cedulaTrasera: 'foto posterior de la cédula' };
      throw new AppError(`La ${fileNames[missingFiles[0]]} no se pudo procesar correctamente`, 400, `${missingFiles[0].toUpperCase()}_REQUIRED`);
    }
  }

  // 🔧 VERIFICACIONES Y PREPARACIÓN
  if (!(await isEmailUnique(email))) {
    logger.warn('❌ Email ya existe:', email);
    throw new AppError('Este email ya está registrado', 409, 'EMAIL_EXISTS');
  }

  const username = await generateUniqueUsername(firstName, email);
  const hashedPassword = await validateConfigAndHashPassword(password);
  const isAgency = userType === 'AGENCY';

  const userData = {
    email: email.toLowerCase().trim(),
    username: username.toLowerCase().trim(),
    firstName: sanitizeString(firstName),
    lastName: '',
    password: hashedPassword,
    userType,
    phone: phone || '',
    bio: bio || '',
    website: website || '',
    locationId: locationId || null,
    isActive: true,
    lastActiveAt: new Date(),
    accountStatus: isAgency ? 'PENDING_APPROVAL' : 'ACTIVE',
    canLogin: !isAgency,
    emailVerified: !isAgency
  };

  try {
    let cedulaUrls = {};
    if (userType === 'AGENCY' && req.uploadedFiles) {
      cedulaUrls = {
        cedulaFrente: req.uploadedFiles.cedulaFrente?.secure_url || null,
        cedulaTrasera: req.uploadedFiles.cedulaTrasera?.secure_url || null
      };

      if (!cedulaUrls.cedulaFrente || !cedulaUrls.cedulaTrasera) {
        throw new AppError('Error procesando las imágenes de cédula', 500, 'CEDULA_UPLOAD_ERROR');
      }
    }

    // 🔧 GENERAR DATOS AUTOMÁTICOS PARA AGENCIAS SIMPLIFICADAS
    const finalCompanyName = companyName || (isAgency ? `${firstName} Agency` : null);
    const finalContactPerson = contactPerson || (isAgency ? firstName : null);
    const finalAddress = address || (isAgency ? 'Por definir' : null);
    const finalBusinessLicense = businessLicense || (isAgency ? `${firstName.replace(/\s+/g, '-').toUpperCase()}-${Date.now()}` : null);

    console.log('🏢 Datos de agencia generados:', {
      companyName: finalCompanyName,
      contactPerson: finalContactPerson,
      address: finalAddress,
      businessLicense: finalBusinessLicense
    });

    // 🔧 VERIFICAR CONFIGURACIÓN
    const configChecks = [
      { path: config?.defaults?.escort?.maxPosts, error: 'escort defaults' },
      { path: config?.defaults?.client?.welcomePoints, error: 'client defaults' }
    ];

    for (const check of configChecks) {
      if (!check.path) {
        throw new AppError(`Error de configuración del servidor - ${check.error}`, 500, 'CONFIG_ERROR');
      }
    }

    const user = await prisma.user.create({
      data: {
        ...userData,
        ...createUserTypeDefaults(userType),
        ...(userType === 'AGENCY' && {
          agency: {
            create: {
              companyName: sanitizeString(finalCompanyName),
              businessLicense: finalBusinessLicense,
              contactPerson: sanitizeString(finalContactPerson),
              address: sanitizeString(finalAddress),
              cedulaFrente: cedulaUrls.cedulaFrente,
              cedulaTrasera: cedulaUrls.cedulaTrasera,
              isVerified: false,
              totalEscorts: 0,
              verifiedEscorts: 0,
              totalVerifications: 0,
              activeEscorts: 0,
              verificationStatus: 'PENDING'
            }
          }
        }),
        settings: {
          create: {
            emailNotifications: true,
            pushNotifications: true,
            messageNotifications: true,
            likeNotifications: true,
            boostNotifications: true,
            showOnline: true,
            showLastSeen: true,
            allowDirectMessages: true,
            showPhoneNumber: false,
            showInDiscovery: userType !== 'CLIENT',
            showInTrending: userType !== 'CLIENT',
            showInSearch: true,
            contentFilter: 'MODERATE'
          }
        },
        reputation: {
          create: {
            overallScore: 50.0,
            responseRate: 0.0,
            profileCompleteness: calculateInitialProfileCompleteness({
              ...userData, companyName: finalCompanyName, businessLicense: finalBusinessLicense, contactPerson: finalContactPerson, address: finalAddress
            }, userType),
            trustScore: isAgency ? 15.0 : 25.0,
            discoveryScore: isAgency ? 0.0 : 10.0,
            trendingScore: 0.0,
            qualityScore: 30.0
          }
        }
      },
      include: { escort: true, agency: true, client: true, settings: true, reputation: true, location: true }
    });

    // 🔧 PROCESAMIENTO ESPECÍFICO PARA AGENCIAS
    if (userType === 'AGENCY') {
      const agencyRequest = await prisma.agencyRegistrationRequest.create({
        data: {
          userId: user.id,
          fullName: `${firstName} ${finalContactPerson}`.trim(),
          documentNumber: finalBusinessLicense,
          businessEmail: email,
          businessPhone: phone || '',
          documentFrontImage: cedulaUrls.cedulaFrente,
          documentBackImage: cedulaUrls.cedulaTrasera,
          status: 'PENDING',
          submittedAt: new Date()
        }
      });

      // 🔧 NOTIFICACIONES A ADMINS
      try {
        const admins = await prisma.user.findMany({ where: { userType: 'ADMIN' }, select: { id: true } });
        if (admins.length > 0) {
          await prisma.notification.createMany({
            data: admins.map(admin => ({
              userId: admin.id,
              type: 'SYSTEM',
              title: 'Nueva agencia pendiente de verificación',
              message: `${finalCompanyName} (${firstName}) solicita verificación como agencia`,
              priority: 'HIGH',
              data: {
                agencyUserId: user.id,
                requestId: agencyRequest.id,
                companyName: finalCompanyName,
                businessLicense: finalBusinessLicense,
                contactPerson: finalContactPerson,
                address: finalAddress,
                cedulaFrente: cedulaUrls.cedulaFrente,
                cedulaTrasera: cedulaUrls.cedulaTrasera,
                submittedAt: new Date().toISOString()
              }
            }))
          });
        }
      } catch (notificationError) {
        logger.warn('⚠️ No se pudieron enviar notificaciones a admins:', notificationError.message);
      }

      // 🔧 EMAIL DE CONFIRMACIÓN
      try {
        await sendAgencyPendingEmail(user, { companyName: finalCompanyName, businessLicense: finalBusinessLicense, contactPerson: finalContactPerson, address: finalAddress });
      } catch (emailError) {
        logger.warn('⚠️ No se pudo enviar email de solicitud pendiente:', emailError.message);
      }

      return res.status(201).json({
        success: true,
        message: 'Solicitud de agencia recibida. Te notificaremos cuando sea aprobada.',
        data: {
          user: createAgencyResponse(user, { companyName: finalCompanyName, businessLicense: finalBusinessLicense, contactPerson: finalContactPerson, address: finalAddress }, agencyRequest),
          applicationStatus: 'PENDING_APPROVAL',
          estimatedReviewTime: config.business?.agencyReviewTime || '24-48 horas',
          nextSteps: [
            'Nuestro equipo revisará tu documentación',
            'Verificaremos la información proporcionada',
            'Te notificaremos por email sobre la decisión',
            'Una vez aprobado, podrás acceder a todas las funcionalidades'
          ]
        },
        timestamp: new Date().toISOString()
      });
    }

    // 🔧 PROCESAMIENTO PARA CLIENTES Y ESCORTS
    try {
      await sendWelcomeEmail(user);
    } catch (emailError) {
      logger.warn('⚠️ No se pudo enviar email de bienvenida:', emailError.message);
    }

    // 🔧 PUNTOS DE BIENVENIDA PARA CLIENTES
    if (userType === 'CLIENT') {
      try {
        await prisma.pointTransaction.create({
          data: {
            clientId: user.client.id,
            amount: config.defaults.client.welcomePoints,
            type: 'REGISTRATION',
            description: 'Puntos de bienvenida por registro',
            balanceBefore: 0,
            balanceAfter: config.defaults.client.welcomePoints
          }
        });
      } catch (pointsError) {
        logger.warn('⚠️ No se pudieron agregar puntos de bienvenida:', pointsError.message);
      }
    }

    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    logger.logAuth('register', user.id, user.email, true, {
      userType, method: 'email_password', ip: req.ip, userAgent: req.get('User-Agent'),
      usernameGenerated: true, turnstileValidated: turnstileResult.success
    });

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: {
        user: {
          ...createUserResponse(user),
          nextSteps: [
            'Completa tu perfil', 'Agrega una foto', 'Completa tu descripción',
            userType === 'ESCORT' ? 'Crea tu primer anuncio' : 'Explora perfiles'
          ]
        },
        token,
        refreshToken,
        expiresIn: config.auth?.tokenExpiry || '7d'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('💥 Error en registro de usuario:', {
      email, firstName, userType, companyName: userType === 'AGENCY' ? finalCompanyName : undefined,
      error: error.message, turnstileValidated: turnstileResult?.success
    });
    throw error;
  }
});

// 🔧 FUNCIÓN ESPECÍFICA PARA AGENCIAS
const registerAgency = catchAsync(async (req, res) => {
  req.body.userType = 'AGENCY';
  
  console.log('🏢 REGISTRO DE AGENCIA SIMPLIFICADO - DATOS RECIBIDOS:', {
    email: req.body.email ? 'PRESENTE' : 'FALTANTE',
    firstName: req.body.firstName ? 'PRESENTE' : 'FALTANTE',
    password: req.body.password ? 'PRESENTE' : 'FALTANTE',
    uploadedFiles: req.uploadedFiles ? Object.keys(req.uploadedFiles) : 'NO_FILES'
  });

  // 🔧 GENERAR DATOS AUTOMÁTICOS PARA CAMPOS FALTANTES
  const firstName = req.body.firstName?.trim();
  const email = req.body.email?.trim();
  
  if (!firstName || !email) {
    throw new AppError('Nombre y email son requeridos', 400, 'MISSING_REQUIRED_DATA');
  }

  // 🔧 SI NO VIENEN, GENERAR AUTOMÁTICAMENTE
  if (!req.body.companyName || req.body.companyName.trim() === '') {
    req.body.companyName = `${firstName} Agency`;
  }
  if (!req.body.contactPerson || req.body.contactPerson.trim() === '') {
    req.body.contactPerson = firstName;
  }
  if (!req.body.address || req.body.address.trim() === '') {
    req.body.address = 'Por definir';
  }
  if (!req.body.businessLicense || req.body.businessLicense.trim() === '') {
    req.body.businessLicense = `${firstName.replace(/\s+/g, '-').toUpperCase()}-${Date.now()}`;
  }
  
  console.log('🏢 Datos generados automáticamente:', {
    companyName: req.body.companyName,
    contactPerson: req.body.contactPerson,
    address: req.body.address,
    businessLicense: req.body.businessLicense
  });

  // 🔧 PROCESAR CON LA FUNCIÓN PRINCIPAL DE REGISTRO
  return register(req, res);
});

// 🔧 LOGIN NORMAL
const login = catchAsync(async (req, res) => {
  const { email, password, rememberMe, turnstileToken } = req.body;

  // 🔧 VALIDAR TURNSTILE SI SE PROPORCIONA (OPCIONAL EN LOGIN)
  if (turnstileToken) {
    const turnstileResult = await validateTurnstileToken(turnstileToken, req.ip);
    if (!turnstileResult.success && !turnstileResult.skipped) {
      logger.warn('❌ Login bloqueado por Turnstile:', { email, error: turnstileResult.error, ip: req.ip });
      throw new AppError(turnstileResult.error || 'Verificación de seguridad falló', 400, turnstileResult.errorCode || 'TURNSTILE_VALIDATION_FAILED');
    }
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { escort: true, agency: true, client: true, admin: true, settings: true, reputation: true, location: true }
  });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    logger.logAuth('login', user?.id || null, email, false, {
      reason: !user ? 'user_not_found' : 'invalid_password',
      ip: req.ip, userAgent: req.get('User-Agent')
    });
    throw new AppError('Credenciales inválidas', 401, 'INVALID_CREDENTIALS');
  }

  const accessChecks = [
    { condition: !user.isActive, message: 'Cuenta desactivada', code: 'ACCOUNT_INACTIVE' },
    { condition: user.isBanned, message: `Cuenta suspendida: ${user.banReason}`, code: 'ACCOUNT_BANNED' }
  ];

  for (const check of accessChecks) {
    if (check.condition) {
      logger.warn(`❌ ${check.code}:`, user.username);
      throw new AppError(check.message, check.code === 'ACCOUNT_INACTIVE' ? 401 : 403, check.code);
    }
  }

  if (user.userType === 'AGENCY') validateAgencyAccess(user, 'login');

  // 🔧 PUNTOS DE LOGIN DIARIO PARA CLIENTES
  if (user.userType === 'CLIENT' && user.client) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lastLogin = user.lastLogin ? new Date(user.lastLogin) : null;
      
      if (!lastLogin || lastLogin < today) {
        const dailyPoints = config.defaults.client.dailyLoginPoints || 5;
        await Promise.all([
          prisma.pointTransaction.create({
            data: {
              clientId: user.client.id,
              amount: dailyPoints,
              type: 'DAILY_LOGIN',
              description: 'Puntos por login diario',
              balanceBefore: user.client.points,
              balanceAfter: user.client.points + dailyPoints
            }
          }),
          prisma.client.update({
            where: { id: user.client.id },
            data: { points: { increment: dailyPoints } }
          })
        ]);
      }
    } catch (pointsError) {
      logger.warn('⚠️ No se pudieron agregar puntos de login diario:', pointsError.message);
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date(), lastActiveAt: new Date(), lastLoginIP: req.ip }
  });

  const tokenExpiration = rememberMe ? (config.auth?.rememberMeExpiry || '30d') : (config.auth?.tokenExpiry || '7d');
  const token = generateToken(user.id, tokenExpiration);
  const refreshTokenGen = generateRefreshToken(user.id);

  logger.logAuth('login', user.id, email, true, {
    userType: user.userType, verificationStatus: user.agency?.verificationStatus || null,
    accountStatus: user.accountStatus, rememberMe, ip: req.ip, userAgent: req.get('User-Agent'),
    turnstileValidated: !!turnstileToken
  });

  res.status(200).json({
    success: true,
    message: 'Login exitoso',
    data: {
      user: createUserResponse(user),
      token,
      refreshToken: refreshTokenGen,
      expiresIn: tokenExpiration,
      ...(user.userType === 'AGENCY' && {
        verificationStatus: user.agency?.verificationStatus || 'PENDING',
        accountStatus: user.accountStatus
      })
    },
    timestamp: new Date().toISOString()
  });
});

// 🔧 GOOGLE AUTH
const googleAuth = catchAsync(async (req, res, next) => {
  let userType = req.query.userType || 'CLIENT';
  
  console.log('🔍 Google Auth iniciado:', {
    userType,
    query: req.query,
    sessionId: req.sessionID || 'NO_SESSION'
  });
  
  if (!['ESCORT', 'AGENCY', 'CLIENT'].includes(userType)) {
    console.log('❌ Tipo de usuario no válido:', userType);
    return res.status(400).json({
      success: false,
      message: 'Tipo de usuario no válido',
      errorCode: 'INVALID_USER_TYPE',
      timestamp: new Date().toISOString()
    });
  }

  if (!config.google?.clientId || !config.google?.clientSecret) {
    console.log('❌ Google OAuth no configurado');
    return res.status(500).json({
      success: false,
      message: 'Google OAuth no está configurado en el servidor',
      errorCode: 'GOOGLE_OAUTH_NOT_CONFIGURED',
      timestamp: new Date().toISOString()
    });
  }

  console.log('🔍 Google config check:', {
    hasClientId: !!config.google.clientId,
    hasClientSecret: !!config.google.clientSecret,
    authUrl: config.google.authUrl,
    callbackUrl: config.google.callbackUrl
  });

  req.session.pendingUserType = userType;
  
  const googleAuthUrl = `${config.google.authUrl}?` +
    `client_id=${config.google.clientId}&` +
    `redirect_uri=${encodeURIComponent(config.google.callbackUrl)}&` +
    `response_type=code&` +
    `scope=openid email profile&` +
    `access_type=offline&` +
    `prompt=consent`;
  
  console.log('🔍 Redirigiendo a Google:', googleAuthUrl.substring(0, 100) + '...');
  res.redirect(googleAuthUrl);
});

// 🔧 GOOGLE CALLBACK COMPLETAMENTE CORREGIDO
const googleCallback = catchAsync(async (req, res, next) => {
  const { code, error, state } = req.query;
  let userType = req.session?.pendingUserType || 'CLIENT';

  console.log('🔍 Google Callback - Query params completos:', {
    hasCode: !!code,
    codeLength: code?.length || 0,
    error: error || 'NO_ERROR',
    state: state || 'NO_STATE',
    userType,
    sessionId: req.sessionID || 'NO_SESSION',
    allParams: Object.keys(req.query),
    url: req.url
  });

  // ✅ MANEJAR ERRORES DE GOOGLE
  if (error) {
    console.log('❌ Google OAuth error recibido:', error);
    const errorMessages = {
      'access_denied': 'Acceso denegado por el usuario',
      'invalid_request': 'Solicitud inválida a Google',
      'unauthorized_client': 'Cliente no autorizado',
      'unsupported_response_type': 'Tipo de respuesta no soportado',
      'invalid_scope': 'Scope inválido',
      'server_error': 'Error del servidor de Google',
      'temporarily_unavailable': 'Servicio temporalmente no disponible'
    };
    const friendlyError = errorMessages[error] || `Error de Google: ${error}`;
    return res.redirect(`${config.urls?.frontend || 'http://localhost:5173'}?auth=error&message=${encodeURIComponent(friendlyError)}`);
  }

  if (!code) {
    console.log('❌ No authorization code received');
    return res.redirect(`${config.urls?.frontend || 'http://localhost:5173'}?auth=error&message=${encodeURIComponent('No se recibió código de autorización de Google')}`);
  }

  try {
    console.log('🔍 Starting Google token exchange...');
    
    // ✅ VERIFICAR CONFIGURACIÓN DE GOOGLE DETALLADA
    const googleConfigCheck = {
      hasClientId: !!config.google?.clientId,
      hasClientSecret: !!config.google?.clientSecret,
      hasTokenUrl: !!config.google?.tokenUrl,
      hasCallbackUrl: !!config.google?.callbackUrl,
      hasUserInfoUrl: !!config.google?.userInfoUrl
    };

    console.log('🔍 Google config completeness:', googleConfigCheck);

    if (!config.google?.clientId || !config.google?.clientSecret) {
      console.log('❌ Google config missing critical fields:', googleConfigCheck);
      throw new Error('Google OAuth not properly configured - missing credentials');
    }

    if (!config.google?.tokenUrl || !config.google?.userInfoUrl) {
      console.log('❌ Google config missing URLs:', googleConfigCheck);
      throw new Error('Google OAuth not properly configured - missing URLs');
    }

    console.log('🔍 Google URLs check:', {
      tokenUrl: config.google.tokenUrl,
      callbackUrl: config.google.callbackUrl,
      userInfoUrl: config.google.userInfoUrl
    });

    // ✅ OBTENER TOKEN DE GOOGLE CON TIMEOUT AUMENTADO Y RETRY
    const tokenData = {
      client_id: config.google.clientId,
      client_secret: config.google.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: config.google.callbackUrl
    };

    console.log('🔍 Token request data:', {
      client_id: config.google.clientId?.substring(0, 20) + '...',
      hasClientSecret: !!config.google.clientSecret,
      codeLength: code.length,
      redirect_uri: config.google.callbackUrl
    });

    let tokenResponse;
    const maxRetries = 3;
    const timeoutMs = 30000; // Aumentado a 30 segundos

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔍 Token request attempt ${attempt}/${maxRetries}...`);
        
        tokenResponse = await axios.post(config.google.tokenUrl, tokenData, {
          headers: { 
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          timeout: timeoutMs,
          validateStatus: (status) => status < 500, // Retry en errores 5xx
          maxRedirects: 5
        });

        console.log('✅ Token response successful on attempt', attempt);
        console.log('🔍 Token response status:', tokenResponse.status);
        console.log('🔍 Token response headers:', Object.keys(tokenResponse.headers));
        break; // Salir del loop si es exitoso

      } catch (tokenError) {
        const isTimeout = tokenError.code === 'ETIMEDOUT';
        const isNetworkError = ['ECONNREFUSED', 'ENOTFOUND', 'ECONNRESET'].includes(tokenError.code);
        const is5xxError = tokenError.response?.status >= 500;
        const shouldRetry = (isTimeout || isNetworkError || is5xxError) && attempt < maxRetries;

        console.log(`💥 Token request failed on attempt ${attempt}:`, {
          message: tokenError.message,
          code: tokenError.code,
          status: tokenError.response?.status,
          statusText: tokenError.response?.statusText,
          isTimeout,
          isNetworkError,
          is5xxError,
          shouldRetry,
          isLastAttempt: attempt === maxRetries
        });
        
        if (tokenError.response?.data) {
          console.log('💥 Google token error details:', tokenError.response.data);
        }
        
        // Si debemos reintentar
        if (shouldRetry) {
          const waitTime = Math.min(attempt * 2000, 10000); // Máximo 10 segundos
          console.log(`⏱️ ${isTimeout ? 'Timeout' : 'Network/Server error'} detected, retrying in ${waitTime/1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        // Si es el último intento o un error no retriable
        if (attempt === maxRetries) {
          console.log('💥 All retry attempts failed');
          throw new Error(`Google token exchange failed after ${maxRetries} attempts: ${tokenError.message}`);
        }
        
        // Para errores no retriables (4xx client errors)
        throw new Error(`Google token exchange failed: ${tokenError.message}`);
      }
    }

    const { access_token, id_token, refresh_token } = tokenResponse.data;
    console.log('🔍 Token response data:', {
      hasAccessToken: !!access_token,
      hasIdToken: !!id_token,
      hasRefreshToken: !!refresh_token,
      tokenType: tokenResponse.data.token_type,
      expiresIn: tokenResponse.data.expires_in
    });

    if (!access_token) {
      console.log('❌ No access token in response:', tokenResponse.data);
      throw new Error('No access token received from Google');
    }

    // ✅ OBTENER INFORMACIÓN DEL USUARIO CON TIMEOUT AUMENTADO Y RETRY
    console.log('🔍 Getting user info from Google...');
    let userResponse;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔍 User info request attempt ${attempt}/${maxRetries}...`);
        
        userResponse = await axios.get(config.google.userInfoUrl, {
          headers: { 
            Authorization: `Bearer ${access_token}`,
            'Accept': 'application/json'
          },
          timeout: timeoutMs // Mismo timeout que el token request
        });

        console.log('✅ User info response successful on attempt', attempt);
        console.log('🔍 User info response status:', userResponse.status);
        break;

      } catch (userError) {
        const isTimeout = userError.code === 'ETIMEDOUT';
        const isNetworkError = ['ECONNREFUSED', 'ENOTFOUND', 'ECONNRESET'].includes(userError.code);
        const is5xxError = userError.response?.status >= 500;
        const shouldRetry = (isTimeout || isNetworkError || is5xxError) && attempt < maxRetries;

        console.log(`💥 User info request failed on attempt ${attempt}:`, {
          message: userError.message,
          code: userError.code,
          status: userError.response?.status,
          data: userError.response?.data,
          isTimeout,
          shouldRetry
        });
        
        if (shouldRetry) {
          const waitTime = Math.min(attempt * 1500, 8000); // Espera más corta para user info
          console.log(`⏱️ Retrying user info request in ${waitTime/1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        if (attempt === maxRetries) {
          throw new Error(`Google user info failed after ${maxRetries} attempts: ${userError.message}`);
        }
        
        throw new Error(`Google user info failed: ${userError.message}`);
      }
    }

    const googleUser = userResponse.data;
    console.log('🔍 Google user data received:', {
      id: googleUser.id,
      email: googleUser.email,
      name: googleUser.name,
      given_name: googleUser.given_name,
      family_name: googleUser.family_name,
      picture: !!googleUser.picture,
      email_verified: googleUser.email_verified
    });

    if (!googleUser.email || !googleUser.id) {
      console.log('❌ Invalid Google user data:', googleUser);
      throw new Error('Invalid user data from Google');
    }

    // ✅ BUSCAR O CREAR USUARIO CON MEJOR LOGGING
    console.log('🔍 Searching for existing user...');
    let user = await prisma.user.findFirst({
      where: { 
        OR: [
          { email: googleUser.email }, 
          { googleId: googleUser.id }
        ] 
      },
      include: { escort: true, agency: true, client: true, admin: true, settings: true, reputation: true, location: true }
    });

    if (user) {
      console.log('✅ User found - existing account:', {
        id: user.id,
        email: user.email,
        userType: user.userType,
        hasGoogleId: !!user.googleId,
        isActive: user.isActive,
        isBanned: user.isBanned
      });

      // Usuario existente - verificaciones de acceso
      if (user.userType !== userType) {
        userType = user.userType;
        console.log('✅ Tipo de usuario auto-detectado:', { email: googleUser.email, detectedUserType: userType });
      }

      if (user.userType === 'AGENCY') {
        try {
          validateAgencyAccess(user, 'google_oauth');
        } catch (agencyError) {
          console.log('❌ Agency access validation failed:', agencyError.message);
          return res.redirect(`${config.urls?.frontend || 'http://localhost:5173'}?auth=error&message=${encodeURIComponent(agencyError.message)}`);
        }
      }

      const accessChecks = [
        { condition: !user.isActive, message: 'Cuenta desactivada' },
        { condition: user.isBanned, message: `Cuenta suspendida: ${user.banReason || 'Razón no especificada'}` }
      ];

      for (const check of accessChecks) {
        if (check.condition) {
          console.log('❌ User access check failed:', check.message);
          return res.redirect(`${config.urls?.frontend || 'http://localhost:5173'}?auth=error&message=${encodeURIComponent(check.message)}`);
        }
      }

      // Actualizar usuario existente
      console.log('🔍 Updating existing user...');
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: googleUser.id,
          avatar: user.avatar || googleUser.picture,
          lastLogin: new Date(),
          lastActiveAt: new Date(),
          lastLoginIP: req.ip,
          emailVerified: googleUser.email_verified || user.emailVerified
        },
        include: { escort: true, agency: true, client: true, admin: true, settings: true, reputation: true, location: true }
      });

      console.log('✅ Existing user updated successfully');

    } else {
      // Nuevo usuario
      console.log('🔍 Creating new user...');
      
      if (userType === 'AGENCY') {
        console.log('❌ Agency registration via OAuth not allowed');
        return res.redirect(`${config.urls?.frontend || 'http://localhost:5173'}?auth=error&message=${encodeURIComponent('Las agencias deben registrarse con el formulario específico que incluye documentos de verificación.')}`);
      }

      // Generar username único
      const baseUsername = (googleUser.email.split('@')[0] || googleUser.given_name || 'user').toLowerCase().replace(/[^a-z0-9]/g, '');
      let username = baseUsername;
      let counter = 1;

      console.log('🔍 Generating unique username...');
      while (await prisma.user.findUnique({ where: { username } })) {
        username = `${baseUsername}${counter}`;
        counter++;
        if (counter > 1000) { // Failsafe
          username = `user_${Date.now()}`;
          break;
        }
      }

      console.log('✅ Username generated:', username);

      // Crear nuevo usuario
      try {
        user = await prisma.user.create({
          data: {
            email: googleUser.email.toLowerCase(),
            username,
            firstName: googleUser.given_name || googleUser.name || 'Usuario',
            lastName: googleUser.family_name || '',
            avatar: googleUser.picture,
            googleId: googleUser.id,
            password: '$GOOGLE_OAUTH_NO_PASSWORD$',
            userType,
            isActive: true,
            emailVerified: googleUser.email_verified || true,
            lastLogin: new Date(),
            lastActiveAt: new Date(),
            lastLoginIP: req.ip,
            accountStatus: 'ACTIVE',
            canLogin: true,
            ...createUserTypeDefaults(userType),
            settings: {
              create: {
                emailNotifications: true,
                pushNotifications: true,
                messageNotifications: true,
                likeNotifications: true,
                boostNotifications: true,
                showOnline: true,
                showLastSeen: true,
                allowDirectMessages: true,
                showPhoneNumber: false,
                showInDiscovery: userType !== 'CLIENT',
                showInTrending: userType !== 'CLIENT',
                showInSearch: true,
                contentFilter: 'MODERATE'
              }
            },
            reputation: {
              create: {
                overallScore: 50.0,
                responseRate: 0.0,
                profileCompleteness: 25.0,
                trustScore: 25.0,
                discoveryScore: userType === 'CLIENT' ? 0.0 : 10.0,
                trendingScore: 0.0,
                qualityScore: 30.0
              }
            }
          },
          include: { escort: true, client: true, settings: true, reputation: true, location: true }
        });

        console.log('✅ New user created successfully:', {
          id: user.id,
          email: user.email,
          userType: user.userType
        });

        // Puntos de bienvenida para clientes
        if (userType === 'CLIENT' && user.client) {
          try {
            const welcomePoints = config.defaults?.client?.welcomePoints || 100;
            await prisma.pointTransaction.create({
              data: {
                clientId: user.client.id,
                amount: welcomePoints,
                type: 'REGISTRATION',
                description: 'Puntos de bienvenida por registro con Google',
                balanceBefore: 0,
                balanceAfter: welcomePoints
              }
            });
            console.log('✅ Welcome points added:', welcomePoints);
          } catch (pointsError) {
            console.log('⚠️ Welcome points failed:', pointsError.message);
          }
        }

      } catch (createError) {
        console.log('💥 User creation failed:', {
          message: createError.message,
          code: createError.code,
          meta: createError.meta
        });
        throw new Error(`Failed to create user: ${createError.message}`);
      }
    }

    // ✅ GENERAR TOKENS JWT
    console.log('🔍 Generating JWT tokens...');
    const token = generateToken(user.id);
    const refreshTokenGen = generateRefreshToken(user.id);

    // ✅ GUARDAR EN SESIÓN TEMPORAL MEJORADO
    const tempToken = crypto.randomBytes(32).toString('hex');
    
    console.log('🔍 Creating temporary session...');
    cleanupOldTokens(); // Limpiar tokens antiguos
    
    // Guardar datos de autenticación temporalmente
    global.tempAuthTokens[tempToken] = {
      token,
      refreshToken: refreshTokenGen,
      user: createUserResponse(user),
      createdAt: Date.now()
    };
    
    console.log('✅ Temporary token created:', tempToken.substring(0, 16) + '...');

    // Logging de éxito
    logger.logAuth('google_oauth', user.id, user.email, true, {
      userType: user.userType,
      verificationStatus: user.agency?.verificationStatus || null,
      accountStatus: user.accountStatus,
      autoDetectedType: req.session?.pendingUserType !== user.userType,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      tempTokenCreated: true,
      isNewUser: !user.lastLogin || user.createdAt === user.lastLogin
    });

    // Limpiar sesión
    if (req.session) {
      delete req.session.pendingUserType;
    }
    
    // ✅ REDIRECCIÓN FINAL CON MEJOR URL CONSTRUCTION
    const frontendUrl = config.urls?.frontend || 'http://localhost:5173';
    const redirectUrl = `${frontendUrl}?tempToken=${tempToken}`;
    
    console.log('✅ Redirecting to frontend:', redirectUrl.substring(0, 80) + '...');
    res.redirect(redirectUrl);

  } catch (error) {
    console.log('💥 Google OAuth callback complete error:', {
      message: error.message,
      stack: error.stack?.split('\n')[0],
      name: error.name
    });

    logger.error('💥 Error en Google OAuth callback:', { 
      error: error.message, 
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      code: code ? 'PRESENT' : 'MISSING',
      userType
    });
    
    const frontendUrl = config.urls?.frontend || 'http://localhost:5173';
    const errorMessage = encodeURIComponent(`Error en autenticación con Google: ${error.message}`);
    res.redirect(`${frontendUrl}?auth=error&message=${errorMessage}`);
  }
});

// 🔧 NUEVO ENDPOINT: Verificar token temporal
const verifyTempToken = catchAsync(async (req, res) => {
  const { tempToken } = req.params;
  
  console.log('🔍 Verifying temp token:', tempToken?.substring(0, 16) + '...');
  
  // Limpiar tokens antiguos
  cleanupOldTokens();
  
  if (!tempToken || !global.tempAuthTokens || !global.tempAuthTokens[tempToken]) {
    console.log('❌ Invalid or expired temp token');
    return res.status(404).json({
      success: false,
      message: 'Token temporal no válido o expirado',
      errorCode: 'INVALID_TEMP_TOKEN'
    });
  }
  
  const authData = global.tempAuthTokens[tempToken];
  delete global.tempAuthTokens[tempToken]; // Usar solo una vez
  
  console.log('✅ Temp token verified successfully for user:', authData.user.id);
  
  res.json({
    success: true,
    data: authData
  });
});

// 🔧 LOGOUT
const logout = catchAsync(async (req, res) => {
  await prisma.user.update({
    where: { id: req.user.id },
    data: { lastActiveAt: new Date() }
  });

  logger.logAuth('logout', req.user.id, req.user.email, true, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(200).json({
    success: true,
    message: 'Sesión cerrada exitosamente',
    timestamp: new Date().toISOString()
  });
});

// 🔧 REFRESH TOKEN
const refreshToken = catchAsync(async (req, res) => {
  const { refreshToken: token } = req.body;

  if (!token) {
    throw new AppError('Refresh token requerido', 400, 'REFRESH_TOKEN_REQUIRED');
  }

  try {
    const decoded = verifyRefreshToken(token);
    
    if (decoded.type !== 'refresh') {
      throw new AppError('Token inválido', 401, 'INVALID_REFRESH_TOKEN');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, isActive: true, isBanned: true, canLogin: true, accountStatus: true }
    });

    if (!user || !user.isActive || user.isBanned || !user.canLogin) {
      throw new AppError('Usuario no válido', 401, 'INVALID_USER');
    }

    const newToken = generateToken(user.id);
    const newRefreshToken = generateRefreshToken(user.id);

    logger.logAuth('refresh_token', user.id, user.email, true, { ip: req.ip });

    res.status(200).json({
      success: true,
      message: 'Token renovado exitosamente',
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
        expiresIn: config.auth?.tokenExpiry || '7d'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logAuth('refresh_token', null, null, false, { error: error.message, ip: req.ip });
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      throw new AppError('Refresh token inválido o expirado', 401, 'INVALID_REFRESH_TOKEN');
    }
    throw error;
  }
});

// 🔧 GET USER PROFILE
const getUserProfile = catchAsync(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: {
      escort: true, agency: true, client: true, admin: true, settings: true, reputation: true, location: true,
      posts: {
        where: { isActive: true },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, images: true, views: true, likes: true, createdAt: true }
      },
      _count: {
        select: {
          posts: { where: { isActive: true } },
          favorites: true,
          likes: true
        }
      }
    }
  });

  if (!user) {
    throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    data: { ...createUserResponse(user), posts: user.posts, stats: user._count },
    timestamp: new Date().toISOString()
  });
});

// 🔧 FORGOT PASSWORD
const forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  const successResponse = {
    success: true,
    message: 'Si el email existe, se ha enviado un enlace de restablecimiento',
    timestamp: new Date().toISOString()
  };

  if (!user) {
    logger.logAuth('forgot_password', null, email, false, { reason: 'email_not_found', ip: req.ip });
    return res.status(200).json(successResponse);
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenExpiry = new Date(Date.now() + (config.auth?.passwordResetExpiry || 3600000));

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordResetToken: resetToken, passwordResetExpiry: resetTokenExpiry }
  });

  try {
    const emailSent = await sendPasswordResetEmail(user, resetToken);
    if (!emailSent && config.environment?.isDevelopment) {
      return res.status(500).json({
        success: false,
        message: 'Error enviando email de restablecimiento',
        error: 'EMAIL_SEND_FAILED',
        debug: {
          emailConfigured: !!process.env.EMAIL_USER && !!process.env.EMAIL_PASS,
          userFound: true,
          tokenGenerated: true
        },
        timestamp: new Date().toISOString()
      });
    }
  } catch (emailError) {
    if (config.environment?.isDevelopment) {
      return res.status(500).json({
        success: false,
        message: 'Error enviando email de restablecimiento',
        error: emailError.message,
        code: emailError.code,
        debug: {
          emailConfigured: !!process.env.EMAIL_USER && !!process.env.EMAIL_PASS,
          userFound: true,
          tokenGenerated: true,
          errorType: emailError.code || 'UNKNOWN'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  logger.logAuth('forgot_password', user.id, email, true, { ip: req.ip });
  res.status(200).json(successResponse);
});

// 🔧 RESET PASSWORD
const resetPassword = catchAsync(async (req, res) => {
  const { token, password } = req.body;

  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetExpiry: { gt: new Date() }
    }
  });

  if (!user) {
    throw new AppError('Token de restablecimiento inválido o expirado', 400, 'INVALID_RESET_TOKEN');
  }

  const hashedPassword = await validateConfigAndHashPassword(password);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpiry: null,
      updatedAt: new Date()
    }
  });

  logger.logAuth('reset_password', user.id, user.email, true, { ip: req.ip });

  res.status(200).json({
    success: true,
    message: 'Contraseña restablecida exitosamente',
    timestamp: new Date().toISOString()
  });
});

// 🔧 VERIFY EMAIL
const verifyEmail = catchAsync(async (req, res) => {
  const { token } = req.body;

  const user = await prisma.user.findFirst({
    where: { emailVerificationToken: token, emailVerified: false }
  });

  if (!user) {
    throw new AppError('Token de verificación inválido', 400, 'INVALID_VERIFICATION_TOKEN');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerificationToken: null,
      emailVerifiedAt: new Date()
    }
  });

  logger.logAuth('verify_email', user.id, user.email, true);

  res.status(200).json({
    success: true,
    message: 'Email verificado exitosamente',
    timestamp: new Date().toISOString()
  });
});

// 🔧 RESEND VERIFICATION
const resendVerification = catchAsync(async (req, res) => {
  const user = req.user;

  if (user.emailVerified) {
    throw new AppError('El email ya está verificado', 400, 'EMAIL_ALREADY_VERIFIED');
  }

  const verificationToken = crypto.randomBytes(32).toString('hex');

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerificationToken: verificationToken }
  });

  res.status(200).json({
    success: true,
    message: 'Email de verificación reenviado',
    timestamp: new Date().toISOString()
  });
});

// 🔧 CHANGE PASSWORD
const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = req.user;

  if (!(await bcrypt.compare(currentPassword, user.password))) {
    logger.logAuth('change_password', user.id, user.email, false, {
      reason: 'invalid_current_password',
      ip: req.ip
    });
    throw new AppError('Contraseña actual incorrecta', 400, 'INVALID_CURRENT_PASSWORD');
  }

  if (await bcrypt.compare(newPassword, user.password)) {
    throw new AppError('La nueva contraseña debe ser diferente a la actual', 400, 'SAME_PASSWORD');
  }

  const hashedNewPassword = await validateConfigAndHashPassword(newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedNewPassword, updatedAt: new Date() }
  });

  logger.logAuth('change_password', user.id, user.email, true, { ip: req.ip });

  res.status(200).json({
    success: true,
    message: 'Contraseña cambiada exitosamente',
    timestamp: new Date().toISOString()
  });
});

// 🔧 TEST EMAIL
const testEmail = catchAsync(async (req, res) => {
  if (config.environment?.isProduction) {
    throw new AppError('Endpoint de prueba no disponible en producción', 403, 'TEST_DISABLED');
  }

  const { email, type } = req.body;
  if (!email) throw new AppError('Email es requerido', 400, 'EMAIL_REQUIRED');

  const testUser = {
    id: 'test-user-id',
    firstName: 'Usuario',
    lastName: 'Prueba',
    email: email,
    userType: 'CLIENT'
  };

  const testToken = 'test-token-123456789';
  const emailTypes = {
    reset: () => sendPasswordResetEmail(testUser, testToken),
    welcome: () => sendWelcomeEmail(testUser),
    verification: () => require('../services/authService').sendVerificationEmail(testUser, testToken),
    agency_pending: () => sendAgencyPendingEmail(testUser, {
      companyName: 'Agencia de Prueba',
      businessLicense: 'TEST-123',
      contactPerson: 'Juan Pérez',
      address: 'Calle Test 123'
    })
  };

  if (!emailTypes[type]) {
    throw new AppError('Tipo de email no válido. Usa: reset, welcome, verification, agency_pending', 400, 'INVALID_TYPE');
  }

  try {
    const result = await emailTypes[type]();
    const emailTypeNames = {
      reset: 'restablecimiento de contraseña',
      welcome: 'bienvenida',
      verification: 'verificación',
      agency_pending: 'solicitud de agencia pendiente'
    };

    if (result) {
      res.status(200).json({
        success: true,
        message: `Email de ${emailTypeNames[type]} enviado exitosamente`,
        data: {
          emailType: emailTypeNames[type],
          recipient: email,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      throw new AppError(`Error enviando email de ${emailTypeNames[type]}`, 500, 'EMAIL_SEND_ERROR');
    }
  } catch (error) {
    logger.error('❌ Error en prueba de email:', { error: error.message, type, email });
    throw error;
  }
});

module.exports = {
  register,
  registerAgency,
  login,
  logout,
  refreshToken,
  getUserProfile,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  changePassword,
  googleAuth,
  googleCallback,
  verifyTempToken,
  testEmail
};