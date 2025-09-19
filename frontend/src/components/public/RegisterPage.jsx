import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { authAPI } from '../../utils/api';
import { ROUTES } from '../../utils/constants';
import { Check, Info, AlertCircle } from 'lucide-react';
import { getApiUrl, STORAGE_KEYS } from '../../config/config';

// ? CONFIGURACIÓN DE TURNSTILE
const TURNSTILE_CONFIG = {
  siteKey: import.meta.env.VITE_TURNSTILE_SITE_KEY,
  scriptUrl: 'https://challenges.cloudflare.com/turnstile/v0/api.js',
  theme: 'light',
  size: 'normal'
};

// ? COMPONENTES OPTIMIZADOS
const InputField = React.memo(({ name, type = 'text', placeholder, value, onChange, error, required = false, isAgency = false, helpText, maxLength }) => (
  <div className="register-input-group-telofundi">
    <input
      type={type}
      name={name}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e, isAgency)}
      required={required}
      maxLength={maxLength}
      className={`register-input-telofundi ${error ? 'error' : ''}`}
    />
    {helpText && (
      <div className="register-help-text">
        <Info size={12} />
        <span>{helpText}</span>
      </div>
    )}
    {error && <span className="register-error-text">{error}</span>}
  </div>
));

const PasswordField = React.memo(({ 
  name, placeholder, value, onChange, error, required = false, isAgency = false, 
  showPassword, onTogglePassword, isMobile, helpText 
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasContent = value && value.length > 0;
  const showRequirements = hasContent && isFocused;
  
  const requirements = [
    { test: value.length >= 8, text: 'Al menos 8 caracteres' },
    { test: /[a-z]/.test(value), text: 'Una minúscula' },
    { test: /[A-Z]/.test(value), text: 'Una mayúscula' },
    { test: /\d/.test(value), text: 'Un número' }
  ];

  return (
    <div className="register-input-group-telofundi password-field-container">
      <div className="register-password-input-wrapper">
        <input
          type={showPassword ? "text" : "password"}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e, isAgency)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          required={required}
          className={`register-input-telofundi ${error ? 'error' : ''}`}
        />
        <button 
          type="button" 
          onClick={onTogglePassword}
          className={`register-password-toggle-telofundi ${isMobile ? 'mobile' : ''}`}
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
      
      {helpText && !showRequirements && (
        <div className="register-help-text">
          <Info size={12} />
          <span>{helpText}</span>
        </div>
      )}
      
      {error && <span className="register-error-text">{error}</span>}
      
      {showRequirements && (
        <div className="password-requirements">
          {requirements.map((req, idx) => (
            <small key={idx} className={req.test ? 'req-valid' : 'req-invalid'}>
              ? {req.text}
            </small>
          ))}
        </div>
      )}
    </div>
  );
});

// ? COMPONENTE DE UPLOAD MEJORADO
const FileUploadField = React.memo(({ 
  type, file, error, progress, onUpload, onRemove, inputRef, label, isUploading, helpText 
}) => (
  <div className="register-file-upload-field">
    <label className="register-agency-label">{label}</label>
    {helpText && (
      <div className="register-help-text file-help">
        <Info size={12} />
        <span>{helpText}</span>
      </div>
    )}
    {!file ? (
      <div 
        onClick={() => !isUploading && inputRef.current?.click()} 
        className={`register-file-upload-area ${error ? 'error' : ''} ${isUploading ? 'disabled' : ''}`}
      >
        <svg className="register-file-upload-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7,10 12,15 17,10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        <p className="register-file-upload-text">
          {isUploading ? 'Subiendo...' : `Subir ${label.toLowerCase()}`}
        </p>
        <p className="register-file-upload-hint">JPG, PNG (máx. 5MB)</p>
      </div>
    ) : progress < 100 ? (
      <div className="upload-progress-container">
        <div className="upload-progress-header">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7a2d00" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7,10 12,15 17,10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span>Subiendo...</span>
        </div>
        <div className="upload-progress-bar">
          <div className="upload-progress-fill" style={{ width: `${progress}%` }}></div>
        </div>
        <p className="upload-progress-text">{progress}% completado</p>
      </div>
    ) : (
      <div className="upload-success-container">
        <img src={file.preview} alt="Preview" className="upload-preview" />
        <div className="upload-file-info">
          <p className="upload-file-name">{file.name}</p>
          <p className="upload-file-size">? Subido ({(file.size / 1024 / 1024).toFixed(1)}MB)</p>
        </div>
        <button 
          type="button" 
          onClick={onRemove} 
          disabled={isUploading}
          className="upload-remove-btn"
        >
          ?
        </button>
      </div>
    )}
    <input 
      ref={inputRef} 
      type="file" 
      accept="image/jpeg,image/jpg,image/png" 
      onChange={(e) => onUpload(type, e.target.files[0])} 
      className="register-file-upload-hidden" 
      disabled={isUploading}
    />
    {error && <span className="register-error-text">{error}</span>}
  </div>
));

// ? HOOK PERSONALIZADO PARA MANEJAR ESTADOS
const useRegisterState = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [userType, setUserType] = useState('');
  const [showUserTypeSelection, setShowUserTypeSelection] = useState(true);
  const [showAgencyForm, setShowAgencyForm] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // ? ESTADOS PARA TURNSTILE
  const [turnstileToken, setTurnstileToken] = useState(null);
  const [turnstileLoaded, setTurnstileLoaded] = useState(false);
  const [turnstileError, setTurnstileError] = useState(null);
  const [turnstileWidgetId, setTurnstileWidgetId] = useState(null);
  
  const [formData, setFormData] = useState({ email: '', password: '', firstName: '' });
  
  // ? SIMPLIFICADO: SOLO 3 CAMPOS + FOTOS
  const [agencyFormData, setAgencyFormData] = useState({
    email: '', 
    firstName: '', 
    password: ''
  });
  const [agencyFiles, setAgencyFiles] = useState({ cedulaFrente: null, cedulaTrasera: null });
  const [uploadProgress, setUploadProgress] = useState({ cedulaFrente: 0, cedulaTrasera: 0 });
  const [agencyFormErrors, setAgencyFormErrors] = useState({});
  const [isSubmittingAgency, setIsSubmittingAgency] = useState(false);
  const [agencySubmissionSuccess, setAgencySubmissionSuccess] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  return {
    showPassword, setShowPassword, userType, setUserType, showUserTypeSelection, setShowUserTypeSelection,
    showAgencyForm, setShowAgencyForm, showSuccessMessage, setShowSuccessMessage, mounted, setMounted,
    isMobile, setIsMobile, formData, setFormData, agencyFormData, setAgencyFormData, agencyFiles, setAgencyFiles,
    uploadProgress, setUploadProgress, agencyFormErrors, setAgencyFormErrors,
    isSubmittingAgency, setIsSubmittingAgency, agencySubmissionSuccess, setAgencySubmissionSuccess,
    formErrors, setFormErrors, turnstileToken, setTurnstileToken, turnstileLoaded, setTurnstileLoaded,
    turnstileError, setTurnstileError, turnstileWidgetId, setTurnstileWidgetId
  };
};

