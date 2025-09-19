const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const logger = require('../utils/logger');

// ✅ CONFIGURAR CLOUDINARY CON TIMEOUT EXTENDIDO Y MANEJO DE ERRORES
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
  // ✅ CONFIGURACIONES CRÍTICAS PARA TIMEOUTS
  timeout: 180000, // 3 minutos - AUMENTADO
  chunk_size: 20000000, // 20MB chunks
  use_filename: false,
  unique_filename: true
});

// Verificar configuración de Cloudinary
const verifyCloudinaryConfig = () => {
  const { cloud_name, api_key, api_secret } = cloudinary.config();
  
  if (!cloud_name || !api_key || !api_secret) {
    logger.warn('Cloudinary not configured, using local storage');
    return false;
  }
  
  logger.info('Cloudinary configured successfully with extended timeout', { 
    cloud_name,
    timeout: '180s',
    chunk_size: '20MB'
  });
  return true;
};

const isCloudinaryConfigured = verifyCloudinaryConfig();

// ✅ CONFIGURACIONES DE TRANSFORMACIÓN OPTIMIZADAS
const transformations = {
  avatar: {
    width: 400,
    height: 400,
    crop: 'fill',
    gravity: 'face',
    quality: 'auto:good',
    format: 'webp',
    fetch_format: 'auto',
    dpr: 'auto'
  },
  post: {
    width: 1200,
    height: 900,
    crop: 'limit',
    quality: 'auto:good',
    format: 'webp',
    fetch_format: 'auto',
    dpr: 'auto'
  },
  thumbnail: {
    width: 300,
    height: 225,
    crop: 'fill',
    quality: 'auto:eco',
    format: 'webp',
    fetch_format: 'auto'
  },
  chat: {
    width: 800,
    height: 600,
    crop: 'limit',
    quality: 'auto:good',
    format: 'webp',
    fetch_format: 'auto'
  },
  document: {
    resource_type: 'raw'
  }
};

// ✅ MAPEO DE GRAVITY PARA SHARP
const mapGravityForSharp = (gravity) => {
  const gravityMap = {
    'face': 'centre',
    'center': 'centre',
    'centre': 'centre',
    'north': 'top',
    'south': 'bottom',
    'east': 'right',
    'west': 'left',
    'northeast': 'top right',
    'northwest': 'top left',
    'southeast': 'bottom right',
    'southwest': 'bottom left'
  };
  
  return gravityMap[gravity] || 'centre';
};

// ✅ FUNCIÓN CRÍTICA: COMPRIMIR IMAGEN ANTES DE SUBIR (ESPECIALMENTE AVATARS)
const compressImageBeforeUpload = async (buffer, targetSize = 1024 * 1024) => {
  try {
    if (buffer.length <= targetSize) {
      return buffer; // No necesita compresión
    }

    logger.info('Compressing image before upload', {
      originalSize: buffer.length,
      targetSize
    });

    // Comprimir progresivamente hasta llegar al tamaño deseado
    let quality = 85;
    let compressedBuffer = buffer;
    let attempts = 0;
    const maxAttempts = 5;

    while (compressedBuffer.length > targetSize && quality > 30 && attempts < maxAttempts) {
      compressedBuffer = await sharp(buffer)
        .resize(1500, 1500, { 
          fit: 'inside', 
          withoutEnlargement: true 
        })
        .jpeg({ 
          quality,
          progressive: true,
          mozjpeg: true
        })
        .toBuffer();

      quality -= 15;
      attempts++;
    }

    logger.info('Image compression completed', {
      originalSize: buffer.length,
      compressedSize: compressedBuffer.length,
      quality: quality + 15, // Último valor usado
      attempts,
      reduction: Math.round((1 - compressedBuffer.length / buffer.length) * 100) + '%'
    });

    return compressedBuffer;
  } catch (error) {
    logger.error('Image compression failed:', error);
    return buffer; // Devolver original si falla
  }
};

