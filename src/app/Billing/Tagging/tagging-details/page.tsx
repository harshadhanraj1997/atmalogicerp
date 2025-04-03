'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface TaggedItem {
  id: string;
  name: string;
  modelDetails: string;
  modelUniqueNumber: string;
  grossWeight: number;
  netWeight: number;
  stoneWeight: number;
  stoneCharge: number;
  pdfUrl: string;
}

interface TaggingDetail {
  tagging: {
    id: string;
    taggingId: string;
    partyCode: string;
    totalGrossWeight: number;
    pdfUrl: string;
    excelUrl: string;
    createdDate: string;
  };
  taggedItems: TaggedItem[];
  summary: {
    totalItems: number;
    totalGrossWeight: number;
    totalNetWeight: number;
    totalStoneWeight: number;
  };
}

export default function TaggingDetailsPage() {
  const searchParams = useSearchParams();
  const taggingId = searchParams.get('taggingId');
  const [details, setDetails] = useState<TaggingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!taggingId) {
        console.log('No taggingId provided');
        return;
      }
      
      try {
        setLoading(true);
        console.log('🔍 Fetching details for taggingId:', taggingId);
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tagging-details/${taggingId}`);
        console.log('📡 API Response Status:', response.status);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch details: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('📦 API Response Data:', {
          success: result.success,
          taggingDetails: result.data?.tagging,
          itemsCount: result.data?.taggedItems?.length,
          summary: result.data?.summary
        });
        
        if (result.success) {
          setDetails(result.data);
          console.log('✅ Details set successfully');
        } else {
          throw new Error(result.message || 'Failed to fetch details');
        }
      } catch (err) {
        console.error('❌ Error fetching details:', {
          error: err,
          message: err.message,
          stack: err.stack
        });
        setError(err.message);
      } finally {
        setLoading(false);
        console.log('🏁 Fetch operation completed');
      }
    };

    fetchDetails();
  }, [taggingId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!details) return <div>No details found</div>;

  return (
    <div className="container mx-auto max-w-5xl p-6 flex flex-col gap-6">
      {/* Tagging Details Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Tagging Details: {details.tagging.taggingId}</h2>
          </div>
          <div className="flex gap-2 mb-4">
            {details.tagging.pdfUrl && (
              <a 
                href={details.tagging.pdfUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
              >
                <i className="fa-solid fa-file-pdf mr-1"></i>
                PDF
              </a>
            )}
            {details.tagging.excelUrl && (
              <a 
                href={details.tagging.excelUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
              >
                <i className="fa-solid fa-file-excel mr-1"></i>
                Excel
              </a>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-600">Party Code</p>
              <p className="font-semibold">{details.tagging.partyCode}</p>
            </div>
            <div>
              <p className="text-gray-600">Created Date</p>
              <p className="font-semibold">{new Date(details.tagging.createdDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-gray-600">Total Items</p>
              <p className="font-semibold">{details.summary.totalItems}</p>
            </div>
            <div>
              <p className="text-gray-600">Total Gross Weight</p>
              <p className="font-semibold">{details.summary.totalGrossWeight.toFixed(3)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Model Details Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Model Details</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unique No.</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gross Weight</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Weight</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stone Weight</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stone Charge</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 text-sm">
              {details.taggedItems.map((item) => {
                // Calculate stone charges: (stone weight * 600)
                const calculatedStoneCharge = (item.stoneWeight * 600);
                
                return (
                  <tr key={item.id}>
                    <td className="px-4 py-2 whitespace-nowrap">{item.name || 'N/A'}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{item.modelUniqueNumber}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{item.grossWeight.toFixed(3)}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{item.netWeight.toFixed(3)}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{item.stoneWeight.toFixed(3)}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{calculatedStoneCharge.toFixed(2)}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {item.pdfUrl && (
                        <a 
                          href={item.pdfUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-red-600 hover:text-red-800"
                        >
                          <i className="fa-solid fa-file-pdf"></i>
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 text-sm">
              <tr>
                <td className="px-4 py-2 font-semibold">Totals</td>
                <td className="px-4 py-2"></td>
                <td className="px-4 py-2 font-semibold">{details.summary.totalGrossWeight.toFixed(3)}</td>
                <td className="px-4 py-2 font-semibold">{details.summary.totalNetWeight.toFixed(3)}</td>
                <td className="px-4 py-2 font-semibold">{details.summary.totalStoneWeight.toFixed(3)}</td>
                <td className="px-4 py-2 font-semibold">
                  {((details.summary.totalStoneWeight * 600)).toFixed(2)}
                </td>
                <td className="px-4 py-2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
