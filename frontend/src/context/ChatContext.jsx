import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { chatAPI, handleApiError } from '../utils/api';

const ChatContext = createContext();

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cargar conversaciones cuando el usuario esté autenticado
  useEffect(() => {
    if (isAuthenticated && user) {
      loadConversations();
    } else {
      resetChatData();
    }
  }, [isAuthenticated, user]);

  // Resetear datos del chat
  const resetChatData = () => {
    setConversations([]);
    setActiveChat(null);
    setMessages([]);
    setError(null);
  };

  // Cargar conversaciones desde el backend
  const loadConversations = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await chatAPI.getChats({
        page: 1,
        limit: 50,
        archived: false
      });

      if (response.success) {
        const formattedConversations = response.data.chats.map(chat => ({
          id: chat.id,
          isGroup: chat.isGroup,
          participants: [user.id, chat.otherUser?.id].filter(Boolean),
          participantData: {
            [user.id]: {
              id: user.id,
              username: user.username,
              userType: user.userType,
              profileImage: user.avatar || '/api/placeholder/50/50'
            },
            ...(chat.otherUser && {
              [chat.otherUser.id]: {
                id: chat.otherUser.id,
                username: chat.otherUser.username,
                firstName: chat.otherUser.firstName,
                lastName: chat.otherUser.lastName,
                userType: chat.otherUser.userType,
                profileImage: chat.otherUser.avatar || '/api/placeholder/50/50'
              }
            })
          },
          lastMessage: chat.lastMessage,
          lastActivity: chat.lastActivity || chat.createdAt,
          unreadCount: chat.unreadCount || 0,
          isPinned: false,
          createdAt: chat.createdAt
        }));

        setConversations(formattedConversations);
      } else {
        throw new Error(response.message || 'Error al cargar conversaciones');
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      setError(handleApiError(error));
    } finally {
      setLoading(false);
    }
  };

  // Crear conversación o obtenerla si existe
  const createConversation = async (receiverId, receiverData) => {
    try {
      setLoading(true);
      setError(null);

      // Verificar si ya existe la conversación
      const existingConv = conversations.find(conv => 
        conv.participants.includes(receiverId)
      );

      if (existingConv) {
        setActiveChat(existingConv.id);
        await loadMessages(existingConv.id);
        return existingConv;
      }

      // Crear nueva conversación en el backend
      const response = await chatAPI.createOrGetChat(receiverId);

      if (response.success) {
        const newChat = response.data.chat;
        
        const newConversation = {
          id: newChat.id,
          isGroup: newChat.isGroup,
          participants: [user.id, receiverId],
          participantData: {
            [user.id]: {
              id: user.id,
              username: user.username,
              userType: user.userType,
              profileImage: user.avatar || '/api/placeholder/50/50'
            },
            [receiverId]: receiverData
          },
          lastMessage: null,
          lastActivity: newChat.lastActivity || newChat.createdAt,
          unreadCount: 0,
          isPinned: false,
          createdAt: newChat.createdAt
        };

        const updatedConversations = [newConversation, ...conversations];
        setConversations(updatedConversations);
        setActiveChat(newConversation.id);
        
        return newConversation;
      } else {
        throw new Error(response.message || 'Error al crear conversación');
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      setError(handleApiError(error));
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Cargar mensajes de una conversación
  const loadMessages = async (conversationId) => {
    try {
      setLoading(true);
      setError(null);
      setActiveChat(conversationId);

      const response = await chatAPI.getChatMessages(conversationId, {
        page: 1,
        limit: 100
      });

      if (response.success) {
        const formattedMessages = response.data.messages.map(message => ({
          id: message.id,
          conversationId,
          senderId: message.sender.id,
          content: message.content,
          type: message.messageType?.toLowerCase() || 'text',
          timestamp: message.createdAt,
          isEdited: message.isEdited,
          editedAt: message.editedAt,
          isDeleted: false,
          fileUrl: message.fileUrl,
          fileName: message.fileName,
          mimeType: message.mimeType,
          isMine: message.isMine
        }));

        setMessages(formattedMessages);
        markConversationAsRead(conversationId);
      } else {
        throw new Error(response.message || 'Error al cargar mensajes');
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      setError(handleApiError(error));
    } finally {
      setLoading(false);
    }
  };

  // Enviar mensaje
  const sendMessage = async (conversationId, content, type = 'text', file = null) => {
    try {
      setError(null);

      let response;
      
      if (type === 'image' && file) {
        // Enviar imagen
        response = await chatAPI.sendImageMessage(conversationId, content, file);
      } else {
        // Enviar mensaje de texto
        response = await chatAPI.sendMessage(conversationId, {
          content,
          messageType: type.toUpperCase()
        });
      }

      if (response.success) {
        const newMessage = {
          id: response.data.id,
          conversationId,
          senderId: user.id,
          content: response.data.content,
          type: response.data.messageType?.toLowerCase() || type,
          timestamp: response.data.createdAt,
          isEdited: false,
          isDeleted: false,
          fileUrl: response.data.fileUrl,
          fileName: response.data.fileName,
          mimeType: response.data.mimeType,
          isMine: true
        };

        // Agregar mensaje a la lista
        setMessages(prevMessages => [...prevMessages, newMessage]);

        // Actualizar conversación
        const updatedConversations = conversations.map(conv => {
          if (conv.id === conversationId) {
            return {
              ...conv,
              lastMessage: {
                content: content,
                messageType: type.toUpperCase(),
                createdAt: new Date().toISOString()
              },
              lastActivity: new Date().toISOString(),
              unreadCount: 0
            };
          }
          return conv;
        });

        setConversations(updatedConversations);
        return newMessage;
      } else {
        throw new Error(response.message || 'Error al enviar mensaje');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError(handleApiError(error));
      throw error;
    }
  };

  // Marcar conversación como leída
  const markConversationAsRead = (conversationId) => {
    const updatedConversations = conversations.map(conv =>
      conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
    );
    setConversations(updatedConversations);
  };

  // Editar mensaje (solo texto)
  const editMessage = async (messageId, newContent) => {
    try {
      setError(null);

      const response = await chatAPI.editMessage(messageId, newContent);

      if (response.success) {
        const updatedMessages = messages.map(msg =>
          msg.id === messageId 
            ? { 
                ...msg, 
                content: newContent, 
                isEdited: true, 
                editedAt: new Date().toISOString() 
              }
            : msg
        );
        setMessages(updatedMessages);
      } else {
        throw new Error(response.message || 'Error al editar mensaje');
      }
    } catch (error) {
      console.error('Error editing message:', error);
      setError(handleApiError(error));
      throw error;
    }
  };

  // Eliminar mensaje
  const deleteMessage = async (messageId) => {
    try {
      setError(null);

      const response = await chatAPI.deleteMessage(messageId);

      if (response.success) {
        const updatedMessages = messages.map(msg =>
          msg.id === messageId 
            ? { ...msg, isDeleted: true, deletedAt: new Date().toISOString() }
            : msg
        );
        setMessages(updatedMessages);
      } else {
        throw new Error(response.message || 'Error al eliminar mensaje');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      setError(handleApiError(error));
      throw error;
    }
  };

  // Archivar/desarchivar chat
  const toggleArchiveChat = async (conversationId) => {
    try {
      setError(null);

      const response = await chatAPI.toggleArchive(conversationId);

      if (response.success) {
        await loadConversations(); // Recargar lista
      } else {
        throw new Error(response.message || 'Error al archivar chat');
      }
    } catch (error) {
      console.error('Error toggling archive:', error);
      setError(handleApiError(error));
      throw error;
    }
  };

  // Buscar mensajes
  const searchMessages = async (conversationId, query) => {
    try {
      setError(null);

      const response = await chatAPI.searchMessages(conversationId, {
        q: query,
        page: 1,
        limit: 20
      });

      if (response.success) {
        return response.data.messages;
      } else {
        throw new Error(response.message || 'Error en la búsqueda');
      }
    } catch (error) {
      console.error('Error searching messages:', error);
      setError(handleApiError(error));
      throw error;
    }
  };

  // Obtener conversaciones ordenadas
  const getSortedConversations = () => {
    return [...conversations].sort((a, b) => {
      // Primero conversaciones fijadas
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      
      // Luego por última actividad
      return new Date(b.lastActivity) - new Date(a.lastActivity);
    });
  };

  const value = {
    conversations: getSortedConversations(),
    activeChat,
    messages: messages.filter(msg => !msg.isDeleted),
    loading,
    error,
    createConversation,
    sendMessage,
    loadMessages,
    editMessage,
    deleteMessage,
    markConversationAsRead,
    toggleArchiveChat,
    searchMessages,
    loadConversations,
    setError,
    setActiveChat
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};