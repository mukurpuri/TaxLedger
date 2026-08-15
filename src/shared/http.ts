import { ValidationError } from './errors';

export function requireParam(value: string | undefined, name: string): string {
  if (!value) {
    throw new ValidationError(`${name} is required`);
  }
  return value;
}
