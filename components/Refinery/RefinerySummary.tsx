import React, { useState, useEffect } from "react";
import SummarySingleCard from "@/components/common/SummarySingleCard";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface DepartmentSummary {
  success: boolean;
  summary: {
    totalCastingLoss: number;
    totalFilingLoss: number;
    totalGrindingLoss: number;
    totalSettingLoss: number;
    totalPolishingLoss: number;
    totalOverallLoss: number;
  };
}

const RefinerySummary: React.FC = () => {
  const [summaryData, setSummaryData] = useState<DepartmentSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [dateRange, setDateRange] = useState<string>("month");
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState<boolean>(false);

  const fetchSummaryData = async (startDate: Date, endDate: Date) => {
    try {
      setLoading(true);
      
      // Format date to Indian timezone (UTC+5:30)
      const formatIndianDate = (date: Date) => {
        // Add 5 hours and 30 minutes to convert to Indian time
        const indianDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
        return indianDate.toISOString().split('T')[0];
      };
      
      const formattedStartDate = formatIndianDate(startDate);
      const formattedEndDate = formatIndianDate(endDate);

      console.log('Fetching data for Indian dates:', {
        startDate: formattedStartDate,
        endDate: formattedEndDate
      });
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/department-losses?startDate=${formattedStartDate}&endDate=${formattedEndDate}`
      );

      if (!response.ok) throw new Error('Failed to fetch data');
      
      const data = await response.json();
      setSummaryData(data);
    } catch (error) {
      console.error('Error fetching summary:', error);
      setSummaryData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const now = new Date();
    // Set to Indian timezone
    const indianTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    
    let startDate = new Date(indianTime);
    let endDate = new Date(indianTime);

    switch (dateRange) {
      case "day":
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "week":
        startDate.setDate(indianTime.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "month":
        startDate = new Date(indianTime.getFullYear(), indianTime.getMonth(), 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "custom":
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(customEndDate);
          endDate.setHours(23, 59, 59, 999);
        }
        break;
    }

    fetchSummaryData(startDate, endDate);
  }, [dateRange, customStartDate, customEndDate]);

  const handleDateRangeChange = (range: string) => {
    setDateRange(range);
    setShowCustomDatePicker(range === "custom");
  };

  const summaryCards = React.useMemo(() => {
    if (!summaryData?.summary) return [];

    const {
      totalCastingLoss,
      totalFilingLoss,
      totalGrindingLoss,
      totalSettingLoss,
      totalPolishingLoss,
      totalOverallLoss
    } = summaryData.summary;

    return [
      {
        iconClass: "fa-light fa-scale-balanced",
        title: "Casting Loss",
        value: `${totalCastingLoss.toFixed(3)} g`,
        description: "Total casting department loss",
        isIncrease: false,
      },
      {
        iconClass: "fa-light fa-file-lines",
        title: "Filing Loss",
        value: `${totalFilingLoss.toFixed(3)} g`,
        description: "Total filing department loss",
        isIncrease: false,
      },
      {
        iconClass: "fa-light fa-gear",
        title: "Grinding Loss",
        value: `${totalGrindingLoss.toFixed(3)} g`,
        description: "Total grinding department loss",
        isIncrease: false,
      },
      {
        iconClass: "fa-light fa-gem",
        title: "Setting Loss",
        value: `${totalSettingLoss.toFixed(3)} g`,
        description: "Total setting department loss",
        isIncrease: false,
      },
      {
        iconClass: "fa-light fa-sparkles",
        title: "Polishing Loss",
        value: `${totalPolishingLoss.toFixed(3)} g`,
        description: "Total polishing department loss",
        isIncrease: false,
      },
      {
        iconClass: "fa-light fa-arrow-trend-down",
        title: "Total Loss",
        value: `${totalOverallLoss.toFixed(3)} g`,
        description: "Total loss across departments",
        isIncrease: false,
      },
    ];
  }, [summaryData]);

  // Update DatePicker to show Indian time
  const DatePickerComponent = ({ selected, onChange, ...props }) => {
    // Convert to Indian time for display
    const selectedIndianDate = selected 
      ? new Date(selected.getTime() + (5.5 * 60 * 60 * 1000))
      : null;

    const handleChange = (date: Date) => {
      // Convert back to UTC for storage
      const utcDate = date 
        ? new Date(date.getTime() - (5.5 * 60 * 60 * 1000))
        : null;
      onChange(utcDate);
    };

    return (
      <DatePicker
        selected={selectedIndianDate}
        onChange={handleChange}
        {...props}
      />
    );
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-sm p-4">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="text-sm font-medium">Filter by:</div>
        <div className="flex flex-wrap gap-2">
          {["day", "week", "month", "custom"].map((range) => (
            <button
              key={range}
              className={`px-3 py-1 text-xs font-medium rounded-md ${
                dateRange === range
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-slate-600"
              }`}
              onClick={() => handleDateRangeChange(range)}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
        
        {showCustomDatePicker && (
          <div className="flex items-center gap-2">
            <DatePickerComponent
              selected={customStartDate}
              onChange={setCustomStartDate}
              selectsStart
              startDate={customStartDate}
              endDate={customEndDate}
              placeholderText="Start Date"
              className="px-2 py-1 text-sm border rounded"
              dateFormat="yyyy-MM-dd"
            />
            <span>to</span>
            <DatePickerComponent
              selected={customEndDate}
              onChange={setCustomEndDate}
              selectsEnd
              startDate={customStartDate}
              endDate={customEndDate}
              minDate={customStartDate}
              placeholderText="End Date"
              className="px-2 py-1 text-sm border rounded"
              dateFormat="yyyy-MM-dd"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            Loading summary data...
          </div>
        ) : summaryData ? (
          summaryCards.map((card, index) => (
            <div key={index}>
              <SummarySingleCard {...card} />
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-8 text-gray-500">
            No data available
          </div>
        )}
      </div>
    </div>
  );
};

export default RefinerySummary;
