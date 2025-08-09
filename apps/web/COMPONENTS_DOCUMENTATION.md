# Gigateer UI Components Documentation

## Overview

This document describes the comprehensive UI components built for the Gigateer gig aggregator web application. The implementation follows the specifications in `APP_PROPOSAL.md` and provides a complete, responsive, and accessible user interface for discovering live music events.

## Architecture

### Tech Stack
- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom utilities
- **State Management**: React hooks with URL synchronization
- **Icons**: Heroicons React
- **Date Handling**: date-fns
- **Testing**: Jest + React Testing Library

### Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout with ToastProvider
│   ├── page.tsx                # Main search page
│   ├── globals.css             # Enhanced global styles with PWA support
│   └── gig/
│       └── [id]/
│           ├── page.tsx        # Gig details page
│           └── not-found.tsx   # 404 page for gigs
├── components/
│   ├── pages/
│   │   └── SearchPage.tsx      # Main search page component
│   ├── filters/
│   │   ├── FilterPanel.tsx     # Desktop/mobile filter panel
│   │   └── FilterChip.tsx      # Active filter chips
│   ├── search/
│   │   └── SearchInput.tsx     # Debounced search input
│   ├── gigs/
│   │   ├── GigCard.tsx         # Individual gig display
│   │   ├── GigsList.tsx        # Gig results list
│   │   └── GigDetail.tsx       # Detailed gig view
│   ├── ui/
│   │   ├── Toast.tsx           # Toast notifications
│   │   ├── ErrorBoundary.tsx   # Error handling
│   │   ├── LoadingSkeleton.tsx # Loading states
│   │   ├── Pagination.tsx      # Pagination controls
│   │   └── SortControls.tsx    # Sorting interface
│   └── __tests__/
│       └── SearchPage.test.tsx # Component tests
└── hooks/
    ├── useSearchFilters.ts     # URL-synchronized filter state
    └── useGigsApi.ts          # API data fetching
