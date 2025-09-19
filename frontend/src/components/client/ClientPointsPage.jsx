import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Coins, Gift, ShoppingCart, Star, Zap, Target, TrendingUp, Award, ChevronRight,
  CreditCard, X, MessageCircle, Eye, Clock, Check,
  AlertCircle, Loader, CheckCircle, Sparkles, Crown, Heart, Plus, Shield,
  Lock, RefreshCw, Calendar, Info, Infinity, Timer, Flame
} from 'lucide-react';

// Mock data for demonstration
const mockUser = {
  client: {
    points: 127,
    isPremium: false,
    dailyLoginStreak: 3
  }
};

const mockPackages = [
  { id: 1, points: 50, price: 1.00, bonus: 0, isPopular: false },
  { id: 2, points: 100, price: 1.00, bonus: 15, isPopular: true },
  { id: 3, points: 250, price: 2.50, bonus: 35, isPopular: false },
  { id: 4, points: 500, price: 5.00, bonus: 100, isPopular: false }
];

const ClientPointsPage = () => {
  const [user] = useState(mockUser);
  const [packages] = useState(mockPackages);
  
  // Estados del componente
  const [pointsData, setPointsData] = useState({ currentBalance: 127 });
  const [dailyStatus, setDailyStatus] = useState({ eligible: true });
  const [streakInfo, setStreakInfo] = useState({ currentStreak: 3 });
  const [pointsConfig, setPointsConfig] = useState({ dailyLogin: { basePoints: 5 } });
  
  // Estados UI
  const [activeTab, setActiveTab] = useState('earn');
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Estado responsive dinámico
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleDailyLogin = async () => {
    if (!dailyStatus?.eligible) {
      setError('Ya has reclamado los puntos de hoy');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setPointsData(prev => ({ ...prev, currentBalance: prev.currentBalance + 5 }));
      setDailyStatus({ eligible: false });
      setSuccessMessage('¡Has ganado 5 TeloPoints!');
      setShowSuccessModal(true);
      setLoading(false);
    }, 1500);
  };

  const handleUsePoints = async (action) => {
    if (!pointsData || pointsData.currentBalance < action.cost) {
      setError('No tienes suficientes TeloPoints');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setPointsData(prev => ({ ...prev, currentBalance: prev.currentBalance - action.cost }));
      setSuccessMessage(`¡${action.title} activado!`);
      setShowSuccessModal(true);
      setLoading(false);
    }, 1500);
  };

  const handlePurchase = (pkg) => {
    setSelectedPackage(pkg);
    setTimeout(() => {
      setPointsData(prev => ({ 
        ...prev, 
        currentBalance: prev.currentBalance + pkg.points + (pkg.bonus || 0)
      }));
      setSelectedPackage(null);
      setSuccessMessage(`¡${(pkg.points + (pkg.bonus || 0)).toLocaleString()} TeloPoints añadidos!`);
      setShowSuccessModal(true);
    }, 2000);
  };

  // Premium actions
  const premiumActions = [
    {
      id: 'premium_1_day',
      title: '1 Día Premium',
      cost: 25,
      duration: '24 horas',
      popular: false
    },
    {
      id: 'premium_3_days', 
      title: '3 Días Premium',
      cost: 60,
      duration: '3 días',
      popular: true
    },
    {
      id: 'premium_1_week',
      title: '1 Semana Premium', 
      cost: 120,
      duration: '7 días',
      popular: false
    },
    {
      id: 'premium_1_month',
      title: '1 Mes Premium',
      cost: 400,
      duration: '30 días',
      bestValue: true
    }
  ];

  const otherActions = [
    {
      id: 'chat_priority',
      title: 'Chat Prioritario',
      description: 'Aparece primero en conversaciones',
      cost: 10,
      duration: '24h'
    }
  ];

  // Modal components
  const SuccessModal = () => ReactDOM.createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={() => setShowSuccessModal(false)}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0, 0, 0, 0.75)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: 99999,
        padding: '1rem'
      }}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white', borderRadius: '20px', padding: '2rem',
          textAlign: 'center', maxWidth: '320px', width: '100%',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
        }}
      >
        <div style={{
          background: '#10B981', borderRadius: '50%',
          width: '60px', height: '60px', margin: '0 auto 1.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <CheckCircle size={30} color="white" />
        </div>
        
        <h2 style={{ color: '#1F2937', margin: '0 0 1rem 0', fontSize: '1.4rem', fontWeight: '600' }}>
          ¡Perfecto!
        </h2>
        <p style={{ color: '#6B7280', margin: '0 0 2rem 0', fontSize: '0.95rem' }}>
          {successMessage}
        </p>
        
        <button
          onClick={() => setShowSuccessModal(false)}
          style={{
            padding: '12px 24px', background: '#10B981', border: 'none',
            borderRadius: '12px', color: 'white', fontWeight: '600',
            cursor: 'pointer', fontSize: '0.95rem', width: '100%'
          }}
        >
          Continuar
        </button>
      </motion.div>
    </motion.div>,
    document.body
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: '#000000',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <style jsx>{`
        @media (min-width: 769px) {
          .premium-container {
            max-width: 600px;
            margin: 0 auto;
          }
          .premium-card {
            min-height: 160px !important;
          }
          .premium-crown {
            font-size: 2.4rem !important;
          }
          .premium-text {
            font-size: 1.8rem !important;
          }
          .premium-button {
            padding: 0.5rem 0.9rem !important;
            font-size: 0.95rem !important;
          }
          .telopoints-container {
            max-width: 700px;
            margin: 0 auto;
          }
          .telopoints-card {
            min-height: 160px !important;
          }
          .section-padding {
            padding: 1.8rem !important;
          }
        }
      `}</style>

      {/* Header */}
      <div style={{
        background: '#1a1a1a',
        padding: isMobile ? '2rem 1.5rem' : '2.5rem 2rem',
        borderBottom: '1px solid #333',
        textAlign: 'center'
      }}>
        <h1 style={{
          margin: '0 0 1rem 0',
          fontSize: isMobile ? '1.75rem' : '2.2rem',
          fontWeight: '700',
          color: '#ffffff'
        }}>
          TeloPoints
        </h1>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          marginBottom: '0.5rem'
        }}>
          <Coins size={isMobile ? 24 : 28} color="#F59E0B" />
          <span style={{
            fontSize: isMobile ? '2rem' : '2.5rem',
            fontWeight: '700',
            color: '#F59E0B'
          }}>
            {pointsData.currentBalance}
          </span>
        </div>
        
        <p style={{
          margin: 0,
          color: '#9CA3AF',
          fontSize: isMobile ? '0.95rem' : '1.1rem'
        }}>
          Puntos disponibles
        </p>
      </div>

      {/* Content */}
      <div style={{ 
        padding: isMobile ? '1.5rem' : '2rem',
        maxWidth: isMobile ? 'none' : '900px',
        margin: isMobile ? '0' : '0 auto'
      }}>
        
        {/* Earn Points Section */}
        <div style={{ marginBottom: isMobile ? '2rem' : '3rem' }}>
          <h2 style={{
            fontSize: isMobile ? '1.1rem' : '1.5rem',
            fontWeight: '600',
            color: '#ffffff',
            marginBottom: isMobile ? '1rem' : '2rem'
          }}>
            Ganar Gratis
          </h2>
          
          <div style={{ 
            display: 'flex', 
            flexDirection: isMobile ? 'column' : 'row', 
            gap: isMobile ? '0.75rem' : '1.5rem' 
          }}>
            <motion.div
              whileTap={{ scale: 0.98 }}
              onClick={handleDailyLogin}
              style={{
                background: '#1a1a1a',
                borderRadius: '16px',
                padding: isMobile ? '1.25rem' : '2rem',
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? '1rem' : '1.5rem',
                border: '1px solid #333',
                cursor: dailyStatus?.eligible && !loading ? 'pointer' : 'default',
                opacity: dailyStatus?.eligible && !loading ? 1 : 0.6,
                flex: 1
              }}
            >
              <div style={{
                background: '#1e3a8a20',
                borderRadius: '12px',
                width: isMobile ? '48px' : '60px',
                height: isMobile ? '48px' : '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Gift size={isMobile ? 20 : 24} color="#3B82F6" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontSize: isMobile ? '1rem' : '1.3rem', 
                  fontWeight: '600', 
                  color: '#ffffff', 
                  marginBottom: '0.25rem' 
                }}>
                  Login Diario
                </div>
                <div style={{ 
                  color: '#9CA3AF', 
                  fontSize: isMobile ? '0.85rem' : '1rem' 
                }}>
                  +5 TeloPoints por día
                </div>
              </div>
              <button
                disabled={!dailyStatus?.eligible || loading}
                style={{
                  background: dailyStatus?.eligible && !loading ? '#3B82F6' : '#333',
                  border: 'none',
                  borderRadius: '8px',
                  padding: isMobile ? '8px 16px' : '12px 24px',
                  color: dailyStatus?.eligible && !loading ? 'white' : '#666',
                  fontWeight: '600',
                  fontSize: isMobile ? '0.85rem' : '1rem',
                  cursor: dailyStatus?.eligible && !loading ? 'pointer' : 'not-allowed'
                }}
              >
                {loading ? '...' : dailyStatus?.eligible ? 'Obtener' : 'Obtenido'}
              </button>
            </motion.div>
          </div>
        </div>

        {/* Premium Section */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #FF6B47, #FF8E53)',
            color: 'white',
            padding: '0.75rem 1rem',
            borderRadius: '12px 12px 0 0',
            fontSize: '0.9rem',
            fontWeight: '700',
            textAlign: 'center',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            PREMIUM
          </div>
          
          <div className="premium-container" style={{
            background: '#1a1a1a',
            borderRadius: '0 0 12px 12px',
            padding: '1rem',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.75rem'
          }}>
            {/* Premium 1D */}
            <motion.div
              whileTap={{ scale: 0.95 }}
              onClick={() => handleUsePoints({ id: 'premium_1d', title: 'Premium 1D', cost: 25 })}
              className="premium-card"
              style={{
                background: 'linear-gradient(135deg, #FF6B47, #FF8E53)',
                borderRadius: '16px',
                padding: '1.5rem 1rem 1rem',
                textAlign: 'center',
                cursor: 'pointer',
                color: 'white',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minHeight: '140px',
                aspectRatio: '1'
              }}
            >
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginBottom: 'auto'
              }}>
                <div className="premium-crown" style={{ 
                  fontSize: '2.2rem', 
                  marginBottom: '0.5rem', 
                  lineHeight: '1' 
                }}>👑</div>
                <div className="premium-text" style={{ 
                  fontSize: '1.6rem', 
                  fontWeight: '700', 
                  lineHeight: '1' 
                }}>1D</div>
              </div>
              <div className="premium-button" style={{
                background: 'white',
                borderRadius: '20px',
                padding: '0.4rem 0.8rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.3rem',
                fontSize: '0.9rem',
                fontWeight: '700',
                color: '#FF6B47',
                width: '70%',
                marginTop: 'auto'
              }}>
                <Coins size={14} color="#FF6B47" />
                25
              </div>
            </motion.div>

            {/* Premium 3D */}
            <motion.div
              whileTap={{ scale: 0.95 }}
              onClick={() => handleUsePoints({ id: 'premium_3d', title: 'Premium 3D', cost: 60 })}
              className="premium-card"
              style={{
                background: 'linear-gradient(135deg, #FF6B47, #FF8E53)',
                borderRadius: '16px',
                padding: '1.5rem 1rem 1rem',
                textAlign: 'center',
                cursor: 'pointer',
                color: 'white',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minHeight: '140px',
                aspectRatio: '1'
              }}
            >
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginBottom: 'auto'
              }}>
                <div className="premium-crown" style={{ 
                  fontSize: '2.2rem', 
                  marginBottom: '0.5rem', 
                  lineHeight: '1' 
                }}>👑</div>
                <div className="premium-text" style={{ 
                  fontSize: '1.6rem', 
                  fontWeight: '700', 
                  lineHeight: '1' 
                }}>3D</div>
              </div>
              <div className="premium-button" style={{
                background: 'white',
                borderRadius: '20px',
                padding: '0.4rem 0.8rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.3rem',
                fontSize: '0.9rem',
                fontWeight: '700',
                color: '#FF6B47',
                width: '70%',
                marginTop: 'auto'
              }}>
                <Coins size={14} color="#FF6B47" />
                60
              </div>
            </motion.div>

            {/* Premium 1S */}
            <motion.div
              whileTap={{ scale: 0.95 }}
              onClick={() => handleUsePoints({ id: 'premium_1s', title: 'Premium 1S', cost: 120 })}
              className="premium-card"
              style={{
                background: 'linear-gradient(135deg, #FF6B47, #FF8E53)',
                borderRadius: '16px',
                padding: '1.5rem 1rem 1rem',
                textAlign: 'center',
                cursor: 'pointer',
                color: 'white',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minHeight: '140px',
                aspectRatio: '1'
              }}
            >
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginBottom: 'auto'
              }}>
                <div className="premium-crown" style={{ 
                  fontSize: '2.2rem', 
                  marginBottom: '0.5rem', 
                  lineHeight: '1' 
                }}>👑</div>
                <div className="premium-text" style={{ 
                  fontSize: '1.6rem', 
                  fontWeight: '700', 
                  lineHeight: '1' 
                }}>1S</div>
              </div>
              <div className="premium-button" style={{
                background: 'white',
                borderRadius: '20px',
                padding: '0.4rem 0.8rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.3rem',
                fontSize: '0.9rem',
                fontWeight: '700',
                color: '#FF6B47',
                width: '70%',
                marginTop: 'auto'
              }}>
                <Coins size={14} color="#FF6B47" />
                120
              </div>
            </motion.div>

            {/* Premium 1M */}
            <motion.div
              whileTap={{ scale: 0.95 }}
              onClick={() => handleUsePoints({ id: 'premium_1m', title: 'Premium 1M', cost: 400 })}
              className="premium-card"
              style={{
                background: 'linear-gradient(135deg, #FF6B47, #FF8E53)',
                borderRadius: '16px',
                padding: '1.5rem 1rem 1rem',
                textAlign: 'center',
                cursor: 'pointer',
                color: 'white',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minHeight: '140px',
                aspectRatio: '1'
              }}
            >
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginBottom: 'auto'
              }}>
                <div className="premium-crown" style={{ 
                  fontSize: '2.2rem', 
                  marginBottom: '0.5rem', 
                  lineHeight: '1' 
                }}>👑</div>
                <div className="premium-text" style={{ 
                  fontSize: '1.6rem', 
                  fontWeight: '700', 
                  lineHeight: '1' 
                }}>1M</div>
              </div>
              <div className="premium-button" style={{
                background: 'white',
                borderRadius: '20px',
                padding: '0.4rem 0.8rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.3rem',
                fontSize: '0.9rem',
                fontWeight: '700',
                color: '#FF6B47',
                width: '70%',
                marginTop: 'auto'
              }}>
                <Coins size={14} color="#FF6B47" />
                400
              </div>
            </motion.div>
          </div>
        </div>

        {/* TeloPoints Purchase Section */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #4C63D2, #5A67D8)',
            color: 'white',
            padding: '0.75rem 1rem',
            borderRadius: '12px 12px 0 0',
            fontSize: '0.9rem',
            fontWeight: '700',
            textAlign: 'center',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            TELOPOINTS
          </div>
          
          <div className="telopoints-container section-padding" style={{
            background: '#1a1a1a',
            borderRadius: '0 0 12px 12px',
            padding: '1rem',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.75rem'
          }}>
            {/* 50 TeloPoints */}
            <motion.div
              whileTap={{ scale: 0.95 }}
              onClick={() => handlePurchase({ id: 1, points: 50, price: 1.00, bonus: 0 })}
              className="telopoints-card"
              style={{
                background: 'linear-gradient(135deg, #4C63D2, #5A67D8)',
                borderRadius: '16px',
                padding: '1.5rem 1rem',
                textAlign: 'center',
                cursor: 'pointer',
                color: 'white',
                position: 'relative',
                minHeight: '140px'
              }}
            >
              <div style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>
                <Coins size={28} />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#FFD700', marginBottom: '0.5rem' }}>
                50
              </div>
              <div style={{ fontSize: '1rem', fontWeight: '700' }}>
                US$ 1.00
              </div>
            </motion.div>

            {/* 100 TeloPoints + 15 bonus */}
            <motion.div
              whileTap={{ scale: 0.95 }}
              onClick={() => handlePurchase({ id: 2, points: 100, price: 1.00, bonus: 15 })}
              className="telopoints-card"
              style={{
                background: 'linear-gradient(135deg, #4C63D2, #5A67D8)',
                borderRadius: '16px',
                padding: '1.5rem 1rem',
                textAlign: 'center',
                cursor: 'pointer',
                color: 'white',
                position: 'relative',
                minHeight: '140px'
              }}
            >
              {/* Popular Badge */}
              <div style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                background: '#FF6B47',
                color: 'white',
                fontSize: '0.7rem',
                padding: '2px 6px',
                borderRadius: '8px',
                fontWeight: '700',
                textTransform: 'uppercase'
              }}>
                Popular
              </div>
              
              <div style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>
                <Coins size={28} />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#FFD700', marginBottom: '0.2rem' }}>
                100
              </div>
              <div style={{ fontSize: '0.7rem', color: '#4ECDC4', fontWeight: '600', marginBottom: '0.3rem' }}>
                +15 bonus
              </div>
              <div style={{ fontSize: '1rem', fontWeight: '700' }}>
                US$ 1.00
              </div>
            </motion.div>

            {/* 250 TeloPoints + 35 bonus */}
            <motion.div
              whileTap={{ scale: 0.95 }}
              onClick={() => handlePurchase({ id: 3, points: 250, price: 2.50, bonus: 35 })}
              className="telopoints-card"
              style={{
                background: 'linear-gradient(135deg, #4C63D2, #5A67D8)',
                borderRadius: '16px',
                padding: '1.5rem 1rem',
                textAlign: 'center',
                cursor: 'pointer',
                color: 'white',
                position: 'relative',
                minHeight: '140px'
              }}
            >
              <div style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>
                <Coins size={28} />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#FFD700', marginBottom: '0.2rem' }}>
                250
              </div>
              <div style={{ fontSize: '0.7rem', color: '#4ECDC4', fontWeight: '600', marginBottom: '0.3rem' }}>
                +35 bonus
              </div>
              <div style={{ fontSize: '1rem', fontWeight: '700' }}>
                US$ 2.50
              </div>
            </motion.div>

            {/* 500 TeloPoints + 100 bonus */}
            <motion.div
              whileTap={{ scale: 0.95 }}
              onClick={() => handlePurchase({ id: 4, points: 500, price: 5.00, bonus: 100 })}
              className="telopoints-card"
              style={{
                background: 'linear-gradient(135deg, #4C63D2, #5A67D8)',
                borderRadius: '16px',
                padding: '1.5rem 1rem',
                textAlign: 'center',
                cursor: 'pointer',
                color: 'white',
                position: 'relative',
                minHeight: '140px'
              }}
            >
              <div style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>
                <Coins size={28} />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#FFD700', marginBottom: '0.2rem' }}>
                500
              </div>
              <div style={{ fontSize: '0.7rem', color: '#4ECDC4', fontWeight: '600', marginBottom: '0.3rem' }}>
                +100 bonus
              </div>
              <div style={{ fontSize: '1rem', fontWeight: '700' }}>
                US$ 5.00
              </div>
            </motion.div>
          </div>
        </div>

        {/* Extras Section */}
        <div>
          <div style={{
            background: 'linear-gradient(135deg, #4ECDC4, #44B3A7)',
            color: 'white',
            padding: '0.75rem 1rem',
            borderRadius: '12px 12px 0 0',
            fontSize: '0.9rem',
            fontWeight: '700',
            textAlign: 'center',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            EXTRAS
          </div>
          
          <div style={{
            background: '#1a1a1a',
            borderRadius: '0 0 12px 12px',
            padding: '0'
          }}>
            <motion.div
              whileTap={{ scale: 0.98 }}
              onClick={() => handleUsePoints({ id: 'chat_priority', title: 'Chat prioritario', cost: 10 })}
              style={{
                background: 'linear-gradient(135deg, #4ECDC4, #44B3A7)',
                borderRadius: '0 0 12px 12px',
                padding: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                cursor: 'pointer',
                color: 'white'
              }}
            >
              <div style={{
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '8px',
                width: '48px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem'
              }}>
                📝
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.2rem' }}>
                  Chat prioritario
                </div>
                <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                  Aparece primero en conversaciones
                </div>
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '20px',
                padding: '0.4rem 0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: '0.85rem',
                fontWeight: '600'
              }}>
                <Coins size={14} />
                10
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Purchase Loading */}
      {selectedPackage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
        >
          <div style={{
            background: '#1a1a1a',
            borderRadius: '20px',
            padding: '2rem',
            textAlign: 'center',
            maxWidth: '300px',
            border: '1px solid #333'
          }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              style={{
                width: '40px',
                height: '40px',
                border: '3px solid #333',
                borderTop: '3px solid #3B82F6',
                borderRadius: '50%',
                margin: '0 auto 1rem'
              }}
            />
            <p style={{ color: '#ffffff', margin: 0, fontWeight: '500' }}>
              Procesando compra...
            </p>
          </div>
        </motion.div>
      )}

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            style={{
              position: 'fixed',
              bottom: '1.5rem',
              left: '1rem',
              right: '1rem',
              background: '#1F2937',
              color: '#DC2626',
              padding: '1rem',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              zIndex: 1000,
              border: '1px solid #DC2626'
            }}
          >
            <AlertCircle size={18} />
            <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: '500' }}>{error}</span>
            <button
              onClick={() => setError(null)}
              style={{
                background: 'none',
                border: 'none',
                color: '#DC2626',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && <SuccessModal />}
      </AnimatePresence>
    </div>
  );
};

export default ClientPointsPage;