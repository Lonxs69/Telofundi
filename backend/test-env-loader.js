// test-env-loader.js - Verificar que el mapeo funciona
console.log('🧪 === TEST 1: ENV-LOADER FUNCTIONALITY ===');

// Test con development
process.env.NODE_ENV = 'development';
console.log('\n📍 Testing DEVELOPMENT mode:');
require('./env-loader');
console.log('DATABASE_URL:', process.env.DATABASE_URL || 'NOT SET');
console.log('FRONTEND_URL:', process.env.FRONTEND_URL || 'NOT SET');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID || 'NOT SET');

// Reset environment
delete require.cache[require.resolve('./env-loader')];
Object.keys(process.env).forEach(key => {
  if (!key.includes('_DEV') && !key.includes('_PROD') && !key.includes('NODE_ENV')) {
    delete process.env[key];
  }
});

// Test con production
process.env.NODE_ENV = 'production';
console.log('\n📍 Testing PRODUCTION mode:');
require('./env-loader');
console.log('DATABASE_URL:', process.env.DATABASE_URL || 'NOT SET');
console.log('FRONTEND_URL:', process.env.FRONTEND_URL || 'NOT SET');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID || 'NOT SET');

console.log('\n✅ Si ves URLs diferentes para DEV y PROD, el mapeo funciona!');