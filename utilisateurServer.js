const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { connectDB, getDB } = require('./utilisateur/db');

const PROTO_PATH = path.join(__dirname, 'utilisateur.proto');

// Chargement du fichier proto
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const utilisateurProto = grpc.loadPackageDefinition(packageDefinition).UtilisateurService;

// Implémentation des méthodes gRPC avec MongoDB
async function getUtilisateur(call, callback) {
  try {
    const db = getDB();
    const utilisateur = await db.collection('utilisateurs').findOne({ id: call.request.id });
    
    if (utilisateur) {
      callback(null, {
        id: utilisateur.id,
        nom: utilisateur.nom,
        email: utilisateur.email
      });
    } else {
      callback({
        code: grpc.status.NOT_FOUND,
        details: 'Utilisateur non trouvé'
      });
    }
  } catch (err) {
    callback({
      code: grpc.status.INTERNAL,
      details: 'Erreur serveur'
    });
  }
}

async function getUtilisateurs(call, callback) {
  try {
    const db = getDB();
    const utilisateurs = await db.collection('utilisateurs').find().toArray();
    
    callback(null, { 
      utilisateurs: utilisateurs.map(u => ({
        id: u.id,
        nom: u.nom,
        email: u.email
      }))
    });
  } catch (err) {
    callback({
      code: grpc.status.INTERNAL,
      details: 'Erreur serveur'
    });
  }
}

async function createUtilisateur(call, callback) {
  try {
    const db = getDB();
    const newUser = {
      id: require('crypto').randomBytes(4).toString('hex'), // ID plus sécurisé
      nom: call.request.nom,
      email: call.request.email,
      createdAt: new Date()
    };
    
    const result = await db.collection('utilisateurs').insertOne(newUser);
    
    if (result.acknowledged) {
      callback(null, {
        id: newUser.id,
        nom: newUser.nom,
        email: newUser.email
      });
    } else {
      throw new Error('Échec de la création');
    }
  } catch (err) {
    callback({
      code: grpc.status.INTERNAL,
      details: 'Erreur création utilisateur'
    });
  }
}

async function updateUtilisateur(call, callback) {
  try {
    const db = getDB();
    const { id, nom, email } = call.request;
    
    const updateData = {};
    if (nom) updateData.nom = nom;
    if (email) updateData.email = email;
    
    const result = await db.collection('utilisateurs').findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: 'after' }
    );
    
    if (result.value) {
      callback(null, {
        id: result.value.id,
        nom: result.value.nom,
        email: result.value.email
      });
    } else {
      callback({
        code: grpc.status.NOT_FOUND,
        details: 'Utilisateur non trouvé'
      });
    }
  } catch (err) {
    callback({
      code: grpc.status.INTERNAL,
      details: 'Erreur mise à jour'
    });
  }
}

async function deleteUtilisateur(call, callback) {
  try {
    const db = getDB();
    const result = await db.collection('utilisateurs').deleteOne({ id: call.request.id });
    
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

// Création et démarrage du serveur
async function main() {
  await connectDB();
  
  const server = new grpc.Server();
  
  server.addService(utilisateurProto.service, {
    GetUtilisateur: getUtilisateur,
    GetUtilisateurs: getUtilisateurs,
    CreateUtilisateur: createUtilisateur,
    UpdateUtilisateur: updateUtilisateur,
    DeleteUtilisateur: deleteUtilisateur
  });

  server.bindAsync(
    '0.0.0.0:50052',
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        console.error('Erreur de démarrage du serveur:', err);
        return;
      }
      server.start();
      console.log(`Serveur Utilisateur gRPC démarré sur le port ${port}`);
    }
  );
}

main();