#!/usr/bin/env python3
import os
import re

def fix_associate_branding():
    html_dir = "/Users/Matthieu/Downloads/SolutionsArchitectPracticeExam/SAA-C03_Exam/SAA-C03_Complete_Exam_Suite/Enhanced_HTML_Quizzes"
    
    replacements = {
        # Fix Professional to Associate
        r'AWS Solutions Architect Professional Practice Exam': 'AWS Solutions Architect Associate Practice Exam',
        r'AWS Solutions Architect Professional Exam': 'AWS Solutions Architect Associate Exam',
        r'Professional AWS certification preparation': 'AWS Solutions Architect Associate certification preparation',
        r'AWS Solutions Architect Professional Exam Suite': 'AWS Solutions Architect Associate Exam Suite',
        r'Professional AWS Solutions Architect Associate certification': 'AWS Solutions Architect Associate certification'
    }
    
    for filename in os.listdir(html_dir):
        if filename.endswith('.html'):
            filepath = os.path.join(html_dir, filename)
            
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            # Apply all replacements
            for old_text, new_text in replacements.items():
                content = re.sub(old_text, new_text, content, flags=re.IGNORECASE)
            
            # Update title specifically
            content = re.sub(r'<title>.*?</title>', 
                           '<title>AWS Solutions Architect Associate Practice Exam (SAA-C03) | Professional Certification Prep</title>', 
                           content)
            
            if content != original_content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"✅ Fixed to Associate: {filename}")
            else:
                print(f"⚪ No changes: {filename}")

if __name__ == "__main__":
    fix_associate_branding()
    print("🎯 Associate level branding corrected!")
