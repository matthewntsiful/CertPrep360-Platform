#!/usr/bin/env python3
import os
import re

def fix_answer_collection():
    html_dir = "/Users/Matthieu/Downloads/SolutionsArchitectPracticeExam/SAA-C03_Exam/SAA-C03_Complete_Exam_Suite/Enhanced_HTML_Quizzes"
    
    for filename in os.listdir(html_dir):
        if filename.endswith('.html'):
            filepath = os.path.join(html_dir, filename)
            
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Find and replace the answer collection logic
            # Look for existing answer collection patterns and replace them
            
            # Replace comma-separated answer collection with concatenated
            content = re.sub(
                r'answers\.push\(checkbox\.value\);[\s\S]*?return answers\.join\([\'"][,\s]*[\'\"]\);',
                'answers.push(checkbox.value);\n            }\n            return answers.sort().join(\'\');',
                content
            )
            
            # Replace any remaining comma joins
            content = re.sub(r'\.join\([\'"][,\s]*[\'\"]\)', '.join(\'\')', content)
            
            # Fix answer display in results
            content = re.sub(
                r'Your answer: \$\{userAnswer\}',
                'Your answer: ${userAnswer.replace(/,\\s*/g, \'\')}',
                content
            )
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            
            print(f"✅ Fixed answer collection: {filename}")

if __name__ == "__main__":
    fix_answer_collection()
    print("🔧 Answer collection logic fixed!")
