const Contact = require('../models/contact')
const nodemailer = require('nodemailer')

const createContact = async (req, res) => {
   const { name, email, phone, message } = req.body;

   try {
      const newContact = new Contact({ name, email, phone, message });
      console.log(newContact)
      await newContact.save();

      // Enviar email
      const transporter = nodemailer.createTransport({
         service: 'gmail',
         auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
         },
      });

      await transporter.sendMail({
         from: `"Luz de la Cumbre" `,
         to: process.env.EMAIL_USER,
         subject: 'Nuevo mensaje de contacto',
         html: `
      <p><strong>Nombre:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Teléfono:</strong> ${phone}</p>
      <p><strong>Mensaje:</strong><br/>${message}</p>
      `,
      });

      res.status(201).json({ message: 'Mensaje guardado y enviado por correo' });
   } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error al guardar o enviar el mensaje' });
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