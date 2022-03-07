export interface ITripcodeGenerator {
  createTripcode(name: string): { name: string; tripcode: string };
}

export default ITripcodeGenerator;
