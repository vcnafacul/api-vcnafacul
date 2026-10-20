import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { extname } from 'path';

export const TAMANHO_MAXIMO_DOCX = 20 * 1024 * 1024;

export const MIME_DOCX =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/**
 * O que o upload de conteúdo (demanda e proposta de ajuste) aceita.
 *
 * ⚠️ Antes não havia filtro nenhum: o `accept=".docx"` era só do input do
 * navegador, e qualquer tipo em qualquer tamanho ia para o R2 e virava o
 * "documento" da demanda — o `docx-preview` só quebrava na tela do aluno.
 * O `json({ limit: '30mb' })` do `main.ts` não vale para multipart.
 *
 * Mime **e** extensão: o mime vem do navegador e um `.txt` renomeado chega
 * como `text/plain`; a extensão barra o caso contrário. Um `.docx` corrompido
 * ainda passa — o tipo vem do cabeçalho, não do conteúdo.
 *
 * Quando o tipo vídeo entrar (tickets/049), ganha outro perfil ao lado.
 */
export const docxUploadOptions: MulterOptions = {
  limits: { fileSize: TAMANHO_MAXIMO_DOCX },
  fileFilter: (_req, file, cb) => {
    const extensao = extname(file.originalname || '').toLowerCase();
    if (file.mimetype !== MIME_DOCX || extensao !== '.docx') {
      return cb(
        new BadRequestException('Só é aceito documento Word (.docx).'),
        false,
      );
    }
    cb(null, true);
  },
};
