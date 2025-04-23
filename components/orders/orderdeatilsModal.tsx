"use client";
import React, { useEffect, useState, Dispatch, SetStateAction } from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import { useSearchParams } from 'next/navigation';
import { IDeal } from '@/interface/table.interface';

const apiBaseUrl = "https://needha-erp-server-xrdp.onrender.com";

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
}

interface DealsDetailsModalProps {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  editData: IDeal;
  orderId: string;
}

const DealsDetailsModal = ({ open, setOpen, editData, orderId }: DealsDetailsModalProps) => {
  const [data, setData] = useState<{ orderDetails: OrderDetails; models: ModelDetails[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      console.log('Attempting to fetch details with orderId:', orderId);
      console.log('API URL:', `${apiBaseUrl}/api/order-details/${orderId}`);
      
      try {
        const response = await fetch(`${apiBaseUrl}/api/order-details/${orderId}`);
        console.log('API Response status:', response.status);
        const result = await response.json();
        console.log('API Response data:', result);
        
        if (result.success) {
          setData(result.data);
          console.log('Data successfully set:', result.data);
        } else {
          console.log('API request not successful:', result);
        }
      } catch (error) {
        console.error('Error fetching details:', error);
      } finally {
        setLoading(false);
      }
    };

    console.log('useEffect triggered with values:', {
      isModalOpen: open,
      orderId: orderId,
      orderIdType: typeof orderId,
      orderIdLength: orderId?.length,
    });

    if (!open) {
      console.log('Modal is closed, skipping API call');
      return;
    }

    if (!orderId) {
      console.log('No orderId provided, skipping API call');
      return;
    }

    fetchDetails();
  }, [open, orderId]);

  const handleToggle = () => setOpen(!open);

  return (
    <Dialog open={open} onClose={handleToggle} maxWidth="md" fullWidth>
      <DialogTitle>
        <div className="flex justify-between items-center">
          <h5 className="modal-title">Order Details</h5>
          <button
            onClick={handleToggle}
            type="button"
            className="bd-btn-close"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      </DialogTitle>
      <DialogContent className="common-scrollbar">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            Loading...
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Order Details Section */}
            <div className="card__wrapper">
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 md:col-span-6">
                  <div className="label__content-wrapper">
                    <span className="label__subtitle">Order ID</span>
                    <h6 className="label__title">{data.orderDetails.orderId}</h6>
                  </div>
                </div>
                <div className="col-span-12 md:col-span-6">
                  <div className="label__content-wrapper">
                    <span className="label__subtitle">Party Name</span>
                    <h6 className="label__title">{data.orderDetails.partyName}</h6>
                  </div>
                </div>
                <div className="col-span-12 md:col-span-6">
                  <div className="label__content-wrapper">
                    <span className="label__subtitle">Delivery Date</span>
                    <h6 className="label__title">{new Date(data.orderDetails.deliveryDate).toLocaleDateString()}</h6>
                  </div>
                </div>
                <div className="col-span-12 md:col-span-6">
                  <div className="label__content-wrapper">
                    <span className="label__subtitle">Status</span>
                    <h6 className="label__title">{data.orderDetails.status}</h6>
                  </div>
                </div>
                <div className="col-span-12 md:col-span-6">
                  <div className="label__content-wrapper">
                    <span className="label__subtitle">Purity</span>
                    <h6 className="label__title">{data.orderDetails.purity}</h6>
                  </div>
                </div>
                <div className="col-span-12 md:col-span-6">
                  <div className="label__content-wrapper">
                    <span className="label__subtitle">Advance Metal</span>
                    <h6 className="label__title">{data.orderDetails.advanceMetal}</h6>
                  </div>
                </div>
              </div>
            </div>

            {/* Models Table Section */}
            {data.models.length > 0 && (
              <div className="card__wrapper mt-6">
                <h6 className="text-lg font-medium mb-4">Models</h6>
                <div className="overflow-x-auto">
                  <table className="min-w-full table-auto">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="p-2 text-left">Name</th>
                        <th className="p-2 text-left">Category</th>
                        <th className="p-2 text-left">Size</th>
                        <th className="p-2 text-left">Quantity</th>
                        <th className="p-2 text-left">Gross Weight</th>
                        <th className="p-2 text-left">Net Weight</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.models.map((model) => (
                        <tr key={model.id} className="border-b">
                          <td className="p-2">{model.name}</td>
                          <td className="p-2">{model.category}</td>
                          <td className="p-2">{model.size}</td>
                          <td className="p-2">{model.quantity}</td>
                          <td className="p-2">{model.grossWeight}</td>
                          <td className="p-2">{model.netWeight}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-red-500 py-4">
            Failed to load order details
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const TableComponent = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  const handleOpenModal = () => {
    console.log('Opening modal with orderId:', orderId); // Debug log
    setIsModalOpen(true);
  };

  return (
    <>
      <button onClick={handleOpenModal}>Open Modal</button>
      <DealsDetailsModal 
        open={isModalOpen}
        setOpen={setIsModalOpen}
        editData={{
          id: '',
          dealName: '',
          AdvanceMetal: '',
          tags: '',
          status: '',
          expectedEndDate: ''
        }}
        orderId={orderId || ''}
      />

    </>
  );
};

export default TableComponent;
