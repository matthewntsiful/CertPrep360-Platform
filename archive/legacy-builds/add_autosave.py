#!/usr/bin/env python3

import os
import glob

def add_autosave_feature():
    exam_dir = "SAA-C03_Complete_Exam_Suite/Associate_Exams"
    exam_files = glob.glob(f"{exam_dir}/*.html")
    
    # Auto-save JavaScript to insert
    autosave_js = '''
        // Auto-save functionality
        saveAnswer(questionIndex, selectedAnswer) {
            const examId = document.title.replace(/[^a-zA-Z0-9]/g, '_');
            const saveKey = `exam_${examId}_answers`;
            
            let savedAnswers = JSON.parse(localStorage.getItem(saveKey) || '{}');
            savedAnswers[questionIndex] = selectedAnswer;
            localStorage.setItem(saveKey, JSON.stringify(savedAnswers));
        }
        
        loadSavedAnswers() {
            const examId = document.title.replace(/[^a-zA-Z0-9]/g, '_');
            const saveKey = `exam_${examId}_answers`;
            
            const savedAnswers = JSON.parse(localStorage.getItem(saveKey) || '{}');
            for (let [questionIndex, answer] of Object.entries(savedAnswers)) {
                this.answers[parseInt(questionIndex)] = answer;
            }
        }
        
        clearSavedAnswers() {
            const examId = document.title.replace(/[^a-zA-Z0-9]/g, '_');
            const saveKey = `exam_${examId}_answers`;
            localStorage.removeItem(saveKey);
        }'''
    
    # Find insertion point and modify selectAnswer method
    for exam_file in exam_files:
        try:
            with open(exam_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Insert auto-save methods before existing selectAnswer method
            if 'selectAnswer(questionIndex, selectedAnswer)' in content and 'saveAnswer(questionIndex, selectedAnswer)' not in content:
                content = content.replace(
                    'selectAnswer(questionIndex, selectedAnswer) {',
                    autosave_js + '\n        \n        selectAnswer(questionIndex, selectedAnswer) {'
                )
                
                # Add auto-save call to selectAnswer method
                content = content.replace(
                    'this.answers[questionIndex] = selectedAnswer;',
                    'this.answers[questionIndex] = selectedAnswer;\n            this.saveAnswer(questionIndex, selectedAnswer);'
                )
                
                # Add load saved answers to startExam method
                content = content.replace(
                    'startExam() {',
                    'startExam() {\n            this.loadSavedAnswers();'
                )
                
                # Add clear saved answers to submitExam method
                content = content.replace(
                    'submitExam() {',
                    'submitExam() {\n            this.clearSavedAnswers();'
                )
                
                with open(exam_file, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                print(f"✓ Added auto-save to {os.path.basename(exam_file)}")
            else:
                print(f"- Auto-save already exists in {os.path.basename(exam_file)}")
                
        except Exception as e:
            print(f"✗ Error processing {exam_file}: {e}")
    
    print(f"\nProcessed {len(exam_files)} exam files")

if __name__ == "__main__":
    add_autosave_feature()
