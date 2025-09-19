const { prisma } = require('../config/database');
const { AppError, catchAsync } = require('../middleware/errorHandler');
const { sanitizeString } = require('../utils/validators');
const { deleteFromCloudinary } = require('../services/uploadService');
const logger = require('../utils/logger');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// ===================================================================
// 🔧 CONFIGURACIONES Y HELPERS OPTIMIZADOS
// ===================================================================

const VALID_SEXOS = ['Hombre', 'Mujer', 'Trans', 'Otro'];
const FREE_POSTS_LIMIT = 2; // ✅ CAMBIADO: Solo 2 posts gratis, el 3ro cuesta $1
const ADDITIONAL_POST_PRICE = 1.00; // ✅ NUEVO: Precio del tercer anuncio
const BOOST_PRICE = 1.00; // ✅ NUEVO: Precio del boost

// ✅ FUNCIÓN CORREGIDA: Limpiar arrays de IDs para evitar errores de Prisma
const cleanPostIds = (postIds) => {
  if (!Array.isArray(postIds)) return [];
  return postIds.filter(id => 
    id !== null && 
    id !== undefined && 
    typeof id === 'string' && 
    id.trim() !== ''
  );
};

// ✅ NUEVA FUNCIÓN: Verificar acceso premium completo
const hasAccessToPremiumContent = (user) => {
  if (!user) {
    console.log('❌ Premium access denied: No user provided');
    return false;
  }
  
  // ✅ ADMINISTRADORES: Siempre tienen acceso
  if (user.userType === 'ADMIN') {
    console.log('✅ Premium access granted: ADMIN user');
    return true;
  }
  
  // ✅ SOLO CLIENTES pueden acceder a contenido premium
  if (user.userType !== 'CLIENT') {
    console.log('❌ Premium access denied: User type is', user.userType, '(only CLIENT allowed)');
    return false;
  }
  
  // ✅ VERIFICAR si el cliente tiene datos
  const client = user.client;
  if (!client) {
    console.log('❌ Premium access denied: No client data found for user');
    return false;
  }
  
  // ✅ VERIFICAR campo específico para acceso premium
  if (!client.canAccessPremiumProfiles) {
    console.log('❌ Premium access denied: canAccessPremiumProfiles = false');
    return false;
  }
  
  // ✅ VERIFICAR si es premium y no ha expirado
  if (client.isPremium) {
    if (client.premiumUntil && new Date() > new Date(client.premiumUntil)) {
      console.log('❌ Premium access denied: Premium subscription expired at', client.premiumUntil);
      return false;
    }
    console.log('✅ Premium access granted: Active premium subscription until', client.premiumUntil);
    return true;
  }
  
  // ✅ VERIFICAR si tiene suficientes puntos para acceso temporal
  const minimumPointsForPremium = 100; // Configurable
  if (client.points >= minimumPointsForPremium) {
    console.log('✅ Premium access granted: Sufficient points (', client.points, '>=', minimumPointsForPremium, ')');
    return true;
  }
  
  console.log('❌ Premium access denied: Not premium and insufficient points (', client.points, '<', minimumPointsForPremium, ')');
  return false;
};

// ✅ Include optimizado y reutilizable
const getPostInclude = (userId = null) => ({
  author: {
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
      avatar: true,
      userType: true,
      phone: true,
      bio: true,
      escort: {
        select: {
          isVerified: true,
          rating: true,
          age: true,
          services: true,
          languages: true
        }
      },
      agency: {
        select: {
          isVerified: true,
          totalEscorts: true
        }
      },
      settings: {
        select: {
          showPhoneNumber: true,
          showInSearch: true,
          showInDiscovery: true,
          showInTrending: true
        }
      }
    }
  },
  locationRef: true,
  ...(userId && {
    likes: {
      where: { userId },
      select: { id: true }
    },
    favorites: {
      where: { userId },
      select: { id: true }
    }
  }),
  boosts: {
    where: {
      isActive: true,
      expiresAt: { gt: new Date() }
    },
    select: {
      id: true,
      amount: true,
      expiresAt: true,
      pricing: {
        select: {
          type: true,
          multiplier: true
        }
      }
    },
    orderBy: { amount: 'desc' }
  },
  tags: {
    include: {
      tag: {
        select: {
          name: true,
          color: true
        }
      }
    }
  },
  _count: {
    select: {
      likes: true,
      favorites: true,
      interactions: {
        where: { type: 'VIEW' }
      }
    }
  }
});

// ✅ Formateador de respuesta simplificado
const formatPost = (post, userId = null) => ({
  id: post.id,
  title: post.title,
  description: post.description,
  images: post.images,
  phone: getPhoneForUser(post, userId),
  services: post.services || [],
  rates: post.rates,
  availability: post.availability,
  views: post.views || 0,
  score: post.score || 0,
  isTrending: post.isTrending || false,
  isFeatured: post.isFeatured || false,
  premiumOnly: post.premiumOnly || false,
  age: post.age,
  location: post.location,
  sexo: post.sexo,
  createdAt: post.createdAt,
  lastBoosted: post.lastBoosted,
  author: post.author,
  locationRef: post.locationRef,
  tags: post.tags?.map(pt => pt.tag) || [],
  likesCount: post._count?.likes || 0,
  favoritesCount: post._count?.favorites || 0,
  viewsCount: post._count?.interactions || 0,
  isLiked: post.likes?.length > 0 || false,
  isFavorited: post.favorites?.length > 0 || false,
  isBoostActive: !!post.boosts?.length,
  boostAmount: post.boosts?.[0]?.amount || 0,
  boostExpiry: post.boosts?.[0]?.expiresAt || null,
  // ✅ Algoritmo info para debugging
  algorithmScore: post.algorithmScore || 0,
  algorithmReason: post.algorithmReason || 'standard'
});

// ✅ Helper para teléfono
const getPhoneForUser = (post, userId) => {
  if (userId && post.author?.id === userId) return post.phone || post.author?.phone || '';
  if (post.author?.settings?.showPhoneNumber) return post.phone || post.author?.phone || '';
  return null;
};

// ✅ Where clause base optimizado - CORREGIDO PARA USUARIOS NO AUTENTICADOS
const getBaseWhere = (userId = null, tabType = null) => {
  const baseWhere = {
    isActive: true,
    deletedAt: null,
    ...(tabType === 'premium' ? { premiumOnly: true } : { premiumOnly: false })
  };

  // ✅ SOLO agregar filtro de bloqueo si hay usuario autenticado
  if (userId) {
    baseWhere.author = {
      blockedBy: {
        none: { blockerId: userId }
      }
    };
  }

  return baseWhere;
};

// ✅ Validador de sexo optimizado
const validateSexo = (sexo) => VALID_SEXOS.includes(sexo);

// ✅ Calculador de calidad simplificado
const calculateQualityScore = (title, description, imageCount) => {
  return Math.min(100, 
    Math.min(20, title?.length / 5 || 0) + 
    Math.min(30, description?.length / 10 || 0) + 
    Math.min(50, imageCount * 10)
  );
};

