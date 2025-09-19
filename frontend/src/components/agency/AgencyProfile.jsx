import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, ImageIcon, Loader } from 'lucide-react';

// Importar los componentes separados
import AgencyInfo from './AgencyInfo';
import PostsManager from './PostsManager';

// Importar API y contextos
import { useAuth } from '../../context/AuthContext';
import { userAPI, handleApiError } from '../../utils/api';

// IMPORTANTE: Importar el CSS correspondiente
import './EscortProfile.css';

const AgencyProfile = () => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('posts');
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [error, setError] = useState(null);

  // Estado del perfil real desde la API - Solo campos visibles
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    description: '',
    avatar: '',
    website: '',
    accountInfo: {
      isVerified: false,
      totalEscorts: 0,
      activeEscorts: 0,
      verifiedEscorts: 0,
    },
  });

  // Estado para edición - Campos específicos de agencia
  const [editData, setEditData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    bio: '',
    website: '',
    locationId: '',
  });

  // Cargar perfil al montar el componente
  useEffect(() => {
    if (user && user.userType === 'AGENCY') {
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    try {
      setLoadingProfile(true);
      setError(null);

      const response = await userAPI.getProfile();

      if (response.success && response.data) {
        const userData = response.data;

        // Establecer campos específicos de agencia en profileData
        setProfileData({
          name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
          email: userData.email || '',
          phone: userData.phone || '',
          location: userData.location?.city || userData.location?.country || '',
          description: userData.bio || '',
          avatar: userData.avatar || '',
          website: userData.website || '',
          accountInfo: {
            isVerified: userData.agency?.isVerified || false,
            totalEscorts: userData.agency?.totalEscorts || 0,
            activeEscorts: userData.agency?.activeEscorts || 0,
            verifiedEscorts: userData.agency?.verifiedEscorts || 0,
          },
        });

        // Mantener todos los campos en editData para preservar la estructura del backend
        setEditData({
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          phone: userData.phone || '',
          bio: userData.bio || '',
          website: userData.website || '',
          locationId: userData.locationId || '',
        });

        console.log('✅ Perfil de agencia cargado exitosamente:', userData);
      }
    } catch (error) {
      console.error('❌ Error cargando perfil de agencia:', error);
      setError(handleApiError(error));
    } finally {
      setLoadingProfile(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="escort-profile-page">
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '50vh',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <Loader className="animate-spin" size={32} color="#ff6b35" />
          <p style={{ color: '#9ca3af' }}>Cargando perfil de agencia...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="escort-profile-page" style={{ background: '#000000', minHeight: '100vh' }}>
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
          }}
        >
          {error}
        </motion.div>
      )}

      {/* Navigation */}
      <div className="profile-navigation">
        <div className="nav-tabs-container">
          {[
            { id: 'posts', label: 'Mis Anuncios', icon: <ImageIcon size={18} /> },
            { id: 'personal', label: 'Mi Agencia', icon: <Building2 size={18} /> },
          ].map((tab) => (
            <motion.button
              key={tab.id}
              className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Profile Content */}
      <div className="profile-content">
        <AnimatePresence mode="wait">
          {activeTab === 'posts' && (
            <motion.div
              key="posts"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <PostsManager 
                user={user}
                onError={setError}
              />
            </motion.div>
          )}

          {activeTab === 'personal' && (
            <motion.div
              key="personal"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <AgencyInfo
                user={user}
                updateUser={updateUser}
                profileData={profileData}
                editData={editData}
                setEditData={setEditData}
                loadUserProfile={loadUserProfile}
                onError={setError}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AgencyProfile;