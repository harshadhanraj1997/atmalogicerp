"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { z } from 'zod';

const apiBaseUrl = "https://needha-erp-server.onrender.com";

interface CastingDetails {
  Name: string;
  Issued_Date__c: string;
  Wax_Tree_Weight__c: number;
  Required_Purity__c: string;
  Gold_Tree_Weight__c: number;
  Required_Pure_Metal_Casting__c: number;
  Required_Alloy_for_Casting__c: number;
  Issud_weight__c: number;
}

interface OrderDetails {
  Order_Id__c: string;
  id__c: string;
}

interface InventoryItem {
  Name: string;
  Issued_Date__c: string;
  Purity__c: string;
  Issue_Weight__c: number;
  Pure_Metal_weight__c: number;
  Alloy_Weight__c: number;
}

// Form validation schema
const updateFormSchema = z.object({
  receivedDate: z.string().min(1, "Received date is required"),
  receivedWeight: z.number().positive("Weight must be greater than 0"),
  ornamentWeight: z.number().positive("Ornament weight must be greater than 0"),
  scrapReceivedWeight: z.number().min(0, "Weight cannot be negative"),
  dustReceivedWeight: z.number(),
  castingLoss: z.number(),
  castingScrap: z.number(),
  castingDust: z.number()
});

type UpdateFormData = z.infer<typeof updateFormSchema>;

