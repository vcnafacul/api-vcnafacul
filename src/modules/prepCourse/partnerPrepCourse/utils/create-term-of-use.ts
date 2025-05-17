/* eslint-disable @typescript-eslint/no-var-requires */
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { EnvService } from 'src/shared/modules/env/env.service';
import { BlobService } from 'src/shared/services/blob/blob-service';
import { convertDocxToPdfBuffer } from 'src/utils/convertDocxToPdfBuffer';

export const createTermOfUse = async (
  blobService: BlobService,
  envService: EnvService,
) => {
  // 1. Carrega o template .docx
  const file = await blobService.getFile(
    'termo_template.docx',
    envService.get('BUCKET_PARTNERSHIP_DOC'),
  );
  const zip = new PizZip(Buffer.from(file.buffer, 'base64'));
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  // 2. Define os dados a serem preenchidos
  doc.render({
    cursinho: 'Cursinho Esperança 2',
    cnpj: '12.345.678/0001-99',
  });

  // 3. Gera o buffer do .docx
  const docxBuffer = doc.getZip().generate({ type: 'nodebuffer' });

  // 4. Converte .docx buffer → PDF buffer (ex: usando CloudConvert ou puppeteer)
  // Supondo que agora você tem:
  const pdfBuffer = await convertDocxToPdfBuffer(docxBuffer);

  // 5. Cria o "arquivo" simulado para enviar pro R2
  return {
    originalname: 'termo-parceria.pdf',
    buffer: pdfBuffer,
    mimetype: 'application/pdf',
  };
};
