# Backend Reference

## DTO Checklist

- Is this request shape validated with a class DTO?
- Is create/update/query separated instead of reused as one broad DTO?
- Are only explicitly allowed fields accepted?

## Service Checklist

- Does the service own the orchestration instead of the controller?
- Is the returned shape stable and frontend-friendly?
- Are exceptions and failure paths explicit?

## Shared Contract Checklist

- Does this shape need to be shared across frontend and backend?
- If shared, is it better expressed in `packages/contracts`?
- If sync-related, does it include version, mutation identity, and conflict metadata?

## Red Flags

- Interface-only request DTOs in NestJS write paths
- Controllers performing mapping, validation, or workflow logic
- Shared enums copied into multiple folders
- Frontend and backend each defining their own version of the same entity
