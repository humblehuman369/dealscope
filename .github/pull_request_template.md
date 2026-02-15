## Summary

<!-- 1-3 bullet points describing the change -->

## Type of Change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Refactoring (no functional changes)
- [ ] Documentation update

## Cross-Platform Impact

<!-- REQUIRED: Check all that apply. Frontend ↔ Mobile parity is critical. -->

- [ ] **Frontend only** — No mobile impact
- [ ] **Mobile only** — No frontend impact
- [ ] **Both platforms affected** — Changes require corresponding updates to maintain parity
- [ ] **Shared types/constants affected** — Update `shared/` package and both consumers
- [ ] **Backend API change** — Frontend AND mobile may need updates

### If both platforms are affected:

- [ ] I have updated the corresponding code in the other platform
- [ ] I have verified type alignment between platforms
- [ ] I have run `scripts/parity-check.sh` and it passes

### If this is a backend API change:

- [ ] Frontend API client has been updated
- [ ] Mobile API client has been updated
- [ ] Shared types have been updated (if applicable)

## Areas Affected

<!-- Check which systems this change touches -->

- [ ] Financial calculations (mortgage, NOI, cap rate, CoC, DSCR, IRR)
- [ ] Deal scoring / grading
- [ ] Strategy worksheets
- [ ] Deal Maker
- [ ] IQ Target / Verdict
- [ ] Design tokens / theme
- [ ] Authentication / user profile
- [ ] API services / data flow
- [ ] State management (Zustand stores)
- [ ] Navigation / routing

## Test Plan

<!-- How did you verify this change works correctly? -->

- [ ] Manual testing on affected platform(s)
- [ ] Cross-platform test fixtures pass (`shared/test-fixtures/`)
- [ ] Parity check passes (`scripts/parity-check.sh`)
- [ ] No linter errors introduced

## Screenshots / Recordings

<!-- If this change affects UI, include before/after screenshots -->

## Notes for Reviewers

<!-- Any context that would help review this PR -->
