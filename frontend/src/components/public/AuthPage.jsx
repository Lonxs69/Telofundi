import React, { useState } from 'react';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import ForgotPasswordPage from './ForgotPasswordPage';

const AuthPage = ({ isOpen, onClose, initialMode = 'login' }) => {
  const [currentMode, setCurrentMode] = useState(initialMode);

  // ✅ DETECTAR TIPO DE USUARIO Y MODO CUANDO SE ABRE EL MODAL
  React.useEffect(() => {
    if (isOpen) {
      // Verificar si hay un tipo de usuario guardado para registro
      const savedUserType = sessionStorage.getItem('registerUserType');
      
      if (savedUserType) {
        console.log(`🔍 Detectado tipo de usuario guardado: ${savedUserType}, abriendo registro`);
        setCurrentMode('register');
        // Mantener el tipo guardado para que RegisterPage lo pueda usar
      } else {
        // Si no hay tipo guardado, usar el modo inicial
        setCurrentMode(initialMode);
      }
    }
  }, [isOpen, initialMode]);

  const handleClose = () => {
    setCurrentMode('login'); // Reset al cerrar
    // ✅ LIMPIAR EL TIPO DE USUARIO GUARDADO AL CERRAR
    sessionStorage.removeItem('registerUserType');
    onClose();
  };

  const switchToLogin = () => {
    setCurrentMode('login');
    // ✅ LIMPIAR TIPO DE USUARIO AL CAMBIAR A LOGIN
    sessionStorage.removeItem('registerUserType');
  };

  const switchToRegister = () => {
    setCurrentMode('register');
    // ✅ NO limpiar registerUserType aquí porque puede venir del HomePage
  };

  const switchToForgot = () => {
    setCurrentMode('forgot');
    // ✅ LIMPIAR TIPO DE USUARIO AL CAMBIAR A FORGOT
    sessionStorage.removeItem('registerUserType');
  };

  // Renderizar el componente correspondiente según el modo
  switch (currentMode) {
    case 'login':
      return (
        <LoginPage
          isOpen={isOpen}
          onClose={handleClose}
          onSwitchToRegister={switchToRegister}
          onSwitchToForgot={switchToForgot}
        />
      );
    case 'register':
      return (
        <RegisterPage
          isOpen={isOpen}
          onClose={handleClose}
          onSwitchToLogin={switchToLogin}
        />
      );
    case 'forgot':
      return (
        <ForgotPasswordPage
          isOpen={isOpen}
          onClose={handleClose}
          onSwitchToLogin={switchToLogin}
        />
      );
    default:
      return (
        <LoginPage
          isOpen={isOpen}
          onClose={handleClose}
          onSwitchToRegister={switchToRegister}
          onSwitchToForgot={switchToForgot}
        />
      );
  }
};

export default AuthPage;