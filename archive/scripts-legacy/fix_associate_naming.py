#!/usr/bin/env python3

import os
import glob

def fix_associate_naming():
    exam_dir = "SAA-C03_Complete_Exam_Suite/Associate_Exams"
    exam_files = glob.glob(f"{exam_dir}/*.html")
    
    # Title replacements
    title_replacements = [
        ('AWS SAA-C03 Professional Practice Exam', 'AWS SAA-C03 Associate Practice Exam'),
        ('Solutions Architect Associate Certification • Industry Standard', 'Solutions Architect Associate Certification • Associate Level'),
        ('Professional Practice Examination', 'Associate Practice Examination'),
        ('Professional HTML quizzes', 'Associate HTML quizzes'),
        ('professional exam generator', 'associate exam generator'),
        ('Professional AWS styling', 'Associate AWS styling'),
        ('professional certification platform', 'associate certification platform'),
        ('Professional certification-style', 'Associate certification-style'),
        ('professional certification standards', 'associate certification standards')
    ]
    
    for exam_file in exam_files:
        try:
            with open(exam_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Apply all replacements
            modified = False
            for old_text, new_text in title_replacements:
                if old_text in content:
                    content = content.replace(old_text, new_text)
                    modified = True
            
            if modified:
                with open(exam_file, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                print(f"✓ Updated Associate naming in {os.path.basename(exam_file)}")
            else:
                print(f"- No changes needed in {os.path.basename(exam_file)}")
                
        except Exception as e:
            print(f"✗ Error processing {exam_file}: {e}")
    
    print(f"\nProcessed {len(exam_files)} exam files")

if __name__ == "__main__":
    fix_associate_naming()
