#!/usr/bin/env python3

import os
import glob

def fix_retake_options():
    exam_dir = "SAA-C03_Complete_Exam_Suite/Associate_Exams"
    exam_files = glob.glob(f"{exam_dir}/*.html")
    
    # Simple retake buttons replacement
    old_buttons = '''            <div style="text-align: center; margin: 40px 0;">
                <button class="nav-button" onclick="location.reload()">Take Another Exam</button>
                <button class="nav-button" onclick="window.print()" style="margin-left: 15px;">Print Results</button>
            </div>'''
    
    new_buttons = '''            <div style="text-align: center; margin: 40px 0;">
                <div style="display: flex; gap: 15px; justify-content: center; margin-bottom: 20px;">
                    <button class="nav-button" onclick="location.reload()" style="background: #1976d2;">
                        🔄 Fresh Start
                    </button>
                    <button class="nav-button" onclick="if(confirm('Keep your answers and review?')) location.reload();" style="background: #28a745;">
                        📝 Review Mode
                    </button>
                </div>
                <button class="nav-button" onclick="window.print()" style="background: #6c757d;">
                    🖨️ Print Results
                </button>
            </div>'''
    
    for exam_file in exam_files:
        try:
            with open(exam_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            if old_buttons in content:
                content = content.replace(old_buttons, new_buttons)
                
                with open(exam_file, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                print(f"✓ Fixed retake options in {os.path.basename(exam_file)}")
            else:
                print(f"- Pattern not found in {os.path.basename(exam_file)}")
                
        except Exception as e:
            print(f"✗ Error processing {exam_file}: {e}")
    
    print(f"\nProcessed {len(exam_files)} exam files")

if __name__ == "__main__":
    fix_retake_options()
