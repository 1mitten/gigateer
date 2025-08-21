/// <reference types="node" />

declare namespace NodeJS {
  interface ProcessEnv {
    // Database
    MONGODB_CONNECTION_STRING: string
    MONGODB_DATABASE_NAME: string
    
    // App Configuration
    NODE_ENV: 'development' | 'production' | 'test'
    NEXT_PUBLIC_APP_URL?: string
    NEXT_PUBLIC_PWA_ENABLED?: string
    NEXT_PUBLIC_CACHE_TTL?: string
    
    // Authentication (future)
    NEXTAUTH_URL?: string
    NEXTAUTH_SECRET?: string
    
    // Build Configuration
    NEXT_OUTPUT?: 'standalone' | undefined
    ANALYZE?: string
    
    // Ingestor Configuration (not used in web app)
    INGESTOR_USE_DATABASE?: string
    INGESTOR_MODE?: string
    INGESTOR_DEFAULT_SCHEDULE?: string
    INGESTOR_RATE_LIMIT_PER_MIN?: string
    INGESTOR_TIMEOUT_MS?: string
    INGESTOR_LOG_LEVEL?: string
  }
}