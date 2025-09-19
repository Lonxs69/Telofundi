import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useInView, useAnimation } from 'framer-motion';
import logo from '../../assets/images/logo png mejora.png';
import './AboutPage.css';

// Hook personalizado para detectar tipo de dispositivo y orientación
const useDeviceDetection = () => {
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    orientation: 'landscape',
    screenWidth: typeof window !== 'undefined' ? window.innerWidth : 1200,
    screenHeight: typeof window !== 'undefined' ? window.innerHeight : 800,
    touchDevice: false
  });

  const updateDeviceInfo = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    setDeviceInfo({
      isMobile: width < 768,
      isTablet: width >= 768 && width < 1024,
      isDesktop: width >= 1024,
      orientation: width > height ? 'landscape' : 'portrait',
      screenWidth: width,
      screenHeight: height,
      touchDevice: isTouchDevice
    });
  }, []);

  useEffect(() => {
    updateDeviceInfo();
    
    const handleResize = () => updateDeviceInfo();
    const handleOrientationChange = () => {
      setTimeout(updateDeviceInfo, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [updateDeviceInfo]);

  return deviceInfo;
};

// Hook para optimizaciones de rendimiento en móviles
const usePerformanceOptimization = (deviceInfo) => {
  const [reducedMotion, setReducedMotion] = useState(false);
  
  useEffect(() => {
    const shouldReduceMotion = deviceInfo.isMobile && (
      navigator.hardwareConcurrency <= 4 || 
      navigator.deviceMemory <= 4 ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
    
    setReducedMotion(shouldReduceMotion);
  }, [deviceInfo]);

  return { reducedMotion };
};

// Variantes de animación adaptativas
const createAdaptiveVariants = (deviceInfo, reducedMotion) => {
  const baseDelay = deviceInfo.isMobile ? 0.1 : 0.2;
  const baseDuration = reducedMotion ? 0.3 : (deviceInfo.isMobile ? 0.5 : 0.8);
  
  return {
    containerVariants: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: deviceInfo.isMobile ? 0.05 : 0.1,
          delayChildren: baseDelay
        }
      }
    },

    itemVariants: {
      hidden: { 
        opacity: 0, 
        y: deviceInfo.isMobile ? 30 : 60,
        scale: reducedMotion ? 1 : 0.95
      },
      visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
          type: reducedMotion ? "tween" : "spring",
          stiffness: deviceInfo.isMobile ? 150 : 100,
          damping: deviceInfo.isMobile ? 20 : 15,
          duration: baseDuration
        }
      }
    },

    slideUpVariants: {
      hidden: { 
        opacity: 0, 
        y: deviceInfo.isMobile ? 50 : 100 
      },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          type: reducedMotion ? "tween" : "spring",
          stiffness: deviceInfo.isMobile ? 100 : 80,
          damping: deviceInfo.isMobile ? 25 : 20,
          duration: baseDuration
        }
      }
    },

    scaleInVariants: {
      hidden: { 
        opacity: 0, 
        scale: reducedMotion ? 1 : (deviceInfo.isMobile ? 0.9 : 0.8),
        rotate: reducedMotion ? 0 : (deviceInfo.isMobile ? -5 : -10)
      },
      visible: {
        opacity: 1,
        scale: 1,
        rotate: 0,
        transition: {
          type: reducedMotion ? "tween" : "spring",
          stiffness: deviceInfo.isMobile ? 150 : 120,
          damping: deviceInfo.isMobile ? 20 : 15,
          duration: baseDuration
        }
      }
    },

    floatingVariants: reducedMotion ? {} : {
      animate: {
        y: deviceInfo.isMobile ? [-5, 5, -5] : [-10, 10, -10],
        rotate: deviceInfo.isMobile ? [-1, 1, -1] : [-2, 2, -2],
        transition: {
          duration: deviceInfo.isMobile ? 4 : 6,
          repeat: Infinity,
          ease: "easeInOut"
        }
      }
    },

    cardHoverVariants: {
      hover: deviceInfo.touchDevice ? {} : {
        y: deviceInfo.isMobile ? -8 : -15,
        scale: deviceInfo.isMobile ? 1.01 : 1.02,
        boxShadow: deviceInfo.isMobile ? 
          "0 15px 30px rgba(210, 66, 26, 0.2)" : 
          "0 25px 50px rgba(210, 66, 26, 0.3)",
        transition: {
          type: "spring",
          stiffness: deviceInfo.isMobile ? 400 : 300,
          damping: deviceInfo.isMobile ? 25 : 20
        }
      }
    },

    buttonVariants: {
      hover: deviceInfo.touchDevice ? {} : {
        scale: deviceInfo.isMobile ? 1.02 : 1.05,
        y: deviceInfo.isMobile ? -1 : -2,
        transition: {
          type: "spring",
          stiffness: deviceInfo.isMobile ? 500 : 400,
          damping: deviceInfo.isMobile ? 15 : 10
        }
      },
      tap: {
        scale: deviceInfo.isMobile ? 0.99 : 0.98,
        y: 0
      }
    }
  };
};

