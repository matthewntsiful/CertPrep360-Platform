const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, '../data/questions-saa-c03.json');

if (!fs.existsSync(dataFile)) {
    console.error(`❌ Data file not found: ${dataFile}`);
    process.exit(1);
}

const questions = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
let errors = 0;
let warnings = 0;

console.log(`Starting validation of ${questions.length} questions...\n`);

questions.forEach((q, i) => {
    const qLabel = `${q.cert_id} | ${q.exam_id} | Q#${i+1}`;
    
    // Check required fields
    if (!q.text || q.text.trim().length === 0) {
        console.error(`❌ [ERROR] ${qLabel}: Missing question text`);
        errors++;
    }
    
    if (!q.options || typeof q.options !== 'object' || Object.keys(q.options).length < 2) {
        console.error(`❌ [ERROR] ${qLabel}: Missing or insufficient options`);
        errors++;
    } else {
        // Validate correct answer exists in options
        // Handle both comma-separated "A, B" and concatenated "AB" formats
        const correctAnswers = Array.from(q.correct.replace(/,/g, '').replace(/\s/g, ''));
        correctAnswers.forEach(ans => {
            if (!q.options[ans]) {
                console.error(`❌ [ERROR] ${qLabel}: Correct answer "${ans}" not found in options keys: [${Object.keys(q.options).join(', ')}]`);
                errors++;
            }
        });
    }
    
    if (!q.explanation || q.explanation.trim().length === 0) {
        console.warn(`⚠️ [WARN] ${qLabel}: Missing explanation`);
        warnings++;
    }
    
    if (!q.domain) {
        console.warn(`⚠️ [WARN] ${qLabel}: Missing domain allocation`);
        warnings++;
    }
});

console.log(`\nValidation Summary:`);
console.log(`- Total Questions: ${questions.length}`);
console.log(`- Errors: ${errors}`);
console.log(`- Warnings: ${warnings}`);

if (errors > 0) {
    console.log(`\n❌ Validation FAILED. Please fix the errors above before continuing.`);
    process.exit(1);
} else {
    console.log(`\n✅ Validation PASSED! Data is clean and ready for implementation.`);
}
