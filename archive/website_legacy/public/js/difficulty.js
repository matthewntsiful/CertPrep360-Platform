// Difficulty indicators and completion status
class DifficultyManager {
    constructor() {
        this.difficulties = ['Easy', 'Medium', 'Hard', 'Expert'];
        this.init();
    }

    init() {
        this.addDifficultyBadges();
        this.updateCompletionIcons();
    }

    addDifficultyBadges() {
        document.querySelectorAll('[id^="exam-btn-"]').forEach(btn => {
            const examId = btn.id.replace('exam-btn-', '');
            const badge = document.querySelector(`.difficulty-badge-${examId}`);
            
            if (badge) {
                const difficulty = this.getDifficulty(parseInt(examId));
                badge.className = `difficulty-badge-${examId} px-2 py-0.5 text-xs font-medium rounded-full ${this.getDifficultyColor(difficulty)}`;
                badge.textContent = difficulty;
            }
        });
    }

    getDifficulty(examId) {
        // Assign difficulty based on exam number
        if (examId <= 4) return 'Easy';
        if (examId <= 8) return 'Medium';
        if (examId <= 12) return 'Hard';
        return 'Expert';
    }

    getDifficultyColor(difficulty) {
        switch(difficulty) {
            case 'Easy': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'Medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
            case 'Hard': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
            case 'Expert': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
        }
    }

    updateCompletionIcons() {
        const progress = JSON.parse(localStorage.getItem('examProgress') || '{}');
        
        Object.keys(progress).forEach(examId => {
            const data = progress[examId];
            const card = document.getElementById(`exam-btn-${examId}`)?.closest('.bg-white, .bg-gray-800');
            
            if (card) {
                this.addCompletionIcon(card, examId, data);
            }
        });
    }

    addCompletionIcon(card, examId, data) {
        const titleArea = card.querySelector('h3')?.parentElement;
        if (!titleArea || titleArea.querySelector('.completion-icon')) return;

        const icon = document.createElement('div');
        icon.className = 'completion-icon ml-2';
        
        if (data.completed) {
            if (data.score >= 70) {
                icon.innerHTML = `
                    <div class="flex items-center space-x-1 bg-green-100 dark:bg-green-900 px-2 py-1 rounded-full">
                        <svg class="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                        </svg>
                        <span class="text-xs font-medium text-green-600 dark:text-green-400">Passed</span>
                    </div>
                `;
            } else {
                icon.innerHTML = `
                    <div class="flex items-center space-x-1 bg-red-100 dark:bg-red-900 px-2 py-1 rounded-full">
                        <svg class="w-4 h-4 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
                        </svg>
                        <span class="text-xs font-medium text-red-600 dark:text-red-400">Failed</span>
                    </div>
                `;
            }
        } else {
            icon.innerHTML = `
                <div class="flex items-center space-x-1 bg-yellow-100 dark:bg-yellow-900 px-2 py-1 rounded-full">
                    <svg class="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                    </svg>
                    <span class="text-xs font-medium text-yellow-600 dark:text-yellow-400">In Progress</span>
                </div>
            `;
        }
        
        titleArea.appendChild(icon);
    }
}

// Initialize difficulty manager
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        new DifficultyManager();
    }, 300);
});