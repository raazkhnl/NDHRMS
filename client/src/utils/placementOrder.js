import { jsPDF } from 'jspdf';

// Generate and download the placement order PDF for a candidate.
export function generatePlacementOrderPDF(order) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;

  // Outer border (gold)
  doc.setDrawColor(212, 168, 83);
  doc.setLineWidth(2);
  doc.rect(margin, margin, contentWidth, 760);

  // Navy header band
  doc.setFillColor(10, 22, 40);
  doc.rect(margin, margin, contentWidth, 80, 'F');

  doc.setTextColor(212, 168, 83);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('GOVERNMENT OF NEPAL', pageWidth / 2, margin + 26, { align: 'center' });

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Public Service Commission  |  Lok Sewa Aayog', pageWidth / 2, margin + 46, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(212, 168, 83);
  doc.text('Anamnagar, Kathmandu  ·  www.psc.gov.np', pageWidth / 2, margin + 64, { align: 'center' });

  // Order title
  doc.setTextColor(196, 30, 58); // crimson
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('PLACEMENT ORDER', pageWidth / 2, margin + 120, { align: 'center' });

  doc.setTextColor(107, 117, 136);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(
    `Order No. ${order.orderNumber}  ·  Issued ${new Date(order.placementDate).toLocaleDateString()}`,
    pageWidth / 2,
    margin + 140,
    { align: 'center' }
  );

  // Separator
  doc.setDrawColor(212, 168, 83);
  doc.setLineWidth(1);
  doc.line(margin + 20, margin + 155, pageWidth - margin - 20, margin + 155);

  // Intro paragraph
  doc.setTextColor(61, 69, 88);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const intro = [
    'By order of the Public Service Commission, pursuant to the Civil Service Act,',
    'the following candidate is hereby placed into the ministry section specified below.',
    'This order serves as official notification to both the candidate and the receiving ministry.'
  ];
  let y = margin + 180;
  intro.forEach((line) => {
    doc.text(line, margin + 30, y);
    y += 14;
  });
  y += 10;

  // Candidate details grid
  const grid = [
    ['Candidate Name', order.candidateName],
    ['Roll Number', order.rollNumber],
    ['NID Number', order.nidNumber],
    ['Merit Rank', `#${order.resultRank}   (${order.resultScore}/100)`],
    ['Qualification', order.candidateQualification],
    ['Faculty / Stream', `${order.candidateFaculty || '—'} / ${order.candidateStream || '—'}`]
  ];

  doc.setFillColor(248, 249, 252);
  doc.rect(margin + 20, y - 10, contentWidth - 40, grid.length * 20 + 14, 'F');

  grid.forEach(([k, v]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(107, 117, 136);
    doc.setFontSize(10);
    doc.text(k.toUpperCase(), margin + 36, y + 4);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(10, 22, 40);
    doc.setFontSize(12);
    doc.text(String(v || '—'), margin + 180, y + 4);
    y += 20;
  });

  y += 20;

  // Placement box (crimson)
  const placed = !!order.assignedSectionId && order.matchType !== 'unplaced';
  if (placed) {
    doc.setFillColor(196, 30, 58);
    doc.rect(margin + 20, y, contentWidth - 40, 120, 'F');

    doc.setTextColor(212, 168, 83);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('PLACED AT', margin + 36, y + 22);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text(order.assignedMinistry, margin + 36, y + 42);

    doc.setFontSize(22);
    doc.text(order.assignedSectionName, margin + 36, y + 70);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(212, 168, 83);
    const matchInfo = `Education match: ${order.matchType.toUpperCase()} (score ${order.matchScore}/3)  ·  ${
      order.priorityUsed ? `Priority ${order.priorityUsed}` : 'National fallback'
    }`;
    doc.text(matchInfo, margin + 36, y + 98);

    y += 140;
  } else {
    doc.setFillColor(254, 242, 242);
    doc.rect(margin + 20, y, contentWidth - 40, 90, 'F');

    doc.setTextColor(196, 30, 58);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('UNPLACED — Pending Review', margin + 36, y + 30);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(61, 69, 88);
    doc.setFontSize(11);
    doc.text(
      'No matching section vacancy was available. PSC will re-run placement in the next cycle.',
      margin + 36,
      y + 56
    );
    y += 110;
  }

  // Instructions
  doc.setTextColor(107, 117, 136);
  doc.setFontSize(9);
  const instructions = [
    '1. Report to the above ministry within 15 working days of publication.',
    '2. Bring this order, original NID, and academic certificates.',
    '3. Receiving ministry will create your HRMIS officer profile on arrival.',
    '4. Tenure clock begins from the date of joining at the assigned section.',
    '5. Queries: grievance@psc.gov.np  ·  Tel: 01-4200000'
  ];
  instructions.forEach((line) => {
    doc.text(line, margin + 30, y);
    y += 12;
  });

  // DSC signature block
  doc.setDrawColor(205, 211, 223);
  doc.setLineWidth(0.5);
  doc.line(margin + 30, 700, pageWidth - margin - 30, 700);

  doc.setTextColor(107, 117, 136);
  doc.setFontSize(9);
  doc.text('Digital Signature Certificate (DSC) — SHA-256 Hash', margin + 30, 714);
  doc.setTextColor(10, 22, 40);
  doc.setFontSize(7);
  doc.setFont('courier', 'normal');
  const sig = order.dscSignature || '—';
  // Wrap the hash across two lines
  doc.text(sig.substring(0, 64), margin + 30, 726);
  if (sig.length > 64) doc.text(sig.substring(64), margin + 30, 734);

  // Footer
  doc.setDrawColor(10, 22, 40);
  doc.line(pageWidth - margin - 160, 760, pageWidth - margin - 30, 760);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 117, 136);
  doc.text('For Public Service Commission', pageWidth - margin - 95, 775, { align: 'center' });

  const filename = `placement-order-${order.orderNumber}.pdf`;
  doc.save(filename);
}
