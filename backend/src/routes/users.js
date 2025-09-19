const express = require('express');
const multer = require('multer');
const router = express.Router();

// ✅ MIDDLEWARES DE AUTENTICACIÓN OPTIMIZADOS
const { 
  authenticate,
  requireUserType, 
  requireOwnership, 
  checkClientLimits
} = require('../middleware/auth');

// ✅ VALIDACIONES SIMPLIFICADAS
const { 
  validateUpdateProfile, 
  validatePagination
} = require('../middleware/validation');

// ✅ CONTROLLERS - VERIFICANDO QUE TODAS LAS FUNCIONES EXISTEN
const {
  getUserProfile,
  updateUserProfile,
  uploadProfilePicture,
  deleteProfilePicture,
  getUserById,
  searchUsers,
  getDiscoverUsers,
  getTrendingUsers,
  getUserStats,
  blockUser,
  unblockUser,
  getBlockedUsers,
  updateUserSettings,
  getUserSettings,
  deleteUserAccount,
  reportUser,
  getCloudinaryStats
} = require('../controllers/userController');

// ✅ MIDDLEWARE SIMPLIFICADO PARA VALIDACIÓN DE USUARIO
const validateUserAuth = [authenticate];

// ✅ CONFIGURACIÓN DE MULTER PARA AVATARS CON LÍMITES OPTIMIZADOS
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 3 * 1024 * 1024, // 3MB para avatars
    files: 1
  }
});

const uploadAvatar = upload.single('avatar');

// ✅ MIDDLEWARE MEJORADO PARA PROCESAR AVATAR EN CLOUDINARY CON MANEJO DE TIMEOUTS
const processAvatarCloudinary = async (req, res, next) => {
  try {
    console.log('☁️ === PROCESSING AVATAR CLOUDINARY (TIMEOUT-RESISTANT) ===');
    
    if (!req.file) {
      console.log('ℹ️ No file to process, skipping...');
      return next();
    }

    // ✅ VALIDACIONES PREVIAS MEJORADAS
    const file = req.file;
    console.log('📤 Processing file:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      hasBuffer: !!file.buffer
    });

    // Validar que es una imagen
    if (!file.mimetype.startsWith('image/')) {
      const error = new Error('El archivo debe ser una imagen válida');
      error.statusCode = 400;
      error.code = 'INVALID_FILE_TYPE';
      return next(error);
    }

    // Validar tamaño (3MB máximo para avatars)
    const maxSize = 3 * 1024 * 1024; // 3MB
    if (file.size > maxSize) {
      const error = new Error('La imagen es muy grande. Máximo 3MB permitido.');
      error.statusCode = 400;
      error.code = 'FILE_TOO_LARGE';
      return next(error);
    }

    // ✅ IMPORTAR SERVICIO DE UPLOAD CON MANEJO DE ERRORES
    const { uploadToCloudinary, compressImageBeforeUpload } = require('../services/uploadService');

    // ✅ COMPRIMIR IMAGEN ANTES DE SUBIR (CRÍTICO PARA AVATARS)
    let processedFile = file;
    if (file.size > 800 * 1024) { // > 800KB
      console.log('📦 Compressing avatar before upload...');
      try {
        const compressedBuffer = await compressImageBeforeUpload(file.buffer, 600 * 1024); // Comprimir a 600KB max
        processedFile = {
          ...file,
          buffer: compressedBuffer,
          size: compressedBuffer.length
        };
        console.log('📦 Avatar compressed:', {
          originalSize: file.size,
          compressedSize: compressedBuffer.length,
          reduction: Math.round((1 - compressedBuffer.length / file.size) * 100) + '%'
        });
      } catch (compressionError) {
        console.log('⚠️ Compression failed, using original:', compressionError.message);
        // Continuar con archivo original
      }
    }

    // ✅ OPCIONES OPTIMIZADAS PARA AVATARS CON TIMEOUT EXTENDIDO
    const cloudinaryOptions = {
      folder: 'telofundi/avatars',
      type: 'avatar',
      userId: req.user?.id,
      generateVariations: false,
      public_id: `avatar_${req.user?.id}_${Date.now()}`,
      overwrite: true,
      // ✅ TRANSFORMACIÓN SIMPLIFICADA PARA EVITAR PROBLEMAS
      transformation: [
        {
          width: 400,
          height: 400,
          crop: 'fill',
          gravity: 'face',
          quality: 'auto:good',
          format: 'webp',
          fetch_format: 'auto'
        }
      ],
      // ✅ CONFIGURACIONES ADICIONALES PARA ESTABILIDAD
      timeout: 180000, // 3 minutos timeout
      eager_async: false,
      invalidate: false
    };

    console.log('📤 Uploading avatar with options:', {
      folder: cloudinaryOptions.folder,
      userId: cloudinaryOptions.userId,
      publicId: cloudinaryOptions.public_id,
      fileSize: processedFile.size,
      timeout: cloudinaryOptions.timeout
    });

    // ✅ SUBIR CON MANEJO COMPLETO DE PROMESAS Y TIMEOUTS
    const uploadResult = await new Promise((resolve, reject) => {
      // ✅ TIMEOUT MANUAL COMO BACKUP
      const timeoutId = setTimeout(() => {
        reject(new Error('Timeout manual: La subida del avatar tardó más de 4 minutos'));
      }, 240000); // 4 minutos timeout manual

      uploadToCloudinary(processedFile, cloudinaryOptions)
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });

    // ✅ CREAR req.uploadedFile PARA EL CONTROLLER
    req.uploadedFile = uploadResult;

    console.log('✅ Avatar uploaded successfully:', {
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      bytes: uploadResult.bytes,
      format: uploadResult.format
    });

    next();

  } catch (error) {
    console.error('❌ Avatar Cloudinary upload error:', error);
    
    // ✅ MANEJO ESPECÍFICO DE ERRORES DE TIMEOUT
    if (error.message.includes('timeout') || error.message.includes('Timeout') || error.name === 'TimeoutError') {
      console.error('❌ TIMEOUT ERROR detected in avatar upload');
      req.uploadError = 'La subida del avatar tardó demasiado tiempo. Intenta con una imagen más pequeña o verifica tu conexión.';
    } else if (error.message.includes('Invalid image file')) {
      req.uploadError = 'Archivo de imagen inválido o corrupto. Verifica que el archivo no esté dañado.';
    } else if (error.message.includes('File size too large')) {
      req.uploadError = 'La imagen es demasiado grande. Máximo 3MB permitido.';
    } else {
      req.uploadError = error.message || 'Error subiendo avatar. Intenta de nuevo.';
    }

    console.error('❌ Setting upload error:', req.uploadError);
    
    // ✅ NO HACER next(error) - continuar al controller para manejar el error apropiadamente
    next();
  }
};

