export class ActiveRunExistsError extends Error {
  constructor() {
    super("An active run already exists.");
    this.name = "ActiveRunExistsError";
  }
}

export class RunConflictError extends Error {
  constructor() {
    super("The active run changed. Reload it before trying again.");
    this.name = "RunConflictError";
  }
}

export class RunLockedError extends Error {
  constructor(public readonly expiresAt: string) {
    super("The active run is being used by another device.");
    this.name = "RunLockedError";
  }
}

export class RunNotFoundError extends Error {
  constructor() {
    super("No active run was found.");
    this.name = "RunNotFoundError";
  }
}

export class UnsupportedRunSchemaError extends Error {
  constructor() {
    super("The saved run uses an unsupported schema.");
    this.name = "UnsupportedRunSchemaError";
  }
}

export class RunStorageUnavailableError extends Error {
  constructor() {
    super("Run storage is temporarily unavailable.");
    this.name = "RunStorageUnavailableError";
  }
}
