import { IPlating } from "@/interface/table.interface";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

// Function to fetch plating data from the server
export const fetchPlatingData = async (): Promise<IPlating[]> => {
  try {
    const response = await fetch(`${apiBaseUrl}/api/plating`);
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || 'Failed to fetch plating data');
    }

    // Log the response for debugging
    console.log('[Plating Data] API Response:', result);

    // Ensure we return an array even if the data is empty
    return result.data || [];

  } catch (error) {
    console.error('[Plating Data] Error:', error);
    throw error;
  }
};

// Function to update plating status
export const updatePlatingStatus = async (platingId: string) => {
  try {
    const response = await fetch(`${apiBaseUrl}/api/plating/${platingId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || 'Failed to update plating status');
    }

    return result.data;
  } catch (error) {
    console.error('[Plating Status Update] Error:', error);
    throw error;
  }
};

// Function to delete plating record
export const deletePlating = async (platingId: string) => {
  try {
    const response = await fetch(`${apiBaseUrl}/api/plating/${platingId}`, {
      method: 'DELETE',
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || 'Failed to delete plating record');
    }

    return true;
  } catch (error) {
    console.error('[Plating Delete] Error:', error);
    throw error;
  }
};

export default fetchPlatingData;
