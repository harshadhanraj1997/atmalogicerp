"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { z } from 'zod';

const apiBaseUrl = "https://needha-erp-server.onrender.com";

interface Details {
  Id: string;
  Name: string;
  Issued_Date__c: string;
  Issued_Weight__c: number;
  Received_Date__c: string;
  Received_Weight__c: number;
  Status__c: string;
  Grinding_loss__c: number;
}

interface Pouch {
  Id: string;
  Name: string;
  Order_Id__c: string;
  Grinding__c: string;
  Isssued_Weight_Grinding__c: number;
}

// Form validation schema
const updateFormSchema = z.object({
  receivedDate: z.string().min(1, "Received date is required"),
  receivedWeight: z.number().positive("Weight must be greater than 0"),
  grindingLoss: z.number(),
  pouches: z.array(z.object({
    pouchId: z.string(),
    receivedWeight: z.number(),
    grindingLoss: z.number()
  }))
});

type UpdateFormData = z.infer<typeof updateFormSchema>;

const GrindingDetailsPage = () => {
  const [data, setData] = useState<{
    grinding: Details;
    pouches: Pouch[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const grindingId = searchParams.get('grindingId');
  const [receivedDate, setReceivedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [receivedWeight, setReceivedWeight] = useState<number>(0);
  const [grindingLoss, setGrindingLoss] = useState<number>(0);
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
    setReceivedWeight(total); // Update the main received weight
  }, [pouchReceivedWeights]);

  // Update fetch details to include pouches
  useEffect(() => {
    const fetchDetails = async () => {
      if (!grindingId) {
        toast.error('No grinding ID provided');
        setLoading(false);
        return;
      }

      try {
        const [prefix, date, month, year, number] = grindingId.split('/');
        const response = await fetch(
          `${apiBaseUrl}/api/grinding/${prefix}/${date}/${month}/${year}/${number}`
        );
        const result = await response.json();
        
        if (result.success && result.data) {
          const { grinding, pouches } = result.data;
          
          setData({
            grinding: {
              Id: grinding.Id || '',
              Name: grinding.Name || '',
              Issued_Date__c: grinding.Issued_Date__c || '',
              Issued_Weight__c: Number(grinding.Issued_Weight__c) || 0,
              Received_Date__c: grinding.Received_Date__c || '',
              Received_Weight__c: Number(grinding.Received_Weight__c) || 0,
              Status__c: grinding.Status__c || 'Open',
              Grinding_loss__c: Number(grinding.Grinding_loss__c) || 0
            },
            pouches: pouches.map((pouch: Pouch) => ({
              Id: pouch.Id || '',
              Name: pouch.Name || '',
              Order_Id__c: pouch.Order_Id__c || '',
              Grinding__c: pouch.Grinding__c || '',
              Issued_Weight__c: Number(pouch.Isssued_Weight_Grinding__c) || 0,
              Received_Weight__c: 0
            }))
          });

          if (grinding.Received_Weight__c) {
            setReceivedWeight(Number(grinding.Received_Weight__c));
          }

          if (grinding.Received_Date__c) {
            setReceivedDate(grinding.Received_Date__c);
          }

          if (grinding.Grinding_loss__c) {
            setGrindingLoss(Number(grinding.Grinding_loss__c));
          }

        } else {
          toast.error(result.message || 'Grinding record not found');
        }
      } catch (error) {
        console.error('Error fetching details:', error);
        toast.error('Error fetching grinding details');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [grindingId]);

  useEffect(() => {
    if (data && receivedWeight > 0) {
      const issuedWeight = data.grinding.Issued_Weight__c;
      const loss = Number((issuedWeight - receivedWeight).toFixed(4));
      setGrindingLoss(loss);
    }
  }, [receivedWeight, data]);

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
        grindingLoss: pouch.Issued_Weight__c - (pouchReceivedWeights[pouch.Id] || 0)
      }));

      // Extract grinding number parts
      const [prefix, date, month, year, number] = data.grinding.Name.split('/');

      // Prepare form data
      const formData = {
        receivedDate,
        receivedWeight,
        grindingLoss,
        pouches: pouchesData
      };

      // Validate form data
      if (!validateForm(formData)) {
        return;
      }

      const response = await fetch(
        `${apiBaseUrl}/api/grinding/update/${prefix}/${date}/${month}/${year}/${number}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData)
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success('Grinding details updated successfully');
        // Refresh data after update
        window.location.reload();
      } else {
        throw new Error(result.message || 'Failed to update grinding details');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to update grinding details');
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

  if (!data) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-500 text-xl">Failed to load grinding details</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="w-4/5 mt-10 ml-[250px] mr-auto">
        {/* Grinding Details Section */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Grinding Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="text-sm text-gray-600">Grinding Number</label>
                <p className="font-medium">{data.grinding.Name}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Issued Date</label>
                <p className="font-medium">
                  {new Date(data.grinding.Issued_Date__c).toLocaleDateString()}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Issued Weight</label>
                <p className="font-medium">{data.grinding.Issued_Weight__c}g</p>
              </div>
            </div>
          </div>
        </div>

        {/* Add Pouches Section */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Pouch Details</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pouch Number
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order Number
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Issued Weight (g)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Received Weight (g)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Loss (g)
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data?.pouches?.map((pouch) => (
                    <tr key={pouch.Id}>
                      <td className="px-4 py-3 whitespace-nowrap">{pouch.Name}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{pouch.Order_Id__c}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{pouch.Issued_Weight__c}g</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Input
                          type="number"
                          step="0.0001"
                          min="0"
                          value={pouchReceivedWeights[pouch.Id] || ''}
                          onChange={(e) => handlePouchWeightChange(pouch.Id, parseFloat(e.target.value) || 0)}
                          className="w-32 h-8"
                          placeholder="Enter weight"
                          disabled={isSubmitting}
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-red-600">
                        {pouchReceivedWeights[pouch.Id] 
                          ? (pouch.Issued_Weight__c - pouchReceivedWeights[pouch.Id]).toFixed(4)
                          : '-'}g
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-sm font-medium">Totals:</td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {data?.grinding?.Issued_Weight__c || 0}g
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {totalReceivedWeight.toFixed(4)}g
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-red-600">
                      {((data?.grinding?.Issued_Weight__c || 0) - totalReceivedWeight).toFixed(4)}g
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Received Details Form Section */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Received Details</h2>
            <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-gray-600 block mb-1.5">
                    Received Date
                  </label>
                  <Input
                    type="date"
                    value={receivedDate}
                    onChange={(e) => setReceivedDate(e.target.value)}
                    className={`w-full h-9 ${formErrors.receivedDate ? 'border-red-500' : ''}`}
                    required
                    disabled={isSubmitting}
                  />
                  {formErrors.receivedDate && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.receivedDate}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1.5">
                    Received Weight (g)
                  </label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={receivedWeight || ''}
                    onChange={(e) => setReceivedWeight(parseFloat(e.target.value) || 0)}
                    className={`w-full h-9 ${formErrors.receivedWeight ? 'border-red-500' : ''}`}
                    required
                    disabled={isSubmitting}
                  />
                  {formErrors.receivedWeight && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.receivedWeight}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1.5">
                    Grinding Loss (g)
                  </label>
                  <Input
                    type="number"
                    value={grindingLoss.toFixed(4)}
                    className="w-full h-9 bg-gray-50"
                    disabled={true}
                  />
                </div>
              </div>
              <div className="mt-4 text-right">
                <Button 
                  type="submit" 
                  className="px-4 py-2 text-sm"
                  disabled={isSubmitting || receivedWeight === 0}
                >
                  {isSubmitting ? 'Updating...' : 'Update Received Details'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GrindingDetailsPage;
