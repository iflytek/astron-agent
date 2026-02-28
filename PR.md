## Summary
Refactor OpenAPI response filtering for `x-display`, clarify validation/filter order in HTTP execution flow, and add unit tests for key edge cases.

## Type of Change
- [x] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update
- [x] Refactoring

## Related Issue
N/A

## Changes

### 1) Refactor `x-display` response filtering
- Updated: `core/plugin/link/utils/open_api_schema/response_filter.py`
- Replaced path-trie pruning with JSONPath-based filtering via `jsonpath-rw`.
- Kept behavior contract explicit:
  - Remove fields marked with `x-display: false`.
  - If all children under an object/array container are hidden, keep structural type and return empty `{}` / `[]`.

### 2) Adjust HTTP execution flow: validate first, then filter
- Updated: `core/plugin/link/service/community/tools/http/execution_server.py`
- Ensured response schema validation is executed before `x-display` filtering.
- Applied filtering after validation in both request handling and tool debug paths.
- Preserved existing exception handling and telemetry behavior.

### 3) Strengthen schema validation guardrails
- Updated: `core/plugin/link/utils/open_api_schema/schema_validate.py`
- Added defensive handling for non-string `openapi` version values before regex checks.

### 4) Dependency update
- Updated: `core/plugin/link/pyproject.toml`
- Added dependency: `jsonpath-rw>=1.4.0`

### 5) Add focused unit tests
- Added: `core/plugin/link/tests/unit/test_response_filter.py`
- Covered scenarios:
  - Hidden field removal.
  - Hidden field pruning in array items.
  - All-hidden object container returns `{}`.
  - All-hidden array container returns `[]`.

## Testing
- [x] New tests added (unit)
- [ ] Existing full test suite executed
- [ ] Manual testing completed

Test scope added in this PR:
- `test_filter_hidden_field`
- `test_filter_hidden_field_in_array_items`
- `test_all_hidden_object_replaced_with_empty_object`
- `test_all_hidden_array_replaced_with_empty_array`

## Compatibility / Risk
- No API contract change in request shape.
- Response visibility now strictly follows schema `x-display` after validation.
- Low risk: behavior is constrained to response post-processing and covered by unit tests.

## Rollback Plan
If regressions are found:
1. Revert `response_filter.py` implementation to the previous filtering logic.
2. Revert execution order changes in `execution_server.py`.
3. Remove `jsonpath-rw` from dependency list if no longer needed.

## Checklist
- [x] Code follows project coding standards
- [x] Self-review completed
- [x] Documentation/comments updated where needed
- [x] No breaking changes introduced

