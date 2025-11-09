import { Router } from 'express';
import passport from 'passport';

const router = Router();

// Start Google OAuth flow
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google OAuth callback
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/?error=auth_failed' }),
  (req, res) => {
    // Successful authentication, redirect to home
    console.log('Auth callback - Session ID:', req.sessionID);
    console.log('Auth callback - IsAuthenticated:', req.isAuthenticated());
    console.log('Auth callback - User:', req.user);
    console.log('Auth callback - Session:', req.session);
    res.redirect('/?auth=success');
  }
);

// Logout route
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

// Get current user info
router.get('/me', (req, res) => {
  console.log('Auth /me - Session ID:', req.sessionID);
  console.log('Auth /me - IsAuthenticated:', req.isAuthenticated());
  console.log('Auth /me - User:', req.user);
  console.log('Auth /me - Session:', req.session);
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

export default router;