import React, { useState, useEffect } from "react";
import SummarySingleCard from "@/components/common/SummarySingleCard";
import { fetchSettingData } from "@/data/crm/setting-data";
import { ISetting } from "@/interface/table.interface";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

        const SettingSummary: React.FC = () => {
  const [settingData, setSettingData] = useState<ISetting[]>([]);
  const [filteredData, setFilteredData] = useState<ISetting[]>([]);
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
        const data = await fetchSettingData();
        setSettingData(data);
        filterDataByDateRange(data, dateRange);
      } catch (error) {
          console.error("Error fetching setting data:", error);
      } finally {
        setLoading(false);
      }
    };

    getData();
  }, []);

  // Filter data when date range changes
  useEffect(() => {
    filterDataByDateRange(settingData, dateRange);
  }, [dateRange, customStartDate, customEndDate, settingData]);

  // Function to filter data by date range
  const filterDataByDateRange = (data: ISetting[], range: string) => {
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
        startDate = new Date(Date.UTC(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          0, 0, 0, 0
        ));
        endDate = new Date(Date.UTC(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23, 59, 59, 999
        ));
        break;
      case "week":
        startDate = new Date(Date.UTC(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 7,
          0, 0, 0, 0
        ));
        endDate = new Date(Date.UTC(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23, 59, 59, 999
        ));
        break;
      case "month":
        startDate = new Date(Date.UTC(
          now.getFullYear(),
          now.getMonth(),
          1,
          0, 0, 0, 0
        ));
        endDate = new Date(Date.UTC(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23, 59, 59, 999
        ));
        break;
      case "custom":
        if (customStartDate && customEndDate) {
          startDate = new Date(Date.UTC(
            customStartDate.getFullYear(),
            customStartDate.getMonth(),
            customStartDate.getDate(),
            0, 0, 0, 0
          ));
          endDate = new Date(Date.UTC(
            customEndDate.getFullYear(),
            customEndDate.getMonth(),
            customEndDate.getDate(),
            23, 59, 59, 999
          ));
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

  // Helper function to filter by date range
  const filterByDateRange = (data: ISetting[], start: Date, end: Date) => {
    console.log('Filtering with range:', { start, end });
    
    const filtered = data.filter((item) => {
      try {
        // Parse the ISO date string properly
        const itemDate = typeof item.issuedDate === 'string' 
          ? new Date(item.issuedDate) // This will handle ISO format like "2025-04-23T20:27:00.000+0000"
          : item.issuedDate;

        // Debug log for date parsing
        console.log('Date comparison:', {
          original: item.issuedDate,
          parsed: itemDate,
          startDate: start,
          endDate: end
        });

        // Ensure valid date
        if (!(itemDate instanceof Date) || isNaN(itemDate.getTime())) {
          console.warn('Invalid date:', item.issuedDate);
          return false;
        }

        // Convert all dates to UTC for consistent comparison
        const compareDate = new Date(Date.UTC(
          itemDate.getUTCFullYear(),
          itemDate.getUTCMonth(),
          itemDate.getUTCDate(),
          0, 0, 0, 0
        ));
        
        const startOfDay = new Date(Date.UTC(
          start.getFullYear(),
          start.getMonth(),
          start.getDate(),
          0, 0, 0, 0
        ));
        
        const endOfDay = new Date(Date.UTC(
          end.getFullYear(),
          end.getMonth(),
          end.getDate(),
          23, 59, 59, 999
        ));

        // Debug log for UTC comparison
        console.log('UTC comparison:', {
          compareDate: compareDate.toISOString(),
          startOfDay: startOfDay.toISOString(),
          endOfDay: endOfDay.toISOString()
        });

        return compareDate >= startOfDay && compareDate <= endOfDay;
      } catch (error) {
        console.error('Error filtering date:', error, item.issuedDate);
        return false;
      }
    });

    console.log('Filtered results:', {
      total: data.length,
      filtered: filtered.length,
      sampleDates: filtered.slice(0, 3).map(d => ({
        original: d.issuedDate,
        parsed: new Date(d.issuedDate).toISOString()
      }))
    });

    setFilteredData(filtered);
  };

  // Calculate summary statistics
  const calculateSummary = () => {
    const totalSetting = filteredData.length;
    const totalIssuedWeight = filteredData.reduce(
      (sum, item) => sum + Number(item.issuedWeight || 0),
      0
    );
    const totalReceivedWeight = filteredData.reduce(
      (sum, item) => sum + Number(item.receivedWeight || 0),
      0
    );
    // Calculate setting loss as the difference between issued and received weight
    const totalSettingLoss = totalIssuedWeight - totalReceivedWeight;

    // Calculate percentages
    const settingLossPercentage = totalIssuedWeight
      ? ((totalSettingLoss / totalIssuedWeight) * 100).toFixed(2)
      : "0";
    
    const receivedPercentage = totalIssuedWeight 
      ? ((totalReceivedWeight / totalIssuedWeight) * 100).toFixed(2)
      : "0";

    return [
      {
        iconClass: "fa-light fa-gem",
            title: "Setting Issued",
        value: totalSetting.toString(),
        description: "Total setting jobs",
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
        title: "Setting Loss",
        value: totalSettingLoss.toFixed(2) + " g",
        description: settingLossPercentage + "% of issued",
        percentageChange: settingLossPercentage,
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
      filterDataByDateRange(settingData, "custom");
      setShowCustomDatePicker(false);
    }
  };

  const summaryData = calculateSummary();

  // Add debug logging to track date handling
  useEffect(() => {
    console.log('Date Filter Debug:', {
      dateRange,
      customStartDate: customStartDate?.toISOString(),
      customEndDate: customEndDate?.toISOString(),
      sampleDates: filteredData.slice(0, 3).map(d => ({
        original: d.issuedDate,
        parsed: new Date(d.issuedDate).toISOString()
      }))
    });
  }, [dateRange, customStartDate, customEndDate, filteredData]);

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
              onChange={(date) => setCustomStartDate(date)}
              selectsStart
              startDate={customStartDate}
              endDate={customEndDate}
              placeholderText="Start Date"
              className="px-2 py-1 text-sm border rounded"
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
                Loading setting data...
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

export default SettingSummary;