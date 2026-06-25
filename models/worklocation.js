const mongoose = require('mongoose');


const isLatitude = (lat) => {
    return isFinite(lat) && Math.abs(lat) <= 90;
};

const isLongitude = (lng) => {
    return isFinite(lng) && Math.abs(lng) <= 180;
};

const WorkLocationSchema = new mongoose.Schema({
    empId:{
        type:String,
        required:true,
        unique:true
    },
    imageurl:{
        type:String,
        required:true
    },
    latitude: {
        type: String,
        required: true,
        validate: {
            validator: function(v) {
                return isLatitude(parseFloat(v));
            },
            message: props => `${props.value} is not a valid latitude!`
        }
    },
    longitude: {
        type: String,
        required: true,
        validate: {
            validator: function(v) {
                return isLongitude(parseFloat(v));
            },
            message: props => `${props.value} is not a valid longitude!`
        }
    }
});
const workLocation = mongoose.model('LocationProfile', WorkLocationSchema);
 
module.exports = workLocation;