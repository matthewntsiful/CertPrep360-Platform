const fs = require('fs');
const path = require('path');

const examDir = path.join(__dirname, '../website/public/certifications/associate/saa-c03/exams');
const outputDir = path.join(__dirname, '../data');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

const allQuestions = [];
const files = fs.readdirSync(examDir).filter(f => f.endsWith('.html'));

console.log(`Found ${files.length} exam files. Starting extraction...`);

files.forEach(file => {
    const filePath = path.join(examDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Derived IDs
    const certId = 'SAA-C03';
    const examId = file.replace('.html', '');
    
    // Regex to find the examQuestions array
    const regex = /const examQuestions = (\[[\s\S]*?\]);/;
    const match = content.match(regex);
    
    if (match && match[1]) {
        try {
            const questions = JSON.parse(match[1]);
            questions.forEach((q, index) => {
                allQuestions.push({
                    cert_id: certId,
                    exam_id: examId,
                    q_id: `${examId}_Q${String(index + 1).padStart(3, '0')}`,
                    ...q
                });
            });
            console.log(`✅ Extracted ${questions.length} questions from ${file}`);
        } catch (e) {
            console.error(`❌ Failed to parse JSON from ${file}:`, e.message);
        }
    } else {
        console.warn(`⚠️ No questions found in ${file}`);
    }
});

const outputPath = path.join(outputDir, 'questions-saa-c03.json');
fs.writeFileSync(outputPath, JSON.stringify(allQuestions, null, 2));

console.log(`\n🎉 Extraction Complete!`);
console.log(`Total Questions: ${allQuestions.length}`);
console.log(`Output saved to: ${outputPath}`);
