#!/usr/bin/env python3

import os
import glob

def add_enhanced_score_display():
    exam_dir = "SAA-C03_Complete_Exam_Suite/Associate_Exams"
    exam_files = glob.glob(f"{exam_dir}/*.html")
    
    # Enhanced results CSS
    enhanced_css = '''
        /* Enhanced Score Display */
        .results-container {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 40px 20px;
        }
        
        .results-card {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .results-header {
            background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        
        .score-circle {
            width: 150px;
            height: 150px;
            border-radius: 50%;
            margin: 20px auto;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2.5em;
            font-weight: bold;
            position: relative;
        }
        
        .score-circle.pass {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            box-shadow: 0 0 30px rgba(40, 167, 69, 0.3);
        }
        
        .score-circle.fail {
            background: linear-gradient(135deg, #dc3545 0%, #fd7e14 100%);
            box-shadow: 0 0 30px rgba(220, 53, 69, 0.3);
        }
        
        .score-circle::before {
            content: '';
            position: absolute;
            top: -10px;
            left: -10px;
            right: -10px;
            bottom: -10px;
            border-radius: 50%;
            background: linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.2) 50%, transparent 70%);
            animation: shimmer 2s infinite;
        }
        
        @keyframes shimmer {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .pass-status {
            font-size: 1.8em;
            margin: 20px 0;
            font-weight: bold;
        }
        
        .pass-status.pass {
            color: #28a745;
        }
        
        .pass-status.fail {
            color: #dc3545;
        }
        
        .score-breakdown {
            padding: 40px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        
        .stat-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            border-left: 4px solid #1976d2;
        }
        
        .stat-value {
            font-size: 2em;
            font-weight: bold;
            color: #1976d2;
            margin-bottom: 5px;
        }
        
        .stat-label {
            color: #6c757d;
            font-size: 0.9em;
        }
        
        .domain-results {
            margin-top: 30px;
        }
        
        .domain-card {
            background: white;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .domain-name {
            font-weight: 600;
            color: #2c3e50;
        }
        
        .domain-score {
            font-size: 1.2em;
            font-weight: bold;
        }
        
        .domain-score.pass {
            color: #28a745;
        }
        
        .domain-score.fail {
            color: #dc3545;
        }
        
        .progress-bar {
            width: 100%;
            height: 8px;
            background: #e9ecef;
            border-radius: 4px;
            margin-top: 8px;
            overflow: hidden;
        }
        
        .progress-fill {
            height: 100%;
            border-radius: 4px;
            transition: width 1s ease-in-out;
        }
        
        .progress-fill.pass {
            background: linear-gradient(90deg, #28a745, #20c997);
        }
        
        .progress-fill.fail {
            background: linear-gradient(90deg, #dc3545, #fd7e14);
        }
        
        .action-buttons {
            display: flex;
            gap: 15px;
            justify-content: center;
            margin-top: 30px;
        }
        
        .action-btn {
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .action-btn.primary {
            background: #1976d2;
            color: white;
        }
        
        .action-btn.secondary {
            background: #6c757d;
            color: white;
        }
        
        .action-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }'''
    
    # Enhanced results HTML template
    enhanced_results = '''resultsContainer.innerHTML = `
            <div class="results-container">
                <div class="results-card">
                    <div class="results-header">
                        <h1 style="margin-bottom: 10px;">🎓 Exam Complete!</h1>
                        <div class="score-circle ${score >= 720 ? 'pass' : 'fail'}">
                            ${percentage}%
                        </div>
                        <div class="pass-status ${score >= 720 ? 'pass' : 'fail'}">
                            ${score >= 720 ? '🎉 CONGRATULATIONS! YOU PASSED!' : '📚 Keep Studying - You Need 720 to Pass'}
                        </div>
                        <div style="opacity: 0.9; font-size: 1.1em;">
                            AWS Score: ${score}/1000 | Time: ${timeUsed} minutes
                        </div>
                    </div>
                    
                    <div class="score-breakdown">
                        <div class="stats-grid">
                            <div class="stat-card">
                                <div class="stat-value">${correct}</div>
                                <div class="stat-label">Correct Answers</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value">${this.questions.length - correct}</div>
                                <div class="stat-label">Incorrect Answers</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value">${timeUsed}</div>
                                <div class="stat-label">Minutes Used</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value">${Math.round((correct / this.questions.length) * 100)}%</div>
                                <div class="stat-label">Accuracy Rate</div>
                            </div>
                        </div>
                        
                        <div class="domain-results">
                            <h3 style="margin-bottom: 20px; color: #2c3e50;">📊 Domain Performance</h3>
                            ${domainHTML}
                        </div>
                        
                        <div class="action-buttons">
                            <button class="action-btn primary" onclick="location.reload()">
                                🔄 Take Another Exam
                            </button>
                            <button class="action-btn secondary" onclick="window.print()">
                                🖨️ Print Results
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;'''
    
    # Enhanced domain card template
    domain_card_template = '''domainHTML += `
                    <div class="domain-card">
                        <div>
                            <div class="domain-name">${domain.replace('Design ', '')}</div>
                            <div class="progress-bar">
                                <div class="progress-fill ${domainPercentage >= 70 ? 'pass' : 'fail'}" 
                                     style="width: ${domainPercentage}%"></div>
                            </div>
                        </div>
                        <div class="domain-score ${domainPercentage >= 70 ? 'pass' : 'fail'}">
                            ${stats.correct}/${stats.total} (${domainPercentage}%)
                        </div>
                    </div>
                `;'''
    
    for exam_file in exam_files:
        try:
            with open(exam_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Add enhanced CSS if not exists
            if 'Enhanced Score Display' not in content:
                content = content.replace(
                    '        .action-btn:hover {',
                    enhanced_css + '\n        \n        .action-btn:hover {'
                )
                
                # Replace results display
                old_results = '''resultsContainer.innerHTML = `
            <div class="results-header">
                <h1>Exam Complete!</h1>
                <div class="final-score ${score >= 720 ? 'score-pass' : 'score-fail'}">
                    ${score}/1000 (${percentage}%)
                </div>
                <div style="font-size: 1.2em; margin: 20px 0;">
                    ${score >= 720 ? '🎉 CONGRATULATIONS! YOU PASSED!' : '📚 Keep studying! You need 720 to pass'}
                </div>
                <div style="color: #6c757d;">
                    Time Used: ${timeUsed} minutes | Correct: ${correct}/${this.questions.length}
                </div>
            </div>
            
            <div class="results-grid">
                <div class="result-card">
                    <div class="card-title">Overall Performance</div>
                    <div class="card-content">
                        <div style="font-size: 2em; font-weight: bold; color: ${score >= 720 ? '#28a745' : '#dc3545'};">
                            ${percentage}%
                        </div>
                        <div>Correct: ${correct}/${this.questions.length}</div>
                        <div>AWS Score: ${score}/1000</div>
                    </div>
                </div>
                
                ${domainHTML}
            </div>
            
            <div style="text-align: center; margin: 40px 0;">
                <button class="nav-button" onclick="location.reload()">Take Another Exam</button>
                <button class="nav-button" onclick="window.print()" style="margin-left: 15px;">Print Results</button>
            </div>
        `;'''
                
                content = content.replace(old_results, enhanced_results)
                
                # Replace domain card template
                old_domain = '''domainHTML += `
                    <div class="result-card">
                        <div class="card-title">${domain.replace('Design ', '')}</div>
                        <div class="${domainClass}" style="font-size: 1.5em; font-weight: bold;">
                            ${stats.correct}/${stats.total} (${domainPercentage}%)
                        </div>
                    </div>
                `;'''
                
                content = content.replace(old_domain, domain_card_template)
                
                with open(exam_file, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                print(f"✓ Enhanced score display in {os.path.basename(exam_file)}")
            else:
                print(f"- Enhanced score display already exists in {os.path.basename(exam_file)}")
                
        except Exception as e:
            print(f"✗ Error processing {exam_file}: {e}")
    
    print(f"\nProcessed {len(exam_files)} exam files")

if __name__ == "__main__":
    add_enhanced_score_display()
