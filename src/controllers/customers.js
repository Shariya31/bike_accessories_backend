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
        message: 'Coupons fetched successfully',
        data: getCustomers,
        meta: { totalRowCount }
    })
})