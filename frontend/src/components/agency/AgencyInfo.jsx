import React, { useState, useRef } from 'react';
import { Camera, Edit3, Save, Shield, Loader } from 'lucide-react';
import { userAPI, handleApiError } from '../../utils/api';

const AgencyInfo = ({ 
  user, 
  updateUser, 
  profileData, 
  editData, 
  setEditData, 
  loadUserProfile, 
  onError 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleInputChange = (field, value) => {
    console.log(`🔄 Cambiando ${field}:`, `"${value}" (${typeof value})`);
    
    setEditData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };
      console.log(`🔄 editData actualizado para ${field}:`, newData[field]);
      return newData;
    });
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();

    console.log('🔍 === DEBUGGING FORM SUBMIT AGENCY ===');
    console.log('🔍 editData completo:', editData);
    console.log('🔍 user.userType:', user?.userType);
    console.log('🔍 isEditing:', isEditing);

    try {
      setLoading(true);
      onError(null);

      const updateData = {};

      console.log('📝 Procesando campos de agencia...');
      
      if (editData.firstName?.trim()) {
        updateData.firstName = editData.firstName.trim();
        console.log('✅ firstName:', updateData.firstName);
      }
      
      if (editData.lastName?.trim()) {
        updateData.lastName = editData.lastName.trim();
        console.log('✅ lastName:', updateData.lastName);
      }
      
      if (editData.bio !== undefined) {
        updateData.bio = editData.bio?.trim() || null;
        console.log('✅ bio:', updateData.bio);
      }
      
      if (editData.phone?.trim()) {
        updateData.phone = editData.phone.trim();
        console.log('✅ phone:', updateData.phone);
      }
      
      if (editData.website?.trim()) {
        updateData.website = editData.website.trim();
        console.log('✅ website:', updateData.website);
      }

      if (editData.locationId) {
        updateData.locationId = editData.locationId;
        console.log('✅ locationId:', updateData.locationId);
      }

      console.log('📤 === DATOS FINALES AGENCIA ===');
      console.log('📤 updateData completo:', JSON.stringify(updateData, null, 2));
      console.log('📤 Número de campos:', Object.keys(updateData).length);

      if (Object.keys(updateData).length === 0) {
        console.log('❌ No hay cambios para guardar');
        onError('No hay cambios para guardar');
        return;
      }

      console.log('🚀 Enviando petición al backend...');
      const response = await userAPI.updateProfile(updateData);
      
      console.log('✅ Respuesta recibida:', response);

      if (response.success) {
        console.log('✅ Actualizando contexto de usuario...');
        await updateUser(response.data);
        
        console.log('✅ Recargando perfil...');
        await loadUserProfile();
        
        setIsEditing(false);
        console.log('✅ ¡Perfil de agencia actualizado exitosamente!');
      } else {
        console.log('❌ Respuesta no exitosa:', response);
        onError(response.message || 'Error desconocido');
      }
    } catch (error) {
      console.error('❌ === ERROR COMPLETO AGENCY ===');
      console.error('❌ Error:', error);
      console.error('❌ Message:', error.message);
      console.error('❌ Stack:', error.stack);
      console.error('❌ Status:', error.status);
      console.error('❌ Response:', error.response);
      onError(handleApiError(error));
    } finally {
      setLoading(false);
      console.log('🏁 Finalizando handleFormSubmit de agencia');
    }
  };

  const handleCancelEdit = () => {
    loadUserProfile();
    setIsEditing(false);
    onError(null);
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        setLoading(true);
        const response = await userAPI.uploadAvatar(file);

        if (response.success) {
          await updateUser(response.data.user);
          await loadUserProfile();
          console.log('✅ Avatar de agencia actualizado exitosamente');
        }
      } catch (error) {
        console.error('❌ Error subiendo avatar de agencia:', error);
        onError(handleApiError(error));
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
      <form
        onSubmit={handleFormSubmit}
        style={{ 
          background: '#1a1a1a', 
          borderRadius: '12px', 
          padding: '1.5rem', 
          maxWidth: '520px', 
          margin: '0 auto' 
        }}
      >
        {/* Avatar Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1.5rem',
            padding: '0.75rem',
            background: '#2a2a2a',
            borderRadius: '8px',
          }}
        >
          <div style={{ position: 'relative', width: '50px', height: '50px', flexShrink: 0 }}>
            <img
              src={profileData.avatar || 'https://images.unsplash.com/photo-1560472354-b43ff0c44a43?w=300&h=300&fit=crop&crop=face'}
              alt="Agency Avatar"
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid #333',
                display: 'block',
              }}
            />
            {profileData.accountInfo.isVerified && (
              <div
                style={{
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
                  color: 'white',
                }}
              >
                <Shield size={10} />
              </div>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: 'white',
                marginBottom: '0.25rem',
              }}
            >
              {profileData.name || 'Agencia'}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
              {profileData.accountInfo.totalEscorts} escorts • {profileData.accountInfo.verifiedEscorts} verificadas
            </div>
          </div>
          <button
            type="button"
            style={{
              background: loading ? '#666' : '#ff6b35',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '0.4rem 0.8rem',
              fontSize: '0.8rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
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
            onChange={handleAvatarUpload}
            accept="image/*"
            style={{ display: 'none' }}
            disabled={loading}
          />
        </div>

        {/* Form Fields */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem 1.5rem',
            alignItems: 'start',
          }}
        >
          {/* Nombre de la agencia */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: '600',
                color: 'white',
                marginBottom: '0.4rem',
              }}
            >
              Nombre de la agencia
            </label>
            {isEditing ? (
              <input
                type="text"
                name="firstName"
                value={editData.firstName || ''}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem',
                  background: '#2a2a2a',
                  border: '1px solid #333',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '0.8rem',
                }}
              />
            ) : (
              <div
                style={{
                  padding: '0.6rem',
                  background: '#2a2a2a',
                  borderRadius: '8px',
                  color: '#d1d5db',
                  fontSize: '0.8rem',
                }}
              >
                {editData.firstName || 'No especificado'}
              </div>
            )}
          </div>

          {/* Apellido / Empresa */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: '600',
                color: 'white',
                marginBottom: '0.4rem',
              }}
            >
              Apellido / Empresa
            </label>
            {isEditing ? (
              <input
                type="text"
                name="lastName"
                value={editData.lastName || ''}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem',
                  background: '#2a2a2a',
                  border: '1px solid #333',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '0.8rem',
                }}
              />
            ) : (
              <div
                style={{
                  padding: '0.6rem',
                  background: '#2a2a2a',
                  borderRadius: '8px',
                  color: '#d1d5db',
                  fontSize: '0.8rem',
                }}
              >
                {editData.lastName || 'No especificado'}
              </div>
            )}
          </div>

          {/* Teléfono */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: '600',
                color: 'white',
                marginBottom: '0.4rem',
              }}
            >
              Teléfono
            </label>
            {isEditing ? (
              <input
                type="tel"
                name="phone"
                value={editData.phone || ''}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem',
                  background: '#2a2a2a',
                  border: '1px solid #333',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '0.8rem',
                }}
              />
            ) : (
              <div
                style={{
                  padding: '0.6rem',
                  background: '#2a2a2a',
                  borderRadius: '8px',
                  color: '#d1d5db',
                  fontSize: '0.8rem',
                }}
              >
                {editData.phone || 'No especificado'}
              </div>
            )}
          </div>

          {/* Website */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: '600',
                color: 'white',
                marginBottom: '0.4rem',
              }}
            >
              Sitio Web
            </label>
            {isEditing ? (
              <input
                type="url"
                name="website"
                value={editData.website || ''}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder="https://mi-agencia.com"
                style={{
                  width: '100%',
                  padding: '0.6rem',
                  background: '#2a2a2a',
                  border: '1px solid #333',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '0.8rem',
                }}
              />
            ) : (
              <div
                style={{
                  padding: '0.6rem',
                  background: '#2a2a2a',
                  borderRadius: '8px',
                  color: '#d1d5db',
                  fontSize: '0.8rem',
                }}
              >
                {editData.website || 'No especificado'}
              </div>
            )}
          </div>

          {/* Descripción de la agencia - Ocupa toda la fila */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: '600',
                color: 'white',
                marginBottom: '0.4rem',
              }}
            >
              Descripción de la agencia
            </label>
            {isEditing ? (
              <div style={{ position: 'relative' }}>
                <textarea
                  name="bio"
                  value={editData.bio || ''}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
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
                    minHeight: `${Math.max(60, Math.ceil((editData.bio || '').length / 60) * 20 + 40)}px`,
                    height: 'auto',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: '0.4rem',
                    right: '0.6rem',
                    fontSize: '0.7rem',
                    color: '#6b7280',
                  }}
                >
                  {(editData.bio || '').length} / 500
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: '0.6rem',
                  background: '#000',
                  border: '1px solid #333',
                  borderRadius: '8px',
                  color: '#d1d5db',
                  fontSize: '0.8rem',
                  minHeight: `${Math.max(60, Math.ceil((editData.bio || '').length / 60) * 20 + 20)}px`,
                  lineHeight: '1.5',
                }}
              >
                {editData.bio || 'No especificado'}
              </div>
            )}
          </div>

          {/* Email - Solo lectura */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: '600',
                color: 'white',
                marginBottom: '0.4rem',
              }}
            >
              Email
            </label>
            <div
              style={{
                padding: '0.6rem',
                background: '#2a2a2a',
                borderRadius: '8px',
                color: '#9ca3af',
                fontSize: '0.8rem',
                opacity: 0.7,
              }}
            >
              {profileData.email || 'No especificado'}
            </div>
            {isEditing && (
              <p
                style={{
                  fontSize: '0.7rem',
                  color: '#6b7280',
                  margin: '0.4rem 0 0 0',
                  lineHeight: '1.4',
                }}
              >
                El email no se puede modificar por seguridad
              </p>
            )}
          </div>

          {/* Ubicación - Solo lectura */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: '600',
                color: 'white',
                marginBottom: '0.4rem',
              }}
            >
              Ubicación
            </label>
            <div
              style={{
                padding: '0.6rem',
                background: '#2a2a2a',
                borderRadius: '8px',
                color: '#d1d5db',
                fontSize: '0.8rem',
              }}
            >
              {profileData.location || 'No especificado'}
            </div>
          </div>

          {/* BOTONES */}
          {isEditing ? (
            <div
              style={{
                gridColumn: '1 / -1',
                display: 'flex',
                gap: '1rem',
                marginTop: '0.5rem',
              }}
            >
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: 'transparent',
                  border: '1px solid #333',
                  borderRadius: '8px',
                  color: '#d1d5db',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
                onClick={handleCancelEdit}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: loading ? '#666' : '#ff6b35',
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
                }}
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
              type="button"
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
                gap: '8px',
              }}
              onClick={() => setIsEditing(true)}
            >
              <Edit3 size={16} />
              Editar Perfil
            </button>
          )}
        </div>

        <div
          style={{
            marginTop: '1.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid #333',
          }}
        >
          <p
            style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              textAlign: 'center',
              margin: '0',
              lineHeight: '1.4',
            }}
          >
            La información de tu agencia es visible para escorts y clientes potenciales.
          </p>
        </div>
      </form>
    </div>
  );
};

export default AgencyInfo;