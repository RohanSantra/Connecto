// src/services/email.service.js
import nodemailer from "nodemailer";

const createTransport = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

export const sendOtpEmail = async ({ to, otp }) => {
  const transporter = createTransport();
  const subject = "Your Connecto OTP";
  const text = `Your Connecto OTP is ${otp}. It expires in 2 minutes.`;
  return transporter.sendMail({ from: process.env.SMTP_FROM, to, subject, text });
};

export const sendGenericMail = async ({ to, subject, html, text }) => {
  const transporter = createTransport();
  return transporter.sendMail({ from: process.env.SMTP_FROM, to, subject, html, text });
};
