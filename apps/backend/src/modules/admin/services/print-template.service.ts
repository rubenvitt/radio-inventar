import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit');
import * as QRCode from 'qrcode';

/**
 * A4 Layout Constants (72 DPI)
 * A4: 210mm × 297mm = 595 × 842 points
 */
const A4 = {
  WIDTH: 595,
  HEIGHT: 842,
  MARGIN_TOP: 57, // 20mm
  MARGIN_BOTTOM: 57, // 20mm
  MARGIN_LEFT: 43, // 15mm
  MARGIN_RIGHT: 43, // 15mm
} as const;

const CONTENT = {
  WIDTH: A4.WIDTH - A4.MARGIN_LEFT - A4.MARGIN_RIGHT, // ~510pt
  HEIGHT: A4.HEIGHT - A4.MARGIN_TOP - A4.MARGIN_BOTTOM, // ~728pt
} as const;

const HEADER = {
  HEIGHT: 60, // Space for title, date, and QR code
  QR_SIZE: 57, // 2cm × 2cm
} as const;

/**
 * FIX H1: Backend timeout for PDF generation
 * Slightly less than frontend timeout (30s) to ensure backend errors are handled properly
 */
const PDF_GENERATION_TIMEOUT_MS = 25000;

const TABLE = {
  ROW_HEIGHT: 28, // ~10mm - allows ~24-25 rows for handwriting
  HEADER_HEIGHT: 28,
  BORDER_WIDTH: 1,
  FONT_SIZE: 10,
  HEADER_BG_COLOR: '#f0f0f0',
  COLUMNS: [
    { header: 'Gerät (Rufname)', width: 0.2 },
    { header: 'Name', width: 0.2 },
    { header: 'Ausgeliehen am', width: 0.15 },
    { header: 'Zurückgegeben am', width: 0.15 },
    { header: 'Notizen', width: 0.3 },
  ] as const,
} as const;

@Injectable()
export class PrintTemplateService {
  private readonly logger = new Logger(PrintTemplateService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Generates a printable PDF with an empty device list table.
   * Includes QR code linking to the app for offline fallback.
   */
  async generateDeviceListPDF(): Promise<Buffer> {
    this.logger.log('Generating device list PDF');

    try {
      const appUrl = this.getAppUrl();
      const qrCodeDataUrl = await this.generateQRCode(appUrl);
      const pdfBuffer = await this.createPDF(qrCodeDataUrl);
      this.logger.log(`PDF generated successfully, size: ${pdfBuffer.length} bytes`);
      return pdfBuffer;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`PDF generation failed: ${message}`);
      throw new InternalServerErrorException('PDF-Generierung fehlgeschlagen');
    }
  }

  /**
   * Gets and validates the PUBLIC_APP_URL from configuration.
   * Includes API_TOKEN as query parameter for auto-authentication via QR code.
   */
  private getAppUrl(): string {
    const appUrl = this.configService.get<string>('PUBLIC_APP_URL');
    if (!appUrl) {
      throw new Error('PUBLIC_APP_URL not configured');
    }

    const apiToken = this.configService.get<string>('API_TOKEN');
    if (!apiToken) {
      throw new Error('API_TOKEN not configured');
    }

    // Append token as query parameter for auto-authentication
    const url = new URL(appUrl);
    url.searchParams.set('token', apiToken);
    return url.toString();
  }

