#!/usr/bin/env python3
import os

def enhance_header():
    html_dir = "/Users/Matthieu/Downloads/SolutionsArchitectPracticeExam/SAA-C03_Exam/SAA-C03_Complete_Exam_Suite/Enhanced_HTML_Quizzes"
    
    enhanced_header_css = """
        /* Enhanced Professional Header */
        .exam-header {
            background: linear-gradient(135deg, #232f3e 0%, #37475a 50%, #ff9900 100%);
            color: white;
            padding: 25px 30px;
            position: sticky;
            top: 0;
            z-index: 100;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            border-bottom: 3px solid var(--secondary-color);
        }
        
        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 20px;
        }
        
        .exam-title {
            display: flex;
            align-items: center;
            gap: 20px;
        }
        
        .aws-logo {
            font-size: 2.5em;
            background: linear-gradient(45deg, #ff9900, #ffb84d);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.3));
        }
        
        .title-text h1 {
            font-size: 1.8em;
            font-weight: 700;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            background: linear-gradient(45deg, #ffffff, #e8e8e8);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .title-text p {
            font-size: 1em;
            opacity: 0.9;
            margin-top: 5px;
            font-weight: 500;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
        }
        
        .certification-badge {
            background: linear-gradient(135deg, #28a745, #20c997);
            color: white;
            padding: 8px 16px;
            border-radius: 25px;
            font-size: 0.9em;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            box-shadow: 0 3px 10px rgba(40, 167, 69, 0.3);
            border: 2px solid rgba(255,255,255,0.2);
        }
        
        .exam-controls {
            display: flex;
            align-items: center;
            gap: 25px;
            flex-wrap: wrap;
        }
        
        .timer-display {
            background: linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05));
            padding: 12px 24px;
            border-radius: 30px;
            display: flex;
            align-items: center;
            gap: 12px;
            font-weight: bold;
            font-family: 'Courier New', monospace;
            font-size: 1.1em;
            border: 2px solid rgba(255,255,255,0.2);
            backdrop-filter: blur(10px);
        }
        
        .timer-icon {
            color: var(--secondary-color);
            font-size: 1.2em;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
        
        .control-btn {
            background: linear-gradient(135deg, var(--accent-color), #0056b3);
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 25px;
            cursor: pointer;
            font-weight: 600;
            font-size: 0.95em;
            transition: all 0.3s ease;
            border: 2px solid rgba(255,255,255,0.2);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .control-btn:hover {
            background: linear-gradient(135deg, #0056b3, var(--accent-color));
            transform: translateY(-3px);
            box-shadow: 0 6px 20px rgba(0,123,186,0.4);
        }
        
        /* Mobile Header Adjustments */
        @media (max-width: 768px) {
            .exam-header {
                padding: 20px 15px;
            }
            
            .header-content {
                flex-direction: column;
                text-align: center;
                gap: 15px;
            }
            
            .title-text h1 {
                font-size: 1.4em;
            }
            
            .aws-logo {
                font-size: 2em;
            }
            
            .exam-controls {
                justify-content: center;
                gap: 15px;
            }
        }
    """
    
    for filename in os.listdir(html_dir):
        if filename.endswith('.html'):
            filepath = os.path.join(html_dir, filename)
            
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Add enhanced header CSS
            if '</style>' in content and enhanced_header_css not in content:
                content = content.replace('</style>', enhanced_header_css + '\n        </style>')
            
            # Add certification badge to header
            if '<div class="title-text">' in content and 'certification-badge' not in content:
                content = content.replace(
                    '<div class="title-text">',
                    '<div class="title-text">\n                        <div class="certification-badge">SAA-C03 Associate</div>'
                )
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            
            print(f"✅ Enhanced header: {filename}")

if __name__ == "__main__":
    enhance_header()
    print("🎨 Professional header with gradient applied!")
