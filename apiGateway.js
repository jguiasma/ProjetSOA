const express = require('express');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { json } = require('body-parser');
const { addResolversToSchema } = require('@graphql-tools/schema');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const resolver = require('./resolver');
const taskSchemaPromise = require('./schema');
const { sendRecetteEvent } = require('./producer');
const { MongoClient } = require('mongodb'); // Ajoutez ceci avec les autres imports
const app = express();
app.use(json());

// Configuration gRPC
const RECETTE_SERVICE_URL = 'localhost:50051';
const UTILISATEUR_SERVICE_URL = 'localhost:50052';

// Chargement des protos
const recetteProtoPath = __dirname + '/recette.proto';
const utilisateurProtoPath = __dirname + '/utilisateur.proto';

const recettePackageDefinition = protoLoader.loadSync(recetteProtoPath);
const utilisateurPackageDefinition = protoLoader.loadSync(utilisateurProtoPath);

const recetteProto = grpc.loadPackageDefinition(recettePackageDefinition).RecetteService;
const utilisateurProto = grpc.loadPackageDefinition(utilisateurPackageDefinition).UtilisateurService;

// Clients gRPC
const recetteClient = new recetteProto(RECETTE_SERVICE_URL, grpc.credentials.createInsecure());
const utilisateurClient = new utilisateurProto(UTILISATEUR_SERVICE_URL, grpc.credentials.createInsecure());

// Ajoutez cette route pour consulter les événements
app.get('/recette-events', async (req, res) => {
  try {
    const client = new MongoClient('mongodb://localhost:27017', {
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000
    });
    await client.connect();
    const db = client.db('recette_events'); // Notez le nom corrigé
    const events = await db.collection('events') // Collection devrait être 'events'
      .find()
      .sort({ processedAt: -1 })
      .toArray();
    
    await client.close();
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= REST UTILISATEURS (avec gRPC) =================
app.get('/utilisateurs', (req, res) => {
  utilisateurClient.GetUtilisateurs({}, (err, response) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(response.utilisateurs);
    }
  });
});

app.get('/utilisateurs/:id', (req, res) => {
  utilisateurClient.GetUtilisateur({ id: req.params.id }, (err, response) => {
    if (err) {
      res.status(404).send('Utilisateur non trouvé');
    } else {
      res.json(response);
    }
  });
});

app.post('/utilisateurs', (req, res) => {
  const { nom, email } = req.body;
  utilisateurClient.CreateUtilisateur({ nom, email }, (err, response) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.status(201).json(response);
    }
  });
});

app.put('/utilisateurs/:id', (req, res) => {
  const { nom, email } = req.body;
  utilisateurClient.UpdateUtilisateur({ id: req.params.id, nom, email }, (err, response) => {
    if (err) {
      res.status(404).send('Utilisateur non trouvé');
    } else {
      res.json(response);
    }
  });
});

app.delete('/utilisateurs/:id', (req, res) => {
  utilisateurClient.DeleteUtilisateur({ id: req.params.id }, (err, response) => {
    if (err || !response.success) {
      res.status(404).send('Utilisateur non trouvé');
    } else {
      res.sendStatus(204);
    }
  });
});

// ================= REST RECETTES (avec gRPC) =================
app.get('/recettes', (req, res) => {
  recetteClient.GetRecettes({}, (err, response) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(response.recettes);
    }
  });
});

app.get('/recettes/:id', (req, res) => {
  recetteClient.GetRecette({ id: req.params.id }, (err, response) => {
    if (err) {
      res.status(404).send('Recette non trouvée');
    } else {
      res.json(response);
    }
  });
});
app.post('/recettes', async (req, res) => {
  const { titre, description, categorie } = req.body;

  try {
const client = new recetteProto('localhost:50051', grpc.credentials.createInsecure());
    
    client.CreateRecette({ titre, description, categorie }, async (err, response) => {
      if (err) {
        console.error('gRPC Error:', err);
        return res.status(500).json({ error: err.message });
      }
      
      // Envoi de l'événement Kafka via l'API Gateway aussi
      await sendRecetteEvent('RECETTE_CREATED_VIA_API', response);
      
      res.status(201).json(response);
    });
  } catch (err) {
    console.error('Error in /recettes POST:', err);
    res.status(500).json({ error: 'Erreur lors de la création' });
  }
});

app.put('/recettes/:id', (req, res) => {
  const { titre, description, categorie } = req.body;
  recetteClient.UpdateRecette({ 
    id: req.params.id, 
    titre, 
    description, 
    categorie 
  }, (err, response) => {
    if (err) {
      res.status(404).send('Recette non trouvée');
    } else {
      res.json(response);
    }
  });
});

app.delete('/recettes/:id', (req, res) => {
  recetteClient.DeleteRecette({ id: req.params.id }, (err, response) => {
    if (err || !response.success) {
      res.status(404).send('Recette non trouvée');
    } else {
      res.sendStatus(204);
    }
  });
});

// ================= GRAPHQL =================
async function setupGraphQLServer() {
  try {
    const schema = await taskSchemaPromise;
    const schemaWithResolvers = addResolversToSchema({
      schema: schema,
      resolvers: resolver(recetteClient, utilisateurClient) // Passer les clients gRPC aux resolvers
    });

    const server = new ApolloServer({ schema: schemaWithResolvers });
    await server.start();

    app.use('/graphql', json(), expressMiddleware(server));

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
  } catch (error) {
    console.error('Erreur serveur GraphQL:', error);
  }
}

setupGraphQLServer();