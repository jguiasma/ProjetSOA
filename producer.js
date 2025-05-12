const { Kafka, Partitioners } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'recette-service-producer',
  brokers: ['localhost:9092'],
  logLevel: 1
});

const producer = kafka.producer({
  createPartitioner: Partitioners.LegacyPartitioner
});

const TOPIC = 'recette-events';

async function connectProducer() {
  try {
    await producer.connect();
    console.log('[Kafka] Producteur connecté');
  } catch (err) {
    console.error('[Kafka] Erreur de connexion:', err);
    throw err;
  }
}


async function sendRecetteEvent(eventType, eventData) {
  try {
    await producer.send({
      topic: TOPIC,
      messages: [{
        key: eventData.id, // Partitionnement par ID de recette
        value: JSON.stringify({
          eventType,
          ...eventData,
          service: 'recette-service',
          timestamp: new Date().toISOString()
        })
      }]
    });
    console.log(`[Kafka] Événement ${eventType} envoyé`);
  } catch (err) {
    console.error('[Kafka] Erreur d\'envoi:', err);
    throw err;
  }
}

// Connexion automatique au démarrage
connectProducer().catch(() => process.exit(1));

module.exports = { sendRecetteEvent };