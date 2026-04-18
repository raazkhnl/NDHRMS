import { jsPDF } from 'jspdf';

export function generateAdmitCard({
  candidateName,
  rollNumber,
  postName,
  examDate,
  examCenter,
  fatherName,
  dob,
  address,
  gender
}) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;

  // Outer border
  doc.setDrawColor(196, 30, 58); // crimson
  doc.setLineWidth(2);
  doc.rect(margin, margin, contentWidth, 760);

  // Red header band
  doc.setFillColor(196, 30, 58);
  doc.rect(margin, margin, contentWidth, 70, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Lok Sewa Aayog  /  Public Service Commission Nepal', pageWidth / 2, margin + 28, {
    align: 'center'
  });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Anamnagar, Kathmandu, Nepal', pageWidth / 2, margin + 48, { align: 'center' });

  // Seal placeholder circle
  doc.setFillColor(10, 22, 40);
  doc.circle(margin + 50, margin + 110, 32, 'F');
  doc.setTextColor(212, 168, 83);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('PSC', margin + 50, margin + 108, { align: 'center' });
  doc.text('NEPAL', margin + 50, margin + 118, { align: 'center' });

  // Title
  doc.setTextColor(10, 22, 40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('ADMIT CARD', pageWidth / 2, margin + 115, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(107, 117, 136);
  doc.text('Online Examination Registration 2082/83', pageWidth / 2, margin + 135, {
    align: 'center'
  });

  // Photo placeholder box with default avatar silhouette
  doc.setDrawColor(205, 211, 223);
  doc.setLineWidth(1);
  const photoX = pageWidth - margin - 90;
  const photoY = margin + 90;
  const photoW = 70;
  const photoH = 90;
  doc.rect(photoX, photoY, photoW, photoH);

  // Navy fill background for avatar
  const avatarColor = gender === 'Female' ? [196, 30, 58] : [10, 22, 40];
  const fgColor = gender === 'Female' ? [255, 217, 224] : [212, 168, 83];
  doc.setFillColor(...avatarColor);
  doc.rect(photoX + 1, photoY + 1, photoW - 2, photoH - 2, 'F');
  // Head circle
  doc.setFillColor(...fgColor);
  doc.circle(photoX + photoW / 2, photoY + 28, 14, 'F');
  // Shoulder ellipse
  doc.ellipse(photoX + photoW / 2, photoY + photoH, 28, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.text('DEFAULT', photoX + photoW / 2, photoY + photoH - 4, { align: 'center' });

  // Separator
  doc.setDrawColor(205, 211, 223);
  doc.line(margin + 20, margin + 200, pageWidth - margin - 20, margin + 200);

  // Data grid
  const rows = [
    ['Roll Number', rollNumber || '—'],
    ['Candidate Name', candidateName || '—'],
    ["Father's Name", fatherName || '—'],
    ['Date of Birth', dob || '—'],
    ['Post Applied', postName || '—'],
    ['Exam Date', examDate || '—'],
    ['Exam Center', examCenter || '—'],
    ['Address', address || '—']
  ];

  let y = margin + 230;
  const labelX = margin + 30;
  const valueX = margin + 180;

  doc.setFontSize(11);
  rows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(61, 69, 88);
    doc.text(`${label}:`, labelX, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(10, 22, 40);
    const wrapped = doc.splitTextToSize(String(value), contentWidth - 180);
    doc.text(wrapped, valueX, y);
    y += wrapped.length * 14 + 10;
  });

  // Instructions
  y += 10;
  doc.setDrawColor(212, 168, 83);
  doc.setLineWidth(1);
  doc.line(margin + 20, y, pageWidth - margin - 20, y);
  y += 18;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(196, 30, 58);
  doc.text('Instructions:', margin + 30, y);
  y += 16;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(61, 69, 88);
  const instructions = [
    '1. This admit card must be brought to the examination hall.',
    '2. Candidates must arrive 30 minutes before the examination starts.',
    '3. Bring a valid government-issued photo ID along with this admit card.',
    '4. Mobile phones and electronic devices are strictly prohibited.',
    '5. Results will be published on the official PSC website.'
  ];
  instructions.forEach((line) => {
    doc.text(line, margin + 30, y);
    y += 13;
  });

  // Footer
  doc.setDrawColor(10, 22, 40);
  doc.setLineWidth(0.5);
  doc.line(margin + 30, 760, margin + 170, 760);
  doc.line(pageWidth - margin - 170, 760, pageWidth - margin - 30, 760);

  doc.setFontSize(9);
  doc.setTextColor(107, 117, 136);
  doc.text("Candidate's Signature", margin + 100, 775, { align: 'center' });
  doc.text('Authorized Signatory', pageWidth - margin - 100, 775, { align: 'center' });

  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);

  // Also trigger direct download
  const filename = `admit-card-${(rollNumber || 'PSC').replace(/\s+/g, '-')}.pdf`;
  doc.save(filename);

  return url;
}
