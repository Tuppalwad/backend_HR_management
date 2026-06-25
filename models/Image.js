const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
    data: Buffer,
    contentType: String,
});

const ImageSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    images: [imageSchema],
});

const Image = mongoose.model('Image', ImageSchema);

module.exports = Image;
