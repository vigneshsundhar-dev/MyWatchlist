# Personal Watchlist App — MVP Product Spec

## 1. Product Goal

Build a private watchlist app at:

vigneshsundhar.com/watchlist

The app helps Vignesh convert an intentional, growing list of movies and series into actual watching decisions.

The app should not behave like a generic movie database, social watchlist, or streaming availability tracker. It should behave like a personal ranked decision system.

Primary use case:

> “I have a list of movies and series I actually want to watch. When I open the app, show me what I should consider watching next, ranked intelligently.”

---

## 2. Core Principles

1. Adding a movie/series must be low-friction.
2. Every item must have a mandatory personal note explaining why it was added.
3. Ranking should be LLM-based, using:
   - The user profile config
   - The prioritisation instruction config
   - The item’s metadata
   - The mandatory note
   - The age of the item
   - Tara interest, only when relevant
4. Availability should not be over-engineered in V1.
5. The app should support both movies and series from day one.
6. No user accounts in V1.
7. Collaboration with Tara is a backlog item, but the data model should support it.

---

## 3. App Locations

### Primary Personal App

vigneshsundhar.com/watchlist

This is Vignesh’s personal watchlist interface.

### Future Tara Sync Surface

tara.vigneshsundhar.com

A future section inside the Tara app will show a synced copy of the watchlist where Tara can one-tap mark interest.

This is not part of MVP implementation, but should be added to GitHub backlog.

---

## 4. Supported Media Types

The app must support:

- Movie
- Series

Use a unified data model where possible.

ts type MediaType = "movie" | "series"; 

---

## 5. Status Model

Each item has exactly one of these statuses:

ts type WatchStatus = "want_to_watch" | "watched" | "abandoned"; 

Status movement:

txt want_to_watch → watched want_to_watch → abandoned abandoned → want_to_watch watched → want_to_watch 

The app must not attempt to detect viewing automatically. Vignesh manually marks an item as watched.

---

## 6. Core Metadata Sources

### Primary Search + Metadata Source

Use TMDb as the primary metadata source.

Use TMDb for:

- Movie search
- Series search
- Title
- Poster
- Overview
- Release year
- Runtime, where available
- Genre
- TMDb rating
- External IDs, where available

### Secondary Metadata Source

Use OMDb where possible for:

- IMDb rating
- Rotten Tomatoes score, if returned
- Additional metadata fallback

### LLM/Web Enrichment

When reliable API fields are unavailable, use an LLM-powered enrichment step to search the web and fill metadata if a reliable source is found.

Fields that may require enrichment:

- IMDb score
- Rotten Tomatoes Tomatometer
- Rotten Tomatoes Popcornmeter
- Better synopsis if metadata is weak

All enriched fields must store source metadata.

---

## 7. Metadata Reliability Rules

Every externally fetched/enriched field should be marked with a source and confidence level.

Example:

ts metadata_sources: {   tmdb: {     tmdb_id: string;     fetched_at: string;   };   omdb?: {     imdb_id?: string;     fetched_at: string;   };   enrichment?: {     provider: "llm_web_search";     fetched_at: string;     source_urls: string[];     confidence: "high" | "medium" | "low";   }; } 

For Rotten Tomatoes fields:

ts tomatometer_score?: number; popcornmeter_score?: number; rt_scores_source?: "omdb" | "llm_web_search" | "manual" | null; rt_scores_confidence?: "high" | "medium" | "low" | null; 

If the app cannot confidently find the score, leave it blank.

Do not hallucinate scores.

---

## 8. Add Flow

### User Flow

1. User opens Add screen.
2. User types movie/series title.
3. App searches across movies and series.
4. App shows search results.
5. User taps one result.
6. App asks for mandatory note.
7. User submits.
8. App fetches metadata.
9. App enriches missing metadata if needed.
10. App creates item with status want_to_watch.
11. App triggers LLM ranking for all active watchlist items.

### Add Form Fields

Required:

- Search title
- Selected media item
- Mandatory note

Optional:

- Tara interested: default false

No priority field in UI.

---

## 9. Mandatory Note

