# gpt-image-palette Frontend Design Spec

## Goal

Rebuild the gpt-image-palette frontend from scratch as a quiet, minimal, beautiful, and easy-to-use image generation tool. The UI should feel like a precise work surface, not a marketing page, dashboard demo, or decorative experiment.

The frontend will use React + Vite + TypeScript. In production, Fastify will serve the built frontend and the existing API from the same service.

## Non-Goals

- No landing page.
- No onboarding page.
- Prompt templates are allowed only as a restrained, attributed library inside the Generate composer.
- No segmented prompt builder.
- No decorative animation.
- No large hero section.
- No redundant confirmation flows.
- No heavy UI framework.
- No complex client state library.

## Information Architecture

The app has four pages:

1. Generate
2. History
3. Palettes
4. Settings

Navigation uses a lightweight top navigation. It must not visually occupy a full heavy row. The header should contain the `gpt-image-palette` label and compact page links. The active page should be indicated with a subtle underline, small marker, or restrained background.

## Visual Direction

The visual style is a quiet publication workbench:

- Near-white background.
- Dark gray or ink-like text.
- Thin borders and separators.
- Moderate whitespace.
- Low-saturation accent color used sparingly.
- Generated images are the visual focus.
- UI surfaces should not compete with the images.
- Border radius should stay restrained, around 6-8px.
- No gradient-heavy backgrounds.
- No decorative blobs, orbs, or ornamental motion.
- No card nesting.

Typography must use a stable system sans-serif stack:

```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans", Ubuntu, Arial, sans-serif;
```

Do not use serif display fonts, decorative fonts, handwritten fonts, or personality-heavy web fonts.

## Generate Page

The Generate page is the primary work surface.

Layout:

- Main area uses a left/right split.
- Bottom area shows a horizontal recent-results gallery.
- On narrow screens, the layout collapses to a single column.

Left column:

- Prompt large textarea.
- Prompt template library sourced from `EvoLinkAI/awesome-gpt-image-2-prompts`, with attribution and no image hotlink dependency.
- Size selector.
- Quality selector.
- Generation count control.
- Palette selector.
- Reference image upload and preview.
- Generate button.

Right column:

- Current task status.
- The latest image from the most recent generation request.

Behavior:

- If `baseURL` or `API Key` is missing, show a restrained inline hint near the Generate button with a link to Settings.
- Do not show a global warning banner for missing configuration.
- Do not show prompt templates or prompt helper fields.
- Do not show welcome text or explanatory usage copy.
- Errors should be inline and specific.
- Switching pages must not lose the current prompt, parameters, palette selection, or reference image state.
- Draft state should be persisted through the backend.

Recent results gallery:

- Appears at the bottom of the Generate page.
- Displays recent history images from left to right like a gallery.
- Uses a single-screen, width-adaptive layout rather than pagination.
- Clicking an image opens a lightweight detail view.
- Detail view shows prompt, size, quality, palette, download, and delete.
- Complex filtering and search belong only on the History page.

## History Page

The History page is optimized for parameter reuse.

Layout:

- Table with thumbnails.
- One row per generation result.

Each row shows:

- Thumbnail.
- Prompt summary.
- Size.
- Quality.
- Palette.
- Generation time.
- Actions.

Actions:

- Reuse parameters in Generate page.
- View image/detail.
- Download.
- Delete.

Search and filtering:

- Search prompt text.
- Keep filters minimal.
- Do not turn this into a complex admin table.

Delete behavior:

- Use a lightweight confirmation.
- Avoid disruptive modal flows unless needed for accidental destructive actions.

## Palettes Page

The Palettes page manages fixed 8-slot semantic palettes.

Palette slots:

- `primary`
- `secondary`
- `tertiary`
- `text`
- `fill`
- `section_bg`
- `border`
- `arrow`

Layout:

- Left side: palette list with preset/custom grouping and default marker.
- Right side: selected palette editor.

Behavior:

- Preset palettes are read-only.
- Editing a preset should require copying it to a custom palette.
- Custom palettes can be created, copied, renamed, edited, deleted, and set as default.
- Color editing uses color swatches plus hex inputs.
- Do not allow adding or removing color slots.
- The Generate page consumes the available palettes and selected/default palette.

Backend changes are allowed and expected for custom palette persistence.

## Settings Page

The Settings page only handles image service configuration.

Fields:

- `baseURL`
- `API Key`

Behavior:

- API Key may be shown in full.
- Save and Test Connection are separate actions.
- Saving only persists configuration.
- Testing only runs when the user explicitly clicks Test Connection.
- Success and error states are shown inline.
- Do not use toast spam or blocking dialogs.

## Data Flow

Frontend state should be thin:

- Form draft state lives in React while editing.
- Durable draft state is saved through the backend workspace API.
- Settings are saved through the backend settings API.
- Palette data is loaded from the backend.
- Custom palettes should be persisted by the backend.
- History data is loaded from the backend history API.

Production serving:

- `npm run build` builds backend and frontend.
- `npm run start` starts Fastify only.
- Fastify serves `/api/*`, `/data/*`, and the built frontend assets.

Development serving:

- Vite serves the frontend.
- Fastify serves the API.
- Vite proxies `/api` and `/data` to Fastify.

## Required Backend API Surface

Existing API routes can remain:

- `GET /api/settings`
- `PUT /api/settings`
- `GET /api/workspace`
- `PUT /api/workspace`
- `POST /api/workspace/reference-image`
- `DELETE /api/workspace/reference-image`
- `GET /api/color-schemes`
- `POST /api/generations`
- `GET /api/generations/active`
- `GET /api/history`
- `GET /api/history/:id`
- `GET /api/history/:id/download`
- `DELETE /api/history/:id`

New or expanded palette routes should support:

- List preset and custom palettes.
- Create a custom palette.
- Copy a palette.
- Rename a custom palette.
- Update custom palette colors.
- Delete a custom palette.
- Set a default palette.

Settings should also support a manual connection test endpoint if the existing generation gateway does not already expose a safe way to validate credentials.

## UX Rules

- The app should always open directly into a usable tool screen.
- The Generate page should be the default route.
- Empty states must be short, such as `暂无结果`.
- Only the primary action on each page should be visually prominent.
- Secondary actions should be quiet.
- Do not ask users to confirm non-destructive actions.
- Do not show instructional prose inside the product UI.
- Do not use duplicated controls in multiple places when one clear location is enough.
- Do not hide essential generation controls behind advanced panels.

## Testing Expectations

Frontend tests should cover:

- Route navigation.
- Generate form payload construction.
- Missing settings hint behavior.
- Recent results detail behavior.
- History parameter reuse behavior.
- Palette creation/edit/delete/default behavior.
- Settings save and manual connection test behavior.

Backend tests should cover:

- Custom palette persistence.
- Default palette behavior.
- Palette validation for the fixed 8-slot schema.
- Connection test route if added.

## Acceptance Criteria

- The project contains a new React + Vite + TypeScript frontend.
- The frontend has exactly four top-level pages: Generate, History, Palettes, Settings.
- The Generate page follows the confirmed left/right plus bottom gallery layout.
- The History page is table-first and parameter-reuse-first.
- The Palettes page manages fixed 8-slot semantic palettes.
- The Settings page separates Save and Test Connection.
- Fastify serves the built frontend in production.
- `npm run dev`, `npm run build`, and `npm run test` work from the root.
- The UI avoids decorative, redundant, or instructional UX.
