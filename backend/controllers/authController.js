import { User } from "../models/User.js";
import { sendOtpToEmail } from "../services/emailService.js";
import { sendOtpToNumber } from "../services/twilloService.js";
import { generateToken } from "../utils/generateToken.js";
import { otpGenerator } from "../utils/otpGenerator.js";
import { response } from "../utils/responseHandler.js";
import { verifyOTPNumber } from "../services/twilloService.js";
import { uploadFileToCloudinary } from "../config/cloudinaryConfig.js";
import { Conversation } from '../models/Conversation.js';
// send otp for auth
export const sendOTP = async (req, res) => {
    const { phoneNumber, phoneNumberSuffix, email } = req.body;
    const otp = otpGenerator();
    const expiry = new Date(Date.now() + 5 * 60 * 1000); // for 5 minute
    let user;
    try {
        if (email) {
            user = await User.findOne({ email: email });
            if (!user) {
                user = new User({ email });
            }
            user.emailOtp = otp;
            user.emailOtpExpiry = expiry;
            await user.save();
            await sendOtpToEmail(email, otp);
            return response(res, 200, 'otp sent successfully', { email });
        }
        if (!phoneNumber || !phoneNumberSuffix) {
            return response(res, 400, 'Phone number and suffix are required');
        }
        const fullNumber = `${phoneNumberSuffix}${phoneNumber}`;
        user = await User.findOne({ phoneNumber });
        if (!user) {
            user = new User({ phoneNumber, phoneNumberSuffix });
        }
        await user.save();
        await sendOtpToNumber(fullNumber);
        return response(res, 200, 'otp sent successfully', user);
    } catch (error) {
        console.error(error);
        return response(res, 500, 'Internal server error');
    }
}


// verify otp to authenticate
export const verifyOTP = async (req, res) => {
    const { phoneNumber, phoneNumberSuffix, email, otp } = req.body;
    let user;
    try {
        if (email) {
            user = await User.findOne({ email: email });
            if (!user) {
                return response(res, 404, 'Email is not exist');
            }
            const now = new Date();
            if (!user.emailOtp || toString(user.emailOtp) !== toString(otp) || now > new Date(user.emailOtpExpiry)) {
                return response(res, 400, 'Invalid or otp expired');
            }
            user.isVerified = true;
            user.emailOtp = null;
            user.emailOtpExpiry = null;
            await user.save();
        }
        else {
            if (!phoneNumber || !phoneNumberSuffix) {
                return response(res, 400, 'Phone number and suffix are required');
            }
            const fullNumber = `+${phoneNumberSuffix}${phoneNumber}`;
            user = await User.findOne({ phoneNumber });
            if (!user) {
                return response(res, 404, 'User not exist');
            }
            const result = await verifyOTPNumber(fullNumber, otp);
            if (result.status !== 'approved') {
                return response(res, 400, 'Invalid Otp');
            }
            user.isVerified = true;
            await user.save();
        }
        const token = generateToken(user._id);
        res.cookie('auth_token', token, {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 365, // 365 days
        });
        return response(res, 200, 'Otp verified successfully', { token, user });
    } catch (error) {
        console.error(error);
        return response(res, 500, 'Internal server error');
    }
}

// update user profile 
export const updateProfile = async (req, res) => {
    const { username, agreed, about } = req.body;
    const userId = req.user.userId;
    const file = req.file;
    try {
        let user = await User.findById(userId);
        if(!user){
            return response(res,404,'user not exist');
        }
        console.log("this is file data ",file);
        if (file) {
            const uploadResult = await uploadFileToCloudinary(file);
            console.log('this is secure url : ', uploadResult.secure_url);
            user.avatar = uploadResult?.secure_url;
        } else if (req.body.profilePicture) {
            user.avatar = req.body.profilePicture;
        }
        if (username?.trim()) user.username = username;
        if (agreed) user.isAgreed = agreed;
        if (about?.trim()) user.about = about;
        await user.save();
        return response(res, 200, 'Profile updated successfully', user);
    } catch (error) {
        console.error(error);
        return response(res, 500, 'Internal server error');
    }
}

// check user authentication 
export const checkAuthentication = async (req, res) => {
    const userId = req.user.userId;
    if (!userId) {
        response(res, 404, 'Access denied');
    }
    try {
        const user = await User.findById(userId);
        if (!user) {
            return response(res, 404, 'User not exist');
        }
        return response(res, 200, 'user authenticated');
    } catch (error) {
        console.error(error);
        return response(res, 500, 'Internal server errror');
    }
}

// logout user 
export const logout = (req, res) => {
    try {
        res.cookie("auth_token", null, { expires: new Date() });
        return response(res, 200, 'user logout');
    } catch (error) {
        console.error(error);
        return response(res, 500, "Internal server error");
    }
}

// get all users 
export const getAllUsers = async (req, res) => {
    const loggedInUser = req.user.userId;
    try {
        const users = await User.find({ _id: { $ne: loggedInUser } }).select(
            'username avatar about lastseen isOnline'
        ).lean();
        if (users.length === 0) {
            return response(res, 404, 'users not exist');
        }
        const usersWithConversation = await Promise.all(
            users.map(async (user) => {
                const conversation = await Conversation.findOne({
                    participants: { $all: [loggedInUser, user?._id] },
                }).populate({
                    path: 'lastMessage',
                    select: 'content createdAt sender receiver'
                }).lean();
                return {
                    ...user,
                    conversation: conversation || null,
                }
            })
        );
        return response(res, 200, 'users data', usersWithConversation);
    } catch (error) {
        console.error(error);
        return response(res, 500, 'Internal server error');
    }
}