#!/usr/bin/env python3
import os
import re

def add_bookmarking():
    html_dir = "/Users/Matthieu/Downloads/SolutionsArchitectPracticeExam/SAA-C03_Exam/SAA-C03_Complete_Exam_Suite/Enhanced_HTML_Quizzes"
    
    bookmark_css = """
        /* Bookmark Button */
        .bookmark-btn {
            position: absolute;
            top: 15px;
            right: 15px;
            background: none;
            border: none;
            font-size: 1.5em;
            cursor: pointer;
            color: #ccc;
            transition: all 0.3s ease;
        }
        
        .bookmark-btn:hover {
            color: var(--warning-color);
            transform: scale(1.2);
        }
        
        .bookmark-btn.bookmarked {
            color: var(--warning-color);
        }
        
        .bookmarked-questions {
            background: rgba(255, 193, 7, 0.1);
            border-left-color: var(--warning-color);
        }
    """
    
    bookmark_js = """
        // Bookmark functionality
        let bookmarkedQuestions = JSON.parse(localStorage.getItem('bookmarkedQuestions') || '[]');
        
        function toggleBookmark(questionIndex) {
            const index = bookmarkedQuestions.indexOf(questionIndex);
            if (index > -1) {
                bookmarkedQuestions.splice(index, 1);
            } else {
                bookmarkedQuestions.push(questionIndex);
            }
            localStorage.setItem('bookmarkedQuestions', JSON.stringify(bookmarkedQuestions));
            updateBookmarkDisplay();
        }
        
        function updateBookmarkDisplay() {
            bookmarkedQuestions.forEach(index => {
                const btn = document.querySelector(`[onclick="toggleBookmark(${index})"]`);
                const question = document.getElementById(`question-${index}`);
                if (btn) btn.classList.add('bookmarked');
                if (question) question.classList.add('bookmarked-questions');
            });
        }
        
        // Initialize bookmarks on load
        document.addEventListener('DOMContentLoaded', updateBookmarkDisplay);
    """
    
    for filename in os.listdir(html_dir):
        if filename.endswith('.html'):
            filepath = os.path.join(html_dir, filename)
            
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Add CSS
            if '</style>' in content and bookmark_css not in content:
                content = content.replace('</style>', bookmark_css + '\n        </style>')
            
            # Add JS
            if '</script>' in content and bookmark_js not in content:
                content = content.replace('</script>', bookmark_js + '\n        </script>')
            
            # Add bookmark buttons to questions
            content = re.sub(
                r'(<div class="question-content"[^>]*>)',
                r'\1<button class="bookmark-btn" onclick="toggleBookmark(currentQuestion)" title="Bookmark this question">⭐</button>',
                content
            )
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            
            print(f"✅ Added bookmarking: {filename}")

if __name__ == "__main__":
    add_bookmarking()
    print("⭐ Bookmarking feature added!")
