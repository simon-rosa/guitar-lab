/** Erreur levée par les modules encore à l'état de squelette. */
export class NotImplementedError extends Error {
  constructor(readonly featureId: string) {
    super(`Fonctionnalité « ${featureId} » pas encore implémentée (voir packages/features/src/registry.ts).`);
  }
}

export function notImplemented(featureId: string): never {
  throw new NotImplementedError(featureId);
}
