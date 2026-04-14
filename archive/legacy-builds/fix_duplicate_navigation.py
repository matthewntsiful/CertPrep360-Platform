#!/usr/bin/env python3

import os
import glob

def fix_duplicate_navigation():
    exam_dir = "SAA-C03_Complete_Exam_Suite/Associate_Exams"
    
    # Find all HTML exam files
    exam_files = glob.glob(f"{exam_dir}/*.html")
    
    duplicate_nav = '''    <div class="navigation-buttons">
        <button class="nav-btn" onclick="previousQuestion()" id="prevBtn" disabled>
            ← Previous
        </button>
        <button class="submit-btn" onclick="submitExam()">
            Submit Exam
        </button>
        <button class="nav-btn" onclick="nextQuestion()" id="nextBtn">
            Next →
        </button>
    </div>'''
    
    for exam_file in exam_files:
        try:
            with open(exam_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            if duplicate_nav in content:
                content = content.replace(duplicate_nav, '')
                
                with open(exam_file, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                print(f"✓ Fixed duplicate navigation in {os.path.basename(exam_file)}")
            else:
                print(f"- No duplicate navigation found in {os.path.basename(exam_file)}")
                
        except Exception as e:
            print(f"✗ Error processing {exam_file}: {e}")
    
    print(f"\nProcessed {len(exam_files)} exam files")

if __name__ == "__main__":
    fix_duplicate_navigation()
