#!/usr/bin/env python3
import os
import re

def comprehensive_answer_fix():
    html_dir = "/Users/Matthieu/Downloads/SolutionsArchitectPracticeExam/SAA-C03_Exam/SAA-C03_Complete_Exam_Suite/Enhanced_HTML_Quizzes"
    
    for filename in os.listdir(html_dir):
        if filename.endswith('.html'):
            filepath = os.path.join(html_dir, filename)
            
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Replace the problematic comparison in line 1752
            content = content.replace(
                'return selectedAnswer === correctFormatted;',
                'return normalizeAnswer(selectedAnswer) === normalizeAnswer(correctFormatted);'
            )
            
            # Replace the comparison in line 1456-1457 (multiple choice logic)
            content = re.sub(
                r'isCorrect = correctAnswers\.length === userAnswer\.length && \s*correctAnswers\.every\(a => userAnswer\.includes\(a\)\);',
                'isCorrect = normalizeAnswer(userAnswer.join("")) === normalizeAnswer(correctAnswers.join(""));',
                content
            )
            
            # Replace any remaining direct comparisons
            content = re.sub(
                r'(\w+Answer)\s*===\s*(\w+Answer)',
                r'normalizeAnswer(\1) === normalizeAnswer(\2)',
                content
            )
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            
            print(f"✅ Comprehensive fix: {filename}")

if __name__ == "__main__":
    comprehensive_answer_fix()
    print("🔧 All answer comparisons fixed!")
