import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Flame, 
  MessageCircle, 
  Coins,
  User, 
  Bell,
  Sparkles,
  LogOut
} from 'lucide-react';

// Importar componentes COMPARTIDOS de las páginas
import FeedPage from '../shared/feed/FeedPage';
import ChatPage from '../shared/chat/ChatPage';
import ClientPointsPage from './ClientPointsPage';
import ClientProfile from './ClientProfile';
import Header from '../global/Header';
import './ClientDashboard.css';

const ClientDashboard = () => {
  const [activeView, setActiveView] = useState('feed');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [navVisible, setNavVisible] = useState(true);

  // Mock función para abrir auth modal
  const handleOpenAuthModal = (type) => {
    console.log('Auth modal requested:', type);
    setShowAuthModal(true);
  };

  // Mock user data
  const user = {
    id: 1,
    name: 'Carlos Mendez',
    email: 'carlos@example.com',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
    teloPoints: 1250,
    isPremium: false,
    level: 'Gold'
  };

  // Navegación principal - CON PARA TI EN EL CENTRO
  const mainNavigation = [
    {
      id: 'chat',
      label: 'Mensajes',
      icon: MessageCircle,
      component: () => <ChatPage userType="client" />,
      description: 'Tus conversaciones',
      color: '#10B981' // Verde
    },
    {
      id: 'points',
      label: 'Tienda',
      icon: Coins,
      component: ClientPointsPage,
      description: 'Gestiona tus puntos',
      color: '#3B82F6' // Azul
    },
    {
      id: 'feed',
      label: 'Para Ti',
      icon: Flame,
      component: () => <FeedPage userType="client" />,
      description: 'Contenido personalizado',
      color: '#F59E0B' // Amarillo/Naranja - EN EL CENTRO
    },
    {
      id: 'profile',
      label: 'Perfil',
      icon: User,
      component: ClientProfile,
      description: 'Configuración personal',
      color: '#8B5CF6' // Púrpura
    }
  ];

  // ✅ FUNCIÓN EXACTA DE ESCORTDASHBOARD - CON CONFIGURACIÓN COMPLETA DE FEED
  const setupOptimizedStyles = () => {
    const style = document.createElement('style');
    style.id = 'client-dashboard-optimized-styles';
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
      .client-dashboard {
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
      .client-points-page,
      .client-profile {
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
      .client-points-page,
      .client-profile {
        margin-top: 0 !important;
        transform: translateY(0) !important;
      }
    `;
    
    const existingStyle = document.getElementById('client-dashboard-optimized-styles');
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
    
    // Configurar header INMEDIATAMENTE - CON COLORES DE CLIENT (ROJO)
    const header = document.querySelector('.header');
    if (header) {
      header.classList.remove('hidden');
      header.classList.add('visible-scrolled');
      header.style.transform = 'translateY(0)';
      header.style.position = 'fixed';
      header.style.top = '0';
      header.style.zIndex = '999';
      header.style.background = 'rgba(220, 38, 38, 0.95)'; // Rojo para clientes
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

      const style = document.getElementById('client-dashboard-optimized-styles');
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
    return <FeedPage userType="client" />;
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
      className="client-dashboard"
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
        userType="client"
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

      {/* ✅ ENHANCED BOTTOM NAVIGATION BAR - 4 BOTONES, SIN OCULTAR */}
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
          pointerEvents: navVisible ? 'auto' : 'none',
          willChange: 'transform, opacity',
          transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        }}
      >
        {/* Navigation Indicator Background */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          position: 'relative'
        }}>
          {/* Eliminado el nav-indicator-bg que causaba la sombra de color */}

          {/* NAVEGACIÓN PRINCIPAL - 4 BOTONES */}
          {mainNavigation.map((item, index) => {
            const isActive = activeView === item.id;
            
            return (
              <motion.button
                key={item.id}
                className={`enhanced-nav-tab ${isActive ? 'active' : ''}`}
                onClick={() => {
                  console.log(`Cliente navegando a: ${item.label}`);
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
                  color: 'rgba(255, 255, 255, 0.9)', // Color base más claro
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  width: '60px',
                  height: '44px',
                  zIndex: 2,
                  overflow: 'visible',
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
                      ? `${item.color}15` // 15 para fondo sutil
                      : 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(10px)',
                    border: isActive 
                      ? `1px solid ${item.color}40` 
                      : '1px solid rgba(255, 255, 255, 0.05)',
                    boxShadow: isActive 
                      ? `0 6px 20px ${item.color}30`
                      : '0 3px 12px rgba(0, 0, 0, 0.2)',
                    transition: 'all 0.3s ease'
                  }}
                  animate={{
                    scale: isActive ? 1.05 : 1
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <item.icon 
                    size={14}
                    style={{
                      strokeWidth: isActive ? 2.5 : 2,
                      color: item.color, // Color siempre visible
                      opacity: isActive ? 1 : 0.8, // Solo cambia la opacidad
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
                    opacity: isActive ? 1 : 0.9,
                    color: 'rgba(255, 255, 255, 0.9)', // Color base consistente
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
              </motion.button>
            );
          })}

          {/* BOTÓN DE CERRAR SESIÓN */}
          <motion.button
            key="logout"
            className="enhanced-nav-tab logout-tab"
            onClick={() => {
              console.log('Cerrando sesión...');
              // Aquí iría la lógica de logout
              if (window.confirm('¿Estás seguro de que quieres cerrar sesión?')) {
                // logout();
                console.log('Sesión cerrada');
              }
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
              color: 'rgba(255, 255, 255, 0.9)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              width: '60px',
              height: '44px',
              zIndex: 2,
              overflow: 'visible',
              pointerEvents: navVisible ? 'auto' : 'none',
              marginLeft: '8px', // Separar un poco del resto
              borderLeft: '1px solid rgba(255, 255, 255, 0.1)' // Línea separadora sutil
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
                background: 'rgba(239, 68, 68, 0.1)', // Fondo rojo muy sutil
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                boxShadow: '0 3px 12px rgba(0, 0, 0, 0.2)',
                transition: 'all 0.3s ease'
              }}
              whileHover={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                boxShadow: '0 6px 20px rgba(239, 68, 68, 0.2)'
              }}
            >
              <LogOut 
                size={14}
                style={{
                  strokeWidth: 2,
                  color: '#ef4444', // Rojo para logout
                  opacity: 0.9,
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
                opacity: 0.9,
                color: 'rgba(255, 255, 255, 0.7)', // Un poco más apagado
                transition: 'all 0.3s ease'
              }}
              animate={{
                y: 0,
                opacity: 0.8
              }}
              transition={{ duration: 0.3 }}
            >
              Salir
            </motion.span>
          </motion.button>
        </div>
      </motion.nav>

      {/* ✅ ENHANCED CSS STYLES - AJUSTADO PARA 4 BOTONES */}
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

        .enhanced-bottom-nav.mobile-forced[style*="opacity: 1"] {
          visibility: visible !important;
          pointer-events: auto !important;
        }

        .enhanced-bottom-nav.mobile-forced[style*="opacity: 0"] {
          visibility: hidden !important;
          pointer-events: none !important;
        }

        .enhanced-bottom-nav.mobile-forced[style*="pointer-events: none"] * {
          pointer-events: none !important;
        }

        .enhanced-bottom-nav.mobile-forced[style*="pointer-events: auto"] .enhanced-nav-tab {
          pointer-events: auto !important;
        }

        /* DESKTOP - Ajuste de ancho para 4 botones + logout */
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

          .logout-tab {
            padding-left: 12px !important;
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

          .logout-tab {
            margin-left: 6px !important;
            padding-left: 8px !important;
            border-left: 1px solid rgba(255, 255, 255, 0.1) !important;
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

          .logout-tab {
            margin-left: 4px !important;
            padding-left: 6px !important;
            border-left: 1px solid rgba(255, 255, 255, 0.1) !important;
          }
          
          body {
            padding-bottom: 75px !important;
          }
        }

        .enhanced-nav-tab {
          transform-origin: center bottom;
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
        }
      `}
      </style>
    </div>
  );
};

export default ClientDashboard;