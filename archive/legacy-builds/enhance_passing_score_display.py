#!/usr/bin/env python3

import os
import glob

def enhance_passing_score_display():
    exam_dir = "SAA-C03_Complete_Exam_Suite/Associate_Exams"
    exam_files = glob.glob(f"{exam_dir}/*.html")
    
    # Enhanced passing score CSS
    enhanced_css = '''
        .passing-score-indicator {
            background: linear-gradient(135deg, #28a745, #20c997);
            color: white;
            padding: 8px 15px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: 600;
            display: inline-block;
            margin-top: 8px;
            box-shadow: 0 2px 8px rgba(40, 167, 69, 0.3);
            animation: pulse-glow 2s infinite;
        }
        
        @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 2px 8px rgba(40, 167, 69, 0.3); }
            50% { box-shadow: 0 4px 16px rgba(40, 167, 69, 0.5); }
        }
        
        .score-requirement {
            background: #e8f5e8;
            border: 2px solid #28a745;
            border-radius: 8px;
            padding: 12px 16px;
            margin: 10px 0;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .score-requirement .icon {
            font-size: 1.5em;
        }
        
        .score-requirement .text {
            flex: 1;
        }
        
        .score-requirement .score {
            font-weight: bold;
            color: #28a745;
            font-size: 1.1em;
        }'''
    
    # Enhanced timer area with better passing score display
    enhanced_timer = '''                    <div class="timer-display">
                        <span class="timer-icon">⏱️</span>
                        <span id="timer">130:00</span>
                    </div>
                    <div class="passing-score-indicator">
                        🎯 Pass: 720/1000 (72%)
                    </div>'''
    
    # Enhanced score requirement box
    score_requirement_box = '''                <div class="score-requirement">
                    <div class="icon">🎯</div>
                    <div class="text">
                        <strong>Passing Requirement:</strong><br>
                        You need <span class="score">720 out of 1000 points (72%)</span> to pass
                    </div>
                </div>'''
    
    for exam_file in exam_files:
        try:
            with open(exam_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            modified = False
            
            # Add enhanced CSS if not exists
            if 'passing-score-indicator' not in content:
                content = content.replace(
                    '        .stat-value.negative {',
                    enhanced_css + '\n        \n        .stat-value.negative {'
                )
                modified = True
            
            # Replace simple timer passing score with enhanced version
            old_timer = '''                    <div class="timer-display">
                        <span class="timer-icon">⏱️</span>
                        <span id="timer">130:00</span>
                    </div>
                    <div style="font-size: 0.9em; opacity: 0.8; margin-top: 5px;">
                        Passing Score: 720/1000 (72%)
                    </div>'''
            
            if old_timer in content:
                content = content.replace(old_timer, enhanced_timer)
                modified = True
            
            # Add score requirement box to exam start area
            exam_content_start = '''        <div class="exam-content">
            <div id="questionContainer">'''
            
            enhanced_exam_start = '''        <div class="exam-content">
''' + score_requirement_box + '''
            <div id="questionContainer">'''
            
            if exam_content_start in content and 'score-requirement' not in content:
                content = content.replace(exam_content_start, enhanced_exam_start)
                modified = True
            
            # Enhance results page passing score display
            old_fail_message = '📚 Keep Studying - You Need 720/1000 (72%) to Pass'
            new_fail_message = '📚 Keep Studying - You Need <strong style="color: #28a745;">720/1000 (72%)</strong> to Pass'
            
            if old_fail_message in content:
                content = content.replace(old_fail_message, new_fail_message)
                modified = True
            
            if modified:
                with open(exam_file, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                print(f"✓ Enhanced passing score display in {os.path.basename(exam_file)}")
            else:
                print(f"- No enhancements needed in {os.path.basename(exam_file)}")
                
        except Exception as e:
            print(f"✗ Error processing {exam_file}: {e}")
    
    print(f"\nProcessed {len(exam_files)} exam files")

if __name__ == "__main__":
    enhance_passing_score_display()
