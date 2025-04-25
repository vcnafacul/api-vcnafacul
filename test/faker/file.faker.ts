import { Readable } from 'stream';

export function FileFaker({
  name = 'arquivo.docx',
  originalName = 'arquivo.docx',
  buffer = Buffer.from('conteúdo fake de um arquivo docx'),
}) {
  const fakeFile: Express.Multer.File = {
    fieldname: name,
    originalname: originalName,
    encoding: '7bit',
    mimetype:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer: buffer,
    size: 1000,
    destination: '',
    filename: '',
    path: '',
    stream: Readable.from([]),
  };

  return fakeFile;
}
