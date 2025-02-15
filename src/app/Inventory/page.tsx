
"use client";
import React, { useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AlertCircle } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { AlertDescription } from "@/components/ui/alertdescription";
import "../Orders/add-order/add-order.css";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

const InventoryUpdateForm = () => {
  const [formData, setFormData] = useState({
    itemName: '',
    purity: '',
    availableWeight: '',
    unitOfMeasure: ''
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
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

    // Validation
    if (!formData.itemName || !formData.purity || !formData.availableWeight || !formData.unitOfMeasure) {
      setError('All fields are required');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/update-inventory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update inventory');
      }

      setSuccess('Inventory updated successfully');
      setFormData({
        itemName: '',
        purity: '',
        availableWeight: '',
        unitOfMeasure: ''
      });
    } catch (err) {
      setError(err.message || 'An error occurred while updating inventory');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">Update Inventory</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Item Name */}
          <div className="space-y-2">
            <Label htmlFor="itemName">Item Name</Label>
            <Input
              id="itemName"
              name="itemName"
              value={formData.itemName}
              onChange={handleChange}
              placeholder="Enter item name"
              className="w-full"
            />
          </div>

          {/* Purity */}
          <div className="space-y-2">
            <Label htmlFor="purity">Purity</Label>
            <select
              id="purity"
              name="purity"
              value={formData.purity}
              onChange={handleChange}
              className="w-full h-10 px-3 rounded-md border border-gray-300"
            >
              <option value="">Select Purity</option>
              <option value="24K">24K</option>
              <option value="22K">22K</option>
              <option value="18K">18K</option>
              <option value="14K">14K</option>
            </select>
          </div>

          {/* Available Weight */}
          <div className="space-y-2">
            <Label htmlFor="availableWeight">Available Weight</Label>
            <Input
              id="availableWeight"
              name="availableWeight"
              type="number"
              step="0.01"
              value={formData.availableWeight}
              onChange={handleChange}
              placeholder="Enter available weight"
              className="w-full"
            />
          </div>

          {/* Unit of Measure */}
          <div className="space-y-2">
            <Label htmlFor="unitOfMeasure">Unit of Measure</Label>
            <select
              id="unitOfMeasure"
              name="unitOfMeasure"
              value={formData.unitOfMeasure}
              onChange={handleChange}
              className="w-full h-10 px-3 rounded-md border border-gray-300"
            >
              <option value="">Select Unit</option>
              <option value="grams">Grams</option>
              <option value="kilograms">Kilograms</option>
              <option value="ounces">Ounces</option>
            </select>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {success && (
            <Alert className="mt-4 bg-green-50 text-green-700 border-green-200">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Updating...' : 'Update Inventory'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default InventoryUpdateForm;

