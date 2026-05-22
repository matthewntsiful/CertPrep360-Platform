import pdfParse from 'pdf-parse';
import { readFile } from 'fs/promises';

const buf = await readFile('../../CertPrep360-ExamGuide/solutions-architect-associate-03.pdf#saa-03-out-of-scope-services.pdf');
const data = await pdfParse(buf);
const lines = data.text.split('\n');

// Find ALL occurrences of in-scope header (skip TOC entries with dots)
console.log('=== ALL IN-SCOPE HEADER OCCURRENCES ===');
for (let i = 0; i < lines.length; i++) {
  const t = lines[i].trim();
  if (/in[\s-]*scope\s+aws\s+services/i.test(t)) {
    const hasDots = /\.{5,}/.test(t);
    console.log(`Line ${i} [hasDots=${hasDots}]: ${JSON.stringify(t.substring(0, 80))}`);
  }
}

// Show lines 540-600
console.log('\n=== LINES 540-600 ===');
lines.slice(540, 600).forEach((l, i) => console.log(540+i+':', JSON.stringify(l.substring(0, 80))));
