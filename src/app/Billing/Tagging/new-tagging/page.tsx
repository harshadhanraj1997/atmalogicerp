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
import * as XLSX from 'xlsx';
import Image from 'next/image';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

interface PartyLedger {
  id: string;
  name: string;
  code: string;
}

interface Order {
  id: string;
  orderNo: string;
}

interface OrderModel {
  id: string;
  modelName: string;
  imageUrl: string | null;
}

// Updated interface with consistent image handling
interface TaggingModel {
  modelId: string;
  modelName: string;
  uniqueNumber: number;
  imageUrl: string | null;
  imageData: string | null; // Base64 image data
  grossWeight: number;
  netWeight: number;
  stoneWeight: number;
  stoneCharges: number;
}

// Interface for submitted tagged items
interface SubmittedTaggedItem {
  id: string;
  modelDetails: string;
  Model_Unique_Number__c: string;
  Gross_Weight__c: string;
  Net_Weight__c: string;
  Stone_Weight__c: string;
  Stone_Charge__c: string;
  PDF_URL__c?: string;
  pdfUrl?: string;
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
  const [submittedItems, setSubmittedItems] = useState<SubmittedTaggedItem[]>([]);
  const [isSubmittingModels, setIsSubmittingModels] = useState(false);
  const [isSubmittingTagging, setIsSubmittingTagging] = useState(false);
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

  // Add this helper function at the top of your component
  const getInitialTaggingNumber = () => {
    if (typeof window !== 'undefined') {
      const savedNumber = localStorage.getItem('lastTaggingNumber');
      return savedNumber ? parseInt(savedNumber, 10) : 0;
    }
    return 0;
  };

  // Update the useState initialization
  const [lastTaggingNumber, setLastTaggingNumber] = useState(getInitialTaggingNumber);

