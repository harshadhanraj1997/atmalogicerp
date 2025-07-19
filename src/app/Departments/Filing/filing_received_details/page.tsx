"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { z } from 'zod';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const apiBaseUrl = "https://needha-erp-server-jmjf.onrender.com";

interface Details {
  Name: string;
  Issued_Date__c: string;
  Issued_weight__c: number;
  Total_Issued_weight__c: number;
}

interface PouchDetails {
  Pouch_Id__c: string;
  Order_Id__c: string;
  Weight__c: number;
}

// Form validation schema
const updateFormSchema = z.object({
  receivedDate: z.string().min(1, "Received date is required"),
  receivedWeight: z.number().min(0, "Weight must be non-negative"),
  grindingLoss: z.number()
});

type UpdateFormData = z.infer<typeof updateFormSchema>;

const FilingDetailsPage = () => {
  const [data, setData] = useState<{
    filing: Details;
    pouches: PouchDetails[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const filingId = searchParams.get('filingId');
  const [receivedDate, setReceivedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [receivedWeight, setReceivedWeight] = useState<number>(0);
  const [grindingLoss, setGrindingLoss] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Partial<UpdateFormData>>({});
  const [pouchReceivedWeights, setPouchReceivedWeights] = useState<{ [key: string]: number }>({});
  const [totalReceivedWeight, setTotalReceivedWeight] = useState<number>(0);
  const [ornamentWeight, setOrnamentWeight] = useState<number>(0);
  const [scrapReceivedWeight, setScrapReceivedWeight] = useState<number>(0);
  const [dustReceivedWeight, setDustReceivedWeight] = useState<number>(0);
  const [receivedTime, setReceivedTime] = useState<string>(() => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  });
  const [issuedDate, setIssuedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [issuedTime, setIssuedTime] = useState<string>(() => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  });
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [departmentRecords, setDepartmentRecords] = useState<any[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<string>("");

  useEffect(() => {
    const fetchDetails = async () => {
      if (!filingId) {
        toast.error('No filing ID provided');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${apiBaseUrl}/api/filing/${filingId}`);
        const result = await response.json();
        
        if (result.success) {
          setData(result.data);
        } else {
          toast.error(result.message || 'Failed to fetch grinding details');
        }
      } catch (error) {
        console.error('Error fetching details:', error);
        toast.error('Error fetching grinding details');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [filingId]);

  useEffect(() => {
    const totalWeight = ornamentWeight + scrapReceivedWeight + dustReceivedWeight;
    setTotalReceivedWeight(totalWeight);
    if (data) {
      const issuedWeight = data.filing.Issued_weight__c;
      const loss = issuedWeight - totalWeight;
      setGrindingLoss(loss);
    }
  }, [ornamentWeight, scrapReceivedWeight, dustReceivedWeight, data]);

  const updateFiling = async (filingNumber: string, updateData: any) => {
    console.log('[FilingReceived] Updating filing:', { filingNumber, updateData });
    
    try {
      // Parse the filing number to get components
      const [prefix, date, month, year, number,subnumber] = filingNumber.split('/');
      const apiEndpoint = `${apiBaseUrl}/api/filing/update/${prefix}/${date}/${month}/${year}/${number}/${subnumber}`;
      
      console.log('[FilingReceived] Making API call to:', apiEndpoint);
      console.log('[FilingReceived] With data:', JSON.stringify(updateData, null, 2));

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...updateData,
          receivedWeight: parseFloat(updateData.receivedWeight.toFixed(4)),
          ornamentWeight: parseFloat(updateData.ornamentWeight.toFixed(4)),
          scrapReceivedWeight: parseFloat(updateData.scrapReceivedWeight.toFixed(4)),
          dustReceivedWeight: parseFloat(updateData.dustReceivedWeight.toFixed(4)),
          grindingLoss: parseFloat(updateData.grindingLoss.toFixed(4))
        })
      });

      console.log('[FilingReceived] API response status:', response.status);
      const result = await response.json();
      console.log('[FilingReceived] API response data:', result);

      return result;
    } catch (error) {
      console.error('[FilingReceived] Error in updateFiling:', error);
      throw error;
    }
  };

  // Validate form data
  const validateForm = (data: UpdateFormData) => {
    try {
      updateFormSchema.parse(data);
      setFormErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Partial<UpdateFormData> = {};
        error.errors.forEach((err) => {
          if (err.path) {
            errors[err.path[0] as keyof UpdateFormData] = err.message;
          }
        });
        setFormErrors(errors);
      }
      return false;
    }
  };

  // Reset form
  const resetForm = () => {
    setReceivedDate(new Date().toISOString().split('T')[0]);
    setReceivedWeight(0);
    setGrindingLoss(0);
    setFormErrors({});
  };

  // Refresh data
  const refreshData = async () => {
    if (!filingId) return;

    try {
      const response = await fetch(`${apiBaseUrl}/api/filing/${filingId}`);
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
        toast.success('Data refreshed successfully');
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
    }
  };

  const handlePouchWeightChange = (pouchId: string, weight: number) => {
    console.log('[FilingReceived] Updating pouch weight:', { pouchId, weight });
    setPouchReceivedWeights(prev => {
      const newWeights = { ...prev, [pouchId]: weight };
      const newTotal = Object.values(newWeights).reduce((sum, w) => sum + (w || 0), 0);
      setOrnamentWeight(newTotal); // Update ornament weight instead of total weight
      const newTotalReceived = newTotal + scrapReceivedWeight + dustReceivedWeight;
      setTotalReceivedWeight(newTotalReceived);
      setGrindingLoss(data?.filing.Issued_weight__c ? data.filing.Issued_weight__c - newTotalReceived : 0);
      return newWeights;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      
      if (!data) {
        console.log('[FilingReceived] No data available');
        return;
      }

      // Combine date and time for received datetime
      const combinedReceivedDateTime = `${receivedDate}T${receivedTime}:00.000Z`;

      const formData = {
        receivedDate: combinedReceivedDateTime,
        receivedWeight: totalReceivedWeight,
        ornamentWeight: ornamentWeight,
        scrapReceivedWeight: scrapReceivedWeight,
        dustReceivedWeight: dustReceivedWeight,
        grindingLoss: grindingLoss,
        pouches: Object.entries(pouchReceivedWeights).map(([pouchId, weight]) => ({
          pouchId,
          receivedWeight: parseFloat(weight.toFixed(4))
        })),
        issuedDate: issuedDate,
        issuedTime: issuedTime
      };

      const result = await updateFiling(data.filing.Name, formData);
      console.log('[FilingReceived] API response:', result);

      if (result.success) {
        console.log('[FilingReceived] Update successful');
        toast.success('Filing details updated successfully');
        await refreshData();
        
        // Redirect back to the filing table page after successful submission
        setTimeout(() => {
          window.location.href = '/Departments/Filing/add_filing_details/Grinding_Table';
        }, 1500); // Short delay to allow the user to see the success message
      } else {
        console.log('[FilingReceived] Update failed:', result.message);
        throw new Error(result.message || 'Failed to update filing details');
      }
    } catch (error) {
      console.error('[FilingReceived] Error in submission:', error);
      toast.error(error.message || 'Failed to update filing details');
    } finally {
      console.log('[FilingReceived] Submission completed');
      setIsSubmitting(false);
    }
  };

  const handleRecordSelection = (value: string) => {
    setSelectedRecord(value);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-500 text-xl">Failed to load filing details</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="w-4/5 mt-10 ml-[250px] mr-auto">
        {/* Grinding Details Section */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Filing Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="text-sm text-gray-600">Filing Number</label>
                <p className="font-medium">{data.filing.Name}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Issued Date</label>
                <p className="font-medium">{new Date(data.filing.Issued_Date__c).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Total Issued Weight</label>
                <p className="font-medium">{data.filing.Issued_weight__c}g</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pouches Section */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Pouch Details</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Pouch ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Order ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Issued Weight (g)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Received Weight (g)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Loss (g)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.pouches.map((pouch) => (
                    <tr key={pouch.Id}>
                      <td className="px-4 py-3 whitespace-nowrap">{pouch.Name}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{pouch.Order_Id__c}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{pouch.Issued_Pouch_weight__c}g</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Input
                          type="number"
                          step="0.0001"
                          min="0"
                          value={pouchReceivedWeights[pouch.Id] || ''}
                          onChange={(e) => handlePouchWeightChange(pouch.Id, parseFloat(e.target.value) || 0)}
                          className="w-32 h-8"
                          placeholder="Enter weight"
                          disabled={isSubmitting}
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-red-600">
                        {pouchReceivedWeights[pouch.Id] 
                          ? (pouch.Issued_Pouch_weight__c - pouchReceivedWeights[pouch.Id]).toFixed(4)
                          : '-'}g
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-sm font-medium">Totals:</td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {data.filing.Issued_weight__c}g
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {totalReceivedWeight.toFixed(4)}g
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-red-600">
                      {(data.filing.Issued_weight__c - totalReceivedWeight).toFixed(4)}g
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Received Details Form Section */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Received Details</h2>
            <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-gray-600 block mb-1.5">
                    Received Date
                  </label>
                  <Input
                    type="date"
                    value={receivedDate}
                    onChange={(e) => setReceivedDate(e.target.value)}
                    className={`w-full h-9 ${formErrors.receivedDate ? 'border-red-500' : ''}`}
                    required
                    disabled={isSubmitting}
                  />
                  {formErrors.receivedDate && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.receivedDate}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1.5">
                    Received Time
                  </label>
                  <Input
                    type="time"
                    value={receivedTime}
                    onChange={(e) => setReceivedTime(e.target.value)}
                    className="w-full h-9"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1.5">
                    Total Received Weight (g)
                  </label>
                  <Input
                    type="number"
                    value={totalReceivedWeight.toFixed(4)}
                    className="w-full h-9 bg-gray-50"
                    disabled={true}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1.5">
                    Ornament Weight (g)
                  </label>
                  <Input
                    type="number"
                    value={ornamentWeight.toFixed(4)}
                    className="w-full h-9 bg-gray-50"
                    disabled={true}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1.5">
                    Scrap Weight (g)
                  </label>
                  <Input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={scrapReceivedWeight || ''}
                    onChange={(e) => setScrapReceivedWeight(parseFloat(e.target.value) || 0)}
                    className={`w-full h-9 ${formErrors.scrapReceivedWeight ? 'border-red-500' : ''}`}
                    placeholder="Enter scrap weight (can be 0)"
                    disabled={isSubmitting}
                  />
                  {formErrors.scrapReceivedWeight && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.scrapReceivedWeight}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1.5">
                    Dust Weight (g)
                  </label>
                  <Input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={dustReceivedWeight || ''}
                    onChange={(e) => setDustReceivedWeight(parseFloat(e.target.value) || 0)}
                    className={`w-full h-9 ${formErrors.dustReceivedWeight ? 'border-red-500' : ''}`}
                    placeholder="Enter dust weight (can be 0)"
                    disabled={isSubmitting}
                  />
                  {formErrors.dustReceivedWeight && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.dustReceivedWeight}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1.5">
                    Filing Loss (g)
                  </label>
                  <Input
                    type="number"
                    value={grindingLoss.toFixed(4)}
                    className="w-full h-9 bg-gray-50"
                    disabled={true}
                  />
                </div>
              </div>
              <div className="mt-4 text-right">
                <Button 
                  type="submit" 
                  className="px-4 py-2 text-sm"
                  disabled={isSubmitting || !receivedDate}
                >
                  {isSubmitting ? 'Updating...' : 'Update Received Details'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilingDetailsPage;
