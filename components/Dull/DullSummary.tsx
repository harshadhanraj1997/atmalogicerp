import React, { useState, useEffect } from "react";
import SummarySingleCard from "@/components/common/SummarySingleCard";
import { fetchGrindingData } from "@/data/crm/filing-data";
import { IDull } from "@/interface/table.interface";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { fetchDullData } from "@/data/crm/dull-data";

const DullSummary: React.FC = () => {
  const [dullData, setDullData] = useState<IDull[]>([]);
  const [filteredData, setFilteredData] = useState<IDull[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dateRange, setDateRange] = useState<string>("month");
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState<boolean>(false);

  // Format date to the required database format without timezone conversion
  const formatDateTime = (date: Date, isEndDate: boolean = false) => {
    const formattedDate = new Date(date);
    
    // Set appropriate time
    if (isEndDate) {
      formattedDate.setHours(23, 59, 59, 999);
    } else {
      formattedDate.setHours(0, 0, 0, 0);
    }
    
    // Format as YYYY-MM-DDTHH:mm:ss.000+0000
    return formattedDate.toISOString().replace(/Z$/, '+0000');
  };

  // Update the useEffect for data fetching
  useEffect(() => {
    const getData = async () => {
      try {
        setLoading(true);
        console.log("=== FETCHING DULL SUMMARY DATA ===");
        
        const now = new Date();
        let startDate: Date = new Date(now);
        let endDate: Date = new Date(now);

        switch (dateRange) {
          case "day":
            startDate = new Date(now);
            break;
          case "week":
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 7);
            break;
          case "month":
            startDate = new Date(now);
            startDate.setDate(1);
            break;
          case "custom":
            if (customStartDate && customEndDate) {
              startDate = new Date(customStartDate);
              endDate = new Date(customEndDate);
            }
            break;
        }

        // Format dates without timezone conversion
        const formattedStartDate = formatDateTime(startDate);
        const formattedEndDate = formatDateTime(endDate, true);

        console.log("Date Range:", {
          startDate: formattedStartDate,
          endDate: formattedEndDate,
          range: dateRange
        });

        const data = await fetchDullData(formattedStartDate, formattedEndDate);
        
        console.log("Received Data:", {
          totalRecords: data.length,
          sampleRecord: data[0],
          dateRange: dateRange
        });

        setDullData(data);
        filterDataByDateRange(data, dateRange);
      } catch (error) {
        console.error("Error fetching dull data:", error);
      } finally {
        setLoading(false);
      }
    };

    getData();
  }, [dateRange, customStartDate, customEndDate]);

  // Filter data when date range changes
  useEffect(() => {
    filterDataByDateRange(dullData, dateRange);
  }, [dateRange, customStartDate, customEndDate, dullData]);

  // Function to filter data by date range
  const filterDataByDateRange = (data: IDull[], range: string) => {
    if (!data.length) {
      setFilteredData([]);
      return;
    }

    const now = new Date();
    let startDate: Date;

    switch (range) {
      case "day":
        // Today
        startDate = new Date(now.setHours(0, 0, 0, 0));
        filterByDateRange(data, startDate, new Date());
        break;
      case "week":
        // Current week (last 7 days)
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        filterByDateRange(data, startDate, new Date());
        break;
      case "month":
        // Current month
        startDate = new Date();
        startDate.setDate(1);
        filterByDateRange(data, startDate, new Date());
        break;
      case "custom":
        // Custom date range
        if (customStartDate && customEndDate) {
          filterByDateRange(data, customStartDate, customEndDate);
        }
        break;
      default:
        setFilteredData(data);
    }
  };

  // Update the filterByDateRange function
  const filterByDateRange = (data: IDull[], start: Date, end: Date) => {
    console.log("=== FILTERING DULL DATA ===");
    console.log("Filter Range:", {
      start: formatDateTime(start),
      end: formatDateTime(end, true),
      totalRecordsBeforeFiltering: data.length
    });
    
    // Make a copy of the data array before filtering to avoid accidental side effects
    const allRecords = [...data];
    
    // Set the time components appropriately for comparison
    const startCompare = new Date(start);
    startCompare.setHours(0, 0, 0, 0);
    
    const endCompare = new Date(end);
    endCompare.setHours(23, 59, 59, 999);
    
    console.log("Using comparison dates:", {
      adjustedStart: startCompare.toISOString(),
      adjustedEnd: endCompare.toISOString()
    });

    // For troubleshooting, output a few example records
    if (allRecords.length > 0) {
      console.log("Sample record before filtering:", allRecords[0]);
    }

    const filtered = allRecords.filter((item) => {
      try {
        // Handle the format "2025-04-27T22:00:00.000+0000"
        const issuedDateStr = item.issuedDate;
        
        // Skip if no issued date
        if (!issuedDateStr || issuedDateStr === '-') {
          console.warn("Missing issued date for record:", item.id);
          return false;
        }
        
        // Convert to standard ISO format by replacing +0000 with Z
        const standardIsoDate = issuedDateStr.replace(/\+0000$/, 'Z');
        const issuedDate = new Date(standardIsoDate);
        
        // Check if the date is valid
        if (isNaN(issuedDate.getTime())) {
          console.warn("Invalid date format:", issuedDateStr);
          return false;
        }
        
        // Check if the record should be included
        const shouldInclude = issuedDate >= startCompare && issuedDate <= endCompare;
        
        // Log details about this comparison for a sample of records
        if (Math.random() < 0.1) { // Log ~10% of records to avoid console flood
          console.log(`Record ${item.id} date comparison:`, {
            recordDateString: issuedDateStr,
            recordDate: issuedDate.toISOString(),
            isWithinRange: shouldInclude
          });
        }
        
        return shouldInclude;
      } catch (error) {
        console.error("Error parsing date:", error, item.issuedDate);
        return false;
      }
    });

    console.log("Filtering Results:", {
      totalRecords: data.length,
      filteredRecords: filtered.length
    });

    setFilteredData(filtered);
  };

  // Calculate summary statistics
  const calculateSummary = () => {
    // Log the records being used for summary calculations
    console.log('=== RECORDS USED FOR SUMMARY CALCULATION ===');
    console.log('Total Records:', filteredData.length);
    console.log('Sample Records:', filteredData.slice(0, 3));
    console.log('Date Range:', dateRange);
    console.log('Custom Date Range:', {
      startDate: customStartDate ? formatDateTime(customStartDate) : 'N/A',
      endDate: customEndDate ? formatDateTime(customEndDate, true) : 'N/A'
    });
    
    const totalCastings = filteredData.length;
    const totalIssuedWeight = filteredData.reduce(
      (sum, item) => sum + Number(item.issuedWeight || 0),
      0
    );
    const totalReceivedWeight = filteredData.reduce(
      (sum, item) => sum + Number(item.receivedWeight || 0),
      0
    );
    const totalDullLoss = filteredData.reduce(
          (sum, item) => sum + Number(item.dullLoss || 0),
      0
    );

    // Calculate percentages
    const dullLossPercentage = totalIssuedWeight
      ? ((totalDullLoss / totalIssuedWeight) * 100).toFixed(2)
      : "0";
    
    const receivedPercentage = totalIssuedWeight 
      ? ((totalReceivedWeight / totalIssuedWeight) * 100).toFixed(2)
      : "0";

    return [
      {
        iconClass: "fa-light fa-gem",
        title: "Dull Issued",
        value: totalCastings.toString(),
                description: "Total dull jobs",
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
        title: "Dull Loss",
        value: totalDullLoss.toFixed(2) + " g",
        description: dullLossPercentage + "% of issued",
        percentageChange: dullLossPercentage,
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
        filterDataByDateRange(dullData, "custom");
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
              onChange={(date) => setCustomStartDate(date)}
              selectsStart
              startDate={customStartDate}
              endDate={customEndDate}
              placeholderText="Start Date"
              className="px-2 py-1 text-sm border rounded"
              dateFormat="dd/MM/yyyy HH:mm"
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={15}
              timeCaption="Time"
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
              dateFormat="dd/MM/yyyy HH:mm"
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={15}
              timeCaption="Time"
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
            Loading Dull data...
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

export default DullSummary;
