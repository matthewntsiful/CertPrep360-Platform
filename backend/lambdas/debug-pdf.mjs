import pdfParse from 'pdf-parse';
import { readFile } from 'fs/promises';

const buf = await readFile('../../CertPrep360-ExamGuide/solutions-architect-associate-03.pdf#saa-03-out-of-scope-services.pdf');
const data = await pdfParse(buf);
const text = data.text;

console.log('=== FIRST 4000 CHARS ===');
console.log(text.substring(0, 4000));
console.log('\n=== SEARCHING FOR DOMAIN PATTERNS ===');
const lines = text.split('\n');
lines.forEach((line, i) => {
  if (/domain/i.test(line) || /task statement/i.test(line) || /in.scope/i.test(line)) {
    console.log(`Line ${i}: ${line.trim()}`);
  }
});
