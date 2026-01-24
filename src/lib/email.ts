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
          from: "Merlin's Crystal Ball <noreply@merlinscrystalball.com>",
          to: [message.to],
          cc: [message.cc],
          bcc: [message.bcc],
          subject: message.subject,
          html: message.html,
          text: message.text,
        }),
      });

      let data;
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        data = await response.json();
      } else {
        data = { message: await response.text() };
      }

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
      const from = "Merlin's Crystal Ball";
      const fromAddress = "noreply@romitsagu.com";

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

      let data;
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        data = await response.json();
      } else {
        data = { message: await response.text() };
      }

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
    subject: `${isDevelopment ? "[Dev] " : ""}Welcome to Merlin's Crystal Ball - Account Created`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Merlin's Crystal Ball</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background-color: #09090b; }
            .header { background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); padding: 40px 20px; text-align: center; color: white; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 0.5px; }
            .header p { margin: 8px 0 0 0; font-size: 13px; opacity: 0.9; }
            .content { padding: 40px 30px; color: #e4e4e7; line-height: 1.7; }
            .greeting { font-size: 20px; font-weight: 600; color: #fafafa; margin: 0 0 12px 0; }
            .intro-text { color: #d4d4d8; margin: 0 0 28px 0; font-size: 14px; }
            .credentials-box { background: linear-gradient(135deg, #1e1b4b 0%, #27272a 100%); padding: 24px; border-radius: 12px; border: 1px solid #3f3f46; margin: 28px 0; }
            .credential-item { margin-bottom: 16px; }
            .credential-item:last-child { margin-bottom: 0; }
            .credential-label { font-size: 12px; font-weight: 600; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
            .credential-value { font-family: 'Courier New', monospace; font-size: 14px; color: #fafafa; background: #0f0f12; padding: 12px 16px; border-radius: 8px; border-left: 3px solid #6366f1; word-break: break-all; }
            .warning-box { background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(244, 63, 94, 0.1) 100%); padding: 20px; border-radius: 12px; border: 1px solid #ef4444; margin: 28px 0; border-left: 4px solid #ef4444; }
            .warning-title { margin: 0 0 8px 0; color: #fecaca; font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 8px; }
            .warning-text { margin: 0; color: #fca5a5; font-size: 13px; line-height: 1.5; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; padding: 16px 36px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 28px 0; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3); text-align: center; transition: transform 0.2s, box-shadow 0.2s; }
            .cta-button:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4); }
            .cta-container { text-align: center; }
            .security-note { color: #a1a1aa; font-size: 12px; line-height: 1.6; margin: 28px 0 0 0; padding-top: 20px; border-top: 1px solid #27272a; }
            .next-steps { background: #0f0f12; padding: 20px; border-radius: 8px; border: 1px solid #27272a; margin: 28px 0; }
            .next-steps h3 { margin: 0 0 12px 0; color: #fafafa; font-size: 14px; font-weight: 600; }
            .next-steps ol { margin: 0; padding-left: 20px; color: #d4d4d8; font-size: 13px; }
            .next-steps li { margin-bottom: 8px; }
            .footer { background: #0f0f12; padding: 24px 30px; text-align: center; color: #52525b; font-size: 11px; border-top: 1px solid #27272a; }
            .footer p { margin: 4px 0; }
            @media (max-width: 600px) {
              .content { padding: 24px 16px; }
              .header { padding: 32px 16px; }
              .header h1 { font-size: 24px; }
              .greeting { font-size: 18px; }
              .cta-button { display: block; width: 100%; box-sizing: border-box; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔮 Merlin's Crystal Ball</h1>
              <p>D&D Campaign & Character Manager</p>
            </div>
            
            <div class="content">
              <p class="greeting">Welcome, Adventurer${userName ? `, ${userName}` : ""}!</p>
              
              <p class="intro-text">Your account has been created and you're ready to begin managing your epic campaigns and legendary characters. Your login credentials are below.</p>
              
              <div class="credentials-box">
                <div class="credential-item">
                  <div class="credential-label">📧 Email Address</div>
                  <div class="credential-value">${email}</div>
                </div>
                <div class="credential-item">
                  <div class="credential-label">🔐 Temporary Password</div>
                  <div class="credential-value">${password}</div>
                </div>
              </div>
              
              <div class="warning-box">
                <p class="warning-title">⚠️ Action Required: Change Your Password</p>
                <p class="warning-text">You will be required to change your temporary password on your first login. Choose a strong, unique password to protect your account.</p>
              </div>
              
              <div class="cta-container">
                <a href="${loginUrl}" class="cta-button">Begin Your Journey</a>
              </div>
              
              <div class="next-steps">
                <h3>What happens next?</h3>
                <ol>
                  <li>Click the button above to log in with your email and temporary password</li>
                  <li>You'll be prompted to change your password to something secure</li>
                  <li>Start creating your first campaign and characters!</li>
                </ol>
              </div>
              
              <p class="security-note">
                <strong>Security Tip:</strong> Never share your password with anyone. Merlin's Crystal Ball staff will never ask for your password via email. If you didn't create this account, please let us know immediately.
              </p>
            </div>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} Merlin's Crystal Ball. All rights reserved.</p>
              <p>Manage your campaigns and characters with magic ✨</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
🔮 Merlin's Crystal Ball - D&D Campaign & Character Manager

Welcome, Adventurer${userName ? `, ${userName}` : ""}!

Your account has been created and you're ready to begin managing your epic campaigns and legendary characters. Your login credentials are below.

📧 Email Address:
${email}

🔐 Temporary Password:
${password}

⚠️ ACTION REQUIRED: Change Your Password
You will be required to change your temporary password on your first login. Choose a strong, unique password to protect your account.

Begin Your Journey:
${loginUrl}

What happens next?
1. Log in with your email and temporary password
2. You'll be prompted to change your password to something secure
3. Start creating your first campaign and characters!

Security Tip: Never share your password with anyone. Merlin's Crystal Ball staff will never ask for your password via email. If you didn't create this account, please let us know immediately.

© ${new Date().getFullYear()} Merlin's Crystal Ball. All rights reserved.
Manage your campaigns and characters with magic ✨
    `.trim(),
  }),
};
