const prisma = require('../../utils/prismaClient');
const { toPrismaEnum, fromPrismaEnum } = require('../../utils/enumMap');
const { toDate } = require('../../utils/dateHelper');
const { num } = require('../../utils/serialize');
const { sendErrorResponse, sendSuccessResponse } = require('../../../utils/common');

// manager[], teamMembers[], documents[] and the clientContact sub-object were all embedded in
// the Mongo document; they're child tables / flat columns now. This rebuilds the original
// nested response shape so clients see exactly what they saw before. `_id` is emitted alongside
// `id` because the original returned raw Mongo documents and the frontend reads `_id` from them.
const toProjectResponse = (project) => {
    if (!project) return project;
    const { managers, teamMembers, documents, clientFullName, clientEmail, clientPhone, clientAddress, ...rest } = project;
    return {
        ...rest,
        _id: project.id,
        workStatus: fromPrismaEnum('workStatus', project.workStatus),
        budget: num(project.budget),
        manager: (managers || []).map(m => ({ empId: m.empId, role: m.role, name: m.name, _id: m.id })),
        teamMembers: (teamMembers || []).map(m => ({ empId: m.empId, role: m.role, name: m.name, _id: m.id })),
        documents: (documents || []).map(d => ({ name: d.name, url: d.url, uploadedAt: d.uploadedAt, _id: d.id })),
        clientContact: {
            clientFullName: clientFullName,
            email: clientEmail,
            phone: clientPhone,
            address: clientAddress
        }
    };
};

const projectInclude = { managers: true, teamMembers: true, documents: true };

// Add a new project
exports.addProject = async (req, res) => {
  try {
    const {
      projectTitle, department, projectPriority, projectStartDate, projectEndDate,
      manager, teamMembers, workStatus, description, budget, clientContact, documents, isClientProject
    } = req.body;

    if (
      !projectTitle || !department || !projectPriority || !projectStartDate ||
      !manager || !teamMembers || !workStatus || !description
    ) {
      return sendErrorResponse(res, 400, 'All required fields must be filled');
    }

    // Original read clientContact.clientFullName straight off the body without a guard, while
    // its own validation above never required clientContact — so omitting it (which the schema
    // permits, every client field is optional) threw a TypeError and returned a 500. Optional
    // chaining here so the documented-optional field is actually optional.
    const savedProject = await prisma.project.create({
      data: {
        projectTitle,
        department,
        projectPriority,
        projectStartDate: toDate(projectStartDate),
        projectEndDate: toDate(projectEndDate),
        workStatus: toPrismaEnum('workStatus', workStatus),
        description,
        budget: budget != null ? budget : 0,
        clientFullName: clientContact?.clientFullName || null,
        clientEmail: clientContact?.clientEmail || null,
        clientPhone: clientContact?.clientNumber || null,
        clientAddress: clientContact?.clientAddress || null,
        isClientProject: isClientProject !== undefined ? isClientProject : null,
        managers: { create: (manager || []).map(m => ({ empId: m.empId, role: m.role, name: m.name })) },
        teamMembers: { create: (teamMembers || []).map(m => ({ empId: m.empId, role: m.role, name: m.name })) },
        documents: { create: (documents || []).map(d => ({ name: d.name || null, url: d.url || null, uploadedAt: toDate(d.uploadedAt) || undefined })) }
      },
      include: projectInclude
    });

    return sendSuccessResponse(res, 201, 'Project added successfully', toProjectResponse(savedProject));
  } catch (error) {
    console.error('Error adding project:', error);
    return sendErrorResponse(res, 500, 'Server error', error);
  }
};

// Get all projects
exports.getProjects = async (req, res) => {
  try {
    const projects = await prisma.project.findMany({ include: projectInclude });

    return sendSuccessResponse(res, 200, 'Projects retrieved successfully', projects.map(toProjectResponse));
  } catch (error) {
    console.error('Error retrieving projects:', error);
    return sendErrorResponse(res, 500, 'Server error', error);
  }
};

