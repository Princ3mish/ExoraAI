# Concerns and Technical Debt

## Security & Reliability
- **Testing**: No test automation exists yet, making extensive new additions and refactors potentially risky.
- **CORS Configuration**: Ensure CORS configurations in `backend/src/app.js` are properly restricted to specific trusted origins for production deployments.
- **Secrets Management**: Ensure sensitive identifiers, JWT secrets, and API keys are strictly configured through environment variables (using `env.js`) and securely injected in the production CI/CD flows.

## Tooling & Consistency
- **TypeScript Discrepancy**: The frontend is fully utilizing TypeScript, whereas the backend is utilizing pure JavaScript (ES modules). Migrating the backend to TypeScript might provide better type-safety, maintainability, and consistency across the stack.

## Missing Elements
- **CI/CD**: Pipelines for testing and deployments are not yet defined.
- **Authentication**: Authentication endpoints, robust authorization validations, and middleware are not yet fully implemented, although there is a preliminary `User` schema defined in Prisma.
