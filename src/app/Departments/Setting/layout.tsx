"use client";

import React, { useState } from "react";
import Sidebar from "@/components/layouts/sidebar/DashBoardSidebar";
import Header from "@/components/layouts/header/DashboardHeader";
import SettingForm from "@/src/app/Departments/Setting/page";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex flex-col flex-1 w-full overflow-hidden">
        {/* Header */}
        <Header />

        {/* Main Body */}
        <main className="flex-1 w-full h-full overflow-y-auto p-6 bg-gray-100">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;