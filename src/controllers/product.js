import { TryCatch } from "../middlewares/error.js";
import ErrorHandler from "../utils/utility-class.js";

export const createProduct = TryCatch(async(req, res, next) => {


    res.status(201).json({
        success: true,
        message: 'Product created successfully'
    })
})