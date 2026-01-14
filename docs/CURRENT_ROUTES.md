# Current Application Routes

> **Last Updated**: 2026-01-13
> **Purpose**: Source of truth for actual routes in use

## Main Routes

### Projects
- **List**: `/projects`
- **Detail**: `/projects?project={id}` (query param, not route param)
- **Component**: `ProjectDetailView.tsx`

### Contractors
- **List**: `/contractors`
- **Detail**: Rendered in `ContractorDetailView.tsx` (modal/inline, not separate route)
- **Query param**: `/contractors?contractor={id}`

### Components/Locations
- **List**: `/components` or `/renovations/locations`
- **Detail**: `/renovations/locations/{id}`
- **Component**: Location detail pages

### Payments
- **List**: `/payments`
- **Review**: `/payments/{id}/verify`

### Draws
- **List**: `/renovations/draws`
- **Detail**: `/renovations/draws/{id}`
- **New**: `/renovations/draws/new`

### Reports
- **Blocking**: `/renovations/blocking`
- **Trade**: `/reports/trade`

## Legacy/Unused Routes

### Properties (Building Management)
- **List**: `/properties` (exists but separate from main project workflow)
- **Detail**: `/(dashboard)/properties/[id]` (not used for main project navigation)

**Note**: The `/properties` routes are for property/building management, NOT the main project workflow. Main project navigation uses `/projects` with query parameters.
