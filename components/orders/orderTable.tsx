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

const DealsTable = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [editData, setEditData] = useState<IDeal | null>(null);
  const [modalDeleteOpen, setModalDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number>(0);
  const [deals, setDeals] = useState<IDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

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
  } = useMaterialTableHook<IDeal | any>(deals, 10);

  const handlePrint = (pdfUrl: string | null) => {
    if (pdfUrl) {
      // Convert URL to a file and open it
      window.open(pdfUrl, "_blank");
    } else {
      alert("No PDF available to print.");
    }
  };

  const startIndex = page * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedRows = deals.slice(startIndex, endIndex);

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
                        <TableCell>Party Name</TableCell>
                        <TableCell>Delivery Date</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Advance Metal</TableCell>
                        <TableCell>Tags</TableCell>
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
                              <TableCell>{deal.dealName}</TableCell>
                              <TableCell>{deal.expectedEndDate}</TableCell>
                              <TableCell>
                                <span className={`bd-badge ${stausClass}`}>
                                  {" "}
                                  {deal.status}
                                </span>
                              </TableCell>
                              <TableCell>{deal.AdvanceMetal}</TableCell>
                              <TableCell>
                                <span className="tag-badge">{deal.tags}</span>
                              </TableCell>
                              <TableCell className="table__icon-box">
                                <div className="flex items-center justify-start gap-[10px]">
                                  <button
                                    type="button"
                                    className="table__icon download"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditData(deal);
                                      setDetailsModalOpen(true);
                                    }}
                                  >
                                    <i className="fa-regular fa-eye"></i>
                                  </button>
                                  <button
                                    type="button"
                                    className="table__icon edit"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditData(deal);
                                      setModalOpen(true);
                                    }}
                                  >
                                    <i className="fa-sharp fa-light fa-pen"></i>
                                  </button>
                                  <button
                                    type="button"
                                    className="table__icon print"
                                    style={{
                                      backgroundColor: 'green',
                                      color: 'white',
                                      borderRadius: '4px',
                                      padding: '5px',
                                    }}
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        const response = await fetch(deal.clientSheetPdf || '');
                                        const arrayBuffer = await response.arrayBuffer();
                                        console.log("PDF Data:", arrayBuffer); // Log to check data

                                        const pdfDoc = await PDFDocument.load(arrayBuffer);
                                        
                                        // You can manipulate the PDF here if needed

                                        const pdfBytes = await pdfDoc.save();
                                        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                                        const url = URL.createObjectURL(blob);
                                        window.open(url, "_blank");
                                      } catch (error) {
                                        console.error("Error processing PDF:", error);
                                        alert("Failed to open PDF.");
                                      }
                                    }}
                                  >
                                    <i className="fa-solid fa-print"></i>
                                  </button>
                                  <button
                                    className="removeBtn table__icon delete"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteId(index);
                                      setModalDeleteOpen(true);
                                    }}
                                  >
                                    <i className="fa-regular fa-trash"></i>
                                  </button>
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
    </>
  );
};

export default DealsTable;
