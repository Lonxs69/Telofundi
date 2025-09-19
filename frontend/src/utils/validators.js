// Validadores básicos
export const required = (value) => {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return 'Este campo es requerido';
  }
  return null;
};

export const email = (value) => {
  if (!value) return null;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return 'Introduce un email válido';
  }
  return null;
};

export const minLength = (min) => (value) => {
  if (!value) return null;
  if (value.length < min) {
    return `Debe tener al menos ${min} caracteres`;
  }
  return null;
};

export const maxLength = (max) => (value) => {
  if (!value) return null;
  if (value.length > max) {
    return `No puede tener más de ${max} caracteres`;
  }
  return null;
};

export const password = (value) => {
  if (!value) return null;
  
  const errors = [];
  
  if (value.length < 8) {
    errors.push('al menos 8 caracteres');
  }
  
  if (!/[A-Z]/.test(value)) {
    errors.push('una letra mayúscula');
  }
  
  if (!/[a-z]/.test(value)) {
    errors.push('una letra minúscula');
  }
  
  if (!/\d/.test(value)) {
    errors.push('un número');
  }
  
  if (errors.length > 0) {
    return `La contraseña debe contener ${errors.join(', ')}`;
  }
  
  return null;
};

export const confirmPassword = (originalPassword) => (value) => {
  if (!value) return null;
  if (value !== originalPassword) {
    return 'Las contraseñas no coinciden';
  }
  return null;
};

export const phone = (value) => {
  if (!value) return null;
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  const cleanPhone = value.replace(/\s/g, '');
  
  if (!phoneRegex.test(cleanPhone)) {
    return 'Introduce un número de teléfono válido';
  }
  return null;
};

export const age = (value) => {
  if (!value) return null;
  const numValue = parseInt(value);
  
  if (isNaN(numValue)) {
    return 'La edad debe ser un número';
  }
  
  if (numValue < 18) {
    return 'Debes ser mayor de 18 años';
  }
  
  if (numValue > 65) {
    return 'La edad máxima es 65 años';
  }
  
  return null;
};

export const username = (value) => {
  if (!value) return null;
  
  if (value.length < 3) {
    return 'El nombre de usuario debe tener al menos 3 caracteres';
  }
  
  if (value.length > 20) {
    return 'El nombre de usuario no puede tener más de 20 caracteres';
  }
  
  if (!/^[a-zA-Z0-9_]+$/.test(value)) {
    return 'Solo se permiten letras, números y guiones bajos';
  }
  
  return null;
};

export const url = (value) => {
  if (!value) return null;
  
  try {
    new URL(value);
    return null;
  } catch {
    return 'Introduce una URL válida';
  }
};

// Validadores para archivos
export const fileSize = (maxSizeMB) => (file) => {
  if (!file) return null;
  
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return `El archivo no puede ser mayor a ${maxSizeMB}MB`;
  }
  
  return null;
};

export const fileType = (allowedTypes) => (file) => {
  if (!file) return null;
  
  if (!allowedTypes.includes(file.type)) {
    return `Tipo de archivo no permitido. Tipos válidos: ${allowedTypes.join(', ')}`;
  }
  
  return null;
};

export const imageFile = (file) => {
  if (!file) return null;
  
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return 'Solo se permiten imágenes (JPG, PNG, WebP)';
  }
  
  return null;
};

// Validadores compuestos
export const profileValidation = {
  email: [required, email],
  username: [required, username],
  password: [required, password],
  confirmPassword: [], // Se configura dinámicamente
  phone: [phone],
  age: [required, age],
  description: [maxLength(500)],
  profileImage: [imageFile, fileSize(5)]
};

export const postValidation = {
  description: [required, minLength(10), maxLength(500)],
  phone: [required, phone],
  images: [required], // Validación personalizada para array de imágenes
  location: [required, minLength(2)]
};

export const agencyValidation = {
  ...profileValidation,
  companyName: [required, minLength(2), maxLength(100)],
  companyDescription: [required, minLength(20), maxLength(1000)],
  website: [url],
  license: [required]
};

// Función principal de validación
export const validateField = (value, validators) => {
  if (!validators || validators.length === 0) return null;
  
  for (const validator of validators) {
    const error = validator(value);
    if (error) return error;
  }
  
  return null;
};

export const validateForm = (formData, validationRules) => {
  const errors = {};
  let isValid = true;
  
  Object.keys(validationRules).forEach(field => {
    const value = formData[field];
    const validators = validationRules[field];
    const error = validateField(value, validators);
    
    if (error) {
      errors[field] = error;
      isValid = false;
    }
  });
  
  return { isValid, errors };
};

// Validaciones específicas para TeloFundi
export const validateImages = (images) => {
  if (!images || images.length === 0) {
    return 'Debes subir al menos una imagen';
  }
  
  if (images.length > 5) {
    return 'No puedes subir más de 5 imágenes';
  }
  
  for (let i = 0; i < images.length; i++) {
    const imageError = imageFile(images[i]) || fileSize(5)(images[i]);
    if (imageError) {
      return `Imagen ${i + 1}: ${imageError}`;
    }
  }
  
  return null;
};

export const validateTeloPoints = (currentPoints, requiredPoints) => {
  if (currentPoints < requiredPoints) {
    return `Necesitas ${requiredPoints - currentPoints} TeloPoints adicionales`;
  }
  return null;
};

export const validateUserType = (userType, allowedTypes) => {
  if (!allowedTypes.includes(userType)) {
    return 'Tipo de usuario no válido para esta acción';
  }
  return null;
};

export const validatePremiumFeature = (user, feature) => {
  if (!user.isPremium) {
    return `Esta función (${feature}) requiere una cuenta premium`;
  }
  return null;
};

export const validateAgencyAssociation = (user, action) => {
  if (action === 'leave_agency' && !user.agencyId) {
    return 'No perteneces a ninguna agencia';
  }
  
  if (action === 'join_agency' && user.agencyId) {
    return 'Ya perteneces a una agencia';
  }
  
  return null;
};

// Sanitizadores (limpiar datos de entrada)
export const sanitizeHtml = (str) => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

export const sanitizePhone = (phone) => {
  return phone.replace(/[^\d+]/g, '');
};

export const sanitizeUsername = (username) => {
  return username.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
};

export const sanitizeDescription = (description) => {
  return description.trim().replace(/\s+/g, ' ');
};