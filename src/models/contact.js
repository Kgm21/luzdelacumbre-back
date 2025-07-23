const { Schema, model } = require('mongoose');

const ContactSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    message: { type: String, required: true },
    response: { type: String },
    status: { type: String, default: 'pending', enum: ['pending', 'responded'] },
  },
  { timestamps: true }
);

module.exports = model('Contact', ContactSchema);
