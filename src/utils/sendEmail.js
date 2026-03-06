import nodemailer from 'nodemailer';

export const sendEmail = async (subject, receiver, body) => {
    const transporter = nodemailer.createTransport({
        host: process.env.NODEMAILER_HOST,
        port: process.env.NODEMAILER_PORT,
        secure: false, // Use true for port 465, false for port 587
        auth: {
            user: process.env.NODEMAILER_EMAIL,
            pass: process.env.NODEMAILER_PASSWORD,
        },
    });

    const options = {
        from: `${process.env.STORE_NAME} <${process.env.NODEMAILER_EMAIL}>`,
        to: receiver,
        subject: subject,
        html: body
    }

    try {
        await transporter.sendMail(options)
        return { success: true }
    } catch (error) {
        return { success: false, message: error.message }
    }
}