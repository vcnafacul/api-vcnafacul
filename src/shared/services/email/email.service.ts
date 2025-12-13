/* istanbul ignore file */
import { Injectable, Logger } from '@nestjs/common';
import { format } from 'date-fns';
import * as nodemailer from 'nodemailer';
import * as hbs from 'nodemailer-express-handlebars';
import * as path from 'path';
import { Geolocation } from 'src/modules/geo/geo.entity';
import { User } from 'src/modules/user/user.entity';
import { EnvService } from 'src/shared/modules/env/env.service';
import { EMAIL_CONFIG } from 'src/shared/config/email.config';
import { sendBulkNotification } from './templates/bulk-notification';
import { sendEmailConfirmEmail } from './templates/confirm-email';
import { sendGeoEmail } from './templates/create-geo';
import { sendEmailDeclaredInterest } from './templates/declared-interest';
import { sendEmailDeclaredInterestBulk } from './templates/declared-interest-bulk';
import { sendEmailInviteMember } from './templates/invite-member-prep-course';
import { sendEmail } from './templates/reset-password';
import { sendEmailWaitingList } from './templates/waiting-list';

@Injectable()
export class EmailService {
  private transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor(private envService: EnvService) {
    this.transporter = nodemailer.createTransport({
      host: this.envService.get('SMTP_HOST'),
      port: this.envService.get('SMTP_PORT'),
      secure: true, // true para 465, false para outras portas
      auth: {
        user: this.envService.get('SMTP_USERNAME'),
        pass: this.envService.get('SMTP_PASSWORD'),
      },
    });
    const templatePath = path.resolve(this.envService.get('TEMPLATE_EMAIL'));
    const handlebarOptions = {
      viewEngine: {
        partialsDir: templatePath,
        defaultLayout: false,
      },
      viewPath: templatePath,
    };
    this.transporter.use('compile', hbs(handlebarOptions));
  }

