import { TryCatch } from "../middlewares/error.js";
import ErrorHandler from "../utils/utility-class.js";
import ProductModel from "../models/Product.js"
import { zSchema } from "../validations/zodSchema.js";

export const createProduct = TryCatch(async (req, res, next) => {
    if (!req.body?.payload) {
        return next(new ErrorHandler("Payload is required", 400));
    }

    const validationSchema = zSchema.pick({
        name: true,
        slug: true,
        category: true,
        mrp: true,
        sellingPrice: true,
        discountPercentage: true,
        description: true,
        media: true
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

    const { name, slug, category, mrp, sellingPrice, discountPercentage, description, media } = parsed.data

    // const existingProduct = await ProductModel.findOne({
    //     $or: [{ name }, { slug }]
    // });

    // if (existingCategory) {
    //     return next(new ErrorHandler("Product already exists", 409));
    // }

    const newProduct = await ProductModel.create({
        name,
        slug,
        category,
        mrp,
        sellingPrice,
        discountPercentage,
        description,
        media,
    })

    res.status(201).json({
        success: true,
        message: 'Product added successfully',
        newProduct
    })
})