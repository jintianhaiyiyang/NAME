/**
 * 从学生池中抽取指定数量的学生。
 * @param {Array<object>} pool - 可供抽取的学生数组。
 * @param {number} count - 要抽取的学生数量。
 * @param {object} options - 抽取选项。
 * @param {boolean} options.withReplacement - 是否允许重复抽取。
 * @param {boolean} options.useWeights - 是否使用加权随机。
 * @returns {Array<object>} - 抽中的学生数组。
 */
export function drawStudents(pool, count, { withReplacement, useWeights }) {
    if (pool.length === 0) return [];
    
    const numToDraw = Math.min(count, pool.length);
    let drawn = [];

    if (useWeights && pool.some(s => s.weight !== 1)) {
        // 使用加权随机算法
        let tempPool = [...pool];
        for (let i = 0; i < numToDraw; i++) {
            const student = weightedRandom(tempPool);
            if (!student) break; // 如果所有剩余学生的权重都是0
            drawn.push(student);
            if (!withReplacement) {
                tempPool = tempPool.filter(s => s.id !== student.id);
                 if (tempPool.length === 0) break;
            }
        }
    } else {
        // 使用标准随机算法
        let tempPool = [...pool];
        for (let i = 0; i < numToDraw; i++) {
            const randomIndex = Math.floor(Math.random() * tempPool.length);
            const student = tempPool[randomIndex];
            drawn.push(student);
            if (!withReplacement) {
                tempPool.splice(randomIndex, 1);
                 if (tempPool.length === 0) break;
            }
        }
    }

    return drawn;
}

/**
 * 执行一次加权随机选择。
 * @param {Array<object>} items - 带有 `weight` 属性的对象数组。
 * @returns {object|null} - 选中的对象，如果所有权重都为0则返回 null。
 */
function weightedRandom(items) {
    const totalWeight = items.reduce((sum, item) => sum + (item.weight || 0), 0);
    if (totalWeight <= 0) {
        // 如果所有权重都是0，随机返回一个以避免死循环
        return items.length > 0 ? items[Math.floor(Math.random() * items.length)] : null;
    }

    let random = Math.random() * totalWeight;

    for (const item of items) {
        random -= (item.weight || 0);
        if (random <= 0) {
            return item;
        }
    }
    
    // 作为备用，理论上不应到达这里
    return items[items.length - 1];
}
