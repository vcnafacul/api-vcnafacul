import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { BaseService } from 'src/shared/modules/base/base.service';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { EnvService } from 'src/shared/modules/env/env.service';
import { uploadFileFTP } from 'src/utils/uploadFileFtp';
import { Status } from '../simulado/enum/status.enum';
import { CreateNewsDtoInput } from './dtos/create-news.dto.input';
import { GetAllNewsDtoInput } from './dtos/get-all-news';
import { News } from './news.entity';
import { NewsRepository } from './news.repository';

@Injectable()
export class NewsService extends BaseService<News> {
  constructor(
    private readonly repository: NewsRepository,
    private envService: EnvService,
  ) {
    super(repository);
  }

  async create(
    request: CreateNewsDtoInput,
    file: Express.Multer.File,
    userId: string,
  ) {
    const fileName = await uploadFileFTP(
      file,
      this.envService.get('FTP_HOST'),
      this.envService.get('FTP_USER'),
      this.envService.get('FTP_PASSWORD'),
    );
    if (!fileName) {
      throw new HttpException('error to upload file', HttpStatus.BAD_REQUEST);
    }
    const news = new News();
    news.session = request.session;
    news.title = request.title;
    news.fileName = fileName;
    news.updatedBy = userId;

    return await this.repository.create(news);
  }

  async findActived() {
    const where = { actived: true };
    return await this.repository.findAllBy({ page: 1, limit: 0, where });
  }

  override async findAllBy(
    query: GetAllNewsDtoInput,
  ): Promise<GetAllOutput<News>> {
    return await this.repository.findAllBy({
      ...query,
      where: {
        actived: query.status.toString() === Status.Approved.toString(),
      },
    });
  }
}
