import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';

import {
  Plus, ImageIcon, Heart, Rocket, Edit3, Trash2, Loader, Phone, Star, Crown, X, Save, AlertTriangle, MapPin, User, Camera, CreditCard, CheckCircle, AlertCircle
} from 'lucide-react';

import { postsAPI, handleApiError } from '../../utils/api.js';
import { postsPaymentAPI } from '../../utils/api-business';
import config from '../../config/config.js';

const stripePromise = loadStripe(config.stripe.publicKey);

const STYLES = {
  input: { width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(0, 0, 0, 0.25)', color: 'white', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' },
  gradientOrange: 'linear-gradient(135deg, #ff6b35, #e85d04)',
  darkBg: 'linear-gradient(145deg, #1a1a1a 0%, #111111 100%)'
};

const VALID_SEXO_VALUES = ['Hombre', 'Mujer', 'Trans', 'Otro'];

const PostsManager = ({ user, onError }) => {
  const [modals, setModals] = useState({ 
    post: false, 
    boost: false, 
    delete: false, 
    payment: false,
    paymentSuccess: false
  });

  const [editingPost, setEditingPost] = useState(null);
  const [boostingPost, setBoostingPost] = useState(null);
  const [deletingPost, setDeletingPost] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [userPosts, setUserPosts] = useState([]);
  const [paymentData, setPaymentData] = useState(null);
  const [paymentType, setPaymentType] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [postLimitsInfo, setPostLimitsInfo] = useState(null);

  useEffect(() => { if (user?.userType === 'ESCORT') loadUserPosts(); }, [user]);

  const loadUserPosts = async () => {
    try {
      setLoadingPosts(true);
      onError(null);
      if (!postsAPI?.getMyPostsWithOptions) throw new Error('API de posts no está disponible');
      
      const response = await postsAPI.getMyPostsWithOptions({ status: 'active', page: 1, limit: 50, sortBy: 'recent' });
      if (response.success && response.data) {
        const posts = response.data.posts || [];
        setUserPosts(posts);
      } else setUserPosts([]);

      if (user?.userType === 'ESCORT') {
        try {
          const limitsResponse = await postsPaymentAPI.getPostLimitsInfo();
          if (limitsResponse.success) {
            setPostLimitsInfo(limitsResponse.data);
          }
        } catch (error) {
          console.error('Error loading post limits:', error);
        }
      }

    } catch (error) {
      console.error('Error cargando posts:', error);
      onError('Error cargando tus anuncios: ' + handleApiError(error));
      setUserPosts([]);
    } finally { setLoadingPosts(false); }
  };

  const toggleModal = (type, state, data = null) => {
    setModals(prev => ({ ...prev, [type]: state }));
    if (type === 'post') setEditingPost(state ? data : null);
    if (type === 'boost') setBoostingPost(state ? data : null);
    if (type === 'delete') setDeletingPost(state ? data : null);
  };

  const handleSavePost = async (postFormData) => {
    try {
      setLoading(true);
      onError(null);
      
      if (!postsAPI) throw new Error('API de posts no está disponible');
      if (!(postFormData instanceof FormData)) throw new Error('Los datos no son FormData válido');

      if (editingPost) {
        const response = await postsAPI.updatePost(editingPost.id, postFormData);
        if (response?.success) {
          await loadUserPosts();
          toggleModal('post', false);
        } else {
          throw new Error(response?.message || 'Error actualizando el post');
        }
      } else {
        const limitsCheck = await postsPaymentAPI.checkPostPaymentRequired();
        
        if (!limitsCheck.needsPayment) {
          const response = await postsAPI.createPost(postFormData);
          if (response?.success) {
            await loadUserPosts();
            toggleModal('post', false);
          } else {
            throw new Error(response?.message || 'Error creando el post');
          }
        } else {
          const postDataForPayment = {};
          for (let [key, value] of postFormData.entries()) {
            if (key !== 'images') {
              try {
                postDataForPayment[key] = key.includes('services') || key.includes('rates') || key.includes('availability') || key.includes('tags')
                  ? JSON.parse(value)
                  : value;
              } catch {
                postDataForPayment[key] = value;
              }
            }
          }
          
          const paymentResponse = await postsPaymentAPI.createAdditionalPostPayment(postDataForPayment);
          
          if (paymentResponse.success) {
            setPaymentData({
              ...paymentResponse.data,
              postFormData
            });
            setPaymentType('additional_post');
            toggleModal('post', false);
            toggleModal('payment', true);
          } else {
            throw new Error(paymentResponse.message || 'Error iniciando el pago');
          }
        }
      }

    } catch (error) {
      console.error('Error guardando post:', error);
      onError(handleApiError ? handleApiError(error) : error.message || 'Error guardando el anuncio');
    } finally {
      setLoading(false);
    }
  };

  const handleBoostPost = async (post) => {
    try {
      setLoading(true);
      onError(null);
      
      if (post.isBoosted) {
        throw new Error('Este anuncio ya está promocionado');
      }
      
      const paymentResponse = await postsPaymentAPI.createBoostPayment(post.id);
      
      if (paymentResponse.success) {
        setPaymentData(paymentResponse.data);
        setPaymentType('boost');
        setBoostingPost(post);
        toggleModal('boost', false);
        toggleModal('payment', true);
      } else {
        throw new Error(paymentResponse.message || 'Error iniciando el pago de boost');
      }
      
    } catch (error) {
      console.error('Error iniciando boost:', error);
      onError(handleApiError ? handleApiError(error) : error.message || 'Error preparando la promoción');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (result) => {
    try {
      setLoading(true);
      
      let confirmResponse;
      
      if (paymentType === 'additional_post') {
        confirmResponse = await postsPaymentAPI.confirmAdditionalPostPayment(paymentData.paymentId);
        
        if (confirmResponse.success) {
          setSuccessMessage(`¡Perfecto! Tu anuncio "${confirmResponse.data.post.title}" ha sido creado y publicado exitosamente.`);
        }
      } else if (paymentType === 'boost') {
        confirmResponse = await postsPaymentAPI.confirmBoostPayment(paymentData.paymentId);
        
        if (confirmResponse.success) {
          setSuccessMessage(`¡Excelente! Tu anuncio "${confirmResponse.data.post.title}" ha sido promocionado exitosamente.`);
        }
      }
      
      if (confirmResponse?.success) {
        await loadUserPosts();
        toggleModal('payment', false);
        toggleModal('paymentSuccess', true);
        
        setPaymentData(null);
        setPaymentType(null);
        setBoostingPost(null);
      } else {
        throw new Error(confirmResponse?.message || 'Error confirmando el pago');
      }
      
    } catch (error) {
      console.error('Error confirmando pago:', error);
      onError(handleApiError ? handleApiError(error) : error.message || 'Error procesando el pago');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentError = (errorMessage) => {
    console.error('Error en pago:', errorMessage);
    onError(errorMessage);
    setLoading(false);
  };

  const handlePaymentCancel = () => {
    toggleModal('payment', false);
    setPaymentData(null);
    setPaymentType(null);
    setBoostingPost(null);
  };

  const confirmDeletePost = async () => {
    if (!deletingPost) return;
    
    try {
      setLoading(true);
      onError(null);
      
      if (!postsAPI?.deletePost) {
        throw new Error('API de eliminación no está disponible');
      }
      
      const response = await postsAPI.deletePost(deletingPost.id);
      
      if (response?.success) {
        await loadUserPosts();
        toggleModal('delete', false);
        onError(null);
      } else {
        const errorMsg = response?.message || response?.error || 'Error eliminando el post';
        throw new Error(errorMsg);
      }
      
    } catch (error) {
      console.error('Error eliminando post:', error);
      const errorMessage = handleApiError ? handleApiError(error) : error.message;
      onError(`Error eliminando el anuncio: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const PaymentForm = ({ paymentData, onSuccess, onError, onCancel }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (event) => {
      event.preventDefault();

      if (!stripe || !elements || !paymentData?.clientSecret) {
        return;
      }

      setProcessing(true);
      setError('');

      try {
        const card = elements.getElement(CardElement);
        const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(paymentData.clientSecret, {
          payment_method: {
            card: card,
            billing_details: {
              name: 'Usuario TeloFundi',
            },
          }
        });

        if (stripeError) {
          setError(stripeError.message);
          onError(stripeError.message);
        } else if (paymentIntent.status === 'succeeded') {
          onSuccess({
            transactionId: paymentIntent.id,
            amount: paymentData.amount
          });
        }
      } catch (error) {
        setError(error.message);
        onError(error.message);
      } finally {
        setProcessing(false);
      }
    };

    return (
      <form onSubmit={handleSubmit} style={{ width: '100%' }}>
        <div style={{
          padding: '20px',
          background: 'rgba(255, 255, 255, 0.08)',
          border: '2px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '16px',
          marginBottom: '1.5rem'
        }}>
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '18px',
                  color: '#f3f4f6',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '16px' }}>
          <button 
            type="button"
            onClick={onCancel}
            style={{
              flex: 1, padding: '16px 24px',
              background: 'rgba(156, 163, 175, 0.2)',
              border: '2px solid rgba(156, 163, 175, 0.4)',
              borderRadius: '16px', color: '#9CA3AF',
              cursor: 'pointer', fontWeight: '600', fontSize: '16px'
            }}
          >
            Cancelar
          </button>
          <button 
            type="submit"
            disabled={!stripe || processing}
            style={{
              flex: 2, padding: '16px 24px',
              background: processing 
                ? 'rgba(34, 197, 94, 0.5)' 
                : 'linear-gradient(135deg, #22c55e, #16a34a)',
              border: 'none', borderRadius: '16px', color: 'white',
              cursor: processing ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '10px', fontWeight: '600', fontSize: '16px',
              boxShadow: processing ? 'none' : '0 8px 32px rgba(34, 197, 94, 0.3)'
            }}
          >
            {processing && <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />}
            {processing ? 'Procesando...' : `Pagar $${paymentData?.amount}`}
          </button>
        </div>
      </form>
    );
  };

  if (loadingPosts) {
    return (
      <div style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', flexDirection: 'column', gap: '1rem' }}>
          <Loader className="animate-spin" size={32} color="#ff6b35" />
          <p style={{ color: '#9ca3af', fontSize: '1.1rem' }}>Cargando tus anuncios...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ padding: '1rem', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <CreatePostCard onOpen={() => toggleModal('post', true)} userPosts={userPosts} user={user} postLimitsInfo={postLimitsInfo} />
          {userPosts.map((post, index) => (
            <PostCard key={post.id} post={post} index={index}
              onEdit={() => toggleModal('post', true, post)}
              onBoost={() => handleBoostPost(post)}
              onDelete={() => toggleModal('delete', true, post)}
              loading={loading} />
          ))}
        </div>
      </div>

      {modals.post && createPortal(<ModalOverlay onClose={() => toggleModal('post', false)}><PostFormModal editingPost={editingPost} onSave={handleSavePost} onClose={() => toggleModal('post', false)} loading={loading} user={user} /></ModalOverlay>, document.body)}
      {modals.delete && createPortal(<ModalOverlay onClose={() => toggleModal('delete', false)}><DeleteModal post={deletingPost} onConfirm={confirmDeletePost} onCancel={() => toggleModal('delete', false)} loading={loading} /></ModalOverlay>, document.body)}
      
      {modals.payment && createPortal(
        <ModalOverlay onClose={handlePaymentCancel}>
          <ModalContainer maxWidth="min(600px, 95vw)" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.06) 0%, rgba(34, 197, 94, 0.01) 100%)', borderBottom: '1px solid rgba(34, 197, 94, 0.1)', backdropFilter: 'blur(10px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: 'rgba(34, 197, 94, 0.1)', borderRadius: '10px', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CreditCard size={18} style={{ color: '#22c55e' }} />
                </div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'white', margin: 0 }}>
                  {paymentType === 'additional_post' ? 'Pagar Anuncio Adicional' : 'Pagar Promoción'}
                </h2>
              </div>
              <button onClick={handlePaymentCancel} disabled={loading} style={{ width: '36px', height: '36px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold' }}>×</button>
            </div>

            <div style={{ padding: '20px' }}>
              <div style={{ 
                textAlign: 'center', marginBottom: '2.5rem', padding: '2rem',
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.1))', 
                borderRadius: '24px',
                border: '2px solid rgba(34, 197, 94, 0.2)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '1.5rem' }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                    borderRadius: '50%', width: '60px', height: '60px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {paymentType === 'additional_post' ? <Plus size={32} color="white" /> : <Rocket size={32} color="white" />}
                  </div>
                  <div>
                    <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#22c55e' }}>
                      ${paymentData?.amount}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#ffffff', marginBottom: '0.5rem' }}>
                  {paymentType === 'additional_post' ? 'Anuncio Adicional' : 'Promocionar Anuncio'}
                </div>
                <div style={{ color: '#9CA3AF', fontSize: '1rem' }}>
                  {paymentType === 'additional_post' 
                    ? 'Publica tu tercer anuncio y siguientes' 
                    : 'Tu anuncio aparecerá destacado por 7 días'
                  }
                </div>
              </div>

              <Elements stripe={stripePromise}>
                <PaymentForm
                  paymentData={paymentData}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                  onCancel={handlePaymentCancel}
                />
              </Elements>
            </div>
          </ModalContainer>
        </ModalOverlay>, document.body
      )}

      {modals.paymentSuccess && createPortal(
        <ModalOverlay onClose={() => toggleModal('paymentSuccess', false)}>
          <ModalContainer maxWidth="min(450px, 95vw)" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <div
                style={{
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  borderRadius: '50%', width: '100px', height: '100px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 2rem',
                  boxShadow: '0 20px 40px rgba(34, 197, 94, 0.3)'
                }}
              >
                <CheckCircle size={50} color="white" />
              </div>
              
              <h2 style={{ color: '#22c55e', margin: '0 0 1.5rem 0', fontSize: '2rem', fontWeight: 'bold' }}>
                ¡Perfecto!
              </h2>
              <p style={{ color: '#f3f4f6', margin: '0 0 2.5rem 0', fontSize: '1.1rem', lineHeight: '1.6' }}>
                {successMessage}
              </p>
              
              <button
                onClick={() => toggleModal('paymentSuccess', false)}
                style={{
                  padding: '16px 32px',
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  border: 'none', borderRadius: '16px', color: 'white',
                  fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem',
                  boxShadow: '0 8px 32px rgba(34, 197, 94, 0.3)'
                }}
              >
                ¡Continuar!
              </button>
            </div>
          </ModalContainer>
        </ModalOverlay>, document.body
      )}
    </>
  );
};

const ModalOverlay = ({ children, onClose }) => {
  useEffect(() => {
    const handleEscape = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        zIndex: 999999, 
        backgroundColor: 'rgba(0, 0, 0, 0.85)', 
        backdropFilter: 'blur(8px)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '10px',
        overflow: 'auto'
      }} 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {children}
    </div>
  );
};

const ModalContainer = ({ children, maxWidth = '500px', onClick }) => {
  return (
    <div style={{ 
      backgroundColor: '#1a1a1a', 
      borderRadius: '20px', 
      border: '1px solid rgba(255, 107, 53, 0.2)', 
      boxShadow: '0 25px 50px rgba(0, 0, 0, 0.8)', 
      width: '100%', 
      maxWidth: maxWidth, 
      maxHeight: '95vh', 
      overflow: 'auto', 
      pointerEvents: 'auto' 
    }} onClick={onClick}>
      {children}
    </div>
  );
};

const CreatePostCard = ({ onOpen, userPosts, user, postLimitsInfo }) => (
  <div style={{ 
    background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.05) 0%, rgba(255, 107, 53, 0.02) 100%)', 
    border: '2px dashed rgba(255, 107, 53, 0.3)', 
    borderRadius: '20px', 
    padding: '2rem 1rem', 
    textAlign: 'center', 
    cursor: 'pointer', 
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center', 
    justifyContent: 'center', 
    minHeight: '250px' 
  }} onClick={onOpen}>
    <div style={{ background: 'rgba(255, 107, 53, 0.1)', borderRadius: '50%', padding: '1.5rem', marginBottom: '1.5rem' }}>
      <Plus size={32} style={{ color: '#ff6b35' }} />
    </div>
    <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'white', margin: 0, marginBottom: '0.5rem' }}>Crear Nuevo Anuncio</h3>
    <p style={{ color: '#9ca3af', fontSize: '0.9rem', margin: '0.5rem 0' }}>Publica anuncios de tus servicios</p>
    {user?.userType === 'ESCORT' && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
        <div style={{ 
          background: postLimitsInfo?.needsPayment ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255, 107, 53, 0.1)', 
          border: postLimitsInfo?.needsPayment ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(255, 107, 53, 0.3)', 
          borderRadius: '20px', padding: '0.5rem 1rem', fontSize: '0.9rem', 
          color: postLimitsInfo?.needsPayment ? '#f59e0b' : '#ff6b35', 
          fontWeight: '600' 
        }}>
          {userPosts.length}/{postLimitsInfo?.freePostsLimit || 2} anuncios
          {postLimitsInfo?.needsPayment && ' (siguientes: $1.00)'}
        </div>
        {postLimitsInfo?.needsPayment && (
          <div style={{ 
            fontSize: '0.8rem', color: '#9ca3af', textAlign: 'center', lineHeight: '1.3' 
          }}>
            Has alcanzado el límite gratuito.<br/>
            Próximos anuncios cuestan $1.00 c/u
          </div>
        )}
      </div>
    )}
  </div>
);

const PostCard = ({ post, index, onEdit, onBoost, onDelete, loading }) => (
  <div style={{ 
    background: STYLES.darkBg, 
    borderRadius: '20px', 
    overflow: 'hidden', 
    border: '1px solid rgba(255, 255, 255, 0.1)' 
  }}>
    <div style={{ position: 'relative', width: '100%', paddingTop: '65%', background: '#000', overflow: 'hidden' }}>
      <img 
        src={post.images?.[0] || 'https://via.placeholder.com/400x260?text=Sin+Imagen'} 
        alt="Post" 
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} 
        onError={(e) => { e.target.src = 'https://via.placeholder.com/400x260?text=Sin+Imagen'; }} 
      />
      <div style={{ position: 'absolute', top: '1rem', left: '1rem', display: 'flex', gap: '0.5rem' }}>
        {post.isBoosted && (
          <div style={{ 
            background: STYLES.gradientOrange, 
            color: 'white', 
            padding: '0.4rem 0.8rem', 
            borderRadius: '20px', 
            fontSize: '0.8rem', 
            fontWeight: '600', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px' 
          }}>
            <Rocket size={12} />Impulsado
          </div>
        )}
        {post.premiumOnly && (
          <div style={{ 
            background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.9), rgba(255, 193, 7, 0.9))', 
            color: '#000', 
            padding: '0.4rem 0.8rem', 
            borderRadius: '20px', 
            fontSize: '0.8rem', 
            fontWeight: '600', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px' 
          }}>
            <Crown size={12} />Premium
          </div>
        )}
      </div>
      <div style={{ position: 'absolute', bottom: '1rem', right: '1rem' }}>
        <div style={{ 
          background: 'rgba(0, 0, 0, 0.7)', 
          backdropFilter: 'blur(10px)', 
          color: 'white', 
          padding: '0.4rem 0.8rem', 
          borderRadius: '20px', 
          fontSize: '0.8rem', 
          fontWeight: '600', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '4px' 
        }}>
          <Heart size={12} style={{ color: '#ff6b35' }} />
          {post.likesCount || 0}
        </div>
      </div>
    </div>
    <div style={{ padding: '1rem 1rem 1.5rem' }}>
      <h4 style={{ 
        color: 'white', 
        fontSize: '1rem', 
        fontWeight: '700', 
        marginBottom: '0.8rem', 
        lineHeight: '1.3', 
        display: '-webkit-box', 
        WebkitLineClamp: 2, 
        WebkitBoxOrient: 'vertical', 
        overflow: 'hidden' 
      }}>
        {post.title}
      </h4>
      <p style={{ 
        color: '#d1d5db', 
        fontSize: '0.9rem', 
        lineHeight: '1.5', 
        marginBottom: '1.2rem', 
        display: '-webkit-box', 
        WebkitLineClamp: 3, 
        WebkitBoxOrient: 'vertical', 
        overflow: 'hidden' 
      }}>
        {post.description}
      </p>
      
      {(post.age || post.sexo || post.location) && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {post.age && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.4rem', 
              padding: '0.4rem 0.8rem', 
              background: 'rgba(255, 107, 53, 0.05)', 
              borderRadius: '12px', 
              border: '1px solid rgba(255, 107, 53, 0.1)' 
            }}>
              <User size={12} style={{ color: '#ff6b35' }} />
              <span style={{ color: '#e5e7eb', fontSize: '0.8rem' }}>{post.age} años</span>
            </div>
          )}
          {post.sexo && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.4rem', 
              padding: '0.4rem 0.8rem', 
              background: 'rgba(255, 107, 53, 0.05)', 
              borderRadius: '12px', 
              border: '1px solid rgba(255, 107, 53, 0.1)' 
            }}>
              <User size={12} style={{ color: '#ff6b35' }} />
              <span style={{ color: '#e5e7eb', fontSize: '0.8rem' }}>{post.sexo}</span>
            </div>
          )}
          {post.location && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.4rem', 
              padding: '0.4rem 0.8rem', 
              background: 'rgba(255, 107, 53, 0.05)', 
              borderRadius: '12px', 
              border: '1px solid rgba(255, 107, 53, 0.1)' 
            }}>
              <MapPin size={12} style={{ color: '#ff6b35' }} />
              <span style={{ color: '#e5e7eb', fontSize: '0.8rem' }}>{post.location}</span>
            </div>
          )}
        </div>
      )}

      {post.phone && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          marginBottom: '1rem', 
          padding: '0.6rem', 
          background: 'rgba(255, 107, 53, 0.05)', 
          borderRadius: '10px', 
          border: '1px solid rgba(255, 107, 53, 0.1)' 
        }}>
          <Phone size={14} style={{ color: '#ff6b35' }} />
          <span style={{ color: '#e5e7eb', fontSize: '0.9rem' }}>{post.phone}</span>
        </div>
      )}

      {post.services && Array.isArray(post.services) && post.services.length > 0 && (
        <div style={{ marginBottom: '1.2rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {post.services.slice(0, 3).map((service, idx) => (
              <span 
                key={idx} 
                style={{ 
                  background: 'rgba(255, 255, 255, 0.05)', 
                  color: '#d1d5db', 
                  padding: '0.3rem 0.6rem', 
                  borderRadius: '12px', 
                  fontSize: '0.8rem', 
                  border: '1px solid rgba(255, 255, 255, 0.1)' 
                }}
              >
                {service}
              </span>
            ))}
            {post.services.length > 3 && (
              <span style={{ color: '#9ca3af', fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}>
                +{post.services.length - 3} más
              </span>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
        <button 
          onClick={onEdit} 
          disabled={loading}
          style={{ 
            borderRadius: '10px', 
            fontWeight: '600', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '4px', 
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '0.6rem 0.4rem', 
            fontSize: '0.75rem',
            background: 'rgba(255, 255, 255, 0.05)', 
            color: '#e5e7eb'
          }}
        >
          <Edit3 size={14} />Editar
        </button>
        <button 
          onClick={onBoost} 
          disabled={loading}
          style={{ 
            borderRadius: '10px', 
            fontWeight: '600', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '4px',
            padding: '0.6rem 0.4rem', 
            fontSize: '0.75rem',
            background: 'rgba(255, 107, 53, 0.1)', 
            color: '#ff6b35',
            border: '1px solid rgba(255, 107, 53, 0.3)'
          }}
        >
          <Rocket size={14} />Promocionar ($1)
        </button>
        <button 
          onClick={onDelete} 
          disabled={loading}
          style={{ 
            borderRadius: '10px', 
            fontWeight: '600', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '4px',
            padding: '0.6rem 0.4rem', 
            fontSize: '0.75rem',
            background: 'rgba(239, 68, 68, 0.1)', 
            color: '#ef4444',
            border: '1px solid rgba(239, 68, 68, 0.3)'
          }}
        >
          <Trash2 size={14} />Eliminar
        </button>
      </div>
    </div>
  </div>
);

const LocationInput = ({ location, onChange, placeholder }) => {
  const [inputValue, setInputValue] = useState(location || '');
  const [isDetecting, setIsDetecting] = useState(false);
  const [hasAutoDetected, setHasAutoDetected] = useState(false);

  useEffect(() => {
    if (!location && !hasAutoDetected) {
      detectLocationAutomatically();
    }
  }, [location, hasAutoDetected]);

  const detectLocationAutomatically = () => {
    if (isDetecting || hasAutoDetected) return;
    
    setIsDetecting(true);
    setHasAutoDetected(true);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=es`);
            const data = await response.json();
            const locationString = `${data.city || data.locality || ''}, ${data.countryName || ''}`.trim().replace(/^,\s*/, '');
            
            if (locationString && locationString !== ', ') {
              setInputValue(locationString);
              onChange(locationString);
            }
          } catch (error) {
            console.log('Geolocalización no disponible:', error);
          } finally { 
            setIsDetecting(false); 
          }
        },
        (error) => { 
          console.log('Geolocalización no permitida:', error); 
          setIsDetecting(false); 
        },
        { 
          timeout: 5000, 
          enableHighAccuracy: false, 
          maximumAge: 300000 
        }
      );
    } else { 
      setIsDetecting(false); 
    }
  };

  const handleManualChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    onChange(value);
  };

  return (
    <div style={{ position: 'relative' }}>
      <input 
        type="text" 
        value={inputValue} 
        onChange={handleManualChange}
        placeholder={isDetecting ? 'Detectando ubicación...' : placeholder} 
        disabled={isDetecting}
        style={{ 
          ...STYLES.input, 
          paddingRight: '45px',
          opacity: isDetecting ? 0.7 : 1,
          cursor: isDetecting ? 'wait' : 'text'
        }} 
      />
      
      <div style={{ 
        position: 'absolute', 
        right: '12px', 
        top: '50%', 
        transform: 'translateY(-50%)',
        display: 'flex',
        alignItems: 'center',
        pointerEvents: 'none'
      }}>
        {isDetecting ? (
          <Loader size={16} className="animate-spin" style={{ color: '#ff6b35' }} />
        ) : (
          <MapPin size={16} style={{ color: '#9ca3af' }} />
        )}
      </div>
    </div>
  );
};

