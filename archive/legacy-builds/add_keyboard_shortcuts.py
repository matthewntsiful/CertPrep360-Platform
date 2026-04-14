#!/usr/bin/env python3
import os

def add_keyboard_shortcuts():
    html_dir = "/Users/Matthieu/Downloads/SolutionsArchitectPracticeExam/SAA-C03_Exam/SAA-C03_Complete_Exam_Suite/Enhanced_HTML_Quizzes"
    
    shortcuts_css = """
        /* Keyboard Shortcuts Help */
        .shortcuts-help {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: var(--primary-color);
            color: white;
            padding: 10px 15px;
            border-radius: 8px;
            font-size: 0.8em;
            opacity: 0.8;
            z-index: 1000;
        }
        
        .shortcuts-help:hover {
            opacity: 1;
        }
    """
    
    shortcuts_js = """
        // Keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            switch(e.key) {
                case 'ArrowLeft':
                case 'ArrowUp':
                    e.preventDefault();
                    if (typeof previousQuestion === 'function') previousQuestion();
                    break;
                case 'ArrowRight':
                case 'ArrowDown':
                    e.preventDefault();
                    if (typeof nextQuestion === 'function') nextQuestion();
                    break;
                case '1':
                case '2':
                case '3':
                case '4':
                case '5':
                    e.preventDefault();
                    selectAnswer(parseInt(e.key) - 1);
                    break;
                case 's':
                case 'S':
                    e.preventDefault();
                    if (typeof submitExam === 'function') submitExam();
                    break;
                case 'b':
                case 'B':
                    e.preventDefault();
                    toggleBookmark(currentQuestion);
                    break;
            }
        });
        
        function selectAnswer(index) {
            const options = document.querySelectorAll('.answer-option input[type="radio"]');
            if (options[index]) {
                options[index].click();
            }
        }
    """
    
    shortcuts_html = """
        <div class="shortcuts-help">
            <strong>Shortcuts:</strong><br>
            ← → Navigate<br>
            1-5 Select Answer<br>
            B Bookmark<br>
            S Submit
        </div>
    """
    
    for filename in os.listdir(html_dir):
        if filename.endswith('.html'):
            filepath = os.path.join(html_dir, filename)
            
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Add CSS
            if '</style>' in content and shortcuts_css not in content:
                content = content.replace('</style>', shortcuts_css + '\n        </style>')
            
            # Add JS
            if '</script>' in content and shortcuts_js not in content:
                content = content.replace('</script>', shortcuts_js + '\n        </script>')
            
            # Add help panel
            if '</body>' in content and shortcuts_html not in content:
                content = content.replace('</body>', shortcuts_html + '\n    </body>')
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            
            print(f"✅ Added shortcuts: {filename}")

if __name__ == "__main__":
    add_keyboard_shortcuts()
    print("⌨️ Keyboard shortcuts added!")