Every item must have a required free-text note.

Purpose:

- Capture why Vignesh wanted to watch it.
- Feed ranking engine.
- Preserve original intent.

Examples:

txt Obama recommended this. I keep seeing this mentioned as one of the best sci-fi films. Tara said she wants to watch this. Looks like a clever thriller with strong reviews. Classic I have somehow never watched. 

Validation:

- Required
- Minimum 5 characters
- No maximum required, but UI should be comfortable for 1–3 sentences

---

## 10. Tara Interest

Each item has:

ts tara_interested: boolean; 

Default:

ts false 

Usage:

- In normal mode: visible but not heavily weighted.
- In “With Tara” filter/mode: strongly affects ranking.
- Future Tara app sync will allow Tara to toggle this directly.

---

## 11. Ranking System

### Ranking Type

Use LLM-based ranking in V1.

Do not expose ranking settings in the UI.

Ranking is based on backend/config files.

### Config Files

Create:

txt /config/watchlist/user-profile.md /config/watchlist/ranking-instructions.md 

### user-profile.md

This file contains relevant information about Vignesh’s taste, viewing habits, and preferences.

Example placeholder:

md Vignesh likes layered, emotionally intelligent films, clever thrillers, philosophical sci-fi, strong character dramas, inventive storytelling, and well-regarded classics. He wants to avoid defaulting to mediocre new streaming releases. He values movies and series he intentionally saved for a reason. 

### ranking-instructions.md

This file contains instructions for ranking.

Example placeholder:

md Rank items based on how strongly they appear to match Vignesh's stated tastes, the strength of the note he added, the reputation/quality signals from metadata, and the age of the item.  Give a meaningful boost to older unwatched items so the watchlist does not decay.  Do not treat the list like task priority. Avoid labels like high/medium/low.  When ranking in With Tara mode, strongly boost items where tara_interested is true.  Prefer items that seem intentional, distinctive, acclaimed, or personally meaningful over generic new releases. 

---

## 12. Ranking Output

Each active item should store:

ts rank_score: number; rank_position: number; rank_reason: string; ranked_at: string; ranking_context_hash: string; 

### rank_score

Suggested range:

ts 0–100 

### rank_reason

A short human-readable explanation.

Example:

txt Ranked highly because the note suggests strong personal intent, it matches your preference for layered thrillers, and it has been on the list for several months. 

This reason should be visible in the UI.

---

## 13. Ranking Triggers

Ranking should run:

1. Immediately after a new item is added.
2. Immediately after an item is marked watched.
3. Immediately after an item is marked abandoned.
4. When user taps “Re-rank all” manually.

Do not build scheduled/nightly ranking in MVP.

---

## 14. Watch Now Screen

Main screen:

/watchlist

The Watch Now screen is the primary experience.

### Top-Level Tabs

Two tabs:

txt Movies Series 

Each tab shows only items with status:

ts want_to_watch 

### Hero Stack

At the top of each tab:

- Show top 5 ranked items.
- Display as swipeable thumbnail/card stack.
- These are ranks 1–5 for that media type.

Each hero card should show:

- Poster/thumbnail
- Title
- Release year
- IMDb score, if available
- Tomatometer score, if available
- Popcornmeter score, if available
- TMDb score, if available
- Ranking reason
- Button to show original note
- Button to mark watched
- Button to abandon
- Provider search buttons

### Mark Watched Flow

When user taps “Watched”:

1. Show confirmation popup.
2. Optional watched note input.
3. Confirm.
4. Status becomes watched.
5. watched_at is saved.
6. App triggers re-ranking.

### Original Note Tooltip

The mandatory note should be accessible without cluttering the card.

Interaction:

- Tap/click note icon.
- Show tooltip/popover/modal with original note.

---

## 15. Ranked List Below Hero

Below the top 5 stack:

- Show all remaining items from rank 6 onward.
- Same ordering as ranking engine.
- Simpler card layout.

Each list item should show:

- Poster thumbnail
- Title
- Year
- Media type
- Rank number
- Rank reason
- Scores if available
- Tara interested indicator
- Watched button
- Abandon button

