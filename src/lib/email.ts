/*
 * Email Abstraction Layer for Sending Emails
 *
 * This module provides a unified interface for sending emails using different email providers.
 */

export interface EmailMessage {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html: string;
  text?: string;
  isImportant?: boolean;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

/**
 * Resend Email Provider
 * Uses Resend API to send emails
 */
export class ResendEmailProvider implements EmailProvider {
  private apiKey: string;
  private apiUrl = "https://api.resend.com/emails";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async send(
    message: EmailMessage,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Three Dimensions System <system@threedimensionsgta.com>",
          to: [message.to],
          cc: [message.cc],
          bcc: [message.bcc],
          subject: message.subject,
          html: message.html,
          text: message.text,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || "Failed to send email",
        };
      }

      return {
        success: true,
        messageId: data.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

/**
 * Resend Email Provider
 * Uses Email Service API to send emails
 */
export class EmailServiceProvider implements EmailProvider {
  private apiKey: string;
  private apiUrl = "https://emailserviceapi.romitsagu.com/Email/SendEmail";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async send(
    message: EmailMessage,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const to = message.to.join(",").trim();
      const cc = message.cc ? message.cc.join(",").trim() : "";
      const bcc = message.bcc ? message.bcc.join(",").trim() : "";
      const from = "Three Dimensions System";
      const fromAddress = "system@threedimensionsgta.com";

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "X-API-Key": `${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          createdName: from,
          createdEmail: fromAddress,
          userName: to,
          ccEmail: cc,
          bccEmail: bcc,
          title: message.subject,
          bodyHtml: message.html,
          isImportant: message.isImportant || false,
          isSecure: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || "Failed to send email",
        };
      }

      return {
        success: true,
        messageId: data.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

/**
 * Email Service Singleton
 * Manages the active email provider
 */
class EmailService {
  private provider: EmailProvider | null = null;

  private initializeProvider(): EmailProvider {
    const emailProvider = process.env.EMAIL_PROVIDER;
    if (!emailProvider) {
      throw new Error("EMAIL_PROVIDER environment variable is not set");
    }

    switch (emailProvider.toLowerCase()) {
      case "resend":
        const resendApiKey = process.env.RESEND_API_KEY;
        if (!resendApiKey) {
          throw new Error("RESEND_API_KEY environment variable is not set");
        }
        return new ResendEmailProvider(resendApiKey);

      case "emailservice":
        const emailServiceApiKey = process.env.EMAIL_SERVICE_API_KEY;

        if (!emailServiceApiKey) {
          throw new Error("EMAIL_SERVICE_API_KEY environment variable is not set");
        }
        return new EmailServiceProvider(emailServiceApiKey);

      default:
        throw new Error(`Unsupported EMAIL_PROVIDER: ${emailProvider}`);
    }
  }

  private getProvider(): EmailProvider {
    if (!this.provider) {
      this.provider = this.initializeProvider();
    }
    return this.provider;
  }

  /**
   * Send an email using the configured provider
   */
  async send(
    message: EmailMessage,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.getProvider().send(message);
  }

  /**
   * Change the email provider at runtime
   */
  setProvider(provider: EmailProvider): void {
    this.provider = provider;
  }
}

// Export singleton instance
export const emailService = new EmailService();
const isDevelopment = process.env.NODE_ENV === "development" || process.env.ENVIRONMENT === "dev";

/**
 * Email Templates
 */
export const emailTemplates = {
  accountCreated: (email: string, password: string, loginUrl: string, userName?: string) => ({
    subject: "Welcome to PrismAuth - Account Created",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to PrismAuth</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #000000; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">PrismAuth</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
            <h2 style="color: #333; margin-top: 0;">Welcome to PrismAuth!</h2>
            ${userName ? `<p>Hi ${userName},</p>` : "<p>Hi there,</p>"}
            <p>An administrator has created an account for you. Here are your login credentials:</p>
            <div style="background: white; padding: 20px; border-radius: 6px; border: 1px solid #e0e0e0; margin: 20px 0;">
              <p style="margin: 8px 0;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 8px 0;"><strong>Temporary Password:</strong> <code style="background: #f0f0f0; padding: 4px 8px; border-radius: 3px; font-size: 14px;">${password}</code></p>
            </div>
            <p style="color: #e74c3c; font-weight: bold;">⚠️ You will be required to change this password on your first login.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" style="background: #000000; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Login to Your Account</a>
            </div>
            <p style="color: #666; font-size: 14px;">
              For security reasons, please change your password immediately after logging in.
            </p>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>© ${new Date().getFullYear()} PrismAuth. All rights reserved.</p>
          </div>
        </body>
      </html>
    `,
    text: `
Welcome to PrismAuth!

${userName ? `Hi ${userName},` : "Hi there,"}

An administrator has created an account for you. Here are your login credentials:

Email: ${email}
Temporary Password: ${password}

⚠️ You will be required to change this password on your first login.

Login here: ${loginUrl}

For security reasons, please change your password immediately after logging in.

© ${new Date().getFullYear()} PrismAuth. All rights reserved.
    `.trim(),
  }),
};
