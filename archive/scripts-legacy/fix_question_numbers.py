#!/usr/bin/env python3
import os

def fix_question_numbers():
    html_dir = "/Users/Matthieu/Downloads/SolutionsArchitectPracticeExam/SAA-C03_Exam/SAA-C03_Complete_Exam_Suite/Enhanced_HTML_Quizzes"
    
    question_number_css = """
        /* Centered and Smaller Question Numbers */
        .question-number {
            background: linear-gradient(135deg, var(--primary-color), #34495e);
            color: white;
            padding: 6px 12px;
            border-radius: 15px;
            font-weight: bold;
            font-size: 0.9em;
            display: block;
            text-align: center;
            margin: 0 auto 15px auto;
            width: fit-content;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
    """
    
    for filename in os.listdir(html_dir):
        if filename.endswith('.html'):
            filepath = os.path.join(html_dir, filename)
            
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            if '</style>' in content and question_number_css not in content:
                content = content.replace('</style>', question_number_css + '\n        </style>')
                
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                print(f"✅ Fixed question numbers: {filename}")

if __name__ == "__main__":
    fix_question_numbers()
    print("🎯 Question numbers centered and resized!")
