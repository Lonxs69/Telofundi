const Joi = require('joi');
const { AppError } = require('./errorHandler');
const logger = require('../utils/logger');

// ? VALORES VÁLIDOS PARA CAMPO SEXO - CONSTANTES CENTRALIZADAS
const VALID_SEXO_VALUES = ['Hombre', 'Mujer', 'Trans', 'Otro'];

// ============================================================================
// ?? VALIDACIONES DE AUTENTICACIÓN (COMPLETAMENTE CORREGIDAS)
// ============================================================================

// ? VALIDACIÓN DE REGISTRO SIMPLIFICADA - REEMPLAZA LA FUNCIÓN EXISTENTE
const validateRegistration = (req, res, next) => {
  console.log('?? VALIDANDO REGISTRO COMPLETO:', Object.keys(req.body));
  console.log('?? DATOS RECIBIDOS:', {
    email: req.body.email ? 'PRESENTE' : 'FALTANTE',
    firstName: req.body.firstName ? 'PRESENTE' : 'FALTANTE',
    password: req.body.password ? 'PRESENTE' : 'FALTANTE',
    userType: req.body.userType ? req.body.userType : 'FALTANTE'
  });

  const { userType } = req.body;
  const isAgency = userType === 'AGENCY';

  // ? SCHEMA BÁSICO CON VALIDACIONES CRÍTICAS
  const baseSchema = {
    email: Joi.string().email().required().messages({
      'string.email': 'Debe ser un email válido',
      'any.required': 'El email es requerido',
      'string.empty': 'El email no puede estar vacío',
      'string.base': 'El email debe ser texto'
    }),
    firstName: Joi.string().min(2).max(50).trim().required().messages({
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'string.max': 'El nombre no puede exceder 50 caracteres',
      'any.required': 'El nombre es requerido',
      'string.empty': 'El nombre no puede estar vacío',
      'string.base': 'El nombre debe ser texto'
    }),
    password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required().messages({
      'string.min': 'La contraseña debe tener al menos 8 caracteres',
      'string.pattern.base': 'La contraseña debe tener al menos una mayúscula, una minúscula y un número',
      'any.required': 'La contraseña es requerida',
      'string.empty': 'La contraseña no puede estar vacía',
      'string.base': 'La contraseña debe ser texto'
    }),
    userType: Joi.string().valid('ESCORT', 'AGENCY', 'CLIENT').required().messages({
      'any.only': 'El tipo de usuario debe ser ESCORT, AGENCY o CLIENT',
      'any.required': 'El tipo de usuario es requerido',
      'string.empty': 'El tipo de usuario no puede estar vacío',
      'string.base': 'El tipo de usuario debe ser texto'
    }),
    
    // ? CAMPOS OPCIONALES - TODOS PERMITEN VACÍO O NULL
    phone: Joi.string().trim().allow('', null).optional(),
    bio: Joi.string().trim().max(1000).allow('', null).optional(),
    website: Joi.string().uri().trim().allow('', null).optional(),
    locationId: Joi.string().trim().allow('', null).optional(),
    turnstileToken: Joi.string().allow('', null).optional(),
    
    // ? PARA AGENCIAS: TODOS LOS CAMPOS SON OPCIONALES (SE GENERAN AUTOMÁTICAMENTE)
    ...(isAgency && {
      companyName: Joi.string().trim().allow('', null).optional(),
      contactPerson: Joi.string().trim().allow('', null).optional(),
      address: Joi.string().trim().allow('', null).optional(),
      businessLicense: Joi.string().trim().allow('', null).optional()
    })
  };

  const schema = Joi.object(baseSchema);

  const { error, value } = schema.validate(req.body, { 
    abortEarly: false,
    stripUnknown: true,
    allowUnknown: false,
    convert: true
  });

  if (error) {
    const errors = error.details.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      value: err.context?.value,
      type: err.type
    }));

    console.log('? ERRORES DE VALIDACIÓN DE REGISTRO:', errors);
    
    errors.forEach((err, index) => {
      console.log(`   ${index + 1}. Campo: "${err.field}"`);
      console.log(`      Mensaje: ${err.message}`);
      console.log(`      Valor recibido: ${JSON.stringify(err.value)}`);
      console.log(`      Tipo de error: ${err.type}`);
    });

    return next(new AppError('Errores de validación', 400, 'VALIDATION_ERROR', errors));
  }

  // ? VALIDACIONES CRÍTICAS POST-JOI (SOLO CAMPOS ESENCIALES)
  if (!value.email || value.email.trim() === '') {
    console.error('? POST-VALIDATION: Email vacío después de Joi');
    return next(new AppError('Email es obligatorio y no puede estar vacío', 400, 'EMAIL_REQUIRED'));
  }

  if (!value.firstName || value.firstName.trim() === '') {
    console.error('? POST-VALIDATION: firstName vacío después de Joi');
    return next(new AppError('Nombre es obligatorio y no puede estar vacío', 400, 'FIRSTNAME_REQUIRED'));
  }

  if (!value.password || value.password.trim() === '') {
    console.error('? POST-VALIDATION: password vacío después de Joi');
    return next(new AppError('Contraseña es obligatoria y no puede estar vacía', 400, 'PASSWORD_REQUIRED'));
  }

  if (!value.userType || value.userType.trim() === '') {
    console.error('? POST-VALIDATION: userType vacío después de Joi');
    return next(new AppError('Tipo de usuario es obligatorio', 400, 'USERTYPE_REQUIRED'));
  }

  // ? PARA AGENCIAS: NO HAY VALIDACIONES ADICIONALES (TODO SE GENERA AUTOMÁTICAMENTE)
  console.log('? VALIDACIÓN DE REGISTRO EXITOSA');
  console.log('? Datos validados:', {
    email: value.email,
    firstName: value.firstName,
    userType: value.userType,
    hasPassword: !!value.password,
    isAgency: isAgency,
    phone: value.phone || 'NO_PHONE'
  });

  req.validatedData = value;
  next();
};

// ? VALIDACIÓN ESPECÍFICA PARA LOGIN - MEJORADA
const validateLogin = (req, res, next) => {
  console.log('?? VALIDANDO LOGIN:', Object.keys(req.body));

  const schema = Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Debe ser un email válido',
      'any.required': 'El email es requerido',
      'string.empty': 'El email no puede estar vacío',
      'string.base': 'El email debe ser texto'
    }),
    password: Joi.string().min(1).required().messages({
      'any.required': 'La contraseña es requerida',
      'string.empty': 'La contraseña no puede estar vacía',
      'string.base': 'La contraseña debe ser texto',
      'string.min': 'La contraseña no puede estar vacía'
    }),
    rememberMe: Joi.boolean().default(false).messages({
      'boolean.base': 'RememberMe debe ser verdadero o falso'
    })
  });

  const { error, value } = schema.validate(req.body, { 
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      value: err.context?.value
    }));

    console.log('? ERRORES DE VALIDACIÓN DE LOGIN:', errors);
    return next(new AppError('Errores de validación', 400, 'VALIDATION_ERROR', errors));
  }

  // ? VALIDACIONES ADICIONALES POST-JOI
  if (!value.email || value.email.trim() === '') {
    return next(new AppError('Email es obligatorio', 400, 'EMAIL_REQUIRED'));
  }

  if (!value.password || value.password.trim() === '') {
    return next(new AppError('Contraseña es obligatoria', 400, 'PASSWORD_REQUIRED'));
  }

  console.log('? VALIDACIÓN DE LOGIN EXITOSA');
  req.validatedData = value;
  next();
};

// ? VALIDACIÓN PARA PASSWORD RESET - MEJORADA
const validatePasswordReset = (req, res, next) => {
  console.log('?? VALIDANDO PASSWORD RESET:', Object.keys(req.body));

  const schema = Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Debe ser un email válido',
      'any.required': 'El email es requerido',
      'string.empty': 'El email no puede estar vacío',
      'string.base': 'El email debe ser texto'
    })
  });

  const { error, value } = schema.validate(req.body, { 
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      value: err.context?.value
    }));

    console.log('? ERRORES DE VALIDACIÓN DE PASSWORD RESET:', errors);
    return next(new AppError('Errores de validación', 400, 'VALIDATION_ERROR', errors));
  }

  // ? VALIDACIÓN ADICIONAL POST-JOI
  if (!value.email || value.email.trim() === '') {
    return next(new AppError('Email es obligatorio', 400, 'EMAIL_REQUIRED'));
  }

  console.log('? VALIDACIÓN DE PASSWORD RESET EXITOSA');
  req.validatedData = value;
  next();
};