// ✅ Extractor de publicId de Cloudinary
const extractPublicId = (url) => {
  try {
    const match = url.match(/\/v\d+\/(.+)\./);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};

// ===================================================================
// 🚀 ALGORITMOS DIFERENCIADOS REALES - SIMPLIFICADOS Y CORREGIDOS
// ===================================================================

// ✅ FUNCIÓN CORREGIDA: Algoritmos diferenciados por tab
const getOptimizedOrderBy = (sortBy, page = 1, tabType = null) => {
  console.log(`🎯 Getting orderBy for: sortBy=${sortBy}, page=${page}, tabType=${tabType}`);
  
  // ✅ DISCOVER: Algoritmo de descubrimiento personalizado
  if (tabType === 'discover') {
    return [
      { qualityScore: 'desc' },        
      { discoveryScore: 'desc' },      
      { boosts: { _count: 'desc' } },  
      { createdAt: 'desc' }            
    ];
  }
  
  // ✅ TRENDING: ALGORITMO SIMPLIFICADO - SOLO ORDENAR POR ENGAGEMENT
  if (tabType === 'trending') {
    return [
      { boosts: { _count: 'desc' } },     // 1. Boosts primero (opcional)
      { likes: { _count: 'desc' } },      // 2. Likes (PRINCIPAL)
      { favorites: { _count: 'desc' } },  // 3. Favoritos
      { views: 'desc' },                  // 4. Visualizaciones
      { createdAt: 'desc' }               // 5. Fecha (tie-breaker)
    ];
  }
  
  // ✅ OVERVIEW: Equilibrio general con boosts primero
  if (tabType === 'overview' || sortBy === 'recent') {
    if (page === 1) {
      return [
        { boosts: { _count: 'desc' } },   
        { score: 'desc' },                
        { createdAt: 'desc' }             
      ];
    } else {
      return [
        { score: 'desc' },                
        { createdAt: 'desc' },            
        { boosts: { _count: 'desc' } }    
      ];
    }
  }
  
  // ✅ Algoritmos específicos por sortBy
  switch (sortBy) {
    case 'boosted':
      return [
        { boosts: { _count: 'desc' } },   
        { score: 'desc' },                
        { createdAt: 'desc' }             
      ];
      
    case 'popular':
      return [
        { score: 'desc' },                
        { views: 'desc' },                
        { likes: { _count: 'desc' } },    
        { createdAt: 'desc' }             
      ];
      
    case 'quality':
      return [
        { qualityScore: 'desc' },         
        { score: 'desc' },                
        { createdAt: 'desc' }             
      ];
      
    default: // recent y otros
      return [
        { createdAt: 'desc' },            
        { score: 'desc' },                
        { boosts: { _count: 'desc' } }    
      ];
  }
};

// ===================================================================
// 🚀 CONTROLLERS PRINCIPALES - CORREGIDOS
// ===================================================================

// ✅ CREAR POST - ✅ MODIFICADO PARA COBRAR TERCER ANUNCIO
const createPost = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { title, description, phone, age, location, sexo, locationId, services, rates, availability, tags, premiumOnly = false } = req.body;

  // ✅ Validaciones en una sola pasada
  const errors = [];
  if (!title?.trim()) errors.push('El título es obligatorio');
  if (!description?.trim()) errors.push('La descripción es obligatoria');
  if (!phone?.trim()) errors.push('El teléfono es obligatorio');
  if (!age || age < 18 || age > 80) errors.push('La edad debe estar entre 18 y 80 años');
  if (!location?.trim()) errors.push('La ubicación es obligatoria');
  if (!sexo?.trim()) errors.push('El sexo es obligatorio');
  if (!validateSexo(sexo?.trim())) errors.push('El sexo debe ser: Hombre, Mujer, Trans u Otro');
  if (!req.uploadedFiles?.length) errors.push('Debes agregar al menos una imagen');

  if (errors.length) {
    throw new AppError(errors[0], 400, 'VALIDATION_ERROR');
  }

  // ✅ VERIFICAR LÍMITES PARA ESCORTS - MODIFICADO PARA COBROS
  if (req.user.userType === 'ESCORT') {
    const currentPosts = await prisma.post.count({
      where: { authorId: userId, isActive: true }
    });
    
    console.log('📊 Current posts count:', currentPosts, 'Free limit:', FREE_POSTS_LIMIT);
    
    // ✅ NUEVO: Si ya tiene 2 posts, necesita pagar por el tercero
    if (currentPosts >= FREE_POSTS_LIMIT) {
      throw new AppError(
        `Has alcanzado el límite de ${FREE_POSTS_LIMIT} anuncios gratuitos. Para publicar más anuncios necesitas pagar $${ADDITIONAL_POST_PRICE} por cada uno adicional.`, 
        402, 
        'PAYMENT_REQUIRED_FOR_ADDITIONAL_POST'
      );
    }
  }

  // ✅ Procesar datos JSON de una vez
  const parseJSON = (data) => {
    try {
      return typeof data === 'string' ? JSON.parse(data) : data;
    } catch {
      return null;
    }
  };

  const parsedServices = parseJSON(services) || [];
  const parsedRates = parseJSON(rates);
  const parsedAvailability = parseJSON(availability);
  const parsedTags = parseJSON(tags) || [];

  if (parsedServices.length > 3) {
    throw new AppError('Máximo 3 servicios permitidos', 400, 'TOO_MANY_SERVICES');
  }

  // ✅ Crear post con transacción
  const result = await prisma.$transaction(async (tx) => {
    // Crear post
    const newPost = await tx.post.create({
      data: {
        title: sanitizeString(title),
        description: sanitizeString(description),
        phone: phone || req.user.phone,
        images: req.uploadedFiles.map(f => f.secure_url),
        locationId: locationId || req.user.locationId,
        services: parsedServices.slice(0, 3),
        rates: parsedRates,
        availability: parsedAvailability,
        premiumOnly: premiumOnly === 'true' && req.user.userType !== 'CLIENT',
        age: parseInt(age),
        location: sanitizeString(location),
        sexo: sexo.trim(),
        authorId: userId,
        score: 10.0,
        discoveryScore: 15.0,
        qualityScore: calculateQualityScore(title, description, req.uploadedFiles.length)
      },
      include: getPostInclude(userId)
    });

    // Actualizar contador de escort
    if (req.user.userType === 'ESCORT') {
      await tx.escort.update({
        where: { userId },
        data: { currentPosts: { increment: 1 } }
      });
    }

    // Procesar tags
    if (parsedTags.length > 0) {
      for (const tagName of parsedTags) {
        const tag = await tx.tag.upsert({
          where: { name: tagName.toLowerCase() },
          update: { usageCount: { increment: 1 } },
          create: {
            name: tagName.toLowerCase(),
            slug: tagName.toLowerCase().replace(/\s+/g, '-'),
            usageCount: 1
          }
        });

        await tx.postTag.create({
          data: { postId: newPost.id, tagId: tag.id }
        });
      }
    }

    // Actualizar reputación
    await tx.userReputation.update({
      where: { userId },
      data: {
        qualityScore: { increment: 5 },
        lastScoreUpdate: new Date()
      }
    });

    return newPost;
  });

  logger.info('Post created', { 
    postId: result.id, 
    userId, 
    userType: req.user.userType,
    imagesCount: req.uploadedFiles.length,
    sexo: sexo
  });

  res.status(201).json({
    success: true,
    message: 'Anuncio creado exitosamente',
    data: formatPost(result, userId),
    timestamp: new Date().toISOString()
  });
});

