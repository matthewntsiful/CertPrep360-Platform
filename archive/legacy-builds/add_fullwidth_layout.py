#!/usr/bin/env python3

import os
import glob

def add_fullwidth_layout():
    exam_dir = "SAA-C03_Complete_Exam_Suite/Associate_Exams"
    exam_files = glob.glob(f"{exam_dir}/*.html")
    
    # Full-width CSS enhancements
    fullwidth_css = '''
        /* Full-Width Layout Enhancements */
        .exam-container {
            max-width: none !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
        }
        
        .question-container {
            max-width: none !important;
            width: 100% !important;
            padding: 30px 5% !important;
        }
        
        .question-nav {
            grid-template-columns: repeat(auto-fill, minmax(35px, 1fr)) !important;
            max-width: none !important;
        }
        
        .progress-container {
            padding: 15px 5% !important;
        }
        
        .nav-panel {
            padding: 20px 5% !important;
        }
        
        .exam-header .header-content {
            max-width: none !important;
            padding: 0 5% !important;
        }
        
        .question-text {
            max-width: 1400px;
            margin: 25px auto !important;
        }
        
        .options-container {
            max-width: 1400px;
            margin: 30px auto !important;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(600px, 1fr));
            gap: 15px;
        }
        
        .option {
            margin: 0 !important;
        }
        
        .results-grid {
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)) !important;
            max-width: none !important;
        }
        
        .results-container {
            padding: 30px 5% !important;
        }
        
        .domain-results {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 20px;
        }
        
        .stats-grid {
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)) !important;
        }
        
        @media (max-width: 1200px) {
            .options-container {
                grid-template-columns: 1fr !important;
            }
        }
        
        @media (max-width: 768px) {
            .question-container,
            .progress-container,
            .nav-panel,
            .results-container {
                padding-left: 20px !important;
                padding-right: 20px !important;
            }
            
            .exam-header .header-content {
                padding: 0 20px !important;
            }
        }'''
    
    for exam_file in exam_files:
        try:
            with open(exam_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Add full-width CSS if not exists
            if 'Full-Width Layout Enhancements' not in content:
                # Insert before closing </style> tag
                content = content.replace('</style>', fullwidth_css + '\n    </style>')
                
                with open(exam_file, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                print(f"✓ Added full-width layout to {os.path.basename(exam_file)}")
            else:
                print(f"- Full-width layout already exists in {os.path.basename(exam_file)}")
                
        except Exception as e:
            print(f"✗ Error processing {exam_file}: {e}")
    
    print(f"\nProcessed {len(exam_files)} exam files")
    print("✅ Full-width layout enhancement completed!")
    print("📝 Enhancements:")
    print("   • Exam uses full viewport width")
    print("   • Questions display in optimized grid layout")
    print("   • Navigation panel shows more question numbers")
    print("   • Results use full width for better presentation")
    print("   • Maintains mobile responsiveness")

if __name__ == "__main__":
    add_fullwidth_layout()
