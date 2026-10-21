import { Router, Response } from 'express';
import { db } from '../db/index.js';
import { users, otps } from '../db/schema.js';
import { eq, and, gt, desc, or } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendOtpEmail } from '../services/mailer.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { firebaseAdminAuth } from '../services/firebase-admin.js';

const router = Router();

// Helper: Normalize Philippine and international phone numbers for consistent deduplication
function normalizePhone(rawPhone?: string | null): { standard: string; e164: string } | null {
  if (!rawPhone) return null;
  const digits = String(rawPhone).replace(/\D/g, '');
  if (!digits) return null;

  let standard = digits;
  let e164 = digits;

  if (digits.startsWith('63') && digits.length === 12) {
    standard = '0' + digits.slice(2);
    e164 = '+' + digits;
  } else if (digits.startsWith('09') && digits.length === 11) {
    standard = digits;
    e164 = '+63' + digits.slice(1);
  } else if (digits.startsWith('9') && digits.length === 10) {
    standard = '0' + digits;
    e164 = '+63' + digits;
  }

  return { standard, e164 };
}

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

    if (typeof password !== 'string' || password.length < 8 || password.length > 12) {
      return res.status(400).json({
        success: false,
        message: 'Password must be between 8 and 12 characters long.',
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Check if email already exists
    const existing = await db.query.users.findFirst({
      where: eq(users.email, cleanEmail),
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    // 2. Check if phone number already exists (enforce unique phone numbers)
    const normalized = normalizePhone(phone);
    if (normalized) {
      const existingPhone = await db.query.users.findFirst({
        where: or(
          eq(users.phoneNumber, normalized.standard),
          eq(users.phoneNumber, normalized.e164),
          eq(users.phoneNumber, String(phone).trim())
        ),
      });

      if (existingPhone) {
        return res.status(400).json({
          success: false,
          message: 'This mobile phone number is already registered to another account.',
        });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with 'pending' status and default 'user' role
    const [newUser] = await db.insert(users).values({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: cleanEmail,
      phoneNumber: normalized ? normalized.standard : (phone ? phone.trim() : null),
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
    res.status(500).json({
      success: false,
      error: err.message,
      detail: err.cause?.message || err.detail,
    });
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

// =================================================================
// 8. UPDATE PROFILE (Name, Email, and optional Password)
// =================================================================
router.put('/profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const { name, firstName, lastName, email, currentPassword, newPassword } = req.body;

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    // Determine first and last name
    let newFirst = user.firstName;
    let newLast = user.lastName;

    if (firstName !== undefined && firstName !== null) {
      newFirst = String(firstName).trim();
    }
    if (lastName !== undefined && lastName !== null) {
      newLast = String(lastName).trim();
    }
    if (name && (!firstName && !lastName)) {
      const parts = String(name).trim().split(' ').filter(Boolean);
      newFirst = parts[0] || user.firstName;
      newLast = parts.slice(1).join(' ') || '';
    }

    // Determine email
    let newEmail = user.email;
    if (email && String(email).trim()) {
      const cleanEmail = String(email).toLowerCase().trim();
      if (cleanEmail !== user.email) {
        const existing = await db.query.users.findFirst({
          where: eq(users.email, cleanEmail),
        });
        if (existing && existing.id !== userId) {
          return res.status(400).json({
            success: false,
            message: 'This email is already in use by another account.',
          });
        }
        newEmail = cleanEmail;
      }
    }

    // Check and update password if provided
    let newPasswordHash = user.passwordHash;
    if (newPassword && String(newPassword).trim()) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is required to set a new password.',
        });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect.',
        });
      }
      if (String(newPassword).length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters long.',
        });
      }
      newPasswordHash = await bcrypt.hash(newPassword, 10);
    }

    await db.update(users)
      .set({
        firstName: newFirst,
        lastName: newLast,
        email: newEmail,
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    const updatedUser = {
      id: user.id,
      firstName: newFirst,
      lastName: newLast,
      name: `${newFirst} ${newLast}`.trim(),
      email: newEmail,
      role: user.role,
      isActive: user.isActive,
    };

    const token = jwt.sign(
      { id: user.id, email: newEmail, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      message: 'Profile updated successfully!',
      user: updatedUser,
      token,
    });
  } catch (err: any) {
    console.error('Update profile error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// =================================================================
// 8b. CHECK ACCOUNT AVAILABILITY (Pre-registration check)
// =================================================================
router.post('/check-availability', async (req, res: Response) => {
  try {
    const { email, phone } = req.body;
    if (!email && !phone) {
      return res.status(400).json({ success: false, message: 'Email or phone number is required.' });
    }

    if (email) {
      const cleanEmail = String(email).toLowerCase().trim();
      const existing = await db.query.users.findFirst({
        where: eq(users.email, cleanEmail),
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          field: 'email',
          message: 'An account with this email already exists.',
        });
      }
    }

    if (phone) {
      const normalized = normalizePhone(phone);
      if (normalized) {
        const existingPhone = await db.query.users.findFirst({
          where: or(
            eq(users.phoneNumber, normalized.standard),
            eq(users.phoneNumber, normalized.e164),
            eq(users.phoneNumber, String(phone).trim())
          ),
        });

        if (existingPhone) {
          return res.status(400).json({
            success: false,
            field: 'phone',
            message: 'This mobile phone number is already registered to another account.',
          });
        }
      }
    }

    return res.json({ success: true, message: 'Details are available.' });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message,
      detail: err.cause?.message || err.detail,
    });
  }
});

// =================================================================
// 9. REGISTER WITH VERIFIED FIREBASE PHONE TOKEN
// =================================================================
router.post('/register-with-phone', async (req, res: Response) => {
  try {
    const { firstName, lastName, email, phone, password, idToken } = req.body;

    if (!firstName || !lastName || !email || !password || !idToken) {
      return res.status(400).json({
        success: false,
        message: 'All fields (First name, Last name, Email, Password, and Phone Token) are required.',
      });
    }

    if (typeof password !== 'string' || password.length < 8 || password.length > 12) {
      return res.status(400).json({
        success: false,
        message: 'Password must be between 8 and 12 characters long.',
      });
    }

    const cleanEmail = String(email).toLowerCase().trim();

    // 1. Verify Firebase Phone Token
    const authAdmin = firebaseAdminAuth();
    if (!authAdmin) {
      return res.status(500).json({
        success: false,
        message: 'Firebase Admin authentication is not configured on the server.',
      });
    }

    let verifiedPhoneNumber: string | undefined;
    try {
      const decoded = await authAdmin.verifyIdToken(idToken);
      verifiedPhoneNumber = decoded.phone_number;
    } catch (tokenErr: any) {
      console.error('Firebase ID token verification failed:', tokenErr.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired phone verification code. Please try again.',
      });
    }

    // 2. Check if email already registered
    const existing = await db.query.users.findFirst({
      where: eq(users.email, cleanEmail),
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    // 3. Check if phone number already registered
    const targetPhone = verifiedPhoneNumber || (phone ? String(phone).trim() : '');
    const normalizedTarget = normalizePhone(targetPhone);
    if (normalizedTarget) {
      const existingPhone = await db.query.users.findFirst({
        where: or(
          eq(users.phoneNumber, normalizedTarget.standard),
          eq(users.phoneNumber, normalizedTarget.e164),
          eq(users.phoneNumber, targetPhone)
        ),
      });

      if (existingPhone) {
        return res.status(400).json({
          success: false,
          message: 'This mobile phone number is already registered to another account.',
        });
      }
    }

    // 4. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5. Create active user immediately (Phone is already verified via SMS!)
    const [newUser] = await db
      .insert(users)
      .values({
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        email: cleanEmail,
        phoneNumber: normalizedTarget ? normalizedTarget.standard : (targetPhone || null),
        passwordHash: hashedPassword,
        role: 'user',
        isActive: true,
      })
      .returning();

    // 5. Issue JWT token
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Account created and phone verified successfully!',
      user: {
        id: newUser.id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        name: `${newUser.firstName} ${newUser.lastName}`.trim(),
        email: newUser.email,
        phoneNumber: newUser.phoneNumber,
        role: newUser.role,
        isActive: newUser.isActive,
      },
      token,
    });
  } catch (err: any) {
    console.error('Register with phone error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;