// ✅ FUNCIÓN CRÍTICA: UPLOAD CON REINTENTOS Y TIMEOUT PROGRESIVO
const uploadWithRetry = async (buffer, options, maxRetries = 3) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`Cloudinary upload attempt ${attempt}/${maxRetries}`, {
        bufferSize: buffer.length,
        publicId: options.public_id,
        folder: options.folder
      });

      // ✅ TIMEOUT PROGRESIVO: más tiempo en cada intento
      const timeoutMultiplier = attempt * 1.5;
      const baseTimeout = 60000; // 60 segundos base
      const attemptTimeout = Math.min(baseTimeout * timeoutMultiplier, 300000); // máximo 5 minutos

      const attemptOptions = {
        ...options,
        timeout: attemptTimeout,
        chunk_size: Math.min(20000000, Math.max(6000000, Math.floor(buffer.length / 2))),
        // ✅ CONFIGURACIONES ADICIONALES PARA ESTABILIDAD
        eager_async: false, // Evitar transformaciones asíncronas
        invalidate: false,  // No invalidar cache inmediatamente
        overwrite: true     // Permitir sobrescribir para reintentos
      };

      logger.info(`Upload attempt ${attempt} with timeout: ${attemptTimeout}ms`);

      // ✅ PROMESA CON TIMEOUT MANUAL ADICIONAL
      const uploadPromise = new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          attemptOptions,
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          }
        );
        
        uploadStream.end(buffer);
      });

      // ✅ TIMEOUT MANUAL ADICIONAL COMO BACKUP
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Manual timeout after ${attemptTimeout}ms on attempt ${attempt}`));
        }, attemptTimeout + 10000); // 10 segundos adicionales
      });

      const result = await Promise.race([uploadPromise, timeoutPromise]);

      logger.info(`Cloudinary upload successful on attempt ${attempt}`, {
        public_id: result.public_id,
        secure_url: result.secure_url,
        bytes: result.bytes,
        format: result.format,
        width: result.width,
        height: result.height
      });

      return result;

    } catch (error) {
      lastError = error;
      
      logger.warn(`Cloudinary upload attempt ${attempt} failed`, {
        error: error.message,
        errorCode: error.http_code,
        errorName: error.name,
        willRetry: attempt < maxRetries,
        bufferSize: buffer.length
      });

      // ✅ DETERMINAR SI DEBEMOS REINTENTAR
      const isRetryableError = (
        error.name === 'TimeoutError' || 
        error.http_code === 499 || 
        error.http_code === 500 ||
        error.http_code === 502 ||
        error.http_code === 503 ||
        error.message.includes('timeout') ||
        error.message.includes('Manual timeout')
      );

      if (isRetryableError && attempt < maxRetries) {
        // Esperar antes del siguiente intento (backoff exponencial)
        const delay = Math.min(3000 * Math.pow(2, attempt - 1), 15000);
        logger.info(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      } else {
        // No reintentar para otros errores
        break;
      }
    }
  }

  // Si llegamos aquí, todos los intentos fallaron
  logger.error('All Cloudinary upload attempts failed', {
    maxRetries,
    bufferSize: buffer.length,
    lastError: {
      message: lastError.message,
      code: lastError.http_code,
      name: lastError.name
    }
  });

  throw lastError;
};

// ✅ FUNCIÓN PARA OPTIMIZAR IMAGEN CON SHARP - CORREGIDA
const optimizeImage = async (buffer, type = 'post') => {
  try {
    const config = transformations[type];
    if (!config || type === 'document') {
      return buffer;
    }

    let sharpInstance = sharp(buffer);
    
    // Obtener metadata de la imagen
    const metadata = await sharpInstance.metadata();
    logger.debug('Image metadata', {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: metadata.size
    });

    // Auto-rotar basado en EXIF
    sharpInstance = sharpInstance.rotate();

    // ✅ REDIMENSIONAR CON GRAVITY CORREGIDO
    if (config.width && config.height) {
      const sharpGravity = mapGravityForSharp(config.gravity || 'center');
      
      sharpInstance = sharpInstance.resize(config.width, config.height, {
        fit: config.crop === 'fill' ? 'cover' : 'inside',
        position: sharpGravity,
        withoutEnlargement: true
      });
    }

    // Aplicar compresión según formato
    let outputBuffer;
    switch (config.format) {
      case 'webp':
        outputBuffer = await sharpInstance
          .webp({ quality: 85, effort: 4 })
          .toBuffer();
        break;
      case 'jpeg':
        outputBuffer = await sharpInstance
          .jpeg({ quality: 85, progressive: true })
          .toBuffer();
        break;
      case 'png':
        outputBuffer = await sharpInstance
          .png({ compressionLevel: 8, adaptiveFiltering: true })
          .toBuffer();
        break;
      default:
        outputBuffer = await sharpInstance.toBuffer();
    }

    logger.debug('Image optimized successfully', {
      originalSize: buffer.length,
      optimizedSize: outputBuffer.length,
      compressionRatio: ((buffer.length - outputBuffer.length) / buffer.length * 100).toFixed(2) + '%'
    });

    return outputBuffer;
  } catch (error) {
    logger.error('Error optimizing image:', error);
    return buffer; // Retornar buffer original si falla
  }
};

// ✅ FUNCIÓN PRINCIPAL MEJORADA - CON MANEJO COMPLETO DE PROMESAS
const uploadToCloudinary = async (file, folderOrOptions = 'telofundi', options = {}) => {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('📤 === UPLOAD TO CLOUDINARY (TIMEOUT-RESISTANT) ===');
      console.log('📤 Parameters received:', {
        fileType: typeof file,
        hasBuffer: !!(file && file.buffer),
        folderOrOptions: typeof folderOrOptions,
        folderValue: folderOrOptions,
        optionsType: typeof options,
        optionsKeys: Object.keys(options || {})
      });

      if (!isCloudinaryConfigured) {
        const error = new Error('Cloudinary not configured');
        logger.error('Cloudinary not configured');
        return reject(error);
      }

      // ✅ CORREGIR PARÁMETROS
      let folder, finalOptions;
      
      if (typeof folderOrOptions === 'string') {
        folder = folderOrOptions;
        finalOptions = options || {};
      } else if (typeof folderOrOptions === 'object' && folderOrOptions !== null) {
        folder = folderOrOptions.folder || 'telofundi';
        finalOptions = folderOrOptions;
      } else {
        folder = 'telofundi';
        finalOptions = options || {};
      }

      console.log('📤 Corrected parameters:', {
        folder: folder,
        folderType: typeof folder,
        finalOptions: Object.keys(finalOptions)
      });

      let uploadBuffer;
      let fileType = 'post';
      let mimetype = 'image/jpeg';

      // Manejar diferentes tipos de input
      if (Buffer.isBuffer(file)) {
        uploadBuffer = file;
        mimetype = finalOptions.mimetype || 'image/jpeg';
        fileType = finalOptions.type || determineFileType(finalOptions.fieldname, folder);
      } else if (file && file.buffer) {
        uploadBuffer = file.buffer;
        mimetype = file.mimetype;
        fileType = determineFileType(file.fieldname, folder);
      } else {
        const error = new Error('Invalid file format - expected Buffer or file with buffer property');
        logger.error('Invalid file format:', typeof file);
        return reject(error);
      }
      
      console.log('📤 File processing:', {
        fileType,
        mimetype,
        bufferSize: uploadBuffer.length,
        isImage: mimetype.startsWith('image/')
      });

      const isImage = mimetype.startsWith('image/');
      const originalSize = uploadBuffer.length;

      // ✅ COMPRIMIR IMAGEN SI ES GRANDE (CRÍTICO PARA AVATARS)
      if (isImage && originalSize > 1024 * 1024) { // > 1MB
        console.log('📦 Compressing image before upload...');
        try {
          // Para avatars, comprimir más agresivamente
          const targetSize = fileType === 'avatar' ? 800 * 1024 : 1.5 * 1024 * 1024; // 800KB para avatars, 1.5MB para otros
          uploadBuffer = await compressImageBeforeUpload(uploadBuffer, targetSize);
          console.log('📦 Compression completed:', {
            originalSize,
            compressedSize: uploadBuffer.length,
            reduction: Math.round((1 - uploadBuffer.length / originalSize) * 100) + '%'
          });
        } catch (compressionError) {
          logger.warn('Compression failed, using original:', compressionError.message);
          // Continuar con archivo original si la compresión falla
        }
      }

      // ✅ OPTIMIZAR IMAGEN SOLO SI NO ES AVATAR (evitar problemas con face detection)
      if (isImage && !finalOptions.skipOptimization && fileType !== 'avatar') {
        logger.debug('Optimizing image with Sharp');
        try {
          uploadBuffer = await optimizeImage(uploadBuffer, fileType);
        } catch (optimizationError) {
          logger.warn('Sharp optimization failed, skipping:', optimizationError.message);
          // Continuar sin optimización
        }
      } else if (fileType === 'avatar') {
        logger.debug('Skipping Sharp optimization for avatar - using Cloudinary transformations');
      }

      // Generar ID único
      const timestamp = Date.now();
      const random = Math.random().toString(36).substr(2, 9);
      const userId = finalOptions.userId || (finalOptions.public_id?.includes('_') ? finalOptions.public_id.split('_')[1] : 'user');
      const publicId = finalOptions.public_id || `${fileType}_${userId}_${timestamp}_${random}`;

      // ✅ CONFIGURAR OPCIONES DE SUBIDA CON CONFIGURACIONES SEGURAS
      const uploadOptions = {
        folder: folder,
        resource_type: isImage ? 'image' : 'raw',
        public_id: publicId,
        overwrite: finalOptions.overwrite || false,
        unique_filename: true,
        use_filename: false,
        // ✅ CONFIGURACIONES CRÍTICAS PARA TIMEOUTS Y ESTABILIDAD
        timeout: 180000, // 3 minutos
        chunk_size: Math.min(20000000, Math.max(6000000, Math.floor(uploadBuffer.length / 2))),
        eager_async: false, // CRÍTICO: No usar transformaciones asíncronas
        invalidate: false,  // No invalidar cache inmediatamente
        // ✅ SOLO INCLUIR CAMPOS VÁLIDOS DE CLOUDINARY
        ...(finalOptions.transformation && { transformation: finalOptions.transformation }),
        ...(finalOptions.tags && { tags: finalOptions.tags }),
        ...(finalOptions.context && { context: finalOptions.context })
      };

      console.log('📤 Upload options:', {
        folder: uploadOptions.folder,
        resource_type: uploadOptions.resource_type,
        public_id: uploadOptions.public_id,
        timeout: uploadOptions.timeout,
        chunk_size: uploadOptions.chunk_size,
        bufferSize: uploadBuffer.length
      });

      // ✅ APLICAR TRANSFORMACIONES ESPECÍFICAS PARA IMÁGENES
      if (isImage && transformations[fileType]) {
        const transform = transformations[fileType];
        
        // ✅ TRANSFORMACIONES SIMPLIFICADAS PARA AVATARES (EVITAR PROBLEMAS)
        if (fileType === 'avatar') {
          uploadOptions.transformation = [
            {
              width: 400,
              height: 400,
              crop: 'fill',
              gravity: 'face',
              quality: 'auto:good',
              fetch_format: 'auto'
            }
          ];
        } else {
          uploadOptions.transformation = [transform];
        }
      }

      console.log('📤 Final upload options:', JSON.stringify(uploadOptions, null, 2));

      // ✅ SUBIR CON REINTENTOS Y MANEJO COMPLETO DE PROMESAS
      try {
        const result = await uploadWithRetry(uploadBuffer, uploadOptions, 3);

        // ✅ GENERAR VARIACIONES SOLO PARA POSTS
        let variations = {};
        if (isImage && fileType === 'post' && !finalOptions.skipVariations) {
          try {
            variations = await generateImageVariations(result.public_id);
          } catch (error) {
            logger.warn('Error generating image variations:', error);
            // No es crítico, continuar sin variaciones
          }
        }

        const uploadResult = {
          public_id: result.public_id,
          secure_url: result.secure_url,
          url: result.url,
          format: result.format,
          width: result.width,
          height: result.height,
          bytes: result.bytes,
          created_at: result.created_at,
          folder,
          variations,
          optimized: originalSize !== uploadBuffer.length
        };

        logger.info('File uploaded to Cloudinary successfully', {
          publicId: result.public_id,
          url: result.secure_url,
          size: result.bytes,
          format: result.format,
          folder,
          fileType,
          hasVariations: Object.keys(variations).length > 0,
          originalSize,
          finalSize: uploadBuffer.length,
          compressed: originalSize !== uploadBuffer.length
        });

        resolve(uploadResult);

      } catch (uploadError) {
        logger.error('Upload failed after all retries:', uploadError);
        reject(uploadError);
      }

    } catch (error) {
      console.error('❌ Error in uploadToCloudinary:', error);
      logger.error('Error in uploadToCloudinary:', {
        error: error.message,
        stack: error.stack
      });
      reject(error);
    }
  }).catch(error => {
    // ✅ MANEJO FINAL DE ERRORES PARA EVITAR UNHANDLED PROMISES
    console.error('❌ Final error catch in uploadToCloudinary:', error);
    logger.error('Final error catch in uploadToCloudinary:', {
      error: error.message,
      errorCode: error.http_code,
      errorName: error.name
    });
    
    // ✅ CREAR ERRORES MÁS ESPECÍFICOS PARA EL USUARIO
    if (error.name === 'TimeoutError' || error.http_code === 499 || error.message.includes('timeout')) {
      throw new Error('La subida del archivo tardó demasiado. Intenta con una imagen más pequeña o verifica tu conexión a internet.');
    } else if (error.message && error.message.includes('Invalid image file')) {
      throw new Error('Archivo de imagen inválido o corrupto');
    } else if (error.message && error.message.includes('File size too large')) {
      throw new Error('Archivo demasiado grande');
    } else if (error.http_code === 400) {
      throw new Error('El archivo no es válido. Verifica que sea una imagen en formato JPG, PNG o WebP.');
    } else if (error.http_code === 401) {
      throw new Error('Error de configuración del servicio. Contacta al administrador.');
    } else if (error.http_code === 420) {
      throw new Error('Se ha excedido el límite de subidas. Intenta más tarde.');
    }
    
    // Fallback a almacenamiento local si Cloudinary falla EN DESARROLLO
    if (process.env.NODE_ENV !== 'production') {
      console.log('📤 Attempting fallback to local storage...');
      logger.info('Falling back to local storage due to Cloudinary error');
      try {
        return uploadToLocal(file, folder, finalOptions);
      } catch (localError) {
        logger.error('Local storage fallback also failed:', localError);
        throw new Error('Error subiendo archivo: servicio de imágenes no disponible');
      }
    }
    
    throw new Error(`Error subiendo archivo: ${error.message}`);
  });
};

// ✅ FUNCIÓN PARA UPLOAD MÚLTIPLE MEJORADA
const uploadMultipleToCloudinary = async (files, options = {}) => {
  try {
    console.log('📤 === MULTIPLE UPLOAD TO CLOUDINARY (IMPROVED) ===');
    console.log('📤 Files count:', files.length);

    if (!files || !Array.isArray(files) || files.length === 0) {
      throw new Error('No files provided for upload');
    }

    const results = {
      successful: [],
      failed: [],
      totalUploaded: 0,
      totalFailed: 0
    };

    // ✅ PROCESAR EN LOTES PEQUEÑOS PARA EVITAR TIMEOUTS
    const batchSize = 1; // UNO POR UNO para evitar timeouts
    
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      console.log(`📤 Processing file ${i + 1}/${files.length}`);
      
      for (let j = 0; j < batch.length; j++) {
        const file = batch[j];
        const fileIndex = i + j;
        
        try {
          const fileOptions = {
            public_id: `post_${options.userId || 'user'}_${Date.now()}_${fileIndex}`,
            skipVariations: fileIndex > 0,
            userId: options.userId,
            type: 'post',
            ...(options.transformation && { transformation: options.transformation }),
            ...(options.tags && { tags: options.tags })
          };
          
          const result = await uploadToCloudinary(file, options.folder || 'telofundi/posts', fileOptions);
          results.successful.push(result);
          results.totalUploaded++;
          
          console.log(`✅ File ${fileIndex + 1} uploaded successfully`);
          
        } catch (error) {
          console.error(`❌ File ${fileIndex + 1} upload failed:`, error.message);
          results.failed.push({
            file: file.originalname,
            error: error.message,
            index: fileIndex
          });
          results.totalFailed++;
        }
        
        // Pausa entre archivos para evitar rate limiting
        if (fileIndex < files.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 segundos entre archivos
        }
      }
    }

    console.log('📤 Multiple upload completed:', {
      successful: results.totalUploaded,
      failed: results.totalFailed,
      total: files.length
    });

    return results;

  } catch (error) {
    logger.error('Error in multiple upload:', error);
    throw error;
  }
};

// ✅ RESTO DE FUNCIONES SIN CAMBIOS PERO CON MEJOR MANEJO DE PROMESAS

const uploadToLocal = async (file, folderOrOptions = 'misc', options = {}) => {
  try {
    console.log('💾 === UPLOAD TO LOCAL DEBUG ===');
    console.log('💾 Parameters received:', {
      fileType: typeof file,
      hasBuffer: !!(file && file.buffer),
      folderOrOptions: typeof folderOrOptions,
      folderValue: folderOrOptions,
      optionsType: typeof options
    });

    let folder, finalOptions;
    
    if (typeof folderOrOptions === 'string') {
      folder = folderOrOptions;
      finalOptions = options || {};
    } else if (typeof folderOrOptions === 'object' && folderOrOptions !== null) {
      folder = finalOptions.folder || 'misc';
      finalOptions = folderOrOptions;
    } else {
      folder = 'misc';
      finalOptions = options || {};
    }

    console.log('💾 Corrected parameters:', {
      folder: folder,
      folderType: typeof folder
    });

    const uploadDir = path.join(__dirname, '../../imagenes', folder);
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    let fileName;
    let fileBuffer;
    
    if (Buffer.isBuffer(file)) {
      const extension = finalOptions.mimetype ? finalOptions.mimetype.split('/')[1] : 'jpg';
      fileName = generateUniqueFileName(`file.${extension}`);
      fileBuffer = file;
    } else if (file && file.buffer) {
      fileName = generateUniqueFileName(file.originalname);
      fileBuffer = file.buffer;
    } else {
      throw new Error('Invalid file format for local upload');
    }
    
    const filePath = path.join(uploadDir, fileName);

    console.log('💾 Saving to:', filePath);

    await fs.promises.writeFile(filePath, fileBuffer);

    const result = {
      public_id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      secure_url: `/uploads/${folder}/${fileName}`,
      url: `/uploads/${folder}/${fileName}`,
      format: path.extname(fileName).slice(1),
      bytes: fileBuffer.length,
      created_at: new Date().toISOString(),
      folder: 'local',
      local: true
    };

    console.log('✅ Local upload successful:', result);
    logger.info('File uploaded to local storage', {
      path: filePath,
      size: fileBuffer.length,
      fileName
    });

    return result;

  } catch (error) {
    console.error('❌ Error uploading to local storage:', error);
    logger.error('Error uploading to local storage:', error);
    throw error;
  }
};

const generateImageVariations = async (publicId) => {
  try {
    const variations = {};

    variations.thumbnail = cloudinary.url(publicId, {
      transformation: [
        { width: 300, height: 225, crop: 'fill', quality: 'auto:eco', format: 'webp' }
      ]
    });

    variations.small = cloudinary.url(publicId, {
      transformation: [
        { width: 600, height: 450, crop: 'limit', quality: 'auto:good', format: 'webp' }
      ]
    });

    variations.medium = cloudinary.url(publicId, {
      transformation: [
        { width: 900, height: 675, crop: 'limit', quality: 'auto:good', format: 'webp' }
      ]
    });

    return variations;
  } catch (error) {
    logger.error('Error generating image variations:', error);
    return {};
  }
};

const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    if (!isCloudinaryConfigured) {
      logger.warn('Cannot delete from Cloudinary - not configured');
      return { success: false, error: 'Cloudinary not configured' };
    }

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true,
      timeout: 30000
    });

    logger.info('File deleted from Cloudinary', {
      publicId,
      result: result.result
    });

    return { success: result.result === 'ok', result };

  } catch (error) {
    logger.error('Error deleting from Cloudinary:', error);
    return { success: false, error: error.message };
  }
};

const deleteManyFromCloudinary = async (publicIds, resourceType = 'image') => {
  try {
    if (!isCloudinaryConfigured || !publicIds || publicIds.length === 0) {
      return { success: false, error: 'Cloudinary not configured or no IDs provided' };
    }

    const result = await cloudinary.api.delete_resources(publicIds, {
      resource_type: resourceType,
      timeout: 60000
    });

    logger.info('Multiple files deleted from Cloudinary', {
      count: publicIds.length,
      deleted: Object.keys(result.deleted).length
    });

    return { success: true, result };

  } catch (error) {
    logger.error('Error deleting multiple files from Cloudinary:', error);
    return { success: false, error: error.message };
  }
};

const getCloudinaryFileInfo = async (publicId, resourceType = 'image') => {
  try {
    if (!isCloudinaryConfigured) {
      return null;
    }

    const result = await cloudinary.api.resource(publicId, {
      resource_type: resourceType,
      timeout: 15000
    });

    return {
      public_id: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      created_at: result.created_at,
      secure_url: result.secure_url
    };

  } catch (error) {
    logger.error('Error getting Cloudinary file info:', error);
    return null;
  }
};

const transformCloudinaryImage = async (publicId, transformations) => {
  try {
    if (!isCloudinaryConfigured) {
      throw new Error('Cloudinary not configured');
    }

    const transformedUrl = cloudinary.url(publicId, {
      transformation: transformations
    });

    return transformedUrl;

  } catch (error) {
    logger.error('Error transforming Cloudinary image:', error);
    throw error;
  }
};

const getCloudinaryUsage = async () => {
  try {
    if (!isCloudinaryConfigured) {
      return null;
    }

    const usage = await cloudinary.api.usage({
      timeout: 15000
    });
    
    return {
      plan: usage.plan,
      credits: usage.credits,
      objects: usage.objects,
      bandwidth: usage.bandwidth,
      storage: usage.storage,
      requests: usage.requests,
      resources: usage.resources,
      derived_resources: usage.derived_resources
    };

  } catch (error) {
    logger.error('Error getting Cloudinary usage:', error);
    return null;
  }
};

const cleanupUnusedFiles = async (olderThanDays = 7) => {
  try {
    if (!isCloudinaryConfigured) {
      return { success: false, error: 'Cloudinary not configured' };
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const searchResult = await cloudinary.search
      .expression(`folder:telofundi/temp AND created_at<${cutoffDate.toISOString()}`)
      .sort_by([['created_at', 'desc']])
      .max_results(100)
      .execute();

    const publicIds = searchResult.resources.map(resource => resource.public_id);

    if (publicIds.length > 0) {
      const deleteResult = await deleteManyFromCloudinary(publicIds);
      
      logger.info('Cleanup completed', {
        filesFound: searchResult.total_count,
        filesDeleted: publicIds.length,
        olderThanDays
      });

      return { success: true, deleted: publicIds.length };
    }

    return { success: true, deleted: 0 };

  } catch (error) {
    logger.error('Error during cleanup:', error);
    return { success: false, error: error.message };
  }
};

// ✅ FUNCIÓN DE TEST DE CONECTIVIDAD
const testCloudinaryConnection = async () => {
  try {
    console.log('🔍 Testing Cloudinary connection...');
    
    const result = await cloudinary.api.ping({
      timeout: 10000
    });
    
    console.log('✅ Cloudinary connection successful:', result);
    return { success: true, result };
    
  } catch (error) {
    console.error('❌ Cloudinary connection failed:', error);
    return { 
      success: false, 
      error: error.message,
      errorCode: error.http_code 
    };
  }
};

// FUNCIONES AUXILIARES
const determineFileType = (fieldname, folder) => {
  if (fieldname === 'avatar' || (typeof folder === 'string' && folder.includes('avatar'))) return 'avatar';
  if (fieldname === 'images' || fieldname === 'postImages' || (typeof folder === 'string' && folder.includes('post'))) return 'post';
  if (fieldname === 'documents' || (typeof folder === 'string' && folder.includes('document'))) return 'document';
  if (fieldname === 'cedulaFrente' || fieldname === 'cedulaTrasera' || (typeof folder === 'string' && folder.includes('agency'))) return 'agency';
  if (typeof folder === 'string' && folder.includes('chat')) return 'chat';
  return 'post';
};

const generatePublicId = (originalName) => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  const nameWithoutExt = path.parse(originalName).name
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 20);
  
  return `${timestamp}_${nameWithoutExt}_${random}`;
};

const generateUniqueFileName = (originalName) => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  const ext = path.extname(originalName);
  const nameWithoutExt = path.parse(originalName).name
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 20);
  
  return `${timestamp}_${nameWithoutExt}_${random}${ext}`;
};

const validateFileType = (file, allowedTypes = []) => {
  if (allowedTypes.length === 0) return true;
  
  const fileExtension = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype.toLowerCase();
  
  return allowedTypes.some(type => {
    if (type.startsWith('.')) {
      return fileExtension === type;
    }
    return mimeType.includes(type);
  });
};

const validateFileSize = (file, maxSize) => {
  return file.buffer.length <= maxSize;
};

module.exports = {
  uploadToCloudinary,
  uploadMultipleToCloudinary,
  uploadToLocal,
  deleteFromCloudinary,
  deleteManyFromCloudinary,
  getCloudinaryFileInfo,
  transformCloudinaryImage,
  generateImageVariations,
  optimizeImage,
  validateFileType,
  validateFileSize,
  getCloudinaryUsage,
  cleanupUnusedFiles,
  testCloudinaryConnection,
  compressImageBeforeUpload, // ✅ NUEVO
  isCloudinaryConfigured
};