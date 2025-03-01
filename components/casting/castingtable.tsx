/* eslint-disable react-hooks/rules-of-hooks */
"use client";
import React, { useState, useEffect } from "react";
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

const CastingTable = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [editData, setEditData] = useState<IDeal | null>(null);
  const [modalDeleteOpen, setModalDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number>(0);
  const [deals, setDeals] = useState<ICasting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [showConfirmation, setShowConfirmation] = useState<number | null>(null);
  const [isApproved, setIsApproved] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showTransferMenu, setShowTransferMenu] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const loadDeals = async () => {
      try {
        setLoading(true);
        const data = await fetchDealData();
        console.log("Fetched Deals:", data);
        setDeals(data);
      } catch (error) {
        console.error("Error loading deals:", error);
        setError("Failed to load deals");
      } finally {
        setLoading(false);
      }
    };

    loadDeals();

  }, []);
  
console.log("Deals State:", deals);
  const {
    order,
    orderBy,
    selected,
    searchQuery,
    filteredRows,
    handleDelete,
    handleRequestSort,
    handleSelectAllClick,
    handleClick,
    handleChangePage,
    handleChangeRowsPerPage,
    handleSearchChange,
  } = useMaterialTableHook<IDeal>(
    deals.filter(deal => {
      try {
        // Log the actual dates we're working with
        console.log('Filtering Casting:', {
          castingId: deal.id,
          castingDate: deal.issuedDate,
          startDate,
          endDate
        });

        // If no dates selected, show all records
        if (!startDate && !endDate) {
          return true;
        }

        // Parse the casting date and normalize to local midnight
        const castingDate = new Date(deal.issuedDate);
        const castingDateStr = castingDate.toISOString().split('T')[0]; // YYYY-MM-DD format

        // Apply start date filter if exists
        if (startDate) {
          if (castingDateStr < startDate) {
            console.log(`Casting ${deal.id} excluded: before start date`);
            return false;
          }
        }

        // Apply end date filter if exists
        if (endDate) {
          if (castingDateStr > endDate) {
            console.log(`Casting ${deal.id} excluded: after end date`);
            return false;
          }
        }

        console.log(`Casting ${deal.id} included in filter`, {
          castingDateStr,
          startDate,
          endDate,
          isAfterStart: !startDate || castingDateStr >= startDate,
          isBeforeEnd: !endDate || castingDateStr <= endDate
        });
        
        return true;
      } catch (error) {
        console.error('Date filtering error for casting:', deal.id, error);
        return true; // Include on error
      }
    }), 
    10
  );

  const handleDateChange = (type: 'start' | 'end', value: string) => {
    if (type === 'start') {
      setStartDate(value);
    } else {
      setEndDate(value);
    }
  };

  const handleResetDates = () => {
    setStartDate('');
    setEndDate('');
    console.log('Dates reset');
  };

  // Add debug logging for filtered results
  useEffect(() => {
    console.log('Date Filter Debug:', {
      totalCastings: deals.length,
      filteredCastings: filteredRows.length,
      startDate,
      endDate,
      sampleDates: deals.slice(0, 3).map(d => ({
        id: d.id,
        date: new Date(d.issuedDate).toISOString().split('T')[0]
      }))
    });
  }, [deals, filteredRows, startDate, endDate]);

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

  const startIndex = page * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedRows = deals.slice(startIndex, endIndex);

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

  if (loading) return <div>Loading deals...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <>
      <div className="col-span-12">
        <div className="card__wrapper">
          <div className="manaz-common-mat-list w-full table__wrapper table-responsive">
            <TableControls
              rowsPerPage={rowsPerPage}
              searchQuery={searchQuery}
              handleChangeRowsPerPage={handleChangeRowsPerPage}
              handleSearchChange={handleSearchChange}
              startDate={startDate}
              endDate={endDate}
              handleDateChange={handleDateChange}
              handleResetDates={handleResetDates}
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
                              selected.length < filteredRows.length
                            }
                            checked={
                              filteredRows.length > 0 &&
                              selected.length === filteredRows.length
                            }
                            onChange={(e) =>
                              handleSelectAllClick(
                                e.target.checked,
                                filteredRows
                              )
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>Casting Id</TableCell>
                        <TableCell>Issued Weight</TableCell>
                        <TableCell>Received Weight</TableCell>
                        <TableCell>Issued Date</TableCell>
                        <TableCell>Received Date</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Casting Loss</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody className="table__body">
                      {paginatedRows.length > 0 ? (
                        paginatedRows.map((deal, index) => {
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
                              <TableCell>{deal.receivedWeight}</TableCell>
                              <TableCell>{deal.issuedDate}</TableCell>
                              <TableCell>{deal.receivedDate}</TableCell>
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

                                  <div className="relative">
                                    <select
                                      className="form-select text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                      onChange={(e) => {
                                        e.preventDefault();
                                        const selectedPath = departments.find(dept => dept.value === e.target.value)?.path;
                                        if (selectedPath) {
                                          window.location.href = `${selectedPath}?castingId=${deal.id}`;
                                        }
                                      }}
                                      value=""
                                    >
                                      <option value="" disabled>Transfer to</option>
                                      {departments.map((dept) => (
                                        <option key={dept.value} value={dept.value}>
                                          Transfer to {dept.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
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
                {`Showing ${(page - 1) * rowsPerPage + 1} to ${Math.min(
                  page * rowsPerPage,
                  filteredRows.length
                )} of ${filteredRows.length} entries`}
              </Box>
              <Pagination
                count={Math.ceil(filteredRows.length / rowsPerPage)}
                page={page}
                onChange={(e, value) => handleChangePage(value)}
                variant="outlined"
                shape="rounded"
                className="manaz-pagination-button"
              />
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
export default CastingTable