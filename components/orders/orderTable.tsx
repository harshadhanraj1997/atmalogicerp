/* eslint-disable react-hooks/rules-of-hooks */
"use client";
import React, { useState, useEffect, useReducer, useMemo } from "react";
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
import { appendBezierCurve, mergeLines, numberToString, PDFDocument } from 'pdf-lib';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import OrderTableControls from './OrderTableControls';
import { Podcast, WheatOffIcon, WholeWord } from "lucide-react";
import { measureMemory } from "vm";
import { ppid } from "process";

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
  // All hooks must be at the top level
  const [deals, setDeals] = useState<IDeal[]>([]);
  const [filteredDeals, setFilteredDeals] = useState<IDeal[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [partyNameFilter, setPartyNameFilter] = useState('all');
  const [showConfirmation, setShowConfirmation] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState(false);
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [modalDeleteOpen, setModalDeleteOpen] = useState(false);
  const [editData, setEditData] = useState<IDeal | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Table hook
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
  } = useMaterialTableHook(filteredDeals, 10);

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
    }).catch(console.error);
  }, []);

  // Filter effect
  useEffect(() => {
    const newFilteredDeals = deals.filter(deal => {
      if (statusFilter !== 'all' && 
          deal.status?.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
      if (startDate || endDate) {
        const dealDate = new Date(deal.createdDate).toISOString().split('T')[0];
        if (startDate && dealDate < startDate) return false;
        if (endDate && dealDate > endDate) return false;
      }
      if (partyNameFilter !== 'all' && deal.dealName !== partyNameFilter) {
        return false;
      }
      return true;
    });
    setFilteredDeals(newFilteredDeals);
  }, [deals, startDate, endDate, statusFilter, partyNameFilter]);

  // Handler functions (not hooks, can be after hooks)
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
    setStartDate('');
    setEndDate('');
    setStatusFilter('all');
    setPartyNameFilter('all');
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
    }
  };

  // Handler functions
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
      // If weight range contains a hyphen (e.g., "10-12")
      if (weightRange.includes('-')) {
        const [min, max] = weightRange.split('-').map(w => parseFloat(w.trim()));
        const avgWeight = (min + max) / 2;
        return (avgWeight * quantity).toFixed(2);
      } 
      // If it's a single number
      else {
        const weight = parseFloat(weightRange);
        return (weight * quantity).toFixed(2);
      }
    } catch (error) {
      console.error('Error calculating weight:', error);
      return '0.00';
    }
  };

  // Update your table rows rendering
  const renderTableRows = () => {
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
          {row.weightRange ? calculateTotalWeight(row.weightRange, Number(row.quantity)) : '0.00'}
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

  // If you have a total weight calculation
  const calculateTotalWeightForAllRows = () => {
    return filteredDeals.reduce((total, row) => {
      const weight = parseFloat(calculateTotalWeight(row.weightRange || '0', Number(row.quantity)));
      return total + weight;
    }, 0).toFixed(2);
  };

  if (!paginatedRows.length) return <div>No orders found</div>;

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
            <OrderTableControls
              searchQuery={searchQuery}
              handleSearchChange={handleSearchChange}
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
            <Box className="table-search-box mt-[30px]" sx={{ p: 2 }}>
              <Box>
                {`Showing ${startIndex + 1} to ${Math.min(endIndex, paginatedRows.length)} of ${paginatedRows.length} entries`}
                {statusFilter !== 'all' && ` (filtered by ${statusFilter})`}
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
                            window.location.reload();
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


