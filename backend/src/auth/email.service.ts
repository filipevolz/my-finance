import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: 'Recuperação de Senha - MyFinance',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">Recuperação de Senha</h2>
          <p>Olá,</p>
          <p>Você solicitou a recuperação de senha da sua conta MyFinance.</p>
          <p>Clique no botão abaixo para redefinir sua senha:</p>
          <div style="text-align: center; margin: 2rem 0;">
            <a href="${resetUrl}" 
               style="background-color: #3b82f6; color: white; padding: 0.75rem 1.5rem; text-decoration: none; border-radius: 0.5rem; display: inline-block;">
              Redefinir Senha
            </a>
          </div>
          <p>Ou copie e cole o seguinte link no seu navegador:</p>
          <p style="color: #6a6a6a; word-break: break-all;">${resetUrl}</p>
          <p>Este link expira em 1 hora.</p>
          <p>Se você não solicitou esta recuperação de senha, ignore este e-mail.</p>
          <p>Atenciosamente,<br>Equipe MyFinance</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Erro ao enviar e-mail:', error);
      throw new Error('Erro ao enviar e-mail de recuperação de senha');
    }
  }
}
