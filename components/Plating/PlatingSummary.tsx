import React, { useState, useEffect } from "react";
import SummarySingleCard from "@/components/common/SummarySingleCard";
import { fetchPlatingData } from "@/data/crm/plating-data";
import { IPlating } from "@/interface/table.interface";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { toast } from "react-hot-toast";

const PlatingSummary: React.FC = () => {
  const [platingData, setPlatingData] = useState<IPlating[]>([]);
  const [filteredData, setFilteredData] = useState<IPlating[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dateRange, setDateRange] = useState<string>("month");
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState<boolean>(false);

  // Fetch plating data
  useEffect(() => {
    const getData = async () => {
      try {
        setLoading(true);
        const data = await fetchPlatingData();
        console.log('[Plating Summary] Fetched data:', data);
        setPlatingData(data);
        filterDataByDateRange(data, dateRange);
      } catch (error) {
        console.error("Error fetching plating data:", error);
        toast.error("Failed to load plating data");
        setPlatingData([]);
        setFilteredData([]);
      } finally {
        setLoading(false);
      }
    };

    getData();
  }, []);

  // Filter data when date range changes
  useEffect(() => {
    filterDataByDateRange(platingData, dateRange);
  }, [dateRange, customStartDate, customEndDate, platingData]);

  // Function to filter data by date range
  const filterDataByDateRange = (data: IPlating[], range: string) => {
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
  const filterByDateRange = (data: IPlating[], start: Date, end: Date) => {
    console.log('Filtering with range:', { start, end });
    
    const filtered = data.filter((item) => {
      try {
        const itemDate = typeof item.Issued_Date__c === 'string' 
          ? new Date(item.Issued_Date__c)
          : item.Issued_Date__c;

        if (!(itemDate instanceof Date) || isNaN(itemDate.getTime())) {
          console.warn('Invalid date:', item.Issued_Date__c);
          return false;
        }

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

        return compareDate >= startOfDay && compareDate <= endOfDay;
      } catch (error) {
        console.error('Error filtering date:', error, item.Issued_Date__c);
        return false;
      }
    });

    setFilteredData(filtered);
  };

  // Calculate summary statistics
  const calculateSummary = () => {
    const totalPlating = filteredData.length;
    const totalIssuedWeight = filteredData.reduce(
      (sum, item) => sum + Number(item.Issued_Weight__c || 0),
      0
    );
    const totalReceivedWeight = filteredData.reduce(
      (sum, item) => sum + Number(item.
        Returned_Weight__c || 0),
      0
    );
    const totalPlatingLoss = filteredData.reduce(
      (sum, item) => sum + Number(item.Plating_Loss__c || 0),
      0
    );

    // Calculate percentages
    const platingLossPercentage = totalIssuedWeight
      ? ((totalPlatingLoss / totalIssuedWeight) * 100).toFixed(2)
      : "0";
    
    const receivedPercentage = totalIssuedWeight 
      ? ((totalReceivedWeight / totalIssuedWeight) * 100).toFixed(2)
      : "0";

    return [
      {
        iconClass: "fa-light fa-layer-group",
        title: "Plating Issued",
        value: totalPlating.toString(),
        description: "Total plating jobs",
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
        title: "Plating Loss",
        value: totalPlatingLoss.toFixed(2) + " g",
        description: platingLossPercentage + "% of issued",
        percentageChange: platingLossPercentage,
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
      filterDataByDateRange(platingData, "custom");
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
            Loading plating data...
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

export default PlatingSummary;
