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

const SettingDetailsPage = () => {
  const [data, setData] = useState<SettingData | null>(null);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  
  // Get settingId from URL and parse it
  const settingId = searchParams.get('settingId'); // Example: "SETTING/15/03/2024/01"

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
      const issuedWeight = data.setting.Issued_Weight__c;
      const loss = Number((issuedWeight - receivedWeight).toFixed(4));
      setSettingLoss(loss);
    }
  }, [receivedWeight, data]);

  useEffect(() => {
    console.log('useEffect triggered with settingId:', settingId);
    
    const fetchSettingDetails = async () => {
      if (!settingId) {
        console.log('No settingId provided');
        toast.error('Setting ID is required');
        setLoading(false);
        return;
      }

      try {
        // Split the settingId into components
        const [prefix, date, month, year, number] = settingId.split('/');
        
        if (!prefix || !date || !month || !year || !number) {
          throw new Error('Invalid setting ID format');
        }

        const url = `${apiBaseUrl}/api/setting/${prefix}/${date}/${month}/${year}/${number}`;
        console.log('Fetching from URL:', url);

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('API Response:', result);

        if (!result.success) {
          throw new Error(result.message || 'Failed to fetch setting details');
        }

        // Set the data directly from the API response
        setData(result.data);

        // Initialize received weights from existing data
        const initialWeights: { [key: string]: number } = {};
        if (result.data.pouches) {
          result.data.pouches.forEach((pouch: Pouch) => {
            initialWeights[pouch.Id] = pouch.Received_Weight_Setting__c || 0;
          });

          setPouchReceivedWeights(initialWeights);

          const total = Object.values(initialWeights).reduce((sum, weight) => sum + (weight || 0), 0);
          setTotalReceivedWeight(total);
          setReceivedWeight(total);
        }

      } catch (error) {
        console.error('[Setting Details] Error fetching details:', error);
        toast.error(error.message || 'Failed to fetch setting details');
      } finally {
        setLoading(false);
      }
    };

    fetchSettingDetails();
  }, [settingId]); // Only depend on settingId

  console.log('Current data:', data);
  console.log('Loading state:', loading);

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
      
      if (!data) return;

      // Prepare pouch data
      const pouchesData = data.pouches.map(pouch => ({
        pouchId: pouch.Id,
        receivedWeight: pouchReceivedWeights[pouch.Id] || 0,
        settingLoss: pouch.Isssued_Weight_Setting__c - (pouchReceivedWeights[pouch.Id] || 0)
      }));

      const [prefix, date, month, year, number] = data.setting.Name.split('/');

      const response = await fetch(
        `${apiBaseUrl}/api/setting/update/${prefix}/${date}/${month}/${year}/${number}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            receivedDate,
            receivedWeight: totalReceivedWeight,
            settingLoss,
            pouches: pouchesData
          })
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success('Setting details updated successfully');
        window.location.reload();
      } else {
        throw new Error(result.message || 'Failed to update setting details');
      }
    } catch (error) {
      console.error('[Setting Update] Error:', error);
      toast.error(error.message || 'Failed to update setting details');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!data || !data.setting) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-500 text-xl">Failed to load setting details</div>
      </div>
    );
  }

  const { setting, pouches } = data;

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Setting Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Setting Number</Label>
              <div className="mt-1">{setting.Name}</div>
            </div>
            <div>
              <Label>Issued Date</Label>
              <div className="mt-1">
                {new Date(setting.Issued_Date__c).toLocaleDateString()}
              </div>
            </div>
            <div>
              <Label>Issued Weight</Label>
              <div className="mt-1">{setting.Issued_Weight__c}g</div>
            </div>
            <div>
              <Label>Status</Label>
              <div className="mt-1">{setting.Status__c}</div>
            </div>
            {setting.Received_Date__c && (
              <>
                <div>
                  <Label>Received Date</Label>
                  <div className="mt-1">
                    {new Date(setting.Received_Date__c).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <Label>Received Weight</Label>
                  <div className="mt-1">{setting.Received_Weight__c}g</div>
                </div>
                <div>
                  <Label>Setting Loss</Label>
                  <div className="mt-1">{setting.Setting_l__c}g</div>
                </div>
              </>
            )}
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
                <h3 className="text-lg font-semibold">Pouch Weights</h3>
                {pouches.map((pouch) => (
                  <div key={pouch.Id} className="border rounded-lg p-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Pouch Number</Label>
                        <div className="mt-1">{pouch.Name}</div>
                      </div>
                      <div>
                        <Label>Issued Weight</Label>
                        <div className="mt-1">{pouch.Issued_weight_setting__c}g</div>
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
                  <Label>Setting Loss</Label>
                  <div className="mt-1 font-semibold">{settingLoss.toFixed(4)}g</div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || totalReceivedWeight === 0}
                className="w-full"
              >
                {isSubmitting ? 'Updating...' : 'Update Setting Details'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SettingDetailsPage;
