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

export const getAllCategory = TryCatch(async (req, res, next) => {

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
        ]
    }

    // Column Filteration

    filters.forEach(filter => {
        matchQuery[filter.id] = { $regex: filter.value, $options: 'i' }
    })

    //Sorting

    let sortQuery = {}
    sorting.forEach(sort => {
        sortQuery[sort.id] = sort.desc ? -1 : 1
    });

    // Aggregation pipeline

    const aggregatePipeline = [
        { $match: matchQuery },
        { $sort: Object.keys(sortQuery).length ? sortQuery : { createdAt: -1 } },
        { $skip: start },
        { $limit: size },
        {
            $project: {
                _id: 1,
                name: 1,
                slug: 1,
                createdAt: 1,
                updatedAt: 1,
                deletedAt: 1
            }
        }
    ]

    // Execute query

    const getCategory = await CategoryModel.aggregate(aggregatePipeline)

    // Get total row count
    const totalRowCount = await CategoryModel.countDocuments(matchQuery)
    res.status(200).json({
        success: true,
        message: 'Category fetched successfully',
        data: getCategory,
        meta: { totalRowCount }
    })
})

export const updateCategoryStatus = TryCatch(async (req, res, next) => {

    const { payload } = req.body;

    const ids = payload?.ids || req.body.ids || [];
    const deleteType = payload?.deleteType || req.body.deleteType;

    if (!Array.isArray(ids) || ids.length === 0) {
        return next(new ErrorHandler('Invalid Or Empty id list', 400))
    }

    const category = await CategoryModel.find({ _id: { $in: ids } }).lean()

    if (!category.length) {
        return next(new ErrorHandler('No category Found', 404))
    }

    if (!['SD', 'RSD'].includes(deleteType)) {
        return next(new ErrorHandler('Invalid Delete Operation Deletetype should be SD or RSD', 400))
    }

    if (deleteType === 'SD') {
        await CategoryModel.updateMany({ _id: { $in: ids } }, { $set: { deletedAt: new Date().toISOString() } });
    } else {
        await CategoryModel.updateMany({ _id: { $in: ids } }, { $set: { deletedAt: null } });
    }

    res.status(200).json({
        success: true,
        message: 'Category status updated successfully'
    })
})

export const deleteCategory = TryCatch(async (req, res, next) => {

    const { payload } = req.body;

    const ids = payload.ids || []
    const deleteType = payload.deleteType

    if (!Array.isArray(ids) || ids.length === 0) {
        return next(new ErrorHandler('Invalid Or Empty id list', 400))
    }

    const category = await CategoryModel.find({ _id: { $in: ids } }).lean()

    if (!category.length) {
        return next(new ErrorHandler('No category Found', 404))
    }

    if (deleteType !== 'PD') {
        return next(new ErrorHandler('Invalid Delete Operation Deletetype should be PD', 400))
    }

    await CategoryModel.deleteMany({ _id: { $in: ids } })


    res.status(200).json({
        success: true,
        message: 'Category deleted successfully'
    })
})