const { Schema, model } = require('mongoose');

const UserSchema = Schema({
  name: {
    type: String,
    required: [true, 'El nombre es obligatorio'],
  },
  apellido: {
    type: String,
    required: [true, 'El apellido es obligatorio'],
  },
  email: {
    type: String,
    required: [true, 'El correo es obligatorio'],
    unique: true,
  },
  password: {
    type: String,
    required: [true, 'La contraseña es obligatoria'],
  },
  role: {
    type: String,
    required: true,
    enum: ['admin', 'client'],
    default: 'client',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

UserSchema.methods.toJSON = function () {
  const { __v, password, ...user } = this.toObject();
  return user;
};

module.exports = model('User', UserSchema);