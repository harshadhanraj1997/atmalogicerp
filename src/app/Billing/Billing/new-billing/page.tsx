'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import COMPANY_LOGO from "@/assets/needhagoldlogo.png"
import { toast } from "sonner";

interface TaggedItem {
  id: string;
  name: string;
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
    totalNetWeight: number;
    totalStoneWeight: number;
    totalStoneCharges: number;
    pdfUrl: string;
    excelUrl: string;
    createdDate: string;
  };
  taggedItems: TaggedItem[];
  summary: {
    totalFineWeight: any;
    totalItems: number;
    totalGrossWeight: number;
    totalNetWeight: number;
    totalStoneWeight: number;
  };
}

interface TaggingOption {
  id: string;
  taggingId: string;
  partyCode: string;
}

// Add new interface and type for categories
type CategoryOption = {
  label: string;
  percentage: number;
};

const CATEGORY_OPTIONS: CategoryOption[] = [
  { label: "Casting Plain 2.0", percentage: 2.0 },
  { label: "Casting Stone 2.5", percentage: 2.5 },
  { label: "Casting Plain 2.5", percentage: 2.5 },
  { label: "Casting Stone 3.0", percentage: 3.0 },
  { label: "Casting Plain 3.0", percentage: 3.0 },
  { label: "Casting Stone 3.5", percentage: 3.5 }
];

// Update interface to match server response
interface PartyDetails {
  id: string;
  partyCode: string;
  partyName: string;
  address: string;
  gstNo: string;
  panNo: string;
}

interface PartyResponse {
  success: boolean;
  data: PartyDetails;
}

