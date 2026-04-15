// Search and filter functionality
class ExamSearch {
    constructor() {
        this.examCards = [];
        this.currentFilter = 'all';
        this.init();
    }

    init() {
        // Get all exam cards
        this.examCards = Array.from(document.querySelectorAll('#exam-grid > div'));
        
        // Add search functionality
        const searchInput = document.getElementById('exam-search');
        searchInput?.addEventListener('input', (e) => {
            this.searchExams(e.target.value);
        });

        // Add filter functionality
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.filter);
                this.updateFilterButtons(e.target);
            });
        });

        // Set initial active filter
        document.querySelector('[data-filter="all"]')?.classList.add('bg-aws-orange', 'text-white');
    }

    searchExams(query) {
        const searchTerm = query.toLowerCase().trim();
        
        this.examCards.forEach(card => {
            const examTitle = card.querySelector('h3')?.textContent.toLowerCase() || '';
            const examId = card.querySelector('.bg-aws-orange')?.textContent || '';
            
            const matches = examTitle.includes(searchTerm) || 
                          examId.includes(searchTerm) ||
                          searchTerm === '';
            
            if (matches && this.passesFilter(card)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    setFilter(filter) {
        this.currentFilter = filter;
        this.applyFilter();
    }

    applyFilter() {
        this.examCards.forEach(card => {
            if (this.passesFilter(card)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });

        // Re-apply search if there's a search term
        const searchTerm = document.getElementById('exam-search')?.value;
        if (searchTerm) {
            this.searchExams(searchTerm);
        }
    }

    passesFilter(card) {
        if (this.currentFilter === 'all') return true;
        
        const statusElement = card.querySelector('[id^="status-"]');
        const scoreElement = card.querySelector('[id^="score-"]');
        
        if (!statusElement || !scoreElement) return true;
        
        const hasGreenStatus = statusElement.classList.contains('bg-green-500');
        const hasRedStatus = statusElement.classList.contains('bg-red-500');
        const hasYellowStatus = statusElement.classList.contains('bg-yellow-500');
        const scoreText = scoreElement.textContent;
        
        switch (this.currentFilter) {
            case 'not-taken':
                return scoreText === 'Not taken';
            case 'completed':
                return hasGreenStatus || hasRedStatus;
            case 'passed':
                return hasGreenStatus;
            default:
                return true;
        }
    }

    updateFilterButtons(activeButton) {
        // Remove active state from all buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('bg-aws-orange', 'text-white');
            btn.classList.add('bg-gray-200', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-300');
        });
        
        // Add active state to clicked button
        activeButton.classList.add('bg-aws-orange', 'text-white');
        activeButton.classList.remove('bg-gray-200', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-300');
    }
}

// Initialize search functionality
document.addEventListener('DOMContentLoaded', () => {
    // Wait for progress to load first
    setTimeout(() => {
        new ExamSearch();
    }, 100);
});