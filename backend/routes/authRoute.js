import express from 'express';
import {checkAuthentication, getAllUsers, logout, sendOTP,updateProfile,verifyOTP} from '../controllers/authController.js';
import { authMiddlerware } from '../middlerwares/authMiddlerware.js';
import { multerMiddlerware } from '../config/cloudinaryConfig.js';

const router = express.Router();

router.post('/send-otp',sendOTP);
router.post('/verify-otp',verifyOTP);
router.get('/logout',logout);

// protected route 
router.put('/update-profile',authMiddlerware,multerMiddlerware,updateProfile);
router.get('/check-auth',authMiddlerware,checkAuthentication);
router.get('/users',authMiddlerware,getAllUsers);

export default router;