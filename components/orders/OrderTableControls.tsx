import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Updated interface to properly type partyNameOptions
interface PartyNameOption {
  value: string;
  label: string;
}

interface OrderTableControlsProps {
  searchQuery: string;
  handleSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  startDate: string;
  endDate: string;
  handleDateChange: (type: 'start' | 'end', value: string) => void;
  handleResetDates: () => void;
  statusFilter: string;
  handleStatusChange: (value: string) => void;
  partyNameFilter: string;
  handlePartyNameChange: (value: string) => void;
  partyNameOptions: PartyNameOption[]; // Updated type
}

const OrderTableControls: React.FC<OrderTableControlsProps> = ({
  searchQuery,
  handleSearchChange,
  startDate,
  endDate,
  handleDateChange,
  handleResetDates,
  statusFilter,
  handleStatusChange,
  partyNameFilter,
  handlePartyNameChange,
  partyNameOptions,
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
        <div className="ml-4 flex items-center gap-2">
          <Label htmlFor="status-filter" className="whitespace-nowrap mb-0">Status:</Label>
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger 
              className="w-[180px] bg-white border border-gray-200"
            >
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent 
              className="bg-white border border-gray-200 shadow-lg z-50"
              style={{
                backgroundColor: 'white',
                borderRadius: '6px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
              }}
            >
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="finished">Finished</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="ml-4 flex items-center gap-2">
          <Label htmlFor="party-filter" className="whitespace-nowrap mb-0">Party:</Label>
          <Select value={partyNameFilter} onValueChange={handlePartyNameChange}>
            <SelectTrigger 
              className="w-[200px] bg-white border border-gray-200"
            >
              <SelectValue placeholder="Select party" />
            </SelectTrigger>
            <SelectContent 
              className="bg-white border border-gray-200 shadow-lg z-50"
              style={{
                backgroundColor: 'white',
                borderRadius: '6px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
              }}
            >
              {/* Updated to use the correct properties from options */}
              {partyNameOptions.map((option) => (
                <SelectItem 
                  key={option.value} 
                  value={option.value} 
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="self-end">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleResetDates}
            className="flex items-center gap-1"
          >
            <X className="h-4 w-4" />
            Reset Filters
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Label htmlFor="search" className="whitespace-nowrap mb-0">Search:</Label>
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

export default OrderTableControls;