/**
 * @swagger
 * components:
 *   schemas:
 *     UserProfile:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         username:
 *           type: string
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         avatar:
 *           type: string
 *           nullable: true
 *         userType:
 *           type: string
 *           enum: [ESCORT, AGENCY, CLIENT, ADMIN]
 *         profileViews:
 *           type: integer
 *         isActive:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Obtener perfil del usuario autenticado
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.get('/profile', validateUserAuth, getUserProfile);

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Actualizar perfil del usuario
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.put('/profile', 
  validateUserAuth, 
  validateUpdateProfile, 
  updateUserProfile
);

/**
 * @swagger
 * /api/users/profile/picture:
 *   post:
 *     summary: Subir foto de perfil
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: Archivo de imagen (JPG, PNG, GIF, WebP) - Máximo 3MB
 */
// ✅ RUTA CORREGIDA CON MIDDLEWARE DE CLOUDINARY MEJORADO
router.post('/profile/picture', 
  validateUserAuth,         // Autenticación
  uploadAvatar,             // Multer - procesar archivo
  processAvatarCloudinary,  // ✅ MEJORADO: Cloudinary con manejo de timeouts
  uploadProfilePicture      // Controller
);

/**
 * @swagger
 * /api/users/profile/picture:
 *   delete:
 *     summary: Eliminar foto de perfil
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/profile/picture', validateUserAuth, deleteProfilePicture);

/**
 * @swagger
 * /api/users/search:
 *   get:
 *     summary: Buscar usuarios
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.get('/search', 
  validateUserAuth, 
  validatePagination, 
  searchUsers
);

/**
 * @swagger
 * /api/users/discover:
 *   get:
 *     summary: Obtener usuarios recomendados
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.get('/discover', 
  validateUserAuth, 
  validatePagination, 
  getDiscoverUsers
);

/**
 * @swagger
 * /api/users/trending:
 *   get:
 *     summary: Obtener usuarios en tendencia
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.get('/trending', 
  validateUserAuth, 
  validatePagination, 
  getTrendingUsers
);

/**
 * @swagger
 * /api/users/stats:
 *   get:
 *     summary: Obtener estadísticas del usuario
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.get('/stats', validateUserAuth, getUserStats);

/**
 * @swagger
 * /api/users/blocked:
 *   get:
 *     summary: Obtener lista de usuarios bloqueados
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.get('/blocked', 
  validateUserAuth, 
  validatePagination, 
  getBlockedUsers
);

/**
 * @swagger
 * /api/users/settings:
 *   get:
 *     summary: Obtener configuraciones del usuario
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.get('/settings', validateUserAuth, getUserSettings);

/**
 * @swagger
 * /api/users/settings:
 *   put:
 *     summary: Actualizar configuraciones del usuario
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.put('/settings', validateUserAuth, updateUserSettings);

/**
 * @swagger
 * /api/users/cloudinary/stats:
 *   get:
 *     summary: Obtener estadísticas de uso de Cloudinary (Solo Admins)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.get('/cloudinary/stats', 
  requireUserType('ADMIN'), 
  getCloudinaryStats
);

/**
 * @swagger
 * /api/users/account:
 *   delete:
 *     summary: Eliminar cuenta de usuario
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/account', validateUserAuth, deleteUserAccount);

/**
 * @swagger
 * /api/users/{userId}:
 *   get:
 *     summary: Obtener perfil público de un usuario
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:userId', 
  validateUserAuth, 
  checkClientLimits, 
  getUserById
);

/**
 * @swagger
 * /api/users/{userId}/block:
 *   post:
 *     summary: Bloquear usuario
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:userId/block', validateUserAuth, blockUser);

/**
 * @swagger
 * /api/users/{userId}/unblock:
 *   delete:
 *     summary: Desbloquear usuario
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:userId/unblock', validateUserAuth, unblockUser);

/**
 * @swagger
 * /api/users/{userId}/report:
 *   post:
 *     summary: Reportar usuario
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:userId/report', validateUserAuth, reportUser);

// ✅ MANEJO DE ERRORES DE MULTER MEJORADO PARA AVATARS
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: 'Avatar muy grande. Máximo 3MB permitido.',
          errorCode: 'FILE_TOO_LARGE',
          details: 'Comprime la imagen e inténtalo de nuevo'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Solo se permite una imagen para el avatar',
          errorCode: 'TOO_MANY_FILES'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: 'Campo de archivo incorrecto. Usa "avatar" para subir la imagen.',
          errorCode: 'UNEXPECTED_FIELD'
        });
      default:
        return res.status(400).json({
          success: false,
          message: 'Error procesando el avatar',
          errorCode: 'UPLOAD_ERROR',
          details: error.message
        });
    }
  }

  if (error.message && error.message.includes('Tipo de archivo no permitido')) {
    return res.status(400).json({
      success: false,
      message: 'Tipo de archivo no permitido para avatar. Solo se aceptan imágenes JPG, PNG, GIF o WebP.',
      errorCode: 'INVALID_FILE_TYPE',
      allowedTypes: ['JPG', 'JPEG', 'PNG', 'GIF', 'WebP']
    });
  }

  next(error);
});

// ✅ TEST CLOUDINARY PÚBLICO MEJORADO
router.get('/test/cloudinary-public', async (req, res) => {
  try {
    const { testCloudinaryConnection } = require('../services/uploadService');
    const testResult = await testCloudinaryConnection();
    
    if (testResult.success) {
      res.json({
        success: true,
        message: '✅ Cloudinary funcionando perfectamente!',
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        status: 'connected',
        ping: testResult.result,
        timeout: '180s configured'
      });
    } else {
      res.json({
        success: false,
        message: '❌ Error conectando a Cloudinary',
        error: testResult.error,
        errorCode: testResult.errorCode
      });
    }
  } catch (error) {
    res.json({
      success: false,
      message: '❌ Error en test de Cloudinary',
      error: error.message
    });
  }
});

console.log('✅ Users routes configured with IMPROVED timeout-resistant Cloudinary functionality');

module.exports = router;