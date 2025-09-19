import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const UserContext = createContext();

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState({});
  const [favorites, setFavorites] = useState([]);
  const [teloPoints, setTeloPoints] = useState(0);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadUserData();
    } else {
      resetUserData();
    }
  }, [isAuthenticated, user]);

  const loadUserData = () => {
    // Cargar datos del usuario desde localStorage o API
    const savedProfile = localStorage.getItem(`profile_${user.id}`);
    const savedFavorites = localStorage.getItem(`favorites_${user.id}`);
    const savedPoints = localStorage.getItem(`telopoints_${user.id}`);
    const savedNotifications = localStorage.getItem(`notifications_${user.id}`);

    if (savedProfile) setProfile(JSON.parse(savedProfile));
    if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
    if (savedPoints) setTeloPoints(parseInt(savedPoints));
    if (savedNotifications) setNotifications(JSON.parse(savedNotifications));
  };

  const resetUserData = () => {
    setProfile({});
    setFavorites([]);
    setTeloPoints(0);
    setNotifications([]);
  };

  const updateProfile = (newProfileData) => {
    const updatedProfile = { ...profile, ...newProfileData };
    setProfile(updatedProfile);
    localStorage.setItem(`profile_${user.id}`, JSON.stringify(updatedProfile));
  };

  const addToFavorites = (postId) => {
    if (!favorites.includes(postId)) {
      const newFavorites = [...favorites, postId];
      setFavorites(newFavorites);
      localStorage.setItem(`favorites_${user.id}`, JSON.stringify(newFavorites));
      
      // Agregar puntos por favorito
      if (user.userType === 'client') {
        addTeloPoints(10, 'Añadir a favoritos');
      }
    }
  };

  const removeFromFavorites = (postId) => {
    const newFavorites = favorites.filter(id => id !== postId);
    setFavorites(newFavorites);
    localStorage.setItem(`favorites_${user.id}`, JSON.stringify(newFavorites));
  };

  const addTeloPoints = (points, reason) => {
    if (user && user.userType === 'client') {
      const newPoints = teloPoints + points;
      setTeloPoints(newPoints);
      localStorage.setItem(`telopoints_${user.id}`, newPoints.toString());
      
      // Agregar notificación
      addNotification({
        type: 'points',
        title: 'TeloPoints Ganados',
        message: `Has ganado ${points} TeloPoints por: ${reason}`,
        points: points
      });
    }
  };

  const useTeloPoints = (points, reason) => {
    if (user && user.userType === 'client' && teloPoints >= points) {
      const newPoints = teloPoints - points;
      setTeloPoints(newPoints);
      localStorage.setItem(`telopoints_${user.id}`, newPoints.toString());
      
      addNotification({
        type: 'points_used',
        title: 'TeloPoints Utilizados',
        message: `Has usado ${points} TeloPoints en: ${reason}`,
        points: -points
      });
      
      return true;
    }
    return false;
  };

  const addNotification = (notification) => {
    const newNotification = {
      id: Date.now(),
      ...notification,
      timestamp: new Date().toISOString(),
      read: false
    };
    
    const newNotifications = [newNotification, ...notifications];
    setNotifications(newNotifications);
    localStorage.setItem(`notifications_${user.id}`, JSON.stringify(newNotifications));
  };

  const markNotificationAsRead = (notificationId) => {
    const updatedNotifications = notifications.map(notif =>
      notif.id === notificationId ? { ...notif, read: true } : notif
    );
    setNotifications(updatedNotifications);
    localStorage.setItem(`notifications_${user.id}`, JSON.stringify(updatedNotifications));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    localStorage.removeItem(`notifications_${user.id}`);
  };

  const value = {
    profile,
    favorites,
    teloPoints,
    notifications,
    updateProfile,
    addToFavorites,
    removeFromFavorites,
    addTeloPoints,
    useTeloPoints,
    addNotification,
    markNotificationAsRead,
    clearAllNotifications
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};