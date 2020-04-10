const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const Course = require('../models/Course');
const Bootcamp = require('../models/Bootcamp');


// @desc    Get all courses
// @route   GET /api/v1/courses
// @route   GET /api/v1/bootcamps/:bootcampId/courses
// @access  Public
exports.getCourses = asyncHandler(async (req, res, next) => {
    // advanced queries; select, sort, pagination.
    let query;
    let reqQuery = { ...req.query };
    let removeFields = ['select', 'sort', 'pagination', 'limit', 'page'];

    removeFields.forEach(param => delete reqQuery[param]);

    // create queryString
    let queryStr = JSON.stringify(reqQuery)

    // example: Course.find({key: ${lte: 20}})
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`)

    if (req.params.bootcampId) {
        query = Course.find({ bootcamp: req.params.bootcampId });
    } else {
        query = Course.find(JSON.parse(queryStr)).populate({
            path: 'bootcamp',
            select: 'name description'
        })
    }

    if (req.params.select) {
        const fields = req.params.select.split(',').join(' ');
        query = query.select(fields);
    }

    if (req.params.sort) {
        const sortBy = req.query.sort.split(',').join(' ');
        query = query.sort(sortBy);
    } else {
        query = query.sort('-createdAt');
    }

    //pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 5;
    const startIndex = (page - 1) * limit;
    const lastIndex = page * limit;
    const total = await Course.countDocuments();

    query = query.skip(startIndex).limit(limit)

    const courses = await query;

    // pagination results
    const pagination = {};
    if (lastIndex < total) {
        pagination.next = {
            page: page + 1,
            limit: limit
        }
    }

    if (startIndex > 0) {
        pagination.prev = {
            page: page - 1,
            limit
        }
    }

    res.status(200).json({
        success: true,
        count: courses.length,
        pagination,
        data: courses
    })
})

// @desc    Get single course
// @route   GET /api/v1/courses/:id
// @access  Public
exports.getCourse = asyncHandler(async (req, res, next) => {

    const course = await Course.findById(req.params.id).populate({
        path: 'bootcamp',
        select: 'name description'
    });

    if (!course) {
        return next(new ErrorResponse(`No course with the id of ${req.params.id}`), 404)
    }

    res.status(200).json({
        success: true,
        count: course.length,
        data: course
    })
})

// @desc    Add course
// @route   POST /api/v1/bootcamps/:bootcampId/courses
// @access  private
exports.addCourse = asyncHandler(async (req, res, next) => {
    req.body.bootcamp = req.params.bootcampId;
    req.body.user = req.user.id;

    const bootcamp = await Bootcamp.findById(req.params.bootcampId)

    if (!bootcamp) {
        return next(new ErrorResponse(`No course with the id of ${req.params.bootcampId}`), 404)
    }

    // make sure user is bootcamp owner
    if (bootcamp.user.toString() !== req.user.id && req.user.role !== 'admin') {
        return next(
            new ErrorResponse(`User ${req.params.id} is not authorized to add a course`, 401)
        );
    }

    const course = await Course.create(req.body);

    res.status(200).json({
        success: true,
        data: course
    })
})

// @desc    Update course
// @route   PUT /api/v1/courses/:id
// @access  private
exports.updateCourse = asyncHandler(async (req, res, next) => {

    let course = await Course.findById(req.params.id)

    if (!course) {
        return next(new ErrorResponse(`No course with the id of ${req.params.id}`), 404)
    }

    // make sure user is course owner
    if (course.user.toString() !== req.user.id && req.user.role !== 'admin') {
        return next(
            new ErrorResponse(`User ${req.params.id} is not authorized to update course`, 401)
        );
    }

    course = await Course.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    })

    res.status(200).json({
        success: true,
        data: course
    })
})

// @desc    Delete course
// @route   DELETE /api/v1/courses/:id
// @access  private
exports.deleteCourse = asyncHandler(async (req, res, next) => {

    const course = await Course.findById(req.params.id)

    if (!course) {
        return next(new ErrorResponse(`No course with the id of ${req.params.id}`), 404)
    }

    // make sure user is course owner
    if (course.user.toString() !== req.user.id && req.user.role !== 'admin') {
        return next(
            new ErrorResponse(`User ${req.params.id} is not authorized to delete course`, 401)
        );
    }   

    await course.remove();

    res.status(200).json({
        success: true,
        data: {}
    })
})