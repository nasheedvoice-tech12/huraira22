# Velcora Second Brain Guidelines

## Core Principles
1. **Never silently overwrite knowledge**: Preserve conflicting claims with timestamps, source, authority, and confidence.
2. **Immutable raw sources**: All ingested documents, logs, and transcripts in `raw/` are permanent records.
3. **Structured wikilinks**: Link related entities with `[[WikiLink]]` syntax and maintain bidirectional backlinks.
4. **Tenant and User Isolation**: Every operation must strictly enforce tenant boundaries and respect private user tiers.
5. **Clean Adapter Separation**: Velcora communicates with Second Brain exclusively via the adapter layer and API client.
