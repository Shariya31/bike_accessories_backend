import express from 'express'
import { createMedia, getMedia } from '../controllers/media.js';
import { isAuthenticated } from '../middlewares/isAuthenticated.js';
import { isAuthorized } from '../middlewares/isAuthorized.js';
import { ROLES } from '../constants/roles.js';

const router = express();

router.post('/create', isAuthenticated, isAuthorized(ROLES.ADMIN, ROLES.USER), createMedia)
router.get('/get-media', isAuthenticated, isAuthorized(ROLES.ADMIN, ROLES.USER), getMedia)

export default router;