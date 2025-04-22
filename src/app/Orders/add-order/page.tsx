"use client";

import React, { useState, useEffect, useRef } from "react";
import { degrees, PDFDocument, PDFImage, PDFPage, rgb,StandardFonts } from "pdf-lib";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { toast } from "react-hot-toast";
import { Trash2 } from "lucide-react";

import COMPANY_LOGO from "@/assets/needhagoldlogo.png"
import "./add-order.css"; // Ensure this import is present
import router from "next/router";

interface OrderFormModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

interface FormData {
  partyLedger: string;
  subname: string;
  product: string;
  purity: string;
  advanceMetal: string;
  advanceMetalPurity: string;
  priority: string;
  deliveryDate: string;
  remark: string;
  createdBy: string;
  category?: string;
  wtRange?: string;
  size?: string;
  quantity?: string;
  itemRemark?: string;
}

interface OrderInfo {
  partyCode: string;
  partyName: string;
  orderNo: string;
  orderDate: string;
  category: string;
  purity: string;
  advanceMetal: string;
  advanceMetalPurity: string;
  priority: string;
  deliveryDate: string;
  remark: string;
  createdBy: string;
  status: string;
  pdfBlob?: Blob;
}

interface OrderItem {
  category: string;
  weightRange: string;
  size: string;
  quantity: string;
  remark: string;
  designImage?: string;
}

