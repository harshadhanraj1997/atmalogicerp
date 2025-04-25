"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

interface Details {
  Id: string;
  Name: string;
  Issued_Date__c: string;
  Issued_Weight__c: number;
  Returned_weight__c: number;
  Received_Date__c: string;
  Status__c: string;
  Plating_loss__c: number;
}

interface Model {
  Id: string;
  Name: string;
  Order__c: string;
  Category__c: string;
  Purity__c: string;
  Size__c: string;
  Color__c: string;
  Quantity__c: number;
  Gross_Weight__c: number;
  Stone_Weight__c: number;
  Net_Weight__c: number;
}

interface Order {
  Id: string;
  Name: string;
  Order_Id__c: string;
  Party_Name__c: string;
  Delivery_Date__c: string;
  Status__c: string;
}

interface Pouch {
  Id: string;
  Name: string;
  Order_Id__c: string;
  Issued_Weight_Plating__c: number;
  Received_Weight_Plating__c: number;
  order: Order | null;
  models: Model[];
}

interface PlatingData {
  plating: Details;
  pouches: Pouch[];
}

interface ApiResponse {
  success: boolean;
  data: PlatingData;
  summary: {
    totalPouches: number;
    totalOrders: number;
    totalModels: number;
    totalPouchWeight: number;
    issuedWeight: number;
    receivedWeight: number;
    platingLoss: number;
  };
}

