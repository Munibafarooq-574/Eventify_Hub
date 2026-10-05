import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class EmailService {
  private getBrevoApiKey(): string {
    const apiKey =
      process.env.BREVO_API_KEY?.trim();

    if (!apiKey) {
      throw new InternalServerErrorException(
        'Email service is not configured.',
      );
    }

    return apiKey;
  }

  private getSenderEmail(): string {
    const senderEmail =
      process.env.MAIL_FROM_EMAIL?.trim();

    if (!senderEmail) {
      throw new InternalServerErrorException(
        'Email sender is not configured.',
      );
    }

    return senderEmail;
  }

  async sendTransactionalEmail(params: {
    to: string;
    subject: string;
    html: string;
    senderName?: string;
  }): Promise<void> {
    const recipient =
      params.to.trim().toLowerCase();

    if (
      !recipient ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        recipient,
      )
    ) {
      throw new Error(
        'Invalid recipient email.',
      );
    }

    try {
      await axios.post(
        'https://api.brevo.com/v3/smtp/email',
        {
          sender: {
            name:
              params.senderName ||
              'Eventify Hub',
            email:
              this.getSenderEmail(),
          },

          to: [
            {
              email: recipient,
            },
          ],

          subject: params.subject,
          htmlContent: params.html,
        },
        {
          headers: {
            'api-key':
              this.getBrevoApiKey(),

            'Content-Type':
              'application/json',

            accept:
              'application/json',
          },

          timeout: 20000,
        },
      );
    } catch (error: any) {
      console.error(
        '[Brevo Email Error]',
        error?.response?.data ||
          error?.message,
      );

      throw new Error(
        error?.response?.data?.message ||
          error?.message ||
          'Email send failed',
      );
    }
  }
}