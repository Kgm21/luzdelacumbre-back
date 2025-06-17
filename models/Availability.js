const { Schema, model } = require('mongoose');

const DisponibilidadSchema = new Schema({
  roomId: {
    type: Schema.Types.ObjectId,
    ref: 'Habitacion',
    required: [true, 'El ID de la habitación es obligatorio'],
  },
  date: {
    type: Date,
    required: [true, 'La fecha es obligatoria'],
  },
  isAvailable: {
    type: Boolean,
    required: true,
    default: true,
  },
});

DisponibilidadSchema.index({ roomId: 1, date: 1 }, { unique: true });

module.exports = model('Availability', DisponibilidadSchema, 'disponibilidad');
