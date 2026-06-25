const mongoose = require('mongoose')

const URL = process.env.MONGO_URI 

const connect = async =()=>{
    mongoose.connect(URL).then((res)=>{
        if(res){
            console.log('connected')
        }
        else{
            console.log('connection to db faild')
        }
    }).catch((err)=>console.log(err))
}

module.exports = connect