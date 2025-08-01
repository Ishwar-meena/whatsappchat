import mongoose from "mongoose";

const statusSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    contentType: { type: String, enum: ['text', 'image', 'video'], default: 'text' },
    viewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    expiresAt: { type: Date, required: true },
},
    {
        timestamps: true,
    }
);
const Status = mongoose.model('Status', statusSchema);
export default Status;