// ? VALIDACIÓN ESPECÍFICA PARA AGENCIAS - REEMPLAZA LA FUNCIÓN EXISTENTE
const validateAgencyRegistration = (req, res, next) => {
  console.log('?? VALIDACIÓN SIMPLIFICADA PARA AGENCIAS');

  // Verificar que el userType sea AGENCY
  if (req.body.userType !== 'AGENCY') {
    return next(new AppError('Esta validación es solo para agencias', 400, 'INVALID_USER_TYPE'));
  }

  console.log('?? Verificando archivos de cédula...', {
    hasUploadedFiles: !!req.uploadedFiles,
    uploadedFilesKeys: req.uploadedFiles ? Object.keys(req.uploadedFiles) : [],
    hasFiles: !!req.files,
    filesKeys: req.files ? Object.keys(req.files) : []
  });

  // ? VERIFICAR SOLO ARCHIVOS DE CÉDULA (ÚNICOS REQUERIDOS)
  if (!req.uploadedFiles) {
    console.log('? req.uploadedFiles is undefined/null');
    return next(new AppError(
      'Se requieren fotos de la cédula (frente y trasera) para el registro de agencias', 
      400, 
      'CEDULA_PHOTOS_REQUIRED'
    ));
  }

  if (Object.keys(req.uploadedFiles).length === 0) {
    console.log('? req.uploadedFiles está vacío');
    return next(new AppError(
      'Se requieren fotos de la cédula (frente y trasera) para el registro de agencias', 
      400, 
      'CEDULA_PHOTOS_REQUIRED'
    ));
  }

  if (!req.uploadedFiles.cedulaFrente) {
    console.log('? Falta cedulaFrente en uploadedFiles');
    return next(new AppError(
      'Se requiere la foto frontal de la cédula', 
      400, 
      'CEDULA_FRENTE_REQUIRED'
    ));
  }

  if (!req.uploadedFiles.cedulaTrasera) {
    console.log('? Falta cedulaTrasera en uploadedFiles');
    return next(new AppError(
      'Se requiere la foto posterior de la cédula', 
      400, 
      'CEDULA_TRASERA_REQUIRED'
    ));
  }

  // ? VERIFICAR QUE LAS URLs DE CÉDULA SEAN VÁLIDAS
  const cedulaFrente = req.uploadedFiles.cedulaFrente?.secure_url;
  const cedulaTrasera = req.uploadedFiles.cedulaTrasera?.secure_url;

  if (!cedulaFrente || typeof cedulaFrente !== 'string' || cedulaFrente.trim() === '') {
    console.log('? URL de cedulaFrente inválida:', cedulaFrente);
    return next(new AppError(
      'Error procesando la foto frontal de la cédula. Intenta nuevamente.', 
      500, 
      'CEDULA_FRENTE_UPLOAD_ERROR'
    ));
  }

  if (!cedulaTrasera || typeof cedulaTrasera !== 'string' || cedulaTrasera.trim() === '') {
    console.log('? URL de cedulaTrasera inválida:', cedulaTrasera);
    return next(new AppError(
      'Error procesando la foto posterior de la cédula. Intenta nuevamente.', 
      500, 
      'CEDULA_TRASERA_UPLOAD_ERROR'
    ));
  }

  console.log('? VALIDACIÓN SIMPLIFICADA DE AGENCIA EXITOSA - Documentos válidos:', {
    cedulaFrente: 'VÁLIDA',
    cedulaTrasera: 'VÁLIDA'
  });
  
  next();
};
// ============================================================================
// ?? VALIDACIONES PARA SISTEMA DE PUNTOS TELOFUNDI - MEJORADAS
// ============================================================================

