const section = require('../../models/section')
const { sendErrorResponse, sendSuccessResponse } = require('../../utils/common')

exports.logout = async(req,res)=>{
    try {
        const token = res.body;
        const removeitem = await section.findOne({token})
        if(!removeitem){
            return sendErrorResponse(res,400,"Section not found");
        }
        await section.deleteOne({token});
        
        return sendSuccessResponse(res,200,'User Logout successfully')
    } catch (error) {
        return sendErrorResponse(res,500,"Something went wrong",error);
    }
}