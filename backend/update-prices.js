// ✅ SCRIPT COMPLETO PARA CAMBIAR TODOS LOS PRECIOS A $1.00
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

// ✅ DETECTAR ENTORNO Y USAR LA URL CORRECTA
const environment = process.env.NODE_ENV || 'development';
const isProduction = environment === 'production';

// ✅ OBTENER LA URL DE BASE DE DATOS CORRECTA
const databaseUrl = isProduction 
  ? process.env.DATABASE_URL_PROD 
  : process.env.DATABASE_URL_DEV;

console.log(`🌍 Entorno detectado: ${environment}`);
console.log(`💾 Usando base de datos: ${databaseUrl ? '✅ Configurada' : '❌ Faltante'}`);

if (!databaseUrl) {
  console.error('❌ ERROR: No se encontró DATABASE_URL para el entorno actual');
  console.error(`   Buscando: ${isProduction ? 'DATABASE_URL_PROD' : 'DATABASE_URL_DEV'}`);
  process.exit(1);
}

// ✅ CONFIGURAR PRISMA CON LA URL CORRECTA
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl
    }
  }
});

async function updateAllPricesToTesting() {
  console.log('🔄 Iniciando actualización COMPLETA de precios para testing...\n');
  console.log('💸 MODO TESTING: Todos los precios serán cambiados a $1.00\n');

  try {
    let totalUpdates = 0;

    // 1. PAQUETES DE PUNTOS
    console.log('💰 1. ACTUALIZANDO PAQUETES DE PUNTOS...');
    const currentPackages = await prisma.pointsPackage.findMany({
      select: { id: true, name: true, points: true, bonus: true, price: true },
      orderBy: { points: 'asc' }
    });
    
    if (currentPackages.length > 0) {
      console.log('📋 Precios actuales de paquetes:');
      console.table(currentPackages.map(pkg => ({
        Nombre: pkg.name,
        Puntos: pkg.points,
        Bonus: pkg.bonus,
        'Precio Actual': `$${pkg.price}`
      })));

      const packageUpdateResult = await prisma.pointsPackage.updateMany({
        data: { price: 1.00 }
      });

      console.log(`✅ ${packageUpdateResult.count} paquetes de puntos actualizados a $1.00`);
      totalUpdates += packageUpdateResult.count;
    } else {
      console.log('⚠️ No se encontraron paquetes de puntos');
    }

    // 2. PRECIOS DE BOOST
    console.log('\n🚀 2. ACTUALIZANDO PRECIOS DE BOOST...');
    const currentBoosts = await prisma.boostPricing.findMany({
      select: { id: true, type: true, duration: true, price: true },
      orderBy: { duration: 'asc' }
    });
    
    if (currentBoosts.length > 0) {
      console.log('📋 Precios actuales de boost:');
      console.table(currentBoosts.map(boost => ({
        Tipo: boost.type,
        'Duración': `${boost.duration}h`,
        'Precio Actual': `$${boost.price}`
      })));

      const boostUpdateResult = await prisma.boostPricing.updateMany({
        data: { price: 1.00 }
      });

      console.log(`✅ ${boostUpdateResult.count} precios de boost actualizados a $1.00`);
      totalUpdates += boostUpdateResult.count;
    } else {
      console.log('⚠️ No se encontraron precios de boost');
    }

    // 3. PRECIOS DE VERIFICACIÓN
    console.log('\n✅ 3. ACTUALIZANDO PRECIOS DE VERIFICACIÓN...');
    const currentVerifications = await prisma.verificationPricing.findMany({
      select: { id: true, name: true, cost: true, duration: true },
      orderBy: { cost: 'asc' }
    });
    
    if (currentVerifications.length > 0) {
      console.log('📋 Precios actuales de verificación:');
      console.table(currentVerifications.map(ver => ({
        Nombre: ver.name,
        'Duración': `${ver.duration} días`,
        'Precio Actual': `$${ver.cost}`
      })));

      const verificationUpdateResult = await prisma.verificationPricing.updateMany({
        data: { cost: 1.00 }
      });

      console.log(`✅ ${verificationUpdateResult.count} precios de verificación actualizados a $1.00`);
      totalUpdates += verificationUpdateResult.count;
    } else {
      console.log('⚠️ No se encontraron precios de verificación');
    }

    // 4. PLANES DE SUSCRIPCIÓN (Premium/VIP)
    console.log('\n📋 4. ACTUALIZANDO PLANES DE SUSCRIPCIÓN...');
    const currentSubscriptionPlans = await prisma.subscriptionPlan.findMany({
      where: { 
        price: { gt: 0 } // Solo actualizar planes que no sean gratuitos
      },
      select: { id: true, name: true, price: true, duration: true, userType: true }
    });
    
    if (currentSubscriptionPlans.length > 0) {
      console.log('📋 Planes de suscripción actuales (solo pagos):');
      console.table(currentSubscriptionPlans.map(plan => ({
        Nombre: plan.name,
        'Tipo Usuario': plan.userType,
        'Duración': `${plan.duration} días`,
        'Precio Actual': `$${plan.price}`
      })));

      const subscriptionUpdateResult = await prisma.subscriptionPlan.updateMany({
        where: { price: { gt: 0 } },
        data: { price: 1.00 }
      });

      console.log(`✅ ${subscriptionUpdateResult.count} planes de suscripción actualizados a $1.00`);
      totalUpdates += subscriptionUpdateResult.count;
    } else {
      console.log('⚠️ No se encontraron planes de suscripción pagos');
    }

    // 5. VERIFICAR OTROS PRECIOS EN EL SISTEMA
    console.log('\n🔍 5. VERIFICANDO OTROS PRECIOS EN EL SISTEMA...');
    
    // Verificar si hay pagos existentes con diferentes precios (para referencia)
    const existingPayments = await prisma.payment.findMany({
      select: { type: true, amount: true },
      distinct: ['type', 'amount'],
      orderBy: { amount: 'asc' }
    });

    if (existingPayments.length > 0) {
      console.log('📋 Tipos de pagos existentes en el sistema:');
      console.table(existingPayments.map(payment => ({
        'Tipo de Pago': payment.type,
        'Monto': `$${payment.amount}`
      })));
      console.log('ℹ️ Nota: Los pagos existentes NO se modifican, solo los precios base');
    }

    // 6. MOSTRAR RESUMEN FINAL
    console.log('\n' + '='.repeat(60));
    console.log('🎉 ACTUALIZACIÓN COMPLETA FINALIZADA');
    console.log('='.repeat(60));
    console.log(`📊 Total de elementos actualizados: ${totalUpdates}`);
    console.log('');
    console.log('✅ PRECIOS ACTUALIZADOS A $1.00:');
    console.log('   💰 Paquetes de puntos');
    console.log('   🚀 Boosts (todas las duraciones)');
    console.log('   ✅ Verificaciones de escort');
    console.log('   📋 Suscripciones premium/VIP');
    console.log('');
    console.log('🧪 MODO TESTING ACTIVADO');
    console.log('💳 Stripe ahora cobrará únicamente $1.00 por cualquier compra');
    console.log('🔄 Recarga el frontend para ver los nuevos precios');
    console.log('');
    console.log('⚠️ RECORDATORIO IMPORTANTE:');
    console.log('   🔒 Cambia estos precios antes de ir a producción');
    console.log('   📝 Documenta los precios originales si los necesitas');
    console.log('   🧪 Este cambio es solo para testing de Stripe');
    console.log('='.repeat(60));

    // 7. MOSTRAR ESTADO FINAL DE TODOS LOS PRECIOS
    console.log('\n📋 ESTADO FINAL DE TODOS LOS PRECIOS:');
    
    // Paquetes de puntos finales
    const finalPackages = await prisma.pointsPackage.findMany({
      select: { name: true, points: true, bonus: true, price: true },
      orderBy: { points: 'asc' }
    });
    
    if (finalPackages.length > 0) {
      console.log('\n💰 Paquetes de Puntos:');
      console.table(finalPackages.map(pkg => ({
        Paquete: pkg.name,
        Puntos: pkg.points,
        Bonus: pkg.bonus,
        Total: pkg.points + (pkg.bonus || 0),
        Precio: `$${pkg.price}`
      })));
    }

    // Boosts finales
    const finalBoosts = await prisma.boostPricing.findMany({
      select: { type: true, duration: true, price: true, multiplier: true },
      orderBy: { duration: 'asc' }
    });
    
    if (finalBoosts.length > 0) {
      console.log('\n🚀 Precios de Boost:');
      console.table(finalBoosts.map(boost => ({
        Tipo: boost.type,
        'Duración': `${boost.duration}h`,
        'Multiplicador': `${boost.multiplier}x`,
        Precio: `$${boost.price}`
      })));
    }

    // Verificaciones finales
    const finalVerifications = await prisma.verificationPricing.findMany({
      select: { name: true, duration: true, cost: true },
      orderBy: { cost: 'asc' }
    });
    
    if (finalVerifications.length > 0) {
      console.log('\n✅ Precios de Verificación:');
      console.table(finalVerifications.map(ver => ({
        Tipo: ver.name,
        'Duración': `${ver.duration} días`,
        Precio: `$${ver.cost}`
      })));
    }

    // Suscripciones finales
    const finalSubscriptions = await prisma.subscriptionPlan.findMany({
      select: { name: true, userType: true, duration: true, price: true },
      orderBy: { price: 'asc' }
    });
    
    if (finalSubscriptions.length > 0) {
      console.log('\n📋 Planes de Suscripción:');
      console.table(finalSubscriptions.map(plan => ({
        Plan: plan.name,
        'Para': plan.userType,
        'Duración': `${plan.duration} días`,
        Precio: plan.price === 0 ? 'GRATIS' : `$${plan.price}`
      })));
    }

    console.log('\n🎯 ¡Listo para testing con Stripe a $1.00! 🎯\n');

  } catch (error) {
    console.error('❌ Error actualizando precios:', error);
    
    if (error.code === 'P2002') {
      console.log('💡 Error de restricción única. Revisa si hay datos duplicados.');
    } else if (error.code === 'P2025') {
      console.log('💡 No se encontraron registros para actualizar.');
    } else if (error.code === 'P1001') {
      console.log('💡 Error de conexión. Verifica que la base de datos esté disponible.');
    } else {
      console.log('💡 Verifica que la base de datos esté conectada y que las tablas existan.');
      console.log('💡 Si es la primera vez, ejecuta: npm run seed');
    }
    
    throw error;
  }
}

// Ejecutar el script
updateAllPricesToTesting()
  .catch((e) => {
    console.error('❌ Error fatal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('🔌 Conexión a la base de datos cerrada');
  });