  /**
   * Divide uma lista em chunks menores
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Aguarda um tempo específico (delay)
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Envia email com retry em caso de falha por rate limiting
   */
  private async sendMailWithRetry(
    mailOptions: object,
    sendFunction: (opts: { transporter: any; options: object }) => Promise<void>,
    retries = EMAIL_CONFIG.MAX_RETRY_ATTEMPTS,
  ): Promise<void> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await sendFunction({
          transporter: this.transporter,
          options: mailOptions,
        });
        return;
      } catch (error) {
        const isRateLimitError =
          error.message?.includes('ratelimit') ||
          error.message?.includes('451') ||
          error.responseCode === 451;

        if (isRateLimitError && attempt < retries) {
          this.logger.warn(
            `Rate limit detectado. Tentativa ${attempt}/${retries}. Aguardando ${EMAIL_CONFIG.RETRY_DELAY_MS}ms...`,
          );
          await this.delay(EMAIL_CONFIG.RETRY_DELAY_MS * attempt); // Exponential backoff
        } else {
          throw error;
        }
      }
    }
  }

  async sendForgotPasswordMail(name: string, email: string, token: string) {
    const resetPasswordUrl = `${this.envService.get(
      'FRONT_URL',
    )}/reset?token=${token}`;
    const mailOptions = {
      from: this.envService.get('SMTP_USERNAME'),
      to: email,
      subject: 'Esqueci a Senha - Você na Facul',
      context: {
        name,
        resetPasswordUrl,
      },
    };

    await sendEmail({ transporter: this.transporter, options: mailOptions });
  }

  async sendEmailGeo({ geo, emails }: { geo: Geolocation; emails: string[] }) {
    const mailOptions = {
      from: this.envService.get('SMTP_USERNAME'),
      bcc: emails,
      subject: 'Cadastro de Cursinho - Você na Facul',
      context: {
        geo,
      },
    };

    await sendGeoEmail({ transporter: this.transporter, options: mailOptions });
  }

  async sendCreateUser(user: User, token: string) {
    const confirmEmailUrl = `${this.envService.get(
      'FRONT_URL',
    )}/confirmEmail?token=${token}`;
    const mailOptions = {
      from: this.envService.get('SMTP_USERNAME'),
      to: user.email,
      subject: 'Confirmação de Email - Você na Facul',
      context: {
        name: user.firstName,
        confirmEmailUrl,
      },
    };

    await sendEmailConfirmEmail({
      transporter: this.transporter,
      options: mailOptions,
    });
  }

  async sendConfirmationStudentRegister(
    listEmail: string[],
    student: object,
    nomeCursinho: string,
  ) {
    const nome_cursinho = nomeCursinho.includes('Cursinho')
      ? nomeCursinho
      : `Cursinho ${nomeCursinho}`;
    const mailOptions = {
      from: this.envService.get('SMTP_USERNAME'),
      to: listEmail[0],
      bcc: listEmail.slice(1),
      subject: 'Confirmação de Incrição Cursinho - Você na Facul',
      template: 'confirmation-student-register',
      context: {
        student,
        nome_cursinho,
      },
    };
    await this.transporter.sendMail(mailOptions);
  }

  async sendInviteMember(
    email: string,
    name: string,
    nameManager: string,
    nomeCursinho: string,
    token: string,
  ) {
    const prepCourseName = nomeCursinho.includes('Cursinho')
      ? nomeCursinho
      : `Cursinho ${nomeCursinho}`;
    const acceptInviteUrl = `${this.envService.get(
      'FRONT_URL',
    )}/convidar-membro?token=${token}`;

    const mailOptions = {
      from: this.envService.get('SMTP_USERNAME'),
      to: email,
      subject: `Convite Membro ${prepCourseName} - Você na Facul`,
      context: {
        name,
        nameManager,
        prepCourseName,
        acceptInviteUrl,
      },
    };
    await sendEmailInviteMember({
      transporter: this.transporter,
      options: mailOptions,
    });
  }

  async sendWaitingList(
    students: {
      position: number;
      name: string;
      email: string;
    }[],
    prepCourse: string,
  ) {
    const prepCourseName = prepCourse.includes('Cursinho')
      ? prepCourse
      : `Cursinho ${prepCourse}`;

    const emails = students.map((s) => s.email);
    const allEmails = [...emails, 'cursinho.ufscar@vcnafacul.com.br'];

    // Divide em chunks para evitar rate limiting
    const emailChunks = this.chunkArray(allEmails, EMAIL_CONFIG.MAX_BCC_PER_EMAIL);

    this.logger.log(
      `Enviando lista de espera para ${allEmails.length} destinatários em ${emailChunks.length} chunks`,
    );

    for (let i = 0; i < emailChunks.length; i++) {
      const chunk = emailChunks[i];

      const mailOptions = {
        from: this.envService.get('SMTP_USERNAME'),
        to: this.envService.get('SMTP_USERNAME'),
        bcc: chunk,
        subject: `Atualização Lista de Espera ${prepCourseName} - Você na Facul`,
        context: {
          students,
          prepCourseName,
        },
      };

      try {
        await this.sendMailWithRetry(mailOptions, sendEmailWaitingList);
        this.logger.log(
          `Chunk ${i + 1}/${emailChunks.length} enviado com sucesso (${chunk.length} destinatários)`,
        );
      } catch (error) {
        this.logger.error(
          `Erro ao enviar chunk ${i + 1}/${emailChunks.length}: ${error.message}`,
        );
        throw error;
      }

      // Delay entre chunks (exceto no último)
      if (i < emailChunks.length - 1) {
        await this.delay(EMAIL_CONFIG.DELAY_BETWEEN_CHUNKS_MS);
      }
    }
  }

  async sendDeclaredInterest(
    students_name: string,
    students_email: string,
    prepCourse: string,
    limitDate: Date,
    inscriptionId: string,
  ) {
    const prepCourseName = prepCourse.includes('Cursinho')
      ? prepCourse
      : `Cursinho ${prepCourse}`;
    const date = format(limitDate, 'dd/MM/yyyy');
    const declaredInterestUrl = `${this.envService.get(
      'FRONT_URL',
    )}/declarar-interesse/${inscriptionId}`;
    const mailOptions = {
      from: this.envService.get('SMTP_USERNAME'),
      to: students_email,
      bcc: 'cursinho.ufscar@vcnafacul.com.br',
      subject: `Declaração de Interesse ${prepCourseName} - Vocé na Facul`,
      context: {
        students_name,
        declaredInterestUrl,
        prepCourseName,
        date,
      },
    };

    await sendEmailDeclaredInterest({
      transporter: this.transporter,
      options: mailOptions,
    });
  }

  async sendDeclaredInterestBulk(
    bccList: string[],
    prepCourse: string,
    limitDate: Date,
    inscriptionId: string,
  ) {
    const prepCourseName = prepCourse.includes('Cursinho')
      ? prepCourse
      : `Cursinho ${prepCourse}`;
    const date = format(limitDate, 'dd/MM/yyyy');
    const declaredInterestUrl = `${this.envService.get(
      'FRONT_URL',
    )}/declarar-interesse/${inscriptionId}`;

    // Divide em chunks para evitar rate limiting
    const emailChunks = this.chunkArray(bccList, EMAIL_CONFIG.MAX_BCC_PER_EMAIL);

    this.logger.log(
      `Enviando interesse declarado em lote para ${bccList.length} destinatários em ${emailChunks.length} chunks`,
    );

    for (let i = 0; i < emailChunks.length; i++) {
      const chunk = emailChunks[i];

      const mailOptions = {
        from: this.envService.get('SMTP_USERNAME'),
        to: this.envService.get('SMTP_USERNAME'),
        bcc: chunk,
        subject: `Declaração de Interesse ${prepCourseName} - Você na Facul`,
        context: {
          declaredInterestUrl,
          prepCourseName,
          date,
        },
      };

      try {
        await this.sendMailWithRetry(mailOptions, sendEmailDeclaredInterestBulk);
        this.logger.log(
          `Chunk ${i + 1}/${emailChunks.length} enviado com sucesso (${chunk.length} destinatários)`,
        );
      } catch (error) {
        this.logger.error(
          `Erro ao enviar chunk ${i + 1}/${emailChunks.length}: ${error.message}`,
        );
        throw error;
      }

      // Delay entre chunks (exceto no último)
      if (i < emailChunks.length - 1) {
        await this.delay(EMAIL_CONFIG.DELAY_BETWEEN_CHUNKS_MS);
      }
    }
  }

  async sendBulkNotification(
    bccList: string[],
    subject: string,
    message: string,
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    // Divide em chunks para evitar rate limiting do SMTP
    const emailChunks = this.chunkArray(bccList, EMAIL_CONFIG.MAX_BCC_PER_EMAIL);

    this.logger.log(
      `Iniciando envio de notificação em massa para ${bccList.length} destinatários em ${emailChunks.length} chunks`,
    );

    const result = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (let i = 0; i < emailChunks.length; i++) {
      const chunk = emailChunks[i];

      const mailOptions = {
        from: this.envService.get('SMTP_USERNAME'),
        to: this.envService.get('SMTP_USERNAME'), // destinatário "falso" para enviar via BCC
        bcc: chunk,
        subject: `Você na Facul - ${subject}`,
        context: {
          message,
        },
      };

      try {
        await this.sendMailWithRetry(mailOptions, sendBulkNotification);
        result.success += chunk.length;
        this.logger.log(
          `Chunk ${i + 1}/${emailChunks.length} enviado com sucesso (${chunk.length} destinatários)`,
        );
      } catch (error) {
        result.failed += chunk.length;
        result.errors.push(
          `Chunk ${i + 1}: ${error.message} (${chunk.length} destinatários)`,
        );
        this.logger.error(
          `Erro ao enviar chunk ${i + 1}/${emailChunks.length}: ${error.message}`,
        );
        // Continua para o próximo chunk mesmo em caso de erro
      }

      // Delay entre chunks (exceto no último)
      if (i < emailChunks.length - 1) {
        this.logger.debug(
          `Aguardando ${EMAIL_CONFIG.DELAY_BETWEEN_CHUNKS_MS}ms antes do próximo chunk...`,
        );
        await this.delay(EMAIL_CONFIG.DELAY_BETWEEN_CHUNKS_MS);
      }
    }

    this.logger.log(
      `Envio em massa concluído: ${result.success} sucesso, ${result.failed} falhas`,
    );

    return result;
  }

  /**
   * Envia notificação em massa de forma assíncrona (em background)
   * Útil para não bloquear a requisição HTTP
   */
  async sendBulkNotificationAsync(
    bccList: string[],
    subject: string,
    message: string,
  ): Promise<void> {
    // Executa em background sem aguardar
    this.sendBulkNotification(bccList, subject, message).catch((error) => {
      this.logger.error(`Erro no envio em massa assíncrono: ${error.message}`);
    });
  }
}
