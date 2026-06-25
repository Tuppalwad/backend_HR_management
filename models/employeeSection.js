const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
    empId:{
        type:String,
        required:true,
        unique:true
    },
    jwtToken:{
        type:String,
        require:true
    },
},{timestamps:true})

const Empsection =  mongoose.model('EmpSection',sectionSchema);
module.exports = Empsection;