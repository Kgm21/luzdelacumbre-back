const { Schema, model } = require('mongoose');

const HabitacionSchema = Schema({
  roomNumber: {
    type: String,
    required: [true, 'El número de habitación es obligatorio'],
    unique: true,
    trim: true,
  },
  type: {
    type: String,
    required: [true, 'El tipo de habitación es obligatorio'],
    enum: {
      values: ['individual', 'doble', 'suite', 'familiar', 'deluxe'],
      message: 'Tipo de habitación no válido',
    },
  },
  price: {
    type: Number,
    required: [true, 'El precio es obligatorio'],
    min: [0, 'El precio no puede ser negativo'],
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  imageUrl: {
    type: String,
    trim: true,
    default: '',
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
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

module.exports = model('Habitacion', HabitacionSchema);