// ✅ NUEVO: CREAR PAYMENTINTENT PARA ANUNCIO ADICIONAL
const createAdditionalPostPayment = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { postData } = req.body;

  console.log('💰 === CREATE ADDITIONAL POST PAYMENT ===');
  console.log('💰 User ID:', userId);
  console.log('💰 Post Data keys:', Object.keys(postData || {}));

  // ✅ VERIFICAR QUE ES ESCORT
  if (req.user.userType !== 'ESCORT') {
    throw new AppError('Solo escorts pueden pagar por anuncios adicionales', 403, 'ESCORT_ONLY');
  }

  // ✅ VERIFICAR QUE REALMENTE NECESITA PAGAR
  const currentPosts = await prisma.post.count({
    where: { authorId: userId, isActive: true }
  });

  if (currentPosts < FREE_POSTS_LIMIT) {
    throw new AppError(`Aún puedes crear ${FREE_POSTS_LIMIT - currentPosts} anuncios gratuitos`, 400, 'NO_PAYMENT_NEEDED');
  }

  // ✅ VALIDAR DATOS DEL POST
  if (!postData || !postData.title || !postData.description) {
    throw new AppError('Datos del anuncio incompletos', 400, 'INVALID_POST_DATA');
  }

  try {
    // ✅ CREAR REGISTRO DE PAGO
    const payment = await prisma.payment.create({
      data: {
        amount: ADDITIONAL_POST_PRICE,
        currency: 'USD',
        type: 'POST_ADDITIONAL',
        description: `Anuncio adicional - ${postData.title.substring(0, 50)}...`,
        escortId: req.user.escort?.id,
        status: 'PENDING',
        metadata: {
          userId,
          postData: JSON.stringify(postData),
          postTitle: postData.title,
          userType: req.user.userType
        }
      }
    });

    // ✅ CREAR PAYMENTINTENT EN STRIPE
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(ADDITIONAL_POST_PRICE * 100), // Convertir a centavos
      currency: 'usd',
      metadata: {
        paymentId: payment.id,
        userId,
        type: 'additional_post',
        postTitle: postData.title
      },
      description: `TeloFundi - Anuncio adicional: ${postData.title.substring(0, 50)}`,
      receipt_email: req.user.email || undefined
    });

    // ✅ ACTUALIZAR PAGO CON STRIPE ID
    await prisma.payment.update({
      where: { id: payment.id },
      data: { stripePaymentId: paymentIntent.id }
    });

    logger.info('Additional post payment created', {
      paymentId: payment.id,
      userId,
      amount: ADDITIONAL_POST_PRICE,
      stripePaymentIntentId: paymentIntent.id
    });

    res.status(200).json({
      success: true,
      message: 'Pago para anuncio adicional iniciado',
      data: {
        paymentId: payment.id,
        clientSecret: paymentIntent.client_secret,
        amount: ADDITIONAL_POST_PRICE,
        currency: 'USD',
        description: payment.description
      }
    });

  } catch (error) {
    logger.error('Error creating additional post payment:', error);
    throw new AppError('Error procesando el pago', 500, 'PAYMENT_ERROR');
  }
});

// ✅ NUEVO: CONFIRMAR PAGO DE ANUNCIO ADICIONAL
const confirmAdditionalPostPayment = catchAsync(async (req, res) => {
  const { paymentId } = req.params;
  const userId = req.user.id;

  console.log('✅ === CONFIRM ADDITIONAL POST PAYMENT ===');
  console.log('✅ Payment ID:', paymentId);
  console.log('✅ User ID:', userId);

  // ✅ BUSCAR PAGO
  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      metadata: {
        path: ['userId'],
        equals: userId
      },
      type: 'POST_ADDITIONAL',
      status: 'PENDING'
    }
  });

  if (!payment) {
    throw new AppError('Pago no encontrado o ya procesado', 404, 'PAYMENT_NOT_FOUND');
  }

  // ✅ VERIFICAR ESTADO EN STRIPE
  const paymentIntent = await stripe.paymentIntents.retrieve(payment.stripePaymentId);

  if (paymentIntent.status !== 'succeeded') {
    throw new AppError('El pago no ha sido completado', 400, 'PAYMENT_NOT_COMPLETED');
  }

  // ✅ PROCESAR POST EN TRANSACCIÓN
  try {
    const postData = JSON.parse(payment.metadata.postData);
    
    const result = await prisma.$transaction(async (tx) => {
      // ✅ CREAR EL POST
      const newPost = await tx.post.create({
        data: {
          title: sanitizeString(postData.title),
          description: sanitizeString(postData.description),
          phone: postData.phone || req.user.phone,
          images: postData.images || [],
          locationId: postData.locationId || req.user.locationId,
          services: postData.services || [],
          rates: postData.rates,
          availability: postData.availability,
          premiumOnly: postData.premiumOnly === 'true',
          age: parseInt(postData.age),
          location: sanitizeString(postData.location),
          sexo: postData.sexo,
          authorId: userId,
          score: 15.0, // Score más alto por ser post pagado
          discoveryScore: 20.0,
          qualityScore: calculateQualityScore(postData.title, postData.description, postData.images?.length || 0),
          isPaid: true // ✅ MARCAR COMO PAGADO
        },
        include: getPostInclude(userId)
      });

      // ✅ ACTUALIZAR PAGO
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          metadata: {
            ...payment.metadata,
            postId: newPost.id,
            postCreated: true
          }
        }
      });

      // ✅ ACTUALIZAR CONTADOR DE ESCORT
      if (req.user.escort?.id) {
        await tx.escort.update({
          where: { userId },
          data: { currentPosts: { increment: 1 } }
        });
      }

      // ✅ PROCESAR TAGS SI LOS HAY
      if (postData.tags && Array.isArray(postData.tags)) {
        for (const tagName of postData.tags) {
          const tag = await tx.tag.upsert({
            where: { name: tagName.toLowerCase() },
            update: { usageCount: { increment: 1 } },
            create: {
              name: tagName.toLowerCase(),
              slug: tagName.toLowerCase().replace(/\s+/g, '-'),
              usageCount: 1
            }
          });

          await tx.postTag.create({
            data: { postId: newPost.id, tagId: tag.id }
          });
        }
      }

      return newPost;
    });

    logger.info('Additional post payment confirmed and post created', {
      paymentId,
      postId: result.id,
      userId,
      amount: payment.amount
    });

    res.status(200).json({
      success: true,
      message: 'Pago confirmado y anuncio creado exitosamente',
      data: {
        payment: {
          id: paymentId,
          amount: payment.amount,
          status: 'COMPLETED'
        },
        post: formatPost(result, userId)
      }
    });

  } catch (error) {
    logger.error('Error confirming additional post payment:', error);
    
    // ✅ MARCAR PAGO COMO FALLIDO
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'FAILED',
        failureReason: error.message
      }
    });

    throw new AppError('Error procesando el anuncio', 500, 'POST_CREATION_ERROR');
  }
});

