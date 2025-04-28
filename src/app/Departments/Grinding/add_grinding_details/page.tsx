"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams } from 'next/navigation';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";

interface Pouch {
  Id: string;
  Name: string;
  Issued_Pouch_weight__c: number;
  Received_Pouch_weight__c: number;
  Product__c: string;
  Quantity__c: number;
}

export default function AddGrindingDetails() {
  const searchParams = useSearchParams();
  const filingId = searchParams.get('filingId');
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

  useEffect(() => {
    const initializeGrinding = async () => {
      if (!filingId) {
        toast.error('No filing ID provided');
        return;
      }

      try {
        const [prefix, date, month, year, number,subnumber] = filingId.split('/');
        console.log('[AddGrinding] Filing ID parts:', { prefix, date, month, year, number,subnumber });

        const generatedGrindingId = `GRIND/${date}/${month}/${year}/${number}/${subnumber}`;
        setFormattedId(generatedGrindingId);

        const pouchResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/filing/${prefix}/${date}/${month}/${year}/${number}/${subnumber}/pouches`
        );

        const pouchResult = await pouchResponse.json();
        console.log('[AddGrinding] Pouch fetch response:', pouchResult);

const pouchData = pouches.map(pouch => ({
  pouchId: pouch.Id,
  grindingWeight: pouchWeights[pouch.Id] || 0,
  quantity: pouchQuantities[pouch.Id] || 0

}));
        if (!pouchResult.success) {
          throw new Error(pouchResult.message || 'Failed to fetch pouches');

        }

        setPouches(pouchResult.data.pouches);
        
        const weights: { [key: string]: number } = {};
        const quantities: { [key: string]: number } = {};
        pouchResult.data.pouches.forEach((pouch: Pouch) => {
          weights[pouch.Id] = pouch.Issued_Pouch_weight__c || 0;
          quantities[pouch.Id] = pouch.Quantity__c || 0;
          setOrderId(pouch.Order_Id__c || '');
        });
        setPouchWeights(weights);
        setPouchQuantities(quantities);
        
        const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
        setTotalWeight(total);

      } catch (error) {
        console.error('[AddGrinding] Error:', error);
        toast.error(error.message || 'Failed to initialize grinding');
      } finally {
        setLoading(false);
      }
    };

    initializeGrinding();
  }, [filingId]);

  const handleWeightChange = (pouchId: string, weight: number) => {
    setPouchWeights(prev => {
      const newWeights = { ...prev, [pouchId]: weight };
      const newTotal = Object.values(newWeights).reduce((sum, w) => sum + (w || 0), 0);
      setTotalWeight(newTotal);
      return newWeights;
    });
  };

  const handleQuantityChange = (pouchId: string, quantity: number) => {
    setPouchQuantities(prev => ({
      ...prev,
      [pouchId]: quantity
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);

      // Combine date and time for issued datetime
      const combinedDateTime = `${issuedDate}T${issuedTime}:00.000Z`;

      // Prepare pouch data
      const pouchData = pouches.map(pouch => ({
        pouchId: pouch.Id,
        grindingWeight: pouchWeights[pouch.Id] || 0,
        quantity: pouchQuantities[pouch.Id] || 0,
        product: pouch.Product__c || 'N/A'
      }));

      // Prepare grinding data
      const grindingData = {
        grindingId: formattedId,
        issuedDate: combinedDateTime, // Use combined date and time
        pouches: pouchData,
        totalWeight: totalWeight,
        status: 'Pending',
        product: pouches[0].Product__c || 'N/A',
        quantity: pouchQuantities[pouches[0].Id] || 0,
        orderId: orderId
      };

      console.log('[AddGrinding] Submitting data:', grindingData);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/grinding/create`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(grindingData)
      });

      const result = await response.json();
      console.log('[AddGrinding] Server response:', result);

      if (result.success) {
        // Capture the order ID from the server response
        if (result.data && result.data.orderId) {
          setOrderId(result.data.orderId);
          console.log('[AddGrinding] Order ID received:', result.data.orderId);
        }
        
        toast.success('Grinding details saved successfully');
        // Optionally redirect to a success page or grinding list
      } else {
        throw new Error(result.message || 'Failed to save grinding details');
      }
    } catch (error) {
      console.error('[AddGrinding] Error:', error);
      toast.error(error.message || 'Failed to save grinding details');
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
            <h2 className="text-lg font-semibold">Add Grinding Details</h2>
            <div className="text-sm font-medium">
              Filing ID: <span className="text-gray-600">{filingId}</span>
            </div>
          </div>

          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-sm font-medium">
                Grinding ID: <span className="text-blue-600 font-bold">
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
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Pouch ID</Label>
                      <div className="h-10 flex items-center">{pouch.Name}</div>
                    </div>
                    <div>
                      <Label>Product</Label>
                      <div className="h-10 flex items-center">{pouch.Product__c || 'N/A'}</div>
                    </div>
                    <div>
                      <Label>Received Weight from filing (g)</Label>
                      <div className="h-10 flex items-center">{pouch.Received_Pouch_weight__c || 0}</div>
                    </div>
                    <div>
                      <Label>Issued Weight for Grinding (g)</Label>
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
                <span className="font-medium">Total Weight: </span>
                <span>{totalWeight.toFixed(4)}g</span>
              </div>
              <Button 
                type="submit"
                disabled={isSubmitting || totalWeight === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmitting ? 'Saving...' : 'Submit Grinding Details'}
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
