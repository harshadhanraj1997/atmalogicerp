"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams } from 'next/navigation';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "react-hot-toast";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

interface Order {
  Id: string;
  Order_Id__c: string;
  Id__c: string;
  Casting__c: string;
}

interface CastingResponse {
  casting: {
    Id: string;
    Name: string;
    Issued_Date__c: string;
    Wax_Tree_Weight__c: number;
  };
  orders: Order[];
  success: boolean;
  summary: {
    totalOrders: number;
    totalInventoryItems: number;
    totalIssuedWeight: number;
    totalPureMetalWeight: number;
    totalAlloyWeight: number;
  };
}

interface CastingDetails {
  id: string;
  receivedWeight: number;
  receivedDate: string;
  orders: Order[];
}

interface ModelsByCategory {
  [category: string]: {
    Id: string;
    Name: string;
    Category__c: string;
    Purity__c: string;
    Size__c: string;
    Color__c: string;
    Quantity__c: number;
    Gross_Weight__c: number;
    Stone_Weight__c: number;
    Net_Weight__c: number;
  }[];
}

interface CategoryQuantity {
  category: string;
  quantity: number;
  totalModels: number;
  totalPieces: number;
}

export default function AddGrindingDetails() {
  const searchParams = useSearchParams();
  const castingId = searchParams.get('castingId');
  
  const [loading, setLoading] = useState(true);
  const [castingDetails, setCastingDetails] = useState<CastingDetails>({
    id: '',
    receivedWeight: 0,
    receivedDate: '',
    orders: []
  });
  const [bagName, setBagName] = useState('');
  const [selectedOrder, setSelectedOrder] = useState('');
  const [receivedWeight, setReceivedWeight] = useState(0);
  const [receivedDate, setReceivedDate] = useState('');
  const [pouchWeights, setPouchWeights] = useState<{ [key: string]: number }>({});
  const [bags, setBags] = useState<Array<{bagName: string; order: string; weight: number}>>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [categorizedModels, setCategorizedModels] = useState<ModelsByCategory>({});
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCategoryQuantities, setSelectedCategoryQuantities] = useState<CategoryQuantity[]>([]);
  const [pouchCategories, setPouchCategories] = useState<{[key: string]: CategoryQuantity[]}>({});
  const [issuedDate, setIssuedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [issuedTime, setIssuedTime] = useState<string>(() => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  });
  const [filingIssuedWeight, setFilingIssuedWeight] = useState<number>(0);

  // Add a formatted ID that includes GRIND
  const formattedId = castingId ? `Filing/${castingId}` : '';

  // Fetch casting details and related orders
  useEffect(() => {
    const fetchCastingDetails = async () => {
      if (!castingId) {
        console.log('No castingId provided');
        return;
      }
      
      try {
        setLoading(true);
        const [year, month, date, number] = castingId.split('/');
        console.log('Parsed date components:', { year, month, date, number });
        
        const apiUrl = `${apiBaseUrl}/api/casting/all/${date}/${month}/${year}/${number}`;
        console.log('Fetching from:', apiUrl);
        
        const response = await fetch(apiUrl);
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch casting details: ${response.statusText}`);
        }
        
        const responseData = await response.json();
        console.log('Full API Response:', responseData);
        
        // Format the date from ISO string to YYYY-MM-DD
        const receivedDateTime = responseData.data.casting.Received_Date__c;
        const formattedDate = receivedDateTime ? receivedDateTime.split('T')[0] : '';
        
        // Get received weight and date from the API response using correct field names
        const castingDetailsData = {
          id: castingId,
          receivedWeight: responseData.data.casting.Weight_Received__c || 0,
          receivedDate: formattedDate,
          orders: responseData.data.orders || []
        };
        
        console.log('Setting casting details:', castingDetailsData);
        setCastingDetails(castingDetailsData);
        
        // Set the received weight and date in state using correct field names
        setReceivedWeight(responseData.data.casting.Weight_Received__c || 0);
        setReceivedDate(formattedDate);

      } catch (error) {
        console.error('Error fetching casting details:', error);
        toast.error('Failed to fetch casting details');
      } finally {
        setLoading(false);
      }
    };

    fetchCastingDetails();
  }, [castingId]);

  // Add debug logging for render
  console.log('Current casting details:', castingDetails);
  console.log('Current orders:', castingDetails.orders);

  // Update the generatePouchName function to use formattedId
  const generatePouchName = () => {
    const nextPouchNumber = bags.length + 1;
    return `${formattedId}/POUCH${nextPouchNumber}`;
  };

  // Update the handlePouchWeightChange function to properly calculate total weight
  const handlePouchWeightChange = (bagName: string, weight: number) => {
    console.log('Updating pouch weight:', { bagName, weight });
    
    setPouchWeights(prev => {
      const newWeights = { ...prev, [bagName]: weight };
      console.log('New pouch weights:', newWeights);
      
      // Calculate total filing issued weight from all pouches
      const totalFilingWeight = Object.values(newWeights).reduce((sum, w) => sum + (parseFloat(w.toString()) || 0), 0);
      console.log('Calculated total filing weight:', totalFilingWeight);
      
      setFilingIssuedWeight(totalFilingWeight);
      return newWeights;
    });
  };

  // Update handleAddBag to initialize the weight
  const handleAddBag = () => {
    if (!selectedOrder) {
      toast.error('Please select an order');
      return;
    }

    const newPouchName = generatePouchName();
    setBags([...bags, { bagName: newPouchName, order: selectedOrder, weight: 0 }]);
    
    // Initialize the weight in pouchWeights
    setPouchWeights(prev => ({
      ...prev,
      [newPouchName]: 0
    }));
    
    setSelectedOrder(''); // Reset order selection
  };

  // Update function to fetch categories using Order_Id__c
  const fetchCategories = async (orderId: string) => {
    try {
      // Find the Order_Id__c from the orders array
      const order = castingDetails.orders.find(o => o.Id === orderId);
      console.log('Finding order for ID:', orderId, 'Found:', order);
      
      if (!order) {
        console.log('Order not found for ID:', orderId);
        toast.error('Order not found');
        setCategories([]);
        setCategorizedModels({});
        return;
      }

      // Split Order_Id__c into orderId and orderNumber
      const [orderPrefix, orderNumber] = order.Order_Id__c.split('/');
      console.log('Order details:', { orderPrefix, orderNumber });
      
      const response = await fetch(
        `${apiBaseUrl}/api/orders/${orderPrefix}/${orderNumber}/categories`
      );
      const data = await response.json();
      console.log('Categories API Response:', data);
      
      if (data.success) {
        const categoriesData = data.data.categories;
        console.log('Setting categories:', Object.keys(categoriesData));
        console.log('Setting categorized models:', categoriesData);
        setCategories(Object.keys(categoriesData));
        setCategorizedModels(categoriesData);
        setSelectedCategory('');
        
        console.log(`Loaded ${data.summary.totalCategories} categories with ${data.summary.totalModels} models`);
      } else {
        console.error('Failed to fetch categories:', data.message);
        toast.error('Failed to fetch categories');
        setCategories([]);
        setCategorizedModels({});
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Error loading categories');
      setCategories([]);
      setCategorizedModels({});
    }
  };

  // Update order selection handler
  const handleOrderSelect = (orderId: string) => {
    setSelectedOrder(orderId);
    setCategories([]); // Reset categories when order changes
    setSelectedCategory(''); // Reset selected category
    fetchCategories(orderId);
  };

  // Update category selection handler to include quantity calculation
  const handleCategorySelect = (category: string) => {
    console.log('Category selected:', category);
    setSelectedCategory(category);
    
    const modelsForCategory = categorizedModels[category] || [];
    const totalQuantity = modelsForCategory.reduce((sum, model) => sum + (model.Quantity__c || 0), 0);
    
    console.log('Models for category:', {
      category,
      modelCount: modelsForCategory.length,
      totalQuantity,
      models: modelsForCategory
    });
    
    // Add category to selected quantities if not already present
    if (!selectedCategoryQuantities.find(c => c.category === category)) {
      const newCategoryQuantity = {
        category,
        quantity: 0,
        totalModels: modelsForCategory.length,
        totalPieces: totalQuantity
      };
      console.log('Adding new category quantity:', newCategoryQuantity);
      setSelectedCategoryQuantities(prev => {
        const updated = [...prev, newCategoryQuantity];
        console.log('Updated selected category quantities:', updated);
        return updated;
      });
    }
  };

  // Add quantity update handler
  const handleQuantityChange = (category: string, quantity: number) => {
    console.log('Updating quantity:', { category, quantity });
    setSelectedCategoryQuantities(prev => {
      const updated = prev.map(c => 
        c.category === category ? { ...c, quantity } : c
      );
      console.log('Updated quantities:', updated);
      return updated;
    });
  };

  // Update the handleAddCategoriesToPouch function
  const handleAddCategoriesToPouch = () => {
    if (!selectedOrder) {
      console.log('No order selected');
      toast.error('Please select an order first');
      return;
    }
    
    // Validate if any categories are selected
    if (selectedCategoryQuantities.length === 0) {
      console.log('No categories selected');
      toast.error('Please select at least one category');
      return;
    }

    // Validate if quantities are entered
    const hasInvalidQuantities = selectedCategoryQuantities.some(cat => !cat.quantity || cat.quantity <= 0);
    if (hasInvalidQuantities) {
      console.log('Invalid quantities found');
      toast.error('Please enter valid quantities for all categories');
      return;
    }

    const newPouchName = generatePouchName();
    console.log('Creating new pouch:', newPouchName);
    
    // Add the new bag
    setBags(prev => {
      const updated = [...prev, { 
        bagName: newPouchName, 
        order: selectedOrder, 
        weight: 0 
      }];
      console.log('Updated bags:', updated);
      return updated;
    });
    
    // Store categories for this pouch
    setPouchCategories(prev => {
      const updated = {
        ...prev,
        [newPouchName]: [...selectedCategoryQuantities]
      };
      console.log('Updated pouch categories:', updated);
      return updated;
    });

    // Initialize weight for the new pouch
    setPouchWeights(prev => ({
      ...prev,
      [newPouchName]: 0
    }));
    
    console.log('Resetting category selections');
    setSelectedCategoryQuantities([]);
    setSelectedCategory('');

    toast.success('Pouch created successfully');
  };

  // Update the handleSubmit function to use the correct field name
  const handleSubmit = async (e: React.FormEvent) => {
    try {
      e.preventDefault();
      console.log('[AddFiling] Starting form submission');
      console.log('Current filing issued weight:', filingIssuedWeight);
      console.log('Current pouch weights:', pouchWeights);
      console.log('Current bags:', bags);

      if (bags.length === 0) {
        console.log('[AddFiling] No bags added');
        toast.error('Please add at least one bag');
        return;
      }

      // Recalculate total weight to ensure accuracy
      const totalIssuedWeight = Object.values(pouchWeights).reduce((sum, w) => sum + (parseFloat(w.toString()) || 0), 0);
      console.log('Recalculated total issued weight:', totalIssuedWeight);

      // Combine date and time for issued datetime
      const combinedIssuedDateTime = `${issuedDate}T${issuedTime}:00.000Z`;

      const filingData = {
        filingId: formattedId,
        receivedWeight: receivedWeight,
        issuedWeight: totalIssuedWeight, // Changed from filingIssuedWeight to issuedWeight
        receivedDate: receivedDate,
        issuedDate: combinedIssuedDateTime,
        pouches: bags.map(bag => ({
          pouchId: bag.bagName,
          orderId: castingDetails.orders.find(o => o.Id === bag.order)?.Order_Id__c || '',
          weight: parseFloat(pouchWeights[bag.bagName]?.toString() || '0'),
          categories: pouchCategories[bag.bagName] || []
        }))
      };

      console.log('[AddFiling] Submitting filing data:', JSON.stringify(filingData, null, 2));
      console.log('[AddFiling] API URL:', `${apiBaseUrl}/api/filing/create`);

      const response = await fetch(`${apiBaseUrl}/api/filing/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(filingData),
      });

      console.log('[AddFiling] API Response status:', response.status);
      console.log('[AddFiling] API Response status text:', response.statusText);

      const result = await response.json();
      console.log('[AddFiling] API Response data:', result);

      if (!response.ok) {
        throw new Error(result.message || 'Failed to submit filing details');
      }

      if (result.success) {
        console.log('[AddFiling] Submission successful:', result);
        toast.success('Filing details submitted successfully');
        
        // Reset form
        setBags([]);
        setPouchWeights({});
        setSelectedOrder('');
        setSelectedCategory('');
        setSelectedCategoryQuantities([]);
        setPouchCategories({});
        setReceivedWeight(castingDetails.receivedWeight);
        setReceivedDate(castingDetails.receivedDate);
      } else {
        throw new Error(result.message || 'Failed to submit filing details');
      }
      
    } catch (error) {
      console.error('[AddFiling] Error in handleSubmit:', error);
      toast.error(error.message || 'Failed to submit filing details');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="h-screen overflow-hidden">
      <div className="h-full overflow-y-auto p-4 pt-40 mt-[-30px] bg-gray-50">
        <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-sm p-6 mr-[300px] md:mr-[300px]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold">Add Filing Details</h2>
            <div className="text-sm font-medium">
              Filing ID: <span className="text-blue-600">{formattedId}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Received Weight and Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Received Weight from Casting(g)</Label>
                <Input
                  type="number"
                  value={receivedWeight}
                  className="h-10"
                  readOnly
                />
              </div>
              <div>
                <Label>Total Weight Issued for Filing(g)</Label>
                <Input
                  type="number"
                  value={filingIssuedWeight}
                  className="h-10"
                  readOnly
                />
              </div>
              <div>
                <Label>Received Date from Casting</Label>
                <Input
                  type="date"
                  value={receivedDate}
                  className="h-10"
                  readOnly
                />
              </div>
              <div>
                <Label>Filing Issue Date</Label>
                <Input
                  type="date"
                  value={issuedDate}
                  onChange={(e) => setIssuedDate(e.target.value)}
                  className="h-10"
                  required
                />
              </div>
              <div>
                <Label>Filing Issue Time</Label>
                <Input
                  type="time"
                  value={issuedTime}
                  onChange={(e) => setIssuedTime(e.target.value)}
                  className="h-10"
                  required
                />
              </div>
            </div>

            {/* Bag Details */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Pouch Name</Label>
                  <Input
                    type="text"
                    value={generatePouchName()}
                    readOnly
                    className="h-10 bg-gray-100"
                  />
                </div>
                <div>
                  <Label className="mb-2">Select Order</Label>
                  <Select value={selectedOrder} onValueChange={handleOrderSelect}>
                    <SelectTrigger className="w-full h-10 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <SelectValue placeholder="Select an order" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200 shadow-lg rounded-md">
                      {castingDetails.orders.map((order) => (
                        <SelectItem 
                          key={order.Id} 
                          value={order.Id}
                          className="hover:bg-gray-100 cursor-pointer py-2"
                        >
                          {order.Order_Id__c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {selectedOrder && (
                <div>
                  <Label className="mb-2">Select Category</Label>
                  <Select 
                    value={selectedCategory} 
                    onValueChange={handleCategorySelect}
                    disabled={!selectedOrder || categories.length === 0}
                  >
                    <SelectTrigger className="w-full h-10 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <SelectValue placeholder={
                        !selectedOrder 
                          ? 'Select an order first'
                          : categories.length === 0 
                            ? 'No categories available' 
                            : 'Select a category'
                      } />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200 shadow-lg rounded-md">
                      {categories.map((category) => {
                        const models = categorizedModels[category] || [];
                        const totalQuantity = models.reduce((sum, model) => sum + (model.Quantity__c || 0), 0);
                        return (
                          <SelectItem 
                            key={category} 
                            value={category}
                            className="hover:bg-gray-100 cursor-pointer py-2"
                          >
                            <div className="flex justify-between items-center w-full">
                              <span>{category}</span>
                              <span className="text-sm text-gray-500">
                                ({models.length} models, {totalQuantity} pieces)
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>

                  {/* Category details section with improved styling */}
                  {selectedCategory && categorizedModels[selectedCategory] && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-md border border-gray-200">
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Selected Categories</Label>
                          <div className="mt-2 space-y-3">
                            {selectedCategoryQuantities.map((catQuantity) => (
                              <div key={catQuantity.category} className="flex items-center gap-4 p-2 bg-white rounded border">
                                <div className="flex-1">
                                  <span className="font-medium">{catQuantity.category}</span>
                                  <span className="text-sm text-gray-500 ml-2">
                                    ({catQuantity.totalModels} models, {catQuantity.totalPieces} total pieces)
                                  </span>
                                </div>
                                <div className="w-32">
                                  <Label>Quantity</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    max={catQuantity.totalPieces}
                                    value={catQuantity.quantity}
                                    onChange={(e) => handleQuantityChange(catQuantity.category, parseInt(e.target.value) || 0)}
                                    className="h-8"
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedCategoryQuantities(prev => 
                                      prev.filter(c => c.category !== catQuantity.category)
                                    );
                                    if (catQuantity.category === selectedCategory) {
                                      setSelectedCategory('');
                                    }
                                  }}
                                >
                                  Remove
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Add to Pouch Button */}
                        {selectedCategoryQuantities.length > 0 && (
                          <Button
                            type="button"
                            onClick={handleAddCategoriesToPouch}
                            className="w-full mt-4"
                          >
                            Add Categories to New Pouch
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <Button
                type="button"
                onClick={handleAddBag}
                className="w-full bg-blue-500"
              >
                Add Pouch
              </Button>
            </div>

            {/* Bags List */}
            {bags.length > 0 && (
              <div className="mt-4">
                <h3 className="text-md font-medium mb-2">Added Pouches</h3>
                <div className="border rounded-lg divide-y">
                  {bags.map((bag, index) => {
                    const orderDetails = castingDetails.orders.find(o => o.Id === bag.order);
                    const bagCategories = pouchCategories[bag.bagName] || [];
                    
                    console.log(`Rendering pouch ${bag.bagName}:`, {
                      orderDetails,
                      bagCategories,
                      weight: pouchWeights[bag.bagName]
                    });
                    
                    return (
                      <div key={index} className="p-3">
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <span className="font-medium">{bag.bagName}</span>
                            <span className="text-gray-500 ml-2">
                              Order: {orderDetails ? orderDetails.Order_Id__c : bag.order}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="w-48">
                              <Label>Weight (g)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={pouchWeights[bag.bagName] || ''}
                                onChange={(e) => handlePouchWeightChange(bag.bagName, parseFloat(e.target.value) || 0)}
                                className="h-8"
                                placeholder="Enter weight"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                console.log('Removing pouch:', bag.bagName);
                                const newBags = bags.filter((_, i) => i !== index);
                                setBags(newBags);
                                const newWeights = { ...pouchWeights };
                                delete newWeights[bag.bagName];
                                setPouchWeights(newWeights);
                                const newPouchCategories = { ...pouchCategories };
                                delete newPouchCategories[bag.bagName];
                                setPouchCategories(newPouchCategories);
                                const totalWeight = Object.values(newWeights).reduce((sum, w) => sum + (w || 0), 0);
                                setReceivedWeight(totalWeight);
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                        
                        {/* Show categories in this pouch */}
                        {bagCategories.length > 0 && (
                          <div className="mt-2 text-sm">
                            <div className="text-gray-600">Categories:</div>
                            <div className="ml-2">
                              {bagCategories.map((cat) => (
                                <div key={cat.category} className="flex items-center gap-2">
                                  <span>{cat.category}:</span>
                                  <span>{cat.quantity} pieces</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 text-right text-sm text-gray-600">
                  Total Weight: {Object.values(pouchWeights).reduce((sum, w) => sum + (w || 0), 0).toFixed(2)}g
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-blue-600"
              disabled={bags.length === 0}
            >
              Submit Filing Details
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

