import { DepartmentLosses } from "@/interface/table.interface";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// Function to fetch department losses data from the server
export const fetchDepartmentLosses = async (startDate: string, endDate: string): Promise<DepartmentLosses> => {
  try {
    // Format dates to YYYY-MM-DD for the API
    const formattedStartDate = new Date(startDate).toISOString().split('T')[0];
    const formattedEndDate = new Date(endDate).toISOString().split('T')[0];

    console.log('Fetching department losses data:', { formattedStartDate, formattedEndDate });
    
    const response = await fetch(
      `${apiUrl}/api/department-losses?startDate=${formattedStartDate}&endDate=${formattedEndDate}`
    );
    const result = await response.json();
    console.log("Raw API Response:", result);

    if (response.ok && result.success) {
      console.log("Processing department losses data:", result.data);
      return {
        data: result.data,
        summary: result.summary
      };
    } else {
      console.error("Failed to fetch department losses:", result.error);
      return {
        data: {
          casting: [],
          filing: [],
          grinding: [],
          setting: [],
          polishing: [],
          dull: []
        },
        summary: {
          totalCastingLoss: 0,
          totalFilingLoss: 0,
          totalGrindingLoss: 0,
          totalSettingLoss: 0,
          totalPolishingLoss: 0,
          totalDullLoss: 0,
          totalOverallLoss: 0
        }
      };
    }
  } catch (error) {
    console.error("Error in fetchDepartmentLosses:", error);
    throw error;
  }
};