const ServicesInput = ({ services, onChange, maxServices, placeholder }) => {
  const [inputValue, setInputValue] = useState('');
  const safeServices = Array.isArray(services) ? services : [];

  const addService = () => {
    if (inputValue.trim() && safeServices.length < maxServices) {
      onChange([...safeServices, inputValue.trim()]);
      setInputValue('');
    }
  };

  const removeService = (index) => onChange(safeServices.filter((_, i) => i !== index));
  const handleKeyPress = (e) => { if (e.key === 'Enter') { e.preventDefault(); addService(); } };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: safeServices.length > 0 ? '12px' : '0' }}>
        <input 
          type="text" 
          value={inputValue} 
          onChange={(e) => setInputValue(e.target.value)} 
          onKeyPress={handleKeyPress} 
          placeholder={safeServices.length >= maxServices ? `Máximo ${maxServices} servicios` : placeholder} 
          disabled={safeServices.length >= maxServices} 
          style={{ 
            ...STYLES.input, 
            flex: 1, 
            opacity: safeServices.length >= maxServices ? 0.5 : 1 
          }} 
        />
        <button 
          type="button" 
          onClick={addService} 
          disabled={!inputValue.trim() || safeServices.length >= maxServices} 
          style={{ 
            padding: '12px 16px', 
            borderRadius: '10px', 
            border: 'none', 
            background: !inputValue.trim() || safeServices.length >= maxServices ? 'rgba(156, 163, 175, 0.15)' : STYLES.gradientOrange, 
            color: 'white', 
            fontSize: '0.85rem', 
            cursor: !inputValue.trim() || safeServices.length >= maxServices ? 'not-allowed' : 'pointer', 
            opacity: !inputValue.trim() || safeServices.length >= maxServices ? 0.5 : 1, 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px' 
          }}
        >
          <Plus size={16} />
        </button>
      </div>

      {safeServices.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
          {safeServices.map((service, index) => (
            <div 
              key={index} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                padding: '8px 12px', 
                background: 'rgba(255, 107, 53, 0.08)', 
                border: '1px solid rgba(255, 107, 53, 0.2)', 
                borderRadius: '20px', 
                color: '#ff6b35', 
                fontSize: '0.85rem', 
                fontWeight: '500' 
              }}
            >
              <span>{service}</span>
              <button 
                type="button" 
                onClick={() => removeService(index)} 
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: '#ff6b35', 
                  cursor: 'pointer', 
                  fontSize: '16px', 
                  padding: '0', 
                  width: '18px', 
                  height: '18px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  borderRadius: '50%' 
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ color: '#6b7280', fontSize: '0.75rem', textAlign: 'right', marginTop: '4px' }}>
        {safeServices.length}/{maxServices} servicios
      </div>
    </div>
  );
};

