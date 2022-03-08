import wakabaTripcode from 'tripcode';
import ITripcodeGenerator from './models/tripcode-generator';

export class WakabaTripcodeGenerator implements ITripcodeGenerator {
  createTripcode(name: string): { name: string; tripcode: string } {
    const index = name.indexOf('#');
    if (index === -1) {
      return { name, tripcode: '' };
    }

    const password = name.substring(index + 1);
    name = name.substring(0, index);

    const tripcode = wakabaTripcode(password);
    return { name, tripcode };
  }
}

export default WakabaTripcodeGenerator;
