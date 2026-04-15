const fs = require('fs');

const INPUT_FILE = 'docs/rawText.txt';
const OUTPUT_FILE = 'data/questions-saa-c03-ext.json';

function parseRawText() {
  console.log('🔍 Starting extraction from ' + INPUT_FILE);
  if (!fs.existsSync(INPUT_FILE)) {
    console.error('File not found: ' + INPUT_FILE);
    process.exit(1);
  }

  const content = fs.readFileSync(INPUT_FILE, 'utf8');
  const lines = content.split('\n');
  const questions = [];
  let currentQuestion = null;
  let capturingOptions = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const questionMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (questionMatch && !line.includes('Suggested Answer')) {
      if (currentQuestion) questions.push(currentQuestion);
      currentQuestion = {
        q_id: questionMatch[1],
        text: questionMatch[2],
        options: [],
        correct: '',
        explanation: 'Detailed domain analysis for SAA-C03. Part of the master data reservoir.',
        resources: ['https://aws.amazon.com/documentation/'],
        domain: 'Uncategorized'
      };
      capturingOptions = false;
      continue;
    }

    if (currentQuestion && !line.match(/^[A-E]\./) && !line.startsWith('Suggested Answer:') && !capturingOptions) {
      if (!line.includes('Global IT Certification Hub') && !line.includes('Visit Global IT Certification Hub') && !line.includes('Page')) {
         currentQuestion.text += ' ' + line;
      }
    }

    const optionMatch = line.match(/^([A-E])\.\s+(.*)/);
    if (optionMatch && currentQuestion) {
      currentQuestion.options.push(line);
      capturingOptions = true;
      continue;
    }

    const answerMatch = line.match(/Suggested Answer:\s*([A-E,]+)/i);
    if (answerMatch && currentQuestion) {
      currentQuestion.correct = answerMatch[1].trim().toUpperCase();
      capturingOptions = false;
      continue;
    }
  }

  if (currentQuestion) questions.push(currentQuestion);
  const cleanedQuestions = questions.filter(q => q.text && q.options.length > 0 && q.correct);
  console.log('✅ Extraction complete. Found ' + cleanedQuestions.length + ' valid questions.');
  
  if (!fs.existsSync('data')) fs.mkdirSync('data');
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(cleanedQuestions, null, 2));
}

parseRawText();
