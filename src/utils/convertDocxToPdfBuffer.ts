/* eslint-disable @typescript-eslint/no-var-requires */
import puppeteer from 'puppeteer';
const mammoth = require('mammoth');
/**
 * Converte um buffer .docx em um buffer .pdf (em memória)
 */
export async function convertDocxToPdfBuffer(
  docxBuffer: Buffer,
  isTest: boolean,
): Promise<Buffer> {
  if (isTest) {
    return Buffer.from('pdf-fake');
  }
  // 1. Converte o .docx para HTML com o mammoth
  const { value: html } = await mammoth.convertToHtml({ buffer: docxBuffer });

  // 2. Usa puppeteer para transformar HTML em PDF
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  await page.setContent(`
    <html>
      <head>
        <style>
          body {
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
            margin: 0;
            padding: 0;
          }
          p {
            margin: 1em 0;
          }
        </style>
      </head>
      <body>${html}</body>
    </html>
  `);

  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: {
      top: '1in',
      right: '1in',
      bottom: '1in',
      left: '1in',
    },
  });

  await browser.close();

  return Buffer.from(pdfBuffer);
}
