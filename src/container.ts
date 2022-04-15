interface Factory<T> {
  create(): Promise<T>;
  readonly isSingleton?: boolean;
}

export class Container {
  protected readonly factories: { [name: string]: Factory<any> } = {};
  protected readonly services: { [name: string]: any } = {};

  public constructor(protected readonly parent?: Container) {}

  public registerFactory<T>(name: string, factory: Factory<T>) {
    this.factories[name] = factory;
  }

  public async resolve<T>(name: string): Promise<T> {
    if (typeof this.services[name] !== 'undefined') {
      return this.services[name];
    }

    if (typeof this.factories[name] !== 'undefined') {
      const service = await this.factories[name].create();
      if (this.factories[name].isSingleton !== false) {
        this.services[name] = service;
      }

      return service;
    }

    if (typeof this.parent !== 'undefined') {
      return this.parent.resolve(name);
    }

    throw new Error(`Can't resolve service '${name}'`);
  }
}

export default Container;
