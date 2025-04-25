"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { z } from 'zod';
import { Label } from "@/components/ui/label";

const apiBaseUrl = "https://needha-erp-server-xrdp.onrender.com";

interface Cutting {
  Id: string;
  Name: string;
  Issued_Date__c: string;
  Issued_Weight__c: number;
  Returned_Weight__c: number;
  Received_Date__c: string;
  Status__c: string;
  Cutting_Loss__c: number;
}

interface Pouch {
  Id: string;
  Name: string;
  Issued_Weight_Cutting__c: number;
  Received_Weight_Cutting__c: number;
}

interface CuttingData {
  cutting: Cutting;
  pouches: Pouch[];
}

// Form validation schema
const updateFormSchema = z.object({
  receivedDate: z.string().min(1, "Received date is required"),
  receivedTime: z.string().min(1, "Received time is required"),
  receivedWeight: z.number().min(0, "Weight must be non-negative"),
  cuttingLoss: z.number(),
  pouches: z.array(z.object({
    pouchId: z.string(),
    receivedWeight: z.number().min(0, "Weight must be non-negative"),
    cuttingLoss: z.number()
  }))
});

type UpdateFormData = z.infer<typeof updateFormSchema>;

const CuttingDetailsPage = () => {
  const [data, setData] = useState<CuttingData | null>(null);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const cuttingId = searchParams.get('cuttingId');
  
  // States for date and time components
  const [receivedDate, setReceivedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [receivedTime, setReceivedTime] = useState<string>(
    new Date().toTimeString().split(' ')[0].slice(0, 5)  // Default to current time HH:MM
  );
  
  const [receivedWeight, setReceivedWeight] = useState<number>(0);
  const [cuttingLoss, setCuttingLoss] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Partial<UpdateFormData>>({});
  const [pouchReceivedWeights, setPouchReceivedWeights] = useState<{ [key: string]: number }>({});
  const [ornamentWeight, setOrnamentWeight] = useState<number>(0);
  const [scrapReceivedWeight, setScrapReceivedWeight] = useState<number>(0);
  const [dustReceivedWeight, setDustReceivedWeight] = useState<number>(0);
  const [totalReceivedWeight, setTotalReceivedWeight] = useState<number>(0);

  // Update pouch weight handler
  const handlePouchWeightChange = (pouchId: string, weight: number) => {
    setPouchReceivedWeights(prev => {
      const newWeights = { ...prev, [pouchId]: weight };
      const totalPouchWeight = Object.values(newWeights).reduce((sum, w) => sum + (w || 0), 0);
      
      // Set ornament weight as total pouch weight
      setOrnamentWeight(totalPouchWeight);
      
      // Calculate total received weight
      const newTotalReceived = totalPouchWeight + scrapReceivedWeight + dustReceivedWeight;
      setTotalReceivedWeight(newTotalReceived);
      setReceivedWeight(newTotalReceived);
      
      // Calculate cutting loss
      setCuttingLoss(data?.cutting.Issued_Weight__c ? data.cutting.Issued_Weight__c - newTotalReceived : 0);
      
      return newWeights;
    });
  };

  // Add useEffect for total calculations
  useEffect(() => {
    // Calculate total pouch weight
    const totalPouchWeight = Object.values(pouchReceivedWeights).reduce((sum, w) => sum + (w || 0), 0);
    setOrnamentWeight(totalPouchWeight);
    
    // Calculate total received weight
    const totalWeight = totalPouchWeight + scrapReceivedWeight + dustReceivedWeight;
    setTotalReceivedWeight(totalWeight);
    setReceivedWeight(totalWeight);
    
    if (data) {
      const issuedWeight = data.cutting.Issued_Weight__c;
      const loss = issuedWeight - totalWeight;
      setCuttingLoss(loss);
    }
  }, [pouchReceivedWeights, scrapReceivedWeight, dustReceivedWeight, data]);

  // Update fetch details to include pouches
  useEffect(() => {
    const fetchCuttingDetails = async () => {
      if (!cuttingId) {
        toast.error('No cutting ID provided');
        setLoading(false);
        return;
      }

      try {
        const [prefix, date, month, year, number] = cuttingId.split('/');
        
        // Use the correct API endpoint
        const response = await fetch(
          `${apiBaseUrl}/api/cutting/${prefix}/${date}/${month}/${year}/${number}/pouches`
        );

        console.log('[Cutting Details] Fetching from:', 
          `${apiBaseUrl}/api/cutting/${prefix}/${date}/${month}/${year}/${number}/pouches`
        );

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.message || 'Failed to fetch cutting details');
        }

        // Initialize received weights from existing data
        const initialWeights: { [key: string]: number } = {};
        result.data.pouches.forEach((pouch: Pouch) => {
          initialWeights[pouch.Id] = pouch.Received_Weight_Cutting__c || 0;
        });

        setPouchReceivedWeights(initialWeights);
        setData(result.data);

        // Calculate initial total weight
        const total = Object.values(initialWeights).reduce((sum, weight) => sum + (weight || 0), 0);
        setTotalReceivedWeight(total);
        setReceivedWeight(total);

        // If there's an existing received date, set both date and time fields
        if (result.data.cutting.Received_Date__c) {
          const receivedDateTime = new Date(result.data.cutting.Received_Date__c);
          setReceivedDate(receivedDateTime.toISOString().split('T')[0]);
          
          // Format time as HH:MM
          const hours = receivedDateTime.getHours().toString().padStart(2, '0');
          const minutes = receivedDateTime.getMinutes().toString().padStart(2, '0');
          setReceivedTime(`${hours}:${minutes}`);
        }

      } catch (error) {
        console.error('[Cutting Details] Error fetching details:', error);
        toast.error(error.message || 'Failed to fetch cutting details');
      } finally {
        setLoading(false);
      }
    };

    fetchCuttingDetails();
  }, [cuttingId]);

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

  // Combine date and time into a full ISO datetime string
  const getFullDateTimeISO = (date: string, time: string): string => {
    // Create a date object from the date and time strings
    const dateObj = new Date(`${date}T${time}:00`);
    return dateObj.toISOString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      
      if (!data) return;

      const [prefix, date, month, year, number] = cuttingId!.split('/');

      // Create full ISO datetime string
      const receivedDateTime = getFullDateTimeISO(receivedDate, receivedTime);

      const response = await fetch(
        `${apiBaseUrl}/api/cutting/update/${prefix}/${date}/${month}/${year}/${number}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            receivedDate: receivedDateTime, // Send the full ISO datetime string
            receivedWeight: parseFloat(totalReceivedWeight.toFixed(4)),
            ornamentWeight: parseFloat(ornamentWeight.toFixed(4)),
            scrapReceivedWeight: parseFloat(scrapReceivedWeight.toFixed(4)),
            dustReceivedWeight: parseFloat(dustReceivedWeight.toFixed(4)),
            cuttingLoss: parseFloat(cuttingLoss.toFixed(4)),
            pouches: Object.entries(pouchReceivedWeights).map(([pouchId, weight]) => ({
              pouchId,
              receivedWeight: parseFloat(weight.toFixed(4))
            }))
          })
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success('Cutting details updated successfully');
        window.location.reload();
      } else {
        throw new Error(result.message || 'Failed to update cutting details');
      }
    } catch (error) {
      console.error('[CuttingReceived] Error:', error);
      toast.error(error.message || 'Failed to update cutting details');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading cutting details...</div>;
  }

  if (!data || !data.cutting) {
    return <div className="p-6">Failed to load cutting details</div>;
  }

  const { cutting, pouches } = data;

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Cutting Details</h2>
          
          {/* Cutting Info Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <Label>Cutting Number</Label>
              <div className="mt-1">{cutting?.Name || 'N/A'}</div>
            </div>
            <div>
              <Label>Issued Date</Label>
              <div className="mt-1">
                {cutting?.Issued_Date__c ? new Date(cutting.Issued_Date__c).toLocaleDateString() : 'N/A'}
              </div>
            </div>
            <div>
              <Label>Issued Weight</Label>
              <div className="mt-1">{cutting?.Issued_Weight__c?.toFixed(4) || '0.0000'}g</div>
            </div>
            <div>
              <Label>Status</Label>
              <div className="mt-1">{cutting?.Status__c || 'N/A'}</div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-8">
            <div className="space-y-6">
              {/* Date and Time Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Received Date</Label>
                  <Input
                    type="date"
                    value={receivedDate}
                    onChange={(e) => setReceivedDate(e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label>Received Time</Label>
                  <Input
                    type="time"
                    value={receivedTime}
                    onChange={(e) => setReceivedTime(e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>
              </div>

              {/* Pouch Details Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Pouch Details</h3>
                {pouches?.map((pouch) => (
                  <div key={pouch.Id} className="border rounded-lg p-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Pouch Number</Label>
                        <div className="mt-1">{pouch.Name || 'N/A'}</div>
                      </div>
                      <div>
                        <Label>Issued Weight</Label>
                        <div className="mt-1">{pouch.Issued_Weight_Cutting__c?.toFixed(4) || '0.0000'}g</div>
                      </div>
                      <div>
                        <Label>Received Weight</Label>
                        <Input
                          type="number"
                          step="0.0001"
                          value={pouchReceivedWeights[pouch.Id] || ''}
                          onChange={(e) => handlePouchWeightChange(pouch.Id, parseFloat(e.target.value) || 0)}
                          className="mt-1"
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Weight Details Section */}
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4">Weight Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Ornament Weight (g)</Label>
                    <Input
                      type="number"
                      value={ornamentWeight.toFixed(4)}
                      className="w-full h-9 bg-gray-50"
                      disabled={true}
                    />
                  </div>

                  <div>
                    <Label>Scrap Weight (g)</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      min="0"
                      value={scrapReceivedWeight || ''}
                      onChange={(e) => setScrapReceivedWeight(parseFloat(e.target.value) || 0)}
                      className="mt-1"
                      placeholder="Enter scrap weight (can be 0)"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <Label>Dust Weight (g)</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      min="0"
                      value={dustReceivedWeight || ''}
                      onChange={(e) => setDustReceivedWeight(parseFloat(e.target.value) || 0)}
                      className="mt-1"
                      placeholder="Enter dust weight (can be 0)"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <Label>Total Received Weight (g)</Label>
                    <Input
                      type="number"
                      value={totalReceivedWeight.toFixed(4)}
                      className="w-full h-9 bg-gray-50"
                      disabled={true}
                    />
                  </div>

                  <div>
                    <Label>Cutting Loss (g)</Label>
                    <Input
                      type="number"
                      value={cuttingLoss.toFixed(4)}
                      className="w-full h-9 bg-gray-50"
                      disabled={true}
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || totalReceivedWeight === 0}
                className="w-full mt-6"
              >
                {isSubmitting ? 'Updating...' : 'Update Cutting Details'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CuttingDetailsPage;