Our morning routine started as a text message to my partner. Let's get both kids into the same rhythm: breakfast, clothes, teeth, out the door. Decide the food the evening before. Offer two choices. Have something to look forward to at the end of the week.

I wanted to turn that agreement into something our six-year-old and three-year-old could see. So I asked Codex to build an Icelandic morning routine app, including custom illustrations of the kids.

The result is [Morgnarnir okkar](https://morgunrutina.solberg.club): five weekday lanes, familiar food stickers, a small parent editor, and stars we award ourselves. It is a static website that remembers the plan in the browser. The complete prompt template below lets you build a version around your own family.

![The Icelandic weekly routine, with five weekday lanes, two breakfast options per day, shared illustrated steps and a rewards column.](/blog/morning-routine/week.webp)

_Real app capture with example breakfast picks, progress and rewards, framed for this post._

## Decide the morning before designing the screen

The first useful correction was the order. Breakfast starts at **07:10**, then we get dressed. A nice illustration of the wrong routine would still be the wrong routine.

Most of the sequence is shared: breakfast, get dressed, brush teeth, outdoor clothes. At the end it forks. Our son needs his school things and lunchbox. Our daughter needs her helmet because I ride her to preschool on the back of my Tern GSD. The final sticker shows both children ready, with those differences visible.

Breakfast is individual. Each child picks one of the day's two foods. Choosing cereal for one should not choose it for the other. The other steps use shared completion marks; I didn't want a system for assigning which parent assists which child.

These are small product decisions, but they define the app much more than the framework does. I asked Codex to involve me in the design direction while handling routine implementation choices itself.

## Choose the characters, then make the sticker library

A three-year-old cannot depend on the labels. The pictures need to explain the action.

I supplied photos of the children and breakfast packaging, then asked for illustration drafts to view in Preview. We settled on playful 3D clay characters. Our son is blonde, loves basketball and Pokémon, and is visibly older. Our daughter has strawberry-blonde hair and loves pink. Those details made the illustrations specific to us while keeping the poses simple enough to read.

The same visual style carries through the breakfast and reward stickers. Our food library contains Pokémon chocolate cereal, Weetabix, Cheerios, toast with cheese and jam, and oatmeal sprinkled with cinnamon. The recognizable cereal boxes matter: they connect the picture to the thing in the kitchen.

There is an important production detail here. A beautiful collage is not yet an asset library. Each sticker needs room around it so it can be cut out without clipping a hand, a bowl or its shadow. Ask for an orderly grid, generous gutters, no overlapping objects, and labels rendered separately by the app.

Codex generated the sheets, then extracted individual transparent PNGs. Background removal needs care: white eyes, clothes and sticker borders should stay white. Inspect the actual cutouts, including on a dark background, rather than assuming the generated grid is perfectly regular. Keep the approved reference sheet and exact prompts so future stickers can match.

## Give parents a small editor

The week comes populated with two different breakfast choices per day. Editing means pulling a food sticker from the tray into either slot. There is also a tap-to-place option, so changing the plan doesn't depend on dragging.

![Two framed editor details: the five-food sticker tray and Monday's lane with editable breakfast slots and routine ordering controls.](/blog/morning-routine/editor.webp)

_The parent editor: change what is offered, then let each child make their own pick._

The behavior around a replacement matters. Dropping the other offered food into a slot swaps the choices instead of creating two identical options. A child's existing pick survives while that food is still available. The middle steps can be reordered, with breakfast fixed first and departure fixed last.

All of this stays in localStorage. There is no account, backend database or image-generation call during breakfast. Menus persist, progress is separated by calendar week, and JSON export/import can move a plan between browsers. That also means the kitchen tablet and a parent's phone do not automatically share changes.

## Leave the stars to us

Each weekday has two star slots, one for each child. Our agreement is five stars each and then something fun. The app explains that agreement, but doesn't enforce it. Ticking the final step doesn't automatically award a star, and rewards are never locked behind a counter.

The rewards are an ice cream outing, the Pokémon shop, the cinema, Húsdýragarðurinn, the LEGO shop and new hairpins. Tapping a reward makes it glow. More than one can be highlighted.

![A large Tuesday routine beside six illustrated rewards; the Pokémon shop and pink hairpins have colored halos following their sticker outlines.](/blog/morning-routine/day-and-rewards.webp)

_The daily view gives the pictures more room. The rewards remain selectable regardless of the stars._

The pink-and-blue halo follows the transparent sticker's silhouette. It is a small detail, but much nicer than lighting up a rectangular card. It pulses gently, with a static version when reduced motion is requested.

## Make your own with Codex

The useful part to copy is the sequence: settle the family routine, choose an illustration style, approve the characters, generate cuttable stickers, then build and test the interactions. Giving an agent those checkpoints leaves room for your family to make the decisions that matter.

Replace the bracketed values below and paste the whole prompt into a Codex session in a new project. Optional photo references should point to your own local files or attachments. Image generation needs to be available in that session; the finished app only needs the resulting image files.

[Download the plain-text prompt](/blog/morning-routine/recreate-with-codex.txt).

```text
Build a visual morning routine app for my family. Work with me in stages so I can choose the product direction and illustration style before you generate the full sticker library.

FAMILY BRIEF — replace these values, or ask me to fill them in
- Language: [Icelandic / your language]
- Children: [ages, hair, distinguishing features, favorite colors and interests]
- Optional likeness references: [local photo paths or attached photos]
- Days: Monday–Friday
- Start: breakfast at [07:10]
- Shared steps after breakfast: [get dressed, brush teeth, outdoor clothes]
- Departure differences: [schoolchild with lunchbox; preschooler with bike helmet]
- Breakfast library: [five foods, their toppings, optional packaging photos]
- Rewards: [ice cream, a favorite shop, cinema, petting zoo, LEGO, hair accessories]
- Main device: [tablet / laptop / phone]
- Hosting: [local only initially; discuss deployment later]

1. SETTLE THE ROUTINE
Read repository instructions and inspect the project first. Ask only the few product questions that matter: language, timing/order, shared versus separate steps, breakfast foods, devices, and rewards. Treat appearance and family preferences as choices for me. Make routine technical decisions yourself.

Use pictures to make each action understandable to a child who cannot read. Keep labels short and in our language. Two children share the same sequence; each independently chooses one of that day's two breakfast foods. No assigning adult support. The final picture should make their different departure needs obvious.

Summarize the brief in a file, then show your proposed layout and next decision. Don't build a large app before the direction is clear.

2. LET ME CHOOSE THE ART
Use Codex's image-generation capability. If it is unavailable, tell me what is missing instead of substituting generic icons or pretending artwork has been generated.

Generate a comparison sheet with the SAME children, poses and example objects in three styles: picture-book watercolor, textured paper cutouts, and playful matte 3D clay. Use my optional photos for likeness and food-packaging references. Show the drafts; on macOS, open them in Preview if I request that. Wait for my style choice.

Refine the selected style using the children's interests. Keep the actual hair shapes, age difference and recognizable features. Put favorite themes in small clothing details, so the action remains clear. Show the revised children for approval before making the complete atlas.

3. GENERATE STICKERS THAT CAN BE CUT APART
Use the approved character sheet as the style reference for every new atlas. Make separate sheets for routine actions, breakfast foods, and rewards. Use a strict 3-by-2 grid with one isolated sticker per cell, generous clear gutters, and no overlap. Keep each entire object and its shadow inside the cell. For more than six stickers, make more sheets.

Prefer real transparency if the tool supports it. Otherwise use a uniform white background that can be removed. Do not put labels into the artwork; render them as app text. Preserve recognizable food packaging when I supplied references.

I authorize cropping and background removal to extract the generated stickers. Inspect the actual grid boundaries; do not assume the generator obeyed the requested coordinates. Save separate transparent PNGs with descriptive filenames. Remove stray fragments from neighboring cells. Preserve white clothing, eyes and sticker borders; do not make every white pixel transparent. Check every result on both light and dark backgrounds. Retain original atlases and exact prompts in the project, but keep original family photos out of the public build.

4. BUILD THE SINGLE-PAGE APP
Use a simple stack suitable for the repository. Include:
- Five weekday lanes. Breakfast and its time come first, followed by the shared steps and a final departure picture.
- Exactly two DIFFERENT default breakfast choices per day, selected from the food library. Populate all days on first load.
- Individual breakfast picks for each child, with understandable visual markers. Shared completion marks for the remaining steps.
- A parent editing mode with a food-sticker tray. Drag a sticker onto either breakfast slot to replace that choice. If it duplicates the other slot, swap them. Clear a child's saved pick only if that food is no longer offered.
- A tap-to-place alternative and accessible buttons for people who cannot drag. Support pointer/touch dragging, a visible drag preview, and clear valid drop targets.
- Reordering the middle routine steps within a weekday. Keep breakfast first and departure last. Include buttons as an alternative to dragging.
- One manually awarded star slot for EACH child on EACH day. Stars must be independent of checkbox completion.
- A rightmost rewards column on wide screens. Tap rewards to highlight them, including multiple rewards if desired. Explain the family's five-star agreement in a short sentence; do not enforce unlocking, disable rewards, or award stars automatically.
- A soft pulsing pink-and-blue glow around the actual transparent sticker silhouette, using its alpha as a mask or colored drop shadows. No rectangular card glow. Honor prefers-reduced-motion with a static highlight.
- A large daily view and responsive layouts with practical touch targets.
- Versioned localStorage for menus, choices, manual stars and highlighted rewards. Separate progress by local calendar week, while retaining the menu. Handle malformed or unavailable storage visibly and safely.
- Undo, JSON export/import, and a printable week if useful.

The finished app should use bundled artwork and require no image API key, account, backend database, or cloud sync. Explain that different browsers/devices have separate plans and that export/import moves them.

5. VERIFY AND DELIVER
Test actual breakfast dragging, tap placement, reordering, independent picks, manual stars and reward highlights in a browser. Refresh to verify persistence. Test two-choice invariants and invalid saved data. Check phone/tablet layouts, missing images, console errors, and reduced motion. Keep test/demo state separate from my real plan.

Show me the working app and the next design checkpoint. Include run/build instructions, saved asset paths, and any real limitations. If I authorize GitHub/deployment, create a private repository, inspect the host's existing setup, deploy the static build with HTTPS, and verify the public assets. Do not assume my server, domain, SSH alias or ports match the author's.
```
