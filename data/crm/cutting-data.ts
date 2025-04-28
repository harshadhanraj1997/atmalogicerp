import { ICutting } from "@/interface/table.interface";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// Function to fetch grinding data from the server
export const fetchcuttingData = async (): Promise<ICutting[]> => {
  try {
    const response = await fetch(`${apiUrl}/api/cutting`);
    const result = await response.json();
    console.log("Raw API Response:", result);

    if (response.ok && result.success) {
      if (Array.isArray(result.data)) {
        return result.data.map((cutting: any) => {
          // Log each record's raw data
            console.log("Processing plating record:", cutting);

          return {
            id: cutting.Name,
            issuedWeight: cutting.Issued_Weight__c || 0,  // Updated to match server field
            issuedDate: cutting.Issued_Date__c || '-',    // Updated to match server field
            returnedWeight: cutting.Returned_Weight__c || 0, // Updated to match server field
            receivedDate: cutting.Received_Date__c || '-',  // Updated to match server field
            status: cutting.status__c,   
            product: cutting.Product__c || 'N/A',
            quantity: cutting.Quantity__c || 0,
            OrderId : cutting.Order_Id__c || 'N/A',
            
            CuttinfLoss: cutting.Cutting_loss__c || 0 // Calculate loss
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

export default fetchcuttingData;
