import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { format } from 'date-fns';
import * as nodemailer from 'nodemailer';
import * as hbs from 'nodemailer-express-handlebars';
import * as path from 'path';
import { Geolocation } from 'src/modules/geo/geo.entity';
import { User } from 'src/modules/user/user.entity';
import { htmlGeo } from './data';
import { sendEmailConfirmEmail } from './templates/confirm-email';
import { sendEmailDeclaredInterest } from './templates/declared-interest';
import { sendEmailInviteMember } from './templates/invite-member-prep-course';
import { sendEmail } from './templates/reset-password';
import { sendEmailWaitingList } from './templates/waiting-list';

@Injectable()
export class EmailService {
  private transporter;
  constructor(
    private configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: true, // true para 465, false para outras portas
      auth: {
        user: this.configService.get<string>('SMTP_USERNAME'),
        pass: this.configService.get<string>('SMTP_PASSWORD'),
      },
    });
    const templatePath = path.resolve(
      this.configService.get<string>('TEMPLATE_EMAIL'),
    );
    const handlebarOptions = {
      viewEngine: {
        partialsDir: templatePath,
        defaultLayout: false,
      },
      viewPath: templatePath,
    };
    this.transporter.use('compile', hbs(handlebarOptions));
  }

  async sendForgotPasswordMail(name: string, email: string, token: string) {
    const resetPasswordUrl = `${this.configService.get<string>(
      'FRONT_URL',
    )}/reset?token=${token}`;
    const mailOptions = {
      from: this.configService.get<string>('SMTP_USERNAME'),
      to: email,
      subject: 'Esqueci a Senha - Você na Facul',
      context: {
        name,
        resetPasswordUrl,
      },
    };

    await sendEmail({ transporter: this.transporter, options: mailOptions });
  }

  async sendCreateGeoMail(geo: Geolocation, listEmail: string[]) {
    const info = await this.transporter.sendMail({
      from: this.configService.get<string>('SMTP_USERNAME'),
      bcc: listEmail,
      subject: 'Cadastro de Cursinho',
      html: htmlGeo(geo),
      // Você também pode usar HTML aqui
    });
    console.log('E-mail enviado: %s', info.messageId);
  }

  async sendCreateUser(user: User, token: string) {
    const confirmEmailUrl = `${this.configService.get<string>(
      'FRONT_URL',
    )}/confirmEmail?token=${token}`;
    const mailOptions = {
      from: this.configService.get<string>('SMTP_USERNAME'),
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
      from: this.configService.get<string>('SMTP_USERNAME'),
      to: listEmail[0],
      bcc: listEmail.slice(1),
      subject: 'Confirmação de Email - Você na Facul',
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
    const acceptInviteUrl = `${this.configService.get<string>(
      'FRONT_URL',
    )}/convidar-membro?token=${token}`;

    const mailOptions = {
      from: this.configService.get<string>('SMTP_USERNAME'),
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

    const mailOptions = {
      from: this.configService.get<string>('SMTP_USERNAME'),
      bcc: [...emails, 'cursinho.ufscar@vcnafacul.com.br'],
      subject: `Atualização Lista de Espera ${prepCourseName} - Você na Facul`,
      context: {
        students,
        prepCourseName,
      },
    };

    await sendEmailWaitingList({
      transporter: this.transporter,
      options: mailOptions,
    });
  }

  async sendDeclaredInterest(
    students_name: string,
    students_email: string,
    prepCourse: string,
    limitDate: Date,
    token: string,
  ) {
    const prepCourseName = prepCourse.includes('Cursinho')
      ? prepCourse
      : `Cursinho ${prepCourse}`;
    const date = format(limitDate, 'dd/MM/yyyy');
    const declaredInterestUrl = `${this.configService.get<string>(
      'FRONT_URL',
    )}/declarar-interesse?token=${token}`;
    const mailOptions = {
      from: this.configService.get<string>('SMTP_USERNAME'),
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
}
