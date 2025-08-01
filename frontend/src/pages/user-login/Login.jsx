import { useState } from 'react'
import useLoginStore from '../../store/useLoginStore'
import useUserStore from '../../store/useUserStore'
import useThemeStore from '../../store/themeStore';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import countries from '../../utils/countries';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaArrowLeft, FaChevronDown, FaPlus, FaUser, FaWhatsapp } from 'react-icons/fa'
import { useForm } from 'react-hook-form';
import Spinner from '../../utils/Spinner';
import { sendOTP, updateUserProfile, verifyOTP } from '../../services/user.service';
import { toast } from 'react-toastify';

// validation schema
const loginValidationSchema = yup.object().shape({
  phoneNumber: yup.string().nullable().notRequired().matches(/^\d+$/, 'Phone number must be digit').transform((value, originalValue) =>
    originalValue.trim() === '' ? null : value
  ),
  email: yup.string().nullable().notRequired().email("please enter a valid email").transform((value, originalValue) =>
    originalValue.trim() === '' ? null : value
  )
}).test(
  'at-least-one',
  'Either email or phoneNumber is required',
  function (value) {
    return !!(value.phoneNumber || value.email);
  }
);

const otpValidationSchema = yup.object().shape({
  otp: yup.string().length(6, 'otp must be 6 digits').required('otp is required')
})

const profileValidationSchema = yup.object().shape({
  username: yup.string().required('username is required'),
  agreed: yup.bool().oneOf([true], 'you must agree our t&c')
})



const defaultAvatars = [
  'https://api.dicebear.com/6.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/6.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/6.x/avataaars/svg?seed=Mimi',
  'https://api.dicebear.com/6.x/avataaars/svg?seed=Jasper',
  'https://api.dicebear.com/6.x/avataaars/svg?seed=Luna',
  'https://api.dicebear.com/6.x/avataaars/svg?seed=Zoe',
]


