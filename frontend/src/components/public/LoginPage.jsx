import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { ROUTES } from '../../utils/constants';
import { getGoogleAuthUrl, STORAGE_KEYS, getApiUrl } from '../../config/config';
import logo from '../../assets/images/logo png mejora.png';
import './LoginPage.css';

const LoginPage = ({ isOpen, onClose, onSwitchToRegister, onSwitchToForgot }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const { login, loading } = useAuth();
  const { navigateTo } = useApp();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [formErrors, setFormErrors] = useState({});

  // Detectar dispositivo móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ? OAuth response detection - MODIFICADO PARA TOKEN TEMPORAL
  useEffect(() => {
    // Detectar tanto query params como hash params
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    
    // ? NUEVO: Detectar token temporal
    const tempToken = urlParams.get('tempToken') || hashParams.get('tempToken');
    
    // Mantener detección de errores
    const authStatus = urlParams.get('auth') || hashParams.get('auth');
    const autoShowLogin = hashParams.get('autoShowLogin');

    console.log('?? OAuth Detection Debug:', {
      tempToken: !!tempToken,
      authStatus,
      autoShowLogin,
      fullUrl: window.location.href
    });

    // ? NUEVO: Si hay token temporal, verificarlo con el backend
    if (tempToken) {
      handleTempTokenVerification(tempToken);
    } else if (authStatus === 'error') {
      // Manejo de errores existente
      const errorMessage = urlParams.get('message') || hashParams.get('message') || 'Error en autenticación con Google';
      
      console.log('? Error en Google OAuth:', {
        errorMessage: decodeURIComponent(errorMessage),
        autoShowLogin,
        isOpen
      });
      
      if (autoShowLogin === 'true' && !isOpen) {
        const processedMessage = processGoogleOAuthError(decodeURIComponent(errorMessage));
        sessionStorage.setItem('auth_error', processedMessage);
        
        if (window.showLoginModal) {
          window.showLoginModal();
        }
      } else {
        const processedMessage = processGoogleOAuthError(decodeURIComponent(errorMessage));
        setFormErrors({ submit: processedMessage });
      }
      
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [navigateTo, isOpen]);

  // ? NUEVA FUNCIÓN: Verificar token temporal con el backend
  const handleTempTokenVerification = async (tempToken) => {
    try {
      console.log('?? Verificando token temporal:', tempToken);
      
      // Hacer petición al backend para verificar el token
      const response = await fetch(getApiUrl(`/auth/callback/verify/${tempToken}`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        console.log('? Token temporal verificado exitosamente');
        
        // Guardar datos en localStorage
        const completeUserData = {
          ...data.data.user,
          token: data.data.token,
          refreshToken: data.data.refreshToken
        };
        
        console.log('?? Guardando datos del usuario:', {
          id: completeUserData.id,
          userType: completeUserData.userType,
          hasToken: !!completeUserData.token
        });
        
        // Guardar en localStorage
        localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(completeUserData));
        
        // Disparar evento para notificar a AuthContext
        window.dispatchEvent(new CustomEvent('auth:login', { 
          detail: { user: completeUserData } 
        }));
        
        // Mostrar mensaje de éxito
        setShowSuccessMessage(true);
        
        // Limpiar URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Navegar al dashboard correspondiente
        setTimeout(() => {
          handleClose();
          
          const userTypeRoute = completeUserData.userType.toLowerCase();
          console.log('?? Navegando al dashboard:', userTypeRoute);
          
          switch (userTypeRoute) {
            case 'client':
              navigateTo(ROUTES.CLIENT_DASHBOARD);
              break;
            case 'escort':
              navigateTo(ROUTES.ESCORT_DASHBOARD);
              break;
            case 'agency':
              navigateTo(ROUTES.AGENCY_DASHBOARD);
              break;
            case 'admin':
              navigateTo(ROUTES.ADMIN_DASHBOARD);
              break;
            default:
              navigateTo(ROUTES.FEED);
          }
        }, 2000);
        
      } else {
        console.error('? Error verificando token temporal:', data);
        setFormErrors({ 
          submit: data.message || 'Error verificando autenticación. Intenta iniciar sesión nuevamente.' 
        });
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (error) {
      console.error('?? Error en verificación de token temporal:', error);
      setFormErrors({ 
        submit: 'Error de conexión. Intenta iniciar sesión nuevamente.' 
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  // Mount animation y reset
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      setFormData({ email: '', password: '' });
      setShowPassword(false);
      setShowSuccessMessage(false);
      setFormErrors({});
      
      // Verificar si hay un error guardado de Google OAuth
      const savedError = sessionStorage.getItem('auth_error');
      if (savedError) {
        console.log('?? Mostrando error guardado de Google OAuth:', savedError);
        const processedError = processGoogleOAuthError(savedError);
        setFormErrors({ submit: processedError });
        sessionStorage.removeItem('auth_error');
      }
    }
  }, [isOpen]);

  // Cerrar modal con ESC y click en overlay
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEsc = (e) => e.keyCode === 27 && handleClose();
    const handleClickOutside = (e) => e.target.classList.contains('login-container-telofundi') && handleClose();
    
    document.addEventListener('keydown', handleEsc);
    document.addEventListener('click', handleClickOutside);
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.removeEventListener('click', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleClose = () => {
    setMounted(false);
    setShowSuccessMessage(false);
    setFormData({ email: '', password: '' });
    setFormErrors({});
    setShowPassword(false);
    
    setTimeout(() => {
      onClose();
    }, 300);
  };

  // Validación
  const validateForm = () => {
    const errors = {};
    
    if (!formData.email) {
      errors.email = 'El correo electrónico es requerido';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'El formato del correo no es válido';
    }
    
    if (!formData.password) {
      errors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 8) {
      errors.password = 'La contraseña debe tener al menos 8 caracteres';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Función mejorada para procesar errores de Google OAuth
  const processGoogleOAuthError = (errorMessage) => {
    console.log('?? Procesando error de Google OAuth:', errorMessage);
    
    // Mensajes específicos para agencias con iconos
    if (errorMessage.includes('solicitud está siendo revisada') ||
        errorMessage.includes('siendo revisada') ||
        errorMessage.includes('pendiente') ||
        errorMessage.includes('aprobación') ||
        errorMessage.includes('procesándose')) {
      return '?? Tu solicitud de agencia está siendo procesada. Te notificaremos cuando sea aprobada.';
    }
    
    if (errorMessage.includes('fue rechazada') ||
        errorMessage.includes('rechazada') ||
        errorMessage.includes('denegada') ||
        errorMessage.includes('rejected')) {
      return '? Tu solicitud de agencia fue denegada. Contacta al soporte para más información.';
    }
    
    if (errorMessage.includes('suspendida temporalmente') ||
        errorMessage.includes('suspendida') ||
        errorMessage.includes('suspended')) {
      return '?? Tu cuenta de agencia ha sido suspendida temporalmente.';
    }
    
    if (errorMessage.includes('formulario específico') ||
        errorMessage.includes('documentos de verificación')) {
      return '?? Las agencias deben registrarse con el formulario específico que incluye documentos de verificación.';
    }
    
    // Errores de credenciales en Google OAuth
    if (errorMessage.includes('credenciales') ||
        errorMessage.includes('invalid credentials')) {
      return '?? Error en las credenciales de Google. Intenta iniciar sesión nuevamente.';
    }
    
    if (errorMessage.includes('acceso denegado') ||
        errorMessage.includes('access denied')) {
      return '?? Acceso denegado. Debes autorizar el acceso a tu cuenta de Google.';
    }
    
    if (errorMessage.includes('cuenta no encontrada') ||
        errorMessage.includes('user not found')) {
      return '?? No se encontró una cuenta asociada a este email de Google.';
    }
    
    // Errores de conexión en Google OAuth
    if (errorMessage.includes('network') ||
        errorMessage.includes('conexión')) {
      return '?? Error de conexión con Google. Verifica tu internet e intenta nuevamente.';
    }
    
    // Mensaje por defecto mejorado
    return `? ${errorMessage}`;
  };

  // Mapeo mejorado de códigos de error con mensajes específicos
  const getErrorMessage = (error) => {
    const errorCode = error?.response?.data?.errorCode || error?.errorCode;
    const message = error?.response?.data?.message || error?.message;
    const status = error?.response?.status || error?.status;

    console.log('?? Analizando error de login:', { 
      errorCode, 
      message, 
      status,
      fullError: error?.response?.data 
    });

    // Manejo de errores por código específico
    switch (errorCode) {
      // Errores de Agencias
      case 'AGENCY_PENDING_APPROVAL':
        return '?? Tu solicitud de agencia está siendo procesada. Te notificaremos cuando sea aprobada.';
      case 'AGENCY_REJECTED':
        return '? Tu solicitud de agencia fue denegada. Contacta al soporte para más información.';
      case 'AGENCY_SUSPENDED':
        return '?? Tu cuenta de agencia ha sido suspendida temporalmente.';
      
      // Errores de Credenciales
      case 'INVALID_CREDENTIALS':
        return '?? Email o contraseña incorrectos. Verifica tus datos e intenta nuevamente.';
      case 'USER_NOT_FOUND':
        return '?? No existe una cuenta con este email. ¿Necesitas registrarte?';
      case 'WRONG_PASSWORD':
        return '?? Contraseña incorrecta. ¿Olvidaste tu contraseña?';
      
      // Errores de Estado de Cuenta
      case 'ACCOUNT_INACTIVE':
        return '?? Tu cuenta está desactivada. Contacta al soporte para reactivarla.';
      case 'ACCOUNT_BANNED':
        return `?? Tu cuenta ha sido suspendida: ${message || 'Contacta al soporte para más información.'}.`;
      case 'ACCOUNT_SUSPENDED':
        return '?? Tu cuenta está temporalmente suspendida. Contacta al soporte.';
      
      // Errores de Verificación
      case 'EMAIL_NOT_VERIFIED':
        return '?? Debes verificar tu email antes de iniciar sesión.';
      case 'VERIFICATION_REQUIRED':
        return '?? Tu cuenta requiere verificación adicional.';
      
      // Errores de Rate Limiting
      case 'TOO_MANY_ATTEMPTS':
        return '??? Demasiados intentos de login. Espera unos minutos antes de intentar nuevamente.';
      case 'RATE_LIMIT_EXCEEDED':
        return '? Has excedido el límite de intentos. Intenta más tarde.';
      
      default:
        // Detección inteligente mejorada por mensaje
        if (message) {
          // Errores de agencia por mensaje
          if (message.includes('solicitud está siendo revisada') ||
              message.includes('siendo revisada') ||
              message.includes('pendiente') ||
              message.includes('aprobación')) {
            return '?? Tu solicitud de agencia está siendo procesada. Te notificaremos cuando sea aprobada.';
          }
          
          if (message.includes('fue rechazada') ||
              message.includes('rechazada') ||
              message.includes('denegada')) {
            return '? Tu solicitud de agencia fue denegada. Contacta al soporte para más información.';
          }
          
          if (message.includes('suspendida temporalmente') ||
              message.includes('suspendida')) {
            return '?? Tu cuenta de agencia ha sido suspendida temporalmente.';
          }
          
          // Errores de credenciales por mensaje
          if (message.includes('credenciales') ||
              message.includes('incorrectas') ||
              message.includes('inválidas')) {
            return '?? Email o contraseña incorrectos. Verifica tus datos e intenta nuevamente.';
          }
          
          if (message.includes('usuario no encontrado') ||
              message.includes('user not found') ||
              message.includes('no existe')) {
            return '?? No existe una cuenta con este email. ¿Necesitas registrarte?';
          }
          
          if (message.includes('contraseña') &&
              (message.includes('incorrecta') || message.includes('wrong'))) {
            return '?? Contraseña incorrecta. ¿Olvidaste tu contraseña?';
          }
          
          // Errores de estado de cuenta por mensaje
          if (message.includes('cuenta desactivada') ||
              message.includes('account inactive')) {
            return '?? Tu cuenta está desactivada. Contacta al soporte para reactivarla.';
          }
          
          if (message.includes('baneado') ||
              message.includes('banned') ||
              message.includes('suspendido')) {
            return '?? Tu cuenta ha sido suspendida. Contacta al soporte para más información.';
          }
          
          // Errores de verificación por mensaje
          if (message.includes('verificar email') ||
              message.includes('email not verified')) {
            return '?? Debes verificar tu email antes de iniciar sesión.';
          }
          
          // Errores de documentos para agencias
          if (message.includes('formulario específico') ||
              message.includes('documentos de verificación')) {
            return '?? Las agencias deben registrarse con el formulario específico que incluye documentos de verificación.';
          }
        }
        
        // Manejo por status code HTTP
        switch (status) {
          case 400:
            return '?? Datos de inicio de sesión inválidos. Verifica tu información.';
          case 401:
            return '?? Email o contraseña incorrectos. Verifica tus credenciales.';
          case 403:
            return '?? No tienes permisos para acceder. Tu cuenta puede estar suspendida.';
          case 404:
            return '?? No existe una cuenta con este email. ¿Necesitas registrarte?';
          case 429:
            return '??? Demasiados intentos de login. Espera unos minutos antes de intentar nuevamente.';
          case 500:
            return '?? Error del servidor. Intenta nuevamente en unos momentos.';
          case 502:
          case 503:
            return '?? Servicio temporalmente no disponible. Intenta más tarde.';
          default:
            // Manejo de errores de conexión
            if (error?.code === 'NETWORK_ERROR' || 
                error?.message?.includes('Network Error') ||
                error?.message?.includes('fetch')) {
              return '?? Error de conexión. Verifica tu internet e intenta nuevamente.';
            }
            
            if (error?.code === 'TIMEOUT_ERROR' ||
                error?.message?.includes('timeout')) {
              return '? La petición tardó demasiado. Intenta nuevamente.';
            }
            
            // Mensaje por defecto mejorado
            return message || '? Error inesperado al iniciar sesión. Intenta nuevamente.';
        }
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setFormErrors({}); // Limpiar errores previos
      
      const result = await login({
        email: formData.email,
        password: formData.password
      });
      
      console.log('? Resultado del login:', result);
      
      if (result.success) {
        setShowSuccessMessage(true);
        setTimeout(() => {
          handleClose();
          
          const userTypeRoute = result.user.userType.toLowerCase();
          switch (userTypeRoute) {
            case 'client':
              navigateTo(ROUTES.CLIENT_DASHBOARD);
              break;
            case 'escort':
              navigateTo(ROUTES.ESCORT_DASHBOARD);
              break;
            case 'agency':
              navigateTo(ROUTES.AGENCY_DASHBOARD);
              break;
            case 'admin':
              navigateTo(ROUTES.ADMIN_DASHBOARD);
              break;
            default:
              navigateTo(ROUTES.FEED);
          }
        }, 1000);
      } else {
        console.log('? Login falló:', result);
        setFormErrors({ submit: getErrorMessage(result) });
      }
    } catch (error) {
      console.error('?? Error en autenticación:', error);
      setFormErrors({ submit: getErrorMessage(error) });
    }
  };

  // Handle Google Auth - COMPLETAMENTE DINÁMICO
  const handleGoogleAuth = (e) => {
    e.preventDefault();
    
    try {
      setFormErrors({});
      
      console.log('?? Intentando Google OAuth...');
      
      // Usar función dinámica para obtener URL de Google Auth
      const googleAuthUrl = getGoogleAuthUrl('CLIENT');
      
      console.log('?? Redirigiendo a:', googleAuthUrl);
      
      window.location.href = googleAuthUrl;
      
    } catch (error) {
      console.error('? Error iniciando Google OAuth:', error);
      setFormErrors({ submit: 'Error iniciando autenticación con Google' });
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {mounted && (
        <motion.div 
          className="login-container-telofundi active"
          initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
          animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
          exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
          transition={{ duration: 0.3 }}
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            zIndex: 10000, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: isMobile ? '0' : '15px',
            background: 'rgba(0,0,0,0.8)'
          }}
        >
          <motion.div 
            className="login-modal-telofundi"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.4 }}
            style={{
              width: isMobile ? '100vw' : '90%', 
              maxWidth: isMobile ? 'none' : '700px',
              height: isMobile ? '100vh' : 'auto', 
              maxHeight: isMobile ? 'none' : '80vh',
              borderRadius: isMobile ? '0' : '16px', 
              background: '#0a0a0a', 
              position: 'relative',
              display: 'flex', 
              overflow: 'hidden', 
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
            }}
          >
            {/* Botón de cerrar */}
            <button 
              onClick={handleClose}
              className={`login-close-btn-telofundi ${isMobile ? 'mobile' : ''}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            <div style={{ 
              width: '100%', 
              height: '100%', 
              display: 'flex', 
              flexDirection: isMobile ? 'column' : 'row' 
            }}>
              {/* Lado del formulario */}
              <div style={{
                flex: isMobile ? 'none' : '1', 
                width: isMobile ? '100%' : 'auto', 
                height: isMobile ? '100%' : 'auto',
                padding: isMobile ? '70px 20px 20px' : '25px', 
                overflowY: isMobile ? 'auto' : 'visible',
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: isMobile ? 'flex-start' : 'center', 
                background: '#0a0a0a',
                maxWidth: isMobile ? 'none' : '350px'
              }}>

                {/* Logo para móviles */}
                {isMobile && (
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <img src={logo} alt="TeloFundi Logo" style={{ width: '70px', height: 'auto' }} />
                  </div>
                )}

                {/* Success Message */}
                {showSuccessMessage ? (
                  <div style={{ textAlign: 'center', padding: '25px 15px' }}>
                    <div style={{
                      width: '50px', 
                      height: '50px', 
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      borderRadius: '50%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      margin: '0 auto 15px'
                    }}>
                      <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <path d="M9 12l2 2 4-4"></path>
                        <circle cx="12" cy="12" r="10"></circle>
                      </svg>
                    </div>
                    <h3 style={{ fontSize: '1.1rem', color: 'white', marginBottom: '8px' }}>¡Bienvenido!</h3>
                    <p style={{ color: '#ccc', fontSize: '0.8rem' }}>Redirigiendo a tu dashboard...</p>
                  </div>
                ) : (
                  <>
                    {/* Header */}
                    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                      <h2 style={{ 
                        fontSize: isMobile ? '1.2rem' : '1.3rem', 
                        fontWeight: '700', 
                        color: 'white', 
                        marginBottom: '4px' 
                      }}>
                        Bienvenido
                      </h2>
                      <p style={{ 
                        fontSize: isMobile ? '0.8rem' : '0.85rem', 
                        color: '#ccc', 
                        margin: 0 
                      }}>
                        Accede a tu cuenta TeloFundi
                      </p>
                    </div>

                    {/* Google Button */}
                    <button 
                      onClick={handleGoogleAuth}
                      disabled={loading}
                      className="login-google-btn-telofundi"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      {loading ? 'Redirigiendo...' : 'Continuar con Google'}
                    </button>

                    {/* Divider */}
                    <div className="login-divider-telofundi">
                      <div className="login-divider-line-telofundi"></div>
                      <span>o</span>
                      <div className="login-divider-line-telofundi"></div>
                    </div>

                    {/* Error Message Mejorado */}
                    {formErrors.submit && (
                      <div className="login-error-message-telofundi">
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginTop: '1px', flexShrink: 0 }}>
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="15" y1="9" x2="9" y2="15"></line>
                            <line x1="9" y1="9" x2="15" y2="15"></line>
                          </svg>
                          <span style={{ lineHeight: '1.4' }}>{formErrors.submit}</span>
                        </div>
                      </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="login-form-telofundi">
                      {/* Email Field */}
                      <div className="login-input-group-telofundi">
                        <input
                          type="email"
                          name="email"
                          placeholder="Correo electrónico"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          className={`login-input-telofundi ${formErrors.email ? 'error' : ''}`}
                        />
                        {formErrors.email && <span className="login-error-text">{formErrors.email}</span>}
                      </div>

                      {/* Password Field */}
                      <div className="login-input-group-telofundi password-field-container">
                        <div className="login-password-input-wrapper">
                          <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            placeholder="Contraseña"
                            value={formData.password}
                            onChange={handleInputChange}
                            required
                            className={`login-input-telofundi ${formErrors.password ? 'error' : ''}`}
                          />
                          <button 
                            type="button" 
                            onClick={() => setShowPassword(!showPassword)}
                            className={`login-password-toggle-telofundi ${isMobile ? 'mobile' : ''}`}
                          >
                            {showPassword ? (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                <line x1="1" y1="1" x2="23" y2="23"></line>
                              </svg>
                            ) : (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                            )}
                          </button>
                        </div>
                        
                        {formErrors.password && <span className="login-error-text">{formErrors.password}</span>}
                      </div>

                      {/* Submit Button */}
                      <button 
                        type="submit" 
                        disabled={loading} 
                        className="login-submit-btn-telofundi"
                      >
                        {loading ? (
                          <div className="login-loading-spinner">
                            <div className="login-spinner" style={{ animation: 'spin 1s linear infinite' }}></div>
                            <span>Procesando...</span>
                          </div>
                        ) : (
                          'Iniciar sesión'
                        )}
                      </button>
                    </form>

                    {/* Form Links */}
                    <div className="login-form-links-telofundi">
                      <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                        <button 
                          onClick={onSwitchToForgot}
                          className="login-link-telofundi secondary"
                        >
                          ¿Olvidaste tu contraseña?
                        </button>
                      </div>
                      <div className="login-link-primary-container">
                        ¿No tienes cuenta?{' '}
                        <button 
                          onClick={onSwitchToRegister}
                          className="login-link-telofundi primary"
                        >
                          Crear cuenta
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Brand Side - Lado derecho con branding */}
              {!isMobile && (
                <div style={{
                  flex: '0.6', 
                  background: 'linear-gradient(135deg, #7a2d00 0%, #663a1e 100%)', 
                  position: 'relative',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: 'white', 
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    position: 'absolute', 
                    top: '20%', 
                    right: '10%', 
                    width: '60px', 
                    height: '60px', 
                    background: 'rgba(255,255,255,0.1)', 
                    borderRadius: '50%', 
                    animation: 'float 6s ease-in-out infinite' 
                  }}></div>
                  <div style={{ 
                    position: 'absolute', 
                    bottom: '20%', 
                    left: '15%', 
                    width: '50px', 
                    height: '50px', 
                    background: 'rgba(255,255,255,0.1)', 
                    borderRadius: '50%', 
                    animation: 'float 4s ease-in-out infinite reverse' 
                  }}></div>
                  
                  <div className="login-brand-content-telofundi">
                    <img 
                      src={logo} 
                      alt="TeloFundi Logo" 
                      style={{ width: '125px', height: 'auto', marginBottom: '20px' }} 
                    />
                    <p className="login-brand-subtitle-telofundi">
                      Bienvenido de vuelta a la comunidad más exclusiva del Caribe
                    </p>
                    
                    <div className="login-features-telofundi">
                      {[
                        { 
                          text: "Verificado", 
                          icon: (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M9 12l2 2 4-4"></path>
                              <circle cx="12" cy="12" r="10"></circle>
                            </svg>
                          )
                        },
                        { 
                          text: "Seguro", 
                          icon: (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                              <circle cx="12" cy="16" r="1"></circle>
                              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                          )
                        },
                        { 
                          text: "Premium", 
                          icon: (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"></polygon>
                            </svg>
                          )
                        }
                      ].map((feature) => (
                        <div key={feature.text} className="login-feature-item">
                          <div className="login-feature-icon">{feature.icon}</div>
                          <span>{feature.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* CSS Styles */}
          <style jsx>{`
            @keyframes spin { 
              0% { transform: rotate(0deg); } 
              100% { transform: rotate(360deg); } 
            }
            @keyframes float { 
              0%, 100% { transform: translateY(0px); } 
              50% { transform: translateY(-20px); } 
            }
            
            .password-field-container {
              position: relative;
              margin-bottom: 15px;
            }

            .login-password-input-wrapper {
              position: relative;
            }

            .login-input-telofundi.error {
              border-color: #ef4444;
              box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.1);
            }

            /* Botón de cerrar mejorado */
            .login-close-btn-telofundi { 
              position: absolute; 
              top: 12px; 
              right: 12px; 
              width: 28px; 
              height: 28px; 
              background: none; 
              border: none; 
              color: #ccc; 
              cursor: pointer; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              transition: color 0.2s ease; 
              z-index: 10; 
            }
            
            .login-close-btn-telofundi:hover { 
              color: white; 
            }
            
            /* Versión móvil del botón de cerrar - completamente limpio */
            .login-close-btn-telofundi.mobile { 
              position: fixed;
              top: 70px; 
              right: 20px; 
              width: 40px; 
              height: 40px; 
              background: none; 
              border: none; 
              color: #ccc; 
              cursor: pointer; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              transition: color 0.2s ease; 
              z-index: 10001; 
              pointer-events: auto;
            }
            
            .login-close-btn-telofundi.mobile:hover,
            .login-close-btn-telofundi.mobile:active,
            .login-close-btn-telofundi.mobile:focus { 
              color: white; 
              background: none;
              outline: none;
              box-shadow: none;
            }

            .login-submit-btn-telofundi { 
              width: 100%; 
              padding: 12px; 
              background: linear-gradient(135deg, #7a2d00 0%, #663a1e 100%); 
              border: none; 
              border-radius: 6px; 
              color: white; 
              font-size: 0.85rem; 
              font-weight: 600; 
              cursor: pointer; 
              transition: all 0.2s ease; 
            }
            .login-submit-btn-telofundi:hover:not(:disabled) { 
              transform: translateY(-1px); 
              box-shadow: 0 4px 15px rgba(122, 45, 0, 0.3); 
            }
            .login-submit-btn-telofundi:disabled { 
              opacity: 0.7; 
              cursor: not-allowed; 
            }
            .login-loading-spinner { 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              gap: 6px; 
            }
            .login-spinner { 
              width: 16px; 
              height: 16px; 
              border: 2px solid rgba(255, 255, 255, 0.3); 
              border-top: 2px solid white; 
              border-radius: 50%; 
            }
            
            /* Error Message Mejorado */
            .login-error-message-telofundi { 
              background: rgba(239, 68, 68, 0.1); 
              border: 1px solid #ef4444; 
              color: #ef4444; 
              padding: 10px 12px; 
              border-radius: 6px; 
              margin-bottom: 12px; 
              font-size: 0.75rem; 
              line-height: 1.4;
            }
            
            .login-input-group-telofundi { 
              margin-bottom: 12px; 
              position: relative; 
            }
            .login-input-telofundi { 
              width: 100%; 
              padding: 8px 12px; 
              background: #1a1a1a; 
              border: 2px solid #333; 
              border-radius: 6px; 
              color: white; 
              font-size: 0.8rem; 
              transition: all 0.2s ease; 
              box-sizing: border-box; 
            }
            .login-input-telofundi:focus { 
              outline: none; 
              border-color: #7a2d00; 
            }
            
            /* Ícono de mostrar contraseña mejorado */
            .login-password-toggle-telofundi { 
              position: absolute; 
              right: 8px; 
              top: 50%; 
              transform: translateY(-50%); 
              background: none; 
              border: none; 
              color: #ccc; 
              cursor: pointer; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              padding: 4px;
              border-radius: 4px;
              transition: color 0.2s ease;
            }
            
            .login-password-toggle-telofundi:hover { 
              color: white; 
            }
            
            /* Versión móvil del ícono - sin efectos visuales */
            .login-password-toggle-telofundi.mobile { 
              position: absolute; 
              right: 8px; 
              top: 50%; 
              transform: translateY(-50%); 
              background: none; 
              border: none; 
              color: #ccc; 
              cursor: pointer; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              padding: 4px;
              transition: color 0.2s ease;
            }
            
            .login-password-toggle-telofundi.mobile:hover,
            .login-password-toggle-telofundi.mobile:active,
            .login-password-toggle-telofundi.mobile:focus { 
              color: white; 
              background: none;
              outline: none;
              box-shadow: none;
              border-radius: 0;
            }
            
            .login-google-btn-telofundi { 
              width: 100%; 
              padding: 10px; 
              background: #1a1a1a; 
              border: 2px solid #333; 
              border-radius: 6px; 
              color: white; 
              font-size: 0.8rem; 
              font-weight: 500; 
              cursor: pointer; 
              transition: all 0.2s ease; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              gap: 8px; 
              margin-bottom: 12px; 
            }
            .login-google-btn-telofundi:hover:not(:disabled) { 
              border-color: #7a2d00; 
              background: #262626; 
            }
            .login-google-btn-telofundi:disabled { 
              opacity: 0.7; 
              cursor: not-allowed; 
            }
            .login-divider-telofundi { 
              display: flex; 
              align-items: center; 
              margin: 12px 0; 
              color: #666; 
              font-size: 0.75rem; 
            }
            .login-divider-line-telofundi { 
              flex: 1; 
              height: 1px; 
              background: #333; 
              margin: 0 10px; 
            }
            .login-form-telofundi { 
              margin-bottom: 16px; 
            }
            .login-form-links-telofundi { 
              text-align: center; 
            }
            .login-link-primary-container { 
              color: #ccc; 
              font-size: 0.8rem; 
            }
            .login-link-telofundi { 
              background: none; 
              border: none; 
              cursor: pointer; 
              text-decoration: none; 
              font-weight: 500; 
            }
            .login-link-telofundi.primary { 
              color: #7a2d00; 
            }
            .login-link-telofundi.secondary { 
              color: #7a2d00; 
              font-size: 0.8rem; 
            }
            .login-link-telofundi:hover { 
              text-decoration: underline; 
            }
            .login-error-text { 
              color: #ef4444; 
              font-size: 0.7rem; 
              margin-top: 3px; 
              display: block; 
            }
            .login-brand-content-telofundi { 
              text-align: center; 
              padding: 15px; 
            }
            .login-brand-subtitle-telofundi { 
              font-size: 0.9rem; 
              margin-bottom: 20px; 
              opacity: 0.9; 
              line-height: 1.4; 
            }
            .login-features-telofundi { 
              display: flex; 
              flex-direction: column; 
              gap: 10px; 
            }
            .login-feature-item { 
              display: flex; 
              align-items: center; 
              gap: 8px; 
              font-size: 0.8rem; 
              font-weight: 500; 
            }
            .login-feature-icon { 
              display: flex; 
              align-items: center; 
              justify-content: center; 
            }
            
            @media (max-width: 768px) {
              .login-input-telofundi { 
                font-size: 0.85rem; 
                padding: 10px 12px; 
              }
              .login-google-btn-telofundi { 
                font-size: 0.85rem; 
                padding: 12px; 
              }
              .login-submit-btn-telofundi { 
                font-size: 0.9rem; 
                padding: 14px; 
              }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoginPage;