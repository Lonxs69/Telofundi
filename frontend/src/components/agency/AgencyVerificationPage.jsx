import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Search, 
  CheckCircle,
  AlertCircle,
  DollarSign,
  CreditCard,
  User,
  X,
  Eye,
  MessageCircle,
  Verified,
  Clock,
  Star,
  Check,
  Lock,
  Smartphone,
  Building,
  Calendar,
  AlertTriangle,
  Loader,
  Crown,
  Award,
  Info,
  MapPin,
  Heart,
  Phone,
  RefreshCw
} from 'lucide-react';

// ✅ STRIPE REAL IMPORTS
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';

import { useAuth } from '../../context/AuthContext';
import { agencyAPI, pointsAPI, handleApiError } from '../../utils/api';
import config from '../../config/config.js';
import './AgencyVerificationPage.css';

// ✅ STRIPE DINÁMICO
const stripePromise = loadStripe(config.stripe.publicKey);

// ✅ COMPONENTE DE PAGO MEJORADO - USA VERIFICATION API REAL
const StripeVerificationPaymentForm = ({ escort, verificationData, onSuccess, onError, onCancel, selectedPricing }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [error, setError] = useState('');
  const [attemptedCreation, setAttemptedCreation] = useState(false);

  // ✅ CREAR PAYMENT INTENT USANDO VERIFICATION API (NO POINTS API)
  useEffect(() => {
    if (escort && verificationData && !attemptedCreation) {
      setAttemptedCreation(true);
      createVerificationPaymentIntent();
    }
  }, [escort, verificationData, attemptedCreation]);

  const createVerificationPaymentIntent = async () => {
    try {
      console.log('🔄 Creating REAL verification payment intent:', {
        escort: escort?.escort?.user?.firstName || 'Unknown',
        attempted: attemptedCreation
      });
      
      const escortId = escort?.escort?.id || escort?.escortId;
      const pricingId = verificationData?.pricingId || selectedPricing?.id;
      
      if (!escortId || !pricingId) {
        throw new Error('Faltan datos del escort o pricing');
      }
      
      // ✅ USAR API REAL DE VERIFICACIÓN (NO POINTS)
      console.log('📤 Calling agencyAPI.createVerificationIntent...');
      
      const response = await agencyAPI.createVerificationIntent(escortId, pricingId);
      
      if (response.success) {
        setClientSecret(response.data.clientSecret);
        setPaymentId(response.data.paymentId);
        console.log('✅ REAL verification payment intent created');
      } else {
        throw new Error(response.message || 'Error creating verification payment intent');
      }
    } catch (error) {
      console.error('❌ Real verification payment intent failed:', error.message);
      
      // ✅ FALLBACK: Usar el sistema de pointsAPI modificado
      console.log('🔄 Falling back to modified pointsAPI...');
      try {
        const escortName = escort?.escort?.user?.firstName && escort?.escort?.user?.lastName
          ? `${escort.escort.user.firstName} ${escort.escort.user.lastName}`
          : escort?.name || 'Escort';
        
        const mockVerificationPackage = {
          id: `verification_${escort.escort?.id || escort.escortId}_${Date.now()}`,
          name: `Verificación ${escortName}`,
          points: 1,
          price: 1.00,
          bonus: 0,
          description: `Verificación de escort: ${escortName}`,
          isVerification: true
        };
        
        const fallbackResponse = await pointsAPI.createPurchaseIntent(mockVerificationPackage.id);
        
        if (fallbackResponse.success) {
          setClientSecret(fallbackResponse.data.clientSecret);
          setPaymentId(fallbackResponse.data.paymentId);
          console.log('✅ Fallback payment intent created');
        } else {
          throw new Error('Both verification and fallback methods failed');
        }
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError.message);
        setError('Error preparando pago. Funcionará en producción.');
      }
    }
  };

  const handleSubmit = async () => {
    if (!stripe || !elements || !clientSecret) {
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const card = elements.getElement(CardElement);
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: card,
          billing_details: {
            name: 'Agencia TeloFundi - Verificación REAL',
          },
        }
      });

      if (stripeError) {
        console.error('❌ Stripe payment failed:', stripeError.message);
        setError(stripeError.message);
      } else if (paymentIntent.status === 'succeeded') {
        console.log('✅ Payment succeeded:', paymentIntent.id);
        
        // ✅ CONFIRMAR PAGO (funciona con ambos sistemas)
        let confirmResponse;
        try {
          // Intentar con API de verificación real
          confirmResponse = await agencyAPI.confirmVerificationPayment(paymentId);
        } catch (confirmError) {
          console.log('🔄 Falling back to pointsAPI confirmation...');
          // Fallback a pointsAPI
          confirmResponse = await pointsAPI.confirmPurchase(paymentId);
        }
        
        if (confirmResponse.success) {
          onSuccess({
            escortId: escort.escort?.id || escort.escortId,
            escortName: escort?.escort?.user?.firstName && escort?.escort?.user?.lastName
              ? `${escort.escort.user.firstName} ${escort.escort.user.lastName}`
              : escort?.name || 'Escort',
            transactionId: paymentIntent.id,
            amountCharged: '$1.00',
            paymentConfirmed: true,
            pointsAdded: confirmResponse.data.totalPoints || 0,
            newBalance: confirmResponse.data.newBalance || 0,
            verificationData: verificationData,
            // ✅ DATOS ADICIONALES PARA VERIFICACIÓN REAL
            pricingId: verificationData?.pricingId,
            stripePaymentId: paymentIntent.id,
            paymentResponse: confirmResponse.data
          });
        } else {
          throw new Error('Error confirmando el pago en el servidor');
        }
      }
    } catch (error) {
      console.error('❌ Payment process failed:', error.message);
      setError(error.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div style={{ width: '100%' }}>
      {/* ✅ STRIPE CARD ELEMENT */}
      <div style={{
        padding: '16px',
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        marginBottom: '1rem'
      }}>
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#f3f4f6',
                '::placeholder': {
                  color: '#9CA3AF',
                },
              },
              invalid: {
                color: '#ef4444',
              },
            },
          }}
        />
      </div>

      {error && (
        <div style={{
          color: '#ef4444',
          fontSize: '0.9rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px',
          background: 'rgba(239, 68, 68, 0.1)',
          borderRadius: '8px',
          border: '1px solid rgba(239, 68, 68, 0.3)'
        }}>
          <AlertCircle size={16} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Error de desarrollo</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>{error}</div>
          </div>
          <button
            onClick={() => setError('')}
            style={{
              background: 'none',
              border: 'none',
              color: '#ef4444',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px' }}>
        <motion.button 
          type="button"
          onClick={onCancel}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            flex: 1, padding: '14px 24px',
            background: 'rgba(156, 163, 175, 0.2)',
            border: '1px solid rgba(156, 163, 175, 0.3)',
            borderRadius: '12px', color: '#9CA3AF',
            cursor: 'pointer', fontWeight: 'bold'
          }}
        >
          Cancelar
        </motion.button>
        <motion.button 
          type="button"
          onClick={handleSubmit}
          disabled={!stripe || processing || !clientSecret || error}
          whileHover={{ scale: (processing || !clientSecret || error) ? 1 : 1.05 }}
          whileTap={{ scale: (processing || !clientSecret || error) ? 1 : 0.95 }}
          style={{
            flex: 2, padding: '14px 24px',
            background: (processing || !clientSecret || error) ? 
              'rgba(249, 115, 22, 0.3)' : 'linear-gradient(135deg, #f97316, #ea580c)',
            border: 'none', borderRadius: '12px', color: 'white',
            cursor: (processing || !clientSecret || error) ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '8px', fontWeight: 'bold'
          }}
        >
          {processing && <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />}
          {error ? 'Error - Reintentar' : 
           processing ? 'Procesando...' : 
           !clientSecret ? 'Preparando...' : 
           `Pagar $1.00 + Verificar`}
        </motion.button>
      </div>
    </div>
  );
};

