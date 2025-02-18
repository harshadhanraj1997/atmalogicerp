"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams } from 'next/navigation';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "react-hot-toast";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

interface Order {
  Id: string;
  Order_Id__c: string;
  Id__c: string;
  Casting__c: string;
}

interface CastingResponse {
  casting: {
    Id: string;
    Name: string;
    Issued_Date__c: string;
    Wax_Tree_Weight__c: number;
  };
  orders: Order[];
  success: boolean;
  summary: {
    totalOrders: number;
    totalInventoryItems: number;
    totalIssuedWeight: number;
    totalPureMetalWeight: number;
    totalAlloyWeight: number;
  };
}

interface CastingDetails {
  id: string;
  issuedWeight: number;
  issuedDate: string;
  orders: Order[];
}

export default function AddGrindingDetails() {
  const searchParams = useSearchParams();
  const castingId = searchParams.get('castingId');
  
  const [loading, setLoading] = useState(true);
  const [castingDetails, setCastingDetails] = useState<CastingDetails>({
    id: '',
    issuedWeight: 0,
    issuedDate: '',
    orders: []
  });
  const [bagName, setBagName] = useState('');
  const [selectedOrder, setSelectedOrder] = useState('');
  const [issuedWeight, setIssuedWeight] = useState(0);
  const [issuedDate, setIssuedDate] = useState('');
  const [bags, setBags] = useState<Array<{bagName: string; order: string}>>([]);

  // Fetch casting details and related orders
  useEffect(() => {
    const fetchCastingDetails = async () => {
      if (!castingId) {
        console.log('No castingId provided');
        return;
      }
      
      try {
        setLoading(true);
        const [year, month, date, number] = castingId.split('/');
        console.log('Parsed date components:', { year, month, date, number });
        
        const apiUrl = `${apiBaseUrl}/api/casting/all/${date}/${month}/${year}/${number}`;
        console.log('Fetching from:', apiUrl);
        
        const response = await fetch(apiUrl);
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch casting details: ${response.statusText}`);
        }
        
        const responseData = await response.json();
        console.log('Full API Response:', responseData);
        console.log('Orders from response:', responseData.data.orders);
        
        // Set default current date
        const currentDate = new Date().toISOString().split('T')[0];
        
        const castingDetailsData = {
          id: castingId,
          issuedWeight: responseData.summary.totalIssuedWeight || 0,
          issuedDate: responseData.data.casting.Issued_Date__c || currentDate,
          orders: responseData.data.orders || [] // Access orders from data object
        };
        
        console.log('Setting casting details:', castingDetailsData);
        setCastingDetails(castingDetailsData);
        
        setIssuedWeight(responseData.summary.totalIssuedWeight || 0);
        setIssuedDate(responseData.data.casting.Issued_Date__c || currentDate);

      } catch (error) {
        console.error('Error fetching casting details:', error);
        toast.error('Failed to fetch casting details');
      } finally {
        setLoading(false);
      }
    };

    fetchCastingDetails();
  }, [castingId]);

  // Add debug logging for render
  console.log('Current casting details:', castingDetails);
  console.log('Current orders:', castingDetails.orders);

  // Function to generate next pouch name
  const generatePouchName = () => {
    const nextPouchNumber = bags.length + 1;
    return `${castingId}/POUCH${nextPouchNumber}`;
  };

  // Update handleAddBag to use generated pouch name
  const handleAddBag = () => {
    if (!selectedOrder) {
      toast.error('Please select an order');
      return;
    }

    const newPouchName = generatePouchName();
    setBags([...bags, { bagName: newPouchName, order: selectedOrder }]);
    setSelectedOrder(''); // Reset order selection
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (bags.length === 0) {
      toast.error('Please add at least one bag');
      return;
    }

    try {
      setLoading(true);
      const grindingData = {
        castingId,
        issuedWeight,
        issuedDate,
        bags,
      };

      const response = await fetch(`${apiBaseUrl}/api/grinding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(grindingData),
      });

      if (!response.ok) {
        throw new Error('Failed to submit grinding details');
      }

      toast.success('Grinding details submitted successfully');
      // Reset form or redirect
    } catch (error) {
      console.error('Error submitting grinding details:', error);
      toast.error('Failed to submit grinding details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="h-screen overflow-hidden">
      <div className="h-full overflow-y-auto p-4 pt-40 mt-[-30px] bg-gray-50">
        <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-sm p-6 mr-[300px] md:mr-[300px]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold">Add Grinding Details</h2>
            <div className="text-sm font-medium">
              Casting ID: <span className="text-blue-600">{castingId}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Issued Weight and Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Issued Weight (g)</Label>
                <Input
                  type="number"
                  value={issuedWeight}
                  onChange={(e) => setIssuedWeight(Number(e.target.value))}
                  className="h-10"
                />
              </div>
              <div>
                <Label>Issued Date</Label>
                <Input
                  type="date"
                  value={issuedDate}
                  onChange={(e) => setIssuedDate(e.target.value)}
                  className="h-10"
                />
              </div>
            </div>

            {/* Bag Details */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Pouch Name</Label>
                  <Input
                    type="text"
                    value={generatePouchName()}
                    readOnly
                    className="h-10 bg-gray-100"
                  />
                </div>
                <div>
                  <Label>Select Order</Label>
                  <Select value={selectedOrder} onValueChange={setSelectedOrder}>
                    <SelectTrigger className="h-10 bg-white border border-gray-200 focus:ring-2 focus:ring-blue-500">
                      <SelectValue placeholder="Select order" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200 shadow-lg">
                      {castingDetails.orders && castingDetails.orders.length > 0 ? (
                        castingDetails.orders.map((order) => (
                          <SelectItem 
                            key={order.Id} 
                            value={order.Id}
                            className="hover:bg-gray-100 cursor-pointer py-2"
                          >
                            {order.Order_Id__c}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem 
                          value="no-orders" 
                          disabled
                          className="text-gray-500 py-2"
                        >
                          No orders available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button
                type="button"
                onClick={handleAddBag}
                className="w-full bg-blue-500"
              >
                Add Pouch
              </Button>
            </div>

            {/* Bags List */}
            {bags.length > 0 && (
              <div className="mt-4">
                <h3 className="text-md font-medium mb-2">Added Pouches</h3>
                <div className="border rounded-lg divide-y">
                  {bags.map((bag, index) => {
                    const orderDetails = castingDetails.orders.find(o => o.Id === bag.order);
                    return (
                      <div key={index} className="p-3 flex justify-between items-center">
                        <div>
                          <span className="font-medium">{bag.bagName}</span>
                          <span className="text-gray-500 ml-2">
                            Order: {orderDetails ? orderDetails.Order_Id__c : bag.order}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            const newBags = bags.filter((_, i) => i !== index);
                            setBags(newBags);
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-blue-600"
              disabled={loading || bags.length === 0}
            >
              {loading ? 'Processing...' : 'Submit Grinding Details'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
