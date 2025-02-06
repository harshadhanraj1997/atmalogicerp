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

const AddModel = () => {
 const apiBaseUrl = "https://needha-erp-server.onrender.com";
 const router = useRouter();
 const searchParams = useSearchParams();
 const orderId = searchParams.get('orderId');

 const [formData, setFormData] = useState({
   orderId: orderId || '',
   category: '',
   item: '',
   purity: '',
   size: '',
   color: '',
   quantity: '',
   grossWeight: '',
   stoneWeight: '',
   netWeight: '',
   remarks: '',
   batchNo: '',
   treeNo: '',
   createdDate: new Date().toISOString().split('T')[0]
 });

 const [categories, setCategories] = useState([]);
 const [items, setItems] = useState([]);
 const [modelImage, setModelImage] = useState(null);
 const [models, setModels] = useState([]);
 const [orderDetails, setOrderDetails] = useState(null);

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

     // Calculate net weight when gross weight or stone weight changes
     if (field === 'grossWeight' || field === 'stoneWeight') {
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
      // Get the values using exact field names from API
      const grossWeight = selectedItem.GrossWeight || 0;
      const size = selectedItem.Size || '';
      let imageUrl = selectedItem.ImageURL || '';

      console.log("Found gross weight:", grossWeight);
      console.log("Found size:", size);
      console.log("Original image URL:", imageUrl);

      // Update form data
      setFormData(prev => ({
        ...prev,
        item: selectedItem.Name,
        grossWeight: grossWeight,
        size: size
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
    grossWeight: '',
    stoneWeight: '',
    netWeight: '',
    remarks: '',
    batchNo: '',
    treeNo: ''
  }));
  setModelImage(null);
};

 const handleFinalSubmit = async (e) => {
   e.preventDefault();
   try {
     const response = await fetch(`${apiBaseUrl}/api/update-model`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         orderId: orderId,
         models: models
       })
     });

     if (response.ok) {
       alert('Models saved successfully');
       setModels([]);
     }
   } catch (error) {
     console.error("Error saving models:", error);
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

// Update the columnWidths to match the example more precisely
const columnWidths = {
  category: 0.09,    
  item: 0.09,        
  purity: 0.05,      
  size: 0.05,        
  color: 0.06,       
  quantity: 0.05,    
  grossWeight: 0.07, 
  stoneWeight: 0.07, 
  netWeight: 0.07,   
  batchNo: 0.06,     
  treeNo: 0.06,      
  remarks: 0.08,     
  image: 0.20        // Reduced to match example
};

// Keep the row height
const rowHeight = 120;

// Update the generatePDF function to include order details
const generatePDF = async () => {
  try {
    if (!orderDetails) {
      console.log("No order details available");
      return;
    }

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Create first page
    let page = pdfDoc.addPage([841.89, 595.28]); // A4 Landscape
    let y = 550;
    const margin = 30;
    const lineHeight = 20;

    // Draw company header
    page.drawText('NEEDHA Gold PRIVATE LIMITED', {
      x: (page.getWidth() - boldFont.widthOfTextAtSize('NEEDHA Gold PRIVATE LIMITED ORDER Sheet', 16)) / 2,
      y: y + 20,
      size: 16,
      font: boldFont
    });
    y -= lineHeight * 2;

    // Helper function to format date
    const formatDate = (dateString) => {
      if (!dateString) return '-';
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    };

    // Draw order details
    console.log("Drawing order details:", orderDetails);
    
    const orderInfoLines = [
      ['Order ID:', orderDetails.id || '-'],
      ['Customer Name:', orderDetails.partyName || '-'],
      ['Created Date:', formatDate(orderDetails.created_date)],
      ['Delivery Date:', formatDate(orderDetails.deliveryDate)],
      ['Created By:', orderDetails.created_by || '-'],
      ['Advance Metal:', orderDetails.advanceMetal || '-'],
      ['Purity:', orderDetails.purity || '-'],
      ['Status:', orderDetails.status || '-'],
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

      // Draw label
      page.drawText(label, {
        x,
        y: currentY,
        size: 10,
        font: boldFont
      });

      // Draw value
      const valueStr = value?.toString() || '-';
      page.drawText(valueStr, {
        x: x + 100,
        y: currentY,
        size: 10,
        font: font
      });

      // Move to next row after every two items
      if (index % 2 === 1) {
        currentY -= lineHeight;
      }
    });

    y = currentY - lineHeight * 2;

    // Draw models table title
    page.drawText('Model Details', {
      x: margin,
      y,
      size: 14,
      font: boldFont
    });
    y -= lineHeight * 2;

    // Define table structure
    const tableWidth = page.getWidth() - (2 * margin);
    const tableHeaderMapping = [
      { display: 'Category', key: 'category', width: 0.11 },
      { display: 'Item', key: 'item', width: 0.11 },
      { display: 'Purity', key: 'purity', width: 0.05 },
      { display: 'Size', key: 'size', width: 0.05 },
      { display: 'Color', key: 'color', width: 0.07 },
      { display: 'Quantity', key: 'quantity', width: 0.05 },
      { display: 'Gross Weight', key: 'grossWeight', width: 0.07 },
      { display: 'Stone Weight', key: 'stoneWeight', width: 0.07 },
      { display: 'Net Weight', key: 'netWeight', width: 0.07 },
      { display: 'Batch No', key: 'batchNo', width: 0.07 },
      { display: 'Tree No', key: 'treeNo', width: 0.07 },
      { display: 'Remarks', key: 'remarks', width: 0.08 },
      { display: 'Image', key: 'image', width: 0.20 }
    ];

    // Draw table headers
    let xPos = margin;
    tableHeaderMapping.forEach(({ display, width }) => {
      const cellWidth = width * tableWidth;
      
      page.drawRectangle({
        x: xPos,
        y,
        width: cellWidth,
        height: 25,
        borderColor: rgb(0, 0, 0),
        borderWidth: 0.5
      });

      const headerWidth = boldFont.widthOfTextAtSize(display, 8);
      const headerX = xPos + (cellWidth - headerWidth) / 2;

      page.drawText(display, {
        x: headerX,
        y: y + 8,
        size: 8,
        font: boldFont
      });

      xPos += cellWidth;
    });

    y -= 25;

    // Draw table rows
    for (const model of models) {
      const rowHeight = 120; // Increased from 80 to 120

      // Add new page if needed
      if (y < margin + rowHeight) {
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
        model.quantity || '',
        model.grossWeight || '',
        model.stoneWeight || '',
        model.netWeight || '',
        model.batchNo || '',
        model.treeNo || '',
        model.remarks || ''
      ];

      // Draw data cells
      rowData.forEach((data, index) => {
        const cellWidth = tableHeaderMapping[index].width * tableWidth;
        
        page.drawRectangle({
          x: xPos,
          y: y - rowHeight,
          width: cellWidth,
          height: rowHeight,
          borderColor: rgb(0, 0, 0),
          borderWidth: 0.5
        });

        const text = data?.toString() || '';
        const textWidth = font.widthOfTextAtSize(text, 8);
        const textX = xPos + (cellWidth - textWidth) / 2;

        page.drawText(text, {
          x: textX,
          y: y - rowHeight/2,
          size: 8,
          font: font
        });

        xPos += cellWidth;
      });

      // Draw image cell
      const imageWidth = tableHeaderMapping[11].width * tableWidth;
      page.drawRectangle({
        x: xPos,
        y: y - rowHeight,
        width: imageWidth,
        height: rowHeight,
        borderColor: rgb(0, 0, 0),
        borderWidth: 0.5
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
            const cellWidth = columnWidths.image * tableWidth;
            const cellHeight = rowHeight;
            
            page.drawRectangle({
              x: xPos,
              y: y - rowHeight,
              width: cellWidth,
              height: cellHeight,
              borderColor: rgb(0, 0, 0),
              borderWidth: 0.5,
              color: rgb(1, 1, 1, 0)
            });

            // Calculate image dimensions
            const maxWidth = cellWidth * 0.8;  // 80% of cell width
            const maxHeight = cellHeight * 0.8; // 80% of cell height
            
            // Get original aspect ratio
            const aspectRatio = embeddedImage.width / embeddedImage.height;
            
            // Calculate dimensions maintaining aspect ratio
            let finalWidth, finalHeight;
            if (aspectRatio > 1) {
              // Landscape image
              finalWidth = maxWidth;
              finalHeight = maxWidth / aspectRatio;
            } else {
              // Portrait image
              finalHeight = maxHeight;
              finalWidth = maxHeight * aspectRatio;
            }
            
            // Ensure dimensions don't exceed maximums
            if (finalWidth > maxWidth) {
              finalWidth = maxWidth;
              finalHeight = finalWidth / aspectRatio;
            }
            if (finalHeight > maxHeight) {
              finalHeight = maxHeight;
              finalWidth = finalHeight * aspectRatio;
            }
            
            // Center image in cell
            const xOffset = xPos + (cellWidth - finalWidth) / 2;
            const yOffset = y - rowHeight + (cellHeight - finalHeight) / 2;

            // Draw image
            const drawOptions = {
              x: Number(xOffset),
              y: Number(yOffset),
              width: Number(finalWidth),
              height: Number(finalHeight)
            };

            if (!Object.values(drawOptions).some(isNaN)) {
              page.drawImage(embeddedImage, drawOptions);
            }
          }
        } catch (error) {
          console.error('Error embedding image:', error);
          // Draw empty cell
          page.drawRectangle({
            x: xPos,
            y: y - rowHeight,
            width: columnWidths.image * tableWidth,
            height: rowHeight,
            borderColor: rgb(0, 0, 0),
            borderWidth: 0.5,
            color: rgb(1, 1, 1, 0)
          });
        }
      }

      y -= rowHeight;
    }

    // Add page numbers
    const totalPages = pdfDoc.getPageCount();
    for (let i = 0; i < totalPages; i++) {
      const currentPage = pdfDoc.getPage(i);
      currentPage.drawText(`Page ${i + 1} of ${totalPages}`, {
        x: currentPage.getWidth() - margin - 60,
        y: margin,
        size: 8,
        font: font
      });
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Error generating PDF');
  }
};

