#!/usr/bin/env python3

import os
import glob

def fix_answer_checking_logic():
    exam_dir = "SAA-C03_Complete_Exam_Suite/Associate_Exams"
    exam_files = glob.glob(f"{exam_dir}/*.html")
    
    # The problematic logic that needs to be fixed
    old_logic = '''if (Array.isArray(userAnswer)) {
                // Multiple choice - check if arrays match
                const correctAnswers = correctAnswer.split(',').map(a => a.trim());
                isCorrect = correctAnswers.length === userAnswer.length && correctAnswers.every(a => userAnswer.includes(a));
            } else {
                // Single choice
                isCorrect = userAnswer === correctAnswer;
            }'''
    
    # Fixed logic that handles both "AB" and "A,B" formats
    new_logic = '''if (Array.isArray(userAnswer)) {
                // Multiple choice - handle both "AB" and "A,B" formats
                let correctAnswers;
                if (correctAnswer.includes(',')) {
                    // Format: "A,B" or "B,E"
                    correctAnswers = correctAnswer.split(',').map(a => a.trim());
                } else {
                    // Format: "AB" or "BE"
                    correctAnswers = correctAnswer.split('');
                }
                
                const userAnswerSorted = userAnswer.sort().join('');
                const correctAnswerSorted = correctAnswers.sort().join('');
                isCorrect = userAnswerSorted === correctAnswerSorted;
            } else {
                // Single choice
                isCorrect = userAnswer === correctAnswer;
            }'''
    
    for exam_file in exam_files:
        try:
            with open(exam_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            if old_logic in content:
                content = content.replace(old_logic, new_logic)
                
                with open(exam_file, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                print(f"✓ Fixed answer checking logic in {os.path.basename(exam_file)}")
            else:
                print(f"- Logic already fixed or not found in {os.path.basename(exam_file)}")
                
        except Exception as e:
            print(f"✗ Error processing {exam_file}: {e}")
    
    print(f"\nProcessed {len(exam_files)} exam files")
    print("✅ Multi-answer checking logic has been fixed")
    print("📝 Now correctly handles:")
    print("   • Correct answer 'AB' matches user selection ['A', 'B']")
    print("   • Correct answer 'A,B' matches user selection ['A', 'B']") 
    print("   • Correct answer 'BE' matches user selection ['B', 'E']")
    print("   • Order doesn't matter - ['B', 'A'] = ['A', 'B']")

if __name__ == "__main__":
    fix_answer_checking_logic()
