import { IPlating } from "@/interface/table.interface";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// Function to fetch grinding data from the server
export const fetchplatingData = async (): Promise<IPlating[]> => {
  try {
    const response = await fetch(`${apiUrl}/api/dull`);
    const result = await response.json();
    console.log("Raw API Response:", result);

    if (response.ok && result.success) {
      if (Array.isArray(result.data)) {
        return result.data.map((plating: any) => {
          // Log each record's raw data
            console.log("Processing plating record:", plating);

          return {
            id: plating.Name,
            issuedWeight: plating.Issued_Weight__c || 0,  // Updated to match server field
            issuedDate: plating.Issued_Date__c || '-',    // Updated to match server field
            receivedWeight: plating.Received_Weight__c || 0, // Updated to match server field
            receivedDate: plating.Received_Date__c || '-',  // Updated to match server field
            status: plating.status__c,           // Updated to match server field
            PlatingLoss: plating.Plating_loss__c || 0 // Calculate loss
          };
        });
      } else {
        console.error("Data is not an array:", result.data);
        return [];
      }
    } else {
      console.error("Failed to fetch plating records:", result.error);
      return [];
    }
  } catch (error) {
    console.error("Error in fetchplatingData:", error);
    throw error;
  }
};

export default fetchplatingData;
