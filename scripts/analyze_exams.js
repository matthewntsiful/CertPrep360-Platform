const fs = require('fs');
const data17 = JSON.parse(fs.readFileSync('/Users/Matthieu/Documents/Jomacs_DevOps/MyProjects/CertPrep360-Platform/scripts/exam17_raw.json'));
const data18 = JSON.parse(fs.readFileSync('/Users/Matthieu/Documents/Jomacs_DevOps/MyProjects/CertPrep360-Platform/scripts/exam18_raw.json'));

const allItems = [...data17.Items, ...data18.Items];
console.log('Total questions in exam 17+18:', allItems.length);
console.log('');

let mismatches = 0;
let multiAnswerQuestions = 0;

allItems.forEach(item => {
  const correct = item.correct.S;
  const text = item.text.S;
  const qid = item.q_id.S;

  // Normalize: strip commas/spaces to get actual answer letters
  const letters = correct.replace(/[,\s]/g, '').split('').filter(c => /[A-Z]/i.test(c));
  const numAnswers = letters.length;

  // Check what the question text says
  const chooseMatch = text.match(/Choose (TWO|THREE|FOUR|two|three|four|\d)/i);
  const chooseText = chooseMatch ? chooseMatch[1].toUpperCase() : null;
  const chooseNum = chooseText === 'TWO' ? 2 : chooseText === 'THREE' ? 3 : chooseText === 'FOUR' ? 4 : (chooseText ? parseInt(chooseText) : null);

  if (numAnswers > 1) multiAnswerQuestions++;

  if (chooseNum && numAnswers !== chooseNum) {
    mismatches++;
    console.log('MISMATCH:', qid);
    console.log('  correct field:', JSON.stringify(correct), '-> actual answers:', numAnswers);
    console.log('  question says: Choose', chooseText, '(' + chooseNum + ')');
    console.log('  text ending:', text.slice(-150));
    console.log('');
  }
});

console.log('Summary:');
console.log('  Total questions:', allItems.length);
console.log('  Multi-answer questions:', multiAnswerQuestions);
console.log('  Mismatches (correct count != choose N):', mismatches);
