import { TryCatch } from "../middlewares/error.js";
import CategoryModel from "../models/Category.js";
import { formatZodError } from "../utils/helper.js";
import ErrorHandler from "../utils/utility-class.js";
import { zSchema } from "../validations/zodSchema.js";

export const createCategory = TryCatch(async (req, res, next) => {

    if (!req.body?.payload) {
        return next(new ErrorHandler("Payload is required", 400));
    }

    const validationSchema = zSchema.pick({
        name: true, slug: true
    })


    const parsed = validationSchema.safeParse(req.body.payload);

    if (!parsed.success) {
        return next(
            new ErrorHandler(
                "Validation failed",
                400,
                formatZodError(parsed.error)
            )
        )
    }

    const { name, slug } = parsed.data

     const existingCategory = await CategoryModel.findOne({
        $or: [{ name }, { slug }]
    });

    if (existingCategory) {
        return next(new ErrorHandler("Category already exists", 409));
    }

    const newCategory = await CategoryModel.create({
        name,
        slug
    })

    res.status(201).json({
        success: true,
        message: 'Category added successfully',
        newCategory
    })
})