import { Billing } from "@/interface/table.interface";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// Function to fetch billing data from the server
export const fetchBillingData = async (): Promise<Billing[]> => {
  try {
    console.log('Fetching billing data from:', `${apiUrl}/api/billing`);
    
    const response = await fetch(`${apiUrl}/api/billing`);
    const result = await response.json();
    console.log("Raw API Response:", result);

    if (response.ok && result.success) {
      if (Array.isArray(result.data)) {
        console.log("Processing billing data:", result.data);
        
        return result.data.map((billing: any) => {
          console.log("Processing billing record:", billing);
          
          const transformedBilling = {
            id: billing.id,
            PartyName: billing.PartyName || '',
            createdDate: billing.createdDate || '',
            totalFineWeight: billing.totalFineWeight || 0,
            DeliveryChallanUrl: billing.DeliveryChallanUrl || '',
            TaxInvoiceUrl: billing.TaxInvoiceUrl || ''
          };
          
          console.log("Transformed billing:", transformedBilling);
          return transformedBilling;
        });
      } else {
        console.error("Data is not an array:", result.data);
        return [];
      }
    } else {
      console.error("Failed to fetch billings:", result.error);
      return [];
    }
  } catch (error) {
    console.error("Error in fetchBillingData:", error);
    throw error;
  }
};

// You can remove the fallback static data since we're getting it from the API now
