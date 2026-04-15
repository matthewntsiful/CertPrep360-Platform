const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.tailwindcss.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://d1.awsstatic.com", "https://images.credly.com"],
      connectSrc: ["'self'", "https://cdn.tailwindcss.com", "https://www.googletagmanager.com"]
    }
  }
}));

app.use(cors());
app.use(express.json());

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Load exam data
const getExams = () => {
  const examDir = path.join(__dirname, 'public/associate/saa-c03/exams');
  const files = fs.readdirSync(examDir)
    .filter(f => f.startsWith('SAA-C03_Minimal_Exam_') && f.endsWith('.html'))
    .sort();
  return files.map((file, index) => ({
    id: index + 1,
    filename: file,
    title: `Practice Exam ${index + 1}`,
    questions: 65,
    duration: 130
  }));
};

// Routes — serve static index.html for all non-API routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get('/api/exams', (req, res) => {
  res.json(getExams());
});

app.listen(PORT, () => {
  console.log(`🚀 SAA-C03 Practice Exams running on http://localhost:${PORT}`);
});