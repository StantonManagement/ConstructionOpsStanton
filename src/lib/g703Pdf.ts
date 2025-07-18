import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface G703LineItem {
  item_no?: number;
  description_of_work?: string;
  scheduled_value?: number;
  previous?: number; // Stored as percentage of scheduled_value
  this_period?: number; // Stored as percentage of scheduled_value
  material_presently_stored?: number;
  total_completed?: number;
  balance_to_finish?: number;
  retainage?: number;
}

export interface GenerateG703PdfParams {
  project: { name?: string; address?: string };
  contractor: { name?: string };
  applicationNumber: string | number;
  invoiceDate: string;
  period: string;
  dateSubmitted: string;
  lineItems: G703LineItem[];
}

export async function generateG703Pdf({
  project,
  contractor,
  applicationNumber,
  invoiceDate,
  period,
  dateSubmitted,
  lineItems,
}: GenerateG703PdfParams): Promise<{ pdfBytes: Uint8Array; filename: string }> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([842, 595]); // Landscape A4
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Constants for better maintainability
  const colors = {
    black: rgb(0, 0, 0),
    lightGray: rgb(0.95, 0.95, 0.95),
    headerGray: rgb(0.9, 0.9, 0.9),
    white: rgb(1, 1, 1),
  };

  const fonts = {
    header: { font: fontBold, size: 14 },
    subheader: { font: font, size: 9 },
    small: { font: font, size: 8 },
    tableHeader: { font: fontBold, size: 7 },
    tableData: { font: font, size: 8 },
    tableDataBold: { font: fontBold, size: 8 },
  };

  // Header section with improved spacing
  const headerY = height - 30;
  page.drawText('CONTINUATION SHEET', { 
    x: 40, 
    y: headerY, 
    ...fonts.header,
    color: colors.black
  });
  
  page.drawText('APPLICATION AND CERTIFICATE FOR PAYMENT', { 
    x: 40, 
    y: headerY - 18, 
    ...fonts.subheader
  });
  
  page.drawText('AIA DOCUMENT G-703 (Instructions on reverse side)', { 
    x: 40, 
    y: headerY - 31, 
    ...fonts.small
  });
  
  page.drawText('Containing Contractor\'s Signed Certification is attached', { 
    x: 40, 
    y: headerY - 44, 
    ...fonts.small
  });

  // Project info section with better formatting
  const projectInfoX = 320;
  page.drawText('Chain-JP LLC', { 
    x: projectInfoX, 
    y: headerY, 
    font: fontBold, 
    size: 12,
    color: colors.black
  });
  
  page.drawText('Exterior Stain/Decking/ Window Capping', { 
    x: projectInfoX, 
    y: headerY - 18, 
    ...fonts.subheader
  });
  
  page.drawText(project?.name || '', { 
    x: projectInfoX, 
    y: headerY - 31, 
    ...fonts.subheader
  });
  
  page.drawText(project?.address || '', { 
    x: projectInfoX, 
    y: headerY - 44, 
    ...fonts.subheader
  });

  // Application details with improved alignment
  const rightInfoX = 580;
  const appDetails = [
    `APPLICATION NUMBER: ${applicationNumber || ''}`,
    `APPLICATION INVOICE DATE: ${invoiceDate || ''}`,
    `PERIOD: ${period || ''}`,
    `Date Submitted: ${dateSubmitted || ''}`
  ];

  appDetails.forEach((detail, index) => {
    page.drawText(detail, { 
      x: rightInfoX, 
      y: headerY - (index * 13), 
      ...fonts.subheader
    });
  });

  // Enhanced table setup with better spacing
  const tableStartY = height - 110;
  const rowHeight = 20;
  const headerHeight = 45;
  
  // Optimized column positions and widths
  const colXs = [40, 75, 260, 330, 400, 470, 540, 610, 680, 750];
  const colWidths = [35, 185, 70, 70, 70, 70, 70, 70, 70, 70];

  // Enhanced multi-line headers with better formatting
  const headers = [
    { line1: 'ITEM', line2: 'NO.' },
    { line1: 'DESCRIPTION OF WORK', line2: '' },
    { line1: 'SCHEDULED', line2: 'VALUE' },
    { line1: 'FROM PREVIOUS', line2: 'APPLICATION' },
    { line1: 'THIS PERIOD', line2: '' },
    { line1: 'MATERIAL', line2: 'PRESENTLY', line3: 'STORED',  },
    { line1: 'TOTAL', line2: 'COMPLETED', line3: 'AND STORED', line4: 'TO DATE' },
    { line1: '% (G/C)', line2: '' },
    { line1: 'BALANCE TO', line2: 'FINISH', },
    { line1: 'RETAINAGE', line2: '0.0%' }
  ];

  // Draw enhanced table header background
  page.drawRectangle({
    x: colXs[0],
    y: tableStartY - headerHeight,
    width: colXs[colXs.length - 1] - colXs[0] + colWidths[colWidths.length - 1],
    height: headerHeight,
    borderWidth: 1,
    color: colors.headerGray,
    borderColor: colors.black,
  });
  // Draw header text with improved centering
