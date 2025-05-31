const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: process.env.EMAIL_USER,
		pass: process.env.EMAIL_PASS
	}
});

router.post('/', async (req, res) => {
	const { lastName, firstName, email, message } = req.body;

	const mailOptions = {
		from: email,
		to: process.env.EMAIL_USER,
		subject: 'Nouveau message depuis le formulaire de contact',
		html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px; background-color: #f9f9f9;">
            <h2 style="color: #333; text-align: center;">📩 Nouveau Message de Contact</h2>
            <p><strong>👤 Nom:</strong> ${lastName}</p>
            <p><strong>👤 Prénom:</strong> ${firstName}</p>
            <p><strong>📧 e-mail:</strong> <a href="mailto:${email}">${email}</a></p>
            <hr style="margin: 20px 0;">
            <p style="white-space: pre-line;"><strong>Message:</strong><br><div style="padding: 5px;">${message}</div></p>
          </div>
        `
	};

	try {
		await transporter.sendMail(mailOptions);
		res.status(200).json({ success: true, message: 'Email envoyé avec succès !' });
	} catch (error) {
		console.error('Erreur d’envoi :', error);
		res.status(500).json({ success: false, message: 'Échec de l’envoi de l’e-mail.' });
	}
});

module.exports = router;
