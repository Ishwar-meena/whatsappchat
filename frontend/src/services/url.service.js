import axios from 'axios';

const apiUrl = `${process.env.REACT_APP_API_URL}/api`;

const axiosInstance = axios.create({
    baseURL:apiUrl,
    withCredentials:true,
});

export default axiosInstance;