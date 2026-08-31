# Coding Conventions

## Frontend
- Tailwind CSS only — no inline styles, no CSS modules, no styled-components
- Functional components only — no class components
- Named exports for components, default export only for pages
- Component files: PascalCase (`ExamCard.tsx`), hooks: camelCase prefixed with `use` (`useTimer.ts`)
- Keep components under 200 lines — split into smaller pieces if larger
- Co-locate test files with source: `Component.test.tsx` next to `Component.tsx`

## TypeScript
- Strict mode is on — no `any`, use proper types or `unknown`
- Define types in `src/types/` for shared types, inline for component-local types
- Prefer `interface` for object shapes, `type` for unions/intersections

## State
- Zustand for global exam state (`useExamStore.ts`)
- React Query for all API calls — no raw `fetch` in components
- Local `useState` for UI-only state (modals, toggles)

## API / Services
- All API calls go through `src/services/api.ts` or `src/services/adminService.ts`
- Never call API Gateway URLs directly from components

## Git
- `develop` branch for all feature work
- `main` branch is production — never push directly
- PR required to merge into `main`
