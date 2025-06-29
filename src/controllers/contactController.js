const Contact = require('../models/contact')
const nodemailer = require('nodemailer')

const createContact = async (req, res) => {
   const { name, email, phone, message } = req.body;

   try {
      const newContact = new Contact({ name, email, phone, message });
      console.log(newContact)
      await newContact.save();

      

      
      res.status(201).json({ message: 'Mensaje guardado ' });
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