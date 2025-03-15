"use client";

import Link from "next/link";
import React from "react";
import { useRouter } from "next/navigation";
import BillingTable from "./Billingtable";

const BillingMainArea = () => {
  const router = useRouter();

  const handleNewBilling = () => {
    router.push("/Billing/Billing/new-billing");
  };

  return (
    <>
      {/* -- App side area start -- */}
      <div className="app__slide-wrapper">
        <div className="breadcrumb__area">
          <div className="breadcrumb__wrapper mb-[25px]">
            <nav>
              <ol className="breadcrumb flex items-center mb-0">
                <li className="breadcrumb-item">
                  <Link href="/">Home</Link>
                </li>
                <li className="breadcrumb-item active">Billing</li>
              </ol>
            </nav>
            <div className="breadcrumb__btn">
              <button 
                onClick={handleNewBilling}
                className="btn btn-primary"
              >
                New Billing
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
          {/* <DealsSummary /> */}
          {/* <CastingSummary /> */}
          <BillingTable />
        </div>
      </div>

      {/* -- App side area end -- */}
    </>
  );
};

export default BillingMainArea;