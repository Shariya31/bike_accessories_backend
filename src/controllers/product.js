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

    const existingProduct = await ProductModel.findOne({
        $or: [{ name }, { slug }]
    });

    if (existingProduct) {
        return next(new ErrorHandler("Product already exists", 409));
    }

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

export const getAllProduct = TryCatch(async (req, res, next) => {

    const query = req.query
    const start = parseInt(query.start || 0, 10)
    const size = parseInt(query.size || 10, 10);
    const filters = JSON.parse(query.filters || '[]');
    const globalFilter = query.globalFilter || "";
    const sorting = JSON.parse(query.sorting || '[]');
    const deleteType = query.deleteType

    // Build Match query
    let matchQuery = {}
    if (!['SD', 'PD'].includes(deleteType)) {
        return next(new ErrorHandler('Invalid deleteType', 400))
    }
    if (deleteType === 'SD') {
        matchQuery = { deletedAt: null }
    } else if (deleteType === 'PD') {
        matchQuery = { deletedAt: { $ne: null } }
    }

    // Global Search
    if (globalFilter) {
        matchQuery["$or"] = [
            { name: { $regex: globalFilter, $options: 'i', } },
            { slug: { $regex: globalFilter, $options: 'i', } },
            {"categoryData.name": {$regex: globalFilter, $options: 'i'}},
            {
                $expr: {
                    $regexMatch: {
                        input: {$toString: "$mrp"},
                        regex: globalFilter,
                        options: 'i'
                    }
                }
            },
            {
                $expr: {
                    $regexMatch: {
                        input: {$toString: "$sellingPrice"},
                        regex: globalFilter,
                        options: 'i'
                    }
                }
            },
            {
                $expr: {
                    $regexMatch: {
                        input: {$toString: "$discountPercentage"},
                        regex: globalFilter,
                        options: 'i'
                    }
                }
            },
        ]
    }

    // Column Filteration

    filters.forEach(filter => {
        if(filter.id === 'mrp' || filter.id === 'sellingPrice' || filter.id === 'discountPercentage'){
            matchQuery[filter.id] = Number(filter.value)
        }else{
            matchQuery[filter.id] = { $regex: filter.value, $options: 'i' }
        }
    })

    //Sorting

    let sortQuery = {}
    sorting.forEach(sort => {
        sortQuery[sort.id] = sort.desc ? -1 : 1
    });

    // Aggregation pipeline

    const aggregatePipeline = [
        {
            $lookup : {
                from: 'categories',
                localField: 'category',
                foreignField: '_id',
                as: 'categoryData'
            }
        },
        {
            $unwind: {
                path: "$categoryData", preserveNullAndEmptyArrays: true
            }
        },
        { $match: matchQuery },
        { $sort: Object.keys(sortQuery).length ? sortQuery : { createdAt: -1 } },
        { $skip: start },
        { $limit: size },
        {
            $project: {
                _id: 1,
                name: 1,
                slug: 1,
                mrp: 1,
                sellingPrice: 1,
                discountPercentage: 1,
                category: "$categoryData.name",
                createdAt: 1,
                updatedAt: 1,
                deletedAt: 1
            }
        }
    ]

    // Execute query

    const getProduct = await ProductModel.aggregate(aggregatePipeline)

    // Get total row count
    const totalRowCount = await ProductModel.countDocuments(matchQuery)
    res.status(200).json({
        success: true,
        message: 'Category fetched successfully',
        data: getProduct,
        meta: { totalRowCount }
    })
})

export const updateProductStatus = TryCatch(async(req, res, next) => {
     res.status(200).json({
        success: true,
        message: 'Product status updated successfully'
    })
})

export const deleteProduct = TryCatch(async(req, res, next) => {
     res.status(200).json({
        success: true,
        message: 'Product deleted successfully'
    })
})