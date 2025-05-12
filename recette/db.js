const { MongoClient } = require('mongodb');

const uri = "mongodb://localhost:27017/recettesDB";
let client;
let db;

async function connectDB() {
  try {
    client = new MongoClient(uri, {
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000
    });
    await client.connect();
    db = client.db();
    
    // Créer les collections et index si elles n'existent pas
    await db.collection('recettes').createIndex({ id: 1 }, { unique: true });
    await db.collection('recettes').createIndex({ categorie: 1 }); // Index pour les requêtes par catégorie
    
    console.log("✅ Connecté à MongoDB (Recettes) avec succès");
    return db;
  } catch (e) {
    console.error("❌ Erreur de connexion à MongoDB (Recettes):", e);
    process.exit(1);
  }
}

function getDB() {
  if (!db) throw new Error("Database Recettes non initialisée");
  return db;
}

// Gestion propre de la fermeture
process.on('SIGINT', async () => {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  }
});

module.exports = { connectDB, getDB };