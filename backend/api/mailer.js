import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });
  
  try {
    const { to, subject, html, authSecret } = req.body;
    
    // Security verification (prevent abuse)
    if (authSecret !== process.env.JWT_SECRET) return res.status(401).json({ error: "Unauthorized mail request" });

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"RV University Portal" <${process.env.SMTP_EMAIL}>`,
      to,
      subject,
      html
    });

    res.status(200).json({ success: true, message: "Email deployed via Vercel Microservice!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
