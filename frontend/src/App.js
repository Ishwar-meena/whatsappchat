import React from "react";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from "./pages/user-login/Login";
import { ToastContainer } from 'react-toastify';
import { ProtectedRoute, PublicRoute } from "./Protected";
import HomePage from "./components/HomePage";
import Setting from './pages/settingSection/SettingSection';
import Status from './pages/statusSection/StatusSection'
import UserDetails from './components/UserDetails';
import useUserStore from "./store/useUserStore";
import { disConnectSocket, initializeSocket } from "./services/chat.service";

function App() {

  const {user} = useUserStore();
  useEffect(() => {
    if(user?._id){
      const socket = initializeSocket();

    }

    return ()=>{
      disConnectSocket();
    }
  }, [user])
  
  return (
    <>
      <ToastContainer />
      <Router>
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/user-login" element={<Login />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<HomePage/>}/>
            <Route path="/user-profile" element={<UserDetails/>}/>
            <Route path="/status" element={<Status/>}/>
            <Route path="/setting" element={<Setting/>}/>
          </Route>
        </Routes>
      </Router>
    </>
  );
}

export default App;
