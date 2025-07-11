const { Schema, model } = require('mongoose');

const HabitacionSchema = Schema({
  roomNumber: { type: String, required: true, unique: true, trim: true },
  type: {
    type: String,
    default: 'cabaña',
    immutable: true // evita que se modifique
  },
  price: { type: Number, required: true, min: 0 },
  description: { type: String, trim: true, default: '' },
  capacity: {
    type: Number,
    required: [true, 'La capacidad es obligatoria'],
    min: [1, 'La capacidad mínima es 1'],
  },
  imageUrls: [{ type: String }],
  isAvailable: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

HabitacionSchema.index({ type: 1 });

HabitacionSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

HabitacionSchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: Date.now() });
  next();
});

module.exports = model('Habitacion', HabitacionSchema, 'habitacions');