```

## Core Components

### 1. SearchPage (`/components/pages/SearchPage.tsx`)

The main application interface that orchestrates all search and filtering functionality.

**Features:**
- Responsive layout with mobile-first design
- Sticky header with search bar
- Desktop sidebar filters / Mobile modal filters
- Real-time filter chips display
- Sorting controls
- Paginated results
- Error handling with retry functionality

**State Management:**
- Uses `useSearchFilters` for URL-synchronized state
- Uses `useGigsApi` for data fetching
- Uses `useGigSort` for client-side sorting

### 2. Filter Components

#### FilterPanel (`/components/filters/FilterPanel.tsx`)
- Adaptive design (desktop sidebar / mobile modal)
- Form inputs for: city, genre, venue, date range
- Reset functionality
- Touch-friendly mobile interface

#### FilterChip (`/components/filters/FilterChip.tsx`)
- Visual representation of active filters
- Individual filter removal
- Bulk "clear all" functionality

### 3. Search Component

#### SearchInput (`/components/search/SearchInput.tsx`)
- Debounced input (300ms default)
- Keyboard shortcuts (Escape to clear)
- Clear button for quick reset
- Accessible labels and focus states

### 4. Gig Display Components

#### GigCard (`/components/gigs/GigCard.tsx`)
- Standard and compact variants
- Event status indicators (upcoming, past, cancelled, postponed)
- Price display with currency support
- Genre tags with overflow handling
- Action buttons (tickets, source links)
- Accessible navigation

#### GigsList (`/components/gigs/GigsList.tsx`)
- Loading skeleton states
- Empty state messaging
- Results count display
- Grid and list layout options
- Virtual scrolling ready (for future optimization)

#### GigDetail (`/components/gigs/GigDetail.tsx`)
- Comprehensive event information display
- Image gallery support
- Venue details with map placeholder
- Social sharing functionality
- Ticket purchase integration
- Responsive design with sidebar layout

### 5. UI Utilities

#### LoadingSkeleton (`/components/ui/LoadingSkeleton.tsx`)
- Reusable loading states
- Component-specific skeletons
- Accessible (screen reader friendly)

#### ErrorBoundary (`/components/ui/ErrorBoundary.tsx`)
- Graceful error handling
- Retry functionality
- User-friendly error messages

#### Toast (`/components/ui/Toast.tsx`)
- Context-based notification system
- Multiple toast types (success, error, warning, info)
- Auto-dismiss with configurable duration
- Stacked notifications

#### Pagination (`/components/ui/Pagination.tsx`)
- Desktop and mobile variants
- Ellipsis for large page counts
- Accessible navigation
- Results summary

#### SortControls (`/components/ui/SortControls.tsx`)
- Desktop button group
- Mobile dropdown
- Visual sort direction indicators

## Custom Hooks

### useSearchFilters (`/hooks/useSearchFilters.ts`)

Manages search and filter state with URL synchronization.

**Features:**
- URL parameter parsing and updating
- Filter state management
- Active filter tracking
- Reset functionality
- Browser history integration

**API:**
```typescript
const {
  filters,           // Current filter values
  updateFilters,     // Update multiple filters
  updatePage,        // Update page only
  resetFilters,      // Clear all filters
  removeFilter,      // Remove specific filter
  activeFilters,     // Active filters for display
  hasActiveFilters,  // Boolean for UI state
  apiParams,         // Formatted params for API
} = useSearchFilters();
```

### useGigsApi (`/hooks/useGigsApi.ts`)

Handles API interactions with loading, error, and data states.

**Features:**
- Automatic refetching on parameter changes
- Loading and error state management
- Individual gig detail fetching
- Client-side sorting utilities

**API:**
```typescript
const {
  data,      // Gig array
  pagination, // Pagination info
  meta,      // Query metadata
  loading,   // Loading state
  error,     // Error message
  refetch,   // Manual refresh function
} = useGigsApi(params);
```

## Responsive Design

### Breakpoint Strategy
- **Mobile First**: Base styles target mobile devices
- **sm (640px+)**: Small tablet adjustments
- **md (768px+)**: Tablet layout changes
- **lg (1024px+)**: Desktop sidebar layout
- **xl (1280px+)**: Wide desktop optimizations

### Mobile-Specific Features
- Touch-friendly button sizes (44px minimum)
- Modal filters instead of sidebar
- Compact pagination
- Swipe-friendly card layouts
- Safe area support for devices with notches

### Desktop Features
- Sticky sidebar filters
- Multi-column layouts
- Hover states and transitions
- Keyboard navigation support

## Accessibility Features

- **ARIA Labels**: All interactive elements properly labeled
- **Focus Management**: Visible focus indicators and logical tab order
- **Screen Reader Support**: Semantic HTML and descriptive text
- **Color Contrast**: WCAG AA compliant color schemes
- **Reduced Motion**: Respects user preferences for reduced animation
- **High Contrast Mode**: Enhanced visibility in high contrast mode

## Performance Optimizations

### Loading States
- Skeleton screens for perceived performance
- Progressive loading with priorities
- Image lazy loading (ready for implementation)

### Code Splitting
- Dynamic imports ready for heavy components
- Route-based code splitting via Next.js

### Caching Strategy
- API response caching (5-minute TTL)
- Static asset optimization
- Service worker ready (PWA infrastructure exists)

## State Management

### URL Synchronization
All filter and pagination state is synchronized with the URL, enabling:
- Shareable search results
- Browser back/forward navigation
- Bookmark support
- Deep linking

### Error Handling
- Graceful degradation on API failures
- User-friendly error messages
- Retry mechanisms
- Error boundaries for component isolation

## Testing Strategy

### Component Tests
- Unit tests for individual components
- Integration tests for user workflows
- Mock API responses
- Accessibility testing hooks

### Test Coverage Areas
- Search and filtering functionality
- Navigation and routing
- Error states and recovery
- Responsive behavior
- Keyboard accessibility

## Future Enhancements

### Performance
- Virtual scrolling for large result sets
- Image optimization and CDN integration
- Service worker caching strategies

### Features
- Map view integration
- Advanced search filters
- User favorites and saved searches
- Social sharing enhancements
- Email notifications
- Calendar integration

### Analytics
- Search analytics
- User interaction tracking
- Performance monitoring
- Conversion funnel analysis

## Development Guidelines

### Adding New Components
1. Follow the established directory structure
2. Include TypeScript types for all props
3. Add responsive design considerations
4. Include loading and error states
5. Write component tests
6. Document accessibility features

### Styling Conventions
- Use Tailwind utility classes
- Follow mobile-first responsive design
- Maintain consistent spacing scale
- Use semantic color names
- Include hover and focus states

### State Management
- Prefer URL state for shareable data
- Use React Context for global UI state
- Keep component state local when possible
- Document state flow in complex components

## API Integration

The components are designed to work with the existing Gigateer API:

- `GET /api/gigs` - Paginated gig search with filters
- `GET /api/gigs/[id]` - Individual gig details
- `GET /api/meta` - Platform metadata

All API interactions include proper error handling, loading states, and retry mechanisms.

## Browser Support

- Modern browsers (Chrome 91+, Firefox 90+, Safari 14+, Edge 91+)
- Mobile Safari iOS 14+
- Chrome Android 91+
- Progressive Web App capabilities
- Offline-first architecture ready

---

This implementation provides a complete, production-ready user interface for the Gigateer platform, following modern React patterns and accessibility best practices while maintaining excellent performance and user experience across all device types.