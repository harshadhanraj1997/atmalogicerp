"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

interface Details {
  Id: string;
  Name: string;
  Issued_Date__c: string;
  Issued_Weight__c: number;
  Received_Date__c: string;
  Returned_Weight__c: number;
  Status__c: string;
  Setting_l__c: number;
}

interface Model {
  Id: string;
  Name: string;
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
  Isssued_Weight_Grinding__c: number;
  order: Order | null;
  models: Model[];
}

interface Summary {
  totalPouches: number;
  totalOrders: number;
  totalModels: number;
  totalPouchWeight: number;
  issuedWeight: number;
  receivedWeight: number;
  grindingLoss: number;
}

const PolishingDetailsPage = () => {
  const [data, setData] = useState<{
    polishing: Details;
    pouches: Pouch[];
    summary: Summary;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const polishingId = searchParams.get('polishingId');

  useEffect(() => {
    const fetchDetails = async () => {
      if (!polishingId) {
        console.log('[Show Polishing] No polishing ID provided');
        toast.error('No polishing ID provided');
        setLoading(false);
        return;
      }

      try {
        const [prefix, date, month, year, number] = polishingId.split('/');
        console.log('[Show Polishing] Fetching details for:', {
          prefix, date, month, year, number,
          url: `${process.env.NEXT_PUBLIC_API_URL}/api/polishing-details/${prefix}/${date}/${month}/${year}/${number}`
        });

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/polishing-details/${prefix}/${date}/${month}/${year}/${number}`
        );
        const result = await response.json();
        
        console.log('[Show Polishing] API Response:', result);
        
        if (result.success) {
          console.log('[Show Polishing] Setting data:', {
            polishing: result.data.polishing,
            pouches: result.data.pouches,
            summary: result.summary
          });

          setData({
            polishing: result.data.polishing,
            pouches: result.data.pouches,
            summary: result.summary
          });
        } else {
          console.error('[Show Polishing] API returned error:', result);
          toast.error(result.message || 'Polishing record not found');
        }   
      } catch (error) {
        console.error('[Show Polishing] Error:', error);
        console.error('[Show Polishing] Full error details:', JSON.stringify(error, null, 2));
        toast.error('Error fetching polishing details');
      } finally {
        console.log('[Show Polishing] Setting loading to false');
        setLoading(false);
      }
    };

    console.log('[Show Polishing] Component mounted with polishingId:', polishingId);
    fetchDetails();
  }, [polishingId]);

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
        <div className="text-red-500 text-xl">Failed to load setting details</div>
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
                <p className="font-medium">{data.summary.totalPouches}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Total Orders</label>
                <p className="font-medium">{data.summary.totalOrders}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Total Models</label>
                <p className="font-medium">{data.summary.totalModels}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Total Pouch Weight</label>
                <p className="font-medium">{data.summary.totalPouchWeight.toFixed(4)}g</p>
              </div>
            </div>
          </div>
        </div>

        {/* Grinding Details Section */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Setting Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm text-gray-600">Polishing Number</label>
                    <p className="font-medium">{data.polishing.Name}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Status</label>
                <p className="font-medium">{data.polishing.Status__c}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Issued Date</label>
                <p className="font-medium">
                  {data.polishing.Issued_Date__c ? new Date(data.polishing.Issued_Date__c).toLocaleDateString() : '-'}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Issued Weight</label>
                <p className="font-medium">{data.polishing.Issued_Weight__c}g</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Received Date</label>
                <p className="font-medium">
                  {data.polishing.Received_Date__c ? new Date(data.polishing.Received_Date__c).toLocaleDateString() : '-'}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Received Weight</label>
                <p className="font-medium">
                        {data.polishing.Received_Weight__c ? `${data.polishing.Received_Weight__c}g` : '-'}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Polishing Loss</label>
                <p className="font-medium">
                  {data.polishing.Polishing_loss__c ? `${data.polishing.Polishing_loss__c}g` : '-'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Pouches Section with Orders and Models */}
        {data.pouches.map((pouch, index) => (
          <div key={pouch.Id} className="bg-white shadow rounded-lg mb-6">      
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                Pouch {pouch.Name} - {pouch.Issued_weight_polishing__c}g
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
                        {new Date(pouch.order.Delivery_Date__c).toLocaleDateString()}
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
                            <td className="px-4 py-3">{model.Net_Weight__c}g</td>
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

export default PolishingDetailsPage;