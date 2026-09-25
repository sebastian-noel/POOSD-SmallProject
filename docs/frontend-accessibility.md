# Frontend redesign and accessibility checks

Verified locally on September 25, 2026 with the real PHP 8.3 API and an isolated
MySQL 8.4 database containing synthetic test accounts. The frontend remains plain
HTML/CSS/JavaScript and requires no build step.

## Design and behavior

- Shared gray-green surfaces, forest actions, system typography, and SVG icons.
- Responsive sign-in, registration, and contact list, including labeled mobile rows.
- Inline contact editor with focus on the first field and focus restoration on close.
- Native delete confirmation initially focuses Keep contact; Escape cancels it.
- Visible keyboard focus, skip links, explicit labels, optional-field labels,
  autocomplete, password visibility, and announced request results.
- Loading placeholders, retry actions, separate empty/search-empty states, and
  preservation of form entries after failed saves.
- Short opacity/transform feedback. The `prefers-reduced-motion: reduce` rule
  disables animations and transitions; its implementation was inspected. An
  operating-system reduced-motion setting was not toggled during this run.

## Automated accessibility checks

axe-core 4.13.0 ran against the served application with WCAG 2 A/AA, 2.1 A/AA,
2.2 AA, and best-practice tags. The development-only audit harness and axe script
were kept outside the repository and are not deployment dependencies.

| Screen/state | Viewport | Violations | Passing rules |
| --- | --- | --- | --- |
| Contacts, populated list | Desktop | 0 | 46 |
| Contacts, open editor | Desktop | 0 | 47 |
| Contacts, populated list | 390px | 0 | 46 |
| Sign in | Desktop | 0 | 35 |
| Sign in | 390px | 0 | 35 |
| Create account | Desktop | 0 | 35 |
| Create account | 320px | 0 | 35 |

On desktop authentication screens, axe marked the decorative sample contact's
contrast as needing manual review because a background pseudo-element overlaps
its bounds. Computed foreground/background tokens were checked separately:
initials 7.38:1, name 14.96:1, supporting text 6.80:1. All exceed 4.5:1. Other
listed scans had no incomplete checks.

Automated scans do not establish full WCAG compliance. Screen-reader testing,
real iOS/Android testing, and the course's Lighthouse accessibility report on the
final deployed HTTPS domain remain release/presentation checks.

## Interaction checks

Verified in the browser:

- Native required-field validation focuses the missing email field.
- Password Show/Hide changes input visibility and updates its accessible state.
- Registration, sign-in, private empty state for a new account, and sign-out.
- Initial loading, adding a contact, opening an existing contact, and saving edits.
- Server validation failure retains all entries, focuses the error, and permits retry.
- Partial search (`jo`), no matches, and Clear search returning to all contacts.
- Editor Escape restores Add contact focus; delete Escape restores its row action.
- No horizontal page overflow at 320px for contacts, the open editor, and signup.

## Regression tests

Run from the repository root:

```sh
node --test tests/contact-save.test.cjs
node --check contacts/script.js
node --check login/script.js
node --check signup/script.js
node --check assets/forms.js
```

20 tests pass. They cover failed-save recovery, duplicate submissions, input
validation, safe text rendering, stale search/edit responses, loading failure,
editor focus, and failed-delete recovery. These tests simulate network failures;
browser checks above cover the real PHP/MySQL integration.
