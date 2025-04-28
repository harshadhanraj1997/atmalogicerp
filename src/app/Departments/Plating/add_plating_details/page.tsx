"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams } from 'next/navigation';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { useRouter } from 'next/navigation';

interface Pouch {   
  Id: string;
  Name: string;
  Isssued_Weight_Grinding__c: number;
  Received_Weight_Grinding__c: number;
  Issued_Pouch_weight__c?: number;
  Product__c?: string;
  Quantity__c?: number;
}

export default function AddPlatingDetails() {
  const searchParams = useSearchParams();
  const dullId = searchParams.get('dullId');
  const [loading, setLoading] = useState(true);
  const [formattedId, setFormattedId] = useState<string>('');
  const [pouches, setPouches] = useState<Pouch[]>([]);
  const [pouchWeights, setPouchWeights] = useState<{ [key: string]: number }>({});
  const [pouchQuantities, setPouchQuantities] = useState<{ [key: string]: number }>({});
  const [issuedDate, setIssuedDate] = useState(new Date().toISOString().split('T')[0]);
  const [issuedTime, setIssuedTime] = useState<string>(() => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  });
  const [totalWeight, setTotalWeight] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    const initializePlating = async () => {
      if (!dullId) {
        console.log('[Add Plating] No dull ID provided');
        toast.error('No dull ID provided');
        setLoading(false);
        return;
      }

      try {
        const [prefix, date, month, year, number, subnumber] = dullId.split('/');
        console.log('[Add Plating] Dull ID parts:', { prefix, date, month, year, number, subnumber });

        const generatedPlatingId = `PLAT/${date}/${month}/${year}/${number}/  ${subnumber}`;
        setFormattedId(generatedPlatingId);

        console.log('[Add Plating] Fetching pouches from:', {
          url: `${process.env.NEXT_PUBLIC_API_URL}/api/dull/${prefix}/${date}/${month}/${year}/${number}/${subnumber}/pouches`
        });

        const pouchResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/dull/${prefix}/${date}/${month}/${year}/${number}/${subnumber}/pouches`
        );

        const pouchResult = await pouchResponse.json();
        console.log('[Add Plating] Pouch API Response:', pouchResult);

        if (!pouchResult.success) {
          throw new Error(pouchResult.message || 'Failed to fetch pouches');
        }

        const formattedPouches = pouchResult.data.pouches.map((pouch: Pouch) => ({
          ...pouch,
          Name: pouch.Name,
          Issued_Pouch_weight__c: pouch.Issued_Weight_Dull__c || 0,
          Received_Weight_Grinding__c: pouch.Received_Weight_Dull__c || 0,
          Product__c: pouch.Product__c || '',
          Quantity__c: pouch.Quantity__c || 0
        }));

        console.log('[Add Plating] Formatted pouches:', formattedPouches);

        setPouches(formattedPouches);
        
        const weights: { [key: string]: number } = {};
        const quantities: { [key: string]: number } = {};
        formattedPouches.forEach((pouch: Pouch) => {
          weights[pouch.Id] = pouch.Issued_Pouch_weight__c || 0;
          quantities[pouch.Id] = pouch.Quantity__c || 0;
          setOrderId(pouch.Order_Id__c || '');
        });
        setPouchWeights(weights);
        setPouchQuantities(quantities);
        
        const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
        setTotalWeight(total);

        console.log('[Add Plating] Initial state set:', {
          formattedId: generatedPlatingId,
          pouchCount: formattedPouches.length,
          weights,
          totalWeight: total
        });

      } catch (error) {
        console.error('[Add Plating] Error:', error);
        console.error('[Add Plating] Full error details:', JSON.stringify(error, null, 2));
        toast.error(error.message || 'Failed to initialize plating');
      } finally {
        console.log('[Add Plating] Setting loading to false');
        setLoading(false);
      }
    };

    console.log('[Add Plating] Component mounted with dullId:', dullId);
    initializePlating();
  }, [dullId]);

  const handleWeightChange = (pouchId: string, weight: number) => {
    setPouchWeights(prev => {
      const newWeights = { ...prev, [pouchId]: weight };
      const total = Object.values(newWeights).reduce((sum, w) => sum + (w || 0), 0);
      setTotalWeight(total);
      return newWeights;
    });
  };

  const handleQuantityChange = (pouchId: string, quantity: number) => {
    setPouchQuantities(prev => {
      return { ...prev, [pouchId]: quantity };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);

      // Prepare pouch data
      const pouchData = pouches.map(pouch => ({
        pouchId: pouch.Id,
        platingWeight: pouchWeights[pouch.Id] || 0,
        product: pouch.Product__c || '',
        quantity: pouchQuantities[pouch.Id] || 0
      }));

      // Combine date and time for issued datetime - without Z to avoid timezone conversion
      const issuedDateTime = `${issuedDate}T${issuedTime}:00.000Z`;

      console.log('[Add Plating] Preparing submission with:', {
        platingId: formattedId,
        issuedDateTime,
        pouchCount: pouchData.length,
        totalWeight,
        pouches: pouchData,
        pouchWeights,
        pouchQuantities
      });

      // Prepare plating data
      const platingData = {
        platingId: formattedId,
        issuedDate: issuedDateTime, // Send combined date and time as issuedDate
        pouches: pouchData,
        totalWeight: totalWeight,
        status: 'Pending',
        product: pouches[0]?.Product__c || 'N/A',
        quantity: pouchQuantities[pouches[0]?.Id] || 0,
        orderId: orderId
      };

      console.log('[Add Plating] Submitting to API:', {
        url: `${process.env.NEXT_PUBLIC_API_URL}/api/plating/create`,
        data: JSON.stringify(platingData, null, 2)
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/plating/create`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(platingData)
      });

      const result = await response.json();
      console.log('[Add Plating] API Response:', result);

      if (result.success) {
        console.log('[Add Plating] Submission successful:', {
          platingId: result.data.platingId,
          platingRecordId: result.data.platingRecordId,
          pouchData: pouchData
        });
        
        toast.success('Plating details saved successfully');
        
        // Reset form
        setPouches([]);
        setPouchWeights({});
        setPouchQuantities({});
        setTotalWeight(0);
        setIssuedDate(new Date().toISOString().split('T')[0]);
        setIssuedTime(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));
        setFormattedId('');
        setLoading(false);
        
      } else {
        console.error('[Add Plating] API returned error:', result);
        throw new Error(result.message || 'Failed to save plating details');
      }
    } catch (error) {
      console.error('[Add Plating] Error:', error);
      console.error('[Add Plating] Full error details:', JSON.stringify(error, null, 2));
      toast.error(error.message || 'Failed to save plating details');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="h-screen overflow-hidden">
      <div className="h-full overflow-y-auto p-4 pt-40 mt-[-30px] bg-gray-50">
        <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold">Add Plating Details</h2>
            <div className="text-sm font-medium">
              Dull ID: <span className="text-gray-600">{dullId}</span>
            </div>
          </div>

          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-sm font-medium">
                Plating ID: <span className="text-blue-600 font-bold">
                  {formattedId || 'Generating...'}
                </span>
              </div>
              <div>
                <Label htmlFor="issuedDate">Issued Date</Label>
                <Input
                  id="issuedDate"
                  type="date"
                  value={issuedDate}
                  onChange={(e) => setIssuedDate(e.target.value)}
                  className="h-10"
                />
              </div>
              <div>
                <Label htmlFor="issuedTime">Issued Time</Label>
                <Input
                  id="issuedTime"
                  type="time"
                  value={issuedTime}
                  onChange={(e) => setIssuedTime(e.target.value)}
                  className="h-10"
                />
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-medium">Pouch Details</h3>
              {pouches.map((pouch) => (
                <div key={pouch.Id} className="p-4 border rounded-lg">
                  <div className="grid grid-cols-5 gap-4">
                    <div>
                      <Label>Pouch ID</Label>
                      <div className="h-10 flex items-center">{pouch.Name}</div>
                    </div>
                    <div>
                      <Label>Product</Label>
                      <div className="h-10 flex items-center text-gray-600">
                        {pouch.Product__c || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <Label>Received Weight from Dull (g)</Label>
                      <div className="h-10 flex items-center text-gray-600">
                        {pouch.Received_Weight_Grinding__c?.toFixed(4) || '0.0000'}
                      </div>
                    </div>
                    <div>
                      <Label>Weight for Plating (g)</Label>
                      <Input
                        type="number"
                        step="0.00001"
                        value={pouchWeights[pouch.Id] || ''}
                        onChange={(e) => handleWeightChange(pouch.Id, parseFloat(e.target.value) || 0)}
                        className="h-10"
                      />
                    </div>
                    <div>
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        value={pouchQuantities[pouch.Id] || ''}
                        onChange={(e) => handleQuantityChange(pouch.Id, parseInt(e.target.value) || 0)}
                        className="h-10"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
                
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <div>
                <span className="font-medium">Total Weight:</span>
                <span>{totalWeight.toFixed(4)}g</span>
              </div>
              <Button 
                type="submit"
                disabled={isSubmitting || totalWeight === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmitting ? 'Saving...' : 'Submit Plating Details'}
              </Button>
            </div>
          </form>
          {orderId && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm font-medium flex items-center">
                <span className="mr-2">Order ID:</span>
                <span className="text-blue-600 font-bold">{orderId}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}