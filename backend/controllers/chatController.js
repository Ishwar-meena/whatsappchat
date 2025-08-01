import { uploadFileToCloudinary } from "../config/cloudinaryConfig.js";
import { Conversation } from "../models/Conversation.js";
import { response } from "../utils/responseHandler.js";
import { Message } from '../models/Message.js';


// send message to each other users
export const sendMessage = async (req, res) => {
    const { senderId, receiverId, content, messageStatus } = req.body;
    const file = req.file;
    try {
        const participants = [senderId, receiverId].sort();
        // check if conversation is already exist 
        let conversation = await Conversation.findOne({
            participants: participants
        });
        if (!conversation) {
            conversation = new Conversation({
                participants: participants
            })
            await conversation.save();
        }
        let imageOrVideoUrl = null;
        let contentType = null;
        // handle file 
        if (file) {
            const uploadFile = await uploadFileToCloudinary(file);
            if (!uploadFile?.secure_url) {
                return response(res, 400, 'Failed to save file');
            }
            imageOrVideoUrl = uploadFile.secure_url;
            if (file.mimeType.startWith('image')) {
                contentType = 'image';
            } else if (file.mimeType.startWith('video')) {
                contentType = 'video'
            } else {
                return response(res, 400, 'Unsopported file type');
            }
        } else if (content?.trim()) {
            contentType = 'text';
        } else {
            return response(res, 400, 'Message is required');
        }

        const message = new Message({
            conversation: conversation?._id,
            sender: senderId,
            receiver: receiverId,
            content,
            imageOrVideoUrl,
            contentType,
            messageStatus
        });
        await message.save();

        if (message?.content) {
            conversation.lastMessage = message?._id;
        }
        conversation.unreadCount += 1;
        await conversation.save();
        const populatedMessage = await Message.findOne({ _id: message._id })
            .populate('sender', 'username avatar')
            .populate('receiver', 'username avatar');

         // emit socket event 
        if(req.io && req.socketUserMap){
            // broadcast to all connecting user except creator 
            const receiverSocketId = req.socketUserMap.get(receiverId);
            if(receiverSocketId){
                req.io.to(receiverSocketId).emit('receive_message',populatedMessage);
                message.messageStatus = 'delivered';
                await message.save();
            }
        }
        return response(res, 201, 'Message saved successfully', populatedMessage);

    } catch (error) {
        console.error(error);
        return response(res, 500, 'Internal server error');
    }
}

// get all conversation
export const getConversation = async (req, res) => {
    const userId = req.user.userId;
    try {
        let conversation = await Conversation.find({
            participants: userId
        }).populate('participants', 'username avatar isOnline lastseen')
            .populate({
                path: 'lastMessage',
                populate: {
                    path: 'sender receiver',
                    select: 'username avatar',
                }
            }).sort({ updatedAt: -1 });
        return response(res, 201, 'conversation get successfully', conversation);
    } catch (error) {
        console.error(error);
        return response(res, 500, 'Internal server error');
    }
}

// get message of a specifice conversation
export const getMessage = async (req, res) => {
    const { conversationId } = req.params;
    const userId = req.user.userId;
    try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return response(res, 404, 'conversation not found');
        }
        if (!conversation.participants.includes(userId)) {
            return response(res, 403, 'Not authorized to view this message');
        }
        const message = await Message.find({ conversation: conversationId })
            .populate('sender', 'username avatar')
            .populate('receiver', 'username avatar')
            .sort("createdAt");

        await Message.updateMany(
            {
                conversation: conversationId,
                receiver: userId,
                messageStatus: { $in: ['send', 'delivered'] }
            },
            { $set: { messageStatus: 'read' } },
        );
        conversation.unreadCount = 0;
        await conversation.save();
        return response(res, 200, 'message successfully retrive',message);
    } catch (error) {
        console.error(error);
        return response(res, 500, 'Internal server error');
    }
}

// mark message as a read
export const markAsRead = async (req, res) => {
    const { messageId } = req.body;
    const userId = req.user.userId;
    try {
        // get relevant messages of senders 
        let messages = await Message.find({
            _id: { $in: messageId },
            receiver: userId,
        });

        await Message.updateMany(
            {
                _id: { $in: messageId },
                receiver: userId,
            },
            { $set: { messageStatus: 'read' } }
        );

        if(req.io && req.socketUserMap){
            for(const message of messages){
                const senderSocketId = req.socketUserMap(message.sender._id.toString());
                if(senderSocketId){
                    const updatedMessage = {
                        _id:message._id,
                        messageStatus:'read',
                    };
                    req.io.to(senderSocketId).emit('message_read',updatedMessage);
                    await message.save();
                }
                
            }
        }
        return response(res, 200, 'message read successfully', messages);
    } catch (error) {
        console.error(error);
        return response(res, 500, 'Internal server error');
    }
}

// delete a message
export const deleteMessage = async (req, res) => {
    const { messageId } = req.body;
    const userId = req.user.userId;
    if (!messageId || !userId) {
        return response(res, 403, 'Access Denied');
    }
    try {
        const message = await Message.findById(messageId);
        if (!message) {
            return response(res, 404, 'Message id is not exist');
        }
        if (message.sender.toString() !== userId) {
            return response(res, 403, 'Access Denied');
        }
        await message.deleteOne();
         // emit socket event 
        if (req.io && req.socketUserMap) {
            const receiverSocketId = req.socketUserMap.get(message.receiver._id.toString());
            if(receiverSocketId){
                req.io.to(receiverSocketId).emit('message_deleted',messageId);
            }
        }
        return response(res, 200, 'Message deleted successfully');
    } catch (error) {
        console.error(error);
        return response(res, 200, 'Internal server error');
    }
}

