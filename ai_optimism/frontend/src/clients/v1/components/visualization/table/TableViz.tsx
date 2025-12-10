'use client';

import { Box, Typography, Paper, Table, TableBody, TableContainer, TablePagination, TableRow as MuiTableRow, TableCell } from '@mui/material';
import { useState } from 'react';
import { useTableData } from './hooks/useTableData';
import { useTableSorting } from './hooks/useTableSorting';
import { exportToCSV } from './utils/csvExport';
import { TableControls } from './components/TableControls';
import { TableHeader } from './components/TableHeader';
import { TableRowComponent } from './components/TableRow';
import type { TableVizProps, SortField, SortOrder } from './types';

export default function TableViz({ data }: TableVizProps) {
    console.log('[TableViz] Component loaded, data:', data);
    const [sortField, setSortField] = useState<SortField>('rank');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);

    const tableData = useTableData(data);
    const processedData = useTableSorting(
        tableData?.rows || [],
        sortField,
        sortOrder,
        searchQuery
    );

    // Handle sort
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    // Handle export
    const handleExport = () => {
        exportToCSV(processedData, tableData);
    };

    // Handle search change
    const handleSearchChange = (query: string) => {
        setSearchQuery(query);
        setPage(0); // Reset to first page on search
    };

    if (!data || !tableData) {
        return (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', p: 4 }}>
                <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                    No optimization data available
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Run an optimization to see results table
                </Typography>
            </Box>
        );
    }

    const paginatedData = processedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    return (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 2, overflow: 'hidden' }}>
            <TableControls
                searchQuery={searchQuery}
                onSearchChange={handleSearchChange}
                onExport={handleExport}
                resultCount={processedData.length}
            />

            {/* Table */}
            <TableContainer component={Paper} sx={{ flex: 1, overflow: 'auto' }}>
                <Table stickyHeader size="small">
                    <TableHeader
                        tableData={tableData}
                        sortField={sortField}
                        sortOrder={sortOrder}
                        onSort={handleSort}
                    />
                    <TableBody>
                        {paginatedData.map((row) => (
                            <TableRowComponent
                                key={row.rank}
                                row={row}
                                tableData={tableData}
                            />
                        ))}
                        {paginatedData.length === 0 && (
                            <MuiTableRow>
                                <TableCell colSpan={3 + (tableData.variableNames.length + tableData.objectives.length + tableData.constraints.length)} align="center">
                                    <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                                        No solutions found matching search criteria
                                    </Typography>
                                </TableCell>
                            </MuiTableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Pagination */}
            <TablePagination
                component="div"
                count={processedData.length}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value, 10));
                    setPage(0);
                }}
                rowsPerPageOptions={[10, 25, 50, 100]}
            />
        </Box>
    );
}

