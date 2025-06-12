const { Schema, model } = require('mongoose');

const ReservaSchema = Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El ID del usuario es obligatorio'],
  },
  roomId: {
    type: Schema.Types.ObjectId,
    ref: 'Room',
    required: [true, 'El ID de la habitación es obligatorio'],
  },
  checkInDate: {
    type: Date,
    required: [true, 'La fecha de entrada es obligatoria'],
  },
  checkOutDate: {
    type: Date,
    required: [true, 'La fecha de salida es obligatoria'],
  },
  totalPrice: {
    type: Number,
    required: [true, 'El precio total es obligatorio'],
    min: [0, 'El precio total no puede ser negativo'],
  },
  status: {
    type: String,
    required: true,
    enum: ['confirmed', 'cancelled', 'pending'],
    default: 'pending',
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

ReservaSchema.index({ roomId: 1, checkInDate: 1, checkOutDate: 1 });
ReservaSchema.index({ userId: 1 });

ReservaSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

ReservaSchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: Date.now() });
  next();
});

module.exports = model('reserva', ReservaSchema);