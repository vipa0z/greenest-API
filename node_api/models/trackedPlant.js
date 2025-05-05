// models/trackedPlant.js
const mongoose = require('mongoose');

const trackedPlantSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  plantName: {
    type: String,
    required: true
  },
  plantHealth: {
    type: String,
    required: false
  },
  plantHealth: {
    type: String,
    required: true
  },

  imagePath: {
    type: String,
    required: false
  },
  illnessHistory: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Scan'
  }],
 
}, {
  timestamps: true   // adds createdAt & updatedAt
});

// Optional index if you query by plant_name often
trackedPlantSchema.index({ plant_name: 1 });

module.exports = mongoose.model('TrackedPlant', trackedPlantSchema);