const PlatingDetailsPage = () => {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const platingId = searchParams.get('platingId');

  useEffect(() => {
    const fetchPlatingDetails = async () => {
      if (!platingId) {
        console.log('[Plating Details] No plating ID provided');
        toast.error('No plating ID provided');
        setLoading(false);
        return;
      }

      try {
        const [prefix, date, month, year, number] = platingId.split('/');
        
        if (!prefix || !date || !month || !year || !number) {
          console.log('[Plating Details] Invalid ID parts:', { prefix, date, month, year, number });
          throw new Error('Invalid plating ID format');
        }

        const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/plating-details/${prefix}/${date}/${month}/${year}/${number}`;
        console.log('[Plating Details] Fetching from:', apiUrl);

        const response = await fetch(apiUrl);
        const result = await response.json();

        console.log('[Plating Details] API Response:', {
          success: result.success,
          platingDetails: result.data?.plating,
          pouchCount: result.data?.pouches?.length,
          summary: result.summary,
          fullResponse: result // Full response for debugging
        });

        if (!result.success) {
          console.error('[Plating Details] API Error:', result.message);
          throw new Error(result.message || 'Failed to fetch plating details');
        }

        // Log specific data points
        console.log('[Plating Details] Plating Info:', {
          id: result.data?.plating?.Id,
          name: result.data?.plating?.Name,
          status: result.data?.plating?.Status__c,
          issuedWeight: result.data?.plating?.Issued_Weight__c,
          receivedWeight: result.data?.plating?.Returned_weight__c,
          platingLoss: result.data?.plating?.Plating_loss__c
        });

        console.log('[Plating Details] Pouches:', result.data?.pouches?.map(pouch => ({
          id: pouch.Id,
          name: pouch.Name,
          issuedWeight: pouch.Issued_Weight_Plating__c,
          receivedWeight: pouch.Received_Weight_Plating__c,
          orderId: pouch.Order_Id__c,
          modelCount: pouch.models?.length
        })));

        console.log('[Plating Details] Summary:', {
          totalPouches: result.summary?.totalPouches,
          totalOrders: result.summary?.totalOrders,
          totalModels: result.summary?.totalModels,
          totalPouchWeight: result.summary?.totalPouchWeight,
          issuedWeight: result.summary?.issuedWeight,
          receivedWeight: result.summary?.receivedWeight,
          platingLoss: result.summary?.platingLoss
        });

        setData(result);

      } catch (error) {
        console.error('[Plating Details] Error:', error);
        console.error('[Plating Details] Full error details:', {
          message: error.message,
          stack: error.stack,
          fullError: error
        });
        toast.error(error.message || 'Failed to fetch plating details');
      } finally {
        setLoading(false);
      }
    };

    fetchPlatingDetails();
  }, [platingId]);

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
        <div className="text-red-500 text-xl">Failed to load plating details</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="w-4/5 mt-10 ml-[250px] mr-auto">
        {/* Summary Section */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm text-gray-600">Total Pouches</label>
                <p className="font-medium">{data?.summary?.totalPouches || 0}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Total Orders</label>
                <p className="font-medium">{data?.summary?.totalOrders || 0}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Total Models</label>
                <p className="font-medium">{data?.summary?.totalModels || 0}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Total Pouch Weight</label>
                <p className="font-medium">{data?.summary?.totalPouchWeight?.toFixed(4) || '0.0000'}g</p>
              </div>
            </div>
          </div>
        </div>

        {/* Plating Details Section */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Plating Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm text-gray-600">Plating Number</label>
                <p className="font-medium">{data?.data?.plating?.Name || '-'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Status</label>
                <p className="font-medium">{data?.data?.plating?.Status__c || '-'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Issued Date</label>
                <p className="font-medium">
                  {data?.data?.plating?.Issued_Date__c ? new Date(data.data.plating.Issued_Date__c).toLocaleDateString() : '-'}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Issued Weight</label>
                <p className="font-medium">{data?.data?.plating?.Issued_Weight__c?.toFixed(4) || '0.0000'}g</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Received Date</label>
                <p className="font-medium">
                  {data?.data?.plating?.Received_Date__c ? new Date(data.data.plating.Received_Date__c).toLocaleDateString() : '-'}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Received Weight</label>
                <p className="font-medium">
                  {data?.data?.plating?.Returned_weight__c?.toFixed(4) || '0.0000'}g
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Plating Loss</label>
                <p className="font-medium">
                  {data?.data?.plating?.Plating_loss__c?.toFixed(4) || '0.0000'}g
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Pouches Section */}
        {data?.data?.pouches.map((pouch) => (
          <div key={pouch.Id} className="bg-white shadow rounded-lg mb-6">      
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                Pouch {pouch.Name} - Issued: {pouch.Issued_Weight_Plating__c?.toFixed(4) || '0.0000'}g
                {pouch.Received_Weight_Plating__c ? ` - Received: ${pouch.Received_Weight_Plating__c.toFixed(4)}g` : ''}
              </h3> 
              
              {/* Order Details */}
              {pouch.order && (
                <div className="mb-4">
                  <h4 className="text-md font-medium mb-2">Order Details</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded">
                    <div>
                      <label className="text-sm text-gray-600">Order Number</label>
                      <p className="font-medium">{pouch.order.Order_Id__c}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Party Name</label>
                      <p className="font-medium">{pouch.order.Party_Name__c}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Delivery Date</label>
                      <p className="font-medium">
                        {pouch.order.Delivery_Date__c ? new Date(pouch.order.Delivery_Date__c).toLocaleDateString() : '-'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Status</label>
                      <p className="font-medium">{pouch.order.Status__c}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Models Table */}
              {pouch.models.length > 0 && (
                <div>
                  <h4 className="text-md font-medium mb-2">Models</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purity</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Weight</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {pouch.models.map((model) => (
                          <tr key={model.Id}>
                            <td className="px-4 py-3">{model.Name}</td>
                            <td className="px-4 py-3">{model.Category__c}</td>
                            <td className="px-4 py-3">{model.Purity__c}</td>
                            <td className="px-4 py-3">{model.Size__c}</td>
                            <td className="px-4 py-3">{model.Quantity__c}</td>
                            <td className="px-4 py-3">{model.Net_Weight__c?.toFixed(4) || '0.0000'}g</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlatingDetailsPage;