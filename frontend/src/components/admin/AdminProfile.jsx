import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserCheck,
  CheckCircle,
  Camera,
  Crown,
  Calendar,
  Clock,
  Edit,
  X,
  Shield,
  Mail,
  Phone,
  MapPin,
  User,
  Loader,
  Save
} from 'lucide-react';

// Importar API y contextos
import { useAuth } from '../../context/AuthContext';
import { userAPI, handleApiError } from '../../utils/api';

const AdminProfile = () => {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Estado del perfil real desde la API
  const [profileData, setProfileData] = useState({
    id: '',
    name: '',
    email: '',
    avatar: '',
    role: '',
    location: '',
    phone: '',
    joinDate: '',
    lastLogin: '',
    description: ''
  });

  // Estado para edición
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    bio: '',
    location: ''
  });

  // Cargar perfil al montar el componente
  useEffect(() => {
    if (user && user.userType === 'ADMIN') {
      loadAdminProfile();
    }
  }, [user]);

  const loadAdminProfile = async () => {
    try {
      setLoadingProfile(true);
      setError(null);

      const response = await userAPI.getProfile();

      if (response.success && response.data) {
        const userData = response.data;

        setProfileData({
          id: userData.id || '',
          name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
          email: userData.email || '',
          avatar: userData.avatar || '',
          role: userData.admin?.role || 'Administrator',
          location: userData.location?.city || userData.location?.country || '',
          phone: userData.phone || '',
          joinDate: userData.createdAt || '',
          lastLogin: userData.lastActiveAt || userData.lastLogin || '',
          description: userData.bio || ''
        });

        setEditForm({
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          phone: userData.phone || '',
          bio: userData.bio || '',
          location: userData.location?.city || userData.location?.country || ''
        });

        console.log('✅ Perfil de administrador cargado exitosamente:', userData);
      }
    } catch (error) {
      console.error('❌ Error cargando perfil de administrador:', error);
      setError(handleApiError(error));
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const updateData = {};

      console.log('📝 Procesando campos para actualización...');
      
      if (editForm.firstName?.trim()) {
        updateData.firstName = editForm.firstName.trim();
      }
      
      if (editForm.lastName?.trim()) {
        updateData.lastName = editForm.lastName.trim();
      }
      
      if (editForm.phone?.trim()) {
        updateData.phone = editForm.phone.trim();
      }
      
      if (editForm.bio !== undefined) {
        updateData.bio = editForm.bio?.trim() || '';
      }

      // Para location, podemos usar locationId si existe en el backend
      // o simplemente actualizar como string básico
      if (editForm.location?.trim()) {
        updateData.location = editForm.location.trim();
      }

      console.log('📤 Datos a enviar:', updateData);

      if (Object.keys(updateData).length === 0) {
        setError('No hay cambios para guardar');
        return;
      }

      const response = await userAPI.updateProfile(updateData);
      
      if (response.success) {
        console.log('✅ Actualizando contexto de usuario...');
        await updateUser(response.data);
        
        console.log('✅ Recargando perfil...');
        await loadAdminProfile();
        
        setIsEditing(false);
        console.log('✅ ¡Perfil de administrador actualizado exitosamente!');
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
    loadAdminProfile();
    setIsEditing(false);
    setError(null);
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        setLoading(true);
        setError(null);

        const response = await userAPI.uploadAvatar(file);

        if (response.success) {
          setProfileData((prev) => ({ ...prev, avatar: response.data.avatar }));
          await updateUser(response.data.user);
          await loadAdminProfile();
          console.log('✅ Avatar de administrador actualizado exitosamente');
        }
      } catch (error) {
        console.error('❌ Error subiendo avatar de administrador:', error);
        setError(handleApiError(error));
      } finally {
        setLoading(false);
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No disponible';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleDisplayName = (role) => {
    const roleNames = {
      'SUPER_ADMIN': 'Super Administrador',
      'ADMIN': 'Administrador',
      'MODERATOR': 'Moderador'
    };
    return roleNames[role] || 'Administrador';
  };

  const getRoleColor = (role) => {
    const roleColors = {
      'SUPER_ADMIN': '#f59e0b', // Dorado
      'ADMIN': '#dc2626',       // Rojo
      'MODERATOR': '#3b82f6'    // Azul
    };
    return roleColors[role] || '#dc2626';
  };

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
        <Loader className="animate-spin" size={32} color="#dc2626" />
        <p style={{ color: '#9ca3af' }}>Cargando perfil de administrador...</p>
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

      {/* Contenido principal */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '2rem'
      }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            opacity: 1,
            transform: 'translateY(0)'
          }}
        >
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
                <img 
                  src={profileData.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop'}
                  alt="Admin Avatar"
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: `2px solid ${getRoleColor(profileData.role)}`,
                    display: 'block'
                  }}
                />
                <div style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  width: '20px',
                  height: '20px',
                  background: '#3b82f6',
                  border: '2px solid #000',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}>
                  <Shield size={10} />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: 'white',
                  marginBottom: '0.25rem'
                }}>
                  {profileData.name || 'Administrador'}
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '4px 8px',
                  background: `rgba(${getRoleColor(profileData.role)}, 0.2)`,
                  border: `1px solid rgba(${getRoleColor(profileData.role)}, 0.3)`,
                  borderRadius: '6px',
                  color: getRoleColor(profileData.role),
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  width: 'fit-content'
                }}>
                  <Crown size={12} />
                  {getRoleDisplayName(profileData.role)}
                </div>
              </div>
              <button
                style={{
                  background: loading ? '#666' : getRoleColor(profileData.role),
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                {loading ? <Loader size={12} className="animate-spin" /> : <Camera size={12} />}
                Cambiar foto
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                style={{ display: 'none' }}
                disabled={loading}
              />
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
                    value={editForm.firstName}
                    onChange={(e) => setEditForm(prev => ({ ...prev, firstName: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      background: '#2a2a2a',
                      border: '1px solid #333',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '0.8rem'
                    }}
                  />
                ) : (
                  <div style={{
                    padding: '0.6rem',
                    background: '#2a2a2a',
                    borderRadius: '8px',
                    color: '#d1d5db',
                    fontSize: '0.8rem'
                  }}>
                    {editForm.firstName || 'No especificado'}
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
                    value={editForm.lastName}
                    onChange={(e) => setEditForm(prev => ({ ...prev, lastName: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      background: '#2a2a2a',
                      border: '1px solid #333',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '0.8rem'
                    }}
                  />
                ) : (
                  <div style={{
                    padding: '0.6rem',
                    background: '#2a2a2a',
                    borderRadius: '8px',
                    color: '#d1d5db',
                    fontSize: '0.8rem'
                  }}>
                    {editForm.lastName || 'No especificado'}
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

              {/* Teléfono */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  color: 'white',
                  marginBottom: '0.4rem'
                }}>
                  Teléfono
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      background: '#2a2a2a',
                      border: '1px solid #333',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '0.8rem'
                    }}
                  />
                ) : (
                  <div style={{
                    padding: '0.6rem',
                    background: '#2a2a2a',
                    borderRadius: '8px',
                    color: '#d1d5db',
                    fontSize: '0.8rem'
                  }}>
                    {editForm.phone || 'No especificado'}
                  </div>
                )}
              </div>

              {/* Ubicación - Span completo */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  color: 'white',
                  marginBottom: '0.4rem'
                }}>
                  Ubicación
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      background: '#2a2a2a',
                      border: '1px solid #333',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '0.8rem'
                    }}
                  />
                ) : (
                  <div style={{
                    padding: '0.6rem',
                    background: '#2a2a2a',
                    borderRadius: '8px',
                    color: '#d1d5db',
                    fontSize: '0.8rem'
                  }}>
                    {editForm.location || 'No especificado'}
                  </div>
                )}
              </div>

              {/* Descripción - Span completo */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  color: 'white',
                  marginBottom: '0.4rem'
                }}>
                  Descripción
                </label>
                {isEditing ? (
                  <div style={{ position: 'relative' }}>
                    <textarea
                      value={editForm.bio}
                      onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                      maxLength={500}
                      style={{
                        width: '100%',
                        padding: '0.6rem',
                        background: '#000',
                        border: '1px solid #333',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '0.8rem',
                        resize: 'none',
                        fontFamily: 'inherit',
                        minHeight: `${Math.max(60, Math.ceil((editForm.bio || '').length / 60) * 20 + 40)}px`,
                        height: 'auto'
                      }}
                    />
                    <div style={{
                      position: 'absolute',
                      bottom: '0.4rem',
                      right: '0.6rem',
                      fontSize: '0.7rem',
                      color: '#6b7280'
                    }}>
                      {(editForm.bio || '').length} / 500
                    </div>
                  </div>
                ) : (
                  <div style={{
                    padding: '0.6rem',
                    background: '#000',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    color: '#d1d5db',
                    fontSize: '0.8rem',
                    minHeight: `${Math.max(60, Math.ceil((editForm.bio || '').length / 60) * 20 + 20)}px`,
                    lineHeight: '1.5'
                  }}>
                    {editForm.bio || 'No especificado'}
                  </div>
                )}
              </div>

              {/* Información de fechas - Span completo */}
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1rem',
                  marginTop: '0.5rem'
                }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      color: 'white',
                      marginBottom: '0.4rem'
                    }}>
                      Fecha de registro
                    </label>
                    <div style={{
                      padding: '0.6rem',
                      background: '#2a2a2a',
                      borderRadius: '8px',
                      color: '#9ca3af',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <Calendar size={14} />
                      {formatDate(profileData.joinDate)}
                    </div>
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      color: 'white',
                      marginBottom: '0.4rem'
                    }}>
                      Último acceso
                    </label>
                    <div style={{
                      padding: '0.6rem',
                      background: '#2a2a2a',
                      borderRadius: '8px',
                      color: '#9ca3af',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <Clock size={14} />
                      {formatDate(profileData.lastLogin)}
                    </div>
                  </div>
                </div>
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
                      gap: '8px'
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
                      background: loading ? 'rgba(220, 38, 38, 0.7)' : getRoleColor(profileData.role),
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      opacity: loading ? 0.7 : 1
                    }}
                    onClick={handleSaveProfile}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader size={16} className="animate-spin" />
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
                    background: getRoleColor(profileData.role),
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
                    gap: '8px'
                  }}
                  onClick={() => setIsEditing(true)}
                >
                  <Edit size={16} />
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
              <p style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                textAlign: 'center',
                margin: '0',
                lineHeight: '1.4'
              }}>
                Tu información administrativa es privada y solo visible para otros administradores del sistema.
              </p>
            </div>
          </div>
        </motion.div>
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

export default AdminProfile;