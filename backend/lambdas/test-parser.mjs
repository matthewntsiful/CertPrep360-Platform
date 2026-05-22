import { parseDomains, parseServices } from './common/examGuideParser.js';
import pdfParse from 'pdf-parse';
import { readFile } from 'fs/promises';

const buf = await readFile('../../CertPrep360-ExamGuide/solutions-architect-associate-03.pdf#saa-03-out-of-scope-services.pdf');
const data = await pdfParse(buf);
const text = data.text;

const domains = parseDomains(text);
const { inScope, outOfScope } = parseServices(text);

console.log('Domains:', domains.length);
domains.forEach(d => console.log(' -', d.name, '| weight:', d.weight, '| tasks:', d.task_statements.length));
console.log('\nIn-scope services:', inScope.length);
console.log('First 10:', inScope.slice(0, 10));
console.log('\nOut-of-scope services:', outOfScope.length);
console.log('First 5:', outOfScope.slice(0, 5));
