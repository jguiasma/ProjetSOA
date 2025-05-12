# Microservices de Gestion de Recettes Culinaires 🍳

## Architecture du Projet
┌──────────────────────┐    ┌──────────────────────┐
│      API Gateway     │    │   Service Recettes   │
│ (REST/GraphQL)       │◄──►│ (gRPC + Kafka)      │
└──────────┬───────────┘    └──────────┬───────────┘
           │                           │
           ▼                           ▼
┌──────────────────────┐    ┌──────────────────────┐
│  Service Utilisateurs│    │  Système d'Événements│
│      (gRPC)          │    │ (Kafka + MongoDB)    │
└──────────────────────┘    └──────────────────────┘

# Services Utilisés
API Gateway : Point d'entrée unique (port 5000)

Service Utilisateurs : gRPC (port 50052)

Service Recettes : gRPC (port 50051) + Kafka

Système d'Événements : Kafka + MongoDB
# Fonctionnement de Kafka avec MongoDB
1. Flux des Événements
  [Service Recettes] → [Producteur Kafka] → [Topic 'recette-events'] → [Consumer] → [MongoDB]
2. Implémentation Technique
## Instructions d'Exécution
Démarrer Zookeeper :

bin/zookeeper-server-start.sh config/zookeeper.properties
Démarrer Kafka :

bin/kafka-server-start.sh config/server.properties
Démarrer les Services (dans l'ordre) :

node utilisateurServer.js
node recetteServer.js
node consumer.js
node apiGateway.js
# Technologies Utilisées
Communication : gRPC, REST, GraphQL, Kafka
Base de Données : MongoDB (2 bases distinctes)
Langage : Node.js 
Outils : Protocol Buffers, Mongoose

# presentation
https://www.canva.com/design/DAGnNL9rYG8/QuT1Q8WbXkHtBt9--67YTQ/edit?utm_content=DAGnNL9rYG8&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton
