import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { ROUTES } from '../../utils/constants';
import logo from '../../assets/images/logo png mejora.png';
import './ResetPasswordPage.css';

const ResetPasswordPage = () => {
  const [token, setToken] = useState('');
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const { navigateTo, openAuthModal } = useApp();

  // ✅ EXTRAER TOKEN DE LA URL
  useEffect(() => {
    setMounted(true);
    
    console.log('🔍 URL actual:', window.location.href);
    console.log('🔍 Search params:', window.location.search);
    
    const urlParams = new URLSearchParams(window.location.search);
    const resetToken = urlParams.get('token');
    
    console.log('🔑 Token extraído:', resetToken);
    
    if (!resetToken) {
      console.log('❌ No se encontró token en la URL, redirigiendo al home');
      navigateTo(ROUTES.HOME);
      return;
    }
    
    console.log('✅ Token válido encontrado:', resetToken);
    setToken(resetToken);
  }, [navigateTo]);

  // Validación de formulario
  const validateForm = () => {
    const errors = {};
    
    if (!formData.password) {
      errors.password = 'La nueva contraseña es requerida';
    } else if (formData.password.length < 8) {
      errors.password = 'La contraseña debe tener al menos 8 caracteres';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = 'Debe contener al menos una mayúscula, una minúscula y un número';
    }
    
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Confirma tu nueva contraseña';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar error del campo cuando el usuario escriba
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // ✅ HANDLE FORM SUBMISSION
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('🔐 Iniciando reset de contraseña...');
    console.log('🔑 Token a usar:', token);
    console.log('🔒 Nueva contraseña longitud:', formData.password.length);
    
    if (!validateForm()) {
      console.log('❌ Formulario no válido');
      return;
    }
    
    setLoading(true);
    setFormErrors({});
    
    try {
      const backendUrl = import.meta.env?.VITE_API_URL || 'http://localhost:3000';
      const resetUrl = `${backendUrl}/api/auth/reset-password`;
      
      console.log('📡 Enviando petición a:', resetUrl);

      const response = await fetch(resetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          password: formData.password
        }),
      });

      console.log('📡 Respuesta status:', response.status);
      
      const data = await response.json();
      console.log('📦 Respuesta datos:', data);

      if (data.success) {
        console.log('✅ Reset exitoso');
        setSuccess(true);
      } else {
        console.log('❌ Error en reset:', data.message);
        setFormErrors({ 
          submit: data.message || 'Error restableciendo la contraseña' 
        });
      }
    } catch (error) {
      console.error('💥 Error de conexión:', error);
      setFormErrors({ 
        submit: 'Error de conexión. Inténtalo de nuevo.' 
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ HANDLE LOGIN REDIRECT
  const handleGoToLogin = () => {
    navigateTo(ROUTES.HOME);
    // Esperar un poco para que navegue, luego abrir modal de login
    setTimeout(() => {
      if (openAuthModal) {
        openAuthModal('login');
      }
    }, 500);
  };

  // Variantes de animación
  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.23, 1, 0.32, 1]
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.95, 
      y: 20,
      transition: {
        duration: 0.3,
        ease: [0.23, 1, 0.32, 1]
      }
    }
  };

  const contentVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.23, 1, 0.32, 1],
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.3,
        ease: [0.23, 1, 0.32, 1]
      }
    }
  };

  const sideVariants = {
    left: {
      x: 0,
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: [0.23, 1, 0.32, 1]
      }
    },
    right: {
      x: 0,
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: [0.23, 1, 0.32, 1]
      }
    }
  };

  if (!mounted) return null;

  // ✅ MENSAJE DE ERROR SI NO HAY TOKEN
  if (!token) {
    return (
      <div className="reset-password-container">
        <motion.div
          className="reset-password-modal"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="reset-password-content">
            {/* Lado del brand */}
            <motion.div 
              className="reset-password-brand-side"
              variants={sideVariants}
              initial="left"
              animate="left"
            >
              <div className="reset-password-brand-shapes">
                <motion.div 
                  className="reset-password-brand-shape reset-password-brand-shape-1"
                  animate={{ 
                    y: [0, -15, 0], 
                    scale: [1, 1.03, 1], 
                    rotate: [0, 120, 240, 360] 
                  }}
                  transition={{ 
                    duration: 25, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                  }}
                ></motion.div>
                <motion.div 
                  className="reset-password-brand-shape reset-password-brand-shape-2"
                  animate={{ 
                    y: [0, 8, 0], 
                    scale: [1, 0.97, 1], 
                    rotate: [0, -120, -240, -360] 
                  }}
                  transition={{ 
                    duration: 25, 
                    repeat: Infinity, 
                    ease: "easeInOut",
                    delay: -8
                  }}
                ></motion.div>
                <motion.div 
                  className="reset-password-brand-shape reset-password-brand-shape-3"
                  animate={{ 
                    y: [0, -8, 0], 
                    scale: [1, 1.02, 1], 
                    rotate: [0, 180, 360] 
                  }}
                  transition={{ 
                    duration: 25, 
                    repeat: Infinity, 
                    ease: "easeInOut",
                    delay: -16
                  }}
                ></motion.div>
              </div>
              
              <motion.div 
                className="reset-password-brand-content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1], delay: 0.2 }}
              >
                <div className="reset-password-logo-container">
                  <motion.img 
                    src={logo} 
                    alt="TeloFundi Logo" 
                    className="reset-password-logo"
                    animate={{ 
                      y: [0, -12, 0], 
                      rotate: [0, 2, 0] 
                    }}
                    transition={{ 
                      duration: 6, 
                      repeat: Infinity, 
                      ease: "easeInOut" 
                    }}
                  />
                </div>
                <h1 className="reset-password-brand-title">🔐 TeloFundi</h1>
                <p className="reset-password-brand-subtitle">
                  Enlace de restablecimiento inválido o expirado
                </p>
              </motion.div>
            </motion.div>

            {/* Lado del error */}
            <motion.div 
              className="reset-password-form-side"
              variants={sideVariants}
              initial="right"
              animate="right"
            >
              <div className="reset-password-form-content">
                <div className="reset-password-form-header">
                  <h2 className="reset-password-form-title">⚠️ Enlace inválido</h2>
                  <p className="reset-password-form-subtitle">
                    El enlace de restablecimiento no es válido o ha expirado
                  </p>
                </div>
                
                <div className="reset-password-form-links">
                  <motion.button 
                    onClick={() => navigateTo(ROUTES.HOME)}
                    className="reset-password-login-btn"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                      <polyline points="9,22 9,12 15,12 15,22"></polyline>
                    </svg>
                    Volver al inicio
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ✅ MENSAJE DE ÉXITO CON OPCIÓN DE LOGIN
  if (success) {
    return (
      <div className="reset-password-container">
        <motion.div
          className="reset-password-modal success"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="reset-password-content">
            {/* Lado del brand */}
            <motion.div 
              className="reset-password-brand-side"
              variants={sideVariants}
              initial="left"
              animate="left"
            >
              <div className="reset-password-brand-shapes">
                <motion.div 
                  className="reset-password-brand-shape reset-password-brand-shape-1"
                  animate={{ 
                    y: [0, -15, 0], 
                    scale: [1, 1.03, 1], 
                    rotate: [0, 120, 240, 360] 
                  }}
                  transition={{ 
                    duration: 25, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                  }}
                ></motion.div>
                <motion.div 
                  className="reset-password-brand-shape reset-password-brand-shape-2"
                  animate={{ 
                    y: [0, 8, 0], 
                    scale: [1, 0.97, 1], 
                    rotate: [0, -120, -240, -360] 
                  }}
                  transition={{ 
                    duration: 25, 
                    repeat: Infinity, 
                    ease: "easeInOut",
                    delay: -8
                  }}
                ></motion.div>
                <motion.div 
                  className="reset-password-brand-shape reset-password-brand-shape-3"
                  animate={{ 
                    y: [0, -8, 0], 
                    scale: [1, 1.02, 1], 
                    rotate: [0, 180, 360] 
                  }}
                  transition={{ 
                    duration: 25, 
                    repeat: Infinity, 
                    ease: "easeInOut",
                    delay: -16
                  }}
                ></motion.div>
              </div>
              
              <motion.div 
                className="reset-password-brand-content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1], delay: 0.2 }}
              >
                <div className="reset-password-logo-container">
                  <motion.img 
                    src={logo} 
                    alt="TeloFundi Logo" 
                    className="reset-password-logo"
                    animate={{ 
                      y: [0, -12, 0], 
                      rotate: [0, 2, 0] 
                    }}
                    transition={{ 
                      duration: 6, 
                      repeat: Infinity, 
                      ease: "easeInOut" 
                    }}
                  />
                </div>
                <h1 className="reset-password-brand-title">🔐 TeloFundi</h1>
                <p className="reset-password-brand-subtitle">
                  Tu nueva contraseña está lista para usar
                </p>
                
                <div className="reset-password-features">
                  <motion.div 
                    className="reset-password-feature-item"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.5 }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 12l2 2 4-4"></path>
                      <circle cx="12" cy="12" r="10"></circle>
                    </svg>
                    <span>Contraseña actualizada</span>
                  </motion.div>
                  <motion.div 
                    className="reset-password-feature-item"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.6 }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="10" rx="2" ry="2"></rect>
                      <circle cx="12" cy="16" r="1"></circle>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    <span>Cuenta segura</span>
                  </motion.div>
                  <motion.div 
                    className="reset-password-feature-item"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.7 }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                      <polyline points="10,17 15,12 10,7"></polyline>
                      <line x1="15" y1="12" x2="3" y2="12"></line>
                    </svg>
                    <span>Listo para acceder</span>
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>

            {/* Lado del éxito */}
            <motion.div 
              className="reset-password-form-side"
              variants={sideVariants}
              initial="right"
              animate="right"
            >
              <motion.div className="reset-password-success-content">
                <motion.div 
                  className="reset-password-success-icon"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ 
                    duration: 0.5, 
                    ease: [0.23, 1, 0.32, 1],
                    delay: 0.2 
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 12l2 2 4-4"></path>
                    <circle cx="12" cy="12" r="10"></circle>
                  </svg>
                </motion.div>
                
                <motion.h2
                  className="reset-password-success-title"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                >
                  ¡Contraseña actualizada!
                </motion.h2>
                
                <motion.p
                  className="reset-password-success-text"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.4 }}
                >
                  Tu contraseña ha sido restablecida exitosamente.
                </motion.p>
                
                <motion.p
                  className="reset-password-success-text"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.5 }}
                >
                  Ya puedes iniciar sesión con tu nueva contraseña.
                </motion.p>
                
                <motion.button
                  onClick={handleGoToLogin}
                  className="reset-password-login-btn"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.6 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                    <polyline points="10,17 15,12 10,7"></polyline>
                    <line x1="15" y1="12" x2="3" y2="12"></line>
                  </svg>
                  Iniciar sesión
                </motion.button>
                
                <motion.button
                  onClick={() => navigateTo(ROUTES.HOME)}
                  className="reset-password-link"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.8 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Volver al inicio
                </motion.button>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ✅ FORMULARIO PRINCIPAL
  return (
    <div className="reset-password-container">
      <motion.div
        className="reset-password-modal"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <div className="reset-password-content">
          {/* Lado del formulario */}
          <motion.div 
            className="reset-password-form-side"
            variants={sideVariants}
            initial="left"
            animate="left"
          >
            <motion.div 
              className="reset-password-form-content"
              variants={contentVariants}
              initial="hidden"
              animate="visible"
            >
              {/* Header del formulario */}
              <motion.div className="reset-password-form-header" variants={itemVariants}>
                <h2 className="reset-password-form-title">Restablecer Contraseña</h2>
                <p className="reset-password-form-subtitle">Ingresa tu nueva contraseña segura</p>
              </motion.div>

              {/* Error Message */}
              <AnimatePresence>
                {formErrors.submit && (
                  <motion.div 
                    className="reset-password-error-message"
                    initial={{ opacity: 0, scale: 0.95, y: -20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    {formErrors.submit}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Form */}
              <motion.form 
                className="reset-password-form" 
                onSubmit={handleSubmit} 
                variants={itemVariants}
              >
                {/* New Password Field */}
                <motion.div 
                  className="reset-password-input-group"
                  variants={itemVariants}
                >
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    className={`reset-password-input ${formErrors.password ? 'error' : ''}`}
                    placeholder="Nueva contraseña"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                  />
                  <motion.button
                    type="button"
                    className="reset-password-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    )}
                  </motion.button>
                  <AnimatePresence>
                    {formErrors.password && (
                      <motion.span 
                        className="reset-password-error-text"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                      >
                        {formErrors.password}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Confirm Password Field */}
                <motion.div 
                  className="reset-password-input-group"
                  variants={itemVariants}
                >
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    className={`reset-password-input ${formErrors.confirmPassword ? 'error' : ''}`}
                    placeholder="Confirmar nueva contraseña"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                  />
                  <motion.button
                    type="button"
                    className="reset-password-password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {showConfirmPassword ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    )}
                  </motion.button>
                  <AnimatePresence>
                    {formErrors.confirmPassword && (
                      <motion.span 
                        className="reset-password-error-text"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                      >
                        {formErrors.confirmPassword}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Submit Button */}
                <motion.button 
                  type="submit" 
                  className="reset-password-submit-btn"
                  disabled={loading}
                  variants={itemVariants}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {loading ? (
                    <div className="reset-password-loading-content">
                      <motion.div 
                        className="reset-password-loading-spinner"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      ></motion.div>
                      <span>Actualizando contraseña...</span>
                    </div>
                  ) : (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      Actualizar Contraseña
                    </motion.span>
                  )}
                </motion.button>
              </motion.form>

              {/* Form Links */}
              <motion.div className="reset-password-form-links" variants={itemVariants}>
                <motion.button 
                  onClick={() => navigateTo(ROUTES.HOME)}
                  className="reset-password-link"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Volver al inicio
                </motion.button>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Lado del brand */}
          <motion.div 
            className="reset-password-brand-side"
            variants={sideVariants}
            initial="right"
            animate="right"
          >
            <div className="reset-password-brand-shapes">
              <motion.div 
                className="reset-password-brand-shape reset-password-brand-shape-1"
                animate={{ 
                  y: [0, -15, 0], 
                  scale: [1, 1.03, 1], 
                  rotate: [0, 120, 240, 360] 
                }}
                transition={{ 
                  duration: 25, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
              ></motion.div>
              <motion.div 
                className="reset-password-brand-shape reset-password-brand-shape-2"
                animate={{ 
                  y: [0, 8, 0], 
                  scale: [1, 0.97, 1], 
                  rotate: [0, -120, -240, -360] 
                }}
                transition={{ 
                  duration: 25, 
                  repeat: Infinity, 
                  ease: "easeInOut",
                  delay: -8
                }}
              ></motion.div>
              <motion.div 
                className="reset-password-brand-shape reset-password-brand-shape-3"
                animate={{ 
                  y: [0, -8, 0], 
                  scale: [1, 1.02, 1], 
                  rotate: [0, 180, 360] 
                }}
                transition={{ 
                  duration: 25, 
                  repeat: Infinity, 
                  ease: "easeInOut",
                  delay: -16
                }}
              ></motion.div>
            </div>
            
            <motion.div 
              className="reset-password-brand-content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1], delay: 0.2 }}
            >
              <div className="reset-password-logo-container">
                <motion.img 
                  src={logo} 
                  alt="TeloFundi Logo" 
                  className="reset-password-logo"
                  animate={{ 
                    y: [0, -12, 0], 
                    rotate: [0, 2, 0] 
                  }}
                  transition={{ 
                    duration: 6, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                  }}
                />
              </div>
              <h1 className="reset-password-brand-title">🔐 TeloFundi</h1>
              <p className="reset-password-brand-subtitle">
                Restablece tu acceso a la plataforma premium de República Dominicana
              </p>
              
              <div className="reset-password-features">
                {[
                  { icon: "M9 12l2 2 4-4", circle: true, text: "Seguro" },
                  { icon: "M7 11V7a5 5 0 0 1 10 0v4", rect: true, lockCircle: true, text: "Encriptado" },
                  { star: true, text: "Premium" }
                ].map((feature, index) => (
                  <motion.div 
                    key={feature.text}
                    className="reset-password-feature-item"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ 
                      duration: 0.3, 
                      ease: [0.23, 1, 0.32, 1], 
                      delay: 0.5 + (index * 0.1) 
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      {feature.icon && <path d={feature.icon}></path>}
                      {feature.circle && <circle cx="12" cy="12" r="10"></circle>}
                      {feature.rect && <rect x="3" y="11" width="18" height="10" rx="2" ry="2"></rect>}
                      {feature.lockCircle && <circle cx="12" cy="16" r="1"></circle>}
                      {feature.star && (
                        <path 
                          d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z" 
                          fill="currentColor"
                        />
                      )}
                    </svg>
                    <span>{feature.text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPasswordPage;