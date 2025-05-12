const { Kafka, Partitioners } = require('kafkajs'); // Ajoutez Partitioners

const kafka = new Kafka({
  clientId: 'recette-service',
  brokers: ['localhost:9092']
});

const producer = kafka.producer({
  createPartitioner: Partitioners.LegacyPartitioner // Ajoutez cette ligne
});

module.exports = kafka;