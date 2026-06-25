const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
    email:{
        type:String,
        required:true,
        unique:true
    },
    jwtToken:{
        type:String,
        require:true
    },
    expiredDate:{
        type: Date,
        require:true
    }
},{timestamps:true})

const section =  mongoose.model('Sections',sectionSchema);
module.exports = section;