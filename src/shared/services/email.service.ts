import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Geolocation } from 'src/modules/geo/geo.entity';
import { htmlGeo } from './email/data';

@Injectable()
export class EmailService {
  private transporter;
  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: true, // true para 465, false para outras portas
      auth: {
        user: this.configService.get<string>('SMTP_USERNAME'),
        pass: this.configService.get<string>('SMTP_PASSWORD'),
      },
    });
  }

  async sendForgotPasswordMail(name: string, email: string, token: string) {
    const resetPasswordUrl = `${this.configService.get<string>(
      'FRONT_URL',
    )}/reset?token=${token}`;
    const info = await this.transporter.sendMail({
      from: this.configService.get<string>('SMTP_USERNAME'),
      to: email,
      subject: 'Esqueci a Senha - Você na Facul',
      html: `<h2> Olá ${name}</h2>
        <p>Parace que você esqueceu sua senha. Caso queira prosseguir clique no link abaixo:</p>
        <p><a href="${resetPasswordUrl}" target="_black" >Recuperar senha</a></p>
        <p>Caso você não fez essa solicitação, desconsidere esse email</p>
        <p><strong>Equipe vCnaFacul</strong></p>`,
      // Você também pode usar HTML aqui
    });

    console.log('E-mail enviado: %s', info.messageId);
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
}
