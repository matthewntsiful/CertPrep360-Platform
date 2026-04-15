# AWS Solutions Architect Associate (SAA-C03) Exam Suite

A fully functional practice exam application for AWS Solutions Architect Associate certification preparation.

## 🎯 Features

### Exam Features
- **16 Complete Practice Exams** - Each with 65 questions
- **130-Minute Timer** - Matches real exam conditions
- **Auto-Save Progress** - Resume exams within 4 hours
- **Question Navigation** - Jump to any question instantly
- **Flag Questions** - Mark questions for review
- **Dark Mode** - Eye-friendly interface
- **Mobile Responsive** - Take exams on any device

### Results & Analytics
- **Detailed Results** - See your score, pass/fail status, and time taken
- **Answer Review** - Review all questions with correct/incorrect indicators
- **Performance Dashboard** - Track average score, pass rate, and attempts
- **Progress Tracking** - Visual progress bars for each exam
- **Exam History** - View all past attempts and scores
- **Difficulty Levels** - Easy, Medium, Hard, Expert categorization

### Smart Features
- **Pause/Resume Timer** - Take breaks during exams
- **Multi-Select Questions** - Automatic detection of multi-answer questions
- **Completion Badges** - Visual indicators for passed exams
- **Quick Stats** - Hover over exam cards for detailed stats
- **Persistent Storage** - All progress saved in browser localStorage

## 🚀 Quick Start

### Development
```bash
npm install
npm run dev
```
Visit: http://localhost:3000

### Production
```bash
npm start
```

## 📊 Application Structure

```
website/
├── server.js                 # Express server
├── views/
│   └── minimal.ejs          # Landing page with analytics
├── SAA-C03_Complete_Exam_Suite/
│   └── Enhanced_HTML_Quizzes/
│       ├── SAA-C03_Minimal_Exam_01.html  # Exam 1
│       ├── SAA-C03_Minimal_Exam_02.html  # Exam 2
│       └── ...                           # Exams 3-16
└── package.json
```

## 🎓 How to Use

### Taking an Exam
1. Click on any exam card from the landing page
2. Read questions carefully (multi-select questions are marked)
3. Select your answers
4. Use navigation buttons or question grid to move between questions
5. Flag questions you want to review later
6. Click "Submit Exam" when ready

### Reviewing Results
1. After submission, view your score and pass/fail status
2. Click "Review Answers" to see detailed breakdown
3. Green = Correct answer
4. Red = Your incorrect answer
5. Review explanations for each question

### Tracking Progress
- Landing page shows overall progress bar
- Performance dashboard displays:
  - Average score across all exams
  - Number of exams completed
  - Pass rate percentage
  - Total attempts
- Each exam card shows:
  - Last score and pass/fail status
  - Progress bar
  - Best score and attempt count (on hover)

## 💾 Data Storage

All data is stored in browser localStorage:

- `examProgress` - Scores, attempts, results for all exams
- `exam_X_state` - Current exam state (answers, time, flags)
- `theme` - Dark/light mode preference

### Clear Progress
Open browser console and run:
```javascript
localStorage.clear()
```

## 🎨 Customization

### Passing Score
Default: 72% (matches AWS SAA-C03 requirement)

To change, edit in exam files:
```javascript
const passed = score >= 72; // Change 72 to desired percentage
```

### Timer Duration
Default: 130 minutes

To change, edit in exam files:
```javascript
this.timeLeft = 130 * 60; // Change 130 to desired minutes
```

### Difficulty Levels
Edit in `minimal.ejs`:
```javascript
if (i <= 4) { difficulty = 'Easy'; }
else if (i <= 8) { difficulty = 'Medium'; }
else if (i <= 12) { difficulty = 'Hard'; }
else { difficulty = 'Expert'; }
```

## 🔧 Technical Details

### Technologies
- **Backend**: Node.js + Express
- **Frontend**: EJS templating
- **Styling**: Tailwind CSS
- **Storage**: Browser localStorage
- **Animations**: CSS animations + particles

### Browser Support
- Chrome/Edge (recommended)
- Firefox
- Safari
- Mobile browsers

### Performance
- Lightweight: ~50KB per exam page
- No external dependencies (except Tailwind CDN)
- Instant page loads
- Smooth animations

## 📝 Exam Content

Each exam contains:
- 65 questions
- Mix of single and multi-select questions
- Questions from all SAA-C03 domains:
  - Design Secure Architectures
  - Design Resilient Architectures
  - Design High-Performing Architectures
  - Design Cost-Optimized Architectures

## 🎯 Certification Tips

1. **Take all 16 exams** - Comprehensive coverage
2. **Review wrong answers** - Learn from mistakes
3. **Aim for 80%+** - Build confidence above passing score
4. **Retake failed exams** - Improve weak areas
5. **Track progress** - Monitor improvement over time

## 🚀 Deployment

### AWS S3 + CloudFront
```bash
cd infrastructure/terraform/environments/dev
terraform init
terraform apply
```

### Manual Deployment
1. Build static files
2. Upload to S3 bucket
3. Configure CloudFront distribution
4. Update Route53 DNS

## 📄 License

Educational use only. AWS and SAA-C03 are trademarks of Amazon Web Services.

## 🤝 Contributing

This is a practice exam suite. Contributions welcome for:
- Bug fixes
- UI improvements
- Additional features
- Question corrections

## 📞 Support

For issues or questions:
1. Check browser console for errors
2. Clear localStorage and retry
3. Ensure JavaScript is enabled
4. Try different browser

---

**Good luck with your AWS Solutions Architect Associate certification! 🎉**
