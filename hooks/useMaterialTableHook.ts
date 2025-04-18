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

    // Apply basic sorting
    if (orderBy) {
      result.sort((a, b) => {
        try {
          const valueA = a[orderBy] || '';
          const valueB = b[orderBy] || '';
          
          if (order === 'desc') {
            return valueA < valueB ? 1 : -1;
          }
          return valueA > valueB ? 1 : -1;
        } catch (error) {
          console.error('Sorting error:', error);
          return 0;
        }
      });
    }

    setFilteredRows(result);
    setPage(1);
  }, [rows, searchQuery, order, orderBy]);

  // Calculate pagination
  const startIndex = (page - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedRows = filteredRows.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredRows.length / rowsPerPage);

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
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (value: string) => {
    setRowsPerPage(parseInt(value, 10));
    setPage(1);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleDelete = async (id: number | string) => {
    // Handle delete if needed
  };

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
