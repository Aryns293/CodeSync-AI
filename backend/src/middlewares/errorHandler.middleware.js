export const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    if (statusCode >= 500) {
        console.error(err.stack);
    } else {
        console.warn(`${statusCode} ${req.method} ${req.url}: ${err.message}`);
    }

    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};
