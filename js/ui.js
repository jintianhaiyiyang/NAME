const STATUS_CLASS_MAP = {
    present: 'status-present',
    late: 'status-late',
    absent: 'status-absent',
    leave: 'status-leave',
    pending: 'status-pending'
};

const THEME_LABELS = {
    light: 'Light',
    dark: 'Dark',
    chalkboard: 'Chalkboard'
};

/**
 * 根据学生数据渲染学生列表。
 * @param {Array<object>} students
 * @param {Set<string>} selectedStudents
 */
export function renderStudentList(students = [], selectedStudents = new Set()) {
    const tbody = document.getElementById('student-list-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!students.length) {
        const emptyRow = document.createElement('tr');
        const emptyCell = document.createElement('td');
        emptyCell.colSpan = 6;
        emptyCell.textContent = '暂无学生数据，请先导入名单。';
        emptyCell.style.textAlign = 'center';
        emptyCell.style.color = 'var(--muted-text)';
        emptyRow.appendChild(emptyCell);
        tbody.appendChild(emptyRow);
        return;
    }

    const fragment = document.createDocumentFragment();

    students.forEach(student => {
        const tr = document.createElement('tr');
        tr.dataset.id = student.id;
        if (student.drawn) {
            tr.classList.add('drawn');
        }

        // 选择框
        const selectCell = document.createElement('td');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'student-select-checkbox';
        checkbox.checked = selectedStudents.has(student.id);
        selectCell.appendChild(checkbox);
        tr.appendChild(selectCell);

        // 姓名
        const nameCell = document.createElement('td');
        nameCell.textContent = student.name || '';
        tr.appendChild(nameCell);

        // 分组/班级
        const groupCell = document.createElement('td');
        groupCell.textContent = student.group || '';
        tr.appendChild(groupCell);

        // 权重
        const weightCell = document.createElement('td');
        const weightInput = document.createElement('input');
        weightInput.type = 'number';
        weightInput.min = '0';
        weightInput.step = '0.1';
        weightInput.value = (typeof student.weight === 'number' ? student.weight : 1);
        weightInput.className = 'weight-input';
        weightCell.appendChild(weightInput);
        tr.appendChild(weightCell);

        // 状态
        const statusCell = document.createElement('td');
        const status = student.status || 'pending';
        const badge = document.createElement('span');
        badge.className = `status-badge ${STATUS_CLASS_MAP[status] || STATUS_CLASS_MAP.pending}`;
        const statusTextMap = {
            present: '出勤',
            late: '迟到',
            absent: '缺勤',
            leave: '请假',
            pending: '未点'
        };
        badge.textContent = statusTextMap[status] || statusTextMap.pending;
        statusCell.appendChild(badge);
        tr.appendChild(statusCell);

        // 备注
        const notesCell = document.createElement('td');
        const notesInput = document.createElement('input');
        notesInput.type = 'text';
        notesInput.value = student.notes || '';
        notesInput.placeholder = '备注...';
        notesInput.className = 'notes-input';
        notesCell.appendChild(notesInput);
        tr.appendChild(notesCell);

        fragment.appendChild(tr);
    });

    tbody.appendChild(fragment);
}

/**
 * 渲染抽取结果。
 * @param {Array<object>} drawnStudents
 */
export function renderResult(drawnStudents = []) {
    const container = document.getElementById('result-display');
    if (!container) return;

    container.innerHTML = '';

    if (!drawnStudents.length) {
        const placeholder = document.createElement('div');
        placeholder.className = 'placeholder';
        placeholder.textContent = '请开始点名...';
        container.appendChild(placeholder);
        return;
    }

    const fragment = document.createDocumentFragment();

    drawnStudents.forEach(student => {
        const card = document.createElement('div');
        card.className = 'student-card';
        card.textContent = student.name || '';

        if (student.group) {
            const groupEl = document.createElement('div');
            groupEl.className = 'student-group';
            groupEl.textContent = student.group;
            card.appendChild(groupEl);
        }

        fragment.appendChild(card);
    });

    container.appendChild(fragment);
}

/**
 * 更新底部状态栏。
 * @param {object} state
 * @param {Array<object>} filteredStudents
 */
export function updateStatusBar(state, filteredStudents = []) {
    const totalEl = document.getElementById('total-students');
    const filteredEl = document.getElementById('filtered-students');
    const drawnEl = document.getElementById('drawn-students');
    const themeEl = document.getElementById('current-theme');

    if (totalEl) {
        totalEl.textContent = `总人数: ${state.students.length}`;
    }
    if (filteredEl) {
        filteredEl.textContent = `筛选后: ${filteredStudents.length}`;
    }
    if (drawnEl) {
        const drawnCount = state.students.filter(s => s.drawn).length;
        drawnEl.textContent = `已抽: ${drawnCount} / ${state.students.length}`;
    }
    if (themeEl) {
        const label = THEME_LABELS[state.settings.theme] || state.settings.theme;
        themeEl.textContent = `当前主题: ${label}`;
    }
}

/**
 * 应用主题。
 * @param {string} theme
 */
export function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
}

/**
 * 根据现有学生更新分组下拉框。
 * @param {Array<object>} students
 * @param {string} currentGroup
 */
export function updateGroupFilter(students = [], currentGroup = 'all') {
    const select = document.getElementById('group-filter-select');
    if (!select) return;

    const groups = Array.from(new Set(students.map(s => s.group).filter(Boolean))).sort();
    select.innerHTML = '';

    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = '所有学生';
    select.appendChild(allOption);

    groups.forEach(group => {
        const option = document.createElement('option');
        option.value = group;
        option.textContent = group;
        select.appendChild(option);
    });

    if (currentGroup !== 'all' && !groups.includes(currentGroup)) {
        currentGroup = 'all';
    }
    select.value = currentGroup;
}

/** 显示导入弹窗 */
export function showImportModal() {
    const modal = document.getElementById('import-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

/** 隐藏导入弹窗 */
export function hideImportModal() {
    const modal = document.getElementById('import-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}
