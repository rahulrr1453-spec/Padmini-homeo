import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generatePrescriptionPDF = async (patientInfo, medicines, notes, prescribingDoctor, chiefComplaints, visitDate) => {
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

  // Line separator
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.line(14, 45, 196, 45);

  // Patient Info Block
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.setFont('helvetica', 'bold');
  doc.text('Patient Details:', 14, 55);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Name: ${patientInfo.name || 'N/A'} ${patientInfo.id ? `(ID: ${patientInfo.id})` : ''}`, 14, 62);
  doc.text(`Age/Sex: ${patientInfo.age || '--'} / ${patientInfo.sex || '--'}`, 100, 62);
  doc.text(`Date: ${visitDate ? new Date(visitDate).toLocaleDateString() : new Date().toLocaleDateString()}`, 150, 62);

  // Chief Complaints Block
  let startYForTable = 75;
  if (chiefComplaints) {
    doc.line(14, 68, 196, 68);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Chief Complaints:', 14, 75);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    const splitCC = doc.splitTextToSize(chiefComplaints, 180);
    doc.text(splitCC, 14, 80);
    
    startYForTable = 85 + (splitCC.length * 4);
  } else {
    doc.line(14, 68, 196, 68);
  }

  // Medicines Table
  const tableData = medicines.map((med, index) => [
    index + 1,
    med.medicineName,
    med.potency,
    med.quantity,
    med.instructions
  ]);

  autoTable(doc, {
    startY: startYForTable,
    head: [['#', 'Medicine / Remedy', 'Potency / Form', 'Quantity', 'Instructions']],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 10,
      cellPadding: 5,
    },
    headStyles: {
      fillColor: [5, 150, 105], // Emerald-600
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // Slate-50
    },
  });

  const finalY = doc.lastAutoTable.finalY || 90;

  // Additional Notes
  if (notes) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Advice / Notes:', 14, finalY + 15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    // Handle long notes with word wrap
    const splitNotes = doc.splitTextToSize(notes, 180);
    doc.text(splitNotes, 14, finalY + 22);
  }

  // Signature Block
  const sigY = finalY + (notes ? 45 : 30);
  doc.line(140, sigY, 190, sigY);
  doc.setFontSize(10);
  doc.text(prescribingDoctor ? prescribingDoctor.name : 'Dr. Padmini', 152, sigY + 6);
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(prescribingDoctor ? `(${prescribingDoctor.qualification})` : '(OP Doctor)', 154, sigY + 10);

  // Save the PDF
  const filenameName = patientInfo.name ? patientInfo.name.replace(/\s+/g, '_') : 'Patient';
  doc.save(`Prescription_${filenameName}_${new Date().toISOString().split('T')[0]}.pdf`);
};
