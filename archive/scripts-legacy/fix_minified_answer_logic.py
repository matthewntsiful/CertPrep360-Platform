#!/usr/bin/env python3

import os
import glob

def fix_minified_answer_logic():
    exam_dir = "SAA-C03_Complete_Exam_Suite/Associate_Exams"
    exam_files = glob.glob(f"{exam_dir}/*.html")
    
    # The problematic minified logic
    old_logic = "const correctAnswers = correctAnswer. split(','). map(a => a. trim()); isCorrect = correctAnswers. length === userAnswer. length && correctAnswers. every(a => userAnswer. includes(a));"
    
    # Fixed logic that handles both formats
    new_logic = "let correctAnswers; if (correctAnswer. includes(',')) { correctAnswers = correctAnswer. split(','). map(a => a. trim()); } else { correctAnswers = correctAnswer. split(''); } const userAnswerSorted = userAnswer. sort(). join(''); const correctAnswerSorted = correctAnswers. sort(). join(''); isCorrect = userAnswerSorted === correctAnswerSorted;"
    
    for exam_file in exam_files:
        try:
            with open(exam_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            if old_logic in content:
                content = content.replace(old_logic, new_logic)
                
                with open(exam_file, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                print(f"✓ Fixed minified answer logic in {os.path.basename(exam_file)}")
            else:
                print(f"- Logic pattern not found in {os.path.basename(exam_file)}")
                
        except Exception as e:
            print(f"✗ Error processing {exam_file}: {e}")
    
    print(f"\nProcessed {len(exam_files)} exam files")
    print("✅ Multi-answer checking logic has been fixed!")
    print("📝 Now correctly handles:")
    print("   • Correct answer 'AB' matches user selection ['A', 'B']")
    print("   • Correct answer 'A,B' matches user selection ['A', 'B']") 
    print("   • Order doesn't matter - ['B', 'A'] = ['A', 'B']")
    print("   • Your 4 incorrectly marked questions should now be correct!")

if __name__ == "__main__":
    fix_minified_answer_logic()
