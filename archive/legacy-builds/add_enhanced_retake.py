#!/usr/bin/env python3

import os
import glob

def add_enhanced_retake_options():
    exam_dir = "SAA-C03_Complete_Exam_Suite/Associate_Exams"
    exam_files = glob.glob(f"{exam_dir}/*.html")
    
    # Enhanced retake methods
    enhanced_retake_methods = '''
    saveAttemptHistory(score, percentage, timeUsed, domainStats) {
        const examId = document.title.replace(/[^a-zA-Z0-9]/g, '_');
        const historyKey = `exam_${examId}_history`;
        
        let history = JSON.parse(localStorage.getItem(historyKey) || '[]');
        
        const attempt = {
            date: new Date().toISOString(),
            score: score,
            percentage: percentage,
            timeUsed: timeUsed,
            domainStats: domainStats,
            passed: score >= 720
        };
        
        history.push(attempt);
        
        // Keep only last 10 attempts
        if (history.length > 10) {
            history = history.slice(-10);
        }
        
        localStorage.setItem(historyKey, JSON.stringify(history));
    }
    
    getAttemptHistory() {
        const examId = document.title.replace(/[^a-zA-Z0-9]/g, '_');
        const historyKey = `exam_${examId}_history`;
        return JSON.parse(localStorage.getItem(historyKey) || '[]');
    }
    
    generateProgressChart() {
        const history = this.getAttemptHistory();
        if (history.length === 0) return '';
        
        const maxScore = Math.max(...history.map(h => h.percentage));
        const lastScore = history[history.length - 1].percentage;
        const improvement = history.length > 1 ? 
            lastScore - history[history.length - 2].percentage : 0;
        
        let chartHTML = `
            <div class="progress-chart">
                <h4>📈 Your Progress (Last ${history.length} Attempts)</h4>
                <div class="chart-container">
                    ${history.map((attempt, index) => `
                        <div class="chart-bar">
                            <div class="bar-fill ${attempt.passed ? 'pass' : 'fail'}" 
                                 style="height: ${(attempt.percentage / 100) * 100}%"
                                 title="Attempt ${index + 1}: ${attempt.percentage}%">
                            </div>
                            <div class="bar-label">${index + 1}</div>
                        </div>
                    `).join('')}
                </div>
                <div class="progress-stats">
                    <div class="stat-item">
                        <span class="stat-label">Best Score:</span>
                        <span class="stat-value">${maxScore}%</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Last Improvement:</span>
                        <span class="stat-value ${improvement >= 0 ? 'positive' : 'negative'}">
                            ${improvement > 0 ? '+' : ''}${improvement}%
                        </span>
                    </div>
                </div>
            </div>
        `;
        
        return chartHTML;
    }
    
    retakeExam(mode = 'fresh') {
        if (mode === 'fresh') {
            // Clear all saved data for fresh start
            this.clearSavedAnswers();
            location.reload();
        } else if (mode === 'review') {
            // Keep answers but allow changes
            location.reload();
        } else if (mode === 'weak-domains') {
            // Focus on weak domains (placeholder for future enhancement)
            alert('Weak domain focus mode coming soon!');
        }
    }'''
    
    # Enhanced CSS for progress tracking
    enhanced_css = '''
        .retake-options {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        
        .retake-btn {
            padding: 15px 20px;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            text-align: center;
            display: flex;
            flex-direction: column;
            gap: 5px;
        }
        
        .retake-btn.fresh {
            background: #1976d2;
            color: white;
        }
        
        .retake-btn.review {
            background: #28a745;
            color: white;
        }
        
        .retake-btn.focused {
            background: #fd7e14;
            color: white;
        }
        
        .retake-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .retake-btn-title {
            font-size: 1.1em;
        }
        
        .retake-btn-desc {
            font-size: 0.9em;
            opacity: 0.9;
        }
        
        .progress-chart {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        
        .chart-container {
            display: flex;
            align-items: end;
            gap: 8px;
            height: 120px;
            margin: 15px 0;
            padding: 10px;
            background: white;
            border-radius: 6px;
        }
        
        .chart-bar {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            height: 100%;
        }
        
        .bar-fill {
            width: 100%;
            border-radius: 3px 3px 0 0;
            transition: height 0.5s ease;
            margin-bottom: auto;
        }
        
        .bar-fill.pass {
            background: linear-gradient(to top, #28a745, #20c997);
        }
        
        .bar-fill.fail {
            background: linear-gradient(to top, #dc3545, #fd7e14);
        }
        
        .bar-label {
            font-size: 0.8em;
            color: #6c757d;
            margin-top: 5px;
        }
        
        .progress-stats {
            display: flex;
            justify-content: space-around;
            margin-top: 15px;
        }
        
        .stat-item {
            text-align: center;
        }
        
        .stat-label {
            display: block;
            font-size: 0.9em;
            color: #6c757d;
        }
        
        .stat-value {
            font-weight: bold;
            font-size: 1.1em;
        }
        
        .stat-value.positive {
            color: #28a745;
        }
        
        .stat-value.negative {
            color: #dc3545;
        }'''
    
    # Enhanced retake buttons HTML
    retake_buttons = '''<div class="retake-options">
                            <button class="retake-btn fresh" onclick="exam.retakeExam('fresh')">
                                <div class="retake-btn-title">🔄 Fresh Start</div>
                                <div class="retake-btn-desc">New attempt, clean slate</div>
                            </button>
                            <button class="retake-btn review" onclick="exam.retakeExam('review')">
                                <div class="retake-btn-title">📝 Review Mode</div>
                                <div class="retake-btn-desc">Keep answers, make changes</div>
                            </button>
                            <button class="retake-btn focused" onclick="exam.retakeExam('weak-domains')">
                                <div class="retake-btn-title">🎯 Focus Mode</div>
                                <div class="retake-btn-desc">Target weak areas</div>
                            </button>
                        </div>
                        
                        ${this.generateProgressChart()}'''
    
    for exam_file in exam_files:
        try:
            with open(exam_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Add enhanced retake methods if not exists
            if 'saveAttemptHistory(' not in content:
                content = content.replace(
                    'getStudyRecommendations(domain) {',
                    enhanced_retake_methods + '\n    \n    getStudyRecommendations(domain) {'
                )
                
                # Add enhanced CSS
                content = content.replace(
                    '        .stat-value.negative {',
                    enhanced_css + '\n        \n        .stat-value.negative {'
                )
                
                # Save attempt history when exam is submitted
                content = content.replace(
                    'this.showResults(correct, domainStats, timeUsed);',
                    'this.saveAttemptHistory(score, percentage, timeUsed, domainStats);\n        this.showResults(correct, domainStats, timeUsed);'
                )
                
                # Replace action buttons with enhanced retake options
                old_buttons = '''<div class="action-buttons">
                            <button class="action-btn primary" onclick="location.reload()">
                                🔄 Take Another Exam
                            </button>
                            <button class="action-btn secondary" onclick="window.print()">
                                🖨️ Print Results
                            </button>
                        </div>'''
                
                new_buttons = retake_buttons + '''
                        
                        <div class="action-buttons">
                            <button class="action-btn secondary" onclick="window.print()">
                                🖨️ Print Results
                            </button>
                        </div>'''
                
                content = content.replace(old_buttons, new_buttons)
                
                with open(exam_file, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                print(f"✓ Enhanced retake options in {os.path.basename(exam_file)}")
            else:
                print(f"- Enhanced retake options already exist in {os.path.basename(exam_file)}")
                
        except Exception as e:
            print(f"✗ Error processing {exam_file}: {e}")
    
    print(f"\nProcessed {len(exam_files)} exam files")

if __name__ == "__main__":
    add_enhanced_retake_options()
