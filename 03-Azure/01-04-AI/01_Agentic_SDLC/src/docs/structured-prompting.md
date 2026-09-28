# Structured prompting for feature work

Use this template when asking Copilot to implement a feature in OctoCAT Supply. Replace each bracketed value, then provide only the highest-priority context needed to complete the task.

## Reusable prompt template

```text
Objective
Implement [user-visible behavior and desired outcome].

Constraints
- Follow the repository's established architecture, naming, typing, and error-handling patterns.
- Persist data through the existing data layer; do not substitute client-only or in-memory state.
- Preserve existing behavior outside this feature.
- Validate inputs and return the established HTTP status codes.
- Keep the change focused. Do not implement [explicit exclusions].

Files in scope
- Primary implementation: [directly edited components/routes/repositories/models]
- Tests: [adjacent tests to update or add]
- Documentation: [API docs or user/architecture docs, only if behavior changes]

Acceptance criteria
- [Observable behavior 1]
- [Observable behavior 2]
- [Validation/error behavior]
- [Relevant test or end-to-end verification]

Output format
1. Make the changes in the workspace.
2. Summarize the behavior and files changed.
3. Report the exact validation commands and results.
4. Call out any acceptance criterion that could not be verified.
```

## Context order and stopping rule

1. Start with the files that will be edited and the directly related model/DTO types.
2. Read adjacent tests to learn the expected setup, assertions, and error responses.
3. Read API or architecture documentation only when the feature changes a public contract or documented behavior.
4. Stop collecting context once these sources answer how to implement and verify the requested behavior. Expand the file set only when an actual dependency or test failure requires it.

## Cart prompt comparison

Both candidate prompts below request the same outcome: implement the cart feature described in Walkthrough Challenge 2.

**Vague candidate**

```text
Add cart functionality to the app.
```

This leaves important decisions unresolved: which API implementations to update, whether cart state must persist, how quantity changes work, whether prices include discounts, how errors should behave, and what to test. It could produce a client-only prototype that looks complete but loses the cart on reload or works with only one backend.

**Selected structured prompt**

```text
Objective
Implement the Challenge 2 cart: users can add selected product quantities, view cart items and the total, change item quantities, and remove items.

Constraints
- This app has four interchangeable API implementations and one shared React frontend. Keep the cart contract consistent across all four APIs.
- Persist quantities in SQLite using the migration and repository patterns. Do not store the cart only in frontend state.
- There is no customer identity model, so implement one shared demo cart; do not invent authentication or checkout.
- Use the existing API error conventions, typed request/response models, and parameterized SQL.
- Return current discounted product prices and derive line totals and the cart total from persisted quantities.
- Validate positive product IDs and quantities from 1 through 999. Reject invalid requests explicitly.
- Keep the existing product browsing behavior and styling conventions.

Files in scope
- Shared schema: src/database/migrations/
- APIs: src/api-ts/src/{models,repositories,routes}/ and src/api-ts/src/index.ts;
  src/api-py/{models,repositories,routes}/ and src/api-py/main.py;
  src/api-java/src/main/java/com/octocat/supply/{controller,model,repository}/;
  src/api-cs/{Controllers,Models,Repositories}/ and src/api-cs/Program.cs
- Frontend: src/frontend/src/{api,components}/ and src/frontend/src/App.tsx
- Tests: adjacent API tests, adding focused coverage for cart add, quantity update,
  removal, totals, and invalid/missing items.
- Documentation: update the architecture/API documentation for the new behavior.

Acceptance criteria
- Adding a product persists the quantity; adding it again increments its quantity.
- Cart reads return product details, quantity, discounted unit price, line total, and total.
- Updating quantity replaces the current quantity; removing an item removes it from SQLite.
- The frontend calls the API, shows loading/error/empty states, and reflects successful changes.
- Build/type/lint checks and focused cart API tests pass for the changed implementations.

Output format
Implement the changes. Then summarize the cart contract and touched files, list the
validation commands and results, and identify any unverified backend or test path.
```

The structured version is the one to keep: it narrows the implementation without hiding architectural decisions, states measurable behavior and validation, and explicitly rules out misleading shortcuts such as client-only persistence or accidental checkout scope. For this repository, its file list is a starting map, not a reason to read every listed file up front; follow the context order above and open only directly relevant files and adjacent tests.
