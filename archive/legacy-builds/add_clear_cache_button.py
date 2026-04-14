#!/usr/bin/env python3

import os
import glob

def add_clear_cache_button():
    exam_dir = "SAA-C03_Complete_Exam_Suite/Associate_Exams"
    exam_files = glob.glob(f"{exam_dir}/*.html")
    
    # Clear cache method
    clear_cache_method = '''
    clearAllCache() {
        if (confirm('Clear all saved progress and start fresh? This cannot be undone.')) {
            // Clear all localStorage for this exam
            const examId = document.title.replace(/[^a-zA-Z0-9]/g, '_');
            const keys = Object.keys(localStorage);
            
            keys.forEach(key => {
                if (key.includes(examId) || key.includes('exam_')) {
                    localStorage.removeItem(key);
                }
            });
            
            alert('Cache cleared! The page will reload.');
            location.reload();
        }
    }'''
    
    # Add clear cache button to exam controls
    old_controls = '''                <div class="exam-controls">
                    <div class="timer-display">
                        <span class="timer-icon">⏱️</span>
                        <span id="timer">130:00</span>
                    </div>
                    <div class="passing-score-indicator">
                        🎯 Pass: 720/1000 (72%)
                    </div>
                    <button class="control-btn" onclick="toggleTimer()" id="pauseBtn">Pause</button>
                    <button class="control-btn" onclick="exam.showEnhancedReview()">Review</button>
                </div>'''
    
    new_controls = '''                <div class="exam-controls">
                    <div class="timer-display">
                        <span class="timer-icon">⏱️</span>
                        <span id="timer">130:00</span>
                    </div>
                    <div class="passing-score-indicator">
                        🎯 Pass: 720/1000 (72%)
                    </div>
                    <button class="control-btn" onclick="toggleTimer()" id="pauseBtn">Pause</button>
                    <button class="control-btn" onclick="exam.showEnhancedReview()">Review</button>
                    <button class="control-btn" onclick="exam.clearAllCache()" style="background: #dc3545;">🗑️ Clear Cache</button>
                </div>'''
    
    for exam_file in exam_files:
        try:
            with open(exam_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            modified = False
            
            # Add clear cache method
            if 'clearAllCache(' not in content:
                content = content.replace(
                    'exportReview() {',
                    clear_cache_method + '\n    \n    exportReview() {'
                )
                modified = True
            
            # Add clear cache button
            if old_controls in content:
                content = content.replace(old_controls, new_controls)
                modified = True
            
            if modified:
                with open(exam_file, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                print(f"✓ Added clear cache button to {os.path.basename(exam_file)}")
            else:
                print(f"- Clear cache already exists in {os.path.basename(exam_file)}")
                
        except Exception as e:
            print(f"✗ Error processing {exam_file}: {e}")
    
    print(f"\nProcessed {len(exam_files)} exam files")

if __name__ == "__main__":
    add_clear_cache_button()
