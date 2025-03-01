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

export default function DealsTable() {
  const [modalOpen, setModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [editData, setEditData] = useState<IDeal | null>(null);
  const [modalDeleteOpen, setModalDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number>(0);
  const [deals, setDeals] = useState<IDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState<number | null>(null);
  const [isApproved, setIsApproved] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const loadDeals = async () => {
      try {
        setLoading(true);
        const data = await fetchDealData();
        console.log("Fetched Deals:", data);
        const sortedDeals = [...data].sort((a, b) => {
          const dateA = new Date(a.createdDate).getTime();
          const dateB = new Date(b.createdDate).getTime();
          return dateB - dateA;
        });
        setDeals(sortedDeals);
      } catch (error) {
        console.error("Error loading deals:", error);
        setError("Failed to load deals");
      } finally {
        setLoading(false);
      }
    };

    loadDeals();
  }, []);

  const handleDateChange = (type: 'start' | 'end', value: string) => {
    if (type === 'start') {
      setStartDate(value);
    } else {
      setEndDate(value);
    }
  };

  const {
    paginatedRows,
    page,
    rowsPerPage,
    totalPages,
    startIndex,
    endIndex,
    filteredRows,
    order,
    orderBy,
    selected,
    searchQuery,
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
        console.log('Filtering Deal:', {
          dealId: deal.id,
          dealDate: deal.createdDate,
          startDate,
          endDate
        });

        // If no dates selected, show all records
        if (!startDate && !endDate) {
          return true;
        }

        // Parse the deal date and normalize to local midnight
        const dealDate = new Date(deal.createdDate);
        const dealDateStr = dealDate.toISOString().split('T')[0]; // YYYY-MM-DD format

        // Apply start date filter if exists
        if (startDate) {
          if (dealDateStr < startDate) {
            console.log(`Deal ${deal.id} excluded: before start date`);
            return false;
          }
        }

        // Apply end date filter if exists
        if (endDate) {
          if (dealDateStr > endDate) {
            console.log(`Deal ${deal.id} excluded: after end date`);
            return false;
          }
        }

        console.log(`Deal ${deal.id} included in filter`, {
          dealDateStr,
          startDate,
          endDate,
          isAfterStart: !startDate || dealDateStr >= startDate,
          isBeforeEnd: !endDate || dealDateStr <= endDate
        });
        
        return true;
      } catch (error) {
        console.error('Date filtering error for deal:', deal.id, error);
        return true; // Include on error
      }
    }), 
    10
  );

  // Add debug logging for filtered results
  useEffect(() => {
    console.log('Date Filter Debug:', {
      totalDeals: deals.length,
      filteredDeals: filteredRows.length,
      startDate,
      endDate,
      sampleDates: deals.slice(0, 3).map(d => ({
        id: d.id,
        date: new Date(d.createdDate).toISOString().split('T')[0]
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

  console.log('Filtered Deals:', {
    total: deals.length,
    filtered: filteredRows.length,
    startDate,
    endDate
  });

  const handleResetDates = () => {
    setStartDate('');
    setEndDate('');
    console.log('Dates reset');
  };

  if (loading) return <div>Loading deals...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!filteredRows.length) return <div>No orders found</div>;

  const columns: Column[] = [
    {
      id: 'createdDate',
      label: 'Created Date',
      numeric: false,
      format: (value: string) => {
        return new Date(value).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
    },
    {
      id: 'createdBy',
      label: 'Created By',
      numeric: false
    },
    {
      id: 'purity',
      label: 'Purity',
      numeric: false
    },
    {
      id: 'remarks',
      label: 'Remarks',
      numeric: false
    },
  ];

  return (
    <>
      <div className="col-span-12">
        <div className="card__wrapper">
          <div className="manaz-common-mat-list w-full table__wrapper table-responsive">
            <TableControls
              searchQuery={searchQuery}
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
                        <TableCell>Order ID</TableCell>
                        <TableCell>Created Date</TableCell>
                        <TableCell>Created By</TableCell>
                        <TableCell>Party Name</TableCell>
                        <TableCell>Delivery Date</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Advance Metal</TableCell>
                        <TableCell>Tags</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody className="table__body">
                      {paginatedRows.map((deal, index) => {
                        const stausClass = useTableStatusHook(deal?.status);
                        const phaseClass = useTablePhaseHook(deal?.phase);
                        return (
                          <TableRow
                            key={deal.id}
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
                            <TableCell>{deal.id}</TableCell>
                            <TableCell>
                              {new Date(deal.createdDate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </TableCell>
                            <TableCell>{deal.createdBy}</TableCell>
                            <TableCell>{deal.dealName}</TableCell>
                            <TableCell>{deal.expectedEndDate}</TableCell>
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
                            <TableCell>{deal.AdvanceMetal}</TableCell>
                            <TableCell>
                              <span className="tag-badge">{deal.tags}</span>
                            </TableCell>
                            <TableCell className="table__icon-box">
                              <div className="flex items-center justify-start gap-[10px]">
                                <Link href={`/Orders/show-models?orderId=${deal.id}`} passHref>
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

                                <Link href={`/Orders/add-models?orderId=${deal.id}`} passHref>
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
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Box>
            <Box className="table-search-box mt-[30px]" sx={{ p: 2 }}>
              <Box>
                {`Showing ${startIndex + 1} to ${Math.min(endIndex, filteredRows.length)} of ${filteredRows.length} entries`}
              </Box>
              <Pagination
                count={totalPages}
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