// Componente de animación adaptativo
const AdaptiveAnimatedSection = ({ children, variants, delay = 0, className = "", deviceInfo, reducedMotion }) => {
  const controls = useAnimation();
  const ref = React.useRef(null);
  const inView = useInView(ref, { 
    once: true, 
    margin: deviceInfo.isMobile ? "-50px" : "-100px" 
  });

  useEffect(() => {
    if (inView) {
      controls.start("visible");
    }
  }, [controls, inView]);

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={controls}
      variants={variants}
      transition={{ delay: reducedMotion ? delay * 0.5 : delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const AboutPage = () => {
  const deviceInfo = useDeviceDetection();
  const { reducedMotion } = usePerformanceOptimization(deviceInfo);
  
  const [isVisible, setIsVisible] = useState({});
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [showScrollTop, setShowScrollTop] = useState(false);

  const adaptiveVariants = useMemo(() => 
    createAdaptiveVariants(deviceInfo, reducedMotion), 
    [deviceInfo, reducedMotion]
  );

  // Scroll animations adaptadas
  const { scrollY } = useScroll();
  const yTransform = useTransform(
    scrollY, 
    [0, 1000], 
    [0, deviceInfo.isMobile ? -100 : -200]
  );
  const opacityTransform = useTransform(
    scrollY, 
    [0, deviceInfo.isMobile ? 200 : 300], 
    [1, 0]
  );

  // Mouse tracking solo en desktop
  useEffect(() => {
    if (!deviceInfo.touchDevice && !deviceInfo.isMobile) {
      const handleMouseMove = (e) => {
        setMousePosition({ x: e.clientX, y: e.clientY });
      };
      window.addEventListener('mousemove', handleMouseMove);
      return () => window.removeEventListener('mousemove', handleMouseMove);
    }
  }, [deviceInfo]);

  // Scroll to top button adaptado
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.pageYOffset > (deviceInfo.isMobile ? 200 : 400));
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [deviceInfo]);

  // Observador de intersección adaptado
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(prev => ({
              ...prev,
              [entry.target.id]: true
            }));
          }
        });
      },
      { threshold: deviceInfo.isMobile ? 0.05 : 0.1 }
    );

    const elements = document.querySelectorAll('[data-animate]');
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [deviceInfo]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Contenido adaptado para móviles
  const values = [
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <path d="M9 12l2 2 4-4"/>
        </svg>
      ),
      title: "Seguridad y Privacidad",
      description: deviceInfo.isMobile ? 
        "Protegemos tu información con los más altos estándares de seguridad." :
        "Protegemos la información de nuestros usuarios con los más altos estándares de seguridad. Tu privacidad es nuestra prioridad número uno."
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
          <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
      title: "Comunidad Inclusiva",
      description: deviceInfo.isMobile ?
        "Creamos un espacio donde todas las personas se sientan bienvenidas y respetadas." :
        "Creamos un espacio donde todas las personas se sientan bienvenidas, respetadas y valoradas, sin importar su identidad o preferencias."
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ),
      title: "Excelencia en Servicio",
      description: deviceInfo.isMobile ?
        "Ofrecemos la mejor experiencia posible con servicios de calidad premium." :
        "Nos esforzamos por ofrecer la mejor experiencia posible, con servicios de calidad premium que superan las expectativas."
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M9 12l2 2 4-4"/>
          <path d="M21 12c.552 0 1-.448 1-1V8c0-.552-.448-1-1-1s-1 .448-1 1v3c0 .552.448 1 1 1z"/>
          <path d="M3 12c-.552 0-1-.448-1-1V8c0-.552.448-1 1-1s1 .448 1 1v3c0 .552-.448 1-1 1z"/>
        </svg>
      ),
      title: "Transparencia Total",
      description: deviceInfo.isMobile ?
        "Operamos con total transparencia en todos nuestros procesos y políticas." :
        "Operamos con total transparencia en todos nuestros procesos, desde la verificación de perfiles hasta las políticas de la plataforma."
    }
  ];

  const timelineData = [
    {
      region: "República Dominicana",
      title: "Mercado Principal",
      description: deviceInfo.isMobile ?
        "Nuestro hogar y punto de partida en el Caribe." :
        "Nuestro hogar y punto de partida, donde establecemos los más altos estándares de calidad y servicio en el Caribe."
    },
    {
      region: "Caribe",
      title: "Expansión Regional",
      description: deviceInfo.isMobile ?
        "Expandiremos nuestros servicios premium a las principales islas del Caribe." :
        "Próximamente expandiremos nuestros servicios premium a las principales islas del Caribe, manteniendo nuestros estándares de excelencia."
    },
    {
      region: "Latinoamérica",
      title: "Visión Continental",
      description: deviceInfo.isMobile ?
        "Convertirnos en la plataforma de referencia en América Latina." :
        "Nuestro objetivo es convertirnos en la plataforma de referencia para servicios de acompañamiento premium en toda América Latina."
    },
    {
      region: "Global",
      title: "Alcance Mundial",
      description: deviceInfo.isMobile ?
        "Conectar experiencias auténticas en los principales mercados mundiales." :
        "La visión final de TeloFundi es conectar experiencias auténticas y de calidad en los principales mercados mundiales."
    }
  ];

  return (
    <div>
      {/* Cursor personalizado solo en desktop */}
      {!deviceInfo.touchDevice && !deviceInfo.isMobile && (
        <motion.div 
          className="custom-cursor"
          animate={{
            x: mousePosition.x - 10,
            y: mousePosition.y - 10,
          }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 28
          }}
        />
      )}

      {/* Grid background adaptado */}
      <div 
        className="grid-background"
        style={{
          opacity: deviceInfo.isMobile ? 0.3 : 1,
          backgroundSize: deviceInfo.isMobile ? '30px 30px' : '50px 50px'
        }}
      ></div>

      {/* Floating particles solo en desktop */}
      {!deviceInfo.isMobile && !reducedMotion && (
        <motion.div 
          className="floating-particles"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2 }}
        >
          {[...Array(deviceInfo.isTablet ? 4 : 6)].map((_, i) => (
            <motion.div
              key={i}
              className="particle"
              style={{
                left: `${Math.random() * 100}%`,
                width: deviceInfo.isTablet ? '3px' : '4px',
                height: deviceInfo.isTablet ? '3px' : '4px',
                background: '#D2421A',
                borderRadius: '50%',
                position: 'absolute'
              }}
              animate={{
                y: [-100, window.innerHeight + 100],
                opacity: [0, 1, 1, 0],
                scale: [0, 1, 1, 0]
              }}
              transition={{
                duration: 5 + Math.random() * 3,
                repeat: Infinity,
                delay: Math.random() * 5,
                ease: "linear"
              }}
            />
          ))}
        </motion.div>
      )}

      {/* Scroll progress */}
      <motion.div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: deviceInfo.isMobile ? '2px' : '3px',
          background: 'linear-gradient(135deg, #D2421A 0%, #9E2B0E 100%)',
          zIndex: 1000,
          transformOrigin: '0%',
          scaleX: useTransform(scrollY, [0, document.body.scrollHeight - window.innerHeight], [0, 1])
        }}
      />

      {/* Hero Section */}
      <motion.section 
        className="hero-telofundi"
        style={{ 
          y: deviceInfo.isMobile ? 0 : yTransform,
          minHeight: deviceInfo.isMobile ? '70vh' : '100vh',
          padding: deviceInfo.isMobile ? '1rem 0' : '0'
        }}
      >
        <motion.div 
          className="hero-background-container-telofundi"
          style={{ 
            opacity: deviceInfo.isMobile ? 1 : opacityTransform
          }}
        >
          <div className="hero-slide-telofundi active" style={{ 
            backgroundImage: 'linear-gradient(135deg, var(--black-primary) 0%, var(--black-secondary) 50%, var(--black-tertiary) 100%)' 
          }}></div>
        </motion.div>
        <div className="hero-overlay-telofundi-light"></div>
        
        {/* Efectos visuales solo en tablet y desktop */}
        {!deviceInfo.isMobile && (
          <div className="hero-shapes-telofundi parallax-element" data-speed="2">
            <motion.div 
              className="shape-telofundi shape-1"
              variants={adaptiveVariants.floatingVariants}
              animate={reducedMotion ? {} : "animate"}
            ></motion.div>
            <motion.div 
              className="shape-telofundi shape-2"
              variants={adaptiveVariants.floatingVariants}
              animate={reducedMotion ? {} : "animate"}
              transition={{ delay: 2 }}
            ></motion.div>
          </div>
        )}

        <motion.div 
          className="hero-content-telofundi"
          initial={{ opacity: 0, y: deviceInfo.isMobile ? 50 : 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: deviceInfo.isMobile ? 0.6 : 1, delay: 0.5 }}
          style={{
            ...(deviceInfo.isMobile && {
              padding: '0 1rem',
              textAlign: 'center'
            })
          }}
        >
          <motion.div 
            className="hero-announcement-telofundi"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            whileHover={deviceInfo.touchDevice ? {} : { color: "var(--text-primary)" }}
          >
            <motion.div 
              className="announcement-dot-telofundi"
              variants={adaptiveVariants.pulseVariants}
              animate={reducedMotion ? {} : "animate"}
            ></motion.div>
            <span>{deviceInfo.isMobile ? "Experiencias auténticas" : "Conectando experiencias auténticas"}</span>
            <motion.svg 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1.5"
              whileHover={deviceInfo.touchDevice ? {} : { x: 2 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </motion.svg>
          </motion.div>
          
          <motion.h1 
            className="hero-title-telofundi"
            initial={{ opacity: 0, y: deviceInfo.isMobile ? 30 : 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            style={{ 
              ...(deviceInfo.isMobile && {
                fontSize: '2rem',
                lineHeight: '2.2rem'
              }),
              ...(deviceInfo.isTablet && {
                fontSize: '2.5rem'
              })
            }}
          >
            {deviceInfo.isMobile ? 'Conoce' : 'Conoce más sobre'}{' '}
            <motion.span 
              className="hero-gradient-word-telofundi"
              style={{
                background: 'linear-gradient(135deg, #D2421A 0%, #9E2B0E 100%)',
                backgroundSize: '200% 200%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
              variants={reducedMotion ? {} : {
                animate: {
                  backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                  transition: {
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }
                }
              }}
              animate={reducedMotion ? {} : "animate"}
            >
              TeloFundi
            </motion.span>
            {deviceInfo.isMobile && <br />}
            {deviceInfo.isMobile && <span style={{ fontSize: '1.5rem' }}>la plataforma líder</span>}
          </motion.h1>
          
          <motion.p 
            className="hero-description-telofundi"
            initial={{ opacity: 0, y: deviceInfo.isMobile ? 20 : 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.1 }}
            style={{
              ...(deviceInfo.isMobile && {
                fontSize: '0.9rem',
                maxWidth: '100%'
              })
            }}
          >
            {deviceInfo.isMobile ? 
              "La plataforma líder en RD para servicios de acompañamiento premium con seguridad y calidad excepcional." :
              "Somos la plataforma líder en República Dominicana para servicios de acompañamiento premium, construida sobre los pilares de seguridad, discreción y calidad excepcional."
            }
          </motion.p>
        </motion.div>
      </motion.section>

      {/* Mission Section */}
      <AdaptiveAnimatedSection deviceInfo={deviceInfo} reducedMotion={reducedMotion} variants={adaptiveVariants.slideUpVariants}>
        <section 
          id="about-mission-telofundi"
          className={`about-mission-telofundi ${isVisible['about-mission-telofundi'] ? 'animate' : ''}`}
          data-animate
          style={{
            ...(deviceInfo.isMobile && { padding: '3rem 0' })
          }}
        >
          <div 
            className="container-telofundi"
            style={{
              ...(deviceInfo.isMobile && {
                paddingLeft: '1rem',
                paddingRight: '1rem'
              })
            }}
          >
            <motion.div 
              className="about-mission-content-telofundi"
              variants={adaptiveVariants.containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: deviceInfo.isMobile ? 0.1 : 0.3 }}
              style={{
                ...(deviceInfo.isMobile && {
                  flexDirection: 'column',
                  textAlign: 'center',
                  gap: '2rem'
                })
              }}
            >
              <motion.div 
                className="about-mission-text-telofundi"
                variants={adaptiveVariants.itemVariants}
              >
                <motion.div 
                  className="about-section-badge-telofundi"
                  whileHover={deviceInfo.touchDevice ? {} : { 
                    scale: 1.05,
                    background: "rgba(210, 66, 26, 0.12)",
                    borderColor: "rgba(210, 66, 26, 0.3)"
                  }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <span>Nuestra Misión</span>
                </motion.div>
                
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  viewport={{ once: true }}
                  style={{
                    ...(deviceInfo.isMobile && {
                      fontSize: '1.8rem',
                      lineHeight: '2rem'
                    }),
                    ...(deviceInfo.isTablet && {
                      fontSize: '2.2rem'
                    })
                  }}
                >
                  {deviceInfo.isMobile ? "Redefiniendo el acompañamiento" : "Redefiniendo el acompañamiento premium"}
                </motion.h2>
                
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  viewport={{ once: true }}
                  style={{ 
                    ...(deviceInfo.isMobile && { fontSize: '0.9rem' })
                  }}
                >
                  En TeloFundi, creemos que toda persona merece acceder a experiencias de acompañamiento 
                  de la más alta calidad en un entorno seguro y discreto.
                  {!deviceInfo.isMobile && " Nuestra misión es conectar a personas que buscan compañía profesional con acompañantes verificados y agencias de élite."}
                </motion.p>
                
                {!deviceInfo.isMobile && (
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    viewport={{ once: true }}
                  >
                    Trabajamos incansablemente para eliminar los estigmas y crear una plataforma donde 
                    la elegancia, el respeto y la profesionalidad sean los estándares, no la excepción.
                  </motion.p>
                )}
              </motion.div>
              
              <motion.div 
                className="about-mission-visual-telofundi"
                variants={adaptiveVariants.itemVariants}
                whileHover={deviceInfo.touchDevice ? {} : { scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <motion.div 
                  className="about-mission-icon-telofundi"
                  variants={adaptiveVariants.pulseVariants}
                  animate={reducedMotion ? {} : "animate"}
                  whileHover={deviceInfo.touchDevice ? {} : {
                    scale: 1.2,
                    rotate: 10
                  }}
                  style={{
                    ...(deviceInfo.isMobile && {
                      width: '60px',
                      height: '60px'
                    })
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </section>
      </AdaptiveAnimatedSection>

      {/* Values Section */}
      <AdaptiveAnimatedSection deviceInfo={deviceInfo} reducedMotion={reducedMotion} variants={adaptiveVariants.slideUpVariants}>
        <section 
          id="about-values-telofundi"
          className={`about-values-telofundi ${isVisible['about-values-telofundi'] ? 'animate' : ''}`}
          data-animate
          style={{
            ...(deviceInfo.isMobile && { padding: '3rem 0' })
          }}
        >
          <div 
            className="container-telofundi"
            style={{
              ...(deviceInfo.isMobile && {
                paddingLeft: '1rem',
                paddingRight: '1rem'
              })
            }}
          >
            <motion.div 
              className="about-values-header-telofundi"
              variants={adaptiveVariants.containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: deviceInfo.isMobile ? 0.1 : 0.3 }}
              style={{
                ...(deviceInfo.isMobile && { textAlign: 'center' })
              }}
            >
              <motion.div 
                className="about-section-badge-telofundi"
                variants={adaptiveVariants.itemVariants}
                whileHover={deviceInfo.touchDevice ? {} : { 
                  scale: 1.05,
                  background: "rgba(210, 66, 26, 0.12)",
                  borderColor: "rgba(210, 66, 26, 0.3)"
                }}
              >
                <span>Nuestros Valores</span>
              </motion.div>
              <motion.h2 
                variants={adaptiveVariants.itemVariants}
                style={{
                  ...(deviceInfo.isMobile && { fontSize: '1.8rem' }),
                  ...(deviceInfo.isTablet && { fontSize: '2.2rem' })
                }}
              >
                Los principios que nos guían
              </motion.h2>
              <motion.p 
                variants={adaptiveVariants.itemVariants}
                style={{ 
                  ...(deviceInfo.isMobile && { fontSize: '0.9rem' })
                }}
              >
                {deviceInfo.isMobile ?
                  "Principios sólidos que garantizan una experiencia excepcional." :
                  "Cada decisión que tomamos está fundamentada en valores sólidos que garantizan una experiencia excepcional para todos los miembros de nuestra comunidad."
                }
              </motion.p>
            </motion.div>

            <motion.div 
              className="about-values-grid-telofundi"
              variants={adaptiveVariants.containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.1 }}
              style={{
                ...(deviceInfo.isMobile && {
                  gridTemplateColumns: '1fr',
                  gap: '1.5rem'
                }),
                ...(deviceInfo.isTablet && {
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '2rem'
                })
              }}
            >
              {values.map((value, index) => (
                <motion.div 
                  key={index} 
                  className="about-value-card-telofundi"
                  variants={adaptiveVariants.itemVariants}
                  whileHover={deviceInfo.touchDevice ? {} : adaptiveVariants.cardHoverVariants.hover}
                  whileTap={deviceInfo.touchDevice ? { scale: 0.98 } : {}}
                  style={{ 
                    ...(deviceInfo.isMobile && {
                      padding: '1.5rem',
                      minHeight: 'auto'
                    })
                  }}
                >
                  {!reducedMotion && (
                    <motion.div 
                      className="about-value-glow-telofundi"
                      animate={{ 
                        opacity: [0, 0.3, 0],
                        scale: [1, 1.1, 1]
                      }}
                      transition={{ 
                        duration: 4, 
                        repeat: Infinity,
                        delay: index * 0.5
                      }}
                    ></motion.div>
                  )}
                  
                  <motion.div 
                    className="about-value-icon-telofundi"
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 + 0.2, type: "spring" }}
                    style={{
                      ...(deviceInfo.isMobile && {
                        width: '40px',
                        height: '40px'
                      })
                    }}
                  >
                    {value.icon}
                  </motion.div>
                  
                  <motion.h3
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 + 0.3 }}
                    viewport={{ once: true }}
                    style={{
                      ...(deviceInfo.isMobile && {
                        fontSize: '1.1rem',
                        marginBottom: '0.5rem'
                      })
                    }}
                  >
                    {value.title}
                  </motion.h3>
                  
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 + 0.4 }}
                    viewport={{ once: true }}
                    style={{
                      ...(deviceInfo.isMobile && {
                        fontSize: '0.85rem',
                        lineHeight: '1.4'
                      })
                    }}
                  >
                    {value.description}
                  </motion.p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      </AdaptiveAnimatedSection>

      {/* Timeline Section */}
      <AdaptiveAnimatedSection deviceInfo={deviceInfo} reducedMotion={reducedMotion} variants={adaptiveVariants.slideUpVariants}>
        <section 
          id="about-presence-telofundi"
          className={`about-journey-telofundi ${isVisible['about-presence-telofundi'] ? 'animate' : ''}`}
          data-animate
          style={{
            ...(deviceInfo.isMobile && { padding: '3rem 0' })
          }}
        >
          <div 
            className="container-telofundi"
            style={{
              ...(deviceInfo.isMobile && {
                paddingLeft: '1rem',
                paddingRight: '1rem'
              })
            }}
          >
            <motion.div 
              className="about-journey-header-telofundi"
              variants={adaptiveVariants.containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: deviceInfo.isMobile ? 0.1 : 0.3 }}
              style={{
                ...(deviceInfo.isMobile && { textAlign: 'center' })
              }}
            >
              <motion.div 
                className="about-section-badge-telofundi"
                variants={adaptiveVariants.itemVariants}
                whileHover={deviceInfo.touchDevice ? {} : { 
                  scale: 1.05,
                  background: "rgba(210, 66, 26, 0.12)",
                  borderColor: "rgba(210, 66, 26, 0.3)"
                }}
              >
                <span>Nuestra Presencia</span>
              </motion.div>
              <motion.h2 
                variants={adaptiveVariants.itemVariants}
                style={{
                  ...(deviceInfo.isMobile && { fontSize: '1.8rem' }),
                  ...(deviceInfo.isTablet && { fontSize: '2.2rem' })
                }}
              >
                {deviceInfo.isMobile ? "Conectando globalmente" : "Conectando a nivel global"}
              </motion.h2>
              <motion.p 
                variants={adaptiveVariants.itemVariants}
                style={{ 
                  ...(deviceInfo.isMobile && { fontSize: '0.9rem' })
                }}
              >
                {deviceInfo.isMobile ?
                  "Diseñados para expandirse desde República Dominicana hacia el mundo." :
                  "TeloFundi está diseñado para expandirse y conectar personas de calidad en todo el mundo, comenzando desde República Dominicana como nuestro mercado principal."
                }
              </motion.p>
            </motion.div>

            <motion.div 
              className="about-timeline-telofundi"
              variants={adaptiveVariants.containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.1 }}
            >
              {!deviceInfo.isMobile && (
                <motion.div 
                  className="about-timeline-line-telofundi"
                  initial={{ scaleY: 0 }}
                  whileInView={{ scaleY: 1 }}
                  transition={{ duration: reducedMotion ? 1 : 2, ease: "easeOut" }}
                  viewport={{ once: true }}
                ></motion.div>
              )}
              
              {timelineData.map((item, index) => (
                <motion.div 
                  key={index}
                  className="about-timeline-item-telofundi"
                  variants={deviceInfo.isMobile ? adaptiveVariants.itemVariants : 
                    (index % 2 === 0 ? {
                      hidden: { opacity: 0, x: -100 },
                      visible: {
                        opacity: 1, x: 0,
                        transition: { type: "spring", stiffness: 100, damping: 20, duration: 0.8 }
                      }
                    } : {
                      hidden: { opacity: 0, x: 100 },
                      visible: {
                        opacity: 1, x: 0,
                        transition: { type: "spring", stiffness: 100, damping: 20, duration: 0.8 }
                      }
                    })
                  }
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: deviceInfo.isMobile ? 0.1 : 0.3 }}
                  transition={{ delay: index * 0.2 }}
                  style={{ 
                    ...(deviceInfo.isMobile && { marginBottom: '2rem' })
                  }}
                >
                  <motion.div 
                    className="about-timeline-content-telofundi"
                    variants={adaptiveVariants.cardHoverVariants}
                    whileHover={deviceInfo.touchDevice ? {} : "hover"}
                    whileTap={deviceInfo.touchDevice ? { scale: 0.98 } : {}}
                    style={{
                      ...(deviceInfo.isMobile && {
                        padding: '1.5rem',
                        width: '100%'
                      }),
                      ...(!deviceInfo.isMobile && {
                        marginLeft: index % 2 === 0 ? '0' : 'auto',
                        marginRight: index % 2 === 0 ? 'auto' : '0',
                        width: '45%'
                      })
                    }}
                  >
                    <motion.div 
                      className="about-timeline-year-telofundi"
                      initial={{ opacity: 0, x: deviceInfo.isMobile ? 0 : -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.2 + 0.2 }}
                      style={{
                        ...(deviceInfo.isMobile && {
                          fontSize: '0.85rem',
                          marginBottom: '0.5rem'
                        })
                      }}
                    >
                      {item.region}
                    </motion.div>
                    
                    <motion.h3
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.2 + 0.3 }}
                      style={{
                        ...(deviceInfo.isMobile && {
                          fontSize: '1.1rem',
                          marginBottom: '0.5rem'
                        })
                      }}
                    >
                      {item.title}
                    </motion.h3>
                    
                    <motion.p
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.2 + 0.4 }}
                      style={{
                        ...(deviceInfo.isMobile && {
                          fontSize: '0.85rem',
                          lineHeight: '1.4'
                        })
                      }}
                    >
                      {item.description}
                    </motion.p>
                  </motion.div>
                  
                  {!deviceInfo.isMobile && (
                    <motion.div 
                      className="about-timeline-dot-telofundi"
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      transition={{ 
                        delay: index * 0.2 + 0.5, 
                        type: "spring", 
                        stiffness: 300 
                      }}
                      whileHover={deviceInfo.touchDevice ? {} : { 
                        scale: 1.3,
                        backgroundColor: "var(--orange-secondary)",
                        boxShadow: "0 0 20px rgba(210, 66, 26, 0.4)"
                      }}
                    >
                      <motion.div
                        variants={adaptiveVariants.pulseVariants}
                        animate={reducedMotion ? {} : "animate"}
                        style={{
                          width: '8px',
                          height: '8px',
                          background: 'white',
                          borderRadius: '50%'
                        }}
                      ></motion.div>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      </AdaptiveAnimatedSection>

      {/* Scroll to top button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            style={{
              position: 'fixed',
              bottom: deviceInfo.isMobile ? '1rem' : '2rem',
              right: deviceInfo.isMobile ? '1rem' : '2rem',
              width: deviceInfo.isMobile ? '48px' : '56px',
              height: deviceInfo.isMobile ? '48px' : '56px',
              background: 'linear-gradient(135deg, #D2421A 0%, #9E2B0E 100%)',
              border: 'none',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 1000,
              color: 'white',
              boxShadow: deviceInfo.isMobile ? 
                '0 0 15px rgba(210, 66, 26, 0.3)' : 
                '0 0 20px rgba(210, 66, 26, 0.3)',
              minHeight: deviceInfo.touchDevice ? '44px' : '40px',
              minWidth: deviceInfo.touchDevice ? '44px' : '40px'
            }}
            onClick={scrollToTop}
            initial={{ opacity: 0, scale: 0, y: 100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0, y: 100 }}
            whileHover={deviceInfo.touchDevice ? {} : { 
              scale: 1.1, 
              y: -5,
              boxShadow: deviceInfo.isMobile ?
                "0 0 25px rgba(210, 66, 26, 0.4)" :
                "0 0 30px rgba(210, 66, 26, 0.5)"
            }}
            whileTap={{ scale: 0.9 }}
            transition={{ 
              type: "spring", 
              stiffness: 400, 
              damping: 17 
            }}
          >
            <motion.svg 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1.5"
              style={{ 
                width: deviceInfo.isMobile ? '20px' : '24px', 
                height: deviceInfo.isMobile ? '20px' : '24px' 
              }}
              animate={reducedMotion ? {} : { y: [-3, 0, -3] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <path d="M7 14l5-5 5 5"/>
            </motion.svg>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AboutPage;