const Login = () => {
  const { step, setStep, userPhoneData, setUserPhoneData, resetLoginState } = useLoginStore();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState("");
  const [avatarFile, setAvatarFile] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(defaultAvatars[0]);
  const [error, setError] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const { setUser } = useUserStore();
  const { theme, setTheme } = useThemeStore();
  const [loading, setLoading] = useState(false);

  const {
    register: loginRegister,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors }
  } = useForm({
    resolver: yupResolver(loginValidationSchema)
  });

  const {
    handleSubmit: handleOtpSubmit,
    formState: { errors: otpErrors },
    setValue: setOtpValue
  } = useForm({
    resolver: yupResolver(otpValidationSchema)
  });

  const {
    register: profileRegister,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
    watch
  } = useForm({
    resolver: yupResolver(profileValidationSchema)
  });

  // this component help to show step ui 
  const ProgressBar = () => {
    return (
      <div className={`w-full ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded-full h-2.5 mb-6`}>
        <div className='bg-green-500 h-2.5 rounded-full transition-all duration-500 ease-in-out'
          style={{ width: `${(step / 3) * 100}%` }}
        >
        </div>
      </div>

    )
  }

  const filterCountries = countries.filter(
    (country) => {
      return country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        country.dialCode.includes(searchTerm);
    }
  )

  const onLoginSubmit = async () => {
    try {
      setLoading(true);
      if (email) {
        const response = await sendOTP(null, null, email);
        if (response.status === 'success') {
          toast.success('Otp is send to your email');
          setUserPhoneData({ email });
          setStep(2);
        }
      } else {
        const response = await sendOTP(phoneNumber, selectedCountry.dialCode);
        if (response.status === 'success') {
          toast.success('Otp is send to your mobile number');
          setUserPhoneData({ phoneNumber, phoneNumberSuffix: selectedCountry.dialCode });
          setStep(2);
        }
      }
    } catch (error) {
      console.error(error);
      setError(error.message || "Failed to send otp");
    } finally {
      setLoading(false);
    }
  }


  const onOtpSubmit = async () => {
    try {
      setLoading(true);
      if (!userPhoneData) {
        throw new Error('Phone or email data is missing');
      }
      const otpString = otp.join('');
      let response;
      if (userPhoneData?.email) {
        response = await verifyOTP(null, null, userPhoneData.email, otpString);
      } else {
        response = await verifyOTP(userPhoneData.phoneNumber, userPhoneData.phoneNumberSuffix, null, otpString);

      }
      console.log(response);
      if (response.status === 'success') {
        toast.success('your otp verified successfully');
        const user = response.data?.user;
        if (user?.username && user?.avatar) {
          setUser(user);
          toast.success("Welcome back to whatsapp");
          navigate('/');
          resetLoginState()
        } else {
          setStep(3);
        }
      }
    } catch (error) {
      console.error(error);
      setError(error.message || "Failed to verify otp");
    } finally {
      setLoading(false);
    }
  }

  const onProfileSubmit = async (data) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('username', data.username);
      formData.append('agreed', data.agreed);
      if (avatarFile) {
        formData.append('media', avatarFile);
      } else {
        formData.append('avatar', avatar);
      }
      await updateUserProfile(formData);
      toast.success('Welcome back to whatsapp');
      navigate('/');
      resetLoginState();
    } catch (error) {
      console.error(error);
      setError(error.message || "Failed to update user profile");
    } finally {
      setLoading(false);
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatar(URL.createObjectURL(file));
      setAvatarFile(file);
    }
  }

  const handleOtpChange = (index, value) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setOtpValue('otp', newOtp.join(''));
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`).focus();
    }
  }


  const handleBack = () => {
    setStep(1);
    setUserPhoneData(null);
    setOtp(['', '', '', '', '', '']);
    setError('');
  }

  return (
    <div
      className={`min-h-screen 
      ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-green-500 to-blue-400'} 
      flex justify-center items-center p-4 overflow-hidden`}
    >

      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}  p-6 md:p-8 rounded-lg shadow-2xl w-full max-w-md relative z-10`}
      >

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, type: 'spring', stiffness: 260, damping: 20 }}
          className='w-24 h-24 bg-green-500 rounded-full mx-auto mb-6 flex items-center justify-center'
        >
          <FaWhatsapp className='w-16 h-16 text-white' />
        </motion.div>
        <h1 className={`text-3xl font-bold text-center mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
          WhatsApp Login
        </h1>
        <ProgressBar />
        {
          error &&
          <p className='text-red-500 text-center mb-6'>{error}</p>
        }
        {
          step === 1 && (
            <form
              className='space-y-4'
              onSubmit={handleLoginSubmit(onLoginSubmit)}
            >
              <p className={`text-center ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
                Enter your phone number to receive otp
              </p>
              <div className='relative'>
                <div className="flex">
                  <div className="relative w-1/3">
                    <button
                      type='button'
                      className={`flex-shrink-0 z-10 inline-flex py-2.5 px-4 text-sm font-medium text-center ${theme === 'dark' ? 'text-white bg-gray-700 border-gray-600' : 'text-gray-900 bg-gray-100 border-gray-300'} border-r-lg hover:bg-gray-200 focus:right-4 focus:outline-none focus:ring-gray-100`}
                      onClick={() => setShowDropdown(!showDropdown)}
                    >
                      <span className='flex gap-1 items-center justify-center'>
                        <img
                          src={selectedCountry.flag}
                          alt={selectedCountry.name}
                          className='h-4 w-4'
                        />
                        {selectedCountry.dialCode}
                      </span>
                      <FaChevronDown className='ml-2' />
                    </button>
                    {
                      showDropdown && (
                        <div className={`absolute z-10 min-w-full sm:w-96 w-64  mt-1 ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} border rounded-md shadow-lg max-h-60 overflow-y-auto`}>
                          <div className={`sticky top-0 ${theme === 'dark' ? 'bg-gray-700' : 'bg-white'} p-2`}>
                            <input
                              type="text"
                              placeholder='search countries...'
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className={`w-full px-2 py-1 border ${theme === 'dark' ? 'bg-gray-600 border-gray-600 text-white' : 'bg-white border-gray-300 '} rounded-md focus:outline-none focus:right-2 focus:ring-green-500`}
                            />
                          </div>
                          {

                            filterCountries.map((country) => {
                              return (<button
                                key={country.alpha2}
                                type='button'
                                className={`w-full flex gap-1 items-center justify-center text-left px-3 py-2 ${theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-100 focus:outline-none focus:bg-gray-100'}`}
                                onClick={() => {
                                  setSelectedCountry(country)
                                  setShowDropdown(false)
                                }}
                              >
                                <img
                                  src={country.flag}
                                  alt={country.name}
                                  className='h-4 w-4'
                                />
                                <div>
                                  ({country.dialCode})
                                </div>
                                <div>
                                  {country.name}
                                </div>
                              </button>)
                            })
                          }
                        </div>
                      )
                    }

                  </div>
                  <input
                    type="text"
                    {...loginRegister('phoneNumber')}
                    placeholder='Phone Number'
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className={`w-2/3 px-4 py-2 border ${theme === 'dark' ? 'bg-gray-700 border-gray-700 text-white' : 'bg-white border-gray-300'} rounded-md focus:outline-none focus:right-2 focus:ring-green-500 ${loginErrors.phoneNumber && 'border-red-500'}`}
                  />
                </div>
                {loginErrors.phoneNumber && (
                  <p className='text-red-500 text-sm'>{loginErrors.phoneNumber.message}</p>
                )}
              </div>


              {/* // divider with or  */}
              <div className='flex items-center my-4'>
                <div className='flex-grow h-px bg-gray-300' />
                <span className='mx-3 text-gray-500 text-sm font-medium'>or</span>
                <div className='flex-grow h-px bg-gray-300' />
              </div>

              {/* email input box  */}
              <div className={`flex items-center border rounded-md px-3 py-2 ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}>
                <FaUser className={`mr-2 text-gray-400 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                <input
                  type="email"
                  {...loginRegister('email')}
                  placeholder='Email (optional)'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full bg-transparent focus:outline-none ${theme === 'dark' ? ' text-white' : 'text-black'}  ${loginErrors.email && 'border-red-500'}`}
                />
                {loginErrors.email && (
                  <p className='text-red-500 text-sm'>{loginErrors.email.message}</p>
                )}
              </div>
              <button
                type='submit'
                className='w-full bg-green-500 text-white py-2 rounded-md hover:bg-green-600 transition'>
                {loading ? <Spinner /> : "Send OTP"}
              </button>
            </form>
          )
        }


        {step === 2 && (
          <form className='space-y-4' onSubmit={handleOtpSubmit(onOtpSubmit)}>
            <p className={`text-center ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
              Please enter 6-digit OTP send to your {userPhoneData ? userPhoneData.phoneNumberSuffix : 'email'} {userPhoneData?.phoneNumber && userPhoneData.phoneNumber}
            </p>
            <div>
              {otp.map((digit, index) => {
                return (
                  <input
                    type="text"
                    key={index}
                    id={`otp-${index}`}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    className={`w-12 h-12 mx-2 text-center border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${otpErrors.otp && 'border-red-500'}`}
                  />
                )
              })}
            </div>
            {otpErrors.otp && (
              <p className='text-red-500 text-sm'>{otpErrors.otp.message}</p>
            )}
            <button
              type='submit'
              className='w-full bg-green-500 text-white py-2 rounded-md hover:bg-green-600 transition'>
              {loading ? <Spinner /> : "Verify OTP"}
            </button>
            <button
              type='button'
              onClick={handleBack}
              className={`w-full mt-2 ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-300 text-gray-700'} py-2 rounded-md hover:bg-gray-400 transition flex items-center justify-center`}
            >
              <FaArrowLeft className='mr-2' />
              Wrong Number? Go back
            </button>
          </form>
        )}

        {
          step === 3 && (
            <form onSubmit={handleProfileSubmit(onProfileSubmit)} className='space-y-4'>
              <div className="flex flex-col items-center mb-4">
                <div className="relative w-24 h-24 mb-2">
                  <img
                    src={avatar || selectedAvatar}
                    alt='user avatar'
                    className='w-full h-full rounded-full object-cover'
                  />
                  <label
                    htmlFor="avatar"
                    className='absolute bottom-0 right-0 bg-green-500 text-white p-2 rounded-full cursor-pointer hover:bg-green-600 transition-all'
                  >
                    <FaPlus className='w-4 h-4' />
                  </label>
                  <input
                    type="file"
                    id='avatar'
                    accept='image/*'
                    onChange={handleFileChange}
                    className='hidden'
                  />
                </div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} mb-2`}>
                  Choose an Avatar
                </p>
                <div className="flex flex-wrap justify-center gap-2 ">
                  {
                    defaultAvatars.map((avatar, index) => {
                      return (
                        <img
                          key={index}
                          src={avatar}
                          alt={`Avatar ${index}`}
                          className={`w-12 h-12 rounded-full cursor-pointer transition duration-300 ease-in-out transform hover:scale-110 ${selectedAvatar === avatar && 'ring-2 ring-green-500'}`}
                          onClick={() => setSelectedAvatar(avatar)}
                        />
                      )
                    })
                  }
                </div>
              </div>
              <div className="relative">
                <FaUser
                  className={`absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400`}
                />
                <input
                  type="text"
                  {...profileRegister('username')}
                  placeholder='Username'
                  className={`w-full pl-10 pr-3 py-1.5 border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-lg`}
                />
                {
                  profileErrors.username && (
                    <p className='text-red-500 text-sm mt-1'>{profileErrors.username.message}</p>
                  )
                }
              </div>
              <div className="flex items-center space-x-2">
                <input
                  id='terms'
                  type="checkbox"
                  {...profileRegister('agreed')}
                  className={`rounded ${theme === 'dark' ? 'text-green-500 bg-gray-700' : 'text-green-600'} focus:ring-green-500`}
                />
                <label
                  htmlFor="terms"
                  className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  I agree to the {''}
                  <a href="#" className='text-red-500 hover:underline'>
                    Terms and Conditions
                  </a>
                </label>
                {
                  profileErrors.agreed && (
                    <p className='text-red-500 text-sm mt-1'>{profileErrors.agreed.message}</p>
                  )
                }
              </div>
              <button
                type='submit'
                disabled={!watch('agreed') || loading}
                className={`w-full bg-green-500 text-white font-bold py-3 px-4 rounded-md transition duration-300 ease-in-out transform hover:scale-105 flex items-center justify-center text-lg
                 disabled:opacity-50 disabled:cursor-not-allowed`
                }
              >
                {loading ? <Spinner /> : "Verify OTP"}
              </button>
            </form>
          )
        }
      </motion.div>


    </div>
  )
}

export default Login
