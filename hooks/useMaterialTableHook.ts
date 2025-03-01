import { useState, useEffect } from 'react';
export type RowObject = { [key: string]: string | number | boolean };
type Order = "asc" | "desc";

export default function useMaterialTableHook<T extends { [key: string]: any }>(
  rows: T[],
  initialRowsPerPage: number
) {
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [orderBy, setOrderBy] = useState<keyof T | ''>('');
  const [selected, setSelected] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredRows, setFilteredRows] = useState<T[]>(rows);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);

  // Update filtered rows when rows or search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredRows(rows);
      return;
    }

    const filtered = rows.filter((row) => {
      return Object.values(row).some((value) =>
        String(value).toLowerCase().includes(searchQuery.toLowerCase())
      );
    });

    setFilteredRows(filtered);
    setPage(1); // Reset to first page when filtering changes
  }, [rows, searchQuery]);

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
