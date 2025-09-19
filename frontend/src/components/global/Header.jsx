import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, LogOut, Crown, Menu } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { ROUTES } from '../../utils/constants';
import logo from '../../assets/images/logo png mejora.png';
import './Header.css';

const Header = ({ 
  onOpenAuthModal, 
  hideLogoInDashboard = false, 
  showHamburgerInDashboard = true,
  dashboardMode = false,
  onMenuClick
}) => {
  const [showSidebar, setShowSidebar] = React.useState(false);
  const [headerState, setHeaderState] = React.useState('visible');
  const [lastScrollY, setLastScrollY] = React.useState(0);

  // Usamos el contexto real de la app
  const { currentPage, navigateTo } = useApp();
  const { user, isAuthenticated, logout } = useAuth();

  React.useEffect(() => {
    // Si estamos en dashboard mode, no manejar scroll
    if (dashboardMode) {
      setHeaderState('visible-scrolled'); // Siempre visible con fondo
      return;
    }

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Si está en el hero section (primeros 100vh) - COMPLETAMENTE TRANSPARENTE
      if (currentScrollY <= 50) {
        setHeaderState('visible'); // Transparente total
      }
      // Si está scrolleando hacia abajo - OCULTAR
      else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setHeaderState('hidden');
        setShowSidebar(false); // Cerrar sidebar si está abierto
      }
      // Si está scrolleando hacia arriba (fuera del hero) - MOSTRAR CON FONDO
      else if (currentScrollY < lastScrollY && currentScrollY > 50) {
        setHeaderState('visible-scrolled'); // Con fondo oscuro y blur
      }
      
      setLastScrollY(currentScrollY);
    };

    // Throttle scroll event para mejor performance
    let ticking = false;
    const scrollHandler = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', scrollHandler, { passive: true });
    return () => window.removeEventListener('scroll', scrollHandler);
  }, [lastScrollY, dashboardMode]);

  // Cerrar sidebar al cambiar el tamaño de ventana
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1024) {
        setShowSidebar(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Bloquear scroll cuando sidebar está abierto
  React.useEffect(() => {
    if (showSidebar) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [showSidebar]);

  // ✅ FUNCIÓN CORREGIDA: handleNavigation simple y directa
  const handleNavigation = (route) => {
    console.log('🧭 Navigate to:', route);
    navigateTo(route); // Usar el contexto para navegar
    setShowSidebar(false);
  };

  const handleAuthAction = (action) => {
    console.log('Auth action:', action);
    if (action === 'login') {
      onOpenAuthModal && onOpenAuthModal('login');
    } else if (action === 'register') {
      onOpenAuthModal && onOpenAuthModal('register');
    } else if (action === 'logout') {
      logout();
      navigateTo(ROUTES.HOME);
    }
    setShowSidebar(false);
  };

  const toggleSidebar = () => {
    console.log('Header toggleSidebar called, dashboardMode:', dashboardMode);
    
    // El header siempre maneja su propio sidebar
    setShowSidebar(!showSidebar);
  };

  const closeSidebar = () => {
    setShowSidebar(false);
  };

  const getUserTypeLabel = (type) => {
    const labels = {
      client: 'Cliente',
      escort: 'Escort',
      agency: 'Agencia',
      admin: 'Administrador',
      // ✅ AGREGAR VERSIONES EN MAYÚSCULAS
      CLIENT: 'Cliente',
      ESCORT: 'Escort',
      AGENCY: 'Agencia',
      ADMIN: 'Administrador'
    };
    return labels[type] || 'Usuario';
  };

  // ✅ FUNCIÓN CORREGIDA - Normalizar userType a minúsculas
  const navigateToDashboard = () => {
    if (!isAuthenticated || !user) {
      console.log('❌ No hay usuario autenticado para navegar a dashboard');
      return;
    }
    
    // ✅ NORMALIZAR A MINÚSCULAS PARA COMPARACIÓN
    const userType = (user.userType || '').toLowerCase();
    console.log('🚀 Navegando a dashboard para usuario:', user.userType, '→ normalizado:', userType);
    
    switch (userType) {
      case 'client':
        console.log('📍 Navegando a CLIENT_DASHBOARD');
        navigateTo(ROUTES.CLIENT_DASHBOARD);
        break;
      case 'escort':
        console.log('📍 Navegando a ESCORT_DASHBOARD');
        navigateTo(ROUTES.ESCORT_DASHBOARD);
        break;
      case 'agency':
        console.log('📍 Navegando a AGENCY_DASHBOARD');
        navigateTo(ROUTES.AGENCY_DASHBOARD);
        break;
      case 'admin':
        console.log('📍 Navegando a ADMIN_DASHBOARD');
        navigateTo(ROUTES.ADMIN_DASHBOARD);
        break;
      default:
        console.log('❓ Tipo de usuario desconocido:', userType, 'navegando a FEED');
        navigateTo(ROUTES.FEED);
    }
    setShowSidebar(false);
  };

  // Determinar las clases CSS del header basado en el estado
  const getHeaderClasses = () => {
    const baseClass = 'header';
    if (dashboardMode) {
      return `${baseClass} visible-scrolled dashboard-mode`;
    }
    
    switch (headerState) {
      case 'hidden':
        return `${baseClass} hidden`;
      case 'visible-scrolled':
        return `${baseClass} visible-scrolled`;
      case 'visible':
      default:
        return `${baseClass} visible`; // Explícitamente transparente
    }
  };

  // ✅ ELEMENTOS DE NAVEGACIÓN COMPLETAMENTE CORREGIDOS
  const getNavigationItems = () => {
    // Para usuarios NO AUTENTICADOS - incluir Feed público
    if (!isAuthenticated) {
      return [
        {
          section: 'Explorar',
          items: [
            {
              route: ROUTES.HOME,
              label: 'Inicio',
              requiresAuth: false, // ✅ EXPLÍCITO
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9,22 9,12 15,12 15,22"/>
                </svg>
              )
            },
            {
              route: ROUTES.FEED,
              label: 'Ver Publicaciones',
              requiresAuth: false, // ✅ EXPLÍCITO
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M4 21v-2a4 4 0 0 1 3-3.87"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              )
            },
            {
              route: ROUTES.ABOUT,
              label: 'Nosotros',
              requiresAuth: false, // ✅ EXPLÍCITO - ESTO FALTABA
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              )
            }
          ]
        },
        {
          section: 'Legal',
          items: [
            {
              route: ROUTES.TERMS,
              label: 'Términos y Condiciones',
              requiresAuth: false, // ✅ EXPLÍCITO - ESTO FALTABA
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              )
            }
          ]
        }
      ];
    }

    // Para usuarios AUTENTICADOS - incluir opción de dashboard
    const authenticatedItems = [
      {
        section: 'Navegación',
        items: [
          {
            route: ROUTES.HOME,
            label: 'Inicio',
            requiresAuth: false, // ✅ EXPLÍCITO
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9,22 9,12 15,12 15,22"/>
              </svg>
            )
          },
          {
            route: ROUTES.ABOUT,
            label: 'Nosotros',
            requiresAuth: false, // ✅ EXPLÍCITO
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            )
          }
        ]
      },
      {
        section: 'Mi Cuenta',
        items: [
          {
            route: 'dashboard', // ✅ CORREGIDO: usar identificador especial
            label: 'Mi Cuenta',
            requiresAuth: true, // ✅ EXPLÍCITO
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="10" cy="7" r="4"/>
                <line x1="19" y1="8" x2="19" y2="14"/>
                <line x1="22" y1="11" x2="16" y2="11"/>
              </svg>
            ),
            onClick: navigateToDashboard // ✅ FUNCIÓN CORREGIDA
          }
        ]
      },
      {
        section: 'Legal',
        items: [
          {
            route: ROUTES.TERMS,
            label: 'Términos y Condiciones',
            requiresAuth: false, // ✅ EXPLÍCITO
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            )
          }
        ]
      }
    ];

    return authenticatedItems;
  };

  // ✅ FUNCIÓN COMPLETAMENTE CORREGIDA - Manejar click en elementos con lógica correcta
  const handleItemClick = (item) => {
    console.log('🖱️ Click en item:', item.label, 'route:', item.route);
    
    // Si tiene onClick personalizado, ejecutarlo
    if (item.onClick) {
      console.log('🔄 Ejecutando onClick personalizado');
      item.onClick();
      return; // ✅ IMPORTANTE: return para evitar navegación adicional
    }
    
    // Si requiere autenticación y no está autenticado, abrir modal
    if (item.requiresAuth === true && !isAuthenticated) {
      console.log('🔒 Requiere autenticación, abriendo modal');
      onOpenAuthModal && onOpenAuthModal('login');
      return; // ✅ IMPORTANTE: return para evitar navegación adicional
    }
    
    // Si no requiere auth o el usuario está autenticado, navegar
    if (item.requiresAuth === false || isAuthenticated) {
      console.log('🚀 Navegando a ruta:', item.route);
      handleNavigation(item.route);
      return;
    }
    
    // Fallback de seguridad
    console.warn('⚠️ Caso no manejado para item:', item);
  };

  // Animaciones de Framer Motion MEJORADAS - RESPONSIVE
  const sidebarVariants = {
    hidden: {
      x: "100%",
      opacity: 0,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 40,
        staggerChildren: 0.05,
        staggerDirection: -1
      }
    },
    visible: {
      x: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 40,
        staggerChildren: 0.08,
        delayChildren: 0.1
      }
    }
  };

  const overlayVariants = {
    hidden: {
      opacity: 0,
      backdropFilter: "blur(0px)",
      transition: {
        duration: 0.3
      }
    },
    visible: {
      opacity: 1,
      backdropFilter: "blur(8px)",
      transition: {
        duration: 0.4
      }
    }
  };

  const navSectionVariants = {
    hidden: {
      opacity: 0,
      y: 30
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
        staggerChildren: 0.1
      }
    }
  };

  const navItemVariants = {
    hidden: {
      opacity: 0,
      x: -30,
      scale: 0.9
    },
    visible: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 500,
        damping: 30
      }
    }
  };

  const authButtonVariants = {
    hidden: {
      opacity: 0,
      y: 40,
      scale: 0.8
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25,
        delay: 0.4
      }
    }
  };

  const userSectionVariants = {
    hidden: {
      opacity: 0,
      scale: 0.8,
      y: -30
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 30,
        delay: 0.15
      }
    }
  };

  // FUNCIÓN PARA DETERMINAR SI MOSTRAR CORONA/PREMIUM - SOLO PARA ESCORTS
  const shouldShowPremiumElements = () => {
    if (!isAuthenticated || !user) return false;
    
    // ✅ NORMALIZAR A MINÚSCULAS PARA COMPARACIÓN
    const userType = (user.userType || '').toLowerCase();
    // Mostrar elementos premium SOLO para escorts
    return userType === 'escort';
  };

  // ✅ SECCIÓN DE USUARIO SIMPLIFICADA CON MEJORES ANIMACIONES
  const renderUserSection = () => {
    if (!isAuthenticated) return null;

    return (
      <motion.div 
        className={`sidebar-user simplified modern ${user?.userType || ''}`}
        variants={userSectionVariants}
        initial="hidden"
        animate="visible"
        whileHover={{ scale: 1.02 }}
      >
        <motion.div 
          className="user-text-only"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <motion.div 
            className="username-section"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            <span className="username">@{user?.username || 'usuario'}</span>
            {/* SOLO MOSTRAR CORONA PARA ESCORTS PREMIUM CON ANIMACIÓN */}
            {shouldShowPremiumElements() && user?.isPremium && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ 
                  delay: 0.6, 
                  type: "spring", 
                  stiffness: 500, 
                  damping: 25 
                }}
              >
                <Crown size={16} className="premium-crown" />
              </motion.div>
            )}
          </motion.div>
          <motion.div 
            className="user-type"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            {getUserTypeLabel(user?.userType)}
          </motion.div>
        </motion.div>
      </motion.div>
    );
  };

  const renderAuthButtons = () => {
    if (isAuthenticated) {
      return (
        <motion.div 
          className="sidebar-auth modern"
          variants={authButtonVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.button 
            className="auth-button secondary modern"
            onClick={() => navigateToDashboard()}
            whileHover={{ 
              scale: 1.05, 
              y: -3,
              boxShadow: "0 8px 25px rgba(0, 0, 0, 0.3)"
            }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <User size={18} />
            <span>Mi Cuenta</span>
          </motion.button>
          <motion.button 
            className="auth-button secondary modern logout"
            onClick={() => handleAuthAction('logout')}
            whileHover={{ 
              scale: 1.05, 
              y: -3,
              boxShadow: "0 8px 25px rgba(255, 59, 59, 0.3)"
            }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <LogOut size={18} />
            <span>Cerrar Sesión</span>
          </motion.button>
        </motion.div>
      );
    }

    return (
      <motion.div 
        className="sidebar-auth modern"
        variants={authButtonVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.button 
          className="auth-button secondary login-button modern"
          onClick={() => handleAuthAction('login')}
          whileHover={{ 
            scale: 1.05, 
            y: -3,
            boxShadow: "0 8px 25px rgba(59, 130, 246, 0.3)"
          }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
            <polyline points="10,17 15,12 10,7"/>
            <line x1="15" y1="12" x2="3" y2="12"/>
          </svg>
          <span>Iniciar Sesión</span>
        </motion.button>
        
        <motion.button 
          className="auth-button primary modern"
          onClick={() => handleAuthAction('register')}
          whileHover={{ 
            scale: 1.05, 
            y: -3,
            boxShadow: "0 8px 25px rgba(168, 85, 247, 0.4)"
          }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <line x1="19" y1="8" x2="19" y2="14"/>
            <line x1="22" y1="11" x2="16" y2="11"/>
          </svg>
          <span>Crear Cuenta</span>
        </motion.button>
      </motion.div>
    );
  };

  return (
    <>
      <header className={getHeaderClasses()}>
        <div className="header-container mobile-optimized">
          {/* Logo - SIEMPRE MOSTRAR A MENOS QUE SE OCULTE EXPLÍCITAMENTE */}
          {!hideLogoInDashboard && (
            <motion.div 
              className="logo mobile-small" 
              onClick={() => handleNavigation(ROUTES.HOME)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <img 
                src={logo} 
                alt="TeloFundi" 
                className="logo-image mobile-small"
                style={{
                  borderRadius: '50%',
                  objectFit: 'cover'
                }}
              />
            </motion.div>
          )}

          {/* ✅ ESPACIADOR PARA CENTRAR LOGO EN MOBILE */}
          <div className="header-spacer"></div>

          {/* Hamburger Menu MEJORADO - MOSTRAR SEGÚN CONFIGURACIÓN */}
          {(!dashboardMode || showHamburgerInDashboard) && (
            <motion.button 
              className={`hamburger-menu modern mobile-small ${showSidebar ? 'active' : ''}`}
              onClick={toggleSidebar}
              aria-label="Abrir menú"
              aria-expanded={showSidebar}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              animate={showSidebar ? "open" : "closed"}
            >
              <motion.div 
                className="hamburger-line mobile-small"
                variants={{
                  closed: { rotate: 0, y: 0 },
                  open: { rotate: 45, y: 6 }
                }}
                transition={{ duration: 0.3 }}
              />
              <motion.div 
                className="hamburger-line mobile-small"
                variants={{
                  closed: { opacity: 1 },
                  open: { opacity: 0 }
                }}
                transition={{ duration: 0.2 }}
              />
              <motion.div 
                className="hamburger-line mobile-small"
                variants={{
                  closed: { rotate: 0, y: 0 },
                  open: { rotate: -45, y: -6 }
                }}
                transition={{ duration: 0.3 }}
              />
            </motion.button>
          )}
        </div>
      </header>

      {/* Sidebar MEJORADO - INDEPENDIENTE DEL DASHBOARD */}
      <AnimatePresence mode="wait">
        {showSidebar && (
          <>
            <motion.div 
              className="sidebar open modern mobile-optimized"
              variants={sidebarVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              <motion.div 
                className="sidebar-content modern"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >                
                {/* Header del Sidebar COMPLETAMENTE LIMPIO - SIN ICONOS */}
                <motion.div 
                  className="sidebar-header modern clean"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                >
                  {/* Header completamente vacío y limpio */}
                </motion.div>

                {/* User Section MEJORADA - Solo si está autenticado */}
                {isAuthenticated && renderUserSection()}

                {/* Navigation MEJORADA con animaciones en cascada */}
                <motion.nav 
                  className="sidebar-nav modern"
                  variants={navSectionVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {getNavigationItems().map((section, sectionIndex) => (
                    <motion.div 
                      key={section.section} 
                      className="nav-section modern"
                      variants={navSectionVariants}
                      initial="hidden"
                      animate="visible"
                      transition={{ delay: sectionIndex * 0.1 }}
                    >
                      <motion.div 
                        className="nav-section-title modern"
                        variants={navItemVariants}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + sectionIndex * 0.1 }}
                      >
                        {section.section}
                      </motion.div>
                      {section.items.map((item, itemIndex) => (
                        <motion.button
                          key={item.route}
                          className={`nav-item modern ${item.route === currentPage ? 'active' : ''} ${item.className || ''}`}
                          onClick={() => handleItemClick(item)}
                          variants={navItemVariants}
                          initial={{ opacity: 0, x: -30, scale: 0.9 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          transition={{ 
                            delay: 0.4 + sectionIndex * 0.1 + itemIndex * 0.05,
                            type: "spring",
                            stiffness: 400,
                            damping: 25
                          }}
                          whileHover={{ 
                            scale: 1.03, 
                            x: 15,
                            backgroundColor: "rgba(255, 255, 255, 0.05)",
                            transition: { type: "spring", stiffness: 400, damping: 25 }
                          }}
                          whileTap={{ scale: 0.97 }}
                        >
                          <motion.span 
                            className="nav-icon"
                            whileHover={{ scale: 1.2, rotate: 5 }}
                            transition={{ type: "spring", stiffness: 400 }}
                          >
                            {item.icon}
                          </motion.span>
                          <span className="nav-label">{item.label}</span>
                          {item.badge && (
                            <motion.span 
                              className="nav-badge"
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ 
                                delay: 0.6 + itemIndex * 0.1, 
                                type: "spring",
                                stiffness: 500
                              }}
                            >
                              {item.badge}
                            </motion.span>
                          )}
                          {item.requiresAuth === true && !isAuthenticated && (
                            <motion.svg 
                              className="auth-required-icon" 
                              viewBox="0 0 24 24" 
                              fill="none" 
                              stroke="currentColor" 
                              strokeWidth="2"
                              style={{ width: '16px', height: '16px', marginLeft: 'auto' }}
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.7, type: "spring" }}
                              whileHover={{ scale: 1.2 }}
                            >
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                              <circle cx="12" cy="16" r="1"/>
                              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </motion.svg>
                          )}
                        </motion.button>
                      ))}
                    </motion.div>
                  ))}
                </motion.nav>

                {/* Auth Buttons MEJORADOS con animación */}
                {renderAuthButtons()}
              </motion.div>
            </motion.div>

            {/* Overlay MEJORADO con animación */}
            <motion.div 
              className="sidebar-overlay open modern"
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              onClick={closeSidebar}
            />
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;