"use client";
import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { PDFDocument, StandardFonts } from 'pdf-lib';

interface PartyLedger {
  id: string;
  name: string;
  code: string;
}

interface Order {
  id: string;
  orderNo: string;
  partyId: string;
}

interface OrderModel {
  id: string;
  modelName: string;
  imageUrl: string;
  category: string;
}

interface TaggingModel {
  modelId: string;
  modelName: string;
  uniqueNumber: number;
  imageUrl: string;
  grossWeight: number;
  netWeight: number;
  stoneWeight: number;
  stoneCharges: number;
}

const NewTagging = () => {
  const [partyLedgers, setPartyLedgers] = useState<PartyLedger[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedParty, setSelectedParty] = useState<string>('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<string>('');
  const [orderModels, setOrderModels] = useState<OrderModel[]>([]);
  const [selectedModels, setSelectedModels] = useState<TaggingModel[]>([]);
  const [modelCounts, setModelCounts] = useState<Record<string, number>>({});
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    const fetchPartyLedgers = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${apiBaseUrl}/customer-groups`);
        const result = await response.json();
        console.log('Raw API Response:', result);

        if (result.success && Array.isArray(result.data)) {
          const formattedData = result.data
            .filter(party => party.Id && party.Party_Code__c)
            .map(party => ({
              id: party.Id,
              name: party.Party_Code__c,
              code: party.Party_Code__c
            }));
          console.log('Formatted Data:', formattedData);
          setPartyLedgers(formattedData);
        } else {
          console.error('Invalid data format received:', result);
          setPartyLedgers([]);
        }
      } catch (error) {
        console.error('Error fetching party ledgers:', error);
        setPartyLedgers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPartyLedgers();
  }, []);

  // Fetch orders when party is selected
  useEffect(() => {
    if (selectedParty) {
      const fetchOrders = async () => {
        setIsLoadingOrders(true);
        try {
          const response = await fetch(`${apiBaseUrl}/api/taggingorders?partyCode=${selectedParty}`);
          const result = await response.json();
          
          if (result.success && Array.isArray(result.data)) {
            // Each order is already a string like "9004/0013"
            const formattedOrders = result.data.map(orderNo => ({
              id: orderNo,    // Use the order number as ID
              orderNo: orderNo // Use the same for display
            }));
            console.log('Formatted Orders:', formattedOrders);
            setOrders(formattedOrders);
          } else {
            setOrders([]);
          }
        } catch (error) {
          console.error('Error fetching orders:', error);
          setOrders([]);
        } finally {
          setIsLoadingOrders(false);
        }
      };
      fetchOrders();
    }
  }, [selectedParty]);

  // Fetch order models when order is selected
  useEffect(() => {
    if (selectedOrder) {
      const fetchOrderModels = async () => {
        setIsLoadingModels(true);
        try {
          const response = await fetch(`${apiBaseUrl}/api/tagging-order-models?orderId=${selectedOrder}`);
          const result = await response.json();
          
          if (result.success && Array.isArray(result.data)) {
            // Fetch image URL for each model
            const formattedModels = await Promise.all(result.data.map(async (modelCode) => {
              try {
                const imageResponse = await fetch(`${apiBaseUrl}/api/model-image?modelCode=${modelCode}`);
                const imageData = await imageResponse.json();
                
                return {
                  id: modelCode,
                  modelName: modelCode,
                  imageUrl: imageData.success ? imageData.imageUrl : null
                };
              } catch (error) {
                console.error(`Error fetching image for model ${modelCode}:`, error);
                return {
                  id: modelCode,
                  modelName: modelCode,
                  imageUrl: null
                };
              }
            }));
            
            setOrderModels(formattedModels);
          } else {
            setOrderModels([]);
          }
        } catch (error) {
          console.error('Error fetching order models:', error);
          setOrderModels([]);
        } finally {
          setIsLoadingModels(false);
        }
      };
      fetchOrderModels();
    } else {
      setOrderModels([]);
    }
  }, [selectedOrder]);

  // Add the getImageData helper function
  const getImageData = async (url) => {
    try {
      // No need for authorization header as we're using our proxy endpoint
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Image not found');
      }

      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error fetching image:', error);
      return null;
    }
  };

  // Update the model selection handling
  const handleModelSelection = async (modelCode: string) => {
    try {
      const selectedModel = orderModels.find((model) => model.id === modelCode);
      console.log("Selected model:", selectedModel);

      if (selectedModel) {
        // Get model count for unique numbering
        const modelCount = modelCounts[modelCode] || 0;
        const newCount = modelCount + 1;
        
        // Update model counts
        setModelCounts({
          ...modelCounts,
          [modelCode]: newCount
        });

        // Get image URL from API
        let imageData = null;
        try {
          const imageUrlResponse = await fetch(`${apiBaseUrl}/api/model-image?modelCode=${modelCode}`);
          const imageUrlData = await imageUrlResponse.json();
          
          if (imageUrlData.success && imageUrlData.data) {
            console.log("Download URL received:", imageUrlData.data);
            // Use the download URL directly as it's already pointing to our proxy
            imageData = await getImageData(`${apiBaseUrl}${imageUrlData.data}`);
          } else {
            console.warn("No image URL returned for model:", modelCode);
          }
        } catch (imageError) {
          console.error("Error fetching model image:", imageError);
        }

        // Create new tagging model
        const newTaggingModel: TaggingModel = {
          modelId: modelCode,
          modelName: modelCode,
          uniqueNumber: newCount,
          imageData: imageData,
          grossWeight: 0,
          netWeight: 0,
          stoneWeight: 0,
          stoneCharges: 0
        };

        setSelectedModels([...selectedModels, newTaggingModel]);
      }
    } catch (error) {
      console.error("Error in handleModelSelection:", error);
      alert('Error selecting model');
    }
  };

  const handleWeightUpdate = (index: number, field: keyof TaggingModel, value: number) => {
    const updatedModels = [...selectedModels];
    updatedModels[index][field] = value;
    setSelectedModels(updatedModels);
  };

  const generatePDF = async (model: TaggingModel) => {
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage();
      const { width, height } = page.getSize();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // Add model image if available
      if (model.imageUrl) {
        const imageResponse = await fetch(model.imageUrl);
        const imageArrayBuffer = await imageResponse.arrayBuffer();
        const image = await pdfDoc.embedJpg(imageArrayBuffer);
        const imageDims = image.scale(0.5); // Scale image to 50%
        
        page.drawImage(image, {
          x: 50,
          y: height - 150,
          width: imageDims.width,
          height: imageDims.height,
        });
      }

      // Add model details
      page.drawText(`Model: ${model.modelName}`, {
        x: 50,
        y: height - 200,
        font,
        size: 12,
      });

      page.drawText(`Unique Number: ${model.uniqueNumber}`, {
        x: 50,
        y: height - 220,
        font,
        size: 12,
      });

      page.drawText(`Stone Weight: ${model.stoneWeight}`, {
        x: 50,
        y: height - 240,
        font,
        size: 12,
      });

      page.drawText(`Net Weight: ${model.netWeight}`, {
        x: 50,
        y: height - 260,
        font,
        size: 12,
      });

      page.drawText(`Gross Weight: ${model.grossWeight}`, {
        x: 50,
        y: height - 280,
        font,
        size: 12,
      });

      page.drawText(`Stone Charges: ${model.stoneCharges}`, {
        x: 50,
        y: height - 300,
        font,
        size: 12,
      });

      return await pdfDoc.save();
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    try {
      // Generate PDFs for each model
      const modelPDFs = await Promise.all(
        selectedModels.map(async (model) => {
          const pdfBytes = await generatePDF(model);
          
          // Upload PDF to Salesforce
          const formData = new FormData();
          formData.append('pdf', new Blob([pdfBytes], { type: 'application/pdf' }));
          formData.append('modelName', model.modelName);
          
          const response = await fetch(`${apiBaseUrl}/api/submit-tagging`, {
            method: 'POST',
            body: formData
          });
          
          const { pdfUrl } = await response.json();
          return { ...model, pdfUrl };
        })
      );

      // Generate Excel data
      const excelData = modelPDFs.map(model => ({
        modelName: model.modelName,
        uniqueNumber: model.uniqueNumber,
        grossWeight: model.grossWeight,
        netWeight: model.netWeight,
        stoneWeight: model.stoneWeight,
        stoneCharges: model.stoneCharges,
        pdfUrl: model.pdfUrl
      }));

      // Submit to Salesforce
      await fetch('/api/submit-to-salesforce', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          partyCode: selectedParty,
          orderNo: selectedOrder,
          models: excelData
        })
      });

      alert('Tagging submitted successfully!');
    } catch (error) {
      console.error('Error submitting tagging:', error);
      alert('Error submitting tagging');
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-md mt-[200px]">
      <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">New Tagging</h1>
      
      <form className="space-y-6" onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}>
        {/* Party & Order Selection */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Party
            </label>
            <Select 
              onValueChange={(value) => {
                const selectedParty = partyLedgers.find(party => party.code === value);
                if (selectedParty) {
                  setSelectedParty(selectedParty.code);
                }
              }}
            >
              <SelectTrigger className="w-full bg-white border border-gray-200">
                <SelectValue placeholder={isLoading ? "Loading..." : "Select Party"} />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {partyLedgers.length > 0 ? (
                  partyLedgers.map(party => (
                    <SelectItem 
                      key={party.id} 
                      value={party.code}
                      className="hover:bg-gray-100"
                    >
                      {party.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-data" disabled>
                    {isLoading ? "Loading..." : "No parties available"}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="form-group relative z-10">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Order
            </label>
            <Select 
              onValueChange={(value) => setSelectedOrder(value)}
              disabled={!selectedParty || isLoadingOrders}
            >
              <SelectTrigger className="w-full bg-white border border-gray-200 relative">
                <SelectValue placeholder={isLoadingOrders ? "Loading Orders..." : "Select Order"} />
              </SelectTrigger>
              <SelectContent 
                className="bg-white border rounded-md shadow-lg absolute w-full z-50" 
                position="popper"
              >
                {orders.length > 0 ? (
                  orders.map((order, index) => (
                    <SelectItem 
                      key={`${order.orderNo}-${index}`}
                      value={order.orderNo}
                      className="hover:bg-gray-100 px-4 py-2 cursor-pointer"
                    >
                      {order.orderNo}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem 
                    key="no-orders"
                    value="no-orders" 
                    disabled
                    className="px-4 py-2 text-gray-500"
                  >
                    {isLoadingOrders ? "Loading..." : "No orders available"}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Order Models */}
        {selectedOrder && (
          <div className="space-y-4">
            {/* Model Selection Dropdown */}
            <div className="form-group relative z-10">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Model
              </label>
              <Select 
                onValueChange={(value) => {
                  handleModelSelection(value);
                }}
                disabled={isLoadingModels}
              >
                <SelectTrigger className="w-full bg-white border border-gray-200 relative">
                  <SelectValue placeholder={isLoadingModels ? "Loading Models..." : "Select Model"} />
                </SelectTrigger>
                <SelectContent className="bg-white border rounded-md shadow-lg absolute w-full z-50">
                  {orderModels.length > 0 ? (
                    orderModels.map((model, index) => (
                      <SelectItem 
                        key={`model-${model.id}-${index}`}
                        value={model.id}
                        className="hover:bg-gray-100 px-4 py-2 cursor-pointer"
                      >
                        <span key={`text-${model.id}-${index}`}>{model.modelName}</span>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem 
                      key="no-models" 
                      value="no-models" 
                      disabled
                      className="px-4 py-2 text-gray-500"
                    >
                      <span key="no-models-text">
                        {isLoadingModels ? "Loading..." : "No models available"}
                      </span>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Weight and Charges Inputs for Selected Models */}
            {selectedModels.length > 0 && (
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  Selected Models Details
                </label>
                {selectedModels.map((model, index) => (
                  <div 
                    key={`${model.modelId}-${model.uniqueNumber}`}
                    className="border rounded-lg p-4 bg-white shadow-sm"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <p className="font-medium text-gray-800">
                        {model.modelName} 
                        <span className="ml-2 text-sm text-gray-500">
                          (#{model.uniqueNumber})
                        </span>
                      </p>
                      <Button
                        onClick={() => {
                          const updatedModels = selectedModels.filter((_, i) => i !== index);
                          setSelectedModels(updatedModels);
                        }}
                        className="h-7 w-20 text-xs text-white bg-red-500 hover:bg-red-600 border-none rounded"
                      >
                        Remove
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-600">Stone Weight</label>
                        <Input
                          type="number"
                          step="0.0001"
                          min="0"
                          value={model.stoneWeight}
                          onChange={(e) => {
                            const stoneWeight = parseFloat(e.target.value) || 0;
                            const netWeight = model.netWeight || 0;
                            handleWeightUpdate(index, 'stoneWeight', Number(stoneWeight.toFixed(3)));
                            handleWeightUpdate(index, 'grossWeight', Number((stoneWeight + netWeight).toFixed(3)));
                          }}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Net Weight</label>
                        <Input
                          type="number"
                          step="0.001"
                          min="0"
                          value={model.netWeight}
                          onChange={(e) => {
                            const netWeight = parseFloat(e.target.value) || 0;
                            const stoneWeight = model.stoneWeight || 0;
                            handleWeightUpdate(index, 'netWeight', Number(netWeight.toFixed(3)));
                            handleWeightUpdate(index, 'grossWeight', Number((stoneWeight + netWeight).toFixed(3)));
                          }}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Gross Weight (Auto)</label>
                        <Input
                          type="number"
                          step="0.001"
                          value={model.grossWeight}
                          disabled
                          className="h-8 text-sm bg-gray-50"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Stone Charges</label>
                        <Input
                          type="number"
                          step="0.001"
                          min="0"
                          value={model.stoneCharges}
                          onChange={(e) => handleWeightUpdate(index, 'stoneCharges', Number(parseFloat(e.target.value).toFixed(3)))}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    <div className="col-span-2 flex justify-end mt-2">
                      <Button
                        type="button"
                        onClick={async () => {
                          try {
                            const pdfBytes = await generatePDF(model);
                            // Create blob and URL
                            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                            const url = window.URL.createObjectURL(blob);
                            // Open in new tab
                            window.open(url, '_blank');
                          } catch (error) {
                            console.error('Error previewing PDF:', error);
                            alert('Error generating PDF preview');
                          }
                        }}
                        className="h-7 w-20 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-200"
                      >
                        Preview
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => {
                      const lastModel = selectedModels[selectedModels.length - 1];
                      if (lastModel) {
                        const modelCount = modelCounts[lastModel.modelId] || 0;
                        const newCount = modelCount + 1;
                        
                        setModelCounts({
                          ...modelCounts,
                          [lastModel.modelId]: newCount
                        });

                        const newTaggingModel: TaggingModel = {
                          modelId: lastModel.modelId,
                          modelName: lastModel.modelName,
                          uniqueNumber: newCount,
                          imageUrl: lastModel.imageUrl,
                          grossWeight: 0,
                          netWeight: 0,
                          stoneWeight: 0,
                          stoneCharges: 0
                        };

                        setSelectedModels([...selectedModels, newTaggingModel]);
                      }
                    }}
                    variant="outline"
                    className="h-8 px-3 text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200"
                  >
                    + Add Another
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setSelectedModels([])}
                    variant="outline"
                    className="h-8 px-3 text-xs bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-200"
                  >
                    Clear All
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Add Excel preview button at the bottom */}
        <div className="mt-6 flex gap-2 justify-end">
          <Button
            type="button"
            onClick={async () => {
              try {
                // Generate Excel preview data
                const excelData = selectedModels.map(model => ({
                  'Model Name': model.modelName,
                  'Unique Number': model.uniqueNumber,
                  'Gross Weight': model.grossWeight,
                  'Net Weight': model.netWeight,
                  'Stone Weight': model.stoneWeight,
                  'Stone Charges': model.stoneCharges
                }));

                // Create CSV content
                const headers = Object.keys(excelData[0]).join(',');
                const rows = excelData.map(row => Object.values(row).join(','));
                const csvContent = [headers, ...rows].join('\n');

                // Create blob and download
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'tagging-details.csv';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
              } catch (error) {
                console.error('Error generating Excel preview:', error);
                alert('Error generating Excel preview');
              }
            }}
            className="h-8 px-3 text-xs bg-green-50 hover:bg-green-100 text-green-600 border-green-200"
          >
            Preview Excel
          </Button>
          <Button
            type="submit"
            className="h-8 px-4 text-xs text-white bg-blue-600 hover:bg-blue-700"
          >
            Submit All
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NewTagging;