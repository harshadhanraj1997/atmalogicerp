/* eslint-disable react-hooks/rules-of-hooks */
"use client";
import React, { useState, useEffect, useMemo } from "react";
import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import Pagination from "@mui/material/Pagination";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import Paper from "@mui/material/Paper";
import { visuallyHidden } from "@mui/utils";
import useMaterialTableHook from "@/hooks/useMaterialTableHook";
import { IDeal } from "@/interface/table.interface";
import { ICasting } from "@/interface/table.interface";

import { dealHeadCells } from "@/data/table-head-cell/table-head";
import * as pdfjs from "pdfjs-dist";
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
import {
  useTablePhaseHook,
  useTableStatusHook,
} from "@/hooks/use-condition-class";
import { Checkbox, Button } from "@mui/material";
//import DealsDetailsModal from "./orderdeatilsModal";
//import EditDealsModal from "./editorderModal";
import { fetchDealData } from "@/data/crm/casting-data";
import TableControls from "@/components/elements/SharedInputs/TableControls";
import DeleteModal from "@/components/common/DeleteModal";
import { PDFDocument } from 'pdf-lib';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
const downloadPDF = async (pdfUrl: string) => {
  try {
    const response = await fetch(pdfUrl, {
      headers: {
        "Authorization": `Bearer ${process.env.SALESFORCE_ACCESS_TOKEN}`, // Ensure you have a valid token if needed
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    // Create a link element
    const link = document.createElement('a');
    link.href = url;
    link.download = 'downloaded-file.pdf'; // You can set a default file name here
    document.body.appendChild(link);
    link.click();

    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error downloading file:", error);
    alert("Failed to download PDF.");
  }
};

const previewPDF = async (pdfUrl: string) => {
  try {
    const response = await fetch(pdfUrl, {
      headers: {
        "Authorization": `Bearer ${process.env.SALESFORCE_ACCESS_TOKEN}`, // Ensure you have a valid token if needed
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    // Open the PDF in a new tab for preview
    window.open(url, "_blank");
  } catch (error) {
    console.error("Error previewing file:", error);
    alert("Failed to preview PDF.");
  }
};

const getStatusClass = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'pending':
      return 'bg-warning'; // yellow background
    case 'finished':
      return 'bg-success'; // green background
    default:
      return 'bg-secondary'; // default gray background
  }
};

const departments = [
  /*{ 
    value: 'Grinding', 
    label: 'Grinding',
    path: '/Departments/Grinding/add_grinding_details'
  },*/
  { 
    value: 'Filing', 
    label: 'Filing',
    path: '/Departments/Filing/add_filing_details'
  },
 /* { 
    value: 'Setting', 
    label: 'Setting',
    path: '/Departments/Setting/add_setting_details'
  },*/
 /* { 
    value: 'Polishing', 
    label: 'Polishing',
    path: '/Departments/Polishing/add_polishing_details'
  },*/
  /*{ 
    value: 'Dull', 
    label: 'Dull',
    path: '/Departments/Dull/add_dull_details'
  },*/
];

// Add this type for weight breakdown
interface WeightBreakdown {
  ornamentWeight: number;
  scrapWeight: number;
  dustWeight: number;
}

export default function CastingTable() {
  const [modalOpen, setModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [editData, setEditData] = useState<IDeal | null>(null);
  const [modalDeleteOpen, setModalDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number>(0);
  const [deals, setDeals] = useState<ICasting[]>([]);
  const [filteredDeals, setFilteredDeals] = useState<ICasting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Custom pagination control functions
  const handlePageChange = (newPage: number) => {
    console.log(`Changing page from ${page} to ${newPage}`);
    // Update our internal page state
    setPage(newPage);
  };
  
  // Add a direct function to change rows per page
  const handleRowsPerPageChange = (newRowsPerPage: number) => {
    console.log(`Changing rows per page from ${rowsPerPage} to ${newRowsPerPage}`);
    setRowsPerPage(newRowsPerPage);
    // Reset to first page when changing rows per page
    setPage(0);
  };
  const [showConfirmation, setShowConfirmation] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showTransferMenu, setShowTransferMenu] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const loadDeals = async () => {
      try {
        setLoading(true);
        const data = await fetchDealData();
        setDeals(data);
        
        // Initial data is loaded - filters will be applied in the next useEffect
      } catch (error) {
        console.error("Error loading deals:", error);
        setError("Failed to load deals");
      } finally {
        setLoading(false);
      }
    };

    loadDeals();
  }, []);
  
  // Get material table hook functions to handle pagination, sorting, etc.
  // Extract only what we need from the hook, override pagination functions
  const {
    order,
    orderBy,
    selected,
    searchQuery,
    handleDelete,
    handleRequestSort,
    handleSelectAllClick,
    handleClick,
    // Do not use these from the hook, use our local state handlers
    // handleChangePage,
    // handleChangeRowsPerPage,
    handleSearchChange,
  } = useMaterialTableHook(filteredDeals, rowsPerPage);

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...deals];
    
    // First apply all filters
    
    // 1. Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(deal => 
        deal.status?.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    // 2. Date filter - improved parsing
    if (startDate || endDate) {
      filtered = filtered.filter(deal => {
        try {
          // Use issued date as primary, no fallback needed
          const dateStr = deal.issuedDate;
          if (!dateStr) return true; // Include if no date
          
          // Parse date to consistent format
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return true; // Include if invalid date
          
          const formattedDate = date.toISOString().split('T')[0];
          
          // Check against range
          if (startDate && formattedDate < startDate) return false;
          if (endDate && formattedDate > endDate) return false;
          return true;
        } catch (error) {
          console.error('Error in date filter:', error);
          return true; // Include on error
        }
      });
    }
    
    // 3. Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(deal => {
        return (
          // Search in multiple fields
          String(deal.id || '').toLowerCase().includes(query) ||
          String(deal.status || '').toLowerCase().includes(query) ||
          String(deal.issuedDate || '').toLowerCase().includes(query) ||
          String(deal.receivedDate || '').toLowerCase().includes(query) ||
          String(deal.issuedWeight || '').toLowerCase().includes(query) ||
          String(deal.receivedWeight || '').toLowerCase().includes(query)
        );
      });
    }
    
    // Then sort by issued date in descending order by default
    filtered.sort((a, b) => {
      try {
        const dateA = new Date(a.issuedDate || '0');
        const dateB = new Date(b.issuedDate || '0');
        
        // Most recent first (descending)
        return dateB.getTime() - dateA.getTime();
      } catch (error) {
        return 0; // Maintain order on error
      }
    });
    
    console.log('Filtered deals:', filtered.length);
    setFilteredDeals(filtered);
  }, [deals, startDate, endDate, statusFilter, searchQuery]);

  // Paginated data calculation - simplified to ensure proper updates
  // We're not using useMemo here to force recalculation on each render
  let paginatedDeals: ICasting[] = [];
  // Only process if we have data
  if (filteredDeals && filteredDeals.length > 0) {
    // Basic pagination calculation
    const startIndex = page * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    
    // Make sure we don't exceed array bounds
    if (startIndex < filteredDeals.length) {
      paginatedDeals = filteredDeals.slice(startIndex, endIndex);
      console.log(`Showing page ${page+1}, records ${startIndex+1}-${Math.min(endIndex, filteredDeals.length)} of ${filteredDeals.length}`);
      console.log(`Displaying ${paginatedDeals.length} records`);
      
      // Reset to page 0 if we somehow ended up on an invalid page
      if (paginatedDeals.length === 0 && filteredDeals.length > 0) {
        console.warn('No records on current page but filtered deals exist - resetting to page 0');
        setTimeout(() => setPage(0), 0);
        paginatedDeals = filteredDeals.slice(0, rowsPerPage);
      }
    } else {
      // We're out of bounds, reset to first page
      console.warn(`Page ${page} is out of bounds (total pages: ${Math.ceil(filteredDeals.length/rowsPerPage)})`);
      setTimeout(() => setPage(0), 0);
      paginatedDeals = filteredDeals.slice(0, rowsPerPage);
    }
  } else {
    console.log('No filtered deals available');
  }

  const handleDateChange = (type: 'start' | 'end', value: string) => {
    if (type === 'start') setStartDate(value);
    else setEndDate(value);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
  };

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setStatusFilter('all');
  };

  const handlePrint = (pdfUrl: string | null) => {
    if (pdfUrl) {
      // Convert URL to a file and open it
      window.open(pdfUrl, "_blank");
    } else {
      alert("No PDF available to print.");
    }
  };
  const handlePdfClick = (pdfUrl: string) => {
    if (!pdfUrl) {
      alert("No PDF available to print.");
      return;
    }

    // Create an HTML page with an embedded PDF
    const html = `
      <html>
        <head>
          <title>PDF Preview</title>
        </head>
        <body style="margin:0">
          <iframe src="${pdfUrl}" style="border:none; width:100%; height:100vh;"></iframe>
        </body>
      </html>
    `;

    // Open the HTML page in a new tab
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(html);
      newWindow.document.close();
    }
  };

  const handleApproveOrder = async (orderId: string) => {
    try {
      setIsUpdating(true);
      const response = await fetch(`${apiBaseUrl}/api/update-order-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId }),
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('Order approved successfully');
        if (onUpdate) {
          onUpdate();
        }
      } else {
        toast.error(result.message || 'Failed to approve order');
      }
    } catch (error) {
      console.error('Error approving order:', error);
      toast.error('Failed to approve order');
    } finally {
      setIsUpdating(false);
      setShowConfirmation(null);
    }
  };

  // Add click-away listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showTransferMenu && !(event.target as HTMLElement).closest('.relative')) {
        setShowTransferMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTransferMenu]);

  // Function to format weight with 4 decimal places
  const formatWeight = (weight: number) => weight?.toFixed(4) || '0.0000';

  // Function to render weight breakdown tooltip content
  const renderWeightBreakdown = (deal: ICasting) => {
    return (
      <div className="bg-white p-3 rounded-lg shadow-xl border border-gray-200 text-sm w-[250px]">
        <div className="font-semibold mb-3 text-gray-800 border-b pb-2">
          Weight Breakdown
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center bg-blue-50 p-2 rounded">
            <div className="text-blue-700">Ornament Weight:</div>
            <div className="font-medium text-blue-800">
              {formatWeight(deal.ornamentWeight)}g
            </div>
          </div>
          <div className="flex justify-between items-center bg-green-50 p-2 rounded">
            <div className="text-green-700">Scrap Weight:</div>
            <div className="font-medium text-green-800">
              {formatWeight(deal.scrapWeight)}g
            </div>
          </div>
          <div className="flex justify-between items-center bg-purple-50 p-2 rounded">
            <div className="text-purple-700">Dust Weight:</div>
            <div className="font-medium text-purple-800">
              {formatWeight(deal.dustWeight)}g
            </div>
          </div>
          <div className="flex justify-between items-center bg-gray-100 p-2 rounded mt-3 border-t border-gray-200">
            <div className="font-semibold text-gray-700">Total:</div>
            <div className="font-bold text-gray-800">
              {formatWeight(deal.receivedWeight)}g
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Calculate empty rows to maintain consistent height
  const emptyRows = Math.max(0, (1 + page) * rowsPerPage - filteredDeals.length);

  if (loading) return <div>Loading deals...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <>
      <div className="col-span-12">
        <div className="card__wrapper">
          <div className="manaz-common-mat-list w-full table__wrapper table-responsive">
            <TableControls
              currentPage={page}
              rowCount={filteredDeals.length}
              startDate={startDate}
              endDate={endDate}
              handleDateChange={handleDateChange}
              statusFilter={statusFilter}
              handleStatusChange={handleStatusChange}
              onSearchChange={handleSearchChange}
              onRowsPerPageChange={(value) => handleRowsPerPageChange(parseInt(value))}
              searchValue={searchQuery}
              rowsPerPageValue={rowsPerPage.toString()}
            />
            <Box sx={{ width: "100%" }} className="table-responsive">
              <Paper sx={{ width: "100%", mb: 2 }}>
                <TableContainer className="table mb-[20px] hover multiple_tables w-full">
                  <Table
                    aria-labelledby="tableTitle"
                    className="whitespace-nowrap"
                  >
                    <TableHead>
                      <TableRow className="table__title">
                        <TableCell padding="checkbox">
                          <Checkbox
                            className="custom-checkbox checkbox-small"
                            color="primary"
                            indeterminate={selected.length > 0 && selected.length < filteredDeals.length}
                            checked={filteredDeals.length > 0 && selected.length === filteredDeals.length}
                            onChange={(e) => handleSelectAllClick(e.target.checked, filteredDeals)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>Casting Id</TableCell>
                        <TableCell>Issued Weight</TableCell>
                        <TableCell>Received Weight</TableCell>
                        <TableCell>Issued Date</TableCell>
                        <TableCell>Received Date</TableCell>
                        <TableCell>Created Date</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Casting Loss</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody className="table__body">
                      {paginatedDeals.length > 0 ? (
                        paginatedDeals.map((deal, index) => {
                          const stausClass = useTableStatusHook(deal?.status);
                          const phaseClass = useTablePhaseHook(deal?.phase);
                          return (
                            <TableRow
                              key={deal.id}
                              selected={selected.includes(index)}
                              onClick={() => handleClick(index)}
                            >
                              <TableCell padding="checkbox">
                                <Checkbox
                                  className="custom-checkbox checkbox-small"
                                  checked={selected.includes(index)}
                                  size="small"
                                  onChange={() => handleClick(index)}
                                />
                              </TableCell>
                              <TableCell>{deal.id}</TableCell>
                              <TableCell>{deal.issuedWeight}</TableCell>
                              <TableCell>
                                <div 
                                  className="relative group cursor-help"
                                  title="Hover to see weight breakdown"
                                >
                                  <span className="hover:text-blue-600 transition-colors">
                                    {formatWeight(deal.receivedWeight)}g
                                  </span>
                                  <div className="absolute z-[1000] invisible group-hover:visible 
                                                left-0 top-full mt-1
                                                animate-fade-in duration-200">
                                    {renderWeightBreakdown(deal)}
                                    <div className="absolute -top-2 left-4 
                                                  border-8 border-transparent border-b-white"></div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>{deal.issuedDate}</TableCell>
                              <TableCell>{deal.receivedDate}</TableCell>
                              <TableCell>{deal.created_date}</TableCell>
                              <TableCell>
                                <span 
                                  className={`bd-badge ${getStatusClass(deal.status)}`}
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    color: 'white',
                                    fontSize: '12px',
                                    fontWeight: '500'
                                  }}
                                >
                                  {deal.status}
                                </span>
                              </TableCell>
                              <TableCell>{deal.castingLoss}</TableCell>
                              <TableCell className="table__icon-box">
                                <div className="flex items-center justify-start gap-[10px]">
                                  <Link href={`/Departments/Casting/show_casting_details?castingId=${deal.id}`} passHref>
                                    <button
                                      type="button"
                                      className="table__icon edit"
                                      style={{
                                        display: 'inline-block',
                                        backgroundColor: 'green',
                                        color: 'white',
                                        borderRadius: '4px',
                                        padding: '5px',
                                        textDecoration: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <i className="fa-regular fa-eye"></i>
                                    </button>
                                  </Link>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={10} align="center">
                            No records found
                          </TableCell>
                        </TableRow>
                      )}
                      
                      {emptyRows > 0 && (
                        <TableRow style={{ height: 53 * emptyRows }}>
                          <TableCell colSpan={10} />
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Box>
            <Pagination
              count={Math.ceil(filteredDeals.length / rowsPerPage)}
              page={page + 1}
              onChange={(e, value) => {
                // Convert 1-based UI page number to 0-based state
                const newPage = value - 1;
                console.log(`Pagination clicked: ${value} (state: ${newPage})`);
                // Directly set page state for immediate update
                setPage(newPage);
              }}
              variant="outlined"
              shape="rounded"
              className="manaz-pagination-button"
            />
          </div>
        </div>
      </div>
                      <TableRow className="table__title">
                        <TableCell padding="checkbox">
                          <Checkbox
                            className="custom-checkbox checkbox-small"
                            color="primary"
                            indeterminate={selected.length > 0 && selected.length < filteredDeals.length}
                            checked={filteredDeals.length > 0 && selected.length === filteredDeals.length}
                            onChange={(e) => handleSelectAllClick(e.target.checked, filteredDeals)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>Casting Id</TableCell>
                        <TableCell>Issued Weight</TableCell>
                        <TableCell>Received Weight</TableCell>
                        <TableCell>Issued Date</TableCell>
                        <TableCell>Received Date</TableCell>
                        <TableCell>Created Date</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Casting Loss</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody className="table__body">
                      {paginatedDeals.length > 0 ? (
                        paginatedDeals.map((deal, index) => {
                          const stausClass = useTableStatusHook(deal?.status);
                          const phaseClass = useTablePhaseHook(deal?.phase);
                          return (
                            <TableRow
                              key={deal.id}
                              selected={selected.includes(index)}
                              onClick={() => handleClick(index)}
                            >
                              <TableCell padding="checkbox">
                                <Checkbox
                                  className="custom-checkbox checkbox-small"
                                  checked={selected.includes(index)}
                                  size="small"
                                  onChange={() => handleClick(index)}
                                />
                              </TableCell>
                              <TableCell>{deal.id}</TableCell>
                              <TableCell>{deal.issuedWeight}</TableCell>
                              <TableCell>
                                <div 
                                  className="relative group cursor-help"
                                  title="Hover to see weight breakdown"
                                >
                                  <span className="hover:text-blue-600 transition-colors">
                                    {formatWeight(deal.receivedWeight)}g
                                  </span>
                                  <div className="absolute z-[1000] invisible group-hover:visible 
                                                left-0 top-full mt-1
                                                animate-fade-in duration-200">
                                    {renderWeightBreakdown(deal)}
                                    <div className="absolute -top-2 left-4 
                                                  border-8 border-transparent border-b-white"></div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>{deal.issuedDate}</TableCell>
                              <TableCell>{deal.receivedDate}</TableCell>
                              <TableCell>{deal.created_date}</TableCell>
                              <TableCell>
                                <span 
                                  className={`bd-badge ${getStatusClass(deal.status)}`}
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    color: 'white',
                                    fontSize: '12px',
                                    fontWeight: '500'
                                  }}
                                >
                                  {deal.status}
                                </span>
                              </TableCell>
                              <TableCell>{deal.castingLoss}</TableCell>
                              <TableCell className="table__icon-box">
                                <div className="flex items-center justify-start gap-[10px]">
                                  <Link href={`/Departments/Casting/show_casting_details?castingId=${deal.id}`} passHref>
                                    <button
                                      type="button"
                                      className="table__icon edit"
                                      style={{
                                        display: 'inline-block',
                                        backgroundColor: 'green',
                                        color: 'white',
                                        borderRadius: '4px',
                                        padding: '5px',
                                        textDecoration: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <i className="fa-regular fa-eye"></i>
                                    </button>
                                  </Link>

                                  {/* Edit button - disabled when status is Finished */}
                                  {deal.status?.toLowerCase() !== 'finished' ? (
                                    <Link href={`/Departments/Casting/casting_received_details?castingId=${deal.id}`} passHref>
                                      <button
                                        type="button"
                                        className="table__icon edit"
                                        style={{
                                          display: 'inline-block',
                                          backgroundColor: 'green',
                                          color: 'white',
                                          borderRadius: '4px',
                                          padding: '5px',
                                          textDecoration: 'none',
                                          border: 'none',
                                          cursor: 'pointer',
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <i className="fa-sharp fa-light fa-pen"></i>
                                      </button>
                                    </Link>
                                  ) : (
                                    <button
                                      type="button"
                                      className="table__icon edit"
                                      style={{
                                        display: 'inline-block',
                                        backgroundColor: 'gray',
                                        color: 'white',
                                        borderRadius: '4px',
                                        padding: '5px',
                                        textDecoration: 'none',
                                        border: 'none',
                                        cursor: 'not-allowed',
                                        opacity: 0.6,
                                      }}
                                      disabled
                                      title="Cannot edit finished items"
                                    >
                                      <i className="fa-sharp fa-light fa-pen"></i>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    className="table__icon delete"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(deal.id);
                                    }}
                                  >
                                    <i className="fa-solid fa-trash"></i>
                                  </button>

                                  <button
                                    type="button"
                                    className="table__icon approve"
                                    style={{
                                      backgroundColor: '#4CAF50',
                                      color: 'white',
                                      borderRadius: '4px',
                                      padding: '5px',
                                      border: 'none',
                                      cursor: 'pointer',
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowConfirmation(deal.id);
                                    }}
                                  >
                                    <i className="fa-solid fa-check"></i>
                                  </button>

                                  {/* Transfer select - always enabled */}
                                  <Select
                                    onValueChange={(value) => {
                                      const dept = departments.find(d => d.value === value);
                                      if (dept) {
                                        window.location.href = `${dept.path}?castingId=${deal.id}`;
                                      }
                                    }}
                                  >
                                    <SelectTrigger 
                                      className="w-[130px] h-8"
                                      style={{
                                        backgroundColor: '#6366F1',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      <SelectValue placeholder="Transfer to" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white border border-gray-200">
                                      {departments.map((dept) => (
                                        <SelectItem 
                                          key={dept.value} 
                                          value={dept.value}
                                          className="cursor-pointer hover:bg-gray-100"
                                          style={{
                                            backgroundColor: 'white',
                                            color: 'black',
                                            padding: '8px 12px'
                                          }}
                                        >
                                          {dept.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} align="center">
                            No data available
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Box>
            <Box className="table-search-box mt-[30px]" sx={{ p: 2 }}>
              <Box>
                {`Showing ${page * rowsPerPage + 1} to ${Math.min(
                  (page + 1) * rowsPerPage,
                  filteredDeals.length
                )} of ${filteredDeals.length} entries`}
              </Box>
              <Pagination
                count={Math.ceil(filteredDeals.length / rowsPerPage)}
                page={page + 1}
                onChange={(e, value) => {
                  // Convert 1-based UI page number to 0-based state
                  const newPage = value - 1;
                  console.log(`Pagination clicked: ${value} (state: ${newPage})`);
                  // Directly set page state for immediate update
                  setPage(newPage);
                }}
                variant="outlined"
                shape="rounded"
                className="manaz-pagination-button"
              />
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Box>
          </div>
        </div>
      </div>

      {modalOpen && editData && (
        <EditDealsModal
          open={modalOpen}
          setOpen={setModalOpen}
          editData={editData}
        />
      )}
      {detailsModalOpen && editData && (
        <DealsDetailsModal
          open={detailsModalOpen}
          setOpen={setDetailsModalOpen}
          editData={editData}
        />
      )}

      {modalDeleteOpen && (
        <DeleteModal
          open={modalDeleteOpen}
          setOpen={setModalDeleteOpen}
          handleDeleteFunc={handleDelete}
          deleteId={deleteId}
        />
      )}

      {showConfirmation && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '8px',
              maxWidth: '400px',
              width: '90%',
            }}
          >
            {!isApproved ? (
              <>
                <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Confirm Approval</h3>
                <p style={{ marginBottom: '24px' }}>
                  Are you sure you want to approve this order? This action cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => {
                      setShowConfirmation(null);
                      setIsApproved(false);
                    }}
                    style={{
                      padding: '8px 16px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        console.log('Making API call with orderId:', showConfirmation);
                        const response = await fetch(`${apiBaseUrl}/api/update-order-status`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ orderId: showConfirmation }),
                        });
                        const result = await response.json();
                        if (result.success) {
                          setIsApproved(true);
                          setTimeout(() => {
                            setShowConfirmation(null);
                            setIsApproved(false);
                            window.location.reload();
                          }, 1500); // Show success message for 1.5 seconds
                        } else {
                          toast.error(result.message || 'Failed to approve order');
                          setShowConfirmation(null);
                        }
                      } catch (error) {
                        console.error('Error approving order:', error);
                        toast.error('Failed to approve order');
                        setShowConfirmation(null);
                      }
                    }}
                    style={{
                      padding: '8px 16px',
                      border: 'none',
                      borderRadius: '4px',
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      cursor: 'pointer',
                    }}
                  >
                    Approve
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  color: '#4CAF50', 
                  fontSize: '48px', 
                  marginBottom: '16px' 
                }}>
                  <i className="fa-solid fa-check-circle"></i>
                </div>
                <h3 style={{ 
                  color: '#4CAF50', 
                  marginTop: 0, 
                  marginBottom: '16px' 
                }}>
                  Approved Successfully!
                </h3>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  ); 
}