---

## 16. Filters

V1 filters:

- Media type tab: Movie / Series
- With Tara toggle
- Status filter:
  - Want to Watch
  - Watched
  - Abandoned

### With Tara Filter

When enabled:

- Only show items where tara_interested = true.
- Re-sort using Tara-aware ranking mode if ranking data exists.
- If not, apply Tara interest filter over existing rank.

---

## 17. Availability / Provider Search

Do not build a complex availability tracker in MVP.

Instead, each item should show provider search buttons.

Suggested providers:

- Netflix
- Prime Video
- JioHotstar
- Apple TV
- YouTube
- Google Search

Each button opens a search URL for the selected title.

Example:

ts provider_search_links: {   netflix: string;   prime_video: string;   jiohotstar: string;   apple_tv: string;   youtube: string;   google: string; } 

Search query format:

txt {title} {release_year} 

For series:

txt {title} series 

The app should not claim availability unless confirmed by a reliable source.

Button labels should say:

txt Search Netflix Search Prime Search JioHotstar Search Apple TV Search YouTube Search Google 

Not:

txt Watch on Netflix 

---

## 18. Watched Log

When an item is marked watched:

Save:

ts watched_at: string; watched_note?: string; 

No rating required.

No “who watched” field required.

No automatic watch detection.

Watched items should be viewable in a separate watched/history section.

---

## 19. Abandoned Items

Abandoned items should remain in the database.

User can:

- View abandoned items
- Restore to want_to_watch

When an item is abandoned:

- Save abandoned_at
- Optional abandoned note can be added later, but not required for MVP

---

## 20. Data Model

### watchlist_items

ts interface WatchlistItem {   id: string;    media_type: "movie" | "series";   status: "want_to_watch" | "watched" | "abandoned";    title: string;   original_title?: string;   release_year?: number;    tmdb_id?: string;   imdb_id?: string;    poster_url?: string;   backdrop_url?: string;   overview?: string;    genres?: string[];   runtime_minutes?: number;    tmdb_score?: number;   imdb_score?: number;   tomatometer_score?: number;   popcornmeter_score?: number;    note: string;    tara_interested: boolean;    rank_score?: number;   rank_position?: number;   rank_reason?: string;   ranked_at?: string;   ranking_context_hash?: string;    metadata_sources?: MetadataSources;    watched_at?: string;   watched_note?: string;    abandoned_at?: string;    created_at: string;   updated_at: string; } 

### metadata_sources

ts interface MetadataSources {   tmdb?: {     tmdb_id: string;     fetched_at: string;   };    omdb?: {     imdb_id?: string;     fetched_at: string;   };    enrichment?: {     provider: "llm_web_search";     fetched_at: string;     source_urls: string[];     confidence: "high" | "medium" | "low";   };    rt_scores?: {     source: "omdb" | "llm_web_search" | "manual";     confidence: "high" | "medium" | "low";     fetched_at: string;     source_urls?: string[];   }; } 

---

## 21. Backend Services

### mediaSearchService

Responsibilities:

- Search TMDb for movies and series.
- Return unified search results.

ts searchMedia(query: string): Promise<MediaSearchResult[]> 

### metadataService

Responsibilities:

- Fetch TMDb details.
- Fetch OMDb details if IMDb ID is available.
- Merge metadata.

ts fetchMetadata(mediaType, tmdbId): Promise<Partial<WatchlistItem>> 

### enrichmentService

Responsibilities:

- Use LLM/web search to fill missing metadata.
- Must not invent scores.
- Must store confidence and source URLs.

ts enrichMetadata(item): Promise<Partial<WatchlistItem>> 

### rankingService

Responsibilities:

- Read user profile config.
- Read ranking instructions config.
- Rank all active want-to-watch items.
- Save rank score, position, reason, timestamp.

ts rerankAll(options?: {   mode?: "default" | "with_tara";   mediaType?: "movie" | "series"; }): Promise<void> 

### providerSearchLinkService

Responsibilities:

- Generate provider search URLs.
- Does not check availability.

