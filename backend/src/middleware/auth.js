const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');
const logger = require('../utils/logger');
// ====================================================================
// Middleware de auth
// ====================================================================
// ====================================================================
// 🚨 CUSTOM ERROR CLASS - INTEGRADA
// ====================================================================
class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    
    this.statusCode = statusCode;
    this.code = code;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// ====================================================================
// 🔐 MIDDLEWARES DE AUTENTICACIÓN
// ====================================================================

// Middleware principal de autenticación CON DEBUG
const authenticate = async (req, res, next) => {
  try {
    // ✅ AGREGAR DEBUG AQUÍ - AL INICIO
    console.log('🔍 === AUTH MIDDLEWARE DEBUG ===');
    console.log('🔍 Request details:', {
      method: req.method,
      url: req.url,
      query: req.query,
      tabType: req.query.tabType || 'N/A'
    });
    
    console.log('🔍 Headers:', {
      authorization: req.headers.authorization ? 'EXISTS' : 'MISSING',
      authLength: req.headers.authorization?.length || 0,
      authPreview: req.headers.authorization ? req.headers.authorization.substring(0, 20) + '...' : 'NONE',
      contentType: req.headers['content-type'],
      userAgent: req.headers['user-agent']?.substring(0, 50) + '...'
    });

    let token;

    // Extraer token del header Authorization
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('✅ Token extracted from Bearer header');
    }
    // También verificar en x-access-token para compatibilidad
    else if (req.headers['x-access-token']) {
      token = req.headers['x-access-token'];
      console.log('✅ Token extracted from x-access-token header');
    }

    if (!token) {
      console.log('❌ NO TOKEN FOUND - Returning 401');
      return next(new AppError('Token de acceso requerido', 401, 'NO_TOKEN'));
    }

    console.log('🔍 Token preview:', token.substring(0, 30) + '...');

    // ✅ AGREGAR DEBUG PARA JWT DECODE
    try {
      // Primero intentar decode sin verificar (para debug)
      const decodedPreview = jwt.decode(token);
      console.log('🔍 Token decoded (no verification):', {
        userId: decodedPreview?.userId,
        exp: decodedPreview?.exp ? new Date(decodedPreview.exp * 1000) : 'NO_EXP',
        iat: decodedPreview?.iat ? new Date(decodedPreview.iat * 1000) : 'NO_IAT',
        isExpired: decodedPreview?.exp ? Date.now() > (decodedPreview.exp * 1000) : 'UNKNOWN'
      });
    } catch (decodeError) {
      console.log('❌ Token decode preview failed:', decodeError.message);
    }

    // Verificar token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token verified successfully:', {
      userId: decoded.userId,
      tokenAge: Date.now() - (decoded.iat * 1000),
      expiresIn: (decoded.exp * 1000) - Date.now()
    });

    // Buscar usuario actual con todas las relaciones necesarias
    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        escort: true,
        agency: true,
        client: true,
        admin: true,
        settings: true,
        location: true
      }
    });

    if (!currentUser) {
      console.log('❌ USER NOT FOUND in database for userId:', decoded.userId);
      return next(new AppError('El usuario del token ya no existe', 401, 'USER_NOT_FOUND'));
    }

    console.log('✅ User found in database:', {
      id: currentUser.id,
      userType: currentUser.userType,
      isActive: currentUser.isActive,
      isBanned: currentUser.isBanned,
      hasClient: !!currentUser.client,
      clientIsPremium: currentUser.client?.isPremium || false
    });

    // ✅ DEBUG ESPECÍFICO PARA CLIENTE PREMIUM
    if (currentUser.userType === 'CLIENT') {
      console.log('🔍 CLIENT DEBUG:', {
        clientData: !!currentUser.client,
        isPremium: currentUser.client?.isPremium,
        premiumUntil: currentUser.client?.premiumUntil,
        premiumTier: currentUser.client?.premiumTier,
        directIsPremium: currentUser.isPremium
      });

      // ✅ VERIFICAR SI EL PREMIUM EXPIRÓ
      if (currentUser.client?.isPremium && currentUser.client?.premiumUntil) {
        const now = new Date();
        const premiumExpiry = new Date(currentUser.client.premiumUntil);
        const isExpired = now > premiumExpiry;
        
        console.log('🔍 PREMIUM EXPIRY CHECK:', {
          now: now.toISOString(),
          premiumUntil: premiumExpiry.toISOString(),
          isExpired,
          daysLeft: isExpired ? 0 : Math.ceil((premiumExpiry - now) / (1000 * 60 * 60 * 24))
        });

        if (isExpired) {
          console.log('⚠️ Premium expired, updating user...');
          // Actualizar en la base de datos
          await prisma.client.update({
            where: { id: currentUser.client.id },
            data: {
              isPremium: false,
              premiumTier: 'BASIC',
              premiumUntil: null
            }
          });
          
          // Actualizar el objeto en memoria
          currentUser.client.isPremium = false;
          currentUser.client.premiumTier = 'BASIC';
          currentUser.client.premiumUntil = null;
          
          console.log('✅ Premium status updated to false');
        }
      }
    }

    // Verificar si el usuario está activo
    if (!currentUser.isActive) {
      console.log('❌ USER INACTIVE:', currentUser.id);
      return next(new AppError('Cuenta desactivada', 401, 'ACCOUNT_INACTIVE'));
    }

    // Verificar si el usuario está baneado
    if (currentUser.isBanned) {
      console.log('❌ USER BANNED:', currentUser.id);
      return next(new AppError('Cuenta suspendida', 403, 'ACCOUNT_BANNED'));
    }

    // Verificar si la contraseña cambió después de la emisión del token
    const tokenIssuedAt = new Date(decoded.iat * 1000);
    if (currentUser.updatedAt && currentUser.updatedAt > tokenIssuedAt) {
      console.log('⚠️ Token issued before user update:', {
        tokenIssuedAt,
        userUpdatedAt: currentUser.updatedAt
      });
    }

    // Agregar usuario a la request
    req.user = currentUser;

    console.log('✅ AUTH SUCCESS - User added to request:', {
      userId: currentUser.id,
      userType: currentUser.userType,
      isPremium: currentUser.client?.isPremium || false
    });

    // Log de autenticación exitosa
    if (logger.logAuth && typeof logger.logAuth === 'function') {
      logger.logAuth('token_verification', currentUser.id, currentUser.email, true, {
        userType: currentUser.userType,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    } else {
      logger.info('✅ Auth token_verification: ' + currentUser.id);
    }

    // Actualizar última actividad
    try {
      await prisma.user.update({
        where: { id: currentUser.id },
        data: { lastActiveAt: new Date() }
      });
    } catch (updateError) {
      console.warn('Warning: Could not update user activity:', updateError.message);
    }

    console.log('🔍 === AUTH MIDDLEWARE COMPLETED SUCCESSFULLY ===');
    next();
  } catch (error) {
    console.log('❌ === AUTH MIDDLEWARE ERROR ===');
    console.log('❌ Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n')[0]
    });

    // Log de error de autenticación
    if (logger.logAuth && typeof logger.logAuth === 'function') {
      logger.logAuth('token_verification', null, null, false, {
        error: error.message,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    } else {
      logger.error('❌ Auth error:', error.message);
    }

    if (error.name === 'JsonWebTokenError') {
      console.log('❌ JWT Error: Invalid token');
      return next(new AppError('Token inválido', 401, 'INVALID_TOKEN'));
    } else if (error.name === 'TokenExpiredError') {
      console.log('❌ JWT Error: Token expired');
      return next(new AppError('Token expirado', 401, 'TOKEN_EXPIRED'));
    }
    
    console.log('❌ Generic auth error');
    return next(new AppError('Error de autenticación', 401, 'AUTH_ERROR'));
  }
};

