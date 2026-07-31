import type { ValidationResult } from './errors';
import type { SourceData, ViewSpec } from './model';
import { validateViewSpec } from './validation';

/** Applies the canonical ViewSpec validator as the command commit invariant gate. */
export function validateEditorInvariants(
  sourceData: SourceData,
  viewSpec: ViewSpec,
): ValidationResult<ViewSpec> {
  return validateViewSpec(viewSpec, sourceData);
}
