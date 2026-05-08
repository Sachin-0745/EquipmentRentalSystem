import toast from "react-hot-toast";

/**
 * Standardized error handler for frontend API calls
 * @param {Error} error - The error object from axios/fetch
 * @param {string} customMessage - Fallback message if no error message is found
 */
export const handleError = (error, customMessage = "Something went wrong") => {
  console.error("API Error Debug:", error);
  
  // Extract message from various possible locations in the response
  const message = 
    error.response?.data?.message || 
    error.response?.data?.error || 
    error.message || 
    customMessage;

  toast.error(message);
};