// ✅ NUEVO: CREAR PAYMENTINTENT PARA BOOST
const createBoostPayment = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { postId } = req.body;

  console.log('🚀 === CREATE BOOST PAYMENT ===');
  console.log('🚀 User ID:', userId);
  console.log('🚀 Post ID:', postId);

  // ✅ VERIFICAR QUE EL POST EXISTE Y PERTENECE AL USUARIO
  const post = await prisma.post.findFirst({
    where: {
      id: postId,
      authorId: userId,
      isActive: true
    },
    select: {
      id: true,
      title: true,
      authorId: true
    }
  });

  if (!post) {
    throw new AppError('Anuncio no encontrado o no tienes permisos', 404, 'POST_NOT_FOUND');
  }

  try {
    // ✅ CREAR REGISTRO DE PAGO
    const payment = await prisma.payment.create({
      data: {
        amount: BOOST_PRICE,
        currency: 'USD',
        type: 'BOOST',
        description: `Promocionar anuncio - ${post.title.substring(0, 50)}...`,
        ...(req.user.userType === 'ESCORT' ? { escortId: req.user.escort?.id } : {}),
        ...(req.user.userType === 'AGENCY' ? { agencyId: req.user.agency?.id } : {}),
        status: 'PENDING',
        metadata: {
          userId,
          postId: post.id,
          postTitle: post.title,
          userType: req.user.userType,
          boostType: 'BASIC' // Por ahora solo básico
        }
      }
    });

    // ✅ CREAR PAYMENTINTENT EN STRIPE
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(BOOST_PRICE * 100), // Convertir a centavos
      currency: 'usd',
      metadata: {
        paymentId: payment.id,
        userId,
        postId: post.id,
        type: 'boost'
      },
      description: `TeloFundi - Promocionar: ${post.title.substring(0, 50)}`,
      receipt_email: req.user.email || undefined
    });

    // ✅ ACTUALIZAR PAGO CON STRIPE ID
    await prisma.payment.update({
      where: { id: payment.id },
      data: { stripePaymentId: paymentIntent.id }
    });

    logger.info('Boost payment created', {
      paymentId: payment.id,
      postId: post.id,
      userId,
      amount: BOOST_PRICE,
      stripePaymentIntentId: paymentIntent.id
    });

    res.status(200).json({
      success: true,
      message: 'Pago para promocionar iniciado',
      data: {
        paymentId: payment.id,
        clientSecret: paymentIntent.client_secret,
        amount: BOOST_PRICE,
        currency: 'USD',
        description: payment.description,
        post: {
          id: post.id,
          title: post.title
        }
      }
    });

  } catch (error) {
    logger.error('Error creating boost payment:', error);
    throw new AppError('Error procesando el pago', 500, 'PAYMENT_ERROR');
  }
});

// ✅ NUEVO: CONFIRMAR PAGO DE BOOST
const confirmBoostPayment = catchAsync(async (req, res) => {
  const { paymentId } = req.params;
  const userId = req.user.id;

  console.log('✅ === CONFIRM BOOST PAYMENT ===');
  console.log('✅ Payment ID:', paymentId);
  console.log('✅ User ID:', userId);

  // ✅ BUSCAR PAGO
  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      metadata: {
        path: ['userId'],
        equals: userId
      },
      type: 'BOOST',
      status: 'PENDING'
    }
  });

  if (!payment) {
    throw new AppError('Pago no encontrado o ya procesado', 404, 'PAYMENT_NOT_FOUND');
  }

  // ✅ VERIFICAR ESTADO EN STRIPE
  const paymentIntent = await stripe.paymentIntents.retrieve(payment.stripePaymentId);

  if (paymentIntent.status !== 'succeeded') {
    throw new AppError('El pago no ha sido completado', 400, 'PAYMENT_NOT_COMPLETED');
  }

  // ✅ PROCESAR BOOST EN TRANSACCIÓN
  try {
    const postId = payment.metadata.postId;
    
    const result = await prisma.$transaction(async (tx) => {
      // ✅ ACTUALIZAR POST COMO PROMOCIONADO
      const updatedPost = await tx.post.update({
        where: { id: postId },
        data: {
          isFeatured: true,
          lastBoosted: new Date(),
          score: { increment: 10 }, // Incrementar score por boost
          trendingScore: { increment: 15 }
        },
        include: getPostInclude(userId)
      });

      // ✅ CREAR REGISTRO DE BOOST (para referencia futura)
      const boost = await tx.boost.create({
        data: {
          userId: userId,
          postId: postId,
          amount: payment.amount,
          isActive: true,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días de boost
          metadata: {
            paymentId: payment.id,
            boostType: 'BASIC'
          }
        }
      });

      // ✅ ACTUALIZAR PAGO
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          metadata: {
            ...payment.metadata,
            boostId: boost.id,
            boostActivated: true
          }
        }
      });

      return { post: updatedPost, boost };
    });

    logger.info('Boost payment confirmed and post promoted', {
      paymentId,
      postId,
      boostId: result.boost.id,
      userId,
      amount: payment.amount
    });

    res.status(200).json({
      success: true,
      message: 'Pago confirmado y anuncio promocionado exitosamente',
      data: {
        payment: {
          id: paymentId,
          amount: payment.amount,
          status: 'COMPLETED'
        },
        boost: {
          id: result.boost.id,
          expiresAt: result.boost.expiresAt,
          isActive: true
        },
        post: formatPost(result.post, userId)
      }
    });

  } catch (error) {
    logger.error('Error confirming boost payment:', error);
    
    // ✅ MARCAR PAGO COMO FALLIDO
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'FAILED',
        failureReason: error.message
      }
    });

    throw new AppError('Error procesando la promoción', 500, 'BOOST_ACTIVATION_ERROR');
  }
});

// ✅ VERIFICAR LÍMITES - MODIFICADO PARA NUEVOS LÍMITES
const checkPostLimits = catchAsync(async (req, res) => {
  const userId = req.user.id;

  if (req.user.userType !== 'ESCORT') {
    return res.json({
      success: true,
      data: {
        canCreateFreePost: true,
        freePostsRemaining: -1,
        totalPosts: 0,
        freePostsLimit: -1,
        needsPayment: false
      }
    });
  }

  const currentPosts = await prisma.post.count({
    where: { authorId: userId, isActive: true }
  });

  const remaining = Math.max(0, FREE_POSTS_LIMIT - currentPosts);
  const canCreateFree = currentPosts < FREE_POSTS_LIMIT;
  const needsPayment = currentPosts >= FREE_POSTS_LIMIT;

  res.json({
    success: true,
    data: {
      canCreateFreePost: canCreateFree,
      freePostsRemaining: remaining,
      totalPosts: currentPosts,
      freePostsLimit: FREE_POSTS_LIMIT,
      needsPayment: needsPayment,
      additionalPostPrice: ADDITIONAL_POST_PRICE,
      message: canCreateFree 
        ? `Puedes crear ${remaining} anuncios más gratis` 
        : `Necesitas pagar $${ADDITIONAL_POST_PRICE} por cada anuncio adicional`
    }
  });
});

