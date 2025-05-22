const User = require("../models/user")

const sgMail = require("@sendgrid/mail");
require("dotenv").config();
const tokenUtil = require("../util/gen_tokens")

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

class EmailService {

  constructor() {
  }
  generateEmailToken(user) {
    const token = tokenUtil.generateJWT(user); // no await
    console.log(typeof token); // should be "string"
    return token;
  }



  async verifyPasswordResetToken(token, email) {
    const user = await User.findOne({
      email,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    return user;
  }
  async resendToken(email) {
    const user = await User.findOne({ email })
    if (!user) {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }
    if (user.isEmailVerified) {
      const error = new Error("User already verified");
      error.status = 400;
      throw error;
    }
    this.sendVerificationEmail(email, user.emailVerificationToken);

  }


  async sendVerificationEmail(email, emailToken) {

    const verificationUrl = `${process.env.PROD_URL}/api/v1/verify-email?token=${emailToken}`;
    console.log('Generated URL:', verificationUrl);

    const msg = {
      to: email,
      from: `${process.env.SENDER_EMAIL}`,
      subject: "Verify Your Email - GreenNest",
      html: `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Verify Your Email</title>
  </head>
  <body style="background-color:rgb(205, 212, 200); margin: 0; padding: 0; font-family: Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center" style="padding: 25px 0;">
          <a href="https://greenyleaves.com" target="_blank" style="font-size: 22px; font-weight: bold; color: rgb(32, 73, 14); text-decoration: none;">
            GreenyLeaves
          </a>
        </td>
      </tr>

      <tr>
        <td align="center">
          <table width="570" cellpadding="0" cellspacing="0" style="background-color:rgb(238, 238, 238); border-radius: 6px; border: 1px solidrgb(225, 250, 209); padding: 32px;">
            <tr>
              <td>
                <h1 style="font-size: 20px; color: rgb(0, 0, 0);">Welcome to GreenyLeaves!</h1>
                <p style="font-size: 16px; color: #334155;">
                  Please confirm your email address by clicking the button below.
                </p>

                <table align="center" style="margin: 30px auto;">
                  <tr>
                    <td>
                      <a href="${process.env.PROD_URL}/verify-email?token=${emailToken}" style="background-color:rgb(65, 155, 8); color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold;">
                        Verify Email
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="font-size: 14px; color: #64748b;">
                  If you didn’t create a GreenyLeaves account, you can safely ignore this email.
                </p>

                <p style="font-size: 14px; color: #64748b;">
                  Or copy and paste this URL into your browser:<br />
                  <a href="${process.env.PROD_URL}/verify-email?token=${emailToken}" style="color: rgb(84, 213, 15);">${process.env.PROD_URL}/verify-email?token=${emailToken}</a>
                </p>

                <p style="font-size: 14px; color: #64748b;">– The GreenyLeaves Team</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <tr>
        <td align="center" style="padding: 20px; color: #9ca3af; font-size: 12px;">
          &copy; 2025 GreenyLeaves. All rights reserved.
        </td>
      </tr>
    </table>
  </body>
</html>`


      ,
      trackingSettings: {
        clickTracking: { enable: false, enableText: false },
      },
    };
    try {
      await sgMail.send(msg);
      console.log("Verification email sent successfully to:", email);
      return true;
    } catch (error) {
      console.error("Error sending verification email:", error);
      throw new Error("Failed to send verification email");
    }
  }

  async verifyEmailToken(token) {
    console.log("VERIFY EMAIL HIT")

    if (token) {
      const user = await User.findOne({
        emailVerificationToken: token,
        emailVerificationExpires: { $gt: Date.now() }
      });

      if (!user) return null;
      if (user.emailVerificationToken !== token) return null; //tokenn missmatch

      user.isEmailVerified = true;
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
      await user.save();
      return user;
    };

  }

  async sendPasswordResetEmail(email, passResetToken) {
    const resetUrl = `${process.env.PROD_URL}/api/v1/reset-password?token=${passResetToken}`;

    const msg = {
      to: email,
      from: `${process.env.SENDER_EMAIL}`,
      subject: "Password Reset - GreenNest",
      text: `Reset your password by clicking on the following link: ${resetUrl}`,
      html: `
        <p>You requested a password reset</p>
        <p>Click <a href="${resetUrl}">here</a> to reset your password</p>
        <p>This link will expire in 1 hour</p>
      `,
    };

    try {
      await sgMail.send(msg);
      console.log("Password reset email sent successfully to:", email);
      return true;
    } catch (error) {
      console.error("Error sending password reset email:", error);
      throw new Error("Failed to send password reset email");
    }
  }

  async sendPasswordResetConfirmation(email) {
    const msg = {
      to: email,
      from: process.env.SENDER_EMAIL,
      subject: "Password Successfully Reset",
      html: `<p>Your password has been successfully changed</p>`,
    };

    try {
      await sgMail.send(msg);
      console.log("Password reset confirmation sent to:", email);
      return true;
    } catch (error) {
      console.error("Error sending password reset confirmation:", error);
      throw new Error("Failed to send password reset confirmation");
    }
  }

}
module.exports = new EmailService();