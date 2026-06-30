export class HealthState<TKey extends string = string> {
  private readiness = new Map<TKey, boolean>();

  constructor(keys: TKey[]) {
    keys.forEach((key) => this.readiness.set(key, false));
  }

  setReady(key: TKey): void {
    this.readiness.set(key, true);
  }

  setNotReady(key: TKey): void {
    this.readiness.set(key, false);
  }

  isCheckReady(key: TKey): boolean {
    return this.readiness.get(key) ?? false;
  }

  isReady(): boolean {
    return [...this.readiness.values()].every(Boolean);
  }

  getStatus(): Record<TKey, boolean> {
    return Object.fromEntries(this.readiness) as Record<TKey, boolean>;
  }
}
