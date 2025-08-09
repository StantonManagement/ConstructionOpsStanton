
# Construction Project Management System (CPMS)

## Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   ├── context/           # React contexts
│   └── pages/             # Special pages
├── components/
│   ├── dashboard/         # Main dashboard components
│   ├── views/             # View components (main screens)
│   ├── forms/             # Form components
│   ├── modals/            # Modal components
│   └── shared/            # Reusable components
│       └── ui/            # Basic UI components
├── hooks/                 # Custom React hooks
├── lib/                   # External library configurations
├── types/                 # TypeScript type definitions
└── utils/                 # Utility functions
    ├── constants.ts       # App constants
    ├── formatters.ts      # Data formatting utilities
    └── validators.ts      # Form validation utilities
```

## Key Features

- **Project Management**: Track construction projects, budgets, and progress
- **Payment Processing**: Handle contractor payments and applications
- **Daily Logs**: Construction site activity logging
- **Compliance**: Safety and regulatory compliance tracking
- **Mobile Responsive**: Optimized for field workers

## Development

### Getting Started
```bash
npm install
npm run dev
```

### Code Organization
- Components are organized by purpose (views, forms, modals, shared)
- Hooks provide reusable logic
- Types are centralized for consistency
- Utils contain pure functions for data manipulation

### Adding New Features
1. Create types in `src/types/`
2. Add components in appropriate `src/components/` subdirectory
3. Create hooks if needed in `src/hooks/`
4. Add API routes in `src/app/api/`
5. Update documentation
