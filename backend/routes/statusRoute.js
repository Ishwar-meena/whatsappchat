import express from 'express';
import { authMiddlerware } from '../middlerwares/authMiddlerware.js';
import { multerMiddlerware } from '../config/cloudinaryConfig.js';
import { createStatus, deleteStatus, getStatus, viewStatus } from '../controllers/statusController.js';

const router = express.Router();

router.post('/',authMiddlerware,multerMiddlerware,createStatus);
router.get('/',authMiddlerware,getStatus);
router.put('/:statusId/view',authMiddlerware,viewStatus);
router.delete('/:statusId',authMiddlerware,deleteStatus);

export default router;