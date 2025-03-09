"use client";

import Link from "next/link";
import React from "react";
import { useRouter } from "next/navigation";
import DealsTable from "./orderTable";
import DealsSummary from "./orderSummary";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const DealsMainArea = () => {
  const router = useRouter();

  const handleAddOrder = async () => {
    try {
      console.log('Navigating to add order page...');
      await router.push('/Orders/add-order');
    } catch (error) {
      console.error('Navigation error:', error);
    }
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
                <li className="breadcrumb-item active">Orders</li>
              </ol>
            </nav>
            <div className="breadcrumb__btn">
              <Button 
                onClick={() => window.location.href = '/Orders/add-order'}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90"
                type="button"
              >
                <Plus className="h-4 w-4" /> Add Order
              </Button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
         {/* <DealsSummary /> */}
          <DealsTable />
        </div>
      </div>

      {/* -- App side area end -- */}
    </>
  );
};

export default DealsMainArea;