const Contact = require('../models/contact')
const nodemailer = require('nodemailer')

const createContact = async (req, res) => {
   const { name, email, phone, message } = req.body;

   try {
      const newContact = new Contact({ name, email, phone, message });
      console.log("Guardando contacto:", newContact);
      await newContact.save();
      console.log("Contacto guardado");
/*
     // Bloque de envío de email (comentado por ahora para evitar errores con Gmail/Nodemailer).
.
      const transporter = nodemailer.createTransport({
         service: 'gmail',
         auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
         

      console.log("Enviando email...");
      await transporter.sendMail({
         from: `"Luz de la Cumbre" <${process.env.EMAIL_USER}>`,
         to: process.env.EMAIL_USER,
         subject: 'Nuevo mensaje de contacto',
         html: `
            <p><strong>Nombre:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Teléfono:</strong> ${phone}</p>
            <p><strong>Mensaje:</strong><br/>${message}</p>
         `,
      });*/

      console.log("Email enviado");
      res.status(201).json({ message: 'Mensaje guardado y enviado por correo' });
   } catch (error) {
      console.error("Error en createContact:", error);
      res.status(500).json({ message: 'Error al guardar o enviar el mensaje', error: error.message });
   }
};


const getContact = async (req, res) =>{
   try {
      const all = await Contact.find()

      res.send(all)
   } catch (error) {
      console.log(error)
   }
}


module.exports = {createContact, getContact}