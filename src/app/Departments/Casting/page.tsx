"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert} from "@/components/ui/alert";
import { AlertDescription } from "@/components/ui/alertdescription";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import "../../Orders/add-order/add-order.css";
import CastingTable from "@/components/casting/castingtable";
import { toast } from "react-hot-toast";
import { z } from "zod";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;
interface InventoryItem {
  id: string;
  itemName: string;
  issueWeight: number;
  purity: string;
  availableWeight: number;
}

interface Order {
  id: string;
  orderNumber: string;
  partyName: string;
}

// Update the interface to match exact API response fields
interface InventoryApiItem {
  name: string;
  availableWeight: number;  // Make sure this matches the API field name
  purity: string;
}

const CastingForm = () => {
  // Main form state
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [waxTreeWeight, setWaxTreeWeight] = useState<number>(0);
  const [purity, setPurity] = useState<string>('');
  const [calculatedWeight, setCalculatedWeight] = useState<number>(0);
  
  // Inventory items state
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  
  // Form status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add state for showing/hiding dropdown
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Add state for inventory API items
  const [inventoryApiItems, setInventoryApiItems] = useState<InventoryApiItem[]>([]);

  // Add state for selected item
  interface SelectedItem {
    name: string;
    purity: string;
    availableWeight: number;
    issueWeight: number;
    metalToBeIssued: number;
  }

  const [selectedItem, setSelectedItem] = useState<SelectedItem>({
    name: '',
    purity: '',
    availableWeight: 0,
    issueWeight: 0,
    metalToBeIssued: 0
  });

  // Add state for casting number
  const [castingNumber, setCastingNumber] = useState<string>('');

  // Initialize with current date in DD/MM/YYYY format
  const [issuedDate, setIssuedDate] = useState<string>(() => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${day}/${month}/${year}`;
  });

  // Add state for issued time
  const [issuedTime, setIssuedTime] = useState<string>(() => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  });

  // Add state for purity percentages
  const [purityPercentages, setPurityPercentages] = useState({
    pureGold: 0,
    alloy: 0
  });

  // Default percentages with corrected 22K gold percentage
  const defaultPercentages = {
    '22K': { pureGold: 91.7, alloy: 8.3 },
    '18K': { pureGold: 75.0, alloy: 25.0 },
    '14K': { pureGold: 58.5, alloy: 41.5 },
    '92.5%': { pureGold: 92.5, alloy: 7.5 }
  };

  // Update percentages when purity changes
  useEffect(() => {
    if (purity && defaultPercentages[purity as keyof typeof defaultPercentages]) {
      setPurityPercentages(defaultPercentages[purity as keyof typeof defaultPercentages]);
    }
  }, [purity]);

  // Calculate required metals (works for both gold and silver)
  const calculateRequiredMetals = () => {
    const totalWeight = calculatedWeight;
    const purityDecimal = purityPercentages.pureGold / 100;
    
    return {
      pureGold: totalWeight * purityDecimal,
      alloy: totalWeight * (1 - purityDecimal)
    };
  };

  // Fetch orders on component mount
  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/orders`);
      const data = await response.json();
      console.log('Fetched Orders:', data);
      if (data.success) {
        console.log('Orders for selection:', data.data);
        setOrders(data.data);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  // Also log when orders state changes
  useEffect(() => {
    console.log('Current orders in state:', orders);
  }, [orders]);

  // Log selected orders changes
  useEffect(() => {
    console.log('Selected orders:', selectedOrders);
  }, [selectedOrders]);

  // Fetch inventory items on component mount
  useEffect(() => {
    fetchInventoryItems();
  }, []);

  const fetchInventoryItems = async () => {
    try {
      const response = await fetch(`${apiUrl}/get-inventory`);
      const data = await response.json();
      console.log('Raw API Response:', data); // Log the raw response 
      
      if (data.success) {
        // Log each item's structure
        data.data.forEach((item: any) => {
          console.log('Individual Item Structure:', {
            name: item.name,
            availableWeight: item.availableWeight,
            purity: item.purity
          });
        });
        
        setInventoryApiItems(data.data);
      } else {
        console.log('Error Message:', data.message);
        setError(data.message);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setError('Failed to fetch inventory items');
    }
  };

  // Add log when inventory items state updates
  useEffect(() => {
    console.log('Current inventory API items in state:', inventoryApiItems);
  }, [inventoryApiItems]);

  // Calculate metal to be issued based on item name and purity
  const calculateMetalToBeIssued = (itemName: string, itemPurity: string) => {
    // Use remaining pure metal instead of total required pure metal
    const remainingPureGold = remainingPureMetalRequired;
    
    // Convert item purity percentage to decimal (e.g., "91.7%" -> 0.917)
    const purityDecimal = parseFloat(itemPurity.replace(/[^0-9.]/g, '')) / 100;
    
    // Check if item contains "gold" or "silver" (case insensitive)
    if (itemName.toLowerCase().includes('gold'.toLowerCase()) && purity !== '92.5%' && remainingPureGold > 0) {
      // Calculate metal to be issued based on remaining requirement and item's actual purity
      if (purityDecimal > 0) {
        return remainingPureGold / purityDecimal;
      }
    } 
    // Handle silver calculations
    else if (itemName.toLowerCase().includes('silver'.toLowerCase()) && purity === '92.5%' && remainingPureGold > 0) {
      // Use the actual purity of the silver item
      if (purityDecimal > 0) {
        return remainingPureGold / purityDecimal;
      }
    }
    return 0;
  };

  // Update handleItemSelection to recalculate when an item is selected
  const handleItemSelection = (selectedItemName: string) => {
    console.log('Selected Item Name:', selectedItemName);
    
    const foundItem = inventoryApiItems.find(item => item.name === selectedItemName);
    console.log('Found Item:', foundItem);
    
    if (foundItem) {
      const metalToBeIssued = calculateMetalToBeIssued(foundItem.name, foundItem.purity);
      setSelectedItem({
        name: foundItem.name,
        purity: foundItem.purity,
        availableWeight: foundItem.availableWeight,
        issueWeight: 0,
        metalToBeIssued: metalToBeIssued
      });
    }
  };

  // Add state to track remaining pure metal requirement
  const [remainingPureMetalRequired, setRemainingPureMetalRequired] = useState<number>(0);
  const [remainingAlloyRequired, setRemainingAlloyRequired] = useState<number>(0);

  // Update both pure metal and alloy requirements when calculation changes
  useEffect(() => {
    const { pureGold, alloy } = calculateRequiredMetals();
    setRemainingPureMetalRequired(pureGold);
    setRemainingAlloyRequired(alloy);
  }, [calculatedWeight, purityPercentages.pureGold, purityPercentages.alloy]);

  const handleAddInventoryItem = () => {
    if (!selectedItem.name) return;

    // Convert purity to decimal (e.g., "91.7%" -> 0.917)
    const purityDecimal = parseFloat(selectedItem.purity.replace(/[^0-9.]/g, '')) / 100;
    
    // Calculate pure metal content in the issued weight
    const pureMetalContent = selectedItem.issueWeight * purityDecimal;
    
    // Calculate alloy content in the issued weight
    const alloyContent = selectedItem.issueWeight * (1 - purityDecimal);
    
    // Update remaining requirements
    const newRemainingPureMetal = remainingPureMetalRequired - pureMetalContent;
    const newRemainingAlloy = remainingAlloyRequired - alloyContent;
    
    setRemainingPureMetalRequired(newRemainingPureMetal);
    setRemainingAlloyRequired(newRemainingAlloy);

    // Update available weight for the selected item
    const updatedInventoryApiItems = inventoryApiItems.map(item => {
      if (item.name === selectedItem.name) {
        return {
          ...item,
          availableWeight: item.availableWeight - selectedItem.issueWeight
        };
      }
      return item;
    });
    setInventoryApiItems(updatedInventoryApiItems);

    const newItem: InventoryItem = {
      id: Date.now().toString(),
      itemName: selectedItem.name,
      purity: selectedItem.purity,
      availableWeight: selectedItem.availableWeight - selectedItem.issueWeight,
      issueWeight: selectedItem.issueWeight
    };

    setInventoryItems([...inventoryItems, newItem]);
    
    // Reset selection
    setSelectedItem({
      name: '',
      purity: '',
      availableWeight: 0,
      issueWeight: 0,
      metalToBeIssued: 0
    });
  };

  // Log inventory items state changes
  useEffect(() => {
    console.log('Updated Inventory Items:', inventoryItems);
  }, [inventoryItems]);

  // Add calculation function
  const calculateWeight = (purity: string, weight: number) => {
    switch(purity) {
      case '22K':
        return weight * 18.5;
      case '18K':
        return weight * 16;
      case '14K':
        return weight * 16;
      case '92.5%':
        return weight * 12; // Same calculation for silver
      default:
        return 0;
    }
  };

  // Update calculation when purity or wax tree weight changes
  useEffect(() => {
    const result = calculateWeight(purity, waxTreeWeight);
    setCalculatedWeight(result);
  }, [purity, waxTreeWeight]);

  // Add state for manual casting number
  const [castingLastNumber, setCastingLastNumber] = useState<string>('');

  // Add function to generate casting number
  const generateCastingNumber = () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    
    // Use the manually entered last number, padded to 2 digits
    const number = castingLastNumber.padStart(2, '0');
    
    return `${day}/${month}/${year}/${number}`;
  };

  // Update the updateInventoryWeights function to prevent negative values
  const updateInventoryWeights = async (issuedItems: any[]) => {
    try {
      const updatePromises = issuedItems.map(item => {
        // Calculate new weight, if negative set to 0
        const newWeight = Math.max(0, item.availableWeight - item.issueWeight);
        
        const updatedWeight = {
          name: item.itemName,
          availableWeight: newWeight
        };

        return fetch(`${apiUrl}/api/update-inventoryweights`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedWeight)
        });
      });

      const responses = await Promise.all(updatePromises);
      const results = await Promise.all(responses.map(res => res.json()));
      
      // Check if any updates failed
      const failedUpdates = results.filter(result => !result.success);
      if (failedUpdates.length > 0) {
        throw new Error('Failed to update some inventory items');
      }

      return true;
    } catch (error) {
      console.error('Error updating inventory weights:', error);
      throw error;
    }
  };

  const validateInventory = () => {
    for (const item of inventoryItems) {
      const inventoryItem = inventoryApiItems.find(
        apiItem => apiItem.name === item.itemName
      );
      
      if (!inventoryItem) {
        throw new Error(`Item ${item.itemName} not found in inventory`);
      }

      if (inventoryItem.availableWeight < item.issueWeight) {
        throw new Error(
          `Insufficient inventory for ${item.itemName} (${item.purity}). ` +
          `Available: ${inventoryItem.availableWeight}g, Required: ${item.issueWeight}g`
        );
      }
    }
    return true;
  };

  // Custom rounding function that rounds a value to the nearest whole number
  // and ensures values like 179.5 or higher round up to 180
  const customRound = (value: number): number => {
    // Get the integer part
    const integerPart = Math.floor(value);
    // Get the decimal part
    const decimalPart = value - integerPart;
    
    // If decimal part is 0.5 or higher, round up
    if (decimalPart >= 0.5) {
      return integerPart + 1;
    }
    
    return integerPart;
  };

  // Initialize all state variables at the top
  const [stoneWeight, setStoneWeight] = useState<number>(0);
  const [totalWeight, setTotalWeight] = useState<number>(0);
  const [issuedWeight, setIssuedWeight] = useState<number>(0);

  // Update the total weight calculation with null checks
  useEffect(() => {
    if (typeof issuedWeight === 'number') {
      const totalWithStones = (issuedWeight || 0) + (stoneWeight || 0);
      setTotalWeight(totalWithStones);
    }
  }, [issuedWeight, stoneWeight]);

  // Update handleSubmit function
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    const totalWeightWithStones = (calculatedWeight + (stoneWeight || 0));

    const formData = {
      // ... existing form fields ...
      stoneWeight: stoneWeight,
      issuedWeight: totalWeightWithStones, // Send the total weight including stones
      Required_Pure_Metal_Casting__c: calculatedWeight,
      Required_Alloy_for_Casting__c: remainingAlloyRequired,
      // ... other fields ...
    };

    try {
      console.log("Submit button clicked");
      setLoading(true);

      // Basic validation for required fields
      if (!selectedOrders.length || !purity || !waxTreeWeight || inventoryItems.length === 0 || !castingLastNumber) {
        toast.error('Please fill all required fields including casting number');
        return;
      }

      // Generate the casting number using the current date and manual number
      const newCastingNumber = generateCastingNumber();
      setCastingNumber(newCastingNumber);

      // Combine date and time
      const combinedDateTime = `${issuedDate}T${issuedTime}`;

      // Calculate total issued weight
      const totalIssuedFromInventory = inventoryItems.reduce((sum, item) => sum + Number(item.issueWeight), 0);
      const totalIssued = totalIssuedFromInventory + (stoneWeight || 0);

      // Calculate required metals
      const requiredMetals = calculateRequiredMetals();

      // Round the received weight using our custom function
      const roundedReceivedWeight = customRound(calculatedWeight);

      // Prepare casting data matching the backend API structure
      const castingData = {
        castingNumber: newCastingNumber,
        date: combinedDateTime, // Now includes both date and time
        orders: selectedOrders,
        waxTreeWeight: Number(waxTreeWeight),
        purity: purity,
        calculatedWeight: Number(roundedReceivedWeight),
        purityPercentages: {
          pureGold: Number(purityPercentages.pureGold),
          alloy: Number(purityPercentages.alloy)
        },
        requiredMetals: {
          pureGold: Number(requiredMetals.pureGold),
          alloy: Number(requiredMetals.alloy)
        },
        issuedItems: inventoryItems.map(item => ({
          itemName: item.itemName,
          purity: item.purity,
          issueWeight: Number(item.issueWeight),
          issuedGold: Number(item.issueWeight) * (parseFloat(item.purity.replace(/[^0-9.]/g, '')) / 100),
          issuedAlloy: Number(item.issueWeight) * (1 - parseFloat(item.purity.replace(/[^0-9.]/g, '')) / 100)
        })),
        totalIssued: totalIssued, // Now includes both inventory items and stone weight
        stoneWeight: stoneWeight,
        issuedWeight: totalWeightWithStones, // Also includes stone weight
      };

      console.log("Making casting API call with data:", castingData);
      
      // Create casting record
      const castingResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/casting`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(castingData)
      });

      const castingResult = await castingResponse.json();

      if (!castingResult.success) {
        throw new Error(castingResult.message || 'Failed to create casting record');
      }

      // Now update inventory weights
      const inventoryUpdateResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/update-inventoryweights`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          issuedItems: inventoryItems.map(item => ({
            itemName: item.itemName,
            purity: item.purity,
            issueWeight: Number(item.issueWeight)
          }))
        })
      });

      const inventoryResult = await inventoryUpdateResponse.json();
      
      if (!inventoryResult.success) {
        throw new Error(inventoryResult.message || 'Failed to update inventory');
      }

      toast.success('Casting created successfully');
      
      // Reset form
      const today = new Date();
      const day = String(today.getDate()).padStart(2, '0');
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const year = today.getFullYear();
      
      setSelectedOrders([]);
      setPurity('');
      setWaxTreeWeight(0);
      setInventoryItems([]);
      setSelectedItem({
        id: '',
        itemName: '',
        purity: '',
        availableWeight: 0,
        metalToBeIssued: 0,
        issueWeight: 0
      });
      setPurityPercentages({
        pureGold: defaultPercentages[purity as keyof typeof defaultPercentages]?.pureGold || 0,
        alloy: defaultPercentages[purity as keyof typeof defaultPercentages]?.alloy || 0
      });
      setIsDropdownOpen(false);
      setCalculatedWeight(0);
      setIssuedDate(`${day}/${month}/${year}`);
      setIssuedTime(today.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));
      setCastingLastNumber('');
      setStoneWeight(0);

    } catch (error) {
      console.error('Error in handleSubmit:', error);
      toast.error(error.message || 'Failed to process casting');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveInventoryItem = (id: string) => {
    setInventoryItems(inventoryItems.filter(item => item.id !== id));
  };

  // Set current date on component mount
  useEffect(() => {
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-GB'); // Format: dd/mm/yyyy
    setIssuedDate(formattedDate);
  }, []);

  const [searchOrder, setSearchOrder] = useState('');
  const [filteredOrders, setFilteredOrders] = useState(orders);

  useEffect(() => {
    const filtered = orders.filter(order => 
      order.id.toLowerCase().includes(searchOrder.toLowerCase()) ||
      order.partyName.toLowerCase().includes(searchOrder.toLowerCase())
    );
    setFilteredOrders(filtered);
  }, [searchOrder, orders]);

  // Handle pure metal percentage change
  const handlePureGoldPercentageChange = (value: string) => {
    const newPureGold = parseFloat(value) || 0;
    if (newPureGold >= 0 && newPureGold <= 100) {
      setPurityPercentages({
        pureGold: newPureGold,
        alloy: 100 - newPureGold
      });
    }
  };

  return (
    <div className="h-screen overflow-hidden">
      <div className="h-full overflow-y-auto p-4 pt-40 mt-[-30px] bg-gray-50">
        <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-sm p-6 mr-[300px] md:mr-[300px]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold">Update Casting</h2>
            <div className="flex items-center gap-4">
              {/* Date and Time inputs */}
              <div className="flex items-center gap-4">
                <div>
                  <Label className="text-sm">Issue Date:</Label>
                  <Input
                    type="date"
                    value={issuedDate}
                    onChange={(e) => setIssuedDate(e.target.value)}
                    className="w-32 h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-sm">Issue Time:</Label>
                  <Input
                    type="time"
                    value={issuedTime}
                    onChange={(e) => setIssuedTime(e.target.value)}
                    className="w-32 h-8 text-sm"
                  />
                </div>
              </div>
              
              {/* Existing casting number input */}
              <div className="flex items-center gap-2">
                <Label className="text-sm">Casting Number:</Label>
                <Input
                  type="number"
                  value={castingLastNumber}
                  onChange={(e) => setCastingLastNumber(e.target.value)}
                  className="w-20 h-8 text-sm"
                  placeholder="##"
                  min="1"
                  max="99"
                />
              </div>
              <div className="text-sm font-medium">
                Preview: <span className="text-blue-600">
                  {castingLastNumber ? generateCastingNumber() : 'DD/MM/YYYY/##'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm mb-1.5">Select Orders</Label>
                <div className="relative">
                  <Button 
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full h-10 text-sm justify-between bg-white border-gray-200"
                    variant="outline"
                  >
                    {selectedOrders.length ? `${selectedOrders.length} orders selected` : 'Select Orders'}
                    <span className="ml-2">▼</span>
                  </Button>
                  
                  {isDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-[400px] overflow-hidden">
                      <div className="p-2 border-b sticky top-0 bg-white z-20">
                        <Input
                          type="text"
                          placeholder="Search orders..."
                          value={searchOrder}
                          onChange={(e) => setSearchOrder(e.target.value)}
                          className="h-8 text-sm"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="overflow-y-auto max-h-[300px] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                        {filteredOrders.length > 0 ? (
                          filteredOrders.map(order => (
                            <div 
                              key={order.id}
                              className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm border-b border-gray-100"
                              onClick={() => {
                                const isSelected = selectedOrders.includes(order.id);
                                setSelectedOrders(isSelected 
                                  ? selectedOrders.filter(id => id !== order.id)
                                  : [...selectedOrders, order.id]
                                );
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={selectedOrders.includes(order.id)}
                                onChange={() => {}}
                                className="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600"
                              />
                              <span>{`${order.id} - ${order.partyName}`}</span>
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-gray-500 text-center">
                            No orders found
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Selected Orders Display */}
                {selectedOrders.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {selectedOrders.map(orderId => {
                      const order = orders.find(o => o.id === orderId);
                      return (
                        <div 
                          key={orderId}
                          className="flex items-center justify-between bg-blue-50 px-3 py-1.5 rounded-md text-sm"
                        >
                          <span className="text-blue-700">
                            {order ? `${order.id} - ${order.partyName}` : orderId}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrders(selectedOrders.filter(id => id !== orderId));
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <Label className="text-sm mb-1.5">Purity *</Label>
                <Select value={purity} onValueChange={setPurity}>
                  <SelectTrigger className="h-10 bg-white border-gray-200 w-full">
                    <SelectValue placeholder="Select Purity" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="22K">22K</SelectItem>
                    <SelectItem value="18K">18K</SelectItem>
                    <SelectItem value="14K">14K</SelectItem>
                    <SelectItem value="92.5%">Silver (92.5%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Wax Tree
             Weight */}
            <div>
              <Label className="text-sm mb-1.5">Wax Tree Weight (grams)</Label>
              <Input
                type="number"
                step="0.0001"
                value={waxTreeWeight || ''}
                onChange={(e) => setWaxTreeWeight(parseFloat(e.target.value) || 0)}
                className="h-10 bg-white border-gray-200"
              />
            </div>

            {/* Inventory Items */}
            <div className="space-y-3">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="grid grid-cols-5 gap-4">
                  <div>
                    <Label className="text-sm mb-1.5">Item Name</Label>
                    <Select
                      value={selectedItem.name}
                      onValueChange={handleItemSelection}
                    >
                      <SelectTrigger className="h-10 bg-white border-gray-200 w-full">
                        <SelectValue placeholder="Select Item" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {inventoryApiItems.map((apiItem) => (
                          <SelectItem key={apiItem.name} value={apiItem.name}>
                            {apiItem.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-sm mb-1.5">Purity</Label>
                    <Input
                      type="text"
                      value={selectedItem.purity}
                      readOnly
                      className="h-10 bg-gray-50 border-gray-200"
                    />
                  </div>

                  <div>
                    <Label className="text-sm mb-1.5">Available Weight (g)</Label>
                    <Input
                      type="number"
                      value={selectedItem.availableWeight}
                      readOnly
                      className="h-10 bg-gray-50 border-gray-200"
                    />
                  </div>

                  <div>
                    <Label className="text-sm mb-1.5">Metal to be Issued (g)</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={selectedItem.metalToBeIssued.toFixed(4)}
                      readOnly
                      className="h-10 bg-gray-50 border-gray-200"
                    />
                  </div>

                  <div>
                    <Label className="text-sm mb-1.5">Issue Weight (g)</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={selectedItem.issueWeight}
                      onChange={(e) => setSelectedItem({
                        ...selectedItem,
                        issueWeight: parseFloat(e.target.value) || 0
                      })}
                      className="h-10 bg-white border-gray-200"
                    />
                  </div>
                </div>
              </div>

              {/* Add Item Button */}
              <Button
                type="button"
                onClick={handleAddInventoryItem}
                className="w-full h-10 bg-blue-500 hover:bg-blue-600 text-white"
                disabled={!selectedItem.name}
              >
                Add Item
              </Button>
            </div>

              {/* Added Items Table */}
              {inventoryItems.length > 0 && (
                <div className="mt-12 mb-6 border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purity</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issue Weight</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issued Gold</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issued Alloy</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {inventoryItems.map((item, index) => {
                        const purityDecimal = parseFloat(item.purity.replace(/[^0-9.]/g, '')) / 100;
                        const issuedGold = item.issueWeight * purityDecimal;
                        const issuedAlloy = item.issueWeight * (1 - purityDecimal);
                        
                        return (
                          <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.itemName}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.purity}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.issueWeight.toFixed(4)}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{issuedGold.toFixed(4)}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{issuedAlloy.toFixed(4)}</td>
                            <td className="px-4 py-3 text-sm">
                              <Button
                                type="button"
                                onClick={() => handleRemoveInventoryItem(item.id)}
                                className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1 rounded"
                                size="sm"
                              >
                                Remove
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Submit Button */}
              <div className="mt-6">
                <Button
                  type="button"
                  onClick={() => {
                    console.log("Button clicked"); // Debug log
                    handleSubmit();
                  }}
                  disabled={loading || !selectedOrders.length || !purity || !waxTreeWeight || inventoryItems.length === 0}
                  className={`w-full ${
                    loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
                  } text-white py-2 px-4 rounded-md transition-colors`}
                >
                  {loading ? 'Processing...' : 'Issue for Casting'}
                </Button>
              </div>

              {/* Debug information */}
              <div className="mt-4 text-sm text-gray-500">
                <p>Selected Orders: {selectedOrders.length}</p>
                <p>Purity: {purity}</p>
                <p>Wax Tree Weight: {waxTreeWeight}</p>
                <p>Inventory Items: {inventoryItems.length}</p>
              </div>

              {/* Default Percentage Display */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Label className="text-sm mb-1.5">
                    Default {purity === '92.5%' ? 'Silver' : 'Gold'} Percentage
                  </Label>
                  <Input
                    type="text"
                    value={purity ? `${defaultPercentages[purity as keyof typeof defaultPercentages]?.pureGold}%` : '-'}
                    readOnly
                    className="h-10 bg-gray-50 border-gray-200"
                  />
                </div>
              </div>

              {/* Editable Percentages */}
              {purity && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label className="text-sm mb-1.5">
                      Pure {purity === '92.5%' ? 'Silver' : 'Gold'} Percentage
                    </Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={purityPercentages.pureGold}
                      onChange={(e) => handlePureGoldPercentageChange(e.target.value)}
                      className="h-10 bg-white border-gray-200"
                    />
                  </div>
                  <div>
                    <Label className="text-sm mb-1.5">
                      {purity === '92.5%' ? 'Alloy' : 'Alloy'} Percentage
                    </Label>
                    <Input
                      type="number"
                      value={purityPercentages.alloy.toFixed(1)}
                      readOnly
                      className="h-10 bg-gray-50 border-gray-200"
                    />
                  </div>
                </div>
              )}
            {/* Conditional Rendering based on Purity */}
              {purity === '92.5%' ? (
                <div className="mt-6 border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Casting Number</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Required Purity</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Silver Tree Weight</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Required Metal</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Required Pure Metal</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Remaining Pure Metal</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Required Alloy</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Remaining Alloy</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Weight Issued</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Issued Date</th>
                      </tr>
                    </thead>
                     <tbody>
                      <tr>
                        <td className="px-3 py-2 text-sm font-medium text-blue-600">{castingNumber || '-'}</td>
                        <td className="px-3 py-2 text-sm">{purity || '-'}</td>
                        <td className="px-3 py-2 text-sm">{calculatedWeight.toFixed(2)}</td>
                        <td className="px-3 py-2 text-sm">{calculateRequiredMetals().pureGold.toFixed(2)}</td>
                        <td className="px-3 py-2 text-sm">{calculateRequiredMetals().pureGold.toFixed(2)}</td>
                        <td className="px-3 py-2 text-sm">{remainingPureMetalRequired.toFixed(2)}</td>
                        <td className="px-3 py-2 text-sm">{calculateRequiredMetals().alloy.toFixed(2)}</td>
                        <td className="px-3 py-2 text-sm">{remainingAlloyRequired.toFixed(2)}</td>
                        <td className="px-3 py-2 text-sm">
                          {inventoryItems.reduce((total, item) => total + item.issueWeight, 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-sm">{issuedDate}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                // Original Gold Table
                <div className="mt-6 border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Casting Number</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Required Purity</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Gold Tree Weight</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Required Metal</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Required Pure Metal</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Remaining Pure Metal</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Required Alloy</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Remaining Alloy</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Weight Issued</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Issued Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-3 py-2 text-sm font-medium text-blue-600">{castingNumber || '-'}</td>
                        <td className="px-3 py-2 text-sm">{purity || '-'}</td>
                        <td className="px-3 py-2 text-sm">{calculatedWeight.toFixed(2)}</td>
                        <td className="px-3 py-2 text-sm">{calculateRequiredMetals().pureGold.toFixed(2)}</td>
                        <td className="px-3 py-2 text-sm">{calculateRequiredMetals().pureGold.toFixed(2)}</td>
                        <td className="px-3 py-2 text-sm">{remainingPureMetalRequired.toFixed(2)}</td>
                        <td className="px-3 py-2 text-sm">{calculateRequiredMetals().alloy.toFixed(2)}</td>
                        <td className="px-3 py-2 text-sm">{remainingAlloyRequired.toFixed(2)}</td>
                        <td className="px-3 py-2 text-sm">
                          {inventoryItems.reduce((total, item) => total + item.issueWeight, 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-sm">{issuedDate}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Stone Weight Input */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-gray-600 block mb-1.5">
                  Weight Issued (g)
                </label>
                <Input
                  type="number"
                  value={(inventoryItems.reduce((total, item) => total + item.issueWeight, 0) + (stoneWeight || 0)).toFixed(4) || '0.0000'}
                  className="w-full h-9 bg-gray-50"
                  disabled={true}
                />
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1.5">
                  Stone Weight (g)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={stoneWeight || ''}
                  onChange={(e) => setStoneWeight(parseFloat(e.target.value) || 0)}
                  className="w-full h-9"
                  placeholder="Enter stone weight"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1.5">
                  Total Weight (with stones)
                </label>
                <Input
                  type="number"
                  value={(inventoryItems.reduce((total, item) => total + item.issueWeight, 0) + (stoneWeight || 0)).toFixed(4) || '0.0000'}
                  className="w-full h-9 bg-gray-50"
                  disabled={true}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
  
  );
};

export default CastingForm; 
