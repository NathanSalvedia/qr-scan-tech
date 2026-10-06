import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthUserPayload {
  id: string;
  email: string;
  role: 'user' | 'admin';
}

// Extend Express Request interface to include user
export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
}

/**
 * 1. requireAuth Middleware
 * Verifies JWT token from Authorization header (Bearer <token>)
 */
export const requireAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access Denied: No authorization token provided.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'secret'
    ) as AuthUserPayload;

    req.user = decoded;
    next();
  } catch (err: any) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token. Please log in again.',
    });
  }
};

/**
 * 2. requireRole / requireAdmin Middleware (RBAC)
 * Ensures only users with the required role can proceed
 */
export const requireRole = (allowedRole: 'user' | 'admin') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Authentication required.',
      });
    }

    if (req.user.role !== allowedRole) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: This action requires '${allowedRole}' privileges.`,
      });
    }

    next();
  };
};

/**
 * Convenience helper for Admin-only routes
 */
export const requireAdmin = [requireAuth, requireRole('admin')];
