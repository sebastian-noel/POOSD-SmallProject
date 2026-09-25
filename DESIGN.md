# Contact Manager design system

## Theme and scene

A student checks a contact on a phone between classes, then updates it on a laptop
in a bright campus library. A light, low-glare surface with dark, readable text
supports both settings. There is no automatic dark theme in this design.

## Color strategy

Restrained across the app: quiet gray-green surfaces and one forest accent
for actions, focus, and the brand mark. Authentication uses a slightly deeper sage-neutral welcome panel. No gradients or glass effects.
All tokens use OKLCH in assets/ui.css.

## Typography

Use the native system sans-serif stack, with no external font requests. Main
headings are 2.25rem; the welcome panel heading is 2.5rem; section titles 1.25rem;
body text 1rem; supporting text 0.875rem. Strong hierarchy comes from scale,
weight, and spacing. Prose is limited to 65ch.

## Layout

Authentication: a two-column composition on wide screens, compact brand header
and one-column form on mobile. Contacts: quiet top navigation, page heading,
search form, and a spacious ruled table. An inline editor opens beside the list
on large screens and above it on narrow screens. Avoid overlays for routine edits.

## Components

Rounded 10px controls, minimum 44px action targets, labels above inputs, optional
fields marked in text, persistent focus outlines, specific error/status messages.
Native checkbox appearance and autocomplete remain available. Contact values are
rendered as text. Mobile table rows retain explicit labels and semantic roles.

## Motion

Use 180–220ms opacity/transform transitions with ease-out-quint. The editor reveal,
button feedback, and saving/loading indicators communicate state. There is no
page-load choreography. prefers-reduced-motion disables transitions/animations.

## Maintenance

Shared tokens and controls live in assets/ui.css; authentication composition in
assets/auth.css; dashboard layout in contacts/styles.css. Use Impeccable document
to refresh this guide when the visual system changes.
