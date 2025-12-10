import type { TableRow, TableData } from '../types';
import { formatValue } from './formatters';

/**
 * Export table data to CSV
 */
export const exportToCSV = (processedData: TableRow[], tableData: TableData | null): void => {
    if (!processedData || processedData.length === 0 || !tableData) return;

    const headers = [
        'Rank',
        'Score',
        ...tableData.variableNames,
        ...tableData.objectives,
        ...tableData.constraints,
    ];

    const rows = processedData.map(row => [
        row.rank,
        row.score,
        ...tableData.variableNames.map(v => formatValue(row.variables[v])),
        ...tableData.objectives.map(o => formatValue(row.objectives[o])),
        ...tableData.constraints.map(c => formatValue(row.objectives[c])),
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `optimization_results_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
};

