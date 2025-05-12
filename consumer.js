const { Kafka } = require('kafkajs');
const mongoose = require('mongoose');

// Configuration MongoDB (version modernisée)
const MONGO_URI = 'mongodb://localhost:27017/recette_events';

// Suppression des options dépréciées + ajout des meilleures pratiques 2024
const MONGO_OPTIONS = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 30000,
  maxPoolSize: 10,
  retryWrites: true,
  retryReads: true
};

// Modèle Mongoose (optimisé)
const eventSchema = new mongoose.Schema({
  eventType: { type: String, required: true, index: true },
  recetteId: { type: String, required: true, index: true },
  payload: { type: Object, required: true },
  processedAt: { type: Date, default: Date.now, index: true },
  kafkaOffset: { type: Number, index: true },
  partition: Number
}, {
  autoIndex: true,
  timestamps: false
});

const Event = mongoose.model('Event', eventSchema);

async function startConsumer() {
  try {
    // 1. Connexion MongoDB (version modernisée)
    await mongoose.connect(MONGO_URI, MONGO_OPTIONS);
    console.log('✅ Connecté à MongoDB (v4.0+)');

    // 2. Configuration Kafka
    const kafka = new Kafka({
      clientId: 'recette-service-consumer',
      brokers: ['localhost:9092'],
      logLevel: 1
    });

    const consumer = kafka.consumer({
      groupId: 'recette-events-group',
      heartbeatInterval: 3000,
      sessionTimeout: 30000
    });

    // 3. Gestion des erreurs améliorée
    consumer.on('consumer.crash', ({ error }) => {
      console.error('🚨 Crash du consumer:', error);
      process.exit(1);
    });

    await consumer.connect();
    await consumer.subscribe({ 
      topic: 'recette-events',
      fromBeginning: false
    });
    console.log('✅ Abonné au topic recette-events (offset: latest)');

    // 4. Traitement des messages avec gestion d'erreur renforcée
    await consumer.run({
      autoCommit: true,
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value.toString());
          
          console.log(`📩 Événement [${event.eventType}]`, {
            id: event.recette.id,
            offset: message.offset
          });

          // Insertion avec vérification de doublon
          const exists = await Event.exists({ 
            recetteId: event.recette.id,
            kafkaOffset: message.offset 
          });

          if (!exists) {
            await Event.create({
              eventType: event.eventType,
              recetteId: event.recette.id,
              payload: event.recette,
              kafkaOffset: message.offset,
              partition
            });
            console.log('💾 Événement persisté');
          } else {
            console.log('⚠️ Événement déjà traité (idempotence)');
          }
        } catch (err) {
          console.error('❌ Erreur de traitement:', {
            error: err.message,
            stack: err.stack
          });
        }
      }
    });

  } catch (err) {
    console.error('🚨 Initialisation failed:', err);
    process.exit(1);
  }
}

// Gestion propre des signaux
['SIGINT', 'SIGTERM'].forEach(signal => {
  process.on(signal, async () => {
    console.log(`🛑 Réception ${signal} - Fermeture propre...`);
    await mongoose.disconnect();
    process.exit(0);
  });
});

startConsumer();