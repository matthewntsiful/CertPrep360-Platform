#!/usr/bin/env python3
import os

def fix_answer_order():
    html_dir = "/Users/Matthieu/Downloads/SolutionsArchitectPracticeExam/SAA-C03_Exam/SAA-C03_Complete_Exam_Suite/Enhanced_HTML_Quizzes"
    
    order_fix_js = """
        // Order-independent answer comparison
        function normalizeAnswer(answer) {
            if (!answer) return '';
            return answer.replace(/[,\\s]/g, '').split('').sort().join('');
        }
        
        function compareAnswers(userAnswer, correctAnswer) {
            return normalizeAnswer(userAnswer) === normalizeAnswer(correctAnswer);
        }
        
        // Override existing comparison functions
        const originalCheckAnswer = window.checkAnswer;
        window.checkAnswer = function(userAnswer, correctAnswer) {
            return compareAnswers(userAnswer, correctAnswer);
        };
    """
    
    for filename in os.listdir(html_dir):
        if filename.endswith('.html'):
            filepath = os.path.join(html_dir, filename)
            
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Add the order-independent comparison logic
            if '</script>' in content and 'normalizeAnswer' not in content:
                content = content.replace('</script>', order_fix_js + '\n        </script>')
            
            # Also fix any direct comparison in the scoring logic
            content = content.replace(
                'userAnswer === correctAnswer',
                'compareAnswers(userAnswer, correctAnswer)'
            )
            
            content = content.replace(
                'selectedAnswer === correctAnswer',
                'compareAnswers(selectedAnswer, correctAnswer)'
            )
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            
            print(f"✅ Fixed answer order: {filename}")

if __name__ == "__main__":
    fix_answer_order()
    print("🔄 Order-independent answer matching applied!")
