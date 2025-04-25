"use client";

import Link from "next/link";
import React from "react";
import { useRouter } from "next/navigation";
import PlatingTable from "./PlatingTable";
import PlatingSummary from "./PlatingSummary";
import { Button } from "@/components/ui/button";

const PlatingMainArea = () => {
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
                <li className="breadcrumb-item active">Plating</li>
              </ol>
            </nav>
            <div className="breadcrumb__btn">
              <Link 
                href="/Departments/Plating/"
                className="btn btn-primary"
              >
                Plating Back Order
              </Link>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
          {/* Summary section - full width */}
          <div className="col-span-12 mb-6">
            <PlatingSummary />
          </div>
          {/* Table section - full width */}
          <div className="col-span-12">
            <PlatingTable />
          </div>
        </div>
      </div>
      {/* -- App side area end -- */}
    </>
  );
};

export default PlatingMainArea;