// ✅ NUEVO: Middleware para autenticación OPCIONAL - NO bloquea si no hay token
const authenticateOptional = async (req, res, next) => {
  try {
    console.log('🔍 === OPTIONAL AUTH MIDDLEWARE DEBUG ===');
    console.log('🔍 Request details:', {
      method: req.method,
      url: req.url,
      query: req.query,
      tabType: req.query.tabType || 'N/A'
    });
    
    let token;

    // Extraer token del header Authorization
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('✅ Optional Auth: Token found in Bearer header');
    }
    // También verificar en x-access-token para compatibilidad
    else if (req.headers['x-access-token']) {
      token = req.headers['x-access-token'];
      console.log('✅ Optional Auth: Token found in x-access-token header');
    }

    if (!token) {
      console.log('ℹ️ Optional Auth: No token found - continuing as anonymous user');
      req.user = null; // ✅ Usuario no autenticado pero permitido
      return next();
    }

    console.log('🔍 Optional Auth: Token preview:', token.substring(0, 30) + '...');

    // Verificar token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Optional Auth: Token verified successfully:', {
      userId: decoded.userId,
      tokenAge: Date.now() - (decoded.iat * 1000),
      expiresIn: (decoded.exp * 1000) - Date.now()
    });

    // Buscar usuario actual con todas las relaciones necesarias
    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        escort: true,
        agency: true,
        client: true,
        admin: true,
        settings: true,
        location: true
      }
    });

    if (!currentUser) {
      console.log('⚠️ Optional Auth: User not found in database, continuing as anonymous');
      req.user = null;
      return next();
    }

    console.log('✅ Optional Auth: User found in database:', {
      id: currentUser.id,
      userType: currentUser.userType,
      isActive: currentUser.isActive,
      isBanned: currentUser.isBanned
    });

    // ✅ VERIFICAR ESTADO DEL USUARIO
    if (!currentUser.isActive || currentUser.isBanned) {
      console.log('⚠️ Optional Auth: User inactive/banned, continuing as anonymous');
      req.user = null;
      return next();
    }

    // ✅ DEBUG ESPECÍFICO PARA CLIENTE PREMIUM
    if (currentUser.userType === 'CLIENT') {
      console.log('🔍 Optional Auth CLIENT DEBUG:', {
        clientData: !!currentUser.client,
        isPremium: currentUser.client?.isPremium,
        premiumUntil: currentUser.client?.premiumUntil,
        premiumTier: currentUser.client?.premiumTier
      });

      // ✅ VERIFICAR SI EL PREMIUM EXPIRÓ
      if (currentUser.client?.isPremium && currentUser.client?.premiumUntil) {
        const now = new Date();
        const premiumExpiry = new Date(currentUser.client.premiumUntil);
        const isExpired = now > premiumExpiry;
        
        if (isExpired) {
          console.log('⚠️ Optional Auth: Premium expired, updating user...');
          // Actualizar en la base de datos
          await prisma.client.update({
            where: { id: currentUser.client.id },
            data: {
              isPremium: false,
              premiumTier: 'BASIC',
              premiumUntil: null
            }
          });
          
          // Actualizar el objeto en memoria
          currentUser.client.isPremium = false;
          currentUser.client.premiumTier = 'BASIC';
          currentUser.client.premiumUntil = null;
          
          console.log('✅ Optional Auth: Premium status updated to false');
        }
      }
    }

    // Agregar usuario a la request
    req.user = currentUser;

    console.log('✅ Optional Auth SUCCESS - User added to request:', {
      userId: currentUser.id,
      userType: currentUser.userType,
      isPremium: currentUser.client?.isPremium || false
    });

    // Actualizar última actividad (silencioso)
    try {
      await prisma.user.update({
        where: { id: currentUser.id },
        data: { lastActiveAt: new Date() }
      });
    } catch (updateError) {
      // Silenciar errores en auth opcional
    }

    console.log('🔍 === OPTIONAL AUTH MIDDLEWARE COMPLETED SUCCESSFULLY ===');
    next();
  } catch (error) {
    console.log('⚠️ === OPTIONAL AUTH MIDDLEWARE ERROR ===');
    console.log('⚠️ Optional Auth Error details:', {
      name: error.name,
      message: error.message
    });

    // ✅ EN AUTENTICACIÓN OPCIONAL, LOS ERRORES NO DETIENEN LA EJECUCIÓN
    console.log('ℹ️ Optional Auth: Error occurred, continuing as anonymous user');
    req.user = null;
    next();
  }
};

