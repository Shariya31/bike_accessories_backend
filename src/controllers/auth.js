import { TryCatch } from "../middlewares/error.js";
import { zSchema } from "../validations/zodSchema.js";
import ErrorHandler from "../utils/utility-class.js";
import { formatZodError } from "../utils/helper.js";
import UserModel from "../models/Users.js";
import { jwtVerify, SignJWT } from "jose";
import { sendEmail } from "../utils/sendEmail.js";
import { emailVerificationLink } from '../email/emailVerificationLink.js'

export const register = TryCatch(async (req, res, next) => {

    const validationSchema = zSchema.pick({
        name: true, email: true, password: true
    })
    const parsed = validationSchema.safeParse(req.body);

    if (!parsed.success) {
        return next(
            new ErrorHandler(
                "Validation failed",
                400,
                formatZodError(parsed.error)
            )
        )
    }

    const { name, email, password } = parsed.data

    const checkUser = await UserModel.exists({ email })

    if (checkUser) {
        return next(
            new ErrorHandler(
                "User Already Exists",
                400
            )
        )
    }

    const NewRegistration = await UserModel.create({
        name,
        email,
        password
    })

    const secret = new TextEncoder().encode(process.env.SECRET_KEY);

    const token = await new SignJWT({ userId: NewRegistration._id.toString()})
        .setIssuedAt()
        .setExpirationTime('1h')
        .setProtectedHeader({ alg: 'HS256' })
        .sign(secret)

    try {

        await sendEmail(`Email Verification From ${process.env.STORE_NAME}`, email, emailVerificationLink(`${process.env.PUBLIC_BASE_URL}/auth/verify-email/${token}`))

    } catch (error) {
        await UserModel.findByIdAndDelete(NewRegistration._id);
        throw new ErrorHandler("Failed to send verification email", 500);
    }
    res.status(201).json({
        success: true,
        message: "Registered Successfully || Please verify your email || If you didn't receive the emil please check if the email exists"
    })
})

export const verifyEmail = TryCatch(async (req, res, next) => {
    const { token } = req.body
    if (!token) {
        return next(new ErrorHandler("Token not found", 400))
    }
    const secret = new TextEncoder().encode(process.env.SECRET_KEY);
    const decoded = await jwtVerify(token, secret);

    const {userId} = decoded.payload
    const user = await UserModel.findById(userId)

    if(!user){
        return next(new ErrorHandler('User Not Found', 404))
    }

    user.isEmailVerified = true

    await user.save();

    res.status(200).json({
        success: true,
        message: "Email Verified Successfully"
    })
})

export const login = TryCatch(async (req, res, next) => {
    res.status(200).json({
        success: true,
        message: "Logged In"
    })
})

