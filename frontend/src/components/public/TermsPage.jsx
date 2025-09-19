import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useInView, useAnimation } from 'framer-motion';
import './TermsPage.css';

// Hook personalizado para detectar dispositivo móvil
const useDeviceDetection = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return { isMobile, isTablet };
};

// Función para prevenir desbordamiento horizontal
const useOverflowFix = () => {
  useEffect(() => {
    const preventHorizontalOverflow = () => {
      // Obtener todos los elementos que pueden causar desbordamiento
      const allElements = document.querySelectorAll('*');
      
      allElements.forEach(element => {
        const rect = element.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        
        // Si el elemento se extiende más allá del viewport
        if (rect.right > viewportWidth) {
          const computedStyle = window.getComputedStyle(element);
          
          // Solo aplicar correcciones si no tiene overflow-x hidden ya
          if (computedStyle.overflowX !== 'hidden') {
            // Aplicar estilos para contener el elemento
            element.style.maxWidth = '100%';
            element.style.wordWrap = 'break-word';
            element.style.overflowWrap = 'break-word';
            element.style.boxSizing = 'border-box';
            
            // Si es un contenedor flex o grid, ajustar
            if (computedStyle.display === 'flex') {
              element.style.flexWrap = 'wrap';
            }
            
            // Para elementos con position absolute/fixed problemáticos
            if (computedStyle.position === 'absolute' || computedStyle.position === 'fixed') {
              const leftValue = parseInt(computedStyle.left) || 0;
              const rightValue = parseInt(computedStyle.right) || 0;
              
              if (leftValue < 0 || rightValue < 0) {
                element.style.left = Math.max(0, leftValue) + 'px';
                element.style.right = Math.max(0, rightValue) + 'px';
              }
            }
          }
        }
      });
      
      // Específicamente para la página de términos
      const termsElements = document.querySelectorAll('.terms-timeline-content-telofundi, .terms-important-notice-telofundi');
      termsElements.forEach(element => {
        element.style.maxWidth = '100%';
        element.style.width = '100%';
        element.style.boxSizing = 'border-box';
        element.style.wordWrap = 'break-word';
        element.style.overflowWrap = 'break-word';
      });

      // Forzar reflow para aplicar cambios
      document.body.style.overflowX = 'hidden';
      document.documentElement.style.overflowX = 'hidden';
    };

    // Ejecutar inmediatamente
    preventHorizontalOverflow();
    
    // Ejecutar en resize con debounce
    let timeoutId;
    const debouncedFix = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(preventHorizontalOverflow, 100);
    };
    
    window.addEventListener('resize', debouncedFix);
    
    // Observer para detectar cambios en el DOM
    const observer = new MutationObserver(debouncedFix);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', debouncedFix);
      observer.disconnect();
    };
  }, []);
};

// Variantes de animación optimizadas para Terms Page y responsivo
const createResponsiveVariants = (isMobile, isTablet) => ({
  containerVariants: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: isMobile ? 0.02 : 0.05,
        delayChildren: isMobile ? 0.05 : 0.1
      }
    }
  },

  itemVariants: {
    hidden: { 
      opacity: 0, 
      y: isMobile ? 20 : 30,
      scale: 0.98
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: isMobile ? 300 : 200,
        damping: isMobile ? 30 : 25,
        duration: isMobile ? 0.3 : 0.4
      }
    }
  },

  slideUpVariants: {
    hidden: { 
      opacity: 0, 
      y: isMobile ? 30 : 50 
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: isMobile ? 200 : 150,
        damping: isMobile ? 25 : 20,
        duration: isMobile ? 0.4 : 0.5
      }
    }
  },

  scaleInVariants: {
    hidden: { 
      opacity: 0, 
      scale: 0.9
    },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: isMobile ? 250 : 200,
        damping: isMobile ? 25 : 20,
        duration: isMobile ? 0.3 : 0.4
      }
    }
  },

  timelineVariants: {
    hidden: { 
      opacity: 0,
      x: 0, // Centrado para todos
      y: isMobile ? 20 : 0
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        type: "spring",
        stiffness: isMobile ? 150 : 120,
        damping: isMobile ? 25 : 20,
        duration: isMobile ? 0.4 : 0.5
      }
    }
  },

  timelineEvenVariants: {
    hidden: { 
      opacity: 0,
      x: 0, // Centrado para todos
      y: isMobile ? 20 : 0
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        type: "spring",
        stiffness: isMobile ? 150 : 120,
        damping: isMobile ? 25 : 20,
        duration: isMobile ? 0.4 : 0.5
      }
    }
  },

  cardHoverVariants: {
    hover: isMobile ? {} : {
      y: -8,
      scale: 1.01,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25,
        duration: 0.2
      }
    }
  },

  iconVariants: {
    hover: isMobile ? {} : {
      rotate: 180,
      scale: 1.1,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 20,
        duration: 0.3
      }
    }
  }
});

