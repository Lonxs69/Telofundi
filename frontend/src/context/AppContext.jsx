import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthProvider } from './AuthContext';
import { UserProvider } from './UserContext';
import { PostsProvider } from './PostsContext';
import { ChatProvider } from './ChatContext';
import { ROUTES, APP_CONFIG } from '../utils/constants';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  // ✅ FORZAR HOMEPAGE SIEMPRE - SIN EXCEPCIONES
  const [currentPage, setCurrentPage] = useState('home');
  
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [isLoading, setIsLoading] = useState(false);

  // ✅ FORZAR HOMEPAGE SIEMPRE - MÉTODO DIRECTO
  useEffect(() => {
    console.log('������ FORZANDO HomePage - MÉTODO DIRECTO');
    
    // FORZAR HomePage sin importar nada más
    setCurrentPage('home');
    
    // Limpiar URL también
    if (window.location.pathname !== '/') {
      window.history.replaceState({}, '', '/');
      console.log('������ URL forzada a /');
    }
    
    console.log('✅ HomePage forzada exitosamente');
  }, []); // Solo ejecutar una vez al montar

  // Navegación SIMPLIFICADA - Solo valores directos
  const navigateTo = (page) => {
    console.log(`Navegando de ${currentPage} a ${page}`);
    
    setCurrentPage(page);
    setShowMobileMenu(false);
    
    // Scroll suave al top (solo si no es dashboard)
    if (!page.includes('dashboard')) {
      window.scrollTo({ 
        top: 0, 
        behavior: 'smooth' 
      });
    }
  };

  // Función para obtener la página actual en formato legible
  const getCurrentPageDisplay = () => {
    const pageDisplayMap = {
      [ROUTES.HOME]: 'Inicio',
      [ROUTES.ABOUT]: 'Nosotros',
      [ROUTES.FEED]: 'Descubrir',
      [ROUTES.AUTH]: 'Autenticación',
      [ROUTES.TERMS]: 'Términos y Condiciones',
      [ROUTES.SUPPORT]: 'Soporte',
      [ROUTES.AGENCIES]: 'Agencias VIP',
      [ROUTES.EVENTS]: 'Eventos',
      [ROUTES.PREMIUM]: 'Premium',
      [ROUTES.MATCHES]: 'Matches',
      [ROUTES.MESSAGES]: 'Mensajes',
      [ROUTES.NOTIFICATIONS]: 'Notificaciones',
      [ROUTES.CLIENT_DASHBOARD]: 'Dashboard Cliente',
      [ROUTES.ESCORT_DASHBOARD]: 'Dashboard Escort',
      [ROUTES.AGENCY_DASHBOARD]: 'Dashboard Agencia',
      [ROUTES.ADMIN_DASHBOARD]: 'Dashboard Admin'
    };
    
    return pageDisplayMap[currentPage] || 'Página';
  };

  // Función para verificar si estamos en una página específica
  const isCurrentPage = (page) => {
    return currentPage === page;
  };

  // Función para verificar si estamos en cualquier dashboard
  const isInDashboard = () => {
    return currentPage && currentPage.includes('dashboard');
  };

  // Manejo de modales mejorado
  const openLoginModal = () => {
    setShowLoginModal(true);
    document.body.style.overflow = 'hidden';
    console.log('Modal de login abierto');
  };

  const closeLoginModal = () => {
    setShowLoginModal(false);
    document.body.style.overflow = 'unset';
    console.log('Modal de login cerrado');
  };

  // Manejo de menú móvil
  const toggleMobileMenu = () => {
    setShowMobileMenu(!showMobileMenu);
    console.log(`Menú móvil ${!showMobileMenu ? 'abierto' : 'cerrado'}`);
  };

  const closeMobileMenu = () => {
    setShowMobileMenu(false);
  };

  // Función para cambiar tema
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    console.log(`Tema cambiado a: ${newTheme}`);
  };

  // Función para mostrar loading global
  const showLoading = (message = 'Cargando...') => {
    setIsLoading(true);
    console.log(`Loading activado: ${message}`);
  };

  const hideLoading = () => {
    setIsLoading(false);
    console.log('Loading desactivado');
  };

  // Efectos globales
  useEffect(() => {
    // Aplicar tema
    document.documentElement.setAttribute('data-theme', theme);
    
    // Establecer clase CSS en el body para el tema
    document.body.className = `theme-${theme}`;
    
    // Agregar clase dashboard si estamos en dashboard
    if (isInDashboard()) {
      document.body.classList.add('in-dashboard');
    } else {
      document.body.classList.remove('in-dashboard');
    }
  }, [theme, currentPage]);

  useEffect(() => {
    // Cerrar menú móvil al cambiar de página
    setShowMobileMenu(false);
    
    // Log del cambio de página (solo si currentPage no es null)
    if (currentPage) {
      console.log(`Página actual: ${getCurrentPageDisplay()} (${currentPage})`);
      
      // Actualizar título de la página
      document.title = `${getCurrentPageDisplay()} - TeloFundi`;
    }
  }, [currentPage]);

  // Efecto para limpiar scroll cuando se monta el componente
  useEffect(() => {
    return () => {
      document.body.style.overflow = 'unset';
      document.body.classList.remove('in-dashboard');
    };
  }, []);

  // Función para manejar navegación con teclas
  useEffect(() => {
    const handleKeyPress = (event) => {
      // Escape para cerrar modales y menús
      if (event.key === 'Escape') {
        if (showLoginModal) {
          closeLoginModal();
        }
        if (showMobileMenu) {
          closeMobileMenu();
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [showLoginModal, showMobileMenu]);

  const value = {
    // Estado de navegación
    currentPage,
    setCurrentPage,
    navigateTo,
    getCurrentPageDisplay,
    isCurrentPage,
    isInDashboard,
    
    // Estado de modales
    showLoginModal,
    openLoginModal,
    closeLoginModal,
    
    // Estado de menú móvil
    showMobileMenu,
    toggleMobileMenu,
    closeMobileMenu,
    
    // Estado de tema
    theme,
    setTheme,
    toggleTheme,
    
    // Estado de loading
    isLoading,
    setIsLoading,
    showLoading,
    hideLoading,
    
    // Rutas disponibles (para referencia)
    ROUTES
  };

  return (
    <AppContext.Provider value={value}>
      <AuthProvider>
        <UserProvider>
          <PostsProvider>
            <ChatProvider>
              {children}
            </ChatProvider>
          </PostsProvider>
        </UserProvider>
      </AuthProvider>
    </AppContext.Provider>
  );
};