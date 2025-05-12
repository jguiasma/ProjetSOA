const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { connectDB, getDB } = require('./recette/db');
const { sendRecetteEvent } = require('./producer');

const PROTO_PATH = path.join(__dirname, 'recette.proto');
// Ajoutez au début du fichier
let producerInitialized = false;

async function ensureProducer() {
  if (!producerInitialized) {
    await sendRecetteEvent.connectProducer();
    producerInitialized = true;
  }
}
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const recetteProto = grpc.loadPackageDefinition(packageDefinition).RecetteService;

// Implémentation des méthodes gRPC avec MongoDB
async function getRecettes(call, callback) {
  try {
    const db = getDB();
    const recettes = await db.collection('recettes').find().toArray();
    callback(null, { recettes });
  } catch (err) {
    callback({
      code: grpc.status.INTERNAL,
      details: 'Erreur serveur'
    });
  }
}

async function getRecette(call, callback) {
  try {
    const db = getDB();
    const recette = await db.collection('recettes').findOne({ id: call.request.id });
    
    if (recette) {
      callback(null, recette);
    } else {
      callback({
        code: grpc.status.NOT_FOUND,
        details: 'Recette non trouvée'
      });
    }
  } catch (err) {
    callback({
      code: grpc.status.INTERNAL,
      details: 'Erreur serveur'
    });
  }
}

async function getRecettesParCategorie(call, callback) {
  try {
    const db = getDB();
    const recettes = await db.collection('recettes')
      .find({ categorie: call.request.categorie })
      .toArray();
    
    callback(null, { recettes });
  } catch (err) {
    callback({
      code: grpc.status.INTERNAL,
      details: 'Erreur serveur'
    });
  }
}

async function createRecette(call, callback) {
  try {
    const db = getDB();
    const newRecette = {
      id: require('crypto').randomBytes(4).toString('hex'),
      titre: call.request.titre,
      description: call.request.description,
      categorie: call.request.categorie,
      createdAt: new Date()
    };
    
    const result = await db.collection('recettes').insertOne(newRecette);
    if (result.acknowledged) {
            // Envoi événement Kafka
      await sendRecetteEvent('RECETTE_CREATED', newRecette);
      callback(null, newRecette);
    } else {
      throw new Error('Échec de la création');
    }
  } catch (err) {
    callback({
      code: grpc.status.INTERNAL,
      details: 'Erreur création recette'
    });
  }
}

async function updateRecette(call, callback) {
  try {
    const db = getDB();
    const { id, titre, description, categorie } = call.request;
    
    const updateData = {};
    if (titre) updateData.titre = titre;
    if (description) updateData.description = description;
    if (categorie) updateData.categorie = categorie;
    
    const result = await db.collection('recettes').findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: 'after' }
    );
    
    if (result.value) {
      callback(null, result.value);
    } else {
      callback({
        code: grpc.status.NOT_FOUND,
        details: 'Recette non trouvée'
      });
    }
  } catch (err) {
    callback({
      code: grpc.status.INTERNAL,
      details: 'Erreur mise à jour'
    });
  }
}

async function deleteRecette(call, callback) {
  try {
    const db = getDB();
    const result = await db.collection('recettes').deleteOne({ id: call.request.id });
    
    callback(null, { 
      success: result.deletedCount > 0 
    });
  } catch (err) {
    callback({
      code: grpc.status.INTERNAL,
      details: 'Erreur suppression'
    });
  }
}

async function main() {
  await connectDB();
  
  const server = new grpc.Server();
  server.addService(recetteProto.service, {
    GetRecette: getRecette,
    GetRecettes: getRecettes,
    GetRecettesParCategorie: getRecettesParCategorie,
    CreateRecette: createRecette,
    UpdateRecette: updateRecette,
    DeleteRecette: deleteRecette
  });
  
  server.bindAsync(
    '0.0.0.0:50051',
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        console.error('Erreur démarrage serveur:', err);
        return;
      }
      server.start();
      console.log(`Serveur Recette gRPC démarré sur le port ${port}`);
    }
  );
}

main();