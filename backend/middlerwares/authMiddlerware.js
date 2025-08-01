import { response } from '../utils/responseHandler.js';
import jwt from 'jsonwebtoken';

export const authMiddlerware = async(req,res,next)=>{
    const authToken = req.cookies?.auth_token;
    if(!authToken){
        return response(res,401,'Auth token missing.');
    }
    try {
        const decode = jwt.verify(authToken,process.env.JWT_SECRET);
        req.user = decode;
        console.log(req.user);
        next();
    } catch (error) {
        console.error(error);
        return response(res,401,'Invalid or expired token');
    }
}