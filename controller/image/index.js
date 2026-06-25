const Image = require('../../models/Image');
const { sendSuccessResponse, sendErrorResponse } = require('../../utils/common');

exports.uploadLogo = async (req, res) => {
    try {
        if (!req.file) {
            return sendErrorResponse(res, 400, 'Please upload an image');
        }

        const email = req.body.email;

        // Find the user by email
        let user = await Image.findOne({ email });

        if (!user) {
            // If the user does not exist, create a new user with the uploaded image
            user = new Image({
                email,
                images: [{
                    data: req.file.buffer,
                    contentType: req.file.mimetype,
                }],
            });
        } else {
            // If the user exists, add the new image to the user's images array
            Image.images.push({
                data: req.file.buffer,
                contentType: req.file.mimetype,
            });
        }

        // Save the user document with the new image
        await user.save();

        return sendSuccessResponse(res, 200, 'Image uploaded successfully');
    } catch (err) {
        return sendErrorResponse(res, 500, err.message);
    }
}
