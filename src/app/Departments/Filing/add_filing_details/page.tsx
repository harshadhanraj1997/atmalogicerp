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
  const [currentEditingPouch, setCurrentEditingPouch] = useState<string>('');
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
        
        // Log the casting data structure to debug
        console.log('Casting data structure:', responseData.data.casting);
        
        // Format the date from ISO string to YYYY-MM-DD
        const receivedDateTime = responseData.data.casting.Received_Date__c;
        const formattedDate = receivedDateTime ? receivedDateTime.split('T')[0] : '';
        
        // Check all possible field names for received weight
        const receivedWeightValue = responseData.data.casting.Weight_Received__c || 
                                  responseData.data.casting.Received_Weight__c || 
                                  responseData.data.casting.ReceivedWeight__c || 
                                  responseData.data.casting.Weight__c || 
                                  0;
        
        console.log('Extracted received weight:', receivedWeightValue);
        
        // Get received weight and date from the API response using correct field names
        const castingDetailsData = {
          id: castingId,
          receivedWeight: receivedWeightValue,
          receivedDate: formattedDate,
          orders: responseData.data.orders || []
        };
        
        console.log('Setting casting details:', castingDetailsData);
        setCastingDetails(castingDetailsData);
        
        // Set the received weight and date in state using correct field names
        setReceivedWeight(receivedWeightValue);
        setReceivedDate(formattedDate);
      } catch (error) {
        console.error('Error fetching casting details:', error);
        toast.error('Failed to fetch casting details');
      } finally {
        setLoading(false);
      }
    };

    fetchCastingDetails();
  }, [castingId, apiBaseUrl]);

  // Update the generatePouchName function to use formattedId
  const generatePouchName = () => {
    const nextPouchNumber = bags.length + 1;
    return `${formattedId}/POUCH${nextPouchNumber}`;
  };

  // Update the handlePouchWeightChange function to properly calculate total weight
  const handlePouchWeightChange = (bagName: string, weight: number) => {
    console.log(`Updating weight for ${bagName} to ${weight}`);
    
    setPouchWeights(prev => {
      const updated = { ...prev, [bagName]: weight };
      console.log('Updated pouch weights:', updated);
      
      // Calculate total issued weight
      const totalWeight = Object.values(updated).reduce((sum, w) => sum + (w || 0), 0);
      console.log('Total issued weight:', totalWeight);
      setFilingIssuedWeight(totalWeight);
      
      return updated;
    });
  };

  // Update handleAddBag to initialize the weight
  const handleAddBag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) {
      toast.error('Please select an order for the bag');
      return;
    }

    // Check if categories are selected before creating a pouch
    if (selectedCategoryQuantities.length === 0) {
      toast.error('Please select at least one category before creating a pouch');
      return;
    }

    const orderDetails = castingDetails.orders.find(o => o.Id === selectedOrder);
    if (!orderDetails) {
      toast.error('Order details not found');
      return;
    }

    const newBagName = generatePouchName();
    console.log('Generated new bag name:', newBagName);

    // Get the weight for this order/casting
    const castingWeight = orderDetails.weight || 0;

    // Create a new bag with this order
    const newBag = {
      bagName: newBagName,
      order: selectedOrder,
      orderNumber: orderDetails.Id__c || '',
      weight: castingWeight
    };

    // Add this bag to our list of bags
    setBags(prev => [...prev, newBag]);

    // Initialize weight for this bag
    setPouchWeights(prev => ({
      ...prev,
      [newBagName]: 0
    }));

    // Automatically add the selected categories to this pouch
    setPouchCategories(prev => {
      // Create a deep copy of the previous state
      const updated = JSON.parse(JSON.stringify(prev));
      
      // Initialize categories for this bag if needed
      if (!updated[newBagName]) {
        updated[newBagName] = [];
      }
      
      // Add all selected categories to this pouch
      selectedCategoryQuantities.forEach(category => {
        updated[newBagName].push({...category});
        console.log(`[AddBag] Added category ${category.category} to ${newBagName}`);
      });
      
      // Store the updated categories in localStorage
      try {
        localStorage.setItem('pouchCategories', JSON.stringify(updated));
      } catch (error) {
        console.error('[AddBag] Error storing pouchCategories in localStorage:', error);
      }
      
      return updated;
    });

    toast.success(`Added pouch ${newBagName} with ${selectedCategoryQuantities.length} categories for order ${orderDetails.Id__c}`);
    
    // Set this as the current editing pouch
    setCurrentEditingPouch(newBagName);
    
    // Keep the selected order (don't reset it)
    // This allows the user to continue adding categories for the same order
    // setSelectedOrder('');
    
    // Reset category selection
    setSelectedCategory('');
    setSelectedCategoryQuantities([]);
    setBagName(newBagName);
    
    toast.success(`Added pouch ${newBagName}. Now select categories for this pouch.`);
  };

  // Update function to fetch categories using Order_Id__c
  const fetchCategories = async (orderId: string) => {
    if (!orderId) {
      console.log('No order ID provided');
      return;
    }
    
    try {
      console.log(`Fetching categories for order: ${orderId}`);
      
      const orderDetails = castingDetails.orders.find(o => o.Id === orderId);
      if (!orderDetails) {
        console.log(`Order with ID ${orderId} not found in casting details`);
        return;
      }
      
      const orderIdForApi = orderDetails.Order_Id__c;
      console.log(`Using Order_Id__c for API: ${orderIdForApi}`);
      
      // Parse the Order_Id__c to get the prefix and number parts
      const orderIdParts = orderIdForApi.split('/');
      const orderPrefix = orderIdParts[0]; // e.g., "9004"
      const orderNumber = orderIdParts[1]; // e.g., "0033"
      
      // Use the correct API endpoint format
      const apiUrl = `${apiBaseUrl}/api/orders/${orderPrefix}/${orderNumber}/categories`;
      console.log(`Fetching from: ${apiUrl}`);
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.statusText}`);
      }
      
      const responseData = await response.json();
      console.log('Categories API Response:', responseData);
      
      if (responseData.success) {
        // Check the structure of the response data
        console.log('Response data structure:', typeof responseData.data, responseData.data);
        
        // Group models by category
        const modelsByCategory: ModelsByCategory = {};
        
        // Handle the specific response structure where categories are nested
        if (responseData.data && responseData.data.categories) {
          // The response has a structure like: { categories: { "CATEGORY_NAME": [models] } }
          const categoriesObj = responseData.data.categories;
          
          // Extract category names from the object keys
          const categoryNames = Object.keys(categoriesObj);
          console.log('Category names from response:', categoryNames);
          
          // Process each category
          categoryNames.forEach(categoryName => {
            const models = categoriesObj[categoryName];
            if (Array.isArray(models)) {
              modelsByCategory[categoryName] = models;
            }
          });
          
          // Set the categories directly from the object keys
          setCategories(categoryNames);
        } else {
          // Fallback to previous implementation for other response structures
          const modelsData = Array.isArray(responseData.data) ? responseData.data : 
                            responseData.data?.models ? responseData.data.models : 
                            responseData.models ? responseData.models : [];
          
          if (Array.isArray(modelsData)) {
            modelsData.forEach((model: any) => {
              const category = model.Category__c || 'Uncategorized';
              
              if (!modelsByCategory[category]) {
                modelsByCategory[category] = [];
              }
              
              modelsByCategory[category].push(model);
            });
          } else {
            console.warn('Models data is not in expected format:', responseData.data);
          }
        }
        
        console.log('Models grouped by category:', modelsByCategory);
        setCategorizedModels(modelsByCategory);
        
        // Extract unique categories
        const uniqueCategories = Object.keys(modelsByCategory);
        console.log('Unique categories:', uniqueCategories);
        setCategories(uniqueCategories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to fetch categories');
    }
  };

  // Update order selection handler
  const handleOrderSelect = (orderId: string) => {
    console.log(`Selected order: ${orderId}`);
    setSelectedOrder(orderId);
    setSelectedCategory('');
    setSelectedCategoryQuantities([]);
    fetchCategories(orderId);
  };

  // Update category selection handler to include quantity calculation
  const handleCategorySelect = (category: string) => {
    console.log(`Selected category: ${category}`);
    setSelectedCategory(category);
    
    // Get models for this category
    const modelsForCategory = categorizedModels[category] || [];
    console.log('Models for category raw data:', modelsForCategory);
    
    // Simply count the number of models as the total quantity
    const totalModels = modelsForCategory.length;
    const totalQuantity = totalModels; // Use the count of records as the quantity
    
    console.log('Category quantity calculation:', {
      category,
      totalModels,
      totalQuantity,
      modelCount: modelsForCategory.length,
      modelNames: modelsForCategory.map(m => m.Name)
    });
    
    console.log('Models for category:', {
      category,
      modelCount: totalModels,
      totalQuantity,
      models: modelsForCategory
    });
    
    // Add category to selected quantities if not already present
    if (!selectedCategoryQuantities.find(c => c.category === category)) {
      const newCategoryQuantity = {
        category,
        quantity: 1, // Set default quantity to 1 instead of 0
        totalModels: totalModels,
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
    console.log(`Updating quantity for ${category} to ${quantity}`);
    setSelectedCategoryQuantities(prev => {
      return prev.map(c => {
        if (c.category === category) {
          return { ...c, quantity };
        }
        return c;
      });
    });
  };

  // Clean implementation for handleAddCategoriesToPouch function
  const handleAddCategoriesToPouch = () => {
    console.log('handleAddCategoriesToPouch CALLED - Using functional update pattern');
    
    if (!selectedOrder || selectedCategoryQuantities.length === 0 || bags.length === 0) {
      toast.error('Please select an order, categories, and add at least one pouch');
      return;
    }
    
    // Always use the last added pouch
    const lastPouch = bags[bags.length - 1];
    console.log('[AddCategories] Adding to pouch:', lastPouch.bagName);
    console.log('[AddCategories] Categories to add:', selectedCategoryQuantities);
    
    // Use functional update pattern to ensure we're working with latest state
    setPouchCategories(prev => {
      // Create a deep copy of current state
      const updated = JSON.parse(JSON.stringify(prev));
      
      // Initialize the array for this pouch if needed
      if (!updated[lastPouch.bagName]) {
        updated[lastPouch.bagName] = [];
      }
      
      // Add the selected categories (creating new objects to avoid reference issues)
      selectedCategoryQuantities.forEach(category => {
        // Check if category already exists for this pouch
        const existingIndex = updated[lastPouch.bagName].findIndex(
          (c: { category: string }) => c.category === category.category
        );
        
        if (existingIndex >= 0) {
          // Update existing category
          updated[lastPouch.bagName][existingIndex] = {...category};
          console.log(`[AddCategories] Updated existing category: ${category.category}`);
        } else {
          // Add new category
          updated[lastPouch.bagName].push({...category});
          console.log(`[AddCategories] Added new category: ${category.category}`);
        }
      });
      
      console.log('[AddCategories] Updated pouch categories:', updated);
      
      // Store in localStorage for persistence
      try {
        localStorage.setItem('pouchCategories', JSON.stringify(updated));
        console.log('[AddCategories] Saved to localStorage');
      } catch (error) {
        console.error('[AddCategories] Failed to save to localStorage:', error);
      }
      
      return updated;
    });
    
    // Show success message
    const catNames = selectedCategoryQuantities.map(c => c.category).join(', ');
    toast.success(`Added ${selectedCategoryQuantities.length} categories (${catNames}) to pouch ${lastPouch.bagName}`);
    
    // Reset selected categories
    setSelectedCategory('');
    setSelectedCategoryQuantities([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[AddFiling] Starting form submission');
    console.log('Current pouch weights:', pouchWeights);
    console.log('Current bags:', bags);
    console.log('Current pouch categories (before localStorage check):', pouchCategories);
    
    try {
      if (bags.length === 0) {
        console.log('[AddFiling] No bags added');
        toast.error('Please add at least one bag');
        return;
      }
      
      // Initialize tracking variables
      let allSuccessful = true;
      const submissionResults: Array<{
        pouchNumber: number;
        success: boolean;
        message: string;
        data?: any;
        error?: any;
      }> = [];
      
      // Try to load pouch categories from localStorage if they're empty
      let currentPouchCategories = {...pouchCategories};
      console.log('[AddFiling] Current pouch categories before localStorage check:', currentPouchCategories);
      
      // Always try to get the latest data from localStorage (which might be more up-to-date)
      try {
        const savedCategoriesStr = localStorage.getItem('pouchCategories');
        if (savedCategoriesStr) {
          const savedCategories = JSON.parse(savedCategoriesStr);
          console.log('[AddFiling] Loaded pouch categories from localStorage:', savedCategories);
          currentPouchCategories = savedCategories;
        }
      } catch (error) {
        console.error('[AddFiling] Failed to load from localStorage:', error);
      }
      
      // Format the issued date and time
      const now = new Date();
      const combinedIssuedDateTime = now.toISOString();
      
      // Validate categories for each pouch before proceeding
      for (let i = 0; i < bags.length; i++) {
        const bag = bags[i];
        const pouchNumber = i + 1;
        
        // Create a sub-numbered filing ID for this pouch
        const subNumberedFilingId = `${formattedId}/${pouchNumber}`;
        let pouchCategoriesData = currentPouchCategories[bag.bagName] || [];
        console.log(`[AddFiling] Pouch categories for ${bag.bagName}:`, pouchCategoriesData);
        console.log('[AddFiling] All pouch categories:', currentPouchCategories);
        
        // Get the weight for this specific pouch
        const pouchWeight = parseFloat(pouchWeights[bag.bagName]?.toString() || '0');
        
        // Get the order details for this pouch
        const orderDetails = castingDetails.orders.find(o => o.Id === bag.order);
        const orderId = orderDetails?.Order_Id__c || '';
        const orderNumber = orderDetails?.Id__c || '';
        
        // Check if we have any categories for this pouch
        if (pouchCategoriesData.length === 0) {
          console.log(`[AddFiling] WARNING: No categories found for ${bag.bagName}. Please add categories before submitting.`);
          
          // Check if we have categories in localStorage that might not be in state
          try {
            const savedCategoriesStr = localStorage.getItem('pouchCategories');
            if (savedCategoriesStr) {
              const savedCategories = JSON.parse(savedCategoriesStr);
              if (savedCategories[bag.bagName] && savedCategories[bag.bagName].length > 0) {
                console.log(`[AddFiling] Found categories in localStorage for ${bag.bagName}:`, savedCategories[bag.bagName]);
                pouchCategoriesData = savedCategories[bag.bagName];
              }
            }
          } catch (error) {
            console.error('[AddFiling] Error loading categories from localStorage:', error);
          }
          
          // If still no categories found, show a toast message
          if (pouchCategoriesData.length === 0) {
            console.error(`[AddFiling] No categories found for ${bag.bagName}. Please add categories before submitting.`);
            toast.error(`Please add categories to ${bag.bagName} before submitting.`);
            throw new Error(`No categories found for ${bag.bagName}. Please add categories before submitting.`);
          }
        }
        
        // Map category data to the format expected by the API - include name and quantity only
        const formattedCategories = pouchCategoriesData.map(cat => {
          const categoryData = {
            name: cat.category,
            quantity: cat.quantity
          };
          console.log(`[AddFiling] Adding category '${cat.category}' with quantity ${cat.quantity} to ${bag.bagName}`);
          return categoryData;
        });
        
        console.log(`[AddFiling] Formatted categories for ${bag.bagName}:`, formattedCategories);
        console.log(`[AddFiling] Category names being added:`, formattedCategories.map((c: { name: string }) => c.name).join(', '));
        
        // Get the category data - assuming only one category per pouch for this format
        const categoryData = pouchCategoriesData[0] || { category: '', quantity: 0 };
        
        // Create the filing data for this specific pouch with category name and quantity at top level
        const filingData = {
          filingId: subNumberedFilingId,
          // Removed receivedWeight as requested
          issuedWeight: pouchWeight,
          receivedDate: receivedDate,
          issuedDate: combinedIssuedDateTime,
          orderId: orderId,            // Include order ID in the filing record
          orderNumber: orderNumber,     // Include order number in the filing record
          name: categoryData.category,  // Category name as direct property
          quantity: categoryData.quantity, // Category quantity as direct property
          pouches: [{
            pouchId: bag.bagName,
            orderId: orderId,
            weight: pouchWeight,
            name: categoryData.category,  // Category name as direct property in pouch too
            quantity: categoryData.quantity // Category quantity as direct property in pouch too
          }]
        };

        console.log(`[AddFiling] Filing data created with ${formattedCategories.length} categories for filing ID ${subNumberedFilingId}`);
        console.log(`[AddFiling] Categories included in filing data:`, formattedCategories.map((c: { name: string, quantity: number }) => `${c.name} (${c.quantity})`).join(', '));
        console.log(`[AddFiling] Submitting filing data for pouch ${pouchNumber}:`, JSON.stringify(filingData, null, 2));
        
        try {
          // Submit this pouch's filing data
          const response = await fetch(`${apiBaseUrl}/api/filing/create`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(filingData),
          });

          console.log(`[AddFiling] API Response status for pouch ${pouchNumber}:`, response.status);
          
          const result = await response.json();
          console.log(`[AddFiling] API Response data for pouch ${pouchNumber}:`, result);
          
          submissionResults.push({
            pouchNumber,
            success: response.ok && result.success,
            message: result.message || '',
            data: result
          });
          
          if (!response.ok || !result.success) {
            allSuccessful = false;
          }
        } catch (error: any) {
          console.error(`[AddFiling] Error submitting pouch ${pouchNumber}:`, error);
          submissionResults.push({
            pouchNumber,
            success: false,
            message: error.message || 'Failed to submit filing details',
            error
          });
          allSuccessful = false;
        }
      }

      // Show appropriate toast message based on results
      if (allSuccessful) {
        console.log('[AddFiling] All submissions successful:', submissionResults);
        toast.success(`Successfully created ${bags.length} filing records`);
        
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
        // Some submissions failed
        const successCount = submissionResults.filter(r => r.success).length;
        const failCount = submissionResults.filter(r => !r.success).length;
        
        console.error('[AddFiling] Some submissions failed:', submissionResults);
        toast.error(`${successCount} filings created, ${failCount} failed. Check console for details.`);
      }
    } catch (error: any) {
      console.error('[AddFiling] Error in handleSubmit:', error);
      toast.error(error.message || 'Failed to submit filing details');
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-6">Add Filing Details</h1>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4">Loading casting details...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <Label>Casting ID</Label>
                  <Input value={castingId || ''} disabled className="bg-gray-100" />
                </div>
                <div>
                  <Label>Filing ID</Label>
                  <Input value={formattedId} disabled className="bg-gray-100" />
                </div>
                <div>
                  <Label>Received Weight (g)</Label>
                  <Input 
                    type="number" 
                    value={receivedWeight} 
                    onChange={(e) => setReceivedWeight(parseFloat(e.target.value) || 0)}
                    disabled 
                    className="bg-gray-100" 
                  />
                </div>
                <div>
                  <Label>Received Date</Label>
                  <Input 
                    type="date" 
                    value={receivedDate} 
                    onChange={(e) => setReceivedDate(e.target.value)}
                    disabled 
                    className="bg-gray-100" 
                  />
                </div>
                <div>
                  <Label>Issued Date</Label>
                  <Input 
                    type="date" 
                    value={issuedDate} 
                    onChange={(e) => setIssuedDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Issued Time</Label>
                  <Input 
                    type="time" 
                    value={issuedTime} 
                    onChange={(e) => setIssuedTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-6 border p-4 rounded-lg">
                <h2 className="text-lg font-medium mb-4">Add Pouch Details</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label>Select Order</Label>
                    <Select value={selectedOrder} onValueChange={handleOrderSelect}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select an order" />
                      </SelectTrigger>
                      <SelectContent>
                        {castingDetails.orders.map((order) => (
                          <SelectItem key={order.Id} value={order.Id}>
                            {order.Order_Id__c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {selectedOrder && (
                  <div className="mt-4 border-t pt-4">
                    <Label>Select Category</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <Select value={selectedCategory} onValueChange={handleCategorySelect}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {selectedCategoryQuantities.length > 0 && (
                      <div className="mt-4">
                        <h3 className="text-sm font-medium mb-2">Selected Categories</h3>
                        <div className="space-y-2">
                          {selectedCategoryQuantities.map((cat) => (
                            <div key={cat.category} className="flex items-center space-x-4">
                              <span className="flex-1">{cat.category}</span>
                              <span className="text-sm text-gray-500">
                                ({cat.totalModels} models, {cat.totalPieces} total pieces)
                              </span>
                              <div className="w-32">
                                <Input
                                  type="number"
                                  min="0"
                                  max={cat.totalPieces}
                                  value={cat.quantity}
                                  step="1"
                                  onChange={(e) => handleQuantityChange(cat.category, parseInt(e.target.value) || 0)}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <div className="mt-2 text-sm text-green-600 font-medium">
                          {selectedCategoryQuantities.length > 0 ? (
                            <p>{selectedCategoryQuantities.length} categories selected. They will be added when you create a new pouch.</p>
                          ) : (
                            <p>Select categories before creating a pouch.</p>
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
                      const isCurrentlyEditing = currentEditingPouch === bag.bagName;
                      
                      console.log(`Rendering pouch ${bag.bagName}:`, {
                        orderDetails,
                        bagCategories,
                        weight: pouchWeights[bag.bagName],
                        isCurrentlyEditing
                      });
                      
                      return (
                        <div key={index} className="p-3 border-b">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="font-medium">{bag.bagName}</span>
                              <span className="text-gray-500 ml-2">
                                Order: {orderDetails ? orderDetails.Order_Id__c : bag.order}
                              </span>
                            </div>
                            <div className="flex items-center gap-4">
                              <div>
                                <Label>Weight (g)</Label>
                                <Input
                                  type="number"
                                  step="0.0001"
                                  value={pouchWeights[bag.bagName] || ''}
                                  onChange={(e) => handlePouchWeightChange(bag.bagName, parseFloat(e.target.value) || 0)}
                                  placeholder="Enter weight"
                                />
                              </div>
                              <Button
                                type="button"
                                className="bg-red-500 text-white"
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
          )}
        </div>
      </div>
    </div>
  );
}
