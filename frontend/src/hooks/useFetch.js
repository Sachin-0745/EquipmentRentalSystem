import { useState, useCallback } from "react";
import API from "../services/api";
import { handleError } from "../utils/errorHandler";

/**
 * Custom hook for consistent fetching, loading states, and error handling
 * @param {string} url - The API endpoint to fetch from
 * @param {any} initialData - Initial state for the data
 */
export const useFetch = (url, initialData = []) => {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState(null);

  const fetchData = useCallback(async (page = 1, limit = 12) => {
    if (!url) return;
    setLoading(true);
    try {
      // Append pagination params if they are not already in the URL
      const separator = url.includes("?") ? "&" : "?";
      const fetchUrl = `${url}${separator}page=${page}&limit=${limit}`;
      
      const res = await API.get(fetchUrl);
      
      // Support both paginated and non-paginated responses
      if (res.data?.pagination) {
        setData(res.data.data || []);
        setPagination(res.data.pagination);
      } else {
        setData(res.data?.data || res.data || []);
        setPagination(null);
      }
    } catch (err) {
      handleError(err, `Failed to load data from ${url}`);
    } finally {
      setLoading(false);
    }
  }, [url]);

  return { data, setData, loading, pagination, fetchData };
};
