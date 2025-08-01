import { response } from "../utils/responseHandler.js";
import { uploadFileToCloudinary } from "../config/cloudinaryConfig.js";
import Status from "../models/Status.js";


// this function create users status
export const createStatus = async (req, res) => {
    const { content, contentType } = req.body;
    const file = req.file;
    const userId = req.user.userId;

    let mediaUrl = null;
    let finalContentType = contentType | null;
    try {
        // handle file 
        if (file) {
            const uploadFile = await uploadFileToCloudinary(file);
            if (!uploadFile?.secure_url) {
                return response(res, 400, 'Failed to save file');
            }
            mediaUrl = uploadFile.secure_url;
            if (file.mimeType.startWith('image')) {
                finalContentType = 'image';
            } else if (file.mimeType.startWith('video')) {
                finalContentType = 'video'
            } else {
                return response(res, 400, 'Unsopported file type');
            }
        } else if (content?.trim()) {
            finalContentType = 'text';
        } else {
            return response(res, 400, 'Message is required');
        }
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        const status = new Status({
            user: userId,
            content: mediaUrl || content,
            contentType: finalContentType,
            expiresAt
        })
        await status.save();
        const populatedStatus = await Status.findOne(status?._id)
            .populate('user', 'username avatar')
            .populate('viewers', 'username avatar');

        // emit socket event 
        if (req.io && req.sockerUserMap) {
            // broadcast to all connecting user except creator 
            for (const [connectedUserId, socketId] of req.sockerUserMap) {
                if (connectedUserId !== userId) {
                    req.io.to(socketId).emit('new_status', populatedStatus);
                }
            }
        }
        return response(res, 201, 'Status created successfully', populatedStatus);
    } catch (error) {
        console.error(error);
        return response(res, 500, 'Internal server error');
    }
}

// fetch all the status
export const getStatus = async (req, res) => {
    try {
        const status = await Status.find({
            expiresAt: { $gt: new Date() }
        })
            .populate('user', 'username avatar')
            .populate('viewers', 'username avatar')
            .sort({ createdAt: -1 });
        if (status.length === 0) {
            return response(res, 404, 'Status not exist');
        }
        return response(res, 200, 'successfully fetch statuses', status);
    } catch (error) {
        console.error(error);
        return response(res, 500, 'Internal server error');
    }
}

// view status
export const viewStatus = async (req, res) => {
    const { statusId } = req.params;
    const userId = req.user.userId;

    if (!statusId || !userId) {
        return response(res, 403, 'Access Denied');
    }
    try {
        const status = await Status.findById(statusId);
        if (!status) {
            return response(res, 404, 'Status not found');
        }

        if (!status.viewers.includes(userId)) {
            status.viewers.push(userId);
            await status.save();

            const updatedStatus = await Status.findById(statusId)
                .populate('user', 'username avatar')
                .populate('viewers', 'username avatar');

            if (req.io && req.sockerUserMap) {
                const statusOwnerUserId = req.sockerUserMap.get(status.user._id.toString());
                if (statusOwnerUserId) {
                    const viewData = {
                        statusId,
                        viewerId: userId,
                        totalViewers: updatedStatus.viewers.length,
                        viewers: updatedStatus.viewers
                    }
                    req.io.to(statusOwnerUserId).emit('status_viewed', viewData);
                } else {
                    console.log('status owner not connected');
                }
            }
        } else {
            console.log("status already view successfully");
        }
        return response(res, 200, 'status view successfully');
    } catch (error) {
        console.error(error);
        return response(res, 500, 'Internal server error');
    }
}

// delete a status 
export const deleteStatus = async (req, res) => {
    const { statusId } = req.params;
    const userId = req.user.userId;
    if (!statusId || !userId) {
        return response(res, 403, 'Access Denied');
    }
    try {
        const status = await Status.findById(statusId);
        if (!status) {
            return response(res, 404, 'status not found');
        }
        if (status.user.toString() !== userId) {
            return response(res, 403, 'Access Denied');
        }
        await status.deleteOne();
        // emit socket event 
        if (req.io && req.sockerUserMap) {
            // broadcast to all connecting user except creator 
            for (const [connectedUserId, socketId] of req.sockerUserMap) {
                if (connectedUserId !== userId) {
                    req.io.to(socketId).emit('status_deleted', statusId);
                }
            }
        }
        return response(res, 200, 'status deleted successfully', status);
    } catch (error) {
        console.error(error);
        return response(res, 500, 'Internal server error');
    }
}