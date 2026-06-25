const Project = require('../../models/Project');
const { sendErrorResponse, sendSuccessResponse } = require('../../utils/common');

// Add a new project
exports.addProject = async (req, res) => {
  try {
    const {
      projectTitle,
      department,
      projectPriority,
      projectStartDate,
      projectEndDate,
      manager,
      teamMembers,
      workStatus,
      description,
      budget,
      clientContact,
      documents,
      isClientProject
    } = req.body;



    console.log(req.body, 'kkkkkkkkkkkkk')

    // Validate required fields
    if (
      !projectTitle ||
      !department ||
      !projectPriority ||
      !projectStartDate ||
      !manager ||
      !teamMembers ||
      !workStatus ||
      !description
    ) {
      return sendErrorResponse(res, 400, 'All required fields must be filled');
    }

    // Create a new project with all fields
    const newProject = new Project({
      projectTitle,
      department,
      projectPriority,
      projectStartDate,
      projectEndDate,
      manager,
      teamMembers,
      workStatus,
      description,
      budget,
      clientContact: {
        clientFullName: clientContact.clientFullName,
        email: clientContact.clientEmail,
        phone: clientContact.clientNumber,
        address: clientContact.clientAddress,
      },
      documents,
      isClientProject
    });

    // Save the project to the database
    const savedProject = await newProject.save();

    return sendSuccessResponse(res, 201, 'Project added successfully', savedProject);
  } catch (error) {
    return sendErrorResponse(res, 500, 'Server error', error);
  }
};

// Get all projects
exports.getProjects = async (req, res) => {
  try {
    console.log('Fetching projects...');
    // Fetch all projects from the database
    const projects = await Project.find(); // Populating team members for better readability

    return sendSuccessResponse(res, 200, 'Projects retrieved successfully', projects);
  } catch (error) {
    console.error('Error retrieving projects:', error);
    return sendErrorResponse(res, 500, 'Server error', error);
  }
};

// Edit project details
exports.editProject = async (req, res) => {
  try {
    const {
      projectTitle,
      department,
      projectPriority,
      projectStartDate,
      projectEndDate,
      manager,
      teamMembers,
      workStatus,
      description,
      budget,
      clientContact,
      documents,
      projectId,
      isClientProject
    } = req.body;

    // Validate required fields for update
    if (!projectId) {
      return sendErrorResponse(res, 400, 'Project ID is required');
    }

    // Prepare the update data based on the provided fields
    const updateData = {
      projectTitle,
      department,
      projectPriority,
      projectStartDate,
      projectEndDate,
      manager,
      teamMembers,
      workStatus,
      description,
      budget,
      clientContact: {
        clientFullName: clientContact.clientFullName,
        email: clientContact.clientEmail,
        phone: clientContact.clientNumber,
        address: clientContact.clientAddress,
      },
      documents,
      isClientProject
    };

    // Find the project by ID and update it with the new data
    const updatedProject = await Project.findByIdAndUpdate(projectId, updateData, {
      new: true, // Return the updated document
      runValidators: true, // Run schema validation on the update
    });

    if (!updatedProject) {
      return sendErrorResponse(res, 404, 'Project not found');
    }

    return sendSuccessResponse(res, 200, 'Project updated successfully', updatedProject);
  } catch (error) {
    console.error('Error updating project:', error);
    return sendErrorResponse(res, 500, 'Server error', error);
  }
};

// Delete project
exports.deleteProject = async (req, res) => {
  try {
    const { projectId } = req.body; // Get project ID from the request body

    // Validate required fields for deletion
    if (!projectId) {
      return sendErrorResponse(res, 400, 'Project ID is required');
    }

    // Find the project by ID and delete it
    const deletedProject = await Project.findByIdAndDelete(projectId);

    if (!deletedProject) {
      return sendErrorResponse(res, 404, 'Project not found');
    }

    return sendSuccessResponse(res, 200, 'Project deleted successfully');
  } catch (error) {
    console.error('Error deleting project:', error);
    return sendErrorResponse(res, 500, 'Server error', error);
  }
};


exports.getProjectById = async (req, res) => {
  try {
    const { projectId } = req.body; // Get project ID from the request query
    console.log('Fetching project by ID:', projectId);
    // Validate required fields for fetching project by ID
    if (!projectId) {
      return sendErrorResponse(res, 400, 'Project ID is required');
    }

    // Find the project by ID
    const project = await Project.findById(projectId);

    if (!project) {
      return sendErrorResponse(res, 404, 'Project not found');
    }

    return sendSuccessResponse(res, 200, 'Project retrieved successfully', project);
  } catch (error) {
    console.error('Error retrieving project:', error);
    return sendErrorResponse(res, 500, 'Server error', error);
  }
}



// get project whhic include the employee id
exports.getProjectByempId = async (req, res) => {
  try {
    const { empId } = req.body; // Get empId from the request body
    console.log('Fetching project by empId:', empId);

    // Validate required fields for fetching project by empId
    if (!empId) {
      return sendErrorResponse(res, 400, 'EmpId is required');
    }

    // Find projects where the teamMembers array contains an object with the given empId
    const projects = await Project.find({ 'teamMembers.empId': empId });

    // Check if any projects were found
    if (!projects || projects.length === 0) {
      return sendErrorResponse(res, 404, 'No projects found for the given empId');
    }

    // Send success response with the retrieved projects
    return sendSuccessResponse(res, 200, 'Projects retrieved successfully', projects);
  } catch (error) {
    console.error('Error retrieving projects:', error);
    return sendErrorResponse(res, 500, 'Server error', error);
  }
};
