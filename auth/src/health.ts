class HealthState {
  private mongoReady = false;

  setMongoReady(): void {
    this.mongoReady = true;
  }

  setMongoNotReady(): void {
    this.mongoReady = false;
  }

  isReady(): boolean {
    return this.mongoReady;
  }
}

export const healthState = new HealthState();
