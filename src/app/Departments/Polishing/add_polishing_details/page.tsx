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
  Issued_weight_setting__c: number;
  Received_Weight_Setting__c: number;
}

export default function AddPolishingDetails() {
  const searchParams = useSearchParams();
  const filingId = searchParams.get('filingId');
  const [loading, setLoading] = useState(true);
  const [formattedId, setFormattedId] = useState<string>('');
  const [pouches, setPouches] = useState<Pouch[]>([]);
  const [pouchWeights, setPouchWeights] = useState<{ [key: string]: number }>({});
  const [issuedDate, setIssuedDate] = useState(new Date().toISOString().split('T')[0]);
  const [totalWeight, setTotalWeight] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalReceivedFromSetting, setTotalReceivedFromSetting] = useState(0);

  useEffect(() => {
    const initializePolishing = async () => {
      if (!filingId) {
        toast.error('No filing ID provided');
        return;
      }

      try {
        const [prefix, date, month, year, number] = filingId.split('/');
        console.log('[AddPolishing] Filing ID parts:', { prefix, date, month, year, number });

        const generatedPolishingId = `POLISH/${date}/${month}/${year}/${number}`;
        setFormattedId(generatedPolishingId);

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/setting/${prefix}/${date}/${month}/${year}/${number}/pouches`
        );

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.message || 'Failed to fetch pouches');
        }

        setPouches(result.data.pouches);
        
        // Calculate total received from setting
        const totalReceived = result.data.pouches.reduce((sum: number, pouch: Pouch) => 
          sum + (pouch.Received_Weight_Setting__c || 0), 0
        );
        setTotalReceivedFromSetting(totalReceived);

        const weights: { [key: string]: number } = {};
        result.data.pouches.forEach((pouch: Pouch) => {
          weights[pouch.Id] = 0; // Initialize polishing weights to 0
        });
        setPouchWeights(weights);
        setTotalWeight(0); // Initialize total polishing weight to 0

      } catch (error) {
        console.error('[AddPolishing] Error:', error);
        toast.error(error.message || 'Failed to initialize polishing');
      } finally {
        setLoading(false);
      }
    };

    initializePolishing();
  }, [filingId]);

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
        polishingWeight: pouchWeights[pouch.Id] || 0
      }));

      // Validate that all pouches have weights
      const hasInvalidWeights = pouchData.some(pouch => pouch.polishingWeight <= 0);
      if (hasInvalidWeights) {
        throw new Error('All pouches must have valid weights greater than 0');
      }

      // Prepare polishing data
      const polishingData = {
        polishingId: formattedId,
        issuedDate: issuedDate,
        pouches: pouchData,
        totalWeight: totalWeight,
        status: 'Pending'
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
        setTotalWeight(0);
        setTotalReceivedFromSetting(0);
        setIssuedDate(new Date().toISOString().split('T')[0]);
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
                      <Label>Received Weight from Setting</Label>
                      <div className="h-10 flex items-center">{pouch.Received_Weight_Setting__c?.toFixed(4) || '0.0000'}g</div>
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
        </div>
      </div>
    </div>
  );
}
