import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../../assets/images/logo png mejora.png';
import './ForgotPasswordPage.css';

const ForgotPasswordPage = ({ isOpen, onClose, onSwitchToLogin }) => {
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    email: ''
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

  // Mount animation y reset
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      setFormData({ email: '' });
      setShowSuccessMessage(false);
      setFormErrors({});
      setLoading(false);
    }
  }, [isOpen]);

  // Cerrar modal con ESC y click en overlay
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEsc = (e) => e.keyCode === 27 && handleClose();
    const handleClickOutside = (e) => e.target.classList.contains('forgot-container-telofundi') && handleClose();
    
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
    setFormData({ email: '' });
    setFormErrors({});
    setLoading(false);
    
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

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      const backendUrl = import.meta.env?.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${backendUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email
        }),
      });

      const data = await response.json();

      if (data.success) {
        setShowSuccessMessage(true);
        setTimeout(() => {
          setShowSuccessMessage(false);
          onSwitchToLogin();
        }, 3000);
      } else {
        setFormErrors({ submit: data.message || 'Error enviando el email' });
      }
    } catch (error) {
      console.error('Error:', error);
      setFormErrors({ submit: 'Error de conexión. Inténtalo de nuevo.' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {mounted && (
        <motion.div 
          className="forgot-container-telofundi active"
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
            className="forgot-modal-telofundi"
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
              className="forgot-close-btn-telofundi"
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
                    <h3 style={{ fontSize: '1.1rem', color: 'white', marginBottom: '8px' }}>¡Correo enviado!</h3>
                    <p style={{ color: '#ccc', fontSize: '0.8rem' }}>
                      Revisa tu bandeja de entrada para restablecer tu contraseña.
                    </p>
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
                        Recuperar contraseña
                      </h2>
                      <p style={{ 
                        fontSize: isMobile ? '0.8rem' : '0.85rem', 
                        color: '#ccc', 
                        margin: 0 
                      }}>
                        Te enviaremos un enlace de recuperación
                      </p>
                    </div>

                    {/* Icon */}
                    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                      <div style={{
                        width: '60px',
                        height: '60px',
                        background: 'linear-gradient(135deg, #7a2d00 0%, #663a1e 100%)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto'
                      }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                          <polyline points="22,6 12,13 2,6"></polyline>
                        </svg>
                      </div>
                    </div>

                    {/* Error Message */}
                    {formErrors.submit && (
                      <div className="forgot-error-message-telofundi">
                        {formErrors.submit}
                      </div>
                    )}

                    {/* Instructions */}
                    <div className="forgot-instructions-telofundi">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7a2d00" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"></circle>
                          <path d="M12 6v6l4 2"></path>
                        </svg>
                        <span style={{ color: '#7a2d00', fontSize: '0.8rem', fontWeight: '600' }}>
                          Instrucciones
                        </span>
                      </div>
                      <p style={{ 
                        color: '#ccc', 
                        fontSize: '0.75rem', 
                        margin: 0,
                        lineHeight: '1.4'
                      }}>
                        Ingresa tu correo electrónico y te enviaremos un enlace seguro para crear una nueva contraseña.
                      </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="forgot-form-telofundi">
                      {/* Email Field */}
                      <div className="forgot-input-group-telofundi">
                        <input
                          type="email"
                          name="email"
                          placeholder="Correo electrónico"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          className={`forgot-input-telofundi ${formErrors.email ? 'error' : ''}`}
                        />
                        {formErrors.email && <span className="forgot-error-text">{formErrors.email}</span>}
                      </div>

                      {/* Submit Button */}
                      <button 
                        type="submit" 
                        disabled={loading} 
                        className="forgot-submit-btn-telofundi"
                      >
                        {loading ? (
                          <div className="forgot-loading-spinner">
                            <div className="forgot-spinner" style={{ animation: 'spin 1s linear infinite' }}></div>
                            <span>Enviando...</span>
                          </div>
                        ) : (
                          'Enviar enlace de recuperación'
                        )}
                      </button>
                    </form>

                    {/* Form Links */}
                    <div className="forgot-form-links-telofundi">
                      <button 
                        onClick={onSwitchToLogin}
                        className="forgot-link-telofundi"
                      >
                        ← Volver al inicio de sesión
                      </button>
                    </div>

                    {/* Security Note */}
                    <div className="forgot-security-note-telofundi">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                          <circle cx="12" cy="16" r="1"></circle>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                        <span style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: '600' }}>
                          Nota de seguridad
                        </span>
                      </div>
                      <p style={{ 
                        color: '#ccc', 
                        fontSize: '0.7rem', 
                        margin: 0,
                        lineHeight: '1.4'
                      }}>
                        El enlace será válido por 24 horas. Si no encuentras el correo, revisa tu carpeta de spam.
                      </p>
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
                  
                  <div className="forgot-brand-content-telofundi">
                    {/* Logo agrandado a 125px igual que en register/login */}
                    <img 
                      src={logo} 
                      alt="TeloFundi Logo" 
                      style={{ width: '125px', height: 'auto', marginBottom: '20px' }} 
                    />
                    <p className="forgot-brand-subtitle-telofundi">
                      Recupera el acceso a tu cuenta premium de forma segura
                    </p>
                    
                    <div className="forgot-features-telofundi">
                      {[
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
                          text: "Rápido", 
                          icon: (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2"></polygon>
                            </svg>
                          )
                        },
                        { 
                          text: "Confiable", 
                          icon: (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M9 12l2 2 4-4"></path>
                              <circle cx="12" cy="12" r="10"></circle>
                            </svg>
                          )
                        }
                      ].map((feature) => (
                        <div key={feature.text} className="forgot-feature-item">
                          <div className="forgot-feature-icon">{feature.icon}</div>
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
          <style>{`
            @keyframes spin { 
              0% { transform: rotate(0deg); } 
              100% { transform: rotate(360deg); } 
            }
            @keyframes float { 
              0%, 100% { transform: translateY(0px); } 
              50% { transform: translateY(-20px); } 
            }

            .forgot-input-telofundi.error {
              border-color: #ef4444;
              box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.1);
            }

            .forgot-close-btn-telofundi { 
              position: absolute; 
              top: 12px; 
              right: 12px; 
              width: 28px; 
              height: 28px; 
              background: rgba(255, 255, 255, 0.1); 
              border: none; 
              border-radius: 50%; 
              color: white; 
              cursor: pointer; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              transition: all 0.2s ease; 
              z-index: 10; 
            }
            .forgot-close-btn-telofundi:hover { background: rgba(255, 255, 255, 0.2); }
            .forgot-submit-btn-telofundi { 
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
            .forgot-submit-btn-telofundi:hover:not(:disabled) { 
              transform: translateY(-1px); 
              box-shadow: 0 4px 15px rgba(122, 45, 0, 0.3); 
            }
            .forgot-submit-btn-telofundi:disabled { 
              opacity: 0.7; 
              cursor: not-allowed; 
            }
            .forgot-loading-spinner { 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              gap: 6px; 
            }
            .forgot-spinner { 
              width: 16px; 
              height: 16px; 
              border: 2px solid rgba(255, 255, 255, 0.3); 
              border-top: 2px solid white; 
              border-radius: 50%; 
            }
            .forgot-error-message-telofundi { 
              background: rgba(239, 68, 68, 0.1); 
              border: 1px solid #ef4444; 
              color: #ef4444; 
              padding: 8px 12px; 
              border-radius: 6px; 
              margin-bottom: 12px; 
              font-size: 0.75rem; 
              text-align: center; 
            }
            .forgot-input-group-telofundi { 
              margin-bottom: 12px; 
              position: relative; 
            }
            .forgot-input-telofundi { 
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
            .forgot-input-telofundi:focus { 
              outline: none; 
              border-color: #7a2d00; 
            }
            .forgot-form-telofundi { 
              margin-bottom: 16px; 
            }
            .forgot-form-links-telofundi { 
              text-align: center; 
              margin-bottom: 16px;
            }
            .forgot-link-telofundi { 
              background: none; 
              border: none; 
              color: #7a2d00; 
              cursor: pointer; 
              text-decoration: none; 
              font-weight: 500; 
              font-size: 0.8rem;
            }
            .forgot-link-telofundi:hover { 
              text-decoration: underline; 
            }
            .forgot-error-text { 
              color: #ef4444; 
              font-size: 0.7rem; 
              margin-top: 3px; 
              display: block; 
            }
            .forgot-instructions-telofundi {
              background: rgba(122, 45, 0, 0.1);
              border: 1px solid rgba(122, 45, 0, 0.3);
              border-radius: 6px;
              padding: 10px 12px;
              margin-bottom: 16px;
            }
            .forgot-security-note-telofundi {
              background: rgba(16, 185, 129, 0.1);
              border: 1px solid rgba(16, 185, 129, 0.3);
              border-radius: 6px;
              padding: 10px 12px;
              margin-top: 16px;
            }
            .forgot-brand-content-telofundi { 
              text-align: center; 
              padding: 15px; 
            }
            .forgot-brand-subtitle-telofundi { 
              font-size: 0.9rem; 
              margin-bottom: 20px; 
              opacity: 0.9; 
              line-height: 1.4; 
            }
            .forgot-features-telofundi { 
              display: flex; 
              flex-direction: column; 
              gap: 10px; 
            }
            .forgot-feature-item { 
              display: flex; 
              align-items: center; 
              gap: 8px; 
              font-size: 0.8rem; 
              font-weight: 500; 
            }
            .forgot-feature-icon { 
              display: flex; 
              align-items: center; 
              justify-content: center; 
            }
            
            @media (max-width: 768px) {
              .forgot-close-btn-telofundi { 
                top: 70px; 
                right: 15px; 
                width: 35px; 
                height: 35px; 
              }
              .forgot-input-telofundi { 
                font-size: 0.85rem; 
                padding: 10px 12px; 
              }
              .forgot-submit-btn-telofundi { 
                font-size: 0.9rem; 
                padding: 14px; 
              }
            }
          `}
          </style>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ForgotPasswordPage;