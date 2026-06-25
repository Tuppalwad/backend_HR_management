const mongoose = require('mongoose')

const clientSchema = new mongoose.Schema({
    cid:{
        type:String,
        required:true
    },
    name:{
        type:String,
        required:true
    },
    company_name:{
        type:String,
        required:true,
    },
    date:{
        type:Date,
        required:true
    },
    email:{
        type:String,
        required:true, 
    },
    mobile:{
        type:Number,
        required:true,
        match: /^\d{10}$/ 
    },
    billingMethod:{
        type:String,
        required:true,
    },
    status:{
        type:Boolean,
    },
    address:{
        type:String,
        required:true
    },
    
})

const client = mongoose.model('Client', clientSchema);

module.exports = client;