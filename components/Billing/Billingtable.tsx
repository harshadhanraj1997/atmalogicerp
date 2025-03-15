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
import { Billing } from "@/interface/table.interface";

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
import TableControls from "@/components/Tagging/TaggingTableControl";
import DeleteModal from "@/components/common/DeleteModal";
import { PDFDocument } from 'pdf-lib';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { fetchBillingData } from "@/data/crm/billing-data";
import * as XLSX from 'xlsx';
import BillingTableControls from "./BillingTableControls";
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

const getUniqueParties = (deals: Billing[]) => {
  const uniqueParties = new Set<string>();
  deals.forEach(deal => {
    if (deal.PartyName && deal.PartyName.trim()) {
      uniqueParties.add(deal.PartyName);
    }
  });
  return Array.from(uniqueParties);
};

export default function BillingTable() {
  const [modalOpen, setModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [editData, setEditData] = useState<Billing | null>(null);
  const [modalDeleteOpen, setModalDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number>(0);
  const [deals, setDeals] = useState<Billing[]>([]);
  const [filteredDeals, setFilteredDeals] = useState<Billing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [showConfirmation, setShowConfirmation] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showTransferMenu, setShowTransferMenu] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedParty, setSelectedParty] = useState('all');

  useEffect(() => {
    const loadDeals = async () => {
      try {
        setLoading(true);
        const data = await fetchBillingData();
        console.log("Raw Billing Data from API:", data);
        setDeals(data);
        setFilteredDeals(data);
      } catch (error) {
        console.error("Error loading deals:", error);
        setError("Failed to load deals");
      } finally {
        setLoading(false);
      }
    };

    loadDeals();
  }, []);
  
  console.log("Current Deals State:", deals);
  console.log("Current Filtered Deals:", filteredDeals);
  console.log("Selected Party:", selectedParty);

  useEffect(() => {
    const newFilteredDeals = deals.filter(deal => {
      try {
        console.log("Filtering deal:", deal);
        // Party filter
        if (selectedParty !== 'all' && 
            deal.PartyName !== selectedParty) {
          console.log("Deal filtered out by party:", deal.PartyName);
          return false;
        }

        // Date filter
        if (startDate || endDate) {
          const dealDate = new Date(deal.createdDate).toISOString().split('T')[0];
          console.log("Deal date:", dealDate, "Start:", startDate, "End:", endDate);
          if (startDate && dealDate < startDate) return false;
          if (endDate && dealDate > endDate) return false;
        }

        // Search filter
        if (searchQuery) {
          const searchLower = searchQuery.toLowerCase();
          console.log("Searching:", searchLower, "in:", deal.id, deal.PartyName);
          return (
            deal.id.toLowerCase().includes(searchLower) ||
            deal.PartyName.toLowerCase().includes(searchLower)
          );
        }

        return true;
      } catch (error) {
        console.error('Filtering error for deal:', deal, error);
        return true;
      }
    });
    console.log("New filtered deals:", newFilteredDeals);
    setFilteredDeals(newFilteredDeals);
  }, [deals, startDate, endDate, selectedParty, searchQuery]);

  const handleDateChange = (type: 'start' | 'end', value: string) => {
    if (type === 'start') setStartDate(value);
    else setEndDate(value);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    setSelectedParty('all');
  };

  const {
    order,
    orderBy,
    selected,
    handleDelete,
    handleRequestSort,
    handleSelectAllClick,
    handleClick,
    handleChangePage,
    handleChangeRowsPerPage,
  } = useMaterialTableHook(filteredDeals, 10);

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
                <BillingTableControls
              searchQuery={searchQuery}
              handleSearchChange={handleSearchChange}
              startDate={startDate}
              endDate={endDate}
              handleDateChange={handleDateChange}
              handleResetFilters={handleResetFilters}
              selectedParty={selectedParty}
              handlePartyChange={setSelectedParty}
              data={deals}
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
                        <TableCell>Billing Id</TableCell>
                        <TableCell>Party Name</TableCell>
                        <TableCell>Created Date</TableCell>
                        <TableCell>Total Fine Weight</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody className="table__body">
                      {paginatedRows.length > 0 ? (
                        paginatedRows.map((deal, index) => {
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
                              <TableCell>{deal.PartyName}</TableCell>
                              <TableCell>{deal.createdDate}</TableCell>
                              <TableCell>{deal.totalFineWeight}</TableCell>
                             
                              <TableCell className="table__icon-box">
                                <div className="flex items-center justify-start gap-[10px]">
                                { /* <Link href={`/Billing/Billing/billing-details?billingId=${deal.id}`} passHref>
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
                                  </Link>*/}

                                  {deal.DeliveryChallanUrl && (
                                    <button
                                      type="button"
                                      className="table__icon pdf"
                                      style={{
                                        display: 'inline-block',
                                        backgroundColor: '#ff0000',
                                        color: 'white',
                                        borderRadius: '4px',
                                        padding: '5px',
                                        border: 'none',
                                        cursor: 'pointer',
                                      }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(deal.DeliveryChallanUrl, '_blank');
                                      }}
                                      title="Download Delivery Challan"
                                    >
                                      <i className="fa-solid fa-file-pdf"></i>
                                    </button>
                                  )}

                                  {deal.TaxInvoiceUrl && (
                                    <button
                                      type="button"
                                      className="table__icon excel"
                                      style={{
                                        display: 'inline-block',
                                        backgroundColor: '#217346',
                                        color: 'white',
                                        borderRadius: '4px',
                                        padding: '5px',
                                        border: 'none',
                                        cursor: 'pointer',
                                      }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(deal.TaxInvoiceUrl, '_blank');
                                      }}
                                      title="Download Tax Invoice"
                                    >
                                      <i className="fa-solid fa-file-pdf"></i>
                                    </button>
                                  )}

                                 {/* <button
                                    type="button"
                                    className="table__icon delete"
                                    style={{
                                      display: 'inline-block',
                                      backgroundColor: '#dc3545',
                                      color: 'white',
                                      borderRadius: '4px',
                                      padding: '5px',
                                      border: 'none',
                                      cursor: 'pointer',
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(deal.id);
                                    }}
                                    title="Delete"
                                  >
                                    <i className="fa-solid fa-trash"></i>
                                  </button>
                                  */}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} align="center">
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
                  filteredDeals.length
                )} of ${filteredDeals.length} entries`}
              </Box>
              <Pagination
                count={Math.ceil(filteredDeals.length / rowsPerPage)}
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


