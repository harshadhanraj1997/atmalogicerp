import React, { useState, useEffect } from "react";
import SummarySingleCard from "@/components/common/SummarySingleCard";
import { fetchDealData } from "@/data/crm/casting-data";
import { ICasting } from "@/interface/table.interface";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const CastingSummary: React.FC = () => {
  const [castingData, setCastingData] = useState<ICasting[]>([]);
  const [filteredData, setFilteredData] = useState<ICasting[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dateRange, setDateRange] = useState<string>("month");
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState<boolean>(false);

  // Fetch casting data
  useEffect(() => {
    const getData = async () => {
      try {
        setLoading(true);
        const data = await fetchDealData();
        setCastingData(data);
        filterDataByDateRange(data, dateRange);
      } catch (error) {
        console.error("Error fetching casting data:", error);
      } finally {
        setLoading(false);
      }
    };

    getData();
  }, []);

  // Filter data when date range changes
  useEffect(() => {
    console.log('[CastingSummary] Date range changed:', {
      dateRange,
      customStartDate: customStartDate?.toISOString(),
      customEndDate: customEndDate?.toISOString()
    });
    filterDataByDateRange(castingData, dateRange);
  }, [dateRange, customStartDate, customEndDate, castingData]);

  // Function to filter data by date range
  const filterDataByDateRange = (data: ICasting[], range: string) => {
    if (!data.length) {
      setFilteredData([]);
      return;
    }

    const now = new Date();
    let startDate: Date;

    switch (range) {
      case "day":
        // Today
        startDate = new Date(now);
        startDate.setUTCHours(0, 0, 0, 0);
        filterByDateRange(data, startDate, now);
        break;
      case "week":
        // Current week (last 7 days)
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setUTCHours(0, 0, 0, 0);
        filterByDateRange(data, startDate, now);
        break;
      case "month":
        // Current month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate.setUTCHours(0, 0, 0, 0);
        filterByDateRange(data, startDate, now);
        break;
      case "custom":
        // Custom date range
        if (customStartDate && customEndDate) {
          const endDate = new Date(customEndDate);
          endDate.setUTCHours(23, 59, 59, 999);
          filterByDateRange(data, customStartDate, endDate);
        }
        break;
      default:
        setFilteredData(data);
    }
  };

  // Helper function to filter by date range
  const filterByDateRange = (data: ICasting[], start: Date, end: Date) => {
    const filtered = data.filter((item) => {
      try {
        // Parse the ISO date string with timezone
        const issuedDate = new Date(item.issuedDate);
        
        // Set the time to start of day for start date and end of day for end date
        const startOfDay = new Date(start);
        startOfDay.setUTCHours(0, 0, 0, 0);
        
        const endOfDay = new Date(end);
        endOfDay.setUTCHours(23, 59, 59, 999);

        console.log('Date comparison:', {
          issuedDate: issuedDate.toISOString(),
          startOfDay: startOfDay.toISOString(),
          endOfDay: endOfDay.toISOString()
        });

        return issuedDate >= startOfDay && issuedDate <= endOfDay;
      } catch (error) {
        console.error('Error parsing date:', error, {
          dateString: item.issuedDate,
          expectedFormat: '2025-04-02T02:56:00.000+0000'
        });
        return false;
      }
    });
    setFilteredData(filtered);
  };

  // Calculate summary statistics
  const calculateSummary = () => {
    const totalCastings = filteredData.length;
    const totalIssuedWeight = filteredData.reduce(
      (sum, item) => sum + Number(item.issuedWeight || 0),
      0
    );
    const totalReceivedWeight = filteredData.reduce(
      (sum, item) => sum + Number(item.receivedWeight || 0),
      0
    );
    const totalCastingLoss = filteredData.reduce(
      (sum, item) => sum + Number(item.castingLoss || 0),
      0
    );

    // Calculate percentages
    const castingLossPercentage = totalIssuedWeight
      ? ((totalCastingLoss / totalIssuedWeight) * 100).toFixed(2)
      : "0";
    
    const receivedPercentage = totalIssuedWeight 
      ? ((totalReceivedWeight / totalIssuedWeight) * 100).toFixed(2)
      : "0";

    return [
      {
        iconClass: "fa-light fa-gem",
        title: "Castings Issued",
        value: totalCastings.toString(),
        description: "Total casting jobs",
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
        title: "Casting Loss",
        value: totalCastingLoss.toFixed(2) + " g",
        description: castingLossPercentage + "% of issued",
        percentageChange: castingLossPercentage,
        isIncrease: false,
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
      filterDataByDateRange(castingData, "custom");
      setShowCustomDatePicker(false);
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
          <div className="flex items-center gap-2 mt-2 md:mt-0">
            <DatePicker
              selected={customStartDate}
              onChange={(date) => {
                if (date) {
                  const utcDate = new Date(date);
                  utcDate.setUTCHours(0, 0, 0, 0);
                  setCustomStartDate(utcDate);
                } else {
                  setCustomStartDate(null);
                }
              }}
              selectsStart
              startDate={customStartDate}
              endDate={customEndDate}
              placeholderText="Start Date"
              className="px-2 py-1 text-sm border rounded"
              dateFormat="yyyy-MM-dd"
            />
            <span>to</span>
            <DatePicker
              selected={customEndDate}
              onChange={(date) => {
                if (date) {
                  const utcDate = new Date(date);
                  utcDate.setUTCHours(23, 59, 59, 999);
                  setCustomEndDate(utcDate);
                } else {
                  setCustomEndDate(null);
                }
              }}
              selectsEnd
              startDate={customStartDate}
              endDate={customEndDate}
              minDate={customStartDate}
              placeholderText="End Date"
              className="px-2 py-1 text-sm border rounded"
              dateFormat="yyyy-MM-dd"
            />
            <button
              onClick={handleApplyCustomRange}
              className="px-3 py-1 text-xs font-medium text-white rounded-md bg-primary"
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
            Loading casting data...
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

export default CastingSummary;