// Middleware para verificar tipos de usuario específicos
const requireUserType = (...allowedTypes) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Usuario no autenticado', 401, 'NOT_AUTHENTICATED'));
    }

    if (!allowedTypes.includes(req.user.userType)) {
      if (logger.logSecurity && typeof logger.logSecurity === 'function') {
        logger.logSecurity('unauthorized_access_attempt', 'medium', {
          userId: req.user.id,
          userType: req.user.userType,
          requiredTypes: allowedTypes,
          endpoint: req.originalUrl,
          method: req.method,
          ip: req.ip
        });
      } else {
        logger.warn('Unauthorized access attempt', {
          userId: req.user.id,
          userType: req.user.userType,
          requiredTypes: allowedTypes
        });
      }

      return next(new AppError('Permisos insuficientes', 403, 'INSUFFICIENT_PERMISSIONS'));
    }

    next();
  };
};

// ✅ Middleware requireRole que faltaba
const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Usuario no autenticado', 401, 'NOT_AUTHENTICATED'));
    }

    // Verificar si es ADMIN
    if (role === 'ADMIN') {
      if (req.user.userType !== 'ADMIN') {
        if (logger.logSecurity && typeof logger.logSecurity === 'function') {
          logger.logSecurity('unauthorized_admin_access', 'high', {
            userId: req.user.id,
            userType: req.user.userType,
            attemptedRoute: req.originalUrl,
            ip: req.ip,
            userAgent: req.get('User-Agent')
          });
        } else {
          logger.warn('Unauthorized admin access attempt', {
            userId: req.user.id,
            userType: req.user.userType
          });
        }

        return next(new AppError('Se requieren permisos de administrador', 403, 'ADMIN_REQUIRED'));
      }

      // Verificar que el usuario no esté baneado
      if (req.user.isBanned) {
        return next(new AppError('Cuenta de administrador suspendida', 403, 'ADMIN_BANNED'));
      }

      return next();
    }

    // Para otros roles, usar requireUserType
    return requireUserType(role)(req, res, next);
  };
};

