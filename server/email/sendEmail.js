const axios = require("axios");

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM ;

async function sendVerificationEmail(toEmail, code) {
  try {
    const response = await axios.post(
      BREVO_API_URL,
      {
        sender: {
          name: "GameVault",
          email: EMAIL_FROM,
        },
        to: [
          {
            email: toEmail,
          },
        ],
        subject: "Your GameVault verification code",
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
              <h2 style="color: #333; margin-bottom: 16px;">Email Verification</h2>
              <p style="color: #555; font-size: 16px;">Your verification code:</p>
              <div style="
                font-size: 32px;
                font-weight: bold;
                letter-spacing: 8px;
                padding: 16px 24px;
                background: #111;
                color: #fff;
                display: inline-block;
                border-radius: 8px;
                margin: 20px 0;
                text-align: center;
              ">
                ${code}
              </div>
              <p style="color: #999; font-size: 14px; margin-top: 16px;">
                This code expires in 5 minutes.
              </p>
              <hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;">
              <p style="color: #999; font-size: 12px;">
                If you didn't request this code, please ignore this email.
              </p>
            </div>
          </div>
        `,
      },
      {
        headers: {
          "api-key": BREVO_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Verification email sent to:", toEmail);
    return response.data;
  } catch (error) {
    console.error("❌ Brevo API error:", error.response?.data || error.message);
    throw new Error(
      `Failed to send verification email: ${error.response?.data?.message || error.message}`
    );
  }
}

async function sendResetPasswordEmail(toEmail, code) {
  try {
    const response = await axios.post(
      BREVO_API_URL,
      {
        sender: {
          name: "GameVault",
          email: EMAIL_FROM,
        },
        to: [
          {
            email: toEmail,
          },
        ],
        subject: "GameVault password reset code",
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
              <h2 style="color: #333; margin-bottom: 16px;">Password Reset</h2>
              <p style="color: #555; font-size: 16px;">Your reset code:</p>
              <div style="
                font-size: 32px;
                font-weight: bold;
                letter-spacing: 8px;
                padding: 16px 24px;
                background: #111;
                color: #fff;
                display: inline-block;
                border-radius: 8px;
                margin: 20px 0;
                text-align: center;
              ">
                ${code}
              </div>
              <p style="color: #999; font-size: 14px; margin-top: 16px;">
                This code expires in 5 minutes.
              </p>
              <hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;">
              <p style="color: #999; font-size: 12px;">
                If you didn't request a password reset, please ignore this email.
              </p>
            </div>
          </div>
        `,
      },
      {
        headers: {
          "api-key": BREVO_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Password reset email sent to:", toEmail);
    return response.data;
  } catch (error) {
    console.error("❌ Brevo API error:", error.response?.data || error.message);
    throw new Error(
      `Failed to send reset email: ${error.response?.data?.message || error.message}`
    );
  }
}

module.exports = {
  sendVerificationEmail,
  sendResetPasswordEmail,
};