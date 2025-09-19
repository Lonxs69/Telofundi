import React, { useState } from 'react';
import './Footer.css';

// Importar el logo
import logoImage from '../../assets/images/logo png mejora.png';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  // Hook para detectar dispositivo móvil
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSocialClick = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const socialLinks = [
    { 
      name: 'Instagram', 
      className: 'instagram',
      icon: (
        <svg viewBox="0 0 24 24" fill="white">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
      ),
      url: 'https://instagram.com/telofundi'
    },
    { 
      name: 'TikTok', 
      className: 'tiktok',
      icon: (
        <svg viewBox="0 0 24 24" fill="white">
          <path d="M19.321 5.562a5.124 5.124 0 0 1-.443-.258 6.228 6.228 0 0 1-1.137-.966c-.849-.849-1.294-1.95-1.294-3.197V.8h-3.82v13.723c0 .433-.087.852-.246 1.233-.158.382-.39.724-.68 1.014-.29.29-.632.523-1.014.681a3.22 3.22 0 0 1-1.233.246c-.866 0-1.67-.337-2.277-.944-.607-.608-.943-1.411-.943-2.277s.336-1.669.943-2.277c.608-.607 1.411-.943 2.277-.943.223 0 .441.023.652.067v-3.853c-.21-.03-.423-.045-.639-.045-1.87 0-3.631.729-4.958 2.056-1.327 1.327-2.056 3.088-2.056 4.958s.729 3.631 2.056 4.958c1.327 1.327 3.088 2.056 4.958 2.056s3.631-.729 4.958-2.056c1.327-1.327 2.056-3.088 2.056-4.958V7.563a9.054 9.054 0 0 0 5.348 1.709V5.807a5.124 5.124 0 0 1-1.027-.245z"/>
        </svg>
      ),
      url: 'https://tiktok.com/@telofundi'
    },
    { 
      name: 'Gmail', 
      className: 'gmail',
      icon: (
        <svg viewBox="0 0 24 24" fill="white">
          <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
        </svg>
      ),
      url: 'mailto:contacto@telofundi.com'
    },
    { 
      name: 'Telegram', 
      className: 'telegram',
      icon: (
        <svg viewBox="0 0 24 24" fill="white">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
      ),
      url: 'https://t.me/telofundi'
    },
    { 
      name: 'Twitter/X', 
      className: 'twitter',
      icon: (
        <svg viewBox="0 0 24 24" fill="white">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
      url: 'https://x.com/telofundi'
    }
  ];

  const securityBadges = [
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <path d="M9 12l2 2 4-4"/>
        </svg>
      ),
      label: 'Sitio Seguro',
      className: 'security-badge-telofundi'
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <path d="M9 12l2 2 4-4"/>
        </svg>
      ),
      label: 'Verificado',
      className: 'verification-badge-telofundi'
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <circle cx="12" cy="16" r="1"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      ),
      label: 'Privacidad',
      className: 'privacy-badge-telofundi'
    }
  ];

  // Estilos responsivos simplificados
  const responsiveStyles = {
    footerContainer: {
      padding: isMobile ? '3rem 1rem' : '4rem 2rem',
      maxWidth: '1200px',
      margin: '0 auto',
      textAlign: 'center'
    },
    footerMain: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: isMobile ? '2rem' : '3rem',
      marginBottom: isMobile ? '2rem' : '3rem'
    },
    footerBrand: {
      textAlign: 'center'
    },
    logoContainer: {
      width: isMobile ? '200px' : '250px',
      height: isMobile ? '200px' : '250px',
      margin: '0 auto'
    },
    socialSection: {
      textAlign: 'center'
    },
    socialTitle: {
      fontSize: isMobile ? '1.1rem' : '1.3rem',
      fontWeight: '600',
      color: 'white',
      marginBottom: isMobile ? '1rem' : '1.5rem',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    socialLinks: {
      display: 'flex',
      gap: isMobile ? '1rem' : '1.5rem',
      justifyContent: 'center',
      flexWrap: 'wrap'
    },
    footerBottom: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: isMobile ? '1rem' : '0',
      paddingTop: isMobile ? '1.5rem' : '2rem',
      borderTop: '1px solid rgba(255, 255, 255, 0.1)'
    },
    footerBottomLeft: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: 'center',
      gap: isMobile ? '1rem' : '2rem'
    },
    copyright: {
      color: 'rgba(255, 255, 255, 0.6)',
      fontSize: isMobile ? '0.8rem' : '0.9rem',
      margin: 0,
      textAlign: 'center'
    },
    footerBadges: {
      display: 'flex',
      gap: isMobile ? '0.5rem' : '1rem',
      flexWrap: 'wrap',
      justifyContent: 'center'
    },
    footerVersion: {
      color: 'rgba(255, 255, 255, 0.5)',
      fontSize: isMobile ? '0.7rem' : '0.8rem',
      fontFamily: 'monospace'
    },
    footerDisclaimer: {
      marginTop: isMobile ? '1.5rem' : '2rem',
      padding: isMobile ? '1rem' : '1.5rem',
      background: 'rgba(255, 255, 255, 0.03)',
      borderRadius: '8px',
      border: '1px solid rgba(255, 255, 255, 0.05)'
    },
    disclaimerText: {
      color: 'rgba(255, 255, 255, 0.7)',
      fontSize: isMobile ? '0.75rem' : '0.85rem',
      lineHeight: '1.5',
      margin: 0,
      textAlign: 'center'
    }
  };

  return (
    <footer 
      className="footer-telofundi"
      style={{
        background: 'linear-gradient(135deg, var(--black-primary) 0%, var(--black-secondary) 100%)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        marginTop: '0'
      }}
    >
      <div style={responsiveStyles.footerContainer}>
        {/* Contenido Principal del Footer */}
        <div style={responsiveStyles.footerMain}>
          {/* Logo Grande */}
          <div style={responsiveStyles.footerBrand}>
            <div 
              className="footer-logo-telofundi"
              style={responsiveStyles.logoContainer}
            >
              <img 
                src={logoImage} 
                alt="TeloFundi Logo" 
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain'
                }}
              />
            </div>
          </div>

          {/* Redes Sociales */}
          <div style={responsiveStyles.socialSection}>
            <h4 style={responsiveStyles.socialTitle}>Síguenos</h4>
            <div style={responsiveStyles.socialLinks}>
              {socialLinks.map((social, index) => (
                <button
                  key={index}
                  className={`social-link-telofundi ${social.className}`}
                  onClick={() => handleSocialClick(social.url)}
                  title={`Síguenos en ${social.name}`}
                  style={{
                    width: isMobile ? '50px' : '60px',
                    height: isMobile ? '50px' : '60px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    transform: 'scale(1)',
                  }}
                  onMouseOver={(e) => {
                    e.target.style.transform = 'scale(1.1)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = 'scale(1)';
                  }}
                >
                  <div className="social-icon-wrapper">
                    {social.icon}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div style={responsiveStyles.footerBottom}>
          <div style={responsiveStyles.footerBottomLeft}>
            <p style={responsiveStyles.copyright}>
              © {currentYear} TeloFundi. Todos los derechos reservados.
            </p>
            <div style={responsiveStyles.footerBadges}>
              {securityBadges.map((badge, index) => (
                <span 
                  key={index} 
                  className={`footer-badge-telofundi ${badge.className}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: isMobile ? '0.25rem 0.5rem' : '0.3rem 0.75rem',
                    borderRadius: '20px',
                    fontSize: isMobile ? '0.7rem' : '0.8rem'
                  }}
                >
                  <div style={{ width: '14px', height: '14px' }}>
                    {badge.icon}
                  </div>
                  {badge.label}
                </span>
              ))}
            </div>
          </div>

          <div style={responsiveStyles.footerVersion}>
            v2.5.0
          </div>
        </div>

        {/* Aviso Legal */}
        <div style={responsiveStyles.footerDisclaimer}>
          <p style={responsiveStyles.disclaimerText}>
            <strong>Aviso Legal:</strong> TeloFundi es una plataforma exclusiva para mayores de 18 años. 
            Todos los usuarios deben verificar su identidad y cumplir con las leyes locales vigentes.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;