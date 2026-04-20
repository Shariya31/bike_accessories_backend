import express from 'express'
import { createMedia, deleteMedia, getMedia, getMediaById, updateMedia, updateMediaStatus } from '../controllers/media.js';
import { isAuthenticated } from '../middlewares/isAuthenticated.js';
import { isAuthorized } from '../middlewares/isAuthorized.js';
import { ROLES } from '../constants/roles.js';

const router = express();

router.post('/create', isAuthenticated, isAuthorized(ROLES.ADMIN), createMedia);
router.get('/get-media', isAuthenticated, isAuthorized(ROLES.ADMIN), getMedia);

// To soft delete or restore the media
router.put('/update-status', isAuthenticated, isAuthorized(ROLES.ADMIN), updateMediaStatus)

//Permanently delete the media
router.delete('/delete', isAuthenticated, isAuthorized(ROLES.ADMIN), deleteMedia)

//Get Media By Id
router.get('/get-media/:id', isAuthenticated, isAuthorized(ROLES.ADMIN), getMediaById)

router.put('/update-media', isAuthenticated, isAuthorized(ROLES.ADMIN), updateMedia)

export default router;