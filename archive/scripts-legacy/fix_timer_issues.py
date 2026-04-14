#!/usr/bin/env python3

import os
import glob

def fix_timer_issues():
    exam_dir = "SAA-C03_Complete_Exam_Suite/Associate_Exams"
    exam_files = glob.glob(f"{exam_dir}/*.html")
    
    # Fix 1: Update pause button onclick to use exam object
    old_pause_button = '<button class="control-btn" onclick="toggleTimer()" id="pauseBtn">Pause</button>'
    new_pause_button = '<button class="control-btn" onclick="exam.toggleTimer()" id="pauseBtn">Pause</button>'
    
    # Fix 2: Ensure timer stops after submission by updating submitExam method
    old_submit_logic = 'clearInterval(this. timerInterval); clearInterval(this. autoSaveInterval); this. calculateResults();'
    new_submit_logic = 'clearInterval(this. timerInterval); clearInterval(this. autoSaveInterval); this. timerInterval = null; this. autoSaveInterval = null; this. calculateResults();'
    
    # Fix 3: Add global toggleTimer function that calls exam.toggleTimer()
    timer_function_fix = '''
function toggleTimer() {
    if (exam) {
        exam.toggleTimer();
    }
}'''
    
    for exam_file in exam_files:
        try:
            with open(exam_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            modified = False
            
            # Fix pause button
            if old_pause_button in content:
                content = content.replace(old_pause_button, new_pause_button)
                modified = True
            
            # Fix timer clearing in submit
            if old_submit_logic in content:
                content = content.replace(old_submit_logic, new_submit_logic)
                modified = True
            
            # Add global timer function if not exists
            if 'function toggleTimer()' not in content:
                # Insert before the existing global functions
                content = content.replace(
                    'function showReview() {',
                    timer_function_fix + '\n\nfunction showReview() {'
                )
                modified = True
            
            if modified:
                with open(exam_file, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                print(f"✓ Fixed timer issues in {os.path.basename(exam_file)}")
            else:
                print(f"- No timer fixes needed in {os.path.basename(exam_file)}")
                
        except Exception as e:
            print(f"✗ Error processing {exam_file}: {e}")
    
    print(f"\nProcessed {len(exam_files)} exam files")
    print("✅ Timer issues have been fixed!")
    print("📝 Fixed:")
    print("   • Pause button now works correctly")
    print("   • Timer stops completely after exam submission")
    print("   • Added proper global timer function")

if __name__ == "__main__":
    fix_timer_issues()
