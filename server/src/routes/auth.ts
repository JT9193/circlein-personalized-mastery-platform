import { Router, Request, Response } from 'express';
import { register, login, getUserById } from '../services/auth.js';
import { requireAuth } from '../middleware/auth.js';

export const authRoutes = Router();

// Register
authRoutes.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password required' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }
    const result = await register(email, password, name);
    res.status(201).json(result);
  } catch (err: any) {
    if (err.message === 'Email already registered') {
      res.status(409).json({ error: err.message });
    } else {
      console.error('Register error:', err);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
});

// Login
authRoutes.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password required' });
      return;
    }
    const result = await login(email, password);
    res.json(result);
  } catch (err: any) {
    if (err.message === 'Invalid email or password') {
      res.status(401).json({ error: err.message });
    } else {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Login failed' });
    }
  }
});

// Get current user
authRoutes.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const user = await getUserById(userId);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json(user);
  } catch (err) {
    console.error('Auth me error:', err);
    res.status(500).json({ error: 'Failed to get user' });
  }
});
