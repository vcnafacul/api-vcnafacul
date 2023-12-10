import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { diskStorage } from 'multer';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

const multerConfig = {
  storage: diskStorage({
    destination: './upload/files',
    filename: (req, file, cb) => {
      const fileName = uuidv4();

      const extension = path.parse(file.originalname).ext;
      cb(null, `${fileName}${extension}`);
    },
  }),
};

export default multerConfig;

@Injectable()
export class MulterConfig {
  constructor(private configService: ConfigService) {}
  getOption() {
    return {
      storage: diskStorage({
        destination: this.configService.get<string>('VPS_IMAGE'),
        filename: (req, file, cb) => {
          const fileName = uuidv4();

          const extension = path.parse(file.originalname).ext;
          cb(null, `${fileName}${extension}`);
        },
      }),
    };
  }
}