// ? VALIDACIÓN PARA COMPRA DE PUNTOS - MEJORADA
const validatePointsPurchase = (req, res, next) => {
  console.log('?? VALIDANDO COMPRA DE PUNTOS:', req.body);

  const schema = Joi.object({
    packageId: Joi.string().required().messages({
      'any.required': 'ID del paquete de puntos es requerido',
      'string.empty': 'ID del paquete no puede estar vacío',
      'string.base': 'ID del paquete debe ser texto'
    }),
    
    // Campos opcionales para metadata
    paymentMethod: Joi.string().valid('card', 'paypal', 'stripe').optional().messages({
      'any.only': 'Método de pago debe ser: card, paypal o stripe',
      'string.base': 'Método de pago debe ser texto'
    }),
    couponCode: Joi.string().max(20).trim().optional().messages({
      'string.max': 'Código de cupón no puede exceder 20 caracteres',
      'string.base': 'Código de cupón debe ser texto'
    }),
    platform: Joi.string().valid('web', 'mobile', 'desktop').optional().messages({
      'any.only': 'Plataforma debe ser: web, mobile o desktop',
      'string.base': 'Plataforma debe ser texto'
    })
  });

  const { error, value } = schema.validate(req.body, { 
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(err => ({
      field: err.path.join('.'),
      message: getCustomErrorMessage(err),
      value: err.context?.value
    }));

    console.log('? ERRORES EN VALIDACIÓN DE COMPRA DE PUNTOS:', errors);
    return next(new AppError('Error en datos de compra de puntos', 400, 'VALIDATION_ERROR', errors));
  }

  console.log('? VALIDACIÓN DE COMPRA DE PUNTOS EXITOSA');
  req.validatedData = value;
  next();
};

// ? VALIDACIÓN PARA GASTAR PUNTOS - CORREGIDA CON ACCIONES PREMIUM
const validatePointsSpend = (req, res, next) => {
  console.log('?? VALIDANDO GASTO DE PUNTOS:', req.body);

  const schema = Joi.object({
    action: Joi.string().valid(
      // ? Acciones originales mantenidas
      'phone_access',
      'image_message', 
      'extra_favorite',
      'profile_boost',
      'chat_priority',
      // ? NUEVAS: Acciones premium agregadas
      'premium_1_day',
      'premium_3_days',
      'premium_1_week',
      'premium_1_month'
    ).required().messages({
      'any.required': 'Acción es requerida',
      'any.only': 'Acción debe ser: phone_access, image_message, extra_favorite, profile_boost, chat_priority, premium_1_day, premium_3_days, premium_1_week, o premium_1_month',
      'string.base': 'Acción debe ser texto'
    }),
    
    targetData: Joi.object({
      // Para phone_access
      targetUserId: Joi.string().when('..action', {
        is: 'phone_access',
        then: Joi.required(),
        otherwise: Joi.optional()
      }).messages({
        'any.required': 'ID del usuario objetivo es requerido para acceso a teléfono',
        'string.base': 'ID del usuario debe ser texto'
      }),
      username: Joi.string().max(50).optional().messages({
        'string.max': 'Username no puede exceder 50 caracteres',
        'string.base': 'Username debe ser texto'
      }),
      
      // Para image_message
      chatId: Joi.string().when('..action', {
        is: 'image_message',
        then: Joi.required(),
        otherwise: Joi.optional()
      }).messages({
        'any.required': 'ID del chat es requerido para mensajes con imagen',
        'string.base': 'ID del chat debe ser texto'
      }),
      
      // Para profile_boost
      boostType: Joi.string().valid('basic', 'premium', 'featured').when('..action', {
        is: 'profile_boost',
        then: Joi.required(),
        otherwise: Joi.optional()
      }).messages({
        'any.required': 'Tipo de boost es requerido',
        'any.only': 'Tipo de boost debe ser: basic, premium o featured',
        'string.base': 'Tipo de boost debe ser texto'
      }),
      duration: Joi.number().integer().min(1).max(72).when('..action', {
        is: 'profile_boost',
        then: Joi.required(),
        otherwise: Joi.optional()
      }).messages({
        'any.required': 'Duración del boost es requerida',
        'number.base': 'Duración debe ser un número',
        'number.integer': 'Duración debe ser un número entero',
        'number.min': 'Duración mínima es 1 hora',
        'number.max': 'Duración máxima es 72 horas'
      }),
      
      // Para chat_priority
      priorityLevel: Joi.string().valid('normal', 'high', 'urgent').when('..action', {
        is: 'chat_priority',
        then: Joi.optional(),
        otherwise: Joi.forbidden()
      }).messages({
        'any.only': 'Nivel de prioridad debe ser: normal, high o urgent',
        'string.base': 'Nivel de prioridad debe ser texto'
      }),
      
      // ? NUEVO: Para acciones premium - datos opcionales de metadata
      premiumTier: Joi.string().valid('PREMIUM', 'VIP').when('..action', {
        is: Joi.valid('premium_1_day', 'premium_3_days', 'premium_1_week', 'premium_1_month'),
        then: Joi.optional(),
        otherwise: Joi.forbidden()
      }).messages({
        'any.only': 'Tier premium debe ser: PREMIUM o VIP',
        'string.base': 'Tier premium debe ser texto'
      }),
      
      // Metadata general
      reason: Joi.string().max(200).trim().optional().messages({
        'string.max': 'Razón no puede exceder 200 caracteres',
        'string.base': 'Razón debe ser texto'
      }),
      source: Joi.string().max(50).optional().messages({
        'string.max': 'Source no puede exceder 50 caracteres',
        'string.base': 'Source debe ser texto'
      })
    }).default({}).optional(),
    
    confirmAction: Joi.boolean().default(false).messages({
      'boolean.base': 'ConfirmAction debe ser verdadero o falso'
    })
  });

  const { error, value } = schema.validate(req.body, { 
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(err => ({
      field: err.path.join('.'),
      message: getCustomErrorMessage(err),
      value: err.context?.value
    }));

    console.log('? ERRORES EN VALIDACIÓN DE GASTO DE PUNTOS:', errors);
    return next(new AppError('Error en datos de gasto de puntos', 400, 'VALIDATION_ERROR', errors));
  }

  console.log('? VALIDACIÓN DE GASTO DE PUNTOS EXITOSA');
  req.validatedData = value;
  next();
};
// ? VALIDACIÓN PARA ACTIVACIÓN DE PREMIUM CON PUNTOS - MEJORADA
const validatePremiumActivation = (req, res, next) => {
  console.log('? VALIDANDO ACTIVACIÓN DE PREMIUM:', req.body);

  const schema = Joi.object({
    tier: Joi.string().valid('PREMIUM', 'VIP').required().messages({
      'any.required': 'Tier de premium es requerido',
      'any.only': 'Tier debe ser PREMIUM o VIP',
      'string.base': 'Tier debe ser texto'
    }),
    
    duration: Joi.number().integer().min(1).max(168).default(24).messages({
      'number.base': 'Duración debe ser un número',
      'number.integer': 'Duración debe ser un número entero',
      'number.min': 'Duración mínima es 1 hora',
      'number.max': 'Duración máxima es 168 horas (7 días)'
    }),
    
    confirmCost: Joi.boolean().default(false).messages({
      'boolean.base': 'ConfirmCost debe ser verdadero o falso'
    }),
    source: Joi.string().valid('mobile', 'web', 'desktop').optional().messages({
      'any.only': 'Source debe ser: mobile, web o desktop',
      'string.base': 'Source debe ser texto'
    })
  });

  const { error, value } = schema.validate(req.body, { 
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(err => ({
      field: err.path.join('.'),
      message: getCustomErrorMessage(err),
      value: err.context?.value
    }));

    console.log('? ERRORES EN VALIDACIÓN DE ACTIVACIÓN PREMIUM:', errors);
    return next(new AppError('Error en datos de activación premium', 400, 'VALIDATION_ERROR', errors));
  }

  console.log('? VALIDACIÓN DE ACTIVACIÓN PREMIUM EXITOSA');
  req.validatedData = value;
  next();
};

// ? VALIDACIÓN PARA AJUSTES ADMINISTRATIVOS DE PUNTOS - MEJORADA
const validateAdminPointsAdjustment = (req, res, next) => {
  console.log('??? VALIDANDO AJUSTE ADMIN DE PUNTOS:', req.body);

  const schema = Joi.object({
    clientId: Joi.string().required().messages({
      'any.required': 'ID del cliente es requerido',
      'string.empty': 'ID del cliente no puede estar vacío',
      'string.base': 'ID del cliente debe ser texto'
    }),
    
    amount: Joi.number().integer().min(-10000).max(10000).not(0).required().messages({
      'any.required': 'Cantidad de puntos es requerida',
      'number.base': 'Cantidad debe ser un número',
      'number.integer': 'Cantidad debe ser un número entero',
      'number.min': 'Cantidad mínima es -10,000 puntos',
      'number.max': 'Cantidad máxima es 10,000 puntos',
      'any.invalid': 'La cantidad no puede ser 0'
    }),
    
    reason: Joi.string().min(5).max(200).trim().required().messages({
      'any.required': 'Razón del ajuste es requerida',
      'string.min': 'La razón debe tener al menos 5 caracteres',
      'string.max': 'La razón no puede exceder 200 caracteres',
      'string.base': 'La razón debe ser texto'
    }),
    
    category: Joi.string().valid(
      'correction',
      'compensation', 
      'penalty',
      'bonus',
      'refund',
      'technical_issue',
      'customer_service'
    ).optional().messages({
      'any.only': 'Categoría debe ser: correction, compensation, penalty, bonus, refund, technical_issue o customer_service',
      'string.base': 'Categoría debe ser texto'
    }),
    
    notifyClient: Joi.boolean().default(true).messages({
      'boolean.base': 'NotifyClient debe ser verdadero o falso'
    }),
    internalNotes: Joi.string().max(500).trim().optional().messages({
      'string.max': 'Notas internas no pueden exceder 500 caracteres',
      'string.base': 'Notas internas deben ser texto'
    })
  });

  const { error, value } = schema.validate(req.body, { 
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(err => ({
      field: err.path.join('.'),
      message: getCustomErrorMessage(err),
      value: err.context?.value
    }));

    console.log('? ERRORES EN VALIDACIÓN DE AJUSTE ADMIN:', errors);
    return next(new AppError('Error en datos de ajuste administrativo', 400, 'VALIDATION_ERROR', errors));
  }

  console.log('? VALIDACIÓN DE AJUSTE ADMIN EXITOSA');
  req.validatedData = value;
  next();
};

// ============================================================================
// ?? VALIDACIONES ACTUALIZADAS PARA SISTEMA EXISTENTE - MEJORADAS CON SEXO
// ============================================================================

// ? VALIDACIÓN DE ACTUALIZACIÓN DE PERFIL - COMPLETAMENTE MEJORADA CON SEXO
const validateUpdateProfile = (req, res, next) => {
  console.log('?? VALIDANDO ACTUALIZACIÓN DE PERFIL:', req.body);
  console.log('?? TAMAÑO DEL BODY:', Object.keys(req.body).length, 'campos');
  console.log('?? CAMPOS RECIBIDOS:', Object.keys(req.body));

  const schema = Joi.object({
    // ? CAMPOS BÁSICOS CON VALIDACIÓN ROBUSTA
    firstName: Joi.string().min(2).max(50).trim().messages({
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'string.max': 'El nombre no puede exceder 50 caracteres',
      'string.base': 'El nombre debe ser texto'
    }),
    lastName: Joi.string().min(2).max(50).trim().allow('').messages({
      'string.min': 'El apellido debe tener al menos 2 caracteres',
      'string.max': 'El apellido no puede exceder 50 caracteres',
      'string.base': 'El apellido debe ser texto'
    }),
    username: Joi.string().min(3).max(30).alphanum().messages({
      'string.min': 'El username debe tener al menos 3 caracteres',
      'string.max': 'El username no puede exceder 30 caracteres',
      'string.alphanum': 'El username solo puede contener letras y números',
      'string.base': 'El username debe ser texto'
    }),
    bio: Joi.string().max(500).trim().allow('', null).messages({
      'string.max': 'La descripción no puede exceder 500 caracteres',
      'string.base': 'La descripción debe ser texto'
    }),
    phone: Joi.string().pattern(/^\+?[1-9]\d{7,14}$/).allow('', null).messages({
      'string.pattern.base': 'Debe ser un número de teléfono válido',
      'string.base': 'El teléfono debe ser texto'
    }),
    website: Joi.string().uri().allow('', null).messages({
      'string.uri': 'Debe ser una URL válida',
      'string.base': 'El website debe ser texto'
    }),
    locationId: Joi.string().allow('', null).messages({
      'string.base': 'El locationId debe ser texto'
    }),
    
    // ? CAMPOS ESPECÍFICOS PARA ESCORTS CON VALIDACIONES MEJORADAS
    age: Joi.number().integer().min(18).max(80).messages({
      'number.base': 'La edad debe ser un número',
      'number.integer': 'La edad debe ser un número entero',
      'number.min': 'Debes ser mayor de 18 años',
      'number.max': 'La edad máxima es 80 años'
    }),
    height: Joi.number().integer().min(140).max(220).messages({
      'number.base': 'La altura debe ser un número',
      'number.integer': 'La altura debe ser un número entero',
      'number.min': 'La altura mínima es 140cm',
      'number.max': 'La altura máxima es 220cm'
    }),
    weight: Joi.number().integer().min(40).max(150).messages({
      'number.base': 'El peso debe ser un número',
      'number.integer': 'El peso debe ser un número entero',
      'number.min': 'El peso mínimo es 40kg',
      'number.max': 'El peso máximo es 150kg'
    }),
    bodyType: Joi.string().valid('SLIM', 'ATHLETIC', 'CURVY', 'FULL_FIGURED', 'MUSCULAR').allow('', null).messages({
      'any.only': 'Tipo de cuerpo inválido',
      'string.base': 'Tipo de cuerpo debe ser texto'
    }),
    ethnicity: Joi.string().valid('LATINA', 'CAUCASIAN', 'AFRO', 'ASIAN', 'MIXED', 'OTHER').allow('', null).messages({
      'any.only': 'Etnia inválida',
      'string.base': 'Etnia debe ser texto'
    }),
    hairColor: Joi.string().valid('BLACK', 'BROWN', 'BLONDE', 'RED', 'OTHER').allow('', null).messages({
      'any.only': 'Color de cabello inválido',
      'string.base': 'Color de cabello debe ser texto'
    }),
    eyeColor: Joi.string().valid('BROWN', 'BLUE', 'GREEN', 'HAZEL', 'BLACK', 'GRAY').allow('', null).messages({
      'any.only': 'Color de ojos inválido',
      'string.base': 'Color de ojos debe ser texto'
    }),
    
    // ? ARRAYS: Validar correctamente servicios, idiomas, etc.
    services: Joi.array().items(Joi.string().trim().min(1)).max(3).messages({
      'array.base': 'Los servicios deben ser una lista',
      'array.max': 'Máximo 3 servicios permitidos',
      'string.min': 'Cada servicio debe tener al menos 1 carácter'
    }),
    languages: Joi.array().items(Joi.string().trim().min(1)).max(10).messages({
      'array.base': 'Los idiomas deben ser una lista',
      'array.max': 'Máximo 10 idiomas permitidos'
    }),
    specialties: Joi.array().items(Joi.string().trim().min(1)).max(15).messages({
      'array.base': 'Las especialidades deben ser una lista',
      'array.max': 'Máximo 15 especialidades permitidas'
    }),
    hobbies: Joi.array().items(Joi.string().trim().min(1)).max(10).messages({
      'array.base': 'Los hobbies deben ser una lista',
      'array.max': 'Máximo 10 hobbies permitidos'
    }),
    personalityTraits: Joi.array().items(Joi.string().trim().min(1)).max(10).messages({
      'array.base': 'Los rasgos de personalidad deben ser una lista',
      'array.max': 'Máximo 10 rasgos permitidos'
    }),
    outcallAreas: Joi.array().items(Joi.string().trim().min(1)).max(10).messages({
      'array.base': 'Las áreas de outcall deben ser una lista',
      'array.max': 'Máximo 10 áreas permitidas'
    }),
    
    // ? OBJETOS: Validar tarifas, disponibilidad, etc.
    rates: Joi.object().pattern(
      Joi.string().valid('30min', '1h', '2h', '3h', '4h', 'overnight', 'dinner', 'travel'),
      Joi.number().positive().max(100000)
    ).messages({
      'object.base': 'Las tarifas deben ser un objeto',
      'number.positive': 'Las tarifas deben ser números positivos',
      'number.max': 'Tarifa máxima: $100,000'
    }),
    
    availability: Joi.object().pattern(
      Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
      Joi.array().items(Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]-([01]?[0-9]|2[0-3]):[0-5][0-9]$/))
    ).messages({
      'object.base': 'La disponibilidad debe ser un objeto',
      'string.pattern.base': 'Formato de hora inválido (HH:MM-HH:MM)'
    }),
    
    measurements: Joi.object().pattern(
      Joi.string().valid('bust', 'waist', 'hips'),
      Joi.number().positive().max(200)
    ).messages({
      'object.base': 'Las medidas deben ser un objeto',
      'number.positive': 'Las medidas deben ser números positivos'
    }),
    
    workingHours: Joi.object({
      start: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
      end: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
      timezone: Joi.string().allow('', null)
    }).messages({
      'string.pattern.base': 'Formato de hora inválido (HH:MM)'
    }),
    
    socialMedia: Joi.object().pattern(
      Joi.string().valid('instagram', 'twitter', 'facebook', 'tiktok', 'onlyfans'),
      Joi.string().trim().max(100)
    ).messages({
      'object.base': 'Las redes sociales deben ser un objeto'
    }),
    
    // ? CAMPOS DE TEXTO LARGOS
    aboutMe: Joi.string().max(1000).trim().allow('', null).messages({
      'string.max': 'La descripción "Sobre mí" no puede exceder 1000 caracteres',
      'string.base': 'La descripción debe ser texto'
    }),
    education: Joi.string().max(200).trim().allow('', null).messages({
      'string.max': 'La educación no puede exceder 200 caracteres',
      'string.base': 'La educación debe ser texto'
    }),
    incallLocation: Joi.string().max(100).trim().allow('', null).messages({
      'string.max': 'La ubicación incall no puede exceder 100 caracteres',
      'string.base': 'La ubicación incall debe ser texto'
    }),
    
    // ? ENUMS
    experience: Joi.string().valid('NEW', 'BEGINNER', 'INTERMEDIATE', 'EXPERIENCED', 'EXPERT').allow('', null).messages({
      'any.only': 'Nivel de experiencia inválido',
      'string.base': 'Nivel de experiencia debe ser texto'
    }),
    preferredClientType: Joi.string().valid('EXECUTIVES', 'TOURISTS', 'REGULARS', 'COUPLES', 'ANY').allow('', null).messages({
      'any.only': 'Tipo de cliente preferido inválido',
      'string.base': 'Tipo de cliente preferido debe ser texto'
    })
  });

  const { error, value } = schema.validate(req.body, { 
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true,
    convert: true
  });

  if (error) {
    const errors = error.details.map(err => ({
      field: err.path.join('.'),
      message: getCustomErrorMessage(err),
      value: err.context?.value,
      type: err.type
    }));

    console.log('? ERRORES DE VALIDACIÓN DETALLADOS:');
    errors.forEach((err, index) => {
      console.log(`   ${index + 1}. Campo: "${err.field}"`);
      console.log(`      Mensaje: ${err.message}`);
      console.log(`      Valor recibido: ${JSON.stringify(err.value)}`);
      console.log(`      Tipo de error: ${err.type}`);
      console.log(`      ---`);
    });

    return next(new AppError('Errores de validación', 400, 'VALIDATION_ERROR', errors));
  }

  console.log('? VALIDACIÓN EXITOSA - Datos procesados:', Object.keys(value).length, 'campos');
  console.log('? CAMPOS VALIDADOS:', Object.keys(value));
  req.validatedData = value;
  next();
};

// ? VALIDACIÓN DE PAGINACIÓN - COMPLETAMENTE ACTUALIZADA CON FILTRO SEXO
const validatePagination = (req, res, next) => {
  console.log('?? VALIDANDO QUERY:', req.query);
  console.log('?? TAMAÑO DEL QUERY:', Object.keys(req.query).length, 'campos');
  console.log('?? CAMPOS RECIBIDOS:', Object.keys(req.query));

  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1).messages({
      'number.base': 'Page debe ser un número',
      'number.integer': 'Page debe ser un número entero',
      'number.min': 'Page debe ser mayor a 0'
    }),
    limit: Joi.number().integer().min(1).max(100).default(20).messages({
      'number.base': 'Limit debe ser un número',
      'number.integer': 'Limit debe ser un número entero',
      'number.min': 'Limit debe ser mayor a 0',
      'number.max': 'Limit no puede exceder 100'
    }),
    verified: Joi.boolean().messages({
      'boolean.base': 'Verified debe ser verdadero o falso'
    }),
    location: Joi.string().trim().messages({
      'string.base': 'Location debe ser texto'
    }),
    userType: Joi.string().valid('ESCORT', 'AGENCY', 'CLIENT', 'ADMIN').messages({
      'any.only': 'UserType debe ser: ESCORT, AGENCY, CLIENT o ADMIN',
      'string.base': 'UserType debe ser texto'
    }),
    status: Joi.string().valid('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED', 'active', 'inactive', 'pending', 'draft', 'rejected').messages({
      'any.only': 'Status inválido',
      'string.base': 'Status debe ser texto'
    }),
    
    // ? NUEVO: Validación del filtro sexo
    sexo: Joi.string().valid(...VALID_SEXO_VALUES).messages({
      'any.only': `Sexo debe ser uno de: ${VALID_SEXO_VALUES.join(', ')}`,
      'string.base': 'Sexo debe ser texto'
    }),
    
    sortBy: Joi.string().valid(
      'recent',
      'relevance', 
      'newest', 
      'oldest', 
      'popular', 
      'rating',
      'createdAt',
      'updatedAt',
      'views',
      'likes',
      'points', // ? NUEVO: Para ordenar por puntos
      'streak', // ? NUEVO: Para ordenar por racha
      'amount'  // ? NUEVO: Para ordenar por monto
    ).default('recent').messages({
      'any.only': 'SortBy inválido',
      'string.base': 'SortBy debe ser texto'
    }),
    
    sortOrder: Joi.string().valid('asc', 'desc').default('desc').messages({
      'any.only': 'SortOrder debe ser: asc o desc',
      'string.base': 'SortOrder debe ser texto'
    }),
    q: Joi.string().trim().messages({
      'string.base': 'Query debe ser texto'
    }),
    
    // Filtros adicionales para búsquedas específicas
    minAge: Joi.number().integer().min(18).max(80).messages({
      'number.base': 'MinAge debe ser un número',
      'number.integer': 'MinAge debe ser un número entero',
      'number.min': 'MinAge debe ser mayor a 18',
      'number.max': 'MinAge debe ser menor a 80'
    }),
    maxAge: Joi.number().integer().min(18).max(80).messages({
      'number.base': 'MaxAge debe ser un número',
      'number.integer': 'MaxAge debe ser un número entero',
      'number.min': 'MaxAge debe ser mayor a 18',
      'number.max': 'MaxAge debe ser menor a 80'
    }),
    bodyType: Joi.string().valid('SLIM', 'ATHLETIC', 'CURVY', 'FULL_FIGURED', 'MUSCULAR').messages({
      'any.only': 'BodyType inválido',
      'string.base': 'BodyType debe ser texto'
    }),
    ethnicity: Joi.string().valid('LATINA', 'CAUCASIAN', 'AFRO', 'ASIAN', 'MIXED', 'OTHER').messages({
      'any.only': 'Ethnicity inválida',
      'string.base': 'Ethnicity debe ser texto'
    }),
    services: Joi.array().items(Joi.string()).messages({
      'array.base': 'Services debe ser una lista'
    }),
    languages: Joi.array().items(Joi.string()).messages({
      'array.base': 'Languages debe ser una lista'
    }),
    minRate: Joi.number().positive().messages({
      'number.base': 'MinRate debe ser un número',
      'number.positive': 'MinRate debe ser positivo'
    }),
    maxRate: Joi.number().positive().messages({
      'number.base': 'MaxRate debe ser un número',
      'number.positive': 'MaxRate debe ser positivo'
    }),
    isOnline: Joi.boolean().messages({
      'boolean.base': 'IsOnline debe ser verdadero o falso'
    }),
    hasPhotos: Joi.boolean().messages({
      'boolean.base': 'HasPhotos debe ser verdadero o falso'
    }),
    premiumOnly: Joi.boolean().messages({
      'boolean.base': 'PremiumOnly debe ser verdadero o falso'
    }),
    
    // ? NUEVOS: Filtros específicos para puntos
    type: Joi.string().valid(
      'PURCHASE', 'BONUS_POINTS', 'DAILY_LOGIN', 'REGISTRATION_BONUS', 
      'REFERRAL_REWARD', 'STREAK_BONUS', 'PREMIUM_DAY', 'CHAT_PRIORITY', 
      'EXTRA_FAVORITE', 'PROFILE_BOOST', 'PHONE_ACCESS', 'IMAGE_MESSAGE',
      'REFUND', 'ADMIN_ADJUSTMENT', 'EXPIRED_PREMIUM'
    ).messages({
      'any.only': 'Type inválido',
      'string.base': 'Type debe ser texto'
    }),
    minPoints: Joi.number().integer().min(0).messages({
      'number.base': 'MinPoints debe ser un número',
      'number.integer': 'MinPoints debe ser un número entero',
      'number.min': 'MinPoints debe ser mayor o igual a 0'
    }),
    maxPoints: Joi.number().integer().min(0).messages({
      'number.base': 'MaxPoints debe ser un número',
      'number.integer': 'MaxPoints debe ser un número entero',
      'number.min': 'MaxPoints debe ser mayor o igual a 0'
    }),
    timeframe: Joi.string().valid('24h', '7d', '30d', '90d', '1y').default('30d').messages({
      'any.only': 'Timeframe debe ser: 24h, 7d, 30d, 90d o 1y',
      'string.base': 'Timeframe debe ser texto'
    }),
    
    // Filtros específicos para chat
    includeDisputes: Joi.boolean().default(false).messages({
      'boolean.base': 'IncludeDisputes debe ser verdadero o falso'
    }),
    archived: Joi.boolean().default(false).messages({
      'boolean.base': 'Archived debe ser verdadero o falso'
    })
  });

  const { error, value } = schema.validate(req.query, { 
    abortEarly: false,
    stripUnknown: true,
    convert: true
  });

  if (error) {
    const errors = error.details.map(err => ({
      field: err.path.join('.'),
      message: getCustomErrorMessage(err),
      value: err.context?.value,
      type: err.type
    }));

    console.log('? ERRORES DE VALIDACIÓN DETALLADOS:');
    errors.forEach((err, index) => {
      console.log(`   ${index + 1}. Campo: "${err.field}"`);
      console.log(`      Mensaje: ${err.message}`);
      console.log(`      Valor recibido: ${JSON.stringify(err.value)}`);
      console.log(`      Tipo de error: ${err.type}`);
      console.log(`      ---`);
    });

    return next(new AppError('Error de validación', 400, 'VALIDATION_ERROR', errors));
  }

  console.log('? VALIDACIÓN EXITOSA - Datos procesados:', Object.keys(value).length, 'campos');
  req.query = value;
  next();
};

