const mongoose = require('mongoose');

const recetteEventSchema = new mongoose.Schema({
  eventType: { type: String, required: true },
  recette: { type: Object, required: true },
  timestamp: { type: Date, required: true },
  processedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('RecetteEvent', recetteEventSchema);