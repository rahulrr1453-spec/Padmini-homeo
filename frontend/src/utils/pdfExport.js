import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generatePDF = async (title, columns, data, filename) => {
  const doc = new jsPDF();

  try {
    const img = new Image();
    img.src = '/logo.png';
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    
    // Add Logo
    doc.addImage(img, 'PNG', 14, 15, 24, 24);

    // Clinic Header shifted right
    doc.setFontSize(22);
    doc.setTextColor(5, 150, 105); // Emerald-600
    doc.text('Padmini Homeo Clinic', 42, 22);

    // Address Subheader shifted right
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text('Door No:76-6-16, Lakkakula\'s Lakshmi Bhavan, Gandhipuram -2,', 42, 28);
    doc.text('L.Ramarao Street, Rajahmahendravaram -A.P.- 533103.', 42, 33);
    doc.text('Mobile: 62814 98337   Email: padsur2011@gmail.com', 42, 38);
  } catch (err) {
    // Fallback if logo fails to load
    doc.setFontSize(22);
    doc.setTextColor(5, 150, 105); // Emerald-600
    doc.text('Padmini Homeo Clinic', 14, 22);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text('Door No:76-6-16, Lakkakula\'s Lakshmi Bhavan, Gandhipuram -2,', 14, 28);
    doc.text('L.Ramarao Street, Rajahmahendravaram -A.P.- 533103.', 14, 33);
    doc.text('Mobile: 62814 98337   Email: padsur2011@gmail.com', 14, 38);
  }
  // Management & Doctors
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.setFont('helvetica', 'bold');
  doc.text('LPR.Vittal', 135, 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('(President)', 135, 22);

  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text('Dr. M.Shivamuni, M.D (H)', 135, 27);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('(Retd. Principal)', 135, 31);

  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text('Dr. K.Madhuri (B.H.M.S)', 135, 36);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('(OP Doctor)', 135, 40);

  // Document Title
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text(title, 14, 55);

  // Date Generated
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 62);

  // Table
  autoTable(doc, {
    startY: 68,
    head: [columns],
    body: data,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 4,
    },
    headStyles: {
      fillColor: [5, 150, 105], // Emerald-600
      textColor: 255,
      fontSize: 10,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // Slate-50
    },
  });

  // Save the PDF
  doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
};
