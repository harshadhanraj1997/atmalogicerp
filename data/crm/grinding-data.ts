import { IFiling } from "@/interface/table.interface";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// Function to fetch grinding data from the server
export const fetchGrindingData = async (): Promise<IFiling[]> => {
  try {
    const response = await fetch(`${apiUrl}/api/grinding`);
    const result = await response.json();
    console.log("Raw API Response:", result);

    if (response.ok && result.success) {
      if (Array.isArray(result.data)) {
        return result.data.map((grinding: any) => {
          // Log each record's raw data
          console.log("Processing grinding record:", grinding);

          return {
            id: grinding.Name,
            issuedWeight: grinding.Issued_Weight__c || 0,  // Updated to match server field
            issuedDate: grinding.Issued_Date__c || '-',    // Updated to match server field
            receivedWeight: grinding.Received_Weight__c || 0, // Updated to match server field
            receivedDate: grinding.Received_Date__c || '-',  // Updated to match server field
            status: grinding.status__c,
            product: grinding.Product__c || 'N/A',
            quantity: grinding.Quantity__c || 0,
            orderId : grinding.Order_Id__c || '',
            grindingLoss: grinding.Grinding_loss__c || 0 // Calculate loss
          };
        });
      } else {
        console.error("Data is not an array:", result.data);
        return [];
      }
    } else {
      console.error("Failed to fetch grinding records:", result.error);
      return [];
    }
  } catch (error) {
    console.error("Error in fetchGrindingData:", error);
    throw error;
  }
};

export default fetchGrindingData;
