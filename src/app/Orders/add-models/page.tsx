"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { useSearchParams } from 'next/navigation';
import "../add-order/add-order.css";
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';


const AddModel = () => {
 const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
 const router = useRouter();
 const searchParams = useSearchParams();
 const orderId = searchParams.get('orderId');

 const [formData, setFormData] = useState({
   orderId: orderId || '',
   category: '',
   item: '',
   purity: '',
   size: '',
   color: 'Yellow',
   quantity: '',
   grossWeight: '',
   stoneWeight: '',
   netWeight: '',
   remarks: '',
   createdDate: new Date().toISOString().split('T')[0]
 });

 const [categories, setCategories] = useState([]);
 const [items, setItems] = useState([]);
 const [modelImage, setModelImage] = useState(null);
 const [models, setModels] = useState([]);
 const [orderDetails, setOrderDetails] = useState(null);
 const [isLoading, setIsLoading] = useState(false);
 const [modelStatus, setModelStatus] = useState('First');

 useEffect(() => {
   fetchCategories();
   console.log("Order ID:", orderId);
 }, []);

 useEffect(() => {
   if (formData.category) {
     fetchItems(formData.category);
   }
 }, [formData.category]);

 useEffect(() => {
   if (orderId) {
     fetchOrderDetails();
   }
 }, [orderId]);

 const fetchCategories = async () => {
   try {
     const response = await fetch(`${apiBaseUrl}/category-groups`);
     const result = await response.json();
     if (result.success) {
       setCategories(result.data);
     }
   } catch (error) {
     console.error("Error fetching categories:", error);
   }
 };

 const fetchItems = async (category: string) => {
  try {
    console.log("Fetching items for category:", category);
    const response = await fetch(`${apiBaseUrl}/api/jewelry-models?Category=${encodeURIComponent(category)}`);
    const result = await response.json();
    
    if (result.success) {
      // Log the first item to see its structure
      if (result.data && result.data.length > 0) {
        console.log("Sample item structure:", JSON.stringify(result.data[0], null, 2));
        console.log("Available fields in first item:", Object.keys(result.data[0]));
      }
      
      setItems(result.data);
    }
  } catch (error) {
    console.error("Error fetching items:", error);
  }
};

 const handleInputChange = (field: string, value: string | number) => {
   setFormData(prev => {
     const updatedData = {
       ...prev,
       [field]: value
     };

     // Only calculate net weight when stone weight changes
     if (field === 'stoneWeight') {
       const grossWeight = parseFloat(updatedData.grossWeight) || 0;
       const stoneWeight = parseFloat(updatedData.stoneWeight) || 0;
       updatedData.netWeight = Math.max(0, grossWeight - stoneWeight).toFixed(3);
     }

     return updatedData;
   });
 };

 const fetchOrderDetails = async () => {
  try {
    console.log("Fetching order details for orderId:", orderId);
    const response = await fetch(`${apiBaseUrl}/api/orders?orderId=${orderId}`);
    const data = await response.json();
    console.log("Raw API Response:", data);
    
    if (data.success && data.data) {
      // Since data.data might be an array, get the first item
      const orderData = Array.isArray(data.data) ? data.data[0] : data.data;
      setOrderDetails(orderData);
      console.log("Stored order details:", orderData);
    } else {
      console.error("API returned success: false");
    }
  } catch (error) {
    console.error("Error fetching order details:", error);
  }
};

 const getImageData = async (url) => {
  try {
    const response = await fetch(url);
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

// First, update the handleItemSelect function to store the image URL
const handleItemSelect = async (itemName) => {
  try {
    console.log("Selected item name:", itemName);
    const selectedItem = items.find((item) => item.Name === itemName);
    console.log("Selected item data:", selectedItem);

    if (selectedItem) {
      const netWeight = selectedItem.GrossWeight || 0;
      const size = selectedItem.Size || '';
      let imageUrl = selectedItem.ImageURL || '';

      console.log("Found net weight:", netWeight);
      console.log("Found size:", size);
      console.log("Original image URL:", imageUrl);

      // Update form data
      setFormData(prev => ({
        ...prev,
        item: selectedItem.Name,
        netWeight: netWeight,
        size: size,
        stoneWeight: '',
        grossWeight: '',
        color: 'Yellow'
      }));

      // Handle image URL
      if (imageUrl) {
        // Construct the download URL using the existing endpoint
        const downloadUrl = `${apiBaseUrl}/api/download-file?url=${encodeURIComponent(imageUrl)}`;
        console.log("Download URL:", downloadUrl);
        
        // Set the image URL directly
        setModelImage(downloadUrl);
      } else {
        setModelImage(null);
      }
    }
  } catch (error) {
    console.error("Error in handleItemSelect:", error);
  }
};

// Update the handleAdd function
const handleAdd = () => {
  if (!formData.category || !formData.item || !formData.quantity) {
    alert('Please fill required fields');
    return;
  }
  
  // Add model with current data including the image URL
  setModels(prev => [...prev, { 
    ...formData, 
    modelImage: modelImage // This will be the download URL
  }]);
  
  // Reset form
  setFormData(prev => ({
    ...prev,
    category: '',
    item: '',
    purity: '',
    size: '',
    color: '',
    quantity: '',
    wtWeight: '',
    stoneWeight: '',
    netWeight: '',
    grossWeight: '',
    remarks: '',
  }));
  setModelImage(null);
};

 const handleFinalSubmit = async (e) => {
   e.preventDefault();
   try {
     if (!orderId || models.length === 0) {
       alert('Please add at least one model');
       return;
     }

     // Generate PDFs with proper instances
     const detailedPdfDoc = await PDFDocument.create();
     const imagesPdfDoc = await PDFDocument.create();

     await generatePDF(detailedPdfDoc);
     await generateImagesOnlyPDF(imagesPdfDoc);

     // Convert PDFs to base64
     const detailedPdfBytes = await detailedPdfDoc.save();
     const imagesPdfBytes = await imagesPdfDoc.save();

     // Convert to base64 without data URL prefix
     const detailedPdf = Buffer.from(detailedPdfBytes).toString('base64');
     const imagesPdf = Buffer.from(imagesPdfBytes).toString('base64');

     // Format models data according to Salesforce fields
     const formattedModels = models.map(model => ({
       category: model.category,
       item: model.item,
       purity: model.purity,
       size: model.size,
       color: model.color,
       quantity: model.quantity,
       wtWeight: model.wtWeight,
       stoneWeight: model.stoneWeight,
       netWeight: model.netWeight,
       grossWeight: model.grossWeight,
       remarks: model.remarks,
       modelImage: model.modelImage,
       modelStatus: modelStatus
     }));

     // Prepare data for API
     const orderData = {
       orderId: orderId,
       models: formattedModels,
       detailedPdf: detailedPdf,
       imagesPdf: imagesPdf
     };

     // Show loading state
     setIsLoading(true);

     try {
       // Log the form data before sending
       console.log('Sending to server:', {
         orderData,
         modelStatus,
         // Log other relevant data you're sending
       });

       // Make API call
       const response = await fetch(`${apiBaseUrl}/api/update-model`, {
         method: 'POST',
         headers: { 
           'Content-Type': 'application/json'
         },
         body: JSON.stringify({
           ...orderData,
           modelStatus
         })
       });

       const result = await response.json();

       if (result.success) {
         // Show success message
         toast({
           title: "Success",
           description: "Models and PDFs saved successfully",
           status: "success"
         });

         // Preview PDFs
         const detailedPdfBlob = new Blob([detailedPdfBytes], { type: 'application/pdf' });
         const imagesPdfBlob = new Blob([imagesPdfBytes], { type: 'application/pdf' });
         window.open(URL.createObjectURL(detailedPdfBlob), '_blank');
         window.open(URL.createObjectURL(imagesPdfBlob), '_blank');

         // Clear form and redirect
         setModels([]);
         router.push('/Orders');
       } else {
         throw new Error(result.message || 'Failed to save models and PDFs');
       }
     } catch (error) {
       console.error("API Error:", error);
       toast({
         title: "Error",
         description: error.message || "Failed to save models and PDFs",
         status: "error"
       });
     }

   } catch (error) {
     console.error("Error in form submission:", error);
     toast({
       title: "Error",
       description: "Error preparing data for submission",
       status: "error"
     });
   } finally {
     setIsLoading(false);
   }
 };

const embedBase64Image = async (base64Data, pdfDoc) => {
  try {
    if (!base64Data) return null;
    
    // Extract the actual base64 data after the data URL prefix
    const base64String = base64Data.split(',')[1];
    const imageBytes = Uint8Array.from(atob(base64String), c => c.charCodeAt(0));
    
    try {
      return await pdfDoc.embedPng(imageBytes);
    } catch (pngError) {
      try {
        return await pdfDoc.embedJpg(imageBytes);
      } catch (jpgError) {
        console.error('Error embedding image:', jpgError);
        return null;
      }
    }
  } catch (error) {
    console.error('Error processing base64 image:', error);
    return null;
  }
};

// Adjusted column widths to match the example layout
const columnWidths = {
  category: 0.15,        // Mogapu Plain(MUPL)
  item: 0.08,           // 1011
  purity: 0.06,         // 24K
  size: 0.06,           // 3.5mm
  color: 0.06,          // yellow
  quantity: 0.05,       // 3
  wtWeight: 0.07,    // 6.35
  stoneWeight: 0.07,    // 0
  netWeight: 0.07,      // 6.350
  remarks: 0.13,        // No remarks
  image: 0.20          // Image with more space
};

// Keep the row height
const rowHeight = 120;

// Add this helper function for text wrapping
const wrapText = (text: string, width: number, font: PDFFont, fontSize: number) => {
  const words = text.split(' ');
  const lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = font.widthOfTextAtSize(`${currentLine} ${word}`, fontSize);
    if (width < width) {
      currentLine += ` ${word}`;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
};

// Update the generatePDF function to include order details
const generatePDF = async (pdfDoc) => {
  try {
    if (!orderDetails) {
      console.log("No order details available");
      return pdfDoc;
    }

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Create first page
    let page = pdfDoc.addPage([841.89, 595.28]); // A4 Landscape
    let y = 550;
    const margin = 30;
    const lineHeight = 20;

    // Draw company header
    page.drawText('NEEDHA Gold PRIVATE LIMITED', {
      x: (page.getWidth() - boldFont.widthOfTextAtSize('NEEDHA Gold PRIVATE LIMITED', 16)) / 2,
      y: y + 20,
      size: 16,
      font: boldFont
    });
    y -= lineHeight * 2;

    // Draw order details
    console.log("Order Status:", modelStatus);
    const orderInfoLines = [
      ['Order ID:', orderDetails.id || '-'],
      ['Customer Name:', orderDetails.partyName || '-'],
      ['Created Date:', new Date().toLocaleDateString()],
      ['Delivery Date:', orderDetails.deliveryDate || '-'],
      ['Created By:', orderDetails.created_by || '-'],
      ['Advance Metal:', orderDetails.advanceMetal || '-'],
      ['Purity:', orderDetails.purity || '-'],
      ['Status:', orderDetails.status || '-'],
      ['Model Status:', modelStatus || '-'],
      ['Remarks:', orderDetails.remarks || '-']
    ];

    // Draw "Order Details" header
    page.drawText('Order Details', {
      x: margin,
      y,
      size: 14,
      font: boldFont
    });
    y -= lineHeight * 2;

    // Draw order details in two columns
    let leftX = margin;
    let rightX = page.getWidth() / 2 + margin;
    let currentY = y;

    orderInfoLines.forEach((detail, index) => {
      const [label, value] = detail;
      const x = index % 2 === 0 ? leftX : rightX;

      page.drawText(label, {
        x,
        y: currentY,
        size: 10,
        font: boldFont
      });

      page.drawText(value?.toString() || '-', {
        x: x + 100,
        y: currentY,
        size: 10,
        font: font
      });

      if (index % 2 === 1) {
        currentY -= lineHeight;
      }
    });

    y = currentY - lineHeight * 2;

    // Define table structure
    const tableHeaderMapping = [
      { display: 'Category', key: 'category', width: 0.15 },
      { display: 'Item', key: 'item', width: 0.08 },
      { display: 'Purity', key: 'purity', width: 0.06 },
      { display: 'Size', key: 'size', width: 0.06 },
      { display: 'Color', key: 'color', width: 0.06 },
      { display: 'Quantity', key: 'quantity', width: 0.05 },
      { display: 'WT Weight', key: 'wtWeight', width: 0.07 },
      { display: 'Stone Weight', key: 'stoneWeight', width: 0.07 },
      { display: 'Net Weight', key: 'netWeight', width: 0.07 },
      { display: 'Gross Weight', key: 'grossWeight', width: 0.07 },
      { display: 'Remarks', key: 'remarks', width: 0.13 },
      { display: 'Image', key: 'image', width: 0.20 }
    ];

    // Draw "Model Details" heading
    page.drawText("Model Details", {
      x: margin,
      y: y,
      size: 14,
      font: boldFont
    });
    y -= 30;

    // Draw table headers with proper spacing
    const headers = ['Category', 'Item', 'Purity', 'Size', 'Color', 'Quantity', 'WT Weight', 'Stone Weight', 'Net Weight', 'Gross Weight', 'Remarks', 'Image'];
    let xPos = margin;
    
    headers.forEach((header, index) => {
      const columnWidth = columnWidths[Object.keys(columnWidths)[index]] * (page.getWidth() - 2 * margin);
      page.drawText(header, {
        x: xPos,
        y: y,
        size: 9,  // Slightly smaller font size for headers
        font: boldFont
      });
      xPos += columnWidth;
    });

    y -= 20;

    // Draw table rows with adjusted spacing
    for (const model of models) {
      if (y < margin + 120) {
        page = pdfDoc.addPage([841.89, 595.28]);
        y = 550;
      }

      xPos = margin;
      const rowData = [
        model.category || '',
        model.item || '',
        model.purity || '',
        model.size || '',
        model.color || '',
        model.quantity?.toString() || '',
        model.wtWeight?.toString() || '',
        model.stoneWeight?.toString() || '',
        model.netWeight?.toString() || '',
        model.grossWeight?.toString() || '',
        model.remarks || ''
      ];

      // Draw row data with proper spacing
      rowData.forEach((data, index) => {
        const cellWidth = columnWidths[Object.keys(columnWidths)[index]] * (page.getWidth() - 2 * margin);
        
        page.drawRectangle({
          x: xPos,
          y: y - rowHeight,
          width: cellWidth,
          height: rowHeight,
          borderColor: rgb(0, 0, 0),
          borderWidth: 0.5
        });

        const text = data?.toString() || '';
        
        // Special handling for remarks column
        if (tableHeaderMapping[index].key === 'remarks') {
          const maxWidth = cellWidth - 10; // Leave some padding
          const lines = wrapText(text, maxWidth, font, 8);
          
          // Draw each line of the wrapped text
          lines.forEach((line, lineIndex) => {
            const textWidth = font.widthOfTextAtSize(line, 8);
            const textX = xPos + 5; // Left align with padding
            const lineHeight = 12; // Space between lines
            const startY = y - (rowHeight/2) + (lines.length * lineHeight/2);
            
            page.drawText(line, {
              x: textX,
              y: startY - (lineIndex * lineHeight),
              size: 8,
              font: font
            });
          });
        } else {
          // Normal cell handling for other columns
          const textWidth = font.widthOfTextAtSize(text, 8);
          const textX = xPos + (cellWidth - textWidth) / 2;

          page.drawText(text, {
            x: textX,
            y: y - rowHeight/2,
            size: 8,
            font: font
          });
        }

        xPos += cellWidth;
      });

      // Handle image
      if (model.modelImage) {
        try {
          const response = await fetch(model.modelImage);
          const imageBytes = await response.arrayBuffer();
          let embeddedImage;
          try {
            embeddedImage = await pdfDoc.embedPng(new Uint8Array(imageBytes));
          } catch {
            embeddedImage = await pdfDoc.embedJpg(new Uint8Array(imageBytes));
          }

          if (embeddedImage) {
            // Draw cell border first
            const imageColumnWidth = tableHeaderMapping[10].width * (page.getWidth() - 2 * margin); // Use index 10 for image column
            
            page.drawRectangle({
              x: xPos,
              y: y - rowHeight,
              width: imageColumnWidth,
              height: rowHeight,
              borderColor: rgb(0, 0, 0),
              borderWidth: 0.5,
              color: rgb(1, 1, 1, 0) // Transparent fill
            });

            // Calculate image dimensions
            const maxWidth = imageColumnWidth * 0.8;  // 80% of cell width
            const maxHeight = rowHeight * 0.8; // 80% of cell height
            
            // Get original aspect ratio
            const aspectRatio = embeddedImage.width / embeddedImage.height;
            
            // Calculate dimensions maintaining aspect ratio
            let finalWidth, finalHeight;
            if (aspectRatio > 1) {
              finalWidth = maxWidth;
              finalHeight = maxWidth / aspectRatio;
            } else {
              finalHeight = maxHeight;
              finalWidth = maxHeight * aspectRatio;
            }
            
            // Center image in cell
            const xOffset = xPos + (imageColumnWidth - finalWidth) / 2;
            const yOffset = y - rowHeight + (rowHeight - finalHeight) / 2;

            // Draw image
            page.drawImage(embeddedImage, {
              x: xOffset,
              y: yOffset,
              width: finalWidth,
              height: finalHeight
            });
          }
        } catch (error) {
          console.error('Error embedding image:', error);
          // Draw empty cell with border if image fails
          page.drawRectangle({
            x: xPos,
            y: y - rowHeight,
            width: tableHeaderMapping[10].width * (page.getWidth() - 2 * margin),
            height: rowHeight,
            borderColor: rgb(0, 0, 0),
            borderWidth: 0.5
          });
        }
      } else {
        // Draw empty cell with border if no image
        page.drawRectangle({
          x: xPos,
          y: y - rowHeight,
          width: tableHeaderMapping[10].width * (page.getWidth() - 2 * margin),
          height: rowHeight,
          borderColor: rgb(0, 0, 0),
          borderWidth: 0.5
        });
      }

      y -= 120; // Increased row height for better spacing
    }

    return pdfDoc;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return pdfDoc;
  }
};

const generateImagesOnlyPDF = async (pdfDoc) => {
  try {
    if (models.length === 0) {
      alert('No models available');
      return pdfDoc;
    }

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Process each model
    for (const model of models) {
      if (model.modelImage) {
        try {
          // Create a new page for each image (A4 Portrait)
          const page = pdfDoc.addPage([595.28, 841.89]);
          const { width, height } = page.getSize();
          const margin = 50;

          // Draw image title/caption
          const caption = `${model.category} - ${model.item}`;
          const fontSize = 12;
          const textWidth = boldFont.widthOfTextAtSize(caption, fontSize);
          const textX = (width - textWidth) / 2;

          page.drawText(caption, {
            x: textX,
            y: height - margin,
            size: fontSize,
            font: boldFont
          });

          // Fetch and embed image
          const response = await fetch(model.modelImage);
          const imageBytes = await response.arrayBuffer();
          let embeddedImage;
          try {
            embeddedImage = await pdfDoc.embedPng(new Uint8Array(imageBytes));
          } catch {
            embeddedImage = await pdfDoc.embedJpg(new Uint8Array(imageBytes));
          }

          if (embeddedImage) {
            // Calculate available space for image
            const availableWidth = width - (margin * 2);
            const availableHeight = height - (margin * 3); // Extra margin for caption

            // Calculate scale to fit while maintaining aspect ratio
            const scale = Math.min(
              availableWidth / embeddedImage.width,
              availableHeight / embeddedImage.height
            );

            // Calculate final dimensions
            const finalWidth = embeddedImage.width * scale;
            const finalHeight = embeddedImage.height * scale;

            // Calculate position to center image
            const xOffset = (width - finalWidth) / 2;
            const yOffset = ((height - finalHeight) / 2) + margin; // Adjusted for caption

            // Draw image
            page.drawImage(embeddedImage, {
              x: Number(xOffset),
              y: Number(yOffset),
              width: Number(finalWidth),
              height: Number(finalHeight)
            });

            // Draw additional details below the image
            const details = [
              `Size: ${model.size || '-'}`,
              `Purity: ${model.purity || '-'}`,
              `WT Weight: ${model.wtWeight || '-'}`,
              `Stone Weight: ${model.stoneWeight || '-'}`
            ];

            let detailY = yOffset - margin;
            details.forEach(detail => {
              const detailWidth = font.widthOfTextAtSize(detail, 10);
              page.drawText(detail, {
                x: (width - detailWidth) / 2,
                y: detailY,
                size: 10,
                font: font
              });
              detailY -= 20;
            });
          }
        } catch (error) {
          console.error('Error processing image:', error);
        }
      }
    }

    // Add page numbers
    const totalPages = pdfDoc.getPageCount();
    for (let i = 0; i < totalPages; i++) {
      const page = pdfDoc.getPage(i);
      const { width, height } = page.getSize();
      page.drawText(`Page ${i + 1} of ${totalPages}`, {
        x: width - 100,
        y: 30,
        size: 10,
        font: font
      });
    }

    return pdfDoc;
  } catch (error) {
    console.error('Error generating images PDF:', error);
    return pdfDoc;
  }
};

// Add a function to handle row removal
const handleRemoveRow = (index: number) => {
  setModels(prevModels => prevModels.filter((_, i) => i !== index));
};

 return (
   <div className="container mx-auto p-4">
     <Card className="mb-8">
       <CardHeader>
         <CardTitle>Add Model</CardTitle>
       </CardHeader>
       <CardContent>
         <form className="grid grid-cols-2 gap-4">
           {/* Form fields */}
           <div>
             <Label htmlFor="category">Category</Label>
             <select
               id="category"
               value={formData.category}
               onChange={(e) => handleInputChange('category', e.target.value)}
               className="w-full border p-2 rounded"
             >
               <option value="">Select Category</option>
               {categories.map(cat => (
                 <option key={cat.Id} value={cat.Name}>{cat.Name}</option>
               ))}
             </select>
           </div>

           <div>
             <Label htmlFor="item">Item</Label>
             <select
               id="item"
               value={formData.item || ''}
               onChange={(e) => handleItemSelect(e.target.value)}
               className="w-full border p-2 rounded"
             >
               <option value="">Select Item</option>
               {items.map(item => (
                 <option key={item.Id} value={item.Name}>{item.Name}</option>
               ))}
             </select>
           </div>

           <div>
             <Label htmlFor="purity">Purity</Label>
             <select
               id="purity"
               value={formData.purity}
               onChange={(e) => handleInputChange('purity', e.target.value)}
               className="w-full border p-2 rounded"
             >
               <option value="">Select Purity</option>
               <option value="24K">24K</option>
               <option value="22K">22K</option>
               <option value="18K">18K</option>
               <option value="14K">14K</option>
             </select>
           </div>

           <div>
             <Label htmlFor="size">Size</Label>
             <Input
               id="size"
               value={formData.size}
               onChange={(e) => handleInputChange('size', e.target.value)}
               placeholder="Size"
             />
           </div>

           <div>
             <Label htmlFor="color">Color</Label>
             <Input
               id="color"
               value="Yellow"
               readOnly
               className="bg-gray-100"
               placeholder="Color"
             />
           </div>

           <div>
             <Label htmlFor="quantity">Quantity</Label>
             <Input
               id="quantity"
               type="number"
               value={formData.quantity}
               onChange={(e) => handleInputChange('quantity', e.target.value)}
               placeholder="Quantity"
             />
           </div>

           <div>
             <Label htmlFor="grossWeight">Gross Weight</Label>
             <Input
               id="grossWeight"
               type="number"
               step="0.001"
               value={formData.grossWeight}
               onChange={(e) => handleInputChange('grossWeight', e.target.value)}
               placeholder="Gross Weight"
             />
           </div>

           <div>
             <Label htmlFor="stoneWeight">Stone Weight</Label>
             <Input
               id="stoneWeight"
               type="number"
               step="0.001"
               value={formData.stoneWeight}
               onChange={(e) => handleInputChange('stoneWeight', e.target.value)}
               placeholder="Stone Weight"
             />
           </div>

           <div>
             <Label htmlFor="netWeight">Net Weight</Label>
             <Input
               id="netWeight"
               type="number"
               step="0.001"
               value={formData.netWeight}
               onChange={(e) => handleInputChange('netWeight', e.target.value)}
               placeholder="Net Weight"
             />
           </div>

           <div>
             <Label htmlFor="remarks">Remarks</Label>
             <Input
               id="remarks"
               value={formData.remarks}
               onChange={(e) => handleInputChange('remarks', e.target.value)}
               placeholder="Remarks"
             />
           </div>

           <div>
             <Label htmlFor="createdDate">Created Date</Label>
             <Input
               id="createdDate"
               type="date"
               value={formData.createdDate}
               onChange={(e) => handleInputChange('createdDate', e.target.value)}
             />
           </div>

           <div className="col-span-2">
             {modelImage && (
               <img
                 src={modelImage}
                 alt="Model"
                 className="w-32 h-32 object-contain mb-4"
               />
             )}
           </div>

           <div className="form-group" style={{ marginBottom: '20px' }}>
             <label 
               htmlFor="modelStatus" 
               style={{ 
                 display: 'block', 
                 marginBottom: '8px',
                 fontWeight: '500'
               }}
             >
               Model Status:
             </label>
             <select
               id="modelStatus"
               value={modelStatus}
               onChange={(e) => setModelStatus(e.target.value)}
               style={{
                 width: '100%',
                 padding: '8px',
                 borderRadius: '4px',
                 border: '1px solid #ddd',
                 fontSize: '14px'
               }}
               className="form-control"
             >
               <option value="First">First</option>
               <option value="Canceled">Canceled</option>
             </select>
           </div>

           <div className="col-span-2 flex gap-4">
             <Button 
               type="button"
               onClick={handleAdd}
               className="bg-blue-500 hover:bg-blue-600"
             >
               Add Model
             </Button>
             
             <Button 
               type="button"
               onClick={async () => {
                 try {
                   const doc = await PDFDocument.create();
                   await generatePDF(doc);
                   const pdfBytes = await doc.save();
                   const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                   window.open(URL.createObjectURL(blob), '_blank');
                 } catch (error) {
                   console.error('Error generating PDF:', error);
                   alert('Error generating PDF');
                 }
               }}
               className="bg-blue-500 hover:bg-blue-600"
             >
               Preview Detailed PDF
             </Button>

             <Button 
               type="button"
               onClick={async () => {
                 try {
                   const doc = await PDFDocument.create();
                   await generateImagesOnlyPDF(doc);
                   const pdfBytes = await doc.save();
                   const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                   window.open(URL.createObjectURL(blob), '_blank');
                 } catch (error) {
                   console.error('Error generating images PDF:', error);
                   alert('Error generating images PDF');
                 }
               }}
               className="bg-blue-500 hover:bg-blue-600"
             >
               Preview Images PDF
             </Button>

             <Button 
               type="button"
               onClick={handleFinalSubmit}
               className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
               disabled={isLoading}
             >
               {isLoading ? "Saving..." : "Save Order"}
             </Button>
           </div>
         </form>
       </CardContent>
     </Card>

     <Card>
       <CardHeader>
         <CardTitle>Added Models</CardTitle>
       </CardHeader>
       <CardContent>
         <div className="overflow-x-auto">
           <table className="w-full">
             <thead>
               <tr>
                 <th className="p-2 border">Category</th>
                 <th className="p-2 border">Item</th>
                 <th className="p-2 border">Purity</th>
                 <th className="p-2 border">Size</th>
                 <th className="p-2 border">Color</th>
                 <th className="p-2 border">Quantity</th>
                 <th className="p-2 border">Net Weight</th>
                 <th className="p-2 border">Stone Weight</th>
                 <th className="p-2 border">Gross Weight</th>
                 <th className="p-2 border">Remarks</th>
                 <th className="p-2 border">Image</th>
                 <th className="p-2 border">Action</th>
               </tr>
             </thead>
             <tbody>
               {models.map((model, index) => (
                 <tr key={index}>
                   <td className="p-2 border">{model.category}</td>
                   <td className="p-2 border">{model.item}</td>
                   <td className="p-2 border">{model.purity}</td>
                   <td className="p-2 border">{model.size}</td>
                   <td className="p-2 border">{model.color}</td>
                   <td className="p-2 border">{model.quantity}</td>
                   <td className="p-2 border">{model.netWeight}</td>
                   <td className="p-2 border">{model.stoneWeight}</td>
                   <td className="p-2 border">{model.grossWeight}</td>
                   <td className="p-2 border">{model.remarks}</td>
                   <td className="p-2 border">
                     {model.modelImage && (
                       <img
                         src={model.modelImage}
                         alt="Model"
                         className="w-64 h-64 object-contain hover:w-64 hover:h-64 transition-all duration-300"
                       />
                     )}
                   </td>
                   <td className="p-2 border">
                     <Button
                       onClick={() => handleRemoveRow(index)}
                       className="bg-red-500 hover:bg-red-600 p-1 text-sm"
                       variant="destructive"
                       size="sm"
                     >
                       Remove
                     </Button>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
       </CardContent>
     </Card>
   </div>
 );
};

export default AddModel;