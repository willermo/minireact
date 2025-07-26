// backend/src/services/email.service.ts
import nodemailer from "nodemailer";
import { FastifyBaseLogger } from "fastify";

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

let transporter: nodemailer.Transporter;

const FRONTEND_URL =
  process.env.NODE_ENV === "development"
    ? process.env.FRONTEND_HTTPS_URL
    : process.env.FRONTEND_NGINX_URL;

export function initEmailService() {
  // Check for required environment variables
  const requiredVars = [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASSWORD",
    "EMAIL_FROM_NAME",
    "EMAIL_FROM_ADDRESS",
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required email configuration: ${missingVars.join(", ")}`
    );
  }

  // Create transporter with better error handling
  try {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    // Verify SMTP connection
    transporter.verify(error => {
      if (error) {
        console.error("SMTP connection error:", error);
        throw new Error(`SMTP connection failed: ${error.message}`);
      } else {
        console.log("SMTP server is ready to take our messages");
      }
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unknown error during email service initialization";
    console.error("Failed to initialize email service:", errorMessage);
    throw new Error(`Email service initialization failed: ${errorMessage}`);
  }
}

function ensureTransporterInitialized() {
  if (!transporter) {
    throw new Error(
      "Email service not initialized. Call initEmailService() first."
    );
  }
}

export async function sendVerificationEmail(
  to: string,
  token: string,
  logger?: FastifyBaseLogger
): Promise<void> {
  ensureTransporterInitialized();
  const verificationUrl = `${FRONTEND_URL}/verify-email?token=${token}`;

  const mailOptions: EmailOptions = {
    to,
    subject: "Verify Your Email Address",
    text: `Please click the following link to verify your email: ${verificationUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Verify Your Email Address</h2>
        <p>Thank you for registering! Please click the button below to verify your email address:</p>
        <p style="margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #2563eb; color: white; padding: 10px 20px; 
                    text-decoration: none; border-radius: 5px; font-weight: bold;">
            Verify Email
          </a>
        </p>
        <p>Or copy and paste this link into your browser:</p>
        <p>${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create an account, please ignore this email.</p>
      </div>
    `,
  };

  try {
    logger?.info(
      `Sending verification email to ${to}, from ${process.env.EMAIL_FROM_ADDRESS}`
    );
    await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
      ...mailOptions,
    });
    logger?.info(
      `Verification email sent to ${to}, from ${process.env.EMAIL_FROM_ADDRESS}`
    );
  } catch (error) {
    logger?.error(`Failed to send verification email to ${to}:`, error);
    throw new Error("Failed to send verification email");
  }
}

export async function sendPasswordResetEmail(
  to: string,
  token: string,
  logger?: FastifyBaseLogger
): Promise<void> {
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;

  const mailOptions: EmailOptions = {
    to,
    subject: "Reset Your Password",
    text: `Please click the following link to reset your password: ${resetUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Reset Your Password</h2>
        <p>You requested a password reset. Click the button below to set a new password:</p>
        <p style="margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #2563eb; color: white; padding: 10px 20px; 
                    text-decoration: none; border-radius: 5px; font-weight: bold;">
            Reset Password
          </a>
        </p>
        <p>Or copy and paste this link into your browser:</p>
        <p>${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
      ...mailOptions,
    });
  } catch (error) {
    logger?.error("Failed to send email:", error);
    throw new Error("Failed to send password reset email");
  }
}
