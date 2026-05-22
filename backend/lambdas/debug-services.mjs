import pdfParse from 'pdf-parse';
import { readFile } from 'fs/promises';

const buf = await readFile('../../CertPrep360-ExamGuide/solutions-architect-associate-03.pdf#saa-03-out-of-scope-services.pdf');
const data = await pdfParse(buf);
const lines = data.text.split('\n');

// Find in-scope section
let inScopeStart = -1;
for (let i = 0; i < lines.length; i++) {
  if (/in[\s-]*scope\s+aws\s+services/i.test(lines[i].trim())) {
    inScopeStart = i;
    console.log(`Found in-scope header at line ${i}: ${JSON.stringify(lines[i])}`);
    break;
  }
}

if (inScopeStart >= 0) {
  console.log('\n=== IN-SCOPE SECTION (lines', inScopeStart, 'to', inScopeStart+60, ') ===');
  lines.slice(inScopeStart, inScopeStart + 60).forEach((l, i) => {
    console.log(inScopeStart+i+':', JSON.stringify(l));
  });
}
