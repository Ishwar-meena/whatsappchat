import dotenv from 'dotenv';
import express from 'express';
import cors  from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from './config/connectDB.js';
import bodyParser from 'body-parser';
import chatRoute from './routes/chatRoute.js';
import authRoute from './routes/authRoute.js';
import statusRoute from './routes/statusRoute.js';
import { initializeSocket } from './services/socketServie.js';
import http from 'http';




dotenv.config();
const PORT = process.env.PORT;
const app = express();
const corsOptions = {
    origin:process.env.FRONTEND_URL,    
    credentials:true
}
// connect db
connectDB();

const server = http.createServer(app);
const io = initializeSocket(server);

// apply socket middleware before routes 
app.use((req,res,next)=>{
    req.io = io;
    req.socketUserMap = io.socketUserMap;
    next();
})

// Middlerwares 
app.use(cookieParser());
app.use(express.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(cors(corsOptions));


// routes 
app.use('/api/auth',authRoute);
app.use('/api/chat',chatRoute);
app.use('/api/status',statusRoute);

server.listen(PORT,()=>{
    console.log(`server is listen on port ${PORT}`);
    
})