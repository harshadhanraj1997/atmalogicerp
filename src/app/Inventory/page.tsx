"use client";
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AlertCircle } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { AlertDescription } from "@/components/ui/alertdescription";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import "../Orders/add-order/add-order.css";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

interface InventoryItem {
  name: string;
  availableWeight: number;
  purity: string;
}

const InventoryUpdateForm = () => {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCustomItem, setIsCustomItem] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string>('');
  
  const [formData, setFormData] = useState({
    itemName: '',
    purity: '',
    availableWeight: '',
    unitOfMeasure: 'grams'
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch inventory items
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/get-inventory`);
        const result = await response.json();
        
        if (result.success) {
          setInventoryItems(result.data);
        } else {
          setError('Failed to fetch inventory items');
        }
      } catch (err) {
        setError('Error fetching inventory items');
        console.error(err);
      }
    };

    fetchInventory();
  }, []);

  const handleItemSelect = (value: string) => {
    if (value === 'custom') {
      setIsCustomItem(true);
      setFormData({
        itemName: '',
        purity: '',
        availableWeight: '',
        unitOfMeasure: 'grams'
      });
    } else {
      setIsCustomItem(false);
      const item = inventoryItems.find(i => i.name === value);
      if (item) {
        setFormData({
          itemName: item.name,
          purity: item.purity,
          availableWeight: item.availableWeight.toString(),
          unitOfMeasure: 'grams'
        });
      }
    }
    setSelectedItem(value);
  };

  const handleChange = (e: any) => {
    const { name, value } = e.target ? e.target : { name: 'unitOfMeasure', value: e };
    console.log(`Updating ${name} to ${value}`);
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    // Debug log to check form data
    console.log('Form Data:', formData);
    console.log('Selected Item:', selectedItem);
    console.log('Is Custom Item:', isCustomItem);

    // Validation
    const missingFields = [];
    if (!formData.itemName) missingFields.push('Item Name');
    if (!formData.purity) missingFields.push('Purity');
    if (!formData.availableWeight) missingFields.push('Available Weight');
    if (!formData.unitOfMeasure) missingFields.push('Unit of Measure');

    if (missingFields.length > 0) {
      const errorMessage = `Missing required fields: ${missingFields.join(', ')}`;
      console.error(errorMessage);
      setError(errorMessage);
      setIsLoading(false);
      return;
    }

    try {
      // Prepare the payload without weight conversion
      const payload = {
        itemName: formData.itemName,
        purity: formData.purity,
        availableWeight: parseFloat(formData.availableWeight),
        unitOfMeasure: formData.unitOfMeasure,
        isCustomItem: isCustomItem,
        originalItem: isCustomItem ? null : selectedItem
      };

      console.log('Submitting payload:', payload);

      const response = await fetch(`${apiBaseUrl}/update-inventory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update inventory');
      }

      setSuccess('Inventory updated successfully');
      
      // Reset form for custom items, or refresh the inventory list
      if (isCustomItem) {
        setFormData({
          itemName: '',
          purity: '',
          availableWeight: '',
          unitOfMeasure: 'grams'
        });
        setSelectedItem('');
      } else {
        // Refresh inventory list
        const refreshResponse = await fetch(`${apiBaseUrl}/get-inventory`);
        const refreshData = await refreshResponse.json();
        if (refreshData.success) {
          setInventoryItems(refreshData.data);
        }
      }

    } catch (err) {
      console.error('Error updating inventory:', err);
      setError(err.message || 'An error occurred while updating inventory');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full p-4 mt-24">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Update Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Item Selection - Updated styling */}
            <div className="space-y-2">
              <Label>Select Item</Label>
              <Select value={selectedItem} onValueChange={handleItemSelect}>
                <SelectTrigger className="w-full bg-white border border-gray-200">
                  <SelectValue placeholder="Select an item" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200">
                  <SelectItem value="custom" className="hover:bg-gray-100">Add Custom Item</SelectItem>
                  {inventoryItems.map((item) => (
                    <SelectItem 
                      key={item.name} 
                      value={item.name}
                      className="hover:bg-gray-100"
                    >
                      {item.name} ({item.availableWeight}g)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Item Name */}
            <div className="space-y-2">
              <Label htmlFor="itemName">Item Name</Label>
              <Input
                id="itemName"
                name="itemName"
                value={formData.itemName}
                onChange={handleChange}
                placeholder="Enter item name"
                disabled={!isCustomItem && selectedItem !== ''}
                className="w-full"
              />
            </div>

            {/* Purity */}
            <div className="space-y-2">
              <Label htmlFor="purity">Purity</Label>
              <Input
                id="purity"
                name="purity"
                value={formData.purity}
                onChange={handleChange}
                placeholder="Enter purity (e.g., 99.85%, 99.5%)"
                className="w-full"
              />
            </div>

            {/* Available Weight */}
            <div className="space-y-2">
              <Label htmlFor="availableWeight">Received Weight</Label>
              <Input
                id="availableWeight"
                name="availableWeight"
                type="number"
                step="0.001"
                onChange={handleChange}
                placeholder="Enter available weight"
                className="w-full"
              />
            </div>

            {/* Unit of Measure - Updated with value prop */}
            <div className="space-y-2">
              <Label htmlFor="unitOfMeasure">Unit of Measure</Label>
              <Select 
                defaultValue="grams"
                value={formData.unitOfMeasure} 
                onValueChange={(value) => handleChange({ target: { name: 'unitOfMeasure', value } })}
              >
                <SelectTrigger className="w-full bg-white border border-gray-200">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200">
                  <SelectItem value="grams" className="hover:bg-gray-100">Grams</SelectItem>
                  <SelectItem value="kilograms" className="hover:bg-gray-100">Kilograms</SelectItem>
                  <SelectItem value="ounces" className="hover:bg-gray-100">Ounces</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Success Alert */}
            {success && (
              <Alert className="bg-green-50 text-green-700 border-green-200">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading || !selectedItem}
            >
              {isLoading ? 'Updating...' : 'Update Inventory'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryUpdateForm;

