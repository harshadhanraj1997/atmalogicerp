"use client";

import Link from "next/link";
import React from "react";
import { useRouter } from "next/navigation";
import TaggingTable from "./TaggingTable";

const TaggingMainArea = () => {
  const router = useRouter();

  const handleNewTagging = () => {
    router.push("/Billing/Tagging/new-tagging");
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
                <li className="breadcrumb-item active">Tagging</li>
              </ol>
            </nav>
            <div className="breadcrumb__btn">
              <button 
                onClick={handleNewTagging}
                className="btn btn-primary"
              >
                New Tagging
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
          {/* <DealsSummary /> */}
          {/* <CastingSummary /> */}
          <TaggingTable />
        </div>
      </div>

      {/* -- App side area end -- */}
    </>
  );
};

export default TaggingMainArea;