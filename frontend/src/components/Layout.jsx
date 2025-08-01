import React,{useState,useEffect} from 'react'
import useLayoutStore from '../store/layoutStore'
import { useLocation } from 'react-router-dom';
import useThemeStore from '../store/themeStore';
import { AnimatePresence } from 'framer-motion';
import { motion } from 'framer-motion';
import ChatWindow from '../pages/chatSection/ChatWindow';
import Sidebar from './Sidebar'

const Layout = ({ children, isThemeDialogOpen, toggleThemeDialog, isStatusPreviewOpen, statusPreviewContent }) => {
  const selectedContact = useLayoutStore((state)=>state.selectedContact);
  const setSelectedContact = useLayoutStore((state)=>state.setSelectedContact);
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const { theme, setTheme } = useThemeStore();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [])

  return (
    <div className={`min-h-screen flex relative ${theme === 'dark' ? 'bg-[#111b2] text-white' : 'bg-gray-100 text-black'} `}>
      {
        !isMobile && <Sidebar />
      }
      <div
        className={`flex flex-1 overflow-hidden ${isMobile && 'flex-col'}`}
      >
        <AnimatePresence initial={false}>

          {(!selectedContact || !isMobile) && (
            <motion.div
              key='chatlist'
              initial={{ x: isMobile ? '-100%' : 0 }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween' }}
              className={`w-full md:w-2/5 h-full ${isMobile && 'pb-16'}`}
            >
              {children}
            </motion.div>
          )}


          {(selectedContact || !isMobile) && (
            <motion.div
              key='chatWindow'
              initial={{ x: isMobile ? '-100%' : 0 }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween' }}
              className={`w-full h-full`}
            >
              <ChatWindow
                selectedContact={selectedContact}
                setSelectedContact={setSelectedContact}
                isMobile={isMobile}
              />
            </motion.div>
          )}



        </AnimatePresence>
      </div>
      {isMobile && <Sidebar />}

      {isThemeDialogOpen && (
        <div className='fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50'>
          <div className={`${theme === 'dark' ? 'bg-[#202c33] text-white' : 'bg-white text-black'} p-6 rounded-lg shadow-lg max-w-sm w-full`}>
            <h1 className='text-2xl font-semibold mb-4'>
              Choose a theme
            </h1>
            <div className="space-y-4">
              <label htmlFor="" className='flex items-center space-x-3 cursor-pointer'>
                <input
                  type="radio"
                  value='light'
                  checked={theme === 'light'}
                  onChange={() => setTheme('light')}
                  className='from-radio text-blue-600'
                />
                <span>Light</span>
              </label>

              <label htmlFor="" className='flex items-center space-x-3 cursor-pointer'>
                <input
                  type="radio"
                  value='dark'
                  checked={theme === 'dark'}
                  onChange={() => setTheme('dark')}
                  className='from-radio text-blue-600'
                />
                <span>Dark</span>
              </label>
            </div>
            <button
              onClick={toggleThemeDialog}
              className='mt-6 w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition duration-200'
            >

              Close
            </button>
          </div>

        </div>
      )}

      {/* status preview  */}
      {isStatusPreviewOpen && (
        <div
          className='fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50'
        >
          {statusPreviewContent}
        </div>
      )}
    </div>
  )
}

export default Layout
