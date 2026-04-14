const fs = require('fs');
const path = require('path');

console.log('🔨 Building SAA-C03 Practice Exams...');

// Create public directory
const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Copy static assets
const sourceDir = path.join(__dirname, '../SAA-C03_Complete_Exam_Suite');
const examFiles = fs.readdirSync(path.join(sourceDir, 'Enhanced_HTML_Quizzes'))
  .filter(file => file.endsWith('.html'));

console.log(`📝 Found ${examFiles.length} exam files`);

// Generate exam manifest
const manifest = {
  exams: examFiles.map((file, index) => ({
    id: index + 1,
    filename: file,
    title: `Practice Exam ${index + 1}`,
    questions: 65,
    duration: 130
  })),
  buildTime: new Date().toISOString()
};

fs.writeFileSync(
  path.join(publicDir, 'manifest.json'), 
  JSON.stringify(manifest, null, 2)
);

console.log('✅ Build complete!');
console.log(`📊 Generated manifest with ${manifest.exams.length} exams`);