  /**
   * Generates a QR code as a data URL.
   */
  private async generateQRCode(url: string): Promise<string> {
    try {
      return await QRCode.toDataURL(url, {
        errorCorrectionLevel: 'M', // 15% recovery capability
        width: 200, // High resolution for quality
        margin: 1,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`QR code generation failed: ${message}`);
      throw new InternalServerErrorException('QR-Code-Generierung fehlgeschlagen');
    }
  }

  /**
   * Creates the PDF document with header and table.
   * FIX H1: Added timeout to prevent indefinite hangs
   */
  private async createPDF(qrCodeDataUrl: string): Promise<Buffer> {
    const pdfPromise = new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];

      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: A4.MARGIN_TOP,
          bottom: A4.MARGIN_BOTTOM,
          left: A4.MARGIN_LEFT,
          right: A4.MARGIN_RIGHT,
        },
      });

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Draw header
      this.drawHeader(doc, qrCodeDataUrl);

      // Draw table
      this.drawTable(doc);

      doc.end();
    });

    // FIX H1: Timeout wrapper to prevent indefinite hangs
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('PDF generation timeout'));
      }, PDF_GENERATION_TIMEOUT_MS);
    });

    return Promise.race([pdfPromise, timeoutPromise]);
  }

  /**
   * Draws the page header with title, date, and QR code.
   */
  private drawHeader(doc: PDFKit.PDFDocument, qrCodeDataUrl: string): void {
    const startY = A4.MARGIN_TOP;

    // Title (left side)
    doc
      .font('Helvetica-Bold')
      .fontSize(14)
      .text('Geräteliste - Funkgeräte Inventar', A4.MARGIN_LEFT, startY);

    // Current date (below title, DD.MM.YYYY format)
    const today = new Date();
    const dateStr = today.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    doc
      .font('Helvetica')
      .fontSize(10)
      .text(`Stand: ${dateStr}`, A4.MARGIN_LEFT, startY + 18);

    // QR Code (right side of header)
    const qrX = A4.WIDTH - A4.MARGIN_RIGHT - HEADER.QR_SIZE;
    const qrY = startY;

    doc.image(qrCodeDataUrl, qrX, qrY, {
      width: HEADER.QR_SIZE,
      height: HEADER.QR_SIZE,
    });

    // Hint text next to QR code
    const hintX = qrX - 130; // Position left of QR code
    const hintWidth = 125;
    doc
      .font('Helvetica')
      .fontSize(8)
      .text(
        'Bitte bevorzugt über den QR-Code ausleihen!',
        hintX,
        qrY + 10,
        {
          width: hintWidth,
          align: 'right',
        },
      );
  }

  /**
   * Draws the empty table with column headers.
   */
  private drawTable(doc: PDFKit.PDFDocument): void {
    const tableStartY = A4.MARGIN_TOP + HEADER.HEIGHT + 10;
    const tableWidth = CONTENT.WIDTH;

    // Calculate available height for rows
    const availableHeight = A4.HEIGHT - tableStartY - A4.MARGIN_BOTTOM;
    const rowCount = Math.floor(
      (availableHeight - TABLE.HEADER_HEIGHT) / TABLE.ROW_HEIGHT,
    );

    // Calculate column positions
    const columnWidths = TABLE.COLUMNS.map((col) => col.width * tableWidth);
    const columnPositions: number[] = [];
    let currentX = A4.MARGIN_LEFT;
    for (const width of columnWidths) {
      columnPositions.push(currentX);
      currentX += width;
    }

    // Draw header row with gray background
    doc
      .rect(
        A4.MARGIN_LEFT,
        tableStartY,
        tableWidth,
        TABLE.HEADER_HEIGHT,
      )
      .fill(TABLE.HEADER_BG_COLOR);

    // Draw header text
    doc.font('Helvetica-Bold').fontSize(TABLE.FONT_SIZE).fillColor('black');

    TABLE.COLUMNS.forEach((col, index) => {
      const colPos = columnPositions[index] ?? A4.MARGIN_LEFT;
      const colWidth = columnWidths[index] ?? 100;
      const x = colPos + 4; // 4pt padding
      const width = colWidth - 8; // Account for padding
      doc.text(col.header, x, tableStartY + 8, {
        width,
        align: 'left',
      });
    });

    // Draw header row border
    doc
      .lineWidth(TABLE.BORDER_WIDTH)
      .strokeColor('black')
      .rect(A4.MARGIN_LEFT, tableStartY, tableWidth, TABLE.HEADER_HEIGHT)
      .stroke();

    // Draw vertical lines for header
    columnPositions.slice(1).forEach((x) => {
      doc
        .moveTo(x, tableStartY)
        .lineTo(x, tableStartY + TABLE.HEADER_HEIGHT)
        .stroke();
    });

    // Draw empty rows
    let rowY = tableStartY + TABLE.HEADER_HEIGHT;
    for (let i = 0; i < rowCount; i++) {
      // Draw row rectangle
      doc
        .lineWidth(TABLE.BORDER_WIDTH)
        .rect(A4.MARGIN_LEFT, rowY, tableWidth, TABLE.ROW_HEIGHT)
        .stroke();

      // Draw vertical column separators
      columnPositions.slice(1).forEach((x) => {
        doc.moveTo(x, rowY).lineTo(x, rowY + TABLE.ROW_HEIGHT).stroke();
      });

      rowY += TABLE.ROW_HEIGHT;
    }
  }
}