// ====================================================================
// 🛡️ MIDDLEWARES DE ADMINISTRACIÓN - CORREGIDOS
// ====================================================================

// ✅ Middleware principal para verificar que el usuario es administrador - COMPLETAMENTE CORREGIDO
const requireAdmin = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      throw new AppError('Usuario no autenticado', 401, 'UNAUTHORIZED');
    }

    // ✅ VERIFICACIÓN PRINCIPAL: userType debe ser ADMIN
    if (user.userType !== 'ADMIN') {
      if (logger.logSecurity && typeof logger.logSecurity === 'function') {
        logger.logSecurity('unauthorized_admin_access', 'high', {
          userId: user.id,
          userType: user.userType,
          attemptedRoute: req.originalUrl,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
      } else {
        logger.warn('Unauthorized admin access attempt', {
          userId: user.id,
          userType: user.userType
        });
      }

      throw new AppError('Se requieren permisos de administrador', 403, 'ADMIN_REQUIRED');
    }

    // Verificar que el usuario no esté baneado
    if (user.isBanned) {
      throw new AppError('Cuenta de administrador suspendida', 403, 'ADMIN_BANNED');
    }

    // ✅ CORREGIDO: Obtener datos del admin CON LOS CAMPOS CORRECTOS DEL SCHEMA
    try {
      const adminData = await prisma.admin.findUnique({
        where: { userId: user.id },
        select: {
          id: true,
          role: true,
          permissions: true,
          // ❌ REMOVIDO: isActive - Este campo no existe en el schema
          // ❌ REMOVIDO: lastActiveAt - Este campo no existe en el schema
          totalBans: true,
          totalReports: true,
          totalVerifications: true,
          totalAgencyApprovals: true,
          canDeletePosts: true,
          canBanUsers: true,
          canModifyPrices: true,
          canAccessMetrics: true,
          canApproveAgencies: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (adminData) {
        // ✅ CORREGIDO: Sin verificación de isActive ya que no existe
        // Agregar datos de admin al request
        req.user.admin = adminData;

        // ✅ CORREGIDO: Sin actualización de lastActiveAt ya que no existe en Admin
        // Solo actualizamos la actividad del User, no del Admin
      } else {
        // ✅ COMPORTAMIENTO MEJORADO: Si no existe registro admin, crear uno básico
        console.log(`⚠️ Admin record not found for user ${user.id}, creating basic admin record`);
        
        const newAdminData = await prisma.admin.create({
          data: {
            userId: user.id,
            role: 'ADMIN',
            permissions: ['manage_users', 'view_metrics', 'moderate_content'],
            // ❌ REMOVIDO: isActive - No existe en schema
            // ❌ REMOVIDO: lastActiveAt - No existe en schema
            totalBans: 0,
            totalReports: 0,
            totalVerifications: 0,
            totalAgencyApprovals: 0,
            canDeletePosts: false,
            canBanUsers: false,
            canModifyPrices: false,
            canAccessMetrics: true,
            canApproveAgencies: true
          }
        });

        req.user.admin = newAdminData;
        
        logger.info('Admin record created for existing admin user', {
          userId: user.id,
          adminId: newAdminData.id
        });
      }
    } catch (adminError) {
      // ✅ MANEJO GRACEFUL: Si hay error con la tabla admin, continuar sin bloquear
      console.error('💥 Prisma Error:', adminError.message);
      console.warn('Warning: Admin table access failed, continuing with basic admin permissions:', adminError.message);
      
      // Crear objeto admin básico temporal
      req.user.admin = {
        id: 'temp-admin',
        role: 'ADMIN',
        permissions: ['manage_users', 'view_metrics', 'moderate_content'],
        totalBans: 0,
        totalReports: 0,
        totalVerifications: 0,
        totalAgencyApprovals: 0,
        canDeletePosts: false,
        canBanUsers: false,
        canModifyPrices: false,
        canAccessMetrics: true,
        canApproveAgencies: true
      };
    }

    // Log de acceso exitoso para auditoría
    logger.info('Admin access granted', {
      adminId: user.id,
      adminRole: req.user.admin?.role || 'ADMIN',
      route: req.originalUrl,
      method: req.method,
      ip: req.ip
    });

    next();
  } catch (error) {
    next(error);
  }
};

// ✅ Middleware para verificar permisos específicos de administrador - CORREGIDO
const requireAdminPermission = (permission) => {
  return async (req, res, next) => {
    try {
      const admin = req.user.admin;

      if (!admin) {
        throw new AppError('Datos de administrador no encontrados', 403, 'ADMIN_DATA_MISSING');
      }

      // Super admin tiene todos los permisos
      if (admin.role === 'SUPER_ADMIN') {
        return next();
      }

      // Verificar permisos específicos
      const permissions = admin.permissions || [];
      
      if (!permissions.includes(permission)) {
        if (logger.logSecurity && typeof logger.logSecurity === 'function') {
          logger.logSecurity('insufficient_admin_permissions', 'medium', {
            adminId: req.user.id,
            adminRole: admin.role,
            requiredPermission: permission,
            currentPermissions: permissions,
            route: req.originalUrl
          });
        }

        throw new AppError(`Se requiere el permiso: ${permission}`, 403, 'INSUFFICIENT_PERMISSIONS');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// ✅ Middleware para verificar que es super admin
const requireSuperAdmin = async (req, res, next) => {
  try {
    const admin = req.user.admin;

    if (!admin || admin.role !== 'SUPER_ADMIN') {
      if (logger.logSecurity && typeof logger.logSecurity === 'function') {
        logger.logSecurity('unauthorized_super_admin_access', 'critical', {
          adminId: req.user.id,
          adminRole: admin?.role || 'unknown',
          route: req.originalUrl,
          ip: req.ip
        });
      }

      throw new AppError('Se requieren permisos de super administrador', 403, 'SUPER_ADMIN_REQUIRED');
    }

    next();
  } catch (error) {
    next(error);
  }
};

// ✅ Middleware para logging de actividad administrativa
const logAdminActivity = (action) => {
  return (req, res, next) => {
    // Interceptar la respuesta para hacer log después
    const originalSend = res.send;
    
    res.send = function(data) {
      // Solo hacer log si la respuesta es exitosa
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          // ✅ LOGGING MEJORADO: Usar console.log si logger.logAdmin no existe
          if (logger.logAdmin && typeof logger.logAdmin === 'function') {
            logger.logAdmin(action, 'info', {
              adminId: req.user.id,
              adminRole: req.user.admin?.role,
              route: req.originalUrl,
              method: req.method,
              ip: req.ip,
              userAgent: req.get('User-Agent'),
              requestBody: req.method !== 'GET' ? req.body : undefined,
              timestamp: new Date().toISOString()
            });
          } else {
            // Fallback logging
            logger.info(`Admin Activity: ${action}`, {
              adminId: req.user.id,
              adminRole: req.user.admin?.role,
              route: req.originalUrl,
              method: req.method,
              ip: req.ip,
              timestamp: new Date().toISOString()
            });
          }
        } catch (logError) {
          console.warn('Warning: Admin activity logging failed:', logError.message);
        }
      }
      
      originalSend.call(this, data);
    };

    next();
  };
};

// ✅ Middleware para verificar límites de acciones por admin
const checkAdminRateLimit = (maxActionsPerHour = 100) => {
  const adminActions = new Map(); // En producción, usar Redis
  
  return async (req, res, next) => {
    try {
      const adminId = req.user.id;
      const now = Date.now();
      const hourAgo = now - (60 * 60 * 1000);
      
      // Obtener acciones del admin en la última hora
      let actions = adminActions.get(adminId) || [];
      actions = actions.filter(timestamp => timestamp > hourAgo);
      
      if (actions.length >= maxActionsPerHour) {
        if (logger.logSecurity && typeof logger.logSecurity === 'function') {
          logger.logSecurity('admin_rate_limit_exceeded', 'high', {
            adminId,
            actionsInLastHour: actions.length,
            maxAllowed: maxActionsPerHour,
            route: req.originalUrl
          });
        }
        
        throw new AppError('Límite de acciones por hora excedido', 429, 'RATE_LIMIT_EXCEEDED');
      }
      
      // Agregar acción actual
      actions.push(now);
      adminActions.set(adminId, actions);
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

// ✅ Middleware para validar IP de admin (opcional)
const validateAdminIP = (allowedIPs = []) => {
  return (req, res, next) => {
    if (allowedIPs.length === 0) {
      return next(); // Si no hay IPs configuradas, permitir todas
    }
    
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (!allowedIPs.includes(clientIP)) {
      if (logger.logSecurity && typeof logger.logSecurity === 'function') {
        logger.logSecurity('admin_access_from_unauthorized_ip', 'critical', {
          adminId: req.user.id,
          unauthorizedIP: clientIP,
          allowedIPs,
          route: req.originalUrl
        });
      }
      
      throw new AppError('Acceso no autorizado desde esta IP', 403, 'UNAUTHORIZED_IP');
    }
    
    next();
  };
};

// ✅ Middleware para verificar horario de administración
const checkAdminSchedule = (allowedHours = { start: 0, end: 23 }) => {
  return (req, res, next) => {
    const currentHour = new Date().getHours();
    
    if (currentHour < allowedHours.start || currentHour > allowedHours.end) {
      if (logger.logSecurity && typeof logger.logSecurity === 'function') {
        logger.logSecurity('admin_access_outside_hours', 'medium', {
          adminId: req.user.id,
          currentHour,
          allowedHours,
          route: req.originalUrl
        });
      }
      
      throw new AppError('Acceso de administrador no permitido en este horario', 403, 'OUTSIDE_ADMIN_HOURS');
    }
    
    next();
  };
};

// ✅ MIDDLEWARE COMPUESTO: Verificación completa de admin
const fullAdminVerification = (options = {}) => {
  const {
    requirePermission = null,
    maxActionsPerHour = 100,
    allowedIPs = [],
    allowedHours = { start: 0, end: 23 },
    enableRateLimit = false,
    enableIPValidation = false,
    enableScheduleCheck = false
  } = options;
  
  const middlewares = [requireAdmin];
  
  if (enableIPValidation && allowedIPs.length > 0) {
    middlewares.push(validateAdminIP(allowedIPs));
  }
  
  if (enableScheduleCheck) {
    middlewares.push(checkAdminSchedule(allowedHours));
  }
  
  if (enableRateLimit) {
    middlewares.push(checkAdminRateLimit(maxActionsPerHour));
  }
  
  if (requirePermission) {
    middlewares.push(requireAdminPermission(requirePermission));
  }
  
  return middlewares;
};

// ====================================================================
// 🔧 MIDDLEWARES ORIGINALES MANTENIDOS
// ====================================================================

// Middleware para verificar si es escort
const requireEscort = requireUserType('ESCORT');

// Middleware para verificar si es agencia
const requireAgency = requireUserType('AGENCY');

// Middleware para verificar si es cliente
const requireClient = requireUserType('CLIENT');

// Middleware para verificar si es escort o agencia
const requireEscortOrAgency = requireUserType('ESCORT', 'AGENCY');

// Middleware para verificar propiedad de recursos
const requireOwnership = (resourceIdParam = 'id', resourceModel = null) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[resourceIdParam];
      const userId = req.user.id;

      if (!resourceId) {
        return next(new AppError('ID de recurso requerido', 400, 'RESOURCE_ID_REQUIRED'));
      }

      // Si no se especifica modelo, asumir que el recurso tiene authorId
      if (!resourceModel) {
        // Para posts, mensajes, etc. que tienen authorId
        const modelName = req.route.path.split('/')[1];
        const resource = await prisma[modelName].findUnique({
          where: { id: resourceId },
          select: { authorId: true }
        });

        if (!resource) {
          return next(new AppError('Recurso no encontrado', 404, 'RESOURCE_NOT_FOUND'));
        }

        if (resource.authorId !== userId && req.user.userType !== 'ADMIN') {
          return next(new AppError('No tienes permisos para este recurso', 403, 'RESOURCE_FORBIDDEN'));
        }
      } else {
        // Para modelos específicos
        let whereClause = { id: resourceId };
        
        // Determinar el campo de propiedad según el modelo
        switch (resourceModel) {
          case 'user':
            whereClause = { id: resourceId };
            break;
          case 'post':
            whereClause = { id: resourceId, authorId: userId };
            break;
          case 'message':
            whereClause = { id: resourceId, senderId: userId };
            break;
          default:
            whereClause = { id: resourceId, userId: userId };
        }

        const resource = await prisma[resourceModel].findFirst({
          where: whereClause
        });

        if (!resource && req.user.userType !== 'ADMIN') {
          return next(new AppError('Recurso no encontrado o sin permisos', 404, 'RESOURCE_NOT_FOUND'));
        }
      }

      next();
    } catch (error) {
      logger.error('Error verificando propiedad:', error);
      next(new AppError('Error verificando permisos', 500, 'PERMISSION_CHECK_ERROR'));
    }
  };
};

// ✅ MANTENIDO: Middleware para autenticación opcional original (duplicado pero mantenido por compatibilidad)
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.headers['x-access-token']) {
      token = req.headers['x-access-token'];
    }

    if (!token) {
      return next(); // Continuar sin autenticación
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        escort: true,
        agency: true,
        client: true,
        admin: true
      }
    });

    if (currentUser && currentUser.isActive && !currentUser.isBanned) {
      req.user = currentUser;
      
      // Actualizar última actividad
      try {
        await prisma.user.update({
          where: { id: currentUser.id },
          data: { lastActiveAt: new Date() }
        });
      } catch (updateError) {
        // Silenciar errores de actualización en auth opcional
      }
    }

    next();
  } catch (error) {
    // En autenticación opcional, los errores no detienen la ejecución
    next();
  }
};

