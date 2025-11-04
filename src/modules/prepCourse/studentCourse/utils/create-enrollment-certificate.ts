import * as path from 'path';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import * as QRCode from 'qrcode';
import { EnrollmentCertificate } from '../types/enrollment-certificate';
import PdfPrinter = require('pdfmake');

export const createEnrollmentCertificate = async (
  data: EnrollmentCertificate,
  frontendUrl: string,
) => {
  // 1. Formata as datas
  const startDate = new Date(data.coursePeriod.startDate);
  const endDate = new Date(data.coursePeriod.endDate);
  const coursePeriod = `${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}`;

  const emissionDate = new Date().toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // 2. Formata o CPF
  const cpfFormatted = data.student.cpf.replace(
    /(\d{3})(\d{3})(\d{3})(\d{2})/,
    '$1.$2.$3-$4',
  );

  // 3. Carrega os logos
  const logoPartner = data.logo ? `data:image/png;base64,${data.logo}` : null;
  const logoVcNaFacul = data.logoVcNaFacul
    ? `data:image/png;base64,${data.logoVcNaFacul}`
    : null;

  // 4. Cria o header com logos e informações do cursinho
  const headerContent: any[] = [];

  // Monta o endereço completo
  const address = `${data.geo.street}, ${data.geo.number}${data.geo.complement ? ', ' + data.geo.complement : ''}`;
  const cityState = `${data.geo.city}/${data.geo.state} - CEP: ${data.geo.cep}`;

  const headerColumns: any[] = [];

  // Logo do cursinho (esquerda)
  if (logoPartner) {
    headerColumns.push({
      image: logoPartner,
      width: 80,
      alignment: 'left',
    });
  } else {
    headerColumns.push({ text: '', width: 80 });
  }

  // Informações do cursinho (centro)
  headerColumns.push({
    stack: [
      {
        text: data.geo.name.toUpperCase(),
        style: 'headerTitle',
        alignment: 'center',
      },
      {
        text: address,
        style: 'headerSubtitle',
        alignment: 'center',
        margin: [0, 2, 0, 0],
      },
      {
        text: cityState,
        style: 'headerSubtitle',
        alignment: 'center',
        margin: [0, 2, 0, 0],
      },
      {
        text: `e-mail: ${data.geo.email}`,
        style: 'headerSubtitle',
        alignment: 'center',
        margin: [0, 2, 0, 0],
      },
    ],
    width: '*',
  });

  // Logo do VcNaFacul (direita)
  if (logoVcNaFacul) {
    headerColumns.push({
      image: logoVcNaFacul,
      width: 80,
      alignment: 'right',
    });
  } else {
    headerColumns.push({ text: '', width: 80 });
  }

  headerContent.push({
    columns: headerColumns,
    margin: [0, 20, 0, 30],
  });

  // 5. Gera o QR Code com os dados de verificação
  const verificationData = {
    cpf: data.student.cpf,
    enrollmentCode: data.enrollmentCode,
  };

  // URL que o QR Code vai apontar (pode ser para o frontend ou backend)
  const verificationUrl = `${frontendUrl}/verificar-matricula?cpf=${encodeURIComponent(verificationData.cpf)}&codigo=${encodeURIComponent(verificationData.enrollmentCode)}`;

  // Gera o QR Code como data URL
  const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 150,
  });

  // 6. Cria o conteúdo do documento
  const content: any[] = [
    ...headerContent,
    {
      text: 'DECLARAÇÃO',
      style: 'title',
      alignment: 'center',
      margin: [0, 0, 0, 30],
    },
    {
      text: [
        { text: 'Declaramos para os devidos fins que ', style: 'body' },
        { text: data.student.name, style: 'highlight' },
        { text: ', CPF nº ', style: 'body' },
        { text: cpfFormatted, style: 'highlight' },
        {
          text: ', é estudante regularmente matriculado(a) no ',
          style: 'body',
        },
        { text: data.geo.name, style: 'highlight' },
        { text: ', Campus ', style: 'body' },
        { text: data.geo.city, style: 'highlight' },
        {
          text: '. O(A) estudante frequenta as aulas do curso, as quais são ministradas de segunda-feira a sexta-feira.',
          style: 'body',
        },
      ],
      alignment: 'justify',
      margin: [0, 0, 0, 20],
    },
    {
      text: [
        { text: 'Período letivo: ', style: 'highlight' },
        { text: coursePeriod, style: 'body' },
      ],
      alignment: 'justify',
      margin: [0, 0, 0, 40],
    },
    {
      text: `${data.geo.city}, ${emissionDate}`,
      style: 'body',
      alignment: 'center',
      margin: [0, 0, 0, 60],
    },
    {
      stack: [
        {
          canvas: [
            {
              type: 'line',
              x1: 150,
              y1: 0,
              x2: 350,
              y2: 0,
              lineWidth: 1,
            },
          ],
        },
        {
          text: `Comissão Organizadora do ${data.geo.name}`,
          style: 'signature',
          alignment: 'center',
          margin: [0, 5, 0, 0],
        },
      ],
    },
    {
      columns: [
        {
          width: '*',
          text: '',
        },
        {
          width: 'auto',
          stack: [
            {
              image: qrCodeDataUrl,
              width: 100,
              alignment: 'center',
              margin: [0, 40, 0, 5],
            },
            {
              text: 'Verificar autenticidade',
              style: 'qrCodeText',
              alignment: 'center',
            },
          ],
        },
        {
          width: '*',
          text: '',
        },
      ],
    },
  ];

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [60, 40, 60, 40],
    content: content,
    styles: {
      headerTitle: {
        fontSize: 12,
        bold: true,
        color: '#222',
      },
      headerSubtitle: {
        fontSize: 9,
        color: '#555',
      },
      title: {
        fontSize: 20,
        bold: true,
        color: '#222',
      },
      body: {
        fontSize: 12,
        lineHeight: 1.5,
        color: '#333',
      },
      highlight: {
        fontSize: 12,
        bold: true,
        lineHeight: 1.5,
        color: '#000',
      },
      signature: {
        fontSize: 11,
        color: '#333',
      },
      qrCodeText: {
        fontSize: 9,
        color: '#555',
        italics: true,
      },
    },
  };

  // 7. Usa pdfmake para gerar o PDF
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
    originalname: 'declaracao-matricula.pdf',
    buffer: pdfBuffer,
    mimetype: 'application/pdf',
  };
};
