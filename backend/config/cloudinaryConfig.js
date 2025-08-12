import dotenv from 'dotenv'
import { v2 as cloudinary}from 'cloudinary'
import multer from 'multer';
import fs from 'fs';

dotenv.config();

cloudinary.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET,
});

// upload file to cloudinary 
export const uploadFileToCloudinary = async(file)=>{
    const options = {
        resource_type:file.mimetype.startsWith('video')?'video':'image',
    }
    
    return new Promise((resolve,reject)=>{
        const uploader = file.mimetype.startsWith('video')?cloudinary.uploader.upload_large:cloudinary.uploader.upload;
        uploader(file.path,options,(error,result)=>{
            fs.unlink(file.path,()=>{})
            if(error){
                return  reject(error);
            }
            resolve(result);
        })
    })
    
}

export const multerMiddlerware = multer({dest:'uploads/'}).single('media');
