export type RelationMutationErrorCode =
  | 'MISSING_RELATION_TYPE'
  | 'SELF_RELATION'
  | 'INVALID_WEIGHT'
  | 'INVALID_STRENGTH'
  | 'DUPLICATE_RELATION';

export class RelationMutationError extends Error {
  constructor(
    public readonly code: RelationMutationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'RelationMutationError';
  }
}
