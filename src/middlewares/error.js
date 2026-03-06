export const errorMiddleware = (err, req, res, next) => {
    err.message ||= "Internal Server Error"
    err.statusCode ||= 500

    if (err.name === "CastError") err.message = "Invalid ID"
    if (err.code === 11000) {
        err.message = "Email already exists"
        err.statusCode = 400
    }
    return res.status(err.statusCode).json({
        success: false,
        message: err.message,
        errors: err.details || null
    })
}

export const TryCatch = (func) => (req, res, next) => {
    return Promise.resolve(func(req, res, next)).catch(next);
}
