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
import { toast } from 'react-hot-toast';
import { Checkbox, Button } from "@mui/material";
import TableControls from "@/components/elements/SharedInputs/TableControls";
import DeleteModal from "@/components/common/DeleteModal";
import Link from 'next/link';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useTablePhaseHook,
  useTableStatusHook,
} from "@/hooks/use-condition-class";

interface IPlating {
  Id: string;
  Name: string;
  Issued_Date__c: string;
  Issued_Weight__c: number;
  Received_Weight__c: number;
  Received_Date__c: string;
  Status__c: string;
  Plating_Loss__c: number;
}

interface Department {
  value: string;
  label: string;
  path: string;
}

const departments: Department[] = [
  { value: 'grinding', label: 'Grinding', path: '/Departments/Grinding/add_grinding_details' },
  { value: 'setting', label: 'Setting', path: '/Departments/Setting/add_setting_details' },
  { value: 'polish', label: 'Polish', path: '/Departments/Polish/add_polish_details' },
  { value: 'dull', label: 'Dull', path: '/Departments/Dull/add_dull_details' },
  { value: 'plating', label: 'Plating', path: '/Departments/Plating/add_plating_details' },
  {value: "cutting", label:"Cutting", path: '/Departments/Cutting/add_cutting_details'}

];

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

const getStatusClass = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'pending':
      return 'bg-warning';
    case 'finished':
      return 'bg-success';
    default:
      return 'bg-secondary';
  }
};