// Componente de animación optimizado para elementos en vista
const AnimatedSection = React.memo(({ children, variants, delay = 0, className = "", isMobile }) => {
  const controls = useAnimation();
  const ref = React.useRef(null);
  const inView = useInView(ref, { 
    once: true, 
    margin: isMobile ? "-20px" : "-50px" 
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
      transition={{ delay: isMobile ? delay * 0.5 : delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
});

const TermsPage = () => {
  const { isMobile, isTablet } = useDeviceDetection();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const variants = useMemo(() => createResponsiveVariants(isMobile, isTablet), [isMobile, isTablet]);
  
  // Aplicar función de corrección de overflow
  useOverflowFix();

  // Scroll animations optimizadas y responsivas
  const { scrollY } = useScroll();
  const yTransform = useTransform(scrollY, [0, 500], [0, isMobile ? -50 : -100]);
  const opacityTransform = useTransform(scrollY, [0, 200], [1, isMobile ? 0.6 : 0.3]);

  // Optimized scroll handler
  const handleScroll = useCallback(() => {
    setShowScrollTop(window.pageYOffset > (isMobile ? 200 : 300));
  }, [isMobile]);

  // Scroll to top handler
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Scroll listener optimizado
  useEffect(() => {
    let ticking = false;
    
    const optimizedScrollHandler = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', optimizedScrollHandler, { passive: true });
    return () => window.removeEventListener('scroll', optimizedScrollHandler);
  }, [handleScroll]);

  // Términos y condiciones estructurados - memoizados para mejor rendimiento
  const termsData = useMemo(() => [
    {
      title: "Aceptación de los Términos",
      content: (
        <>
          <p>Al acceder y utilizar la plataforma TeloFundi, usted acepta estar sujeto a estos Términos y Condiciones de Uso. Si no está de acuerdo con alguna parte de estos términos, no debe utilizar nuestros servicios.</p>
          <ul>
            <li>Estos términos constituyen un acuerdo legal vinculante</li>
            <li>El uso continuado de la plataforma implica aceptación total</li>
            <li>Nos reservamos el derecho de modificar estos términos en cualquier momento</li>
            <li>Los cambios entrarán en vigor inmediatamente después de su publicación</li>
          </ul>
        </>
      )
    },
    {
      title: "Definición del Servicio",
      content: (
        <>
          <p>TeloFundi es una plataforma digital que facilita la conexión entre usuarios adultos que buscan servicios de acompañamiento premium y profesionales verificados del sector.</p>
          <ul>
            <li>Actuamos únicamente como intermediarios tecnológicos</li>
            <li>No proporcionamos directamente servicios de acompañamiento</li>
            <li>Facilitamos la comunicación entre partes interesadas</li>
            <li>Mantenemos estándares de calidad y verificación</li>
          </ul>
          <motion.div 
            className="terms-important-notice-telofundi"
            whileHover={isMobile ? {} : { scale: 1.01, y: -2 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            style={{
              maxWidth: '100%',
              width: '100%',
              boxSizing: 'border-box',
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
              ...(isMobile && {
                padding: '1rem',
                fontSize: '0.85rem'
              })
            }}
          >
            <div className="notice-title">
              <motion.svg 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                style={{width: isMobile ? 16 : 20, height: isMobile ? 16 : 20}}
              >
                <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.731 0 2.814-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
              </motion.svg>
              Aviso Importante
            </div>
            <div className="notice-content">
              TeloFundi opera exclusivamente como plataforma tecnológica. Todos los servicios de acompañamiento son proporcionados por terceros independientes debidamente verificados.
            </div>
          </motion.div>
        </>
      )
    },
    {
      title: "Elegibilidad y Registro",
      content: (
        <>
          <p>Para utilizar TeloFundi, debe cumplir con ciertos requisitos de elegibilidad y completar un proceso de registro verificado.</p>
          <ul>
            <li>Debe ser mayor de 18 años en su jurisdicción</li>
            <li>Proporcionar información veraz y actualizada durante el registro</li>
            <li>Completar el proceso de verificación de identidad</li>
            <li>Aceptar someterse a verificaciones periódicas de seguridad</li>
            <li>Mantener la confidencialidad de sus credenciales de acceso</li>
          </ul>
          <p>Nos reservamos el derecho de suspender o terminar cuentas que no cumplan con estos requisitos.</p>
        </>
      )
    },
    {
      title: "Responsabilidades del Usuario",
      content: (
        <>
          <p>Como usuario de TeloFundi, acepta utilizar la plataforma de manera responsable y respetuosa, cumpliendo con todas las normas establecidas.</p>
          <ul>
            <li>Tratar a todos los miembros con respeto y cortesía</li>
            <li>No utilizar la plataforma para actividades ilegales</li>
            <li>Respetar la privacidad y confidencialidad de otros usuarios</li>
            <li>Reportar cualquier comportamiento inapropiado o sospechoso</li>
            <li>Mantener actualizada su información de perfil</li>
            <li>No compartir contenido ofensivo, discriminatorio o inapropiado</li>
          </ul>
        </>
      )
    },
    {
      title: "Verificación y Agencias",
      content: (
        <>
          <p>La verificación de perfiles es responsabilidad exclusiva de las agencias asociadas. TeloFundi actúa como facilitador tecnológico de estas verificaciones.</p>
          <ul>
            <li>Las agencias son responsables de verificar la autenticidad de los perfiles</li>
            <li>TeloFundi valida la legitimidad de las agencias asociadas</li>
            <li>Mantenemos estándares estrictos para la asociación con agencias</li>
            <li>Los usuarios pueden reportar perfiles sospechosos para investigación</li>
          </ul>
          <motion.div 
            className="terms-important-notice-telofundi"
            whileHover={isMobile ? {} : { scale: 1.01, y: -2 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            style={{
              ...(isMobile && {
                padding: '1rem',
                fontSize: '0.85rem'
              })
            }}
          >
            <div className="notice-title">
              <motion.svg 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                style={{width: isMobile ? 16 : 20, height: isMobile ? 16 : 20}}
                variants={variants.iconVariants}
                whileHover={isMobile ? {} : "hover"}
              >
                <path d="M9 12l2 2 4-4"/>
                <path d="M21 12c.552 0 1-.448 1-1V8c0-.552-.448-1-1-1s-1 .448-1 1v3c0 .552.448 1 1 1z"/>
              </motion.svg>
              Proceso de Verificación
            </div>
            <div className="notice-content">
              Todas las agencias asociadas deben cumplir con nuestros protocolos de verificación rigurosos antes de poder operar en la plataforma.
            </div>
          </motion.div>
        </>
      )
    },
    {
      title: "Privacidad y Discreción",
      content: (
        <>
          <p>La privacidad y discreción son fundamentales en TeloFundi. Implementamos múltiples capas de protección para salvaguardar la información de nuestros usuarios.</p>
          <ul>
            <li>Encriptación de extremo a extremo en todas las comunicaciones</li>
            <li>Políticas estrictas de no divulgación de información personal</li>
            <li>Sistemas de comunicación anónima disponibles</li>
            <li>Protección contra accesos no autorizados</li>
            <li>Eliminación segura de datos cuando sea solicitada</li>
          </ul>
          <p>Para más detalles, consulte nuestra Política de Privacidad completa.</p>
        </>
      )
    },
    {
      title: "Limitación de Responsabilidad",
      content: (
        <>
          <p>TeloFundi actúa exclusivamente como plataforma intermediaria y no asume responsabilidad por las interacciones entre usuarios y proveedores de servicios.</p>
          <ul>
            <li>No somos responsables de estafas o fraudes entre terceros</li>
            <li>Los usuarios interactúan bajo su propio riesgo y responsabilidad</li>
            <li>No garantizamos la veracidad total de la información de terceros</li>
            <li>Las disputas entre usuarios deben resolverse directamente entre las partes</li>
            <li>Proporcionamos herramientas de reporte y mediación cuando es posible</li>
          </ul>
          <motion.div 
            className="terms-important-notice-telofundi"
            whileHover={isMobile ? {} : { scale: 1.01, y: -2 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            style={{
              ...(isMobile && {
                padding: '1rem',
                fontSize: '0.85rem'
              })
            }}
          >
            <div className="notice-title">
              <motion.svg 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                style={{width: isMobile ? 16 : 20, height: isMobile ? 16 : 20}}
              >
                <path d="M12 9v3.75m0 4.5h.008v.008H12V16.5z"/>
              </motion.svg>
              Descargo de Responsabilidad
            </div>
            <div className="notice-content">
              TeloFundi no es responsable de actividades fraudulentas entre usuarios. Recomendamos ejercer precaución y utilizar nuestras herramientas de verificación.
            </div>
          </motion.div>
        </>
      )
    },
    {
      title: "Conducta Prohibida",
      content: (
        <>
          <p>Para mantener un ambiente seguro y profesional, ciertas conductas están estrictamente prohibidas en la plataforma.</p>
          <ul>
            <li>Acoso, intimidación o comportamiento abusivo hacia otros usuarios</li>
            <li>Publicación de contenido falso, engañoso o fraudulento</li>
            <li>Actividades que violen las leyes locales o internacionales</li>
            <li>Intentos de evadir los sistemas de verificación y seguridad</li>
            <li>Uso de la plataforma para actividades de trata de personas</li>
            <li>Discriminación basada en raza, género, orientación sexual o religión</li>
          </ul>
          <p>La violación de estas normas resultará en la suspensión inmediata de la cuenta y posibles acciones legales.</p>
        </>
      )
    },
    {
      title: "Pagos y Tarifas",
      content: (
        <>
          <p>Los aspectos financieros de la plataforma se manejan con total transparencia y seguridad, protegiendo tanto a usuarios como a proveedores de servicios.</p>
          <ul>
            <li>TeloFundi cobra una tarifa de servicio por facilitar conexiones</li>
            <li>Los pagos por servicios se realizan directamente entre las partes</li>
            <li>Utilizamos procesadores de pago seguros y certificados</li>
            <li>Las tarifas de la plataforma son claramente especificadas</li>
            <li>No almacenamos información completa de tarjetas de crédito</li>
          </ul>
        </>
      )
    },
    {
      title: "Terminación de Cuenta",
      content: (
        <>
          <p>Tanto los usuarios como TeloFundi tienen el derecho de terminar la relación contractual bajo ciertas circunstancias.</p>
          <ul>
            <li>Los usuarios pueden eliminar su cuenta en cualquier momento</li>
            <li>TeloFundi puede suspender cuentas por violación de términos</li>
            <li>Se proporcionará notificación previa cuando sea posible</li>
            <li>Los datos se eliminarán según nuestra política de retención</li>
            <li>Las obligaciones financieras pendientes deben resolverse</li>
          </ul>
        </>
      )
    },
    {
      title: "Ley Aplicable y Jurisdicción",
      content: (
        <>
          <p>Estos términos se rigen por las leyes de República Dominicana y cualquier disputa será resuelta en las cortes competentes del país.</p>
          <ul>
            <li>Ley aplicable: República Dominicana</li>
            <li>Jurisdicción: Tribunales de Santo Domingo</li>
            <li>Idioma oficial del acuerdo: Español</li>
            <li>Mediación preferida antes de litigio</li>
          </ul>
          <motion.div 
            className="terms-important-notice-telofundi"
            whileHover={isMobile ? {} : { scale: 1.01, y: -2 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            style={{
              ...(isMobile && {
                padding: '1rem',
                fontSize: '0.85rem'
              })
            }}
          >
            <div className="notice-title">
              <motion.svg 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                style={{width: isMobile ? 16 : 20, height: isMobile ? 16 : 20}}
                variants={variants.iconVariants}
                whileHover={isMobile ? {} : "hover"}
              >
                <path d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9z"/>
              </motion.svg>
              Marco Legal
            </div>
            <div className="notice-content">
              Operamos bajo el marco legal de República Dominicana, cumpliendo con todas las regulaciones locales e internacionales aplicables.
            </div>
          </motion.div>
        </>
      )
    }
  ], [isMobile, variants]);

  return (
    <div 
      style={{ 
        overflowX: 'hidden', 
        width: '100%', 
        maxWidth: '100vw',
        position: 'relative',
        minHeight: '100vh'
      }}
      className="terms-page-container"
    >
      {/* Scroll progress optimizado */}
      <motion.div
        className="scroll-progress"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: isMobile ? '2px' : '3px',
          background: 'linear-gradient(135deg, #D2421A 0%, #9E2B0E 100%)',
          zIndex: 1000,
          transformOrigin: '0%',
          scaleX: useTransform(scrollY, [0, document.body.scrollHeight - window.innerHeight], [0, 1])
        }}
      />

      {/* Hero Section con animaciones parallax optimizadas */}
      <motion.section 
        className="terms-hero-telofundi"
        style={{ 
          y: isMobile ? 0 : yTransform,
          minHeight: isMobile ? '60vh' : '100vh',
          padding: isMobile ? '2rem 0' : '0'
        }}
      >
        <motion.div 
          className="terms-hero-background-telofundi"
          style={{ opacity: opacityTransform }}
        ></motion.div>
        
        {/* Efectos visuales optimizados - solo en desktop */}
        {!isMobile && (
          <div className="terms-hero-shapes-telofundi">
            <div className="terms-shape-telofundi terms-shape-1"></div>
            <div className="terms-shape-telofundi terms-shape-2"></div>
            <div className="terms-shape-telofundi terms-shape-3"></div>
          </div>
        )}

        <motion.div 
          className="terms-hero-content-telofundi"
          initial={{ opacity: 0, y: isMobile ? 30 : 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: isMobile ? 0.4 : 0.6, delay: 0.2 }}
          style={{
            ...(isMobile && {
              padding: '0 1rem',
              textAlign: 'center'
            })
          }}
        >
          <motion.div 
            className="terms-hero-icon-telofundi"
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 300, damping: 20 }}
            whileHover={isMobile ? {} : {
              scale: 1.05,
              rotate: 5,
              transition: { duration: 0.2 }
            }}
            whileTap={{ scale: 0.95 }}
            style={{
              ...(isMobile && {
                width: '60px',
                height: '60px',
                margin: '0 auto 1rem'
              })
            }}
          >
            <svg 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1.5"
            >
              <path d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 18H3v-3.375c0-.621.504-1.125 1.125-1.125h14.25c.621 0 1.125.504 1.125 1.125v3.375H8.25zM8.25 9.75h4.5v4.5H8.25V9.75z"/>
            </svg>
          </motion.div>
          
          <motion.h1 
            className="terms-hero-title-telofundi"
            initial={{ opacity: 0, y: isMobile ? 20 : 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            style={{
              ...(isMobile && {
                fontSize: '2rem',
                lineHeight: '2.2rem',
                marginBottom: '1rem'
              }),
              ...(isTablet && {
                fontSize: '2.5rem'
              })
            }}
          >
            Términos y{' '}
            <span className="gradient-text">
              Condiciones
            </span>
          </motion.h1>
          
          <motion.p 
            className="terms-hero-subtitle-telofundi"
            initial={{ opacity: 0, y: isMobile ? 15 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            style={{
              ...(isMobile && {
                fontSize: '0.9rem',
                lineHeight: '1.4',
                maxWidth: '100%',
                marginBottom: '1.5rem'
              })
            }}
          >
            {isMobile ? 
              "Condiciones que rigen el uso de TeloFundi para garantizar un entorno seguro y profesional." :
              "Estas condiciones rigen el uso de la plataforma TeloFundi y establecen las responsabilidades tanto de los usuarios como de la plataforma para garantizar un entorno seguro y profesional."
            }
          </motion.p>

          <motion.div 
            className="terms-hero-update-telofundi"
            initial={{ opacity: 0, y: isMobile ? 10 : 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            whileHover={isMobile ? {} : { 
              scale: 1.02,
              transition: { duration: 0.2 }
            }}
            whileTap={{ scale: 0.98 }}
            style={{
              ...(isMobile && {
                fontSize: '0.8rem',
                padding: '0.5rem 1rem'
              })
            }}
          >
            <svg 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              style={{width: isMobile ? 14 : 16, height: isMobile ? 14 : 16}}
            >
              <path d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
            </svg>
            Última actualización: Enero 2025
          </motion.div>
        </motion.div>
      </motion.section>

      {/* Terms Content Section con animaciones optimizadas */}
      <AnimatedSection isMobile={isMobile}>
        <section 
          className="terms-content-telofundi"
          style={{
            ...(isMobile && {
              padding: '2rem 0'
            })
          }}
        >
          <div 
            className="container-telofundi"
            style={{
              width: '100%',
              maxWidth: isMobile ? '100%' : '1200px',
              margin: '0 auto',
              boxSizing: 'border-box',
              ...(isMobile && {
                paddingLeft: '1rem',
                paddingRight: '1rem'
              })
            }}
          >
            <motion.div 
              className="terms-content-header-telofundi"
              variants={variants.containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: isMobile ? 0.1 : 0.3 }}
              style={{
                ...(isMobile && {
                  textAlign: 'center',
                  marginBottom: '2rem'
                })
              }}
            >
              <motion.div 
                className="terms-section-badge-telofundi"
                variants={variants.itemVariants}
                whileHover={isMobile ? {} : { 
                  scale: 1.02,
                  transition: { duration: 0.2 }
                }}
                style={{
                  ...(isMobile && {
                    fontSize: '0.8rem',
                    padding: '0.5rem 1rem'
                  })
                }}
              >
                <span>Marco Legal</span>
              </motion.div>
              <motion.h2 
                variants={variants.itemVariants}
                style={{
                  ...(isMobile && {
                    fontSize: '1.8rem',
                    marginBottom: '1rem'
                  }),
                  ...(isTablet && {
                    fontSize: '2.2rem'
                  })
                }}
              >
                Condiciones de Uso
              </motion.h2>
              <motion.p 
                variants={variants.itemVariants}
                style={{
                  ...(isMobile && {
                    fontSize: '0.9rem',
                    lineHeight: '1.4'
                  })
                }}
              >
                {isMobile ?
                  "Términos y condiciones que rigen el uso de TeloFundi para servicios de acompañamiento premium." :
                  "El siguiente documento establece los términos y condiciones que rigen el uso de TeloFundi, una plataforma digital para servicios de acompañamiento premium para adultos."
                }
              </motion.p>
            </motion.div>

            <motion.div 
              className="terms-timeline-telofundi"
              variants={variants.containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.1 }}
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: '100%',
                ...(isMobile && {
                  paddingLeft: '0',
                  paddingRight: '0'
                })
              }}
            >
              {/* Timeline line - oculta completamente para evitar problemas de posicionamiento */}
              {false && (
                <motion.div 
                  className="terms-timeline-line-telofundi"
                  initial={{ scaleY: 0 }}
                  whileInView={{ scaleY: 1 }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  viewport={{ once: true }}
                />
              )}
              
              {termsData.map((term, index) => (
                <motion.div 
                  key={index}
                  className="terms-timeline-item-telofundi"
                  variants={variants.itemVariants} // Usar la misma variante para todos
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: isMobile ? 0.1 : 0.3 }}
                  transition={{ delay: index * (isMobile ? 0.02 : 0.05) }}
                  style={{
                    width: '100%',
                    marginBottom: '2rem',
                    display: 'flex',
                    justifyContent: 'center', // Centrar todos los elementos
                    alignItems: 'center'
                  }}
                >
                  <motion.div 
                    className="terms-timeline-content-telofundi"
                    variants={variants.cardHoverVariants}
                    whileHover={isMobile ? {} : "hover"}
                    whileTap={{ scale: isMobile ? 0.98 : 0.99 }}
                    style={{
                      width: '100%',
                      maxWidth: isMobile ? '100%' : '600px', // Ancho máximo consistente
                      boxSizing: 'border-box',
                      margin: '0 auto', // Centrar siempre
                      padding: '1.5rem'
                    }}
                  >
                    <motion.div 
                      className="terms-timeline-number-telofundi"
                      initial={{ opacity: 0, x: isMobile ? 0 : -15 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * (isMobile ? 0.02 : 0.05) + 0.1 }}
                      style={{
                        ...(isMobile && {
                          fontSize: '0.8rem',
                          marginBottom: '0.5rem'
                        })
                      }}
                    >
                      <svg 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="1.5" 
                        style={{width: isMobile ? 16 : 20, height: isMobile ? 16 : 20}}
                      >
                        <path d="M9 12l2 2 4-4"/>
                        <path d="M21 12c.552 0 1-.448 1-1V8c0-.552-.448-1-1-1s-1 .448-1 1v3c0 .552.448 1 1 1z"/>
                      </svg>
                      Artículo {index + 1}
                    </motion.div>
                    
                    <motion.h3
                      initial={{ opacity: 0, y: 8 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * (isMobile ? 0.02 : 0.05) + 0.15 }}
                      style={{
                        ...(isMobile && {
                          fontSize: '1.1rem',
                          marginBottom: '0.75rem'
                        })
                      }}
                    >
                      {term.title}
                    </motion.h3>
                    
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * (isMobile ? 0.02 : 0.05) + 0.2 }}
                      style={{
                        width: '100%',
                        maxWidth: '100%',
                        wordWrap: 'break-word',
                        overflowWrap: 'break-word',
                        ...(isMobile && {
                          fontSize: '0.85rem',
                          lineHeight: '1.5'
                        })
                      }}
                    >
                      {term.content}
                    </motion.div>
                  </motion.div>
                  
                  {/* Timeline dot - oculto para simplificar layout */}
                  {false && (
                    <motion.div 
                      className="terms-timeline-dot-telofundi"
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      transition={{ 
                        delay: index * 0.05 + 0.25, 
                        type: "spring", 
                        stiffness: 400,
                        damping: 25 
                      }}
                      whileHover={{ 
                        scale: 1.2,
                        transition: { duration: 0.2 }
                      }}
                    />
                  )}
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      </AnimatedSection>

      {/* Scroll to top button optimizado */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            className="scroll-to-top visible"
            onClick={scrollToTop}
            initial={{ opacity: 0, scale: 0, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0, y: 50 }}
            whileHover={isMobile ? {} : { 
              scale: 1.05, 
              y: -3,
              transition: { duration: 0.2 }
            }}
            whileTap={{ scale: 0.95 }}
            transition={{ 
              type: "spring", 
              stiffness: 400, 
              damping: 25 
            }}
            style={{
              position: 'fixed',
              bottom: isMobile ? '1rem' : '2rem',
              right: isMobile ? '1rem' : '2rem',
              width: isMobile ? '48px' : '56px',
              height: isMobile ? '48px' : '56px',
              background: 'linear-gradient(135deg, #D2421A 0%, #9E2B0E 100%)',
              border: 'none',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 1000,
              color: 'white',
              boxShadow: isMobile ? 
                '0 4px 12px rgba(210, 66, 26, 0.3)' : 
                '0 8px 25px rgba(210, 66, 26, 0.3)'
            }}
          >
            <svg 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1.5"
              style={{
                width: isMobile ? '20px' : '24px',
                height: isMobile ? '20px' : '24px'
              }}
            >
              <path d="M7 14l5-5 5 5"/>
            </svg>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TermsPage;