import mongoose from "mongoose";
const conversationSchema = new mongoose.Schema(
    {
        participants : [{type:mongoose.Schema.Types.ObjectId,ref:'User'}],
        lastMessage:{type:mongoose.Schema.Types.ObjectId,ref:'Message'},
        unreadCount:{type:Number,default:0},
    },
    {
        timestamps:true,
    }
);
export const Conversation = mongoose.model('Conversation',conversationSchema);