"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { z } from 'zod';
import { Label } from "@/components/ui/label";

const apiBaseUrl = "https://needha-erp-server-jmjf.onrender.com";

interface Plating {
  Id: string;
  Name: string;
  Issued_Date__c: string;
  Issued_Weight__c: number;
  Received_Weight__c: number;
  Received_Date__c: string;
  Status__c: string;
  Plating_Loss__c: number;
}

interface Pouch {
  Id: string;
  Name: string;
  Issued_Weight_Plating__c: number;
  Received_Weight_Plating__c: number;
}

interface PlatingData {
  plating: Plating;
  pouches: Pouch[];
}

// Form validation schema
const updateFormSchema = z.object({
  receivedDate: z.string().min(1, "Received date is required"),
  receivedWeight: z.number().min(0, "Weight must be non-negative"),
  platingLoss: z.number(),
  pouches: z.array(z.object({
    pouchId: z.string(),
    receivedWeight: z.number().min(0, "Weight must be non-negative"),
    platingLoss: z.number()
  }))
});

type UpdateFormData = z.infer<typeof updateFormSchema>;

const PlatingDetailsPage = () => {
  const [data, setData] = useState<PlatingData | null>(null);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const platingId = searchParams.get('platingId');
  const [receivedDate, setReceivedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [receivedWeight, setReceivedWeight] = useState<number>(0);
  const [platingLoss, setPlatingLoss] = useState<number>(0);
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
      
      setOrnamentWeight(totalPouchWeight);
      
      const newTotalReceived = totalPouchWeight + scrapReceivedWeight + dustReceivedWeight;
      setTotalReceivedWeight(newTotalReceived);
      setReceivedWeight(newTotalReceived);
      
      setPlatingLoss(data?.plating.Issued_Weight__c ? data.plating.Issued_Weight__c - newTotalReceived : 0);
      
      return newWeights;
    });
  };

  useEffect(() => {
    const totalPouchWeight = Object.values(pouchReceivedWeights).reduce((sum, w) => sum + (w || 0), 0);
    setOrnamentWeight(totalPouchWeight);
    
    const totalWeight = totalPouchWeight + scrapReceivedWeight + dustReceivedWeight;
    setTotalReceivedWeight(totalWeight);
    setReceivedWeight(totalWeight);
    
    if (data) {
      const issuedWeight = data.plating.Issued_Weight__c;
      const loss = issuedWeight - totalWeight;
      setPlatingLoss(loss);
    }
  }, [pouchReceivedWeights, scrapReceivedWeight, dustReceivedWeight, data]);

  useEffect(() => {
    const fetchPlatingDetails = async () => {
      if (!platingId) {
        toast.error('No plating ID provided');
        setLoading(false);
        return;
      }

      try {
        // Use the Salesforce ID directly without modification
        const response = await fetch(
          `${apiBaseUrl}/api/plating/${platingId}/pouches`
        );

        console.log('[Plating Details] Fetching from:', 
          `${apiBaseUrl}/api/plating/${platingId}/pouches`,
          'Plating ID:', platingId
        );

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.message || 'Failed to fetch plating details');
        }

        // Log the received data for debugging
        console.log('[Plating Details] Received data:', result.data);

        // Initialize weights
        const initialWeights: { [key: string]: number } = {};
        if (result.data.pouches) {
          result.data.pouches.forEach((pouch: Pouch) => {
            initialWeights[pouch.Id] = pouch.Received_Weight_Plating__c || 0;
          });
        }

        setPouchReceivedWeights(initialWeights);
        setData(result.data);

        // Calculate initial total weight
        const total = Object.values(initialWeights).reduce((sum, weight) => sum + (weight || 0), 0);
        setTotalReceivedWeight(total);
        setReceivedWeight(total);

      } catch (error) {
        console.error('[Plating Details] Error fetching details:', error);
        toast.error(error.message || 'Failed to fetch plating details');
      } finally {
        setLoading(false);
      }
    };

    fetchPlatingDetails();
  }, [platingId]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      
      if (!data || !platingId) return;

      // Use the Salesforce ID directly for the update
      const response = await fetch(
        `${apiBaseUrl}/api/plating/update/${platingId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: platingId, // Include the ID in the body as well
            receivedDate,
            receivedWeight: parseFloat(totalReceivedWeight.toFixed(4)),
            ornamentWeight: parseFloat(ornamentWeight.toFixed(4)),
            scrapReceivedWeight: parseFloat(scrapReceivedWeight.toFixed(4)),
            dustReceivedWeight: parseFloat(dustReceivedWeight.toFixed(4)),
            platingLoss: parseFloat(platingLoss.toFixed(4)),
            pouches: Object.entries(pouchReceivedWeights).map(([pouchId, weight]) => ({
              pouchId,
              receivedWeight: parseFloat(weight.toFixed(4))
            }))
          })
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success('Plating details updated successfully');
        // Redirect to plating list page after successful update
        window.location.href = '/Departments/Plating/Plating_Table';
      } else {
        throw new Error(result.message || 'Failed to update plating details');
      }
    } catch (error) {
      console.error('[PlatingReceived] Error:', error);
      toast.error(error.message || 'Failed to update plating details');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add debug logging
  useEffect(() => {
    if (platingId) {
      console.log('[Plating Details] Working with ID:', platingId);
    }
  }, [platingId]);

  if (loading) {
    return <div className="p-6">Loading plating details...</div>;
  }

  if (!data || !data.plating) {
    return <div className="p-6">Failed to load plating details</div>;
  }

  const { plating, pouches } = data;

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Plating Details</h2>
          
          {/* Plating Info Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <Label>Plating Number</Label>
              <div className="mt-1">{plating?.Name || 'N/A'}</div>
            </div>
            <div>
              <Label>Issued Date</Label>
              <div className="mt-1">
                {plating?.Issued_Date__c ? new Date(plating.Issued_Date__c).toLocaleDateString() : 'N/A'}
              </div>
            </div>
            <div>
              <Label>Issued Weight</Label>
              <div className="mt-1">{plating?.Issued_Weight__c?.toFixed(4) || '0.0000'}g</div>
            </div>
            <div>
              <Label>Status</Label>
              <div className="mt-1">{plating?.Status__c || 'N/A'}</div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-8">
            <div className="space-y-6">
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
                        <div className="mt-1">{pouch.Issued_Weight_Plating__c?.toFixed(4) || '0.0000'}g</div>
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
                    <Label>Plating Loss (g)</Label>
                    <Input
                      type="number"
                      value={platingLoss.toFixed(4)}
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
                {isSubmitting ? 'Updating...' : 'Update Plating Details'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PlatingDetailsPage;
