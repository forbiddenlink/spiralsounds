import nodemailer from 'nodemailer'
import { logger } from '../middleware/errorHandler.js'

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    })
  }

  async sendPasswordResetEmail(email, resetToken, username) {
    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@spiralsounds.com',
      to: email,
      subject: 'Reset Your Spiral Sounds Password',
      html: `
        <div style="font-family: 'Poppins', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #ff4c7b; margin-bottom: 10px;">🎵 Spiral Sounds</h1>
            <p style="color: #666;">Password Reset Request</p>
          </div>
          
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-bottom: 15px;">Hi ${username}!</h2>
            <p style="margin-bottom: 15px;">We received a request to reset your password for your Spiral Sounds account.</p>
            <p style="margin-bottom: 20px;">Click the button below to reset your password:</p>
            
            <div style="text-align: center; margin: 25px 0;">
              <a href="${resetUrl}" 
                 style="background: linear-gradient(135deg, #ff4c7b, #ff6b96); 
                        color: white; 
                        padding: 12px 25px; 
                        text-decoration: none; 
                        border-radius: 6px; 
                        font-weight: 600;
                        display: inline-block;">
                Reset My Password
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 20px;">
              If you can't click the button, copy and paste this link into your browser:<br>
              <a href="${resetUrl}" style="color: #ff4c7b; word-break: break-all;">${resetUrl}</a>
            </p>
          </div>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 14px; color: #856404;">
              <strong>⚠️ Security Note:</strong> This link will expire in 1 hour for your security. 
              If you didn't request this reset, you can safely ignore this email.
            </p>
          </div>
          
          <div style="text-align: center; font-size: 12px; color: #999; margin-top: 30px;">
            <p>© ${new Date().getFullYear()} Spiral Sounds. All rights reserved.</p>
            <p>This email was sent because a password reset was requested for your account.</p>
          </div>
        </div>
      `
    }

    try {
      await this.transporter.sendMail(mailOptions)
      logger.info(`Password reset email sent to ${email}`)
    } catch (error) {
      logger.error(`Failed to send password reset email to ${email}:`, error)
      throw new Error('Failed to send password reset email')
    }
  }

  async sendVerificationEmail(email, verificationToken, username) {
    const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@spiralsounds.com',
      to: email,
      subject: 'Verify Your Spiral Sounds Account',
      html: `
        <div style="font-family: 'Poppins', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #ff4c7b; margin-bottom: 10px;">🎵 Spiral Sounds</h1>
            <p style="color: #666;">Welcome to the best vinyl collection!</p>
          </div>
          
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-bottom: 15px;">Welcome ${username}! 🎉</h2>
            <p style="margin-bottom: 15px;">Thank you for signing up for Spiral Sounds! We're excited to have you join our community of vinyl enthusiasts.</p>
            <p style="margin-bottom: 20px;">To complete your registration and start shopping for amazing vinyl records, please verify your email address:</p>
            
            <div style="text-align: center; margin: 25px 0;">
              <a href="${verificationUrl}" 
                 style="background: linear-gradient(135deg, #ff4c7b, #ff6b96); 
                        color: white; 
                        padding: 12px 25px; 
                        text-decoration: none; 
                        border-radius: 6px; 
                        font-weight: 600;
                        display: inline-block;">
                Verify My Email
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 20px;">
              If you can't click the button, copy and paste this link into your browser:<br>
              <a href="${verificationUrl}" style="color: #ff4c7b; word-break: break-all;">${verificationUrl}</a>
            </p>
          </div>
          
          <div style="background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 14px; color: #0c5460;">
              <strong>🎵 What's Next?</strong> Once verified, you'll be able to browse our curated vinyl collection, 
              add items to your cart, and discover new music to love!
            </p>
          </div>
          
          <div style="text-align: center; font-size: 12px; color: #999; margin-top: 30px;">
            <p>© ${new Date().getFullYear()} Spiral Sounds. All rights reserved.</p>
            <p>This email was sent because you created an account with us.</p>
          </div>
        </div>
      `
    }

    try {
      await this.transporter.sendMail(mailOptions)
      logger.info(`Verification email sent to ${email}`)
    } catch (error) {
      logger.error(`Failed to send verification email to ${email}:`, error)
      throw new Error('Failed to send verification email')
    }
  }

  async sendWelcomeEmail(email, username) {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@spiralsounds.com',
      to: email,
      subject: 'Welcome to Spiral Sounds! 🎵',
      html: `
        <div style="font-family: 'Poppins', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #ff4c7b; margin-bottom: 10px;">🎵 Spiral Sounds</h1>
            <p style="color: #666;">Your vinyl journey starts here!</p>
          </div>
          
          <div style="background: linear-gradient(135deg, #ff4c7b, #ff6b96); color: white; padding: 30px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
            <h2 style="margin: 0 0 10px 0;">Welcome to the family, ${username}! 🎉</h2>
            <p style="margin: 0; opacity: 0.9;">Your email has been verified and your account is ready to rock!</p>
          </div>
          
          <div style="margin-bottom: 25px;">
            <h3 style="color: #333; margin-bottom: 15px;">🎯 Here's what you can do now:</h3>
            <ul style="padding-left: 20px;">
              <li style="margin-bottom: 8px;"><strong>Browse our collection</strong> - Discover vinyl from indie to punk and everything in between</li>
              <li style="margin-bottom: 8px;"><strong>Add to your cart</strong> - Build your perfect vinyl collection</li>
              <li style="margin-bottom: 8px;"><strong>Save favorites</strong> - Create wishlists for future purchases</li>
              <li style="margin-bottom: 8px;"><strong>Leave reviews</strong> - Share your thoughts on albums you love</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 25px 0;">
            <a href="${process.env.CLIENT_URL}" 
               style="background: linear-gradient(135deg, #333, #555); 
                      color: white; 
                      padding: 12px 25px; 
                      text-decoration: none; 
                      border-radius: 6px; 
                      font-weight: 600;
                      display: inline-block;">
              Start Shopping Now
            </a>
          </div>
          
          <div style="text-align: center; font-size: 12px; color: #999; margin-top: 30px;">
            <p>© ${new Date().getFullYear()} Spiral Sounds. All rights reserved.</p>
            <p>Happy listening! 🎧</p>
          </div>
        </div>
      `
    }

    try {
      await this.transporter.sendMail(mailOptions)
      logger.info(`Welcome email sent to ${email}`)
    } catch (error) {
      logger.error(`Failed to send welcome email to ${email}:`, error)
      // Don't throw here as welcome email is not critical
    }
  }
}

export const emailService = new EmailService()