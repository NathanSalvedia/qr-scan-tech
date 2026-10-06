import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const emailUser = (process.env.EMAIL_USER || '').trim();
const emailPass = (process.env.EMAIL_PASS || '').trim();

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: emailUser,
    pass: emailPass,
  },
});

// Function to send branded 6-digit OTP email
export async function sendOtpEmail(
  toEmail: string,
  otpCode: string,
  mode: 'verification' | 'reset' = 'verification'
) {
  const isReset = mode === 'reset';
  const subject = isReset
    ? '🔐 Password Reset Code - QR Scan Tech'
    : '✉️ Verify Your Email - QR Scan Tech';

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; background-color: #f0f3f6; padding: 30px; color: #0f172a;">
      <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 25px;">
          <div style="display: inline-block; background-color: #4d6029; color: #ffffff; width: 50px; height: 50px; line-height: 50px; border-radius: 12px; font-size: 24px; font-weight: bold;">
            QR
          </div>
          <h2 style="color: #0f172a; margin-top: 15px; margin-bottom: 5px;">${isReset ? 'Reset Your Password' : 'Verify Your Email'}</h2>
          <p style="color: #64748b; font-size: 14px; margin: 0;">Use the 6-digit verification code below:</p>
        </div>

        <!-- 6-Digit OTP Code Card -->
        <div style="background-color: #f8fafc; border: 2px dashed #4d6029; border-radius: 12px; text-align: center; padding: 20px; margin: 20px 0;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #4d6029;">
            ${otpCode}
          </span>
        </div>

        <p style="color: #64748b; font-size: 13px; text-align: center;">
          ⏱️ This code will expire in <strong>10 minutes</strong>.
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;" />

        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
          If you did not request this code, please ignore this email.
        </p>
      </div>
    </div>
  `;

  // Plain text fallback (Crucial: Spam filters penalize HTML-only emails)
  const textContent = isReset
    ? `Your QR Scan Tech password reset code is: ${otpCode}\n\nThis code will expire in 10 minutes.\nIf you did not request this, please ignore this email.`
    : `Your QR Scan Tech email verification code is: ${otpCode}\n\nThis code will expire in 10 minutes.\nIf you did not create an account, please ignore this email.`;

  const mailOptions = {
    from: `"QR Scan Tech" <${emailUser}>`,
    to: toEmail.trim(),
    subject: isReset
      ? 'QR Scan Tech - Password Reset Code'
      : 'QR Scan Tech - Email Verification Code',
    text: textContent,
    html: htmlContent,
    headers: {
      'X-Priority': '1 (Highest)',
      'X-MSMail-Priority': 'High',
      Importance: 'High',
    },
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent successfully to ${toEmail} (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('❌ Failed to send email via Gmail:', error);
    return { success: false, error: error.message };
  }
}
