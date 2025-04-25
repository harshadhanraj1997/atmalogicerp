import { IDull } from "@/interface/table.interface";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// Function to fetch grinding data from the server
export const fetchDullData = async (): Promise<IDull[]> => {
  try {
    const response = await fetch(`${apiUrl}/api/dull`);
    const result = await response.json();
    console.log("Raw API Response:", result);

    if (response.ok && result.success) {
      if (Array.isArray(result.data)) {
        return result.data.map((dull: any) => {
          // Log each record's raw data
            console.log("Processing polishing record:", dull);

          return {
            id: dull.Name,
            issuedWeight: dull.Issued_Weight__c || 0,  // Updated to match server field
            issuedDate: dull.Issued_Date__c || '-',    // Updated to match server field
            receivedWeight: dull.Returned_weight__c || 0, // Updated to match server field
            receivedDate: dull.Received_Date__c || '-',  // Updated to match server field
            status: dull.status__c,           // Updated to match server field
            dullLoss: dull.Dull_loss__c || 0 // Calculate loss
          };
        });
      } else {
        console.error("Data is not an array:", result.data);
        return [];
      }
    } else {
      console.error("Failed to fetch dull records:", result.error);
      return [];
    }
  } catch (error) {
    console.error("Error in fetchDullData:", error);
    throw error;
  }
};

export default fetchDullData;
