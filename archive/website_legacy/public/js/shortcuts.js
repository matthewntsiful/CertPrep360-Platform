// Keyboard shortcuts and dashboard functionality
class ShortcutsManager {
    constructor() {
        this.init();
        this.updateDashboard();
    }

    init() {
        document.addEventListener('keydown', (e) => {
            // Only trigger if not typing in input fields
            if (e.target.tagName === 'INPUT') return;

            switch(e.key.toLowerCase()) {
                case '?':
                    this.showShortcutsModal();
                    break;
                case '/':
                    e.preventDefault();
                    document.getElementById('exam-search')?.focus();
                    break;
                case '1':
                case '2':
                case '3':
                case '4':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.triggerFilter(parseInt(e.key) - 1);
                    }
                    break;
                case 'd':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.toggleDarkMode();
                    }
                    break;
                case 'escape':
                    this.closeModal();
                    break;
            }
        });
    }

    showShortcutsModal() {
        const modal = document.createElement('div');
        modal.id = 'shortcuts-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4">
                <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-4">Keyboard Shortcuts</h3>
                <div class="space-y-2 text-sm">
                    <div class="flex justify-between">
                        <span class="text-gray-600 dark:text-gray-400">Search exams</span>
                        <kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">/</kbd>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600 dark:text-gray-400">Toggle dark mode</span>
                        <kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">Ctrl+D</kbd>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600 dark:text-gray-400">Filter: All</span>
                        <kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">Ctrl+1</kbd>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600 dark:text-gray-400">Filter: Not Taken</span>
                        <kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">Ctrl+2</kbd>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600 dark:text-gray-400">Filter: Completed</span>
                        <kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">Ctrl+3</kbd>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600 dark:text-gray-400">Filter: Passed</span>
                        <kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">Ctrl+4</kbd>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600 dark:text-gray-400">Close modal</span>
                        <kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">Esc</kbd>
                    </div>
                </div>
                <button onclick="document.getElementById('shortcuts-modal').remove()" 
                        class="mt-4 w-full bg-aws-orange hover:bg-orange-600 text-white py-2 rounded-lg transition-colors">
                    Close
                </button>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    closeModal() {
        document.getElementById('shortcuts-modal')?.remove();
    }

    triggerFilter(index) {
        const filters = ['all', 'not-taken', 'completed', 'passed'];
        const filterBtn = document.querySelector(`[data-filter="${filters[index]}"]`);
        filterBtn?.click();
    }

    toggleDarkMode() {
        document.getElementById('theme-toggle')?.click();
    }

    updateDashboard() {
        // Wait for progress data to load
        setTimeout(() => {
            const progress = JSON.parse(localStorage.getItem('examProgress') || '{}');
            const stats = this.calculateStats(progress);
            
            document.getElementById('total-completed').textContent = stats.completed;
            document.getElementById('total-passed').textContent = stats.passed;
            document.getElementById('avg-score').textContent = stats.avgScore + '%';
            document.getElementById('study-streak').textContent = stats.streak;
        }, 200);
    }

    calculateStats(progress) {
        const completed = Object.values(progress).filter(p => p.completed).length;
        const passed = Object.values(progress).filter(p => p.completed && p.score >= 70).length;
        const avgScore = completed > 0 ? 
            Math.round(Object.values(progress)
                .filter(p => p.completed)
                .reduce((sum, p) => sum + p.score, 0) / completed) : 0;
        
        // Calculate streak (simplified - days with activity)
        const streak = this.calculateStreak(progress);
        
        return { completed, passed, avgScore, streak };
    }

    calculateStreak(progress) {
        const dates = Object.values(progress)
            .filter(p => p.lastTaken)
            .map(p => new Date(p.lastTaken).toDateString())
            .filter((date, index, arr) => arr.indexOf(date) === index)
            .sort((a, b) => new Date(b) - new Date(a));
        
        if (dates.length === 0) return 0;
        
        let streak = 1;
        const today = new Date().toDateString();
        
        if (dates[0] !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            if (dates[0] !== yesterday.toDateString()) return 0;
        }
        
        for (let i = 1; i < dates.length; i++) {
            const current = new Date(dates[i-1]);
            const previous = new Date(dates[i]);
            const diffDays = (current - previous) / (1000 * 60 * 60 * 24);
            
            if (diffDays === 1) {
                streak++;
            } else {
                break;
            }
        }
        
        return streak;
    }
}

// Initialize shortcuts and dashboard
document.addEventListener('DOMContentLoaded', () => {
    new ShortcutsManager();
});