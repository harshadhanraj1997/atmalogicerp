import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface TableControlsProps {
  searchQuery: string;
  handleSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  startDate: string;
  endDate: string;
  handleDateChange: (type: 'start' | 'end', value: string) => void;
  handleResetDates: () => void;
}

const TableControls: React.FC<TableControlsProps> = ({
  searchQuery,
  handleSearchChange,
  startDate,
  endDate,
  handleDateChange,
  handleResetDates,
}) => {
  return (
    <div className="flex justify-between items-center mb-4 p-4 bg-white rounded-lg shadow-sm">
      <div className="flex items-center gap-4">
        <div>
          <Label htmlFor="startDate">From Date</Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => handleDateChange('start', e.target.value)}
            className="w-[200px]"
          />
        </div>
        <div>
          <Label htmlFor="endDate">To Date</Label>
          <Input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => handleDateChange('end', e.target.value)}
            className="w-[200px]"
          />
        </div>
        <div className="self-end mb-[2px]">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleResetDates}
            className="flex items-center gap-1"
          >
            <X className="h-4 w-4" />
            Reset Dates
          </Button>
        </div>
      </div>
      <div>
        <Label htmlFor="search">Search</Label>
        <Input
          id="search"
          type="search"
          placeholder="Search..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="w-[250px]"
        />
      </div>
    </div>
  );
};

export default TableControls;
