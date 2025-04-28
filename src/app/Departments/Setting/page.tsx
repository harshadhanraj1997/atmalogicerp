'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface Pouch {
  Id: string;
  Name: string;
  Order_Id__c?: string;
  Product__c?: string;
  Quantity__c?: number;
  Received_Weight_Grinding__c?: number;
  Received_Weight_Setting__c?: number;
  Received_Weight_Polishing__c?: number;
  Received_Weight_Dull__c?: number;
  categories?: Array<{Category__c: string, Quantity__c: number}>;
}

interface DepartmentRecord {
  attributes: {
    type: string;
    url: string;
  };
  Id: string;
  Name: string;
  status__c: string;
  Issued_Weight__c: number;
  Received_Weight__c: number | null;
}

export default function CreateSettingFromDepartment() {
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [departmentRecords, setDepartmentRecords] = useState<DepartmentRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<string>('');
  const [selectedRecordData, setSelectedRecordData] = useState<DepartmentRecord | null>(null);
  const [pouches, setPouches] = useState<Pouch[]>([]);
  const [pouchWeights, setPouchWeights] = useState<{ [key: string]: number }>({});
  const [totalWeight, setTotalWeight] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [filingId, setFilingId] = useState<string>('');
  const [filingWeight, setFilingWeight] = useState<number>(0);
  const [selectedPouches, setSelectedPouches] = useState<{ [key: string]: boolean }>({});
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
  const router = useRouter();

  // Fetch department records when department changes
  useEffect(() => {
    const fetchDepartmentRecords = async () => {
      if (!selectedDepartment) return;

      try {
        setLoading(true);
        const endpoint = `${apiBaseUrl}/api/${selectedDepartment.toLowerCase()}`;
        console.log('Fetching from endpoint:', endpoint);
        
        const response = await fetch(endpoint);
        const result = await response.json();

        if (result.success) {
          // Filter for received records
          const receivedRecords = result.data
            .filter((record: DepartmentRecord) => 
              // Check for 'Finished' status instead of 'Received'
              record.status__c === 'Finished'
            );
          
          console.log('Received records:', receivedRecords);
          setDepartmentRecords(receivedRecords);
        } else {
          toast.error(`Failed to fetch ${selectedDepartment} records`);
        }
      } catch (error) {
        console.error(`Error fetching ${selectedDepartment} records:`, error);
        toast.error('Failed to fetch records');
      } finally {
        setLoading(false);
      }
    };

    fetchDepartmentRecords();
  }, [selectedDepartment]);

  // Fetch pouches when record is selected
  useEffect(() => {
    const fetchPouches = async () => {
      if (!selectedRecord || !selectedDepartment) return;

      try {
        setLoading(true);
        const [prefix, date, month, year, number, subnumber] = selectedRecord.split('/');
        let endpoint;
        if (selectedDepartment === 'Polishing') {
          endpoint = `${apiBaseUrl}/api/polish/${prefix}/${date}/${month}/${year}/${number}/${subnumber}/pouches`;
        } else {
          endpoint = `${apiBaseUrl}/api/${selectedDepartment.toLowerCase()}/${prefix}/${date}/${month}/${year}/${number}/${subnumber}/pouches`;
        }
        console.log('Fetching pouches from:', endpoint);
        
        const response = await fetch(endpoint);
        const result = await response.json();

        if (result.success) {
          console.log('Fetched pouches:', result.data.pouches);
          setPouches(result.data.pouches);
          // Initialize weights to 0
          const weights: { [key: string]: number } = {};
          result.data.pouches.forEach((pouch: Pouch) => {
            weights[pouch.Id] = 0;
          });
          setPouchWeights(weights);
        } else {
          toast.error('Failed to fetch pouches');
        }
      } catch (error) {
        console.error('Error fetching pouches:', error);
        toast.error('Failed to fetch pouches');
      } finally {
        setLoading(false);
      }
    };

    fetchPouches();
  }, [selectedRecord, selectedDepartment]);

  // Generate Setting ID and Pouch IDs
  useEffect(() => {
    if (selectedRecord) {
      const [_, date, month, year, number, subnumber] = selectedRecord.split('/');
      // Create prefix based on selected department (S + first letter of department)
      const deptPrefix = {
        'Polishing': 'SP',
        'Dull': 'SD'
      }[selectedDepartment] || 'S';
      
      const newSettingId = `${deptPrefix}/${date}/${month}/${year}/${number}/${subnumber || '001'}`;
      setFilingId(newSettingId);
    }
  }, [selectedRecord, selectedDepartment]);

  // Handle pouch weight change
  const handlePouchWeightChange = (pouchId: string, weight: number, maxWeight: number) => {
    if (weight > maxWeight) {
      toast.error(`Weight cannot exceed ${maxWeight.toFixed(4)}g`);
      return;
    }

    setPouchWeights(prev => {
      const newWeights = { ...prev, [pouchId]: weight };
      const newTotal = Object.values(newWeights).reduce((sum, w) => sum + (w || 0), 0);
      setTotalWeight(newTotal);
      return newWeights;
    });
  };

  // Update record selection handler
  const handleRecordSelection = (recordName: string) => {
    setSelectedRecord(recordName);
    const recordData = departmentRecords.find(record => record.Name === recordName);
    setSelectedRecordData(recordData || null);
  };

  // Handle filing weight change
  const handleFilingWeightChange = (weight: number) => {
    setFilingWeight(weight);
    // Recalculate total weight including pouches
    const pouchTotal = Object.values(pouchWeights).reduce((sum, w) => sum + (w || 0), 0);
    setTotalWeight(pouchTotal + weight);
  };

  // Add handler for pouch selection
  const handlePouchSelection = (pouchId: string, isSelected: boolean) => {
    setSelectedPouches(prev => ({
      ...prev,
      [pouchId]: isSelected
    }));
    
    // Reset weight if pouch is deselected
    if (!isSelected) {
      setPouchWeights(prev => {
        const { [pouchId]: removed, ...rest } = prev;
        return rest;
      });
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      if (!selectedRecordData) {
        toast.error('No record selected');
        return;
      }

      // Create pouch data with new IDs
      const pouchData = Object.entries(selectedPouches)
        .filter(([_, isSelected]) => isSelected)
        .map(([pouchId]) => {
          const sourcePouch = pouches.find(p => p.Id === pouchId);
          if (!sourcePouch) return null;

          // Get the pouch number from the source pouch name
          const sourcePouchNumber = sourcePouch.Name.split('/').pop()?.replace('P', '') || '';
          // Ensure the pouch number is padded to 2 digits
          const paddedPouchNumber = sourcePouchNumber.padStart(2, '0');
          // Construct the new pouch ID with the correct format
          const newPouchId = `${filingId}/P${paddedPouchNumber}`;

          // Get the weight for this pouch
          const weight = pouchWeights[pouchId] || 0;

          // Get categories if they exist in the source pouch
          const categories = sourcePouch.categories || [];

          console.log('Processing Pouch:', {
            sourcePouch: sourcePouch.Name,
            newId: newPouchId,
            orderId: sourcePouch.Order_Id__c,
            product: sourcePouch.Product__c,
            quantity: sourcePouch.Quantity__c,
            weight: weight,
            categories: categories
          });

          return {
            pouchId: newPouchId,
            orderId: sourcePouch.Order_Id__c,
            name: sourcePouch.Product__c,
            quantity: sourcePouch.Quantity__c,
            weight: parseFloat(weight.toFixed(4)),
            categories: categories.map(cat => ({
              category: cat.Category__c,
              quantity: cat.Quantity__c
            }))
          };
        })
        .filter(Boolean); // Remove any null entries

      // Get the first pouch data for the main record
      const firstPouch = pouchData.length > 0 ? pouchData[0] : null;

      const requestData = {
        settingId: filingId, // Changed from filingId to settingId
        issuedWeight: parseFloat(totalWeight.toFixed(4)),
        issuedDate: new Date().toISOString(),
        // Include orderId, name, and quantity in the main request data
        orderId: firstPouch?.orderId || null,
        name: firstPouch?.name || null,
        quantity: firstPouch?.quantity || null,
        pouches: pouchData
      };

      // Detailed logging
      console.log('Submission Details:', {
        setting: {
          id: filingId,
          weight: totalWeight,
          date: new Date().toISOString()
        },
        pouchCount: pouchData.length,
        pouches: pouchData.map(p => ({
          pouchId: p.pouchId,
          orderId: p.orderId,
          weight: p.weight,
          categoriesCount: p.categories?.length || 0
        }))
      });

      console.log('Full Request Payload:', JSON.stringify(requestData, null, 2));

      const response = await fetch(`${apiBaseUrl}/api/setting-record/create`, { // Updated endpoint
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      const result = await response.json();
      
      console.log('Server Response:', result);

      if (result.success) {
        toast.success('Setting record created successfully');
        router.push('/Departments/Setting');
      } else {
        throw new Error(result.message || 'Failed to create setting record');
      }
    } catch (error) {
      console.error('Error creating setting:', error);
      toast.error(error.message || 'Failed to create setting record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-sm">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-6">Create Setting from Department</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Department Selection */}
            <div>
              <Label>Select Department</Label>
              <Select
                value={selectedDepartment}
                onValueChange={setSelectedDepartment}
              >
                <SelectTrigger className="w-full bg-white border-gray-200">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent 
                  className="bg-white border border-gray-200"
                  style={{ backgroundColor: 'white' }}
                >
                  <SelectItem value="Polishing">Polishing</SelectItem>
                  <SelectItem value="Dull">Dull</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Record Selection with white background */}
            {selectedDepartment && (
              <div>
                <Label>Select {selectedDepartment} Record</Label>
                <Select
                  value={selectedRecord}
                  onValueChange={handleRecordSelection}
                >
                  <SelectTrigger className="w-full bg-white border-gray-200">
                    <SelectValue placeholder={`Select ${selectedDepartment} record`} />
                  </SelectTrigger>
                  <SelectContent 
                    className="bg-white border border-gray-200"
                    style={{ backgroundColor: 'white' }}
                  >
                    {departmentRecords.map(record => (
                      <SelectItem 
                        key={record.Id} 
                        value={record.Name}
                        className="hover:bg-gray-100"
                      >
                        {record.Name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Filing ID Display */}
            {filingId && (
              <div>
                <Label>Filing ID</Label>
                <div className="mt-1 p-2 bg-gray-50 rounded">
                  {filingId}
                </div>
              </div>
            )}

            {/* Pouches */}
            {pouches.length > 0 && (
              <div className="space-y-4 mt-6">
                <h3 className="text-lg font-semibold">Select Pouches to Include</h3>
                {pouches.map((pouch) => {
                  const receivedWeightField = {
                    'Setting': 'Received_Weight_Setting__c',
                    'Polishing': 'Received_Weight_Polishing__c',
                    'Dull': 'Received_Weight_Dull__c'
                  }[selectedDepartment];
                  
                  const maxWeight = pouch[receivedWeightField] || 0;
                  const pouchNumber = pouch.Name?.split('/').pop()?.replace('P', '') || '';
                  const newPouchId = `${filingId}/P${pouchNumber.padStart(2, '0')}`;

                  return (
                    <div key={pouch.Id} className="border rounded-lg p-4">
                      <div className="grid grid-cols-5 gap-4">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedPouches[pouch.Id] || false}
                            onChange={(e) => handlePouchSelection(pouch.Id, e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <Label className="ml-2">Select Pouch</Label>
                        </div>
                        <div>
                          <Label>Source Pouch</Label>
                          <div className="mt-1">{pouch.Name}</div>
                        </div>
                        <div>
                          <Label>New Setting Pouch</Label>
                          <div className="mt-1">{newPouchId}</div>
                        </div>
                        <div>
                          <Label>Available Weight</Label>
                          <div className="mt-1">{maxWeight.toFixed(4)}g</div>
                        </div>
                        <div>
                          <Label>Weight to Setting</Label>
                          <Input
                            type="number"
                            step="0.0001"
                            value={selectedPouches[pouch.Id] ? (pouchWeights[pouch.Id] || '') : ''}
                            onChange={(e) => handlePouchWeightChange(
                              pouch.Id,
                              parseFloat(e.target.value) || 0,
                              maxWeight
                            )}
                            disabled={!selectedPouches[pouch.Id]}
                            max={maxWeight}
                            className="mt-1"
                            required={selectedPouches[pouch.Id]}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Total Weight Display */}
            <div>
              <Label>Total Weight</Label>
              <div className="mt-1 text-lg font-semibold">
                {totalWeight.toFixed(4)}g
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading || totalWeight === 0}
              className="w-full"
            >
              {loading ? 'Creating...' : 'Create Setting Record'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}