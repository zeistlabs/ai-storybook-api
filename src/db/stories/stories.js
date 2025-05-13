const mongoose = require("mongoose");

const userSchema  = new mongoose.Schema({
    pdfId: String,       
    filePath: String, 
    createdAt: Date
})

module.exports = mongoose.model("StoryPDF", userSchema);