// ============================================================================
// ?? VALIDACIONES ORIGINALES MANTENIDAS Y MEJORADAS CON SEXO
// ============================================================================

// ? VALIDACIÓN DE CREACIÓN DE POST - COMPLETAMENTE ACTUALIZADA CON SEXO OBLIGATORIO
const validateCreatePost = (req, res, next) => {
  console.log('?? VALIDANDO POST CREATION:', {
    bodyKeys: Object.keys(req.body),
    filesCount: req.files ? req.files.length : 0
  });

  const schema = Joi.object({
    title: Joi.string().min(5).max(100).trim().required().messages({
      'string.min': 'El título debe tener al menos 5 caracteres',
      'string.max': 'El título no puede exceder 100 caracteres',
      'any.required': 'El título es requerido',
      'string.base': 'El título debe ser texto'
    }),
    description: Joi.string().min(10).max(2000).trim().required().messages({
      'string.min': 'La descripción debe tener al menos 10 caracteres',
      'string.max': 'La descripción no puede exceder 2000 caracteres',
      'any.required': 'La descripción es requerida',
      'string.base': 'La descripción debe ser texto'
    }),
    phone: Joi.string().pattern(/^\+?[1-9]\d{7,14}$/).required().messages({
      'string.pattern.base': 'Debe ser un número de teléfono válido',
      'any.required': 'El teléfono es requerido',
      'string.base': 'El teléfono debe ser texto'
    }),
    
    // ? NUEVO: Campo sexo obligatorio con validación específica
    sexo: Joi.string().valid(...VALID_SEXO_VALUES).required().messages({
      'any.required': 'El sexo es requerido',
      'any.only': `El sexo debe ser uno de: ${VALID_SEXO_VALUES.join(', ')}`,
      'string.base': 'El sexo debe ser texto',
      'string.empty': 'El sexo no puede estar vacío'
    }),
    
    // ? NUEVO: Edad obligatoria para posts
    age: Joi.number().integer().min(18).max(80).required().messages({
      'any.required': 'La edad es requerida',
      'number.base': 'La edad debe ser un número',
      'number.integer': 'La edad debe ser un número entero',
      'number.min': 'La edad mínima es 18 años',
      'number.max': 'La edad máxima es 80 años'
    }),
    
    // ? NUEVO: Ubicación obligatoria para posts
    location: Joi.string().min(3).max(100).trim().required().messages({
      'any.required': 'La ubicación es requerida',
      'string.min': 'La ubicación debe tener al menos 3 caracteres',
      'string.max': 'La ubicación no puede exceder 100 caracteres',
      'string.base': 'La ubicación debe ser texto',
      'string.empty': 'La ubicación no puede estar vacía'
    }),
    
    // Campos opcionales
    services: Joi.array().items(Joi.string().trim().min(1)).max(3).messages({
      'array.base': 'Los servicios deben ser una lista',
      'array.max': 'Máximo 3 servicios permitidos',
      'string.min': 'Cada servicio debe tener al menos 1 carácter'
    }),
    rates: Joi.object().pattern(Joi.string(), Joi.number().positive()).messages({
      'object.base': 'Las tarifas deben ser un objeto',
      'number.positive': 'Las tarifas deben ser números positivos'
    }),
    availability: Joi.object().messages({
      'object.base': 'La disponibilidad debe ser un objeto'
    }),
    locationId: Joi.string().allow('', null).messages({
      'string.base': 'LocationId debe ser texto'
    }),
    premiumOnly: Joi.boolean().default(false).messages({
      'boolean.base': 'PremiumOnly debe ser verdadero o falso'
    }),
    tags: Joi.array().items(Joi.string().trim()).max(10).messages({
      'array.base': 'Tags debe ser una lista',
      'array.max': 'Máximo 10 tags permitidos'
    }),
    
    // Campos específicos para escorts
    workingHours: Joi.object().messages({
      'object.base': 'WorkingHours debe ser un objeto'
    }),
    outcallAreas: Joi.array().items(Joi.string().trim()).max(10).messages({
      'array.base': 'OutcallAreas debe ser una lista',
      'array.max': 'Máximo 10 áreas permitidas'
    }),
    incallLocation: Joi.string().max(100).trim().allow('', null).messages({
      'string.max': 'IncallLocation no puede exceder 100 caracteres',
      'string.base': 'IncallLocation debe ser texto'
    }),
    specialRequests: Joi.string().max(500).trim().allow('', null).messages({
      'string.max': 'SpecialRequests no puede exceder 500 caracteres',
      'string.base': 'SpecialRequests debe ser texto'
    })
  });

  const { error, value } = schema.validate(req.body, { 
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: false
  });

  if (error) {
    const errors = error.details.map(err => ({
      field: err.path.join('.'),
      message: getCustomErrorMessage(err),
      value: err.context?.value
    }));

    console.log('? ERRORES DE VALIDACIÓN EN POST:', errors);

    // ? LOG ESPECÍFICO PARA ERRORES DE SEXO
    const sexoError = errors.find(err => err.field === 'sexo');
    if (sexoError) {
      console.log('? ERROR ESPECÍFICO EN CAMPO SEXO:', {
        message: sexoError.message,
        receivedValue: sexoError.value,
        validValues: VALID_SEXO_VALUES
      });
    }

    return next(new AppError('Errores de validación en el post', 400, 'VALIDATION_ERROR', errors));
  }

  // ? VALIDACIÓN POST-JOI PARA CAMPOS CRÍTICOS
  if (!value.sexo || !VALID_SEXO_VALUES.includes(value.sexo)) {
    console.error('? POST-VALIDATION: Campo sexo inválido:', value.sexo);
    return next(new AppError(`El sexo debe ser uno de: ${VALID_SEXO_VALUES.join(', ')}`, 400, 'SEXO_INVALID'));
  }

  if (!value.age || value.age < 18 || value.age > 80) {
    console.error('? POST-VALIDATION: Edad inválida:', value.age);
    return next(new AppError('La edad debe estar entre 18 y 80 años', 400, 'AGE_INVALID'));
  }

  if (!value.location || value.location.trim() === '') {
    console.error('? POST-VALIDATION: Ubicación vacía');
    return next(new AppError('La ubicación es obligatoria', 400, 'LOCATION_REQUIRED'));
  }

  console.log('? VALIDACIÓN DE POST EXITOSA');
  console.log('? Datos validados incluyen:', {
    hasTitle: !!value.title,
    hasDescription: !!value.description,
    hasPhone: !!value.phone,
    sexo: value.sexo,
    age: value.age,
    location: value.location,
    servicesCount: value.services?.length || 0
  });

  req.validatedData = value;
  next();
};

