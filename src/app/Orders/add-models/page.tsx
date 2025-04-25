"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PDFDocument, PDFFont, StandardFonts, rgb } from 'pdf-lib';
import { useSearchParams } from 'next/navigation';
import "../add-order/add-order.css";
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AlignHorizontalSpaceBetween } from 'lucide-react';


// Add this at the top of the file, with other component-level constants
const margin = 30;
const summaryHeaderWidth = 150; // Fixed width for summary table columns

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
      // Find the exact order that matches our orderId
      const orderData = Array.isArray(data.data) 
        ? data.data.find(order => order.id === orderId)
        : data.data;

      if (orderData) {
        setOrderDetails(orderData);
        console.log("Stored order details:", orderData);
      } else {
        console.error("Order not found for orderId:", orderId);
        toast({
          title: "Error",
          description: "Order details not found",
          status: "error"
        });
      }
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

// Update handleItemSelect function
const handleItemSelect = async (itemName) => {
  try {
    console.log("Selected item name:", itemName);
    const selectedItem = items.find((item) => item.Name === itemName);
    console.log("Selected item data:", selectedItem);

    if (selectedItem) {
      const netWeight = selectedItem.GrossWeight || 0;
      const size = selectedItem.Size || '';
      let imageUrl = selectedItem.ImageURL || '';

      // Check if category contains PLAIN or STONE
      const categoryUpper = (formData.category || '').toUpperCase().trim();
      console.log("Original Category:", formData.category);
      console.log("Trimmed Uppercase Category:", categoryUpper);
      console.log("Length of category:", categoryUpper.length);
      console.log("Contains 'PLAIN':", categoryUpper.indexOf('PLAIN') !== -1);
      console.log("Contains 'STONE':", categoryUpper.indexOf('STONE') !== -1);
      
      const isPlainCategory = categoryUpper.indexOf('PLAIN') !== -1;
      const isStoneCategory = categoryUpper.indexOf('STONE') !== -1;
      
      console.log("Is Plain Category:", isPlainCategory);
      console.log("Is Stone Category:", isStoneCategory);
      console.log("------------------------");

      // Handle plain and stone items differently
      const formDataUpdate = {
        item: selectedItem.Name,
        netWeight: netWeight,
        size: size,
        color: 'Yellow'
      };

      if (isPlainCategory) {
        console.log("Plain category detected");
        formDataUpdate.stoneWeight = '0';
        formDataUpdate.grossWeight = netWeight;
      } else if (isStoneCategory) {
        console.log("Stone category detected");
        formDataUpdate.stoneWeight = '';
        formDataUpdate.grossWeight = '';
      } else {
        formDataUpdate.stoneWeight = '';
        formDataUpdate.grossWeight = '';
      }

      // Update form data
      setFormData(prev => ({
        ...prev,
        ...formDataUpdate
      }));

      // Handle image URL
      if (imageUrl) {
        const downloadUrl = `${apiBaseUrl}/api/download-file?url=${encodeURIComponent(imageUrl)}`;
        console.log("Download URL:", downloadUrl);
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

// Update calculateCategorySummary function to handle stone items correctly
const calculateCategorySummary = (models) => {
  console.log("Starting category summary calculation");
  const plainSummary = {};
  const stoneSummary = {};
  const regularSummary = {};

  models.forEach(model => {
    const category = model.category;
    const categoryUpper = (category || '').toUpperCase().trim();
    const isPlainCategory = categoryUpper.includes('PLAIN');
    const isStoneCategory = categoryUpper.includes('STONE');
    
    console.log("Processing category:", category);
    console.log("Is Plain:", isPlainCategory);
    console.log("Is Stone:", isStoneCategory);

    if (isPlainCategory) {
      if (!plainSummary[category]) {
        plainSummary[category] = {
          quantity: 0,
          netWeight: 0,
          grossWeight: 0,
          stoneWeight: 0
        };
      }
      plainSummary[category].quantity += Number(model.quantity) || 0;
      plainSummary[category].netWeight += Number(model.grossWeight) || 0;
      plainSummary[category].grossWeight += Number(model.grossWeight) || 0;
      plainSummary[category].stoneWeight = 0;
    } 
    else if (isStoneCategory) {
      if (!stoneSummary[category]) {
        stoneSummary[category] = {
          quantity: 0,
          netWeight: 0,
          grossWeight: null,
          stoneWeight: null  // Changed to null for stone items
        };
      }
      stoneSummary[category].quantity += Number(model.quantity) || 0;
      stoneSummary[category].netWeight += Number(model.netWeight) || 0;
      // Both stone weight and gross weight remain null for stone items
    }
    else {
      if (!regularSummary[category]) {
        regularSummary[category] = {
          quantity: 0,
          netWeight: 0,
          grossWeight: 0,
          stoneWeight: 0
        };
      }
      regularSummary[category].quantity += Number(model.quantity) || 0;
      regularSummary[category].netWeight += Number(model.netWeight) || 0;
      regularSummary[category].grossWeight += Number(model.grossWeight) || 0;
      regularSummary[category].stoneWeight += Number(model.stoneWeight) || 0;
    }
  });

  return {
    plain: plainSummary,
    stone: stoneSummary,
    regular: regularSummary
  };
};

// First, increase item column width and adjust others
const columnWidths = {
  category: 0.15,    
  item: 0.14,       // Increased from 0.12 to 0.15
  purity: 0.05,     // Slightly decreased
  size: 0.04,
  color: 0.04,
  quantity: 0.04,
  stoneWeight: 0.08,
  netWeight: 0.08,
  grossWeight: 0.08,
  remarks: 0.10,    // Slightly decreased
  image: 0.20
};

// Total = 1.0 (0.04 + 0.17 + 0.08 + 0.06 + 0.06 + 0.06 + 0.07 + 0.07 + 0.07 + 0.07 + 0.10 + 0.15)

// Decrease row height
const headerHeight = 30;
const rowHeight = 100;  // Decreased from 120 to 100

// Add this helper function for text wrapping in PDF
const wrapTextInPDF = (text: string, maxWidth: number, font: PDFFont, fontSize: number) => {
  if (!text) return [];
  
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = font.widthOfTextAtSize(`${currentLine} ${word}`, fontSize);
    
    if (width < maxWidth) {
      currentLine += ` ${word}`;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
};

// Update drawTableCell function with strict width control
const drawTableCell = (page, text, x, y, width, height, font, fontSize, isHeader = false, columnName = '') => {
  // Draw cell border
  page.drawRectangle({
    x,
    y: y - height,
    width,
    height,
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.5,
    color: isHeader ? rgb(0.95, 0.95, 0.95) : rgb(1, 1, 1, 0)
  });

  if (text) {
    const sidePadding = 6;
    const maxWidth = width - (sidePadding * 2);

    // Special handling for item column
    if (columnName === 'item') {
      const textStr = text.toString();
      const midPoint = Math.floor(textStr.length / 2);
      const firstLine = textStr.slice(0, midPoint);
      const secondLine = textStr.slice(midPoint);

      // Draw first line
      page.drawText(firstLine, {
        x: x + sidePadding,
        y: y - (height/2) + 10,
        size: fontSize,
        font: font,
        maxWidth: maxWidth
      });

      // Draw second line
      page.drawText(secondLine, {
        x: x + sidePadding,
        y: y - (height/2) - 10,
        size: fontSize,
        font: font,
        maxWidth: maxWidth
      });
    } else {
      // Handle other columns normally
      const textWidth = font.widthOfTextAtSize(text.toString(), fontSize);
      let textX;

      if (isHeader || typeof text === 'number' || !isNaN(Number(text))) {
        textX = x + (width - textWidth) / 2;
      } else {
        textX = x + sidePadding;
      }

      page.drawText(text.toString(), {
        x: textX,
        y: y - (height - fontSize) / 2,
        size: fontSize,
        font: isHeader ? boldFont : font
      });
    }
  }
};

// Update the table row drawing to include column name
const drawTableRow = async (model, xPos, y, page, font, fontSize) => {
  const rowData = [
    { text: model.category, column: 'category' },
    { text: model.item, column: 'item' },
    { text: model.purity, column: 'purity' },
    { text: model.size, column: 'size' },
    { text: model.color, column: 'color' },
    { text: model.quantity?.toString(), column: 'quantity' },
    { text: model.stoneWeight?.toString(), column: 'stoneWeight' },
    { text: model.netWeight?.toString(), column: 'netWeight' },
    { text: model.grossWeight?.toString(), column: 'grossWeight' },
    { text: model.remarks, column: 'remarks' }
  ];

  rowData.forEach((data, index) => {
    const columnWidth = columnWidths[data.column] * (page.getWidth() - 2 * margin);
    drawTableCell(
      page,
      data.text,
      xPos,
      y,
      columnWidth,
      rowHeight,
      font,
      fontSize,
      false,
      data.column
    );
    xPos += columnWidth;
  });

  // Handle image column separately
  // ... existing image handling code ...
};

// Update the generatePDF function to include the category summary table
const generatePDF = async (pdfDoc) => {
  try {
    if (!orderDetails) {
      console.log("No order details available");
      return pdfDoc;
    }

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSize = 9;
    const headerFontSize = 9;
    const textFontSize = 8;

    // Create first page
    let page = pdfDoc.addPage([841.89, 595.28]); // A4 Landscape
    let y = 550;
    const lineHeight = 20;

    // Draw company header
    page.drawText('NEEDHA GOLD PRIVATE LIMITED', {
      x: (page.getWidth() - boldFont.widthOfTextAtSize('NEEDHA GOLD PRIVATE LIMITED', 16)) / 2,
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

    // Inside generatePDF function, after order details and before main table
    console.log("Starting PDF generation");
    const categorySummary = calculateCategorySummary(models);

    // Add logging before summary tables
    console.log("Category Summary Data:", categorySummary);
    console.log("Plain items:", Object.keys(categorySummary.plain));
    console.log("Stone items:", Object.keys(categorySummary.stone));
    console.log("Regular items:", Object.keys(categorySummary.regular));

    // Update plain items summary to match stone summary layout
    if (Object.keys(categorySummary.plain).length > 0) {
      // Add underline to the heading
      page.drawText('Plain Items Summary', {
        x: margin,
        y: y + 40,
        size: 12,
        font: boldFont
      });
      
      // Draw underline
      page.drawLine({
        start: { x: margin, y: y + 35 },
        end: { x: margin + 150, y: y + 35 },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
      
      y -= 30;

      // Keep headers aligned with data cells
      const plainHeaders = ['Category', 'Quantity', 'Stone Weight', 'Net Weight', 'Gross Weight'];
      let summaryXPos = margin + 100; // Increased indent to match stone summary
      
      plainHeaders.forEach(header => {
        const width = summaryHeaderWidth * 0.8;
        page.drawRectangle({
          x: summaryXPos,
          y: y,
          width: width,
          height: 25,
          borderColor: rgb(0, 0, 0),
          borderWidth: 0.5,
          color: rgb(0.95, 0.95, 0.95)
        });

        const textWidth = boldFont.widthOfTextAtSize(header, 9);
        page.drawText(header, {
          x: summaryXPos + (width - textWidth) / 2,
          y: y + 8,
          size: 9,
          font: boldFont
        });

        summaryXPos += width;
      });
      y -= 25;

      // Draw plain items data with aligned columns
      Object.entries(categorySummary.plain).forEach(([category, data]) => {
        summaryXPos = margin + 100; // Match header indent
        const rowData = [
          category,
          data.quantity.toString(),
          '',   // Blank stone weight
          '',   // Blank net weight
          ''    // Blank gross weight
        ];

        rowData.forEach(text => {
          const width = summaryHeaderWidth * 0.8;
          page.drawRectangle({
            x: summaryXPos,
            y: y,
            width: width,
            height: 25,
            borderColor: rgb(0, 0, 0),
            borderWidth: 0.5
          });

          const textWidth = font.widthOfTextAtSize(text, 9);
          page.drawText(text, {
            x: summaryXPos + (width - textWidth) / 2,
            y: y + 8,
            size: 9,
            font: font
          });

          summaryXPos += width;
        });
        y -= 25;
      });

      // Add total row with same alignment
      summaryXPos = margin + 100; // Match header indent
      const plainTotalRow = [
        'Total',
        Object.values(categorySummary.plain).reduce((sum, data) => sum + data.quantity, 0).toString(),
        '',   // Blank stone weight
        '',   // Blank net weight
        '',   // Blank gross weight
      ];

      plainTotalRow.forEach((text, index) => {
        const width = summaryHeaderWidth * 0.8;
        page.drawRectangle({
          x: summaryXPos,
          y: y,
          width: width,
          height: 25,
          borderColor: rgb(0, 0, 0),
          borderWidth: 0.5,
          color: index === 0 ? rgb(0.95, 0.95, 0.95) : rgb(1, 1, 1, 0)
        });

        const textWidth = boldFont.widthOfTextAtSize(text, 10);
        page.drawText(text, {
          x: summaryXPos + (width - textWidth) / 2,
          y: y + 8,
          size: 10,
          font: boldFont
        });

        summaryXPos += width;
      });
      y -= 45; // Existing space after plain summary table
      y -= 20; // Add extra gap before stone summary heading
    }

    // Update stone items summary to match plain items cell width
    if (Object.keys(categorySummary.stone).length > 0) {
      // Title and underline remain the same
      page.drawText('Stone Items Summary', {
        x: margin,
        y: y + 40,
        size: 12,
        font: boldFont
      });
      
      page.drawLine({
        start: { x: margin, y: y + 35 },
        end: { x: margin + 150, y: y + 35 },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
      
      y -= 30;

      const stoneHeaders = ['Category', 'Quantity', 'Stone Weight', 'Net Weight', 'Gross Weight'];
      let summaryXPos = margin + 100;
      
      stoneHeaders.forEach(header => {
        const width = summaryHeaderWidth * 0.8; // Match plain items cell width
        page.drawRectangle({
          x: summaryXPos,
          y: y,
          width: width,
          height: 25,
          borderColor: rgb(0, 0, 0),
          borderWidth: 0.5,
          color: rgb(0.95, 0.95, 0.95)
        });

        const textWidth = boldFont.widthOfTextAtSize(header, 9);
        page.drawText(header, {
          x: summaryXPos + (width - textWidth) / 2,
          y: y + 8,
          size: 9,
          font: boldFont
        });

        summaryXPos += width;
      });
      y -= 25;

      // Draw stone items data with matching width
      Object.entries(categorySummary.stone).forEach(([category, data]) => {
        summaryXPos = margin + 100;
        
        // Wrap category text
        const width = summaryHeaderWidth * 0.8;
        const lines = wrapTextInPDF(category, width - 10, font, 9);
        const lineHeight = 12; // Increased from 9 to allow for multiple lines
        const totalHeight = Math.max(25, lines.length * lineHeight); // Minimum height of 25

        // Draw cell background
        page.drawRectangle({
          x: summaryXPos,
          y: y,
          width: width,
          height: totalHeight,
          borderColor: rgb(0, 0, 0),
          borderWidth: 0.5
        });

        // Draw wrapped text
        lines.forEach((line, index) => {
          const textWidth = font.widthOfTextAtSize(line.trim(), 9);
          page.drawText(line.trim(), {
            x: summaryXPos + (width - textWidth) / 2,
            y: y + totalHeight - (index + 1) * lineHeight + 2, // +2 for padding
            size: 9,
            font: font
          });
        });

        // Draw other cells with adjusted height
        const rowData = [
          data.quantity.toString(),
          '',  // Blank stone weight
          '',   // Blank net weight
          '',   // Blank gross weight
        ];

        summaryXPos += width;
        rowData.forEach(text => {
          page.drawRectangle({
            x: summaryXPos,
            y: y,
            width: width,
            height: totalHeight,
            borderColor: rgb(0, 0, 0),
            borderWidth: 0.5
          });

          const textWidth = font.widthOfTextAtSize(text, 9);
          page.drawText(text, {
            x: summaryXPos + (width - textWidth) / 2,
            y: y + (totalHeight - 9) / 2, // Center vertically
            size: 9,
            font: font
          });

          summaryXPos += width;
        });

        y -= totalHeight;
      });

      // Add total row with matching width
      summaryXPos = margin + 100;
      const stoneTotalRow = [
        'Total',
        Object.values(categorySummary.stone).reduce((sum, data) => sum + data.quantity, 0).toString(),
        '',   // Blank stone weight
        '',   // Blank net weight
        '',   // Blank gross weight
      ];

      stoneTotalRow.forEach((text, index) => {
        const width = summaryHeaderWidth * 0.8; // Match plain items cell width
        page.drawRectangle({
          x: summaryXPos,
          y: y,
          width: width,
          height: 25,
          borderColor: rgb(0, 0, 0),
          borderWidth: 0.5,
          color: index === 0 ? rgb(0.95, 0.95, 0.95) : rgb(1, 1, 1, 0)
        });

        const textWidth = boldFont.widthOfTextAtSize(text, 10);
        page.drawText(text, {
          x: summaryXPos + (width - textWidth) / 2,
          y: y + 8,
          size: 10,
          font: boldFont
        });

        summaryXPos += width;
      });
      y -= 45;
    }

    // After summary tables
    console.log("Summary tables generated, starting main table...");
    console.log("Current Y position:", y);

    // Before main table headers
    const tableHeaders = [
      { text: 'S.No', width: 0.04 },
      { text: 'Category', width: columnWidths.category },
      { text: 'Item', width: columnWidths.item },
      { text: 'Purity', width: columnWidths.purity },
      { text: 'Size', width: columnWidths.size },
      { text: 'Color', width: columnWidths.color },
      { text: 'Qty', width: columnWidths.quantity },      // Shortened from "Quantity"
      { text: 'Stone Wt', width: columnWidths.stoneWeight },
      { text: 'Net Wt', width: columnWidths.netWeight },
      { text: 'Gross Wt', width: columnWidths.grossWeight },
      { text: 'Remarks', width: columnWidths.remarks },
      { text: 'Image', width: columnWidths.image }
    ];
    console.log("Drawing main table headers...");

    // After headers, before rows
    console.log("Headers drawn, starting rows...");

    // Draw table headers
    let xPos = margin;
    
    // Draw header cells
    tableHeaders.forEach((header) => {
      const columnWidth = header.width * (page.getWidth() - 2 * margin);
      
      // Draw cell border
      page.drawRectangle({
        x: xPos,
        y: y - headerHeight,
        width: columnWidth,
        height: headerHeight,
        borderColor: rgb(0, 0, 0),
        borderWidth: 0.5,
        color: rgb(0.95, 0.95, 0.95)
      });

      // Handle multi-line headers
      const lines = wrapTextInPDF(header.text, columnWidth - 10, boldFont, fontSize);
      const lineHeight = fontSize + 4;
      const totalTextHeight = lines.length * lineHeight;
      const startY = y - (headerHeight - totalTextHeight) / 2;

      lines.forEach((line, index) => {
        const textWidth = boldFont.widthOfTextAtSize(line.trim(), fontSize);
        const textX = xPos + (columnWidth - textWidth) / 2;
        
        page.drawText(line.trim(), {
          x: textX,
          y: startY - (index * lineHeight),
          size: fontSize,
          font: boldFont
        });
      });

      xPos += columnWidth;
    });

    y -= headerHeight; // Move down after headers

    // Draw table rows with adjusted spacing
    console.log("Starting PDF generation");
    let serialNo = 1;
    for (const model of models) {
      if (y < margin + 120) {
        page = pdfDoc.addPage([841.89, 595.28]);
        y = 550;
      }

      xPos = margin;
      const rowHeight = 150;
      const categoryUpper = (model.category || '').toUpperCase().trim();
      const isPlainCategory = categoryUpper.includes('PLAIN');
      const isStoneCategory = categoryUpper.includes('STONE');

      // Draw serial number cell first
      const serialWidth = (page.getWidth() - 2 * margin) * 0.04;
      page.drawRectangle({
        x: xPos,
        y: y - rowHeight,
        width: serialWidth,
        height: rowHeight,
        borderColor: rgb(0, 0, 0),
        borderWidth: 0.5
      });

      // Draw serial number text
      const serialText = serialNo.toString();
      const serialTextWidth = font.widthOfTextAtSize(serialText, 8);
      page.drawText(serialText, {
        x: xPos + (serialWidth - serialTextWidth) / 2,
        y: y - rowHeight/2,
        size: 8,
        font: font
      });

      xPos += serialWidth;

      // Rest of the row data
      const rowData = [
        model.category || '',
        model.item || '',
        model.purity || '',
        model.size || '',
        model.color || '',
        model.quantity?.toString() || '',
        isPlainCategory ? '0' : (model.stoneWeight?.toString() || ''),
        isPlainCategory ? model.grossWeight?.toString() : (model.netWeight?.toString() || ''),
        isStoneCategory ? '' : (model.grossWeight?.toString() || ''),
        model.remarks || ''
      ];

      // Draw each cell with text wrapping
      rowData.forEach((text, index) => {
        const cellWidth = columnWidths[Object.keys(columnWidths)[index]] * (page.getWidth() - 2 * margin);
        
        page.drawRectangle({
          x: xPos,
          y: y - rowHeight,
          width: cellWidth,
          height: rowHeight,
          borderColor: rgb(0, 0, 0),
          borderWidth: 0.5
        });

        if (text) {
          const maxTextWidth = cellWidth - 10; // Leave some padding
          const lines = wrapTextInPDF(text.toString(), maxTextWidth, font, 8);
          const lineHeight = fontSize + 2; // Add small spacing between lines
          const totalTextHeight = lines.length * lineHeight;
          const startY = y - (rowHeight - totalTextHeight) / 2;

          lines.forEach((line, lineIndex) => {
            const textWidth = font.widthOfTextAtSize(line.trim(), fontSize);
            let textX;

            // Center align numbers, left align text
            if (typeof text === 'number' || !isNaN(Number(text))) {
              textX = xPos + (cellWidth - textWidth) / 2;
            } else {
              textX = xPos + 5; // Left padding for text
            }

            page.drawText(line.trim(), {
              x: textX,
              y: startY - (lineIndex * lineHeight),
              size: fontSize,
              font: font
            });
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
            const imageColumnWidth = columnWidths['image'] * (page.getWidth() - 2 * margin);
            
            page.drawRectangle({
              x: xPos,
              y: y - rowHeight,
              width: imageColumnWidth,
              height: rowHeight,
              borderColor: rgb(0, 0, 0),
              borderWidth: 0.5,
              color: rgb(1, 1, 1, 0) // Transparent fill
            });

            // Calculate image dimensions - increased from 0.45 to 0.75
            const maxWidth = imageColumnWidth * 0.85;  // Increased from 0.45 to 0.75
            const maxHeight = rowHeight * 0.85;    // Increased from 0.45 to 0.75
            
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
            width: columnWidths['image'] * (page.getWidth() - 2 * margin),
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
          width: columnWidths['image'] * (page.getWidth() - 2 * margin),
          height: rowHeight,
          borderColor: rgb(0, 0, 0),
          borderWidth: 0.5
        });
      }

      serialNo++;
      y -= rowHeight;
    }

    // After all rows
    console.log("All rows drawn");

    // Inside generatePDF function, after the main table and before any other summary
    const weightSummary = {};

    // Debug log the initial models
    console.log('Initial models:', models);

    // Calculate totals dynamically
    models.forEach(model => {
      const category = model.category || 'Uncategorized';
      const quantity = Number(model.quantity) || 0;

      if (!weightSummary[category]) {
        weightSummary[category] = {
          quantity: 0,
          stoneWeight: '',    // Empty string for stone weight
          netWeight: '',      // Empty string for net weight
          grossWeight: ''     // Empty string for gross weight
        };
      }

      weightSummary[category].quantity += quantity;
    });

    // Debug log final summary
    console.log('Final summary before drawing:', weightSummary);

    // Move to position for summary table
    y = y - 100;  // Ensure enough space

    // Draw the summary table title
    page.drawText('Summary', {
      x: margin + 20,
      y: y + 20,
      size: 12,
      font: boldFont
    });

    // Draw headers
    const headers = [
      { text: 'Category', x: margin + 20 },
      { text: 'Quantity', x: margin + 150 },
      { text: 'Stone Weight', x: margin + 250 },
      { text: 'Net Weight', x: margin + 350 },
      { text: 'Gross Weight', x: margin + 450 }
    ];

    headers.forEach(header => {
      page.drawText(header.text, {
        x: header.x,
        y,
        size: 10,
        font: boldFont
      });
    });

    // Draw line under headers
    page.drawLine({
      start: { x: margin, y: y },
      end: { x: margin + 550, y: y },
      thickness: 0.5,
      color: rgb(0, 0, 0)
    });

    // Initialize totals
    let totalQuantity = 0;
    let totalStoneWeight = 0;
    let totalNetWeight = 0;
    let totalGrossWeight = 0;

    // Draw data rows
    Object.entries(weightSummary).forEach(([category, data]) => {
      console.log('Drawing category row:', category, data);

      // Draw category
      page.drawText(category, {
        x: margin + 20,
        y,
        size: 10,
        font: font
      });

      // Draw quantity
      page.drawText(data.quantity.toString(), {
        x: margin + 150,
        y,
        size: 10,
        font: font
      });

      // Draw blank spaces for weights
      page.drawText('', {
        x: margin + 250,
        y,
        size: 10,
        font: font
      });

      page.drawText('', {
        x: margin + 350,
        y,
        size: 10,
        font: font
      });

      page.drawText('', {
        x: margin + 450,
        y,
        size: 10,
        font: font
      });

      // Update totals
      totalQuantity += data.quantity;
      totalStoneWeight += data.stoneWeight;
      totalNetWeight += data.netWeight;
      totalGrossWeight += data.grossWeight;

      y -= 20;
    });

    // Draw line before totals
    page.drawLine({
      start: { x: margin, y: y + 10 },
      end: { x: margin + 550, y: y + 10 },
      thickness: 0.5,
      color: rgb(0, 0, 0)
    });

    // Draw totals row
    page.drawText('Total', {
      x: margin + 20,
      y: y,
      size: 10,
      font: boldFont
    });

    page.drawText(totalQuantity.toString(), {
      x: margin + 150,
      y,
      size: 10,
      font: boldFont
    });

    page.drawText(totalStoneWeight.toFixed(3), {
      x: margin + 250,
      y,
      size: 10,
      font: boldFont
    });

    page.drawText(totalNetWeight.toFixed(3), {
      x: margin + 350,
      y,
      size: 10,
      font: boldFont
    });

    page.drawText(totalGrossWeight.toFixed(3), {
      x: margin + 450,
      y,
      size: 10,
      font: boldFont
    });

    // Final line
    page.drawLine({
      start: { x: margin, y: y - 10 },
      end: { x: margin + 550, y: y - 10 },
      thickness: 0.5,
      color: rgb(0, 0, 0)
    });

    return pdfDoc;
  } catch (error) {
    console.error('Error in generatePDF:', error);
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
    let serialNo = 1;
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
              `Model: ${model.item || '-'}`,
              `Size: ${model.size || '-'}`,
              `Purity: ${model.purity || '-'}`,
              `Net Weight: ${model.netWeight || '-'}`,
              `Stone Weight: ${model.stoneWeight || '-'}`,
              `Gross Weight: ${model.grossWeight || '-'}`
            ];

            if (model.remarks) {
              const remarksLines = wrapTextInPDF(model.remarks, width - (margin * 2), font, 10);
              details.push('Remarks:');
              details.push(...remarksLines.map(line => `  ${line}`)); // Add indentation
            }

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
   <div className="container mx-auto p-4" style={{ 
     paddingLeft: '300px',  // Increased padding to account for sidebar width
     paddingTop: '80px', 
     paddingRight: '40px'
   }}>
     <Card className="mb-8" style={{ marginTop: '40px' }}>
       <CardHeader>
         <CardTitle>Update Models</CardTitle>
       </CardHeader>
       <CardContent style={{ paddingTop: '30px' }}>
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
       <CardContent style={{ paddingLeft: '40px' }}>
         <div className="overflow-x-auto">
           <table className="w-full" style={{ paddingLeft: '40px' }}>
             <thead>
               <tr>
                 <th className="p-2 border">Category</th>
                 <th className="p-2 border">Item</th>
                 <th className="p-2 border">Purity</th>
                 <th className="p-2 border">Size</th>
                 <th className="p-2 border">Color</th>
                 <th className="p-2 border">Quantity</th>
                 <th className="p-2 border">Stone Weight</th>
                 <th className="p-2 border">Net Weight</th>
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
                   <td className="p-2 border">{model.stoneWeight}</td>
                   <td className="p-2 border">{model.netWeight}</td>
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

