#!/usr/bin/env python3
import os

def enhance_results():
    html_dir = "/Users/Matthieu/Downloads/SolutionsArchitectPracticeExam/SAA-C03_Exam/SAA-C03_Complete_Exam_Suite/Enhanced_HTML_Quizzes"
    
    results_css = """
        /* Enhanced Results */
        .results-container {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 15px;
            margin: 20px 0;
            box-shadow: 0 8px 25px rgba(0,0,0,0.2);
        }
        
        .score-circle {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            background: conic-gradient(var(--success-color) 0deg, var(--success-color) calc(var(--score-percentage) * 3.6deg), #e9ecef calc(var(--score-percentage) * 3.6deg));
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            position: relative;
        }
        
        .score-circle::before {
            content: '';
            width: 90px;
            height: 90px;
            background: white;
            border-radius: 50%;
            position: absolute;
        }
        
        .score-text {
            position: relative;
            z-index: 1;
            font-size: 1.5em;
            font-weight: bold;
            color: var(--text-primary);
        }
        
        .domain-breakdown {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }
        
        .domain-card {
            background: rgba(255,255,255,0.1);
            padding: 15px;
            border-radius: 10px;
            backdrop-filter: blur(10px);
        }
        
        .domain-progress {
            width: 100%;
            height: 8px;
            background: rgba(255,255,255,0.2);
            border-radius: 4px;
            overflow: hidden;
            margin-top: 10px;
        }
        
        .domain-fill {
            height: 100%;
            background: var(--success-color);
            transition: width 1s ease;
        }
    """
    
    results_js = """
        function showEnhancedResults(score, totalQuestions, domainScores) {
            const percentage = Math.round((score / totalQuestions) * 100);
            const passed = percentage >= 72;
            
            document.documentElement.style.setProperty('--score-percentage', percentage);
            
            const resultsHTML = `
                <div class="results-container">
                    <div class="score-circle">
                        <div class="score-text">${percentage}%</div>
                    </div>
                    <h2 style="text-align: center; margin-bottom: 20px;">
                        ${passed ? '🎉 Congratulations! You Passed!' : '📚 Keep Studying!'}
                    </h2>
                    <p style="text-align: center; font-size: 1.1em; margin-bottom: 30px;">
                        Score: ${score}/${totalQuestions} (${percentage}%) | 
                        Pass Score: 72% | 
                        Status: <strong>${passed ? 'PASSED' : 'FAILED'}</strong>
                    </p>
                    
                    <div class="domain-breakdown">
                        ${Object.entries(domainScores).map(([domain, data]) => `
                            <div class="domain-card">
                                <h4>${domain}</h4>
                                <p>${data.correct}/${data.total} correct (${Math.round((data.correct/data.total)*100)}%)</p>
                                <div class="domain-progress">
                                    <div class="domain-fill" style="width: ${(data.correct/data.total)*100}%"></div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <button onclick="location.reload()" class="control-btn" style="margin-right: 10px;">Retake Exam</button>
                        <button onclick="showReview()" class="control-btn">Review Answers</button>
                    </div>
                </div>
            `;
            
            document.getElementById('exam-content').innerHTML = resultsHTML;
        }
    """
    
    for filename in os.listdir(html_dir):
        if filename.endswith('.html'):
            filepath = os.path.join(html_dir, filename)
            
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Add CSS
            if '</style>' in content and results_css not in content:
                content = content.replace('</style>', results_css + '\n        </style>')
            
            # Add JS
            if '</script>' in content and results_js not in content:
                content = content.replace('</script>', results_js + '\n        </script>')
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            
            print(f"✅ Enhanced results: {filename}")

if __name__ == "__main__":
    enhance_results()
    print("📊 Enhanced results display added!")
