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
import Paper from "@mui/material/Paper";
import useMaterialTableHook from "@/hooks/useMaterialTableHook";
import { IDeal } from "@/interface/table.interface";
import { dealHeadCells } from "@/data/table-head-cell/table-head";
import * as pdfjs from "pdfjs-dist";
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
import {
  useTablePhaseHook,
  useTableStatusHook,
} from "@/hooks/use-condition-class";
import { Checkbox, Button } from "@mui/material";
import DealsDetailsModal from "./orderdeatilsModal";
import EditDealsModal from "./editorderModal";
import { fetchDealData } from "@/data/crm/deal-data";
import DeleteModal from "@/components/common/DeleteModal";
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import OrderTableControls from './OrderTableControls';

// Type definition for column
interface Column {
  id: string;
  label: string;
  numeric: boolean;
  format?: (value: any) => string;
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

const downloadPDF = async (pdfUrl: string) => {
  try {
    const response = await fetch(pdfUrl, {
      headers: {
        "Authorization": `Bearer ${process.env.SALESFORCE_ACCESS_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'downloaded-file.pdf';
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error downloading file:", error);
    toast.error("Failed to download PDF.");
  }
};

const previewPDF = async (pdfUrl: string) => {
  try {
    const response = await fetch(pdfUrl, {
      headers: {
        "Authorization": `Bearer ${process.env.SALESFORCE_ACCESS_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  } catch (error) {
    console.error("Error previewing file:", error);
    toast.error("Failed to preview PDF.");
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

export default function DealsTable() {
  // State hooks
  const [deals, setDeals] = useState<IDeal[]>([]);
  const [filteredDeals, setFilteredDeals] = useState<IDeal[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [partyNameFilter, setPartyNameFilter] = useState('all');
  const [showConfirmation, setShowConfirmation] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [modalDeleteOpen, setModalDeleteOpen] = useState(false);
  const [editData, setEditData] = useState<IDeal | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Table hook with added error handling
  const {
    paginatedRows,
    page,
    totalPages,
    startIndex,
    endIndex,
    selected,
    searchQuery,
    handleDelete,
    handleRequestSort,
    handleSelectAllClick,
    handleClick,
    handleChangePage,
    handleChangeRowsPerPage,
    handleSearchChange,
    setRows,
  } = useMaterialTableHook(filteredDeals, 10);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        console.log('Starting to fetch data...');
        const data = await fetchDealData();
        console.log('Fetched data:', data); // Debug log
        
        if (!data || !Array.isArray(data)) {
          console.error('Invalid data format received:', data);
          toast.error('Invalid data format received from server');
          return;
        }

        console.log(`Setting ${data.length} deals to state`);
        setDeals(data);
        setFilteredDeals(data);
        setRows(data); // Make sure the table hook gets the data
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load orders');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [setRows]);

  // Memoized party name options
  const partyNameOptions = useMemo(() => {
    const uniquePartyNames = Array.from(new Set(deals.map(deal => deal.dealName)))
      .filter(Boolean)
      .sort();
    return [
      { value: 'all', label: 'All Parties' },
      ...uniquePartyNames.map(name => ({
        value: name,
        label: name
      }))
    ];
  }, [deals]);

  // Fetch data effect
  useEffect(() => {
    fetchDealData().then(data => {
      setDeals(data);
      setFilteredDeals(data);
    }).catch(error => {
      console.error("Error fetching deal data:", error);
      toast.error("Failed to load data");
    });
  }, []);

  // Apply all filters in a single effect
  useEffect(() => {
    if (!deals || !Array.isArray(deals)) {
      console.error('Invalid deals data for filtering');
      return;
    }

    console.log('Applying filters:', { 
      statusFilter, 
      partyNameFilter, 
      startDate, 
      endDate, 
      searchQuery,
      totalDeals: deals.length 
    });
    
    try {
      // Start with all deals
      let newFilteredDeals = [...deals];
      
      // Apply status filter
      if (statusFilter && statusFilter !== 'all') {
        console.log(`Filtering by status: ${statusFilter}`);
        newFilteredDeals = newFilteredDeals.filter(deal => {
          if (!deal || !deal.status) return false;
          const dealStatus = deal.status.toLowerCase();
          const filterStatus = statusFilter.toLowerCase();
          console.log(`Deal status: ${dealStatus}, Filter status: ${filterStatus}`);
          return dealStatus === filterStatus;
        });
        console.log(`After status filter: ${newFilteredDeals.length} deals`);
      }
      
      // Apply date filter
      if (startDate || endDate) {
        console.log(`Filtering by date range: ${startDate} to ${endDate}`);
        newFilteredDeals = newFilteredDeals.filter(deal => {
          if (!deal || !deal.createdDate) return false;
          const dealDate = new Date(deal.createdDate).toISOString().split('T')[0];
          if (startDate && dealDate < startDate) return false;
          if (endDate && dealDate > endDate) return false;
          return true;
        });
        console.log(`After date filter: ${newFilteredDeals.length} deals`);
      }
      
      // Apply party name filter
      if (partyNameFilter && partyNameFilter !== 'all') {
        console.log(`Filtering by party name: ${partyNameFilter}`);
        newFilteredDeals = newFilteredDeals.filter(deal => {
          if (!deal || !deal.dealName) return false;
          return deal.dealName === partyNameFilter;
        });
        console.log(`After party filter: ${newFilteredDeals.length} deals`);
      }
      
      // Apply search filter directly here
      if (searchQuery && searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        console.log(`Filtering by search query: ${query}`);
        newFilteredDeals = newFilteredDeals.filter(deal => {
          if (!deal) return false;
          return Object.entries(deal).some(([key, value]) => {
            if (value === null || value === undefined) return false;
            return String(value).toLowerCase().includes(query);
          });
        });
        console.log(`After search filter: ${newFilteredDeals.length} deals`);
      }
      
      console.log(`Filtered from ${deals.length} to ${newFilteredDeals.length} deals`);
      
      // Update the filtered deals
      setFilteredDeals(newFilteredDeals);
      
      // Also update the rows in the table hook to ensure pagination works correctly
      setRows(newFilteredDeals);
    } catch (error) {
      console.error('Error applying filters:', error);
    }
  }, [deals, startDate, endDate, statusFilter, partyNameFilter, searchQuery]);

  // Handle pagination reset when filtered data changes
  useEffect(() => {
    // Reset to page 1 when filters change and current page would be empty
    const maxPage = Math.ceil(filteredDeals.length / 10);
    if (page > maxPage && maxPage > 0) {
      handleChangePage(1);
    }
  }, [filteredDeals.length, page]);

  // Monitor pagination for debugging
  useEffect(() => {
    console.log(`Page: ${page}, Total Pages: ${totalPages}, Items: ${paginatedRows.length}`);
  }, [page, totalPages, paginatedRows.length]);

  // Handler functions
  const handleDateChange = (type: 'start' | 'end', value: string) => {
    if (type === 'start') setStartDate(value);
    else setEndDate(value);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
  };

  const handlePartyNameChange = (value: string) => {
    setPartyNameFilter(value);
  };

  const handleResetFilters = () => {
    console.log('Resetting all filters');
    setStartDate('');
    setEndDate('');
    setStatusFilter('all');
    setPartyNameFilter('all');
    // Also reset search query
    if (searchQuery) {
      // Create a fake event to pass to handleSearchChange
      const fakeEvent = { target: { value: '' } } as React.ChangeEvent<HTMLInputElement>;
      handleSearchChange(fakeEvent);
    }
  };

  const handlePrint = (pdfUrl: string | null) => {
    if (pdfUrl) {
      window.open(pdfUrl, "_blank");
    } else {
      toast.error("No PDF available to print.");
    }
  };

  const handlePdfClick = (pdfUrl: string) => {
    if (!pdfUrl) {
      toast.error("No PDF available to preview.");
      return;
    }

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

    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(html);
      newWindow.document.close();
    }
  };

  const handleApproveOrder = async (orderId: string) => {
    try {
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
      } else {
        toast.error(result.message || 'Failed to approve order');
      }
    } catch (error) {
      console.error('Error approving order:', error);
      toast.error('Failed to approve order');
    }
  };

  const handleEdit = (deal: IDeal) => {
    setEditData(deal);
    setModalOpen(true);
  };

  const handleDetails = (deal: IDeal) => {
    setEditData(deal);
    setDetailsModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
    setModalDeleteOpen(true);
  };

  // Calculate total weight for each row
  const calculateTotalWeight = (weightRange: string, quantity: number) => {
    try {
      if (!weightRange) return '0.00';
      
      // If weight range contains a hyphen (e.g., "10-12")
      if (weightRange.includes('-')) {
        const [min, max] = weightRange.split('-').map(w => parseFloat(w.trim()));
        if (isNaN(min) || isNaN(max)) return '0.00';
        const avgWeight = (min + max) / 2;
        return (avgWeight * quantity).toFixed(2);
      } 
      // If it's a single number
      else {
        const weight = parseFloat(weightRange);
        if (isNaN(weight)) return '0.00';
        return (weight * quantity).toFixed(2);
      }
    } catch (error) {
      console.error('Error calculating weight:', error);
      return '0.00';
    }
  };

  // Calculate total weight for all rows
  const calculateTotalWeightForAllRows = () => {
    return filteredDeals.reduce((total, row) => {
      const weight = parseFloat(calculateTotalWeight(row.weightRange || '0', Number(row.quantity) || 0));
      return total + (isNaN(weight) ? 0 : weight);
    }, 0).toFixed(2);
  };

  // Render table rows with safety checks
  const renderTableRows = () => {
    if (isLoading) {
      return (
        <TableRow>
          <TableCell colSpan={12} align="center">
            Loading orders...
          </TableCell>
        </TableRow>
      );
    }

    if (paginatedRows.length === 0) {
      if (filteredDeals.length > 0) {
        // If we have data but no rows on this page, try to go to page 1
        setTimeout(() => handleChangePage(1), 0);
      }
      return (
        <TableRow>
          <TableCell colSpan={12} align="center">
            No data available on this page
          </TableCell>
        </TableRow>
      );
    }

    return paginatedRows.map((row, index) => (
      <TableRow
        key={row.id}
        selected={selected.includes(startIndex + index)}
        onClick={() => handleClick(startIndex + index)}
      >
        <TableCell padding="checkbox">
          <Checkbox
            className="custom-checkbox checkbox-small"
            checked={selected.includes(startIndex + index)}
            size="small"
            onChange={() => handleClick(startIndex + index)}
          />
        </TableCell>
        <TableCell>{row.id}</TableCell>
        <TableCell>
          {new Date(row.createdDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}
        </TableCell>
        <TableCell>{row.createdBy}</TableCell>
        <TableCell>{row.dealName}</TableCell>
        <TableCell>{row.product}</TableCell>
        <TableCell>{row.expectedEndDate}</TableCell>
        <TableCell>
          <span 
            className={`bd-badge ${getStatusClass(row.status)}`}
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              color: 'white',
              fontSize: '12px',
              fontWeight: '500'
            }}
          >
            {row.status}
          </span>
        </TableCell>
        <TableCell>{row.AdvanceMetal}</TableCell>
        <TableCell>
          <span className="tag-badge">{row.tags}</span>
        </TableCell>
        <TableCell>
          {calculateTotalWeight(row.weightRange || '0', Number(row.quantity) || 0)}
        </TableCell>
        <TableCell className="table__icon-box">
          <div className="flex items-center justify-start gap-[10px]">
            <Link href={`/Orders/show-models?orderId=${row.id}`} passHref>
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

            <Link href={`/Orders/add-models?orderId=${row.id}`} passHref>
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

            <button
              type="button"
              className="table__icon delete"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteClick(row.id);
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
                setShowConfirmation(row.id);
              }}
            >
              <i className="fa-solid fa-check"></i>
            </button>
          </div>
        </TableCell>
      </TableRow>
    ));
  };

  // Display a message if no data at all
  if (filteredDeals.length === 0) return <div className="p-4 text-center">No orders found</div>;

  return (
    <>
      <div className="col-span-12">
        <div className="card__wrapper">
          <div className="manaz-common-mat-list w-full table__wrapper table-responsive">
            <OrderTableControls
              searchQuery={searchQuery}
              handleSearchChange={(e) => {
                // Call the material table hook's search handler
                handleSearchChange(e);
                // This will update searchQuery state which is used in our filter effect
              }}
              startDate={startDate}
              endDate={endDate}
              handleDateChange={handleDateChange}
              handleResetDates={handleResetFilters}
              statusFilter={statusFilter}
              handleStatusChange={handleStatusChange}
              partyNameFilter={partyNameFilter}
              handlePartyNameChange={handlePartyNameChange}
              partyNameOptions={partyNameOptions}
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
                            indeterminate={
                              selected.length > 0 &&
                              selected.length < paginatedRows.length
                            }
                            checked={
                              paginatedRows.length > 0 &&
                              selected.length === paginatedRows.length
                            }
                            onChange={(e) =>
                              handleSelectAllClick(
                                e.target.checked,
                                paginatedRows
                              )
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>Order ID</TableCell>
                        <TableCell>Created Date</TableCell>
                        <TableCell>Created By</TableCell>
                        <TableCell>Party Name</TableCell>
                        <TableCell>Product</TableCell>
                        <TableCell>Delivery Date</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Advance Metal</TableCell>
                        <TableCell>Tags</TableCell>
                        <TableCell>Total Weight</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody className="table__body">
                      {renderTableRows()}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Box>
            <Box className="table-search-box mt-[30px]" sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                {filteredDeals.length > 0 ? 
                  `Showing ${Math.min(startIndex + 1, filteredDeals.length)} to ${Math.min(endIndex, filteredDeals.length)} of ${filteredDeals.length} entries` : 
                  'No entries to show'}
                {statusFilter !== 'all' && ` (filtered by ${statusFilter})`}
              </Box>
              {totalPages > 0 ? (
                <Pagination
                  count={totalPages}
                  page={Math.min(page, totalPages)}
                  onChange={(e, value) => handleChangePage(value)}
                  variant="outlined"
                  shape="rounded"
                  className="manaz-pagination-button"
                  showFirstButton
                  showLastButton
                />
              ) : (
                <Box>No pages available</Box>
              )}
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

      {modalDeleteOpen && deleteId && (
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
                            // Refresh data instead of reloading page
                            fetchDealData().then(data => {
                              setDeals(data);
                              setFilteredDeals(data);
                            }).catch(console.error);
                          }, 1500);
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