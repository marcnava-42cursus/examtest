const STORAGE_KEY = 'msv_trainer_v2';

class AppState {
    constructor() {
        this.lines = [];
        this.blocks = [];
        this.currentIdx = 0;
        this.completedLines = new Set();
        this.failedLines = {};
        this.solutionLines = {};
        this.hintLines = {};
        this.xpTotal = 0;
        this.xpToday = 0;
        this.streak = 0;
        this.bestStreak = 0;
        this.lastSessionDate = '';
        this.sessionLinesCompleted = 0;
        this.achievements = {};
        this.blockStars = {};
        this.consecutiveCorrect = 0;
        this.sessionNoHints = true;
        this.rawCode = '';
        this.exercisesGenerated = false;
        this.todayMissionDone = 0;
        this.excludedBlocks = new Set();
        this.examMode = 'practice';
        this.examRealPassed = new Set();
    }

    save() {
        const data = {
            rawCode: this.rawCode,
            currentIdx: this.currentIdx,
            completedLines: [...this.completedLines],
            failedLines: this.failedLines,
            solutionLines: this.solutionLines,
            hintLines: this.hintLines,
            xpTotal: this.xpTotal,
            xpToday: this.xpToday,
            streak: this.streak,
            bestStreak: this.bestStreak,
            lastSessionDate: this.lastSessionDate,
            achievements: this.achievements,
            blockStars: this.blockStars,
            exercisesGenerated: this.exercisesGenerated,
            todayMissionDone: this.todayMissionDone,
            excludedBlocks: [...this.excludedBlocks],
            examRealPassed: [...this.examRealPassed]
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return false;
            const d = JSON.parse(raw);
            if (!d.rawCode) return false;
            return d;
        } catch (e) {
            return false;
        }
    }

    applyLoaded(data) {
        this.rawCode = data.rawCode;
        this.currentIdx = data.currentIdx || 0;
        this.completedLines = new Set(data.completedLines || []);
        this.failedLines = data.failedLines || {};
        this.solutionLines = data.solutionLines || {};
        this.hintLines = data.hintLines || {};
        this.xpTotal = data.xpTotal || 0;
        this.xpToday = data.xpToday || 0;
        this.streak = data.streak || 0;
        this.bestStreak = data.bestStreak || 0;
        this.lastSessionDate = data.lastSessionDate || '';
        this.achievements = data.achievements || {};
        this.blockStars = data.blockStars || {};
        this.exercisesGenerated = data.exercisesGenerated || false;
        this.todayMissionDone = data.todayMissionDone || 0;
        this.excludedBlocks = new Set(data.excludedBlocks || []);
        this.examRealPassed = new Set(data.examRealPassed || []);
        this.checkStreak();
        this.save();
    }

    checkStreak() {
        const today = new Date().toISOString().slice(0, 10);
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        if (this.lastSessionDate === today) return;
        if (this.lastSessionDate && this.lastSessionDate !== today && this.lastSessionDate !== yesterday) {
            this.streak = 0;
        }
        this.xpToday = 0;
        this.todayMissionDone = 0;
    }

    markSessionActive() {
        const today = new Date().toISOString().slice(0, 10);
        if (this.lastSessionDate !== today) {
            this.streak++;
            if (this.streak > this.bestStreak) this.bestStreak = this.streak;
            this.lastSessionDate = today;
        }
        this.save();
    }

    notify() {
        if (!this._notifyPending) {
            this._notifyPending = true;
            queueMicrotask(() => {
                this._notifyPending = false;
                window.dispatchEvent(new CustomEvent('state-changed'));
            });
        }
    }
}

export const state = new AppState();
