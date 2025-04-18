import { useState, useEffect } from 'react';
export type RowObject = { [key: string]: string | number | boolean };
type Order = "asc" | "desc";

export default function useMaterialTableHook<T extends { [key: string]: any }>(
  rows: T[],
  initialRowsPerPage: number
) {
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [orderBy, setOrderBy] = useState<keyof T | ''>('created_date');
  const [selected, setSelected] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredRows, setFilteredRows] = useState<T[]>(rows);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);

  // Update filtered rows when rows or search query changes
  useEffect(() => {
    let result = [...rows];

    // Apply search filter
    if (searchQuery.trim()) {
      result = result.filter((row) => {
        return Object.values(row).some((value) =>
          String(value).toLowerCase().includes(searchQuery.toLowerCase())
        );
      });
    }

    // Apply sorting
    if (orderBy) {
      result.sort((a, b) => {
        // Special handling for created_date
        if (orderBy === 'created_date') {
          // Debug log to see what we're working with
          console.log('Row A:', a);
          console.log('Row B:', b);
          
          const dateA = a?.Created_Date__c || a?.created_date || a?.issued_date || '';
          const dateB = b?.Created_Date__c || b?.created_date || b?.issued_date || '';
          
          console.log('Comparing dates:', dateA, dateB);
          
          // Direct string comparison (works for YYYY-MM-DD format)
          if (order === 'desc') {
            return dateB.localeCompare(dateA);  // Newest first
          }
          return dateA.localeCompare(dateB);    // Oldest first
        }
        
        // Default sorting for other fields
        const valueA = a[orderBy];
        const valueB = b[orderBy];
        
        if (valueA < valueB) return order === 'asc' ? -1 : 1;
        if (valueA > valueB) return order === 'asc' ? 1 : -1;
        return 0;
      });
    }

    console.log('Sorted result:', result.map(r => r?.Created_Date__c || r?.created_date));

    setFilteredRows(result);
    setPage(1); // Reset to first page when filtering/sorting changes
  }, [rows, searchQuery, order, orderBy]);

  const handleRequestSort = (property: keyof T) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleSelectAllClick = (checked: boolean, rows: T[]) => {
    if (checked) {
      const newSelected = rows.map((_, index) => index);
      setSelected(newSelected);
      return;
    }
    setSelected([]);
  };

  const handleClick = (index: number) => {
    const selectedIndex = selected.indexOf(index);
    let newSelected: number[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, index);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1)
      );
    }

    setSelected(newSelected);
  };

  const handleChangePage = (newPage: number) => {
    console.log("Changing to page:", newPage);
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (value: string) => {
    const newRowsPerPage = parseInt(value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleDelete = async (id: number | string) => {
    // Handle delete if needed
  };

  // Calculate pagination values
  const startIndex = (page - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedRows = filteredRows.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredRows.length / rowsPerPage);

  console.log("Pagination details:", {
    page,
    rowsPerPage,
    startIndex,
    endIndex,
    totalRows: filteredRows.length,
    paginatedRowsLength: paginatedRows.length,
    totalPages
  });

  return {
    order,
    orderBy,
    selected,
    searchQuery,
    filteredRows,
    paginatedRows,
    page,
    rowsPerPage,
    totalPages,
    startIndex,
    endIndex,
    handleDelete,
    handleRequestSort,
    handleSelectAllClick,
    handleClick,
    handleChangePage,
    handleChangeRowsPerPage,
    handleSearchChange,
  };
}
