/**
 * Debounce function to limit the rate of function execution
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle function to limit the rate of function execution
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Create a cancelable promise for async operations
 */
export const createCancelablePromise = <T>(
  promise: Promise<T>
): { promise: Promise<T>; cancel: () => void } => {
  let isCanceled = false;

  const wrappedPromise = new Promise<T>((resolve, reject) => {
    promise
      .then(value => {
        if (!isCanceled) {
          resolve(value);
        }
      })
      .catch(error => {
        if (!isCanceled) {
          reject(error);
        }
      });
  });

  return {
    promise: wrappedPromise,
    cancel: () => {
      isCanceled = true;
    },
  };
};

/**
 * Batch function calls to improve performance
 */
export const batchCalls = <T>(
  func: (items: T[]) => void,
  batchSize: number = 10,
  delay: number = 100
) => {
  let batch: T[] = [];
  let timeout: NodeJS.Timeout | null = null;

  const processBatch = () => {
    if (batch.length > 0) {
      func([...batch]);
      batch = [];
    }
    timeout = null;
  };

  return (item: T) => {
    batch.push(item);

    if (batch.length >= batchSize) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      processBatch();
    } else if (!timeout) {
      timeout = setTimeout(processBatch, delay);
    }
  };
};