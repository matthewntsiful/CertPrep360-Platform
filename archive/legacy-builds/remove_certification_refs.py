#!/usr/bin/env python3
import os
import re

def remove_certification_refs():
    html_dir = "/Users/Matthieu/Downloads/SolutionsArchitectPracticeExam/SAA-C03_Exam/SAA-C03_Complete_Exam_Suite/Enhanced_HTML_Quizzes"
    
    patterns_to_remove = [
        r'Page \d+ I Visit Global IT Certification Hub: https://t\.me/\+tRcmR89yGCtkZmM1',
        r'\d+ Global IT Certification Hub',
        r'Global IT Certification Hub',
        r'Visit Global IT Certification Hub: https://t\.me/\+tRcmR89yGCtkZmM1',
        r'https://t\.me/\+tRcmR89yGCtkZmM1'
    ]
    
    for filename in os.listdir(html_dir):
        if filename.endswith('.html'):
            filepath = os.path.join(html_dir, filename)
            
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            # Remove all patterns
            for pattern in patterns_to_remove:
                content = re.sub(pattern, '', content, flags=re.IGNORECASE)
            
            # Clean up extra whitespace and line breaks
            content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)
            content = re.sub(r'<br>\s*<br>\s*<br>', '<br><br>', content)
            
            if content != original_content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"✅ Cleaned: {filename}")
            else:
                print(f"⚪ No changes: {filename}")

if __name__ == "__main__":
    remove_certification_refs()
    print("🧹 Certification hub references removed!")