// ✅ FEED PRINCIPAL CORREGIDO - ACCESIBLE PARA TODOS
const getFeed = catchAsync(async (req, res) => {
  const userId = req.user?.id;
  const {
    page = 1,
    limit = 20,
    location,
    userType,
    services,
    minAge,
    maxAge,
    verified,
    sexo,
    sortBy = 'recent',
    tabType = 'overview'
  } = req.query;

  console.log(`📋 getFeed called with tabType: ${tabType}, userId: ${userId || 'anonymous'}`);

  // ✅ VERIFICACIÓN PREMIUM CORREGIDA Y MEJORADA
  if (tabType === 'premium') {
    console.log('🔒 Premium tab requested - checking access...');
    
    if (!req.user) {
      console.log('❌ Premium tab: User not authenticated');
      return res.status(401).json({
        success: false,
        message: 'Debes acceder a TeloFundi para poder visualizar contenido premium',
        errorCode: 'AUTHENTICATION_REQUIRED',
        data: { posts: [], requiresAuth: true }
      });
    }
    
    if (!hasAccessToPremiumContent(req.user)) {
      console.log('❌ Premium tab: Access denied for user type:', req.user.userType);
      
      // ✅ RESPUESTA DIFERENTE SEGÚN TIPO DE USUARIO
      if (req.user.userType !== 'CLIENT') {
        return res.status(403).json({
          success: false,
          message: 'Solo los clientes pueden acceder a contenido premium',
          errorCode: 'CLIENT_REQUIRED',
          data: { 
            posts: [], 
            requiresClientAccount: true,
            currentUserType: req.user.userType
          }
        });
      } else {
        // Es cliente pero no tiene acceso premium
        const client = req.user.client;
        return res.status(402).json({
          success: false,
          message: 'Necesitas una suscripción premium para ver este contenido',
          errorCode: 'PREMIUM_REQUIRED',
          data: { 
            posts: [], 
            requiresPremium: true,
            currentPoints: client?.points || 0,
            isPremium: client?.isPremium || false,
            canAccessPremiumProfiles: client?.canAccessPremiumProfiles || false,
            premiumUntil: client?.premiumUntil || null,
            minimumPointsRequired: 100
          }
        });
      }
    }
    
    console.log('✅ Premium tab: Access granted for user:', req.user.userType);
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);

  // ✅ Where clause corregido para usuarios no autenticados
  const where = {
    ...getBaseWhere(userId, tabType), // ✅ Ahora maneja correctamente usuarios no autenticados
    ...(location && {
      OR: [
        { location: { contains: location, mode: 'insensitive' } },
        { locationRef: {
          OR: [
            { country: { contains: location, mode: 'insensitive' } },
            { city: { contains: location, mode: 'insensitive' } }
          ]
        }}
      ]
    }),
    ...(userType && { author: { userType: userType.toUpperCase() } }),
    ...(services && {
      services: { hasSome: Array.isArray(services) ? services : [services] }
    }),
    ...(verified === 'true' && {
      author: {
        OR: [
          { escort: { isVerified: true } },
          { agency: { isVerified: true } }
        ]
      }
    }),
    ...(minAge && { age: { gte: parseInt(minAge) } }),
    ...(maxAge && { age: { lte: parseInt(maxAge) } }),
    ...(sexo && validateSexo(sexo) && { sexo })
  };

  // ✅ ORDENAMIENTO DIFERENCIADO POR TAB TYPE
  const orderBy = getOptimizedOrderBy(sortBy, parseInt(page), tabType);

  console.log(`🎯 Using orderBy for ${tabType}:`, JSON.stringify(orderBy, null, 2));

  // ✅ Ejecutar consultas en paralelo
  const [posts, totalCount] = await Promise.all([
    prisma.post.findMany({
      where,
      include: getPostInclude(userId),
      orderBy,
      skip: offset,
      take: parseInt(limit)
    }),
    prisma.post.count({ where })
  ]);

  console.log(`📊 Found ${posts.length} posts for ${tabType}`);

  // ✅ Registrar vistas de manera eficiente (solo para usuarios autenticados)
  if (userId && posts.length > 0) {
    const viewInteractions = posts.map(post => ({
      userId,
      postId: post.id,
      type: 'VIEW',
      weight: 1.0,
      deviceType: req.get('User-Agent')?.includes('Mobile') ? 'mobile' : 'desktop',
      source: tabType || 'feed'
    }));

    // Fire and forget - no bloquear la respuesta
    prisma.userInteraction.createMany({
      data: viewInteractions,
      skipDuplicates: true
    }).catch(err => logger.warn('Error creating view interactions', err));
  }

  const pagination = {
    page: parseInt(page),
    limit: parseInt(limit),
    total: totalCount,
    pages: Math.ceil(totalCount / parseInt(limit)),
    hasNext: parseInt(page) * parseInt(limit) < totalCount,
    hasPrev: parseInt(page) > 1
  };

  // ✅ RESPUESTA CON INFO DE PREMIUM
  const responseData = {
    posts: posts.map(post => formatPost(post, userId)),
    pagination,
    algorithm: `${tabType}_optimized`,
    filters: { location, userType, services, minAge, maxAge, verified, sexo, sortBy, tabType }
  };

  // ✅ AGREGAR INFO PREMIUM SI ES NECESARIO
  if (tabType === 'premium') {
    responseData.premiumInfo = {
      accessGranted: true,
      userType: req.user.userType,
      isPremium: req.user.client?.isPremium || false,
      premiumUntil: req.user.client?.premiumUntil || null,
      accessMethod: req.user.userType === 'ADMIN' ? 'admin' : 
                   req.user.client?.isPremium ? 'subscription' : 'points'
    };
  }

  res.json({
    success: true,
    data: responseData
  });
});

// ✅ TRENDING POSTS - CORREGIDO PARA TODOS LOS USUARIOS
const getTrendingPosts = catchAsync(async (req, res) => {
  const userId = req.user?.id;
  const { limit = 20, timeframe = '24h', sexo, tabType = 'trending' } = req.query;

  console.log(`🔥 getTrendingPosts called - ACCESSIBLE TO ALL`);

  // ✅ VERIFICAR ACCESO PREMIUM SI ES NECESARIO
  if (tabType === 'premium' && req.user?.userType === 'CLIENT' && !hasAccessToPremiumContent(req.user)) {
    return res.status(403).json({
      success: false,
      message: 'Acceso premium requerido',
      errorCode: 'PREMIUM_ACCESS_REQUIRED',
      data: { posts: [], requiresUpgrade: true }
    });
  }

  // ✅ Where clause corregido para usuarios no autenticados
  const where = {
    ...getBaseWhere(userId, tabType), // ✅ Ahora maneja correctamente usuarios no autenticados
    ...(sexo && validateSexo(sexo) && { sexo })
  };

  console.log('🔥 Trending query - showing ALL posts ordered by engagement');

  // ✅ ALGORITMO TRENDING SIMPLE: SOLO ORDENAR POR ENGAGEMENT
  const posts = await prisma.post.findMany({
    where,
    include: getPostInclude(userId),
    orderBy: [
      { boosts: { _count: 'desc' } },     // 1. Boosts primero (opcional)
      { likes: { _count: 'desc' } },      // 2. Likes (PRINCIPAL)
      { favorites: { _count: 'desc' } },  // 3. Favoritos
      { views: 'desc' },                  // 4. Views
      { createdAt: 'desc' }               // 5. Fecha como tie-breaker
    ],
    take: parseInt(limit)
  });

  console.log(`🔥 Found ${posts.length} posts for trending`);

  // ✅ Stats simples
  const stats = {
    totalPosts: posts.length,
    timeframe,
    avgLikes: posts.length ? 
      posts.reduce((sum, p) => sum + (p._count?.likes || 0), 0) / posts.length : 0,
    avgFavorites: posts.length ? 
      posts.reduce((sum, p) => sum + (p._count?.favorites || 0), 0) / posts.length : 0,
    postsWithBoosts: posts.filter(p => p.boosts?.length > 0).length,
    postsWithLikes: posts.filter(p => (p._count?.likes || 0) > 0).length,
    postsWithFavorites: posts.filter(p => (p._count?.favorites || 0) > 0).length,
    algorithmUsed: 'simple_engagement_sort'
  };

  console.log(`🔥 Trending algorithm results (ACCESSIBLE TO ALL):`, stats);

  res.json({
    success: true,
    data: {
      posts: posts.map(post => formatPost(post, userId)),
      timeframe,
      sexo,
      tabType,
      algorithm: 'simple_engagement_sort',
      stats
    }
  });
});