// ? HOOK PARA VALIDACIONES SIMPLIFICADO
const useValidation = () => {
  const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);
  const validatePassword = (password) => password.length >= 8 && /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password);

  const validateForm = (formData, userType, turnstileToken) => {
    const errors = {};
    
    if (!formData.email) errors.email = 'El correo electrónico es requerido';
    else if (!validateEmail(formData.email)) errors.email = 'El formato del correo no es válido';
    
    if (!formData.password) errors.password = 'La contraseña es requerida';
    else if (!validatePassword(formData.password)) {
      errors.password = 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número';
    }
    
    if (!formData.firstName) errors.firstName = 'El nombre es requerido';
    else if (formData.firstName.length < 2) errors.firstName = 'El nombre debe tener al menos 2 caracteres';

    if (!turnstileToken) {
      errors.turnstile = 'Debes completar la verificación de seguridad';
    }
    
    return errors;
  };

  // ? VALIDACIÓN SIMPLIFICADA PARA AGENCIA
  const validateAgencyForm = (formData, files, turnstileToken) => {
    const errors = {};
    
    // ? SOLO 3 CAMPOS REQUERIDOS
    if (!formData.email || formData.email.trim().length === 0) {
      errors.email = 'El correo electrónico es requerido';
    } else if (!validateEmail(formData.email)) {
      errors.email = 'El formato del correo no es válido';
    }

    if (!formData.firstName || formData.firstName.trim().length === 0) {
      errors.firstName = 'El nombre es requerido';
    } else if (formData.firstName.length < 2) {
      errors.firstName = 'El nombre debe tener al menos 2 caracteres';
    }

    if (!formData.password || formData.password.trim().length === 0) {
      errors.password = 'La contraseña es requerida';
    } else if (!validatePassword(formData.password)) {
      errors.password = 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número';
    }

    if (!files.cedulaFrente) errors.cedulaFrente = 'La foto frontal de la cédula es requerida';
    if (!files.cedulaTrasera) errors.cedulaTrasera = 'La foto posterior de la cédula es requerida';
    
    if (!turnstileToken) {
      errors.turnstile = 'Debes completar la verificación de seguridad';
    }
    
    return errors;
  };

  return { validateForm, validateAgencyForm };
};