// ? VALIDACIÓN ESPECÍFICA PARA MENSAJES DE CHAT - MEJORADA
const validateChatMessage = (req, res, next) => {
  const schema = Joi.object({
    content: Joi.string().min(1).max(5000).trim().when('messageType', {
      is: Joi.valid('TEXT'),
      then: Joi.required(),
      otherwise: Joi.optional()
    }).messages({
      'string.min': 'El mensaje no puede estar vacío',
      'string.max': 'El mensaje no puede exceder 5000 caracteres',
      'any.required': 'El contenido del mensaje es requerido para mensajes de texto',
      'string.base': 'El contenido debe ser texto'
    }),
    messageType: Joi.string().valid('TEXT', 'IMAGE', 'FILE', 'AUDIO', 'VIDEO', 'LOCATION', 'CONTACT').default('TEXT').messages({
      'any.only': 'Tipo de mensaje inválido',
      'string.base': 'El tipo de mensaje debe ser texto'
    }),
    replyToId: Joi.string().allow('', null).optional().messages({
      'string.base': 'ReplyToId debe ser texto'
    }),
    
    // ? NUEVO: Soporte para mensajes premium
    isPremiumMessage: Joi.boolean().default(false).messages({
      'boolean.base': 'IsPremiumMessage debe ser verdadero o falso'
    }),
    usePoints: Joi.boolean().default(false).messages({
      'boolean.base': 'UsePoints debe ser verdadero o falso'
    }),
    
    // Para mensajes con ubicación
    latitude: Joi.number().min(-90).max(90).when('messageType', {
      is: 'LOCATION',
      then: Joi.required(),
      otherwise: Joi.optional()
    }).messages({
      'number.base': 'Latitude debe ser un número',
      'number.min': 'Latitude debe estar entre -90 y 90',
      'number.max': 'Latitude debe estar entre -90 y 90',
      'any.required': 'Latitude es requerida para mensajes de ubicación'
    }),
    longitude: Joi.number().min(-180).max(180).when('messageType', {
      is: 'LOCATION',
      then: Joi.required(),
      otherwise: Joi.optional()
    }).messages({
      'number.base': 'Longitude debe ser un número',
      'number.min': 'Longitude debe estar entre -180 y 180',
      'number.max': 'Longitude debe estar entre -180 y 180',
      'any.required': 'Longitude es requerida para mensajes de ubicación'
    }),
    locationName: Joi.string().max(100).trim().allow('', null).optional().messages({
      'string.max': 'LocationName no puede exceder 100 caracteres',
      'string.base': 'LocationName debe ser texto'
    })
  });

  const { error, value } = schema.validate(req.body, { 
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(err => ({
      field: err.path.join('.'),
      message: getCustomErrorMessage(err),
      value: err.context?.value
    }));

    return next(new AppError('Error de validación en mensaje', 400, 'VALIDATION_ERROR', errors));
  }

  req.validatedData = value;
  next();
};

// ============================================================================
// ?? VALIDACIONES DE PAGOS ACTUALIZADAS Y MEJORADAS
// ============================================================================

const validateBoostPayment = (req, res, next) => {
  const schema = Joi.object({
    postId: Joi.string().required().messages({
      'any.required': 'ID del post es requerido',
      'string.base': 'ID del post debe ser texto'
    }),
    pricingId: Joi.string().required().messages({
      'any.required': 'ID del pricing es requerido',
      'string.base': 'ID del pricing debe ser texto'
    })
  });

  const { error, value } = schema.validate(req.body, { 
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      value: err.context?.value
    }));

    return next(new AppError('Errores de validación', 400, 'VALIDATION_ERROR', errors));
  }

  req.validatedData = value;
  next();
};