// ✅ DISCOVERY POSTS COMPLETAMENTE CORREGIDO - ACCESIBLE PARA USUARIOS AUTENTICADOS
const getDiscoveryPosts = catchAsync(async (req, res) => {
  const userId = req.user?.id;
  const { limit = 20, algorithm = 'personalized', sexo, tabType = 'discover' } = req.query;

  console.log(`⭐ getDiscoveryPosts called with algorithm: ${algorithm}, tabType: ${tabType}, userId: ${userId || 'none'}`);

  // ✅ VERIFICAR QUE EL USUARIO ESTÉ AUTENTICADO
  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Debes iniciar sesión para ver contenido personalizado',
      errorCode: 'AUTHENTICATION_REQUIRED',
      data: { posts: [], requiresAuth: true }
    });
  }

  // ✅ Verificar acceso premium solo si se solicita
  if (tabType === 'premium' && req.user?.userType === 'CLIENT' && !hasAccessToPremiumContent(req.user)) {
    return res.status(403).json({
      success: false,
      message: 'Acceso premium requerido',
      errorCode: 'PREMIUM_ACCESS_REQUIRED',
      data: { posts: [], requiresUpgrade: true }
    });
  }

  // ✅ Where clause base para discovery
  const where = {
    ...getBaseWhere(userId, tabType),
    ...(sexo && validateSexo(sexo) && { sexo })
  };

  let posts = [];
  let algorithmUsed = algorithm;

  try {
    // ✅ ALGORITMO PERSONALIZADO CORREGIDO
    if (algorithm === 'personalized' && userId) {
      console.log(`🎯 Running personalized discovery for user ${userId}`);
      
      // ✅ 1. Obtener historial de interacciones del usuario
      const userInteractions = await prisma.userInteraction.findMany({
        where: { userId },
        include: { 
          post: { 
            select: { 
              authorId: true, 
              services: true, 
              sexo: true,
              author: {
                select: {
                  userType: true
                }
              }
            } 
          } 
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      });

      // ✅ 2. Extraer patrones de preferencias
      const viewedPostIds = userInteractions.map(i => i.postId).filter(id => id); // ✅ FILTRAR nulls
      const cleanViewedIds = cleanPostIds(viewedPostIds); // ✅ LIMPIAR IDs
      
      const preferredServices = new Set();
      const preferredSexos = new Map();
      const preferredUserTypes = new Map();
      const preferredAuthors = new Map();
      
      userInteractions.forEach(interaction => {
        if (interaction.post) {
          interaction.post.services?.forEach(service => {
            preferredServices.add(service);
          });
          
          if (interaction.post.sexo) {
            const currentCount = preferredSexos.get(interaction.post.sexo) || 0;
            preferredSexos.set(interaction.post.sexo, currentCount + interaction.weight);
          }
          
          if (interaction.post.author?.userType) {
            const currentCount = preferredUserTypes.get(interaction.post.author.userType) || 0;
            preferredUserTypes.set(interaction.post.author.userType, currentCount + 1);
          }
          
          if (interaction.post.authorId) {
            const currentCount = preferredAuthors.get(interaction.post.authorId) || 0;
            preferredAuthors.set(interaction.post.authorId, currentCount + interaction.weight);
          }
        }
      });

      // ✅ 3. Construir queries personalizados CORREGIDOS
      const similarityQueries = [];
      
      // Query por servicios preferidos
      if (preferredServices.size > 0) {
        similarityQueries.push({
          ...where,
          ...(cleanViewedIds.length > 0 && { id: { notIn: cleanViewedIds } }), // ✅ SOLO si hay IDs limpios
          services: { hasSome: Array.from(preferredServices) }
        });
      }
      
      // Query por autores preferidos (limpiar IDs también)
      if (preferredAuthors.size > 0) {
        const cleanAuthorIds = cleanPostIds(Array.from(preferredAuthors.keys()));
        if (cleanAuthorIds.length > 0) {
          similarityQueries.push({
            ...where,
            ...(cleanViewedIds.length > 0 && { id: { notIn: cleanViewedIds } }),
            authorId: { in: cleanAuthorIds.slice(0, 10) }
          });
        }
      }
      
      // Query por tipos de usuario preferidos
      if (preferredUserTypes.size > 0) {
        similarityQueries.push({
          ...where,
          ...(cleanViewedIds.length > 0 && { id: { notIn: cleanViewedIds } }),
          author: { 
            userType: { in: Array.from(preferredUserTypes.keys()) }
          }
        });
      }
      
      // Query de calidad como fallback
      similarityQueries.push({
        ...where,
        ...(cleanViewedIds.length > 0 && { id: { notIn: cleanViewedIds } }),
        qualityScore: { gte: 70 }
      });

      // ✅ 4. Ejecutar queries en paralelo
      if (similarityQueries.length > 0) {
        const similarityResults = await Promise.all(
          similarityQueries.map(query => 
            prisma.post.findMany({
              where: query,
              include: getPostInclude(userId),
              orderBy: getOptimizedOrderBy('quality', 1, 'discover'),
              take: Math.ceil(parseInt(limit) / similarityQueries.length) + 5
            }).catch(error => {
              console.error('❌ Error in similarity query:', error);
              return []; // Retornar array vacío en caso de error
            })
          )
        );

        const allSimilarPosts = similarityResults.flat();
        const uniquePosts = allSimilarPosts.filter((post, index, array) => 
          array.findIndex(p => p.id === post.id) === index
        );

        posts = uniquePosts.slice(0, parseInt(limit));
        algorithmUsed = 'personalized_ml';

        // ✅ 5. Rellenar con posts de calidad si no hay suficientes
        if (posts.length < parseInt(limit)) {
          const remaining = parseInt(limit) - posts.length;
          const usedIds = [...cleanViewedIds, ...posts.map(p => p.id)];
          const cleanUsedIds = cleanPostIds(usedIds);
          
          const qualityPosts = await prisma.post.findMany({
            where: {
              ...where,
              ...(cleanUsedIds.length > 0 && { id: { notIn: cleanUsedIds } }),
              qualityScore: { gte: 60 }
            },
            include: getPostInclude(userId),
            orderBy: getOptimizedOrderBy('quality', 1, 'discover'),
            take: remaining
          }).catch(error => {
            console.error('❌ Error in quality fallback query:', error);
            return [];
          });

          posts = [...posts, ...qualityPosts];
        }
      }
    } 
    
    // ✅ ALGORITMOS NO PERSONALIZADOS CORREGIDOS
    if (posts.length === 0) {
      let orderBy = [];
      let extraWhere = {};

      switch (algorithm) {
        case 'quality':
          orderBy = getOptimizedOrderBy('quality', 1, 'discover');
          extraWhere = { qualityScore: { gte: 70 } };
          algorithmUsed = 'quality_based';
          break;
        case 'new':
          orderBy = getOptimizedOrderBy('recent', 1, 'discover');
          extraWhere = { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } };
          algorithmUsed = 'new_content';
          break;
        case 'popular':
          orderBy = getOptimizedOrderBy('popular', 1, 'discover');
          extraWhere = { score: { gte: 50 } };
          algorithmUsed = 'popularity_based';
          break;
        default:
          orderBy = getOptimizedOrderBy('recent', 1, 'discover');
          algorithmUsed = 'general_discovery';
      }

      posts = await prisma.post.findMany({
        where: { ...where, ...extraWhere },
        include: getPostInclude(userId),
        orderBy,
        take: parseInt(limit)
      });
    }

    console.log(`⭐ Discovery completed: ${posts.length} posts found using ${algorithmUsed}`);

    // ✅ Registrar interacciones de discovery (solo para usuarios autenticados)
    if (userId && posts.length > 0) {
      const discoveryInteractions = posts.map(post => ({
        userId,
        postId: post.id,
        type: 'DISCOVERY_VIEW',
        weight: 1.5,
        source: 'discover',
        metadata: JSON.stringify({
          algorithm: algorithmUsed,
          position: posts.findIndex(p => p.id === post.id) + 1
        })
      }));

      Promise.all([
        prisma.userInteraction.createMany({
          data: discoveryInteractions,
          skipDuplicates: true
        }),
        prisma.post.updateMany({
          where: { id: { in: posts.map(p => p.id) } },
          data: { discoveryScore: { increment: 0.5 } }
        })
      ]).catch(err => logger.warn('Error updating discovery data', err));
    }

    res.json({
      success: true,
      data: {
        posts: posts.map(post => formatPost(post, userId)),
        algorithm: algorithmUsed,
        isPersonalized: !!userId && algorithm === 'personalized',
        sexo,
        tabType,
        debug: {
          originalCount: posts.length,
          userId: userId ? 'authenticated' : 'anonymous'
        }
      }
    });

  } catch (error) {
    console.error('❌ Error in getDiscoveryPosts:', error);
    
    // ✅ FALLBACK SIMPLE EN CASO DE ERROR
    const fallbackPosts = await prisma.post.findMany({
      where,
      include: getPostInclude(userId),
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    }).catch(() => []);

    res.json({
      success: true,
      data: {
        posts: fallbackPosts.map(post => formatPost(post, userId)),
        algorithm: 'fallback_simple',
        isPersonalized: false,
        sexo,
        tabType,
        error: 'Algoritmo personalizado falló, usando contenido estándar'
      }
    });
  }
});

