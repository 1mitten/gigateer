# @gigateer/contracts

TypeScript types and validators for the Gigateer application. This package provides the core data schemas and utility functions for working with gig data across the entire application.

## Features

- **GigSchema**: Complete Zod schema for gig data validation
- **TypeScript Types**: Fully typed interfaces exported from schemas
- **Utility Functions**: ID generation, hashing, and validation helpers
- **Comprehensive Tests**: Full test coverage with Jest

## Installation

```bash
npm install @gigateer/contracts
# or
pnpm install @gigateer/contracts
```

## Usage

### Basic Schema Validation

```typescript
import { GigSchema, type Gig } from '@gigateer/contracts';

// Validate gig data
const gigData = {
  id: 'venue-concert-2024-01-15-amsterdam',
  source: 'songkick',
  title: 'Amazing Concert',
  artists: ['Artist One'],
  genre: ['rock'],
  dateStart: '2024-01-15T20:00:00Z',
  venue: {
    name: 'The Venue',
    city: 'Amsterdam',
  },
  updatedAt: '2024-01-10T10:00:00Z',
  hash: 'content-hash',
};

const validatedGig: Gig = GigSchema.parse(gigData);
```

### Utility Functions

```typescript
import {
  generateGigId,
  generateGigHash,
  createSlug,
  validateGig,
  safeValidateGig,
} from '@gigateer/contracts';

// Generate stable gig ID
const gigId = generateGigId('The Venue', 'Concert Title', '2024-01-15T20:00:00Z', 'Amsterdam');
// Returns: "the-venue-concert-title-2024-01-15t20-00-00z-amsterdam"

// Generate content hash for change detection
const hash = generateGigHash(gigData);

// Create URL-safe slugs
const slug = createSlug('My Concert Event!');
// Returns: "my-concert-event"

// Safe validation with error handling
const result = safeValidateGig(possiblyInvalidData);
if (result.success) {
  console.log('Valid gig:', result.data);
} else {
  console.error('Validation error:', result.error);
}
```

## Schema Structure

The `GigSchema` includes the following fields:

### Required Fields
- `id`: Stable identifier for the gig
- `source`: Data source identifier (e.g., "songkick")
- `title`: Event title
- `dateStart`: ISO datetime string for event start
- `venue`: Object with venue information (name is required)
- `updatedAt`: ISO datetime when last updated
- `hash`: Content hash for change detection

### Optional Fields
- `sourceId`: Upstream unique identifier
- `artists`: Array of artist names (defaults to empty array)
- `genre`: Array of genre strings (defaults to empty array)
- `dateEnd`: ISO datetime string for event end
- `timezone`: Timezone string (e.g., "Europe/Amsterdam")
- `price`: Price information object
- `ageRestriction`: Age restriction string
- `status`: Event status ("scheduled", "cancelled", "postponed")
- `ticketsUrl`: URL to purchase tickets
- `eventUrl`: URL to event page
- `images`: Array of image URLs (defaults to empty array)

### Venue Object
```typescript
{
  name: string;           // Required
  address?: string;       // Optional
  city?: string;          // Optional
  country?: string;       // Optional
  lat?: number;           // Optional latitude
  lng?: number;           // Optional longitude
}
```

### Price Object
```typescript
{
  min: number | null;     // Minimum price
  max: number | null;     // Maximum price
  currency: string | null; // Currency code (e.g., "EUR", "GBP")
}
```

## ID and Hash Generation

### ID Strategy
IDs are generated using the formula: `slug(venue.name + title + dateStart + city)`

This creates stable, unique identifiers that remain consistent across data updates while being human-readable.

### Hash Strategy
Hashes are created from a stable JSON representation of important fields, then SHA256 encoded. This enables efficient change detection by comparing hashes rather than deep object comparison.

The following fields are included in the hash:
- title, artists, genre
- dateStart, dateEnd
- venue information
- price, ageRestriction, status
- ticketsUrl, eventUrl

Fields like `id`, `updatedAt`, and the `hash` itself are excluded to prevent circular dependencies and focus on content changes.

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Build the package
pnpm build

# Lint code
pnpm lint

# Fix linting issues
pnpm lint:fix
```

## Testing

The package includes comprehensive unit tests covering:
- Valid data validation scenarios
- Invalid data rejection
- Default value application
- Utility function behavior
- Edge cases and error conditions

Run tests with:
```bash
pnpm test
```

## License

MIT