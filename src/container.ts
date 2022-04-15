interface Factory<T> {
  create(): Promise<T>;
  dispose?: (service: T) => Promise<void>;
  readonly isSingleton?: boolean;
}

export class Container {
  protected readonly factories: { [name: string]: Factory<any> } = {};
  protected readonly resolvedInstances: { [name: string]: any[] } = {};

  public constructor(protected readonly parent?: Container) {}

  public registerFactory<T>(name: string, factory: Factory<T>) {
    this.factories[name] = factory;
  }

  public async resolve<T>(name: string): Promise<T> {
    if (
      typeof this.factories[name] !== 'undefined' &&
      this.factories[name].isSingleton !== false &&
      typeof this.resolvedInstances[name] !== 'undefined' &&
      this.resolvedInstances[name].length
    ) {
      return this.resolvedInstances[name][0];
    }

    if (typeof this.factories[name] !== 'undefined') {
      const instance = await this.factories[name].create();
      if (typeof this.resolvedInstances[name] === 'undefined') {
        this.resolvedInstances[name] = [];
      }

      this.resolvedInstances[name].push(instance);

      return instance;
    }

    if (typeof this.parent !== 'undefined') {
      return this.parent.resolve(name);
    }

    throw new Error(`Can't resolve service '${name}'`);
  }

  public async dispose() {
    for (const name in this.resolvedInstances) {
      if (typeof this.factories[name] === 'undefined') {
        continue;
      }

      const { dispose } = this.factories[name];
      if (typeof dispose === 'undefined') {
        continue;
      }

      for (const instance of this.resolvedInstances[name]) {
        await dispose(instance);
      }
    }
  }
}

export default Container;
