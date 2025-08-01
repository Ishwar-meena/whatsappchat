import express from 'express';
import { authMiddlerware } from '../middlerwares/authMiddlerware.js';
import { multerMiddlerware } from '../config/cloudinaryConfig.js';
import { deleteMessage, getConversation, getMessage, markAsRead, sendMessage } from '../controllers/chatController.js';

const router = express.Router();

// protected routes 

router.post('/send-message',authMiddlerware,multerMiddlerware,sendMessage);
router.get('/conversations',authMiddlerware,getConversation);
router.get('/conversations/:conversationId/messages',authMiddlerware,getMessage);
router.put('/messages/read',authMiddlerware,markAsRead);
router.delete('/messages/:messageId',authMiddlerware,deleteMessage);

export default  router;
