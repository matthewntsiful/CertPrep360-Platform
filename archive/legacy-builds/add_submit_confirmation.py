#!/usr/bin/env python3

import os
import glob

def add_enhanced_submit_confirmation():
    exam_dir = "SAA-C03_Complete_Exam_Suite/Associate_Exams"
    exam_files = glob.glob(f"{exam_dir}/*.html")
    
    # Enhanced confirmation method
    enhanced_confirmation = '''
    showSubmitConfirmation(autoSubmit = false) {
        if (autoSubmit) return true;
        
        const answered = Object.keys(this.answers).length;
        const total = this.questions.length;
        const unanswered = total - answered;
        const flagged = this.flaggedQuestions.size;
        const timeRemaining = Math.floor(this.timeLeft / 60);
        
        let message = "⚠️ SUBMIT EXAM CONFIRMATION\\n\\n";
        message += `📊 Progress: ${answered}/${total} questions answered\\n`;
        
        if (unanswered > 0) {
            message += `❌ ${unanswered} questions unanswered\\n`;
        }
        
        if (flagged > 0) {
            message += `🚩 ${flagged} questions flagged for review\\n`;
        }
        
        if (timeRemaining > 30) {
            message += `⏰ ${timeRemaining} minutes remaining\\n`;
        }
        
        message += "\\n⚠️ Once submitted, you CANNOT return to modify answers.\\n\\n";
        message += "Are you absolutely sure you want to submit?";
        
        return window.confirm(message);
    }'''
    
    for exam_file in exam_files:
        try:
            with open(exam_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Add enhanced confirmation method if not exists
            if 'showSubmitConfirmation(' not in content:
                content = content.replace(
                    '// Exam submission\n    submitExam(autoSubmit = false) {',
                    enhanced_confirmation + '\n    \n    // Exam submission\n    submitExam(autoSubmit = false) {'
                )
                
                # Replace existing confirmation logic
                old_confirmation = '''if (!autoSubmit && unanswered > 0) {
            const confirm = window.confirm(
                `You have ${unanswered} unanswered questions. Are you sure you want to submit?`
            );
            if (!confirm) return;
        }'''
                
                new_confirmation = '''if (!this.showSubmitConfirmation(autoSubmit)) {
            return;
        }'''
                
                content = content.replace(old_confirmation, new_confirmation)
                
                with open(exam_file, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                print(f"✓ Enhanced submit confirmation in {os.path.basename(exam_file)}")
            else:
                print(f"- Enhanced confirmation already exists in {os.path.basename(exam_file)}")
                
        except Exception as e:
            print(f"✗ Error processing {exam_file}: {e}")
    
    print(f"\nProcessed {len(exam_files)} exam files")

if __name__ == "__main__":
    add_enhanced_submit_confirmation()
