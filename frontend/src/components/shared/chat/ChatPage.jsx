import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { chatAPI } from '../../../utils/api';
import './ChatPage.css';

// Iconos simplificados (mantenidos igual)
const SearchIcon = ({ size = 16, color = "#9CA3AF" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <path d="m21 21-4.35-4.35"></path>
  </svg>
);

const SendIcon = ({ size = 16, color = "white" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22,2 15,22 11,13 2,9 22,2"></polygon>
  </svg>
);

const MessageCircleIcon = ({ size = 48, color = "#9CA3AF" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
  </svg>
);

const BackIcon = ({ size = 20, color = "#9CA3AF" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m15 18-6-6 6-6"></path>
  </svg>
);

const DotsVerticalIcon = ({ size = 20, color = "#9CA3AF" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="1"></circle>
    <circle cx="12" cy="5" r="1"></circle>
    <circle cx="12" cy="19" r="1"></circle>
  </svg>
);

const UserIcon = ({ size = 48, color = "#9CA3AF" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

// ✅ NUEVO: Icono de prioridad
const StarIcon = ({ size = 16, color = "#FFD700" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="1">
    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"></polygon>
  </svg>
);

// Componente Avatar con fallback (mantenido igual)
const Avatar = ({ src, alt, size = 48, className = "", style = {} }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const avatarStyle = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    backgroundColor: '#374151',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    ...style
  };

  if (imageError || !src) {
    return (
      <div style={avatarStyle} className={className}>
        <UserIcon size={size * 0.6} color="#6B7280" />
      </div>
    );
  }

  return (
    <div style={avatarStyle} className={className}>
      {!imageLoaded && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#374151'
        }}>
          <UserIcon size={size * 0.6} color="#6B7280" />
        </div>
      )}
      <img 
        src={src}
        alt={alt}
        onError={handleImageError}
        onLoad={handleImageLoad}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: imageLoaded ? 1 : 0,
          transition: 'opacity 0.2s'
        }}
      />
    </div>
  );
};

const ChatPage = ({ 
  userType = 'client',
  initialChatId = null,
  targetUserId = null,
  onBack = null
}) => {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // ✅ NUEVA FUNCIÓN: Verificar si un usuario tiene prioridad en chat
  const hasChatPriority = (otherUser) => {
    if (!otherUser?.client?.chatPriorityUntil) return false;
    
    const now = new Date();
    const priorityUntil = new Date(otherUser.client.chatPriorityUntil);
    
    return priorityUntil > now;
  };

  // ✅ NUEVA FUNCIÓN: Ordenar chats con prioridad
  const sortChatsWithPriority = (chats, currentUserId) => {
    return chats.sort((a, b) => {
      // Obtener el otro usuario en cada chat
      const otherUserA = a.otherUser;
      const otherUserB = b.otherUser;
      
      // Verificar si tienen chat priority activo
      const aPriority = hasChatPriority(otherUserA);
      const bPriority = hasChatPriority(otherUserB);
      
      console.log('🔍 Sorting chats:', {
        chatA: a.id,
        userA: otherUserA?.username,
        priorityA: aPriority,
        priorityUntilA: otherUserA?.client?.chatPriorityUntil,
        chatB: b.id,
        userB: otherUserB?.username,
        priorityB: bPriority,
        priorityUntilB: otherUserB?.client?.chatPriorityUntil
      });
      
      // Si uno tiene prioridad y otro no, el que tiene prioridad va primero
      if (aPriority && !bPriority) return -1;
      if (!aPriority && bPriority) return 1;
      
      // Si ambos tienen prioridad o ninguno la tiene, ordenar por lastActivity
      const dateA = new Date(a.lastActivity || a.createdAt);
      const dateB = new Date(b.lastActivity || b.createdAt);
      
      return dateB - dateA; // Más reciente primero
    });
  };

  // Detectar cambios de tamaño de pantalla
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Configuración por tipo de usuario
  const getConfig = () => {
    switch (userType) {
      case 'admin':
        return {
          title: 'Chat Administrativo',
          primaryColor: '#dc2626',
          messagePlaceholder: 'Escribe un mensaje...'
        };
      case 'agency':
        return {
          title: 'Mensajes Agencia',
          primaryColor: '#FF6B35',
          messagePlaceholder: 'Escribe un mensaje...'
        };
      case 'escort':
        return {
          title: 'Mensajes',
          primaryColor: '#FF6B35',
          messagePlaceholder: 'Escribe un mensaje...'
        };
      default:
        return {
          title: 'Mensajes',
          primaryColor: '#FF6B35',
          messagePlaceholder: 'Escribe un mensaje...'
        };
    }
  };

  const config = getConfig();

  // ✅ VERIFICAR que el usuario esté autenticado
  useEffect(() => {
    if (!user) {
      setError('Debes iniciar sesión para usar el chat');
      return;
    }

    console.log('👤 Usuario autenticado:', {
      id: user.id,
      userType: user.userType,
      username: user.username
    });
  }, [user]);

  // Cargar chats al inicializar
  useEffect(() => {
    if (user) {
      if (targetUserId) {
        console.log('🔍 Verificando chats existentes antes de crear nuevo...');
        loadChats().then(() => {
          setTimeout(() => {
            const existingChat = chats.find(chat => 
              chat.otherUser?.id === targetUserId || 
              (chat.members && chat.members.some(member => member.user?.id === targetUserId))
            );
            
            if (existingChat) {
              console.log('✅ Chat existente encontrado, usando existente:', existingChat.id);
              setSelectedChat(existingChat);
              loadMessages(existingChat.id);
            } else {
              console.log('❌ No existe chat, creando nuevo...');
              createChatWithUser(targetUserId);
            }
          }, 100);
        });
      } else if (initialChatId) {
        loadChatById(initialChatId);
      } else {
        loadChats();
      }
    }
  }, [user, targetUserId, initialChatId]);

  // Scroll a los últimos mensajes
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [messageInput]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // ✅ CORREGIDO: Crear/obtener chat con usuario específico
  const createChatWithUser = async (userId) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🚀 Creando chat con usuario:', userId);
      
      const response = await chatAPI.createOrGetChat(userId);
      
      console.log('📝 Respuesta createOrGetChat:', response);
      
      if (response.success) {
        const chat = response.data.chat;
        setSelectedChat(formatChatForDisplay(chat));
        await loadMessages(chat.id);
        
        // Agregar a la lista si no existe
        setChats(prevChats => {
          const exists = prevChats.find(c => c.id === chat.id);
          if (!exists) {
            const newChats = [formatChatForList(chat), ...prevChats];
            // ✅ APLICAR ORDENAMIENTO CON PRIORIDAD
            return sortChatsWithPriority(newChats, user.id);
          }
          return prevChats;
        });
      } else {
        setError(response.message || 'Error al crear el chat');
      }
    } catch (error) {
      console.error('❌ Error creating chat with user:', error);
      setError(error.message || 'Error al conectar con el usuario');
    } finally {
      setLoading(false);
    }
  };

  // ✅ CORREGIDO: Cargar chat específico por ID
  const loadChatById = async (chatId) => {
    try {
      setLoading(true);
      setError(null);
      
      await loadChats();
      
      const foundChat = chats.find(c => c.id === chatId);
      if (foundChat) {
        setSelectedChat(foundChat);
        await loadMessages(chatId);
      } else {
        setError('Chat no encontrado');
      }
    } catch (error) {
      console.error('❌ Error loading chat by ID:', error);
      setError('Error al cargar el chat');
    } finally {
      setLoading(false);
    }
  };

  // ✅ CORREGIDO: Cargar lista de chats CON ORDENAMIENTO POR PRIORIDAD
  const loadChats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📋 Cargando lista de chats...');
      
      const response = await chatAPI.getChats({
        page: 1,
        limit: 50,
        archived: false
      });

      console.log('📝 Respuesta getChats:', response);

      if (response.success) {
        const formattedChats = (response.data.chats || []).map(formatChatForList);
        
        // ✅ APLICAR ORDENAMIENTO CON PRIORIDAD
        const sortedChats = sortChatsWithPriority(formattedChats, user.id);
        
        setChats(sortedChats);
        
        console.log('✅ Chats cargados y ordenados por prioridad:', {
          total: sortedChats.length,
          priorityChats: sortedChats.filter(chat => hasChatPriority(chat.otherUser)).length
        });
      } else {
        setError(response.message || 'Error al cargar los chats');
      }
    } catch (error) {
      console.error('❌ Error loading chats:', error);
      setError('Error al cargar los chats');
    } finally {
      setLoading(false);
    }
  };

  // ✅ CORREGIDO: Formatear chat para la lista CON INFORMACIÓN DE PRIORIDAD
  const formatChatForList = (chat) => {
    const otherUser = chat.otherUser;
    const hasPriority = hasChatPriority(otherUser);
    
    return {
      id: chat.id,
      name: otherUser ? `${otherUser.firstName || ''} ${otherUser.lastName || ''}`.trim() || otherUser.username || 'Usuario' : 'Chat',
      avatar: otherUser?.avatar || '/api/placeholder/48/48',
      otherUser: otherUser,
      lastMessage: chat.lastMessage,
      unreadCount: chat.unreadCount || 0,
      lastActivity: chat.lastActivity,
      isGroup: chat.isGroup || false,
      isDisputeChat: chat.isDisputeChat || false,
      // ✅ AGREGAR INFORMACIÓN DE PRIORIDAD
      hasPriority: hasPriority,
      priorityUntil: otherUser?.client?.chatPriorityUntil
    };
  };

  // ✅ CORREGIDO: Formatear chat para display
  const formatChatForDisplay = (chat) => {
    return formatChatForList(chat);
  };

  // ✅ CORREGIDO: Cargar mensajes de un chat
  const loadMessages = async (chatId) => {
    try {
      setLoadingMessages(true);
      setError(null);

      console.log('💬 Cargando mensajes para chat:', chatId);
      console.log('👤 Usuario actual ID:', user?.id);

      const response = await chatAPI.getChatMessages(chatId, {
        page: 1,
        limit: 50
      });

      console.log('📝 Respuesta getChatMessages:', response);

      if (response.success) {
        const formattedMessages = (response.data.messages || []).map(msg => {
          const isMine = msg.senderId === user.id;
          console.log(`📤 Mensaje ${msg.id}: senderId=${msg.senderId}, userId=${user.id}, isMine=${isMine}`);
          return {
            ...msg,
            isMine: isMine
          };
        });
        setMessages(formattedMessages);
        console.log('✅ Mensajes cargados:', formattedMessages.length);
      } else {
        setError(response.message || 'Error al cargar los mensajes');
      }
    } catch (error) {
      console.error('❌ Error loading messages:', error);
      setError('Error al cargar los mensajes');
    } finally {
      setLoadingMessages(false);
    }
  };

  // ✅ CORREGIDO: Enviar mensaje Y REORDENAR CHATS
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedChat || sendingMessage) return;

    const messageContent = messageInput.trim();
    setMessageInput('');
    setSendingMessage(true);

    const tempMessage = {
      id: `temp-${Date.now()}`,
      content: messageContent,
      messageType: 'TEXT',
      senderId: user.id,
      isMine: true,
      createdAt: new Date().toISOString(),
      isTemporary: true
    };
    
    setMessages(prevMessages => [...prevMessages, tempMessage]);

    try {
      console.log('📤 Enviando mensaje:', {
        chatId: selectedChat.id,
        content: messageContent,
        messageType: 'TEXT',
        userId: user.id
      });

      const response = await chatAPI.sendMessage(selectedChat.id, {
        content: messageContent,
        messageType: 'TEXT'
      });

      console.log('📝 Respuesta sendMessage:', response);

      if (response.success) {
        const newMessage = {
          ...response.data,
          isMine: true
        };
        
        console.log(`✅ Mensaje enviado - ID: ${newMessage.id}, senderId: ${newMessage.senderId}, isMine: ${newMessage.isMine}`);
        
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === tempMessage.id ? newMessage : msg
          )
        );
        
        // ✅ ACTUALIZAR Y REORDENAR CHATS CON PRIORIDAD
        setChats(prevChats => {
          const updatedChats = prevChats.map(chat => 
            chat.id === selectedChat.id 
              ? { 
                  ...chat, 
                  lastMessage: {
                    content: messageContent,
                    messageType: 'TEXT',
                    createdAt: new Date().toISOString()
                  },
                  lastActivity: new Date().toISOString()
                }
              : chat
          );
          
          // ✅ REORDENAR CON PRIORIDAD DESPUÉS DE ACTUALIZAR
          return sortChatsWithPriority(updatedChats, user.id);
        });

        console.log('✅ Mensaje enviado exitosamente');
      } else {
        setMessages(prevMessages => 
          prevMessages.filter(msg => msg.id !== tempMessage.id)
        );
        setError(response.message || 'Error al enviar el mensaje');
        setMessageInput(messageContent);
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
      setMessages(prevMessages => 
        prevMessages.filter(msg => msg.id !== tempMessage.id)
      );
      setError(error.message || 'Error al enviar el mensaje');
      setMessageInput(messageContent);
    } finally {
      setSendingMessage(false);
    }
  };

  // Manejar Enter en textarea
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ✅ CORREGIDO: Manejar selección de chat
  const handleChatSelection = async (chat) => {
    console.log('🎯 Seleccionando chat:', chat.id);
    
    if (selectedChat?.id === chat.id) {
      console.log('⚠️ Chat ya está seleccionado, ignorando');
      return;
    }
    
    setSelectedChat(chat);
    await loadMessages(chat.id);
  };

  // Manejar volver en móvil
  const handleMobileBack = () => {
    setSelectedChat(null);
  };

  // ✅ MANTENER ORDENAMIENTO AL FILTRAR
  const filteredChats = chats.filter(chat => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const name = chat.name.toLowerCase();
    
    return name.includes(searchLower);
  });

  // Formatear tiempo relativo
  const formatTime = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Ahora';
    if (diffInHours < 24) return `${diffInHours}h`;
    if (diffInHours < 48) return 'Ayer';
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d`;
    
    return date.toLocaleDateString();
  };

  // Formatear hora del mensaje
  const formatMessageTime = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // ✅ CORREGIDO: Renderizar mensaje con diseño mejorado y texto blanco
  const renderMessage = (message) => {
    const isOwn = message.isMine;
    
    return (
      <div
        key={message.id}
        className={`message-wrapper ${isOwn ? 'message-wrapper-own' : 'message-wrapper-other'}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isOwn ? 'flex-end' : 'flex-start',
          margin: '4px 0'
        }}
      >
        <div
          className={`message-bubble ${isOwn ? 'message-bubble-own' : 'message-bubble-other'} ${message.isTemporary ? 'message-sending' : ''}`}
          style={{
            backgroundColor: isOwn ? '#FF6B35' : '#1f2937',
            color: '#ffffff',
            borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
            padding: '12px 16px',
            maxWidth: '75%',
            wordWrap: 'break-word',
            position: 'relative',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
            marginBottom: '2px'
          }}
        >
          <div className="message-content">
            <p style={{ 
              margin: 0, 
              lineHeight: '1.4',
              fontSize: '15px',
              color: '#ffffff'
            }}>
              {message.content}
            </p>
          </div>
        </div>
        
        <div 
          className="message-time"
          style={{ 
            fontSize: '11px',
            color: '#6b7280',
            marginTop: '2px',
            marginLeft: isOwn ? '0' : '12px',
            marginRight: isOwn ? '12px' : '0'
          }}
        >
          {formatMessageTime(message.createdAt)}
          {message.isTemporary && (
            <span style={{ marginLeft: '4px', opacity: 0.7 }}>...</span>
          )}
        </div>
      </div>
    );
  };

  // ✅ Mostrar estado de carga
  if (!user) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#000000', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: 'white'
      }}>
        <div>Cargando datos del usuario...</div>
      </div>
    );
  }

  const sidebarStyles = {
    width: isMobile ? '100%' : '350px',
    backgroundColor: '#000000',
    borderRight: isMobile ? 'none' : '1px solid #1f2937',
    display: (isMobile && selectedChat) ? 'none' : 'flex',
    flexDirection: 'column',
    height: '100vh'
  };

  const conversationStyles = {
    flex: 1,
    backgroundColor: '#000000',
    display: (isMobile && !selectedChat) ? 'none' : 'flex',
    flexDirection: 'column',
    height: '100vh'
  };

  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh', 
      backgroundColor: '#000000',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      
      {/* Sidebar de chats */}
      <div style={sidebarStyles}>
        {/* Header */}
        <div style={{ 
          padding: '16px 20px',
          borderBottom: '1px solid #1f2937',
          backgroundColor: '#000000'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: '16px'
          }}>
            {onBack && (
              <button 
                onClick={onBack}
                style={{ 
                  backgroundColor: 'transparent', 
                  border: 'none', 
                  color: '#9ca3af', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#1f2937';
                  e.target.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#9ca3af';
                }}
              >
                <BackIcon size={16} color="currentColor" />
                <span style={{ fontSize: '14px' }}>Volver</span>
              </button>
            )}
            
            <h1 style={{ 
              color: 'white', 
              margin: 0, 
              fontSize: '24px', 
              fontWeight: '600',
              flex: 1,
              textAlign: onBack ? 'center' : 'left'
            }}>
              {config.title}
            </h1>
          </div>
          
          {/* Buscador */}
          <div style={{ 
            position: 'relative',
            backgroundColor: '#1f2937',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            border: '1px solid #374151'
          }}>
            <SearchIcon size={16} color="#6b7280" />
            <input
              type="text"
              placeholder="Buscar conversaciones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ 
                backgroundColor: 'transparent', 
                color: 'white', 
                border: 'none', 
                outline: 'none', 
                marginLeft: '8px',
                padding: '12px 0',
                width: '100%',
                fontSize: '14px'
              }}
            />
          </div>
        </div>

        {/* Lista de chats */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto',
          backgroundColor: '#000000'
        }}>
          {loading && chats.length === 0 ? (
            <div style={{ 
              color: '#6b7280', 
              padding: '40px 20px', 
              textAlign: 'center',
              fontSize: '14px'
            }}>
              Cargando chats...
            </div>
          ) : filteredChats.length === 0 ? (
            <div style={{ 
              color: '#6b7280', 
              padding: '40px 20px', 
              textAlign: 'center',
              fontSize: '14px'
            }}>
              {searchTerm ? 'No se encontraron chats' : 'No tienes conversaciones'}
            </div>
          ) : (
            filteredChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => handleChatSelection(chat)}
                style={{
                  padding: '16px 20px',
                  cursor: 'pointer',
                  backgroundColor: selectedChat?.id === chat.id ? '#1f2937' : 'transparent',
                  borderLeft: selectedChat?.id === chat.id ? '3px solid #FF6B35' : '3px solid transparent',
                  transition: 'all 0.2s',
                  borderBottom: '1px solid #111827',
                  // ✅ DESTACAR CHATS CON PRIORIDAD
                  ...(chat.hasPriority && {
                    borderLeft: selectedChat?.id === chat.id ? '3px solid #FFD700' : '3px solid #FFD700',
                    backgroundColor: selectedChat?.id === chat.id ? '#1f2937' : 'rgba(255, 215, 0, 0.05)'
                  })
                }}
                onMouseEnter={(e) => {
                  if (selectedChat?.id !== chat.id) {
                    e.currentTarget.style.backgroundColor = chat.hasPriority ? 'rgba(255, 215, 0, 0.1)' : '#111827';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedChat?.id !== chat.id) {
                    e.currentTarget.style.backgroundColor = chat.hasPriority ? 'rgba(255, 215, 0, 0.05)' : 'transparent';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ position: 'relative' }}>
                    <Avatar 
                      src={chat.avatar}
                      alt={chat.name}
                      size={46}
                      style={{
                        // ✅ BORDE DORADO PARA USUARIOS CON PRIORIDAD
                        ...(chat.hasPriority && {
                          border: '2px solid #FFD700',
                          boxShadow: '0 0 8px rgba(255, 215, 0, 0.3)'
                        })
                      }}
                    />
                    {/* ✅ ICONO DE PRIORIDAD */}
                    {chat.hasPriority && (
                      <div style={{
                        position: 'absolute',
                        top: '-2px',
                        left: '-2px',
                        backgroundColor: '#FFD700',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid #000000'
                      }}>
                        <StarIcon size={10} color="#000000" />
                      </div>
                    )}
                    {chat.unreadCount > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '-2px',
                        right: '-2px',
                        backgroundColor: '#FF6B35',
                        color: 'white',
                        borderRadius: '50%',
                        minWidth: '18px',
                        height: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        fontWeight: '600',
                        border: '2px solid #000000'
                      }}>
                        {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                      </div>
                    )}
                  </div>
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '4px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
                        <h3 style={{ 
                          color: chat.hasPriority ? '#FFD700' : 'white', 
                          margin: 0, 
                          fontSize: '15px', 
                          fontWeight: chat.hasPriority ? '600' : '500',
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap'
                        }}>
                          {chat.name}
                        </h3>
                        {/* ✅ BADGE DE PRIORIDAD */}
                        {chat.hasPriority && (
                          <span style={{
                            backgroundColor: '#FFD700',
                            color: '#000000',
                            fontSize: '8px',
                            fontWeight: '600',
                            padding: '2px 4px',
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            VIP
                          </span>
                        )}
                      </div>
                      <span style={{ 
                        color: '#6b7280', 
                        fontSize: '12px',
                        flexShrink: 0,
                        marginLeft: '8px'
                      }}>
                        {formatTime(chat.lastActivity)}
                      </span>
                    </div>
                    <p style={{ 
                      color: '#9ca3af', 
                      margin: 0, 
                      fontSize: '13px', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: 'nowrap'
                    }}>
                      {chat.lastMessage?.content || 'Nueva conversación'}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Área de conversación - MANTENER IGUAL */}
      <div style={conversationStyles}>
        {selectedChat ? (
          <>
            {/* Header de la conversación */}
            <div style={{ 
              backgroundColor: '#000000',
              borderBottom: '1px solid #1f2937',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              {isMobile && (
                <button 
                  onClick={handleMobileBack}
                  style={{ 
                    backgroundColor: 'transparent', 
                    border: 'none', 
                    color: '#9ca3af', 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#1f2937';
                    e.target.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = '#9ca3af';
                  }}
                >
                  <BackIcon size={18} color="currentColor" />
                </button>
              )}
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                <div style={{ position: 'relative' }}>
                  <Avatar 
                    src={selectedChat.avatar}
                    alt={selectedChat.name}
                    size={40}
                    style={{
                      ...(selectedChat.hasPriority && {
                        border: '2px solid #FFD700',
                        boxShadow: '0 0 6px rgba(255, 215, 0, 0.3)'
                      })
                    }}
                  />
                  {selectedChat.hasPriority && (
                    <div style={{
                      position: 'absolute',
                      top: '-2px',
                      left: '-2px',
                      backgroundColor: '#FFD700',
                      borderRadius: '50%',
                      width: '16px',
                      height: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid #000000'
                    }}>
                      <StarIcon size={8} color="#000000" />
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <h3 style={{ 
                      color: selectedChat.hasPriority ? '#FFD700' : 'white', 
                      margin: 0, 
                      fontSize: '16px', 
                      fontWeight: selectedChat.hasPriority ? '600' : '500'
                    }}>
                      {selectedChat.name}
                    </h3>
                    {selectedChat.hasPriority && (
                      <span style={{
                        backgroundColor: '#FFD700',
                        color: '#000000',
                        fontSize: '9px',
                        fontWeight: '600',
                        padding: '2px 5px',
                        borderRadius: '4px',
                        textTransform: 'uppercase'
                      }}>
                        VIP
                      </span>
                    )}
                  </div>
                  <p style={{ 
                    color: '#6b7280', 
                    margin: 0, 
                    fontSize: '13px' 
                  }}>
                    {selectedChat.otherUser?.userType || 'Usuario'}
                  </p>
                </div>
              </div>
              
              <button style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#9ca3af',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '8px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#1f2937';
                e.target.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = '#9ca3af';
              }}>
                <DotsVerticalIcon size={18} color="currentColor" />
              </button>
            </div>

            {/* Mensajes */}
            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              padding: '20px',
              backgroundColor: '#000000'
            }}>
              {loadingMessages ? (
                <div style={{ 
                  color: '#6b7280', 
                  textAlign: 'center', 
                  padding: '40px',
                  fontSize: '14px'
                }}>
                  Cargando mensajes...
                </div>
              ) : messages.length === 0 ? (
                <div style={{ 
                  color: '#6b7280', 
                  textAlign: 'center', 
                  padding: '40px',
                  fontSize: '14px'
                }}>
                  No hay mensajes. ¡Inicia la conversación!
                </div>
              ) : (
                messages.map(renderMessage)
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input de mensaje */}
            <div style={{ 
              backgroundColor: '#000000',
              borderTop: '1px solid #1f2937',
              padding: '16px 20px'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'flex-end', 
                gap: '12px',
                backgroundColor: '#1f2937',
                borderRadius: '24px',
                padding: '8px 8px 8px 16px',
                border: '1px solid #374151'
              }}>
                <textarea
                  ref={textareaRef}
                  placeholder={config.messagePlaceholder}
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  rows={1}
                  disabled={sendingMessage}
                  maxLength={5000}
                  style={{
                    width: '100%',
                    backgroundColor: 'transparent',
                    color: 'white',
                    border: 'none',
                    outline: 'none',
                    resize: 'none',
                    maxHeight: '120px',
                    minHeight: '20px',
                    fontSize: '15px',
                    lineHeight: '20px',
                    padding: '8px 0'
                  }}
                />

                <button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || sendingMessage}
                  style={{
                    backgroundColor: messageInput.trim() && !sendingMessage ? '#FF6B35' : '#374151',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    cursor: messageInput.trim() && !sendingMessage ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    flexShrink: 0
                  }}
                >
                  <SendIcon size={16} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: '#6b7280',
            textAlign: 'center',
            padding: '40px',
            backgroundColor: '#000000'
          }}>
            <MessageCircleIcon size={80} color="#374151" />
            <h3 style={{ 
              color: 'white', 
              margin: '24px 0 8px 0',
              fontSize: '20px',
              fontWeight: '500'
            }}>
              Selecciona una conversación
            </h3>
            <p style={{ 
              color: '#6b7280', 
              margin: 0,
              fontSize: '15px',
              maxWidth: '300px',
              lineHeight: '1.5'
            }}>
              {userType === 'admin' 
                ? 'Gestiona comunicaciones con usuarios de la plataforma'
                : userType === 'agency'
                ? 'Gestiona las conversaciones con tus escorts'
                : userType === 'escort'
                ? 'Elige un chat para conversar con tus clientes'
                : 'Elige un chat para comenzar a conversar'
              }
            </p>
          </div>
        )}
      </div>

      {/* Error toast */}
      {error && (
        <div 
          onClick={() => setError(null)}
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: '#dc2626',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '12px',
            cursor: 'pointer',
            zIndex: 1000,
            maxWidth: '300px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
};

export default ChatPage;