// Middleware para verificar límites de cliente
const checkClientLimits = async (req, res, next) => {
  try {
    if (req.user.userType !== 'CLIENT') {
      return next(); // Solo aplica a clientes
    }

    const client = req.user.client;
    if (!client) {
      return next(new AppError('Datos de cliente no encontrados', 400, 'CLIENT_DATA_NOT_FOUND'));
    }

    // Verificar si es premium y no ha expirado
    if (client.isPremium && client.premiumUntil && new Date() > client.premiumUntil) {
      await prisma.client.update({
        where: { id: client.id },
        data: {
          isPremium: false,
          premiumTier: 'BASIC',
          premiumUntil: null
        }
      });
      
      // Actualizar datos en req.user
      req.user.client.isPremium = false;
      req.user.client.premiumTier = 'BASIC';
    }

    // Verificar límites según el tier
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Resetear contador diario si es necesario
    if (client.lastMessageReset < today) {
      await prisma.client.update({
        where: { id: client.id },
        data: {
          messagesUsedToday: 0,
          lastMessageReset: today
        }
      });
      req.user.client.messagesUsedToday = 0;
    }

    req.clientLimits = {
      dailyMessageLimit: client.dailyMessageLimit,
      messagesUsedToday: client.messagesUsedToday,
      canViewPhoneNumbers: client.canViewPhoneNumbers,
      canSendImages: client.canSendImages,
      canSendVoiceMessages: client.canSendVoiceMessages,
      canAccessPremiumProfiles: client.canAccessPremiumProfiles,
      canSeeOnlineStatus: client.canSeeOnlineStatus
    };

    next();
  } catch (error) {
    logger.error('Error verificando límites de cliente:', error);
    next(new AppError('Error verificando límites', 500, 'LIMIT_CHECK_ERROR'));
  }
};

