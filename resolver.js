module.exports = function(recetteClient, utilisateurClient) {
  return {
    Query: {
      utilisateurs: () => {
        return new Promise((resolve, reject) => {
          utilisateurClient.GetUtilisateurs({}, (err, response) => {
            if (err) reject(err);
            else resolve(response.utilisateurs);
          });
        });
      },
      utilisateur: (_, { id }) => {
        return new Promise((resolve, reject) => {
          utilisateurClient.GetUtilisateur({ id }, (err, response) => {
            if (err) reject(err);
            else resolve(response);
          });
        });
      },
      recettes: () => {
        return new Promise((resolve, reject) => {
          recetteClient.GetRecettes({}, (err, response) => {
            if (err) reject(err);
            else resolve(response.recettes);
          });
        });
      },
      recette: (_, { id }) => {   
        return new Promise((resolve, reject) => {
          recetteClient.GetRecette({ id }, (err, response) => {
            if (err) reject(err);
            else resolve(response);
          });
        });
      },
      recettesParCategorie: (_, { categorie }) => {
        return new Promise((resolve, reject) => {
          recetteClient.GetRecettesParCategorie({ categorie }, (err, response) => {
            if (err) reject(err);
            else resolve(response.recettes);
          });
        });
      },
    },
    Mutation: {
      ajouterUtilisateur: (_, { nom, email }) => {
        return new Promise((resolve, reject) => {
          utilisateurClient.CreateUtilisateur({ nom, email }, (err, response) => {
            if (err) reject(err);
            else resolve(response);
          });
        });
      },

      ajouterRecette: (_, { titre, description, categorie, createurId }) => {
        return new Promise((resolve, reject) => {
          recetteClient.CreateRecette({ 
            titre, 
            description, 
            categorie,
            createurId  // Passer l'ID utilisateur
          }, (err, response) => {
            if (err) reject(err);
            else resolve(response);
          });
        });
      },

      supprimerRecette: (_, { id }) => {
        return new Promise((resolve, reject) => {
          recetteClient.DeleteRecette({ id }, (err, response) => {
            if (err) reject(err);
            else resolve(response.success);
          });
        });
      },

      supprimerUtilisateur: (_, { id }) => {
        return new Promise((resolve, reject) => {
          utilisateurClient.DeleteUtilisateur({ id }, (err, response) => {
            if (err) reject(err);
            else resolve(response.success);
          });
        });
      },

      modifierRecette: (_, { id, titre, description, categorie }) => {
        return new Promise((resolve, reject) => {
          recetteClient.UpdateRecette({ id, titre, description, categorie }, (err, response) => {
            if (err) reject(err);
            else resolve(response);
          });
        });
      },

      modifierUtilisateur: (_, { id, nom, email }) => {
        return new Promise((resolve, reject) => {
          utilisateurClient.UpdateUtilisateur({ id, nom, email }, (err, response) => {
            if (err) reject(err);
            else resolve(response);
          });
        });
      },
    },
  };
};
