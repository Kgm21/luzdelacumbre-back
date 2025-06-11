const {Schema, model} = require('mongoose');

const UsuarioSchema = Schema({
    nombre: {type:String, required:[true, 'El nombre es obligatorio']},
    apellido: {type:String, required:[true, 'El apellido es obligatorio']},
    correo: {type: String, required:[true, 'El correo es obligatorio'], unique:true,match: [/^\S+@\S+\.\S+$/, 'El correo no es válido']},
    password:{type: String, required:[true, 'La contraseña es obligatoria']},
    img: {type: String},
    rol: {type: String, required: true,  enum: ['cliente', 'admin', 'recepcionista']},
    fechaRegistro: {type: Date, default: Date.now},
    estado: {type: Boolean, default: true}
});

module.exports = model('Usuario', UsuarioSchema);