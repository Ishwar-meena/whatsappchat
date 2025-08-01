import mongoose from "mongoose";
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if(!MONGO_URI){
    throw new Error("Set Mongodb uri");
}

let cached = global.mongoose;
if(!cached){
    cached = global.mongoose = {conn:null,promise:null};
}

const connectDB = async () => {
    if (cached.conn) {
        return cached.conn;
    }
    cached.promise = mongoose.connect(MONGO_URI);
    try {
        cached.conn = await cached.promise;
        console.log("Mongodb connected successfully");
        
    } catch (error) {
        console.error("Mongodb connection error : ",error);
        cached.promise = null;
        return error;
    }
    return cached.conn;
}

export default connectDB;
