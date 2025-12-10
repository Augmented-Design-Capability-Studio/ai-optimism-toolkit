import { useMemo } from 'react';
import type { TableRow, SortField, SortOrder } from '../types';

export function useTableSorting(
    rows: TableRow[],
    sortField: SortField,
    sortOrder: SortOrder,
    searchQuery: string
): TableRow[] {
    return useMemo(() => {
        let filtered = [...rows];

        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(row => {
                // Search in score
                if (row.score.toString().toLowerCase().includes(query)) {
                    return true;
                }
                // Search in variables
                if (Object.entries(row.variables).some(([key, value]) => 
                    key.toLowerCase().includes(query) || 
                    String(value).toLowerCase().includes(query)
                )) {
                    return true;
                }
                // Search in objectives
                if (Object.entries(row.objectives).some(([key, value]) => 
                    key.toLowerCase().includes(query) || 
                    String(value).toLowerCase().includes(query)
                )) {
                    return true;
                }
                return false;
            });
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let aVal: any;
            let bVal: any;

            if (sortField === 'rank') {
                aVal = a.rank;
                bVal = b.rank;
            } else if (sortField === 'score') {
                aVal = a.score;
                bVal = b.score;
            } else if (a.objectives[sortField] !== undefined) {
                aVal = a.objectives[sortField];
                bVal = b.objectives[sortField];
            } else if (a.variables[sortField] !== undefined) {
                aVal = a.variables[sortField];
                bVal = b.variables[sortField];
            } else {
                return 0;
            }

            // Handle numeric comparison
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
            }

            // Handle string comparison
            const aStr = String(aVal).toLowerCase();
            const bStr = String(bVal).toLowerCase();
            if (sortOrder === 'asc') {
                return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
            } else {
                return aStr > bStr ? -1 : aStr < bStr ? 1 : 0;
            }
        });

        return filtered;
    }, [rows, sortField, sortOrder, searchQuery]);
}