// ? HOOK PARA TURNSTILE
const useTurnstile = (state) => {
  const turnstileContainerRef = useRef(null);
  const agencyTurnstileContainerRef = useRef(null);

  useEffect(() => {
    if (!TURNSTILE_CONFIG.siteKey) {
      console.warn('?? VITE_TURNSTILE_SITE_KEY no configurada');
      return;
    }

    if (window.turnstile) {
      state.setTurnstileLoaded(true);
      return;
    }

    const existingScript = document.querySelector(`script[src="${TURNSTILE_CONFIG.scriptUrl}"]`);
    if (existingScript) {
      const checkLoaded = setInterval(() => {
        if (window.turnstile) {
          state.setTurnstileLoaded(true);
          clearInterval(checkLoaded);
        }
      }, 100);
      return () => clearInterval(checkLoaded);
    }

    const script = document.createElement('script');
    script.src = TURNSTILE_CONFIG.scriptUrl;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      console.log('? Turnstile script cargado');
      state.setTurnstileLoaded(true);
    };
    
    script.onerror = () => {
      console.error('? Error cargando Turnstile script');
      state.setTurnstileError('Error cargando verificación. Recarga la página.');
    };
    
    document.head.appendChild(script);
    
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  const renderTurnstileWidget = useCallback((containerRef, onSuccess, onError) => {
    if (!state.turnstileLoaded || !containerRef.current || !window.turnstile || !TURNSTILE_CONFIG.siteKey) {
      return null;
    }

    try {
      const widgetId = window.turnstile.render(containerRef.current, {
        sitekey: TURNSTILE_CONFIG.siteKey,
        theme: TURNSTILE_CONFIG.theme,
        size: TURNSTILE_CONFIG.size,
        callback: (token) => {
          console.log('? Turnstile verificación exitosa');
          onSuccess(token);
        },
        'error-callback': (error) => {
          console.error('? Error en Turnstile:', error);
          onError('Error en verificación. Intenta de nuevo.');
        },
        'expired-callback': () => {
          console.warn('?? Token de Turnstile expirado');
          onSuccess(null);
          onError('Verificación expirada. Completa de nuevo.');
        }
      });
      
      console.log('? Turnstile widget renderizado:', widgetId);
      return widgetId;
    } catch (error) {
      console.error('? Error renderizando Turnstile:', error);
      onError('Error inicializando verificación.');
      return null;
    }
  }, [state.turnstileLoaded]);

  const resetTurnstileWidget = useCallback((widgetId) => {
    if (widgetId && window.turnstile) {
      try {
        window.turnstile.reset(widgetId);
        state.setTurnstileToken(null);
        state.setTurnstileError(null);
      } catch (error) {
        console.error('? Error reseteando Turnstile:', error);
      }
    }
  }, []);

  return {
    turnstileContainerRef,
    agencyTurnstileContainerRef,
    renderTurnstileWidget,
    resetTurnstileWidget
  };
};

const RegisterPage = ({ isOpen, onClose, onSwitchToLogin }) => {
  const state = useRegisterState();
  const { validateForm, validateAgencyForm } = useValidation();
  const { register, loading } = useAuth();
  const { navigateTo } = useApp();
  const { 
    turnstileContainerRef, 
    agencyTurnstileContainerRef, 
    renderTurnstileWidget, 
    resetTurnstileWidget 
  } = useTurnstile(state);
  
  const frontInputRef = useRef(null);
  const backInputRef = useRef(null);

  // ? EFECTOS OPTIMIZADOS
  useEffect(() => {
    const checkMobile = () => state.setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ? DETECCIÓN DE RESPUESTA OAUTH CON TOKEN TEMPORAL
  useEffect(() => {
    if (!isOpen) return;

    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    
    const tempToken = urlParams.get('tempToken') || hashParams.get('tempToken');
    
    if (tempToken) {
      handleTempTokenVerification(tempToken);
    }
  }, [isOpen, navigateTo]);

  const handleTempTokenVerification = async (tempToken) => {
    try {
      console.log('?? Verificando token temporal:', tempToken);
      
      const response = await fetch(getApiUrl(`/auth/callback/verify/${tempToken}`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        console.log('? Token temporal verificado exitosamente');
        
        const completeUserData = {
          ...data.data.user,
          token: data.data.token,
          refreshToken: data.data.refreshToken
        };
        
        localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(completeUserData));
        
        window.dispatchEvent(new CustomEvent('auth:login', { 
          detail: { user: completeUserData } 
        }));
        
        state.setShowSuccessMessage(true);
        
        window.history.replaceState({}, document.title, window.location.pathname);
        
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
        state.setFormErrors({ 
          submit: data.message || 'Error verificando autenticación. Intenta registrarte nuevamente.' 
        });
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (error) {
      console.error('?? Error en verificación de token temporal:', error);
      state.setFormErrors({ 
        submit: 'Error de conexión. Intenta registrarte nuevamente.' 
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const savedUserType = sessionStorage.getItem('registerUserType');
      if (savedUserType) {
        const normalizedType = savedUserType.toLowerCase();
        state.setUserType(normalizedType);
        state.setShowUserTypeSelection(false);
        if (normalizedType === 'agency') state.setShowAgencyForm(true);
      } else {
        state.setShowUserTypeSelection(true);
      }
      
      // Reset estados
      state.setFormData({ email: '', password: '', firstName: '' });
      state.setAgencyFormData({ email: '', firstName: '', password: '' });
      state.setAgencyFiles({ cedulaFrente: null, cedulaTrasera: null });
      state.setUploadProgress({ cedulaFrente: 0, cedulaTrasera: 0 });
      state.setShowPassword(false);
      state.setShowSuccessMessage(false);
      state.setAgencySubmissionSuccess(false);
      state.setFormErrors({});
      state.setAgencyFormErrors({});
      state.setTurnstileToken(null);
      state.setTurnstileError(null);
      state.setMounted(true);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    
    const handleEsc = (e) => e.keyCode === 27 && handleClose();
    const handleClickOutside = (e) => e.target.classList.contains('register-container-telofundi') && handleClose();
    
    document.addEventListener('keydown', handleEsc);
    document.addEventListener('click', handleClickOutside);
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.removeEventListener('click', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // ? RENDERIZAR TURNSTILE WIDGETS
  useEffect(() => {
    if (state.turnstileLoaded && turnstileContainerRef.current && !state.showUserTypeSelection && !state.showAgencyForm && state.userType && state.userType !== 'agency') {
      setTimeout(() => {
        const widgetId = renderTurnstileWidget(
          turnstileContainerRef,
          (token) => {
            state.setTurnstileToken(token);
            state.setTurnstileError(null);
            state.setFormErrors(prev => {
              const newErrors = { ...prev };
              delete newErrors.turnstile;
              return newErrors;
            });
          },
          (error) => {
            state.setTurnstileError(error);
            state.setTurnstileToken(null);
            state.setFormErrors(prev => ({ ...prev, turnstile: error }));
          }
        );
        state.setTurnstileWidgetId(widgetId);
      }, 100);
    }
  }, [state.turnstileLoaded, state.showUserTypeSelection, state.showAgencyForm, state.userType]);

  useEffect(() => {
    if (state.turnstileLoaded && agencyTurnstileContainerRef.current && state.showAgencyForm) {
      setTimeout(() => {
        const widgetId = renderTurnstileWidget(
          agencyTurnstileContainerRef,
          (token) => {
            state.setTurnstileToken(token);
            state.setTurnstileError(null);
            state.setAgencyFormErrors(prev => {
              const newErrors = { ...prev };
              delete newErrors.turnstile;
              return newErrors;
            });
          },
          (error) => {
            state.setTurnstileError(error);
            state.setTurnstileToken(null);
            state.setAgencyFormErrors(prev => ({ ...prev, turnstile: error }));
          }
        );
        state.setTurnstileWidgetId(widgetId);
      }, 100);
    }
  }, [state.turnstileLoaded, state.showAgencyForm]);

  // ? HANDLERS OPTIMIZADOS
  const handleClose = () => {
    state.setMounted(false);
    state.setShowSuccessMessage(false);
    state.setAgencySubmissionSuccess(false);
    state.setShowUserTypeSelection(false);
    state.setShowAgencyForm(false);
    if (state.turnstileWidgetId) {
      resetTurnstileWidget(state.turnstileWidgetId);
    }
    setTimeout(onClose, 300);
  };

  const handleUserTypeSelect = (type) => {
    state.setUserType(type);
    state.setShowUserTypeSelection(false);
    sessionStorage.setItem('registerUserType', type.toUpperCase());
    if (type === 'agency') state.setShowAgencyForm(true);
    if (state.turnstileWidgetId) {
      resetTurnstileWidget(state.turnstileWidgetId);
    }
  };

  const handleTogglePassword = useCallback(() => {
    state.setShowPassword(prev => !prev);
  }, []);

  const handleInputChange = useCallback((e, isAgency = false) => {
    const { name, value } = e.target;
    
    if (isAgency) {
      state.setAgencyFormData(prev => ({ ...prev, [name]: value }));
    } else {
      state.setFormData(prev => ({ ...prev, [name]: value }));
    }
  }, []);

  const handleFileUpload = (type, file) => {
    if (!file) return;
    
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      state.setAgencyFormErrors(prev => ({ ...prev, [type]: 'Solo se permiten archivos JPG, JPEG o PNG' }));
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      state.setAgencyFormErrors(prev => ({ ...prev, [type]: 'El archivo no puede ser mayor a 5MB' }));
      return;
    }
    
    state.setUploadProgress(prev => ({ ...prev, [type]: 0 }));
    
    const interval = setInterval(() => {
      state.setUploadProgress(prev => {
        const newProgress = prev[type] + 10;
        if (newProgress >= 100) {
          clearInterval(interval);
          const preview = URL.createObjectURL(file);
          state.setAgencyFiles(prevFiles => ({
            ...prevFiles,
            [type]: { file, name: file.name, size: file.size, preview, type: file.type }
          }));
          state.setAgencyFormErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[type];
            return newErrors;
          });
          return { ...prev, [type]: 100 };
        }
        return { ...prev, [type]: newProgress };
      });
    }, 100);
  };

  const canSubmitForm = useMemo(() => {
    if (state.showAgencyForm) {
      const errors = validateAgencyForm(state.agencyFormData, state.agencyFiles, state.turnstileToken);
      return Object.keys(errors).length === 0 && !state.isSubmittingAgency;
    } else {
      const errors = validateForm(state.formData, state.userType, state.turnstileToken);
      return Object.keys(errors).length === 0 && !loading;
    }
  }, [state.agencyFormData, state.agencyFiles, state.turnstileToken, state.isSubmittingAgency, state.formData, state.userType, loading, validateForm, validateAgencyForm, state.showAgencyForm]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const errors = validateForm(state.formData, state.userType, state.turnstileToken);
    if (Object.keys(errors).length > 0) {
      state.setFormErrors(errors);
      return;
    }
    
    try {
      const username = generateUsername(state.formData.firstName, state.formData.email);
      const result = await register({
        email: state.formData.email,
        password: state.formData.password,
        username,
        firstName: state.formData.firstName,
        lastName: '',
        userType: state.userType.toUpperCase(),
        phone: '', bio: '', website: '', locationId: '',
        turnstileToken: state.turnstileToken
      });
      
      if (result.success) {
        state.setShowSuccessMessage(true);
        setTimeout(() => {
          handleClose();
          const routes = { 
            client: ROUTES.CLIENT_DASHBOARD, escort: ROUTES.ESCORT_DASHBOARD, 
            agency: ROUTES.AGENCY_DASHBOARD, admin: ROUTES.ADMIN_DASHBOARD 
          };
          navigateTo(routes[result.user.userType.toLowerCase()] || ROUTES.FEED);
        }, 1000);
      } else {
        state.setFormErrors({ submit: result.error || 'Error en la autenticación' });
      }
    } catch (error) {
      state.setFormErrors({ submit: 'Error en la conexión. Inténtalo de nuevo.' });
    }
  };

  // ? HANDLER SIMPLIFICADO PARA AGENCIA
  const handleAgencySubmit = async (e) => {
    e.preventDefault();
    
    const errors = validateAgencyForm(state.agencyFormData, state.agencyFiles, state.turnstileToken);
    if (Object.keys(errors).length > 0) {
      state.setAgencyFormErrors(errors);
      return;
    }
    
    state.setIsSubmittingAgency(true);
    
    try {
      const formData = new FormData();
      
      // ? SOLO CAMPOS ESENCIALES
      formData.append('email', state.agencyFormData.email.trim());
      formData.append('firstName', state.agencyFormData.firstName.trim());
      formData.append('password', state.agencyFormData.password);
      formData.append('userType', 'AGENCY');
      formData.append('turnstileToken', state.turnstileToken);
      
      // ? CAMPOS OPCIONALES COMO VACÍOS (PARA QUE EL BACKEND LOS ACEPTE)
      formData.append('companyName', ''); // El backend generará uno automático
      formData.append('contactPerson', ''); // Usará firstName
      formData.append('address', ''); // Será vacío por ahora
      formData.append('phone', '');
      formData.append('bio', '');
      formData.append('website', '');
      formData.append('locationId', '');
      
      // ? ARCHIVOS DE CÉDULA
      Object.entries(state.agencyFiles).forEach(([key, fileObj]) => {
        if (fileObj?.file) formData.append(key, fileObj.file);
      });

      console.log('?? Enviando datos de agencia simplificados');

      const result = await authAPI.registerAgency(formData);
      
      if (result.success) {
        state.setAgencySubmissionSuccess(true);
        setTimeout(handleClose, 3000);
      } else {
        throw new Error(result.message || 'Error en el registro de agencia');
      }
      
    } catch (error) {
      console.error('? Error en registro de agencia:', error);
      
      if (error.response?.data?.errorCode === 'VALIDATION_ERROR') {
        const backendErrors = {};
        if (error.response.data.errors) {
          error.response.data.errors.forEach(err => {
            backendErrors[err.field] = err.message;
          });
        }
        state.setAgencyFormErrors(prev => ({ ...prev, ...backendErrors }));
      } else {
        const errorMessage = error.response?.data?.message || error.message || 
                           'Error enviando la solicitud. Inténtalo de nuevo.';
        state.setAgencyFormErrors({ submit: errorMessage });
      }
    } finally {
      state.setIsSubmittingAgency(false);
    }
  };

  const handleGoogleAuth = (e) => {
    e.preventDefault();
    try {
      state.setFormErrors({});
      const selectedUserType = state.userType ? state.userType.toUpperCase() : 'CLIENT';
      const apiUrl = import.meta.env?.VITE_API_URL || 
                    (window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : 'https://telofundi.com/api');
      const googleAuthUrl = `${apiUrl}/auth/google?userType=${selectedUserType}`;
      window.location.href = googleAuthUrl;
    } catch (error) {
      state.setFormErrors({ submit: 'Error iniciando autenticación con Google' });
    }
  };

  const generateUsername = (firstName, email) => {
    const namePart = firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const emailPart = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    const randomNum = Math.floor(Math.random() * 999) + 1;
    let username = `${namePart}${randomNum}`;
    if (username.length < 6) username = `${namePart}${emailPart}${randomNum}`.substring(0, 20);
    return username;
  };

  const userTypeOptions = useMemo(() => [
    { 
      type: 'client', 
      title: 'Cliente', 
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      )
    },
    { 
      type: 'escort', 
      title: 'Acompañante', 
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
          <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      )
    },
    { 
      type: 'agency', 
      title: 'Agencia', 
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <path d="M21 15l-5-5L5 21"></path>
        </svg>
      )
    }
  ], []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {state.mounted && (
        <motion.div 
          className="register-container-telofundi active"
          initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
          animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
          exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
          transition={{ duration: 0.3 }}
          style={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000, 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            padding: state.isMobile ? '0' : '15px', background: 'rgba(0,0,0,0.8)'
          }}
        >
          {/* Modal de selección de tipo de usuario */}
          <AnimatePresence>
            {state.showUserTypeSelection && (
              <motion.div
                className="register-modal-telofundi user-type-selection"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                style={{ 
                  width: state.isMobile ? '100vw' : '90%', maxWidth: state.isMobile ? 'none' : '400px',
                  height: state.isMobile ? '100vh' : 'auto', maxHeight: state.isMobile ? 'none' : '65vh',
                  borderRadius: state.isMobile ? '0' : '12px', background: '#0a0a0a', position: 'relative',
                  overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
                }}
              >
                <button 
                  onClick={handleClose} 
                  className={`register-close-btn-telofundi ${state.isMobile ? 'mobile' : ''}`}
                >
                  <svg width={state.isMobile ? "18" : "14"} height={state.isMobile ? "18" : "14"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>

                <div style={{ 
                  padding: state.isMobile ? '90px 20px 20px' : '35px 25px 25px', 
                  height: state.isMobile ? '100%' : 'auto', display: 'flex', flexDirection: 'column', background: '#0a0a0a' 
                }}>
                  <div style={{ textAlign: 'center', marginBottom: state.isMobile ? '25px' : '20px' }}>
                    <h2 style={{ 
                      fontSize: state.isMobile ? '1.2rem' : '1.3rem', fontWeight: '700', 
                      color: 'white', marginBottom: '6px' 
                    }}>
                      Crear cuenta
                    </h2>
                    <p style={{ fontSize: state.isMobile ? '0.8rem' : '0.85rem', color: '#ccc', margin: 0 }}>
                      ¿Qué tipo de cuenta necesitas?
                    </p>
                  </div>
                  
                  <div style={{ 
                    display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', flex: 1 
                  }}>
                    {userTypeOptions.map((option) => (
                      <button
                        key={option.type}
                        onClick={() => handleUserTypeSelect(option.type)}
                        className="register-user-type-btn"
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px', 
                          padding: state.isMobile ? '12px 16px' : '14px 18px',
                          background: '#1a1a1a', border: '2px solid #333', borderRadius: '8px', color: 'white',
                          fontSize: state.isMobile ? '0.9rem' : '0.95rem', fontWeight: '600', cursor: 'pointer',
                          transition: 'all 0.2s ease', textAlign: 'left', width: '100%'
                        }}
                      >
                        <div style={{ width: '14px', height: '14px', color: 'white' }}>
                          {option.icon}
                        </div>
                        <span style={{ flex: 1 }}>{option.title}</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 18l6-6-6-6"/>
                        </svg>
                      </button>
                    ))}
                  </div>
                  
                  <button 
                    onClick={onSwitchToLogin} 
                    style={{ 
                      padding: '8px', background: 'transparent', border: 'none', color: '#7a2d00', 
                      fontSize: '0.8rem', cursor: 'pointer', textAlign: 'center', width: '100%' 
                    }}
                  >
                    ? Volver al inicio de sesión
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Modal de agencia SIMPLIFICADO */}
          <AnimatePresence>
            {state.showAgencyForm && (
              <motion.div
                className="register-modal-telofundi agency-form"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                style={{ 
                  width: state.isMobile ? '100vw' : '90%', maxWidth: state.isMobile ? 'none' : '480px',
                  height: state.isMobile ? '100vh' : 'auto', maxHeight: state.isMobile ? 'none' : '85vh',
                  borderRadius: state.isMobile ? '0' : '12px', background: '#0a0a0a', position: 'relative',
                  overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
                }}
              >
                <button onClick={handleClose} className={`register-close-btn-telofundi ${state.isMobile ? 'mobile' : ''}`}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>

                <div className="register-agency-form-container">
                  {state.agencySubmissionSuccess ? (
                    <div className="register-success-container">
                      <motion.div 
                        initial={{ scale: 0 }} 
                        animate={{ scale: 1 }} 
                        className="register-success-icon-container"
                      >
                        <svg className="register-success-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M9 12l2 2 4-4"></path>
                          <circle cx="12" cy="12" r="10"></circle>
                        </svg>
                      </motion.div>
                      <h3 className="register-success-title">¡Solicitud Enviada!</h3>
                      <p className="register-success-text">
                        Hemos recibido tu solicitud de registro como agencia. Nuestro equipo revisará tu información y documentos enviados.
                      </p>
                      <p className="register-success-note">
                        Te contactaremos en las próximas 24-48 horas. <br/>
                        <strong>No podrás iniciar sesión hasta que tu cuenta sea aprobada.</strong>
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="register-agency-header">
                        <div className="register-agency-badge">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <path d="M21 15l-5-5L5 21"></path>
                          </svg>
                          <span>Registro de Agencia</span>
                        </div>
                        <h2 className="register-agency-title">Solicitud Simplificada</h2>
                        <p className="register-agency-subtitle">
                          Solo necesitamos tu información básica y las fotos de tu cédula
                        </p>
                      </div>

                      {state.agencyFormErrors.submit && (
                        <div className="register-error-message-telofundi">
                          {state.agencyFormErrors.submit}
                        </div>
                      )}

                      <form onSubmit={handleAgencySubmit}>
                        {/* ? SOLO 3 CAMPOS */}
                        <div className="register-agency-section">
                          <h4 className="register-agency-section-title">Información Personal</h4>
                          
                          <InputField 
                            name="firstName" 
                            placeholder="Tu nombre completo *" 
                            value={state.agencyFormData.firstName} 
                            onChange={handleInputChange} 
                            error={state.agencyFormErrors.firstName} 
                            required 
                            isAgency 
                            helpText="Nombre del responsable de la agencia"
                            maxLength={50}
                          />

                          <InputField 
                            name="email" 
                            type="email"
                            placeholder="Correo electrónico *" 
                            value={state.agencyFormData.email} 
                            onChange={handleInputChange} 
                            error={state.agencyFormErrors.email} 
                            required 
                            isAgency 
                            helpText="Email para acceder a tu cuenta"
                            maxLength={100}
                          />

                          <PasswordField 
                            name="password" 
                            placeholder="Contraseña *" 
                            value={state.agencyFormData.password} 
                            onChange={handleInputChange} 
                            error={state.agencyFormErrors.password} 
                            required 
                            isAgency
                            showPassword={state.showPassword} 
                            onTogglePassword={handleTogglePassword}
                            isMobile={state.isMobile}
                            helpText="Mínimo 8 caracteres con mayúscula, minúscula y número"
                          />
                        </div>

                        {/* ? FOTOS DE CÉDULA */}
                        <div className="register-file-upload-section">
                          <h3 className="register-file-upload-title">Documentos de Identificación *</h3>
                          <div className="register-file-upload-description-box">
                            <div className="register-file-upload-description">
                              <AlertCircle size={16} style={{ color: '#f59e0b', marginRight: '8px', flexShrink: 0 }} />
                              <div>
                                <strong>Requisitos importantes:</strong>
                                <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px', fontSize: '0.75rem', lineHeight: '1.4' }}>
                                  <li>Fotos claras y legibles de ambos lados de tu cédula</li>
                                  <li>Formato JPG o PNG, máximo 5MB por archivo</li>
                                  <li>Asegúrate de que todos los datos sean visibles</li>
                                  <li>Sin reflejos, sombras o borrosidad</li>
                                </ul>
                              </div>
                            </div>
                          </div>

                          <div className="register-documents-row">
                            <FileUploadField
                              type="cedulaFrente"
                              file={state.agencyFiles.cedulaFrente}
                              error={state.agencyFormErrors.cedulaFrente}
                              progress={state.uploadProgress.cedulaFrente}
                              onUpload={handleFileUpload}
                              onRemove={() => {
                                state.setAgencyFiles(prev => ({ ...prev, cedulaFrente: null }));
                                state.setUploadProgress(prev => ({ ...prev, cedulaFrente: 0 }));
                              }}
                              inputRef={frontInputRef}
                              label="Cédula Frontal *"
                              isUploading={state.isSubmittingAgency}
                              helpText="Lado frontal con foto y datos personales"
                            />

                            <FileUploadField
                              type="cedulaTrasera"
                              file={state.agencyFiles.cedulaTrasera}
                              error={state.agencyFormErrors.cedulaTrasera}
                              progress={state.uploadProgress.cedulaTrasera}
                              onUpload={handleFileUpload}
                              onRemove={() => {
                                state.setAgencyFiles(prev => ({ ...prev, cedulaTrasera: null }));
                                state.setUploadProgress(prev => ({ ...prev, cedulaTrasera: 0 }));
                              }}
                              inputRef={backInputRef}
                              label="Cédula Posterior *"
                              isUploading={state.isSubmittingAgency}
                              helpText="Lado posterior con firma y datos adicionales"
                            />
                          </div>
                        </div>

                        {/* ? TURNSTILE PARA AGENCIAS */}
                        <div style={{ marginBottom: '16px' }}>
                          <label style={{ color: 'white', fontSize: '0.85rem', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                            Verificación de Seguridad *
                          </label>
                          
                          {state.agencyFormErrors.turnstile && (
                            <div className="register-error-message-telofundi" style={{ marginBottom: '8px' }}>
                              {state.agencyFormErrors.turnstile}
                            </div>
                          )}

                          {!TURNSTILE_CONFIG.siteKey ? (
                            <div style={{ 
                              padding: '12px', border: '1px solid #ef4444', borderRadius: '8px', 
                              background: '#fef2f2', color: '#dc2626', fontSize: '14px' 
                            }}>
                              ?? Verificación de seguridad no configurada. Contacta al soporte.
                            </div>
                          ) : !state.turnstileLoaded ? (
                            <div style={{ 
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              minHeight: '65px', border: '1px solid #333', borderRadius: '8px',
                              background: '#1a1a1a', color: '#ccc', fontSize: '14px'
                            }}>
                              <div style={{
                                width: '16px', height: '16px', border: '2px solid #333',
                                borderTop: '2px solid #7a2d00', borderRadius: '50%',
                                animation: 'spin 1s linear infinite', marginRight: '8px'
                              }}></div>
                              Cargando verificación...
                            </div>
                          ) : state.turnstileError ? (
                            <div style={{ 
                              padding: '12px', border: '1px solid #ef4444', borderRadius: '8px', 
                              background: '#fef2f2', color: '#dc2626', fontSize: '14px' 
                            }}>
                              ?? {state.turnstileError}
                            </div>
                          ) : (
                            <div 
                              ref={agencyTurnstileContainerRef}
                              style={{ 
                                minHeight: '65px', display: 'flex', justifyContent: 'center', alignItems: 'center',
                                border: state.turnstileToken ? '1px solid #10b981' : '1px solid #333',
                                borderRadius: '8px', background: state.turnstileToken ? 'rgba(16, 185, 129, 0.05)' : '#1a1a1a'
                              }}
                            />
                          )}
                        </div>

                        <button 
                          type="submit" 
                          disabled={!canSubmitForm}
                          className="register-submit-btn-telofundi"
                          style={{
                            background: canSubmitForm ? 'linear-gradient(135deg, #7a2d00 0%, #663a1e 100%)' : 'rgba(122, 45, 0, 0.3)',
                            cursor: canSubmitForm ? 'pointer' : 'not-allowed',
                            marginTop: '6px',
                            position: 'relative'
                          }}
                        >
                          {state.isSubmittingAgency ? (
                            <div className="register-loading-spinner">
                              <div className="register-spinner" style={{ animation: 'spin 1s linear infinite' }}></div>
                              <span>Enviando solicitud...</span>
                            </div>
                          ) : (
                            <>
                              <span>Enviar Solicitud de Registro</span>
                            </>
                          )}
                        </button>
                      </form>

                      <div style={{ textAlign: 'center', marginTop: '15px' }}>
                        <button
                          onClick={() => {
                            state.setShowAgencyForm(false);
                            state.setShowUserTypeSelection(true);
                            state.setUserType('');
                            if (state.turnstileWidgetId) {
                              resetTurnstileWidget(state.turnstileWidgetId);
                            }
                          }}
                          style={{ 
                            background: 'transparent', border: 'none', color: '#7a2d00', 
                            fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' 
                          }}
                        >
                          ? Cambiar tipo de cuenta
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Modal principal de registro - SIN CAMBIOS */}
          {!state.showUserTypeSelection && !state.showAgencyForm && state.userType && state.userType !== 'agency' && (
            <motion.div 
              className="register-modal-telofundi"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.4 }}
              style={{
                width: state.isMobile ? '100vw' : '90%', maxWidth: state.isMobile ? 'none' : '700px',
                height: state.isMobile ? '100vh' : 'auto', maxHeight: state.isMobile ? 'none' : '80vh',
                borderRadius: state.isMobile ? '0' : '16px', background: '#0a0a0a', position: 'relative',
                display: 'flex', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
              }}
            >
              <button onClick={handleClose} className={`register-close-btn-telofundi ${state.isMobile ? 'mobile' : ''}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>

              <div style={{ 
                width: '100%', height: '100%', display: 'flex', 
                flexDirection: state.isMobile ? 'column' : 'row' 
              }}>
                <div style={{
                  flex: state.isMobile ? 'none' : '1', width: state.isMobile ? '100%' : 'auto', 
                  height: state.isMobile ? '100%' : 'auto',
                  padding: state.isMobile ? '70px 20px 20px' : '25px', 
                  overflowY: state.isMobile ? 'auto' : 'visible',
                  display: 'flex', flexDirection: 'column', 
                  justifyContent: state.isMobile ? 'flex-start' : 'center', 
                  background: '#0a0a0a', maxWidth: state.isMobile ? 'none' : '350px'
                }}>

                  {state.isMobile && (
                    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                      <div style={{ 
                        width: '70px', height: '70px', 
                        background: 'linear-gradient(135deg, #7a2d00, #663a1e)', 
                        borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto', color: 'white', fontSize: '1.5rem', fontWeight: 'bold'
                      }}>
                        TF
                      </div>
                    </div>
                  )}

                  {state.showSuccessMessage ? (
                    <div style={{ textAlign: 'center', padding: '25px 15px' }}>
                      <div style={{
                        width: '50px', height: '50px', 
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', 
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
                      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                        <h2 style={{ 
                          fontSize: state.isMobile ? '1.2rem' : '1.3rem', fontWeight: '700', 
                          color: 'white', marginBottom: '4px' 
                        }}>
                          Crear cuenta
                        </h2>
                      </div>

                      {state.userType && (
                        <div className="register-selected-type-badge">
                          <span>
                            ? Tipo: {state.userType === 'client' ? 'Cliente' : state.userType === 'escort' ? 'Acompañante' : 'Agencia'}
                          </span>
                          <button 
                            onClick={() => { 
                              state.setShowUserTypeSelection(true); 
                              state.setUserType(''); 
                              if (state.turnstileWidgetId) {
                                resetTurnstileWidget(state.turnstileWidgetId);
                              }
                            }} 
                            className="register-selected-type-change-btn"
                          >
                            Cambiar
                          </button>
                        </div>
                      )}

                      <button 
                        onClick={handleGoogleAuth} 
                        disabled={loading} 
                        className="register-google-btn-telofundi"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        {loading ? 'Redirigiendo...' : 'Registrarse con Google'}
                      </button>

                      <div className="register-divider-telofundi">
                        <div className="register-divider-line-telofundi"></div>
                        <span>o</span>
                        <div className="register-divider-line-telofundi"></div>
                      </div>

                      {state.formErrors.submit && (
                        <div className="register-error-message-telofundi">
                          {state.formErrors.submit}
                        </div>
                      )}

                      {state.formErrors.turnstile && (
                        <div className="register-error-message-telofundi">
                          {state.formErrors.turnstile}
                        </div>
                      )}

                      <form onSubmit={handleSubmit} className="register-form-telofundi">
                        <InputField 
                          name="email" 
                          type="email" 
                          placeholder="Correo electrónico" 
                          value={state.formData.email} 
                          onChange={handleInputChange} 
                          error={state.formErrors.email} 
                          required 
                        />
                        <InputField 
                          name="firstName" 
                          placeholder="Nombre" 
                          value={state.formData.firstName} 
                          onChange={handleInputChange} 
                          error={state.formErrors.firstName} 
                          required 
                        />
                        <PasswordField 
                          name="password" 
                          placeholder="Contraseña" 
                          value={state.formData.password} 
                          onChange={handleInputChange} 
                          error={state.formErrors.password} 
                          required 
                          showPassword={state.showPassword} 
                          onTogglePassword={handleTogglePassword}
                          isMobile={state.isMobile}
                        />

                        {/* ? TURNSTILE WIDGET PARA REGISTRO NORMAL */}
                        <div style={{ marginBottom: '16px' }}>
                          <label style={{ color: 'white', fontSize: '0.85rem', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                            Verificación de Seguridad *
                          </label>
                          
                          {!TURNSTILE_CONFIG.siteKey ? (
                            <div style={{
                              padding: '12px', border: '1px solid #ef4444', borderRadius: '8px',
                              background: '#fef2f2', color: '#dc2626', fontSize: '14px'
                            }}>
                              ?? Verificación de seguridad no configurada. Contacta al soporte.
                            </div>
                          ) : !state.turnstileLoaded ? (
                            <div style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              minHeight: '65px', border: '1px solid #333', borderRadius: '8px',
                              background: '#1a1a1a', color: '#ccc', fontSize: '14px'
                            }}>
                              <div style={{
                                width: '16px', height: '16px', border: '2px solid #333',
                                borderTop: '2px solid #7a2d00', borderRadius: '50%',
                                animation: 'spin 1s linear infinite', marginRight: '8px'
                              }}></div>
                              Cargando verificación...
                            </div>
                          ) : state.turnstileError ? (
                            <div style={{
                              padding: '12px', border: '1px solid #ef4444', borderRadius: '8px',
                              background: '#fef2f2', color: '#dc2626', fontSize: '14px'
                            }}>
                              ?? {state.turnstileError}
                            </div>
                          ) : (
                            <div 
                              ref={turnstileContainerRef}
                              style={{
                                minHeight: '65px', display: 'flex', justifyContent: 'center', alignItems: 'center',
                                border: state.turnstileToken ? '1px solid #10b981' : '1px solid #333',
                                borderRadius: '8px', background: state.turnstileToken ? 'rgba(16, 185, 129, 0.05)' : '#1a1a1a'
                              }}
                            />
                          )}
                        </div>

                        <button 
                          type="submit" 
                          disabled={!canSubmitForm}
                          className="register-submit-btn-telofundi"
                          style={{
                            marginTop: '6px',
                            background: canSubmitForm ? 'linear-gradient(135deg, #7a2d00 0%, #663a1e 100%)' : 'rgba(122, 45, 0, 0.3)',
                            cursor: canSubmitForm ? 'pointer' : 'not-allowed'
                          }}
                        >
                          {loading ? (
                            <div className="register-loading-spinner">
                              <div className="register-spinner" style={{ animation: 'spin 1s linear infinite' }}></div>
                              <span>Procesando...</span>
                            </div>
                          ) : (
                            'Crear cuenta'
                          )}
                        </button>
                      </form>

                      <div className="register-form-links-telofundi">
                        <div className="register-link-primary-container">
                          ¿Ya tienes cuenta?{' '}
                          <button 
                            onClick={onSwitchToLogin} 
                            className="register-link-telofundi primary"
                          >
                            Iniciar sesión
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {!state.isMobile && (
                  <div style={{
                    flex: '0.6', 
                    background: 'linear-gradient(135deg, #7a2d00 0%, #663a1e 100%)', 
                    position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    color: 'white', overflow: 'hidden'
                  }}>
                    <div style={{ 
                      position: 'absolute', top: '20%', right: '10%', width: '60px', height: '60px', 
                      background: 'rgba(255,255,255,0.1)', borderRadius: '50%', 
                      animation: 'float 6s ease-in-out infinite' 
                    }}></div>
                    <div style={{ 
                      position: 'absolute', bottom: '20%', left: '15%', width: '50px', height: '50px', 
                      background: 'rgba(255,255,255,0.1)', borderRadius: '50%', 
                      animation: 'float 4s ease-in-out infinite reverse' 
                    }}></div>
                    
                    <div className="register-brand-content-telofundi">
                      <div style={{ 
                        width: '125px', height: '125px', background: 'rgba(255,255,255,0.2)', 
                        borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 20px', fontSize: '2rem', fontWeight: 'bold'
                      }}>
                        TF
                      </div>
                      <p className="register-brand-subtitle-telofundi">
                        Únete a la comunidad más exclusiva del Caribe
                      </p>
                      
                      <div className="register-features-telofundi">
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
                          <div key={feature.text} className="register-feature-item">
                            <div className="register-feature-icon">{feature.icon}</div>
                            <span>{feature.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          <style>{`
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

            .register-password-input-wrapper {
              position: relative;
            }

            .password-requirements {
              position: absolute;
              top: 100%;
              left: 0;
              right: 0;
              background: #1a1a1a;
              border: 1px solid #333;
              border-radius: 6px;
              padding: 8px 10px;
              margin-top: 4px;
              z-index: 100;
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              display: flex;
              flex-direction: column;
              gap: 3px;
            }

            .password-requirements small {
              font-size: 0.7rem;
              transition: color 0.2s ease;
            }

            .req-valid {
              color: #10b981;
            }

            .req-invalid {
              color: #ef4444;
            }

            .register-input-telofundi.error {
              border-color: #ef4444;
              box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.1);
            }

            .register-help-text {
              display: flex;
              align-items: flex-start;
              gap: 6px;
              margin-top: 4px;
              padding: 6px 8px;
              background: rgba(122, 45, 0, 0.1);
              border: 1px solid rgba(122, 45, 0, 0.2);
              border-radius: 4px;
              font-size: 0.7rem;
              color: #7a2d00;
              line-height: 1.3;
            }

            .register-help-text.file-help {
              margin-bottom: 8px;
              background: rgba(59, 130, 246, 0.1);
              border-color: rgba(59, 130, 246, 0.2);
              color: #3b82f6;
            }

            .register-help-text svg {
              margin-top: 1px;
              flex-shrink: 0;
            }

            .register-help-text ul {
              margin: 0;
              padding-left: 12px;
            }

            .register-help-text li {
              margin-bottom: 2px;
            }

            .register-selected-type-badge {
              display: flex;
              align-items: center;
              justify-content: space-between;
              background: rgba(122, 45, 0, 0.1);
              border: 1px solid #7a2d00;
              border-radius: 6px;
              padding: 8px 10px;
              margin-bottom: 16px;
              font-size: 0.8rem;
              color: #7a2d00;
            }

            .register-selected-type-change-btn {
              background: transparent;
              border: none;
              color: #7a2d00;
              cursor: pointer;
              font-size: 0.75rem;
              text-decoration: underline;
              padding: 0;
            }

            .register-agency-section {
              margin-bottom: 20px;
              padding-bottom: 16px;
              border-bottom: 1px solid #333;
            }

            .register-agency-section:last-of-type {
              border-bottom: none;
            }

            .register-agency-section-title {
              color: white;
              font-size: 0.9rem;
              font-weight: 600;
              margin: 0 0 12px 0;
              display: flex;
              align-items: center;
              gap: 8px;
            }

            .register-agency-section-title::before {
              content: '';
              width: 3px;
              height: 16px;
              background: #7a2d00;
              border-radius: 2px;
            }

            .register-documents-row {
              display: flex;
              gap: 12px;
            }

            .register-documents-row .register-file-upload-field {
              flex: 1;
            }

            .register-file-upload-description-box {
              background: #1a1a1a;
              border: 1px solid #333;
              border-radius: 6px;
              padding: 12px;
              margin-bottom: 16px;
            }

            .register-file-upload-description {
              display: flex;
              align-items: flex-start;
              gap: 8px;
              font-size: 0.75rem;
              color: #ccc;
              line-height: 1.4;
            }

            /* ? Estilos optimizados para upload */
            .upload-progress-container {
              border: 2px solid #7a2d00;
              border-radius: 6px;
              padding: 12px;
              background: #1a1a1a;
            }

            .upload-progress-header {
              display: flex;
              align-items: center;
              gap: 6px;
              margin-bottom: 6px;
              color: white;
              font-size: 0.75rem;
            }

            .upload-progress-bar {
              width: 100%;
              height: 3px;
              background: #333;
              border-radius: 2px;
              overflow: hidden;
            }

            .upload-progress-fill {
              height: 100%;
              background: linear-gradient(90deg, #7a2d00, #663a1e);
              transition: width 0.1s ease;
            }

            .upload-progress-text {
              color: #ccc;
              margin: 3px 0 0;
              font-size: 0.65rem;
            }

            .upload-success-container {
              border: 2px solid #10b981;
              border-radius: 6px;
              padding: 10px;
              background: #1a1a1a;
              display: flex;
              align-items: center;
              gap: 10px;
            }

            .upload-preview {
              width: 40px;
              height: 30px;
              object-fit: cover;
              border-radius: 3px;
            }

            .upload-file-info {
              flex: 1;
            }

            .upload-file-name {
              color: white;
              margin: 0;
              font-size: 0.75rem;
              font-weight: 500;
            }

            .upload-file-size {
              color: #10b981;
              margin: 2px 0 0;
              font-size: 0.65rem;
            }

            .upload-remove-btn {
              background: #ef4444;
              border: none;
              border-radius: 3px;
              color: white;
              padding: 3px 5px;
              cursor: pointer;
              font-size: 0.65rem;
            }

            .upload-remove-btn:disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }

            .register-file-upload-hidden { display: none; }
            .register-file-upload-area { 
              border: 2px dashed #333; 
              border-radius: 6px; 
              padding: 12px 8px; 
              text-align: center; 
              cursor: pointer; 
              transition: all 0.2s ease; 
              background: #1a1a1a; 
            }
            .register-file-upload-area:hover:not(.disabled) { 
              border-color: #7a2d00; 
              background: #262626; 
            }
            .register-file-upload-area.error { 
              border-color: #ef4444; 
              background: rgba(239, 68, 68, 0.1); 
            }
            .register-file-upload-area.disabled {
              opacity: 0.6;
              cursor: not-allowed;
            }
            .register-file-upload-icon { margin-bottom: 6px; }
            .register-file-upload-text { color: white; font-weight: 500; margin: 0 0 3px 0; font-size: 0.75rem; }
            .register-file-upload-hint { color: #999; font-size: 0.65rem; margin: 0; }
            .register-agency-label { color: white; font-size: 0.8rem; font-weight: 600; margin-bottom: 6px; display: block; }
            .register-agency-input, .register-agency-textarea { width: 100%; padding: 8px 12px; background: #1a1a1a; border: 2px solid #333; border-radius: 6px; color: white; font-size: 0.8rem; transition: all 0.2s ease; box-sizing: border-box; }
            .register-agency-input:focus, .register-agency-textarea:focus { outline: none; border-color: #7a2d00; }
            .register-agency-input.error, .register-agency-textarea.error { border-color: #ef4444; }
            .register-agency-textarea { resize: vertical; min-height: 50px; }
            .register-error-text { color: #ef4444; font-size: 0.7rem; margin-top: 3px; display: block; }
            .register-file-upload-section { margin-top: 16px; padding-top: 16px; border-top: 1px solid #333; }
            .register-file-upload-title { color: white; font-size: 0.85rem; font-weight: 600; margin-bottom: 4px; }
            .register-file-upload-field { margin-bottom: 12px; }
            .register-agency-form-container { padding: 16px; max-height: calc(90vh - 40px); overflow-y: auto; }
            .register-agency-header { text-align: center; margin-bottom: 16px; }
            .register-agency-badge { display: inline-flex; align-items: center; gap: 4px; background: rgba(122, 45, 0, 0.1); color: #7a2d00; padding: 4px 8px; border-radius: 10px; font-size: 0.65rem; margin-bottom: 8px; }
            .register-agency-title { color: white; font-size: 1rem; font-weight: 700; margin: 0 0 4px 0; }
            .register-agency-subtitle { color: #ccc; font-size: 0.7rem; margin: 0; line-height: 1.3; }
            .register-success-container { text-align: center; padding: 25px 15px; }
            .register-success-icon-container { width: 50px; height: 50px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; }
            .register-success-icon { width: 26px; height: 26px; color: white; }
            .register-success-title { color: white; font-size: 1rem; font-weight: 700; margin: 0 0 8px 0; }
            .register-success-text { color: #ccc; font-size: 0.8rem; line-height: 1.4; margin: 0 0 8px 0; }
            .register-success-note { color: #7a2d00; font-size: 0.7rem; font-weight: 500; margin: 0; }
            
            .register-close-btn-telofundi { 
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
            
            .register-close-btn-telofundi:hover { 
              color: white; 
            }
            
            .register-close-btn-telofundi.mobile { 
              top: 65px; 
              right: 20px; 
              width: 32px; 
              height: 32px; 
            }

            .register-submit-btn-telofundi { width: 100%; padding: 12px; background: linear-gradient(135deg, #7a2d00 0%, #663a1e 100%); border: none; border-radius: 6px; color: white; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s ease; }
            .register-submit-btn-telofundi:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 15px rgba(122, 45, 0, 0.3); }
            .register-submit-btn-telofundi:disabled { opacity: 0.7; cursor: not-allowed; }
            .register-loading-spinner { display: flex; align-items: center; justify-content: center; gap: 6px; }
            .register-spinner { width: 16px; height: 16px; border: 2px solid rgba(255, 255, 255, 0.3); border-top: 2px solid white; border-radius: 50%; }
            .register-error-message-telofundi { background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; color: #ef4444; padding: 8px 12px; border-radius: 6px; margin-bottom: 12px; font-size: 0.75rem; text-align: center; }
            .register-input-group-telofundi { margin-bottom: 12px; position: relative; }
            .register-input-telofundi { width: 100%; padding: 8px 12px; background: #1a1a1a; border: 2px solid #333; border-radius: 6px; color: white; font-size: 0.8rem; transition: all 0.2s ease; box-sizing: border-box; }
            .register-input-telofundi:focus { outline: none; border-color: #7a2d00; }
            
            .register-password-toggle-telofundi { 
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
            
            .register-password-toggle-telofundi:hover { 
              color: white; 
            }
            
            .register-google-btn-telofundi { width: 100%; padding: 10px; background: #1a1a1a; border: 2px solid #333; border-radius: 6px; color: white; font-size: 0.8rem; font-weight: 500; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 12px; }
            .register-google-btn-telofundi:hover:not(:disabled) { border-color: #7a2d00; background: #262626; }
            .register-google-btn-telofundi:disabled { opacity: 0.7; cursor: not-allowed; }
            .register-divider-telofundi { display: flex; align-items: center; margin: 12px 0; color: #666; font-size: 0.75rem; }
            .register-divider-line-telofundi { flex: 1; height: 1px; background: #333; margin: 0 10px; }
            .register-form-telofundi { margin-bottom: 16px; }
            .register-form-links-telofundi { text-align: center; }
            .register-link-primary-container { color: #ccc; font-size: 0.8rem; }
            .register-link-telofundi { background: none; border: none; color: #7a2d00; cursor: pointer; text-decoration: none; font-weight: 500; }
            .register-link-telofundi:hover { text-decoration: underline; }
            .register-brand-content-telofundi { text-align: center; padding: 15px; }
            .register-brand-subtitle-telofundi { font-size: 0.9rem; margin-bottom: 20px; opacity: 0.9; line-height: 1.4; }
            .register-features-telofundi { display: flex; flex-direction: column; gap: 10px; }
            .register-feature-item { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; font-weight: 500; }
            .register-feature-icon { display: flex; align-items: center; justify-content: center; }
            .register-user-type-btn:hover { border-color: #7a2d00; background: #262626; transform: translateY(-1px); }
            
            @media (max-width: 768px) {
              .register-agency-form-container { padding: 14px; }
              .register-documents-row { flex-direction: column; gap: 10px; }
              .register-input-telofundi { font-size: 0.85rem; padding: 10px 12px; }
              .register-google-btn-telofundi { font-size: 0.85rem; padding: 12px; }
              .register-submit-btn-telofundi { font-size: 0.9rem; padding: 14px; }
              .register-file-upload-area { padding: 10px 8px; }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RegisterPage;