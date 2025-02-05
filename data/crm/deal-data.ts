import { IDeal } from "@/interface/table.interface";

// Function to fetch orders from the server
export const fetchDealData = async (): Promise<IDeal[]> => {
  console.log('fetchDealData: Starting API call...'); // Debug log 1
  
  try {
    console.log('Attempting to fetch from:', 'https://needha-erp-server.onrender.com/api/orders'); // Debug log 2
    
    const response = await fetch('https://needha-erp-server.onrender.com/api/orders');
    console.log('API Response status:', response.status); // Debug log 3
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Raw API response data:', data); // Debug log 4
    
    // Transform the API response to match IDeal interface
    console.log('Starting data transformation...'); // Debug log 5
    const transformedData: IDeal[] = data.map((order: any) => {
      const transformed = {
        id: order.id,
        dealName: order.partyName,
        AdvanceMetal: order.advanceMetal || 0,
        tags: "Order",
        expectedEndDate: order.deliveryDate,
        status: order.status || 'Open',
        clientSheetPdf: order.clientSheetPdf || null,
      };
      console.log('Transformed order:', transformed); // Debug log 6
      return transformed;
    });

    console.log('Final transformed data:', transformedData); // Debug log 7
    return transformedData;
    
  } catch (error) {
    console.error('Error in fetchDealData:', error); // Debug log 8
    console.log('Error details:', {
      message: (error as Error).message,
      stack: (error as Error).stack
    }); // Debug log 9
    throw error;
  }
};

// Fallback static data in case the API fails
/*export const dealData: IDeal[] = [
  {
    id: "D-001",
    dealName: "Loading...",
    phase: "Active",
    dealAmount: 0,
    tags: "Loading",
    expectedEndDate: "-",
    owner: "Loading...",
    phone: "-",
    chances: "Medium",
    status: "Open",
  }
]

console.log('deal-data.ts loaded, fallback data ready'); // Debug log 10*/
