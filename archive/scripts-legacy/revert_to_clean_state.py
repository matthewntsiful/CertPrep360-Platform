#!/usr/bin/env python3

import os
import glob

def revert_to_clean_state():
    exam_dir = "SAA-C03_Complete_Exam_Suite/Associate_Exams"
    exam_files = glob.glob(f"{exam_dir}/*.html")
    
    # Remove all full-width CSS additions
    css_removals = [
        '/* Full-Width Layout Enhancements */',
        '/* AGGRESSIVE FULL-WIDTH OVERRIDE */',
        '/* DIRECT FULL-WIDTH OVERRIDE */',
    ]
    
    # Restore original CSS values
    css_restorations = [
        ('max-width: none; width: 100vw;', 'max-width: 1200px;'),
        ('max-width: none; width: 100%;', 'max-width: 900px;'),
        ('padding: 30px 2%;', 'padding: 30px;'),
        ('padding: 20px 2%;', 'padding: 20px 30px;'),
        ('padding: 15px 2%;', 'padding: 15px 30px;'),
        ('margin: 0;', 'margin: 0 auto;'),
    ]
    
    for exam_file in exam_files:
        try:
            with open(exam_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            modified = False
            
            # Remove full-width CSS blocks
            for removal in css_removals:
                if removal in content:
                    # Find and remove the entire CSS block
                    start_idx = content.find(removal)
                    if start_idx != -1:
                        # Find the end of this CSS block (next /* comment or </style>)
                        end_idx = content.find('</style>', start_idx)
                        next_comment = content.find('/*', start_idx + len(removal))
                        
                        if next_comment != -1 and next_comment < end_idx:
                            end_idx = next_comment
                        
                        if end_idx != -1:
                            content = content[:start_idx] + content[end_idx:]
                            modified = True
            
            # Restore original CSS values
            for new_val, original_val in css_restorations:
                if new_val in content:
                    content = content.replace(new_val, original_val)
                    modified = True
            
            # Keep only the essential timer fixes
            if 'function toggleTimer()' not in content:
                timer_function = '''
function toggleTimer() {
    if (exam) {
        exam.toggleTimer();
    }
}'''
                content = content.replace(
                    'function showReview() {',
                    timer_function + '\n\nfunction showReview() {'
                )
                modified = True
            
            # Ensure pause button works
            if 'onclick="toggleTimer()"' in content:
                content = content.replace(
                    'onclick="toggleTimer()"',
                    'onclick="exam.toggleTimer()"'
                )
                modified = True
            
            # Ensure timer stops after submission
            if 'clearInterval(this. timerInterval); clearInterval(this. autoSaveInterval); this. calculateResults();' in content:
                content = content.replace(
                    'clearInterval(this. timerInterval); clearInterval(this. autoSaveInterval); this. calculateResults();',
                    'clearInterval(this. timerInterval); clearInterval(this. autoSaveInterval); this. timerInterval = null; this. autoSaveInterval = null; this. calculateResults();'
                )
                modified = True
            
            if modified:
                with open(exam_file, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                print(f"✓ Reverted to clean state: {os.path.basename(exam_file)}")
            else:
                print(f"- No changes needed: {os.path.basename(exam_file)}")
                
        except Exception as e:
            print(f"✗ Error processing {exam_file}: {e}")
    
    print(f"\nProcessed {len(exam_files)} exam files")
    print("✅ Reverted to clean state!")
    print("📝 Kept working features:")
    print("   • Timer pause/resume functionality")
    print("   • Timer stops after exam submission")
    print("   • Multi-answer checking fix")
    print("   • All other enhancements intact")
    print("📝 Removed:")
    print("   • All full-width layout changes")

if __name__ == "__main__":
    revert_to_clean_state()