// ====================================================================
// 🔧 FUNCIONES HELPER Y UTILIDADES
// ====================================================================

// Función para generar token JWT
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Función para generar refresh token
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// Función para verificar refresh token
const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
};

// ✅ FUNCIONES HELPER PARA ADMINISTRACIÓN - CORREGIDAS

// Función helper para verificar si el usuario es admin
const isAdmin = (user) => {
  return user && user.userType === 'ADMIN';
};

// Función helper para verificar si el usuario puede acceder a rutas admin
const canAccessAdmin = (user) => {
  if (!user) return false;
  if (user.userType !== 'ADMIN') return false;
  if (user.isBanned) return false;
  if (!user.isActive) return false;
  return true;
};

// ✅ Función helper para verificar si el usuario puede realizar una acción específica
const canPerformAction = (user, action) => {
  if (!user || user.userType !== 'ADMIN') {
    return false;
  }
  
  const admin = user.admin;
  if (!admin) {
    return true; // Si no hay datos admin, permitir (admin básico)
  }
  
  if (admin.role === 'SUPER_ADMIN') {
    return true; // Super admin puede hacer todo
  }
  
  const permissions = admin.permissions || [];
  const actionPermissions = {
    'view_metrics': ['view_metrics', 'manage_users'],
    'view_users': ['manage_users', 'view_users'],
    'ban_user': ['manage_users', 'moderate_content'],
    'unban_user': ['manage_users', 'moderate_content'],
    'resolve_report': ['moderate_content', 'manage_users'],
    'update_settings': ['manage_settings', 'super_admin']
  };
  
  const requiredPermissions = actionPermissions[action] || [];
  return requiredPermissions.some(perm => permissions.includes(perm));
};

