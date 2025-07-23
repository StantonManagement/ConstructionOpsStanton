import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface G703LineItem {
  item_no?: number;
  description_of_work?: string;
  scheduled_value?: number;
  previous?: number; // Stored as percentage of scheduled_value
  this_period?: number; // Will be computed as submitted_percent - previous
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
  previousDate: string;
  lineItems: G703LineItem[];
}

export async function generateG703Pdf({
  project,
  contractor,
  applicationNumber,
  invoiceDate,
  period,
  dateSubmitted,
  previousDate,
  lineItems,
}: GenerateG703PdfParams): Promise<{ pdfBytes: Uint8Array; filename: string }> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Calculate totals with this_period as difference
  const contractTotal = lineItems.reduce((sum, li) => sum + (li.scheduled_value || 0), 0);
  const prevTotal = lineItems.reduce((sum, li) => sum + (((li.previous || 0) / 100) * (li.scheduled_value || 0)), 0);
  const thisPeriodTotal = lineItems.reduce((sum, li) => {
    const submittedPercent = li.this_period || 0;
    const previousPercent = li.previous || 0;
    const thisPeriodPercent = submittedPercent > previousPercent ? submittedPercent - previousPercent : 0;
    return sum + ((thisPeriodPercent / 100) * (li.scheduled_value || 0));
  }, 0);
  const matStoredTotal = lineItems.reduce((sum, li) => sum + (li.material_presently_stored || 0), 0);
  const totalCompleted = lineItems.reduce((sum, li) => {
    const submittedPercent = li.this_period || 0;
    const previousPercent = li.previous || 0;
    const thisPeriodPercent = submittedPercent > previousPercent ? submittedPercent - previousPercent : 0;
    return sum + (((previousPercent + thisPeriodPercent) / 100) * (li.scheduled_value || 0)) + (li.material_presently_stored || 0);
  }, 0);
  const balanceTotal = lineItems.reduce((sum, li) => sum + (li.balance_to_finish || 0), 0);
  const retainageTotal = lineItems.reduce((sum, li) => sum + (li.retainage || 0), 0);

  const originalContract = contractTotal;
  const netChange = 0;
  const presentContract = originalContract + netChange;
  const originalWorkCompleted = totalCompleted;
  const netChangeWorkCompleted = 0;
  const totalCompletedStored = originalWorkCompleted + netChangeWorkCompleted;
  const retainageCompleted = retainageTotal;
  const retainageStored = 0;
  const totalRetainage = retainageCompleted + retainageStored;
  const backCharges = 0;
  const totalEarnedLessRet = totalCompletedStored - totalRetainage - backCharges;
  const previousRequests = prevTotal;
  const currentAmount = totalEarnedLessRet - previousRequests;
  const balanceToFinishPlusRet = presentContract - totalEarnedLessRet;

  // Constants for colors
  const colors = {
    black: rgb(0, 0, 0),
    lightGray: rgb(0.95, 0.95, 0.95),
    headerGray: rgb(0.9, 0.9, 0.9),
    white: rgb(1, 1, 1),
  };

  // Add cover page - Portrait A4
  const coverPage = pdfDoc.addPage([595, 842]);
  const cWidth = 595;
  const cHeight = 842;
  const margin = 50;
  let y = cHeight - margin;
  const lineHeight = 15;
  const smallSize = 10;

  // Company name
  coverPage.drawText('Chain-JP LLC', { x: margin, y, size: 14, font: fontBold, color: colors.black });

  // Application title
  const appTitle = 'Contractor/Vendor Application for Payment';
  const appTitleWidth = fontBold.widthOfTextAtSize(appTitle, 12);
  coverPage.drawText(appTitle, { x: (cWidth - appTitleWidth) / 2, y: y - lineHeight, size: 12, font: fontBold, color: colors.black });

  // Exhibit "J"
  const exhibit = 'Exhibit "J"';
  const exhibitWidth = font.widthOfTextAtSize(exhibit, 12);
  coverPage.drawText(exhibit, { x: cWidth - margin - exhibitWidth, y: y - lineHeight, size: 12, font, color: colors.black });

  y -= 3 * lineHeight;

  // To: and DATE:
  coverPage.drawText('To:', { x: margin, y, size: smallSize, font, color: colors.black });
  coverPage.drawText('Stanton Management LLC', { x: margin + 40, y, size: smallSize, font, color: colors.black });
  coverPage.drawText('DATE:', { x: margin + 300, y, size: smallSize, font, color: colors.black });
  coverPage.drawText(invoiceDate || '', { x: margin + 340, y, size: smallSize, font, color: colors.black });

  y -= lineHeight;

  // 421 Park St and Previous Date:
  coverPage.drawText('421 Park St', { x: margin + 40, y, size: smallSize, font, color: colors.black });
  coverPage.drawText('Previous Date:', { x: margin + 300, y, size: smallSize, font, color: colors.black });
  coverPage.drawText(previousDate || '', { x: margin + 390, y, size: smallSize, font, color: colors.black });

  y -= lineHeight;

  // Hartford, CT 06106 and PERIOD COVERED:
  coverPage.drawText('Hartford, CT 06106', { x: margin + 40, y, size: smallSize, font, color: colors.black });
  coverPage.drawText('PERIOD COVERED:', { x: margin + 300, y, size: smallSize, font, color: colors.black });
  coverPage.drawText(period || '', { x: margin + 410, y, size: smallSize, font, color: colors.black });

  y -= lineHeight;

  // Owner:
  coverPage.drawText('Owner:', { x: margin, y, size: smallSize, font, color: colors.black });
  coverPage.drawText('SREP Hartford I LLC', { x: margin + 50, y, size: smallSize, font, color: colors.black });

  y -= 1.5 * lineHeight;

  // FROM: and Application #:
  coverPage.drawText('FROM:', { x: margin, y, size: smallSize, font, color: colors.black });
  coverPage.drawText(contractor.name || 'Chain-JP LLC', { x: margin + 40, y, size: smallSize, font, color: colors.black });
  coverPage.drawText('Application #:', { x: margin + 300, y, size: smallSize, font, color: colors.black });
  coverPage.drawText(`${applicationNumber || ''}`, { x: margin + 390, y, size: smallSize, font, color: colors.black });

  y -= lineHeight;

  // 32 Blue Cliff Terrace
  coverPage.drawText('32 Blue Cliff Terrace', { x: margin + 40, y, size: smallSize, font, color: colors.black });

  y -= lineHeight;

  // New Haven, CT 06513
  coverPage.drawText('New Haven, CT 06513', { x: margin + 40, y, size: smallSize, font, color: colors.black });

  y -= lineHeight;

  // Officer:
  coverPage.drawText('Officer:', { x: margin, y, size: smallSize, font, color: colors.black });
  coverPage.drawText('Olguer Cadena', { x: margin + 50, y, size: smallSize, font, color: colors.black });

  y -= lineHeight;

  // Title: and Trade:
  coverPage.drawText('Title:', { x: margin, y, size: smallSize, font, color: colors.black });
  coverPage.drawText('Trade:', { x: margin + 300, y, size: smallSize, font, color: colors.black });
  coverPage.drawText('Exterior Stairs/Decking/ Window Capping', { x: margin + 340, y, size: smallSize, font, color: colors.black });

  y -= 1.5 * lineHeight;

  // Application for Payment in connection with
  coverPage.drawText('Application for Payment in connection with', { x: margin, y, size: smallSize, font, color: colors.black });
  coverPage.drawText(project.name || '', { x: margin + 280, y, size: smallSize, font, color: colors.black });
  coverPage.drawText('Hartford', { x: margin + 400, y, size: smallSize, font, color: colors.black });

  y -= lineHeight;

  coverPage.drawText(project.address || '', { x: cWidth - margin - font.widthOfTextAtSize(project.address || '', smallSize), y, size: smallSize, font, color: colors.black });

  y -= 1.5 * lineHeight;

  // Financial lines table
  const descX = margin;
  const dollarX = margin + 330;
  const valueX = cWidth - margin;
  const dottedThickness = 0.5;
  const dottedColor = colors.black;
  const dashArray = [1, 1];

  const getValueStr = (val: number) => val === 0 ? '-' : val.toLocaleString();

  const financialLines = [
    { label: '1. Original Contract Value', hasDollar: true, value: getValueStr(originalContract) },
    { label: '2. Net Change Order Value', hasDollar: true, value: getValueStr(netChange) },
    { label: '3. Present Contract Value', hasDollar: true, value: getValueStr(presentContract) },
    { label: '4. Original Contract Work Completed', hasDollar: true, value: getValueStr(originalWorkCompleted) },
    { label: '5. Net Change Order Work Completed', hasDollar: true, value: getValueStr(netChangeWorkCompleted) },
    { label: '6. Total Contract Work Completed & Stored To Date', hasDollar: true, value: getValueStr(totalCompletedStored) },
    { label: '7. Retainage', hasDollar: false, value: null },
    { label: 'a. 0 % of Completed Work', hasDollar: true, value: getValueStr(retainageCompleted), indent: 20 },
    { label: 'b. 0 % of Stored Material', hasDollar: true, value: getValueStr(retainageStored), indent: 20 },
    { label: 'c. Total Retainage = (5a+5b)', hasDollar: true, value: getValueStr(totalRetainage), indent: 20 },
    { label: '8. BACK CHARGES.', hasDollar: true, value: getValueStr(backCharges) },
    { label: '9. TOTAL EARNED LESS RETAINAGE (Line 6 less Line 7 Total).', hasDollar: true, value: getValueStr(totalEarnedLessRet) },
    { label: '10. LESS PREVIOUS REQUESTS FOR PAYMENT', hasDollar: true, value: Math.round(previousRequests).toLocaleString() },
    { label: '11. Balance To Finish, Plus Retainage', hasDollar: true, value: `(${getValueStr(balanceToFinishPlusRet)})` },
    { label: '12. TOTAL AMOUNT REQUESTED THIS APPLICATION', hasDollar: true, value: currentAmount.toLocaleString() },
  ];

  for (const line of financialLines) {
    const indent = line.indent || 0;
    const labelX = descX + indent;
    coverPage.drawText(line.label, { x: labelX, y, size: smallSize, font, color: colors.black });
    const labelWidth = font.widthOfTextAtSize(line.label, smallSize);
    const dottedStartX = labelX + labelWidth + 5;
    const dottedEndX = line.hasDollar ? dollarX - 5 : valueX - 5;

    if (line.value !== null || line.hasDollar) {
      coverPage.drawLine({
        start: { x: dottedStartX, y: y + smallSize / 2 },
        end: { x: dottedEndX, y: y + smallSize / 2 },
        thickness: dottedThickness,
        color: dottedColor,
        dashArray,
        dashPhase: 0,
      });
    }

    if (line.hasDollar) {
      coverPage.drawText('$', { x: dollarX, y, size: smallSize, font, color: colors.black });
    }

    if (line.value !== null) {
      const valueText = line.value;
      const valueWidth = font.widthOfTextAtSize(valueText, smallSize);
      coverPage.drawText(valueText, { x: valueX - valueWidth, y, size: smallSize, font, color: colors.black });
    }

    y -= lineHeight;
  }

  y -= lineHeight;

  // Certification text
  const certText = 'The undersigned certifies the above amounts to be actual values as of this date and further attests the information contained in this Application for Payment, Schedule of Values, Subcontractor\'s/Vendor\'s Affidavit and Waiver of Lien to Date to be true and correct.';
  const certLines = wrapText(certText, cWidth - 2 * margin, smallSize);
  certLines.forEach((line) => {
    coverPage.drawText(line, { x: margin, y, size: smallSize, font, color: colors.black });
    y -= 12;
  });

  y -= lineHeight;

  // By: Title: Date:
  coverPage.drawText('By:', { x: margin, y, size: smallSize, font, color: colors.black });
  coverPage.drawLine({ start: { x: margin + 30, y: y - 2 }, end: { x: margin + 200, y: y - 2 }, thickness: 1, color: colors.black });
  coverPage.drawText('Title:', { x: margin + 210, y, size: smallSize, font, color: colors.black });
  coverPage.drawLine({ start: { x: margin + 250, y: y - 2 }, end: { x: margin + 400, y: y - 2 }, thickness: 1, color: colors.black });
  coverPage.drawText('Date:', { x: margin + 410, y, size: smallSize, font, color: colors.black });
  coverPage.drawLine({ start: { x: margin + 450, y: y - 2 }, end: { x: cWidth - margin, y: y - 2 }, thickness: 1, color: colors.black });

  // Continuation sheet page - Landscape A4
  const page = pdfDoc.addPage([842, 595]);
  const { width, height } = page.getSize();

  // Fonts constants
  const fonts = {
    header: { font: fontBold, size: 14 },
    subheader: { font: font, size: 9 },
    small: { font: font, size: 8 },
    tableHeader: { font: fontBold, size: 7 },
    tableData: { font: font, size: 8 },
    tableDataBold: { font: fontBold, size: 8 },
  };

  // Header section
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

  // Project info
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

  // Application details
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

  // Table setup
  const tableStartY = height - 110;
  const rowHeight = 20;
  const headerHeight = 45;
  
  const colXs = [40, 75, 260, 330, 400, 470, 540, 610, 680, 750];
  const colWidths = [35, 185, 70, 70, 70, 70, 70, 70, 70, 70];

  const headers = [
    { line1: 'NO', line2: 'ITEM' },
    { line1: 'OF WORK', line2: 'DESCRIPTION' },
    { line1: 'VALUE', line2:'SCHEDULED'  },
    { line1: 'APPLICATION', line2: 'PREVIOUS', line3: 'FROM' },
    { line1: 'PERIOD', line2: 'THIS' },
    { line1: 'STORED', line2: 'PRESENTLY', line3:'MATERIAL'  },
    { line1: 'DATE', line2: 'STORED TO', line3: 'COMPLETED AND', line4: 'TOTAL' },
    { line1: '% (G/C)' },
    { line1:  'TO FINISH', line2:'BALANCE' },
    { line1:'RETAINAGE' , line2: '0.0%' }
  ];

  // Table header background
  page.drawRectangle({
    x: colXs[0],
    y: tableStartY - headerHeight,
    width: colXs[colXs.length - 1] - colXs[0] + colWidths[colWidths.length - 1],
    height: headerHeight,
    borderWidth: 1,
    color: colors.headerGray,
    borderColor: colors.black,
  });

  // Header text
  headers.forEach((header, i) => {
    const fontSize = 7;
    const lineSpacing = 8;
    const headerLines = [header.line1, header.line2, header.line3, header.line4].filter((line): line is string => !!line && line.trim() !== '');
    const textBlockHeight = headerLines.length * lineSpacing;
    const startY = tableStartY - headerHeight + (headerHeight - textBlockHeight) / 2 + lineSpacing;

    headerLines.forEach((line, lineIndex) => {
      const textWidth = fontBold.widthOfTextAtSize(line, fontSize);
      const centerX = colXs[i] + colWidths[i] / 2;
      page.drawText(line, {
        x: centerX - textWidth / 2,
        y: startY + (lineIndex * lineSpacing) - 4,
        size: fontSize,
        font: fontBold,
        color: colors.black,
      });
    });
  });

  // Wrap text function
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

  // Dynamic row heights
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
  
  // Vertical lines
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

  // Horizontal header line
  page.drawLine({
    start: { x: colXs[0], y: tableStartY - headerHeight },
    end: { x: colXs[colXs.length - 1] + colWidths[colWidths.length - 1], y: tableStartY - headerHeight },
    thickness: 1,
    color: colors.black,
  });

  // Data rows
  let currentY = tableStartY - headerHeight;

  lineItems.forEach((li: G703LineItem, idx: number) => {
    const rowH = rowHeights[idx];
    currentY -= rowH;

    page.drawLine({
      start: { x: colXs[0], y: currentY + rowH },
      end: { x: colXs[colXs.length - 1] + colWidths[colWidths.length - 1], y: currentY + rowH },
      thickness: 1,
      color: colors.black,
    });

    const previousPercent = li.previous || 0;
    const submittedPercent = li.this_period || 0;
    const thisPeriodPercent = submittedPercent > previousPercent ? submittedPercent - previousPercent : 0;
    const prevValue = previousPercent && li.scheduled_value ? (previousPercent / 100) * li.scheduled_value : 0;
    const thisPeriodValue = thisPeriodPercent && li.scheduled_value ? (thisPeriodPercent / 100) * li.scheduled_value : 0;
    const totalCompletedPercentValue = (previousPercent + thisPeriodPercent) && li.scheduled_value ? ((previousPercent + thisPeriodPercent) / 100) * li.scheduled_value : 0;

    const values = [
      li.item_no?.toString() || '',
      li.description_of_work || '',
      li.scheduled_value ? `$${li.scheduled_value.toLocaleString()}` : '',
      prevValue ? `$${Math.round(prevValue).toLocaleString()}` : '',
      thisPeriodPercent ? `${thisPeriodPercent.toFixed(1)}%` : '',
      li.material_presently_stored ? `$${li.material_presently_stored.toLocaleString()}` : '',
      totalCompletedPercentValue ? `$${Math.round(totalCompletedPercentValue + (li.material_presently_stored || 0)).toLocaleString()}` : '',
      li.total_completed && li.scheduled_value ? `${((li.total_completed / li.scheduled_value) * 100).toFixed(1)}%` : '',
      li.balance_to_finish ? `$${li.balance_to_finish.toLocaleString()}` : '',
      li.retainage ? `$${li.retainage.toLocaleString()}` : '',
    ];

    values.forEach((value, i) => {
      if (value) {
        if (i === 0) {
          const textWidth = font.widthOfTextAtSize(value, 8);
          const centerX = colXs[i] + colWidths[i] / 2;
          page.drawText(value, { 
            x: centerX - textWidth / 2, 
            y: currentY + rowH - 14, 
            size: 8, 
            font,
            color: colors.black 
          });
        } else if (i === 1) {
          const descLines = wrapText(value, colWidths[i] - 8, 8);
          const centerX = colXs[i] + colWidths[i] / 2;
          const startY = currentY + rowH - 14 - ((descLines.length - 1) * 11) / 2;
          
          descLines.forEach((line, lineIdx) => {
            const textWidth = font.widthOfTextAtSize(line, 8);
            page.drawText(line, { 
              x: centerX - textWidth / 2, 
              y: startY + (lineIdx * 11), 
              size: 8, 
              font,
              color: colors.black 
            });
          });
        } else {
          const textWidth = font.widthOfTextAtSize(value, 8);
          page.drawText(value, { 
            x: colXs[i] + colWidths[i] - textWidth - 4, 
            y: currentY + rowH - 14, 
            size: 8, 
            font,
            color: colors.black 
          });
        }
      }
    });
  });

  // Contract Total row
  currentY -= rowHeight;
  page.drawLine({
    start: { x: colXs[0], y: currentY + rowHeight },
    end: { x: colXs[colXs.length - 1] + colWidths[colWidths.length - 1], y: currentY + rowHeight },
    thickness: 2,
    color: colors.black,
  });

  page.drawRectangle({
    x: colXs[0],
    y: currentY,
    width: colXs[colXs.length - 1] - colXs[0] + colWidths[colWidths.length - 1],
    height: rowHeight,
    color: colors.lightGray,
  });

  const contractTotalValues = [
    '', 'CONTRACT TOTAL', `$${contractTotal.toLocaleString()}`, `$${Math.round(prevTotal).toLocaleString()}`, 
    thisPeriodTotal && contractTotal ? `${((thisPeriodTotal / contractTotal) * 100).toFixed(1)}%` : '',
    `$${matStoredTotal.toLocaleString()}`, 
    `$${totalCompleted.toLocaleString()}`,
    contractTotal > 0 ? `${((totalCompleted / contractTotal) * 100).toFixed(1)}%` : '',
    `$${balanceTotal.toLocaleString()}`, `$${retainageTotal.toLocaleString()}`
  ];
  
  contractTotalValues.forEach((value, i) => {
    if (value) {
      if (i === 1) {
        const textWidth = fontBold.widthOfTextAtSize(value, 8);
        const centerX = colXs[i] + colWidths[i] / 2;
        page.drawText(value, { 
          x: centerX - textWidth / 2, 
          y: currentY + rowHeight - 14, 
          size: 8, 
          font: fontBold,
          color: colors.black 
        });
      } else {
        const textWidth = fontBold.widthOfTextAtSize(value, 8);
        page.drawText(value, { 
          x: colXs[i] + colWidths[i] - textWidth - 4, 
          y: currentY + rowHeight - 14, 
          size: 8, 
          font: fontBold,
          color: colors.black 
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
    font: fontBold,
    color: colors.black 
  });
  
  const naCenterX = colXs[7] + colWidths[7] / 2;
  const naTextWidth = font.widthOfTextAtSize('n/a', 8);
  page.drawText('n/a', { 
    x: naCenterX - naTextWidth / 2, 
    y: currentY + rowHeight - 14, 
    size: 8, 
    font,
    color: colors.black 
  });

  // Grand Total row
  currentY -= rowHeight;
  page.drawLine({
    start: { x: colXs[0], y: currentY + rowHeight },
    end: { x: colXs[colXs.length - 1] + colWidths[colWidths.length - 1], y: currentY + rowHeight },
    thickness: 2,
    color: colors.black,
  });

  page.drawRectangle({
    x: colXs[0],
    y: currentY,
    width: colXs[colXs.length - 1] - colXs[0] + colWidths[colWidths.length - 1],
    height: rowHeight,
    color: colors.lightGray,
  });

  const grandTotalValues = [
    '', 'GRAND TOTAL', `$${contractTotal.toLocaleString()}`, `$${Math.round(prevTotal).toLocaleString()}`, 
    thisPeriodTotal && contractTotal ? `${((thisPeriodTotal / contractTotal) * 100).toFixed(1)}%` : '',
    `$${matStoredTotal.toLocaleString()}`, 
    `$${totalCompleted.toLocaleString()}`,
    contractTotal > 0 ? `${((totalCompleted / contractTotal) * 100).toFixed(1)}%` : '',
    `$${balanceTotal.toLocaleString()}`, `$${retainageTotal.toLocaleString()}`
  ];
  
  grandTotalValues.forEach((value, i) => {
    if (value) {
      if (i === 1) {
        const textWidth = fontBold.widthOfTextAtSize(value, 8);
        const centerX = colXs[i] + colWidths[i] / 2;
        page.drawText(value, { 
          x: centerX - textWidth / 2, 
          y: currentY + rowHeight - 14, 
          size: 8, 
          font: fontBold,
          color: colors.black 
        });
      } else {
        const textWidth = fontBold.widthOfTextAtSize(value, 8);
        page.drawText(value, { 
          x: colXs[i] + colWidths[i] - textWidth - 4, 
          y: currentY + rowHeight - 14, 
          size: 8, 
          font: fontBold,
          color: colors.black 
        });
      }
    }
  });

  // Outer table border
  page.drawRectangle({
    x: colXs[0],
    y: tableEndY,
    width: colXs[colXs.length - 1] - colXs[0] + colWidths[colWidths.length - 1],
    height: tableStartY - tableEndY,
    borderWidth: 2,
    borderColor: colors.black,
  });

  // Exhibit "J" on continuation sheet
  const exhibitText = 'Exhibit "J"';
  const exhibitTextWidth = fontBold.widthOfTextAtSize(exhibitText, 12);
  page.drawText(exhibitText, { 
    x: width - exhibitTextWidth - 20, 
    y: height - 25, 
    size: 12, 
    font: fontBold,
    color: colors.black 
  });

  const pdfBytes = await pdfDoc.save();
  return { pdfBytes, filename: 'APPLICATION_FOR_PAYMENT.pdf' };
}