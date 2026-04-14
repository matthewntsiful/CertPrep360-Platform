#!/usr/bin/env python3

import os
import glob

def fix_multi_answer_checking():
    exam_dir = "SAA-C03_Complete_Exam_Suite/Associate_Exams"
    exam_files = glob.glob(f"{exam_dir}/*.html")
    
    # Enhanced checkAnswer method that handles both formats
    enhanced_check_answer = '''    checkAnswer(questionIndex, userAnswer) {
        if (userAnswer === undefined || userAnswer === null) {
            return false;
        }
        
        const question = this.questions[questionIndex];
        let correctAnswer = question.correct;
        
        // Handle multiple correct answers
        if (Array.isArray(userAnswer)) {
            // User selected multiple answers (stored as array like ['A', 'B'])
            const userAnswerString = userAnswer.sort().join('');
            
            // Check if correct answer is in "AB" format or "A,B" format
            let correctAnswerString;
            if (correctAnswer.includes(',')) {
                // Format: "A,B" or "B,E"
                correctAnswerString = correctAnswer.split(',').map(s => s.trim()).sort().join('');
            } else {
                // Format: "AB" or "BE"
                correctAnswerString = correctAnswer.split('').sort().join('');
            }
            
            return userAnswerString === correctAnswerString;
        } else {
            // Single answer
            return userAnswer === correctAnswer;
        }
    }'''
    
    for exam_file in exam_files:
        try:
            with open(exam_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Find and replace the existing checkAnswer method
            old_check_pattern = r'checkAnswer\(questionIndex, userAnswer\) \{[^}]*\}'
            
            if 'checkAnswer(questionIndex, userAnswer)' in content:
                # Find the method and replace it
                import re
                
                # More comprehensive pattern to match the entire method
                pattern = r'checkAnswer\(questionIndex, userAnswer\) \{(?:[^{}]|\{[^{}]*\})*\}'
                
                if re.search(pattern, content):
                    content = re.sub(pattern, enhanced_check_answer.strip(), content)
                else:
                    # Fallback: replace simpler pattern
                    old_simple = '''checkAnswer(questionIndex, userAnswer) {
        if (userAnswer === undefined) return false;
        
        const question = this.questions[questionIndex];
        const correctAnswer = question.correct;
        
        if (Array.isArray(userAnswer)) {
            return userAnswer.sort().join('') === correctAnswer;
        }
        
        return userAnswer === correctAnswer;
    }'''
                    
                    if old_simple in content:
                        content = content.replace(old_simple, enhanced_check_answer)
                
                with open(exam_file, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                print(f"✓ Fixed multi-answer checking in {os.path.basename(exam_file)}")
            else:
                print(f"- No checkAnswer method found in {os.path.basename(exam_file)}")
                
        except Exception as e:
            print(f"✗ Error processing {exam_file}: {e}")
    
    print(f"\nProcessed {len(exam_files)} exam files")
    print("✅ Multi-answer checking logic has been fixed")
    print("📝 Now handles both formats:")
    print("   • Correct answer 'AB' matches user selection ['A', 'B']")
    print("   • Correct answer 'A,B' matches user selection ['A', 'B']")
    print("   • Correct answer 'BE' matches user selection ['B', 'E']")

if __name__ == "__main__":
    fix_multi_answer_checking()