// Edit project details
exports.editProject = async (req, res) => {
  try {
    const {
      projectTitle, department, projectPriority, projectStartDate, projectEndDate,
      manager, teamMembers, workStatus, description, budget, clientContact, documents,
      projectId, isClientProject
    } = req.body;

    if (!projectId) {
      return sendErrorResponse(res, 400, 'Project ID is required');
    }

    const existing = await prisma.project.findUnique({ where: { id: Number(projectId) } });
    if (!existing) {
      return sendErrorResponse(res, 404, 'Project not found');
    }

    // Mongoose strips undefined keys out of an update object, so omitting a field left it
    // unchanged. Prisma treats undefined the same way, so plain pass-through preserves the
    // original semantics for every scalar below.
    const updateData = {
      projectTitle,
      department,
      projectPriority,
      projectStartDate: projectStartDate ? toDate(projectStartDate) : undefined,
      projectEndDate: projectEndDate ? toDate(projectEndDate) : undefined,
      workStatus: workStatus ? toPrismaEnum('workStatus', workStatus) : undefined,
      description,
      budget,
      isClientProject
    };

    // Same missing guard as addProject — only touch the client columns when the caller
    // actually sent clientContact.
    if (clientContact) {
      updateData.clientFullName = clientContact.clientFullName || null;
      updateData.clientEmail = clientContact.clientEmail || null;
      updateData.clientPhone = clientContact.clientNumber || null;
      updateData.clientAddress = clientContact.clientAddress || null;
    }

    // Assigning an array in Mongoose replaced the whole embedded array; replicated here as
    // delete-then-recreate, and only when the caller actually supplied that array.
    if (manager) {
      updateData.managers = { deleteMany: {}, create: manager.map(m => ({ empId: m.empId, role: m.role, name: m.name })) };
    }
    if (teamMembers) {
      updateData.teamMembers = { deleteMany: {}, create: teamMembers.map(m => ({ empId: m.empId, role: m.role, name: m.name })) };
    }
    if (documents) {
      updateData.documents = { deleteMany: {}, create: documents.map(d => ({ name: d.name || null, url: d.url || null, uploadedAt: toDate(d.uploadedAt) || undefined })) };
    }

    const updatedProject = await prisma.project.update({
      where: { id: Number(projectId) },
      data: updateData,
      include: projectInclude
    });

    return sendSuccessResponse(res, 200, 'Project updated successfully', toProjectResponse(updatedProject));
  } catch (error) {
    console.error('Error updating project:', error);
    return sendErrorResponse(res, 500, 'Server error', error);
  }
};

// Delete project
exports.deleteProject = async (req, res) => {
  try {
    const { projectId } = req.body;

    if (!projectId) {
      return sendErrorResponse(res, 400, 'Project ID is required');
    }

    const existing = await prisma.project.findUnique({ where: { id: Number(projectId) } });

    if (!existing) {
      return sendErrorResponse(res, 404, 'Project not found');
    }

    // managers / teamMembers / documents rows go with it via onDelete: Cascade, matching how
    // deleting the Mongo document took its embedded arrays with it.
    await prisma.project.delete({ where: { id: Number(projectId) } });

    return sendSuccessResponse(res, 200, 'Project deleted successfully');
  } catch (error) {
    console.error('Error deleting project:', error);
    return sendErrorResponse(res, 500, 'Server error', error);
  }
};

exports.getProjectById = async (req, res) => {
  try {
    const { projectId } = req.body;

    if (!projectId) {
      return sendErrorResponse(res, 400, 'Project ID is required');
    }

    const project = await prisma.project.findUnique({ where: { id: Number(projectId) }, include: projectInclude });

    if (!project) {
      return sendErrorResponse(res, 404, 'Project not found');
    }

    return sendSuccessResponse(res, 200, 'Project retrieved successfully', toProjectResponse(project));
  } catch (error) {
    console.error('Error retrieving project:', error);
    return sendErrorResponse(res, 500, 'Server error', error);
  }
}

// get projects which include the employee id
exports.getProjectByempId = async (req, res) => {
  try {
    const { empId } = req.body;

    if (!empId) {
      return sendErrorResponse(res, 400, 'EmpId is required');
    }

    const projects = await prisma.project.findMany({
      where: { teamMembers: { some: { empId } } },
      include: projectInclude
    });

    if (!projects || projects.length === 0) {
      return sendErrorResponse(res, 404, 'No projects found for the given empId');
    }

    return sendSuccessResponse(res, 200, 'Projects retrieved successfully', projects.map(toProjectResponse));
  } catch (error) {
    console.error('Error retrieving projects:', error);
    return sendErrorResponse(res, 500, 'Server error', error);
  }
};
