# Pro Field Manager - Server Sync Admin Page Design Guidelines

## Design Approach
**Selected System:** Carbon Design System (IBM)  
**Rationale:** Purpose-built for data-intensive enterprise applications with complex forms, tables, and technical interfaces. Emphasizes clarity, efficiency, and professional credibility.

**Key Principles:**
- Information hierarchy over decoration
- Dense data presentation with breathing room
- Clear status indicators and feedback
- Progressive disclosure for advanced options

---

## Typography System
**Font Family:** IBM Plex Sans (via Google Fonts CDN)

**Hierarchy:**
- Page Title: 2xl, semibold (Server Synchronization)
- Section Headers: xl, semibold (Configuration, Sync History, Conflict Resolution)
- Form Labels: sm, medium, uppercase tracking
- Body/Table Content: base, regular
- Helper Text: sm, regular, muted
- Status Badges: xs, medium, uppercase

---

## Layout System
**Spacing Primitives:** Tailwind units 2, 4, 6, 8, 12, 16 for consistent rhythm

**Page Structure:**
- Full-width admin layout with sidebar navigation (not part of this page)
- Main content: max-w-7xl, mx-auto, px-8
- Vertical spacing: py-8 between major sections
- Card-based sections with border and subtle shadow

**Grid Strategy:**
- Configuration section: 2-column (lg:grid-cols-2) - form on left, sync status/quick actions on right
- Sync options: 3-column grid (lg:grid-cols-3) for toggle groups
- History table: full-width data table
- Conflict viewer: 50/50 split diff view (grid-cols-2)

---

## Component Library

### 1. Server Configuration Card
**Structure:** White background card, p-6, border, rounded-lg
- Form fields in vertical stack (space-y-4)
- Input groups with labels above inputs
- Text inputs: border, px-4, py-2.5, rounded, focus ring
- Password input with show/hide toggle icon
- Test Connection button (secondary style) inline with URL field
- Save Configuration button (primary) at bottom

### 2. Sync Options Panel
**Layout:** 3-column grid of option groups
- Toggle switches (not checkboxes) for binary choices
- Radio button groups for format selection (SQL/CSV)
- Dropdown for sync direction (one-way/bidirectional)
- Each option group in bordered container with label header
- Initiate Sync button (large, primary, full-width) below options

### 3. Sync History Table
**Table Design:** Striped rows, hover states, sortable columns
- Columns: Timestamp, Type (DB/Files/Both), Direction, Status, Duration, Actions
- Status badges: inline pills with dot indicators (success=green, error=red, in-progress=blue, pending=gray)
- Timestamp format: relative time + tooltip with exact datetime
- Action column: icon buttons for View Details, Retry, Download Logs
- Pagination controls at bottom
- Search/filter bar above table

### 4. Conflict Resolution Interface
**When Conflicts Present:** Expandable section above history table
- Alert banner with warning styling showing conflict count
- Side-by-side diff viewer (2-column grid)
  - Left: Local Version, Right: Remote Version
  - Headers showing source and timestamp
  - Line-by-line diff with color-coded changes (added=green bg, removed=red bg, modified=yellow bg)
  - Line numbers in gutter
  - Syntax highlighting for SQL/code
- Resolution actions: Accept Local, Accept Remote, Merge Manually buttons per conflict
- Batch resolution options at top: Apply to All, Resolve Selected

### 5. Status Indicators
- Live sync progress bar when active (indeterminate animation)
- Connection status badge in header (Connected/Disconnected with dot)
- Last successful sync timestamp display
- Queue counter badge if multiple syncs pending

---

## Navigation & Actions
**Primary Actions:** Large, prominent buttons (px-6, py-3)
**Secondary Actions:** Ghost/outline buttons
**Destructive Actions:** Red accent for critical operations
**Icon Buttons:** Toolbar-style, 32px touch targets

---

## Animations
**Minimal Use Only:**
- Loading spinners for async operations
- Smooth diff scrolling on conflict navigation
- Table row expansion for details (max-height transition)
- Progress bar animation during sync

---

## Images
**No images required** - This is a pure data/functional admin interface. All visual communication through typography, status indicators, and data visualization.

---

## Mobile Responsiveness
- Stack 2-column configuration to single column on <lg
- Horizontal scroll for wide tables on mobile with sticky first column
- Diff viewer stacks vertically on mobile (before/after layout)
- Floating action button for "Initiate Sync" on mobile