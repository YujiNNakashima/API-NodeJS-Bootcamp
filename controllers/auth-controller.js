const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const sendEmail = require('../utils/sendEmail')
const User = require('../models/User');
const crypto = require('crypto')

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = asyncHandler(async(req, res, next) => {
    const { name, email, password, role } = req.body;

    // create user
    const user = await User.create({
        name,
        email,
        password,
        role
    });

    // create token
    sendTokenResponse(user, 200, res)
})

// @desc    Login user
// @route   POST /api/v1/auth/register
// @access  Public
exports.login = asyncHandler(async(req, res, next) => {
    const { email, password } = req.body;

    //  validade email and password
    if(!email || !password) {
        return next(new ErrorResponse('Please provide an email and password', 400));
    }

    // check for user
    const user = await User.findOne({ email: email  }).select('+password')

    if(!user) {
        return next(new ErrorResponse('Invalid credentials', 401)); 
    }

    // check if password matches
    const isMatch = await user.matchPassword(password);

    if(!isMatch) {
        return next(new ErrorResponse('Invalid credentials', 401));
    }

    // create token
    sendTokenResponse(user, 200, res)
})

// get token from model and create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
    const token = user.getSignedJwtToken();

    const options = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
        httpOnly: true
    };

    if(process.env.NODE_ENV === 'production') {
        options.secure = true;
    }

    res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
        success: true,
        token
    });
} 

// @desc    Logout / clear cookie
// @route   POST /api/v1/auth/logout
// @access  private
exports.logout = asyncHandler(async(req, res, next) => {
   
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    })

    res.status(200).json({
        success: true,
        data: {}
    })

})


// @desc    GET current login user
// @route   POST /api/v1/auth/me
// @access  private
exports.getMe = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id);

    res.status(200).json({
        success: true,
        data: user
    })
});

// @desc    Update user details
// @route   PUT /api/v1/auth/updatedetails
// @access  private
exports.updateDetails = asyncHandler(async (req, res, next) => {

    const fieldsToUpdate = {
        name: req.body.name,
        email: req.body.email
    }

    const user = await User.findById(req.user.id, fieldsToUpdate, {
        new: true,
        runValidators: true
    });

    res.status(200).json({
        success: true,
        data: user
    })
});

// @desc    update password
// @route   PUT /api/v1/auth/updatepassword
// @access  private
exports.updatePassword = asyncHandler(async (req, res, next) => {
    const user = await (await User.findById(req.user.id)).isSelected('+password');

    if(!(await user.matchPassword(req.body.currentPassword))) {
        return next(new ErrorResponse('Password is incorrect', 401))
    }

    user.password = req.body.newPassword;
    await user.save();
    
    sendTokenResponse(user, 200, res);

    res.status(200).json({
        success: true,
        data: user
    })
});


// @desc    Forgot password
// @route   POST /api/v1/auth/forgotpassword
// @access  public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
    const user = await User.findOne({email: req.body.email});

    if(!user) {
        return next(new ErrorResponse('There is no user with that email', 404));
    }

    // get reset token
    const resetToken = user.getResetPasswordToken();

    // create reset url
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/auth/resetpassword/${resetToken}`

    const message = `Para recuperar sua senha, faça um PUT request em: \n\n ${resetURL}`;

    try {
        await sendEmail({
            email: user.email,
            subject: 'Password reset token',
            message
        })

        res.status(200).json({success: true, data: 'Email sent'});
    } catch (error) {
        console.log(error)
        user.resetPasswordToken = undefined;        
        user.resetPasswordExpire = undefined;        

        await user.save({validateBeforeSave: false});

        return next(new ErrorResponse('email count not be sent', 500))
    }

    await user.save({ validateBeforeSave: false });

    res.status(200).json({
        success: true,
        data: user
    })
});

// @desc    reset password
// @route   PUT /api/v1/auth/resetpassword/:resettoken
// @access  public
exports.resetPassword = asyncHandler(async (req, res, next) => {

    const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.resettoken)
    .digest('hex')

    const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() }
    });

    if(!user) {
        return next(new ErrorResponse('Invalid token', 400));
    }

    // set new password
    user.password = req.body.password;
    user.resetPasswordExpire = undefined;
    user.resetPasswordToken = undefined;
    await user.save();

    sendTokenResponse(user, 200, res);


});