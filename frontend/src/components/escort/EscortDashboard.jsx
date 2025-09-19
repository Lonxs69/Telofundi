import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Flame, 
  MessageCircle, 
  Building,
  User, 
  LogOut,
  Menu,
  X,
  Search,
  Bell,
  ChevronDown,
  Sparkles,
  Eye,
  EyeOff
} from 'lucide-react';

// Importar componentes COMPARTIDOS y específicos del escort
import FeedPage from '../shared/feed/FeedPage';
import ChatPage from '../shared/chat/ChatPage';
import EscortAgencyStatusPage from './EscortAgencyStatusPage';
import EscortProfile from './EscortProfile';
import Header from '../global/Header';
import './EscortDashboard.css';

const EscortDashboard = () => {
  const [activeView, setActiveView] = useState('feed');
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Mock función para abrir auth modal (para compatibilidad con Header)
  const handleOpenAuthModal = (type) => {
    console.log('Auth modal requested:', type);
    setShowAuthModal(true);
    // Aquí podrías implementar la lógica de autenticación si es necesario
  };

  // Mock función para cerrar sesión
  const handleLogout = () => {
    console.log('Cerrando sesión...');
    // Aquí implementarías la lógica de logout
    // Por ejemplo: limpiar tokens, redirigir, etc.
    if (window.confirm('¿Estás segura de que quieres cerrar sesión?')) {
      // Implementar logout logic
      console.log('Usuario desconectado');
    }
  };

  // Navegación principal adaptada para escorts con "Para Ti" centrado
  const mainNavigation = [
    {
      id: 'chat',
      label: 'Mensajes',
      icon: MessageCircle,
      component: () => <ChatPage userType="escort" />,
      description: 'Tus conversaciones',
      iconColor: 'text-emerald-400'
    },
    {
      id: 'agency',
      label: 'Agencia',
      icon: Building,
      component: EscortAgencyStatusPage,
      description: 'Estado de agencia',
      iconColor: 'text-blue-400'
    },
    {
      id: 'feed',
      label: 'Para Ti',
      icon: Flame,
      component: () => <FeedPage userType="escort" />,
      description: 'Contenido personalizado',
      iconColor: 'text-orange-400',
      isCenter: true
    },
    {
      id: 'profile',
      label: 'Mi Perfil',
      icon: User,
      component: EscortProfile,
      description: 'Configuración personal',
      iconColor: 'text-purple-400'
    },
    {
      id: 'logout',
      label: 'Cerrar Sesión',
      icon: LogOut,
      component: null,
      description: 'Salir de la app',
      iconColor: 'text-red-400',
      isAction: true,
      action: handleLogout
    }
  ];

  // ✅ FUNCIÓN EXACTA DE CLIENTDASHBOARD - CON CONFIGURACIÓN COMPLETA DE FEED
  const setupOptimizedStyles = () => {
    const style = document.createElement('style');
    style.id = 'escort-dashboard-optimized-styles';
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
        padding-bottom: 110px !important;
        scroll-behavior: smooth !important;
        -webkit-overflow-scrolling: touch !important;
      }
      
      /* DASHBOARD CONTAINER */
      .escort-dashboard {
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
      
      /* FEED PAGE ESPECÍFICO - COPIADO EXACTO DE CLIENTDASHBOARD */
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
        margin-bottom: 120px !important;
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
          margin-bottom: 110px !important;
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
          margin-bottom: 100px !important;
        }
      }
      
      /* OTROS COMPONENTES */
      .chat-page, 
      .escort-agency-status-page,
      .escort-profile {
        width: 100vw !important;
        max-width: 100vw !important;
        box-sizing: border-box !important;
        overflow-x: hidden !important;
        padding: 1rem !important;
        padding-top: 80px !important;
        min-height: 100vh !important;
        margin-bottom: 120px !important;
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
      .escort-agency-status-page,
      .escort-profile {
        margin-top: 0 !important;
        transform: translateY(0) !important;
      }
    `;
    
    const existingStyle = document.getElementById('escort-dashboard-optimized-styles');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    document.head.appendChild(style);
  };

  // ✅ EFECTO MEJORADO - COPIADO EXACTAMENTE DE CLIENTDASHBOARD
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
    
    // Configurar header INMEDIATAMENTE - CON COLORES DE ESCORT (ROSA)
    const header = document.querySelector('.header');
    if (header) {
      header.classList.remove('hidden');
      header.classList.add('visible-scrolled');
      header.style.transform = 'translateY(0)';
      header.style.position = 'fixed';
      header.style.top = '0';
      header.style.zIndex = '999';
      header.style.background = 'rgba(236, 72, 153, 0.95)'; // Rosa para escorts
      header.style.backdropFilter = 'blur(20px)';
      header.style.borderBottom = '1px solid rgba(236, 72, 153, 0.3)';
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

      const style = document.getElementById('escort-dashboard-optimized-styles');
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
    return <FeedPage userType="escort" />;
  }, [activeView]);

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
  }, [activeView]);

  // Manejar click en navegación
  const handleNavClick = (item) => {
    if (item.isAction && item.action) {
      item.action();
    } else {
      console.log(`Escort navegando a: ${item.label}`);
      setActiveView(item.id);
    }
  };

  return (
    <div 
      className="escort-dashboard"
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
        userType="escort"
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

      {/* ✅ ENHANCED BOTTOM NAVIGATION BAR - MEJORADA Y MÁS GRANDE */}
      <motion.nav
        className="enhanced-bottom-nav mobile-forced"
        initial={{ y: 100 }}
        animate={{ 
          y: 0,
          opacity: 1
        }}
        transition={{ 
          duration: 0.4, 
          ease: [0.25, 0.46, 0.45, 0.94]
        }}
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'fit-content',
          maxWidth: 'calc(100vw - 40px)',
          height: '70px', // Aumentado de 52px a 70px
          background: 'linear-gradient(145deg, rgba(10, 10, 10, 0.98) 0%, rgba(20, 20, 20, 0.98) 100%)',
          backdropFilter: 'blur(30px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px', // Aumentado de 16px a 20px
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 24px', // Aumentado de 20px a 24px
          zIndex: 10000,
          boxSizing: 'border-box',
          boxShadow: `
            0 8px 32px rgba(0, 0, 0, 0.5),
            0 4px 16px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.05)
          `,
          visibility: 'visible',
          opacity: '1',
          pointerEvents: 'auto',
          willChange: 'transform, opacity'
        }}
      >
        {/* Navigation Container */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px', // Aumentado de 12px a 16px
          position: 'relative'
        }}>
          {/* Navigation Indicator Background */}
          <motion.div
            className="nav-indicator-bg"
            layoutId="navIndicator"
            style={{
              position: 'absolute',
              top: '8px', // Ajustado para la nueva altura
              height: '54px', // Aumentado de 44px a 54px
              width: '72px', // Aumentado de 60px a 72px
              background: mainNavigation.find(item => item.id === activeView)?.id === 'feed' 
                ? 'linear-gradient(135deg, #f97316, #dc2626)' // Naranja-rojo para "Para Ti"
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
              borderRadius: '16px', // Aumentado de 12px a 16px
              opacity: 0.2,
              transform: `translateX(${mainNavigation.findIndex(item => item.id === activeView) * (72 + 16)}px)`,
              transition: 'all 0.5s cubic-bezier(0.23, 1, 0.320, 1)',
              boxShadow: activeView === 'feed' ? '0 6px 24px rgba(249, 115, 22, 0.3)' : 'none'
            }}
          />

          {/* NAVEGACIÓN PRINCIPAL */}
          {mainNavigation.map((item, index) => {
            const isActive = activeView === item.id;
            const isCenterItem = item.isCenter;
            
            return (
              <motion.button
                key={item.id}
                className={`enhanced-nav-tab ${isActive ? 'active' : ''} ${isCenterItem ? 'center-tab' : ''}`}
                onClick={() => handleNavClick(item)}
                whileHover={{ 
                  scale: isCenterItem ? 1.05 : 1.03
                }}
                whileTap={{ 
                  scale: isCenterItem ? 0.95 : 0.92
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
                  gap: '4px', // Aumentado de 2px a 4px
                  padding: isCenterItem ? '8px 6px' : '6px 4px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '14px', // Aumentado de 10px a 14px
                  cursor: 'pointer',
                  color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  width: isCenterItem ? '80px' : '72px', // Centro más grande
                  height: '54px', // Aumentado de 44px a 54px
                  zIndex: 2,
                  overflow: 'visible',
                  pointerEvents: 'auto'
                }}
              >
                <motion.div 
                  className="icon-container"
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: isCenterItem ? '36px' : '32px', // Centro más grande
                    height: isCenterItem ? '36px' : '32px', // Centro más grande
                    borderRadius: '10px', // Aumentado de 8px a 10px
                    background: isActive 
                      ? (isCenterItem 
                          ? 'linear-gradient(135deg, #f97316, #dc2626)' // Naranja-rojo para "Para Ti"
                          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.05))')
                      : 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(10px)',
                    border: isActive 
                      ? '1px solid rgba(255, 255, 255, 0.2)' 
                      : '1px solid rgba(255, 255, 255, 0.05)',
                    boxShadow: isActive 
                      ? (isCenterItem 
                          ? '0 8px 24px rgba(249, 115, 22, 0.5)'
                          : '0 6px 20px rgba(255, 255, 255, 0.2)')
                      : '0 3px 12px rgba(0, 0, 0, 0.2)',
                    transition: 'all 0.3s ease'
                  }}
                  animate={{
                    rotate: isActive ? [0, 3, -3, 0] : 0,
                    scale: isActive ? (isCenterItem ? 1.1 : 1.05) : 1
                  }}
                  transition={{ duration: 0.6 }}
                >
                  <item.icon 
                    size={isCenterItem ? 18 : 16} // Centro más grande
                    className={isActive ? 'text-white' : item.iconColor} // Color aplicado aquí
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
                    fontSize: isCenterItem ? '11px' : '10px', // Centro más grande
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
                    borderRadius: '14px',
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
        </div>
      </motion.nav>

      {/* ✅ ENHANCED CSS STYLES - ACTUALIZADO PARA NAVEGACIÓN MÁS GRANDE */}
      <style jsx>{`
        .enhanced-bottom-nav {
          --nav-height: 70px;
        }

        /* FORZADO ESPECÍFICO PARA TODOS LOS DISPOSITIVOS */
        .enhanced-bottom-nav.mobile-forced {
          position: fixed !important;
          bottom: 20px !important;
          left: 50% !important;
          z-index: 10000 !important;
          display: flex !important;
        }

        /* DESKTOP */
        @media (min-width: 1024px) {
          .enhanced-bottom-nav.mobile-forced {
            height: 70px !important;
            padding: 0 24px !important;
            border-radius: 20px !important;
            transform: translateX(-50%) !important;
            width: fit-content !important;
          }
          
          .enhanced-bottom-nav > div {
            gap: 16px !important;
          }
          
          .enhanced-nav-tab {
            width: 72px !important;
            height: 54px !important;
            padding: 6px 4px !important;
          }

          .enhanced-nav-tab.center-tab {
            width: 80px !important;
            padding: 8px 6px !important;
          }
          
          .enhanced-nav-tab .icon-container {
            width: 32px !important;
            height: 32px !important;
          }

          .enhanced-nav-tab.center-tab .icon-container {
            width: 36px !important;
            height: 36px !important;
          }
          
          .enhanced-nav-tab .icon-container svg {
            width: 16px !important;
            height: 16px !important;
          }

          .enhanced-nav-tab.center-tab .icon-container svg {
            width: 18px !important;
            height: 18px !important;
          }
          
          .enhanced-nav-tab span {
            font-size: 10px !important;
          }

          .enhanced-nav-tab.center-tab span {
            font-size: 11px !important;
          }

          .nav-indicator-bg {
            width: 72px !important;
            height: 54px !important;
            top: 8px !important;
            transform: translateX(calc(var(--active-index) * 88px)) !important;
          }
        }

        /* TABLET Y MÓVIL */
        @media (max-width: 1023px) {
          .enhanced-bottom-nav.mobile-forced {
            transform: translateX(-50%) !important;
            transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) !important;
          }
          
          body {
            padding-bottom: 110px !important;
          }
        }

        @media (max-width: 768px) {
          .enhanced-bottom-nav.mobile-forced {
            bottom: 15px !important;
            height: 65px !important;
            padding: 0 16px !important;
            border-radius: 18px !important;
            max-width: calc(100vw - 30px) !important;
          }
          
          .enhanced-bottom-nav > div {
            gap: 12px !important;
          }
          
          .enhanced-nav-tab {
            width: 58px !important;
            height: 48px !important;
            padding: 4px 2px !important;
          }

          .enhanced-nav-tab.center-tab {
            width: 68px !important;
            padding: 6px 4px !important;
          }
          
          .enhanced-nav-tab .icon-container {
            width: 28px !important;
            height: 28px !important;
          }

          .enhanced-nav-tab.center-tab .icon-container {
            width: 32px !important;
            height: 32px !important;
          }
          
          .enhanced-nav-tab .icon-container svg {
            width: 14px !important;
            height: 14px !important;
          }

          .enhanced-nav-tab.center-tab .icon-container svg {
            width: 16px !important;
            height: 16px !important;
          }
          
          .enhanced-nav-tab span {
            font-size: 9px !important;
            line-height: 1 !important;
          }

          .enhanced-nav-tab.center-tab span {
            font-size: 10px !important;
          }

          .nav-indicator-bg {
            width: 58px !important;
            height: 46px !important;
            top: 9px !important;
            transform: translateX(calc(var(--active-index) * 70px)) !important;
          }
          
          body {
            padding-bottom: 100px !important;
          }
        }

        @media (max-width: 480px) {
          .enhanced-bottom-nav.mobile-forced {
            bottom: 12px !important;
            height: 60px !important;
            padding: 0 12px !important;
            border-radius: 16px !important;
            max-width: calc(100vw - 24px) !important;
          }
          
          .enhanced-bottom-nav > div {
            gap: 10px !important;
          }
          
          .enhanced-nav-tab {
            width: 50px !important;
            height: 42px !important;
            padding: 3px 2px !important;
          }

          .enhanced-nav-tab.center-tab {
            width: 58px !important;
            padding: 4px 3px !important;
          }
          
          .enhanced-nav-tab .icon-container {
            width: 24px !important;
            height: 24px !important;
          }

          .enhanced-nav-tab.center-tab .icon-container {
            width: 28px !important;
            height: 28px !important;
          }
          
          .enhanced-nav-tab .icon-container svg {
            width: 12px !important;
            height: 12px !important;
          }

          .enhanced-nav-tab.center-tab .icon-container svg {
            width: 14px !important;
            height: 14px !important;
          }
          
          .enhanced-nav-tab span {
            font-size: 8px !important;
            line-height: 1 !important;
          }

          .enhanced-nav-tab.center-tab span {
            font-size: 9px !important;
          }

          .nav-indicator-bg {
            width: 50px !important;
            height: 40px !important;
            top: 9px !important;
            transform: translateX(calc(var(--active-index) * 60px)) !important;
          }
          
          body {
            padding-bottom: 90px !important;
          }
        }

        .enhanced-nav-tab {
          transform-origin: center bottom;
        }

        .enhanced-nav-tab:hover .icon-container {
          transform: translateY(-1px) scale(1.03);
        }

        .enhanced-nav-tab.active .icon-container {
          animation: iconBounce 0.6s ease-out;
        }

        .enhanced-nav-tab.center-tab:hover .icon-container {
          transform: translateY(-2px) scale(1.05);
        }

        @keyframes iconBounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0) scale(1.05); }
          40% { transform: translateY(-3px) scale(1.1); }
          60% { transform: translateY(-1px) scale(1.07); }
        }

        .nav-indicator-bg {
          --active-index: ${mainNavigation.findIndex(item => item.id === activeView)};
        }
        
        /* Optimizaciones de rendimiento para animaciones en dispositivos móviles */
        @media (max-width: 768px) {
          .enhanced-nav-tab {
            will-change: transform;
            transform: translateZ(0);
          }
          
          .enhanced-nav-tab:hover .icon-container {
            transform: translateY(0) scale(1.02);
          }

          .enhanced-nav-tab.center-tab:hover .icon-container {
            transform: translateY(-1px) scale(1.04);
          }
        }

        /* Colores personalizados para los iconos */
        .text-emerald-400 { color: #34d399; }
        .text-blue-400 { color: #60a5fa; }
        .text-orange-400 { color: #fb923c; }
        .text-purple-400 { color: #c084fc; }
        .text-red-400 { color: #f87171; }
      `}
      </style>
    </div>
  );
};

export default EscortDashboard;