import Handlebars from 'handlebars';
import * as htmlToPdfmake from 'html-to-pdfmake';
import { JSDOM } from 'jsdom';
import * as path from 'path';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { CacheService } from 'src/shared/modules/cache/cache.service';
import { EnvService } from 'src/shared/modules/env/env.service';
import { BlobService } from 'src/shared/services/blob/blob-service';
import PdfPrinter = require('pdfmake');

export const createTermOfUse = async (
  blobService: BlobService,
  envService: EnvService,
  cache: CacheService,
  nameOfPartner: string,
  emailOfPartner: string,
) => {
  // 1. Carrega o template HTML do bucket (como string)
  const file = await cache.wrap(
    'term-of-use-html',
    async () =>
      await blobService.getFile(
        'termo_template.html',
        envService.get('BUCKET_PARTNERSHIP_DOC'),
      ),
  );

  const htmlTemplate = Buffer.from(file.buffer, 'base64').toString('utf8');

  // 2. Preenche placeholders com Handlebars
  const template = Handlebars.compile(htmlTemplate);
  const filledHtml = template({
    NOME_DO_CURSINHO: nameOfPartner ?? 'Cursinho Parceiro',
    EMAIL_DO_CURSINHO: emailOfPartner ?? '',
  });

  // 3. Converte esse HTML simplificado em um conteúdo pdfmake (aqui vamos só jogar como texto)
  const dom = new JSDOM();
  const converted = htmlToPdfmake(filledHtml, { window: dom.window });

  const docDefinition: TDocumentDefinitions = {
    content: converted,
    styles: {
      header: { fontSize: 18, bold: true, alignment: 'center' },
      body: { fontSize: 12, lineHeight: 1.4 },
    },
  };

  // 4. Usa pdfmake para gerar o PDF
  const fonts = {
    Roboto: {
      normal: path.resolve(__dirname, '../../../../fonts/Roboto-Regular.ttf'),
      bold: path.resolve(__dirname, '../../../../fonts/Roboto-Bold.ttf'),
      italics: path.resolve(__dirname, '../../../../fonts/Roboto-Italic.ttf'),
      bolditalics: path.resolve(
        __dirname,
        '../../../../fonts/Roboto-BoldItalic.ttf',
      ),
    },
  };

  const printer = new PdfPrinter(fonts);
  const pdfDoc = printer.createPdfKitDocument(docDefinition);

  const chunks: Buffer[] = [];
  pdfDoc.on('data', (chunk) => chunks.push(chunk));
  pdfDoc.end();

  const pdfBuffer: Buffer = await new Promise((resolve) => {
    pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
  });

  return {
    originalname: 'termo-parceria.pdf',
    buffer: pdfBuffer,
    mimetype: 'application/pdf',
  };
};
