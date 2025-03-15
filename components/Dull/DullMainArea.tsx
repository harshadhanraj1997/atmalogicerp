"use client";

import Link from "next/link";
import React from "react";
import { useRouter } from "next/navigation";
import DullTable from "./DullTable";
import DullSummary from "./DullSummary";

          const DullMainArea = () => {
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
                <li className="breadcrumb-item active">Polishing</li>
              </ol>
            </nav>
                
          </div>
        </div>
        <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
          {/* Summary section - full width */}
          <div className="col-span-12 mb-6">
            <DullSummary />
          </div>
          {/* Table section - full width */}
          <div className="col-span-12">
            <DullTable />
          </div>
        </div>
      </div>
      {/* -- App side area end -- */}
    </>
  );
};

export default DullMainArea;  