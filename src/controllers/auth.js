import { TryCatch } from "../middlewares/error.js";
import { zSchema } from "../validations/zodSchema.js";
import ErrorHandler from "../utils/utility-class.js";
import { formatZodError, generateOtp } from "../utils/helper.js";
import UserModel from "../models/Users.js";
import { jwtVerify, SignJWT } from "jose";
import { sendEmail } from "../utils/sendEmail.js";
import { emailVerificationLink } from '../email/emailVerificationLink.js'
import z from "zod";
import OTPModel from "../models/Otp.js";
import { otpEmail } from "../email/otpEmail.js";
import { OAuth2Client } from "google-auth-library";
import RefreshTokenModel from "../models/RefreshToken.js";

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

    const token = await new SignJWT({ userId: NewRegistration._id.toString() })
        .setIssuedAt()
        .setExpirationTime('1h')
        .setProtectedHeader({ alg: 'HS256' })
        .sign(secret)

    try {

        await sendEmail(`Email Verification From ${process.env.STORE_NAME}`, email, emailVerificationLink(`${process.env.PUBLIC_BASE_URL}/auth/verify-email/${token}`))

    } catch (error) {
        // await UserModel.findByIdAndDelete(NewRegistration._id);
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

    const { userId } = decoded.payload
    const user = await UserModel.findById(userId)

    if (!user) {
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

    const validationSchema = zSchema.pick({
        email: true,
    }).extend({
        password: z.string()
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

    const { email, password } = parsed.data

    const getUser = await UserModel.findOne({ deletedAt: null, email }).select("+password")

    if (!getUser) {
        return next(new ErrorHandler("Invalid Credentials", 404))
    }

    // resend email verification link

    if (!getUser.isEmailVerified) {
        const secret = new TextEncoder().encode(process.env.SECRET_KEY);

        const token = await new SignJWT({ userId: getUser._id.toString() })
            .setIssuedAt()
            .setExpirationTime('1h')
            .setProtectedHeader({ alg: 'HS256' })
            .sign(secret)

        try {

            await sendEmail(`Email Verification From ${process.env.STORE_NAME}`, email, emailVerificationLink(`${process.env.PUBLIC_BASE_URL}/auth/verify-email/${token}`))

        } catch (error) {
            // await UserModel.findByIdAndDelete(NewRegistration._id);
            throw new ErrorHandler("Failed to send verification email", 500);
        }

        return next(new ErrorHandler("Please verify your email first with the link sent to your registered email", 401))
    }

    const isPasswordVerified = await getUser.comparePassword(password)

    if (!isPasswordVerified) {
        return next(new ErrorHandler("Invalid Credentials", 400))
    }

    //delet old otps
    await OTPModel.deleteMany({ email });

    const otp = generateOtp();

    //storing otp into database

    const newOtpData = await OTPModel.create({
        email, otp, expiresAt: { $gt: Date.now() }
    })

    if (!newOtpData) {
        return next(new ErrorHandler('Error while creating OTP', 401))
    }

    const otpEmailStatus = await sendEmail('Your login verification code', email, otpEmail(otp))

    if (!otpEmailStatus.success) {
        return next(new ErrorHandler('Failed to send OTP', 400))
    }

    res.status(200).json({
        success: true,
        message: "Please verify your device"
    })
})

export const verifyOtp = TryCatch(async (req, res, next) => {

    const validationSchema = zSchema.pick({
        email: true, otp: true
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

    const { email, otp } = parsed.data

    const getOptData = await OTPModel.findOne({ email, otp })

    if (!getOptData) {
        return next(new ErrorHandler("Invalid Or Expired OTP", 404))
    }

    const getUser = await UserModel.findOne({ deletedAt: null, email }).lean()

    if (!getUser) {
        return next(new ErrorHandler("User not found", 404))
    }

    const loggedInUserData = {
        userId: getUser._id.toString(),
        role: getUser.role,
        name: getUser.name,
        avatar: getUser.avatar
    }

    const secret = new TextEncoder().encode(process.env.SECRET_KEY);

    const token = await new SignJWT(loggedInUserData)
        .setIssuedAt()
        .setExpirationTime('24h')
        .setProtectedHeader({ alg: 'HS256' })
        .sign(secret)

    res.cookie("access_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 24 * 60 * 60 * 1000
    })

    await getOptData.deleteOne()

    res.status(200).json({
        success: true,
        message: "Login success",
        data: loggedInUserData
    })
})

export const resendOtp = TryCatch(async (req, res, next) => {

    const validationSchema = zSchema.pick({
        email: true
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

    const { email } = parsed.data
    const getUser = await UserModel.findOne({ deletedAt: null, email })

    if (!getUser) {
        return next(new ErrorHandler("User Not Found", 404))
    }

    await OTPModel.deleteMany({ email });

    const otp = generateOtp()

    const newOtpData = new OTPModel({
        email,
        otp
    })

    await newOtpData.save()

    const otpEmailStatus = await sendEmail('Your login verification code', email, otpEmail(otp))

    if (!otpEmailStatus.success) {
        return next(new ErrorHandler('Failed to re-send OTP', 400))
    }

    res.status(200).json({
        success: true,
        message: "OTP re-send successfully"
    })
})

//Forgot Password

export const sendOtp = TryCatch(async (req, res, next) => {
    const validationSchema = zSchema.pick({
        email: true
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

    const { email } = parsed.data
    const getUser = await UserModel.findOne({ deletedAt: null, email })

    if (!getUser) {
        return next(new ErrorHandler("User Not Found", 404))
    }

    await OTPModel.deleteMany({ email });

    const otp = generateOtp()

    const newOtpData = new OTPModel({
        email,
        otp
    })

    await newOtpData.save()

    const otpEmailStatus = await sendEmail('Your reset password code', email, otpEmail(otp))

    if (!otpEmailStatus.success) {
        return next(new ErrorHandler('Failed to re-send OTP', 400))
    }

    res.status(200).json({
        success: true,
        message: "OTP send successfully"
    })
})


export const verifyResetOtp = TryCatch(async (req, res, next) => {
    const validationSchema = zSchema.pick({
        email: true, otp: true
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

    const { email, otp } = parsed.data

    const getOptData = await OTPModel.findOne({ email, otp })

    if (!getOptData) {
        return next(new ErrorHandler("Invalid Or Expired OTP", 404))
    }

    const getUser = await UserModel.findOne({ deletedAt: null, email }).lean()

    if (!getUser) {
        return next(new ErrorHandler("User not found", 404))
    }

    await getOptData.deleteOne()

    res.status(200).json({
        success: true,
        message: "OTP Verified",
    })
})

export const updatePassword = TryCatch(async (req, res, next) => {

    const validationSchema = zSchema.pick({
        email: true, password: true
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

    const { email, password } = parsed.data

    const getUser = await UserModel.findOne({ deletedAt: null, email }).select("+password")

    if (!getUser) {
        return next(new ErrorHandler("User not found", 404))
    }

    getUser.password = password

    await getUser.save();

    res.status(200).json({
        success: true,
        message: 'Password Updated Successfully'
    })
})

// Login in with google
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleAuth = TryCatch(async (req, res, next) => {
    const { credential } = req.body;

    if (!credential) {
        return next(new ErrorHandler("Google token missing", 400));
    }

    const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    // extra security validation
    if (!payload.email_verified) {
        return next(new ErrorHandler("Google email not verified", 401));
    }

    if (payload.iss !== "accounts.google.com" && payload.iss !== "https://accounts.google.com") {
        return next(new ErrorHandler("Invalid token issuer", 401));
    }

    const { email, name, picture, sub } = payload;

    let user = await UserModel.findOne({ email, deletedAt: null });

    if (!user) {
        // First time user (create account)
        user = await UserModel.create({
            name,
            email,
            avatar: {
                url: picture
            },
            googleId: sub,
            provider: "google",
            isEmailVerified: true
        });
    } else {
        // Existing user found
        if (!user.googleId) {
            // Link Google account to existing local account
            user.googleId = sub;
            user.provider = "google";
            user.isEmailVerified = true;

            if (!user.avatar?.url) {
                user.avatar = {
                    url: picture
                };
            }

            await user.save();
        }
    }

    const loggedInUserData = {
        userId: user._id.toString(),
        role: user.role,
        name: user.name,
        avatar: user.avatar
    };

    const secret = new TextEncoder().encode(process.env.SECRET_KEY);

    const token = await new SignJWT(loggedInUserData)
        .setIssuedAt()
        .setExpirationTime("15m")
        .setProtectedHeader({ alg: "HS256" })
        .sign(secret);

    // REFRESH TOKEN (long)
    const refreshToken = await new SignJWT({ userId: user._id.toString() })
        .setIssuedAt()
        .setExpirationTime("7d")
        .setProtectedHeader({ alg: "HS256" })
        .sign(secret);

    // store refresh token
    await RefreshTokenModel.create({
        userId: user._id,
        token: refreshToken,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
    });

    res.cookie("access_token", token, {
        httpOnly: true,
        // secure: process.env.NODE_ENV === "production",
        secure: true,
        // sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        sameSite: none,
        maxAge: 15 * 60 * 1000,
    });

    res.cookie("refresh_token", refreshToken, {
        httpOnly: true,
        // secure: process.env.NODE_ENV === "production",
        // sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        secure: true,
        sameSite: none,
        maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({
        success: true,
        message: "Login success",
        data: loggedInUserData,
    });
});

export const refreshAccessToken = TryCatch(async (req, res, next) => {

    const refreshToken = req.cookies.refresh_token;

    if (!refreshToken) {
        return next(new ErrorHandler("Refresh token missing", 401));
    }

    const secret = new TextEncoder().encode(process.env.SECRET_KEY);

    const decoded = await jwtVerify(refreshToken, secret);

    const storedToken = await RefreshTokenModel.findOne({
        token: refreshToken
    });

    if (!storedToken) {
        return next(new ErrorHandler("Invalid refresh token", 401));
    }

    const user = await UserModel.findById(decoded.payload.userId);

    if (!user) {
        return next(new ErrorHandler("User not found", 404));
    }

    const accessToken = await new SignJWT({
        userId: user._id.toString(),
        role: user.role,
        name: user.name,
        avatar: user.avatar
    })
        .setIssuedAt()
        .setExpirationTime("15m")
        .setProtectedHeader({ alg: "HS256" })
        .sign(secret);

    res.cookie("access_token", token, {
        httpOnly: true,
        // secure: process.env.NODE_ENV === "production",
        secure: true,
        // sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        sameSite: none,
        maxAge: 15 * 60 * 1000,
    });

    res.status(200).json({
        success: true
    });
});

export const logout = TryCatch(async (req, res) => {

    const refreshToken = req.cookies.refresh_token;

    if (refreshToken) {
        await RefreshTokenModel.deleteOne({ token: refreshToken });
    }
    res.clearCookie("access_token", {
        httpOnly: true,
        // sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        // secure: process.env.NODE_ENV === "production", // change to true in prod
        secure: true,        // 🔥 always true (even in dev for cross-origin)
        sameSite: "none",
    });

    res.clearCookie("refresh_token", {
        httpOnly: true,
        // sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        // secure: process.env.NODE_ENV === "production",
        secure: true,        // 🔥 always true (even in dev for cross-origin)
        sameSite: "none",
    });

    res.status(200).json({
        success: true,
        message: "Logged out"
    });
});

export const getMe = TryCatch(async (req, res, next) => {
    const userId = req.user._id || req.user.userId;

    if (!userId) {
        return next(new ErrorHandler("Invalid user payload", 401));
    }

    const user = await UserModel.findOne({
        _id: userId,
        deletedAt: null,
    }).lean();

    if (!user) {
        return next(new ErrorHandler("User not found", 404));
    }

    res.status(200).json({
        success: true,
        data: {
            _id: user._id,
            name: user.name,
            role: user.role,
            avatar: user.avatar,
            email: user.email,
        },
    });
});

