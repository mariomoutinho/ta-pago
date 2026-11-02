/** A senha é preservada exatamente como digitada, inclusive espaços e Unicode. */
export const PASSWORD_MINIMUM_MESSAGE = 'Use pelo menos 6 caracteres na senha.';
export function passwordHasMinimum(value:string):boolean {
  return Array.from(value).length >= 6;
}
