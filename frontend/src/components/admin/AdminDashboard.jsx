import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Flame, 
  MessageCircle, 
  Building2,
  Users,
  UserCheck,
  Crown,
  Bell,
  BarChart3,
  MoreHorizontal
} from 'lucide-react';

// Importar componentes COMPARTIDOS y específicos del admin
import FeedPage from '../shared/feed/FeedPage';
import ChatPage from '../shared/chat/ChatPage';
import AdminModerationPage from './AdminModerationPage';
import AdminAnalytics from './AdminAnalytics';
import AdminProfile from './AdminProfile';
import AdminAgencyApproval from './AdminAgencyApproval';
import Header from '../global/Header';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [activeView, setActiveView] = useState('feed');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [navVisible, setNavVisible] = useState(true);

  // Función para abrir auth modal
  const handleOpenAuthModal = (type) => {
    console.log('Auth modal requested:', type);
    setShowAuthModal(true);
  };

  // Navegación principal sin favoritos, igual estructura que EscortDashboard
  const mainNavigation = [
    {
      id: 'feed',
      label: 'Para Ti',
      icon: Flame,
      component: () => <FeedPage userType="admin" />,
      description: 'Feed de publicaciones',
      gradient: 'from-orange-500 to-red-600'
    },
    {
      id: 'chat',
      label: 'Mensajes',
      icon: MessageCircle,
      component: () => <ChatPage userType="admin" />,
      description: 'Chat administrativo con usuarios',
      gradient: 'from-green-500 to-teal-600'
    },
    {
      id: 'agencies',
      label: 'Solicitudes',
      icon: Building2,
      component: AdminAgencyApproval,
      description: 'Solicitudes De Agencias',
      gradient: 'from-blue-500 to-indigo-600'
    },
    {
      id: 'moderation',
      label: 'Moderación',
      icon: Users,
      component: AdminModerationPage,
      description: 'Gestión y moderación',
      gradient: 'from-red-500 to-red-700'
    },
    {
      id: 'analytics',
      label: 'Analíticas',
      icon: BarChart3,
      component: AdminAnalytics,
      description: 'Estadísticas del sistema',
      gradient: 'from-indigo-500 to-purple-600'
    },
    {
      id: 'profile',
      label: 'Perfil',
      icon: UserCheck,
      component: AdminProfile,
      description: 'Configuración de admin',
      gradient: 'from-gray-500 to-gray-700'
    }
  ];

  // ✅ FUNCIÓN EXACTA DE ESCORTDASHBOARD - CON CONFIGURACIÓN COMPLETA DE FEED
  const setupOptimizedStyles = () => {
    const style = document.createElement('style');
    style.id = 'admin-dashboard-optimized-styles';
    style.textContent = `
      /* RESET Y BASE */
      * {
        box-sizing: border-box !important;
      }
      
      body, html {
        overflow-x: hidden !important;
        max-width: 100vw !important;
        margin: 0 !important;
        padding: 0 !important;
        scroll-behavior: smooth !important;
        -webkit-overflow-scrolling: touch !important;
      }
      
      /* DASHBOARD CONTAINER */
      .admin-dashboard {
        width: 100vw !important;
        max-width: 100vw !important;
        overflow-x: hidden !important;
        margin: 0 !important;
        padding: 0 !important;
        scroll-behavior: smooth !important;
        -webkit-overflow-scrolling: touch !important;
      }
      
      /* MAIN CONTENT */
      .dashboard-main {
        width: 100vw !important;
        max-width: 100vw !important;
        overflow-x: hidden !important;
        overflow-y: auto !important;
        padding: 0 !important;
        margin: 0 !important;
        scroll-behavior: smooth !important;
        -webkit-overflow-scrolling: touch !important;
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
      }

      /* Ocultar scrollbar en webkit browsers */
      .dashboard-main::-webkit-scrollbar {
        display: none !important;
      }
      
      /* PAGE CONTAINER */
      .page-container-full {
        width: 100vw !important;
        max-width: 100vw !important;
        overflow-x: hidden !important;
        margin: 0 !important;
        padding: 0 !important;
        scroll-behavior: smooth !important;
        -webkit-overflow-scrolling: touch !important;
      }
      
      /* FEED PAGE ESPECÍFICO - COPIADO EXACTO DE ESCORTDASHBOARD */
      .feed-page {
        width: 100vw !important;
        max-width: 100vw !important;
        min-height: 100vh !important;
        overflow-x: hidden !important;
        margin: 0 !important;
        padding: 0 !important;
        padding-top: 80px !important;
        box-sizing: border-box !important;
      }
      
      /* ASEGURAR QUE EL PADDING-TOP SE APLIQUE EN TODAS LAS CARGAS */
      body.in-dashboard .feed-page {
        padding-top: 80px !important;
      }
      
      /* FEED CONTENT */
      .feed-content {
        width: 100vw !important;
        max-width: 100vw !important;
        margin: 0 !important;
        padding: 1rem !important;
        box-sizing: border-box !important;
        overflow-x: hidden !important;
      }
      
      /* CONTENEDOR PRINCIPAL CENTRADO */
      .feed-overview-container {
        width: 100% !important;
        max-width: 1200px !important;
        margin: 0 auto !important;
        padding: 0 1rem !important;
        box-sizing: border-box !important;
      }
      
      /* POSTS CONTAINER */
      .feed-main-content {
        max-width: 600px !important;
        margin: 0 auto !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }
      
      .feed-posts-container {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        gap: 2rem !important;
        width: 100% !important;
        margin-bottom: 100px !important;
      }
      
      /* SIDEBAR - SOLO DESKTOP */
      .feed-sidebar-container {
        display: none !important;
      }
      
      @media (min-width: 1024px) {
        .feed-sidebar-container {
          display: block !important;
          position: fixed !important;
          right: 20px !important;
          top: 50% !important;
          transform: translateY(-50%) !important;
          width: 300px !important;
          max-height: 80vh !important;
          overflow-y: auto !important;
          z-index: 100 !important;
        }
        
        .feed-overview-container {
          max-width: calc(100vw - 350px) !important;
          margin: 0 auto !important;
        }
      }
      
      /* RESPONSIVE FEED */
      @media (max-width: 768px) {
        .feed-page {
          padding-top: 70px !important;
        }
        
        body.in-dashboard .feed-page {
          padding-top: 70px !important;
        }
        
        .feed-content {
          padding: 0.5rem !important;
        }
        
        .feed-posts-container {
          gap: 1.5rem !important;
          margin-bottom: 90px !important;
        }
      }
      
      @media (max-width: 480px) {
        .feed-page {
          padding-top: 60px !important;
        }
        
        body.in-dashboard .feed-page {
          padding-top: 60px !important;
        }
        
        .feed-content {
          padding: 0.25rem !important;
        }
        
        .feed-posts-container {
          margin-bottom: 80px !important;
        }
      }
      
      /* OTROS COMPONENTES */
      .chat-page, 
      .admin-moderation-page,
      .admin-profile,
      .admin-analytics,
      .admin-agency-approval {
        width: 100vw !important;
        max-width: 100vw !important;
        box-sizing: border-box !important;
        overflow-x: hidden !important;
        padding: 1rem !important;
        padding-top: 80px !important;
        min-height: 100vh !important;
      }
      
      /* IMPORTANTE: ASEGURAR QUE EL HEADER NO INTERFIERA */
      .header {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        z-index: 999 !important;
        height: 60px !important;
      }
      
      /* FORZAR RECALCULO DEL PADDING EN COMPONENTES DESPUÉS DEL HEADER */
      .feed-page,
      .chat-page,
      .admin-moderation-page,
      .admin-profile,
      .admin-analytics,
      .admin-agency-approval {
        margin-top: 0 !important;
        transform: translateY(0) !important;
      }
    `;
    
    const existingStyle = document.getElementById('admin-dashboard-optimized-styles');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    document.head.appendChild(style);
  };

  // ✅ EFECTO MEJORADO - COPIADO EXACTAMENTE DE ESCORTDASHBOARD
  useEffect(() => {
    // Aplicar clase al body INMEDIATAMENTE
    document.body.classList.add('in-dashboard');
    document.body.style.overflowX = 'hidden';
    document.body.style.width = '100%';
    document.body.style.maxWidth = '100vw';
    document.body.style.boxSizing = 'border-box';
    document.body.style.scrollBehavior = 'smooth';
    document.body.style.webkitOverflowScrolling = 'touch';
    
    document.documentElement.style.overflowX = 'hidden';
    document.documentElement.style.width = '100%';
    document.documentElement.style.maxWidth = '100vw';
    document.documentElement.style.boxSizing = 'border-box';
    document.documentElement.style.scrollBehavior = 'smooth';
    document.documentElement.style.webkitOverflowScrolling = 'touch';
    
    // Configurar header INMEDIATAMENTE - CON COLORES DE ADMIN (ROJO)
    const header = document.querySelector('.header');
    if (header) {
      header.classList.remove('hidden');
      header.classList.add('visible-scrolled');
      header.style.transform = 'translateY(0)';
      header.style.position = 'fixed';
      header.style.top = '0';
      header.style.zIndex = '999';
      header.style.background = 'rgba(220, 38, 38, 0.95)'; // Rojo para admin
      header.style.backdropFilter = 'blur(20px)';
      header.style.borderBottom = '1px solid rgba(220, 38, 38, 0.3)';
      header.style.height = '60px';
    }

    // Aplicar estilos optimizados INMEDIATAMENTE
    setupOptimizedStyles();

    // FORZAR RECALCULO DE LAYOUT DESPUÉS DE UN FRAME
    requestAnimationFrame(() => {
      const feedPage = document.querySelector('.feed-page');
      if (feedPage) {
        feedPage.style.paddingTop = '80px';
        feedPage.style.marginTop = '0';
        feedPage.style.transform = 'translateY(0)';
      }
      
      // Forzar reflow para asegurar aplicación de estilos
      document.body.offsetHeight;
    });

    return () => {
      document.body.classList.remove('in-dashboard');
      
      if (header) {
        header.classList.remove('visible-scrolled');
        header.style.transform = '';
        header.style.position = '';
        header.style.top = '';
        header.style.zIndex = '';
        header.style.background = '';
        header.style.backdropFilter = '';
        header.style.borderBottom = '';
        header.style.height = '';
      }
      
      document.body.style.overflowX = '';
      document.body.style.width = '';
      document.body.style.maxWidth = '';
      document.body.style.scrollBehavior = '';
      document.body.style.webkitOverflowScrolling = '';
      document.documentElement.style.overflowX = '';
      document.documentElement.style.width = '';
      document.documentElement.style.maxWidth = '';
      document.documentElement.style.scrollBehavior = '';
      document.documentElement.style.webkitOverflowScrolling = '';

      const style = document.getElementById('admin-dashboard-optimized-styles');
      if (style) {
        style.remove();
      }
    };
  }, []);

  // Efecto adicional para FORZAR padding correcto al cambiar de vista
  useEffect(() => {
    if (activeView === 'feed') {
      setTimeout(() => {
        const feedPage = document.querySelector('.feed-page');
        if (feedPage) {
          feedPage.style.paddingTop = '80px';
          feedPage.style.marginTop = '0';
          feedPage.style.transform = 'translateY(0)';
        }
      }, 0);
    }
  }, [activeView]);

  // ✅ MEMORIZAR COMPONENTE ACTIVO
  const ActiveComponent = React.useMemo(() => {
    const activeItem = mainNavigation.find(item => item.id === activeView);
    if (activeItem && activeItem.component) {
      const Component = activeItem.component;
      return <Component />;
    }
    return <FeedPage userType="admin" />;
  }, [activeView]);

  // ✅ FUNCIÓN PARA FORZAR VISIBILIDAD DE NAVBAR
  const forceNavbarVisibility = () => {
    const navbar = document.querySelector('.enhanced-bottom-nav');
    if (navbar) {
      navbar.style.visibility = navVisible ? 'visible' : 'hidden';
      navbar.style.display = 'flex';
      navbar.style.opacity = navVisible ? '1' : '0';
      navbar.style.transform = navVisible 
        ? 'translateX(-50%) translateY(0px)' 
        : 'translateX(-50%) translateY(100px)';
      // ✅ ARREGLO CRÍTICO: Deshabilitar pointer-events cuando está oculta
      navbar.style.pointerEvents = navVisible ? 'auto' : 'none';
    }
  };

  // Effect para manejar visibilidad
  useEffect(() => {
    const handleResize = () => {
      forceNavbarVisibility();
    };
    
    const handleOrientationChange = () => {
      setTimeout(() => {
        forceNavbarVisibility();
      }, 100);
    };
    
    // Listeners
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // Forzar visibilidad inicial
    setTimeout(forceNavbarVisibility, 50);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [navVisible]);

  // Reset scroll al cambiar de vista con smooth scroll
  useEffect(() => {
    const mainContent = document.querySelector('.dashboard-main');
    if (mainContent) {
      requestAnimationFrame(() => {
        mainContent.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      });
    }
    
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    
    // Asegurar navbar visible después del cambio de vista
    setTimeout(forceNavbarVisibility, 100);
  }, [activeView]);

  return (
    <div 
      className="admin-dashboard"
      style={{
        width: '100vw',
        maxWidth: '100vw',
        overflowX: 'hidden',
        boxSizing: 'border-box',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        margin: 0,
        padding: 0
      }}
    >
      {/* Header Global */}
      <Header 
        onOpenAuthModal={handleOpenAuthModal}
        hideLogoInDashboard={false}
        showHamburgerInDashboard={false}
        dashboardMode={true}
        userType="admin"
      />

      {/* Main Content */}
      <main 
        className="dashboard-main"
        style={{
          width: '100vw',
          maxWidth: '100vw',
          overflowX: 'hidden',
          overflowY: 'auto',
          boxSizing: 'border-box',
          flex: 1,
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
          margin: 0,
          padding: 0,
          // Optimizaciones adicionales para smooth scroll
          transform: 'translateZ(0)',
          willChange: 'scroll-position',
          backfaceVisibility: 'hidden',
          perspective: 1000
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="page-container-full"
            style={{
              width: '100vw',
              maxWidth: '100vw',
              overflowX: 'hidden',
              boxSizing: 'border-box',
              minHeight: '100vh',
              margin: 0,
              padding: 0
            }}
          >
            {ActiveComponent}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ✅ ENHANCED BOTTOM NAVIGATION BAR - IGUAL QUE ESCORTDASHBOARD */}
      <motion.nav
        className="enhanced-bottom-nav mobile-forced"
        initial={{ y: 100 }}
        animate={{ 
          y: navVisible ? 0 : 100,
          opacity: navVisible ? 1 : 0
        }}
        transition={{ 
          duration: 0.4, 
          ease: [0.25, 0.46, 0.45, 0.94]
        }}
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: navVisible 
            ? 'translateX(-50%) translateY(0px)' 
            : 'translateX(-50%) translateY(100px)',
          width: 'fit-content',
          maxWidth: 'calc(100vw - 40px)',
          height: '52px',
          background: 'linear-gradient(145deg, rgba(10, 10, 10, 0.98) 0%, rgba(20, 20, 20, 0.98) 100%)',
          backdropFilter: 'blur(30px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 20px',
          zIndex: 10000,
          boxSizing: 'border-box',
          boxShadow: `
            0 8px 32px rgba(0, 0, 0, 0.5),
            0 4px 16px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.05)
          `,
          visibility: navVisible ? 'visible' : 'hidden',
          opacity: navVisible ? '1' : '0',
          // ✅ ARREGLO CRÍTICO: Deshabilitar pointer-events cuando está oculta
          pointerEvents: navVisible ? 'auto' : 'none',
          willChange: 'transform, opacity',
          transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        }}
      >
        {/* Navigation Indicator Background - AHORA INCLUYE EL BOTÓN EXTRA */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          position: 'relative'
        }}>
          <motion.div
            className="nav-indicator-bg"
            layoutId="navIndicator"
            style={{
              position: 'absolute',
              top: '4px',
              height: '44px',
              width: '60px',
              background: `linear-gradient(135deg, ${
                mainNavigation.find(item => item.id === activeView)?.gradient || 'from-red-500 to-red-700'
              })`,
              borderRadius: '12px',
              opacity: 0.15,
              transform: `translateX(${mainNavigation.findIndex(item => item.id === activeView) * (60 + 12)}px)`,
              transition: 'all 0.5s cubic-bezier(0.23, 1, 0.320, 1)',
              boxShadow: '0 6px 24px rgba(220, 38, 38, 0.3)'
            }}
          />

          {/* NAVEGACIÓN PRINCIPAL */}
          {mainNavigation.map((item, index) => {
            const isActive = activeView === item.id;
            
            return (
              <motion.button
                key={item.id}
                className={`enhanced-nav-tab ${isActive ? 'active' : ''}`}
                onClick={() => {
                  console.log(`Admin navegando a: ${item.label}`);
                  setActiveView(item.id);
                }}
                whileHover={{ 
                  scale: 1.03
                }}
                whileTap={{ 
                  scale: 0.95
                }}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  delay: index * 0.1,
                  type: "spring",
                  stiffness: 300,
                  damping: 30
                }}
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '2px',
                  padding: '6px 4px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  width: '60px',
                  height: '44px',
                  zIndex: 2,
                  overflow: 'visible',
                  // ✅ ARREGLO: Asegurar que los botones individuales respeten el pointer-events del contenedor
                  pointerEvents: navVisible ? 'auto' : 'none'
                }}
              >
                <motion.div 
                  className="icon-container"
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    background: isActive 
                      ? `linear-gradient(135deg, ${item.gradient})` 
                      : 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(10px)',
                    border: isActive 
                      ? '1px solid rgba(255, 255, 255, 0.2)' 
                      : '1px solid rgba(255, 255, 255, 0.05)',
                    boxShadow: isActive 
                      ? '0 6px 20px rgba(220, 38, 38, 0.4)'
                      : '0 3px 12px rgba(0, 0, 0, 0.2)',
                    transition: 'all 0.3s ease'
                  }}
                  animate={{
                    rotate: isActive ? [0, 3, -3, 0] : 0,
                    scale: isActive ? 1.05 : 1
                  }}
                  transition={{ duration: 0.6 }}
                >
                  <item.icon 
                    size={14}
                    style={{
                      strokeWidth: isActive ? 2.5 : 2,
                      filter: isActive 
                        ? 'drop-shadow(0 2px 6px rgba(255, 255, 255, 0.3))' 
                        : 'none',
                      transition: 'all 0.3s ease'
                    }} 
                  />
                </motion.div>

                <motion.span
                  style={{
                    fontSize: '10px',
                    fontWeight: isActive ? '600' : '500',
                    textAlign: 'center',
                    lineHeight: '1',
                    overflow: 'visible',
                    textOverflow: 'clip',
                    whiteSpace: 'nowrap',
                    width: '100%',
                    opacity: isActive ? 1 : 0.8,
                    textShadow: isActive ? '0 1px 3px rgba(0, 0, 0, 0.5)' : 'none',
                    transition: 'all 0.3s ease'
                  }}
                  animate={{
                    y: isActive ? 0 : 1,
                    opacity: isActive ? 1 : 0.7
                  }}
                  transition={{ duration: 0.3 }}
                >
                  {item.label}
                </motion.span>

                <motion.div
                  className="ripple-effect"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '12px',
                    background: 'radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)',
                    opacity: 0,
                    pointerEvents: 'none'
                  }}
                  animate={isActive ? {
                    opacity: [0, 0.3, 0],
                    scale: [0.8, 1.2, 1]
                  } : {}}
                  transition={{ duration: 0.6 }}
                />
              </motion.button>
            );
          })}

          {/* ✅ BOTÓN DE OCULTAR INTEGRADO - TAMBIÉN ARREGLADO */}
          <motion.button
            className="enhanced-nav-tab hide-nav-tab"
            onClick={() => setNavVisible(!navVisible)}
            whileHover={{ 
              scale: 1.03
            }}
            whileTap={{ 
              scale: 0.95
            }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              delay: mainNavigation.length * 0.1,
              type: "spring",
              stiffness: 300,
              damping: 30
            }}
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              padding: '6px 4px',
              background: 'transparent',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              color: 'rgba(255, 255, 255, 0.6)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              width: '60px',
              height: '44px',
              zIndex: 2,
              overflow: 'visible',
              // ✅ ARREGLO: Asegurar que el botón de ocultar también respete el pointer-events
              pointerEvents: navVisible ? 'auto' : 'none'
            }}
          >
            <motion.div 
              className="icon-container"
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                boxShadow: '0 3px 12px rgba(0, 0, 0, 0.2)',
                transition: 'all 0.3s ease'
              }}
              whileHover={{
                background: 'rgba(156, 163, 175, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 6px 20px rgba(156, 163, 175, 0.2)'
              }}
            >
              <MoreHorizontal 
                size={14}
                style={{
                  strokeWidth: 2,
                  transition: 'all 0.3s ease'
                }} 
              />
            </motion.div>

            <motion.span
              style={{
                fontSize: '10px',
                fontWeight: '500',
                textAlign: 'center',
                lineHeight: '1',
                overflow: 'visible',
                textOverflow: 'clip',
                whiteSpace: 'nowrap',
                width: '100%',
                opacity: 0.8,
                transition: 'all 0.3s ease'
              }}
            >
              Ocultar
            </motion.span>
          </motion.button>
        </div>
      </motion.nav>

      {/* ✅ BOTÓN FLOTANTE CUANDO LA BARRA ESTÁ OCULTA */}
      <motion.button
        className="nav-toggle-btn-floating-dock"
        onClick={() => setNavVisible(true)}
        animate={{
          opacity: navVisible ? 0 : 1,
          scale: navVisible ? 0 : 1,
          y: navVisible ? 20 : 0
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '48px',
          height: '48px',
          borderRadius: '24px',
          background: 'linear-gradient(135deg, rgba(10, 10, 10, 0.95) 0%, rgba(20, 20, 20, 0.95) 100%)',
          border: '2px solid rgba(255, 255, 255, 0.15)',
          color: 'rgba(255, 255, 255, 0.9)',
          cursor: 'pointer',
          zIndex: 10001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          pointerEvents: navVisible ? 'none' : 'auto',
          visibility: navVisible ? 'hidden' : 'visible'
        }}
      >
        <motion.div
          animate={{ 
            y: [0, -2, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <MoreHorizontal 
            size={18} 
            strokeWidth={2.5}
            style={{
              filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))'
            }}
          />
        </motion.div>
        
        {/* Dock indicator dots */}
        <div
          style={{
            position: 'absolute',
            bottom: '6px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '3px'
          }}
        >
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              style={{
                width: '3px',
                height: '3px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.6)',
                animation: `dotPulse 1.5s ease-in-out infinite ${i * 0.2}s`
              }}
            />
          ))}
        </div>
        
        {/* Texto de ayuda mejorado */}
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            right: '0',
            marginBottom: '8px',
            padding: '6px 10px',
            background: 'rgba(0, 0, 0, 0.9)',
            color: 'white',
            fontSize: '11px',
            borderRadius: '6px',
            whiteSpace: 'nowrap',
            opacity: 0.95,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            animation: 'tooltipFloat 3s ease-in-out infinite'
          }}
        >
          Navegación
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: '12px',
              width: 0,
              height: 0,
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderTop: '4px solid rgba(0, 0, 0, 0.9)'
            }}
          />
        </div>
      </motion.button>

      {/* ✅ ENHANCED CSS STYLES - ACTUALIZADO CON ARREGLOS DE POINTER-EVENTS */}
      <style jsx>{`
        .enhanced-bottom-nav {
          --nav-height: 52px;
        }

        /* FORZADO ESPECÍFICO PARA TODOS LOS DISPOSITIVOS */
        .enhanced-bottom-nav.mobile-forced {
          position: fixed !important;
          bottom: 20px !important;
          left: 50% !important;
          z-index: 10000 !important;
          display: flex !important;
        }

        /* ✅ ARREGLO CRÍTICO: Estados de visibilidad con pointer-events */
        .enhanced-bottom-nav.mobile-forced[style*="opacity: 1"] {
          visibility: visible !important;
          pointer-events: auto !important;
        }

        .enhanced-bottom-nav.mobile-forced[style*="opacity: 0"] {
          visibility: hidden !important;
          pointer-events: none !important;
        }

        /* ✅ ASEGURAR QUE TODOS LOS ELEMENTOS HIJOS RESPETEN EL POINTER-EVENTS */
        .enhanced-bottom-nav.mobile-forced[style*="pointer-events: none"] * {
          pointer-events: none !important;
        }

        .enhanced-bottom-nav.mobile-forced[style*="pointer-events: auto"] .enhanced-nav-tab,
        .enhanced-bottom-nav.mobile-forced[style*="pointer-events: auto"] .hide-nav-tab {
          pointer-events: auto !important;
        }

        /* DESKTOP - Ajuste de ancho para incluir el botón extra */
        @media (min-width: 1024px) {
          .enhanced-bottom-nav.mobile-forced {
            height: 52px !important;
            padding: 0 20px !important;
            border-radius: 16px !important;
            transform: translateX(-50%) !important;
            width: fit-content !important;
          }
          
          .enhanced-bottom-nav > div {
            gap: 12px !important;
          }
          
          .enhanced-nav-tab {
            width: 60px !important;
            height: 44px !important;
            padding: 6px 4px !important;
          }
          
          .enhanced-nav-tab .icon-container {
            width: 28px !important;
            height: 28px !important;
          }
          
          .enhanced-nav-tab .icon-container svg {
            width: 14px !important;
            height: 14px !important;
          }
          
          .enhanced-nav-tab span {
            font-size: 10px !important;
          }

          .nav-indicator-bg {
            width: 60px !important;
            height: 44px !important;
            top: 4px !important;
            transform: translateX(calc(var(--active-index) * 72px)) !important;
          }
        }

        /* TABLET Y MÓVIL */
        @media (max-width: 1023px) {
          .enhanced-bottom-nav.mobile-forced {
            transform: translateX(-50%) !important;
            transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) !important;
          }
          
          body {
            padding-bottom: 90px !important;
          }
        }

        @media (max-width: 768px) {
          .enhanced-bottom-nav.mobile-forced {
            bottom: 12px !important;
            height: 50px !important;
            padding: 0 12px !important;
            border-radius: 15px !important;
            max-width: calc(100vw - 24px) !important;
          }
          
          .enhanced-bottom-nav > div {
            gap: 8px !important;
          }
          
          .enhanced-nav-tab {
            width: 45px !important;
            height: 38px !important;
            padding: 3px 2px !important;
          }
          
          .enhanced-nav-tab .icon-container {
            width: 22px !important;
            height: 22px !important;
          }
          
          .enhanced-nav-tab .icon-container svg {
            width: 12px !important;
            height: 12px !important;
          }
          
          .enhanced-nav-tab span {
            font-size: 9px !important;
            line-height: 1 !important;
          }

          .nav-indicator-bg {
            width: 45px !important;
            height: 36px !important;
            top: 7px !important;
            transform: translateX(calc(var(--active-index) * 53px)) !important;
          }
          
          .nav-toggle-btn-floating-dock {
            width: 40px !important;
            height: 40px !important;
            bottom: 12px !important;
            right: 12px !important;
          }
          
          body {
            padding-bottom: 80px !important;
          }
        }

        @media (max-width: 480px) {
          .enhanced-bottom-nav.mobile-forced {
            bottom: 10px !important;
            height: 45px !important;
            padding: 0 10px !important;
            border-radius: 12px !important;
            max-width: calc(100vw - 20px) !important;
          }
          
          .enhanced-bottom-nav > div {
            gap: 6px !important;
          }
          
          .enhanced-nav-tab {
            width: 40px !important;
            height: 33px !important;
            padding: 2px 1px !important;
          }
          
          .enhanced-nav-tab .icon-container {
            width: 20px !important;
            height: 20px !important;
          }
          
          .enhanced-nav-tab .icon-container svg {
            width: 11px !important;
            height: 11px !important;
          }
          
          .enhanced-nav-tab span {
            font-size: 8px !important;
            line-height: 1 !important;
          }

          .nav-indicator-bg {
            width: 40px !important;
            height: 31px !important;
            top: 7px !important;
            transform: translateX(calc(var(--active-index) * 46px)) !important;
          }

          .nav-toggle-btn-floating-dock {
            width: 36px !important;
            height: 36px !important;
            bottom: 10px !important;
            right: 10px !important;
          }
          
          body {
            padding-bottom: 75px !important;
          }
        }

        .enhanced-nav-tab {
          transform-origin: center bottom;
        }

        .enhanced-nav-tab:hover .icon-container {
          transform: translateY(-1px) scale(1.03);
          box-shadow: 0 8px 20px rgba(220, 38, 38, 0.5);
        }

        .enhanced-nav-tab.active .icon-container {
          animation: iconBounce 0.6s ease-out;
        }

        /* Estilos específicos para el botón de ocultar */
        .hide-nav-tab:hover .icon-container {
          transform: translateY(-1px) scale(1.03);
          box-shadow: 0 8px 20px rgba(156, 163, 175, 0.4) !important;
          background: rgba(156, 163, 175, 0.15) !important;
        }

        @keyframes iconBounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0) scale(1.05); }
          40% { transform: translateY(-3px) scale(1.1); }
          60% { transform: translateY(-1px) scale(1.07); }
        }

        .nav-toggle-btn-floating-dock {
          font-family: system-ui, -apple-system, sans-serif;
          user-select: none;
          -webkit-user-select: none;
          -webkit-tap-highlight-color: transparent;
          outline: none;
          will-change: transform, box-shadow;
        }

        .nav-toggle-btn-floating-dock:hover {
          transform: scale(1.05) !important;
          box-shadow: 0 12px 40px rgba(10, 10, 10, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        @keyframes dotPulse {
          0%, 100% { 
            opacity: 0.6;
            transform: scale(1);
          }
          50% { 
            opacity: 1;
            transform: scale(1.2);
          }
        }

        @keyframes tooltipFloat {
          0%, 100% { 
            opacity: 0.95;
            transform: translateY(0);
          }
          50% { 
            opacity: 0.8;
            transform: translateY(-2px);
          }
        }

        .nav-indicator-bg {
          --active-index: ${mainNavigation.findIndex(item => item.id === activeView)};
        }
        
        /* Optimizaciones de rendimiento para animaciones en dispositivos móviles */
        @media (max-width: 768px) {
          .enhanced-nav-tab,
          .nav-toggle-btn-floating-dock {
            will-change: transform;
            transform: translateZ(0);
          }
          
          .enhanced-nav-tab:hover .icon-container {
            transform: translateY(0) scale(1.02);
            box-shadow: 0 4px 16px rgba(220, 38, 38, 0.4);
          }
          
          .hide-nav-tab:hover .icon-container {
            transform: translateY(0) scale(1.02);
            box-shadow: 0 4px 16px rgba(156, 163, 175, 0.3) !important;
          }
        }
      `}
      </style>
    </div>
  );
};

export default AdminDashboard;