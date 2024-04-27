import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as nodemailer from 'nodemailer';
import * as hbs from 'nodemailer-express-handlebars';
import * as path from 'path';
import { Geolocation } from 'src/modules/geo/geo.entity';
import { User } from 'src/modules/user/user.entity';
import { htmlGeo } from './data';

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
      template: 'reset-password',
      context: {
        name,
        resetPasswordUrl,
      },
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendCreateGeoMail(geo: Geolocation, listEmail: string[]) {
    const info = await this.transporter.sendMail({
      from: this.configService.get<string>('SMTP_USERNAME'),
      to: listEmail,
      subject: 'Cadastro de Cursinho',
      html: htmlGeo(geo),
      // Você também pode usar HTML aqui
    });
    console.log('E-mail enviado: %s', info.messageId);
  }

  async sendCreateUser(user: User) {
    const token = await this.jwtService.signAsync(
      { user: { id: user.id } },
      { expiresIn: '2h' },
    );
    const confirmeEmailUrl = `${this.configService.get<string>(
      'FRONT_URL',
    )}/confirmEmail?token=${token}`;

    const mailOptions = {
      from: this.configService.get<string>('SMTP_USERNAME'),
      to: user.email,
      subject: 'Confirmação de Email - Você na Facul',
      template: 'create-user',
      context: {
        name: user.firstName,
        confirmeEmailUrl,
      },
      attachments: [
        {
          filename: 'imagename.svg',
          path: path.resolve('src/shared/services/assets/logo.png'),
          cid: 'imagename',
        },
      ],
    };

    await this.transporter.sendMail(mailOptions);
  }
}
