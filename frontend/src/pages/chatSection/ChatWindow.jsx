import React from 'react'
import useUserStore from '../../store/useUserStore';

const isValidate = (date) => {
  return date instanceof Date && !isNaN(date);
}

const ChatWindow = ({selectedContact,setSelectedContact}) => {

  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const typingTimeoutRef = useRef(null);
  const messageEndRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const fileInputRef = useRef(null);
  const { theme } = useThemeStore();
  const { user } = useUserStore();
  const {
    messages,
    loading,
    sendMessage,
    conversations,
    receiveMessage,
    fetchMessage,
    fetchConversation,
    isUserTyping,
    startTyping,
    stopTyping,
    getUserLastSeen,
    isUserOnline,
    deleteMessage,
    addReaction,
    cleanUp
  } = useChatStore();

  // getOnline status and lastseen

  const online = isUserOnline(selectedContact?._id);
  const lastseen = getUserLastSeen(selectedContact?._id);
  const isTyping = isUserTyping(selectedContact?._id);

  useEffect(() => {
    if(selectedContact?._id && conversations?.data?.length >0){
      const conversation = conversations?.data?.find((conv)=>
      conv.participants.some((participant)=>participant._id === selectedContact?._id))
      if(conversation._id){
        fetchMessage(conversation._id);
      }
    }
  }, [selectedContact,conversations]);

  useEffect(() => {
    
    fetchConversation();
  }, [])
  

  const scrollToBottom = ()=>{
    messageEndRef.current?.scrollIntoView({behavior:'auto'});
  }

  useEffect(() => {
    scrollToBottom();
  }, [messages])

  
  useEffect(() => {
    if(message && selectedContact){
      startTyping(selectedContact?._id);
    }
    
  }, [messages])

  

  
  

  return (
    <div>
      this is chat window
    </div>
  )
}

export default ChatWindow
