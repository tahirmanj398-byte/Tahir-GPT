export async function autoRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      console.warn(`[Auto-Debug System] Attempt ${attempt} failed. Auto-fixing and retrying in ${delayMs}ms...`, error.message || error);
      lastError = error;
      
      // Do not retry if it's a strict client error (like invalid API key or bad request)
      if (error?.status === 401 || error?.status === 403 || error?.status === 400) {
        throw error;
      }
      
      if (attempt < maxRetries) {
        // Exponential backoff: wait longer after each failed attempt
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  
  console.error('[Auto-Debug System] All automatic recovery attempts failed.');
  throw lastError;
}