const CastingDetailsPage = () => {
  const [data, setData] = useState<{
    casting: CastingDetails;
    orders: OrderDetails[];
    inventoryItems: InventoryItem[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const castingId = searchParams.get('castingId');
  const [receivedDate, setReceivedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [receivedTime, setReceivedTime] = useState<string>(
    new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
  );
  const [receivedWeight, setReceivedWeight] = useState<number>(0);
  const [scrapReceivedWeight, setScrapReceivedWeight] = useState<number>(0);
  const [dustReceivedWeight, setDustReceivedWeight] = useState<number>(0);
  const [castingLoss, setCastingLoss] = useState<number>(0);
  const [castingScrap, setCastingScrap] = useState<number>(0);
  const [castingDust, setCastingDust] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Partial<UpdateFormData>>({});

  useEffect(() => {
    const fetchDetails = async () => {
      if (!castingId) {
        toast.error('No casting ID provided');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${apiBaseUrl}/api/casting/${castingId}`);
        const result = await response.json();
        
        if (result.success) {
          setData(result.data);
        } else {
          toast.error(result.message || 'Failed to fetch casting details');
        }
      } catch (error) {
        console.error('Error fetching details:', error);
        toast.error('Error fetching casting details');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [castingId]);

  useEffect(() => {
    if (data) {
      const issuedWeight = data.casting.Issud_weight__c;
      
      // Safely parse weights with null checks
      const ornamentWeight = parseFloat(receivedWeight?.toString() || '0');
      const scrapWeight = parseFloat(scrapReceivedWeight?.toString() || '0');
      const dustWeight = dustReceivedWeight ? parseFloat(dustReceivedWeight.toString()) : 0;
      
      // Calculate total received weight (excluding dust)
      const totalReceivedWeight = ornamentWeight + scrapWeight;
      
      // Calculate loss (issued - received, excluding dust)
      const totalLoss = issuedWeight - totalReceivedWeight;
      
      setCastingLoss(totalLoss);
      setCastingScrap(scrapWeight);
      setCastingDust(dustWeight);
    }
  }, [receivedWeight, scrapReceivedWeight, dustReceivedWeight, data]);

  const updateCasting = async (castingNum: string, updateData: UpdateFormData) => {
    console.log('Updating casting:', castingNum);
    
    const response = await fetch(
      `${apiBaseUrl}/api/casting/update/${castingNum.split('/')[0]}/${castingNum.split('/')[1]}/${castingNum.split('/')[2]}/${castingNum.split('/')[3]}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...updateData,
          receivedWeight: updateData.receivedWeight,
          ornamentWeight: updateData.ornamentWeight,
          scrapReceivedWeight: updateData.scrapReceivedWeight,
          dustReceivedWeight: updateData.dustReceivedWeight,
        })
      }
    );
    return response.json();
  };

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

  // Reset form
  const resetForm = () => {
    setReceivedDate(new Date().toISOString().split('T')[0]);
    setReceivedTime(
      new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
    );
    setReceivedWeight(0);
    setCastingLoss(0);
    setFormErrors({});
  };

  // Refresh data
  const refreshData = async () => {
    if (!castingId) return;
    
    try {
      const response = await fetch(`${apiBaseUrl}/api/casting/${castingId}`);
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
        toast.success('Data refreshed successfully');
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || isSubmitting) return;

    try {
      setIsSubmitting(true);

      const formData = {
        receivedDate: receivedDate,
        receivedTime: receivedTime,
        receivedWeight: receivedWeight,
        scrapReceivedWeight: scrapReceivedWeight,
        dustReceivedWeight: dustReceivedWeight,
        castingLoss: castingLoss,
        castingScrap: castingScrap,
        castingDust: castingDust
      };

      // Validate form
      if (!validateForm(formData)) {
        toast.error('Please correct the form errors');
        return;
      }

      // Show loading toast
      toast.loading('Updating casting details...', {
        id: 'updateCasting',
      });

      const result = await updateCasting(castingId, formData);
      
      if (result.success) {
        // Show success alert
        toast.success('Success!', {
          id: 'updateCasting',
          description: `Casting ${castingId} has been updated successfully.`,
          duration: 5000,
          action: {
            label: 'Dismiss',
            onClick: () => toast.dismiss('updateCasting')
          },
        });
        
        // Reset form and refresh data
        resetForm();
        await refreshData();
      } else {
        toast.error('Update Failed', {
          id: 'updateCasting',
          description: result.message || 'Failed to update received details',
        });
      }
    } catch (error) {
      console.error('Error updating received details:', error);
      toast.error('Error', {
        id: 'updateCasting',
        description: 'Failed to update casting details. Please try again.',
      });
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
        <div className="text-red-500 text-xl">Failed to load casting details</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Wrap all content in a container with width-80% and left margin */}
      <div className="w-4/5 mt-10 ml-[250px] mr-auto">
        {/* Casting Details Section */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Casting Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="text-sm text-gray-600">Casting Number</label>
                <p className="font-medium">{data.casting.Name}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Issued Date</label>
                <p className="font-medium">{new Date(data.casting.Issued_Date__c).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Wax Tree Weight</label>
                <p className="font-medium">{data.casting.Wax_Tree_Weight__c}g</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Required Purity</label>
                <p className="font-medium">{data.casting.Required_Purity__c}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Gold Tree Weight</label>
                <p className="font-medium">{data.casting.Gold_Tree_Weight__c}g</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Required Pure Metal</label>
                <p className="font-medium">{data.casting.Required_Pure_Metal_Casting__c}g</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Required Alloy</label>
                <p className="font-medium">{data.casting.Required_Alloy_for_Casting__c}g</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Total Issued Weight</label>
                <p className="font-medium">{data.casting.Issud_weight__c}g</p>
              </div>
            </div>
          </div>
        </div>

        {/* Orders Section */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Related Orders</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference ID</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.orders.map((order) => (
                    <tr key={order.id__c}>
                      <td className="px-6 py-4 whitespace-nowrap">{order.Order_Id__c}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{order.id__c}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Inventory Items Section */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Issued Inventory Items</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issue Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issue Weight</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pure Metal</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alloy</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.inventoryItems.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">{item.Name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{new Date(item.Issued_Date__c).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{item.Purity__c}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{item.Issue_Weight__c}g</td>
                      <td className="px-6 py-4 whitespace-nowrap">{item.Pure_Metal_weight__c}g</td>
                      <td className="px-6 py-4 whitespace-nowrap">{item.Alloy_Weight__c}g</td>
                    </tr>
                  ))}
                </tbody>
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
                    Received Time
                  </label>
                  <Input
                    type="time"
                    value={receivedTime}
                    onChange={(e) => setReceivedTime(e.target.value)}
                    className="w-full h-9"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1.5">
                    Received Weight of ornaments(g)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={receivedWeight || ''}
                    onChange={(e) => setReceivedWeight(parseFloat(e.target.value) || 0)}
                    className={`w-full h-9 ${formErrors.receivedWeight ? 'border-red-500' : ''}`}
                    required
                    placeholder="Enter received weight"
                    disabled={isSubmitting}
                  />
                  {formErrors.receivedWeight && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.receivedWeight}</p>
                  )}
                </div>
                
                <div>
                  <label className="text-sm text-gray-600 block mb-1.5">
                    Received Weight of scrap (g)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={scrapReceivedWeight || ''}
                    onChange={(e) => setScrapReceivedWeight(parseFloat(e.target.value) || 0)}
                    className={`w-full h-9 ${formErrors.scrapReceivedWeight ? 'border-red-500' : ''}`}
                    required
                    placeholder="Enter received weight"
                    disabled={isSubmitting}
                  />
                  {formErrors.scrapReceivedWeight && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.scrapReceivedWeight}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1.5">
                    Dust Weight (can be negative)
                  </label>
                  <Input
                    type="text"
                    value={dustReceivedWeight || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow empty string or valid numbers (including decimals and negative)
                      if (value === '' || !isNaN(parseFloat(value))) {
                        setDustReceivedWeight(value === '' ? 0 : parseFloat(value));
                      }
                    }}
                    className="w-full h-9"
                    placeholder="Enter dust weight (can be negative)"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1.5">
                    Casting Loss (g)
                  </label>
                  <Input
                    type="number"
                    value={castingLoss.toFixed(4)}
                    readOnly
                    className="w-full h-9 bg-gray-50"
                    disabled={true}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1.5">
                    Total Issued Weight
                  </label>
                  <Input
                    type="number"
                    value={data?.casting.Issud_weight__c.toFixed(4) || '0.0000'}
                    className="w-full h-9 bg-gray-50"
                    disabled={true}
                  />
                </div>
              </div>
              
              <div className="mt-4 text-right">
                <Button 
                  type="submit" 
                  className="px-4 py-2 text-sm"
                  disabled={isSubmitting}
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

export default CastingDetailsPage;