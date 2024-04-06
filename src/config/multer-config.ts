import 'dotenv/config';
import { diskStorage } from 'multer';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

const multerConfig = {
  storage: diskStorage({
    destination: `${process.env.VPS_IMAGE}`,
    filename: (req, file, cb) => {
      const fileName = uuidv4();

      const extension = path.parse(file.originalname).ext.toLowerCase();
      cb(null, `${fileName}${extension}`);
    },
  }),
};

export default multerConfig;
