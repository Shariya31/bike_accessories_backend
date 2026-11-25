import express from 'express'
import { isAuthenticated } from '../middlewares/isAuthenticated.js';
import { isAuthorized } from '../middlewares/isAuthorized.js';
import { ROLES } from '../constants/roles.js';
import { createCoupon, getAllCoupons, getCouponById, updateCoupon } from '../controllers/coupon.js';

const router = express();
router.get('/', isAuthenticated, isAuthorized(ROLES.ADMIN), getAllCoupons)
router.post('/create', isAuthenticated, isAuthorized(ROLES.ADMIN), createCoupon)
router.put('/update', isAuthenticated, isAuthorized(ROLES.ADMIN), updateCoupon)
router.get('/get-coupon/:id', isAuthenticated, isAuthorized(ROLES.ADMIN), getCouponById)


export default router;