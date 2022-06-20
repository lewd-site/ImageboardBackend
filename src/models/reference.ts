export interface PostReferenceDto {
  readonly source_id: number;
  readonly source_parent_id: number | null;
  readonly target_id: number;
  readonly target_parent_id: number | null;
}

export interface PostReference {
  readonly sourceId: number;
  readonly sourceParentId: number | null;
  readonly targetId: number;
  readonly targetParentId: number | null;
}

export function getPostReferenceData(reference: PostReference): PostReferenceDto {
  return {
    source_id: reference.sourceId,
    source_parent_id: reference.sourceParentId,
    target_id: reference.targetId,
    target_parent_id: reference.targetParentId,
  };
}

export default PostReference;
