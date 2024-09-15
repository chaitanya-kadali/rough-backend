const bcrypt=require("bcryptjs");  //object for password hashing
const Doctor = require("../models/doctormodel"); // object of doctor collection
const Startup = require("../models/startupModel");// object of startup collection
const catchAsyncErrors = require("../middleware/catchAsyncErrors"); // by default error catcher
const authenticateJWT=require("../middleware/authMiddleware");  //validate the Token after login
const {Doctorschema}=require("../middleware/schemaValidator");
const multer = require("multer");  //object for pdf uploading
require('dotenv').config();

const jwt = require('jsonwebtoken');  //object to Generate JWT token
const JWT_SECRET="secret_key_for_StartupPortal";


// Configure Multer to save files to the server
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./files");  // Set the directory where you want to save the files
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);  // Set the file name to save
  }
});
const upload = multer({ storage: storage });


// Registration for doctor
exports.createDoctor = catchAsyncErrors(async (req, res) => {

    const uploadMiddleware = upload.single('pdf');

  // Invoke the multer middleware manually
  uploadMiddleware(req, res, async (err) => {
    if (err) {
      return res.status(500).send(err.message);
    }
    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }

    const { name, Email_ID, password, district, state, phone_number, language } = req.body;
    // Validate the request body using Joi
    const { error } = Doctorschema.validate({ name, Email_ID, password, district, state, phone_number, language});

  if (error) {
    // If validation fails, return the error message
    return res.status(400).json({ success: false, error: "password must contain only letters and numbers" });
  }
    try {
      // Hash the password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Get the file path of the uploaded PDF
      const pdfFilePath = req.file.path;

      // Create a new doctor with the uploaded PDF's file path
      const newDoctor = new Doctor({
        name,
        Email_ID,
        password: hashedPassword,
        district,
        state,
        phone_number,
        language,
        pdf: pdfFilePath
      }
    );

      // Save the doctor to the database
      await newDoctor.save();

      res.status(201).json(newDoctor);
  
      res.status(201).json({data:newDoctor, success: true}); // modified to match frontend
    } catch (error) {
      console.error('Error:', error);
      res.status(400).json({ error: error.message,success: false });
    }
  });

  });


  //Login for doctor
  exports.DoctorLogin =catchAsyncErrors(async (req,res)=>{
    const { Email_ID, password } = req.body;
    try {
    // Check if Doctor exists in the database
    const DoctorDetails = await Doctor.findOne({ Email_ID });

    if (!DoctorDetails) {
    // Doctor Details not found, send error response
  
    return res.status(404).json({ success: false, error: 'Invalid Email_ID or password.' });
  
    }
    // Compare passwords
    const passwordMatch = await bcrypt.compare(password, DoctorDetails.password);
    if (!passwordMatch) {
    // Passwords don't match, send error response
    return res.status(403).json({ success: false, error: 'Invalid Email_ID or password.' });
    }
    const token = jwt.sign(
      { id: Doctor._id, Email_ID: Doctor.Email_ID },  // Payload data
      process.env.JWT_SECRET,  // Secret key
      { expiresIn: '1h' }  // Token expiry time (1 hour)
    );

    res.json({ success: true, message: 'Login successful' ,token: token, DoctorDetails: DoctorDetails });
    } 
    catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
     }
  });


  //Doctor Dashboard
  exports.DoctorDashboard =catchAsyncErrors(async (req,res)=>{
    authenticateJWT(req,res,async()=>{
      const { District} = req.body;
    try {
    // Check if startups exists in the database
    const StartupsAvai = await Startup.find({District});
  
    if (!StartupsAvai) {

    return res.status(404).json({ success: false, error: 'No Startups Available.' });
  
    }
  
    res.json({ success: true, message: 'Startup Details for doctor', StartupsAvai: StartupsAvai});
    } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
     }
    })
  });

