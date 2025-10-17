/**
 * 将学生数据导出为 .xlsx 文件。
 * @param {Array<object>} students - 要导出的学生数据。
 */
export function exportData(students) {
    if (!students || students.length === 0) {
        alert("没有数据可以导出。");
        return;
    }

    try {
        // 准备导出数据，选择需要的字段并重命名表头
        const dataToExport = students.map(s => ({
            '学号/ID': s.id,
            '姓名': s.name,
            '分组/班级': s.group || '',
            '状态': formatStatusForExport(s.status),
            '权重': s.weight,
            '备注': s.notes || ''
        }));

        // 创建工作表
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        
        // 创建工作簿
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "点名记录");
        
        // 生成文件名
        const date = new Date();
        const filename = `点名记录_${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}.xlsx`;

        // 触发下载
        XLSX.writeFile(workbook, filename);
    } catch (error) {
        console.error("导出失败:", error);
        alert("导出数据失败，请重试。");
    }
}

/**
 * 格式化状态文本用于导出。
 * @param {string} status - 内部状态值。
 * @returns {string} - 用于导出的中文状态文本。
 */
function formatStatusForExport(status) {
    const statusMap = {
        present: '出勤',
        late: '迟到',
        absent: '缺勤',
        leave: '请假',
        pending: '未点'
    };
    return statusMap[status] || '未知';
}