headers.forEach((header, i) => {
  const fontSize = 7;
  const lineSpacing = 8; // Reduced slightly for tighter alignment
  const headerLines = [header.line1, header.line2, header.line3, header.line4, ]
    .filter((line): line is string => !!line && line.trim() !== '');

  // Calculate total height of header text block
  const textBlockHeight = headerLines.length * lineSpacing;
  // Center the text block vertically within the header area
  const startY = tableStartY - headerHeight + (headerHeight - textBlockHeight) / 2 + lineSpacing;

  headerLines.forEach((line, lineIndex) => {
    const textWidth = fontBold.widthOfTextAtSize(line, fontSize);
    const centerX = colXs[i] + colWidths[i] / 2; // Column midpoint
    page.drawText(line, {
      x: centerX - textWidth / 2, // Center each line individually
      y: startY + (lineIndex * lineSpacing) - 4, // Adjust for baseline
      size: fontSize,
      font: fontBold,
      color: colors.black,
    });
  });
});

  // Enhanced text wrapping function
  function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);
      
      if (testWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          // Handle very long words
          const avgCharWidth = font.widthOfTextAtSize('M', fontSize);
          const maxChars = Math.floor(maxWidth / avgCharWidth);
          let remainingWord = word;
          while (remainingWord.length > maxChars) {
            lines.push(remainingWord.substring(0, maxChars));
            remainingWord = remainingWord.substring(maxChars);
          }
          currentLine = remainingWord;
        }
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines;
  }

  // Calculate dynamic row heights
  let totalRowsHeight = 0;
  const rowHeights: number[] = [];
  
  lineItems.forEach((li: G703LineItem) => {
    if (li.description_of_work) {
      const descLines = wrapText(li.description_of_work, colWidths[1] - 8, 8);
      const rowH = Math.max(rowHeight, descLines.length * 11 + 8);
      rowHeights.push(rowH);
      totalRowsHeight += rowH;
    } else {
      rowHeights.push(rowHeight);
      totalRowsHeight += rowHeight;
    }
  });
  
  // Draw vertical column lines with enhanced styling
  const tableEndY = tableStartY - headerHeight - totalRowsHeight - (3 * rowHeight);
  
  for (let i = 0; i <= colXs.length; i++) {
    const x = i < colXs.length ? colXs[i] : colXs[colXs.length - 1] + colWidths[colWidths.length - 1];
    page.drawLine({
      start: { x, y: tableStartY },
      end: { x, y: tableEndY },
      thickness: 1,
      color: colors.black,
    });
  }

  // Draw horizontal line for header
  page.drawLine({
    start: { x: colXs[0], y: tableStartY - headerHeight },
    end: { x: colXs[colXs.length - 1] + colWidths[colWidths.length - 1], y: tableStartY - headerHeight },
    thickness: 1,
    color: colors.black,
  });

  // Enhanced data rows with better formatting
  let currentY = tableStartY - headerHeight;
  let contractTotal = 0, prevTotal = 0, thisPeriodTotal = 0, matStoredTotal = 0, 
      totalCompleted = 0, balanceTotal = 0, retainageTotal = 0;

  lineItems.forEach((li: G703LineItem, idx: number) => {
    const rowH = rowHeights[idx];
    currentY -= rowH;

    // Draw horizontal line for the row
    page.drawLine({
      start: { x: colXs[0], y: currentY + rowH },
      end: { x: colXs[colXs.length - 1] + colWidths[colWidths.length - 1], y: currentY + rowH },
      thickness: 1,
      color: colors.black,
    });

    // Calculate actual dollar amounts
    const prevValue = li.previous && li.scheduled_value ? (li.previous / 100) * li.scheduled_value : 0;
    const thisPeriodValue = li.this_period && li.scheduled_value ? (li.this_period / 100) * li.scheduled_value : 0;

    const values = [
      li.item_no?.toString() || '',
      li.description_of_work || '',
      li.scheduled_value ? `$${li.scheduled_value.toLocaleString()}` : '',
      prevValue ? `$${Math.round(prevValue).toLocaleString()}` : '',
      thisPeriodValue ? `$${Math.round(thisPeriodValue).toLocaleString()}` : '',
      li.material_presently_stored ? `$${li.material_presently_stored.toLocaleString()}` : '',
      li.total_completed ? `$${li.total_completed.toLocaleString()}` : '',
      li.total_completed && li.scheduled_value ? `${((li.total_completed / li.scheduled_value) * 100).toFixed(1)}%` : '',
      li.balance_to_finish ? `$${li.balance_to_finish.toLocaleString()}` : '',
      li.retainage ? `$${li.retainage.toLocaleString()}` : '',
    ];

    values.forEach((value, i) => {
      if (value) {
        if (i === 0) { 
          // Item number - center align
          const textWidth = font.widthOfTextAtSize(value, 8);
          const centerX = colXs[i] + colWidths[i] / 2;
          page.drawText(value, { 
            x: centerX - textWidth / 2, 
            y: currentY + rowH - 14, 
            size: 8, 
            font 
          });
        } else if (i === 1) { 
          // Description - CENTER ALIGN and multi-line
          const descLines = wrapText(value, colWidths[i] - 8, 8);
          const centerX = colXs[i] + colWidths[i] / 2;
          const startY = currentY + rowH - 14 - ((descLines.length - 1) * 11) / 2;
          
          descLines.forEach((line, lineIdx) => {
            const textWidth = font.widthOfTextAtSize(line, 8);
            page.drawText(line, { 
              x: centerX - textWidth / 2, 
              y: startY + (lineIdx * 11), 
              size: 8, 
              font 
            });
          });
        } else { 
          // Numeric values - right align with better padding
          const textWidth = font.widthOfTextAtSize(value, 8);
          page.drawText(value, { 
            x: colXs[i] + colWidths[i] - textWidth - 4, 
            y: currentY + rowH - 14, 
            size: 8, 
            font 
          });
        }
      }
    });

    // Accumulate totals
    contractTotal += li.scheduled_value || 0;
    prevTotal += prevValue || 0;
    thisPeriodTotal += thisPeriodValue || 0;
    matStoredTotal += li.material_presently_stored || 0;
    totalCompleted += li.total_completed || 0;
    balanceTotal += li.balance_to_finish || 0;
    retainageTotal += li.retainage || 0;
  });

  // Enhanced Contract Total row
  currentY -= rowHeight;
  page.drawLine({
    start: { x: colXs[0], y: currentY + rowHeight },
    end: { x: colXs[colXs.length - 1] + colWidths[colWidths.length - 1], y: currentY + rowHeight },
    thickness: 2,
    color: colors.black,
  });

  // Add subtle background for total rows
  page.drawRectangle({
    x: colXs[0],
    y: currentY,
    width: colXs[colXs.length - 1] - colXs[0] + colWidths[colWidths.length - 1],
    height: rowHeight,
    color: colors.lightGray,
  });

  const contractTotalValues = [
    '', 'CONTRACT TOTAL', `$${contractTotal.toLocaleString()}`, `$${Math.round(prevTotal).toLocaleString()}`, 
    `$${Math.round(thisPeriodTotal).toLocaleString()}`, `$${matStoredTotal.toLocaleString()}`, 
    `$${totalCompleted.toLocaleString()}`, contractTotal > 0 ? `${((totalCompleted / contractTotal) * 100).toFixed(1)}%` : '',
    `$${balanceTotal.toLocaleString()}`, `$${retainageTotal.toLocaleString()}`
  ];
  
  contractTotalValues.forEach((value, i) => {
    if (value) {
      if (i === 1) {
        // "CONTRACT TOTAL" - center align
        const textWidth = fontBold.widthOfTextAtSize(value, 8);
        const centerX = colXs[i] + colWidths[i] / 2;
        page.drawText(value, { 
          x: centerX - textWidth / 2, 
          y: currentY + rowHeight - 14, 
          size: 8, 
          font: fontBold 
        });
      } else {
        // Numeric values - right align
        const textWidth = fontBold.widthOfTextAtSize(value, 8);
        page.drawText(value, { 
          x: colXs[i] + colWidths[i] - textWidth - 4, 
          y: currentY + rowHeight - 14, 
          size: 8, 
          font: fontBold 
        });
      }
    }
  });

  // Change Order Total row
  currentY -= rowHeight;
  page.drawLine({
    start: { x: colXs[0], y: currentY + rowHeight },
    end: { x: colXs[colXs.length - 1] + colWidths[colWidths.length - 1], y: currentY + rowHeight },
    thickness: 1,
    color: colors.black,
  });

  const changeOrderCenterX = colXs[1] + colWidths[1] / 2;
  const changeOrderText = 'CHANGE ORDER TOTAL';
  const changeOrderTextWidth = fontBold.widthOfTextAtSize(changeOrderText, 8);
  
  page.drawText(changeOrderText, { 
    x: changeOrderCenterX - changeOrderTextWidth / 2, 
    y: currentY + rowHeight - 14, 
    size: 8, 
    font: fontBold 
  });
  
  const naCenterX = colXs[7] + colWidths[7] / 2;
  const naTextWidth = font.widthOfTextAtSize('n/a', 8);
  page.drawText('n/a', { 
    x: naCenterX - naTextWidth / 2, 
    y: currentY + rowHeight - 14, 
    size: 8, 
    font 
  });

  // Enhanced Grand Total row
  currentY -= rowHeight;
  page.drawLine({
    start: { x: colXs[0], y: currentY + rowHeight },
    end: { x: colXs[colXs.length - 1] + colWidths[colWidths.length - 1], y: currentY + rowHeight },
    thickness: 2,
    color: colors.black,
  });

  // Add background for grand total
  page.drawRectangle({
    x: colXs[0],
    y: currentY,
    width: colXs[colXs.length - 1] - colXs[0] + colWidths[colWidths.length - 1],
    height: rowHeight,
    color: colors.lightGray,
  });

  const grandTotalValues = [
    '', 'GRAND TOTAL $', `$${contractTotal.toLocaleString()}`, `$${Math.round(prevTotal).toLocaleString()}`, 
    `$${Math.round(thisPeriodTotal).toLocaleString()}`, `$${matStoredTotal.toLocaleString()}`, 
    `$${totalCompleted.toLocaleString()}`, contractTotal > 0 ? `${((totalCompleted / contractTotal) * 100).toFixed(1)}%` : '',
    `$${balanceTotal.toLocaleString()}`, `$${retainageTotal.toLocaleString()}`
  ];
  
  grandTotalValues.forEach((value, i) => {
    if (value) {
      if (i === 1) {
        // "GRAND TOTAL $" - center align
        const textWidth = fontBold.widthOfTextAtSize(value, 8);
        const centerX = colXs[i] + colWidths[i] / 2;
        page.drawText(value, { 
          x: centerX - textWidth / 2, 
          y: currentY + rowHeight - 14, 
          size: 8, 
          font: fontBold 
        });
      } else {
        // Numeric values - right align
        const textWidth = fontBold.widthOfTextAtSize(value, 8);
        page.drawText(value, { 
          x: colXs[i] + colWidths[i] - textWidth - 4, 
          y: currentY + rowHeight - 14, 
          size: 8, 
          font: fontBold 
        });
      }
    }
  });

  // Draw enhanced outer table border
  page.drawRectangle({
    x: colXs[0],
    y: tableEndY,
    width: colXs[colXs.length - 1] - colXs[0] + colWidths[colWidths.length - 1],
    height: tableStartY - tableEndY,
    borderWidth: 2,
    borderColor: colors.black,
    color: undefined,
  });

  // Add "Exhibit J" with better positioning
  const exhibitText = 'Exhibit "J"';
  const exhibitTextWidth = fontBold.widthOfTextAtSize(exhibitText, 12);
  page.drawText(exhibitText, { 
    x: width - exhibitTextWidth - 20, 
    y: height - 25, 
    size: 12, 
    font: fontBold 
  });

  const pdfBytes = await pdfDoc.save();
  return { pdfBytes, filename: 'CONTINUATION_SHEET.pdf' };
}