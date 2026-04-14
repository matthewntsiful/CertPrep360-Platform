#!/usr/bin/env python3
import os
import re

def fix_multiple_answers():
    html_dir = "/Users/Matthieu/Downloads/SolutionsArchitectPracticeExam/SAA-C03_Exam/SAA-C03_Complete_Exam_Suite/Enhanced_HTML_Quizzes"
    
    multiple_answer_js = """
        // Fix Multiple Answer Format
        function getSelectedAnswers(questionIndex) {
            const checkboxes = document.querySelectorAll(`input[name="q${questionIndex}"]:checked`);
            let answers = [];
            checkboxes.forEach(cb => {
                answers.push(cb.value);
            });
            // Return as concatenated string (AB) instead of comma-separated (A,C)
            return answers.sort().join('');
        }
        
        function checkAnswer(questionIndex, correctAnswer) {
            const selectedAnswer = getSelectedAnswers(questionIndex);
            
            // Handle both single and multiple answers
            if (correctAnswer.includes(',')) {
                // Convert comma-separated correct answer to concatenated format
                const correctFormatted = correctAnswer.split(',').map(a => a.trim()).sort().join('');
                return selectedAnswer === correctFormatted;
            } else {
                return selectedAnswer === correctAnswer;
            }
        }
        
        // Override existing answer checking
        function submitExam() {
            let score = 0;
            let totalQuestions = questions.length;
            let results = [];
            
            questions.forEach((question, index) => {
                const selectedAnswer = getSelectedAnswers(index);
                const correctAnswer = question.correct;
                const isCorrect = checkAnswer(index, correctAnswer);
                
                if (isCorrect) score++;
                
                results.push({
                    question: index + 1,
                    selected: selectedAnswer,
                    correct: correctAnswer,
                    isCorrect: isCorrect
                });
            });
            
            showResults(score, totalQuestions, results);
        }
    """
    
    for filename in os.listdir(html_dir):
        if filename.endswith('.html'):
            filepath = os.path.join(html_dir, filename)
            
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            if '</script>' in content and multiple_answer_js not in content:
                content = content.replace('</script>', multiple_answer_js + '\n        </script>')
                
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                print(f"✅ Fixed multiple answers: {filename}")

if __name__ == "__main__":
    fix_multiple_answers()
    print("🔧 Multiple answer format fixed!")
