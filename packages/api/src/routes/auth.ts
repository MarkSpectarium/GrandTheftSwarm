import { Router, type Request, type Response } from 'express';
import { db, schema } from '../db/client';
import { eq } from 'drizzle-orm';
import { createToken, authMiddleware, type AuthenticatedRequest } from '../middleware/auth';

export const authRouter: Router = Router();

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

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

// Redirect to GitHub OAuth
authRouter.get('/github', (_req: Request, res: Response) => {
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: `${process.env.API_URL || 'http://localhost:3001'}/api/auth/github/callback`,
    scope: 'read:user user:email',
  });

  res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
});

// GitHub OAuth callback
authRouter.get('/github/callback', async (req: Request, res: Response) => {
  const { code } = req.query;

  if (!code || typeof code !== 'string') {
    return res.redirect(`${CLIENT_URL}?error=no_code`);
  }

  try {
    // Exchange code for access token
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

    // Get user info from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json',
      },
    });

    const githubUser = await userResponse.json() as GitHubUser;

    // Get user email
    const emailResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json',
      },
    });

    const emails = await emailResponse.json() as GitHubEmail[];
    const primaryEmail = emails.find((e) => e.primary)?.email || null;

    // Upsert user in database
    const userId = String(githubUser.id);
    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });

    if (existingUser) {
      // Update existing user
      await db.update(schema.users)
        .set({
          githubUsername: githubUser.login,
          email: primaryEmail,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, userId));
    } else {
      // Create new user
      await db.insert(schema.users).values({
        id: userId,
        githubUsername: githubUser.login,
        email: primaryEmail,
      });
    }

    // Create JWT token
    const token = createToken({
      id: userId,
      githubUsername: githubUser.login,
    });

    // Redirect back to client with token
    res.redirect(`${CLIENT_URL}?token=${token}`);
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    res.redirect(`${CLIENT_URL}?error=oauth_failed`);
  }
});

// Get current user
authRouter.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
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

// Logout (client-side, just for cleanup)
authRouter.post('/logout', (_req: Request, res: Response) => {
  res.json({ success: true });
});
