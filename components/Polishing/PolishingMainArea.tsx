"use client";

import Link from "next/link";
import React from "react";
import { useRouter } from "next/navigation";
import PolishingTable from "./PolishingTable";
import PolishingSummary from "./PolishingSummary";
import { Button } from "@/components/ui/button";
import { Plus, FileDown, FileUp } from "lucide-react";

const PolishingMainArea = () => {
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
            
            {/* Action Buttons */}
            <div className="flex items-center gap-4 mt-4">
              
            

              <Button
                onClick={() => router.push('/Departments/Polishing/')}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                Polishing Backorder
              </Button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
          {/* Summary section - full width */}
          <div className="col-span-12 mb-6">
            <PolishingSummary />
          </div>
          {/* Table section - full width */}
          <div className="col-span-12">
            <PolishingTable />
          </div>
        </div>
      </div>
      {/* -- App side area end -- */}
    </>
  );
};

export default PolishingMainArea;  