const PostFormModal = ({ editingPost, onSave, onClose, loading, user }) => {
  const [formData, setFormData] = useState({ 
    title: editingPost?.title || '', 
    description: editingPost?.description || '', 
    phone: editingPost?.phone || '', 
    services: Array.isArray(editingPost?.services) ? editingPost.services : [], 
    premiumOnly: editingPost?.premiumOnly || false, 
    images: [], 
    currentImages: editingPost?.images || [], 
    removeImages: [], 
    age: editingPost?.age || user?.escort?.age || '', 
    location: editingPost?.location || '',
    sexo: editingPost?.sexo || ''
  });
  const [validationErrors, setValidationErrors] = useState({});
  const postFileInputRef = useRef(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .PhoneInput {
        width: 100% !important;
      }
      .PhoneInputInput {
        width: 100% !important;
        padding: 12px 14px !important;
        padding-left: 52px !important;
        border-radius: 10px !important;
        border: 1px solid rgba(255, 255, 255, 0.08) !important;
        background: rgba(0, 0, 0, 0.25) !important;
        color: white !important;
        fontSize: 0.9rem !important;
        outline: none !important;
        box-sizing: border-box !important;
      }
      .PhoneInputInput:focus {
        border-color: rgba(255, 107, 53, 0.4) !important;
      }
      .PhoneInputCountrySelect {
        background: rgba(0, 0, 0, 0.25) !important;
        border: 1px solid rgba(255, 255, 255, 0.08) !important;
        border-radius: 10px 0 0 10px !important;
        border-right: none !important;
        padding-left: 12px !important;
        padding-right: 8px !important;
      }
      .PhoneInputCountrySelectArrow {
        color: white !important;
        opacity: 0.7 !important;
      }
      .phone-input-error .PhoneInputInput {
        border-color: rgba(239, 68, 68, 0.4) !important;
      }
      .phone-input-error .PhoneInputCountrySelect {
        border-color: rgba(239, 68, 68, 0.4) !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  const validateForm = () => {
    const errors = {};
    if (!formData.title?.trim()) errors.title = 'El título es obligatorio';
    else if (formData.title.length < 5) errors.title = 'El título debe tener al menos 5 caracteres';
    else if (formData.title.length > 30) errors.title = 'El título no puede exceder 30 caracteres';
    if (!formData.description?.trim()) errors.description = 'La descripción es obligatoria';
    else if (formData.description.length < 10) errors.description = 'La descripción debe tener al menos 10 caracteres';
    else if (formData.description.length > 50) errors.description = 'La descripción no puede exceder 50 caracteres';
    if (!formData.phone?.trim()) errors.phone = 'El teléfono es obligatorio';
    if (!formData.age) errors.age = 'La edad es obligatoria';
    else if (formData.age < 18) errors.age = 'Debes ser mayor de 18 años';
    else if (formData.age > 80) errors.age = 'Edad máxima permitida: 80 años';
    if (!formData.location?.trim()) errors.location = 'La ubicación es obligatoria';
    
    if (!formData.sexo?.trim()) {
      errors.sexo = 'El sexo es obligatorio';
    } else if (!VALID_SEXO_VALUES.includes(formData.sexo.trim())) {
      errors.sexo = `El sexo debe ser uno de: ${VALID_SEXO_VALUES.join(', ')}`;
    }
    
    if (formData.services.length === 0) errors.services = 'Agrega al menos un servicio';
    else if (formData.services.length > 3) errors.services = 'Máximo 3 servicios permitidos';
    const totalImages = formData.images.length + formData.currentImages.length - formData.removeImages.length;
    if (totalImages === 0) errors.images = 'Debes tener al menos una imagen';
    else if (totalImages > 5) errors.images = 'Máximo 5 imágenes permitidas';
    
    setValidationErrors(errors);
    
    // Si hay errores, hacer scroll al primer error
    if (Object.keys(errors).length > 0) {
      setTimeout(() => {
        scrollToFirstError(errors);
      }, 100);
    }
    
    return Object.keys(errors).length === 0;
  };

  const scrollToFirstError = (errors) => {
    const errorOrder = ['images', 'title', 'description', 'phone', 'age', 'location', 'sexo', 'services'];
    const firstErrorField = errorOrder.find(field => errors[field]);
    
    if (firstErrorField) {
      // Buscar el elemento del campo con error
      let element = null;
      
      if (firstErrorField === 'images') {
        element = document.querySelector('.images-section');
      } else if (firstErrorField === 'title') {
        element = document.querySelector('input[placeholder*="Título"]');
      } else if (firstErrorField === 'description') {
        element = document.querySelector('input[placeholder*="Describe"]');
      } else if (firstErrorField === 'phone') {
        element = document.querySelector('.PhoneInputInput');
      } else if (firstErrorField === 'age') {
        element = document.querySelector('input[type="number"]');
      } else if (firstErrorField === 'location') {
        element = document.querySelector('input[placeholder*="Santo Domingo"]');
      } else if (firstErrorField === 'sexo') {
        element = document.querySelector('select');
      } else if (firstErrorField === 'services') {
        element = document.querySelector('input[placeholder*="Acompañante"]');
      }
      
      if (element) {
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        // Enfocar el campo si es posible
        if (element.focus) {
          setTimeout(() => element.focus(), 300);
        }
      }
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // ✅ ARREGLO: Limpiar error INMEDIATAMENTE cuando el usuario corrige el campo
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);
    const maxFiles = 5 - (formData.currentImages.length - formData.removeImages.length);
    if (files.length > maxFiles) { alert(`Solo puedes agregar ${maxFiles} imágenes más`); return; }

    const validFiles = files.filter(file => {
      if (file.size > 8 * 1024 * 1024) { alert(`El archivo ${file.name} es muy grande. Máximo 8MB por imagen.`); return false; }
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) { alert(`El archivo ${file.name} no es un formato de imagen válido.`); return false; }
      return true;
    });

    setFormData(prev => ({ ...prev, images: [...prev.images, ...validFiles] }));
    event.target.value = '';
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      const postFormData = new FormData();
      
      if (!formData.sexo || formData.sexo.trim() === '') {
        alert('Error: El campo sexo es obligatorio y está vacío');
        return;
      }

      if (!VALID_SEXO_VALUES.includes(formData.sexo.trim())) {
        alert(`Error: Valor de sexo inválido. Debe ser uno de: ${VALID_SEXO_VALUES.join(', ')}`);
        return;
      }

      postFormData.append('title', formData.title.trim());
      postFormData.append('description', formData.description.trim());
      postFormData.append('phone', formData.phone.trim());
      postFormData.append('age', formData.age.toString());
      postFormData.append('location', formData.location.trim());
      postFormData.append('sexo', formData.sexo.trim());
      
      if (formData.services?.length > 0) postFormData.append('services', JSON.stringify(formData.services));
      if (formData.premiumOnly !== undefined) postFormData.append('premiumOnly', formData.premiumOnly.toString());
      
      formData.images.forEach((image, index) => {
        postFormData.append('images', image);
      });
      
      if (editingPost && formData.removeImages.length > 0) postFormData.append('removeImages', JSON.stringify(formData.removeImages));

      await onSave(postFormData);
      
    } catch (error) { 
      console.error('Error en handleSubmit:', error); 
    }
  };

  const currentVisibleImages = formData.currentImages.filter(img => !formData.removeImages.includes(img));
  const totalImages = formData.images.length + currentVisibleImages.length;

  return (
    <ModalContainer maxWidth={isMobile ? "95vw" : "min(900px, 90vw)"} onClick={(e) => e.stopPropagation()}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: isMobile ? '12px 16px' : '16px 20px', 
        background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.06) 0%, rgba(255, 107, 53, 0.01) 100%)', 
        borderBottom: '1px solid rgba(255, 107, 53, 0.1)' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: 'rgba(255, 107, 53, 0.1)', borderRadius: '10px', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ImageIcon size={18} style={{ color: '#ff6b35' }} />
          </div>
          <h2 style={{ fontSize: isMobile ? '1rem' : '1.15rem', fontWeight: '700', color: 'white', margin: 0 }}>
            {editingPost ? 'Editar Anuncio' : 'Nuevo Anuncio'}
          </h2>
        </div>
        <button 
          onClick={onClose} 
          disabled={loading} 
          style={{ 
            width: '36px', 
            height: '36px', 
            background: 'rgba(255, 255, 255, 0.05)', 
            border: '1px solid rgba(255, 255, 255, 0.1)', 
            borderRadius: '10px', 
            color: '#9ca3af', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontSize: '18px', 
            fontWeight: 'bold' 
          }}
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div style={{ 
        display: isMobile ? 'flex' : 'grid', 
        flexDirection: isMobile ? 'column' : undefined,
        gridTemplateColumns: isMobile ? undefined : '300px 1fr', 
        gap: isMobile ? '16px' : '20px', 
        padding: isMobile ? '16px' : '20px', 
        maxHeight: isMobile ? 'calc(95vh - 60px)' : 'calc(90vh - 80px)', 
        overflow: 'auto' 
      }}>
        
        {/* Images Section */}
        <div 
          className="images-section"
          style={{ 
            background: 'rgba(0, 0, 0, 0.15)', 
            borderRadius: '16px', 
            padding: isMobile ? '12px' : '16px', 
            border: '1px solid rgba(255, 255, 255, 0.05)', 
            height: 'fit-content',
            order: isMobile ? 1 : undefined
          }}
        >
          <h3 style={{ 
            color: 'white', 
            fontSize: '0.9rem', 
            fontWeight: '600', 
            margin: '0 0 12px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px' 
          }}>
            <Camera size={16} style={{ color: '#ff6b35' }} />
            Imágenes ({totalImages}/5)
          </h3>
          
          <div style={{ 
            border: '2px dashed rgba(255, 107, 53, 0.25)', 
            borderRadius: '12px', 
            padding: isMobile ? '16px' : '20px', 
            textAlign: 'center', 
            cursor: totalImages < 5 ? 'pointer' : 'not-allowed', 
            background: totalImages < 5 ? 'rgba(255, 107, 53, 0.02)' : 'rgba(156, 163, 175, 0.02)', 
            opacity: totalImages >= 5 ? 0.5 : 1, 
            minHeight: isMobile ? '80px' : '100px', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            alignItems: 'center' 
          }} onClick={() => totalImages < 5 && postFileInputRef.current?.click()}>
            <input 
              type="file" 
              ref={postFileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              multiple 
              style={{ display: 'none' }} 
              disabled={totalImages >= 5 || loading} 
            />
            <ImageIcon size={isMobile ? 24 : 28} style={{ color: '#ff6b35', marginBottom: '8px' }} />
            <div style={{ color: 'white', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px' }}>
              {totalImages === 0 ? 'Subir Fotos' : `${totalImages}/5 fotos`}
            </div>
            <div style={{ color: '#9ca3af', fontSize: '0.7rem', marginBottom: '10px' }}>
              {totalImages < 5 ? 'JPG, PNG hasta 8MB' : 'Máximo alcanzado'}
            </div>
            {totalImages < 5 && (
              <button 
                onClick={(e) => { e.stopPropagation(); postFileInputRef.current?.click(); }} 
                disabled={loading} 
                style={{ 
                  background: STYLES.gradientOrange, 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '8px', 
                  padding: '6px 12px', 
                  fontSize: '0.75rem', 
                  fontWeight: '600', 
                  cursor: loading ? 'not-allowed' : 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px' 
                }}
              >
                <Plus size={12} />
                {loading ? 'Subiendo...' : 'Agregar'}
              </button>
            )}
          </div>

          {(formData.images.length > 0 || currentVisibleImages.length > 0) && (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)', 
              gap: '8px', 
              marginTop: '12px' 
            }}>
              {editingPost && currentVisibleImages.map((imageUrl, index) => (
                <div key={`current-${index}`} style={{ 
                  position: 'relative', 
                  aspectRatio: '1', 
                  borderRadius: '8px', 
                  overflow: 'hidden', 
                  border: '2px solid rgba(255, 255, 255, 0.1)' 
                }}>
                  <img 
                    src={imageUrl} 
                    alt={`${index + 1}`} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                  <button 
                    onClick={() => setFormData(prev => ({ ...prev, removeImages: [...prev.removeImages, imageUrl] }))} 
                    disabled={loading} 
                    style={{ 
                      position: 'absolute', 
                      top: '4px', 
                      right: '4px', 
                      width: '20px', 
                      height: '20px', 
                      background: 'rgba(239, 68, 68, 0.9)', 
                      border: 'none', 
                      borderRadius: '50%', 
                      color: 'white', 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontSize: '12px', 
                      fontWeight: 'bold' 
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
              
              {formData.images.map((file, index) => (
                <div key={`new-${index}`} style={{ 
                  position: 'relative', 
                  aspectRatio: '1', 
                  borderRadius: '8px', 
                  overflow: 'hidden', 
                  border: '2px solid rgba(34, 197, 94, 0.6)' 
                }}>
                  <img 
                    src={URL.createObjectURL(file)} 
                    alt={`${index + 1}`} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                  <button 
                    onClick={() => setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }))} 
                    disabled={loading} 
                    style={{ 
                      position: 'absolute', 
                      top: '4px', 
                      right: '4px', 
                      width: '20px', 
                      height: '20px', 
                      background: 'rgba(239, 68, 68, 0.9)', 
                      border: 'none', 
                      borderRadius: '50%', 
                      color: 'white', 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontSize: '12px', 
                      fontWeight: 'bold' 
                    }}
                  >
                    ×
                  </button>
                  <div style={{ 
                    position: 'absolute', 
                    top: '4px', 
                    left: '4px', 
                    background: 'linear-gradient(135deg, #22c55e, #16a34a)', 
                    color: 'white', 
                    padding: '2px 6px', 
                    borderRadius: '8px', 
                    fontSize: '0.65rem', 
                    fontWeight: '600' 
                  }}>
                    Nueva
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {validationErrors.images && (
            <div style={{ 
              marginTop: '10px', 
              padding: '8px 12px', 
              background: 'rgba(239, 68, 68, 0.08)', 
              border: '1px solid rgba(239, 68, 68, 0.2)', 
              borderRadius: '8px', 
              color: '#ef4444', 
              fontSize: '0.8rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px' 
            }}>
              <AlertTriangle size={14} />
              {validationErrors.images}
            </div>
          )}
        </div>

        {/* Form Section */}
        <div style={{ 
          overflowY: 'auto', 
          maxHeight: isMobile ? 'none' : 'calc(90vh - 120px)',
          order: isMobile ? 2 : undefined
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Información Básica */}
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.08), rgba(255, 107, 53, 0.03))', 
              border: '1px solid rgba(255, 107, 53, 0.15)', 
              borderRadius: '16px', 
              padding: isMobile ? '16px' : '20px' 
            }}>
              <h3 style={{ 
                color: '#ff6b35', 
                fontSize: '0.95rem', 
                fontWeight: '700', 
                margin: '0 0 12px 0', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px' 
              }}>
                <Edit3 size={16} />
                Información Básica
              </h3>

              <div style={{ display: 'grid', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'white', marginBottom: '6px', display: 'block' }}>
                    Título del anuncio *
                  </label>
                  <input 
                    type="text" 
                    placeholder="Ej: Escort profesional Santo Domingo" 
                    value={formData.title} 
                    onChange={(e) => handleInputChange('title', e.target.value)} 
                    maxLength={30} 
                    style={{ 
                      ...STYLES.input, 
                      border: `1px solid ${validationErrors.title ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`, 
                      fontSize: '0.9rem'
                    }} 
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    {validationErrors.title && <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>{validationErrors.title}</span>}
                    <span style={{ color: '#6b7280', fontSize: '0.75rem', marginLeft: 'auto' }}>{formData.title.length}/30</span>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'white', marginBottom: '6px', display: 'block' }}>
                    Descripción breve *
                  </label>
                  <input 
                    type="text"
                    placeholder="Describe brevemente tus servicios..." 
                    value={formData.description} 
                    maxLength={50} 
                    onChange={(e) => handleInputChange('description', e.target.value)} 
                    style={{ 
                      ...STYLES.input, 
                      border: `1px solid ${validationErrors.description ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`, 
                      fontSize: '0.9rem'
                    }} 
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    {validationErrors.description && <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>{validationErrors.description}</span>}
                    <span style={{ color: '#6b7280', fontSize: '0.75rem', marginLeft: 'auto' }}>{formData.description.length}/50</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Información Personal */}
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08), rgba(34, 197, 94, 0.03))', 
              border: '1px solid rgba(34, 197, 94, 0.15)', 
              borderRadius: '16px', 
              padding: isMobile ? '16px' : '20px' 
            }}>
              <h3 style={{ 
                color: '#22c55e', 
                fontSize: '0.95rem', 
                fontWeight: '700', 
                margin: '0 0 12px 0', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px' 
              }}>
                <User size={16} />
                Información Personal
              </h3>

              <div style={{ display: 'grid', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'white', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Phone size={14} style={{ color: '#22c55e' }} />
                      Contacto *
                    </label>
                    <PhoneInput 
                      placeholder="+1-829-555-0123" 
                      value={formData.phone} 
                      onChange={(value) => handleInputChange('phone', value || '')} 
                      defaultCountry="DO" 
                      international 
                      countryCallingCodeEditable={false}
                      className={validationErrors.phone ? 'phone-input-error' : ''}
                    />
                    {validationErrors.phone && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{validationErrors.phone}</span>}
                  </div>

                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'white', marginBottom: '6px', display: 'block' }}>Edad *</label>
                    <input 
                      type="number" 
                      placeholder="25" 
                      value={formData.age} 
                      min={18} 
                      max={80} 
                      onChange={(e) => handleInputChange('age', parseInt(e.target.value) || '')} 
                      style={{ 
                        ...STYLES.input, 
                        border: `1px solid ${validationErrors.age ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`, 
                        textAlign: 'center',
                        fontSize: '0.9rem'
                      }} 
                    />
                    {validationErrors.age && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{validationErrors.age}</span>}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'white', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={14} style={{ color: '#22c55e' }} />
                      Ubicación *
                    </label>
                    <LocationInput 
                      location={formData.location} 
                      onChange={(value) => handleInputChange('location', value)} 
                      placeholder="Santo Domingo, RD" 
                    />
                    {validationErrors.location && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{validationErrors.location}</span>}
                  </div>

                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'white', marginBottom: '6px', display: 'block' }}>Género *</label>
                    <select
                      value={formData.sexo}
                      onChange={(e) => handleInputChange('sexo', e.target.value)}
                      style={{
                        ...STYLES.input,
                        appearance: 'none',
                        backgroundImage: `url("data:image/svg+xml;charset=UTF-8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6,9 12,15 18,9'></polyline></svg>")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 12px center',
                        backgroundSize: '14px',
                        paddingRight: '35px',
                        border: `1px solid ${validationErrors.sexo ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
                        fontSize: '0.9rem'
                      }}
                    >
                      <option value="" style={{ background: '#1a1a1a', color: '#9ca3af' }}>
                        Selecciona
                      </option>
                      {VALID_SEXO_VALUES.map((sexoOption) => (
                        <option 
                          key={sexoOption} 
                          value={sexoOption}
                          style={{ background: '#1a1a1a', color: 'white' }}
                        >
                          {sexoOption}
                        </option>
                      ))}
                    </select>
                    {validationErrors.sexo && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{validationErrors.sexo}</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Servicios y Configuración */}
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08), rgba(168, 85, 247, 0.03))', 
              border: '1px solid rgba(168, 85, 247, 0.15)', 
              borderRadius: '16px', 
              padding: isMobile ? '16px' : '20px' 
            }}>
              <h3 style={{ 
                color: '#a855f7', 
                fontSize: '0.95rem', 
                fontWeight: '700', 
                margin: '0 0 12px 0', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px' 
              }}>
                <Star size={16} />
                Servicios y Configuración
              </h3>

              <div style={{ display: 'grid', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'white', marginBottom: '6px', display: 'block' }}>
                    Servicios principales (máx 3) *
                  </label>
                  <ServicesInput 
                    services={formData.services} 
                    onChange={(value) => handleInputChange('services', value)} 
                    maxServices={3} 
                    placeholder="Ej: Acompañante, Masajes, Eventos" 
                  />
                  {validationErrors.services && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{validationErrors.services}</span>}
                </div>

                <div style={{ 
                  padding: '12px', 
                  background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 215, 0, 0.05))', 
                  border: '1px solid rgba(255, 215, 0, 0.2)', 
                  borderRadius: '10px'
                }}>
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px', 
                    cursor: 'pointer',
                    fontSize: '0.85rem', 
                    fontWeight: '600', 
                    color: 'white'
                  }}>
                    <input 
                      type="checkbox" 
                      checked={formData.premiumOnly} 
                      onChange={(e) => handleInputChange('premiumOnly', e.target.checked)} 
                      style={{ 
                        width: '16px', 
                        height: '16px', 
                        accentColor: '#ffd700', 
                        cursor: 'pointer'
                      }} 
                    />
                    <Crown size={14} style={{ color: '#ffd700' }} />
                    <span>Solo usuarios premium</span>
                  </label>
                  <p style={{ 
                    color: '#d1d5db', 
                    fontSize: '0.75rem', 
                    margin: '6px 0 0 36px', 
                    lineHeight: '1.3',
                    opacity: 0.9
                  }}>
                    Mayor calidad de contactos
                  </p>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div style={{ 
              display: 'flex', 
              flexDirection: isMobile ? 'column' : 'row',
              gap: '12px', 
              paddingTop: '16px', 
              borderTop: '1px solid rgba(255, 107, 53, 0.1)', 
              marginTop: '8px' 
            }}>
              <button 
                onClick={onClose} 
                disabled={loading} 
                style={{ 
                  flex: 1, 
                  padding: '14px 20px', 
                  borderRadius: '12px', 
                  fontSize: '0.9rem', 
                  fontWeight: '600', 
                  background: 'rgba(255, 255, 255, 0.05)', 
                  color: '#d1d5db', 
                  border: '1px solid rgba(255, 255, 255, 0.1)', 
                  cursor: loading ? 'not-allowed' : 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '8px'
                }}
              >
                <X size={16} />Cancelar
              </button>
              
              <button 
                onClick={handleSubmit} 
                disabled={loading} 
                style={{ 
                  flex: 2, 
                  padding: '14px 20px', 
                  borderRadius: '12px', 
                  fontSize: '0.9rem', 
                  fontWeight: '600', 
                  background: loading ? 'rgba(156, 163, 175, 0.2)' : STYLES.gradientOrange, 
                  color: 'white', 
                  border: 'none', 
                  cursor: loading ? 'not-allowed' : 'pointer', 
                  opacity: loading ? 0.6 : 1, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '8px'
                }}
              >
                {loading ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    {editingPost ? 'Actualizando...' : 'Publicando...'}
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    {editingPost ? 'Actualizar Anuncio' : 'Publicar Anuncio'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalContainer>
  );
};

