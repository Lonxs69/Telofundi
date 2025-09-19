const express = require('express');
const multer = require('multer');
const router = express.Router();

// Middlewares
const { authenticate, authenticateOptional } = require('../middleware/auth'); // ✅ IMPORTAR AMBOS
const { validateUser } = require('../middleware/validation');

// Controllers
const {
  createPost,
  checkPostLimits,
  getFeed,
  getTrendingPosts,
  getDiscoveryPosts,
  getPostById,
  updatePost,
  deletePost,
  likePost,
  toggleFavorite,
  getMyPosts,
  // ✅ NUEVAS FUNCIONES DE PAGO
  createAdditionalPostPayment,
  confirmAdditionalPostPayment,
  createBoostPayment,
  confirmBoostPayment
} = require('../controllers/postController');

// ===================================================================
// 🔧 MULTER CONFIGURATION - OPTIMIZADO
// ===================================================================

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}. Solo se permiten: JPG, PNG, GIF, WebP`), false);
  }
};

// ✅ Configuración de multer simplificada
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 8 * 1024 * 1024, // 8MB por imagen
    files: 5 // Máximo 5 imágenes
  }
});

const uploadPostImages = upload.array('images', 5);

// ===================================================================
// 🔧 MIDDLEWARE OPTIMIZADO PARA CLOUDINARY
// ===================================================================

const processCloudinary = async (req, res, next) => {
  try {
    // Si no hay archivos, continuar
    if (!req.files || req.files.length === 0) {
      return next();
    }

    const { uploadMultipleToCloudinary } = require('../services/uploadService');

    // ✅ Opciones de Cloudinary optimizadas
    const cloudinaryOptions = {
      folder: 'telofundi/posts',
      userId: req.user?.id,
      generateVariations: true,
      tags: ['post', 'telofundi'],
      context: { userId: req.user?.id }
    };

    if (process.env.NODE_ENV === 'development') {
      console.log('☁️ Uploading to Cloudinary:', {
        filesCount: req.files.length,
        userId: req.user?.id
      });
    }

    const uploadResult = await uploadMultipleToCloudinary(req.files, cloudinaryOptions);
    
    if (uploadResult.totalUploaded === 0) {
      throw new Error('No se pudo subir ningún archivo a Cloudinary');
    }

    req.uploadedFiles = uploadResult.successful;
    req.failedUploads = uploadResult.failed;

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Cloudinary upload completed:', {
        successful: uploadResult.totalUploaded,
        failed: uploadResult.totalFailed
      });
    }

    next();

  } catch (error) {
    console.error('❌ Cloudinary upload error:', error);
    req.uploadError = error.message;
    next(); // Continuar sin bloquear
  }
};

// ✅ Debug middleware condicional
const debugMulter = process.env.NODE_ENV === 'development' ? (req, res, next) => {
  console.log('🔍 POST Request Debug:', {
    url: req.originalUrl,
    method: req.method,
    contentType: req.get('content-type'),
    hasUser: !!req.user,
    userId: req.user?.id,
    bodyKeys: Object.keys(req.body || {}),
    hasFiles: !!req.files
  });
  next();
} : (req, res, next) => next();

// ===================================================================
// 📚 SWAGGER DOCUMENTATION OPTIMIZADA
// ===================================================================

/**
 * @swagger
 * components:
 *   schemas:
 *     Post:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "cm123abc456"
 *         title:
 *           type: string
 *           example: "Servicios de acompañamiento VIP"
 *         description:
 *           type: string
 *           example: "Ofrezco servicios de alta calidad..."
 *         images:
 *           type: array
 *           items:
 *             type: string
 *           example: ["https://res.cloudinary.com/telofundi/image/upload/v1234567890/telofundi/posts/post_1.webp"]
 *         phone:
 *           type: string
 *           example: "+1829555-1234"
 *         age:
 *           type: integer
 *           minimum: 18
 *           maximum: 80
 *           example: 25
 *         location:
 *           type: string
 *           example: "Santo Domingo, República Dominicana"
 *         sexo:
 *           type: string
 *           enum: ["Hombre", "Mujer", "Trans", "Otro"]
 *           example: "Mujer"
 *         services:
 *           type: array
 *           items:
 *             type: string
 *           maxItems: 3
 *           example: ["Masajes", "Compañía", "Cenas"]
 *         premiumOnly:
 *           type: boolean
 *           example: false
 *         isBoostActive:
 *           type: boolean
 *           example: true
 *           description: "Si el post tiene boost activo"
 *         boostAmount:
 *           type: number
 *           example: 50.00
 *           description: "Cantidad invertida en boost"
 *         author:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             username:
 *               type: string
 *             avatar:
 *               type: string
 *         likesCount:
 *           type: integer
 *           example: 15
 *         viewsCount:
 *           type: integer
 *           example: 120
 *         isLiked:
 *           type: boolean
 *           example: false
 *         isFavorited:
 *           type: boolean
 *           example: false
 *         createdAt:
 *           type: string
 *           format: date-time
 *     
 *     PaymentIntent:
 *       type: object
 *       properties:
 *         paymentId:
 *           type: string
 *           example: "pay_123abc"
 *         clientSecret:
 *           type: string
 *           example: "pi_1234567890_secret_abcdef"
 *         amount:
 *           type: number
 *           example: 1.00
 *         currency:
 *           type: string
 *           example: "USD"
 *         description:
 *           type: string
 *           example: "Anuncio adicional - Servicios VIP"
 */

// ===================================================================
// 🌐 RUTAS PÚBLICAS (CORREGIDAS - AUTENTICACIÓN OPCIONAL)
// ===================================================================

/**
 * @swagger
 * /api/posts/feed:
 *   get:
 *     summary: Obtener feed de posts con BOOSTS PRIORIZADOS (ACCESIBLE PARA TODOS)
 *     tags: [Posts]
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
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [recent, trending, popular, boosted]
 *           default: recent
 *         description: "NUEVO: 'boosted' prioriza posts con boost activo"
 *       - in: query
 *         name: tabType
 *         schema:
 *           type: string
 *           enum: [premium, regular, overview]
 *         description: "NUEVO: Tipo de contenido (premium requiere acceso)"
 *       - in: query
 *         name: sexo
 *         schema:
 *           type: string
 *           enum: ["Hombre", "Mujer", "Trans", "Otro"]
 *         description: "Filtrar por sexo del anunciante"
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filtrar por ubicación
 *       - in: query
 *         name: userType
 *         schema:
 *           type: string
 *           enum: [ESCORT, AGENCY, CLIENT]
 *         description: Filtrar por tipo de usuario
 *       - in: query
 *         name: services
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: Filtrar por servicios
 *       - in: query
 *         name: minAge
 *         schema:
 *           type: integer
 *           minimum: 18
 *       - in: query
 *         name: maxAge
 *         schema:
 *           type: integer
 *           maximum: 80
 *       - in: query
 *         name: verified
 *         schema:
 *           type: boolean
 *         description: Solo usuarios verificados
 *     responses:
 *       200:
 *         description: Feed de posts (BOOSTS APARECEN PRIMERO) - ACCESIBLE PARA TODOS
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     posts:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Post'
 *                     pagination:
 *                       type: object
 *                     filters:
 *                       type: object
 *       403:
 *         description: Acceso premium requerido (para tabType=premium)
 */
// ✅ CORREGIDO: Usar authenticateOptional para permitir acceso a no autenticados
router.get('/feed', authenticateOptional, getFeed);

/**
 * @swagger
 * /api/posts/trending:
 *   get:
 *     summary: Posts en tendencia (SIMPLIFICADO - Solo boosts + likes) - ACCESIBLE PARA TODOS
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: ["1h", "6h", "24h", "7d"]
 *           default: "24h"
 *         description: "Marco temporal (por compatibilidad)"
 *       - in: query
 *         name: sexo
 *         schema:
 *           type: string
 *           enum: ["Hombre", "Mujer", "Trans", "Otro"]
 *         description: "Filtrar trending por sexo"
 *       - in: query
 *         name: tabType
 *         schema:
 *           type: string
 *           enum: [premium, regular]
 *         description: "Tipo de contenido trending"
 *     responses:
 *       200:
 *         description: Posts trending (BOOSTS PRIMERO, luego por LIKES) - ACCESIBLE PARA TODOS
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
 *                     posts:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Post'
 *                     algorithm:
 *                       type: string
 *                       example: "boosts_then_likes"
 *                       description: "NUEVO: Algoritmo simplificado"
 *                     stats:
 *                       type: object
 *                       properties:
 *                         totalLikes:
 *                           type: integer
 *                         postsWithBoosts:
 *                           type: integer
 *                           description: "NUEVO: Cantidad de posts con boost"
 */
// ✅ CORREGIDO: Usar authenticateOptional para permitir acceso a no autenticados
router.get('/trending', authenticateOptional, getTrendingPosts);

/**
 * @swagger
 * /api/posts/discover:
 *   get:
 *     summary: Posts para descubrir (personalizado + boosts priorizados) - SOLO AUTENTICADOS
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: algorithm
 *         schema:
 *           type: string
 *           enum: [personalized, quality, new, popular, mixed]
 *           default: personalized
 *         description: "Algoritmo de descubrimiento (BOOSTS SIEMPRE PRIMERO)"
 *       - in: query
 *         name: sexo
 *         schema:
 *           type: string
 *           enum: ["Hombre", "Mujer", "Trans", "Otro"]
 *       - in: query
 *         name: tabType
 *         schema:
 *           type: string
 *           enum: [premium, regular]
 *     responses:
 *       200:
 *         description: Posts para descubrir (personalizados si hay usuario autenticado)
 *       401:
 *         description: Autenticación requerida para contenido personalizado
 */
// ✅ CORREGIDO: Usar authenticate (requerido) para discover ya que necesita personalización
router.get('/discover', authenticate, getDiscoveryPosts);

// ===================================================================
// 🔒 RUTAS PROTEGIDAS CON PATHS ESPECÍFICOS
// ===================================================================

/**
 * @swagger
 * /api/posts/limits:
 *   get:
 *     summary: Verificar límites de posts del usuario (ACTUALIZADO - Solo 2 gratis)
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Información de límites (ACTUALIZADA)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     canCreateFreePost:
 *                       type: boolean
 *                     freePostsRemaining:
 *                       type: integer
 *                     totalPosts:
 *                       type: integer
 *                     freePostsLimit:
 *                       type: integer
 *                       example: 2
 *                       description: "CAMBIADO: Ahora solo 2 posts gratis"
 *                     needsPayment:
 *                       type: boolean
 *                       description: "NUEVO: Si necesita pagar por el siguiente post"
 *                     additionalPostPrice:
 *                       type: number
 *                       example: 1.00
 *                       description: "NUEVO: Precio del post adicional"
 */
router.get('/limits', authenticate, validateUser, checkPostLimits);

/**
 * @swagger
 * /api/posts/my:
 *   get:
 *     summary: Obtener mis posts
 *     tags: [Posts]
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
 *           enum: [active, deleted, all]
 *           default: active
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [recent, oldest, popular, likes]
 *           default: recent
 *     responses:
 *       200:
 *         description: Lista de mis posts con estadísticas
 */
router.get('/my', authenticate, validateUser, getMyPosts);

/**
 * @swagger
 * /api/posts:
 *   post:
 *     summary: Crear nuevo post con imágenes (LIMITE: 2 gratis, luego $1 c/u)
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 100
 *                 example: "Servicios de acompañamiento VIP"
 *               description:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 2000
 *                 example: "Ofrezco servicios de alta calidad..."
 *               phone:
 *                 type: string
 *                 example: "+1829555-1234"
 *               age:
 *                 type: integer
 *                 minimum: 18
 *                 maximum: 80
 *                 example: 25
 *               location:
 *                 type: string
 *                 example: "Santo Domingo, República Dominicana"
 *               sexo:
 *                 type: string
 *                 enum: ["Hombre", "Mujer", "Trans", "Otro"]
 *                 example: "Mujer"
 *                 description: "OBLIGATORIO: Sexo del anunciante"
 *               services:
 *                 type: string
 *                 description: "JSON string - máximo 3 servicios"
 *                 example: '["Masajes", "Compañía", "Cenas"]'
 *               rates:
 *                 type: string
 *                 description: "JSON string con tarifas"
 *                 example: '{"1h": 100, "2h": 180, "overnight": 400}'
 *               availability:
 *                 type: string
 *                 description: "JSON string con disponibilidad"
 *                 example: '{"monday": ["09:00-17:00"]}'
 *               tags:
 *                 type: string
 *                 description: "JSON string con tags"
 *                 example: '["VIP", "Elegante", "Discreta"]'
 *               locationId:
 *                 type: string
 *                 example: "cm123location"
 *               premiumOnly:
 *                 type: string
 *                 enum: ["true", "false"]
 *                 example: "false"
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: "1-5 imágenes, máximo 8MB cada una"
 *             required:
 *               - title
 *               - description
 *               - phone
 *               - age
 *               - location
 *               - sexo
 *               - images
 *     responses:
 *       201:
 *         description: Post creado exitosamente
 *       400:
 *         description: Error de validación (incluyendo límite de posts)
 *       402:
 *         description: Pago requerido para post adicional ($1.00)
 */
router.post('/', 
  debugMulter,
  authenticate,
  validateUser,
  uploadPostImages,
  processCloudinary,
  createPost
);

// ===================================================================
// 💳 NUEVAS RUTAS DE PAGO - ANUNCIOS ADICIONALES
// ===================================================================

/**
 * @swagger
 * /api/posts/payment/additional:
 *   post:
 *     summary: Crear pago para anuncio adicional ($1.00)
 *     tags: [Posts, Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - postData
 *             properties:
 *               postData:
 *                 type: object
 *                 description: "Datos completos del post a crear"
 *                 properties:
 *                   title:
 *                     type: string
 *                     example: "Servicios VIP exclusivos"
 *                   description:
 *                     type: string
 *                     example: "Ofrezco servicios de la más alta calidad..."
 *                   phone:
 *                     type: string
 *                     example: "+1829555-1234"
 *                   age:
 *                     type: integer
 *                     example: 25
 *                   location:
 *                     type: string
 *                     example: "Santo Domingo, RD"
 *                   sexo:
 *                     type: string
 *                     enum: ["Hombre", "Mujer", "Trans", "Otro"]
 *                     example: "Mujer"
 *                   services:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ["Masajes", "Compañía"]
 *                   images:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ["https://cloudinary.com/image1.jpg"]
 *                   premiumOnly:
 *                     type: boolean
 *                     example: false
 *     responses:
 *       200:
 *         description: PaymentIntent creado exitosamente
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
 *                   example: "Pago para anuncio adicional iniciado"
 *                 data:
 *                   $ref: '#/components/schemas/PaymentIntent'
 *       403:
 *         description: Solo escorts pueden pagar por anuncios adicionales
 *       400:
 *         description: No necesita pagar aún o datos inválidos
 */
router.post('/payment/additional', 
  authenticate, 
  validateUser, 
  createAdditionalPostPayment
);

/**
 * @swagger
 * /api/posts/payment/additional/{paymentId}/confirm:
 *   put:
 *     summary: Confirmar pago de anuncio adicional y crear post
 *     tags: [Posts, Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del pago a confirmar
 *     responses:
 *       200:
 *         description: Pago confirmado y post creado
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
 *                   example: "Pago confirmado y anuncio creado exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     payment:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         amount:
 *                           type: number
 *                           example: 1.00
 *                         status:
 *                           type: string
 *                           example: "COMPLETED"
 *                     post:
 *                       $ref: '#/components/schemas/Post'
 *       404:
 *         description: Pago no encontrado
 *       400:
 *         description: Pago no completado en Stripe
 *       500:
 *         description: Error creando el post
 */
router.put('/payment/additional/:paymentId/confirm', 
  authenticate, 
  validateUser, 
  confirmAdditionalPostPayment
);

// ===================================================================
// 🚀 NUEVAS RUTAS DE PAGO - BOOST/PROMOCIONAR
// ===================================================================

/**
 * @swagger
 * /api/posts/payment/boost:
 *   post:
 *     summary: Crear pago para promocionar anuncio ($1.00)
 *     tags: [Posts, Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - postId
 *             properties:
 *               postId:
 *                 type: string
 *                 description: "ID del post a promocionar"
 *                 example: "cm123abc456"
 *     responses:
 *       200:
 *         description: PaymentIntent para boost creado exitosamente
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
 *                   example: "Pago para promocionar iniciado"
 *                 data:
 *                   type: object
 *                   properties:
 *                     paymentId:
 *                       type: string
 *                     clientSecret:
 *                       type: string
 *                     amount:
 *                       type: number
 *                       example: 1.00
 *                     currency:
 *                       type: string
 *                       example: "USD"
 *                     description:
 *                       type: string
 *                       example: "Promocionar anuncio - Servicios VIP..."
 *                     post:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         title:
 *                           type: string
 *       404:
 *         description: Post no encontrado o sin permisos
 *       500:
 *         description: Error procesando el pago
 */
router.post('/payment/boost', 
  authenticate, 
  validateUser, 
  createBoostPayment
);

/**
 * @swagger
 * /api/posts/payment/boost/{paymentId}/confirm:
 *   put:
 *     summary: Confirmar pago de boost y activar promoción
 *     tags: [Posts, Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del pago a confirmar
 *     responses:
 *       200:
 *         description: Pago confirmado y boost activado
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
 *                   example: "Pago confirmado y anuncio promocionado exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     payment:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         amount:
 *                           type: number
 *                           example: 1.00
 *                         status:
 *                           type: string
 *                           example: "COMPLETED"
 *                     boost:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         expiresAt:
 *                           type: string
 *                           format: date-time
 *                         isActive:
 *                           type: boolean
 *                           example: true
 *                     post:
 *                       $ref: '#/components/schemas/Post'
 *       404:
 *         description: Pago no encontrado
 *       400:
 *         description: Pago no completado en Stripe
 *       500:
 *         description: Error activando el boost
 */
router.put('/payment/boost/:paymentId/confirm', 
  authenticate, 
  validateUser, 
  confirmBoostPayment
);

// ===================================================================
// 🔧 RUTAS CON PARÁMETROS (AL FINAL)
// ===================================================================

/**
 * @swagger
 * /api/posts/{postId}:
 *   get:
 *     summary: Obtener post por ID (con boost info) - ACCESIBLE PARA TODOS
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detalles del post (incluye información de boost) - ACCESIBLE PARA TODOS
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Post'
 */
// ✅ CORREGIDO: Usar authenticateOptional para permitir acceso a no autenticados
router.get('/:postId', authenticateOptional, getPostById);

/**
 * @swagger
 * /api/posts/{postId}:
 *   put:
 *     summary: Actualizar post existente (OPTIMIZADO)
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 2000
 *               phone:
 *                 type: string
 *               age:
 *                 type: integer
 *                 minimum: 18
 *                 maximum: 80
 *               location:
 *                 type: string
 *               sexo:
 *                 type: string
 *                 enum: ["Hombre", "Mujer", "Trans", "Otro"]
 *                 description: "Si se envía, debe ser válido"
 *               services:
 *                 type: string
 *                 description: "JSON string con servicios"
 *               rates:
 *                 type: string
 *                 description: "JSON string con tarifas"
 *               availability:
 *                 type: string
 *                 description: "JSON string con disponibilidad"
 *               tags:
 *                 type: string
 *                 description: "JSON string con tags"
 *               premiumOnly:
 *                 type: string
 *                 enum: ["true", "false"]
 *               removeImages:
 *                 type: string
 *                 description: "JSON string con URLs a eliminar"
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: "Nuevas imágenes (opcional)"
 *     responses:
 *       200:
 *         description: Post actualizado exitosamente
 *       400:
 *         description: Error de validación
 *       403:
 *         description: No eres el propietario del post
 *       404:
 *         description: Post no encontrado
 */
router.put('/:postId', 
  debugMulter,
  authenticate,
  validateUser,
  uploadPostImages,
  processCloudinary,
  updatePost
);

/**
 * @swagger
 * /api/posts/{postId}:
 *   delete:
 *     summary: Eliminar post (soft delete + limpieza Cloudinary)
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Post eliminado exitosamente
 *       403:
 *         description: No eres el propietario del post
 *       404:
 *         description: Post no encontrado
 */
router.delete('/:postId', authenticate, validateUser, deletePost);

/**
 * @swagger
 * /api/posts/{postId}/like:
 *   post:
 *     summary: Dar/quitar like a un post (afecta trending)
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Like actualizado (impacta en trending score)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: "Like agregado"
 *                 data:
 *                   type: object
 *                   properties:
 *                     isLiked:
 *                       type: boolean
 *                       example: true
 *       400:
 *         description: No puedes dar like a tu propio post
 *       404:
 *         description: Post no encontrado
 */
router.post('/:postId/like', authenticate, validateUser, likePost);

/**
 * @swagger
 * /api/posts/{postId}/favorite:
 *   post:
 *     summary: Agregar/quitar de favoritos
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Favorito actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: "Agregado a favoritos"
 *                 data:
 *                   type: object
 *                   properties:
 *                     isFavorited:
 *                       type: boolean
 *                       example: true
 */
router.post('/:postId/favorite', authenticate, validateUser, toggleFavorite);

// ===================================================================
// 🚨 MIDDLEWARE DE MANEJO DE ERRORES OPTIMIZADO
// ===================================================================

router.use((error, req, res, next) => {
  console.error('🔥 Posts route error:', {
    error: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    userId: req.user?.id,
    hasUser: !!req.user
  });

  // ✅ Errores de Multer optimizados
  if (error instanceof multer.MulterError) {
    const multerErrors = {
      'LIMIT_FILE_SIZE': {
        message: 'Archivo muy grande',
        errorCode: 'FILE_TOO_LARGE',
        details: 'Máximo 8MB por imagen'
      },
      'LIMIT_FILE_COUNT': {
        message: 'Demasiados archivos',
        errorCode: 'TOO_MANY_FILES',
        details: 'Máximo 5 imágenes por post'
      },
      'LIMIT_UNEXPECTED_FILE': {
        message: 'Campo de archivo inesperado',
        errorCode: 'UNEXPECTED_FILE_FIELD',
        details: `Campo recibido: ${error.field}. Campo esperado: "images"`
      }
    };

    const errorInfo = multerErrors[error.code] || {
      message: 'Error de upload',
      errorCode: 'UPLOAD_ERROR',
      details: error.message
    };

    return res.status(400).json({
      success: false,
      ...errorInfo,
      timestamp: new Date().toISOString()
    });
  }

  // ✅ Errores de filtro de archivos
  if (error.message.includes('Tipo de archivo no permitido')) {
    return res.status(400).json({
      success: false,
      message: 'Tipo de archivo no permitido',
      errorCode: 'INVALID_FILE_TYPE',
      details: 'Solo se permiten imágenes: JPG, PNG, GIF, WebP',
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      timestamp: new Date().toISOString()
    });
  }

  // ✅ Errores de Cloudinary
  if (error.message.includes('Cloudinary')) {
    return res.status(500).json({
      success: false,
      message: 'Error procesando imágenes',
      errorCode: 'CLOUDINARY_ERROR',
      details: 'Inténtalo de nuevo en unos momentos',
      timestamp: new Date().toISOString()
    });
  }

  // ✅ NUEVOS: Errores de pago
  if (error.message.includes('PAYMENT_REQUIRED_FOR_ADDITIONAL_POST')) {
    return res.status(402).json({
      success: false,
      message: error.message,
      errorCode: 'PAYMENT_REQUIRED_FOR_ADDITIONAL_POST',
      details: 'Necesitas pagar $1.00 para crear anuncios adicionales',
      paymentRequired: true,
      additionalPostPrice: 1.00,
      timestamp: new Date().toISOString()
    });
  }

  if (error.message.includes('PAYMENT_NOT_COMPLETED')) {
    return res.status(400).json({
      success: false,
      message: 'El pago no ha sido completado en Stripe',
      errorCode: 'PAYMENT_NOT_COMPLETED',
      details: 'Completa el pago antes de confirmar',
      timestamp: new Date().toISOString()
    });
  }

  if (error.message.includes('PAYMENT_NOT_FOUND')) {
    return res.status(404).json({
      success: false,
      message: 'Pago no encontrado o ya procesado',
      errorCode: 'PAYMENT_NOT_FOUND',
      details: 'Verifica el ID del pago',
      timestamp: new Date().toISOString()
    });
  }

  // ✅ Otros errores
  next(error);
});

// ===================================================================
// 📝 LOG DE INICIALIZACIÓN
// ===================================================================

if (process.env.NODE_ENV === 'development') {
  console.log('✅ Posts routes configured with:');
  console.log('  🌐 FEED PRINCIPAL: Accesible para TODOS (autenticación opcional)');
  console.log('  🔥 TENDENCIAS: Accesible para TODOS (autenticación opcional)');
  console.log('  ⭐ DISCOVER: Solo usuarios AUTENTICADOS (personalización requerida)');
  console.log('  🔒 PREMIUM: Clientes premium y admins únicamente');
  console.log('  💰 PAGOS: Solo 2 posts gratis, luego $1.00 c/u');
  console.log('  🚀 BOOST: $1.00 por promocionar cada anuncio');
  console.log('  ☁️ Cloudinary optimized uploads');
  console.log('  📊 Performance optimizations');
  console.log('  🎯 Campo SEXO validation');
  console.log('  ✅ Autenticación opcional corregida para rutas públicas');
  console.log('  💳 Stripe real payments integration');
}

module.exports = router;