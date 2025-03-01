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
}

export default function AddDullDetails() {
  const searchParams = useSearchParams();
 const polishingId = searchParams.get('polishingId');
  const [loading, setLoading] = useState(true);
  const [formattedId, setFormattedId] = useState<string>('');
  const [pouches, setPouches] = useState<Pouch[]>([]);
  const [pouchWeights, setPouchWeights] = useState<{ [key: string]: number }>({});
  const [issuedDate, setIssuedDate] = useState(new Date().toISOString().split('T')[0]);
  const [totalWeight, setTotalWeight] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const initializeDull = async () => {
      if (!polishingId) {
        console.log('[Add Dull] No polishing ID provided');
        toast.error('No polishing ID provided');
        setLoading(false);
        return;
      }

      try {
        const [prefix, date, month, year, number] = polishingId.split('/');
        console.log('[Add Dull] Polishing ID parts:', { prefix, date, month, year, number });

        const generatedDullId = `DULL/${date}/${month}/${year}/${number}`;
        setFormattedId(generatedDullId);

        console.log('[Add Dull] Fetching pouches from:', {
          url: `${process.env.NEXT_PUBLIC_API_URL}/api/polishing/${prefix}/${date}/${month}/${year}/${number}/pouches`
        });

        const pouchResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/polishing/${prefix}/${date}/${month}/${year}/${number}/pouches`
        );

        const pouchResult = await pouchResponse.json();
        console.log('[Add Dull] Pouch API Response:', pouchResult);

        if (!pouchResult.success) {
          throw new Error(pouchResult.message || 'Failed to fetch pouches');
        }

        const formattedPouches = pouchResult.data.pouches.map((pouch: Pouch) => ({
          ...pouch,
          Name: pouch.Name,
          Issued_Pouch_weight__c: pouch.Issued_Weight_Polishing__c || 0,
          Received_Weight_Grinding__c: pouch.Received_Weight_Polishing__c || 0
        }));

        console.log('[Add Dull] Formatted pouches:', formattedPouches);

        setPouches(formattedPouches);
        
        const weights: { [key: string]: number } = {};
        formattedPouches.forEach((pouch: Pouch) => {
          weights[pouch.Id] = pouch.Issued_Pouch_weight__c || 0;
        });
        setPouchWeights(weights);
        
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

    console.log('[Add Dull] Component mounted with polishingId:', polishingId);
    initializeDull();
  }, [polishingId]);

  const handleWeightChange = (pouchId: string, weight: number) => {
    setPouchWeights(prev => {
      const newWeights = { ...prev, [pouchId]: weight };
      const newTotal = Object.values(newWeights).reduce((sum, w) => sum + (w || 0), 0);
      setTotalWeight(newTotal);
      return newWeights;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);

      // Prepare pouch data
      const pouchData = pouches.map(pouch => ({
        pouchId: pouch.Id,
        dullWeight: pouchWeights[pouch.Id] || 0
      }));

      console.log('[Add Dull] Preparing submission with:', {
        dullId: formattedId,
        issuedDate,
        pouchCount: pouchData.length,
        totalWeight,
        pouches: pouchData,
        pouchWeights
      });

      // Prepare dull data
      const dullData = {
        dullId: formattedId,
        issuedDate: issuedDate,
        pouches: pouchData,
        totalWeight: totalWeight,
        status: 'Pending'
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
          pouchData: pouchData
        });
        
        toast.success('Dull details saved successfully');
        
        // Reset form
        setPouches([]);
        setPouchWeights({});
        setTotalWeight(0);
        setIssuedDate(new Date().toISOString().split('T')[0]);
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
              Polishing ID: <span className="text-gray-600">{polishingId}</span>
            </div>
          </div>

          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <Label>Received Weight from Polishing (g)</Label>
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
                {isSubmitting ? 'Saving...' : 'Submit Dull Details'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}