const OrderFormModal = ({ open, setOpen }: OrderFormModalProps) => {
  /* ---------------------- STATE ---------------------- */
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [partyLedgers, setPartyLedgers] = useState<string[]>([]);
  const [isOrderSaved, setIsOrderSaved] = useState(false);
  const [designImage, setDesignImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ---------------------- FORM DATA ---------------------- */
  const [formData, setFormData] = useState<FormData>({
    partyLedger: "",
    subname: "",
    product: "",
    purity: "",
    advanceMetal: "",
    advanceMetalPurity: "",
    priority: "",
    deliveryDate: "",
    remark: "",
    createdBy: "",
    category: "",
    wtRange: "",
    size: "",
    quantity: "",
    itemRemark: "",
  });

  /* ---------------------- API ---------------------- */
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    fetchPartyLedgers();
  }, []);

  const fetchPartyLedgers = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/customer-groups`);
      const result = await response.json();
      if (response.ok && result.success) {
        setPartyLedgers(result.data.map((ledger: any) => ledger.Party_Code__c));
      }
    } catch (error) {
      console.error("Error fetching party ledgers:", error);
    }
  };

  /* ---------------------- HANDLERS ---------------------- */
  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const getNextOrderNumber = async (partyCode: string) => {
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/getLastOrderNumber?partyLedgerValue=${partyCode}`
      );
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to get order number");
      }

      let sequence = "0001";
      if (data.lastOrderNumber) {
        const parts = data.lastOrderNumber.split("/");
        if (parts.length === 2 && /^\d{4}$/.test(parts[1])) {
          sequence = (parseInt(parts[1], 10) + 1).toString().padStart(4, "0");
        }
      }

      return `${partyCode}/${sequence}`;
    } catch (error) {
      console.error("Error generating order number:", error);
      throw error;
    }
  };

  const validateOrderInfo = (info: OrderInfo): boolean => {
    const requiredFields: (keyof OrderInfo)[] = [
      "partyCode",
      "partyName",
      "advanceMetal",
      "advanceMetalPurity",
      "priority",
      "deliveryDate",
      "createdBy",
    ];
    return requiredFields.every((field) => Boolean(info[field]));
  };

  const validateItem = (item: OrderItem): boolean => {
    return Boolean(
      item.category && item.weightRange && item.size && item.quantity
    );
  };

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('=== Save Order Started ===');
    console.log('Form Data:', formData);
    
    try {
      if (!formData.partyLedger) {
        console.log('Error: Missing Party Ledger');
        throw new Error("Please select a valid Party Ledger");
      }

      console.log('Getting next order number for:', formData.partyLedger);
      const orderNo = await getNextOrderNumber(formData.partyLedger);
      console.log('Generated Order Number:', orderNo);

      const newOrderInfo: OrderInfo = {
        partyCode: formData.partyLedger,
        partyName: formData.subname,
        orderNo,
        orderDate: new Date().toISOString().split('T')[0],
        category: formData.product,
        purity: formData.purity,
        advanceMetal: formData.advanceMetal,
        advanceMetalPurity: formData.advanceMetalPurity,
        priority: formData.priority,
        deliveryDate: formData.deliveryDate,
        remark: formData.remark,
        createdBy: formData.createdBy,
        status: "Pending"
      };

      console.log('New Order Info:', newOrderInfo);
      console.log('Validating Order Info...');
      
      if (!validateOrderInfo(newOrderInfo)) {
        console.log('Validation Failed. Required fields:', {
          partyCode: newOrderInfo.partyCode,
          partyName: newOrderInfo.partyName,
          advanceMetal: newOrderInfo.advanceMetal,
          advanceMetalPurity: newOrderInfo.advanceMetalPurity,
          priority: newOrderInfo.priority,
          deliveryDate: newOrderInfo.deliveryDate,
          createdBy: newOrderInfo.createdBy,
        });
        throw new Error("Please fill in all required fields!");
      }

      console.log('Validation Passed');
      setOrderInfo(newOrderInfo);
      setIsOrderSaved(true);
      console.log('=== Save Order Completed Successfully ===');
    } catch (error: any) {
      console.error('Save Order Error:', {
        message: error.message,
        stack: error.stack
      });
      alert(error.message);
    }
  };

  const handleAddItem = () => {
    if (!isOrderSaved) {
      toast.error("Please save the order first");
      return;
    }

    const newItem = {
      category: formData.category,
      weightRange: formData.wtRange,
      size: formData.size,
      quantity: formData.quantity,
      remark: formData.itemRemark,
      designImage: imagePreview
    };

    console.log('Adding new item with image:', newItem.designImage);
    setOrderItems([...orderItems, newItem]);
    
    setFormData({
      ...formData,
      category: "",
      wtRange: "",
      size: "",
      quantity: "",
      itemRemark: ""
    });
    setDesignImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveItem = (index: number) => {
    const updated = [...orderItems];
    updated.splice(index, 1);
    setOrderItems(updated);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          const dataUrl = reader.result as string;
          console.log('Image loaded:', {
            type: file.type,
            size: file.size,
            dataUrl: dataUrl.substring(0, 100) // Log more of the data URL
          });
          setDesignImage(file);
          setImagePreview(dataUrl);
        } catch (error) {
          console.error('Error processing uploaded image:', error);
          toast.error('Failed to process image');
        }
      };
      reader.onerror = () => {
        console.error('Error reading file');
        toast.error('Failed to read image file');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitOrder = async () => {
    console.log('=== Submit Order Started ===');
    try {
      if (!orderInfo || orderItems.length === 0) {
        console.log('Validation Failed:', {
          hasOrderInfo: !!orderInfo,
          itemsCount: orderItems.length
        });
        alert("Please complete the order info and items before submitting.");
        return;
      }

      // Calculate total quantity
      const totalQuantity = orderItems.reduce(
        (sum, item) => sum + parseInt(item.quantity || "0", 10),
        0
      );

      console.log('Preparing form data with:', {
        orderInfo,
        itemsCount: orderItems.length,
        totalQuantity
      });

      const formData = new FormData();
      const orderData = {
        orderInfo,
        items: orderItems,
        totalQuantity  // Add the total quantity to the order data
      };
      
      console.log('Order Data being sent:', orderData);
      formData.append('orderData', JSON.stringify(orderData));

      if (designImage) {
        formData.append('designImage', designImage);
      }

      if (orderInfo.pdfBlob) {
        console.log('Adding PDF to form data');
        formData.append('pdfFile', orderInfo.pdfBlob, `Order_${orderInfo.orderNo}.pdf`);
      }

      console.log('Making API call to:', `${apiBaseUrl}/api/orders`);
      const response = await fetch(`${apiBaseUrl}/api/orders`, {
        method: "POST",
        body: formData,
      });

      console.log('Raw response:', response);
      if (!response.ok) {
        throw new Error("Failed to submit order to server.");
      }

      const data = await response.json();
      console.log('Parsed response:', data);

      if (!data.success) {
        throw new Error(data.error || "Order submission failed.");
      }

      console.log('=== Submit Order Completed Successfully ===');
      alert("Order submitted successfully!");
      router.push('/Orders');
    } catch (error: any) {
      console.error('Submit Order Error:', {
        message: error.message,
        stack: error.stack,
        type: error.type
      });
      alert(error.message);
    }
  };

  const generatePDF = async () => {
    if (!orderInfo || orderItems.length === 0) {
      alert("Please complete the order info and items before generating PDF.");
      return;
    }
  
    try {
      const pdfBlob = await createOrderPDF(orderInfo, orderItems);
      const url = URL.createObjectURL(pdfBlob);
      window.open(url, '_blank');
      
      setOrderInfo(prevInfo => prevInfo ? {
        ...prevInfo,
        pdfBlob
      } : null);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    }
  };
  
  async function createOrderPDF(orderInfo: OrderInfo, orderItems: OrderItem[]) {
    // Calculate totals
    let totalQuantity = 0;
    let totalWeight = 0;
    orderItems.forEach((item) => {
      const quantity = parseInt(item.quantity) || 0;
      totalQuantity += quantity;
  
      const weightRange = item.weightRange || "0";
      let avgWeight = 0;
      if (weightRange.includes("-")) {
        const [min, max] = weightRange.split("-").map((w) => parseFloat(w) || 0);
        avgWeight = (min + max) / 2;
      } else {
        avgWeight = parseFloat(weightRange) || 0;
      }
      totalWeight += avgWeight * quantity;
    });
  
    // Initialize PDF document and fonts
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
    // Constants
    const margin = 35;
    const lineHeight = 20;
    const cellPadding = 5;
  
    // Function to wrap text
    function getWrappedTextAndHeight(text: string, maxWidth: number, fontSize: number) {
      const words = text.split(" ");
      const lines = [];
      let currentLine = words[0];
  
      for (let i = 1; i < words.length; i++) {
        const width = font.widthOfTextAtSize(currentLine + " " + words[i], fontSize);
        if (width < maxWidth - cellPadding * 2) {
          currentLine += " " + words[i];
        } else {
          lines.push(currentLine);
          currentLine = words[i];
        }
      }
      lines.push(currentLine);
      return {
        lines,
        height: Math.max(lineHeight, lines.length * (fontSize + 2) + cellPadding * 2),
      };
    }
  
    // Function to draw wrapped text
    function drawWrappedText(
      text: string,
      x: number,
      y: number,
      maxWidth: number, 
      fontSize: number,
      page: PDFPage,
      isHeader = false,
      isTotal = false
    ) {
      const { lines } = getWrappedTextAndHeight(text, maxWidth, fontSize);
      let currentY = y - cellPadding;
      lines.forEach((line) => {
        page.drawText(line, {
          x: x + cellPadding,
          y: currentY - fontSize,
          size: fontSize,
          font: isHeader || isTotal ? boldFont : font,
        });
        currentY -= fontSize + 2;
      });
    }
  
    // Function to draw table cell
    function drawTableCell(
      x: number, 
      y: number,
      width: number,
      height: number, 
      text: string,
      page: PDFPage,
      isHeader = false,
      isTotal = false
    ) {
      page.drawRectangle({
        x,
        y: y - height,
        width,
        height,
        borderWidth: 1,
        borderColor: rgb(0, 0, 0),
        color: isHeader ? rgb(0.95, 0.95, 0.95) : isTotal ? rgb(0.9, 0.9, 1) : rgb(1, 1, 1),
      });
  
      if (text) {
        drawWrappedText(text, x, y, width, 10, page, isHeader, isTotal);
      }
    }
  
    // Function to draw watermark
    function drawWatermark(page: PDFPage, logo?: PDFImage) {
      const { width, height } = page.getSize();
  
      // Draw text watermark
      const watermarkText = "Needha Gold";
      const watermarkFontSize = 60;
  
      page.drawText(watermarkText, {
        x: width / 2 - 150,
        y: height / 2,
        size: watermarkFontSize,
        font: boldFont,
        opacity: 0.07,
        rotate: degrees(-45),
      });
  
      // Draw logo watermark
      if (logo) {
        const watermarkWidth = width * 0.7;
        const watermarkHeight = (watermarkWidth * logo.height) / logo.width;
        page.drawImage(logo, {
          x: (width - watermarkWidth) / 2,
          y: (height - watermarkHeight) / 2,
          width: watermarkWidth,
          height: watermarkHeight,
          opacity: 0.05,
        });
      }
    }

  
    // Load and embed logo
    const logoImageBytes = await fetch(COMPANY_LOGO.src).then((res) => res.arrayBuffer());
    const logoImage = await pdfDoc.embedPng(logoImageBytes);
  
    // Create first page and add watermark
    let page = pdfDoc.addPage([595.28, 841.89]); // A4 size
    drawWatermark(page, logoImage);
  
    // Initial position and logo dimensions  
    let y = 800;
    const logoWidth = 60;
    const logoHeight = (logoWidth * logoImage.height) / logoImage.width;
  
    // Draw header with logo
    page.drawImage(logoImage, {
      x: margin,
      y: y - logoHeight + 16,
      width: logoWidth,
      height: logoHeight,
    });
  
    page.drawText("Needha Gold Order Invoice", {
      x: margin + logoWidth + 10,
      y,
      size: 16,
      font: boldFont,
    });
  
    y -= Math.max(logoHeight, 25);
  
    // Order details table
    const detailsColumnWidths = [150, 350];
    const orderDetailsTable = [
      ["Order No:", orderInfo.orderNo || "0000"],
      ["Customer:", orderInfo.partyName || "Unknown"],
      ["Party Ledger:", orderInfo.partyCode || "N/A"],  
      ["Product:", orderInfo.category || "N/A"],
      ["Metal Purity:", orderInfo.purity || "N/A"],
      ["Advance Metal:", orderInfo.advanceMetal || "N/A"],
      ["Advance Metal Purity:", orderInfo.advanceMetalPurity || "N/A"],
      ["Priority:", orderInfo.priority || "N/A"],
      ["Delivery Date:", orderInfo.deliveryDate || "N/A"],
      ["Created By:", orderInfo.createdBy || "N/A"],
      ["Date:", new Date().toLocaleDateString()],
    ];
  
    orderDetailsTable.forEach(([label, value]) => {
      const height = Math.max(
        getWrappedTextAndHeight(label, detailsColumnWidths[0], 10).height,
        getWrappedTextAndHeight(value, detailsColumnWidths[1], 10).height
      );
      drawTableCell(margin, y, detailsColumnWidths[0], height, label, page, true);
      drawTableCell(margin + detailsColumnWidths[0], y, detailsColumnWidths[1], height, value, page);
      y -= height;
    });
  
    y -= lineHeight * 2;
  
    // Order Items section  
    page.drawText("Order Items", {
      x: margin,
      y,
      size: 14,
      font: boldFont,
    });
    y -= lineHeight * 1.5;
  
    // Update headers and column widths
    const headers = ["Design", "Category", "Weight Range", "Size", "Quantity", "Total Weight", "Remarks"];
    const columnWidths = [80, 80, 80, 60, 60, 80, 80]; // Total should be around 520
    const totalTableWidth = columnWidths.reduce((sum, width) => sum + width, 0);
      
    // Draw table headers
    let currentX = margin;
    headers.forEach((header, index) => {
      drawTableCell(currentX, y, columnWidths[index], lineHeight, header, page, true);
      currentX += columnWidths[index];
    });
    y -= lineHeight;
  
    // Draw items
    for (const item of orderItems) {
      const quantity = parseInt(item.quantity) || 0;
      const weightRange = item.weightRange || "0";
      let itemTotalWeight = 0;
      
      if (weightRange.includes("-")) {
        const [min, max] = weightRange.split("-").map((w) => parseFloat(w) || 0);
        itemTotalWeight = ((min + max) / 2) * quantity;
      } else {
        itemTotalWeight = (parseFloat(weightRange) || 0) * quantity;
      }

      const rowHeight = 60;
      currentX = margin;
      
      // Draw the design cell border
      drawTableCell(currentX, y, columnWidths[0], rowHeight, "", page);
      
      // Handle design image
      if (item.designImage) {
        try {
          // Get image data
          const imageData = item.designImage;
          console.log('Processing image data:', imageData.substring(0, 100));

          // Extract the base64 data and mime type
          const matches = imageData.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
          
          if (!matches || matches.length !== 3) {
            console.error('Invalid image data format');
            continue;
          }

          const [, mimeType, base64Data] = matches;
          console.log('Image mime type:', mimeType);

          try {
            // Convert base64 to bytes
            const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
            console.log('Converted to bytes:', imageBytes.length);

            // Embed the image based on mime type
            let pdfImage;
            if (mimeType === 'image/png') {
              pdfImage = await pdfDoc.embedPng(imageBytes);
            } else if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
              pdfImage = await pdfDoc.embedJpg(imageBytes);
            } else {
              console.error('Unsupported image type:', mimeType);
              continue;
            }

            if (pdfImage) {
              // Calculate dimensions
              const maxWidth = columnWidths[0] - 10;
              const maxHeight = rowHeight - 10;
              
              const scale = Math.min(
                maxWidth / pdfImage.width,
                maxHeight / pdfImage.height
              );
              
              const width = pdfImage.width * scale;
              const height = pdfImage.height * scale;

              // Center image in cell
              const xOffset = margin + (columnWidths[0] - width) / 2;
              const yOffset = y - rowHeight + (rowHeight - height) / 2;

              // Draw image
              page.drawImage(pdfImage, {
                x: xOffset,
                y: yOffset,
                width,
                height,
              });

              console.log('Image embedded successfully', {
                dimensions: { width, height },
                position: { x: xOffset, y: yOffset }
              });
            }
          } catch (error) {
            console.error('Error embedding image:', error);
          }
        } catch (error) {
          console.error('Error processing image:', error);
        }
      }

      // Draw other cells
      currentX += columnWidths[0];
      
      const values = [
        item.category || "N/A",
        item.weightRange || "N/A",
        item.size || "N/A",
        quantity.toString(),
        itemTotalWeight.toFixed(2),
        item.remark || "N/A"
      ];

      values.forEach((value, index) => {
        drawTableCell(currentX, y, columnWidths[index + 1], rowHeight, value, page);
        currentX += columnWidths[index + 1];
      });

      y -= rowHeight;

      // Page break check
      if (y < 100) {
        page = pdfDoc.addPage([595.28, 841.89]);
        drawWatermark(page, logoImage);
        y = 800;
        
        currentX = margin;
        headers.forEach((header, index) => {
          drawTableCell(currentX, y, columnWidths[index], lineHeight, header, page, true);
          currentX += columnWidths[index];
        });
        y -= lineHeight;
      }
    }
  
    // Draw totals row
    currentX = margin;
    const totalRow = ["", "TOTAL", "", "", totalQuantity.toString(), totalWeight.toFixed(2), ""];
      
    totalRow.forEach((value, index) => {
      drawTableCell(currentX, y, columnWidths[index], lineHeight, value, page, false, true);
      currentX += columnWidths[index];
    });
  
    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: "application/pdf" });
  }
  /* ---------------------- RENDER ---------------------- */
  return (
    <div className="container">
      <h1 className="page-title">Create Order</h1>
      
      {/* Both forms wrapped in a single container */}
      <div className="forms-container">
        {/* First Form */}
        <div className="form-card">
          <h2>Order Information</h2>
          <div className="two-column-form">
            {/* Party Ledger */}
            <div className="field-group">
              <Label htmlFor="partyLedger">Party Ledger</Label>
              <select
                id="partyLedger"
                className="select"
                value={formData.partyLedger}
                onChange={(e) =>
                  handleInputChange("partyLedger", e.target.value)
                }
              >
                <option value="">Select Ledger</option>
                {partyLedgers.map((ledger) => (
                  <option key={ledger} value={ledger}>
                    {ledger}
                  </option>
                ))}
              </select>
            </div>

            {/* Subname */}
            <div className="field-group">
              <Label htmlFor="subname">Party Sub Name</Label>
              <Input
                id="subname"
                value={formData.subname}
                onChange={(e) => handleInputChange("subname", e.target.value)}
                placeholder="e.g., Surname or short name"
              />
            </div>

            {/* Product */}
            <div className="field-group">
              <Label htmlFor="product">Product Name</Label>
              <Input
                id="product"
                value={formData.product}
                onChange={(e) => handleInputChange("product", e.target.value)}
                placeholder="e.g., Necklace"
              />
            </div>

            {/* Purity */}
                <div className="field-group">
    <Label htmlFor="purity">Purity</Label>
    <select
        id="purity"
        value={formData.purity}
        onChange={(value) => handleInputChange("purity", value.target.value)}
    >
        <option value= "">Select Purity</option>
        <option value= "24K">24K</option>
        <option value= "22K">22K</option>
        <option value= "18K">18K</option>
        <option value= "14K">14K</option>
    </select>
    </div>

            {/* Advance Metal */}
            <div className="field-group">
              <Label htmlFor="advanceMetal">Advance Metal</Label>
              <Input
                id="advanceMetal"
                value={formData.advanceMetal}
                onChange={(e) => handleInputChange("advanceMetal", e.target.value)}
                placeholder="e.g., Gold"
              />
            </div>

            {/* Advance Metal Purity */}
            <div className="field-group">
              <Label htmlFor="advanceMetalPurity">Advance Metal Purity</Label>
              <Input
                id="advanceMetalPurity"
                value={formData.advanceMetalPurity}
                onChange={(e) =>
                  handleInputChange("advanceMetalPurity", e.target.value)
                }
                placeholder="e.g., 18K"
              />
            </div>

            {/* Priority */}
            <div className="field-group">
              <Label htmlFor="priority">Priority</Label>
              <Input
                id="priority"
                value={formData.priority}
                onChange={(e) => handleInputChange("priority", e.target.value)}
                placeholder="e.g., High"
              />
            </div>

            {/* Delivery Date */}
            <div className="field-group">
              <Label htmlFor="deliveryDate">Delivery Date</Label>
              <Input
                id="deliveryDate"
                type="date"
                value={formData.deliveryDate}
                onChange={(e) =>
                  handleInputChange("deliveryDate", e.target.value)
                }
              />
            </div>

            {/* Remark */}
            <div className="field-group">
              <Label htmlFor="remark">Remark</Label>
              <textarea
                id="remark"
                rows={2}
                onChange={(e) => handleInputChange("remark", e.target.value)}
                value={formData.remark}
                placeholder="Additional remarks"
              />
            </div>

            {/* Created By */}
            <div className="field-group">
              <Label htmlFor="createdBy">Created By</Label>
              <Input
                id="createdBy"
                value={formData.createdBy}
                onChange={(e) => handleInputChange("createdBy", e.target.value)}
                placeholder="Your Name"
              />
            </div>
          </div>
          <button className="save-button" onClick={handleSaveOrder}>Save Order</button>
        </div>

        {/* Second Form */}
        <div className="form-card">
          <h2>Add Item</h2>
          <div className="one-column-form">
            <div className="field-group">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) =>
                  handleInputChange("category", e.target.value)
                }
                placeholder="e.g., Pendant"
                disabled={!isOrderSaved}
              />
            </div>

            <div className="field-group">
              <Label htmlFor="wtRange">Weight Range</Label>
              <Input
                id="wtRange"
                value={formData.wtRange}
                onChange={(e) => handleInputChange("wtRange", e.target.value)}
                placeholder="e.g., 10-15g"
                disabled={!isOrderSaved}
              />
            </div>

            <div className="field-group">
              <Label htmlFor="size">Size</Label>
              <Input
                id="size"
                value={formData.size}
                onChange={(e) => handleInputChange("size", e.target.value)}
                placeholder="Size"
                disabled={!isOrderSaved}
              />
            </div>

            <div className="field-group">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => handleInputChange("quantity", e.target.value)}
                placeholder="Quantity"
                disabled={!isOrderSaved}
              />
            </div>

            <div className="field-group">
              <Label htmlFor="itemRemark">Item Remark</Label>
              <Input
                id="itemRemark"
                value={formData.itemRemark}
                onChange={(e) =>
                  handleInputChange("itemRemark", e.target.value)
                }
                placeholder="Any special instructions"
                disabled={!isOrderSaved}
              />
            </div>

            {/* Update Design Image Upload UI with centered red icon */}
            <div className="field-group">
              <Label htmlFor="designImage">Design Image</Label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="designImage"
                  />
                  {!imagePreview ? (
                    <Button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full"
                    >
                      Upload Design Image
                    </Button>
                  ) : (
                    <div className="flex items-center gap-4 p-3 border rounded-md bg-white">
                      <div className="relative w-20 h-20 flex-shrink-0">
                        <Image
                          src={imagePreview}
                          alt="Design preview"
                          fill
                          className="object-contain rounded-md"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setDesignImage(null);
                          setImagePreview(null);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <button 
            className="add-item-button" 
            onClick={handleAddItem}
            disabled={!isOrderSaved}
          >
            Add Item
          </button>
        </div>
      </div>

      {/* Tables Container */}
      <div className="table-container">
        {/* Order Info Table */}
        {orderInfo && (
          <Card className="card">
            <CardHeader>
              <CardTitle>Order Information</CardTitle>
            </CardHeader>
            <CardContent>
              <table>
                <thead>
                  <tr>
                    <th rowSpan={2}>Party Code</th>
                    <th rowSpan={2}>Party Name</th>
                    <th rowSpan={2}>Order No</th>
                    <th rowSpan={2}>Order Date</th>
                    <th rowSpan={2}>Product</th>
                    <th rowSpan={2}>Purity</th>
                    <th colSpan={2}>Advance Metal Details</th>
                    <th colSpan={3}>Order Details</th>
                  </tr>
                  <tr>
                    <th>Metal</th>
                    <th>Metal Purity</th>
                    <th>Priority</th>
                    <th>Delivery Date</th>
                    <th>Created By</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{orderInfo.partyCode}</td>
                    <td>{orderInfo.partyName}</td>
                    <td>{orderInfo.orderNo}</td>
                    <td>{orderInfo.orderDate}</td>
                    <td>{orderInfo.category}</td>
                    <td>{orderInfo.purity}</td>
                    <td>{orderInfo.advanceMetal}</td>
                    <td>{orderInfo.advanceMetalPurity}</td>
                    <td>{orderInfo.priority}</td>
                    <td>{orderInfo.deliveryDate}</td>
                    <td>{orderInfo.createdBy}</td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* Order Items Table */}
        {orderItems.length > 0 && (
          <Card className="card">
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2">Design</th>
                      <th className="px-4 py-2">Category</th>
                      <th className="px-4 py-2">Weight Range</th>
                      <th className="px-4 py-2">Size</th>
                      <th className="px-4 py-2">Quantity</th>
                      <th className="px-4 py-2">Remarks</th>
                      <th className="px-4 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderItems.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2">
                          {item.designImage && (
                            <div className="relative w-20 h-20">
                              <Image
                                src={item.designImage}
                                alt="Design"
                                fill
                                className="object-contain rounded-md"
                              />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2">{item.category}</td>
                        <td className="px-4 py-2">{item.weightRange}</td>
                        <td className="px-4 py-2">{item.size}</td>
                        <td className="px-4 py-2">{item.quantity}</td>
                        <td className="px-4 py-2">{item.remark}</td>
                        <td className="px-4 py-2">
                          <button
                            type="button"
                            className="remove-item-button"
                            onClick={() => handleRemoveItem(index)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td
                        colSpan={3}
                        style={{ fontWeight: "bold", textAlign: "right" }}
                      >
                        Total:
                      </td>
                      <td style={{ fontWeight: "bold" }}>
                        {orderItems.reduce(
                          (sum, item) => sum + parseInt(item.quantity || "0", 10),
                          0
                        )}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Buttons */}
      <div className="button-group">
        <button
          type="button"
          onClick={handleSubmitOrder}
          disabled={!isOrderSaved || orderItems.length === 0}
        >
          Submit Order
        </button>
        <button
          type="button"
          onClick={generatePDF}
          disabled={!isOrderSaved || orderItems.length === 0}
        >
          Generate PDF
        </button>
      </div>
    </div>
  );
};

export default OrderFormModal;

