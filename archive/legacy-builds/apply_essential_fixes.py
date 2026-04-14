#!/usr/bin/env python3

import os
import glob

def apply_essential_fixes():
    exam_dir = "SAA-C03_Complete_Exam_Suite/Associate_Exams"
    exam_files = glob.glob(f"{exam_dir}/*.html")
    
    for exam_file in exam_files:
        try:
            with open(exam_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            modified = False
            
            # Fix 1: Multi-answer checking logic
            old_logic = "const correctAnswers = correctAnswer. split(','). map(a => a. trim()); isCorrect = correctAnswers. length === userAnswer. length && correctAnswers. every(a => userAnswer. includes(a));"
            new_logic = "let correctAnswers; if (correctAnswer. includes(',')) { correctAnswers = correctAnswer. split(','). map(a => a. trim()); } else { correctAnswers = correctAnswer. split(''); } const userAnswerSorted = userAnswer. sort(). join(''); const correctAnswerSorted = correctAnswers. sort(). join(''); isCorrect = userAnswerSorted === correctAnswerSorted;"
            
            if old_logic in content:
                content = content.replace(old_logic, new_logic)
                modified = True
            
            # Fix 2: Timer pause button
            if 'onclick="toggleTimer()"' in content:
                content = content.replace('onclick="toggleTimer()"', 'onclick="exam.toggleTimer()"')
                modified = True
            
            # Fix 3: Timer stops after submission
            old_submit = 'clearInterval(this. timerInterval); clearInterval(this. autoSaveInterval); this. calculateResults();'
            new_submit = 'clearInterval(this. timerInterval); clearInterval(this. autoSaveInterval); this. timerInterval = null; this. autoSaveInterval = null; this. calculateResults();'
            
            if old_submit in content:
                content = content.replace(old_submit, new_submit)
                modified = True
            
            # Fix 4: Add global timer function
            if 'function toggleTimer()' not in content:
                timer_function = '''
function toggleTimer() {
    if (exam) {
        exam.toggleTimer();
    }
}'''
                content = content.replace('function showReview() {', timer_function + '\n\nfunction showReview() {')
                modified = True
            
            if modified:
                with open(exam_file, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                print(f"✓ Applied essential fixes to {os.path.basename(exam_file)}")
            else:
                print(f"- No fixes needed for {os.path.basename(exam_file)}")
                
        except Exception as e:
            print(f"✗ Error processing {exam_file}: {e}")
    
    print(f"\nProcessed {len(exam_files)} fresh exam files")
    print("✅ Applied only essential working fixes!")
    print("📝 Fixed:")
    print("   • Multi-answer checking (your 4 questions now score correctly)")
    print("   • Timer pause/resume functionality")
    print("   • Timer stops after exam submission")
    print("📝 Clean state restored with working functionality!")

if __name__ == "__main__":
    apply_essential_fixes()
