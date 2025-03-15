import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TaggingData {
  id: string;
  PartyName: string;
  createdDate: string;
  TotalWeight: number;
  pdfUrl: string;
}

interface TaggingTableControlsProps {
  searchQuery: string;
  handleSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  startDate: string;
  endDate: string;
  handleDateChange: (type: 'start' | 'end', value: string) => void;
  handleResetFilters: () => void;
  selectedParty: string;
  handlePartyChange: (value: string) => void;
  data?: TaggingData[];
}

const TaggingTableControls: React.FC<TaggingTableControlsProps> = ({
  searchQuery,
  handleSearchChange,
  startDate,
  endDate,
  handleDateChange,
  handleResetFilters,
  selectedParty,
  handlePartyChange,
  data = []
}) => {
  const uniqueParties = React.useMemo(() => {
    if (!data || !Array.isArray(data)) return ['all'];
    const parties = data.map(item => item.PartyName);
    return ['all', ...new Set(parties)];
  }, [data]);

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
          <Label htmlFor="party-filter" className="whitespace-nowrap mb-0">Party:</Label>
          <Select value={selectedParty} onValueChange={handlePartyChange}>
            <SelectTrigger 
              className="w-[180px] bg-white border border-gray-200"
            >
              <SelectValue placeholder="Filter by party" />
            </SelectTrigger>
            <SelectContent 
              className="bg-white max-h-[200px] overflow-y-auto"
            >
              {uniqueParties.map((party) => (
                <SelectItem 
                  key={party} 
                  value={party}
                >
                  {party === 'all' ? 'All Parties' : party}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="self-end">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleResetFilters}
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

export default TaggingTableControls;