const validateVerificationPayment = (req, res, next) => {
  const schema = Joi.object({
    escortId: Joi.string().required().messages({
      'any.required': 'ID del escort es requerido',
      'string.base': 'ID del escort debe ser texto'
    }),
    pricingId: Joi.string().required().messages({
      'any.required': 'ID del pricing es requerido',
      'string.base': 'ID del pricing debe ser texto'
    })
  });

  const { error, value } = schema.validate(req.body, { 
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      value: err.context?.value
    }));

    return next(new AppError('Errores de validación', 400, 'VALIDATION_ERROR', errors));
  }

  req.validatedData = value;
  next();
};

// ? ACTUALIZADA: Validación para pagos premium - MEJORADA
const validatePremiumPayment = (req, res, next) => {
  const schema = Joi.object({
    tier: Joi.string().valid('PREMIUM', 'VIP').required().messages({
      'any.required': 'Tier es requerido',
      'any.only': 'Tier debe ser PREMIUM o VIP',
      'string.base': 'Tier debe ser texto'
    }),
    duration: Joi.number().integer().valid(1, 3, 6, 12).required().messages({
      'any.required': 'Duración es requerida',
      'any.only': 'Duración debe ser 1, 3, 6 o 12 meses',
      'number.base': 'Duración debe ser un número',
      'number.integer': 'Duración debe ser un número entero'
    }),
    
    // ? NUEVO: Soporte para compra con puntos vs dinero
    paymentMethod: Joi.string().valid('stripe', 'points').default('stripe').messages({
      'any.only': 'Método de pago debe ser stripe o points',
      'string.base': 'Método de pago debe ser texto'
    }),
    confirmCost: Joi.boolean().default(false).messages({
      'boolean.base': 'ConfirmCost debe ser verdadero o falso'
    })
  });

  const { error, value } = schema.validate(req.body, { 
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      value: err.context?.value
    }));

    return next(new AppError('Errores de validación', 400, 'VALIDATION_ERROR', errors));
  }

  req.validatedData = value;
  next();
};

