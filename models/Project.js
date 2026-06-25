const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    projectTitle: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      required: true,
    },
    projectPriority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      required: true,
    },
    projectStartDate: {
      type: Date,
      required: true,
    },
    projectEndDate: {
      type: Date,
      required: false,
    },
    manager: {
      type: [
        {
          empId: {
            type: String,
            ref: 'Admin',
            required: true,
          },
          role: {
            type: String,
            required: true,
          },
          name: {
            type: String,
            required: true,
          },
        }
      ],
      required: true,
    },
    teamMembers: {
      type: [
        {
          empId: {
            type: String,
            ref: 'User',
            required: true,
          },
          role: {
            type: String,
            required: true,
          },
          name: {
            type: String,
            required: true,
          },
        },
      ],
      required: true,
    },
    workStatus: {
      type: String,
      enum: ['Not Started', 'In Progress', 'Completed', 'On Hold', 'Cancelled'],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    budget: {
      type: Number,
      required: false,
      default: 0,
    },

    clientContact: {
      clientFullName: {
        type: String,
        required: false,
      },
      email: {
        type: String,
        required: false,
      },
      phone: {
        type: String,
        required: false,
      },
      address: {
        type: String,
        required: false,
      },
    },
    isClientProject: {
      type: Boolean,
      required: false
    },
    documents: {
      type: [
        {
          name: String,
          url: String,
          uploadedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

const Project = mongoose.model('Project', projectSchema);

module.exports = Project;
