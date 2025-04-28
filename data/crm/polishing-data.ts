import { IPolishing } from "@/interface/table.interface";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// Function to fetch grinding data from the server
export const fetchPolishingData = async (): Promise<IPolishing[]> => {
  try {
    const response = await fetch(`${apiUrl}/api/polishing`);
    const result = await response.json();
    console.log("Raw API Response:", result);

    if (response.ok && result.success) {
      if (Array.isArray(result.data)) {
        return result.data.map((polishing: any) => {
          // Log each record's raw data
            console.log("Processing polishing record:", polishing);

          return {
            id: polishing.Name,
            issuedWeight: polishing.Issued_Weight__c || 0,  // Updated to match server field
            issuedDate: polishing.Issued_Date__c || '-',    // Updated to match server field
            receivedWeight: polishing.Received_Weight__c || 0, // Updated to match server field
            receivedDate: polishing.Received_Date__c || '-',  // Updated to match server field
            status: polishing.status__c,           // Updated to match server field
            product: polishing.Product__c || 'N/A',
            orderId: polishing.
            Order_Id__c
             || '',
            quantity: polishing.Quantity__c || 0,
            polishingLoss: polishing.Polishing_loss__c || 0 // Calculate loss
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

export default fetchPolishingData;
