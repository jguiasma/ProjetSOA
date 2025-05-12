const fs = require('fs');
const path = require('path');
const { buildSchema } = require('graphql');
const { promisify } = require('util');

const readFileAsync = promisify(fs.readFile);

async function getGatewaySchema() {
  const schemaPath = path.join(__dirname, 'schema.gql');
  try {
    const schemaString = await readFileAsync(schemaPath, { encoding: 'utf8' });
    return buildSchema(schemaString);
  } catch (error) {
    console.error('Erreur lors de la lecture du schéma GraphQL :', error);
    throw error;
  }
}

module.exports = getGatewaySchema();
