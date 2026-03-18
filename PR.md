## Summary
Introduce a new OpenAPI response visibility feature based on `x-display`, including schema-aware filtering with `$ref` support and validation guardrails for required-field checks on hidden paths.

## Type of Change
- [ ] Bug fix
- [x] New feature
- [ ] Breaking change
- [ ] Documentation update
- [x] Refactoring

## Related Issue
N/A

## Changes

### 1) Refactor `x-display` response filtering
- Updated: `core/plugin/link/utils/open_api_schema/response_filter.py`
- Added schema-driven `x-display` response filtering capability for OpenAPI JSON responses.
- Implemented recursive traversal with local `$ref` resolution (`#/components/...`) for nested/array schemas.
- Kept behavior contract explicit:
  - Remove fields marked with `x-display: false` (supports boolean `false` and string `"false"`).
  - If all children under an object/array container are hidden, keep structural type and return empty `{}` / `[]`.
- Added/kept compatibility helpers:
  - Hidden path collection (`get_need_be_poped_list`).
  - Validation error ignore decision for hidden required fields (`should_ignore_validation_error_by_x_display`).

### 2) Adjust HTTP execution flow: validate first, then filter
- Updated: `core/plugin/link/service/community/tools/http/execution_server.py`
- Added end-to-end response processing flow for the new feature: validate first, then apply visibility filtering.
- Applied filtering after validation in both request handling and tool debug paths.
- Integrated missing-visible-field detection and hidden-field-aware ignore logic into validation flow.
- Preserved existing exception handling and telemetry behavior.

### 3) Add focused unit tests
- Added: `core/plugin/link/tests/unit/test_response_filter.py`
- Covered scenarios:
  - Hidden field removal and parent-hidden precedence for object fields.
  - Array container behavior: hide all elements when item schema is `x-display: false`.
  - Keep empty object items in arrays when child fields are hidden.
  - `$ref`-based schema resolution in filtering and missing-visible-path checks.
  - Required-field validation ignore checks for hidden fields.

## Testing
- [x] New tests added (unit)
- [ ] Existing full test suite executed
- [ ] Manual testing completed

Test scope added in this PR:
- `test_filter_parent_hidden_takes_precedence`
- `test_filter_keeps_empty_object_elements_in_array`
- `test_filter_hides_array_elements_when_items_closed`
- `test_filter_ref_items_closed_hides_all_elements`
- `test_missing_visible_declared_paths_with_ref`

## Compatibility / Risk
- No API contract change in request shape.
- Response payload visibility now supports declarative control via schema `x-display`.
- Potential behavior change: previously returned hidden fields may now be removed or collapsed to `{}` / `[]` per schema.
- Risk is controllable and covered by focused unit tests around nested arrays, refs, and required-field validation edge cases.

## Rollback Plan
If regressions are found:
1. Revert `response_filter.py` implementation to the previous filtering logic.
2. Revert execution order changes in `execution_server.py`.

## Checklist
- [x] Code follows project coding standards
- [x] Self-review completed
- [x] Documentation/comments updated where needed
- [x] No breaking changes introduced