// Add carat options outside component
const CARAT_OPTIONS = [
  { value: '22Ct', label: '22Ct' },
  { value: '18Ct', label: '18Ct' },
  { value: '14Ct', label: '14Ct' },
];
export default function InvoiceGenerator() {
  const [taggingOptions, setTaggingOptions] = useState<TaggingOption[]>([]);
  const [taggingId, setTaggingId] = useState('');
  const [taggingDetails, setTaggingDetails] = useState<TaggingDetail | null>(null);
  const [goldRate, setGoldRate] = useState<number>(0);
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deliveryIssueNo, setDeliveryIssueNo] = useState('');
  const [partyDetails, setPartyDetails] = useState<PartyDetails | null>(null);

  // Add state for storing category selections
  const [itemCategories, setItemCategories] = useState<{ [key: string]: CategoryOption }>({});

  // Add base purity state
  const [basePurity, setBasePurity] = useState<number>(91.60);

  // Add PDF type state
  const [pdfType, setPdfType] = useState<'invoice' | 'delivery'>('invoice');

  // Add carat type state
  const [caratType, setCaratType] = useState('22Ct');

  // Add custom percentages state
  const [customPercentages, setCustomPercentages] = useState<{ [key: string]: number }>({});

  // Fetch all tagging IDs on component mount
  useEffect(() => {
    const fetchTaggingOptions = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tagging`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch tagging list');
        }

        // Map the response to only include id, taggingId and partyCode
        const options = data.data.map((tagging: any) => ({
          id: tagging.id,
          taggingId: tagging.taggingId,
          partyCode: tagging.partyCode
        }));

        console.log('Fetched Tagging Options:', options);
        setTaggingOptions(options);
      } catch (err) {
        console.error('Error fetching tagging list:', err);
        setError('Failed to load tagging options');
      }
    };

    fetchTaggingOptions();
  }, []);

  // Fetch tagging details when ID is selected
  useEffect(() => {
    const fetchTaggingDetails = async () => {
      if (!taggingId) return;

      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tagging-details/${taggingId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch tagging details');
        }

        console.log('Fetched Tagging Details:', data);
        setTaggingDetails(data.data);
        setInvoiceNumber(`INV-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${taggingId}`);
      } catch (err) {
        console.error('Error fetching tagging details:', err);
        setError('Error: ' + err.message);
        setTaggingDetails(null);
      } finally {
        setLoading(false);
      }
    };

    fetchTaggingDetails();
  }, [taggingId]);

  // Update fetch function with logging
  const fetchPartyDetails = async (partyCode: string) => {
    try {
      console.log('Fetching party details for:', partyCode);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/partyledger/${partyCode}`);
      
      if (!response.ok) {
        console.error('Response not OK:', response.status, response.statusText);
        throw new Error('Failed to fetch party details');
      }
      
      const data: PartyResponse = await response.json();
      console.log('Server response:', data);
      
      if (data.success) {
        console.log('Setting party details:', data.data);
        setPartyDetails(data.data);
      } else {
        console.error('Server returned success: false');
        throw new Error('Failed to get party details');
      }
    } catch (error) {
      console.error('Error in fetchPartyDetails:', error);
      setError('Failed to fetch party details');
    }
  };

  // Add logging to useEffect
  useEffect(() => {
    if (taggingDetails?.tagging?.partyCode) {
      console.log('Tagging details updated, party code:', taggingDetails.tagging.partyCode);
      fetchPartyDetails(taggingDetails.tagging.partyCode);
    }
  }, [taggingDetails]);

  const calculateBill = () => {
    return { totalAmount: 0 }; // Temporarily return 0
  };

  const calculateTotalFineWeight = () => {
    return taggingDetails?.taggedItems.reduce((total, item) => {
      const category = itemCategories[item.id] || CATEGORY_OPTIONS[0];
      const purity = basePurity + category.percentage;
      return total + (item.netWeight * (purity / 100));
    }, 0) || 0;
  };

  const calculateTotalMakingCharges = () => {
    return taggingDetails?.taggedItems.reduce((total, item) => {
      const category = itemCategories[item.id] || CATEGORY_OPTIONS[0];
      const fineWeight = item.netWeight * ((basePurity + category.percentage) / 100);
      return total + (fineWeight * goldRate);
    }, 0) || 0;
  };

  const calculateGrandTotal = () => {
    return calculateTotalMakingCharges() + (taggingDetails?.tagging?.totalStoneCharges || 0);
  };

  // Generate PDF invoice
  const generatePDF = async () => {
    if (!taggingDetails || goldRate <= 0) {
      setError('Please fill in all required fields');
      return;
    }

    const billCalculation = calculateBill();
    if (!billCalculation) return;

    try {
      console.log('Starting PDF generation...');
      const pdfDoc = await PDFDocument.create();
      let page = pdfDoc.addPage([842, 595]);
      const { width, height } = page.getSize();
      const margin = 40;
      let y = height - 20;

      console.log('Initial page dimensions with minimal top margin:', { width, height, y });

      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Helper function with logging
      const ensureSpace = (requiredSpace: number, sectionName: string) => {
        console.log(`Checking space for ${sectionName}:`, { 
          currentY: y, 
          requiredSpace, 
          remainingSpace: y - requiredSpace 
        });
        
        if (y < requiredSpace) {
          console.log(`Creating new page for ${sectionName}`);
          page = pdfDoc.addPage([842, 595]);
          y = height - margin;
          return true;
        }
        return false;
      };

      // Helper function to draw table headers with pre-embedded fonts
      const drawTableHeaders = () => {
        let xPos = margin;
        headers.forEach((header, i) => {
          page.drawRectangle({
            x: xPos,
            y: y - 25,
            width: columnWidths[i],
            height: 25,
            borderColor: rgb(0, 0, 0),
            borderWidth: 1,
          });

          page.drawText(header, {
            x: xPos + 5,
            y: y - 15,
            size: 8,
            font: fontRegular, // Use pre-embedded font
          });

          xPos += columnWidths[i];
        });
      };

      // Title
      page.drawText('Tax-Invoice', {
        x: width / 2 - 40,
        size: 16,
        y: y,
        font: fontBold,
      });
      y -= 25;
      
      // Left side - Company details (without box)
      page.drawText('NEEDHA GOLD PRIVATE LIMITED', {
        x: margin + 10,
        y: y - 20,
        size: 10,
        font: fontBold,
      });
      
      page.drawText('5/340A SOWDESWARI NAGAR ROAD', {
        x: margin + 10,
        y: y - 40,
        size: 8,
        font: fontRegular,
      });
      
      page.drawText('OKKIYAMTURAIPAKKAM, CHENNAI - 600 097.', {
        x: margin + 10,
        y: y - 55,
        size: 8,
        font: fontRegular,
      });
      
      page.drawText('GSTIN/UIN: 33AAICN6086G1ZA', {
        x: margin + 10,
        y: y - 70,
        size: 8,
        font: fontRegular,
      });
      
      page.drawText('State Name: Tamil Nadu', {
        x: margin + 10,
        y: y - 85,
        size: 8,
        font: fontRegular,
      });
      
      // Right side - Buyer details (using fetched party details)
      page.drawText('Buyer (Bill To)', {
        x: width / 2 + 10,
        y: y - 20,
        size: 10,
        font: fontBold,
      });
      
      // Party Name
      page.drawText(partyDetails?.partyName || '', {
        x: width / 2 + 10,
        y: y - 40,
        size: 10,
        font: fontBold,
      });
      
      // Party Address
      page.drawText(partyDetails?.address || '', {
        x: width / 2 + 10,
        y: y - 55,
        size: 8,
        font: fontRegular,
      });
      
      // GST Number
      page.drawText(`GSTIN/UIN: ${partyDetails?.gstNo || ''}`, {
        x: width / 2 + 10,
        y: y - 70,
        size: 8,
        font: fontRegular,
      });
      
      // State Name (keeping this static as per original)
      page.drawText('State Name: Tamil Nadu', {
        x: width / 2 + 10,
        y: y - 85,
        size: 8,
        font: fontRegular,
      });
      
      y -= 100; // Adjust spacing for next section
      
      // Invoice Details row
      page.drawRectangle({
        x: margin,
        y: y - 20,
        width: width - 2 * margin,
        height: 20,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });
      
      page.drawText('Invoice No.:', {
        x: margin + 10,
        y: y - 15,
        size: 10,
        font: fontRegular,
      });
      
      page.drawText(`SR No.: ${taggingDetails.tagging.taggingId}`, {
        x: width / 2 - 50,
        y: y - 15,
        size: 10,
        font: fontRegular,
      });
      
      page.drawText(`Dated: ${invoiceDate}`, {
        x: width - 150,
        y: y - 15,
        size: 10,
        font: fontRegular,
      });
      
      y -= 30;
      
      // Item List Header
      page.drawRectangle({
        x: margin,
        y: y - 20,
        width: width - 2 * margin,
        height: 20,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });
      
      page.drawText('Item List', {
        x: width / 2 - 25,
        y: y - 15,
        size: 10,
        font: fontBold,
      });
      
      y -= 30;
      
      // Table headers
      const columnWidths = [
        40,  // Sr. No.
        80,  // Item Name (decreased)
        60,  // Item Narr (decreased)
        50,  // HSN Code (decreased)
        30,  // Pcs
        60,  // Gross Wt
        60,  // Stone Wt
        60,  // Other Wt
        60,  // Net Wt
        60,  // Stone Amt
        60,  // Other Amt
        40,  // Purity
        67,  // Rate
        43   // Fine Wt (decreased)
      ];
      
      const headers = [
        'Sr. No.',
        'Item Name',
        'Item Narr.',
        'HSN',  // Shortened text
        'Pcs',
        'Gross Wt',
        'Stone Wt',
        'Other Wt',
        'Net Wt',
        'Stone Amt',
        'Other Amt',
        'Purity',
        'Rate',
        'Fine Wt'
      ];
      
      let xPos = margin;
      
      for (let i = 0; i < headers.length; i++) {
        // Draw header cell
        page.drawRectangle({
          x: xPos,
          y: y - 20,
          width: columnWidths[i],
          height: 20,
          borderColor: rgb(0, 0, 0),
          borderWidth: 1,
        });
        
        // Draw header text
        page.drawText(headers[i], {
          x: xPos + 5,
          y: y - 15,
          size: 8,
          font: fontBold,
        });
        
        xPos += columnWidths[i];
      }
      
      y -= 20;
      
      // Table rows for each item
      let totalPcs = 0;
      let totalGrossWt = 0;
      let totalStoneWt = 0;
      let totalOtherWt = 0;
      let totalNetWt = 0;
      let totalStoneAmt = 0;
      let totalOtherAmt = 0;
      let totalFineWt = 0;
      
      // Before drawing items table
      ensureSpace(taggingDetails.taggedItems.length * 20 + 50, 'Items Table');

      console.log('Starting items table generation...');
      taggingDetails.taggedItems.forEach((item, index) => {
        if (ensureSpace(20, `Item row ${index + 1}`)) {
          console.log(`Drawing table headers on new page at row ${index + 1}`);
          drawTableHeaders();
          y -= 30;
        }
        const pcs = 1; // Assuming 1 piece per item
        const purity = basePurity + (itemCategories[item.id]?.percentage || 0);
        const otherWt = 0; // From the invoice image
        const otherAmt = 0; // From the invoice image
        const fineWt = item.netWeight * (purity / 100);
        
        // Update totals
        totalPcs += pcs;
        totalGrossWt += item.grossWeight;
        totalStoneWt += item.stoneWeight;
        totalOtherWt += otherWt;
        totalNetWt += item.netWeight;
        totalStoneAmt += item.stoneCharge;
        totalOtherAmt += otherAmt;
        totalFineWt += fineWt;
        
        // Set rate text
        const rateText = (itemCategories[item.id] || CATEGORY_OPTIONS[0]).label;
        
        xPos = margin;
        const rowData = [
          (index + 1).toString(),
          item.name,
          '', // Item narr
          '', // HSN code
          '1', // Pcs
          item.grossWeight.toFixed(3),
          item.stoneWeight.toFixed(3),
          '0.000', // Other weight
          item.netWeight.toFixed(3),
          item.stoneCharge.toFixed(2),
          '0.00', // Other amount
          purity.toFixed(2), // Purity
          rateText,
          fineWt.toFixed(3)
        ];
        
        for (let i = 0; i < rowData.length; i++) {
          // Draw cell
          page.drawRectangle({
            x: xPos,
            y: y - 20,
            width: columnWidths[i],
            height: 20,
            borderColor: rgb(0, 0, 0),
            borderWidth: 1,
          });
          
          // Draw text
          page.drawText(rowData[i], {
            x: xPos + 5,
            y: y - 15,
            size: 8,
            font: fontRegular,
          });
          
          xPos += columnWidths[i];
        }
        
        y -= 20;
      });
      
      // Total row
      xPos = margin;
      const totalRowData = [
        '',
        'Total',
        '',
        '',
        totalPcs.toString(),
        totalGrossWt.toFixed(2),
        totalStoneWt.toFixed(2),
        totalOtherWt.toFixed(2),
        totalNetWt.toFixed(2),
        totalStoneAmt.toString(),
        totalOtherAmt.toString(),
        '',
        '',
        totalFineWt.toFixed(4),
      ];
      
      for (let i = 0; i < totalRowData.length; i++) {
        // Draw cell
        page.drawRectangle({
          x: xPos,
          y: y - 20,
          width: columnWidths[i],
          height: 20,
          borderColor: rgb(0, 0, 0),
          borderWidth: 1,
        });
        
        // Draw text
        if (totalRowData[i]) {
          page.drawText(totalRowData[i], {
            x: xPos + 5,
            y: y - 15,
            size: 8,
            font: fontBold,
          });
        }
        
        xPos += columnWidths[i];
      }
      
      y -= 40;
      
      // Draw Rate Details and Additions section
      // Rate Details (Left side)
      page.drawRectangle({
        x: margin,
        y: y - 60,
        width: width / 2 - margin - 10,
        height: 60,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });
      
      page.drawText('Rate Details', {
        x: width / 4 - 30,
        y: y - 15,
        size: 10,
        font: fontBold,
      });
      
      page.drawText(`Gold Rate: ${goldRate.toFixed(2)}`, {
        x: margin + 10,
        y: y - 35,
        size: 10,
        font: fontRegular,
      });
      
      page.drawText(`Amt to Fine: 0.000`, {
        x: margin + 10,
        y: y - 50,
        size: 10,
        font: fontRegular,
      });
      
      // Additions (Right side)
      page.drawRectangle({
        x: width / 2,
        y: y - 60,
        width: width / 2 - margin - 10,
        height: 60,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });
      
      page.drawText('Additions', {
        x: width * 3/4 - 30,
        y: y - 15,
        size: 10,
        font: fontBold,
      });
      
      page.drawText(`Extra Charges: 0`, {
        x: width / 2 + 10,
        y: y - 30,
        size: 10,
        font: fontRegular,
      });
      
      page.drawText(`Stone Amount: ${totalStoneAmt}`, {
        x: width / 2 + 10,
        y: y - 45,
        size: 10,
        font: fontRegular,
      });
      
      page.drawText(`Other Amount: 0`, {
        x: width / 2 + 10,
        y: y - 60,
        size: 10,
        font: fontRegular,
      });
      
      y -= 65;
      
      // Total Amount in Additions section
      page.drawText(`Total Amount: ${totalStoneAmt}`, {
        x: width / 2 + 10,
        y: y - 15,
        size: 10,
        font: fontRegular,
      });
      
      y -= 20;
      
      // GST section
      const taxTableHeaders = ['Description', 'Amount', 'IGST', 'CGST', 'SGST', 'Final Amount'];
      
      // Tax Table
      page.drawRectangle({
        x: margin,
        y: y - 20,
        width: width - 2 * margin,
        height: 20,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });
      
      // Column labels for Tax Table
      xPos = margin;
      for (let i = 0; i < taxTableHeaders.length; i++) {
        const columnWidth = (width - 2 * margin) / taxTableHeaders.length;
        page.drawRectangle({
          x: xPos,
          y: y - 20,
          width: columnWidth,
          height: 20,
          borderColor: rgb(0, 0, 0),
          borderWidth: 1,
        });
        
        page.drawText(taxTableHeaders[i], {
          x: xPos + 5,
          y: y - 15,
          size: 10,
          font: fontBold,
        });
        
        xPos += columnWidth;
      }
      
      y -= 20;
      
      // Tax Table Rows
      const taxRows = [
        { description: 'HUID', amount: 0, igst: 0, cgst: 0, sgst: 0, finalAmount: 0 },
        { description: 'Stone Amount', amount: totalStoneAmt, igst: 0, cgst: 0, sgst: 0, finalAmount: totalStoneAmt },
        { description: 'Other Amount', amount: 0, igst: 0, cgst: 0, sgst: 0, finalAmount: 0 },
        { description: 'Goods Amount', amount: 0, igst: 0, cgst: 0, sgst: 0, finalAmount: 0 }
      ];
      
      taxRows.forEach(row => {
        xPos = margin;
        const columnWidth = (width - 2 * margin) / taxTableHeaders.length;
        const rowData = [
          row.description,
          row.amount.toString(),
          row.igst.toString(),
          row.cgst.toString(),
          row.sgst.toString(),
          row.finalAmount.toString()
        ];
        
        for (let i = 0; i < rowData.length; i++) {
          page.drawRectangle({
            x: xPos,
            y: y - 20,
            width: columnWidth,
            height: 20,
            borderColor: rgb(0, 0, 0),
            borderWidth: 1,
          });
          
          page.drawText(rowData[i], {
            x: xPos + 5,
            y: y - 15,
            size: 8,
            font: fontRegular,
          });
          
          xPos += columnWidth;
        }
        
        y -= 20;
      });
      
      // After GST table section
      console.log('Drawing totals at y position:', y);

      page.drawText(`Total Amount: ${totalStoneAmt}`, {
        x: width - 150,
        y: y - 20,
        size: 8,
        font: fontBold,
      });

      console.log('Drew total amount at:', y - 20);

      page.drawText(`Total Fine: ${totalFineWt.toFixed(3)}`, {
        x: width - 150,
        y: y - 35,
        size: 8,
        font: fontBold,
      });

      console.log('Drew total fine at:', y - 35);

      // Update y position after drawing totals
      y -= 35;  // Move down by the same amount as last total

      console.log('Updated y position after totals:', y);

      // Check if we need a new page for declarations and signature
      if (y < 100) { // If less than 100 units from bottom
        console.log('Creating new page for declarations');
        page = pdfDoc.addPage([842, 595]);
        y = height - margin; // Reset Y position for new page
      }
      
      // Helper function to convert number to words
      const numberToWords = (num: number, isWeight: boolean = false): string => {
        const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
        const teens = ['', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
        const tens = ['', 'Ten', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
        
        if (num === 0) return 'Zero';
        
        const convertLessThanThousand = (n: number): string => {
          if (n === 0) return '';
          
          let result = '';
          
          if (n >= 100) {
            result += units[Math.floor(n / 100)] + ' Hundred ';
            n %= 100;
          }
          
          if (n >= 20) {
            result += tens[Math.floor(n / 10)] + ' ';
            n %= 10;
          } else if (n >= 11 && n <= 19) {
            result += teens[n - 10] + ' ';
            return result;
          }
          
          if (n > 0) {
            result += units[n] + ' ';
          }
          
          return result;
        };

        // Handle the whole number part
        const wholeNumber = Math.floor(num);
        let result = convertLessThanThousand(wholeNumber);

        // Handle the decimal part with proper rounding
        const decimal = Math.round((num - wholeNumber) * 100) / 100; // Round to 2 decimal places
        if (decimal > 0) {
          const decimalPart = Math.round(decimal * 100); // Convert to paise/milligrams
          if (decimalPart > 0) {
            result = result.trim();
            if (isWeight) {
              result += ` and ${convertLessThanThousand(decimalPart).trim()} milligrams`;
            } else {
              result += ` and ${decimalPart}/100`; // Show as fraction for currency
            }
          }
        }

        return result.trim();
      };
      
      // Right before Summary sections
      console.log('Current page count before Summary:', pdfDoc.getPageCount());
      console.log('Current y position before Summary:', y);

      // If we're on page 1 and near the bottom, go to page 2
      if (pdfDoc.getPageCount() === 1 && y < 300) {
        console.log('Moving to page 2 for Summary sections');
        page = pdfDoc.addPage([842, 595]);
        const newPageDims = page.getSize();
        y = newPageDims.height - 100;
      } 
      // If we're already on page 2 or higher, stay on current page
      else if (pdfDoc.getPageCount() > 1) {
        console.log('Already on page 2 or higher, adjusting y position');
        y = height - 100;
      }

      console.log('Drawing Summary sections on page:', pdfDoc.getPageCount());
      console.log('Starting y position for Summary:', y);

      // Declaration section
      page.drawText(`Declaration`, {
        x: margin,
        y,  // Start from the top
        size: 8,
        font: fontBold,
      });

      page.drawText(`We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.`, {
        x: margin,
        y: y - 20,
        size: 8,
        font: fontRegular,
      });

      // Authorized Signatory section
      y -= 50;
      console.log('Drawing Signature box at y:', y);
      page.drawRectangle({
        x: width - 180,
        y: y - 60,
        width: 160,
        height: 60,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });

      page.drawText(`for NEEDHA GOLD PRIVATE LIMITED`, {
        x: width - 170,
        y: y - 30,
        size: 8,
        font: fontRegular,
      });

      page.drawText(`Authorised Signatory`, {
        x: width - 170,
        y: y - 45,
        size: 8,
        font: fontRegular,
      });

      console.log('Completed drawing all sections on new page');
      
      // Computer Generated Invoice text
      page.drawText(`This is a Computer Generated Invoice`, {
        x: width / 2 - 100,
        y: margin,
        size: 8,
        font: fontRegular,
      });
      
      console.log('PDF generation completed successfully');
      
      const pdfBytes = await pdfDoc.save();
      console.log('PDF saved, preparing for download');
      
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Invoice_${taggingDetails.tagging.taggingId}.pdf`;
      link.click();
      
      setLoading(false);
      return pdfBytes;
    } catch (error) {
      console.error('PDF generation failed:', error);
      setError('Error generating PDF: ' + error.message);
      setLoading(false);
      throw error;
    }
  };

  // Update delivery challan generation to use correct property names
  const generateDeliveryChallan = async () => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 portrait
    const { width, height } = page.getSize();
    const margin = 40; // Reduced margin
    let y = height - 20; // Moved up starting position

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Header row with GST, Title, and PAN
    page.drawText('GST No: 33AAICN6086G1ZA', {
      x: margin,
      y: y,
      size: 8,
      font: fontRegular,
    });

    page.drawText('DELIVERY ISSUE VOUCHER', {
      x: width / 2 - 60,
      y: y,
      size: 12,
      font: fontBold,
    });

    page.drawText('Pan No: AAICN6086G', {
      x: width - margin - 100,
      y: y,
      size: 8,
      font: fontRegular,
    });
    y -= 25;

    // Company Logo placeholder (if needed)
    y -= 10;
    try {
        const logoResponse = await fetch(COMPANY_LOGO.src);
        const logoArrayBuffer = await logoResponse.arrayBuffer();
        const logoImage = await pdfDoc.embedPng(logoArrayBuffer);
        const logoDims = logoImage.scale(0.5); // Scale logo to 50% of original size
        page.drawImage(logoImage, {
          x: width / 2 - logoDims.width / 2, // Center horizontally
          y: y - logoDims.height,            // Position below GST
          width: logoDims.width,
          height: logoDims.height,
        });
  
        y -= (logoDims.height + 10); // Move y position down by logo height plus padding
      } catch (error) {
        console.error('Error loading logo:', error);
        y -= 10; // Still move down a bit if logo fails to load
      }

    // Company name
    page.drawText(`NEEDHA GOLD PRIVATE LIMITED`, {
      x: width / 2 - 80,
      y: y,
      size: 11,
      font: fontBold,
    });
    y -= 15;

    // Address with smaller font
    page.drawText(`5/340A, SOWDESWARI NAGAR,OKKIYAMTURAIPAKKAM, CHENNAI - 600097`, {
      x: width / 2 - 100,
      y: y,
      size: 7,
      font: fontRegular,
    });
    y -= 20;

    // Document details in two columns
    const currentDate = new Date().toLocaleDateString('en-GB');
    const leftColumn = margin;
    const rightColumn = width / 2 + 50;

    page.drawText(`Date: ${currentDate}`, {
      x: leftColumn,
      y: y,
      size: 8,
      font: fontRegular,
    });

    // Use the entered delivery issue number instead of generating one
    page.drawText(`Delivery Issue No: ${deliveryIssueNo}`, {
      x: rightColumn,
      y: y,
      size: 8,
      font: fontRegular,
    });

    y -= 15;

    // Update party details section with correct property names
    page.drawText(`Address: ${partyDetails?.address || ''}`, {
      x: leftColumn,
      y: y,
      size: 8,
      font: fontRegular,
    });
    y -= 15;

    page.drawText(`GST: ${partyDetails?.gstNo || ''}`, {
      x: leftColumn,
      y: y,
      size: 8,
      font: fontRegular,
    });
    y -= 15;

    page.drawText(`PAN: ${partyDetails?.panNo || ''}`, {
      x: leftColumn,
      y: y,
      size: 8,
      font: fontRegular,
    });
    y -= 15;

    page.drawText(`Party Name: ${partyDetails?.partyName || ''}`, {
      x: leftColumn,
      y: y,
      size: 8,
      font: fontRegular,
    });
    y -= 25;

    // Table headers for delivery challan
    const headers = ['DESCRIPTION', 'GROSS WEIGHT\nGrams', 'NET WEIGHT\nGRAMS', 'STONE WEIGHT\nGRAMS', 'Approx Value'];
    const columnWidths = [
      width - 450,  // Description
      100,         // Gross weight
      100,         // Net weight
      100,         // Stone weight
      110          // Approx value
    ];

    let xPos = margin;

    // Draw header cells in a single row
    headers.forEach((header, i) => {
      page.drawRectangle({
        x: xPos,
        y: y - 25,
        width: columnWidths[i],
        height: 25,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });

      const lines = header.split('\n');
      lines.forEach((line, lineIndex) => {
        page.drawText(line, {
          x: xPos + 5,
          y: y - 12 - (lineIndex * 10),
          size: 8,
          font: fontBold,
        });
      });

      xPos += columnWidths[i];
    });
    y -= 25;

    // Draw single data row
    xPos = margin;
    const rowData = [
      `${caratType} Gold Ornaments (7113)`,
      taggingDetails?.summary?.totalGrossWeight.toFixed(3) || '0.000',
      taggingDetails?.summary?.totalNetWeight.toFixed(3) || '0.000',
      taggingDetails?.summary?.totalStoneWeight.toFixed(3) || '0.000',
      ''  // Keep approx value empty
    ];

    rowData.forEach((cell, i) => {
      page.drawRectangle({
        x: xPos,
        y: y - 20,
        width: columnWidths[i],
        height: 20,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });

      page.drawText(cell.toString(), {
        x: xPos + 5,
        y: y - 13,
        size: 8,
        font: fontRegular,
      });

      xPos += columnWidths[i];
    });
    y -= 20;

    // Draw total row
    xPos = margin;
    const totals = [
      '',
      taggingDetails?.summary?.totalGrossWeight.toFixed(3) || '0.000',
      taggingDetails?.summary?.totalNetWeight.toFixed(3) || '0.000',
      taggingDetails?.summary?.totalStoneWeight.toFixed(3) || '0.000',
      ''  // Keep approx value empty
    ];

    totals.forEach((total, i) => {
      page.drawRectangle({
        x: xPos,
        y: y - 20,
        width: columnWidths[i],
        height: 20,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });

      if (total) {
        page.drawText(total, {
          x: xPos + 5,
          y: y - 13,
          size: 8,
          font: fontBold,
        });
      }

      xPos += columnWidths[i];
    });

    // After the data table section in generateDeliveryChallan, add proper spacing
    y -= 60; // Add more space between table and signatures

    // Signature boxes with more space
    const signatureWidth = (width - 2 * margin) / 3;
    const signatureHeight = 60;

    ['Seal & Signature of the Receiver', 'Checked By', 'For NEEDHA GOLD PRIVATE LIMITED'].forEach((label, i) => {
      page.drawRectangle({
        x: margin + (i * signatureWidth),
        y: y - signatureHeight,
        width: signatureWidth,
        height: signatureHeight,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });

      page.drawText(label, {
        x: margin + (i * signatureWidth) + 5,
        y: y - 15,
        size: 8,
        font: fontRegular,
      });
    });

    // Generate PDF
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Delivery_${taggingDetails?.tagging?.taggingId}.pdf`;
    link.click();
    return pdfBytes;
  };

  // Modify the generatePDFBlob function to use existing PDF generation logic
  const generatePDFBlob = async (type: 'invoice' | 'delivery') => {
    console.log(`Generating ${type} PDF...`);
    try {
      if (!taggingDetails || goldRate <= 0) {
        throw new Error('Missing required data for PDF generation');
      }

      // Use the appropriate existing generation function based on type
      if (type === 'invoice') {
        await generatePDF(); // Your existing invoice generation function
      } else {
        await generateDeliveryChallan(); // Your existing delivery challan generation function
      }

      // Get the last generated PDF bytes
      const pdfDoc = await PDFDocument.create();
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      
      console.log(`${type} PDF generated, size:`, blob.size);
      return blob;

    } catch (error) {
      console.error(`Error generating ${type} PDF:`, error);
      throw error;
    }
  };

  // Update submitBilling to use the calculated fine weight
  const submitBilling = async () => {
    try {
      setLoading(true);
      
      if (!taggingDetails || goldRate <= 0) {
        toast.error("Please fill in all required fields");
        return;
      }

      // Generate billing ID
      const date = new Date();
      const dateStr = date.toISOString().slice(0,10).replace(/-/g,'');
      const billingId = `BL-${dateStr}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      console.log('Generated Billing ID:', billingId);

      // Generate both PDFs
      console.log('Starting PDF generation...');
      const invoicePdfBytes = await generatePDF();
      const deliveryPdfBytes = await generateDeliveryChallan();

      // Create blobs from the PDF bytes
      const invoicePdfBlob = new Blob([invoicePdfBytes], { type: 'application/pdf' });
      const deliveryPdfBlob = new Blob([deliveryPdfBytes], { type: 'application/pdf' });

      console.log('PDFs generated:', {
        invoiceSize: invoicePdfBlob.size,
        deliverySize: deliveryPdfBlob.size
      });

      // Verify PDFs were generated
      if (invoicePdfBlob.size === 0 || deliveryPdfBlob.size === 0) {
        throw new Error('PDF generation failed - empty file');
      }

      // Calculate total fine weight from the table
      const totalFineWeight = calculateTotalFineWeight();

      // Create form data
      const formData = new FormData();
      formData.append('billingId', billingId);
      formData.append('taggingId', taggingId);
      formData.append('partyName', partyDetails?.partyName || '');
      formData.append('totalFineWeight', totalFineWeight.toString());
      formData.append('goldRate', goldRate.toString());
      formData.append('invoiceNumber', invoiceNumber);
      formData.append('invoiceDate', invoiceDate);
      formData.append('taxInvoicePdf', invoicePdfBlob, `Invoice_${taggingId}.pdf`);
      formData.append('deliveryChallanPdf', deliveryPdfBlob, `Delivery_${taggingId}.pdf`);

      console.log('Submitting billing data:', {
        billingId,
        taggingId,
        partyName: partyDetails?.partyName,
        totalFineWeight,
        goldRate,
        invoiceNumber,
        invoiceDate,
        invoicePdfSize: invoicePdfBlob.size,
        deliveryPdfSize: deliveryPdfBlob.size
      });

      // Submit to API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/billing/submit`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to submit billing: ${errorData}`);
      }

      const result = await response.json();
      console.log('Server response:', result);
      
      toast.success(`Billing ${billingId} created successfully`);
      
    } catch (error) {
      console.error('Error in submitBilling:', error);
      toast.error(error.message || "Failed to submit billing");
    } finally {
      setLoading(false);
    }
  };

  // Add this function to your component
  const handleGeneratePDF = async () => {
    try {
      if (pdfType === 'invoice') {
        await generatePDF();
      } else {
        await generateDeliveryChallan();
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  return (
    <div className="container mx-auto max-w-7xl p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h1 className="text-2xl font-bold text-center text-gray-800">Billing Invoice Generator</h1>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {/* Main Form Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="grid grid-cols-12 gap-6">
            {/* Left Column */}
            <div className="col-span-12 md:col-span-4">
              {/* Tagging ID Dropdown */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tagging ID
                </label>
                <Select
                  value={taggingId}
                  onValueChange={(value) => setTaggingId(value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Tagging ID" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {taggingOptions.map((option) => (
                      <SelectItem key={option.id} value={option.taggingId}>
                        {option.taggingId} - {option.partyCode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {loading && <p className="text-sm text-gray-500 mt-1">Loading details...</p>}
              </div>

              {/* Invoice Details */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Invoice Number
                  </label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full p-2 border rounded"
                    placeholder="Enter invoice number"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Invoice Date
                  </label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full p-2 border rounded"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Rate Inputs */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Gold Rate (per gram)
                    </label>
                    <Input
                      type="number"
                      value={goldRate}
                      onChange={(e) => setGoldRate(parseFloat(e.target.value) || 0)}
                      placeholder="Enter gold rate"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Base Purity (%)
                    </label>
                    <Input
                      type="number"
                      value={basePurity}
                      onChange={(e) => setBasePurity(parseFloat(e.target.value) || 91.60)}
                      placeholder="Enter base purity"
                      step="0.01"
                      min="0"
                      max="100"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Document Type Dropdown */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Document Type
                  </label>
                  <Select
                    value={pdfType}
                    onValueChange={(value: 'invoice' | 'delivery') => setPdfType(value)}
                  >
                    <SelectTrigger className="w-[200px] bg-white">
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="invoice">Tax Invoice</SelectItem>
                      <SelectItem value="delivery">Delivery Challan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Show delivery issue number input only when delivery challan is selected */}
                {pdfType === 'delivery' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Delivery Issue No
                      </label>
                      <Input
                        type="text"
                        value={deliveryIssueNo}
                        onChange={(e) => setDeliveryIssueNo(e.target.value)}
                        placeholder="Enter delivery issue number"
                        className="w-[200px] bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Carat Type
                      </label>
                      <Select
                        value={caratType}
                        onValueChange={(value) => setCaratType(value)}
                      >
                        <SelectTrigger className="w-[200px] bg-white">
                          <SelectValue placeholder="Select carat type" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          {CARAT_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="col-span-12 md:col-span-8">
              {/* Tagging Details */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Tagging Details</h3>
                {taggingDetails ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Party Code</p>
                      <p className="font-medium">
                        {taggingDetails?.tagging?.partyCode || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Net Weight</p>
                      <p className="font-medium">
                        {taggingDetails?.summary?.totalNetWeight?.toFixed(3) || '0.000'} g
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Stone Weight</p>
                      <p className="font-medium">
                        {taggingDetails?.summary?.totalStoneWeight?.toFixed(3) || '0.000'} g
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Stone Charges</p>
                      <p className="font-medium">
                        ₹ {(taggingDetails?.tagging?.totalStoneCharges || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">Select a tagging ID to view details</p>
                )}
              </div>

              {/* Bill Summary */}
              {taggingDetails && goldRate > 0 && (
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-3">Bill Summary</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Net Weight</p>
                      <p className="font-medium">
                        {taggingDetails?.summary?.totalNetWeight?.toFixed(3) || '0.000'} g
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Gold Value</p>
                      <p className="font-medium">
                        ₹ {((taggingDetails?.summary?.totalNetWeight || 0) * goldRate).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Stone Charges</p>
                      <p className="font-medium">
                        ₹ {(taggingDetails?.tagging?.totalStoneCharges || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Generate PDF Button */}
        <div className="flex justify-end gap-4">
          <button
            onClick={handleGeneratePDF}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
            disabled={loading || !taggingDetails || goldRate <= 0}
          >
            {loading ? 'Generating PDF...' : `Generate ${pdfType === 'invoice' ? 'Invoice' : 'Delivery Challan'} PDF`}
          </button>
          
          <button
            onClick={submitBilling}
            className="px-6 py-3 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed"
            disabled={loading || !taggingDetails || goldRate <= 0 || !invoiceNumber || !invoiceDate}
          >
            {loading ? 'Submitting...' : 'Submit Billing'}
          </button>
        </div>

        {/* Tagged Items Table */}
        {taggingDetails && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Tagged Items</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sr. No.</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Gross Wt (g)</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Net Wt (g)</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Stone Wt (g)</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Stone Charges</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Fine Wt (g)</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {taggingDetails.taggedItems.map((item, index) => {
                    const selectedCategory = itemCategories[item.id] || CATEGORY_OPTIONS[0];
                    const purity = basePurity + selectedCategory.percentage;
                    const fineWeight = (item.netWeight || 0) * (purity / 100);
                    const makingCharges = fineWeight * goldRate;

                    return (
                      <tr key={item.id} className="border-b">
                        <td className="px-4 py-2">{index + 1}</td>
                        <td className="px-4 py-2">{item.name}</td>
                        <td className="px-4 py-2">
                          <Select
                            value={selectedCategory.label}
                            onValueChange={(value) => {
                              if (value === 'Custom') {
                                // Prompt for custom percentage
                                const customValue = prompt('Enter custom percentage:');
                                if (customValue !== null) {
                                  const percentage = parseFloat(customValue);
                                  if (!isNaN(percentage)) {
                                    setItemCategories(prev => ({
                                      ...prev,
                                      [item.id]: { 
                                        label: `Custom (${percentage}%)`,
                                        value: 'custom', 
                                        percentage: percentage 
                                      }
                                    }));
                                  }
                                }
                              } else {
                                const category = CATEGORY_OPTIONS.find(c => c.label === value);
                                if (category) {
                                  setItemCategories(prev => ({
                                    ...prev,
                                    [item.id]: category
                                  }));
                                }
                              }
                            }}
                          >
                            <SelectTrigger className="w-[180px] bg-white">
                              <SelectValue>
                                {selectedCategory.value === 'custom' 
                                  ? `Custom (${selectedCategory.percentage}%)`
                                  : selectedCategory.label
                                }
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                              {CATEGORY_OPTIONS.map((option) => (
                                <SelectItem key={option.label} value={option.label}>
                                  {option.label}
                                </SelectItem>
                              ))}
                              <SelectItem value="Custom">Custom</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-2 text-right">{item.grossWeight.toFixed(3)}</td>
                        <td className="px-4 py-2 text-right">{item.netWeight.toFixed(3)}</td>
                        <td className="px-4 py-2 text-right">{item.stoneWeight.toFixed(3)}</td>
                        <td className="px-4 py-2 text-right">₹ {(item.stoneCharge || 0).toFixed(2)}</td>
                        <td className="px-4 py-2 text-right">{fineWeight.toFixed(4)}</td>
                        <td className="px-4 py-2 text-right">₹ {makingCharges.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-medium">
                    <td className="px-4 py-2" colSpan={3}>Total</td>
                    <td className="px-4 py-2 text-right">
                      {taggingDetails.summary.totalGrossWeight.toFixed(3) || '0.000'}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {taggingDetails.summary.totalNetWeight.toFixed(3) || '0.000'}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {taggingDetails.summary.totalStoneWeight.toFixed(3) || '0.000'}
                    </td>
                    <td className="px-4 py-2 text-right">
                      ₹ {(taggingDetails.tagging?.totalStoneCharges || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {calculateTotalFineWeight().toFixed(4)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      ₹ {calculateTotalMakingCharges().toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


