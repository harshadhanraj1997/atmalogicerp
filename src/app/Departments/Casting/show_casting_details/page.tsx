"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Input } from "@/components/ui/input";

const apiBaseUrl = "https://needha-erp-server-jmjf.onrender.com";

interface CastingDetails {
  Id: string;
  Name: string;
  Issued_Date__c: string;
  Wax_Tree_Weight__c: number;
  Required_Purity__c: string;
  Gold_Tree_Weight__c: number;
  Required_Pure_Metal_Casting__c: number;
  Required_Alloy_for_Casting__c: number;
  Issud_weight__c: number;
  Received_Date__c: string | null;
  Weight_Received__c: number | null;
  Casting_Loss__c: number | null;
}

interface OrderDetails {
  Id: string;
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

const CastingAllDetailsPage = () => {
  const [data, setData] = useState<{
    casting: CastingDetails;
    orders: OrderDetails[];
    inventoryItems: InventoryItem[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const [filteredOrders, setFilteredOrders] = useState(data?.orders || []);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchDetails = async () => {
      const castingId = searchParams.get('castingId');
      console.log('Full Casting ID:', castingId);

      if (!castingId) {
        console.error('Missing casting ID');
        toast.error('Missing casting ID');
        setLoading(false);
        return;
      }

      // Split the casting ID and rearrange to match server endpoint order
      const [year, month, date, number] = castingId.split('/');
      console.log('Original ID components:', { year, month, date, number });

      if (!date || !month || !year || !number) {
        console.error('Invalid casting ID format');
        toast.error('Invalid casting ID format');
        setLoading(false);
        return;
      }

      // Construct API URL in the correct order: date/month/year/number
      const apiUrl = `${apiBaseUrl}/api/casting/all/${date}/${month}/${year}/${number}`;
      console.log('Fetching from:', apiUrl);

      try {
        console.log('Starting API request...');
        const response = await fetch(apiUrl);
        
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('API Response:', result);
        
        if (result.success) {
          console.log('Setting data:', result.data);
          setData(result.data);
          console.log('Casting Details:', result.data.casting);
          console.log('Orders:', result.data.orders);
          console.log('Inventory Items:', result.data.inventoryItems);
        } else {
          console.error('API returned error:', result.message);
          toast.error(result.message || 'Failed to fetch casting details');
        }
      } catch (error) {
        console.error('Error in fetch operation:', error);
        toast.error('Error fetching casting details');
      } finally {
        console.log('Fetch operation completed');
        setLoading(false);
      }
    };

    console.log('Component mounted, starting fetch...');
    fetchDetails();
  }, [searchParams]);

  // Log component state changes
  useEffect(() => {
    console.log('Current data state:', data);
    console.log('Loading state:', loading);
  }, [data, loading]);

  if (loading) {
    console.log('Rendering loading state');
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!data) {
    console.log('Rendering error state - no data');
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-500 text-xl">Failed to load casting details</div>
      </div>
    );
  }

  console.log('Rendering component with data');
  return (
    <div className="p-6">
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
                <p className="font-medium">
                  {new Date(data.casting.Issued_Date__c).toLocaleDateString()}
                </p>
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
              {data.casting.Received_Date__c && (
                <>
                  <div>
                    <label className="text-sm text-gray-600">Received Date</label>
                    <p className="font-medium">
                      {new Date(data.casting.Received_Date__c).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Received Weight</label>
                    <p className="font-medium">{data.casting.Weight_Received__c}g</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Casting Loss</label>
                    <p className="font-medium">{data.casting.Casting_Loss__c}g</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Orders Section with Search */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Related Orders</h2>
              <div className="w-64">
                <Input
                  type="text"
                  placeholder="Search orders..."
                  className="h-9"
                  onChange={(e) => {
                    const searchTerm = e.target.value.toLowerCase();
                    const filteredOrders = data.orders.filter(order => 
                      order.Order_Id__c.toLowerCase().includes(searchTerm) ||
                      order.id__c.toLowerCase().includes(searchTerm)
                    );
                    setFilteredOrders(filteredOrders);
                  }}
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Order ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Reference ID
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(filteredOrders.length > 0 ? filteredOrders : data.orders).map((order) => (
                    <tr key={order.Id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">{order.Order_Id__c}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{order.id__c}</td>
                    </tr>
                  ))}
                  {(filteredOrders.length === 0 && searchTerm) && (
                    <tr>
                      <td colSpan={2} className="px-6 py-4 text-center text-gray-500">
                        No orders found matching your search
                      </td>
                    </tr>
                  )}
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Item Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Issue Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Purity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Issue Weight
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Pure Metal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Alloy
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.inventoryItems.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">{item.Name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Date(item.Issued_Date__c).toLocaleDateString()}
                      </td>
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
      </div>
    </div>
  );
};

export default CastingAllDetailsPage;
