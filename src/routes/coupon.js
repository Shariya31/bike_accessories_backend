import express from 'express'
import { isAuthenticated } from '../middlewares/isAuthenticated.js';
import { isAuthorized } from '../middlewares/isAuthorized.js';
import { ROLES } from '../constants/roles.js';
import { createCoupon, deleteCoupon, exportCoupon, getAllCoupons, getCouponById, updateCoupon, updateCouponStatus } from '../controllers/coupon.js';

const router = express();
router.get('/', isAuthenticated, isAuthorized(ROLES.ADMIN), getAllCoupons)
router.post('/create', isAuthenticated, isAuthorized(ROLES.ADMIN), createCoupon)
router.put('/update', isAuthenticated, isAuthorized(ROLES.ADMIN), updateCoupon)
router.get('/get-coupon/:id', isAuthenticated, isAuthorized(ROLES.ADMIN), getCouponById)
router.put('/update-status', isAuthenticated, isAuthorized(ROLES.ADMIN), updateCouponStatus);
router.delete('/delete', isAuthenticated, isAuthorized(ROLES.ADMIN), deleteCoupon)
router.get('/export', isAuthenticated, isAuthorized(ROLES.ADMIN), exportCoupon)

export default router;