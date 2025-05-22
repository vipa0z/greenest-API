const mongoose = require('mongoose');

const ScanSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
  scanTime: {
    type: Date,
    default: Date.now
  },
  plantName: {
    type: String,
    required: true
  },
  plantHealth: {
    type: String,
    required: true
  },
  disease: {
    type: String,
    required: true
  }, 
  confidence:{
    type: Number,
    required:true,
  },
  remediations: {
    type: String,     // list of steps
    default: null,
    required:false,
  },
  imageMetadata: {
    imageUrl: { type: String, required: false },
    imageName: { type: String, required: false },
    imagePath: { type: String, required: false }
  }
});

ScanSchema.index({ user: 1, scanTime: -1 });

module.exports = mongoose.model('Scan', ScanSchema);