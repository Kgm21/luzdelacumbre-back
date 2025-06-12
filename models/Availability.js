const { Schema, model } = require('mongoose');

const DisponibilidadSchema = Schema({
  roomId: {
    type: Schema.Types.ObjectId,
    ref: 'habitacion',
    required: [true, 'El ID de la habitación es obligatorio'],
  },
  date: {
    type: Date,
    required: [true, 'La fecha es obligatoria'],
  },
  isDisponibilidad: {
    type: Boolean,
    required: true,
    default: true,
  },
});

DisponibilidadSchema.index({ roomId: 1, date: 1 }, { unique: true });

module.exports = model('disponibilidad', DisponibilidadSchema);