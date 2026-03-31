import { TryCatch } from "../middlewares/error.js";
import cloudinary from "../utils/cloudinary.js";

export const cloudinarySignature = TryCatch(async (req, res, next) => {
    const payload = req.body
    const {paramsToSign} = payload

    const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_SECRET_KEY)
    res.status(201).json({
        success: true,
        message: "Success",
        signature: signature
    })
})