// ✅ OBTENER POST POR ID CON VERIFICACIÓN PREMIUM
const getPostById = catchAsync(async (req, res) => {
  const { postId } = req.params;
  const userId = req.user?.id;

  const post = await prisma.post.findUnique({
    where: { 
      id: postId,
      isActive: true,
      deletedAt: null
    },
    include: getPostInclude(userId)
  });

  if (!post) {
    throw new AppError('Anuncio no encontrado', 404, 'POST_NOT_FOUND');
  }

  // ✅ VERIFICACIÓN PREMIUM PARA POSTS INDIVIDUALES
  if (post.premiumOnly) {
    if (!req.user) {
      throw new AppError('Debes iniciar sesión para ver contenido premium', 401, 'AUTH_REQUIRED');
    }
    
    if (!hasAccessToPremiumContent(req.user)) {
      throw new AppError('Necesitas acceso premium para ver este contenido', 403, 'PREMIUM_REQUIRED');
    }
  }

  // ✅ Registrar vista y interacción (solo para usuarios autenticados)
  if (userId && userId !== post.authorId) {
    Promise.all([
      prisma.post.update({
        where: { id: postId },
        data: { 
          views: { increment: 1 },
          uniqueViews: { increment: 1 }
        }
      }),
      prisma.userInteraction.create({
        data: {
          userId,
          postId,
          targetUserId: post.authorId,
          type: 'POST_DETAIL_VIEW',
          weight: 3.0,
          source: 'direct'
        }
      })
    ]).catch(err => logger.warn('Error updating post view', err));
  }

  res.json({
    success: true,
    data: formatPost(post, userId)
  });
});

// ✅ RESTO DE FUNCIONES SIN CAMBIOS MAYORES
const updatePost = catchAsync(async (req, res) => {
  const { postId } = req.params;
  const userId = req.user.id;
  
  const {
    title, description, phone, locationId, sexo, services, rates, 
    availability, tags, premiumOnly, removeImages, age, location
  } = req.body;

  // ✅ Verificar existencia y permisos
  const existingPost = await prisma.post.findFirst({
    where: { id: postId, authorId: userId, isActive: true }
  });

  if (!existingPost) {
    throw new AppError('Anuncio no encontrado o sin permisos', 404, 'POST_NOT_FOUND');
  }

  // ✅ Validar sexo si se proporciona
  if (sexo !== undefined && (!sexo?.trim() || !validateSexo(sexo.trim()))) {
    throw new AppError('El sexo debe ser: Hombre, Mujer, Trans u Otro', 400, 'SEXO_INVALID');
  }

  // ✅ Preparar datos de actualización
  const updateData = {
    ...(title && { title: sanitizeString(title) }),
    ...(description && { description: sanitizeString(description) }),
    ...(phone !== undefined && { phone }),
    ...(locationId !== undefined && { locationId }),
    ...(age !== undefined && { age: parseInt(age) || null }),
    ...(location !== undefined && { location: sanitizeString(location) }),
    ...(sexo !== undefined && { sexo: sexo.trim() }),
    ...(premiumOnly !== undefined && req.user.userType !== 'CLIENT' && { 
      premiumOnly: premiumOnly === 'true' 
    }),
    updatedAt: new Date()
  };

  // ✅ Procesar JSON data
  const parseJSON = (data) => {
    try {
      return typeof data === 'string' ? JSON.parse(data) : data;
    } catch {
      return null;
    }
  };

  if (services !== undefined) {
    const parsedServices = parseJSON(services) || [];
    if (parsedServices.length > 3) {
      throw new AppError('Máximo 3 servicios permitidos', 400, 'TOO_MANY_SERVICES');
    }
    updateData.services = parsedServices.slice(0, 3);
  }

  if (rates !== undefined) updateData.rates = parseJSON(rates);
  if (availability !== undefined) updateData.availability = parseJSON(availability);

  // ✅ Calcular nuevo quality score si se actualiza contenido
  if (title || description) {
    updateData.qualityScore = calculateQualityScore(
      title || existingPost.title,
      description || existingPost.description,
      existingPost.images.length
    );
    updateData.lastScoreUpdate = new Date();
  }

  // ✅ Procesar imágenes
  let currentImages = [...existingPost.images];
  
  // Eliminar imágenes
  const imagesToRemove = parseJSON(removeImages) || [];
  if (imagesToRemove.length > 0) {
    imagesToRemove.forEach(imageUrl => {
      if (imageUrl.includes('cloudinary')) {
        const publicId = extractPublicId(imageUrl);
        if (publicId) {
          deleteFromCloudinary(publicId).catch(err => 
            logger.warn('Could not delete image from Cloudinary', { imageUrl, error: err.message })
          );
        }
      }
    });
    
    currentImages = currentImages.filter(img => !imagesToRemove.includes(img));
  }

  // Agregar nuevas imágenes
  if (req.uploadedFiles?.length > 0) {
    const totalImages = currentImages.length + req.uploadedFiles.length;
    if (totalImages > 5) {
      throw new AppError('Máximo 5 imágenes permitidas', 400, 'TOO_MANY_IMAGES');
    }
    currentImages = [...currentImages, ...req.uploadedFiles.map(f => f.secure_url)];
  }

  updateData.images = currentImages;

  // ✅ Actualizar en transacción
  const result = await prisma.$transaction(async (tx) => {
    const updatedPost = await tx.post.update({
      where: { id: postId },
      data: updateData,
      include: getPostInclude(userId)
    });

    if (tags !== undefined) {
      const parsedTags = parseJSON(tags) || [];
      
      if (parsedTags.length > 0) {
        await tx.postTag.deleteMany({ where: { postId } });

        for (const tagName of parsedTags) {
          const tag = await tx.tag.upsert({
            where: { name: tagName.toLowerCase() },
            update: { usageCount: { increment: 1 } },
            create: {
              name: tagName.toLowerCase(),
              slug: tagName.toLowerCase().replace(/\s+/g, '-'),
              usageCount: 1
            }
          });

          await tx.postTag.create({
            data: { postId, tagId: tag.id }
          });
        }
      }
    }

    return updatedPost;
  });

  logger.info('Post updated', {
    postId,
    userId,
    updatedFields: Object.keys(updateData),
    imagesRemoved: imagesToRemove.length,
    imagesAdded: req.uploadedFiles?.length || 0
  });

  res.json({
    success: true,
    message: 'Anuncio actualizado exitosamente',
    data: formatPost(result, userId)
  });
});

