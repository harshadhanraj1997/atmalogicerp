import { ICasting } from "@/interface/table.interface";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// Function to fetch casting data from the server
export const fetchDealData = async (): Promise<ICasting[]> => {
  try {
    const response = await fetch(`${apiUrl}/api/casting`);
    const result = await response.json();
    console.log("API Response:", result); // Log the entire response

    if (response.ok && result.success) {
      if (Array.isArray(result.data)) {
        return result.data.map((casting: any) => {
          // Transform the casting data to match the ICasting interface
          return {
            id: casting.Name,
            issuedWeight: casting.Issued_weight || 0,
            receivedWeight: casting.Received_Weight || 0,
            issuedDate: casting.Issued_Date || '-',
            receivedDate: casting.Received_Date || '-',
            status: casting.status || 'Open',
            castingLoss: casting.Casting_Loss || 0,
            ornamentWeight: casting.Ornament_Weight || 0,
            scrapWeight: casting.Scrap_Weight || 0,
            dustWeight: casting.Dust_Weight || 0
          };
        });
      } else {
        console.error("Data is not an array:", result.data);
        return [];
      }
    } else {
      console.error("Failed to fetch castings:", result.error);
      return [];
    }
  } catch (error) {
    console.error("Error in fetchDealData:", error);
    throw error;
  }
};

// You can remove the fallback static data since we're getting it from the API now
