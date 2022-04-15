export interface IFactory<T> {
  create(): T;
}

export interface IAsyncFactory<T> {
  create(): Promise<T>;
}
