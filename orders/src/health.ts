class HealthState {
  private mongoReady = false;
  private natsReady = false;

  setMongoReady(): void {
    this.mongoReady = true;
  }

  setMongoNotReady(): void {
    this.mongoReady = false;
  }

  setNatsReady(): void {
    this.natsReady = true;
  }

  setNatsNotReady(): void {
    this.natsReady = false;
  }

  isMongoReady(): boolean {
    return this.mongoReady;
  }

  isNatsReady(): boolean {
    return this.natsReady;
  }

  isReady(): boolean {
    return this.mongoReady && this.natsReady;
  }
}

export const healthState = new HealthState();
