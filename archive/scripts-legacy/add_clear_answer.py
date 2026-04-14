#!/usr/bin/env python3

import os
import glob

def add_clear_answer_button():
    exam_dir = "SAA-C03_Complete_Exam_Suite/Associate_Exams"
    exam_files = glob.glob(f"{exam_dir}/*.html")
    
    # Clear answer method
    clear_method = '''
    clearAnswer(questionIndex) {
        if (window.confirm("Clear your answer for this question?")) {
            delete this.answers[questionIndex];
            this.displayQuestion(questionIndex);
            this.updateNavigationState();
            this.updateProgress();
            this.saveState();
        }
    }'''
    
    # Clear button HTML (to be inserted in question actions)
    clear_button_insertion = '''                    <button class="flag-btn ${this.flaggedQuestions.has(questionIndex) ? 'flagged' : ''}" 
                            onclick="exam.toggleFlag(${questionIndex})">
                        🚩 ${this.flaggedQuestions.has(questionIndex) ? 'Unflag' : 'Flag'}
                    </button>
                    ${this.answers[questionIndex] !== undefined ? 
                        '<button class="clear-btn" onclick="exam.clearAnswer(' + questionIndex + ')">🗑️ Clear</button>' : ''
                    }'''
    
    for exam_file in exam_files:
        try:
            with open(exam_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Add clear method if not exists
            if 'clearAnswer(questionIndex)' not in content:
                content = content.replace(
                    'toggleFlag(questionIndex) {',
                    clear_method + '\n    \n    toggleFlag(questionIndex) {'
                )
                
                # Add clear button to question actions
                old_flag_button = '''                    <button class="flag-btn ${this.flaggedQuestions.has(questionIndex) ? 'flagged' : ''}" 
                            onclick="exam.toggleFlag(${questionIndex})">
                        🚩 ${this.flaggedQuestions.has(questionIndex) ? 'Unflag' : 'Flag'}
                    </button>'''
                
                content = content.replace(old_flag_button, clear_button_insertion)
                
                # Add CSS for clear button
                css_insertion = '''        .clear-btn {
            background: #dc3545;
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            margin-left: 10px;
        }
        
        .clear-btn:hover {
            background: #c82333;
        }
        
        '''
                
                content = content.replace(
                    '        .flag-btn {',
                    css_insertion + '        .flag-btn {'
                )
                
                with open(exam_file, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                print(f"✓ Added clear answer button to {os.path.basename(exam_file)}")
            else:
                print(f"- Clear answer button already exists in {os.path.basename(exam_file)}")
                
        except Exception as e:
            print(f"✗ Error processing {exam_file}: {e}")
    
    print(f"\nProcessed {len(exam_files)} exam files")

if __name__ == "__main__":
    add_clear_answer_button()
