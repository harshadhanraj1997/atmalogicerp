import { ITagging } from "@/interface/table.interface";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// Function to fetch casting data from the server
export const fetchTaggingData = async (): Promise<ITagging[]> => {
  try {
    const response = await fetch(`${apiUrl}/api/tagging`);
    const result = await response.json();
    console.log("API Response:", result);

    if (response.ok && result.success) {
      if (Array.isArray(result.data)) {
        return result.data.map((tagging: any) => {
          return {
            id: tagging.taggingId,
            PartyName: tagging.partyCode || '',
            createdDate: tagging.createdDate || '',
            TotalWeight: tagging.totalGrossWeight || 0,
            TotalNetWeight: tagging.totalNetWeight || 0,
            TotalStoneWeight: tagging.totalStoneWeight || 0,  
            TotalStoneCharges: tagging.totalStoneCharges || 0,
            pdfUrl: tagging.pdfUrl || '',
            excelUrl: tagging.excelUrl || ''
          };
        });
      } else {
        console.error("Data is not an array:", result.data);
        return [];
      }
    } else {
      console.error("Failed to fetch tagging data:", result.error);
      return [];
    }
  } catch (error) {
    console.error("Error in fetchTaggingData:", error);
    throw error;
  }
};

// You can remove the fallback static data since we're getting it from the API now