  // Fetch party ledgers on component mount
  useEffect(() => {
    const fetchPartyLedgers = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${apiBaseUrl}/customer-groups`);
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('Party Ledgers API Response:', result);

        if (result.success && Array.isArray(result.data)) {
          const formattedData = result.data
            .filter(party => party.Id && party.Party_Code__c)
            .map(party => ({
              id: party.Id,
              name: party.Party_Code__c,
              code: party.Party_Code__c
            }));
          console.log('Formatted Party Data:', formattedData);
          setPartyLedgers(formattedData);
        } else {
          console.error('Invalid party data format received:', result);
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
  }, [apiBaseUrl]);

  // Fetch orders when party is selected
  useEffect(() => {
    if (selectedParty) {
      const fetchOrders = async () => {
        setIsLoadingOrders(true);
        try {
          const response = await fetch(`${apiBaseUrl}/api/taggingorders?partyCode=${selectedParty}`);
          
          if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
          }
          
          const result = await response.json();
          
          if (result.success && Array.isArray(result.data)) {
            const formattedOrders = result.data.map(orderNo => ({
              id: orderNo,
              orderNo: orderNo
            }));
            console.log('Formatted Orders:', formattedOrders);
            setOrders(formattedOrders);
          } else {
            console.error('Invalid orders data format received:', result);
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
    } else {
      // Reset orders when no party is selected
      setOrders([]);
      setSelectedOrder('');
    }
  }, [selectedParty, apiBaseUrl]);

  // Update the order models effect
  useEffect(() => {
    if (selectedOrder) {
      console.log('Fetching models for order:', selectedOrder);
      
      const fetchOrderModels = async () => {
        setIsLoadingModels(true);
        try {
          const response = await fetch(`${apiBaseUrl}/api/tagging-order-models?orderId=${selectedOrder}`);
          
          if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
          }
          
          const result = await response.json();
          
          if (result.success && Array.isArray(result.data)) {
            const formattedModels = await Promise.all(result.data.map(async (modelCode) => {
              try {
                const imageResponse = await fetch(`${apiBaseUrl}/api/model-image?modelCode=${modelCode}`);
                
                if (!imageResponse.ok) {
                  console.warn(`Image API error for model ${modelCode}: ${imageResponse.status}`);
                  return {
                    id: modelCode,
                    modelName: modelCode,
                    orderId: selectedOrder,
                    imageUrl: null
                  };
                }
                
                const imageData = await imageResponse.json();
                
                return {
                  id: modelCode,
                  modelName: modelCode,
                  orderId: selectedOrder,
                  imageUrl: imageData.success && imageData.data ? imageData.data : null
                };
              } catch (error) {
                console.error(`Error fetching image for model ${modelCode}:`, error);
                return {
                  id: modelCode,
                  modelName: modelCode,
                  orderId: selectedOrder,
                  imageUrl: null
                };
              }
            }));
            
            // Directly set the new models without accumulation
            setOrderModels(formattedModels);
            console.log('Set new models for order:', formattedModels);
            
          } else {
            console.error('Invalid order models data format received:', result);
            setOrderModels([]); // Clear models if invalid data
          }
        } catch (error) {
          console.error('Error fetching order models:', error);
          setOrderModels([]); // Clear models on error
        } finally {
          setIsLoadingModels(false);
        }
      };

      fetchOrderModels();
    } else {
      setOrderModels([]); // Clear models when no order selected
    }
  }, [selectedOrder, apiBaseUrl]);

  // Helper function to fetch and convert image to base64
  const getImageData = async (url: string): Promise<string | null> => {
    try {
      if (!url) {
        console.log('No URL provided for image');
        return null;
      }
      
      // For Salesforce URLs, use the backend proxy
      if (url.includes('salesforce.com') || url.includes('force.com') || url.startsWith('/api/download-file')) {
        // Extract the original URL if it's already a proxy URL
        const fileUrl = url.startsWith('/api/download-file') 
          ? new URLSearchParams(url.split('?')[1]).get('url')
          : url;
          
        console.log('Fetching through backend proxy:', fileUrl);
        
        const response = await fetch(`${apiBaseUrl}/api/download-file?url=${encodeURIComponent(fileUrl)}`, {
          method: 'GET',
          headers: {
            'Accept': 'image/*'
          }
        });
        
        if (!response.ok) {
          console.error('Proxy response error:', {
            status: response.status,
            statusText: response.statusText,
            url: fileUrl
          });
          throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        }
        
        const blob = await response.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }
      
      // For other URLs, fetch directly
      console.log('Fetching non-Salesforce URL directly:', url);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

    } catch (error) {
      console.error('Error fetching image data:', {
        error,
        url,
        message: error.message
      });
      return null;
    }
  };

  // Update handleModelSelection to handle image fetching more robustly
  const handleModelSelection = async (modelCode: string) => {
    try {
      // Find the model from current order's models only
      const selectedModel = orderModels.find((model) => model.id === modelCode);
      console.log("Selected model:", selectedModel);

      if (!selectedModel) {
        console.error("Selected model not found in current order models list");
        return;
      }

      // Get model count for unique numbering
      const modelCount = modelCounts[modelCode] || 0;
      const newCount = modelCount + 1;
      
      // Update model counts
      setModelCounts({
        ...modelCounts,
        [modelCode]: newCount
      });

      // Fetch and process image data
      let imageData = null;
      if (selectedModel.imageUrl) {
        console.log('Attempting to fetch image for model:', {
          modelCode,
          imageUrl: selectedModel.imageUrl
        });
        
        try {
          imageData = await getImageData(selectedModel.imageUrl);
          console.log('Image data fetched successfully:', {
            modelCode,
            hasData: Boolean(imageData)
          });
        } catch (imageError) {
          console.error('Failed to fetch image, continuing without image:', {
            modelCode,
            error: imageError
          });
        }
      }

      // Create new tagging model
      const newTaggingModel: TaggingModel = {
        modelId: modelCode,
        modelName: modelCode,
        uniqueNumber: newCount,
        imageUrl: selectedModel.imageUrl,
        imageData: imageData,
        grossWeight: 0,
        netWeight: 0,
        stoneWeight: 0,
        stoneCharges: 0
      };

      // Add to selected models
      setSelectedModels(prevModels => [...prevModels, newTaggingModel]);
      console.log('Model added successfully:', {
        modelCode,
        hasImage: Boolean(imageData)
      });

    } catch (error) {
      console.error("Error in handleModelSelection:", {
        modelCode,
        error: error.message,
        stack: error.stack
      });
    }
  };

  // Update weight and charges values
  const handleWeightUpdate = (index: number, field: keyof TaggingModel, value: number) => {
    const updatedModels = [...selectedModels];
    updatedModels[index][field] = value;
    
    // If updating stone or net weight, automatically update gross weight
    if (field === 'stoneWeight' || field === 'netWeight') {
      const model = updatedModels[index];
      updatedModels[index].grossWeight = Number(
        (model.stoneWeight + model.netWeight).toFixed(3)
      );
    }
    
    setSelectedModels(updatedModels);
  };

  // Update the generatePDF function for individual models
  const generatePDF = async (model: TaggingModel): Promise<Uint8Array> => {
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([600, 800]); // Larger page size
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const black = rgb(0, 0, 0);
      
      // If there's an image, add it first
      if (model.imageData) {
        try {
          // Remove the data:image/jpeg;base64, prefix if it exists
          const imageDataString = model.imageData.replace(/^data:image\/\w+;base64,/, '');
          const imageBytes = Buffer.from(imageDataString, 'base64');
          const image = await pdfDoc.embedJpg(imageBytes);
          
          // Calculate image dimensions to fit within 300x300 box
          const maxDimension = 300;
          const scale = Math.min(
            maxDimension / image.width,
            maxDimension / image.height
          );
          
          const width = image.width * scale;
          const height = image.height * scale;
          
          // Center the image horizontally
          const x = (page.getWidth() - width) / 2;
          
          // Draw image near top of page
          page.drawImage(image, {
            x,
            y: page.getHeight() - height - 50, // 50px from top
            width,
            height,
          });
        } catch (imageError) {
          console.warn('Could not embed image in PDF:', imageError);
        }
      }

      // Draw details below the image
      const details = [
        `Model Name: ${model.modelName}`,
        `Model ID: ${model.modelId}`,
        `Unique Number: ${model.uniqueNumber}`,
        `Gross Weight: ${model.grossWeight.toFixed(3)} g`,
        `Net Weight: ${model.netWeight.toFixed(3)} g`,
        `Stone Weight: ${model.stoneWeight.toFixed(3)} g`,
        `Stone Charges: ${model.stoneCharges.toFixed(2)}`
      ];

      // Start text below image or at fixed position if no image
      let yPosition = page.getHeight() - (model.imageData ? 400 : 100);

      details.forEach((detail) => {
        page.drawText(detail, {
          x: 50,
          y: yPosition,
          size: 12,
          font,
          color: black
        });
        yPosition -= 30; // Space between lines
      });

      return pdfDoc.save();
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error(`Failed to generate PDF: ${error.message}`);
    }
  };

  // Update the generateTaggingId function
  const generateTaggingId = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const nextNumber = lastTaggingNumber + 1;
    return `TAG-${year}${month}${day}-${String(nextNumber).padStart(3, '0')}`;
  };

  // Add this helper function at the top level
  const generateUniqueNumber = () => {
    if (selectedModels.length === 0) {
      return 1;
    }
    
    // Get the highest unique number from existing models
    const highestNumber = selectedModels.reduce((max, model) => {
      const currentNumber = Number(model.uniqueNumber);
      return isNaN(currentNumber) ? max : Math.max(max, currentNumber);
    }, 0);
    
    // Return next number in sequence
    return highestNumber + 1;
  };

  // Handle individual model submissions
  const handleSubmitModels = async () => {
    setIsSubmittingModels(true);
    try {
      console.log('Starting submission of models:', selectedModels);
      
      // Generate one tagging ID for all models in this submission
      const taggingId = generateTaggingId();

      const taggedItems = await Promise.all(
        selectedModels.map(async (model, index) => {
          try {
            const pdfBytes = await generatePDF(model);
            
            const formData = new FormData();
            const modelData = {
              taggingId: taggingId, // Use the same tagging ID for all models
              modelDetails: model.modelName,
              modelUniqueNumber: String(model.uniqueNumber),
              grossWeight: model.grossWeight.toFixed(3),
              netWeight: model.netWeight.toFixed(3),
              stoneWeight: model.stoneWeight.toFixed(3),
              stoneCharge: String(model.stoneCharges)
            };

            Object.entries(modelData).forEach(([key, value]) => {
              formData.append(key, value);
            });

            const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
            const pdfFileName = `${taggingId}_${model.modelName}_${model.uniqueNumber}.pdf`;
            formData.append('pdf', pdfBlob, pdfFileName);

            const response = await fetch(`${apiBaseUrl}/api/create-tagged-item`, {
              method: 'POST',
              body: formData
            });

            if (!response.ok) {
              throw new Error(`Server error: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            console.log('Server response for model:', {
              modelName: model.modelName,
              response: result
            });

            if (!result.success) {
              throw new Error(result.message || 'Failed to create tagged item');
            }

            return result.data;

          } catch (error) {
            console.error(`Error processing model ${model.modelName}:`, error);
            throw error;
          }
        })
      );

      console.log('All tagged items responses:', taggedItems);

      // Store the created items without clearing the form
      setSubmittedItems(taggedItems);
      
      // Show success message
      alert('Models submitted successfully!');

    } catch (error) {
      console.error('Error in handleSubmitModels:', error);
      alert(`Error submitting models: ${error.message}`);
    } finally {
      setIsSubmittingModels(false);
    }
  };

  // Helper function to preview PDF
  const handlePreviewPDF = async (downloadUrl: string) => {
    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error('Failed to download PDF');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error previewing PDF:', error);
      alert('Error opening PDF preview');
    }
  };

  // Preview PDF for a model
  const previewModelPDF = async (model: TaggingModel) => {
    try {
      console.log('Generating PDF preview for', model.modelName);
      const pdfBytes = await generatePDF(model);
      
      // Create blob and URL
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Open in new tab
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error previewing PDF:', error);
      alert(`Error generating PDF preview: ${error.message}`);
    }
  };

  // Handle final tagging submission
  const handleSubmitTagging = async () => {
    setIsSubmittingTagging(true);
    try {
      if (submittedItems.length === 0) {
        throw new Error('Please submit models first');
      }

      // Calculate totals with stone details
      const totals = selectedModels.reduce((acc, model) => ({
        grossWeight: acc.grossWeight + model.grossWeight,
        netWeight: acc.netWeight + model.netWeight,
        stoneWeight: acc.stoneWeight + model.stoneWeight,
        stoneCharges: acc.stoneCharges + ((model.stoneWeight * 600)) // 600₹ per kg
      }), { grossWeight: 0, netWeight: 0, stoneWeight: 0, stoneCharges: 0 });

      // Log detailed calculations
      console.log('Calculated Totals:', {
        grossWeight: totals.grossWeight.toFixed(3),
        netWeight: totals.netWeight.toFixed(3),
        stoneWeight: totals.stoneWeight.toFixed(3),
        stoneCharges: totals.stoneCharges.toFixed(2),
        stoneRate: '600₹ per g',
        totalModels: selectedModels.length
      });

      // Log individual model details
      console.log('Model Details:', selectedModels.map(model => ({
        modelId: model.modelId,
        modelName: model.modelName,
        netWeight: model.netWeight.toFixed(3),
        stoneWeight: model.stoneWeight.toFixed(3),
        grossWeight: model.grossWeight.toFixed(3),
        stoneCharges: ((model.stoneWeight * 600)).toFixed(2)
      })));

      // Generate PDF and Excel
      const pdfBytes = await generateSummaryPDF(selectedModels);
      const excelBlob = generateExcel(selectedModels);

      // Create form data
      const formData = new FormData();
      const taggingId = generateTaggingId();
      
      // Add basic details with stone information
      const formDataDetails = {
        taggingId,
        partyCode: selectedParty,
        totalGrossWeight: totals.grossWeight.toFixed(3),
        totalNetWeight: totals.netWeight.toFixed(3),
        totalStoneWeight: totals.stoneWeight.toFixed(3),
        totalStoneCharges: totals.stoneCharges.toFixed(2),
        stoneRate: '600', // Rate per kg
        modelCount: selectedModels.length
      };

      // Log submission details
      console.log('Submitting Tagging Order:', {
        ...formDataDetails,
        selectedModelsCount: selectedModels.length,
        submittedItemsCount: submittedItems.length,
        hasPDF: !!pdfBytes,
        hasExcel: !!excelBlob
      });

      // Append all form data
      Object.entries(formDataDetails).forEach(([key, value]) => {
        formData.append(key, value);
      });
      
      // Append files
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      formData.append('pdfFile', pdfBlob, 'tagging_summary.pdf');
      formData.append('excelFile', excelBlob, 'tagging_summary.xlsx');

      // Log request URL and data
      console.log('Sending request to:', `${apiBaseUrl}/api/submit-tagging`);
      console.log('Form Data Keys:', Array.from(formData.keys()));

      // Submit the tagging
      const response = await fetch(`${apiBaseUrl}/api/submit-tagging`, {
        method: 'POST',
        body: formData
      });

      // Log response status
      console.log('Server Response Status:', response.status);

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      // Log server response
      console.log('Server Response:', {
        success: result.success,
        message: result.message,
        data: result.data
      });

      if (!result.success) {
        throw new Error(result.message || 'Failed to submit tagging');
      }

      // Log success details
      console.log('Tagging Order created successfully:', {
        taggingId,
        partyCode: selectedParty,
        modelsCount: selectedModels.length,
        totalStoneWeight: totals.stoneWeight.toFixed(3),
        totalStoneCharges: totals.stoneCharges.toFixed(2)
      });

      // Increment tagging number and save to localStorage
      const newNumber = lastTaggingNumber + 1;
      setLastTaggingNumber(newNumber);
      localStorage.setItem('lastTaggingNumber', newNumber.toString());

      alert('Tagging order submitted successfully!');
      
      // Reset form
      setSelectedParty('');
      setSelectedOrder('');
      setOrderModels([]);
      setSelectedModels([]);
      setModelCounts({});
      setSubmittedItems([]);
      setOrders([]);
      setIsLoadingOrders(false);
      setIsLoadingModels(false);

    } catch (error) {
      console.error('Error submitting tagging:', {
        error: error.message,
        stack: error.stack,
        selectedModels: selectedModels.length,
        submittedItems: submittedItems.length
      });
      alert(`Error submitting tagging: ${error.message}`);
    } finally {
      setIsSubmittingTagging(false);
    }
  };

  // Update the generateSummaryPDF function
  const generateSummaryPDF = async (models: TaggingModel[]): Promise<Uint8Array> => {
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]); // A4 size
      const { width, height } = page.getSize();
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const black = rgb(0, 0, 0);
    
      // Add title
      page.drawText('Tagging Summary', {
        x: 50,
        y: height - 50,
        size: 16,
        font: helveticaBold,
        color: black
      });

      // Add table headers
      const headers = ['Model', 'Unique #', 'Net Weight', 'Stone Weight', 'Gross Weight', 'Stone Charges'];
      let yPos = height - 100;
      let xPos = 50;

      headers.forEach((header, index) => {
        page.drawText(header, {
          x: xPos,
          y: yPos,
          size: 12,
          font: helveticaBold,
          color: black
        });
        xPos += 90;
      });

      // Add table rows
      models.forEach((model, index) => {
        yPos -= 30;
        page.drawText(model.modelName, {
          x: 50,
          y: yPos,
          size: 10,
          font: helvetica,
          color: black
        });
        page.drawText(model.uniqueNumber.toString(), {
          x: 140,
          y: yPos,
          size: 10,
          font: helvetica,
          color: black
        });
        page.drawText(model.netWeight.toFixed(3), {
          x: 230,
          y: yPos,
          size: 10,
          font: helvetica,
          color: black
        });
        page.drawText(model.stoneWeight.toFixed(3), {
          x: 320,
          y: yPos,
          size: 10,
          font: helvetica,
          color: black
        });
        page.drawText(model.grossWeight.toFixed(3), {
          x: 410,
          y: yPos,
          size: 10,
          font: helvetica,
          color: black
        });
        page.drawText(model.stoneCharges.toFixed(2), {
          x: 500,
          y: yPos,
          size: 10,
          font: helvetica,
          color: black
        });
      });

      return pdfDoc.save();
    } catch (error) {
      console.error('Error generating summary PDF:', error);
      throw new Error(`Failed to generate summary PDF: ${error.message}`);
    }
  };

  // Add a button to generate and preview the summary PDF
  const previewSummaryPDF = async () => {
    try {
      console.log('Generating summary PDF for', selectedModels.length, 'models');
      const pdfBytes = await generateSummaryPDF(selectedModels);
      
      // Create blob and URL
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Open in new tab
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error previewing summary PDF:', error);
      alert(`Error generating summary PDF preview: ${error.message}`);
    }
  };

  // Add this function to generate Excel
  const generateExcel = (models: TaggingModel[]): Blob => {
    // Prepare the data for Excel
    const excelData = models.map((model, index) => {
      const submittedItem = submittedItems[index];
      
      return {
       // 'Sr.No': index + 1,
        'Model Name': model.modelName,
        'Net Weight': model.netWeight.toFixed(3),
        'Stone Weight': model.stoneWeight.toFixed(3),
        'Gross Weight': model.grossWeight.toFixed(3),
        'Stone Charges': model.stoneCharges.toFixed(2),
        'PDF URL': submittedItem?.pdfUrl || '' // Url || '' // Optionally include preview URL if needed
      };
    });

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tagging Summary');

    // Generate Excel file
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  };

  // Add preview Excel function
  const previewExcel = () => {
    try {
      const excelBlob = generateExcel(selectedModels);
      const url = window.URL.createObjectURL(excelBlob);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error previewing Excel:', error);
      alert('Error generating Excel preview');
    }
  };

  // First, let's deduplicate the orderModels array before rendering
  const uniqueModels = Array.from(new Map(orderModels.map(model => [model.id, model])).values());

  return (
    <div className="flex justify-center gap-6">
      {/* Form container - Added left padding */}
      <div className="max-w-4xl p-6 pl-20 mx-auto bg-white rounded-lg shadow-md mt-[200px]">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">New Tagging</h1>
        
        <form className="space-y-6 max-w-3xl mx-auto" onSubmit={(e) => {
          e.preventDefault();
          handleSubmitTagging();
        }}>
          {/* Party & Order Selection - Centered grid */}
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
                    setSelectedOrder('');
                    setSelectedModels([]);
                    setSubmittedItems([]);
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
                value={selectedOrder}
                onValueChange={(value) => {
                  console.log('Order selected:', value);
                  setSelectedOrder(value);
                }}
                disabled={!selectedParty || isLoadingOrders}
              >
                <SelectTrigger className="w-full bg-white border border-gray-200">
                  <SelectValue placeholder={isLoadingOrders ? "Loading Orders..." : "Select Order"} />
                </SelectTrigger>
                <SelectContent className="bg-white max-h-[200px] overflow-y-auto">
                  {orders.length > 0 ? (
                    orders.map((order) => (
                      <SelectItem 
                        key={`${order.id}-${order.orderNo}`}
                        value={order.id}
                      >
                        {order.orderNo}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-data" disabled>
                      {isLoadingOrders ? "Loading..." : "No orders available"}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Model Selection - Centered */}
          {selectedOrder && (
            <div className="space-y-4 mx-auto">
              <div className="form-group relative z-10">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Model
                </label>
                <Select 
                  onValueChange={handleModelSelection}
                  disabled={!selectedOrder || isLoadingModels}
                >
                  <SelectTrigger className="w-full bg-white border border-gray-200">
                    <SelectValue placeholder={isLoadingModels ? "Loading Models..." : "Select Model"} />
                  </SelectTrigger>
                  <SelectContent className="bg-white max-h-[200px] overflow-y-auto">
                    {uniqueModels.length > 0 ? (
                      uniqueModels.map((model, index) => (
                        <SelectItem 
                          key={`model-${model.id}-${selectedOrder}-${index}`}
                          value={model.id}
                        >
                          {model.modelName}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-data" disabled>
                        {isLoadingModels ? "Loading..." : "No models available"}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Selected Models Details - Centered */}
          {selectedModels.length > 0 && (
            <div className="space-y-4 mx-auto">
              <label className="block text-sm font-medium text-gray-700">
                Selected Models Details
              </label>
              {selectedModels.map((model, index) => {
                // Calculate stone charges
                const stoneRate = 600; // Rs per 1000 grams
                const calculatedStoneCharge = (model.stoneWeight * stoneRate);

                return (
                  <div 
                    key={`${model.modelId}-${model.uniqueNumber}-${index}`}
                    className="border rounded-lg p-4 bg-white shadow-sm"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <p className="font-medium text-gray-800">
                        {model.modelName} 
                        <span className="ml-2 text-sm text-gray-500">
                          (#{model.uniqueNumber})
                        </span>
                      </p>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          onClick={() => {
                            const newModel = {
                              ...model,
                              uniqueNumber: generateUniqueNumber(),
                              stoneWeight: 0,
                              netWeight: 0,
                              grossWeight: 0,
                              stoneCharges: 0
                            };
                            setSelectedModels([...selectedModels, newModel]);
                          }}
                          className="h-15 w-20 text-xs text-green-600 bg-green-50 hover:bg-green-100 border-green-200"
                        >
                          Add Again
                        </Button>
                        <Button
                          type="button"
                          onClick={() => {
                            const updatedModels = selectedModels.filter((_, i) => i !== index);
                            setSelectedModels(updatedModels);
                          }}
                          className="h-7 w-20 text-xs text-white bg-red-500 hover:bg-red-600 border-none rounded"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-600">Stone Weight (g)</label>
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          value={model.stoneWeight}
                          onChange={(e) => {
                            const stoneWeight = parseFloat(e.target.value) || 0;
                            const updatedModels = [...selectedModels];
                            updatedModels[index] = {
                              ...model,
                              stoneWeight: stoneWeight,
                              grossWeight: stoneWeight + (model.netWeight || 0),
                              stoneCharges: (stoneWeight * stoneRate)// Auto calculate stone charges
                            };
                            setSelectedModels(updatedModels);
                          }}
                          className="w-full h-8 text-sm mt-1 px-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0.000"
                        />
                        <span className="text-xs text-gray-500 mt-1">
                          (Stone Rate: {stoneRate}₹/g)
                        </span>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Net Weight (g)</label>
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          value={model.netWeight}
                          onChange={(e) => {
                            const netWeight = parseFloat(e.target.value) || 0;
                            const updatedModels = [...selectedModels];
                            updatedModels[index] = {
                              ...model,
                              netWeight: netWeight,
                              grossWeight: (model.stoneWeight || 0) + netWeight
                            };
                            setSelectedModels(updatedModels);
                          }}
                          className="w-full h-8 text-sm mt-1 px-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0.000"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Gross Weight (Auto)</label>
                        <input
                          type="number"
                          step="0.001"
                          value={model.grossWeight}
                          disabled
                          className="w-full h-8 text-sm mt-1 px-2 border border-gray-300 rounded bg-gray-50"
                          placeholder="0.000"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Stone Charges (Auto)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={calculatedStoneCharge}
                          disabled
                          className="w-full h-8 text-sm mt-1 px-2 border border-gray-300 rounded bg-gray-50"
                          placeholder="0.00"
                        />
                        <span className="text-xs text-gray-500 mt-1">₹</span>
                      </div>
                    </div>
                    <div className="col-span-2 flex justify-end mt-2">
                      <Button
                        type="button"
                        onClick={() => previewModelPDF(model)}
                        className="h-7 w-20 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-200"
                      >
                        Preview
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Summary Table - Centered */}
          {selectedModels.length > 0 && (
            <div className="mt-8 mx-auto">
              <h2 className="text-lg font-medium text-gray-800 mb-4 text-center">Summary Table</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 border-b text-left text-xs font-medium text-gray-500 uppercase">
                        Sr.No
                      </th>
                      <th className="px-4 py-2 border-b text-left text-xs font-medium text-gray-500 uppercase">
                        Model Name
                      </th>
                      <th className="px-4 py-2 border-b text-right text-xs font-medium text-gray-500 uppercase">
                        Net Wt (g)
                      </th>
                      <th className="px-4 py-2 border-b text-right text-xs font-medium text-gray-500 uppercase">
                        Stone Wt (g)
                      </th>
                      <th className="px-4 py-2 border-b text-right text-xs font-medium text-gray-500 uppercase">
                        Gross Wt (g)
                      </th>
                      <th className="px-4 py-2 border-b text-right text-xs font-medium text-gray-500 uppercase">
                        Stone Charges (₹)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedModels.map((model, index) => (
                      <tr key={`${model.modelId}-${index}`} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {index + 1}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {model.modelName}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right">
                          {model.netWeight.toFixed(3)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right">
                          {model.stoneWeight.toFixed(3)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right">
                          {model.grossWeight.toFixed(3)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right">
                          {((model.stoneWeight * 600)).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-medium">
                      <td className="px-4 py-2 text-sm text-gray-900">
                        Total
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {selectedModels.length} items
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right">
                        {selectedModels.reduce((sum, model) => sum + model.netWeight, 0).toFixed(3)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right">
                        {selectedModels.reduce((sum, model) => sum + model.stoneWeight, 0).toFixed(3)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right">
                        {selectedModels.reduce((sum, model) => sum + model.grossWeight, 0).toFixed(3)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right">
                        {selectedModels.reduce((sum, model) => sum + ((model.stoneWeight * 600)), 0).toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Submit Buttons - Centered */}
          <div className="mt-6 flex gap-2 justify-center">
            <Button
              type="button"
              onClick={handleSubmitModels}
              disabled={isSubmittingModels || selectedModels.length === 0}
              className="h-8 px-4 text-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmittingModels ? 'Submitting...' : 'Submit Models'}
            </Button>
            <Button
              type="button"
              onClick={handleSubmitTagging}
              disabled={isSubmittingTagging || selectedModels.length === 0}
              className="h-8 px-4 text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmittingTagging ? 'Creating Tagging...' : 'Create Tagging Order'}
            </Button>
            <Button
              type="button"
              onClick={previewSummaryPDF}
              disabled={selectedModels.length === 0}
              className="h-8 px-4 text-sm text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Preview PDF
            </Button>
            <Button
              type="button"
              onClick={previewExcel}
              disabled={selectedModels.length === 0}
              className="h-8 px-4 text-sm text-white bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Preview Excel
            </Button>
          </div>
        </form>
      </div>

      {/* Preview Section - Kept the same width */}
      <div className="w-[400px] mt-[200px] space-y-4">
        <div className="sticky top-[220px] bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold mb-4">Model Preview</h2>
          {selectedModels.length > 0 ? (
            <div className="space-y-4">
              {/* Image Preview */}
              <div className="aspect-square w-full relative rounded-lg overflow-hidden border border-gray-200">
                {selectedModels[selectedModels.length - 1].imageData ? (
                  <img
                    src={selectedModels[selectedModels.length - 1].imageData}
                    alt={`Model ${selectedModels[selectedModels.length - 1].modelName}`}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder.png';
                      console.error('Error loading image');
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-50">
                    <span className="text-gray-400">No image available</span>
                  </div>
                )}
              </div>
              
              {/* Model Details */}
              <div className="text-sm text-gray-600">
                <p className="font-medium">{selectedModels[selectedModels.length - 1].modelName}</p>
                <p>Unique #: {selectedModels[selectedModels.length - 1].uniqueNumber}</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-500">Net Weight:</span>
                    <p>{selectedModels[selectedModels.length - 1].netWeight.toFixed(3)}g</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Stone Weight:</span>
                    <p>{selectedModels[selectedModels.length - 1].stoneWeight.toFixed(3)}g</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Gross Weight:</span>
                    <p>{selectedModels[selectedModels.length - 1].grossWeight.toFixed(3)}g</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Stone Charges:</span>
                    <p>₹{selectedModels[selectedModels.length - 1].stoneCharges.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* PDF Preview Button */}
              <div className="mt-4">
                <Button
                  onClick={async () => {
                    const currentModel = selectedModels[selectedModels.length - 1];
                    const pdfBytes = await generatePDF(currentModel);
                    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                    const url = window.URL.createObjectURL(blob);
                    window.open(url, '_blank');
                  }}
                  className="w-full text-sm"
                >
                  Preview PDF
                </Button>
              </div>
            </div>
          ) : (
            <div className="aspect-square w-full flex items-center justify-center border border-gray-200 rounded-lg bg-gray-50">
              <p className="text-gray-500 text-sm">Select a model to preview</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewTagging;