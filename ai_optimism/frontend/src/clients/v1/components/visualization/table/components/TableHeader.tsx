import { TableHead, TableRow, TableCell, TableSortLabel } from '@mui/material';
import type { SortField, SortOrder, TableData } from '../types';

interface TableHeaderProps {
    tableData: TableData;
    sortField: SortField;
    sortOrder: SortOrder;
    onSort: (field: SortField) => void;
}

export function TableHeader({ tableData, sortField, sortOrder, onSort }: TableHeaderProps) {
    return (
        <TableHead>
            <TableRow>
                <TableCell>
                    <TableSortLabel
                        active={sortField === 'rank'}
                        direction={sortField === 'rank' ? sortOrder : 'asc'}
                        onClick={() => onSort('rank')}
                    >
                        Rank
                    </TableSortLabel>
                </TableCell>
                <TableCell>
                    <TableSortLabel
                        active={sortField === 'score'}
                        direction={sortField === 'score' ? sortOrder : 'asc'}
                        onClick={() => onSort('score')}
                    >
                        Score
                    </TableSortLabel>
                </TableCell>
                {/* Variable columns */}
                {tableData.variableNames.map(varName => (
                    <TableCell key={`var-${varName}`}>
                        <TableSortLabel
                            active={sortField === varName}
                            direction={sortField === varName ? sortOrder : 'asc'}
                            onClick={() => onSort(varName)}
                        >
                            {varName}
                        </TableSortLabel>
                    </TableCell>
                ))}
                {/* Objective columns */}
                {tableData.objectives.map(objName => (
                    <TableCell key={`obj-${objName}`}>
                        <TableSortLabel
                            active={sortField === objName}
                            direction={sortField === objName ? sortOrder : 'asc'}
                            onClick={() => onSort(objName)}
                        >
                            {objName}
                        </TableSortLabel>
                    </TableCell>
                ))}
                {/* Constraint columns */}
                {tableData.constraints.map(constraintName => (
                    <TableCell key={`const-${constraintName}`}>
                        <TableSortLabel
                            active={sortField === constraintName}
                            direction={sortField === constraintName ? sortOrder : 'asc'}
                            onClick={() => onSort(constraintName)}
                        >
                            {constraintName.replace('Violation: ', '').replace(/^Violation\(/, '').replace(/\)$/, '')}
                        </TableSortLabel>
                    </TableCell>
                ))}
            </TableRow>
        </TableHead>
    );
}

