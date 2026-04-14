#!/usr/bin/env python3

import os
import glob
import re

def direct_fullwidth_fix():
    exam_dir = "SAA-C03_Complete_Exam_Suite/Associate_Exams"
    exam_files = glob.glob(f"{exam_dir}/*.html")
    
    for exam_file in exam_files:
        try:
            with open(exam_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Direct replacements in the minified CSS
            replacements = [
                # Main container
                ('max-width: 1200px;', 'max-width: none; width: 100vw;'),
                ('max-width: 900px;', 'max-width: none; width: 100%;'),
                ('max-width: 800px;', 'max-width: none; width: 100%;'),
                
                # Specific container fixes
                ('margin: 0 auto;', 'margin: 0;'),
                ('padding: 30px;', 'padding: 30px 2%;'),
                ('padding: 20px 30px;', 'padding: 20px 2%;'),
                ('padding: 15px 30px;', 'padding: 15px 2%;'),
                
                # Question container specific
                ('question-container { padding: 30px; max-width: 900px; margin: 0 auto; }', 
                 'question-container { padding: 30px 2%; max-width: none; margin: 0; width: 100%; }'),
            ]
            
            modified = False
            for old, new in replacements:
                if old in content:
                    content = content.replace(old, new)
                    modified = True
            
            # Add comprehensive override at the end of CSS
            override_css = '''
/* DIRECT FULL-WIDTH OVERRIDE */
.exam-container { max-width: none !important; width: 100vw !important; margin: 0 !important; }
.question-container { max-width: none !important; width: 100% !important; padding: 30px 2% !important; }
.nav-panel { padding: 20px 2% !important; }
.progress-container { padding: 15px 2% !important; }
.exam-header .header-content { max-width: none !important; padding: 0 2% !important; }
.options-container { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 20px !important; }
@media (max-width: 900px) { .options-container { grid-template-columns: 1fr !important; } }
'''
            
            if 'DIRECT FULL-WIDTH OVERRIDE' not in content:
                # Insert before </style>
                content = content.replace('</style>', override_css + '</style>')
                modified = True
            
            if modified:
                with open(exam_file, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                print(f"✓ Applied direct full-width fix to {os.path.basename(exam_file)}")
            else:
                print(f"- No changes applied to {os.path.basename(exam_file)}")
                
        except Exception as e:
            print(f"✗ Error processing {exam_file}: {e}")
    
    print(f"\nProcessed {len(exam_files)} exam files")
    print("✅ Direct full-width CSS override applied!")
    print("📝 The exam should now use the full browser width")

if __name__ == "__main__":
    direct_fullwidth_fix()
