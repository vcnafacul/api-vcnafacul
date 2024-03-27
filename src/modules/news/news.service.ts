import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseService } from 'src/shared/modules/base/base.service';
import { uploadFileFTP } from 'src/utils/uploadFileFtp';
import { CreateNewsDtoInput } from './dtos/create-news.dto.input';
import { News } from './news.entity';
import { NewsRepository } from './news.repository';

@Injectable()
export class NewsService extends BaseService<News> {
  constructor(
    private readonly newRepository: NewsRepository,
    private configService: ConfigService,
  ) {
    super(newRepository);
  }

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

  async findActived() {
    const where = { actived: true };
    return await this.newRepository.findBy(where);
  }
}
