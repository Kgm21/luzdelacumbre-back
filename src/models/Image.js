const mongoose = require('mongoose');

const ImageSchema = new mongoose.Schema({
  folder: String,      
  filename: String,   
  src: String,         
  alt: String,       
});

module.exports = mongoose.model('Image', ImageSchema);
