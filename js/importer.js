/**
 * 解析上传的 .xlsx 或 .csv 文件。
 * @param {File} file - 用户选择的文件。
 * @returns {Promise<Array<object>>} - 返回一个包含学生对象的 Promise。
 */
export function parseFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);

                if (json.length === 0) {
                    throw new Error("文件为空或格式不正确。");
                }

                const students = json.map((row, index) => normalizeStudentData(row, index));
                resolve(students);

            } catch (error) {
                console.error("文件解析错误:", error);
                reject(new Error("文件解析失败，请确保文件是有效的 .xlsx 或 .csv 格式。"));
            }
        };

        reader.onerror = (e) => {
            reject(new Error("文件读取失败。"));
        };

        reader.readAsArrayBuffer(file);
    });
}

/**
 * 规范化单行学生数据。
 * @param {object} row - 从文件中读取的原始行对象。
 * @param {number} index - 行索引，用于生成备用 ID。
 * @returns {object} - 规范化后的学生对象。
 */
function normalizeStudentData(row, index) {
    // 兼容多种表头名称
    const name = row['Name'] || row['姓名'] || row['name'];
    const group = row['Group'] || row['班级'] || row['分组'] || row['group'];
    let weight = row['Weight'] || row['权重'] || row['weight'];
    let id = row['ID'] || row['学号'] || row['id'];

    if (!name) {
        throw new Error(`第 ${index + 2} 行缺少 "姓名(Name)" 列。`);
    }

    // 如果没有提供 ID，则生成一个伪唯一 ID
    if (!id) {
        id = generateUUID();
    }

    // 如果权重无效或未提供，默认为 1
    weight = parseFloat(weight);
    if (isNaN(weight) || weight < 0) {
        weight = 1;
    }

    return {
        id: String(id),
        name: String(name),
        group: group ? String(group) : null,
        weight: weight,
        status: 'pending', // 'pending', 'present', 'late', 'absent', 'leave'
        drawn: false,
        notes: ''
    };
}

/**
 * 生成一个简单的 UUID。
 * @returns {string} - A v4-like UUID string.
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
