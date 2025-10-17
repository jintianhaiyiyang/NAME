const STORAGE_KEY = 'teacherRollCallState';

/**
 * 将应用状态保存到 localStorage。
 * @param {object} state - 当前应用状态对象。
 */
export function saveState(state) {
    try {
        // 将 Set 转换为数组以便序列化
        const serializableState = {
            ...state,
            selectedStudents: Array.from(state.selectedStudents || [])
        };
        const stateString = JSON.stringify(serializableState);
        localStorage.setItem(STORAGE_KEY, stateString);
    } catch (e) {
        console.error("保存状态失败:", e);
        alert("无法保存您的设置，可能是因为浏览器禁用了本地存储或存储已满。");
    }
}

/**
 * 从 localStorage 加载应用状态。
 * @returns {object|null} - 解析后的状态对象，或在失败时返回 null。
 */
export function loadState() {
    try {
        const stateString = localStorage.getItem(STORAGE_KEY);
        if (stateString === null) {
            return null; // 没有找到状态
        }
        const loadedState = JSON.parse(stateString);
        // 将数组转换回 Set
        if (loadedState.selectedStudents) {
            loadedState.selectedStudents = new Set(loadedState.selectedStudents);
        }
        return loadedState;
    } catch (e) {
        console.error("加载状态失败:", e);
        return null;
    }
}

/**
 * 从 localStorage 清除应用状态。
 */
export function clearState() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
        console.error("清除状态失败:", e);
    }
}