const validateUserSettings = (req, res, next) => {
  const schema = Joi.object({
    // Notificaciones
    emailNotifications: Joi.boolean().optional().messages({
      'boolean.base': 'EmailNotifications debe ser verdadero o falso'
    }),
    pushNotifications: Joi.boolean().optional().messages({
      'boolean.base': 'PushNotifications debe ser verdadero o falso'
    }),
    messageNotifications: Joi.boolean().optional().messages({
      'boolean.base': 'MessageNotifications debe ser verdadero o falso'
    }),
    likeNotifications: Joi.boolean().optional().messages({
      'boolean.base': 'LikeNotifications debe ser verdadero o falso'
    }),
    boostNotifications: Joi.boolean().optional().messages({
      'boolean.base': 'BoostNotifications debe ser verdadero o falso'
    }),
    profileReminders: Joi.boolean().optional().messages({
      'boolean.base': 'ProfileReminders debe ser verdadero o falso'
    }),
    verificationReminders: Joi.boolean().optional().messages({
      'boolean.base': 'VerificationReminders debe ser verdadero o falso'
    }),
    
    // Privacidad
    showOnline: Joi.boolean().optional().messages({
      'boolean.base': 'ShowOnline debe ser verdadero o falso'
    }),
    showLastSeen: Joi.boolean().optional().messages({
      'boolean.base': 'ShowLastSeen debe ser verdadero o falso'
    }),
    allowDirectMessages: Joi.boolean().optional().messages({
      'boolean.base': 'AllowDirectMessages debe ser verdadero o falso'
    }),
    showPhoneNumber: Joi.boolean().optional().messages({
      'boolean.base': 'ShowPhoneNumber debe ser verdadero o falso'
    }),
    showInDiscovery: Joi.boolean().optional().messages({
      'boolean.base': 'ShowInDiscovery debe ser verdadero o falso'
    }),
    showInTrending: Joi.boolean().optional().messages({
      'boolean.base': 'ShowInTrending debe ser verdadero o falso'
    }),
    showInSearch: Joi.boolean().optional().messages({
      'boolean.base': 'ShowInSearch debe ser verdadero o falso'
    }),
    
    // Filtros de contenido
    contentFilter: Joi.string().valid('NONE', 'MODERATE', 'STRICT').optional().messages({
      'any.only': 'ContentFilter debe ser: NONE, MODERATE o STRICT',
      'string.base': 'ContentFilter debe ser texto'
    }),
    
    // ? NUEVAS: Configuraciones específicas para clientes
    pointsNotifications: Joi.boolean().optional().messages({
      'boolean.base': 'PointsNotifications debe ser verdadero o falso'
    }),
    dailyLoginReminders: Joi.boolean().optional().messages({
      'boolean.base': 'DailyLoginReminders debe ser verdadero o falso'
    }),
    premiumExpiryNotifications: Joi.boolean().optional().messages({
      'boolean.base': 'PremiumExpiryNotifications debe ser verdadero o falso'
    }),
    lowPointsWarning: Joi.boolean().optional().messages({
      'boolean.base': 'LowPointsWarning debe ser verdadero o falso'
    }),
    
    // Preferencias de búsqueda
    preferredAgeRange: Joi.object({
      min: Joi.number().integer().min(18).max(80).messages({
        'number.base': 'Min age debe ser un número',
        'number.integer': 'Min age debe ser un número entero',
        'number.min': 'Min age debe ser mayor a 18',
        'number.max': 'Min age debe ser menor a 80'
      }),
      max: Joi.number().integer().min(18).max(80).messages({
        'number.base': 'Max age debe ser un número',
        'number.integer': 'Max age debe ser un número entero',
        'number.min': 'Max age debe ser mayor a 18',
        'number.max': 'Max age debe ser menor a 80'
      })
    }).optional().messages({
      'object.base': 'PreferredAgeRange debe ser un objeto'
    }),
    preferredLocation: Joi.string().max(100).allow('', null).optional().messages({
      'string.max': 'PreferredLocation no puede exceder 100 caracteres',
      'string.base': 'PreferredLocation debe ser texto'
    }),
    
    // ? NUEVO: Preferencia de sexo en configuraciones de usuario
    preferredSexo: Joi.array().items(
      Joi.string().valid(...VALID_SEXO_VALUES)
    ).max(4).optional().messages({
      'array.base': 'PreferredSexo debe ser una lista',
      'array.max': 'Máximo 4 preferencias de sexo',
      'any.only': `Cada preferencia debe ser una de: ${VALID_SEXO_VALUES.join(', ')}`
    }),
    
    searchRadius: Joi.number().integer().min(1).max(100).optional().messages({
      'number.base': 'SearchRadius debe ser un número',
      'number.integer': 'SearchRadius debe ser un número entero',
      'number.min': 'SearchRadius debe ser mayor a 1',
      'number.max': 'SearchRadius debe ser menor a 100'
    }),
    
    // Configuraciones de chat
    autoReplyEnabled: Joi.boolean().optional().messages({
      'boolean.base': 'AutoReplyEnabled debe ser verdadero o falso'
    }),
    autoReplyMessage: Joi.string().max(200).trim().allow('', null).optional().messages({
      'string.max': 'AutoReplyMessage no puede exceder 200 caracteres',
      'string.base': 'AutoReplyMessage debe ser texto'
    }),
    blockUnverifiedUsers: Joi.boolean().optional().messages({
      'boolean.base': 'BlockUnverifiedUsers debe ser verdadero o falso'
    }),
    requirePointsForMessages: Joi.boolean().optional().messages({
      'boolean.base': 'RequirePointsForMessages debe ser verdadero o falso'
    })
  });

  const { error, value } = schema.validate(req.body, { 
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(err => ({
      field: err.path.join('.'),
      message: getCustomErrorMessage(err),
      value: err.context?.value
    }));

    return next(new AppError('Error de validación en configuraciones', 400, 'VALIDATION_ERROR', errors));
  }

  req.validatedData = value;
  next();
};

const validateAuth = (req, res, next) => {
  const { action } = req.params;
  
  let schema;
  
  switch (action) {
    case 'register':
      // ? SCHEMA SIMPLIFICADO PARA REGISTRO
      schema = Joi.object({
        email: Joi.string().email().required().messages({
          'string.email': 'Debe ser un email válido',
          'any.required': 'El email es requerido',
          'string.base': 'El email debe ser texto'
        }),
        password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required().messages({
          'string.min': 'La contraseña debe tener al menos 8 caracteres',
          'string.pattern.base': 'La contraseña debe tener mayúscula, minúscula y número',
          'any.required': 'La contraseña es requerida',
          'string.base': 'La contraseña debe ser texto'
        }),
        firstName: Joi.string().min(2).max(50).trim().required().messages({
          'string.min': 'El nombre debe tener al menos 2 caracteres',
          'string.max': 'El nombre no puede exceder 50 caracteres',
          'any.required': 'El nombre es requerido',
          'string.base': 'El nombre debe ser texto'
        }),
        userType: Joi.string().valid('ESCORT', 'AGENCY', 'CLIENT').required().messages({
          'any.only': 'El tipo de usuario debe ser ESCORT, AGENCY o CLIENT',
          'any.required': 'El tipo de usuario es requerido',
          'string.base': 'El tipo de usuario debe ser texto'
        })
      });
      break;
      
    case 'login':
      schema = Joi.object({
        email: Joi.string().email().required().messages({
          'string.email': 'Debe ser un email válido',
          'any.required': 'El email es requerido',
          'string.base': 'El email debe ser texto'
        }),
        password: Joi.string().required().messages({
          'any.required': 'La contraseña es requerida',
          'string.base': 'La contraseña debe ser texto'
        }),
        rememberMe: Joi.boolean().default(false).messages({
          'boolean.base': 'RememberMe debe ser verdadero o falso'
        })
      });
      break;
      
    case 'forgot-password':
      schema = Joi.object({
        email: Joi.string().email().required().messages({
          'string.email': 'Debe ser un email válido',
          'any.required': 'El email es requerido',
          'string.base': 'El email debe ser texto'
        })
      });
      break;
      
    case 'reset-password':
      schema = Joi.object({
        token: Joi.string().required().messages({
          'any.required': 'El token es requerido',
          'string.base': 'El token debe ser texto'
        }),
        password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required().messages({
          'string.min': 'La contraseña debe tener al menos 8 caracteres',
          'string.pattern.base': 'La contraseña debe tener mayúscula, minúscula y número',
          'any.required': 'La contraseña es requerida',
          'string.base': 'La contraseña debe ser texto'
        })
      });
      break;
      
    case 'change-password':
      schema = Joi.object({
        currentPassword: Joi.string().required().messages({
          'any.required': 'La contraseña actual es requerida',
          'string.base': 'La contraseña actual debe ser texto'
        }),
        newPassword: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required().messages({
          'string.min': 'La nueva contraseña debe tener al menos 8 caracteres',
          'string.pattern.base': 'La nueva contraseña debe tener mayúscula, minúscula y número',
          'any.required': 'La nueva contraseña es requerida',
          'string.base': 'La nueva contraseña debe ser texto'
        })
      });
      break;
      
    default:
      return next();
  }

  const { error, value } = schema.validate(req.body, { 
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(err => ({
      field: err.path.join('.'),
      message: getCustomErrorMessage(err),
      value: err.context?.value
    }));

    return next(new AppError('Error de validación', 400, 'VALIDATION_ERROR', errors));
  }

  req.validatedData = value;
  next();
};

// ============================================================================
// ?? UTILIDADES Y HELPERS - MEJORADAS CON SEXO
// ============================================================================

// ? FUNCIÓN validateUser - MEJORADA CON VALIDACIONES ROBUSTAS
const validateUser = (req, res, next) => {
  console.log('?? VALIDANDO USUARIO:', {
    userId: req.user?.id,
    userType: req.user?.userType,
    isActive: req.user?.isActive,
    hasUser: !!req.user
  });

  if (!req.user || !req.user.id) {
    console.log('? Usuario no válido o no autenticado');
    return next(new AppError('Usuario no válido o no autenticado', 401, 'INVALID_USER'));
  }
  
  if (typeof req.user.id !== 'string' || req.user.id.trim() === '') {
    console.log('? ID de usuario inválido:', req.user.id);
    return next(new AppError('ID de usuario inválido', 401, 'INVALID_USER_ID'));
  }
  
  if (req.user.isActive === false) {
    console.log('? Usuario inactivo:', req.user.id);
    return next(new AppError('Usuario inactivo', 403, 'USER_INACTIVE'));
  }

  const validUserTypes = ['ESCORT', 'AGENCY', 'CLIENT', 'ADMIN'];
  if (!validUserTypes.includes(req.user.userType)) {
    console.log('? Tipo de usuario inválido:', req.user.userType);
    return next(new AppError('Tipo de usuario inválido', 403, 'INVALID_USER_TYPE'));
  }

  console.log('? Usuario válido:', req.user.username || req.user.id);
  next();
};

// ? HELPER: Mensajes de error personalizados - COMPLETAMENTE ACTUALIZADO CON SEXO
const getCustomErrorMessage = (error) => {
  const { type, context } = error;
  
  // ? MENSAJES ESPECÍFICOS PARA CAMPO SEXO
  if (context && context.key === 'sexo') {
    switch (type) {
      case 'any.required':
        return 'El sexo es obligatorio';
      case 'any.only':
        return `El sexo debe ser uno de: ${VALID_SEXO_VALUES.join(', ')}`;
      case 'string.empty':
        return 'El sexo no puede estar vacío';
      default:
        return `Valor de sexo inválido. Debe ser uno de: ${VALID_SEXO_VALUES.join(', ')}`;
    }
  }
  
  switch (type) {
    case 'string.email':
      return 'Debe ser un email válido';
    case 'string.min':
      return `Debe tener al menos ${context.limit} caracteres`;
    case 'string.max':
      return `No puede exceder ${context.limit} caracteres`;
    case 'string.empty':
      return 'Este campo no puede estar vacío';
    case 'string.base':
      return 'Debe ser texto válido';
    case 'string.pattern.base':
      if (context.key === 'password') {
        return 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número';
      }
      if (context.key === 'phone') {
        return 'Debe ser un número de teléfono válido';
      }
      return 'Formato no válido';
    case 'number.base':
      return 'Debe ser un número válido';
    case 'number.integer':
      return 'Debe ser un número entero';
    case 'number.min':
      return `Debe ser mayor o igual a ${context.limit}`;
    case 'number.max':
      return `Debe ser menor o igual a ${context.limit}`;
    case 'number.positive':
      return 'Debe ser un número positivo';
    case 'boolean.base':
      return 'Debe ser verdadero o falso';
    case 'array.base':
      return 'Debe ser una lista/array';
    case 'array.max':
      return `No puede tener más de ${context.limit} elementos`;
    case 'object.base':
      return 'Debe ser un objeto válido';
    case 'any.required':
      return 'Este campo es requerido';
    case 'any.only':
      return `El valor debe ser uno de: ${context.valids.join(', ')}`;
    case 'any.invalid':
      if (context.invalids && context.invalids.includes(0)) {
        return 'El valor no puede ser 0';
      }
      return 'Valor inválido';
    case 'string.uri':
      return 'Debe ser una URL válida';
    case 'string.alphanum':
      return 'Solo puede contener letras y números';
    case 'date.format':
      return 'Formato de fecha inválido';
    case 'date.greater':
      return 'La fecha debe ser futura';
    case 'date.min':
      return 'La fecha debe ser posterior a la fecha de inicio';
    case 'alternatives.match':
      return 'El formato proporcionado no es válido';
    default:
      return error.message || 'Valor inválido';
  }
};

// ? HELPER: Validación de ID de MongoDB/Prisma - MEJORADA
const validateId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return next(new AppError('ID es requerido', 400, 'ID_REQUIRED'));
    }
    
    // Validación básica de formato de ID (ajustar según tu sistema)
    if (!/^[a-zA-Z0-9_-]{20,30}$/.test(id)) {
      return next(new AppError('Formato de ID inválido', 400, 'INVALID_ID_FORMAT'));
    }
    
    next();
  };
};

