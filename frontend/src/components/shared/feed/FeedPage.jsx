import React from 'react';
import { useFeedLogic } from './FeedPageLogic';
import { FeedPageDesign } from './FeedPageDesign';

/**
 * ====================================================================
 * 🚀 FEEDPAGE - COMPONENTE PRINCIPAL REFACTORIZADO + CHAT INTEGRADO
 * ====================================================================
 * 
 * MEJORAS IMPLEMENTADAS:
 * ✅ Separación completa de lógica y diseño
 * ✅ Configuración estática de botones por userType
 * ✅ Validaciones dinámicas independientes
 * ✅ Carga independiente de datos por pestaña
 * ✅ Normalización centralizada de posts
 * ✅ Cache inteligente para evitar duplicación
 * ✅ Verificación robusta de posts propios
 * ✅ Sistema de botones completamente consistente
 * ✅ INTEGRACIÓN COMPLETA DEL SISTEMA DE CHAT
 * 
 * PROBLEMAS RESUELTOS:
 * ❌ Pestañas que mostraban contenido duplicado
 * ❌ Botones inconsistentes según userType  
 * ❌ Verificación de WhatsApp problemática
 * ❌ Posts propios con botones incorrectos
 * ❌ Configuración mezclada con validaciones
 * ❌ Sistema de chat desintegrado
 * 
 * NUEVAS FUNCIONALIDADES:
 * ✅ Botón CHAT funcional en todos los posts
 * ✅ Navegación directa a ChatPage con usuario específico
 * ✅ Creación automática de chats desde perfil
 * ✅ Manejo robusto de errores de chat
 * ✅ Validaciones de permisos antes de chatear
 * 
 * ====================================================================
 */

const FeedPage = ({ 
  userType = 'CLIENT',
  customTitle = null,
  customSubtitle = null,
  customIcon = null,
  // ✅ NUEVAS PROPS OPCIONALES PARA FUNCIONALIDADES AVANZADAS
  onOpenAuthModal = null,
  onChatCreated = null,
  onProfileView = null,
  initialFilters = null
}) => {
  console.log('🚀 FeedPage rendered with userType:', userType, {
    customTitle,
    customSubtitle,
    customIcon,
    hasAuthModal: !!onOpenAuthModal,
    hasChatCallback: !!onChatCreated,
    hasProfileCallback: !!onProfileView,
    hasInitialFilters: !!initialFilters
  });
  
  // ✅ OBTENER TODA LA LÓGICA DEL HOOK REFACTORIZADO
  const feedLogic = useFeedLogic(userType, initialFilters);

  console.log('📋 FeedLogic loaded:', {
    userType: userType,
    postsCount: feedLogic.posts?.length,
    activeTab: feedLogic.activeTab,
    loading: feedLogic.loading,
    configAvailable: !!feedLogic.getUserConfig,
    chatFunctionsAvailable: !!(feedLogic.createChatWithUser && feedLogic.handleStartChat),
    chatLoading: feedLogic.chatLoading,
    chatError: feedLogic.chatError
  });

  // ✅ CALLBACKS MEJORADOS PARA INTEGRACIÓN EXTERNA
  const handleChatCreatedCallback = React.useCallback((chatData) => {
    console.log('💬 Chat created from FeedPage:', chatData);
    if (onChatCreated && typeof onChatCreated === 'function') {
      onChatCreated(chatData);
    }
  }, [onChatCreated]);

  const handleProfileViewCallback = React.useCallback((profileData) => {
    console.log('👤 Profile viewed from FeedPage:', profileData);
    if (onProfileView && typeof onProfileView === 'function') {
      onProfileView(profileData);
    }
  }, [onProfileView]);

  // ✅ PASAR TODO AL COMPONENTE DE DISEÑO CON CALLBACKS
  return (
    <FeedPageDesign 
      userType={userType}
      customTitle={customTitle}
      customSubtitle={customSubtitle}
      customIcon={customIcon}
      onOpenAuthModal={onOpenAuthModal}
      onChatCreated={handleChatCreatedCallback}
      onProfileView={handleProfileViewCallback}
      {...feedLogic}
    />
  );
};

export default FeedPage;