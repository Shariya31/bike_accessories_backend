import ErrorHandler from "../utils/utility-class.js";

export const isAuthorized = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new ErrorHandler("Unauthorized", 401));
        }

        if (!allowedRoles.includes(req.user.role)) {
            return next(
                new ErrorHandler(
                    `Access denied. Role '${req.user.role}' is not allowed to access this resource`,
                    403
                )
            );
        }

        next();
    };
};