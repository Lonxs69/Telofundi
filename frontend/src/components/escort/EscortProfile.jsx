import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Image, Loader } from 'lucide-react';

// Importar los componentes separados
import ProfileInfo from './ProfileInfo';
import PostsManager from './PostsManager';

// Importar API y contextos
import { useAuth } from '../../context/AuthContext';
import { userAPI, handleApiError } from '../../utils/api';

const EscortProfile = () => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('posts');
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [error, setError] = useState(null);

  // Estado del perfil real desde la API - Solo campos visibles
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    description: '',
    avatar: '',
    accountInfo: {
      isVerified: false,
      agencyStatus: null,
    },
  });

  // Estado para edición - Solo campos que se mostrarán en el frontend
  const [editData, setEditData] = useState({
    firstName: '',
    lastName: '',
    bio: '',
    // Campos ocultos pero mantenidos para no romper la estructura del backend
    phone: '', // Oculto
    website: '', // Oculto
    age: '', // Oculto
    locationId: '',
    height: '',
    weight: '',
    bodyType: '',
    ethnicity: '',
    hairColor: '',
    eyeColor: '',
    services: [],
    rates: {},
    availability: {},
    languages: [],
    specialties: [],
    hobbies: [],
    personalityTraits: [],
    outcallAreas: [],
    measurements: {},
    workingHours: {},
    socialMedia: {},
    aboutMe: '',
    education: '',
    incallLocation: '',
    experience: '',
    preferredClientType: '',
  });

  // Cargar perfil al montar el componente
  useEffect(() => {
    if (user && user.userType === 'ESCORT') {
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

        // Solo establecer los campos visibles en profileData
        setProfileData({
          name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
          email: userData.email || '',
          description: userData.bio || '',
          avatar: userData.avatar || '',
          accountInfo: {
            isVerified: userData.escort?.isVerified || false,
            agencyStatus: userData.escort?.agencyId ? 'Con Agencia' : null,
          },
        });

        // Mantener todos los campos en editData para preservar la estructura del backend
        setEditData({
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          bio: userData.bio || '',
          // Campos ocultos pero preservados
          phone: userData.phone || '',
          website: userData.website || '',
          age: userData.escort?.age || '',
          locationId: userData.locationId || '',
          height: userData.escort?.height || '',
          weight: userData.escort?.weight || '',
          bodyType: userData.escort?.bodyType || '',
          ethnicity: userData.escort?.ethnicity || '',
          hairColor: userData.escort?.hairColor || '',
          eyeColor: userData.escort?.eyeColor || '',
          services: userData.escort?.services || [],
          rates: userData.escort?.rates || {},
          availability: userData.escort?.availability || {},
          languages: userData.escort?.languages || [],
          specialties: userData.escort?.specialties || [],
          hobbies: userData.escort?.hobbies || [],
          personalityTraits: userData.escort?.personalityTraits || [],
          outcallAreas: userData.escort?.outcallAreas || [],
          measurements: userData.escort?.measurements || {},
          workingHours: userData.escort?.workingHours || {},
          socialMedia: userData.escort?.socialMedia || {},
          aboutMe: userData.escort?.aboutMe || '',
          education: userData.escort?.education || '',
          incallLocation: userData.escort?.incallLocation || '',
          experience: userData.escort?.experience || '',
          preferredClientType: userData.escort?.preferredClientType || '',
        });

        console.log('✅ Perfil cargado exitosamente:', userData);
      }
    } catch (error) {
      console.error('❌ Error cargando perfil:', error);
      setError(handleApiError(error));
    } finally {
      setLoadingProfile(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="flex justify-center items-center h-screen flex-col gap-4">
          <Loader className="animate-spin" size={32} color="#ff6b35" />
          <p className="text-gray-400">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
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
      <div style={{ padding: '2rem', background: '#000' }}>
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          {[
            { id: 'posts', label: 'Mis Anuncios', icon: <Image size={18} /> },
            { id: 'personal', label: 'Mi Información', icon: <User size={18} /> },
          ].map((tab) => (
            <motion.button
              key={tab.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '12px 24px',
                borderRadius: '25px',
                border: 'none',
                fontSize: '0.95rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                background: activeTab === tab.id ? '#ff6b35' : 'transparent',
                color: activeTab === tab.id ? '#fff' : '#9ca3af',
                outline: activeTab === tab.id ? 'none' : '1px solid #374151'
              }}
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
      <div style={{ 
        padding: '2rem',
        background: '#000',
        minHeight: 'calc(100vh - 200px)'
      }}>
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
              <ProfileInfo
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

export default EscortProfile;