import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

export async function htmlToPdf(htmlContent: string, outputPath: string): Promise<string> {
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });
    
    await fs.writeFile(outputPath, pdfBuffer);
    return outputPath;
    
  } catch (error) {
    console.error('Error converting HTML to PDF:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export async function textToPdf(textContent: string, outputPath: string): Promise<string> {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          margin: 0;
          padding: 20px;
          color: #333;
        }
        pre {
          white-space: pre-wrap;
          word-wrap: break-word;
          font-family: 'Courier New', monospace;
          background-color: #f5f5f5;
          padding: 15px;
          border-radius: 5px;
          border: 1px solid #ddd;
        }
      </style>
    </head>
    <body>
      <pre>${textContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
    </body>
    </html>
  `;
  
  return await htmlToPdf(htmlContent, outputPath);
}