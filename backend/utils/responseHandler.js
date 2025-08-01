export const response = (res,statusCode,message,data=null)=>{
    if(!res){
        console.error("response is null");
        return;
    }
    const responseObject = {
        status : statusCode<400?'success':'error',
        message,
        data,
    };
    res.status(statusCode).json(responseObject);
}