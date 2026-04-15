// Mobile optimization and exam preview functionality
class MobileManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupMobileMenu();
        this.setupExamPreview();
        this.optimizeForMobile();
    }

    setupMobileMenu() {
        const menuBtn = document.getElementById('mobile-menu-btn');
        const menu = document.getElementById('mobile-menu');
        
        menuBtn?.addEventListener('click', () => {
            menu.classList.toggle('hidden');
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!menuBtn?.contains(e.target) && !menu?.contains(e.target)) {
                menu?.classList.add('hidden');
            }
        });
    }

    setupExamPreview() {
        // Make showExamPreview globally available
        window.showExamPreview = (examId) => {
            this.showExamPreview(examId);
        };
    }

    showExamPreview(examId) {
        alert(`Preview for Exam ${examId} - Feature working! Modal will show sample questions, exam stats, and difficulty level.`);
    }

    optimizeForMobile() {
        // Add touch-friendly interactions
        if ('ontouchstart' in window) {
            document.body.classList.add('touch-device');
            
            // Add custom CSS for touch devices
            const style = document.createElement('style');
            style.textContent = `
                .touch-device button,
                .touch-device a {
                    min-height: 44px;
                }
                .touch-device .filter-btn {
                    padding: 12px 16px;
                }
                @media (max-width: 768px) {
                    .grid {
                        grid-template-columns: 1fr !important;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        // Optimize search for mobile
        const searchInput = document.getElementById('exam-search');
        if (searchInput) {
            searchInput.setAttribute('autocomplete', 'off');
            searchInput.setAttribute('autocorrect', 'off');
            searchInput.setAttribute('spellcheck', 'false');
        }
    }
}

// Initialize mobile manager
document.addEventListener('DOMContentLoaded', () => {
    new MobileManager();
});