#!/usr/bin/env python3
import os

def simple_answer_fix():
    html_dir = "/Users/Matthieu/Downloads/SolutionsArchitectPracticeExam/SAA-C03_Exam/SAA-C03_Complete_Exam_Suite/Enhanced_HTML_Quizzes"
    
    for filename in os.listdir(html_dir):
        if filename.endswith('.html'):
            filepath = os.path.join(html_dir, filename)
            
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Replace comma joins with empty string joins
            content = content.replace("join(', ')", "join('')")
            content = content.replace('join(", ")', "join('')")
            content = content.replace("join(',')", "join('')")
            content = content.replace('join(",")', "join('')")
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            
            print(f"✅ Fixed joins: {filename}")

if __name__ == "__main__":
    simple_answer_fix()
    print("🔧 Simple answer fix applied!")
