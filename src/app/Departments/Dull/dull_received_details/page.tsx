"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { z } from 'zod';
import { Label } from "@/components/ui/label";

const apiBaseUrl = "https://needha-erp-server.onrender.com";

interface Setting {
  Id: string;
  Name: string;
  Issued_Date__c: string;
  Issued_Weight__c: number;
  Returned_Weight__c: number;
  Received_Date__c: string;
  Status__c: string;
  Setting_l__c: number;
}

interface Pouch {
  Id: string;
  Name: string;
  Isssued_Weight_Setting__c: number;
  Received_Weight_Setting__c: number;
}

interface SettingData {
  setting: Setting;
  pouches: Pouch[];
}

// Form validation schema
const updateFormSchema = z.object({
  receivedDate: z.string().min(1, "Received date is required"),
  receivedWeight: z.number().positive("Weight must be greater than 0"),
  settingLoss: z.number(),
  pouches: z.array(z.object({
    pouchId: z.string(),
    receivedWeight: z.number(),
    settingLoss: z.number()
  }))
});

type UpdateFormData = z.infer<typeof updateFormSchema>;

    const DullDetailsPage = () => {
  const [data, setData] = useState<SettingData | null>(null);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const dullId = searchParams.get('dullId');
  const [receivedDate, setReceivedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [receivedWeight, setReceivedWeight] = useState<number>(0);
  const [settingLoss, setSettingLoss] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Partial<UpdateFormData>>({});
  const [pouchReceivedWeights, setPouchReceivedWeights] = useState<{ [key: string]: number }>({});
  const [totalReceivedWeight, setTotalReceivedWeight] = useState<number>(0);

  // Add pouch weight change handler
  const handlePouchWeightChange = (pouchId: string, weight: number) => {
    setPouchReceivedWeights(prev => ({
      ...prev,
      [pouchId]: weight
    }));
  };

  // Calculate total received weight when pouch weights change
  useEffect(() => {
    const total = Object.values(pouchReceivedWeights).reduce((sum, weight) => sum + weight, 0);
    setTotalReceivedWeight(total);
    setReceivedWeight(total);
  }, [pouchReceivedWeights]);

  // Calculate setting loss when received weight changes
  useEffect(() => {
    if (data && receivedWeight > 0) {
      const issuedWeight = data.dull.Issued_Weight__c;
      const loss = Number((issuedWeight - receivedWeight).toFixed(4));
      setSettingLoss(loss);
    }
  }, [receivedWeight, data]);

  // Update fetch details to include pouches
  useEffect(() => {
    const fetchDullDetails = async () => {
      if (!dullId) {
        toast.error('No dull ID provided');
        setLoading(false);
        return;
      }

      try {
        const [prefix, date, month, year, number] = dullId.split('/');
        
        // Use the correct API endpoint
        const response = await fetch(
          `${apiBaseUrl}/api/dull/${prefix}/${date}/${month}/${year}/${number}/pouches`
        );

        console.log('[Dull Details] Fetching from:', 
          `${apiBaseUrl}/api/dull/${prefix}/${date}/${month}/${year}/${number}/pouches`
        );

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.message || 'Failed to fetch setting details');
        }

        // Initialize received weights from existing data
        const initialWeights: { [key: string]: number } = {};
        result.data.pouches.forEach((pouch: Pouch) => {
          initialWeights[pouch.Id] = pouch.Received_Weight_Setting__c || 0;
        });

        setPouchReceivedWeights(initialWeights);
        setData(result.data);

        // Calculate initial total weight
        const total = Object.values(initialWeights).reduce((sum, weight) => sum + (weight || 0), 0);
        setTotalReceivedWeight(total);
        setReceivedWeight(total);

      } catch (error) {
        console.error('[Dull Details] Error fetching details:', error);
        toast.error(error.message || 'Failed to fetch dull details');
      } finally {
        setLoading(false);
      }
    };

    fetchDullDetails();
  }, [dullId]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);

      if (!data || !data.dull || !dullId) {
        console.error('[Dull Details] Missing data for submission:', { data, dullId });
        throw new Error('Missing required data for submission');
      }

      // Use the dullId from URL params instead of data.dull.Name
      const [prefix, date, month, year, number] = dullId.split('/');
      
      console.log('[Dull Details] Submitting update:', {
        dullId,
        receivedDate,
        totalReceivedWeight,
        dullLoss: settingLoss,
        pouchCount: data.pouches.length
      });

      const pouchData = data.pouches.map(pouch => ({
        pouchId: pouch.Id,
        receivedWeight: pouchReceivedWeights[pouch.Id] || 0,
        dullLoss: pouch.Issued_Weight_Dull__c - (pouchReceivedWeights[pouch.Id] || 0)
      }));

      console.log('[Dull Details] Pouch data:', pouchData);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/dull/update/${prefix}/${date}/${month}/${year}/${number}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            receivedDate,
            receivedWeight: totalReceivedWeight,
            dullLoss: settingLoss,
            pouches: pouchData
          })
        }
      );

      const result = await response.json();
      console.log('[Dull Details] Update response:', result);

      if (result.success) {
        toast.success('Dull details updated successfully');
        window.location.reload();
      } else {
        throw new Error(result.message || 'Failed to update dull details');
      }
    } catch (error) {
      console.error('[Dull Details] Update error:', error);
      toast.error(error.message || 'Failed to update dull details');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading dull details...</div>;
  }

  if (!data || !data.dull) {
    return <div className="p-6">Failed to load dull details</div>;
  }

  const { dull, pouches } = data;

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Dull Details</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Dull Number</Label>
              <div className="mt-1">{dull?.Name || 'N/A'}</div>
            </div>
            <div>
              <Label>Issued Date</Label>
              <div className="mt-1">
                {dull?.Issued_Date__c ? new Date(dull.Issued_Date__c).toLocaleDateString() : 'N/A'}
              </div>
            </div>
            <div>
              <Label>Issued Weight</Label>
              <div className="mt-1">{dull?.Issued_Weight__c?.toFixed(4) || '0.0000'}g</div>
            </div>
            <div>
              <Label>Status</Label>
              <div className="mt-1">{dull?.Status__c || 'N/A'}</div>
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
                        <div className="mt-1">{pouch.Issued_Weight_Dull__c?.toFixed(4) || '0.0000'}g</div>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Total Received Weight</Label>
                  <div className="mt-1 font-semibold">{totalReceivedWeight.toFixed(4)}g</div>
                </div>
                <div>
                  <Label>Dull Loss</Label>
                  <div className="mt-1 font-semibold">{settingLoss.toFixed(4)}g</div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || totalReceivedWeight === 0}
                className="w-full"
              >
                {isSubmitting ? 'Updating...' : 'Update Dull Details'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DullDetailsPage;
