const ErrorResponse = require('../utils/errorResponse');

const errorHandler = (err, req, res, next) => {

    let error = { ...err }

    error.message = err.message;

    // log to console for dev
    console.log(err.stack.red);

    // mongoose bad ObjectId
    if(err.name === 'CastError') {
        const message=  `Resource not found with ${err.value}`;
        error = new ErrorResponse(message, 404);
    }

    if(err.code === 11000) {
        const message=  `Duplicate field value entereed`;
        error = new ErrorResponse(message, 400);
    }

    if(err.name === 'ValidationError') {
        const message=  Object.values(err.errors).map(val => val.message);
        error = new ErrorResponse(message, 400);
    }

    res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || 'Server Error'
    })
}

module.exports = errorHandler;