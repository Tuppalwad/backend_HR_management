const mongoose = require('mongoose');
const { ASSET_CATEGORIES, ASSET_STATUS, CONDITIONS } = require('../constant/assetEnums');

const assignmentRecordSchema = new mongoose.Schema({
    empId: {
        type: String,
        required: true
    },
    empName: {
        type: String,
        required: true
    },
    assignedDate: {
        type: Date,
        required: true
    },
    returnDate: {
        type: Date
    },
    conditionAtAssign: {
        type: String,
        enum: CONDITIONS,
        required: true
    },
    conditionAtReturn: {
        type: String,
        enum: CONDITIONS
    },
    remarks: {
        type: String
    },
    assignedBy: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Active', 'Returned'],
        default: 'Active'
    }
});

const maintenanceRecordSchema = new mongoose.Schema({
    issueReported: {
        type: String,
        required: true
    },
    reportedDate: {
        type: Date,
        required: true
    },
    resolvedDate: {
        type: Date
    },
    vendor: {
        type: String
    },
    cost: {
        type: Number
    },
    status: {
        type: String,
        enum: ['Pending', 'InProgress', 'Resolved'],
        default: 'Pending'
    },
    remarks: {
        type: String
    }
});

const assetSchema = new mongoose.Schema({
    assetId: {
        type: String,
        required: true,
        unique: true
    },
    category: {
        type: String,
        enum: ASSET_CATEGORIES,
        required: true
    },
    brand: {
        type: String,
        required: true
    },
    modelName: {
        type: String,
        required: true
    },
    serialNumber: {
        type: String,
        unique: true,
        sparse: true
    },
    specifications: {
        type: String
    },
    purchaseDate: {
        type: Date,
        required: true
    },
    purchaseCost: {
        type: Number
    },
    vendor: {
        type: String
    },
    warrantyExpiryDate: {
        type: Date
    },
    condition: {
        type: String,
        enum: CONDITIONS,
        default: 'New'
    },
    status: {
        type: String,
        enum: ASSET_STATUS,
        default: 'Available'
    },
    currentAssignee: {
        empId: { type: String },
        empName: { type: String },
        assignedDate: { type: Date }
    },
    locationType: {
        type: String,
        enum: ['Office', 'WFH', 'Warehouse'],
        default: 'Warehouse'
    },
    currentLocation: {
        type: String
    },
    documents: {
        type: [
            {
                name: String,
                url: String,
                uploadedAt: {
                    type: Date,
                    default: Date.now
                }
            }
        ],
        required: false
    },
    assignmentHistory: [assignmentRecordSchema],
    maintenanceHistory: [maintenanceRecordSchema],
    notes: {
        type: String
    }
}, { timestamps: true });

const Asset = mongoose.model('Asset', assetSchema);

module.exports = Asset;
