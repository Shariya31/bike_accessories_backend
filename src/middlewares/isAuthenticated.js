import { jwtVerify } from "jose";
import ErrorHandler from "../utils/utility-class.js";

export const isAuthenticated = async (req, res, next) => {
    const token = req.cookies.access_token;

    if (!token) {
        return next(new ErrorHandler("Not authenticated", 401));
    }

    try {
        const secret = new TextEncoder().encode(process.env.SECRET_KEY);
        const decoded = await jwtVerify(token, secret);

        // 🔥 normalize here
        req.user = {
            _id: decoded.payload.userId,
            role: decoded.payload.role,
            name: decoded.payload.name,
            avatar: decoded.payload.avatar,
        };

        next();
    } catch (err) {
        return next(new ErrorHandler("Invalid token", 401));
    }
};