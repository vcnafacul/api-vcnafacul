/* istanbul ignore file */
import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class DiscordWebhook {
  private readonly webhookUrl: string;

  constructor() {
    // Defina a URL do webhook do Discord
    this.webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  }

  async sendMessage(content: string): Promise<void> {
    if (!this.webhookUrl) {
      console.error('Discord Webhook URL não configurada.');
      return;
    }

    try {
      await axios.post(this.webhookUrl, { content });
    } catch (error) {
      console.log('Erro ao enviar mensagem para o Discord:', error);
    }
  }
}
