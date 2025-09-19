// AuthContext.jsx - CORREGIDO CON LISTENER AUTH:LOGIN
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, handleApiError } from '../utils/api';
import { AlertTriangle, UserX, Shield } from 'lucide-react';
import { STORAGE_KEYS } from '../config/config.js';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // ? FUNCIÓN PARA VERIFICAR SI EL USUARIO ES PREMIUM - MEJORADA
  const isClientPremium = () => {
    console.log('?? === isClientPremium DEBUG DETALLADO ===');
    console.log('?? User object exists:', !!user);
    
    if (!user) {
      console.log('? No user object');
      return false;
    }

    console.log('?? User data structure:', {
      id: user.id,
      userType: user.userType,
      isPremium: user.isPremium,
      premiumTier: user.premiumTier,
      client: user.client ? {
        isPremium: user.client.isPremium,
        premiumTier: user.client.premiumTier,
        premiumUntil: user.client.premiumUntil
      } : 'NO_CLIENT_OBJECT'
    });

    // ? VERIFICAR TODAS LAS POSIBLES ESTRUCTURAS DE DATOS PREMIUM
    const premiumChecks = {
      directIsPremium: user.isPremium === true,
      clientIsPremium: user.client?.isPremium === true,
      premiumField: user.premium === true,
      premiumTier: !!user.premiumTier,
      clientPremiumTier: !!user.client?.premiumTier,
      premiumUntilValid: user.client?.premiumUntil ? new Date(user.client.premiumUntil) > new Date() : false
    };

    console.log('?? Premium checks:', premiumChecks);

    // ? LÓGICA DE VERIFICACIÓN MEJORADA
    const isPremium = (
      premiumChecks.directIsPremium ||
      premiumChecks.clientIsPremium ||
      premiumChecks.premiumField ||
      premiumChecks.premiumTier ||
      premiumChecks.clientPremiumTier ||
      premiumChecks.premiumUntilValid
    );

    console.log('?? Final premium result:', isPremium);
    console.log('?? === END isClientPremium DEBUG ===');

    return isPremium;
  };

  // ? COMPONENTE PARA VERIFICAR PERMISOS DE USUARIO
  const ProtectedComponent = ({ 
    children, 
    allowedUserTypes = [], 
    fallback = null,
    showError = true 
  }) => {
    if (loading) {
      return (
        <div style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div className="spinner" style={{
              width: '48px',
              height: '48px',
              border: '4px solid rgba(255, 107, 53, 0.2)',
              borderTop: '4px solid #ff6b35',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem'
            }} />
            <p style={{ color: '#9CA3AF' }}>Verificando autenticación...</p>
          </div>
        </div>
      );
    }

    if (!isAuthenticated || !user) {
      if (fallback) return fallback;
      
      return (
        <div style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ textAlign: 'center' }}>
            <UserX size={64} color="#ef4444" />
            <h2 style={{ margin: '1rem 0', color: '#ef4444' }}>No Autenticado</h2>
            <p style={{ color: '#9CA3AF' }}>
              Debes iniciar sesión para acceder a esta página.
            </p>
          </div>
        </div>
      );
    }

    if (allowedUserTypes.length > 0 && !allowedUserTypes.includes(user.userType)) {
      if (fallback) return fallback;
      if (!showError) return null;
      
      return (
        <div style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ textAlign: 'center' }}>
            <Shield size={64} color="#ef4444" />
            <h2 style={{ margin: '1rem 0', color: '#ef4444' }}>Acceso Restringido</h2>
            <p style={{ color: '#9CA3AF' }}>
              Esta página es solo para: {allowedUserTypes.join(', ')}
              <br />
              Usuario actual: {user?.userType || 'No definido'}
            </p>
          </div>
        </div>
      );
    }

    return children;
  };

  // ? FUNCIONES HELPER PARA VERIFICAR PERMISOS
  const canAccess = (allowedUserTypes = []) => {
    if (!isAuthenticated || !user) return false;
    if (allowedUserTypes.length === 0) return true;
    return allowedUserTypes.includes(user.userType);
  };

  const isEscort = () => user?.userType === 'ESCORT';
  const isAgency = () => user?.userType === 'AGENCY';
  const isClient = () => user?.userType === 'CLIENT';

  // ? FUNCIÓN PARA NORMALIZAR DATOS DE USUARIO - NUEVA
  const normalizeUserData = (userData) => {
    if (!userData) return null;

    console.log('?? Normalizing user data:', {
      id: userData.id,
      userType: userData.userType,
      originalPremium: userData.isPremium,
      clientData: userData.client,
      hasClientObject: !!userData.client
    });

    // ? NORMALIZAR ESTRUCTURA DE DATOS PREMIUM
    const normalizedUser = {
      ...userData,
      // ? ASEGURAR QUE isPremium ESTÉ EN EL NIVEL SUPERIOR
      isPremium: userData.isPremium || userData.client?.isPremium || false,
      premiumTier: userData.premiumTier || userData.client?.premiumTier || null,
      premiumUntil: userData.premiumUntil || userData.client?.premiumUntil || null,
      // ? MANTENER DATOS ORIGINALES DEL CLIENTE
      client: userData.client ? {
        ...userData.client,
        isPremium: userData.client.isPremium || userData.isPremium || false
      } : null
    };

    console.log('? User data normalized:', {
      id: normalizedUser.id,
      userType: normalizedUser.userType,
      isPremium: normalizedUser.isPremium,
      premiumTier: normalizedUser.premiumTier,
      clientIsPremium: normalizedUser.client?.isPremium
    });

    return normalizedUser;
  };

  // ? CHECKAUTH MEJORADO CON NORMALIZACIÓN Y LISTENER AUTH:LOGIN
  useEffect(() => {
    const checkAuth = () => {
      console.log('?? AuthContext: Iniciando checkAuth con normalización...');
      
      try {
        if (!STORAGE_KEYS?.USER_DATA) {
          console.error('? STORAGE_KEYS.USER_DATA no disponible:', STORAGE_KEYS);
          setLoading(false);
          return;
        }
        
        console.log('?? Buscando usuario en localStorage con clave:', STORAGE_KEYS.USER_DATA);
        
        const savedUser = localStorage.getItem(STORAGE_KEYS.USER_DATA);
        console.log('?? LocalStorage result:', {
          found: !!savedUser,
          length: savedUser?.length || 0,
          keyUsed: STORAGE_KEYS.USER_DATA
        });
        
        if (savedUser) {
          try {
            const userData = JSON.parse(savedUser);
            console.log('?? Datos de usuario encontrados (RAW):', {
              id: userData.id,
              username: userData.username,
              userType: userData.userType,
              hasToken: !!userData.token,
              isActive: userData.isActive,
              email: userData.email,
              // ? DATOS PREMIUM DETALLADOS
              isPremium: userData.isPremium,
              premiumTier: userData.premiumTier,
              hasClient: !!userData.client,
              clientIsPremium: userData.client?.isPremium,
              clientPremiumTier: userData.client?.premiumTier
            });
            
            // ? VERIFICAR ESTRUCTURA MÍNIMA REQUERIDA
            if (!userData.id || !userData.userType) {
              console.error('? Datos de usuario incompletos, limpiando localStorage:', {
                hasId: !!userData.id,
                hasUserType: !!userData.userType
              });
              localStorage.removeItem(STORAGE_KEYS.USER_DATA);
              setLoading(false);
              return;
            }
            
            // ? VERIFICAR TOKEN
            if (!userData.token || userData.token.trim() === '') {
              console.error('? Usuario sin token válido, limpiando localStorage');
              localStorage.removeItem(STORAGE_KEYS.USER_DATA);
              setLoading(false);
              return;
            }
            
            // ? VERIFICAR QUE EL USUARIO ESTÉ ACTIVO
            if (userData.isActive === false) {
              console.warn('?? Usuario inactivo encontrado, limpiando localStorage');
              localStorage.removeItem(STORAGE_KEYS.USER_DATA);
              setLoading(false);
              return;
            }
            
            // ? NORMALIZAR DATOS DE USUARIO ANTES DE GUARDAR EN STATE
            const normalizedUser = normalizeUserData(userData);
            
            // ? GUARDAR DATOS NORMALIZADOS EN LOCALSTORAGE
            localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(normalizedUser));
            
            // ? TODO VÁLIDO - RESTAURAR ESTADO CON DATOS NORMALIZADOS
            console.log('? Restaurando sesión de usuario con datos normalizados:', {
              username: normalizedUser.username,
              userType: normalizedUser.userType,
              isPremium: normalizedUser.isPremium,
              premiumTier: normalizedUser.premiumTier
            });
            
            setUser(normalizedUser);
            setIsAuthenticated(true);
            
          } catch (parseError) {
            console.error('? Error parseando datos de usuario desde localStorage:', parseError);
            console.error('? Datos raw que causaron el error:', savedUser);
            localStorage.removeItem(STORAGE_KEYS.USER_DATA);
          }
        } else {
          console.log('?? No hay usuario guardado en localStorage');
        }
        
      } catch (error) {
        console.error('? Error crítico en checkAuth:', error);
      } finally {
        setLoading(false);
        console.log('?? AuthContext: checkAuth completado, loading =', false);
      }
    };

    checkAuth();
    
    // ? LISTENER PARA CAMBIOS DE STORAGE (sincronización entre pestañas)
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEYS.USER_DATA) {
        console.log('?? Cambio detectado en localStorage, verificando auth...');
        
        if (e.newValue) {
          try {
            const userData = JSON.parse(e.newValue);
            if (userData.id && userData.token) {
              console.log('? Usuario actualizado desde otra pestaña');
              const normalizedUser = normalizeUserData(userData);
              setUser(normalizedUser);
              setIsAuthenticated(true);
            }
          } catch (error) {
            console.error('? Error parseando nuevo valor de storage:', error);
          }
        } else {
          console.log('?? Usuario eliminado desde otra pestaña');
          setUser(null);
          setIsAuthenticated(false);
        }
      }
    };
    
    // ? NUEVO: LISTENER PARA EVENTOS DE LOGIN DESDE OAUTH
    const handleAuthLogin = (event) => {
      if (event.type === 'auth:login' && event.detail?.user) {
        console.log('?? === AUTH:LOGIN EVENT DETECTADO ===');
        const userData = event.detail.user;
        
        console.log('?? Datos recibidos del evento auth:login:', {
          id: userData.id,
          userType: userData.userType,
          isPremium: userData.isPremium,
          hasToken: !!userData.token,
          username: userData.username
        });
        
        // ? NORMALIZAR DATOS ANTES DE ACTUALIZAR ESTADO
        const normalizedUser = normalizeUserData(userData);
        
        console.log('?? Datos normalizados para actualizar estado:', {
          id: normalizedUser.id,
          userType: normalizedUser.userType,
          isPremium: normalizedUser.isPremium,
          username: normalizedUser.username
        });
        
        // ? GUARDAR EN LOCALSTORAGE (por si no se hizo antes)
        localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(normalizedUser));
        
        // ? ACTUALIZAR ESTADO DEL CONTEXTO INMEDIATAMENTE
        setUser(normalizedUser);
        setIsAuthenticated(true);
        setLoading(false); // ? IMPORTANTE: Asegurar que loading sea false
        
        console.log('? Estado del AuthContext actualizado desde evento auth:login:', {
          username: normalizedUser.username,
          userType: normalizedUser.userType,
          isPremium: normalizedUser.isPremium,
          isAuthenticated: true
        });
        console.log('?? === FIN AUTH:LOGIN EVENT PROCESSING ===');
      }
    };
    
    // ? LISTENER PARA EVENTOS DE LOGOUT AUTOMÁTICO
    const handleAutoLogout = (event) => {
      if (event.type === 'auth:logout') {
        console.log('?? Auto-logout detectado, limpiando estado...');
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem(STORAGE_KEYS.USER_DATA);
      }
    };
    
    // ? AGREGAR TODOS LOS EVENT LISTENERS
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth:logout', handleAutoLogout);
    window.addEventListener('auth:login', handleAuthLogin); // ? NUEVO LISTENER CRÍTICO
    
    // ? CLEANUP FUNCTION
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth:logout', handleAutoLogout);
      window.removeEventListener('auth:login', handleAuthLogin); // ? NUEVO CLEANUP
    };
  }, []);

  const login = async (credentials) => {
    try {
      setLoading(true);
      console.log('?? Iniciando proceso de login...');
      
      const response = await authAPI.login(credentials);
      
      if (response.success && response.data.user) {
        const userData = response.data.user;
        userData.token = response.data.token;
        
        console.log('?? Datos recibidos del backend al login:', {
          id: userData.id,
          username: userData.username,
          userType: userData.userType,
          isPremium: userData.isPremium,
          hasClient: !!userData.client,
          clientIsPremium: userData.client?.isPremium
        });
        
        // ? NORMALIZAR DATOS ANTES DE GUARDAR
        const normalizedUser = normalizeUserData(userData);
        
        console.log('?? Guardando datos normalizados en localStorage:', {
          id: normalizedUser.id,
          username: normalizedUser.username,
          userType: normalizedUser.userType,
          isPremium: normalizedUser.isPremium,
          key: STORAGE_KEYS.USER_DATA
        });
        
        localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(normalizedUser));
        setUser(normalizedUser);
        setIsAuthenticated(true);
        
        console.log(`? Login exitoso con datos normalizados: ${normalizedUser.username} (${normalizedUser.userType}) - Premium: ${normalizedUser.isPremium}`);
        
        return { success: true, user: normalizedUser };
      } else {
        console.log('? Login falló, respuesta del servidor:', response);
        return { 
          success: false, 
          error: response.message || 'Error en el login' 
        };
      }
    } catch (error) {
      console.error('? Error en login:', error);
      const errorMessage = handleApiError(error);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      console.log('?? Iniciando proceso de registro...');
      
      // ?? DEBUG CRÍTICO: Verificar si turnstileToken llega aquí
      console.log('?? === TURNSTILE DEBUG EN REGISTER ===');
      console.log('?? UserData completa recibida:', Object.keys(userData));
      console.log('?? TurnstileToken presente:', !!userData.turnstileToken);
      console.log('?? TurnstileToken valor:', userData.turnstileToken ? `${userData.turnstileToken.substring(0, 20)}...` : 'NULL/UNDEFINED');
      console.log('?? TurnstileToken longitud:', userData.turnstileToken?.length || 0);
      console.log('?? === FIN TURNSTILE DEBUG ===');
      
      const backendData = {
        email: userData.email,
        username: userData.username,
        firstName: userData.firstName || userData.username,
        lastName: userData.lastName || 'User',
        password: userData.password,
        userType: userData.userType.toUpperCase(),
        phone: userData.phone || null,
        bio: userData.bio || null,
        website: userData.website || null,
        locationId: userData.locationId || null,
        // ?? CRÍTICO: Agregar turnstileToken al backend data
        turnstileToken: userData.turnstileToken || null
      };
      
      // ?? DEBUG: Verificar que turnstileToken esté en backendData
      console.log('?? === BACKEND DATA DEBUG ===');
      console.log('?? BackendData keys:', Object.keys(backendData));
      console.log('?? TurnstileToken en backendData:', !!backendData.turnstileToken);
      console.log('?? === FIN BACKEND DATA DEBUG ===');
      
      console.log('?? Enviando al backend:', {
        ...backendData,
        turnstileToken: backendData.turnstileToken ? 'HAS_TOKEN' : 'NO_TOKEN'
      });
      
      const response = await authAPI.register(backendData);
      
      if (response.success && response.data.user) {
        const userData = response.data.user;
        userData.token = response.data.token;
        
        console.log('?? Datos recibidos del backend al registro:', {
          id: userData.id,
          username: userData.username,
          userType: userData.userType,
          isPremium: userData.isPremium,
          hasClient: !!userData.client,
          clientIsPremium: userData.client?.isPremium
        });
        
        // ? NORMALIZAR DATOS ANTES DE GUARDAR
        const normalizedUser = normalizeUserData(userData);
        
        console.log('?? Guardando datos normalizados de registro:', {
          id: normalizedUser.id,
          username: normalizedUser.username,
          userType: normalizedUser.userType,
          isPremium: normalizedUser.isPremium
        });
        
        localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(normalizedUser));
        setUser(normalizedUser);
        setIsAuthenticated(true);
        
        console.log(`? Registro exitoso con datos normalizados: ${normalizedUser.username} (${normalizedUser.userType}) - Premium: ${normalizedUser.isPremium}`);
        
        return { success: true, user: normalizedUser };
      } else {
        return { 
          success: false, 
          error: response.message || 'Error en el registro' 
        };
      }
    } catch (error) {
      console.error('? Error en registro:', error);
      
      // ?? DEBUG ESPECÍFICO PARA ERRORES DE TURNSTILE
      if (error.message?.includes('Turnstile') || error.message?.includes('verificación')) {
        console.error('?? === ERROR TURNSTILE DETECTADO ===');
        console.error('?? Error message:', error.message);
        console.error('?? Error response:', error.response?.data);
        console.error('?? === FIN ERROR TURNSTILE ===');
      }
      
      const errorMessage = handleApiError(error);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // ? FUNCIÓN DE LOGOUT
  const logout = async () => {
    try {
      console.log('?? Iniciando proceso de logout...');
      
      // Intentar hacer logout en el servidor (opcional)
      try {
        await authAPI.logout();
      } catch (error) {
        console.warn('?? Error en logout del servidor (continuando con logout local):', error);
      }
      
      // Limpiar estado local
      localStorage.removeItem(STORAGE_KEYS.USER_DATA);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      setUser(null);
      setIsAuthenticated(false);
      
      // Notificar a otras pestañas
      window.dispatchEvent(new CustomEvent('auth:logout'));
      
      console.log('? Logout completado');
      return { success: true };
    } catch (error) {
      console.error('? Error en logout:', error);
      // Incluso si hay error, limpiar estado local
      localStorage.removeItem(STORAGE_KEYS.USER_DATA);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      setUser(null);
      setIsAuthenticated(false);
      return { success: false, error: error.message };
    }
  };

  // ? FUNCIÓN PARA ACTUALIZAR USUARIO CON NORMALIZACIÓN
  const updateUser = async (updates) => {
    try {
      console.log('?? Actualizando usuario:', updates);
      
      if (!user) {
        return { success: false, error: 'No hay usuario autenticado' };
      }
      
      // ? COMBINAR Y NORMALIZAR DATOS
      const combinedData = { ...user, ...updates };
      const normalizedUser = normalizeUserData(combinedData);
      
      // Actualizar estado local inmediatamente para mejor UX
      setUser(normalizedUser);
      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(normalizedUser));
      
      console.log('? Usuario actualizado localmente con normalización:', {
        isPremium: normalizedUser.isPremium,
        premiumTier: normalizedUser.premiumTier
      });
      
      return { success: true, user: normalizedUser };
    } catch (error) {
      console.error('? Error actualizando usuario:', error);
      return { success: false, error: error.message };
    }
  };

  // ? MEJORADO: refreshUserProfile con normalización
  const refreshUserProfile = async () => {
    try {
      if (!user) return { success: false, error: 'No hay usuario autenticado' };
      
      setLoading(true);
      console.log('?? Refrescando perfil de usuario desde backend...');
      
      const response = await authAPI.getProfile();
      
      if (response.success && response.data) {
        const freshUserData = {
          ...response.data,
          token: user.token
        };
        
        console.log('?? Datos frescos recibidos del backend:', {
          id: freshUserData.id,
          userType: freshUserData.userType,
          isPremium: freshUserData.isPremium,
          hasClient: !!freshUserData.client,
          clientIsPremium: freshUserData.client?.isPremium
        });
        
        // ? NORMALIZAR DATOS FRESCOS
        const normalizedUser = normalizeUserData(freshUserData);
        
        console.log('?? Guardando perfil refrescado y normalizado...');
        localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(normalizedUser));
        setUser(normalizedUser);
        
        console.log('? Perfil de usuario refrescado y normalizado desde backend:', {
          isPremium: normalizedUser.isPremium,
          premiumTier: normalizedUser.premiumTier
        });
        
        return { success: true, user: normalizedUser };
      }
      
      return { success: false, error: response.message || 'Error refrescando perfil' };
    } catch (error) {
      console.error('? Error refrescando perfil:', error);
      
      // ? CRÍTICO: NO HACER LOGOUT AUTOMÁTICO en refresh profile
      // Solo hacer logout si es error 401 específico de token inválido
      if (error.status === 401 && error.errorCode === 'TOKEN_INVALID') {
        console.warn('?? Token inválido detectado en refresh, haciendo logout...');
        localStorage.removeItem(STORAGE_KEYS.USER_DATA);
        setUser(null);
        setIsAuthenticated(false);
        window.dispatchEvent(new CustomEvent('auth:logout'));
      }
      
      return { success: false, error: handleApiError(error) };
    } finally {
      setLoading(false);
    }
  };

  // ? RESTO DE FUNCIONES SIN CAMBIOS
  const addTeloPoints = (points, reason = 'Actividad') => {
    if (!user || user.userType === 'admin') return false;
    
    const newPoints = (user.teloPoints || 0) + points;
    const updatedUser = { 
      ...user, 
      teloPoints: newPoints,
      lastPointsActivity: {
        amount: points,
        reason: reason,
        timestamp: new Date().toISOString()
      }
    };
    
    const normalizedUser = normalizeUserData(updatedUser);
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(normalizedUser));
    setUser(normalizedUser);
    
    console.log(`+${points} TeloPoints añadidos por: ${reason}. Total: ${newPoints}`);
    return true;
  };

  const spendTeloPoints = (points, reason = 'Compra') => {
    if (!user || user.userType === 'admin' || (user.teloPoints || 0) < points) return false;
    
    const newPoints = (user.teloPoints || 0) - points;
    const updatedUser = { 
      ...user, 
      teloPoints: newPoints,
      lastPointsActivity: {
        amount: -points,
        reason: reason,
        timestamp: new Date().toISOString()
      }
    };
    
    const normalizedUser = normalizeUserData(updatedUser);
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(normalizedUser));
    setUser(normalizedUser);
    
    console.log(`-${points} TeloPoints gastados en: ${reason}. Total: ${newPoints}`);
    return true;
  };

  // ? FUNCIÓN PARA VERIFICAR SI ES USUARIO PREMIUM - USANDO LA FUNCIÓN MEJORADA
  const isPremiumUser = () => {
    return isClientPremium();
  };

  const isAdminUser = () => {
    return user?.userType === 'ADMIN' || false;
  };

  const hasAdminPermission = (permission) => {
    if (!isAdminUser()) return false;
    return user?.permissions?.[permission] || false;
  };

  const getDashboardRoute = () => {
    if (!user) return '/feed';
    
    switch (user.userType) {
      case 'CLIENT':
        return '/client-dashboard';
      case 'ESCORT':
        return '/escort-dashboard';
      case 'AGENCY':
        return '/agency-dashboard';
      case 'ADMIN':
        return '/admin-dashboard';
      default:
        return '/feed';
    }
  };

  const getAdminStats = () => {
    if (!isAdminUser()) return null;
    
    return {
      totalUsers: 1250,
      activeUsers: 892,
      newUsersToday: 23,
      totalReports: 156,
      pendingReports: 8,
      bannedUsers: 45,
      totalRevenue: 125000,
      monthlyRevenue: 45000
    };
  };

  const logAdminAction = (action, target = null, details = null) => {
    if (!isAdminUser()) return;
    
    const logEntry = {
      adminId: user.id,
      adminUsername: user.username,
      action: action,
      target: target,
      details: details,
      timestamp: new Date().toISOString(),
      ip: 'localhost'
    };
    
    console.log('Admin Action Log:', logEntry);
  };

  const validateToken = async () => {
    try {
      if (!user?.token) {
        return { valid: false, reason: 'no_token' };
      }
      
      const response = await authAPI.getProfile();
      
      if (response.success) {
        return { valid: true };
      } else {
        return { valid: false, reason: 'invalid_token' };
      }
    } catch (error) {
      console.log('?? Token validation failed:', error.message);
      return { 
        valid: false, 
        reason: error.status === 401 ? 'expired_token' : 'network_error' 
      };
    }
  };

  const refreshToken = async () => {
    try {
      return { success: true };
    } catch (error) {
      console.error('Error refreshing token:', error);
      logout();
      return { success: false };
    }
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    register,
    logout,
    updateUser,
    refreshUserProfile,
    addTeloPoints,
    spendTeloPoints,
    isPremiumUser, // ? USANDO LA FUNCIÓN MEJORADA
    isClientPremium, // ? FUNCIÓN ESPECÍFICA PARA CLIENTES
    isAdminUser,
    hasAdminPermission,
    getAdminStats,
    logAdminAction,
    getDashboardRoute,
    refreshToken,
    validateToken,
    ProtectedComponent,
    canAccess,
    isEscort,
    isAgency,
    isClient
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </AuthContext.Provider>
  );
};