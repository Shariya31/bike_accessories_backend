import { TryCatch } from "../middlewares/error.js";
import cloudinary from "../utils/cloudinary.js";

export const cloudinarySignature = TryCatch(async (req, res, next) => {
    const payload = req.body
    const { paramsToSign } = payload

    if (!paramsToSign || typeof paramsToSign !== "object") {
        return res.status(400).json({
            success: false,
            message: "Invalid paramsToSign"
        });
    }

    const { timestamp, upload_preset } = paramsToSign;

    // Validate required fields
    if (!timestamp) {
        return res.status(400).json({
            success: false,
            message: "Timestamp is required"
        });
    }

    // Prevent replay / stale signatures
    const currentTime = Math.floor(Date.now() / 1000);
    const allowedWindow = 60 * 5; // 5 minutes

    if (Math.abs(currentTime - Number(timestamp)) > allowedWindow) {
        return res.status(400).json({
            success: false,
            message: "Expired or invalid timestamp"
        });
    }


    const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_SECRET_KEY)
    
    res.status(200).json({
        success: true,
        message: "Signature generated successfully",
        signature,
        timestamp,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY
    })
})