const DeleteModal = ({ post, onConfirm, onCancel, loading }) => {
  const isMobile = window.innerWidth < 768;
  
  return (
    <ModalContainer maxWidth={isMobile ? "95vw" : "400px"} onClick={(e) => e.stopPropagation()}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: isMobile ? '12px 16px' : '16px 20px', 
        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.02) 50%, transparent 100%)', 
        borderBottom: '1px solid rgba(239, 68, 68, 0.15)' 
      }}>
        <h2 style={{ 
          fontSize: isMobile ? '0.95rem' : '1rem', 
          fontWeight: '700', 
          color: 'white', 
          margin: 0, 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px' 
        }}>
          <AlertTriangle size={16} style={{ color: '#ef4444' }} />
          Eliminar
        </h2>
        <button 
          onClick={!loading ? onCancel : undefined} 
          disabled={loading} 
          style={{ 
            width: '32px', 
            height: '32px', 
            background: 'rgba(17, 17, 17, 0.8)', 
            border: '1px solid rgba(255, 255, 255, 0.1)', 
            borderRadius: '8px', 
            color: 'white', 
            cursor: loading ? 'not-allowed' : 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontSize: '16px', 
            fontWeight: 'bold' 
          }}
        >
          ×
        </button>
      </div>

      <div style={{ padding: isMobile ? '16px' : '20px' }}>
        <div style={{ 
          background: '#2a2a2a', 
          border: '1px solid #333333', 
          borderRadius: '10px', 
          overflow: 'hidden', 
          marginBottom: '16px' 
        }}>
          <img 
            src={post?.images?.[0] || 'https://via.placeholder.com/150?text=Sin+Imagen'} 
            alt="Post" 
            style={{ width: '100%', height: '100px', objectFit: 'cover' }} 
            onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=Sin+Imagen'; }} 
          />
          <div style={{ padding: '12px' }}>
            <h4 style={{ 
              color: 'white', 
              fontSize: '0.85rem', 
              marginBottom: '6px', 
              fontWeight: '600', 
              lineHeight: '1.3' 
            }}>
              {post?.title || 'Anuncio'}
            </h4>
            <p style={{ 
              color: '#d1d5db', 
              fontSize: '0.75rem', 
              lineHeight: '1.3', 
              margin: 0, 
              display: '-webkit-box', 
              WebkitLineClamp: 2, 
              WebkitBoxOrient: 'vertical', 
              overflow: 'hidden' 
            }}>
              {post?.description || 'Sin descripción'}
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '2px solid rgba(239, 68, 68, 0.3)', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 12px' 
          }}>
            <Trash2 size={20} style={{ color: '#ef4444' }} />
          </div>
          <h3 style={{ 
            fontSize: '1rem', 
            fontWeight: '600', 
            color: 'white', 
            marginBottom: '6px' 
          }}>
            ¿Eliminar este anuncio?
          </h3>
          <p style={{ 
            color: '#9ca3af', 
            fontSize: '0.8rem', 
            lineHeight: '1.4', 
            margin: 0 
          }}>
            Esta acción es permanente y no se puede deshacer.
          </p>
        </div>

        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row', 
          gap: '10px' 
        }}>
          <button 
            onClick={onCancel} 
            disabled={loading} 
            style={{ 
              flex: 1, 
              padding: '12px', 
              background: 'rgba(17, 17, 17, 0.6)', 
              color: '#d1d5db', 
              border: '1px solid rgba(255, 255, 255, 0.1)', 
              borderRadius: '8px', 
              fontSize: '0.85rem', 
              fontWeight: '600', 
              cursor: loading ? 'not-allowed' : 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '6px' 
            }}
          >
            <X size={14} />Cancelar
          </button>
          <button 
            onClick={onConfirm} 
            disabled={loading} 
            style={{ 
              flex: 1, 
              padding: '12px', 
              background: loading ? 'rgba(156, 163, 175, 0.3)' : 'linear-gradient(135deg, #ef4444, #dc2626)', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              fontSize: '0.85rem', 
              fontWeight: '600', 
              cursor: loading ? 'not-allowed' : 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '6px' 
            }}
          >
            {loading ? (
              <>
                <Loader size={14} className="animate-spin" />
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 size={14} />
                Eliminar
              </>
            )}
          </button>
        </div>
      </div>
    </ModalContainer>
  );
};

export default PostsManager;