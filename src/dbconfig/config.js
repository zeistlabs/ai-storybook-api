const mongoose = require('mongoose');

mongoose.set('debug', false);

const uri = `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@cluster0.rxfwwoo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

mongoose
	.connect(uri)
	.then(() => {
		console.log('Mongo Atlas Connected');
	})
	.catch((error) => {
		console.log('Atlas Connection error', error);
	});