const deletePost = catchAsync(async (req, res) => {
  const { postId } = req.params;
  const userId = req.user.id;

  const post = await prisma.post.findFirst({
    where: { id: postId, authorId: userId, isActive: true }
  });

  if (!post) {
    throw new AppError('Anuncio no encontrado o sin permisos', 404, 'POST_NOT_FOUND');
  }

  if (post.images?.length > 0) {
    post.images.forEach(imageUrl => {
      if (imageUrl.includes('cloudinary')) {
        const publicId = extractPublicId(imageUrl);
        if (publicId) {
          deleteFromCloudinary(publicId).catch(err => 
            logger.warn('Could not delete post image', { imageUrl, error: err.message })
          );
        }
      }
    });
  }

  await prisma.$transaction([
    prisma.post.update({
      where: { id: postId },
      data: { isActive: false, deletedAt: new Date() }
    }),
    ...(req.user.userType === 'ESCORT' ? [
      prisma.escort.update({
        where: { userId },
        data: { currentPosts: { decrement: 1 } }
      })
    ] : [])
  ]);

  logger.info('Post deleted', { postId, userId, imagesDeleted: post.images?.length || 0 });

  res.json({
    success: true,
    message: 'Anuncio eliminado exitosamente'
  });
});

const likePost = catchAsync(async (req, res) => {
  const { postId } = req.params;
  const userId = req.user.id;

  const post = await prisma.post.findUnique({
    where: { id: postId, isActive: true },
    select: { id: true, authorId: true, title: true }
  });

  if (!post) {
    throw new AppError('Anuncio no encontrado', 404, 'POST_NOT_FOUND');
  }

  if (post.authorId === userId) {
    throw new AppError('No puedes dar like a tu propio anuncio', 400, 'CANNOT_LIKE_OWN_POST');
  }

  const existingLike = await prisma.like.findUnique({
    where: { userId_postId: { userId, postId } }
  });

  if (existingLike) {
    await prisma.$transaction([
      prisma.like.delete({
        where: { userId_postId: { userId, postId } }
      }),
      prisma.userInteraction.create({
        data: {
          userId,
          postId,
          targetUserId: post.authorId,
          type: 'UNLIKE',
          weight: -1.0
        }
      })
    ]);

    res.json({
      success: true,
      message: 'Like removido',
      data: { isLiked: false }
    });
  } else {
    await prisma.$transaction([
      prisma.like.create({
        data: { userId, postId }
      }),
      prisma.userInteraction.create({
        data: {
          userId,
          postId,
          targetUserId: post.authorId,
          type: 'LIKE',
          weight: 2.0
        }
      }),
      prisma.post.update({
        where: { id: postId },
        data: {
          score: { increment: 1 },
          engagementRate: { increment: 0.5 }
        }
      }),
      prisma.userReputation.update({
        where: { userId: post.authorId },
        data: {
          totalLikes: { increment: 1 },
          overallScore: { increment: 0.5 }
        }
      })
    ]);

    res.json({
      success: true,
      message: 'Like agregado',
      data: { isLiked: true }
    });
  }
});

const toggleFavorite = catchAsync(async (req, res) => {
  const { postId } = req.params;
  const userId = req.user.id;

  const post = await prisma.post.findUnique({
    where: { id: postId, isActive: true },
    select: { id: true, authorId: true, title: true }
  });

  if (!post) {
    throw new AppError('Anuncio no encontrado', 404, 'POST_NOT_FOUND');
  }

  const existingFavorite = await prisma.favorite.findUnique({
    where: { userId_postId: { userId, postId } }
  });

  if (existingFavorite) {
    await prisma.favorite.delete({
      where: { userId_postId: { userId, postId } }
    });

    res.json({
      success: true,
      message: 'Removido de favoritos',
      data: { isFavorited: false }
    });
  } else {
    await prisma.$transaction([
      prisma.favorite.create({
        data: { userId, postId }
      }),
      prisma.userInteraction.create({
        data: {
          userId,
          postId,
          targetUserId: post.authorId,
          type: 'FAVORITE',
          weight: 3.0
        }
      }),
      prisma.post.update({
        where: { id: postId },
        data: {
          score: { increment: 2 },
          engagementRate: { increment: 1.0 }
        }
      }),
      prisma.userReputation.update({
        where: { userId: post.authorId },
        data: {
          totalFavorites: { increment: 1 },
          overallScore: { increment: 1.0 }
        }
      })
    ]);

    res.json({
      success: true,
      message: 'Agregado a favoritos',
      data: { isFavorited: true }
    });
  }
});

const getMyPosts = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 20, status = 'active', sortBy = 'recent' } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const where = {
    authorId: userId,
    ...(status === 'active' && { isActive: true, deletedAt: null }),
    ...(status === 'deleted' && { isActive: false })
  };

  const orderByMap = {
    recent: { createdAt: 'desc' },
    oldest: { createdAt: 'asc' },
    popular: { views: 'desc' },
    likes: { likes: { _count: 'desc' } }
  };

  try {
    const [posts, totalCount] = await Promise.all([
      prisma.post.findMany({
        where,
        include: getPostInclude(userId),
        orderBy: orderByMap[sortBy] || orderByMap.recent,
        skip: offset,
        take: parseInt(limit)
      }),
      prisma.post.count({ where })
    ]);

    const stats = {
      totalPosts: totalCount,
      activePosts: status === 'active' ? totalCount : posts.filter(p => p.isActive).length,
      totalViews: posts.reduce((sum, post) => sum + (post.views || 0), 0),
      totalLikes: posts.reduce((sum, post) => sum + (post._count?.likes || 0), 0)
    };

    res.json({
      success: true,
      data: {
        posts: posts.map(post => formatPost(post, userId)),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / parseInt(limit)),
          hasNext: parseInt(page) * parseInt(limit) < totalCount,
          hasPrev: parseInt(page) > 1
        },
        stats,
        status
      }
    });

  } catch (error) {
    logger.error('Error in getMyPosts', { userId, error: error.message });
    
    res.json({
      success: true,
      data: {
        posts: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          pages: 0,
          hasNext: false,
          hasPrev: false
        },
        stats: { totalPosts: 0, activePosts: 0, totalViews: 0, totalLikes: 0 },
        status
      }
    });
  }
});

// ===================================================================
// 🚀 EXPORTS - ✅ INCLUIR NUEVAS FUNCIONES DE PAGO
// ===================================================================

module.exports = {
  createPost,
  checkPostLimits,
  updatePost,
  getFeed,
  getTrendingPosts,
  getDiscoveryPosts,
  getPostById,
  deletePost,
  likePost,
  toggleFavorite,
  getMyPosts,
  // ✅ EXPORTAR NUEVA FUNCIÓN PREMIUM
  hasAccessToPremiumContent,
  // ✅ NUEVAS FUNCIONES DE PAGO
  createAdditionalPostPayment,
  confirmAdditionalPostPayment,
  createBoostPayment,
  confirmBoostPayment
};