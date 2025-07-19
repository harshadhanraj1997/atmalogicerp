"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

// Types
interface StoneDetail {
  name: string;
  type: string;
  color: string;
  size: string;
  quantity: string;
}

interface FormData {
  itemGroup: string;
  designSource: string;
  category: string;
  modelName: string;
  size: string;
  grossWeight: string;
}

// Stone Details Modal Component
const StoneDetailsModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  existingStones = [] 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSave: (stones: StoneDetail[]) => void; 
  existingStones?: StoneDetail[]; 
}) => {
  const [stones, setStones] = useState<StoneDetail[]>(existingStones);

  const addNewRow = () => {
    setStones([...stones, { name: '', type: '', color: '', size: '', quantity: '' }]);
  };

  const removeRow = (index: number) => {
    setStones(stones.filter((_, i) => i !== index));
  };

  const updateStone = (index: number, field: keyof StoneDetail, value: string) => {
    const newStones = [...stones];
    newStones[index] = { ...newStones[index], [field]: value };
    setStones(newStones);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Stone Details</h2>
        
        <table className="w-full mb-4">
          <thead>
            <tr>
              <th className="border p-2">Name</th>
              <th className="border p-2">Type</th>
              <th className="border p-2">Color</th>
              <th className="border p-2">Size</th>
              <th className="border p-2">Quantity</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {stones.map((stone, index) => (
              <tr key={index}>
                <td className="border p-2">
                  <Input
                    value={stone.name}
                    onChange={(e) => updateStone(index, 'name', e.target.value)}
                    placeholder="Stone name"
                  />
                </td>
                <td className="border p-2">
                  <Input
                    value={stone.type}
                    onChange={(e) => updateStone(index, 'type', e.target.value)}
                    placeholder="Stone type"
                  />
                </td>
                <td className="border p-2">
                  <Input
                    value={stone.color}
                    onChange={(e) => updateStone(index, 'color', e.target.value)}
                    placeholder="Color"
                  />
                </td>
                <td className="border p-2">
                  <Input
                    value={stone.size}
                    onChange={(e) => updateStone(index, 'size', e.target.value)}
                    placeholder="Size"
                  />
                </td>
                <td className="border p-2">
                  <Input
                    type="number"
                    value={stone.quantity}
                    onChange={(e) => updateStone(index, 'quantity', e.target.value)}
                    placeholder="Quantity"
                  />
                </td>
                <td className="border p-2">
                  <Button
                    onClick={() => removeRow(index)}
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

        <div className="flex gap-2 justify-end mt-4">
          <Button onClick={addNewRow} variant="outline">
            Add Row
          </Button>
          <Button onClick={() => onSave(stones)} className="bg-green-500 hover:bg-green-600">
            Save
          </Button>
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

// Main Component
const AddJewelryModel = () => {
  const apiBaseUrl = "https://needha-erp-server-jmjf.onrender.com";
  const router = useRouter();

  // States
  const [formData, setFormData] = useState<FormData>({
    itemGroup: '',
    designSource: '',
    category: '',
    modelName: '',
    size: '',
    grossWeight: ''
  });

  const [itemGroups, setItemGroups] = useState([]);
  const [categories, setCategories] = useState([]);
  const [modelImage, setModelImage] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStoneModalOpen, setIsStoneModalOpen] = useState(false);
  const [stoneDetails, setStoneDetails] = useState<StoneDetail[]>([]);

  // Fetch data on mount
  useEffect(() => {
    fetchItemGroups();
    fetchCategories();
  }, []);

  // Fetch functions
  const fetchItemGroups = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/item-groups`);
      const result = await response.json();
      if (result.success) {
        setItemGroups(result.data);
      }
    } catch (error) {
      console.error("Error fetching item groups:", error);
    }
  };

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

  // Handlers
  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setModelImage(file);
    }
  };

  const handleStoneDetailsSave = (stones: StoneDetail[]) => {
    setStoneDetails(stones);
    setIsStoneModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Create FormData instance
      const formDataToSend = new FormData();

      // Format stone details
      const formattedStoneDetails = stoneDetails.map(stone => ({
        name: stone.name || '',
        type: stone.type || '',
        color: stone.color || '',
        size: stone.size || '',
        quantity: stone.quantity || ''
      }));

      // Create the jewelry model data object
      const jewelryModelData = {
        "Model-name": formData.modelName || '',
        "item-group": formData.itemGroup || '',
        "design-source": formData.designSource || '',
        "category": formData.category || '',
        "size": formData.size || '',
        "gross-weight": formData.grossWeight || '',
        "project": "",
        "die-no": "",
        "sketch-no": "",
        "branch": "",
        "brand": "",
        "collection": "",
        "purity": "",
        "color": "",
        "stone-type": "",
        "style": "",
        "shape": "",
        "stone-setting": "",
        "pieces": "",
        "unit-type": "",
        "rate": "",
        "minimum-stock-level": "",
        "material": "",
        "gender": "",
        "measurements": "",
        "router": "",
        "master-weight": "",
        "wax-piece-weight": "",
        "creator": "",
        "stone-weight": "",
        "net-weight": "",
        "stone-amount": "",
        "other-weight": "",
        "other-amount": "",
        "cad-path": "",
        "location": ""
      };

      formDataToSend.append('jewelryModel', JSON.stringify(jewelryModelData));
      formDataToSend.append('stoneDetails', JSON.stringify(formattedStoneDetails));

      if (modelImage) {
        formDataToSend.append('item-image', modelImage);
      }

      const response = await fetch(`${apiBaseUrl}/api/add-jewelry`, {
        method: 'POST',
        body: formDataToSend,
      });

      const text = await response.text();
      console.log('Raw response:', text);

      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        console.error('Failed to parse response:', text);
        throw new Error('Server returned invalid JSON');
      }

      if (result.success) {
        alert('Model added successfully!');
        // Reset form data
        setFormData({
          itemGroup: '',
          designSource: '',
          category: '',
          modelName: '',
          size: '',
          grossWeight: ''
        });
        // Reset stone details
        setStoneDetails([]);
        // Reset model image
        setModelImage(null);
        // Reset file input
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
      } else {
        throw new Error(result.message || 'Failed to add model');
      }
    } catch (error) {
      console.error('Error details:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Add Jewelry Model</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            {/* Item Group */}
            <div>
              <Label htmlFor="itemGroup">Item Group</Label>
              <select 
                id="itemGroup"
                value={formData.itemGroup}
                onChange={(e) => handleInputChange('itemGroup', e.target.value)}
                className="w-full border p-2 rounded"
                required
              >
                <option value="">Select Item Group</option>
                {itemGroups.map(group => (
                  <option key={group.Id} value={group.Id}>
                    {group.ItemGroupName__c}
                  </option>
                ))}
              </select>
            </div>

            {/* Design Source */}
            <div>
              <Label htmlFor="designSource">Design Source</Label>
              <select
                id="designSource"
                value={formData.designSource}
                onChange={(e) => handleInputChange('designSource', e.target.value)}
                className="w-full border p-2 rounded"
                required
              >
                <option value="">Select Design Source</option>
                <option value="in-house">In-house</option>
                <option value="outsource">Outsource</option>
              </select>
            </div>

            {/* Category */}
            <div>
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full border p-2 rounded"
                required
              >
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat.Id} value={cat.Id}>
                    {cat.Name}
                  </option>
                ))}
              </select>
            </div>

            {/* Model Name */}
            <div>
              <Label htmlFor="modelName">Model Name</Label>
              <Input
                id="modelName"
                value={formData.modelName}
                onChange={(e) => handleInputChange('modelName', e.target.value)}
                placeholder="Model Name"
                required
              />
            </div>

            {/* Size */}
            <div>
              <Label htmlFor="size">Size</Label>
              <Input
                id="size"
                value={formData.size}
                onChange={(e) => handleInputChange('size', e.target.value)}
                placeholder="Size"
              />
            </div>

            {/* Gross Weight */}
            <div>
              <Label htmlFor="grossWeight">Net Weight</Label>
              <Input
                id="grossWeight"
                type="number"
                step="0.001"
                value={formData.grossWeight}
                onChange={(e) => handleInputChange('grossWeight', e.target.value)}
                placeholder="Gross Weight"
                required
              />
            </div>

            {/* Image Upload */}
            <div className="col-span-2">
              <Label htmlFor="modelImage">Model Image</Label>
              <Input
                id="modelImage"
                type="file"
                onChange={handleImageUpload}
                accept="image/*"
                required
              />
              {modelImage && (
                <img
                  src={URL.createObjectURL(modelImage)}
                  alt="Preview"
                  className="mt-2 max-h-32 object-contain"
                />
              )}
            </div>

            {/* Stone Details */}
            <div className="col-span-2">
              <Button
                type="button"
                onClick={() => setIsStoneModalOpen(true)}
                className="w-full"
              >
                Add Stone Details
              </Button>

              {stoneDetails.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-semibold mb-2">Added Stones:</h3>
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="border p-2">Name</th>
                        <th className="border p-2">Type</th>
                        <th className="border p-2">Color</th>
                        <th className="border p-2">Size</th>
                        <th className="border p-2">Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stoneDetails.map((stone, index) => (
                        <tr key={index}>
                          <td className="border p-2">{stone.name}</td>
                          <td className="border p-2">{stone.type}</td>
                          <td className="border p-2">{stone.color}</td>
                          <td className="border p-2">{stone.size}</td>
                          <td className="border p-2">{stone.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="col-span-2 mt-4">
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Adding Model...' : 'Add Model'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Stone Details Modal */}
      <StoneDetailsModal
        isOpen={isStoneModalOpen}
        onClose={() => setIsStoneModalOpen(false)}
        onSave={handleStoneDetailsSave}
        existingStones={stoneDetails}
      />
    </div>
  );
};

export default AddJewelryModel;
