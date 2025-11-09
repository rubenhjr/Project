import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

export interface User {
  id: string;
  googleId: string;
  email: string;
  name: string;
  picture?: string;
}

// In-memory user store (in production, use MongoDB)
const users: User[] = [];

export function configureAuth() {
  // Serialize user for session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser((id: string, done) => {
    const user = users.find(u => u.id === id);
    done(null, user || null);
  });

  // Google OAuth Strategy
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:3000/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists
      let user = users.find(u => u.googleId === profile.id);
      
      if (user) {
        return done(null, user);
      }

      // Create new user
      user = {
        id: profile.id,
        googleId: profile.id,
        email: profile.emails?.[0]?.value || '',
        name: profile.displayName || '',
        picture: profile.photos?.[0]?.value
      };

      users.push(user);
      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  }));
}

// Middleware to check if user is authenticated
export function requireAuth(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
}

// Middleware to get current user (optional auth)
export function getCurrentUser(req: any): User | null {
  return req.user || null;
}