const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const morgan = require('morgan');
const fileUpload = require('express-fileupload');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/error');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const helmet = require('helmet');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const cors = require('cors');

// load env vars
dotenv.config({ path: './config/config.env' });

// Connect to DB
connectDB();

// route files
const bootcampRoutes = require('./routes/bootcamp-routes');
const courses = require('./routes/courses-routes');
const auth = require('./routes/auth-routes');
const users = require('./routes/users-routes');
const reviews = require('./routes/reviews-routes');

const app = express();

if(process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'))
}

app.use(express.json());

// cookie parser
app.use(cookieParser());

// file upload
app.use(fileUpload());

//  sanitize data
app.use(mongoSanitize());

// set security header
app.use(helmet());

app.use(xss());

const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, 
    max: 100
})

app.use(limiter);

app.use(hpp());

app.use.use(cors());

// set static folder
app.use(express.static(path.join(__dirname, 'public')));

// mount routers
app.use('/api/v1/bootcamps', bootcampRoutes);
app.use('/api/v1/courses', courses);
app.use('/api/v1/auth', auth);
app.use('/api/v1/users', users);
app.use('/api/v1/reviews', reviews);

// middleware
app.use(errorHandler)
 
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log(`app listening on port ${PORT} on ${process.env.NODE_ENV} mode`) 
})

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`)

    // close server
    server.close(() => process.exit(1));
})
