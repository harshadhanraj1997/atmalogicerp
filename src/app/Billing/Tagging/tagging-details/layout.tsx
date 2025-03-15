"use client";

import React, { useState } from "react";
import Sidebar from "@/components/layouts/sidebar/DashBoardSidebar";  // Import the Sidebar component
import Header from "@/components/layouts/header/DashboardHeader";  // Import the Header component
import TaggingDetailsPage from "@/src/app/Billing/Tagging/tagging-details/page"; // Import your OrderFormModal page
import { Button } from "@/components/ui/button";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

     {/* Main Content */}
      <div className="flex flex-col flex-1 w-full overflow-hidden">
        {/* Header */}
        <Header  />

        {/* Main Body */}
        <main className="flex-2 overflow-y-auto p-6 bg-gray-100">
         {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
