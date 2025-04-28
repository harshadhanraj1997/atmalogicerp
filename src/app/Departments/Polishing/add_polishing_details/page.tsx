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
  Order_Id__c: string;
  Isssued_Weight_Grinding__c: number;
  Received_Weight_Grinding__c: number;
  Received_Weight_Setting__c?: number;
  partyName?: string;
  orderNumber?: string;
  Product__c: string;
  Quantity__c: number;
}

export default function AddPolishingDetails() {
  const [isFromGrinding, setIsFromGrinding] = useState(false);
  const [isSetting, setIsSetting] = useState(false);
  const searchParams = useSearchParams();
  const filingId = searchParams.get('filingId');
  const grindingId = searchParams.get('grindingId');
  const settingId = searchParams.get('settingId');
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
  const [totalReceivedFromSetting, setTotalReceivedFromSetting] = useState(0);

  useEffect(() => {
    const initializePolishing = async () => {
      if (!filingId && !grindingId && !settingId) {
        toast.error('No ID provided');
        return;
      }

      try {
        // Get the source ID from parameters
        const sourceId = filingId || grindingId || settingId;
        console.log('[AddPolishing] Processing source ID:', sourceId);

        const idParts = sourceId!.split('/');
        const [prefix, date, month, year, number, subnumber] = idParts;

        // Determine source type by checking the prefix
        const isGrinding = prefix === 'GRIND';
        const fromSetting = prefix === 'SETTING';
        setIsFromGrinding(isGrinding);
        setIsSetting(fromSetting);
        console.log('[AddPolishing] ID Analysis:', {
          prefix,
          isGrinding,
          isSetting: fromSetting,
          fullId: sourceId
        });

        // Generate polishing ID
        const generatedPolishingId = `POLISH/${date}/${month}/${year}/${number}/${subnumber}`;
        setFormattedId(generatedPolishingId);

        // Construct the endpoint based on the API structure
        let endpoint;
        if (isGrinding) {
          endpoint = `${process.env.NEXT_PUBLIC_API_URL}/api/grinding/GRIND/${date}/${month}/${year}/${number}/${subnumber}/pouches`;
        } else if (fromSetting) {
          endpoint = `${process.env.NEXT_PUBLIC_API_URL}/api/setting/SETTING/${date}/${month}/${year}/${number}/${subnumber}/pouches`;
        } else {
          endpoint = `${process.env.NEXT_PUBLIC_API_URL}/api/setting/${prefix}/${date}/${month}/${year}/${number}/${subnumber}/pouches`;
        }

        console.log('[AddPolishing] Endpoint details:', {
          isGrinding,
          isSetting: fromSetting,
          endpoint,
          sourceType: isGrinding ? 'Grinding' : fromSetting ? 'Setting' : 'Filing',
          params: { prefix, date, month, year, number }
        });

        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error(`API call failed with status: ${response.status}`);
        }

        const result = await response.json();
        console.log('[AddPolishing] API Response:', result);

        if (!result.success) {
          throw new Error(result.message || 'Failed to fetch pouches');
        }

        console.log('[AddPolishing] Fetched pouches:', result.data.pouches);

        setPouches(result.data.pouches);
        
        // Calculate total received weight using the correct field based on source
        const weightField = isGrinding ? 'Received_Weight_Grinding__c' : 
                          fromSetting ? 'Received_Weight_Setting__c' : 
                          'Received_Weight_Setting__c';
        console.log('[AddPolishing] Using weight field:', weightField);

        const totalReceived = result.data.pouches.reduce((sum: number, pouch: Pouch) => 
          sum + (pouch[weightField] || 0), 0
        );
        setTotalReceivedFromSetting(totalReceived);

        // Initialize pouch weights and quantities
        const weights: { [key: string]: number } = {};
        const quantities: { [key: string]: number } = {};
        result.data.pouches.forEach((pouch: Pouch) => {
          weights[pouch.Id] = 0;
          quantities[pouch.Id] = pouch.Quantity__c || 0;
          setOrderId(pouch.Order_Id__c || '');
        });
        setPouchWeights(weights);
        setPouchQuantities(quantities);

      } catch (error) {
        console.error('[AddPolishing] Error details:', {
          message: error.message,
          stack: error.stack,
          sourceId: filingId || grindingId || settingId
        });
        toast.error(error.message || 'Failed to initialize polishing');
      } finally {
        setLoading(false);
      }
    };

    initializePolishing();
  }, [filingId, grindingId, settingId]);

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
      console.log('[AddPolishing] Combined datetime:', combinedDateTime);

      // Prepare pouch data
      const pouchData = pouches.map(pouch => ({
        pouchId: pouch.Id,
        polishingWeight: pouchWeights[pouch.Id] || 0,
        quantity: pouchQuantities[pouch.Id] || 0,
        product: pouch.Product__c || 'N/A'
      }));

      // Validate that all pouches have weights
      const hasInvalidWeights = pouchData.some(pouch => pouch.polishingWeight <= 0);
      if (hasInvalidWeights) {
        throw new Error('All pouches must have valid weights greater than 0');
      }

      // Prepare polishing data
      const polishingData = {
        polishingId: formattedId,
        issuedDate: combinedDateTime, // Use combined date and time
        pouches: pouchData,
        totalWeight: totalWeight,
        status: 'Pending',
        product: pouches[0]?.Product__c || 'N/A',
        quantity: pouchQuantities[pouches[0]?.Id] || 0,
        orderId: orderId
      };

      console.log('[AddPolishing] Submitting data:', polishingData);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/polishing/create`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(polishingData)
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Polishing details saved successfully');
        // Reset form
        setPouches([]);
        setPouchWeights({});
        setPouchQuantities({});
        setTotalWeight(0);
        setTotalReceivedFromSetting(0);
        setIssuedDate(new Date().toISOString().split('T')[0]);
        setIssuedTime(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));
        setFormattedId('');
        setLoading(false);
      } else {
        throw new Error(result.message || 'Failed to save polishing details');
      }
    } catch (error) {
      console.error('[AddPolishing] Error:', error);
      toast.error(error.message || 'Failed to save polishing details');
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
            <h2 className="text-lg font-semibold">Add Polishing Details</h2>
            <div className="text-sm font-medium">
              Filing ID: <span className="text-gray-600">{filingId}</span>
            </div>
          </div>

          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-sm font-medium">
                Polishing ID: <span className="text-blue-600 font-bold">
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
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <Label>Pouch ID</Label>
                      <div className="h-10 flex items-center">{pouch.Name}</div>
                    </div>
                    <div>
                      <Label>Product</Label>
                      <div className="h-10 flex items-center">{pouch.Product__c || 'N/A'}</div>
                    </div>
                    <div>
                      <Label>
                        {isFromGrinding 
                          ? 'Received Weight from Grinding' 
                          : isSetting 
                            ? 'Received Weight from Setting' 
                            : 'Received Weight from Filing'}
                      </Label>
                      <div className="h-10 flex items-center">
                        {isFromGrinding 
                          ? (pouch.Received_Weight_Grinding__c?.toFixed(4) || '0.0000')
                          : isSetting 
                            ? (pouch.Received_Weight_Setting__c?.toFixed(4) || '0.0000')
                            : (pouch.Received_Weight_Setting__c?.toFixed(4) || '0.0000')}g
                      </div>
                    </div>
                    <div>
                      <Label>Weight for Polishing</Label>
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
              <div className="space-x-6">
                <span>
                  <span className="font-medium">Total Weight for Polishing: </span>
                  <span>{totalWeight.toFixed(4)}g</span>
                </span>
              </div>
              <Button 
                type="submit"
                disabled={isSubmitting || totalWeight === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmitting ? 'Saving...' : 'Submit Polishing Details'}
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