ts generateProviderLinks(item): ProviderSearchLinks 

---

## 22. LLM Ranking Prompt Requirements

The ranking prompt should receive:

- User profile
- Ranking instructions
- Current date
- List of active items
- For each item:
  - Title
  - Media type
  - Year
  - Genres
  - Overview
  - Scores
  - Mandatory note
  - Created date
  - Tara interested
  - Existing status

The LLM should return structured JSON only.

Expected output:

json [   {     "id": "item_id",     "rank_score": 91,     "rank_reason": "Strong personal-intent note, excellent fit with your taste for layered thrillers, and it has been waiting for several months."   } ] 

Backend then sorts descending by rank_score and assigns rank_position.

---

## 23. Pages

### /watchlist

Primary Watch Now page.

Includes:

- Movie tab
- Series tab
- Hero stack top 5
- Ranked list from rank 6 onward
- With Tara filter
- Add item button
- Manual re-rank button

### /watchlist/add

Add flow.

Includes:

- Search field
- Search results
- Selected item preview
- Mandatory note field
- Tara interested toggle
- Add button

### /watchlist/item/:id

Detail page.

Includes:

- Full metadata
- Note
- Rank reason
- Provider search buttons
- Status controls
- Watched note
- Metadata source/debug info

### /watchlist/history

Watched items.

Includes:

- Watched date
- Title
- Media type
- Watched note

### /watchlist/abandoned

Abandoned items.

Includes:

- Restore button

---

## 24. MVP Backlog Items

Create GitHub backlog issues for later:

### Tara Sync

Build a section inside tara.vigneshsundhar.com where Tara can:

- View synced watchlist
- Tap interested / not interested
- Update tara_interested

### Manual Metadata Override

Allow manual editing of:

- IMDb score
- Tomatometer
- Popcornmeter
- Runtime
- Poster

### Better Availability

Explore reliable streaming availability APIs later.

Do not build this in MVP.

### Scheduled Re-ranking

Add nightly or weekly re-ranking later.

### Browser Extension / Share Sheet

Allow adding from IMDb, TMDb, Letterboxd, Rotten Tomatoes, etc.

Not MVP.

---

## 25. Non-Goals for MVP

Do not build:

- User accounts
- Public profiles
- Social sharing
- Ratings
- Complex availability tracking
- Streaming scraping
- Automatic watch detection
- Comments
- Notifications
- Mobile app
- TV season/episode tracking
- Recommendation engine based on watched history
- Calendar integration

---

## 26. Environment Variables

Required:

txt TMDB_API_KEY= OMDB_API_KEY= LLM_API_KEY= 

Optional, depending on enrichment implementation:

txt WEB_SEARCH_API_KEY= 

---

## 27. Acceptance Criteria

### Add Item

- User can search movie or series.
- User can select a result.
- User must enter a note.
- Item is created with status want_to_watch.
- Metadata is fetched.
- Ranking is triggered.

### Ranking

- Every active item receives:
  - rank score
  - rank position
  - rank reason
  - ranked timestamp
- Ranking can be manually triggered.

### Watch Now

- Movies and series are separated into tabs.
- Top 5 are shown in hero stack.
- Items from rank 6 onward appear below.
- User can mark item watched with confirmation.
- User can abandon item.
- User can view original note.

### Provider Buttons

- Each item has search buttons for:
  - Netflix
  - Prime Video
  - JioHotstar
  - Apple TV
  - YouTube
  - Google Search
- Buttons must say “Search,” not “Watch.”

### Watched Log

- Watched items move out of active list.
- Watched date is saved.
- Optional watched note is saved.
- Watched items are visible in history.

---

## 28. Build Order

1. Data model
2. TMDb search for movies + series
3. Add flow with mandatory note
4. Metadata fetch and storage
5. Watchlist page with movie/series tabs
6. Manual status change: watched / abandoned
7. Provider search buttons
8. LLM ranking config files
9. Ranking service
10. Hero stack top 5 + ranked list below
11. Manual re-rank button
12. Watched history page
13. Abandoned page
14. GitHub backlog issue for Tara sync