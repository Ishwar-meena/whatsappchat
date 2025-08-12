import { io } from 'socket.io-client';
import useUserStore from '../store/useUserStore'

BACKEND_URL = process.env.REACT_APP_API_URL;
let socket = null;

export const initializeSocket = () => {
    if (socket) return socket;

    const user = useUserStore.getState().user;

    socket = io(BACKEND_URL, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionAttempts: 1000,
    })


    // connection events 
    socket.on('connect', () => {
        console.log('socket connected', socket.id);
        socket.emit('user_connected', user._id);
    })

    socket.on('connect_error', (error) => {
        console.error('socket connection error : ', error);
    })

    // disconnect event 
    socket.on('disconnect', (reason) => {
        console.log('disconnected', reason);

    })

    return socket;
}

export const getSocket = ()=>{
    if(!socket) return initializeSocket();
    return socket;
}

export const disConnectSocket = ()=>{
    if(socket){
        socket.disconnect();
        socket = null;
    }
}