// ✅ Función helper para obtener nivel de acceso del admin
const getAdminAccessLevel = (user) => {
  if (!user || user.userType !== 'ADMIN') {
    return 'none';
  }
  
  const admin = user.admin;
  if (!admin) {
    return 'basic';
  }
  
  switch (admin.role) {
    case 'SUPER_ADMIN':
      return 'super';
    case 'MODERATOR':
      return 'moderator';
    case 'ADMIN':
    default:
      return 'admin';
  }
};

// ✅ Función helper para formatear datos de admin para logs - CORREGIDA
const formatAdminForLog = (user) => {
  if (!user) return { id: 'unknown', role: 'none' };
  
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    userType: user.userType,
    adminRole: user.admin?.role || 'ADMIN',
    permissions: user.admin?.permissions || [],
    // ❌ REMOVIDO: lastActiveAt - No existe en modelo Admin
    totalActions: {
      bans: user.admin?.totalBans || 0,
      reports: user.admin?.totalReports || 0,
      verifications: user.admin?.totalVerifications || 0,
      agencyApprovals: user.admin?.totalAgencyApprovals || 0
    }
  };
};

module.exports = {
  // ✅ Exportar también la clase AppError para otros archivos que la necesiten
  AppError,
  
  // ✅ Autenticación básica
  authenticate,
  authenticateOptional, // ✅ NUEVO: Middleware opcional agregado
  requireUserType,
  requireRole,
  optionalAuth, // ✅ MANTENIDO: Compatibilidad
  
  // ✅ Tipos de usuario específicos
  requireEscort,
  requireAgency,
  requireClient,
  requireEscortOrAgency,
  
  // ✅ Administración - TODAS LAS FUNCIONES CORREGIDAS
  requireAdmin,
  requireAdminPermission,
  requireSuperAdmin,
  logAdminActivity,
  checkAdminRateLimit,
  validateAdminIP,
  checkAdminSchedule,
  fullAdminVerification,
  
  // ✅ Funciones adicionales
  requireOwnership,
  checkClientLimits,
  
  // ✅ JWT Helpers
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  
  // ✅ Admin Helper functions - CORREGIDAS
  isAdmin,
  canAccessAdmin,
  canPerformAction,
  getAdminAccessLevel,
  formatAdminForLog
};