import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from './db.js';

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRY = '7d';

export interface UserPayload {
  id: string;
  email: string;
  name: string | null;
}

export async function register(email: string, password: string, name?: string): Promise<{ user: UserPayload; token: string }> {
  // Check if user exists
  const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (existing.rows.length > 0) {
    throw new Error('Email already registered');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const result = await query(
    'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name',
    [email.toLowerCase(), passwordHash, name || null]
  );

  const user = result.rows[0];
  const token = generateToken(user);

  return { user, token };
}

export async function login(email: string, password: string): Promise<{ user: UserPayload; token: string }> {
  const result = await query(
    'SELECT id, email, name, password_hash FROM users WHERE email = $1',
    [email.toLowerCase()]
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid email or password');
  }

  const user = result.rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);

  if (!valid) {
    throw new Error('Invalid email or password');
  }

  const token = generateToken({ id: user.id, email: user.email, name: user.name });
  return { user: { id: user.id, email: user.email, name: user.name }, token };
}

export async function getUserById(id: string): Promise<UserPayload | null> {
  const result = await query(
    'SELECT id, email, name FROM users WHERE id = $1', [id]
  );
  return result.rows[0] || null;
}

function generateToken(user: UserPayload): string {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): { id: string; email: string } {
  return jwt.verify(token, JWT_SECRET) as { id: string; email: string };
}
