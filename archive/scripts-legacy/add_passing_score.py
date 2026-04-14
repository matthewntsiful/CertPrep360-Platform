#!/usr/bin/env python3

import os
import glob

def add_passing_score_info():
    exam_dir = "SAA-C03_Complete_Exam_Suite/Associate_Exams"
    exam_files = glob.glob(f"{exam_dir}/*.html")
    
    # Add passing score to header subtitle
    old_subtitle = 'Solutions Architect Associate Certification • Associate Level'
    new_subtitle = 'Solutions Architect Associate Certification • Associate Level • Passing Score: 720/1000'
    
    # Add passing score to exam info
    old_exam_info = '<p>Solutions Architect Associate Certification • Associate Level</p>'
    new_exam_info = '<p>Solutions Architect Associate Certification • Associate Level • Passing Score: 720/1000 (72%)</p>'
    
    # Update results display to show passing score context
    old_score_text = '📚 Keep Studying - You Need 720 to Pass'
    new_score_text = '📚 Keep Studying - You Need 720/1000 (72%) to Pass'
    
    # Add passing score to progress display
    old_progress = 'AWS Score: ${score}/1000 | Time: ${timeUsed} minutes'
    new_progress = 'AWS Score: ${score}/1000 (Passing: 720) | Time: ${timeUsed} minutes'
    
    for exam_file in exam_files:
        try:
            with open(exam_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Apply replacements
            modified = False
            
            if old_subtitle in content:
                content = content.replace(old_subtitle, new_subtitle)
                modified = True
            
            if old_exam_info in content:
                content = content.replace(old_exam_info, new_exam_info)
                modified = True
                
            if old_score_text in content:
                content = content.replace(old_score_text, new_score_text)
                modified = True
                
            if old_progress in content:
                content = content.replace(old_progress, new_progress)
                modified = True
            
            # Add passing score indicator to timer area
            timer_addition = '''                    <div class="timer-display">
                        <span class="timer-icon">⏱️</span>
                        <span id="timer">130:00</span>
                    </div>
                    <div style="font-size: 0.9em; opacity: 0.8; margin-top: 5px;">
                        Passing Score: 720/1000 (72%)
                    </div>'''
            
            old_timer = '''                    <div class="timer-display">
                        <span class="timer-icon">⏱️</span>
                        <span id="timer">130:00</span>
                    </div>'''
            
            if old_timer in content and 'Passing Score: 720/1000' not in content:
                content = content.replace(old_timer, timer_addition)
                modified = True
            
            if modified:
                with open(exam_file, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                print(f"✓ Added passing score info to {os.path.basename(exam_file)}")
            else:
                print(f"- No changes needed in {os.path.basename(exam_file)}")
                
        except Exception as e:
            print(f"✗ Error processing {exam_file}: {e}")
    
    print(f"\nProcessed {len(exam_files)} exam files")

if __name__ == "__main__":
    add_passing_score_info()
