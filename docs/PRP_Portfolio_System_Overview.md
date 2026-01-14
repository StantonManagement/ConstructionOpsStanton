# PRP: Portfolio System — Implementation Overview

## Summary

This document set provides step-by-step implementation for a complete portfolio management system in the Construction Operations Center.

---

## Implementation Phases

| Phase | File | Description | Est. Time |
|-------|------|-------------|-----------|
| 1 | `PRP_Portfolio_System_Phase1_Schema.md` | Database schema verification and enhancement | 30 min |
| 2 | `PRP_Portfolio_System_Phase2_API.md` | API routes for portfolios and funding sources | 1 hr |
| 3 | `PRP_Portfolio_System_Phase3_Hooks.md` | React Query hooks | 30 min |
| 4 | `PRP_Portfolio_System_Phase4_PortfolioUI.md` | Portfolio management pages | 1.5 hr |
| 5 | `PRP_Portfolio_System_Phase5_FundingUI.md` | Funding source management pages | 1.5 hr |
| 6 | `PRP_Portfolio_System_Phase6_Navigation.md` | Navigation integration with portfolio filter | 1 hr |
| 7 | `PRP_Portfolio_System_Phase7_Assignment.md` | Project portfolio assignment | 1 hr |

**Total estimated time: ~7 hours**

---

## Dependency Order

```
Phase 1 (Schema)
    ↓
Phase 2 (API)
    ↓
Phase 3 (Hooks)
    ↓
Phase 4 (Portfolio UI) ←→ Phase 5 (Funding UI)
              ↓
         Phase 6 (Navigation)
              ↓
         Phase 7 (Assignment)
```

Phases 4 and 5 can be done in parallel if desired.

---

## Files Created Per Phase

### Phase 1: Schema
- Database migrations only (via MCP SQL execution)
- `src/types/schema.ts` additions

### Phase 2: API
- `src/app/api/portfolios/route.ts`
- `src/app/api/portfolios/[id]/route.ts`
- `src/app/api/funding-sources/route.ts`
- `src/app/api/funding-sources/[id]/route.ts`

### Phase 3: Hooks
- `src/hooks/queries/usePortfolios.ts`
- `src/hooks/queries/useFundingSources.ts`

### Phase 4: Portfolio UI
- `src/app/(dashboard)/portfolios/page.tsx`
- `src/app/(dashboard)/portfolios/new/page.tsx`
- `src/app/(dashboard)/portfolios/[id]/page.tsx`
- `src/app/(dashboard)/portfolios/[id]/edit/page.tsx`
- `src/components/PortfolioForm.tsx`

### Phase 5: Funding UI
- `src/app/(dashboard)/funding-sources/page.tsx`
- `src/app/(dashboard)/funding-sources/new/page.tsx`
- `src/app/(dashboard)/funding-sources/[id]/page.tsx`
- `src/app/(dashboard)/funding-sources/[id]/edit/page.tsx`
- `src/components/FundingSourceForm.tsx`

### Phase 6: Navigation
- `src/context/PortfolioContext.tsx`
- `src/components/PortfolioSelector.tsx`
- `src/hooks/usePortfolioFilter.ts`
- Modifications to `src/app/layout.tsx`
- Modifications to `src/app/components/Navigation.tsx`

### Phase 7: Assignment
- `src/components/BulkPortfolioAssignment.tsx`
- `src/app/api/projects/bulk-assign-portfolio/route.ts`
- Modifications to project form component
- Modifications to projects page

---

## MCP Commands Reference

Each phase includes MCP-executable SQL commands. Key patterns:

### Schema verification
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'table_name';
```

### Data checks
```sql
SELECT * FROM portfolios LIMIT 10;
SELECT * FROM funding_sources LIMIT 10;
```

### File verification
```bash
ls -la src/path/to/check/
cat src/file/to/read.ts | head -50
```

---

## Business Rules Implemented

1. **Portfolio hierarchy:**
   - Portfolio → Funding Sources (1:many)
   - Portfolio → Projects (1:many)
   - Project → Locations → Tasks (inherited portfolio)

2. **Global entities (not portfolio-filtered):**
   - Contractors
   - Budget categories
   - Users
   - Templates

3. **Soft delete pattern:**
   - Portfolios with funding sources/projects cannot be hard deleted
   - Funding sources with loan draws cannot be hard deleted
   - `is_active = false` for soft deletes

4. **Portfolio filter persistence:**
   - Stored in localStorage
   - Survives page refresh
   - Clear button in UI

---

## Integration Points

After completing all phases, these features will be portfolio-aware:

| Feature | Portfolio Filtered |
|---------|-------------------|
| Projects list | ✅ Yes |
| Cash Position | ✅ Yes |
| Funding Sources | ✅ Yes |
| Loan Draws | ✅ Yes (through funding source) |
| Contractors | ❌ No (global) |
| Schedule/Gantt | ⚠️ Optional |
| Payments | ⚠️ Optional |

---

## Testing Checklist (End to End)

After all phases complete:

- [ ] Can create a new portfolio
- [ ] Can add funding sources to portfolio
- [ ] Can assign projects to portfolio
- [ ] Portfolio filter in nav works
- [ ] Filter persists on page refresh
- [ ] Cash Position shows correct data per portfolio
- [ ] Projects list filters correctly
- [ ] Bulk assignment works
- [ ] Cannot delete portfolio with active projects
- [ ] Cannot delete funding source with loan draws
- [ ] All CRUD operations work without errors
- [ ] No console errors
- [ ] Mobile responsive

---

## Rollback Plan

If issues arise during implementation:

1. **Schema changes:** All use `IF NOT EXISTS` / `IF EXISTS` - safe to re-run
2. **API routes:** Delete the route files to remove endpoints
3. **UI components:** Pages can be deleted; nav changes reverted
4. **Context:** Remove provider from layout to disable portfolio filter

---

## Post-Implementation

After completing all phases, consider:

1. **Seed real data:** Create your actual portfolios (SREP SOUTHEND, NORTHEND, etc.)
2. **Assign projects:** Use bulk assignment to organize existing projects
3. **Add funding sources:** Enter your actual loans/grants with commitment amounts
4. **Train team:** Show Dean how the portfolio filter works

---

## Notes for Windsurf

- All SQL commands are MCP-executable
- Each phase has explicit stop gates
- Verification checklists at end of each phase
- File paths follow existing conventions in `_windsurfrules`
- Use React Query patterns from existing hooks
- Use apiHelpers patterns from existing API routes
