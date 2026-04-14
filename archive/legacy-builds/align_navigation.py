#!/usr/bin/env python3
import os

def align_navigation():
    html_dir = "/Users/Matthieu/Downloads/SolutionsArchitectPracticeExam/SAA-C03_Exam/SAA-C03_Complete_Exam_Suite/Enhanced_HTML_Quizzes"
    
    navigation_alignment_css = """
        /* Center Navigation with Question Content */
        .nav-panel {
            background: var(--light-bg);
            padding: 20px 30px;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            justify-content: center;
        }
        
        .question-nav {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(35px, 1fr));
            gap: 8px;
            max-width: 1200px;
            width: 100%;
            justify-items: center;
        }
    """
    
    for filename in os.listdir(html_dir):
        if filename.endswith('.html'):
            filepath = os.path.join(html_dir, filename)
            
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            if '</style>' in content and navigation_alignment_css not in content:
                content = content.replace('</style>', navigation_alignment_css + '\n        </style>')
                
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                print(f"✅ Aligned navigation: {filename}")

if __name__ == "__main__":
    align_navigation()
    print("📐 Navigation aligned with question content!")
