const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function generateTestPDF() {
  const doc = new PDFDocument();
  const outputPath = path.join(__dirname, '../tests/fixtures/test-qa.pdf');
  
  // Ensure directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  doc.pipe(fs.createWriteStream(outputPath));

  doc.fontSize(20).text('Chapter 5: Test Questions', 50, 50);
  doc.moveDown();

  const questions = [
    { q: 'What is the capital of France?', a: 'Paris' },
    { q: 'What is 2 + 2?', a: '4' },
    { q: 'Who wrote Romeo and Juliet?', a: 'William Shakespeare' },
    { q: 'What is the largest planet in our solar system?', a: 'Jupiter' },
    { q: 'What year did World War II end?', a: '1945' }
  ];

  questions.forEach((qa, index) => {
    doc.fontSize(14).text(`Q${index + 1}: ${qa.q}`, 50, doc.y);
    doc.fontSize(12).text(`A: ${qa.a}`, 50, doc.y + 10);
    doc.moveDown();
  });

  doc.end();
  console.log(`Test PDF generated at: ${outputPath}`);
}

generateTestPDF();