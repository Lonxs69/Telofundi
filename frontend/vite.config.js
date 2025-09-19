import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // ✅ CARGAR VARIABLES DE ENTORNO EXPLÍCITAMENTE
  const env = loadEnv(mode, process.cwd(), '')
  
  console.log('🔧 === VITE CONFIG DEBUG ===')
  console.log('🔧 Mode:', mode)
  console.log('🔧 Command:', command)
  console.log('🔧 Current working directory:', process.cwd())
  
  // ✅ MOSTRAR TODAS LAS VARIABLES VITE_ ENCONTRADAS
  const viteVars = Object.keys(env).filter(key => key.startsWith('VITE_'))
  console.log('🔧 VITE_ variables found:', viteVars.length)
  viteVars.forEach(key => {
    console.log(`🔧   ${key} = ${env[key]}`)
  })
  
  if (viteVars.length === 0) {
    console.warn('⚠️ NO VITE_ variables found! Check your .env file.')
  }
  
  // ✅ DETECTAR ENTORNO AUTOMÁTICAMENTE
  const isDevelopment = mode === 'development'
  const isProduction = mode === 'production'
  
  console.log('🔧 Environment Detection:', {
    mode,
    isDevelopment,
    isProduction,
    nodeEnvFromVite: env.VITE_NODE_ENV
  })
  
  return {
    plugins: [react()],
    
    // ✅ CONFIGURACIÓN DEL SERVIDOR 
    server: {
      host: true,
      port: 5173,
      strictPort: false, // ✅ Permitir cambio de puerto si está ocupado
      open: false, // ✅ No abrir automáticamente
      cors: true // ✅ Habilitar CORS
    },
    
    // ✅ CONFIGURACIÓN DE BUILD
    build: {
      outDir: 'dist',
      sourcemap: isDevelopment,
      minify: isProduction ? 'esbuild' : false,
      target: 'es2015',
      rollupOptions: {
        output: {
          manualChunks: undefined
        }
      }
    },
    
    // ✅ CONFIGURACIÓN DE ENTORNO (ESTO ES CRÍTICO)
    envPrefix: ['VITE_'],
    
    // ✅ DEFINIR VARIABLES DE ENTORNO EXPLÍCITAMENTE
    define: {
      // ✅ INFORMACIÓN BÁSICA DEL ENTORNO
      'import.meta.env.MODE': JSON.stringify(mode),
      'import.meta.env.DEV': isDevelopment,
      'import.meta.env.PROD': isProduction,
      
      // ✅ DETECCIÓN DINÁMICA DE ENTORNO
      'import.meta.env.VITE_NODE_ENV': JSON.stringify(env.VITE_NODE_ENV || mode),
      
      // ✅ URLs DE DESARROLLO
      'import.meta.env.VITE_API_URL_DEV': JSON.stringify(
        env.VITE_API_URL_DEV || 'http://localhost:3000/api'
      ),
      'import.meta.env.VITE_FRONTEND_URL_DEV': JSON.stringify(
        env.VITE_FRONTEND_URL_DEV || 'http://localhost:5173'
      ),
      'import.meta.env.VITE_SOCKET_URL_DEV': JSON.stringify(
        env.VITE_SOCKET_URL_DEV || 'http://localhost:3000'
      ),
      'import.meta.env.VITE_WS_URL_DEV': JSON.stringify(
        env.VITE_WS_URL_DEV || 'ws://localhost:3000'
      ),
      
      // ✅ URLs DE PRODUCCIÓN
      'import.meta.env.VITE_API_URL_PROD': JSON.stringify(
        env.VITE_API_URL_PROD || 'https://telofundi.com/api'
      ),
      'import.meta.env.VITE_FRONTEND_URL_PROD': JSON.stringify(
        env.VITE_FRONTEND_URL_PROD || 'https://telofundi.com'
      ),
      'import.meta.env.VITE_SOCKET_URL_PROD': JSON.stringify(
        env.VITE_SOCKET_URL_PROD || 'https://telofundi.com'
      ),
      'import.meta.env.VITE_WS_URL_PROD': JSON.stringify(
        env.VITE_WS_URL_PROD || 'wss://telofundi.com'
      ),
      
      // ✅ GOOGLE OAUTH - DESARROLLO
      'import.meta.env.VITE_GOOGLE_CLIENT_ID_DEV': JSON.stringify(
        env.VITE_GOOGLE_CLIENT_ID_DEV || '806629606259-vhh2tllvhkvp42987d06ru6vnterkija.apps.googleusercontent.com'
      ),
      'import.meta.env.VITE_GOOGLE_CALLBACK_URL_DEV': JSON.stringify(
        env.VITE_GOOGLE_CALLBACK_URL_DEV || 'http://localhost:3000/api/auth/google/callback'
      ),
      
      // ✅ GOOGLE OAUTH - PRODUCCIÓN
      'import.meta.env.VITE_GOOGLE_CLIENT_ID_PROD': JSON.stringify(
        env.VITE_GOOGLE_CLIENT_ID_PROD || '1010933439861-t4t4i45of6gvsfb4s23083i4s1l8pr0q.apps.googleusercontent.com'
      ),
      'import.meta.env.VITE_GOOGLE_CALLBACK_URL_PROD': JSON.stringify(
        env.VITE_GOOGLE_CALLBACK_URL_PROD || 'https://telofundi.com/api/auth/google/callback'
      ),
      
      // ✅ CONFIGURACIÓN DE LA APP
      'import.meta.env.VITE_APP_NAME': JSON.stringify(
        env.VITE_APP_NAME || 'TeloFundi'
      ),
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(
        env.VITE_APP_VERSION || '1.0.0'
      ),
      'import.meta.env.VITE_DEBUG_MODE': JSON.stringify(
        env.VITE_DEBUG_MODE || (isDevelopment ? 'true' : 'false')
      ),
      
      // ✅ CARACTERÍSTICAS HABILITADAS
      'import.meta.env.VITE_CHAT_ENABLED': JSON.stringify(
        env.VITE_CHAT_ENABLED || 'true'
      ),
      'import.meta.env.VITE_PAYMENTS_ENABLED': JSON.stringify(
        env.VITE_PAYMENTS_ENABLED || 'true'
      ),
      'import.meta.env.VITE_NOTIFICATIONS_ENABLED': JSON.stringify(
        env.VITE_NOTIFICATIONS_ENABLED || 'true'
      ),
      'import.meta.env.VITE_GOOGLE_AUTH_ENABLED': JSON.stringify(
        env.VITE_GOOGLE_AUTH_ENABLED || 'true'
      ),
      
      // ✅ LÍMITES Y CONFIGURACIONES
      'import.meta.env.VITE_MAX_FILE_SIZE': JSON.stringify(
        env.VITE_MAX_FILE_SIZE || '5242880'
      ),
      'import.meta.env.VITE_MAX_IMAGES_PER_POST': JSON.stringify(
        env.VITE_MAX_IMAGES_PER_POST || '5'
      ),
      'import.meta.env.VITE_MESSAGE_MAX_LENGTH': JSON.stringify(
        env.VITE_MESSAGE_MAX_LENGTH || '2000'
      ),
      
      // ✅ MAPEAR AUTOMÁTICAMENTE TODAS LAS VARIABLES VITE_
      ...Object.keys(env)
        .filter(key => key.startsWith('VITE_'))
        .reduce((acc, key) => {
          acc[`import.meta.env.${key}`] = JSON.stringify(env[key])
          return acc
        }, {})
    },
    
    // ✅ RESOLUCIÓN DE MÓDULOS
    resolve: {
      alias: {
        '@': '/src'
      }
    },
    
    // ✅ OPTIMIZACIÓN DE DEPENDENCIAS
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'framer-motion',
        'lucide-react'
      ]
    }
  }
})