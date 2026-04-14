#!/usr/bin/env python3
import os
import re

def enhance_visual_styling():
    html_dir = "/Users/Matthieu/Downloads/SolutionsArchitectPracticeExam/SAA-C03_Exam/SAA-C03_Complete_Exam_Suite/Enhanced_HTML_Quizzes"
    
    enhanced_css = """
        /* Enhanced Question Styling */
        .question-content {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-left: 4px solid var(--accent-color);
            padding: 25px;
            margin: 20px 0;
            border-radius: 12px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        
        /* AWS Service Highlighting */
        .aws-service {
            background: linear-gradient(135deg, #ff9900, #ffb84d);
            color: white;
            padding: 2px 8px;
            border-radius: 4px;
            font-weight: 600;
            font-size: 0.9em;
        }
        
        /* Enhanced Answer Options */
        .answer-option {
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        
        .answer-option::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(0,123,186,0.1), transparent);
            transition: left 0.5s;
        }
        
        .answer-option:hover::before {
            left: 100%;
        }
        
        .answer-option:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        }
        
        /* Question Number Badge */
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
    """
    
    for filename in os.listdir(html_dir):
        if filename.endswith('.html'):
            filepath = os.path.join(html_dir, filename)
            
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            if '</style>' in content and enhanced_css not in content:
                content = content.replace('</style>', enhanced_css + '\n        </style>')
                
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                print(f"✅ Enhanced styling: {filename}")

if __name__ == "__main__":
    enhance_visual_styling()
    print("🎨 Visual enhancements applied!")
