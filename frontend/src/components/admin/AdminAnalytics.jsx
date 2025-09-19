import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3,
  Users,
  DollarSign,
  Eye,
  Calendar,
  ArrowUp,
  ArrowDown,
  Loader,
  RefreshCw,
  AlertTriangle,
  Shield,
  MessageSquare,
  FileText
} from 'lucide-react';

// Importar API y contextos
import { useAuth } from '../../context/AuthContext';
import { adminAPI, handleApiError } from '../../utils/api';

import './AdminAnalytics.css';

const AdminAnalytics = () => {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState('current');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Estados para datos reales del backend
  const [metricsData, setMetricsData] = useState({
    users: {
      total: 0,
      escorts: 0,
      agencies: 0,
      clients: 0,
      admins: 0,
      active: 0,
      banned: 0,
      verifiedEscorts: 0,
      premiumClients: 0,
      emailVerified: 0
    },
    posts: {
      total: 0,
      newPosts: 0,
      totalViews: 0,
      avgViews: 0,
      totalLikes: 0,
      totalFavorites: 0
    },
    chat: {
      totalChats: 0,
      totalMessages: 0,
      unreadMessages: 0
    },
    payments: {
      totalRevenue: 0,
      totalTransactions: 0,
      byType: {},
      activeBoosts: 0
    },
    reports: {
      total: 0,
      pending: 0,
      resolved: 0,
      byReason: {}
    },
    engagement: {
      views: 0,
      likes: 0,
      chats: 0
    }
  });

  // Cargar métricas al montar el componente
  useEffect(() => {
    if (user && user.userType === 'ADMIN') {
      loadMetrics();
    }
  }, [user, timeRange]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📊 Cargando métricas del admin para período:', timeRange);

      const response = await adminAPI.getMetrics({
        period: timeRange,
        ...(timeRange === 'custom' && {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0]
        })
      });

      if (response.success && response.data) {
        console.log('✅ Métricas cargadas exitosamente:', response.data);
        setMetricsData(response.data.metrics);
      } else {
        throw new Error(response.message || 'Error cargando métricas');
      }

    } catch (error) {
      console.error('❌ Error cargando métricas:', error);
      setError(handleApiError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadMetrics();
      console.log('🔄 Métricas actualizadas exitosamente');
    } catch (error) {
      console.error('❌ Error actualizando métricas:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const timeRanges = [
    { id: 'current', label: 'Actual' },
    { id: 'today', label: 'Hoy' },
    { id: 'week', label: '7 días' },
    { id: 'month', label: '30 días' }
  ];

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const renderMetricCard = (title, value, subtitle, icon, color, isLoading = false) => (
    <motion.div
      className="analytics-metric-card"
      whileHover={{ y: -2, borderColor: 'rgba(220, 38, 38, 0.3)' }}
    >
      <div 
        className="metric-icon"
        style={{ background: color }}
      >
        {isLoading ? <Loader size={20} className="animate-spin" /> : icon}
      </div>
      <div className="metric-content">
        <h3 className="metric-value">
          {isLoading ? '...' : value}
        </h3>
        <p className="metric-title">{title}</p>
        {!isLoading && subtitle && (
          <div className="metric-subtitle">
            {subtitle}
          </div>
        )}
      </div>
    </motion.div>
  );

  if (loading && Object.keys(metricsData.users).every(key => metricsData.users[key] === 0)) {
    return (
      <div className="admin-analytics-page" style={{ background: '#000000' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '50vh',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <Loader className="animate-spin" size={32} color="#dc2626" />
          <p style={{ color: '#9ca3af' }}>Cargando analíticas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-analytics-page" style={{ background: '#000000' }}>
      {/* Hero Section */}
      <div className="analytics-hero" style={{ background: '#000000' }}>
        <div className="analytics-hero-content">
          <motion.div 
            className="analytics-header-card"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="header-card-main">
              <div className="header-card-info">
                <div className="analytics-icon-large">
                  <BarChart3 size={32} />
                </div>
                <div className="header-card-details">
                  <h1>Analíticas del Sistema</h1>
                  <p className="header-card-subtitle">
                    Estadísticas en tiempo real de la plataforma • Último actualizado: {new Date().toLocaleTimeString('es-ES')}
                    <motion.button
                      onClick={handleRefresh}
                      disabled={refreshing}
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        color: '#9ca3af',
                        cursor: refreshing ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.8rem'
                      }}
                      whileHover={!refreshing ? { scale: 1.05 } : {}}
                      whileTap={!refreshing ? { scale: 0.95 } : {}}
                    >
                      <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                      {refreshing ? 'Actualizando...' : 'Actualizar'}
                    </motion.button>
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '12px 16px',
            margin: '0 2rem 1rem',
            color: '#ef4444',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <AlertTriangle size={16} />
          {error}
        </motion.div>
      )}

      {/* Filtros de tiempo */}
      <div className="analytics-navigation" style={{ background: '#000000' }}>
        <div className="time-range-filters">
          {timeRanges.map((range) => (
            <motion.button
              key={range.id}
              className={`time-filter-btn ${timeRange === range.id ? 'active' : ''}`}
              onClick={() => setTimeRange(range.id)}
              disabled={loading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Calendar size={16} />
              {range.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Contenido principal */}
      <div className="analytics-content" style={{ background: '#000000' }}>
        {/* Métricas principales */}
        <div className="metrics-grid">
          {renderMetricCard(
            'Usuarios Totales',
            formatNumber(metricsData.users.total),
            timeRange === 'current' ? 'total registrados' : `en ${timeRange}`,
            <Users size={20} />,
            '#3b82f6',
            loading
          )}
          
          {renderMetricCard(
            'Ingresos Totales',
            formatCurrency(metricsData.payments.totalRevenue),
            timeRange === 'current' ? 'total recaudado' : `en ${timeRange}`,
            <DollarSign size={20} />,
            '#10b981',
            loading
          )}
          
          {renderMetricCard(
            'Visualizaciones',
            formatNumber(metricsData.posts.totalViews),
            timeRange === 'current' ? 'total de vistas' : `en ${timeRange}`,
            <Eye size={20} />,
            '#8b5cf6',
            loading
          )}
          
          {renderMetricCard(
            'Publicaciones',
            formatNumber(metricsData.posts.total),
            timeRange === 'current' ? 'total activas' : `en ${timeRange}`,
            <FileText size={20} />,
            '#f59e0b',
            loading
          )}
        </div>

        {/* Estadísticas detalladas */}
        <div className="detailed-stats">
          {/* Usuarios */}
          <motion.div
            className="stats-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h4 className="stats-card-title">
              <Users size={18} />
              Detalles de Usuarios
            </h4>
            
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Usuarios Activos</span>
                <span className="stat-value">{loading ? '...' : formatNumber(metricsData.users.active)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Escorts</span>
                <span className="stat-value">{loading ? '...' : formatNumber(metricsData.users.escorts)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Agencias</span>
                <span className="stat-value">{loading ? '...' : formatNumber(metricsData.users.agencies)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Clientes</span>
                <span className="stat-value">{loading ? '...' : formatNumber(metricsData.users.clients)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Escorts Verificados</span>
                <span className="stat-value positive">{loading ? '...' : formatNumber(metricsData.users.verifiedEscorts)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Clientes Premium</span>
                <span className="stat-value positive">{loading ? '...' : formatNumber(metricsData.users.premiumClients)}</span>
              </div>
            </div>
          </motion.div>

          {/* Pagos */}
          <motion.div
            className="stats-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h4 className="stats-card-title">
              <DollarSign size={18} />
              Detalles de Pagos
            </h4>
            
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Total Transacciones</span>
                <span className="stat-value">{loading ? '...' : formatNumber(metricsData.payments.totalTransactions)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Impulsos Activos</span>
                <span className="stat-value">{loading ? '...' : formatNumber(metricsData.payments.activeBoosts)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Ingresos por Verificación</span>
                <span className="stat-value positive">
                  {loading ? '...' : formatCurrency(metricsData.payments.byType?.VERIFICATION?.amount || 0)}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Ingresos por Impulsos</span>
                <span className="stat-value positive">
                  {loading ? '...' : formatCurrency(metricsData.payments.byType?.BOOST?.amount || 0)}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Ingresos Premium</span>
                <span className="stat-value positive">
                  {loading ? '...' : formatCurrency(metricsData.payments.byType?.PREMIUM?.amount || 0)}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Engagement */}
          <motion.div
            className="stats-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h4 className="stats-card-title">
              <Eye size={18} />
              Engagement
            </h4>
            
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Total Vistas</span>
                <span className="stat-value">{loading ? '...' : formatNumber(metricsData.engagement.views || metricsData.posts.totalViews)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total Likes</span>
                <span className="stat-value">{loading ? '...' : formatNumber(metricsData.engagement.likes || metricsData.posts.totalLikes)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Promedio Vistas/Post</span>
                <span className="stat-value">
                  {loading ? '...' : formatNumber(metricsData.posts.avgViews || 0)}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total Chats</span>
                <span className="stat-value">{loading ? '...' : formatNumber(metricsData.chat.totalChats)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total Mensajes</span>
                <span className="stat-value">{loading ? '...' : formatNumber(metricsData.chat.totalMessages)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total Favoritos</span>
                <span className="stat-value">{loading ? '...' : formatNumber(metricsData.posts.totalFavorites)}</span>
              </div>
            </div>
          </motion.div>

          {/* Moderación y Reportes */}
          <motion.div
            className="stats-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <h4 className="stats-card-title">
              <Shield size={18} />
              Moderación
            </h4>
            
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Total Reportes</span>
                <span className="stat-value">{loading ? '...' : formatNumber(metricsData.reports.total)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Reportes Pendientes</span>
                <span className="stat-value warning">{loading ? '...' : formatNumber(metricsData.reports.pending)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Reportes Resueltos</span>
                <span className="stat-value positive">{loading ? '...' : formatNumber(metricsData.reports.resolved)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Usuarios Baneados</span>
                <span className="stat-value warning">{loading ? '...' : formatNumber(metricsData.users.banned)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Mensajes No Leídos</span>
                <span className="stat-value">{loading ? '...' : formatNumber(metricsData.chat.unreadMessages)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Emails Verificados</span>
                <span className="stat-value positive">{loading ? '...' : formatNumber(metricsData.users.emailVerified)}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default AdminAnalytics;