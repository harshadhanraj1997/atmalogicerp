"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';

const apiBaseUrl = "https://needha-erp-server.onrender.com";

interface OrderDetails {
  orderId: string;
  partyName: string;
  deliveryDate: string;
  advanceMetal: string;
  status: string;
  purity: string;
  remarks: string;
  createdBy: string;
  createdDate: string;
  clientSheetPdf: string;
  modelsPdf: string;
  orderSheetPdf: string;
}

interface ModelDetails {
  id: string;
  name: string;
  category: string;
  purity: string;
  size: string;
  color: string;
  quantity: string;
  grossWeight: string;
  stoneWeight: string;
  netWeight: string;
  batchNo: string;
  treeNo: string;
  remarks: string;
  orderSheet: string;
  orderImageSheet: string;
  clientSheet: string;
}

const OrderDetailsPage = () => {
  const [data, setData] = useState<{ orderDetails: OrderDetails; models: ModelDetails[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!orderId) {
        console.log('No orderId provided, skipping fetch');
        setLoading(false);
        return;
      }

      const apiUrl = `${apiBaseUrl}/api/order-details?orderId=${orderId}`;
      console.log('Fetching from URL:', apiUrl);

      try {
        const response = await fetch(apiUrl);
        console.log('Response status:', response.status);
        const result = await response.json();
        console.log('API Response:', result);
        
        if (result.success) {
          setData(result.data);
          console.log('Data set successfully:', result.data);
        } else {
          console.log('API request not successful:', result);
        }
      } catch (error) {
        console.error('Error fetching details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [orderId]);

  const handleApproveOrder = async () => {
    try {
      setIsUpdating(true);
      const response = await fetch(`${apiBaseUrl}/api/update-order-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId }),
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('Order approved successfully');
        // Optionally refresh the data
        window.location.reload();
      } else {
        toast.error(result.message || 'Failed to approve order');
      }
    } catch (error) {
      console.error('Error approving order:', error);
      toast.error('Failed to approve order');
    } finally {
      setIsUpdating(false);
      setShowConfirmation(false);
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
        <div className="text-red-500 text-xl">Failed to load order details</div>
      </div>
    );
  }

  return (
    <div 
      className="main-content"
      style={{
        marginLeft: '250px',
        width: 'calc(100% - 250px)',
        minHeight: '100vh',
        padding: '40px 20px',
        backgroundColor: '#f5f5f5',
      }}
    >
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
            <button
              onClick={() => setShowConfirmation(true)}
              style={{
                backgroundColor: '#4CAF50',
                color: 'white',
                padding: '8px 16px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
              disabled={isUpdating}
            >
              <i className="fa-solid fa-check"></i>
              {isUpdating ? 'Approving...' : 'Approve Order'}
            </button>
          </div>

          <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-6">Order Details</h1>
              
              {/* Order Details Card */}
              <div className="bg-white rounded-lg shadow p-6 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="text-sm text-gray-600">Order ID</label>
                    <p className="font-medium">{data.orderDetails.orderId}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Party Name</label>
                    <p className="font-medium">{data.orderDetails.partyName}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Delivery Date</label>
                    <p className="font-medium">
                      {new Date(data.orderDetails.deliveryDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Status</label>
                    <p className="font-medium">{data.orderDetails.status}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Purity</label>
                    <p className="font-medium">{data.orderDetails.purity}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Advance Metal</label>
                    <p className="font-medium">{data.orderDetails.advanceMetal}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Created By</label>
                    <p className="font-medium">{data.orderDetails.createdBy}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Created Date</label>
                    <p className="font-medium">
                      {new Date(data.orderDetails.createdDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Remarks</label>
                    <p className="font-medium">{data.orderDetails.remarks || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Models Table */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-6">
                  <h2 className="text-xl font-bold mb-4">Models</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gross Weight</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stone Weight</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Weight</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch No</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tree No</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.models.map((model) => (
                        <tr key={model.id}>
                          <td className="px-6 py-4 whitespace-nowrap">{model.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{model.category}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{model.size}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{model.quantity}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{model.grossWeight}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{model.stoneWeight}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{model.netWeight}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{model.batchNo}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{model.treeNo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Download buttons below the table */}
              <div 
                style={{ 
                  display: 'flex', 
                  gap: '15px', 
                  marginTop: '20px',
                  padding: '20px 0',
                  borderTop: '1px solid #eee'
                }}
              >
                <a
                  href={data?.models?.[0]?.orderSheet}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    textDecoration: 'none'
                  }}
                >
                  <i className="fa-solid fa-file-pdf"></i>
                  Download Order Sheet
                </a>

                <a
                  href={data?.models?.[0]?.orderImageSheet}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    backgroundColor: '#2196F3',
                    color: 'white',
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    textDecoration: 'none'
                  }}
                >
                  <i className="fa-solid fa-file-image"></i>
                  Download Image Sheet
                </a>

                <a
                  href={data?.orderDetails?.pdf}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    backgroundColor: '#FF9800',
                    color: 'white',
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    textDecoration: 'none'
                  }}
                >
                  <i className="fa-solid fa-file-pdf"></i>
                  Download Client Sheet
                </a>
              </div>
            </div>
          </div>

          {/* Confirmation Modal */}
          {showConfirmation && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
              }}
            >
              <div
                style={{
                  backgroundColor: 'white',
                  padding: '24px',
                  borderRadius: '8px',
                  maxWidth: '400px',
                  width: '90%',
                }}
              >
                <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Confirm Approval</h3>
                <p style={{ marginBottom: '24px' }}>
                  Are you sure you want to approve this order? This action cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setShowConfirmation(false)}
                    style={{
                      padding: '8px 16px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApproveOrder}
                    style={{
                      padding: '8px 16px',
                      border: 'none',
                      borderRadius: '4px',
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      cursor: 'pointer',
                    }}
                    disabled={isUpdating}
                  >
                    {isUpdating ? 'Approving...' : 'Confirm Approval'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OrderDetailsPage;