import { ISetting } from "@/interface/table.interface";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// Function to fetch grinding data from the server
export const fetchSettingData = async (): Promise<ISetting[]> => {
  try {
    const response = await fetch(`${apiUrl}/api/setting`);
    const result = await response.json();
    console.log("Raw API Response:", result);

    if (response.ok && result.success) {
      if (Array.isArray(result.data)) {
        return result.data.map((setting: any) => {
          // Log each record's raw data
          console.log("Processing setting record:", setting);

          return {
            id: setting.Name,
            issuedWeight: setting.Issued_Weight__c || 0,  // Updated to match server field
            issuedDate: setting.Issued_Date__c || '-',    // Updated to match server field
            receivedWeight: setting.Returned_weight__c || 0,
            receivedDate: setting.Received_Date__c || '-',  // Updated to match server field
            status: setting.status__c,  
            product: setting.Product__c || 'N/A',
            quantity: setting.Quantity__c || 0,
            orderId: setting.Order_Id__c || '',
            stoneWeight: setting.Stone_Weight__c || 0,
            grindingLoss: setting.Setting_l__c || 0 // Calculate loss
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

export default fetchSettingData;
