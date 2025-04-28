"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { z } from 'zod';

interface GrindingDetails {
  Id: string;
  Name: string;
  Issued_Date__c: string;
  Issued_weight__c: number;
  Receievd_weight__c: number | null;
  Received_Date__c: string | null;
  Status__c: string;
  Grinding_Loss__c: number | null;
}

interface PouchDetails {
  Id: string;
  Name: string;
  Order_Id__c: string;
  Issued_Pouch_weight__c: number;
  Status__c: string;
  order?: OrderDetails;
  models?: ModelDetails[];
}

interface OrderDetails {
  Id: string;
  Name: string;
  Order_Id__c: string;
  Party_Name__c: string;
  Delivery_Date__c: string;
  Status__c: string;
}

interface ModelDetails {
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

interface Summary {
  totalPouches: number;
  totalOrders: number;
  totalModels: number;
  totalPouchWeight: number;
  issuedWeight: number;
  receivedWeight: number | null;
  filingLoss: number | null;
}

const FilingDetailsPage = () => {
  const [data, setData] = useState<{
    filing: GrindingDetails;
    pouches: PouchDetails[];
    summary: Summary;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const filingId = searchParams.get('filingId');

  useEffect(() => {
    const fetchDetails = async () => {
      if (!filingId) {
        toast.error('No filing ID provided');
        setLoading(false);
        return;
      }

      try {
        const [prefix, date, month, year, number,subnumber] = filingId.split('/');
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/filing-details/${prefix}/${date}/${month}/${year}/${number}/${subnumber}`
        );
        const result = await response.json();
        
        if (result.success) {
          setData(result.data);
        } else {
          toast.error(result.message || 'Failed to fetch filing details');
        }
      } catch (error) {
        console.error('Error fetching details:', error);
        toast.error('Error fetching filing details');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [filingId]);

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
        <div className="text-red-500 text-xl">Failed to load filing details</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="w-4/5 mt-10 ml-[250px] mr-auto space-y-6">
        {/* Filing Details Section */}
        <div className="bg-white shadow rounded-lg">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Filing Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm text-gray-600">Filing Number</label>
                <p className="font-medium">{data.filing.Name}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Status</label>
                <p className="font-medium">{data.filing.Status__c}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Issued Date</label>
                <p className="font-medium">{new Date(data.filing.Issued_Date__c).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Issued Weight</label>
                <p className="font-medium">{data.filing.Issued_weight__c}g</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Received Date</label>
                <p className="font-medium">
                  {data.filing.Received_Date__c 
                    ? new Date(data.filing.Received_Date__c).toLocaleDateString() 
                    : '-'}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Received Weight</label>
                <p className="font-medium">
                  {data.filing.Receievd_weight__c 
                    ? `${data.filing.Receievd_weight__c}g` 
                    : '-'}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Filing Loss</label>
                <p className="font-medium">
                  {data.filing.Filing_loss__c 
                    ? `${data.filing.Filing_loss__c }g` 
                    : '-'}
                </p>
              </div>
            </div>
          </div>
        </div>

        

        {/* Pouches and Orders Section */}
        <div className="bg-white shadow rounded-lg">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Pouch Details</h2>
            <div className="space-y-6">
              {data.pouches.map((pouch) => (
                <div key={pouch.Id} className="border rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="text-sm text-gray-600">Pouch ID</label>
                      <p className="font-medium">{pouch.Name}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Order ID</label>
                      <p className="font-medium">{pouch.Order_Id__c}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Weight</label>
                      <p className="font-medium">{pouch.Issued_Pouch_weight__c}g</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Status</label>
                      <p className="font-medium">{pouch.Status__c}</p>
                    </div>
                  </div>

                  {pouch.order && (
                    <div className="mt-4">
                      <h3 className="text-lg font-medium mb-2">Order Details</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-sm text-gray-600">Party Name</label>
                          <p className="font-medium">{pouch.order.Party_Name__c}</p>
                        </div>
                        <div>
                          <label className="text-sm text-gray-600">Delivery Date</label>
                          <p className="font-medium">{new Date(pouch.order.Delivery_Date__c).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <label className="text-sm text-gray-600">Status</label>
                          <p className="font-medium">{pouch.order.Status__c}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {pouch.models && pouch.models.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-lg font-medium mb-2">Models</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead>
                            <tr>
                              <th className="px-4 py-2 text-left">Name</th>
                              <th className="px-4 py-2 text-left">Category</th>
                              <th className="px-4 py-2 text-left">Purity</th>
                              <th className="px-4 py-2 text-left">Size</th>
                              <th className="px-4 py-2 text-left">Color</th>
                              <th className="px-4 py-2 text-left">Quantity</th>
                              <th className="px-4 py-2 text-left">Net Weight</th>
                              <th className="px-4 py-2 text-left">Gross Weight</th>
                              <th className="px-4 py-2 text-left">Stone Weight</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pouch.models.map((model) => (
                              <tr key={model.Id}>
                                <td className="px-4 py-2">{model.Name}</td>
                                <td className="px-4 py-2">{model.Category__c}</td>
                                <td className="px-4 py-2">{model.Purity__c}</td>
                                <td className="px-4 py-2">{model.size__c}</td>
                                <td className="px-4 py-2">{model.Color__c}</td>
                                <td className="px-4 py-2">{model.Quantity__c}</td>
                                <td className="px-4 py-2">{model.Net_Weight__c}g</td>
                                <td className="px-4 py-2">{model.Gross_Weight__c}g</td>
                                <td className="px-4 py-2">{model.Stone_Weight__c}g</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilingDetailsPage;