import type { VercelRequest, VercelResponse } from '@vercel/node';
import express, { type Express } from 'express';
import cors from 'cors';

// Import routes and middleware from the API package
// Note: In Vercel, we rebuild the app here to avoid module resolution issues
const app: Express = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'https://your-app.vercel.app',
  credentials: true,
}));
app.use(express.json());

// ============ Auth Middleware ============
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';

interface AuthenticatedRequest extends express.Request {
  user?: {
    id: string;
    githubUsername: string;
  };
}

function authMiddleware(req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'No token provided',
    });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      githubUsername: string;
    };

    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid token',
    });
  }
}

function createToken(user: { id: string; githubUsername: string }): string {
  return jwt.sign(
    { id: user.id, githubUsername: user.githubUsername },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

// ============ Database ============
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { eq, desc } from 'drizzle-orm';

const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  githubUsername: text('github_username').notNull(),
  email: text('email'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

const saves = sqliteTable('saves', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  version: text('version').notNull(),
  data: text('data').notNull(),
  checksum: text('checksum').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

const schema = { users, saves };

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const db = drizzle(client, { schema });

// ============ GitHub OAuth Types ============
interface GitHubTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GitHubUser {
  id: number;
  login: string;
  email?: string;
}

interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';
const CLIENT_URL = process.env.CLIENT_URL || 'https://your-app.vercel.app';
const API_URL = process.env.API_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3001');

// ============ Routes ============

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// GitHub OAuth - Redirect
app.get('/api/auth/github', (_req, res) => {
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: `${API_URL}/api/auth/github/callback`,
    scope: 'read:user user:email',
  });

  res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
});

// GitHub OAuth - Callback
app.get('/api/auth/github/callback', async (req, res) => {
  const { code } = req.query;

  if (!code || typeof code !== 'string') {
    return res.redirect(`${CLIENT_URL}?error=no_code`);
  }

  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenResponse.json() as GitHubTokenResponse;

    if (tokenData.error || !tokenData.access_token) {
      console.error('GitHub OAuth error:', tokenData);
      return res.redirect(`${CLIENT_URL}?error=oauth_failed`);
    }

    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json',
      },
    });

    const githubUser = await userResponse.json() as GitHubUser;

    const emailResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json',
      },
    });

    const emails = await emailResponse.json() as GitHubEmail[];
    const primaryEmail = emails.find((e) => e.primary)?.email || null;

    const userId = String(githubUser.id);
    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });

    if (existingUser) {
      await db.update(schema.users)
        .set({
          githubUsername: githubUser.login,
          email: primaryEmail,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.users.id, userId));
    } else {
      await db.insert(schema.users).values({
        id: userId,
        githubUsername: githubUser.login,
        email: primaryEmail,
      });
    }

    const token = createToken({
      id: userId,
      githubUsername: githubUser.login,
    });

    res.redirect(`${CLIENT_URL}?token=${token}`);
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    res.redirect(`${CLIENT_URL}?error=oauth_failed`);
  }
});

// Get current user
app.get('/api/auth/me', authMiddleware, async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, req.user.id),
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        githubUsername: user.githubUsername,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Logout
app.post('/api/auth/logout', (_req, res) => {
  res.json({ success: true });
});

// Save game state
app.post('/api/saves', authMiddleware, async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { version, data, checksum } = req.body;

  if (!version || !data || !checksum) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Missing required fields: version, data, checksum',
    });
  }

  try {
    const existingSave = await db.query.saves.findFirst({
      where: eq(schema.saves.userId, req.user.id),
      orderBy: [desc(schema.saves.updatedAt)],
    });

    const saveId = existingSave?.id || crypto.randomUUID();
    const now = new Date().toISOString();

    if (existingSave) {
      await db.update(schema.saves)
        .set({
          version,
          data: JSON.stringify(data),
          checksum,
          updatedAt: now,
        })
        .where(eq(schema.saves.id, existingSave.id));
    } else {
      await db.insert(schema.saves).values({
        id: saveId,
        userId: req.user.id,
        version,
        data: JSON.stringify(data),
        checksum,
      });
    }

    res.json({
      success: true,
      save: {
        id: saveId,
        userId: req.user.id,
        version,
        checksum,
        createdAt: existingSave?.createdAt || now,
        updatedAt: now,
      },
    });
  } catch (error) {
    console.error('Error saving game:', error);
    res.status(500).json({ error: 'Failed to save game' });
  }
});

// Load game state
app.get('/api/saves/current', authMiddleware, async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const save = await db.query.saves.findFirst({
      where: eq(schema.saves.userId, req.user.id),
      orderBy: [desc(schema.saves.updatedAt)],
    });

    if (!save) {
      return res.json({
        success: true,
        save: null,
      });
    }

    res.json({
      success: true,
      save: {
        id: save.id,
        userId: save.userId,
        version: save.version,
        data: JSON.parse(save.data),
        checksum: save.checksum,
        createdAt: save.createdAt,
        updatedAt: save.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error loading game:', error);
    res.status(500).json({ error: 'Failed to load game' });
  }
});

// Error handling
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

// Vercel serverless handler
export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req as unknown as express.Request, res as unknown as express.Response);
}
