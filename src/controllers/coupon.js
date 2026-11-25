import mongoose, { isValidObjectId } from "mongoose";
import { TryCatch } from "../middlewares/error.js";
import ErrorHandler from "../utils/utility-class.js";
import { zSchema } from "../validations/zodSchema.js";
import { formatZodError } from "../utils/helper.js";
import CouponModel from "../models/Coupon.js";

export const getAllCoupons = TryCatch(async (req, res, next) => {

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
            { code: { $regex: globalFilter, $options: 'i', } },
            {
                $expr: {
                    $regexMatch: {
                        input: { $toString: "$minShoppingAmount" },
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
        if (filter.id === 'minShoppingAmount' || filter.id === 'discountPercentage') {
            matchQuery[filter.id] = Number(filter.value)
        } else if (filter.id === 'validity') {
            matchQuery[filter.id] = new Date(filter.value)
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
        { $match: matchQuery },
        { $sort: Object.keys(sortQuery).length ? sortQuery : { createdAt: -1 } },
        { $skip: start },
        { $limit: size },
        {
            $project: {
                _id: 1,
                code: 1,
                minShoppingAmount: 1,
                discountPercentage: 1,
                validity: 1,
                category: "$categoryData.name",
                createdAt: 1,
                updatedAt: 1,
                deletedAt: 1
            }
        }
    ]

    // Execute query

    const getCoupon = await CouponModel.aggregate(aggregatePipeline)

    // Get total row count
    const totalRowCount = await CouponModel.countDocuments(matchQuery)
    res.status(200).json({
        success: true,
        message: 'Coupons fetched successfully',
        data: getCoupon,
        meta: { totalRowCount }
    })
})

export const createCoupon = TryCatch(async (req, res, next) => {
    if (!req.body?.payload) {
        return next(new ErrorHandler("Payload is required", 400));
    }

    const validationSchema = zSchema.pick({
        code: true,
        discountPercentage: true,
        minShoppingAmount: true,
        validity: true
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

    const { code, discountPercentage, minShoppingAmount, validity } = parsed.data

    const existingCoupon = await CouponModel.findOne({ code });

    if (existingCoupon) {
        return next(new ErrorHandler("Coupon already exists", 409));
    }

    const newCoupon = await CouponModel.create({
        code,
        discountPercentage,
        minShoppingAmount,
        validity

    })

    res.status(201).json({
        success: true,
        message: 'Coupon created successfully',
        newCoupon
    })
})

export const updateCoupon = TryCatch(async (req, res, next) => {

    if (!req.body?.payload) {
        return next(new ErrorHandler("Payload is required", 400));
    }

    const validationSchema = zSchema.pick({
        _id: true,
        code: true,
        discountPercentage: true,
        minShoppingAmount: true,
        validity: true
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

    const { _id, code, discountPercentage, minShoppingAmount, validity } = parsed.data

    const existingCoupon = await CouponModel.findOne({
        _id: { $ne: _id },
        deletedAt: null,
        code
    });

    if (existingCoupon) {
        return next(new ErrorHandler("Coupon already exists", 400));
    }

    const getCoupon = await CouponModel.findOne({ deletedAt: null, _id })

    if (!getCoupon) {
        return next(new ErrorHandler('No Coupon Found To Update', 404))
    }

    getCoupon.code = code
    getCoupon.discountPercentage = discountPercentage
    getCoupon.minShoppingAmount = minShoppingAmount
    getCoupon.validity = validity
    await getCoupon.save();

    res.status(200).json({
        success: true,
        message: 'Coupon Updated successfully',
    })
})

export const getCouponById = TryCatch(async (req, res, next) => {

    const { id } = req.params

    if (!id || !isValidObjectId(id)) {
        return next(new ErrorHandler('Invalid Id', 400));
    }

    const filter = {
        deletedAt: null
    }

    filter._id = id;

    const getCoupon = await CouponModel.findOne(filter).lean();

    if (!getCoupon) {
        return next(new ErrorHandler('Coupon not found', 404))
    }

    res.status(200).json({
        success: true,
        message: 'Coupon Fetched',
        data: getCoupon
    })
})

export const exportCoupon = TryCatch(async (req, res, next) => {

    const filter = {
        deletedAt: null
    }

    const getCoupon = await CouponModel.find(filter).sort({ createdAt: -1 }).lean()
    if (!getCoupon) {
        throw next(new ErrorHandler('Product Not Found', 404))
    }
    res.status(200).json({
        success: true,
        message: 'Coupons Exported',
        data: getCoupon
    })
})