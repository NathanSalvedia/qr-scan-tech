import { Router, Response } from 'express';
import { db } from '../db/index.js';
import { users, otps } from '../db/schema.js';
import { eq, and, gt, desc } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendOtpEmail } from '../services/mailer.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Helper: Generate a random 6-digit OTP string
const generate6DigitCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// =================================================================
// 1. REGISTER (Sign Up)
// =================================================================
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, email, and password are required.',
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existing = await db.query.users.findFirst({
      where: eq(users.email, cleanEmail),
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with 'pending' status and default 'user' role
    const [newUser] = await db.insert(users).values({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: cleanEmail,
      phoneNumber: phone ? phone.trim() : null,
      passwordHash: hashedPassword,
      role: 'user',        
      isActive: false,     
    }).returning();

    // Generate 6-digit OTP (Expires in 10 minutes)
    const otpCode = generate6DigitCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.insert(otps).values({
      email: cleanEmail,
      otpCode,
      mode: 'verification',
      expiresAt,
    });

    console.log(`🔑 [OTP GENERATED] Code for ${cleanEmail}: ${otpCode}`);

    // Send real email via Gmail
    await sendOtpEmail(cleanEmail, otpCode, 'verification');

    res.status(201).json({
      success: true,
      message: 'Account created. A 6-digit verification code has been sent to your email.',
      email: cleanEmail,
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =================================================================
// 2. VERIFY OTP (Email verification & Account activation)
// =================================================================
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otpCode, mode } = req.body;

    if (!email || !otpCode) {
      return res.status(400).json({
        success: false,
        message: 'Email and 6-digit OTP code are required.',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const targetMode = mode || 'verification';

    // Find valid, unused, unexpired OTP record
    const otpRecord = await db.query.otps.findFirst({
      where: and(
        eq(otps.email, cleanEmail),
        eq(otps.otpCode, otpCode.trim()),
        eq(otps.mode, targetMode),
        eq(otps.isUsed, false),
        gt(otps.expiresAt, new Date())
      ),
      orderBy: [desc(otps.createdAt)],
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code. Please try again or request a new code.',
      });
    }

    // Mark OTP as used
    await db.update(otps).set({ isUsed: true }).where(eq(otps.id, otpRecord.id));

    if (targetMode === 'reset') {
      return res.json({
        success: true,
        message: 'Verification code confirmed. You can now set your new password.',
        email: cleanEmail,
      });
    }

    // Activate user account for registration verification
    const [updatedUser] = await db.update(users)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(users.email, cleanEmail))
      .returning();

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Generate JWT Token
    const token = jwt.sign(
      { id: updatedUser.id, email: updatedUser.email, role: updatedUser.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Email verified successfully!',
      user: {
        id: updatedUser.id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        name: `${updatedUser.firstName} ${updatedUser.lastName}`,
        email: updatedUser.email,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
      },
      token,
    });
  } catch (err: any) {
    console.error('OTP verification error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =================================================================
// 3. RESEND OTP
// =================================================================
router.post('/resend-otp', async (req, res) => {
  try {
    const { email, mode } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const targetMode = mode || 'verification';

    // Invalidate previous unused codes
    await db.update(otps)
      .set({ isUsed: true })
      .where(and(eq(otps.email, cleanEmail), eq(otps.mode, targetMode), eq(otps.isUsed, false)));

    // Generate new OTP
    const otpCode = generate6DigitCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.insert(otps).values({
      email: cleanEmail,
      otpCode,
      mode: targetMode,
      expiresAt,
    });

    console.log(`🔑 [OTP RESENT] New code for ${cleanEmail}: ${otpCode}`);

    // Send email
    await sendOtpEmail(cleanEmail, otpCode, targetMode as any);

    res.json({
      success: true,
      message: 'A new 6-digit verification code has been sent to your email.',
    });
  } catch (err: any) {
    console.error('Resend OTP error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =================================================================
// 4. LOGIN (Sign In)
// =================================================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    const user = await db.query.users.findFirst({
      where: eq(users.email, cleanEmail),
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Generate JWT Token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful!',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
      token,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =================================================================
// 5. FORGOT PASSWORD (Request Reset OTP)
// =================================================================
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    const user = await db.query.users.findFirst({
      where: eq(users.email, cleanEmail),
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this email.' });
    }

    // Invalidate older unused reset codes
    await db.update(otps)
      .set({ isUsed: true })
      .where(and(eq(otps.email, cleanEmail), eq(otps.mode, 'reset'), eq(otps.isUsed, false)));

    // Generate new OTP
    const otpCode = generate6DigitCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.insert(otps).values({
      email: cleanEmail,
      otpCode,
      mode: 'reset',
      expiresAt,
    });

    console.log(`🔑 [PASSWORD RESET OTP] Code for ${cleanEmail}: ${otpCode}`);

    // Send email
    await sendOtpEmail(cleanEmail, otpCode, 'reset');

    res.json({
      success: true,
      message: 'A 6-digit password reset code has been sent to your email.',
      email: cleanEmail,
    });
  } catch (err: any) {
    console.error('Forgot password error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =================================================================
// 6. RESET PASSWORD (Set New Password)
// =================================================================
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otpCode, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email and new password are required.',
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // If otpCode is provided, verify it
    if (otpCode) {
      const otpRecord = await db.query.otps.findFirst({
        where: and(
          eq(otps.email, cleanEmail),
          eq(otps.otpCode, otpCode.trim()),
          eq(otps.mode, 'reset'),
          eq(otps.isUsed, false),
          gt(otps.expiresAt, new Date())
        ),
        orderBy: [desc(otps.createdAt)],
      });

      if (!otpRecord) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired password reset code.',
        });
      }

      await db.update(otps).set({ isUsed: true }).where(eq(otps.id, otpRecord.id));
    } else {
      // Check user existence
      const user = await db.query.users.findFirst({
        where: eq(users.email, cleanEmail),
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'No account found with this email address.',
        });
      }
    }

    // Hash new password and update user
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.update(users)
      .set({ passwordHash: hashedPassword, updatedAt: new Date() })
      .where(eq(users.email, cleanEmail));

    res.json({
      success: true,
      message: 'Password reset successfully! You can now sign in with your new password.',
    });
  } catch (err: any) {
    console.error('Reset password error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =================================================================
// 7. CHANGE PASSWORD (Authenticated Session)
// =================================================================
router.post('/change-password', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required.',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.',
      });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect. Please try again.',
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.update(users)
      .set({ passwordHash: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, userId));

    return res.json({
      success: true,
      message: 'Password successfully updated!',
    });
  } catch (err: any) {
    console.error('Change password error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;