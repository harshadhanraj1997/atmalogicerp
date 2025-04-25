import { IDeal } from "@/interface/table.interface";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;
// Function to fetch orders from the server
export const fetchDealData = async (): Promise<IDeal[]> => {
  try {
    console.log('Fetching data from:', `${apiUrl}/api/orders`);
    const response = await fetch(`${apiUrl}/api/orders`);
    console.log('Response status:', response.status);
    const result = await response.json();
    console.log("API Response:", result); // Log the entire response

    if (response.ok && result.success) {
      if (Array.isArray(result.data)) {
        return result.data.map((order: any) => {
          // Transform the order data to match the IDeal interface
          return {
            id: order.id,
            dealName: order.partyName,
            AdvanceMetal: order.advanceMetal || 0,
            tags: "Order",
            expectedEndDate: order.deliveryDate,
            product: order.category,
            createdDate: order.created_date || new Date().toISOString(),
            createdBy: order.created_by || '',
            status: order.status || 'Open',
            clientSheetPdf: order.pdfUrl || null
          };
        });
      } else {
        console.error("Data is not an array:", result.data);
        return [];
      }
    } else {
      console.error("Failed to fetch orders:", result.error);
      return [];
    }
  } catch (error) {
    console.error("Error in fetchDealData:", error);
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
