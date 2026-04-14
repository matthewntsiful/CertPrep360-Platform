#!/usr/bin/env python3
import os

def fix_navigation_numbers():
    html_dir = "/Users/Matthieu/Downloads/SolutionsArchitectPracticeExam/SAA-C03_Exam/SAA-C03_Complete_Exam_Suite/Enhanced_HTML_Quizzes"
    
    navigation_fix_css = """
        /* Revert Question Badge to Original */
        .question-number {
            background: linear-gradient(135deg, var(--primary-color), #34495e);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            display: inline-block;
            margin-bottom: 15px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        /* Fix Navigation Numbers */
        .nav-btn {
            width: 35px;
            height: 35px;
            border: 2px solid var(--border-color);
            background: white;
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 0.8em;
            transition: var(--transition);
            text-align: center;
        }
        
        .question-nav {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(35px, 1fr));
            gap: 8px;
            max-width: 800px;
            justify-items: center;
        }
    """
    
    for filename in os.listdir(html_dir):
        if filename.endswith('.html'):
            filepath = os.path.join(html_dir, filename)
            
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            if '</style>' in content and navigation_fix_css not in content:
                content = content.replace('</style>', navigation_fix_css + '\n        </style>')
                
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                print(f"✅ Fixed navigation numbers: {filename}")

if __name__ == "__main__":
    fix_navigation_numbers()
    print("🎯 Navigation numbers centered and resized!")
