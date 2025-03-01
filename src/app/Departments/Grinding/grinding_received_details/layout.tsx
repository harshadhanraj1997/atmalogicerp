"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/layouts/sidebar/DashBoardSidebar";
import Header from "@/components/layouts/header/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import GrindingDetailsPage from "./page";



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
        <main className="flex-2 overflow-y-auto p-6 bg-gray-100">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;