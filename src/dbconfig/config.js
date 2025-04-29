const mongoose = require("mongoose");

mongoose.set('debug', false);

const uri = "mongodb+srv://mhashirbhattii:uEC5aAlUexaZcc7X@ai-story-book.jxbnogb.mongodb.net/ai-story-book?retryWrites=true&w=majority";

mongoose.connect(uri).then(() => {
    console.log("Mongo Atlas Connected");
}).catch((error) => {
    console.log("Atlas Connection error", error);
});
