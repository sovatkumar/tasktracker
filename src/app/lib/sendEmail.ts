import * as nodemailer from "nodemailer";
const MAIL_USER = "vinaykumar.mrski@gmail.com";
const MAIL_PASS = "xrfk knpe ciwf akrs";
export async function sendEmail(
  to: string,
  subject: string,
  content: {
    title: string;
    message: string;
    actionText?: string;
    actionUrl?: string;
  }
) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USER! || MAIL_USER,
        pass: process.env.MAIL_PASS! || MAIL_PASS,
      },
      logger: true,
      debug: true,
    });

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">${content.title}</h1>
        </div>
        <div style="padding: 20px; color: #333; line-height: 1.5;">
          <p>${content.message}</p>
          ${
            content.actionText && content.actionUrl
              ? `<div style="text-align: center; margin: 30px 0;">
                   <a href="${content.actionUrl}" style="background-color: #4CAF50; color: white; text-decoration: none; padding: 12px 24px; border-radius: 5px; display: inline-block;">
                     ${content.actionText}
                   </a>
                 </div>`
              : ""
          }
        </div>
        <div style="background-color: #f2f2f2; padding: 10px; text-align: center; font-size: 12px; color: #666;">
          &copy; ${new Date().getFullYear()} Working Status. All rights reserved.
        </div>
      </div>
    `;

    console.log(`Attempting to send email to: ${to} | Subject: ${subject}`);

    const info = await transporter.sendMail({
      from: `<${process.env.MAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log("Email sent successfully:", info.response);
  } catch (error) {
    console.error("Failed to send email:", error);
  }
}
