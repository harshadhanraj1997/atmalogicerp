"use client";
import React from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import { dealsDetailsStatePropsType } from "@/interface/common.interface";

const DealsDetailsModal = ({ open, setOpen, editData }: dealsDetailsStatePropsType) => {
  const handleToggle = () => setOpen(!open);

  return (
    <>
      <Dialog open={open} onClose={handleToggle} fullWidth maxWidth="md">
        <DialogTitle>
          <div className="flex justify-between">
            <h5 className="modal-title">Deal Details</h5>
            <button
              onClick={handleToggle}
              type="button"
              className="bd-btn-close"
            >
              <i className="fa-solid fa-xmark-large"></i>
            </button>
          </div>
        </DialogTitle>
        <DialogContent className="common-scrollbar overflow-y-auto">
          <div className="card__wrapper">
            <div className="grid grid-cols-12 gap-y-5">
              <div className="col-span-12">
                <div className="label__content-wrapper">
                  <span className="label__subtitle">Order ID</span>
                  <h6 className="label__title">{editData?.orderId}</h6>
                </div>
              </div>
              <div className="col-span-12 lg:col-span-6">
                <div className="label__content-wrapper">
                  <span className="label__subtitle">Client Name</span>
                  <h6 className="label__title">{editData?.clientName}</h6>
                </div>
              </div>
              <div className="col-span-12 lg:col-span-6">
                <div className="label__content-wrapper">
                  <span className="label__subtitle">Advance Metal</span>
                  <h6 className="label__title">{editData?.advanceMetal}</h6>
                </div>
              </div>
              <div className="col-span-12 md:col-span-6">
                <div className="label__content-wrapper">
                  <span className="label__subtitle">Advance Metal Purity</span>
                  <h6 className="label__title">{editData?.advanceMetalPurity}</h6>
                </div>
              </div>
              <div className="col-span-12 md:col-span-6">
                <div className="label__content-wrapper">
                  <span className="label__subtitle">Balance</span>
                  <h6 className="label__title">{editData?.balance}</h6>
                </div>
              </div>
              <div className="col-span-12 md:col-span-6">
                <div className="label__content-wrapper">
                  <span className="label__subtitle">Order Status</span>
                  <h6 className="label__title">{editData?.status}</h6>
                </div>
              </div>
              <div className="col-span-12 md:col-span-6">
                <div className="label__content-wrapper">
                  <span className="label__subtitle">Department</span>
                  <h6 className="label__title">{editData?.department}</h6>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DealsDetailsModal;
