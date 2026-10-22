import dotenv from "dotenv";
import path from "path";
import { Resend } from "resend";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const resendApiKey = (process.env.RESEND_API_KEY || "").trim();
const fromEmail = (
  process.env.RESEND_FROM_EMAIL || "ScanOps <onboarding@resend.dev>"
).trim();

const resend = new Resend(resendApiKey);

// Function to send branded 6-digit OTP email via Resend
export async function sendOtpEmail(
  toEmail: string,
  otpCode: string,
  mode: "verification" | "reset" = "verification",
) {
  const isReset = mode === "reset";
  const subject = isReset
    ? "ScanOps - Password Reset Code"
    : "ScanOps - Email Verification Code";

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; background-color: #f0f3f6; padding: 30px; color: #0f172a;">
      <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 25px;">
          <div style="display: inline-block; background-color: #4d6029; color: #ffffff; padding: 8px 18px; border-radius: 12px; font-size: 20px; font-weight: bold; letter-spacing: 0.5px;">
            ScanOps
          </div>
          <h2 style="color: #0f172a; margin-top: 15px; margin-bottom: 5px;">${isReset ? "Reset Your Password" : "Verify Your Email"}</h2>
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

  const textContent = isReset
    ? `Your ScanOps password reset code is: ${otpCode}\n\nThis code will expire in 10 minutes.\nIf you did not request this, please ignore this email.`
    : `Your ScanOps email verification code is: ${otpCode}\n\nThis code will expire in 10 minutes.\nIf you did not create an account, please ignore this email.`;

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [toEmail.trim()],
      subject,
      html: htmlContent,
      text: textContent,
    });

    if (error) {
      console.error("❌ Failed to send email via Resend:", error);
      return { success: false, error: error.message };
    }

    console.log(
      `📧 Email sent successfully to ${toEmail} via Resend (ID: ${data?.id})`,
    );
    return { success: true, messageId: data?.id };
  } catch (error: any) {
    console.error("❌ Resend exception:", error);
    return { success: false, error: error.message };
  }
}
