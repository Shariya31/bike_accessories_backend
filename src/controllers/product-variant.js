import { TryCatch } from "../middlewares/error.js";
import ErrorHandler from "../utils/utility-class.js";
import ProductModel from "../models/Product.js"
import { zSchema } from "../validations/zodSchema.js";
import { isValidObjectId } from "mongoose";
import MediaModel from "../models/Media.js"
import ProductVariantModel from "../models/ProductVariant.js";
import { formatZodError } from "../utils/helper.js";

export const createProductVariant = TryCatch(async (req, res, next) => {
    if (!req.body?.payload) {
        return next(new ErrorHandler("Payload is required", 400));
    }

    const validationSchema = zSchema.pick({
        product: true,
        sku: true,
        color: true,
        size: true,
        mrp: true,
        sellingPrice: true,
        discountPercentage: true,
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

    const { product, sku, color, size, mrp, sellingPrice, discountPercentage, description, media } = parsed.data

    const existingProductVariant = await ProductVariantModel.findOne({
        product,
        color,
        size
    });

    if (existingProductVariant) {
        return next(new ErrorHandler("Variant already exists", 409));
    }

    const existingSku = await ProductVariantModel.findOne({ sku });
    if (existingSku) {
        return next(new ErrorHandler("SKU already in use", 409));
    }

    const newProductVariant = await ProductVariantModel.create({
        product,
        sku,
        color,
        size,
        mrp,
        sellingPrice,
        discountPercentage,
        media,
    })

    res.status(201).json({
        success: true,
        message: 'Product Variant added successfully',
        newProductVariant
    })
})

export const getAllProductVariant = TryCatch(async (req, res, next) => {

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
            { color: { $regex: globalFilter, $options: 'i', } },
            { size: { $regex: globalFilter, $options: 'i', } },
            { sku: { $regex: globalFilter, $options: 'i', } },
            { "productData.name": { $regex: globalFilter, $options: 'i' } },
            {
                $expr: {
                    $regexMatch: {
                        input: { $toString: "$mrp" },
                        regex: globalFilter,
                        options: 'i'
                    }
                }
            },
            {
                $expr: {
                    $regexMatch: {
                        input: { $toString: "$sellingPrice" },
                        regex: globalFilter,
                        options: 'i'
                    }
                }
            },
            {
                $expr: {
                    $regexMatch: {
                        input: { $toString: "$discountPercentage" },
                        regex: globalFilter,
                        options: 'i'
                    }
                }
            },
        ]
    }

    // Column Filteration

    filters.forEach(filter => {
        if (filter.id === 'mrp' || filter.id === 'sellingPrice' || filter.id === 'discountPercentage') {
            matchQuery[filter.id] = Number(filter.value)
        } else if (filter.id === 'product') {
            matchQuery['productData.name'] = { $regex: filter.value, $options: 'i' }
        }
        else {
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
            $lookup: {
                from: 'products',
                localField: 'product',
                foreignField: '_id',
                as: 'productData'
            }
        },
        {
            $unwind: {
                path: "$productData", preserveNullAndEmptyArrays: true
            }
        },
        { $match: matchQuery },
        { $sort: Object.keys(sortQuery).length ? sortQuery : { createdAt: -1 } },
        { $skip: start },
        { $limit: size },
        {
            $project: {
                _id: 1,
                product: "$productData.name",
                color: 1,
                size: 1,
                sku: 1,
                mrp: 1,
                sellingPrice: 1,
                discountPercentage: 1,
                createdAt: 1,
                updatedAt: 1,
                deletedAt: 1
            }
        }
    ]

    // Execute query

    const getProductVariant = await ProductVariantModel.aggregate(aggregatePipeline)

    // Get total row count
    const totalRowCount = await ProductVariantModel.countDocuments(matchQuery)
    res.status(200).json({
        success: true,
        message: 'Variants fetched successfully',
        data: getProductVariant,
        meta: { totalRowCount }
    })
})

export const updateProductVariantStatus = TryCatch(async (req, res, next) => {

    const { payload } = req.body;

    const ids = payload?.ids || req.body.ids || [];
    const deleteType = payload?.deleteType || req.body.deleteType;

    if (!Array.isArray(ids) || ids.length === 0) {
        return next(new ErrorHandler('Invalid Or Empty id list', 400))
    }

    const product = await ProductVariantModel.find({ _id: { $in: ids } }).lean()

    if (!product.length) {
        return next(new ErrorHandler('No product Found', 404))
    }

    if (!['SD', 'RSD'].includes(deleteType)) {
        return next(new ErrorHandler('Invalid Delete Operation Deletetype should be SD or RSD', 400))
    }

    if (deleteType === 'SD') {
        await ProductVariantModel.updateMany({ _id: { $in: ids } }, { $set: { deletedAt: new Date().toISOString() } });
    } else {
        await ProductVariantModel.updateMany({ _id: { $in: ids } }, { $set: { deletedAt: null } });
    }

    res.status(200).json({
        success: true,
        message: 'Product Variant status updated successfully'
    })
})

export const deleteProductVariant = TryCatch(async (req, res, next) => {
    const { payload } = req.body;

    const ids = payload.ids || []
    const deleteType = payload.deleteType

    if (!Array.isArray(ids) || ids.length === 0) {
        return next(new ErrorHandler('Invalid Or Empty id list', 400))
    }

    const product = await ProductVariantModel.find({ _id: { $in: ids } }).lean()

    if (!product.length) {
        return next(new ErrorHandler('No product Found', 404))
    }

    if (deleteType !== 'PD') {
        return next(new ErrorHandler('Invalid Delete Operation Deletetype should be PD', 400))
    }

    await ProductVariantModel.deleteMany({ _id: { $in: ids } })


    res.status(200).json({
        success: true,
        message: 'Product Variant deleted successfully'
    })
})

export const getProductVariantById = TryCatch(async (req, res, next) => {

    const { id } = req.params

    if (!id || !isValidObjectId(id)) {
        return next(new ErrorHandler('Invalid Id', 400));
    }

    const filter = {
        deletedAt: null
    }

    filter._id = id;

    const getProductVariant = await ProductVariantModel.findOne(filter).populate('media', '_id secure_url').lean();

    if (!getProductVariant) {
        return next(new ErrorHandler('Product Variant Not Found', 404))
    }

    res.status(200).json({
        success: true,
        message: 'Product Variant Fetched',
        data: getProductVariant
    })
})

export const updateProductVariant = TryCatch(async (req, res, next) => {

    if (!req.body?.payload) {
        return next(new ErrorHandler("Payload is required", 400));
    }

    const validationSchema = zSchema.pick({
        _id: true,
        product: true,
        sku: true,
        color: true,
        size: true,
        mrp: true,
        sellingPrice: true,
        discountPercentage: true,
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

    const { _id, product, sku, color, size, mrp, sellingPrice, discountPercentage, media } = parsed.data

    const existingVariant = await ProductVariantModel.findOne({
        _id: { $ne: _id },
        deletedAt: null,
        product,
        size,
        color
    }).collation({ locale: 'en', strength: 2 });   // "Red" aur "red" ko same maanega

    if (existingVariant) {
        return next(new ErrorHandler("Variant with same size and color already exists", 409));
    }

    const existingSku = await ProductVariantModel.findOne({ _id: { $ne: _id }, sku });
    if (existingSku) {
        return next(new ErrorHandler("SKU already in use", 409));
    }

    const getProductVariant = await ProductVariantModel.findOne({ deletedAt: null, _id })

    if (!getProductVariant) {
        return next(new ErrorHandler('No Product Variant Found To Update', 404))
    }

    getProductVariant.product = product
    getProductVariant.sku = sku
    getProductVariant.color = color
    getProductVariant.size = size
    getProductVariant.mrp = mrp
    getProductVariant.sellingPrice = sellingPrice
    getProductVariant.discountPercentage = discountPercentage
    getProductVariant.media = media
    await getProductVariant.save();

    res.status(200).json({
        success: true,
        message: 'Product Variant Updated successfully',
    })
})

export const exportProductVariant = TryCatch(async (req, res, next) => {

    const filter = {
        deletedAt: null
    }

    const getProductVariant = await ProductVariantModel.find(filter).select('-media').sort({ createdAt: -1 }).lean()
    if (!getProductVariant) {
        throw next(new ErrorHandler('Product Variant Not Found', 404))
    }
    res.status(200).json({
        success: true,
        message: 'Product Variant Exported',
        data: getProductVariant
    })
})