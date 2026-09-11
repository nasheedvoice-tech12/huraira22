# Velcora Second Brain Agent Instructions

## Operational Protocols
- **Ingestion**: Raw inputs are hashed and saved immutably. Entities and wikilinks are extracted into structured knowledge nodes.
- **Triviality Filter**: Discard conversational pleasantries (e.g. "hi", "ok", "thanks") from durable memory.
- **Contradiction Logging**: When conflicting facts are presented, record both claims in the contradiction registry with their respective authorities (PRIMARY, SECONDARY, USER_PROVIDED, SYSTEM_GENERATED, INFERRED).
- **Graceful Fallback**: The client adapter must fail soft and allow Velcora's live operations to proceed without disruption if the Second Brain service is unreachable.
