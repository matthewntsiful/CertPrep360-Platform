#!/usr/bin/env python3

import os
import glob

def fix_fullwidth_aggressive():
    exam_dir = "SAA-C03_Complete_Exam_Suite/Associate_Exams"
    exam_files = glob.glob(f"{exam_dir}/*.html")
    
    # Replace existing restrictive CSS with full-width versions
    css_replacements = [
        # Main container fixes
        ('.exam-container {\n            max-width: 1200px;', '.exam-container {\n            max-width: none;'),
        ('.exam-container {\n        max-width: 1200px;', '.exam-container {\n        max-width: none;'),
        ('max-width: 900px;', 'max-width: none;'),
        ('max-width: 800px;', 'max-width: none;'),
        
        # Question container fixes
        ('.question-container {\n            padding: 30px;\n            max-width: 900px;', '.question-container {\n            padding: 30px 5%;\n            max-width: none;'),
        
        # Navigation fixes
        ('max-width: 800px;', 'max-width: none;'),
        
        # Body and general layout
        ('margin: 0 auto;', 'margin: 0;'),
    ]
    
    # Aggressive full-width CSS override
    aggressive_css = '''
/* AGGRESSIVE FULL-WIDTH OVERRIDE */
body {
    margin: 0 !important;
    padding: 0 !important;
    width: 100vw !important;
}

.exam-container {
    max-width: none !important;
    width: 100vw !important;
    margin: 0 !important;
    padding: 0 !important;
}

.question-container {
    max-width: none !important;
    width: 100% !important;
    padding: 30px 3% !important;
    margin: 0 !important;
}

.question-text {
    width: 100% !important;
    max-width: none !important;
    margin: 25px 0 !important;
}

.options-container {
    width: 100% !important;
    max-width: none !important;
    margin: 30px 0 !important;
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
    gap: 20px !important;
}

.option {
    width: 100% !important;
    margin: 0 !important;
}

.nav-panel {
    width: 100% !important;
    padding: 20px 3% !important;
}

.question-nav {
    max-width: none !important;
    width: 100% !important;
    grid-template-columns: repeat(auto-fill, minmax(40px, 1fr)) !important;
}

.progress-container {
    width: 100% !important;
    padding: 15px 3% !important;
}

.exam-header .header-content {
    max-width: none !important;
    width: 100% !important;
    padding: 0 3% !important;
}

.results-container {
    width: 100% !important;
    padding: 30px 3% !important;
}

.results-grid {
    width: 100% !important;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)) !important;
}

@media (max-width: 1000px) {
    .options-container {
        grid-template-columns: 1fr !important;
    }
}

@media (max-width: 768px) {
    .question-container,
    .nav-panel,
    .progress-container,
    .results-container {
        padding-left: 15px !important;
        padding-right: 15px !important;
    }
    
    .exam-header .header-content {
        padding: 0 15px !important;
    }
}
'''
    
    for exam_file in exam_files:
        try:
            with open(exam_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            modified = False
            
            # Apply CSS replacements
            for old_css, new_css in css_replacements:
                if old_css in content:
                    content = content.replace(old_css, new_css)
                    modified = True
            
            # Add aggressive CSS override if not exists
            if 'AGGRESSIVE FULL-WIDTH OVERRIDE' not in content:
                content = content.replace('</style>', aggressive_css + '\n</style>')
                modified = True
            
            if modified:
                with open(exam_file, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                print(f"✓ Applied aggressive full-width to {os.path.basename(exam_file)}")
            else:
                print(f"- No changes needed in {os.path.basename(exam_file)}")
                
        except Exception as e:
            print(f"✗ Error processing {exam_file}: {e}")
    
    print(f"\nProcessed {len(exam_files)} exam files")
    print("✅ Aggressive full-width layout applied!")
    print("📝 Changes:")
    print("   • Removed ALL width constraints")
    print("   • Forced 100vw viewport width")
    print("   • Options in 2-column grid on wide screens")
    print("   • Navigation uses full width")
    print("   • All containers use full available space")

if __name__ == "__main__":
    fix_fullwidth_aggressive()
