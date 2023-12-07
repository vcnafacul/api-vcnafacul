import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { NewsRepository } from './news.repository';
import { CreateNewsDtoInput } from './dtos/create-news.dto.input';
import { News } from './news.entity';
import * as ftp from 'basic-ftp';
import * as fs from 'fs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NewsService {
  constructor(
    private readonly newRepository: NewsRepository,
    private configService: ConfigService,
  ) {}

  async create(request: CreateNewsDtoInput, file: any, userId: number) {
    const fileName = await this.uploadFile(file);
    if (!fileName) {
      throw new HttpException('error to upload file', HttpStatus.BAD_REQUEST);
    }
    const news = new News();
    news.session = request.session;
    news.title = request.title;
    news.fileName = fileName;
    news.updatedBy = userId;

    return await this.newRepository.create(news);
  }

  async findAll() {
    return await this.newRepository.findAll();
  }

  async findActived() {
    const where = { actived: true };
    return await this.newRepository.findBy(where);
  }

  async delete(id: number) {
    await this.newRepository.delete(id);
  }

  private async uploadFile(file: any): Promise<string> {
    const client = new ftp.Client(30000);
    try {
      await client.access({
        host: this.configService.get<string>('FTP_HOST'),
        user: this.configService.get<string>('FTP_USER'),
        password: this.configService.get<string>('FTP_PASSWORD'),
      });
      const typeFile = file.originalname.split('.')[1];
      const nameFile = Date.now();

      const tempFilePath = `${this.configService.get<string>(
        'FTP_TEMP_FILE',
      )}${nameFile}.${typeFile}`;

      fs.writeFileSync(tempFilePath, file.buffer);

      const ftpResponse = await client.uploadFrom(
        tempFilePath,
        `${nameFile}.${typeFile}`,
      );
      fs.unlinkSync(tempFilePath);
      if (ftpResponse.code == 226) {
        return nameFile.toString();
      }
      return '';
    } catch (error) {
      console.log(error);
      return '';
    } finally {
      client.close();
    }
  }
}
