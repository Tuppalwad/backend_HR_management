const prisma = require('../../utils/prismaClient');
const { sendSuccessResponse, sendErrorResponse } = require('../../../utils/common');

exports.uploadLogo = async (req, res) => {
    try {
        if (!req.file) {
            return sendErrorResponse(res, 400, 'Please upload an image');
        }

        const email = req.body.email;

        // Original had a real bug on the "user already exists" path: it called
        // `Image.images.push(...)` — pushing onto the *model class* rather than the fetched
        // document (`user.images`). `Image.images` is undefined, so that threw a TypeError and
        // returned a 500 for every upload after an email's first one. The relational schema
        // stores one row per photo anyway, so both paths are the same insert here and the bug
        // has nowhere to live.
        await prisma.employeePhoto.create({
            data: {
                email,
                data: req.file.buffer,
                contentType: req.file.mimetype
            }
        });

        return sendSuccessResponse(res, 200, 'Image uploaded successfully');
    } catch (err) {
        return sendErrorResponse(res, 500, err.message);
    }
};
