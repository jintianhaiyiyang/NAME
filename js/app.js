import { loadState, saveState, clearState } from './storage.js';
import { renderStudentList, renderResult, updateStatusBar, applyTheme, updateGroupFilter, showImportModal, hideImportModal } from './ui.js';
import { parseFile } from './importer.js';
import { drawStudents } from './randomizer.js';
import { exportData } from './exporter.js';

class App {
    constructor() {
        this.state = {
            students: [],
            history: [],
            settings: {
                theme: 'light',
                drawCount: 1,
                drawMode: 'no-repeat', // 'no-repeat' or 'repeat'
                useWeights: true,
                currentGroup: 'all'
            },
            filters: {
                search: '',
                status: 'all'
            },
             selectedStudents: new Set()
        };

        this.init();
    }

    init() {
        // 加载状态
        const loadedState = loadState();
        if (loadedState) {
            this.state = { ...this.state, ...loadedState };
             // Ensure selectedStudents is a Set
            if (this.state.selectedStudents && ! (this.state.selectedStudents instanceof Set)) {
                this.state.selectedStudents = new Set(this.state.selectedStudents);
            }
        }

        this.bindEventListeners();
        this.updateUI();

        // 注册 Service Worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(err => {
                console.error('Service Worker registration failed:', err);
            });
        }
    }
    // ...
    bindEventListeners() {
        // 文件导入
        document.getElementById('import-btn').addEventListener('click', () => document.getElementById('file-input').click());
        document.getElementById('file-input').addEventListener('change', (e) => this.handleFileImport(e));
        document.getElementById('import-merge').addEventListener('click', () => this.processImport('merge'));
        document.getElementById('import-overwrite').addEventListener('click', () => this.processImport('overwrite'));
        document.getElementById('import-cancel').addEventListener('click', () => hideImportModal());

        // 点名操作
        document.getElementById('draw-btn').addEventListener('click', () => this.handleDraw());
        document.getElementById('reset-draw-btn').addEventListener('click', () => this.resetDrawnState());

        // 设置变更
        document.getElementById('draw-count').addEventListener('change', e => this.updateSetting('drawCount', parseInt(e.target.value)));
        document.querySelectorAll('input[name="draw-mode"]').forEach(el => el.addEventListener('change', e => this.updateSetting('drawMode', e.target.value)));
        document.getElementById('weighted-random-toggle').addEventListener('change', e => this.updateSetting('useWeights', e.target.checked));
        document.getElementById('group-filter-select').addEventListener('change', e => this.updateSetting('currentGroup', e.target.value));

        // 筛选和搜索
        document.getElementById('search-input').addEventListener('input', e => this.updateFilter('search', e.target.value));
        document.getElementById('status-filter-select').addEventListener('change', e => this.updateFilter('status', e.target.value));
        
        // 主题切换
        document.getElementById('theme-toggle-btn').addEventListener('click', () => this.toggleTheme());

        // 导出
        document.getElementById('export-btn').addEventListener('click', () => exportData(this.getFilteredStudents()));
        
        // 投影模式
        document.getElementById('projection-mode-btn').addEventListener('click', () => document.body.classList.toggle('projection-mode'));
        
        // 列表内事件委托
        document.getElementById('student-list-body').addEventListener('change', e => this.handleListInteraction(e));
        document.getElementById('student-list-body').addEventListener('input', e => this.handleListInteraction(e));
        
        // 批量操作
        document.getElementById('select-all-checkbox').addEventListener('change', e => this.toggleSelectAll(e.target.checked));
        document.getElementById('bulk-action-apply').addEventListener('click', () => this.applyBulkAction());


        // 键盘快捷键
        window.addEventListener('keydown', e => this.handleShortcuts(e));
    }

    handleFileImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        this.pendingFile = file;
        if (this.state.students && this.state.students.length > 0) {
            showImportModal();
        } else {
            this.processImport('overwrite');
        }
        e.target.value = ''; // 重置 file input
    }
    
    async processImport(mode) {
        hideImportModal();
        if (!this.pendingFile) return;

        try {
            const newStudents = await parseFile(this.pendingFile);
            if (mode === 'overwrite') {
                this.state.students = newStudents;
            } else { // merge
                const studentMap = new Map(this.state.students.map(s => [s.id, s]));
                newStudents.forEach(ns => {
                    studentMap.set(ns.id, { ...(studentMap.get(ns.id) || {}), ...ns });
                });
                this.state.students = Array.from(studentMap.values());
            }
            this.resetDrawnState();
            this.updateUI();
        } catch (error) {
            alert(`导入失败: ${error.message}`);
        } finally {
            this.pendingFile = null;
        }
    }
    
    handleDraw() {
        const drawPool = this.getDrawPool();
        if (drawPool.length === 0) {
            alert('没有可抽取的学生！');
            return;
        }
        
        const count = this.state.settings.drawCount;
        const withReplacement = this.state.settings.drawMode === 'repeat';
        const useWeights = this.state.settings.useWeights;

        const drawn = drawStudents(drawPool, count, { withReplacement, useWeights });
        
        if (!withReplacement) {
            drawn.forEach(student => {
                const originalStudent = this.state.students.find(s => s.id === student.id);
                if (originalStudent) {
                    originalStudent.drawn = true;
                    if(!originalStudent.status || originalStudent.status === 'pending') {
                         originalStudent.status = 'present'; // 默认设为出勤
                    }
                }
            });
        }
        
        this.state.history.push(drawn.map(s => s.id));
        renderResult(drawn);
        this.updateUI(false); // only update status bar and list
    }

    getDrawPool() {
        let pool = this.getFilteredStudents(true); // Get base filtered students
        const { drawMode, currentGroup } = this.state.settings;

        if (currentGroup !== 'all') {
            pool = pool.filter(s => s.group === currentGroup);
        }
        if (drawMode === 'no-repeat') {
            pool = pool.filter(s => !s.drawn);
        }
        return pool;
    }

    getFilteredStudents(forDrawing = false) {
        const { search, status } = this.state.filters;
        const searchLower = search.toLowerCase();

        return this.state.students.filter(s => {
            const nameMatch = s.name.toLowerCase().includes(searchLower);
            const idMatch = s.id.toString().toLowerCase().includes(searchLower);
            
            // For display, status filter applies. For drawing, it does not.
            const statusMatch = forDrawing ? true : (status === 'all' || s.status === status);
            
            return (nameMatch || idMatch) && statusMatch;
        });
    }

    resetDrawnState() {
        this.state.students.forEach(s => s.drawn = false);
        this.state.history = [];
        this.updateUI();
    }
    
    updateSetting(key, value) {
        this.state.settings[key] = value;
        this.saveAndRerender();
    }

    updateFilter(key, value) {
        this.state.filters[key] = value;
        this.updateUI();
    }
    
    toggleTheme() {
        const themes = ['light', 'dark', 'chalkboard'];
        const currentThemeIndex = themes.indexOf(this.state.settings.theme);
        const nextTheme = themes[(currentThemeIndex + 1) % themes.length];
        this.state.settings.theme = nextTheme;
        this.updateUI();
    }

    handleListInteraction(e) {
        const target = e.target;
        const studentId = target.closest('tr').dataset.id;
        const student = this.state.students.find(s => s.id === studentId);
        if (!student) return;

        if(target.matches('.weight-input')) {
            student.weight = Math.max(0, parseFloat(target.value) || 0);
        } else if (target.matches('.notes-input')) {
            student.notes = target.value;
        } else if (target.matches('.status-badge')) {
            const statuses = ['pending', 'present', 'late', 'absent', 'leave'];
            const currentIndex = statuses.indexOf(student.status);
            student.status = statuses[(currentIndex + 1) % statuses.length];
        } else if (target.matches('.student-select-checkbox')) {
            if (target.checked) {
                this.state.selectedStudents.add(studentId);
            } else {
                this.state.selectedStudents.delete(studentId);
            }
        }
        this.saveAndRerender(true); // Partial rerender
    }
    
    toggleSelectAll(checked) {
        const filteredIds = this.getFilteredStudents().map(s => s.id);
        if (checked) {
            filteredIds.forEach(id => this.state.selectedStudents.add(id));
        } else {
            filteredIds.forEach(id => this.state.selectedStudents.delete(id));
        }
        this.updateUI();
    }

    applyBulkAction() {
        const action = document.getElementById('bulk-action-select').value;
        if (!action || this.state.selectedStudents.size === 0) return;

        this.state.students.forEach(student => {
            if (this.state.selectedStudents.has(student.id)) {
                student.status = action;
            }
        });
        
        this.state.selectedStudents.clear();
        this.saveAndRerender();
    }


    handleShortcuts(e) {
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT') return;

        switch(e.key) {
            case ' ':
                e.preventDefault();
                this.handleDraw();
                break;
            case 't':
            case 'T':
                this.toggleTheme();
                break;
        }

        if (e.ctrlKey) {
            switch(e.key) {
                case 'o':
                case 'O':
                    e.preventDefault();
                    document.getElementById('import-btn').click();
                    break;
                case 's':
                case 'S':
                    e.preventDefault();
                    document.getElementById('export-btn').click();
                    break;
            }
        }
    }

    saveAndRerender(isPartialUpdate = false) {
        saveState(this.state);
        if (!isPartialUpdate) {
             this.updateUI();
        } else {
            // For partial updates, only re-render the list and status bar
            const filteredStudents = this.getFilteredStudents();
            renderStudentList(filteredStudents, this.state.selectedStudents);
            updateStatusBar(this.state, filteredStudents);
            document.getElementById('save-status').textContent = '已保存';
            setTimeout(() => document.getElementById('save-status').textContent = '', 2000);
        }
    }

    updateUI(fullUpdate = true) {
        // Apply theme first
        applyTheme(this.state.settings.theme);

        // Update settings controls
        document.getElementById('draw-count').value = this.state.settings.drawCount;
        document.querySelector(`input[name="draw-mode"][value="${this.state.settings.drawMode}"]`).checked = true;
        document.getElementById('weighted-random-toggle').checked = this.state.settings.useWeights;
        
        const filteredStudents = this.getFilteredStudents();
        
        if(fullUpdate) {
            updateGroupFilter(this.state.students, this.state.settings.currentGroup);
        }
        
        renderStudentList(filteredStudents, this.state.selectedStudents);
        updateStatusBar(this.state, filteredStudents);
        
        saveState(this.state);
        document.getElementById('save-status').textContent = '已保存';
        setTimeout(() => document.getElementById('save-status').textContent = '', 2000);
    }
}

// Start the app
window.addEventListener('DOMContentLoaded', () => new App());
