"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams } from 'next/navigation';
import { toast } from "react-hot-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { z } from 'zod';
import { Label } from "@/components/ui/label";

const apiBaseUrl = "https://needha-erp-server.onrender.com";

interface Polishing {
  Id: string;
  Name: string;
  Issued_Date__c: string;
  Issued_Weight__c: number;
  Received_Weight__c: number;
  Received_Date__c: string;
  Status__c: string;
  Polishing_Loss__c: number;
}

interface Pouch {
  Id: string;
  Name: string;
  Issued_Weight_Polishing__c: number;
  Received_Weight_Polishing__c: number;
}

interface PolishingData {
  polishing: Polishing;
  pouches: Pouch[];
}

// Form validation schema
const updateFormSchema = z.object({
  receivedDate: z.string().min(1, "Received date is required"),
  receivedWeight: z.number().positive("Weight must be greater than 0"),
  polishingLoss: z.number(),
  pouches: z.array(z.object({
    pouchId: z.string(),
    receivedWeight: z.number(),
    polishingLoss: z.number()
  }))
});

type UpdateFormData = z.infer<typeof updateFormSchema>;

export default function PolishingReceivedDetails() {
  const searchParams = useSearchParams();
  const polishingId = searchParams.get('polishingId');
  const [loading, setLoading] = useState(true);
  const [polishing, setPolishing] = useState<Polishing | null>(null);
  const [pouches, setPouches] = useState<Pouch[]>([]);
  const [pouchReceivedWeights, setPouchReceivedWeights] = useState<{ [key: string]: number }>({});
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [totalReceivedWeight, setTotalReceivedWeight] = useState(0);
  const [polishingLoss, setPolishingLoss] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Partial<UpdateFormData>>({});

  useEffect(() => {
    const fetchPolishingDetails = async () => {
      if (!polishingId) {
        console.log('[Polishing Details] No polishing ID provided');
        toast.error('No polishing ID provided');
        setLoading(false);
        return;
      }

      try {
        const [prefix, date, month, year, number] = polishingId.split('/');
        
        console.log('[Polishing Details] Fetching details for:', {
          prefix, date, month, year, number,
          url: `${process.env.NEXT_PUBLIC_API_URL}/api/polishing/${prefix}/${date}/${month}/${year}/${number}/pouches`
        });

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/polishing/${prefix}/${date}/${month}/${year}/${number}/pouches`
        );

        const result = await response.json();
        console.log('[Polishing Details] API Response:', result);

        if (!result.success) {
          throw new Error(result.message || 'Failed to fetch polishing details');
        }

        if (!result.data?.polishing) {
          console.error('[Polishing Details] No polishing data in response');
          throw new Error('No polishing data found');
        }

        console.log('[Polishing Details] Setting state with:', {
          polishing: result.data.polishing,
          pouches: result.data.pouches
        });

        setPolishing(result.data.polishing);
        setPouches(result.data.pouches);

        // Initialize received weights
        const initialWeights: { [key: string]: number } = {};
        result.data.pouches.forEach((pouch: Pouch) => {
          initialWeights[pouch.Id] = pouch.Received_Weight_Polishing__c || 0;
        });
        setPouchReceivedWeights(initialWeights);

        // Calculate initial total
        const total = Object.values(initialWeights).reduce((sum, weight) => sum + (weight || 0), 0);
        setTotalReceivedWeight(total);

        // Calculate loss
        if (result.data.polishing?.Issued_Weight__c) {
          setPolishingLoss(result.data.polishing.Issued_Weight__c - total);
        }

      } catch (error) {
        console.error('[Polishing Details] Error:', error);
        toast.error(error.message || 'Failed to fetch polishing details');
      } finally {
        console.log('[Polishing Details] Setting loading to false');
        setLoading(false);
      }
    };

    console.log('[Polishing Details] Component mounted with polishingId:', polishingId);
    fetchPolishingDetails();
  }, [polishingId]);

  const handleWeightChange = (pouchId: string, weight: number) => {
    setPouchReceivedWeights(prev => {
      const newWeights = { ...prev, [pouchId]: weight };
      const newTotal = Object.values(newWeights).reduce((sum, w) => sum + (w || 0), 0);
      setTotalReceivedWeight(newTotal);
      
      if (polishing?.Issued_Weight__c) {
        setPolishingLoss(polishing.Issued_Weight__c - newTotal);
      }
      
      return newWeights;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);

      const [prefix, date, month, year, number] = polishingId!.split('/');

      const requestData = {
        receivedDate,
        receivedWeight: totalReceivedWeight,
        polishingLoss,
        pouches: pouches.map(pouch => ({
          pouchId: pouch.Id,
          receivedWeight: pouchReceivedWeights[pouch.Id] || 0,
          polishingLoss: pouch.Issued_Weight_Polishing__c - (pouchReceivedWeights[pouch.Id] || 0)
        }))
      };

      console.log('[Polishing Update] Sending request:', {
        url: `${process.env.NEXT_PUBLIC_API_URL}/api/polishing/update/${prefix}/${date}/${month}/${year}/${number}`,
        data: requestData
      });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/polishing/update/${prefix}/${date}/${month}/${year}/${number}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData)
        }
      );

      const result = await response.json();
      console.log('[Polishing Update] API Response:', {
        status: response.status,
        result: result
      });

      if (result.success) {
        console.log('[Polishing Update] Success:', {
          message: result.message,
          data: result.data
        });
        
        // Show success message
        toast.success('Polishing details updated successfully');
        
        // Reset form
        setReceivedDate(new Date().toISOString().split('T')[0]);
        setPouchReceivedWeights({});
        setTotalReceivedWeight(0);
        setPolishingLoss(0);
        
        // Show alert
        alert('Polishing details have been updated successfully!');
        
        // Optional: Redirect or refresh
        window.location.href = '/departments/polishing'; // Adjust the path as needed
      } else {
        console.error('[Polishing Update] API returned error:', result);
        throw new Error(result.message || 'Failed to update polishing details');
      }
    } catch (error) {
      console.error('[Polishing Update] Error:', error);
      console.error('[Polishing Update] Full error details:', JSON.stringify(error, null, 2));
      toast.error(error.message || 'Failed to update polishing details');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    console.log('[Polishing Details] Rendering loading state');
    return <div className="p-6">Loading polishing details...</div>;
  }

  if (!polishing) {
    console.log('[Polishing Details] Rendering error state - no polishing data');
    return <div className="p-6">Failed to load polishing details. Please try again.</div>;
  }

  console.log('[Polishing Details] Rendering main component with:', {
    polishing,
    pouches,
    totalReceivedWeight,
    polishingLoss
  });

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Polishing Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Polishing Number</Label>
              <div className="mt-1">{polishing.Name}</div>
            </div>
            <div>
              <Label>Issued Date</Label>
              <div className="mt-1">
                {new Date(polishing.Issued_Date__c).toLocaleDateString()}
              </div>
            </div>
            <div>
              <Label>Issued Weight</Label>
              <div className="mt-1">{polishing.Issued_Weight__c}g</div>
            </div>
            <div>
              <Label>Status</Label>
              <div className="mt-1">{polishing.Status__c}</div>
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
                {pouches.map((pouch) => (
                  <div key={pouch.Id} className="border rounded-lg p-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Pouch Number</Label>
                        <div className="mt-1">{pouch.Name}</div>
                      </div>
                      <div>
                        <Label>Issued Weight</Label>
                        <div className="mt-1">{pouch.Issued_Weight_Polishing__c}g</div>
                      </div>
                      <div>
                        <Label>Received Weight</Label>
                        <Input
                          type="number"
                          step="0.0001"
                          value={pouchReceivedWeights[pouch.Id] || ''}
                          onChange={(e) => handleWeightChange(pouch.Id, parseFloat(e.target.value) || 0)}
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
                  <Label>Polishing Loss</Label>
                  <div className="mt-1 font-semibold">{polishingLoss.toFixed(4)}g</div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || totalReceivedWeight === 0}
                className="w-full"
              >
                {isSubmitting ? 'Updating...' : 'Update Polishing Details'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
