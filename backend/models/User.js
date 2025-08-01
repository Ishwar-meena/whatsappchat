import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        phoneNumber: { type: Number, unique: true, sparse: true },
        phoneNumberSuffix: { type: Number },
        email: {
            type: String,
            trim: true,
            lowercase: true,
            unique: true,
            validate: {
                validator: function (v) {
                    return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
                },
                message: "Please enter a valid email"
            },
            
        },
        emailOtp: { type: Number },
        emailOtpExpiry: { type: Date },
        username: { type: String },
        avatar: { type: String },
        about: { type: String },
        lastSeen: { type: Date },
        isOnline: { type: Boolean },
        isVerified: { type: Boolean, default: false },
        isAgreed: { type: Boolean, default: false },
    },
    {
        timestamps:true,
    }
);

export const User = mongoose.model('User',userSchema);