"use client";

import Link from "next/link";
import React from "react";
import { useRouter } from "next/navigation";
import DullTable from "./DullTable";

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
                <li className="breadcrumb-item active">Setting</li>
              </ol>
            </nav>
            
          </div>
        </div>
        <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
          {/* <DealsSummary /> */}
          {/* <CastingSummary /> */}
          <DullTable />
        </div>
      </div>

      {/* -- App side area end -- */}
    </>
  );
};

export default DullMainArea;