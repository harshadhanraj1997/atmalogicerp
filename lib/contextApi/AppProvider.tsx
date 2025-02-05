"use client";

import React, { createContext, useState, useEffect } from "react";
import { AppContextType } from "@/interface/common.interface";

export const AppContext = createContext<AppContextType | undefined>(undefined);
const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [scrollDirection, setScrollDirection] = useState("up");
  const [sideMenuOpen, setSideMenuOpen] = useState<boolean>(false);
  const [isCollapse, setIsCollapse] = useState<boolean>(false);

  const [theme, setTheme] = useState(() => {
    // Check for saved theme in localStorage
    const savedTheme = localStorage.getItem("theme");

    // Use saved theme if available, otherwise check browser preference, else default to 'light'
    if (savedTheme) {
      return savedTheme;
    }

    // Browser's preferred color scheme
    const prefersDarkMode = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    return prefersDarkMode ? "dark" : "light";
  });

  useEffect(() => {
    const root = document.documentElement;

    // Ensure only the current theme's class is applied
    root.classList.toggle("light", theme === "light");
    root.classList.toggle("dark", theme === "dark");

    // Save the theme in localStorage
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  //sidebar open
  const sidebarHandle = () => {
    setIsCollapse(!isCollapse);
  };

  //dark and white

  // Update localStorage whenever `dark` changes

  const contextValue: AppContextType = {
    scrollDirection,
    setScrollDirection,
    sideMenuOpen,
    setSideMenuOpen,
    sidebarHandle,
    isCollapse,
    setIsCollapse,
    theme,
    setTheme,
    toggleTheme,
  };

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
};

export default AppProvider;
