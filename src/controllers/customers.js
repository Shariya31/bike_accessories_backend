import mongoose, { isValidObjectId } from "mongoose";
import { TryCatch } from "../middlewares/error.js";
import ErrorHandler from "../utils/utility-class.js";
import { zSchema } from "../validations/zodSchema.js";
import { formatZodError } from "../utils/helper.js";
import UserModel from "../models/Users.js";

export const getAllCustomers = TryCatch(async (req, res, next) => {

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
            { email: { $regex: globalFilter, $options: 'i', } },
            { phone: { $regex: globalFilter, $options: 'i', } },
            { address: { $regex: globalFilter, $options: 'i', } },
            { isEmailVerified: { $regex: globalFilter, $options: 'i', } },
            
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
                email: 1,
                phone: 1,
                address: 1,
                avatar: 1,
                isEmailVerified: 1,
                createdAt: 1,
                updatedAt: 1,
                deletedAt: 1
            }
        }
    ]

    // Execute query

    const getCustomers = await UserModel.aggregate(aggregatePipeline)

    // Get total row count
    const totalRowCount = await UserModel.countDocuments(matchQuery)
    res.status(200).json({
        success: true,
        message: 'Customers fetched successfully',
        data: getCustomers,
        meta: { totalRowCount }
    })
})

export const updateCustomersStatus = TryCatch(async (req, res, next) => {

    const { payload } = req.body;

    const ids = payload?.ids || req.body.ids || [];
    const deleteType = payload?.deleteType || req.body.deleteType;

    if (!Array.isArray(ids) || ids.length === 0) {
        return next(new ErrorHandler('Invalid Or Empty id list', 400))
    }

    const customers = await UserModel.find({ _id: { $in: ids } }).lean()

    if (!customers.length) {
        return next(new ErrorHandler('No Customer Found', 404))
    }

    if (!['SD', 'RSD'].includes(deleteType)) {
        return next(new ErrorHandler('Invalid Delete Operation Deletetype should be SD or RSD', 400))
    }

    if (deleteType === 'SD') {
        await UserModel.updateMany({ _id: { $in: ids } }, { $set: { deletedAt: new Date().toISOString() } });
    } else {
        await UserModel.updateMany({ _id: { $in: ids } }, { $set: { deletedAt: null } });
    }

    res.status(200).json({
        success: true,
        message: 'Customer status updated successfully'
    })
})

export const deleteCustomers = TryCatch(async (req, res, next) => {
    const { payload } = req.body;

    const ids = payload.ids || []
    const deleteType = payload.deleteType

    if (!Array.isArray(ids) || ids.length === 0) {
        return next(new ErrorHandler('Invalid Or Empty id list', 400))
    }

    const customers = await UserModel.find({ _id: { $in: ids } }).lean()

    if (!customers.length) {
        return next(new ErrorHandler('No Customer Found', 404))
    }

    if (deleteType !== 'PD') {
        return next(new ErrorHandler('Invalid Delete Operation Deletetype should be PD', 400))
    }

    await UserModel.deleteMany({ _id: { $in: ids } })


    res.status(200).json({
        success: true,
        message: 'Customer deleted successfully'
    })
})

export const exportCustomers = TryCatch(async (req, res, next) => {

    const filter = {
        deletedAt: null
    }

    const getCustomers = await UserModel.find(filter).sort({ createdAt: -1 }).lean()
    if (!getCustomers) {
        throw next(new ErrorHandler('Customer Not Found', 404))
    }
    res.status(200).json({
        success: true,
        message: 'Customers Exported',
        data: getCustomers
    })
})