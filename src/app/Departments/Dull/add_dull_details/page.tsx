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

export default function AddDullDetails() {
  const searchParams = useSearchParams();
  const polishingId = searchParams.get('polishingId');
  const grindingId = searchParams.get('grindingId');
  const sourceId = polishingId || grindingId || '';
  const sourceType = polishingId ? 'polishing' : grindingId ? 'grinding' : '';
  
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
    const initializeDull = async () => {
      if (!sourceId) {
        console.log('[Add Dull] No source ID provided');
        toast.error('No source ID provided');
        setLoading(false);
        return;
      }

      try {
        const [prefix, date, month, year, number, subnumber] = sourceId.split('/');
        console.log(`[Add Dull] ${sourceType} ID parts:`, { prefix, date, month, year, number, subnumber });

        const generatedDullId = `DULL/${date}/${month}/${year}/${number}/${subnumber}`;
        setFormattedId(generatedDullId);

        // Determine the API endpoint based on source type
        let apiEndpoint;
        if (sourceType === 'polishing') {
          apiEndpoint = `${process.env.NEXT_PUBLIC_API_URL}/api/polish/${prefix}/${date}/${month}/${year}/${number}/${subnumber}/pouches`;
        } else if (sourceType === 'grinding') {
          apiEndpoint = `${process.env.NEXT_PUBLIC_API_URL}/api/grinding/${prefix}/${date}/${month}/${year}/${number}/${subnumber}/pouches`;
        } else {
          throw new Error('Invalid source type');
        }

        console.log(`[Add Dull] Fetching pouches from ${sourceType}:`, {
          url: apiEndpoint
        });

        const pouchResponse = await fetch(apiEndpoint);
        const pouchResult = await pouchResponse.json();
        console.log('[Add Dull] Pouch API Response:', pouchResult);

        if (!pouchResult.success) {
          throw new Error(pouchResult.message || 'Failed to fetch pouches');
        }

        // Format pouches differently based on source type
        const formattedPouches = pouchResult.data.pouches.map((pouch: Pouch) => {
          if (sourceType === 'polishing') {
            return {
              ...pouch,
              Name: pouch.Name,
              Issued_Pouch_weight__c: pouch.Issued_Weight_Polishing__c || 0,
              Received_Weight_Grinding__c: pouch.Received_Weight_Polishing__c || 0,
              Product__c: pouch.Product__c || '',
              Quantity__c: pouch.Quantity__c || 0
            };
          } else { // grinding
            return {
              ...pouch,
              Name: pouch.Name,
              Issued_Pouch_weight__c: pouch.Issued_Weight_Grinding__c || 0,
              Received_Weight_Grinding__c: pouch.Received_Weight_Grinding__c || 0,
              Product__c: pouch.Product__c || '',
              Quantity__c: pouch.Quantity__c || 0
            };
          }
        });

        console.log('[Add Dull] Formatted pouches:', formattedPouches);

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

        console.log('[Add Dull] Initial state set:', {
          formattedId: generatedDullId,
          pouchCount: formattedPouches.length,
          weights,
          totalWeight: total
        });

      } catch (error) {
        console.error('[Add Dull] Error:', error);
        console.error('[Add Dull] Full error details:', JSON.stringify(error, null, 2));
        toast.error(error.message || 'Failed to initialize dull');
      } finally {
        console.log('[Add Dull] Setting loading to false');
        setLoading(false);
      }
    };

    initializeDull();
  }, [sourceId, sourceType]);

  const handleWeightChange = (pouchId: string, weight: number) => {
    setPouchWeights((prev) => {
      const updated = { ...prev, [pouchId]: weight };
      const total = Object.values(updated).reduce((sum, w) => sum + w, 0);
      setTotalWeight(total);
      return updated;
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

      // Prepare pouch data
      const pouchesWithWeights = pouches.map(pouch => ({
        pouchId: pouch.Id,
        dullWeight: pouchWeights[pouch.Id] || 0,
        quantity: pouchQuantities[pouch.Id] || 0,
        product: pouch.Product__c || 'N/A'
      }));

      // Combine date and time for issued datetime
      const combinedDateTime = `${issuedDate}T${issuedTime}:00.000Z`;
      console.log('[Add Dull] Combined datetime:', combinedDateTime);

      console.log('[Add Dull] Preparing submission with:', {
        dullId: formattedId,
        issuedDate,
        issuedTime,
        issuedDateTime: combinedDateTime,
        pouchCount: pouchesWithWeights.length,
        totalWeight,
        pouches: pouchesWithWeights,
        pouchWeights
      });

      // Prepare dull data
      const dullData = {
        dullId: formattedId,
        issuedDate: combinedDateTime, // Use combined date and time
        pouches: pouchesWithWeights,
        totalWeight: totalWeight,
        status: 'Pending',
        product: pouches[0]?.Product__c || 'N/A',
        quantity: pouchQuantities[pouches[0]?.Id] || 0,
        orderId: orderId


      };

      console.log('[Add Dull] Submitting to API:', {
        url: `${process.env.NEXT_PUBLIC_API_URL}/api/dull/create`,
        data: JSON.stringify(dullData, null, 2)
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dull/create`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dullData)
      });

      const result = await response.json();
      console.log('[Add Dull] API Response:', result);

      if (result.success) {
        console.log('[Add Dull] Submission successful:', {
          dullId: result.data.dullId,
          dullRecordId: result.data.dullRecordId,
          pouchData: pouchesWithWeights
        });
        
        toast.success('Dull details saved successfully');
        
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
        console.error('[Add Dull] API returned error:', result);
        throw new Error(result.message || 'Failed to save dull details');
      }
    } catch (error) {
      console.error('[Add Dull] Error:', error);
      console.error('[Add Dull] Full error details:', JSON.stringify(error, null, 2));
      toast.error(error.message || 'Failed to save dull details');
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
            <h2 className="text-lg font-semibold">Add Dull Details</h2>
            <div className="text-sm font-medium">
              Source: {sourceType ? sourceType.charAt(0).toUpperCase() + sourceType.slice(1) : 'None'} ({sourceId})
            </div>
          </div>

          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-sm font-medium">
                Dull ID: <span className="text-blue-600 font-bold">
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
                      <Label>Received Weight from {sourceType.charAt(0).toUpperCase() + sourceType.slice(1)} (g)</Label>
                      <div className="h-10 flex items-center text-gray-600">
                        {pouch.Received_Weight_Grinding__c?.toFixed(4) || '0.0000'}
                      </div>
                    </div>
                    <div>
                      <Label>Weight for Dull(g)</Label>
                      <Input
                        type="number"
                        step="0.00001"
                        value={pouchWeights[pouch.Id] || ''}
                        onChange={(e) => handleWeightChange(pouch.Id, parseFloat(e.target.value) || 0)}
                        className="h-10"
                      />
                    </div>
                    <div>
                      <Label>Product</Label>
                      <div className="h-10 flex items-center">{pouch.Product__c || 'N/A'}</div>
                    </div>
                    <div>
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        step="1"
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
                {isSubmitting ? 'Saving...' : 'Submit Dull Details'}
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