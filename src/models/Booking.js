const { Schema, model } = require('mongoose');

const ReservaSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El ID del usuario es obligatorio'],
  },
  roomId: {
    type: Schema.Types.ObjectId,
    ref: 'Habitacion',
    required: [true, 'El ID de la habitación es obligatorio'],
  },
  checkInDate: {
    type: Date,
    required: [true, 'La fecha de entrada es obligatoria'],
  },
  checkOutDate: {
    type: Date,
    required: [true, 'La fecha de salida es obligatoria'],
    validate: {
      validator: function(value) {
        return value > this.checkInDate;
      },
      message: 'La fecha de salida debe ser posterior a la fecha de entrada',
    }
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
  passengersCount: {
    type: Number,
    required: [true, 'La cantidad de pasajeros es obligatoria'],
    min: [1, 'Debe haber al menos un pasajero'],
    max: [6,'la cantidad de pasjeros de menor o igual que seis']
  },
}, { timestamps: true });


ReservaSchema.index({ roomId: 1, checkInDate: 1, checkOutDate: 1 });
ReservaSchema.index({ userId: 1 });

module.exports = model('Reserva', ReservaSchema, 'reservas');
