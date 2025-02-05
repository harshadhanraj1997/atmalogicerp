import { IDeal } from "@/interface/table.interface";

// Function to fetch orders from the server
export const fetchDealData = async (): Promise<IDeal[]> => {
  console.log('fetchDealData: Starting API call...'); // Debug log 1
  
  try {
    console.log('Attempting to fetch from:', '/api/orders'); // Debug log 2
    
    const response = await fetch('https://needha-erp-server.onrender.com/api/orders');
    const result = await response.json();
    console.log('API Response:', result.data); // Debug log 3

    if (response.ok && result.success) {
      if (Array.isArray(result.data)) {
        console.log('Raw API response data:', result.data); // Debug log 4
        
        // Transform the API response to match IDeal interface
        console.log('Starting data transformation...'); // Debug log 5
        const transformedData: IDeal[] = result.data.map((order: any) => {
          const transformed = {
            id: order.id,
            dealName: order.partyName,
            AdvanceMetal: order.advanceMetal || 0,
            tags: "Order",
            expectedEndDate: order.deliveryDate,
            status: order.status || 'Open',
            clientSheetPdf: order.pdfUrl || null,
          };
          console.log('Transformed order:', transformed); // Debug log 6
          return transformed;
        });

        console.log('Final transformed data:', transformedData); // Debug log 7
        return transformedData;
      } else {
        console.error("Data is not an array:", result.data);
        return [];
      }
    } else {
      console.error("Failed to fetch orders:", result.error);
      return [];
    }
    
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