const generateImagesOnlyPDF = async () => {
  try {
    if (models.length === 0) {
      alert('No models available');
      return;
    }

    const pdfDoc = await PDFDocument.create();
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
              `Gross Weight: ${model.grossWeight || '-'}`,
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

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  } catch (error) {
    console.error('Error generating images PDF:', error);
    alert('Error generating images PDF');
  }
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
               value={formData.color}
               onChange={(e) => handleInputChange('color', e.target.value)}
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
             <Label htmlFor="batchNo">Batch No</Label>
             <Input
               id="batchNo"
               value={formData.batchNo}
               onChange={(e) => handleInputChange('batchNo', e.target.value)}
               placeholder="Batch No"
             />
           </div>

           <div>
             <Label htmlFor="treeNo">Tree No</Label>
             <Input
               id="treeNo"
               value={formData.treeNo}
               onChange={(e) => handleInputChange('treeNo', e.target.value)}
               placeholder="Tree No"
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

           <div className="col-span-2 flex gap-4">
             <Button type="button" onClick={handleAdd} className="flex-1">
               Add Model
             </Button>
             <Button type="submit" onClick={handleFinalSubmit} className="flex-1" disabled={models.length === 0}>
               Submit All Models
             </Button>
             <Button type="button" onClick={generatePDF} className="flex-1">
               Generate PDF
             </Button>
             <Button type="button" onClick={generateImagesOnlyPDF} className="flex-1">
    Generate Images PDF
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
                 <th className="p-2 border">Gross Weight</th>
                 <th className="p-2 border">Stone Weight</th>
                 <th className="p-2 border">Net Weight</th>
                 <th className="p-2 border">Batch No</th>
                 <th className="p-2 border">Tree No</th>
                 <th className="p-2 border">Remarks</th>
                 <th className="p-2 border">Image</th>
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
                   <td className="p-2 border">{model.grossWeight}</td>
                   <td className="p-2 border">{model.stoneWeight}</td>
                   <td className="p-2 border">{model.netWeight}</td>
                   <td className="p-2 border">{model.batchNo}</td>
                   <td className="p-2 border">{model.treeNo}</td>
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