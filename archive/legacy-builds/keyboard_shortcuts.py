#!/usr/bin/env python3

import os

def add_keyboard_shortcuts(filepath):
    """Add minimal keyboard shortcuts without breaking existing functionality"""
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Keyboard shortcuts CSS (for hint display)
    keyboard_css = '''
        /* Keyboard Shortcuts Hint */
        .keyboard-hint {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0,0,0,0.7);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 0.75em;
            opacity: 0.6;
            pointer-events: none;
            z-index: 1000;
        }
    '''
    
    # Add CSS
    content = content.replace('</style>', keyboard_css + '\n    </style>')
    
    # Add keyboard hint HTML
    hint_html = '''
    <div class="keyboard-hint">
        Enter: Next • ← →: Navigate
    </div>
    '''
    
    # Insert before closing body
    content = content.replace('</body>', hint_html + '\n</body>')
    
    # Minimal keyboard shortcuts JavaScript
    keyboard_js = '''
        // Minimal Keyboard Shortcuts
        function setupKeyboardShortcuts() {
            document.addEventListener('keydown', function(e) {
                // Skip if typing in input fields
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                    return;
                }
                
                switch(e.key) {
                    case 'Enter':
                        e.preventDefault();
                        nextQuestion();
                        break;
                    case 'ArrowLeft':
                        e.preventDefault();
                        previousQuestion();
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        nextQuestion();
                        break;
                }
            });
        }
        
        // Initialize keyboard shortcuts
        function initKeyboard() {
            setupKeyboardShortcuts();
        }
    '''
    
    # Add keyboard JS after navigation JS
    content = content.replace('// Initialize navigation', keyboard_js + '\n        // Initialize navigation')
    
    # Update initialization to include keyboard
    content = content.replace('setTimeout(initNavigation, 200);', 'setTimeout(initNavigation, 200);\n                setTimeout(initKeyboard, 250);')
    
    return content

def main():
    exam_dir = "SAA-C03_Complete_Exam_Suite/Associate_Exams"
    
    enhanced_count = 0
    
    for filename in os.listdir(exam_dir):
        if filename.endswith('.html'):
            filepath = os.path.join(exam_dir, filename)
            
            try:
                enhanced_content = add_keyboard_shortcuts(filepath)
                
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(enhanced_content)
                
                print(f"✅ Added keyboard shortcuts: {filename}")
                enhanced_count += 1
                
            except Exception as e:
                print(f"❌ Error enhancing {filename}: {e}")
    
    print(f"\n🎉 Added keyboard shortcuts to {enhanced_count} exams!")
    print("Added: Enter for next, Arrow keys for navigation, subtle hint display")
    print("✅ Safe - Minimal JS, doesn't interfere with existing functionality")

if __name__ == "__main__":
    main()
