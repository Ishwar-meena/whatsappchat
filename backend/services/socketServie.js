import { Server } from 'socket.io';
import { User } from "../models/User.js";
import { Message } from "../models/Message.js";
// map to store online users ->userId -> socketId 
const onlineUsers = new Map();

// map to track typing users -> userId -> [conversation]:boolean 
const typingUsers = new Map();

export  const initializeSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL,
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
        },
        pingTimeout: 1000 * 60, // disconnect after 1 minute
    });

    // when a new socekt connection established 
    io.on('connection', (socket) => {
        console.log(`user connected: ${socket.id}`);
        let userId = null;

        // handle user connection and mark them online in db 
        socket.on('user_connected', async (connectingUserId) => {
            try {
                userId = connectingUserId;
                onlineUsers.set(userId, socket.id);
                socket.join(userId); // join a personal room for direct emits

                // update user status in db 
                await User.findOneAndUpdate(userId, {
                    isOnline: true,
                    lastSeen: new Date(),
                });

                // notify all the users that this user is online 
                io.emit('user_status', { userId, isOnline: true });
            } catch (error) {
                console.error('Error handling user connection : ', error);
            }
        })

        // return online status of requested user 
        socket.on('get_user_status', (requestedUserId, callback) => {
            const isOnline = onlineUsers.has(requestedUserId);
            callback({
                userId: requestedUserId,
                isOnline,
                lastSeen: isOnline ? new Date() : null,
            })
        })

        // forward message to receiver is online 
        socket.on('send_message', (message) => {
            try {
                const receiverSocketId = onlineUsers(message.user?._id);
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit('recieved message', message);
                }
            } catch (error) {
                console.error('Error sending message: ', error);
                socket.emit('message_error', { error: "Failed to send message" });
            }
        })

        // update message and notify sender 
        socket.on('message_read', async (messageIds, senderId) => {
            try {
                await Message.updateMany(
                    { _id: { $in: messageIds } },
                    { $set: { messageStatus: 'read' } }
                );
                const senderSocketId = onlineUsers(senderId);
                if (senderSocketId) {
                    messageIds.forEach((messageId) => {
                        io.to(senderSocketId).emit('message_status_update', {
                            messageId,
                            messageStatus: 'read',
                        })
                    })
                }
            } catch (error) {
                console.error('Error updating message read status : ', error);
            }
        })

        // handle typing event and auto stop after 3s 
        socket.on('typing_start', (conversationId, receiverId) => {
            if (!userId || !conversationId || !receiverId) return;
            if (!typingUsers.has(userId)) typingUsers.set(userId, {});
            const userTyping = typingUsers.get(userId);
            userTyping[conversationId] = true;

            // clear any existing timeout 
            if (userTyping[`${conversationId}_timeout`]) {
                clearTimeout(userTyping[`${conversationId}_timeout`]);
            }
            // auto stop after 3s 
            userTyping[`${conversationId}_timeout`] = setTimeout(() => {
                userTyping[conversationId] = false,
                    socket.io(receiverId).emit('user_typing', {
                        userId,
                        conversationId,
                        isTyping: false
                    })
            }, 3000);

            // notify receiver 
            socket.to(receiverId).emit('user_typing', {
                userId,
                conversationId,
                isOnline: true
            })
        })

        // stop users typing 
        socket.on('typing_stop', (conversationId, receiverId) => {
            if (!userId || !conversationId || !receiverId) return;
            if (typingUsers.has(userId)) {
                const userTyping = typingUsers.get(userId);
                userTyping[conversationId] = false;

                // clear any existing timeout 
                if (userTyping[`${conversationId}_timeout`]) {
                    clearTimeout(userTyping[`${conversationId}_timeout`]);
                    delete userTyping[`${conversationId}_timeout`];
                }

            }
            socket.to(receiverId).emit('user_typing', {
                userId,
                conversationId,
                isTyping: false
            })
        })

        // add or update reaction on message 
        socket.on('add_reaction', async (messageId, emoji, userId, reactionUserId) => {
            try {
                const message = await Message.findById(messageId);
                if (!message) return;
                const existingIndex = message.reactions.findIndex(
                    (r) => r.user.toString() === reactionUserId
                );

                if (existingIndex > -1) {
                    const existing = message.reactions(existingIndex);
                    if (existing.emoji === emoji) {
                        // remove same reaction 
                        message.reactions.splice(existingIndex, 1);
                    } else {
                        // change emoji 
                        message.reactions[existingIndex].emoji = emoji;
                    }
                } else {
                    // add new reaction 
                    message.reactions.push({ user: reactionUserId, emoji });
                }
                await message.save();
                const populatedMessage = await Message.findOne({ _id: message._id })
                    .populate('sender', 'username avatar')
                    .populate('receiver', 'username avatar')
                    .populate('reactions.user','username');

                const reactionUpdated = {
                    messageId,
                    reactions:populatedMessage.reactions,
                }

                const senderSocket = onlineUsers.get(populatedMessage.sender._id.toString());
                const receiverSocket = onlineUsers.get(populatedMessage.receiver._id.toString());

                if(senderSocket) io.to(senderSocket).emit('reaction_update',reactionUpdated);
                if(receiverSocket)io.to(receiverSocket).emit('reaction_updated',reactionUpdated);
            } catch (error) {
                console.error('Error handling reaction: ',error);
            }
        })

        // handle disconnection and mark user as a offline 
        const handleDisconnected = async () => {
            if(!userId)return;
            try {
                onlineUsers.delete(userId);

                // clear all typing timout
                if(typingUsers.has(userId)){
                    const userTyping = typingUsers.get(userId);
                    Object.keys(userTyping).forEach(key => {
                        if(key.endsWith('_timeout'))clearTimeout(userTyping[key]);
                    });
                    typingUsers.delete(userId);
                }

                // update user status in db
                await User.findOneAndUpdate(userId,{
                    isOnline:false,
                    lastSeen:new Date(),
                })

                io.emit('user_status',{
                    userId,
                    isOnline:false,
                    lastSeen:new Date(),
                });
                console.log(`user ${userId} is disconnected`);
                
            } catch (error) {
                console.error("Error handling disconnection ",error);
            }
        }
         
        // disconnect event 
        socket.on('disconnect',handleDisconnected);
    })
    // attach the online user map to the socket server for extenal user 

    io.socketUserMap = onlineUsers;
    return io;
}