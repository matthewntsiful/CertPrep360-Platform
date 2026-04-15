// Auto-save and recent exams functionality
class AutoSaveManager {
    constructor() {
        this.init();
        this.showRecentExams();
    }

    init() {
        // Auto-save exam state every 30 seconds
        setInterval(() => {
            this.autoSave();
        }, 30000);

        // Save on page unload
        window.addEventListener('beforeunload', () => {
            this.autoSave();
        });

        // Track exam starts
        this.trackExamStarts();
    }

    trackExamStarts() {
        document.querySelectorAll('a[href*="/exams/"]').forEach(link => {
            link.addEventListener('click', (e) => {
                const examId = this.getExamIdFromElement(e.target);
                if (examId) {
                    this.recordExamStart(examId);
                }
            });
        });
    }

    getExamIdFromElement(element) {
        const card = element.closest('[id*="exam-btn-"]');
        if (card) {
            return card.id.replace('exam-btn-', '');
        }
        return null;
    }

    recordExamStart(examId) {
        const recentExams = JSON.parse(localStorage.getItem('recentExams') || '[]');
        const examData = {
            id: examId,
            title: `Exam ${examId}`,
            startTime: new Date().toISOString(),
            lastAccessed: new Date().toISOString()
        };

        // Remove if already exists
        const filtered = recentExams.filter(exam => exam.id !== examId);
        
        // Add to beginning
        filtered.unshift(examData);
        
        // Keep only last 3
        const limited = filtered.slice(0, 3);
        
        localStorage.setItem('recentExams', JSON.stringify(limited));
        this.showRecentExams();
    }

    showRecentExams() {
        const recentExams = JSON.parse(localStorage.getItem('recentExams') || '[]');
        const section = document.getElementById('recent-exams-section');
        const list = document.getElementById('recent-exams-list');
        
        if (recentExams.length === 0) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';
        list.innerHTML = recentExams.map(exam => `
            <div class="bg-white dark:bg-gray-800 rounded-lg p-4 border dark:border-gray-700 hover:shadow-md transition-shadow">
                <div class="flex items-center justify-between mb-2">
                    <h3 class="font-semibold text-gray-900 dark:text-white">${exam.title}</h3>
                    <span class="text-xs text-gray-500 dark:text-gray-400">${this.formatTime(exam.lastAccessed)}</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-600 dark:text-gray-300">In Progress</span>
                    <a href="/exams/SAA-C03_Professional_Exam_${exam.id.padStart(2, '0')}_20251110_211434.html" 
                       class="text-aws-orange hover:text-orange-600 text-sm font-medium">Continue →</a>
                </div>
            </div>
        `).join('');
    }

    formatTime(isoString) {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    }

    autoSave() {
        // Simulate auto-save of current exam state
        const currentExam = this.getCurrentExam();
        if (currentExam) {
            const saveData = {
                examId: currentExam,
                timestamp: new Date().toISOString(),
                progress: this.getExamProgress(currentExam)
            };
            
            localStorage.setItem(`autosave_${currentExam}`, JSON.stringify(saveData));
            this.showSaveIndicator();
        }
    }

    getCurrentExam() {
        // Check if we're on an exam page
        const url = window.location.href;
        const examMatch = url.match(/exam_(\d+)/);
        return examMatch ? examMatch[1] : null;
    }

    getExamProgress(examId) {
        // Simulate getting current exam progress
        return {
            currentQuestion: Math.floor(Math.random() * 65) + 1,
            answers: {},
            timeRemaining: Math.floor(Math.random() * 7800) + 1800 // 30min - 2h10min
        };
    }

    showSaveIndicator() {
        // Show temporary save indicator
        const indicator = document.createElement('div');
        indicator.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity';
        indicator.textContent = '✓ Auto-saved';
        
        document.body.appendChild(indicator);
        
        setTimeout(() => {
            indicator.style.opacity = '0';
            setTimeout(() => indicator.remove(), 300);
        }, 2000);
    }

    loadAutoSave(examId) {
        const saveData = localStorage.getItem(`autosave_${examId}`);
        return saveData ? JSON.parse(saveData) : null;
    }
}

// Initialize auto-save manager
document.addEventListener('DOMContentLoaded', () => {
    new AutoSaveManager();
});