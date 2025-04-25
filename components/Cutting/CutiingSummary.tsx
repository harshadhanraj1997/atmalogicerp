import React, { useState, useEffect } from "react";
import SummarySingleCard from "@/components/common/SummarySingleCard";
import fetchcuttingData from "@/data/crm/cutting-data"; 
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { toast } from "react-hot-toast";

// Updated interface to match actual data structure
interface ICutting {
  id: string;
  issuedDate: string;
  issuedWeight: number;
  receivedDate: string;
  returnedWeight: number;
  CuttinfLoss: number; // Note: there's a typo in your data "CuttinfLoss" instead of "CuttingLoss"
  status?: string;
}

const CuttingSummary: React.FC = () => {
  const [cuttingData, setCuttingData] = useState<ICutting[]>([]);
  const [filteredData, setFilteredData] = useState<ICutting[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dateRange, setDateRange] = useState<string>("month");
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState<boolean>(false);

  // Fetch cutting data
  useEffect(() => {
    const getData = async () => {
      try {
        setLoading(true);
        const data = await fetchcuttingData();
        console.log('[Cutting Summary] Fetched data:', data);
        setCuttingData(data);
        filterDataByDateRange(data, dateRange);
      } catch (error) {
        console.error("Error fetching cutting data:", error);
        toast.error("Failed to load cutting data");
        setCuttingData([]);
        setFilteredData([]);
      } finally {
        setLoading(false);
      }
    };

    getData();
  }, []);

  // Filter data when date range changes
  useEffect(() => {
    filterDataByDateRange(cuttingData, dateRange);
  }, [dateRange, customStartDate, customEndDate, cuttingData]);

  // Function to filter data by date range
  const filterDataByDateRange = (data: ICutting[], range: string) => {
    if (!data || !data.length) {
      console.log('No data to filter');
      setFilteredData([]);
      return;
    }

    console.log('Filtering data:', { range, dataLength: data.length });

    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (range) {
      case "day":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        break;
      case "week":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case "custom":
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate.getFullYear(), customStartDate.getMonth(), customStartDate.getDate(), 0, 0, 0, 0);
          endDate = new Date(customEndDate.getFullYear(), customEndDate.getMonth(), customEndDate.getDate(), 23, 59, 59, 999);
        } else {
          console.log('Missing custom date range');
          return;
        }
        break;
      default:
        console.log('Setting all data');
        setFilteredData(data);
        return;
    }

    console.log('Date range:', { 
      startDate: startDate.toISOString(), 
      endDate: endDate.toISOString() 
    });
    filterByDateRange(data, startDate, endDate);
  };

  // Helper function to filter by date range - updated to use correct property names
  const filterByDateRange = (data: ICutting[], start: Date, end: Date) => {
    console.log('Filtering with range:', { 
      start: start.toISOString(), 
      end: end.toISOString() 
    });
    
    const filtered = data.filter((item) => {
      try {
        if (!item.issuedDate) {
          return false;
        }

        // Parse the date string directly from API format (2025-04-24T00:00:00.000+0000)
        const itemDate = new Date(item.issuedDate);
        
        if (isNaN(itemDate.getTime())) {
          console.warn('Invalid date:', item.issuedDate);
          return false;
        }

        // Create normalized dates (without time) for comparison
        const itemDateNormalized = new Date(
          itemDate.getFullYear(),
          itemDate.getMonth(),
          itemDate.getDate()
        );
        
        const startDateNormalized = new Date(
          start.getFullYear(),
          start.getMonth(),
          start.getDate()
        );
        
        const endDateNormalized = new Date(
          end.getFullYear(),
          end.getMonth(),
          end.getDate()
        );

        return itemDateNormalized >= startDateNormalized && itemDateNormalized <= endDateNormalized;
      } catch (error) {
        console.error('Error filtering date:', error, item.issuedDate);
        return false;
      }
    });

    console.log(`Filtered ${filtered.length} items out of ${data.length}`);
    setFilteredData(filtered);
  };

  // Calculate summary statistics with correct property names
  const calculateSummary = () => {
    const totalCutting = filteredData.length;
    const totalIssuedWeight = filteredData.reduce(
      (sum, item) => sum + Number(item.issuedWeight || 0),
      0
    );
    const totalReceivedWeight = filteredData.reduce(
      (sum, item) => sum + Number(item.returnedWeight || 0),
      0
    );
    const totalCuttingLoss = filteredData.reduce(
      (sum, item) => sum + Number(item.CuttinfLoss || 0), // Note the typo in property name
      0
    );

    // Calculate percentages
    const cuttingLossPercentage = totalIssuedWeight
      ? ((totalCuttingLoss / totalIssuedWeight) * 100).toFixed(2)
      : "0";
    
    const receivedPercentage = totalIssuedWeight 
      ? ((totalReceivedWeight / totalIssuedWeight) * 100).toFixed(2)
      : "0";

    return [
      {
        iconClass: "fa-light fa-layer-group",
        title: "Cutting Issued",
        value: totalCutting.toString(),
        description: "Total cutting jobs",
        percentageChange: "",
        isIncrease: true,
      },
      {
        iconClass: "fa-light fa-weight-scale",
        title: "Weight Issued",
        value: totalIssuedWeight.toFixed(2) + " g",
        description: "Total gold issued",
        percentageChange: "",
        isIncrease: true,
      },
      {
        iconClass: "fa-light fa-scale-balanced",
        title: "Weight Received",
        value: totalReceivedWeight.toFixed(2) + " g",
        description: receivedPercentage + "% of issued",
        percentageChange: receivedPercentage,
        isIncrease: true,
      },  
      {
        iconClass: "fa-light fa-arrow-trend-down",
        title: "Cutting Loss",
        value: totalCuttingLoss.toFixed(2) + " g",
        description: cuttingLossPercentage + "% of issued",
        percentageChange: cuttingLossPercentage,
        isIncrease: false
      },
    ];
  };

  // Handle date range change
  const handleDateRangeChange = (range: string) => {
    setDateRange(range);
    if (range === "custom") {
      setShowCustomDatePicker(true);
    } else {
      setShowCustomDatePicker(false);
    }
  };

  const handleApplyCustomRange = () => {
    if (customStartDate && customEndDate) {
      filterDataByDateRange(cuttingData, "custom");
      setShowCustomDatePicker(false);
    } else {
      toast.error("Please select both start and end dates");
    }
  };

  const summaryData = calculateSummary();

  return (
    <div className="w-full bg-white rounded-lg shadow-sm p-4">
      {/* Date Range Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="text-sm font-medium">Filter by:</div>
        <div className="flex flex-wrap gap-2">
          <button
            className={`px-3 py-1 text-xs font-medium rounded-md ${
              dateRange === "day"
                ? "bg-primary text-white"
                : "bg-gray-100 text-slate-600"
            }`}
            onClick={() => handleDateRangeChange("day")}
          >
            Today
          </button>
          <button
            className={`px-3 py-1 text-xs font-medium rounded-md ${
              dateRange === "week"
                ? "bg-primary text-white"
                : "bg-gray-100 text-slate-600"
            }`}
            onClick={() => handleDateRangeChange("week")}
          >
            This Week
          </button>
          <button
            className={`px-3 py-1 text-xs font-medium rounded-md ${
              dateRange === "month"
                ? "bg-primary text-white"
                : "bg-gray-100 text-slate-600"
            }`}
            onClick={() => handleDateRangeChange("month")}
          >
            This Month
          </button>
          <button
            className={`px-3 py-1 text-xs font-medium rounded-md ${
              dateRange === "custom"
                ? "bg-primary text-white"
                : "bg-gray-100 text-slate-600"
            }`}
            onClick={() => handleDateRangeChange("custom")}
          >
            Custom Range
          </button>
        </div>
        
        {/* Custom Date Range Picker */}
        {showCustomDatePicker && (
          <div className="flex flex-wrap items-center gap-2 mt-2 md:mt-0">
            <DatePicker
              selected={customStartDate}
              onChange={(date) => setCustomStartDate(date)}
              selectsStart
              startDate={customStartDate}
              endDate={customEndDate}
              placeholderText="Start Date"
              className="px-2 py-1 text-sm border rounded"
              dateFormat="dd/MM/yyyy"
            />
            <span>to</span>
            <DatePicker
              selected={customEndDate}
              onChange={(date) => setCustomEndDate(date)}
              selectsEnd
              startDate={customStartDate}
              endDate={customEndDate}
              minDate={customStartDate}
              placeholderText="End Date"
              className="px-2 py-1 text-sm border rounded"
              dateFormat="dd/MM/yyyy"
            />
            <button
              onClick={handleApplyCustomRange}
              className="px-3 py-1 text-xs font-medium text-white rounded-md bg-primary"
              disabled={!customStartDate || !customEndDate}
            >
              Apply
            </button>
          </div>
        )}
      </div>

      

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            Loading cutting data...
          </div>
        ) : filteredData.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            No cutting data found for the selected date range.
          </div>
        ) : (
          summaryData.map((item, index) => (
            <div key={index}>
              <SummarySingleCard {...item} />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CuttingSummary;