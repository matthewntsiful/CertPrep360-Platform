#!/usr/bin/env python3

import os
import glob

def add_enhanced_status_indicators():
    exam_dir = "SAA-C03_Complete_Exam_Suite/Associate_Exams"
    exam_files = glob.glob(f"{exam_dir}/*.html")
    
    # Enhanced CSS for status indicators
    enhanced_css = '''        
        /* Enhanced Answer Status Indicators */
        .nav-btn.answered-flagged {
            background: linear-gradient(45deg, var(--success-color) 50%, var(--warning-color) 50%);
            color: white;
            border-color: var(--success-color);
        }
        
        .nav-btn.unanswered {
            background: #f8f9fa;
            color: var(--text-secondary);
            border-color: #dee2e6;
        }
        
        .nav-btn::after {
            content: '';
            position: absolute;
            top: -2px;
            right: -2px;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            display: none;
        }
        
        .nav-btn.answered::after {
            display: block;
            background: #28a745;
        }
        
        .nav-btn.flagged::after {
            display: block;
            background: #ffc107;
        }
        
        .nav-btn.answered-flagged::after {
            display: block;
            background: linear-gradient(45deg, #28a745 50%, #ffc107 50%);
        }
        
        /* Progress Summary Indicators */
        .status-summary {
            display: flex;
            gap: 15px;
            margin: 10px 0;
            font-size: 14px;
        }
        
        .status-item {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        .status-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
        }
        
        .status-dot.answered { background: var(--success-color); }
        .status-dot.flagged { background: var(--warning-color); }
        .status-dot.unanswered { background: #dee2e6; }
        .status-dot.current { background: var(--accent-color); }'''
    
    # Status summary HTML
    status_summary = '''            <div class="status-summary">
                <div class="status-item">
                    <div class="status-dot answered"></div>
                    <span id="answered-count">0</span> Answered
                </div>
                <div class="status-item">
                    <div class="status-dot flagged"></div>
                    <span id="flagged-count">0</span> Flagged
                </div>
                <div class="status-item">
                    <div class="status-dot unanswered"></div>
                    <span id="unanswered-count">0</span> Remaining
                </div>
            </div>'''
    
    # Enhanced navigation state update method
    enhanced_update = '''    updateNavigationState() {
        const navBtns = document.querySelectorAll('.nav-btn');
        navBtns.forEach((btn, index) => {
            btn.className = 'nav-btn';
            
            if (index === this.currentQuestion) {
                btn.classList.add('current');
            }
            
            const isAnswered = this.answers[index] !== undefined;
            const isFlagged = this.flaggedQuestions.has(index);
            
            if (isAnswered && isFlagged) {
                btn.classList.add('answered-flagged');
            } else if (isAnswered) {
                btn.classList.add('answered');
            } else if (isFlagged) {
                btn.classList.add('flagged');
            } else {
                btn.classList.add('unanswered');
            }
        });
        
        // Update status summary
        this.updateStatusSummary();
    }
    
    updateStatusSummary() {
        const answered = Object.keys(this.answers).length;
        const flagged = this.flaggedQuestions.size;
        const total = this.questions.length;
        const unanswered = total - answered;
        
        const answeredEl = document.getElementById('answered-count');
        const flaggedEl = document.getElementById('flagged-count');
        const unansweredEl = document.getElementById('unanswered-count');
        
        if (answeredEl) answeredEl.textContent = answered;
        if (flaggedEl) flaggedEl.textContent = flagged;
        if (unansweredEl) unansweredEl.textContent = unanswered;
    }'''
    
    for exam_file in exam_files:
        try:
            with open(exam_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Add enhanced CSS if not exists
            if 'Enhanced Answer Status Indicators' not in content:
                content = content.replace(
                    '        .nav-btn.current {',
                    enhanced_css + '\n        \n        .nav-btn.current {'
                )
                
                # Add status summary to navigation panel
                content = content.replace(
                    '<div class="question-nav" id="questionNav">',
                    '<div class="question-nav" id="questionNav">\n' + status_summary
                )
                
                # Replace navigation state update method
                old_method = '''    updateNavigationState() {
        const navBtns = document.querySelectorAll('.nav-btn');
        navBtns.forEach((btn, index) => {
            btn.className = 'nav-btn';
            
            if (index === this.currentQuestion) {
                btn.classList.add('current');
            }
            
            if (this.answers[index] !== undefined) {
                btn.classList.add('answered');
            }
            
            if (this.flaggedQuestions.has(index)) {
                btn.classList.add('flagged');
            }
        });
    }'''
                
                content = content.replace(old_method, enhanced_update)
                
                with open(exam_file, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                print(f"✓ Enhanced status indicators in {os.path.basename(exam_file)}")
            else:
                print(f"- Enhanced status indicators already exist in {os.path.basename(exam_file)}")
                
        except Exception as e:
            print(f"✗ Error processing {exam_file}: {e}")
    
    print(f"\nProcessed {len(exam_files)} exam files")

if __name__ == "__main__":
    add_enhanced_status_indicators()