// ? HELPER: Validación específica para clientes (solo para rutas de puntos) - MEJORADA
const validateClientOnly = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Usuario no autenticado', 401, 'UNAUTHENTICATED'));
  }

  if (req.user.userType !== 'CLIENT') {
    return next(new AppError('Esta función es solo para clientes', 403, 'CLIENT_ONLY'));
  }

  if (!req.user.client) {
    return next(new AppError('Datos de cliente no encontrados', 500, 'CLIENT_DATA_MISSING'));
  }

  next();
};

// ? HELPER: Validación específica para administradores - MEJORADA
const validateAdminOnly = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Usuario no autenticado', 401, 'UNAUTHENTICATED'));
  }

  if (req.user.userType !== 'ADMIN') {
    return next(new AppError('Esta función es solo para administradores', 403, 'ADMIN_ONLY'));
  }

  if (!req.user.admin) {
    return next(new AppError('Datos de administrador no encontrados', 500, 'ADMIN_DATA_MISSING'));
  }

  next();
};

// ? HELPER: Validación específica para escorts - NUEVA
const validateEscortOnly = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Usuario no autenticado', 401, 'UNAUTHENTICATED'));
  }

  if (req.user.userType !== 'ESCORT') {
    return next(new AppError('Esta función es solo para escorts', 403, 'ESCORT_ONLY'));
  }

  if (!req.user.escort) {
    return next(new AppError('Datos de escort no encontrados', 500, 'ESCORT_DATA_MISSING'));
  }

  next();
};

// ? HELPER: Validación específica para agencias - NUEVA
const validateAgencyOnly = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Usuario no autenticado', 401, 'UNAUTHENTICATED'));
  }

  if (req.user.userType !== 'AGENCY') {
    return next(new AppError('Esta función es solo para agencias', 403, 'AGENCY_ONLY'));
  }

  if (!req.user.agency) {
    return next(new AppError('Datos de agencia no encontrados', 500, 'AGENCY_DATA_MISSING'));
  }

  next();
};

// ? HELPER: Validación de archivos - NUEVA
const validateFileUpload = (maxSize = 5 * 1024 * 1024, allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']) => {
  return (req, res, next) => {
    console.log('?? VALIDANDO ARCHIVOS:', {
      hasFiles: !!req.files,
      filesCount: req.files ? req.files.length : 0,
      hasUploadedFiles: !!req.uploadedFiles,
      uploadedFilesKeys: req.uploadedFiles ? Object.keys(req.uploadedFiles) : []
    });

    // Si no hay archivos, continuar (puede ser opcional)
    if (!req.files && !req.uploadedFiles) {
      return next();
    }

    // Validar archivos en req.files
    if (req.files) {
      for (let file of req.files) {
        if (file.size > maxSize) {
          const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
          return next(new AppError(`El archivo ${file.originalname} es muy grande. Máximo: ${maxSizeMB}MB`, 400, 'FILE_TOO_LARGE'));
        }

        if (!allowedTypes.includes(file.mimetype)) {
          return next(new AppError(`Tipo de archivo no permitido: ${file.mimetype}. Permitidos: ${allowedTypes.join(', ')}`, 400, 'INVALID_FILE_TYPE'));
        }
      }
    }

    console.log('? Archivos validados correctamente');
    next();
  };
};

// ? NUEVA: Función helper para validar campo sexo en cualquier contexto
const validateSexoField = (sexo, required = false) => {
  if (required && (!sexo || sexo.trim() === '')) {
    return {
      isValid: false,
      error: 'El sexo es obligatorio'
    };
  }

  if (sexo && !VALID_SEXO_VALUES.includes(sexo.trim())) {
    return {
      isValid: false,
      error: `El sexo debe ser uno de: ${VALID_SEXO_VALUES.join(', ')}`
    };
  }

  return {
    isValid: true,
    value: sexo ? sexo.trim() : null
  };
};

// ? NUEVA: Función helper para validar múltiples campos relacionados con posts
const validatePostFields = (data) => {
  const errors = {};

  // Validar sexo
  const sexoValidation = validateSexoField(data.sexo, true);
  if (!sexoValidation.isValid) {
    errors.sexo = sexoValidation.error;
  }

  // Validar edad
  if (!data.age || data.age < 18 || data.age > 80) {
    errors.age = 'La edad debe estar entre 18 y 80 años';
  }

  // Validar ubicación
  if (!data.location || data.location.trim() === '') {
    errors.location = 'La ubicación es obligatoria';
  } else if (data.location.trim().length < 3) {
    errors.location = 'La ubicación debe tener al menos 3 caracteres';
  }

  // Validar servicios
  if (data.services && Array.isArray(data.services) && data.services.length > 3) {
    errors.services = 'Máximo 3 servicios permitidos';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// ============================================================================
// ?? EXPORTS COMPLETOS - TODAS LAS FUNCIONES INCLUIDAS Y MEJORADAS CON SEXO
// ============================================================================

module.exports = {
  // ? Funciones de auth MEJORADAS
  validateRegistration,   
  validateAgencyRegistration,
  validateLogin,          
  validatePasswordReset,  
  
  // ? NUEVAS: Funciones específicas para sistema de puntos
  validatePointsPurchase,
  validatePointsSpend,
  validatePremiumActivation,
  validateAdminPointsAdjustment,
  
  // Funciones de pagos MEJORADAS
  validateBoostPayment,
  validateVerificationPayment,
  validatePremiumPayment,
  
  // Funciones principales MEJORADAS CON SEXO
  validateUpdateProfile,  
  validatePagination,     
  validateCreatePost,     // ? ACTUALIZADA CON CAMPO SEXO OBLIGATORIO
  validateUserSettings,   
  validateAuth,           
  validateUser,
  validateChatMessage,
  
  // ? HELPERS específicos MEJORADOS Y NUEVOS
  validateId,             
  validateClientOnly,
  validateAdminOnly,
  validateEscortOnly,     
  validateAgencyOnly,     
  validateFileUpload,     
  getCustomErrorMessage,
  
  // ? NUEVAS: Funciones específicas para validación de sexo
  validateSexoField,      // ? NUEVA: Validar campo sexo individualmente
  validatePostFields,     // ? NUEVA: Validar campos completos de post
  
  // ? NUEVA: Constante exportada para usar en otros módulos
  VALID_SEXO_VALUES       // ? NUEVA: Valores válidos de sexo exportados
};