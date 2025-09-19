import React, { useState, useRef, useEffect } from 'react';
import { 
  User, 
  Camera, 
  Edit3, 
  Save, 
  X,
  Mail,
  Loader,
  AlertCircle,
  Heart,
  Settings,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';

// Importar API y contextos reales
import { useAuth } from '../../context/AuthContext';
import { userAPI, handleApiError } from '../../utils/api';
// Importar página de favoritos
import FavoritesPage from '../shared/favorites/favoritesPage';

const ClientProfile = () => {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [error, setError] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [currentSection, setCurrentSection] = useState('main'); // 'main' | 'favorites'
  const fileInputRef = useRef(null);
  
  // Estado del perfil real desde la API - ESTRUCTURA EXACTA DEL BACKEND
  const [profileData, setProfileData] = useState({
    id: '',
    email: '',
    username: '',
    firstName: '',
    lastName: '',
    avatar: '',
    userType: 'CLIENT',
    profileViews: 0,
    isActive: true,
    createdAt: '',
    updatedAt: '',
    lastActiveAt: '',
    location: null,
    settings: null,
    reputation: null,
    stats: null,
    client: null
  });

  // Estado para edición - SOLO CAMPOS PARA CLIENT (sin phone, website, ubicacion, bio)
  const [editData, setEditData] = useState({
    firstName: '',
    lastName: '',
    preferencias: 'MIXTO' // NUEVO: Campo de preferencias con opciones específicas
  });

  // Cargar perfil al montar el componente
  useEffect(() => {
    if (user && user.userType === 'CLIENT') {
      loadClientProfile();
    }
  }, [user]);

  const loadClientProfile = async () => {
    try {
      setLoadingProfile(true);
      setError(null);

      console.log('🔍 Cargando perfil de cliente desde el backend...');
      const response = await userAPI.getProfile();

      if (response.success && response.data) {
        const userData = response.data;
        console.log('✅ Datos recibidos del backend:', userData);

        // Mapear EXACTAMENTE según la respuesta del backend
        setProfileData({
          id: userData.id,
          email: userData.email,
          username: userData.username,
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          avatar: userData.avatar || '',
          userType: userData.userType,
          profileViews: userData.profileViews || 0,
          isActive: userData.isActive,
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt,
          lastActiveAt: userData.lastActiveAt,
          location: userData.location, // Objeto completo con city, country, etc.
          settings: userData.settings, // Objeto completo con configuraciones
          reputation: userData.reputation, // Objeto completo con scores
          stats: userData.stats, // Contador de posts, likes, etc.
          client: userData.client // Datos específicos del cliente
        });

        // Configurar datos para edición - SOLO CAMPOS PERMITIDOS PARA CLIENTES
        setEditData({
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          // Mapear del campo bio (donde se almacenan las preferencias)
          preferencias: userData.bio || 'MIXTO'
        });

        console.log('✅ Estado local actualizado correctamente');
      } else {
        console.error('❌ Respuesta inválida del backend:', response);
        setError('Error en la respuesta del servidor');
      }
    } catch (error) {
      console.error('❌ Error cargando perfil:', error);
      setError(handleApiError(error));
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📝 Guardando perfil de cliente con datos:', editData);

      // Validaciones básicas
      if (!editData.firstName?.trim()) {
        setError('El nombre es obligatorio');
        return;
      }

      if (!editData.lastName?.trim()) {
        setError('El apellido es obligatorio');
        return;
      }

      // Preparar datos para enviar - EXACTO como espera el backend
      const updateData = {};
      
      // Solo enviar campos que han cambiado y tienen valor válido
      if (editData.firstName?.trim() && editData.firstName.trim() !== profileData.firstName) {
        updateData.firstName = editData.firstName.trim();
      }
      
      if (editData.lastName?.trim() && editData.lastName.trim() !== profileData.lastName) {
        updateData.lastName = editData.lastName.trim();
      }
      
      // Mapear preferencias al campo bio que ya existe en el backend
      if (editData.preferencias && editData.preferencias !== (profileData.client?.preferencias || 'MIXTO')) {
        updateData.bio = editData.preferencias; // Usar bio que ya está validado en el backend
      }

      console.log('📤 Datos a enviar al backend:', updateData);

      if (Object.keys(updateData).length === 0) {
        setError('No hay cambios para guardar');
        return;
      }

      const response = await userAPI.updateProfile(updateData);
      
      if (response.success) {
        console.log('✅ Perfil de cliente actualizado en el backend');
        
        // Actualizar el estado local con los datos devueltos por el backend
        setProfileData(prev => ({
          ...prev,
          firstName: response.data.firstName,
          lastName: response.data.lastName,
          updatedAt: response.data.updatedAt,
          // Actualizar reputation si viene en la respuesta
          ...(response.data.reputation && {
            reputation: { ...prev.reputation, ...response.data.reputation }
          })
        }));
        
        // Actualizar contexto global de usuario
        await updateUser(response.data);
        
        setIsEditing(false);
        console.log('✅ Estado local sincronizado con el backend');
      } else {
        setError(response.message || 'Error desconocido');
      }
    } catch (error) {
      console.error('❌ Error actualizando perfil:', error);
      setError(handleApiError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Restaurar datos originales desde el estado actual del perfil
    setEditData({
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      preferencias: profileData.bio || 'MIXTO' // Leer del campo bio
    });
    setIsEditing(false);
    setError(null);
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setUploadingAvatar(true);
      setError(null);

      // Validaciones de archivo
      const maxSize = 3 * 1024 * 1024; // 3MB
      if (file.size > maxSize) {
        setError('El archivo es muy grande. Máximo 3MB permitido.');
        return;
      }

      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        setError('Tipo de archivo no permitido. Solo JPG, PNG, GIF y WebP.');
        return;
      }

      console.log('📸 Subiendo avatar:', file.name, `${(file.size / 1024 / 1024).toFixed(2)}MB`);

      const response = await userAPI.uploadAvatar(file);

      if (response.success) {
        console.log('✅ Avatar actualizado en Cloudinary:', response.data.avatar);
        
        // Actualizar avatar en el estado usando la respuesta exacta del backend
        setProfileData(prev => ({
          ...prev,
          avatar: response.data.avatar, // URL optimizada de Cloudinary
          updatedAt: response.timestamp
        }));
        
        // Actualizar contexto global de usuario
        await updateUser(response.data.user);
        
        console.log('📸 Avatar URL actualizada:', response.data.avatar);
      }
    } catch (error) {
      console.error('❌ Error subiendo avatar:', error);
      setError(handleApiError(error));
    } finally {
      setUploadingAvatar(false);
      // Limpiar el input file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No disponible';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Mostrar loading inicial
  if (loadingProfile) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#000000',
        color: 'white',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <Loader style={{ animation: 'spin 1s linear infinite' }} size={32} color="#ff6b35" />
        <p style={{ color: '#9ca3af' }}>Cargando perfil...</p>
      </div>
    );
  }

  // Si no hay usuario o no es CLIENT, mostrar mensaje
  if (!user || user.userType !== 'CLIENT') {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#000000',
        color: 'white',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <AlertCircle size={32} color="#ef4444" />
        <p style={{ color: '#9ca3af' }}>Acceso solo para clientes</p>
      </div>
    );
  }

  // Si estamos en la sección de favoritos, mostrar FavoritesPage
  if (currentSection === 'favorites') {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#000000',
        color: 'white',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        {/* Header de favoritos con botón de regreso */}
        <div style={{
          position: 'sticky',
          top: '60px', // Debajo del header principal
          background: 'rgba(0, 0, 0, 0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '1rem 2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          zIndex: 100
        }}>
          <button
            onClick={() => setCurrentSection('main')}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '8px',
              padding: '0.5rem',
              color: '#ff6b35',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              margin: '0',
              color: 'white'
            }}>
              Mis Favoritos
            </h1>
            <p style={{
              fontSize: '0.875rem',
              color: '#9ca3af',
              margin: '0.25rem 0 0 0'
            }}>
              Perfiles que has guardado
            </p>
          </div>
        </div>

        {/* Contenido de favoritos */}
        <div style={{ marginTop: '1rem' }}>
          <FavoritesPage />
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#000000',
      color: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Error Display */}
      {error && (
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '0 2rem'
        }}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '1rem',
            color: '#ef4444',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} />
            {error}
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '2rem'
      }}>
        {/* Contenedor del perfil */}
        <div style={{
          background: '#1a1a1a',
          borderRadius: '12px',
          padding: '1.5rem',
          maxWidth: '520px',
          margin: '0 auto'
        }}>
          {/* Sección de avatar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1.5rem',
            padding: '0.75rem',
            background: '#2a2a2a',
            borderRadius: '8px'
          }}>
            <div style={{
              position: 'relative',
              width: '50px',
              height: '50px',
              flexShrink: 0
            }}>
              {profileData.avatar ? (
                <img 
                  src={profileData.avatar}
                  alt="User Avatar"
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid #333',
                    display: 'block'
                  }}
                />
              ) : (
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  background: '#333',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#9ca3af'
                }}>
                  <User size={24} />
                </div>
              )}
              {uploadingAvatar && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0, 0, 0, 0.7)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Loader style={{ animation: 'spin 1s linear infinite' }} size={16} color="#ff6b35" />
                </div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: 'white',
                marginBottom: '0.25rem'
              }}>
                {profileData.firstName && profileData.lastName 
                  ? `${profileData.firstName} ${profileData.lastName}`
                  : profileData.username || 'Usuario'
                }
              </div>
              <div style={{
                fontSize: '0.8rem',
                color: '#9ca3af'
              }}>
                Cliente desde {formatDate(profileData.createdAt)}
                {profileData.client?.verificationStatus === 'VERIFIED' && (
                  <span style={{
                    marginLeft: '8px',
                    color: '#10b981',
                    fontSize: '0.75rem'
                  }}>
                    ✓ Verificado
                  </span>
                )}
                {profileData.client?.verificationStatus === 'UNVERIFIED' && (
                  <span style={{
                    marginLeft: '8px',
                    color: '#f59e0b',
                    fontSize: '0.75rem'
                  }}>
                    ⚠ Sin verificar
                  </span>
                )}
              </div>
            </div>
            <button
              style={{
                background: uploadingAvatar ? '#666' : '#ff6b35',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '0.4rem 0.8rem',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: uploadingAvatar ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
            >
              {uploadingAvatar ? (
                <Loader style={{ animation: 'spin 1s linear infinite' }} size={12} />
              ) : (
                <Camera size={12} />
              )}
              Cambiar foto
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarUpload}
              accept="image/*"
              style={{ display: 'none' }}
              disabled={uploadingAvatar}
            />
          </div>

          {/* Botón de Favoritos - NUEVO */}
          <div style={{
            marginBottom: '1.5rem'
          }}>
            <button
              onClick={() => setCurrentSection('favorites')}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: '#2a2a2a',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.3s ease',
                ':hover': {
                  background: '#333'
                }
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#333';
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#2a2a2a';
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(236, 72, 153, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(236, 72, 153, 0.3)'
                }}>
                  <Heart size={16} style={{ color: '#ec4899' }} />
                </div>
                <div>
                  <div style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: 'white',
                    marginBottom: '0.25rem'
                  }}>
                    Mis Favoritos
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#9ca3af'
                  }}>
                    Perfiles que has guardado
                  </div>
                </div>
              </div>
              <ChevronRight size={18} style={{ color: '#9ca3af' }} />
            </button>
          </div>

          {/* Formulario con grid horizontal */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem 1.5rem',
            alignItems: 'start'
          }}>
            {/* Nombre */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: '600',
                color: 'white',
                marginBottom: '0.4rem'
              }}>
                Nombre
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editData.firstName}
                  onChange={(e) => setEditData(prev => ({ ...prev, firstName: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    background: '#2a2a2a',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '0.8rem'
                  }}
                  placeholder="Tu nombre"
                />
              ) : (
                <div style={{
                  padding: '0.6rem',
                  background: '#2a2a2a',
                  borderRadius: '8px',
                  color: '#d1d5db',
                  fontSize: '0.8rem'
                }}>
                  {profileData.firstName || 'No especificado'}
                </div>
              )}
            </div>

            {/* Apellido */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: '600',
                color: 'white',
                marginBottom: '0.4rem'
              }}>
                Apellido
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editData.lastName}
                  onChange={(e) => setEditData(prev => ({ ...prev, lastName: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    background: '#2a2a2a',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '0.8rem'
                  }}
                  placeholder="Tu apellido"
                />
              ) : (
                <div style={{
                  padding: '0.6rem',
                  background: '#2a2a2a',
                  borderRadius: '8px',
                  color: '#d1d5db',
                  fontSize: '0.8rem'
                }}>
                  {profileData.lastName || 'No especificado'}
                </div>
              )}
            </div>

            {/* Email */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: '600',
                color: 'white',
                marginBottom: '0.4rem'
              }}>
                <Mail size={12} style={{ display: 'inline', marginRight: '4px' }} />
                Email
              </label>
              <div style={{
                padding: '0.6rem',
                background: '#2a2a2a',
                borderRadius: '8px',
                color: '#9ca3af',
                fontSize: '0.8rem',
                opacity: 0.7
              }}>
                {profileData.email || 'No especificado'}
              </div>
              {isEditing && (
                <p style={{
                  fontSize: '0.7rem',
                  color: '#6b7280',
                  margin: '0.4rem 0 0 0',
                  lineHeight: '1.4'
                }}>
                  El email no se puede modificar por seguridad
                </p>
              )}
            </div>

            {/* Preferencias - Span completo - CAMPO PARA CLIENTES */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: '600',
                color: 'white',
                marginBottom: '0.4rem'
              }}>
                <Heart size={12} style={{ display: 'inline', marginRight: '4px', color: '#ec4899' }} />
                Preferencias
              </label>
              {isEditing ? (
                <select
                  value={editData.preferencias}
                  onChange={(e) => setEditData(prev => ({ ...prev, preferencias: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    background: '#2a2a2a',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '0.8rem'
                  }}
                >
                  <option value="MUJERES">Mujeres</option>
                  <option value="HOMBRES">Hombres</option>
                  <option value="TRANS">Trans</option>
                  <option value="MIXTO">Mixto</option>
                </select>
              ) : (
                <div style={{
                  padding: '0.6rem',
                  background: '#2a2a2a',
                  borderRadius: '8px',
                  color: '#d1d5db',
                  fontSize: '0.8rem'
                }}>
                  {(() => {
                    const pref = profileData.bio || editData.preferencias || 'MIXTO';
                    switch(pref) {
                      case 'MUJERES': return 'Mujeres';
                      case 'HOMBRES': return 'Hombres';
                      case 'TRANS': return 'Trans';
                      case 'MIXTO': return 'Mixto';
                      default: return 'Mixto';
                    }
                  })()}
                </div>
              )}
            </div>

            {/* Botones de acción - Span completo */}
            {isEditing ? (
              <div style={{
                gridColumn: '1 / -1',
                display: 'flex',
                gap: '1rem',
                marginTop: '0.5rem'
              }}>
                <button
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: 'transparent',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    color: '#d1d5db',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    opacity: loading ? 0.5 : 1
                  }}
                  onClick={handleCancel}
                  disabled={loading}
                >
                  <X size={16} />
                  Cancelar
                </button>
                <button
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: loading ? 'rgba(255, 107, 53, 0.7)' : '#ff6b35',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    opacity: loading ? 0.7 : 1
                  }}
                  onClick={handleSaveProfile}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader style={{ animation: 'spin 1s linear infinite' }} size={16} />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Guardar
                    </>
                  )}
                </button>
              </div>
            ) : (
              <button
                style={{
                  gridColumn: '1 / -1',
                  width: '100%',
                  padding: '0.75rem',
                  background: '#ff6b35',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginTop: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
                onClick={() => setIsEditing(true)}
              >
                <Edit3 size={16} />
                Editar Perfil
              </button>
            )}
          </div>

          {/* Footer info */}
          <div style={{
            marginTop: '1.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid #333'
          }}>
            {/* Estadísticas del cliente - Solo sesiones */}
            {profileData.client?.totalSessions !== undefined && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '1rem'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: '1.25rem',
                    fontWeight: '700',
                    color: '#10b981'
                  }}>
                    {profileData.client.totalSessions}
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#6b7280'
                  }}>
                    Sesiones completadas
                  </div>
                </div>
              </div>
            )}

            {/* Información de membresía si existe */}
            {profileData.client?.membershipLevel && (
              <div style={{
                background: '#2a2a2a',
                padding: '0.75rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '0.8rem',
                  color: '#9ca3af',
                  marginBottom: '0.25rem'
                }}>
                  Nivel de membresía
                </div>
                <div style={{
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: profileData.client.membershipLevel === 'PREMIUM' ? '#fbbf24' : '#d1d5db'
                }}>
                  {profileData.client.membershipLevel === 'BASIC' ? 'Básico' : 
                   profileData.client.membershipLevel === 'PREMIUM' ? 'Premium' : 
                   profileData.client.membershipLevel === 'VIP' ? 'VIP' : 
                   profileData.client.membershipLevel}
                  {profileData.client.canAccessPremiumProfiles && (
                    <span style={{
                      marginLeft: '8px',
                      fontSize: '0.75rem',
                      color: '#10b981'
                    }}>
                      ✓ Acceso Premium
                    </span>
                  )}
                </div>
              </div>
            )}

            <p style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              textAlign: 'center',
              margin: '0',
              lineHeight: '1.4'
            }}>
              Mantén tu perfil actualizado para una mejor experiencia.
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default ClientProfile;