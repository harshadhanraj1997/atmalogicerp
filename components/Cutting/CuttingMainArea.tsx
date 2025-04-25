"use client";

import Link from "next/link";
import React from "react";
import { useRouter } from "next/navigation";
import CuttingTable from "./CuttingTable";
import CuttingSummary from "./CutiingSummary";
import { Button } from "@/components/ui/button";

const CuttingMainArea = () => {
  const router = useRouter();

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
                <li className="breadcrumb-item active">Cutting</li>
              </ol>
            </nav>
            <div className="breadcrumb__btn">
              <Link 
                href="/Departments/Cutting/"
                className="btn btn-primary"
              >
                Cutting Back Order
              </Link>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
          {/* Summary section - full width */}
          <div className="col-span-12 mb-6">
            <CuttingSummary />
          </div>
          {/* Table section - full width */}
          <div className="col-span-12">
            <CuttingTable />
          </div>
        </div>
      </div>
      {/* -- App side area end -- */}
    </>
  );
};

export default CuttingMainArea;