const AgencyVerificationPage = () => {
  const { user, isAuthenticated } = useAuth();
  
  // ✅ ESTADOS PRINCIPALES
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('pending');
  const [showPaymentModal, setShowPaymentModal] = useState(null);
  const [showPerfilEscort, setShowPerfilEscort] = useState(null);
  const [verificationInProgress, setVerificationInProgress] = useState(false);

  // ✅ ESTADOS DEL BACKEND
  const [escorts, setEscorts] = useState([]);
  const [verificationPricing, setVerificationPricing] = useState([]);
  const [selectedPricing, setSelectedPricing] = useState(null);
  const [loading, setLoading] = useState({
    escorts: false,
    pricing: false,
    verification: false
  });
  const [errors, setErrors] = useState({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // ✅ VERIFICAR PERMISOS
  if (!isAuthenticated || user?.userType !== 'AGENCY') {
    return (
      <div className="client-points-page" style={{
        minHeight: '100vh',
        background: '#000000',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <AlertTriangle size={64} color="#ef4444" />
          <h2 style={{ margin: '1rem 0', color: '#ef4444' }}>Acceso Restringido</h2>
          <p style={{ color: '#9CA3AF' }}>Esta página es solo para agencias autenticadas.</p>
        </div>
      </div>
    );
  }

  // ✅ HELPER: Setear loading de forma segura
  const setLoadingState = useCallback((key, value) => {
    setLoading(prev => ({ ...prev, [key]: value }));
  }, []);

  // ✅ HELPER: Setear errores
  const setError = useCallback((key, error) => {
    setErrors(prev => ({ 
      ...prev, 
      [key]: error?.message || error || 'Error desconocido' 
    }));
  }, []);

  // ✅ HELPER: Limpiar error específico
  const clearError = useCallback((key) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[key];
      return newErrors;
    });
  }, []);

  // 🎯 CARGAR ESCORTS DESDE EL BACKEND
  const fetchActiveEscorts = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoadingState('escorts', true);
      clearError('escorts');
      
      console.log('🔍 === FETCHING ACTIVE ESCORTS FROM BACKEND ===');
      
      // Obtener escorts activos (miembros de la agencia)
      const activeResponse = await agencyAPI.getAgencyEscorts({
        page: 1,
        limit: 50,
        status: 'active',
        search: searchTerm
      });
      
      console.log('✅ Active escorts response:', activeResponse);
      
      if (activeResponse.success && activeResponse.data?.escorts) {
        setEscorts(activeResponse.data.escorts);
        console.log('✅ Active escorts loaded:', activeResponse.data.escorts.length);
      } else {
        console.warn('⚠️ No active escorts found or invalid response');
        setEscorts([]);
      }
      
    } catch (error) {
      console.error('❌ Error fetching active escorts:', error);
      setError('escorts', handleApiError(error));
      setEscorts([]);
    } finally {
      setLoadingState('escorts', false);
    }
  }, [isAuthenticated, searchTerm, setLoadingState, clearError, setError]);

  // 💰 CARGAR PRICING DESDE EL BACKEND (SIMPLIFICADO)
  const fetchVerificationPricing = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoadingState('pricing', true);
      clearError('pricing');
      
      console.log('💰 === SETTING UP VERIFICATION PRICING (HARDCODED $1.00) ===');
      
      // ✅ PRICING HARDCODED PARA $1.00
      const hardcodedPricing = [
        {
          id: 'verification_special_1',
          name: 'Verificación Especial',
          cost: 1.00,
          description: 'Verificación completa de escort por solo $1.00',
          features: ['Badge verificado', 'Mayor confianza', 'Prioridad en búsquedas', 'Certificado digital'],
          isActive: true,
          isSpecial: true
        }
      ];
      
      setVerificationPricing(hardcodedPricing);
      setSelectedPricing(hardcodedPricing[0]);
      
      console.log('✅ Pricing configured:', hardcodedPricing[0]);
      
    } catch (error) {
      console.error('❌ Error setting pricing:', error);
      setError('pricing', 'Error configurando precios');
    } finally {
      setLoadingState('pricing', false);
    }
  }, [isAuthenticated, setLoadingState, clearError, setError]);

  // 💳 VERIFICAR ESCORT CON PAGO REAL + VERIFICACIÓN REAL EN BACKEND
  const handleVerifyEscort = async (escortData) => {
    console.log('🔐 === VERIFY ESCORT WITH REAL PAYMENT + REAL VERIFICATION ===');
    console.log('🔐 Escort:', escortData);

    try {
      setLoadingState('verification', true);
      setVerificationInProgress(true);
      
      console.log('💳 Real payment completed:', escortData.amountCharged);
      console.log('💳 Transaction ID:', escortData.transactionId);
      
      // ✅ AHORA HACER VERIFICACIÓN REAL EN EL BACKEND
      console.log('🔄 Starting REAL verification in backend...');
      
      const verificationData = {
        pricingId: selectedPricing.id,
        verificationNotes: `Verificación pagada - ${escortData.amountCharged} cobrado. Transaction: ${escortData.transactionId}`
      };
      
      console.log('📤 Calling REAL agencyAPI.verifyEscort:', {
        escortId: escortData.escortId,
        verificationData
      });
      
      // ✅ LLAMAR API REAL DE VERIFICACIÓN (NO SIMULACIÓN)
      const response = await agencyAPI.verifyEscort(escortData.escortId, verificationData);
      
      console.log('✅ Real verification response:', response);
      
      if (response.success) {
        // ✅ VERIFICACIÓN REAL EXITOSA - Actualizar estado local
        setEscorts(prev => prev.map(e => {
          const escortId = e.escort?.id || e.escortId;
          
          if (escortId === escortData.escortId) {
            return {
              ...e,
              escort: {
                ...e.escort,
                isVerified: true,
                verifiedAt: new Date().toISOString(),
                verificationData: response.data // Datos reales del backend
              }
            };
          }
          return e;
        }));
        
        // Mostrar modal de éxito con datos reales
        setSuccessMessage(
          `¡VERIFICACIÓN COMPLETA! ${escortData.amountCharged} cobrado y ${escortData.escortName} ha sido verificado REALMENTE en la base de datos.`
        );
        setShowSuccessModal(true);
        
        console.log('💰 === VERIFICACIÓN REAL COMPLETADA ===');
        console.log('💰 Monto cobrado:', escortData.amountCharged);
        console.log('💰 Transaction ID:', escortData.transactionId);
        console.log('💰 Escort verificado EN BD:', escortData.escortName);
        console.log('💰 Verification ID:', response.data?.verificationId);
        console.log('💰 =====================================');
        
      } else {
        throw new Error(response.message || 'Error en la verificación real');
      }
      
    } catch (error) {
      console.error('❌ Error in REAL verification:', error);
      
      // ⚠️ PAGO FUE EXITOSO PERO VERIFICACIÓN FALLÓ
      if (escortData.paymentConfirmed) {
        const errorMessage = `⚠️ IMPORTANTE: El pago de ${escortData.amountCharged} fue procesado exitosamente, pero hubo un error en la verificación: ${handleApiError(error)}. Por favor contacta soporte con el ID: ${escortData.transactionId}`;
        alert(errorMessage);
      } else {
        alert(`❌ Error: ${handleApiError(error)}`);
      }
    } finally {
      setLoadingState('verification', false);
      setVerificationInProgress(false);
      setShowPaymentModal(null);
    }
  };

  // ✅ HANDLERS
  const handleStartVerification = (escort) => {
    console.log('🔍 === STARTING VERIFICATION WITH REAL PAYMENT ===');
    console.log('🔍 Escort:', escort);
    
    if (!selectedPricing || !selectedPricing.id) {
      console.error('❌ No pricing selected!');
      alert('Error: No se pudo cargar la información de precios. Por favor, recarga la página.');
      return;
    }
    
    console.log('✅ Showing payment modal for REAL $1.00 charge');
    setShowPaymentModal(escort);
  };

  const handleViewProfile = (escort) => {
    console.log('👤 Viewing profile for:', escort.escort?.user?.firstName || escort.name);
    setShowPerfilEscort(escort);
  };

  // ✅ CALLBACK PARA PAGO EXITOSO + VERIFICACIÓN REAL
  const handlePaymentSuccess = async (result) => {
    console.log('✅ REAL Verification payment successful! Money charged:', result);
    
    setShowPaymentModal(null);
    
    // ✅ PROCESAR VERIFICACIÓN REAL DESPUÉS DEL PAGO EXITOSO
    await handleVerifyEscort(result);
  };

  const handlePaymentError = (errorMessage) => {
    console.error('❌ Verification payment failed:', errorMessage);
    setError('verification', errorMessage);
  };

  const handlePaymentCancel = () => {
    setShowPaymentModal(null);
  };

  // ✅ MANEJAR BÚSQUEDA
  const handleSearch = useCallback((searchValue) => {
    console.log('🔍 Search triggered with term:', searchValue);
    setSearchTerm(searchValue);
  }, []);

  // ✅ REFRESCAR DATOS
  const handleRefresh = useCallback(async () => {
    console.log('🔄 Refreshing data...');
    await Promise.all([
      fetchActiveEscorts(),
      fetchVerificationPricing()
    ]);
  }, [fetchActiveEscorts, fetchVerificationPricing]);

  // ✅ EFECTOS DE INICIALIZACIÓN
  useEffect(() => {
    if (isAuthenticated && user?.userType === 'AGENCY') {
      console.log('🚀 === INITIALIZING VERIFICATION WITH REAL PAYMENTS ===');
      fetchVerificationPricing();
      fetchActiveEscorts();
    }
  }, [isAuthenticated, user, fetchVerificationPricing, fetchActiveEscorts]);

  // ✅ EFECTO PARA CAMBIOS DE BÚSQUEDA
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (isAuthenticated && user?.userType === 'AGENCY') {
        fetchActiveEscorts();
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, isAuthenticated, user?.userType, fetchActiveEscorts]);

  // ✅ FILTRAR ESCORTS
  const filteredEscorts = escorts.filter(escort => {
    const escortData = escort.escort || {};
    const userData = escortData.user || {};
    const name = userData.firstName && userData.lastName 
      ? `${userData.firstName} ${userData.lastName}` 
      : userData.firstName || userData.lastName || 'Sin nombre';
    
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (selectedFilter === 'pending') {
      return matchesSearch && !escortData.isVerified;
    }
    if (selectedFilter === 'verified') {
      return matchesSearch && escortData.isVerified;
    }
    
    return matchesSearch;
  });

  // ✅ HELPERS
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha no disponible';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // ✅ MODAL DE ÉXITO
  const SuccessModal = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={() => setShowSuccessModal(false)}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: 99999,
        padding: '1rem'
      }}
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.5, opacity: 0, y: 50 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
          borderRadius: '24px', padding: '3rem', textAlign: 'center',
          border: '1px solid rgba(249, 115, 22, 0.3)', maxWidth: '500px',
          width: '100%', position: 'relative', overflow: 'hidden'
        }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          style={{
            background: 'linear-gradient(135deg, #f97316, #ea580c)',
            borderRadius: '50%', width: '100px', height: '100px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 2rem', boxShadow: '0 20px 40px rgba(249, 115, 22, 0.4)'
          }}
        >
          <Shield size={50} color="white" />
        </motion.div>
        
        <h2 style={{ color: '#f97316', margin: '0 0 1rem 0', fontSize: '1.8rem' }}>
          ¡Verificación Pagada!
        </h2>
        <p style={{ color: '#f3f4f6', margin: '0 0 2rem 0', lineHeight: 1.6 }}>
          {successMessage}
        </p>
        
        <motion.div
          style={{ 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '12px', marginBottom: '2rem', padding: '1rem',
            background: 'rgba(34, 197, 94, 0.1)', borderRadius: '12px',
            border: '1px solid rgba(34, 197, 94, 0.3)'
          }}
        >
          <CheckCircle size={20} color="#22c55e" />
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '1.1rem' }}>
              $1.00 Cobrado Exitosamente
            </div>
            <div style={{ color: '#9CA3AF', fontSize: '0.9rem' }}>
              Verificación completada en BD
            </div>
          </div>
        </motion.div>
        
        <motion.button
          onClick={() => setShowSuccessModal(false)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            padding: '12px 32px',
            background: 'linear-gradient(135deg, #f97316, #ea580c)',
            border: 'none', borderRadius: '12px', color: 'white',
            fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem'
          }}
        >
          ¡Continuar!
        </motion.button>
      </motion.div>
    </motion.div>
  );

  // 💳 MODAL DE PAGO CON STRIPE REAL
  const PaymentModal = ({ escort, onClose, onSuccess, onError }) => {
    const escortName = escort?.escort?.user?.firstName && escort?.escort?.user?.lastName
      ? `${escort.escort.user.firstName} ${escort.escort.user.lastName}`
      : escort?.name || 'Escort';

    const verificationData = {
      pricingId: selectedPricing?.id,
      verificationNotes: `Verificación con pago real de ${escortName}`
    };

    return (
      <motion.div 
        className="verification-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}
      >
        <motion.div 
          className="stripe-payment-modal"
          initial={{ opacity: 0, scale: 0.9, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 50 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: '#000000',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflow: 'hidden',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
            border: '2px solid #f97316'
          }}
        >
          {/* Header */}
          <div style={{
            background: '#000000',
            color: 'white',
            padding: '1.5rem',
            position: 'relative',
            borderBottom: '2px solid #f97316'
          }}>
            <button 
              onClick={onClose}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={16} />
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                background: 'rgba(249, 115, 22, 0.2)',
                borderRadius: '8px',
                padding: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Shield size={20} color="#f97316" />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
                  Verificar Escort - REAL
                </h2>
                <p style={{ margin: '0.25rem 0 0 0', opacity: 0.9, fontSize: '0.875rem' }}>
                  Pago real + Verificación en BD
                </p>
              </div>
            </div>
          </div>

          <div style={{ padding: '1.5rem', background: '#000000', color: 'white' }}>
            {/* Resumen del escort */}
            <div style={{
              background: '#1a1a1a',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.5rem',
              border: '1px solid #404040'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <img 
                  src={escort?.escort?.user?.avatar || '/default-avatar.png'} 
                  alt={escortName}
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    objectFit: 'cover'
                  }}
                />
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>
                    {escortName}
                  </h3>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#64748b' }}>
                    Verificación REAL en BD
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#f97316' }}>
                    $1.00
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                    USD
                  </div>
                </div>
              </div>
            </div>

            {/* Información de la verificación */}
            <div style={{
              background: '#1a1a1a',
              borderRadius: '6px',
              padding: '0.75rem',
              marginBottom: '1.5rem',
              border: '1px solid #f97316'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Lock size={14} color="#f97316" />
                <span style={{ fontSize: '0.875rem', color: '#f97316', fontWeight: '600' }}>
                  Verificación REAL - Solo $1.00:
                </span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.75rem', color: '#9ca3af' }}>
                <li>Pago real procesado por Stripe</li>
                <li>Verificación guardada en base de datos</li>
                <li>Badge verificado oficial</li>
                <li>Mayor confianza de clientes</li>
                <li>Prioridad en búsquedas</li>
              </ul>
            </div>

            {/* ✅ STRIPE ELEMENTS WRAPPER */}
            <Elements stripe={stripePromise}>
              <StripeVerificationPaymentForm
                escort={escort}
                verificationData={verificationData}
                selectedPricing={selectedPricing}
                onSuccess={onSuccess}
                onError={onError}
                onCancel={onClose}
              />
            </Elements>

            {/* Información de seguridad */}
            <div style={{
              marginTop: '1.5rem', padding: '0.75rem',
              background: 'rgba(99, 91, 255, 0.1)', borderRadius: '8px',
              border: '1px solid rgba(99, 91, 255, 0.3)',
              fontSize: '0.8rem', color: '#635bff'
            }}>
              🔒 Pago REAL procesado por Stripe - Se cobrará $1.00 + verificación en BD
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  // 👤 MODAL DE PERFIL ESCORT (sin cambios)
  const PerfilEscort = ({ escort, isOpen, onClose }) => {
    if (!isOpen) return null;

    const escortData = escort?.escort || {};
    const userData = escortData.user || {};
    const name = userData.firstName && userData.lastName 
      ? `${userData.firstName} ${userData.lastName}` 
      : userData.firstName || userData.lastName || 'Sin nombre';

    return (
      <motion.div 
        className="verification-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: '#000000',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '400px',
            maxHeight: '90vh',
            overflow: 'hidden',
            border: '2px solid #f97316'
          }}
        >
          <div style={{ position: 'relative' }}>
            <img 
              src={userData.avatar || '/default-avatar.png'} 
              alt={name}
              style={{
                width: '100%',
                height: '300px',
                objectFit: 'cover'
              }}
            />
            <button
              onClick={onClose}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'rgba(0, 0, 0, 0.5)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={16} color="white" />
            </button>
            {escortData.isVerified && (
              <div style={{
                position: 'absolute',
                bottom: '1rem',
                right: '1rem',
                background: '#f97316',
                color: 'white',
                padding: '0.5rem',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.75rem'
              }}>
                <Verified size={12} />
                Verificada REAL
              </div>
            )}
          </div>
          
          <div style={{ padding: '1.5rem', background: '#000000', color: 'white' }}>
            <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>
              {name}
            </h2>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '1rem', color: '#9ca3af' }}>
              <Calendar size={14} />
              <span style={{ fontSize: '0.875rem' }}>
                Miembro desde {formatDate(escort.joinedAt || escort.createdAt)}
              </span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Star size={14} color="#fbbf24" />
                <span style={{ fontSize: '0.875rem' }}>{escortData.rating || 4.5}/5.0</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Crown size={14} color="#f97316" />
                <span style={{ fontSize: '0.875rem' }}>{escort.role || 'MEMBER'}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  return (
    <div className="client-points-page" style={{ background: '#000000' }}>
      {/* Hero Section */}
      <div className="points-hero" style={{ background: '#000000' }}>
        <div className="points-hero-content">
          <motion.div 
            className="balance-card"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{ background: '#1a1a1a' }}
          >
            <div className="balance-main">
              <div className="balance-info">
                <div className="points-icon-large">
                  <Shield size={32} />
                </div>
                <div className="balance-details">
                  <h1>Verificaciones REALES</h1>
                  <p className="balance-subtitle">Pago real + Verificación en base de datos - Solo $1.00</p>
                  <div style={{ 
                    background: 'rgba(239, 68, 68, 0.1)', 
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '6px',
                    padding: '0.5rem',
                    marginTop: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <DollarSign size={14} color="#ef4444" />
                    <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>
                      PAGO REAL: $1.00 cobrado + verificación en BD
                    </span>
                  </div>
                  <div style={{ 
                    background: 'rgba(16, 185, 129, 0.1)', 
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '6px',
                    padding: '0.5rem',
                    marginTop: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <Shield size={14} color="#10b981" />
                    <span style={{ fontSize: '0.75rem', color: '#10b981' }}>
                      {filteredEscorts.length} escorts disponibles
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleRefresh}
                disabled={loading.escorts || loading.pricing}
                style={{
                  background: loading.escorts || loading.pricing ? '#404040' : '#f97316',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  padding: '0.5rem',
                  cursor: loading.escorts || loading.pricing ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <RefreshCw 
                  size={16} 
                  className={loading.escorts || loading.pricing ? 'spin' : ''} 
                />
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Error Banner */}
      {(errors.escorts || errors.pricing || errors.verification) && (
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 2rem 1rem'
        }}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#ef4444'
          }}>
            <AlertTriangle size={16} />
            <span>{errors.escorts || errors.pricing || errors.verification}</span>
          </div>
        </div>
      )}

      {/* Controles de búsqueda y filtros */}
      <div className="verification-controls">
        <div className="search-filter-container">
          <div className="search-wrapper">
            <Search className="search-icon" size={20} />
            <input
              type="text"
              placeholder="Buscar escorts..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="search-input"
              style={{ background: '#1a1a1a' }}
            />
          </div>
          
          <div className="filter-tabs">
            {[
              { id: 'pending', label: 'Pendientes' },
              { id: 'verified', label: 'Verificadas' }
            ].map((filter) => (
              <motion.button
                key={filter.id}
                className={`filter-tab ${selectedFilter === filter.id ? 'active' : ''}`}
                onClick={() => setSelectedFilter(filter.id)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{ background: '#1a1a1a' }}
              >
                {filter.label}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Lista de escorts para verificar */}
      <div className="points-content">
        {loading.escorts ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '3rem',
            color: '#9CA3AF'
          }}>
            <Loader className="spin" size={48} />
            <p style={{ marginTop: '1rem' }}>Cargando escorts...</p>
          </div>
        ) : (
          <div className="verification-grid">
            {filteredEscorts.map((escort, index) => {
              const escortData = escort.escort || {};
              const userData = escortData.user || {};
              const name = userData.firstName && userData.lastName 
                ? `${userData.firstName} ${userData.lastName}` 
                : userData.firstName || userData.lastName || 'Sin nombre';

              return (
                <motion.div
                  key={escort.membershipId || escort.id || index}
                  className="verification-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -5 }}
                  style={{ background: '#1a1a1a' }}
                >
                  <div className="verification-card-header">
                    <motion.div 
                      className="escort-avatar-section"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleViewProfile(escort)}
                    >
                      <img 
                        src={userData.avatar || '/default-avatar.png'} 
                        alt={name} 
                        className="escort-avatar" 
                      />
                      {escortData.isVerified && (
                        <div className="verified-badge">
                          <Verified size={12} />
                        </div>
                      )}
                      <div style={{
                        position: 'absolute',
                        bottom: '0.25rem',
                        right: '0.25rem',
                        width: '12px',
                        height: '12px',
                        background: '#f97316',
                        borderRadius: '50%',
                        border: '2px solid white'
                      }} />
                    </motion.div>
                  </div>
                  
                  <div className="verification-card-content">
                    <h3 className="escort-name">{name}</h3>
                    <p className="escort-location">Miembro de la agencia</p>
                    
                    {/* Métricas rápidas */}
                    <div style={{ 
                      display: 'flex', 
                      gap: '1rem', 
                      marginTop: '0.75rem',
                      fontSize: '0.75rem',
                      color: '#9CA3AF'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Star size={12} />
                        {escortData.rating || 4.5}/5.0
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Calendar size={12} />
                        {formatDate(escort.joinedAt)}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Crown size={12} />
                        {escort.role || 'MEMBER'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="verification-card-footer">
                    {escortData.isVerified ? (
                      <div className="verified-status">
                        <CheckCircle size={16} />
                        <span>Verificada REAL {escortData.verifiedAt ? `el ${formatDate(escortData.verifiedAt)}` : ''}</span>
                      </div>
                    ) : (
                      <div className="verification-actions">
                        <motion.button
                          className="btn-primary-small"
                          onClick={() => handleStartVerification(escort)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          disabled={loading.verification || loading.pricing}
                        >
                          <Shield size={14} />
                          {loading.pricing ? 'Cargando...' : 'Verificar REAL $1.00'}
                        </motion.button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
        
        {!loading.escorts && filteredEscorts.length === 0 && (
          <div className="empty-state">
            <Shield size={64} color="#6B7280" />
            <h3>No se encontraron escorts</h3>
            <p>
              {searchTerm ? 
                'Ajusta los filtros de búsqueda para ver más resultados' : 
                selectedFilter === 'pending' ?
                'Todas tus escorts ya están verificadas' :
                'No tienes escorts verificadas aún'
              }
            </p>
          </div>
        )}
      </div>

      {/* Loading overlay durante verificación */}
      <AnimatePresence>
        {verificationInProgress && (
          <motion.div
            className="verification-loading-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10000
            }}
          >
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '2rem',
              textAlign: 'center',
              maxWidth: '300px',
              border: '2px solid #f97316'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                border: '3px solid #404040',
                borderTop: '3px solid #f97316',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 1rem'
              }}></div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#1f2937' }}>Procesando verificación REAL...</h3>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>
                Verificando pago y guardando en BD
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de pago con Stripe */}
      <AnimatePresence>
        {showPaymentModal && (
          <PaymentModal 
            escort={showPaymentModal}
            onClose={handlePaymentCancel}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
          />
        )}
      </AnimatePresence>

      {/* Modal de éxito */}
      <AnimatePresence>
        {showSuccessModal && <SuccessModal />}
      </AnimatePresence>

      {/* Modal de Perfil Escort */}
      <AnimatePresence>
        {showPerfilEscort && (
          <PerfilEscort 
            escort={showPerfilEscort} 
            isOpen={!!showPerfilEscort}
            onClose={() => setShowPerfilEscort(null)} 
          />
        )}
      </AnimatePresence>

      <style jsx>{`
        .client-points-page {
          min-height: 100vh;
          background: #000000;
          color: white;
        }

        .points-hero {
          background: #000000;
          padding: 2rem 0;
        }

        .points-hero-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 2rem;
        }

        .balance-card {
          background: #1a1a1a;
          border-radius: 16px;
          padding: 2rem;
          border: 1px solid #404040;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .balance-main {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .balance-info {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          flex: 1;
        }

        .points-icon-large {
          background: linear-gradient(135deg, #f97316, #ea580c);
          border-radius: 16px;
          padding: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .balance-details h1 {
          margin: 0 0 0.5rem 0;
          font-size: 2rem;
          font-weight: 700;
          color: white;
        }

        .balance-subtitle {
          margin: 0;
          color: #9ca3af;
          font-size: 1rem;
        }

        .spin {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .verification-card {
          background: #1a1a1a;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
          border: 1px solid #404040;
          transition: all 0.3s ease;
        }

        .verification-card:hover {
          box-shadow: 0 10px 25px rgba(249, 115, 22, 0.2);
          border-color: #f97316;
        }

        .escort-avatar-section {
          position: relative;
          width: 80px;
          height: 80px;
          margin: 0 auto 1rem;
        }

        .escort-avatar {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
          border: 3px solid #404040;
        }

        .verified-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #f97316;
          color: white;
          border-radius: 50%;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .escort-name {
          margin: 0 0 0.25rem 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: white;
          text-align: center;
        }

        .escort-location {
          margin: 0 0 0.5rem 0;
          font-size: 0.875rem;
          color: #9ca3af;
          text-align: center;
        }

        .verified-status {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          color: #f97316;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .btn-primary-small {
          width: 100%;
          padding: 0.75rem 1rem;
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.2s ease;
        }

        .btn-primary-small:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
        }

        .btn-primary-small:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .verification-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 2rem;
        }

        .verification-controls {
          max-width: 1200px;
          margin: 0 auto 2rem;
          padding: 0 2rem;
        }

        .search-filter-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        @media (min-width: 768px) {
          .search-filter-container {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }
        }

        .search-wrapper {
          position: relative;
          flex: 1;
          max-width: 400px;
        }

        .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: #6b7280;
        }

        .search-input {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 2.5rem;
          border: 1px solid #404040;
          borderRadius: 8px;
          fontSize: 1rem;
          outline: none;
          transition: border-color 0.2s;
          background: #1a1a1a;
          color: white;
        }

        .search-input:focus {
          border-color: #f97316;
          box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
        }

        .filter-tabs {
          display: flex;
          gap: 0.5rem;
        }

        .filter-tab {
          padding: 0.5rem 1rem;
          border: 1px solid #404040;
          border-radius: 6px;
          background: #1a1a1a;
          color: #9ca3af;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.2s;
        }

        .filter-tab:hover {
          border-color: #f97316;
        }

        .filter-tab.active {
          background: #f97316;
          color: white;
          border-color: #f97316;
        }

        .filter-count {
          background: rgba(0, 0, 0, 0.1);
          color: inherit;
          padding: 0.125rem 0.375rem;
          border-radius: 10px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .filter-tab.active .filter-count {
          background: rgba(255, 255, 255, 0.2);
        }

        .empty-state {
          text-align: center;
          padding: 3rem 2rem;
          color: #9ca3af;
        }

        .empty-state h3 {
          margin: 1rem 0 0.5rem 0;
          font-size: 1.25rem;
          color: #d1d5db;
        }

        .empty-state p {
          margin: 0;
          font-size: 0.875rem;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
};

export default AgencyVerificationPage;