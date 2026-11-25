import mongoose, { isValidObjectId } from "mongoose";
import { TryCatch } from "../middlewares/error.js";
import ErrorHandler from "../utils/utility-class.js";
import { zSchema } from "../validations/zodSchema.js";
import { formatZodError } from "../utils/helper.js";
import CouponModel from "../models/Coupon.js";

export const getAllCoupons = TryCatch(async (req, res, next) => {
    res.status(200).json({
        success: true,
        message: 'All Coupons Fetched'
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

    const existingCoupon = await CouponModel.findOne({code});

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

    const getCoupon = await CouponModel.findOne(filter).populate('media', '_id secure_url').lean();

    if (!getCoupon) {
        return next(new ErrorHandler('Coupon not found', 404))
    }

    res.status(200).json({
        success: true,
        message: 'Coupon Fetched',
        data: getCoupon
    })
})