import { TableRow as MuiTableRow, TableCell, Chip, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { formatValue, isConstraintSatisfied } from '../utils/formatters';
import type { TableRow as TableRowType, TableData } from '../types';

interface TableRowComponentProps {
    row: TableRowType;
    tableData: TableData;
}

export function TableRowComponent({ row, tableData }: TableRowComponentProps) {
    return (
        <MuiTableRow 
            sx={{
                '&:nth-of-type(odd)': { bgcolor: 'action.hover' },
                bgcolor: row.rank === 1 ? 'success.light' : 'inherit',
            }}
        >
            <TableCell>
                <Chip 
                    label={row.rank} 
                    size="small" 
                    color={row.rank === 1 ? 'primary' : 'default'}
                    variant={row.rank === 1 ? 'filled' : 'outlined'}
                />
            </TableCell>
            <TableCell>
                <Typography variant="body2" fontWeight={row.rank === 1 ? 'bold' : 'normal'}>
                    {formatValue(row.score)}
                </Typography>
            </TableCell>
            {/* Variable cells */}
            {tableData.variableNames.map(varName => (
                <TableCell key={`var-${varName}`}>
                    {formatValue(row.variables[varName])}
                </TableCell>
            ))}
            {/* Objective cells */}
            {tableData.objectives.map(objName => (
                <TableCell key={`obj-${objName}`}>
                    {formatValue(row.objectives[objName])}
                </TableCell>
            ))}
            {/* Constraint cells */}
            {tableData.constraints.map(constraintName => (
                <TableCell key={`const-${constraintName}`}>
                    {isConstraintSatisfied(row.objectives[constraintName] as number) ? (
                        <CheckCircleIcon sx={{ color: 'success.main', fontSize: 18 }} />
                    ) : (
                        <CancelIcon sx={{ color: 'error.main', fontSize: 18 }} />
                    )}
                </TableCell>
            ))}
        </MuiTableRow>
    );
}

