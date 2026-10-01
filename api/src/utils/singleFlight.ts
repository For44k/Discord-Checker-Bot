type PendingPromise = {
  promise: Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
};

export class SingleFlight {
  private pending: Map<string, PendingPromise> = new Map();

  async do<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = this.pending.get(key);
    if (existing) {
      return existing.promise as Promise<T>;
    }

    let resolve: (value: unknown) => void;
    let reject: (reason: unknown) => void;
    const promise = new Promise<unknown>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    const pending: PendingPromise = {
      promise,
      resolve: resolve!,
      reject: reject!,
    };

    this.pending.set(key, pending);

    try {
      const result = await fn();
      pending.resolve(result);
      return result;
    } catch (error) {
      pending.reject(error);
      throw error;
    } finally {
      this.pending.delete(key);
    }
  }
}

export const singleFlight = new SingleFlight();
