import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { NewsRepository } from './news.repository';
import { CreateNewsDtoInput } from './dtos/create-news.dto.input';
import { News } from './news.entity';
import { ConfigService } from '@nestjs/config';
import { uploadFileFTP } from 'src/utils/uploadFileFtp';

@Injectable()
export class NewsService {
  constructor(
    private readonly newRepository: NewsRepository,
    private configService: ConfigService,
  ) {}

  async create(request: CreateNewsDtoInput, file: any, userId: number) {
    const fileName = await uploadFileFTP(
      file,
      this.configService.get<string>('FTP_TEMP_FILE'),
      this.configService.get<string>('FTP_HOST'),
      this.configService.get<string>('FTP_USER'),
      this.configService.get<string>('FTP_PASSWORD'),
    );
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
}
