import twilio from 'twilio';
const serviceSid = process.env.TWILIO_SERVICE_SID;
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

const client = twilio(accountSid,authToken);

// send otp to phone number
export const sendOtpToNumber = async (phoneNumber) => {
    if(!phoneNumber){
        throw new Error("phoneNumber is required");
    }
    console.log('otp is sending...',phoneNumber);
    try {
        const respone = client.verify.v2.services(serviceSid).verifications.create({
            to:phoneNumber,
            channel:'sms'
        });
        console.log('otp is successfully send');
        return respone; 
    } catch (error) {
        console.error(error);
        throw new Error("Failed to send otp");
    }
}

// verify otp for number
export const verifyOTPNumber = async (phoneNumber,otp) => {
    if(!phoneNumber){
        throw new Error("phoneNumber is required");
    }
    console.log('this is phoneNumber',phoneNumber);
    try {
        const response = await client.verify.v2.services(serviceSid).verificationChecks.create({
            to:phoneNumber,
            code:otp,
        });
        return response;
    } catch (error) {
        console.error(error);
        throw new Error("Failed to verify otp");
    }
}