const PlatingTable = () => {
  const [deals, setDeals] = useState<IPlating[]>([]);
  const [filteredDeals, setFilteredDeals] = useState<IPlating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [modalDeleteOpen, setModalDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number>(0);
  const [showConfirmation, setShowConfirmation] = useState<number | null>(null);
  const [isApproved, setIsApproved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    order,
    orderBy,
    selected,
    filteredRows,
    handleDelete,
    handleRequestSort,
    handleSelectAllClick,
    handleClick,
    handleChangePage,
    handleChangeRowsPerPage,
  } = useMaterialTableHook<IPlating>(deals || [], 10);

  useEffect(() => {
    const loadDeals = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${apiBaseUrl}/api/plating`);
        const result = await response.json();
        
        if (result.success) {
          const data = result.data || [];
          setDeals(data);
          setFilteredDeals(data);
        } else {
          console.error("Failed to fetch plating data:", result.message);
          setError("Failed to fetch plating data");
          setDeals([]);
          setFilteredDeals([]);
        }
      } catch (error) {
        console.error("Error loading plating details:", error);
        setError("Failed to load plating details");
        setDeals([]);
        setFilteredDeals([]);
      } finally {
        setLoading(false);
      }
    };

    loadDeals();
  }, []);

  useEffect(() => {
    let filtered = [...deals];

    if (searchQuery) {
      filtered = filtered.filter(deal => 
        deal.Name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (startDate) {
      const startDateTime = new Date(startDate);
      startDateTime.setHours(0, 0, 0, 0);
      filtered = filtered.filter(deal => 
        new Date(deal.Issued_Date__c).getTime() >= startDateTime.getTime()
      );
    }

    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      filtered = filtered.filter(deal => 
        new Date(deal.Issued_Date__c).getTime() <= endDateTime.getTime()
      );
    }

    setFilteredDeals(filtered);
  }, [deals, searchQuery, startDate, endDate]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleDateChange = (type: 'start' | 'end', value: string) => {
    if (type === 'start') {
      setStartDate(value);
    } else {
      setEndDate(value);
    }
  };

  const handleApproveOrder = async (orderId: string) => {
    try {
      setIsSubmitting(true);
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
        window.location.reload();
      } else {
        toast.error(result.message || 'Failed to approve order');
      }
    } catch (error) {
      console.error('Error approving order:', error);
      toast.error('Failed to approve order');
    } finally {
      setIsSubmitting(false);
      setShowConfirmation(null);
    }
  };

  const startIndex = page * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedRows = filteredDeals.slice(startIndex, endIndex);

  if (loading) {
    return <div className="p-6">Loading plating details...</div>;
  }

  if (error) {
    return <div className="p-6">Error: {error}</div>;
  }

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
            />
            <Box sx={{ width: "100%" }} className="table-responsive">
              <Paper sx={{ width: "100%", mb: 2 }}>
                <TableContainer className="table mb-[20px] hover multiple_tables w-full">
                  <Table aria-labelledby="tableTitle" className="whitespace-nowrap">
                    <TableHead>
                      <TableRow className="table__title">
                        <TableCell padding="checkbox">
                          <Checkbox
                            className="custom-checkbox checkbox-small"
                            color="primary"
                            indeterminate={selected.length > 0 && selected.length < filteredRows.length}
                            checked={filteredRows.length > 0 && selected.length === filteredRows.length}
                            onChange={(e) => handleSelectAllClick(e.target.checked, filteredRows)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>Plating Id</TableCell>
                        <TableCell>Issued Weight</TableCell>
                        <TableCell>Received Weight</TableCell>
                        <TableCell>Issued Date</TableCell>
                        <TableCell>Received Date</TableCell>
                        <TableCell>Order Id</TableCell>
                        <TableCell>Product</TableCell>
                        <TableCell>Quantity</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Plating Loss</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody className="table__body">
                      {paginatedRows.length > 0 ? (
                        paginatedRows.map((deal, index) => (
                          <TableRow
                            key={deal.Id}
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
                            <TableCell>{deal.Name}</TableCell>
                            <TableCell>{deal.Issued_Weight__c}</TableCell>
                            <TableCell>{deal.Returned_Weight__c}</TableCell>
                            <TableCell>{deal.Issued_Date__c || ''}</TableCell>
                            <TableCell>{deal.Received_Date__c || ''}</TableCell>
                            <TableCell>{deal.Order_Id__c || ' '}</TableCell>
                            <TableCell>{deal.Product__c || ''}</TableCell>
                            <TableCell>{deal.Quantity__c || ''}</TableCell>
                            <TableCell>
                              <span className={`bd-badge ${getStatusClass(deal.Status__c)}`}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  color: 'white',
                                  fontSize: '12px',
                                  fontWeight: '500'
                                }}
                              >
                                {deal.Status__c}
                              </span>
                            </TableCell>
                            <TableCell>{deal.Plating_Loss__c}</TableCell>
                            <TableCell className="table__icon-box">
                              <div className="flex items-center justify-start gap-[10px]">
                                <Link href={`/Departments/Plating/show_plating_details?platingId=${deal.Name}`} passHref>
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

                                {deal.Status__c?.toLowerCase() !== 'finished' ? (
                                  <Link href={`/Departments/Plating/plating_received_details?platingId=${deal.Name}`} passHref>
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
                                    handleDelete(deal.Id);
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
                                    setShowConfirmation(deal.Id);
                                  }}
                                >
                                  <i className="fa-solid fa-check"></i>
                                </button>

                                <Select
                                  onValueChange={(value) => {
                                    const dept = departments.find(d => d.value === value);
                                    if (dept) {
                                      window.location.href = `${dept.path}?platingId=${deal.Name}`;
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
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={9} align="center">
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
                {`Showing ${startIndex + 1} to ${Math.min(endIndex, filteredDeals.length)} of ${filteredDeals.length} entries`}
              </Box>
              <Pagination
                count={Math.ceil(filteredDeals.length / rowsPerPage)}
                page={page + 1}
                onChange={(e, value) => handleChangePage(value - 1)}
                variant="outlined"
                shape="rounded"
                className="manaz-pagination-button"
              />
            </Box>
          </div>
        </div>
      </div>

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
                  Are you sure you want to approve this plating? This action cannot be undone.
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
                    onClick={() => handleApproveOrder(showConfirmation)}
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
};

export default PlatingTable;
