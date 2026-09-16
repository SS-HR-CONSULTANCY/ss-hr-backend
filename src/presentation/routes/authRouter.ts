import { Router } from 'express';
import passport from '../../infrastructure/auth/passport';
import { authMiddleware } from '../middleware/authMiddleware';
import { authController } from '../controllers/authController';

const router = Router();

router.post('/register', authController.register);

router.post('/verify-otp', authController.verifyOTP);

router.post('/resendOtp', authController.resendOtp);

router.post('/login', authController.login);

router.post('/logout', authController.logout);

router.post('/verify-email', authController.verifyEmail);

router.patch('/update-password', authController.updatePassword);

router.get('/checkUserStatus',authMiddleware, authController.checkUserStatus);

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

router.get('/google/callback',passport.authenticate('google', { failureRedirect: '/login', session: false }),authController.googleCallback);

export default router;