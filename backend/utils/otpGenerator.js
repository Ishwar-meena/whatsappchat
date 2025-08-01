export const otpGenerator = ()=>{
    const otp = Math.floor(900000 * Math.random() + 100000).toString();
    return otp;
}