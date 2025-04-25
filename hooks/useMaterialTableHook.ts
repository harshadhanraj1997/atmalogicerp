import { useState, useEffect } from 'react';
export type RowObject = { [key: string]: string | number | boolean };
type Order = "asc" | "desc";

export default function useMaterialTableHook<T>(initialRows: T[] = [], initialRowsPerPage: number = 10) {
  const [rows, setRows] = useState<T[]>(initialRows);
  const [filteredRows, setFilteredRows] = useState<T[]>(initialRows);
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [orderBy, setOrderBy] = useState<keyof T | ''>('created_date');
  const [selected, setSelected] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);

  // Update filtered rows when rows or search query changes
  useEffect(() => {
    // Ensure rows is an array before spreading
    let result = Array.isArray(rows) ? [...rows] : [];

    // Apply search filter
    if (searchQuery.trim()) {
      result = result.filter((row) => {
        return Object.values(row as any).some((value) =>
          String(value).toLowerCase().includes(searchQuery.toLowerCase())
        );
      });
    }

    setFilteredRows(result);
  }, [rows, searchQuery]);

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
