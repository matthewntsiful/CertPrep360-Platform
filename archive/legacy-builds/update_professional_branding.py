#!/usr/bin/env python3
import os
import re

def update_professional_branding():
    html_dir = "/Users/Matthieu/Downloads/SolutionsArchitectPracticeExam/SAA-C03_Exam/SAA-C03_Complete_Exam_Suite/Enhanced_HTML_Quizzes"
    
    replacements = {
        # Title updates
        r'AWS SAA-C03 Professional Practice Exam': 'AWS Solutions Architect Professional Practice Exam',
        r'Professional certification preparation': 'Professional AWS certification preparation',
        r'SAA-C03 Practice Exam Suite': 'AWS Solutions Architect Professional Exam Suite',
        
        # Header updates
        r'AWS SAA-C03 Practice Exam': 'AWS Solutions Architect Professional Exam',
        r'Solutions Architect Practice': 'Solutions Architect Professional Practice',
        
        # Meta description updates
        r'AWS SAA-C03 Practice Exam - Professional': 'AWS Solutions Architect Professional Practice Exam -',
        r'Professional AWS Solutions Architect certification': 'Professional AWS Solutions Architect Associate certification'
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
            
            # Update any remaining generic references
            content = re.sub(r'<title>.*?</title>', 
                           '<title>AWS Solutions Architect Professional Practice Exam | Industry Standard Certification Prep</title>', 
                           content)
            
            if content != original_content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"✅ Updated branding: {filename}")
            else:
                print(f"⚪ No changes: {filename}")

if __name__ == "__main__":
    update_professional_branding()
    print("🏆 Professional branding updated!")
