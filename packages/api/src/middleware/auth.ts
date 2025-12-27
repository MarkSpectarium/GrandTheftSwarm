import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    githubUsername: string;
  };
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
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
  } catch (error) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid token',
    });
  }
}

export function createToken(user: { id: string; githubUsername: string }): string {
  return jwt.sign(
    { id: user.id, githubUsername: user.githubUsername },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}
