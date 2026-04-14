#!/usr/bin/env python3

import os
import glob

def add_enhanced_review_section():
    exam_dir = "SAA-C03_Complete_Exam_Suite/Associate_Exams"
    exam_files = glob.glob(f"{exam_dir}/*.html")
    
    # Enhanced review methods
    enhanced_review_methods = '''
    showEnhancedReview() {
        const reviewContainer = document.getElementById('questionContainer');
        const reviewData = this.generateReviewData();
        
        reviewContainer.innerHTML = `
            <div class="enhanced-review-container">
                <div class="review-header">
                    <h2>📝 Question Review & Analysis</h2>
                    <div class="review-stats">
                        <div class="stat-item">
                            <span class="stat-value correct">${reviewData.correct}</span>
                            <span class="stat-label">Correct</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value incorrect">${reviewData.incorrect}</span>
                            <span class="stat-label">Incorrect</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value unanswered">${reviewData.unanswered}</span>
                            <span class="stat-label">Unanswered</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value flagged">${reviewData.flagged}</span>
                            <span class="stat-label">Flagged</span>
                        </div>
                    </div>
                </div>
                
                <div class="review-filters">
                    <button class="filter-btn active" onclick="exam.filterReview('all')">All Questions</button>
                    <button class="filter-btn" onclick="exam.filterReview('incorrect')">Incorrect Only</button>
                    <button class="filter-btn" onclick="exam.filterReview('unanswered')">Unanswered Only</button>
                    <button class="filter-btn" onclick="exam.filterReview('flagged')">Flagged Only</button>
                    <button class="filter-btn" onclick="exam.filterReview('correct')">Correct Only</button>
                </div>
                
                <div class="review-questions" id="reviewQuestions">
                    ${this.generateReviewQuestions(reviewData.questions)}
                </div>
                
                <div class="review-actions">
                    <button class="action-btn" onclick="exam.displayQuestion(exam.currentQuestion)">
                        ← Back to Exam
                    </button>
                    <button class="action-btn" onclick="exam.exportReview()">
                        📄 Export Review
                    </button>
                </div>
            </div>
        `;
    }
    
    generateReviewData() {
        let correct = 0, incorrect = 0, unanswered = 0, flagged = 0;
        const questions = [];
        
        this.questions.forEach((question, index) => {
            const userAnswer = this.answers[index];
            const isCorrect = this.checkAnswer(index, userAnswer);
            const isFlagged = this.flaggedQuestions.has(index);
            
            let status = 'unanswered';
            if (userAnswer !== undefined) {
                status = isCorrect ? 'correct' : 'incorrect';
                isCorrect ? correct++ : incorrect++;
            } else {
                unanswered++;
            }
            
            if (isFlagged) flagged++;
            
            questions.push({
                index,
                question,
                userAnswer,
                status,
                isFlagged,
                isCorrect
            });
        });
        
        return { correct, incorrect, unanswered, flagged, questions };
    }
    
    generateReviewQuestions(questions) {
        return questions.map(item => `
            <div class="review-question-card ${item.status}" data-status="${item.status}" data-flagged="${item.isFlagged}">
                <div class="question-header">
                    <div class="question-number">Question ${item.index + 1}</div>
                    <div class="question-badges">
                        <span class="status-badge ${item.status}">${item.status.toUpperCase()}</span>
                        ${item.isFlagged ? '<span class="flag-badge">🚩 FLAGGED</span>' : ''}
                        <span class="domain-badge">${item.question.domain}</span>
                    </div>
                </div>
                
                <div class="question-text">${item.question.text}</div>
                
                <div class="answer-analysis">
                    <div class="user-answer">
                        <strong>Your Answer:</strong> 
                        ${item.userAnswer ? (Array.isArray(item.userAnswer) ? item.userAnswer.join(', ') : item.userAnswer) : 'Not Answered'}
                    </div>
                    <div class="correct-answer">
                        <strong>Correct Answer:</strong> ${item.question.correct}
                    </div>
                    ${item.status === 'incorrect' ? `
                        <div class="explanation">
                            <strong>Why this matters:</strong> Review ${item.question.domain} concepts, particularly focusing on the specific AWS services mentioned in this question.
                        </div>
                    ` : ''}
                </div>
                
                <div class="question-actions">
                    <button class="mini-btn" onclick="exam.goToQuestion(${item.index})">
                        📝 Review Question
                    </button>
                    <button class="mini-btn" onclick="exam.toggleFlag(${item.index}); exam.showEnhancedReview();">
                        ${item.isFlagged ? '🚩 Unflag' : '🚩 Flag'}
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    filterReview(filter) {
        const questions = document.querySelectorAll('.review-question-card');
        const buttons = document.querySelectorAll('.filter-btn');
        
        // Update active button
        buttons.forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        
        // Filter questions
        questions.forEach(question => {
            const status = question.dataset.status;
            const flagged = question.dataset.flagged === 'true';
            
            let show = false;
            switch(filter) {
                case 'all': show = true; break;
                case 'incorrect': show = status === 'incorrect'; break;
                case 'unanswered': show = status === 'unanswered'; break;
                case 'flagged': show = flagged; break;
                case 'correct': show = status === 'correct'; break;
            }
            
            question.style.display = show ? 'block' : 'none';
        });
    }
    
    exportReview() {
        const reviewData = this.generateReviewData();
        let exportText = `SAA-C03 Practice Exam Review\\n`;
        exportText += `Date: ${new Date().toLocaleDateString()}\\n`;
        exportText += `Score: ${reviewData.correct}/${this.questions.length} (${Math.round((reviewData.correct/this.questions.length)*100)}%)\\n\\n`;
        
        reviewData.questions.forEach(item => {
            if (item.status === 'incorrect' || item.isFlagged) {
                exportText += `Question ${item.index + 1} [${item.status.toUpperCase()}]\\n`;
                exportText += `Domain: ${item.question.domain}\\n`;
                exportText += `Your Answer: ${item.userAnswer || 'Not Answered'}\\n`;
                exportText += `Correct Answer: ${item.question.correct}\\n`;
                exportText += `Text: ${item.question.text}\\n\\n`;
            }
        });
        
        const blob = new Blob([exportText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SAA-C03-Review-${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }'''
    
    # Enhanced CSS for review section
    enhanced_css = '''
        .enhanced-review-container {
            max-width: 1000px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .review-header {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            background: linear-gradient(135deg, #1976d2, #1565c0);
            color: white;
            border-radius: 12px;
        }
        
        .review-stats {
            display: flex;
            justify-content: center;
            gap: 30px;
            margin-top: 20px;
        }
        
        .review-stats .stat-item {
            text-align: center;
        }
        
        .review-stats .stat-value {
            display: block;
            font-size: 2em;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .review-stats .stat-value.correct { color: #4caf50; }
        .review-stats .stat-value.incorrect { color: #f44336; }
        .review-stats .stat-value.unanswered { color: #ff9800; }
        .review-stats .stat-value.flagged { color: #ffc107; }
        
        .review-filters {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            flex-wrap: wrap;
            justify-content: center;
        }
        
        .filter-btn {
            padding: 8px 16px;
            border: 2px solid #1976d2;
            background: white;
            color: #1976d2;
            border-radius: 20px;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .filter-btn.active,
        .filter-btn:hover {
            background: #1976d2;
            color: white;
        }
        
        .review-question-card {
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            margin-bottom: 20px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .review-question-card.correct {
            border-left: 4px solid #4caf50;
            background: #f8fff8;
        }
        
        .review-question-card.incorrect {
            border-left: 4px solid #f44336;
            background: #fff8f8;
        }
        
        .review-question-card.unanswered {
            border-left: 4px solid #ff9800;
            background: #fffaf0;
        }
        
        .question-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .question-number {
            font-size: 1.2em;
            font-weight: bold;
            color: #1976d2;
        }
        
        .question-badges {
            display: flex;
            gap: 8px;
        }
        
        .status-badge,
        .flag-badge,
        .domain-badge {
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.8em;
            font-weight: bold;
        }
        
        .status-badge.correct { background: #4caf50; color: white; }
        .status-badge.incorrect { background: #f44336; color: white; }
        .status-badge.unanswered { background: #ff9800; color: white; }
        
        .flag-badge {
            background: #ffc107;
            color: #333;
        }
        
        .domain-badge {
            background: #e3f2fd;
            color: #1976d2;
        }
        
        .question-text {
            margin-bottom: 15px;
            line-height: 1.6;
            color: #333;
        }
        
        .answer-analysis {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 15px;
        }
        
        .user-answer,
        .correct-answer,
        .explanation {
            margin-bottom: 8px;
        }
        
        .explanation {
            color: #666;
            font-style: italic;
        }
        
        .question-actions {
            display: flex;
            gap: 10px;
        }
        
        .mini-btn {
            padding: 6px 12px;
            border: 1px solid #1976d2;
            background: white;
            color: #1976d2;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.9em;
        }
        
        .mini-btn:hover {
            background: #1976d2;
            color: white;
        }
        
        .review-actions {
            display: flex;
            gap: 15px;
            justify-content: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
        }'''
    
    for exam_file in exam_files:
        try:
            with open(exam_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Add enhanced review methods if not exists
            if 'showEnhancedReview(' not in content:
                content = content.replace(
                    'exportReview() {',
                    enhanced_review_methods + '\n    \n    exportReview() {'
                )
                
                # Add enhanced CSS
                content = content.replace(
                    '        .review-actions {',
                    enhanced_css + '\n        \n        .review-actions {'
                )
                
                # Replace review button to use enhanced review
                content = content.replace(
                    'onclick="showReview()"',
                    'onclick="exam.showEnhancedReview()"'
                )
                
                # Update showReview function
                content = content.replace(
                    'function showReview() {\n    exam.showReview();\n}',
                    'function showReview() {\n    exam.showEnhancedReview();\n}'
                )
                
                with open(exam_file, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                print(f"✓ Enhanced review section in {os.path.basename(exam_file)}")
            else:
                print(f"- Enhanced review section already exists in {os.path.basename(exam_file)}")
                
        except Exception as e:
            print(f"✗ Error processing {exam_file}: {e}")
    
    print(f"\nProcessed {len(exam_files)} exam files")

if __name__ == "__main__":
    add_enhanced_review_section()
