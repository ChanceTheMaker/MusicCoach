# MusicCoach

A unified music practice app for piano, guitar, bass, saxophone, harmonica,
singing and drums, with the MusicCoach device simulator and USB installer.

Live app: https://musiccoach-3-89-78-67.sslip.io

Entry address: https://chancethemaker.github.io/MusicCoach

## Run and deploy

See [DEPLOYMENT.md](DEPLOYMENT.md) for local setup, Docker Compose hosting,
owner account setup, persistence, backups and device build provenance.
Node 22+ and PostgreSQL are required. Run `npm ci`, seed the database, build
public assets with `node scripts/build-public.mjs`, then `npm start`.

The production site serves the main app at `/`, the simulator at
`/device/musiccoach.html`, and the installer at `/device/musiccoach-install.html`.
All share one server and HTTPS origin. The first registrant needs the private
owner setup code and becomes Super Admin. No private workstation accounts,
imports, API keys or credentials are included in this repository.

## Included

- Instrument profiles, scrolling notes, drag/swipe keyboard, computer keys A W S E D F T G Y H U J K.
- Learn waits for the exact pitch and octave. Practice/Perform keep time. Whole-lesson repeat, tempo control, stars and local progress.
- Practice-room USB MIDI input for FM-1, SMK-37 and other keyboards. The separate device installer uses SysEx for explicitly confirmed firmware updates.
- Experimental microphone/interface input for single notes. Audio is analyzed locally, never recorded or uploaded. Connect starts capture; Disconnect stops it.
- Sax written/concert-pitch conversion for alto, tenor, soprano and baritone; C diatonic harmonica guidance; single-note guitar/bass exercises.
- Foundation exercises plus a PostgreSQL library of songs, primers, lessons, études, jazz studies and tune references.

## Instrument sounds

Bundled FluidR3 samples provide grand piano, steel-string acoustic guitar, fingered electric bass, alto/tenor/soprano/baritone saxophone and harmonica. The chosen instrument loads on demand (about 0.7–1.7 MB per bank; 7.6 MB total). Hamburger → Instrument sound contains volume, mute, Test sound and a retry control if loading fails. Volume/mute persist in this browser. Microphone practice stays silent except for explicit demonstrations.

Velocity changes loudness; these are single-layer rendered samples, not multiple recorded dynamics. Long held wind notes end when the finite sample ends. [Sample attribution and licensing](assets/soundfonts/ATTRIBUTION.md).

## Fingering and instrument views

Piano keeps falling notes. Guitar/bass use a right-to-left string/fret lane; fret-number markers specify positions, while horizontal distance represents time. Sax/harmonica use a scrolling treble staff. Sax displays written pitch. Sax key charts and harmonica hole diagrams occupy a dedicated panel to the left of the staff, stacking below on narrow screens. Hand diagrams remain below the playing area.

Instrument and input controls sit with transport controls above the staff. The upper-right hamburger opens appearance, sound and playing-guide settings. Piano, guitar and bass offer Off / Finger numbers / Finger colors, remembered on this browser, with matching hand and scrolling-note colors. Finger colors follow Yousician’s published mapping: thumb green, index yellow, middle purple, ring blue, little finger red (custom shades; numbers remain visible). Piano uses suggested right-hand lesson fingerings; guitar/bass use suggested fretting fingers with explicit position shifts (standard right-handed setup). Sax uses a black-and-white fingering chart for the current written C4–C5 lesson notes: three left-hand circles above three right-hand circles, a dotted separator, and adjacent octave/low-C symbols. Filled means pressed; hollow means released. The chart style follows the supplied visual reference; its altissimo fingerings are not imported. Harmonica always shows which instrument to use (a standard Richter-tuned C diatonic), a full 10-hole diagram with the active hole highlighted, and explicit BLOW/breathe out or DRAW/breathe in cues on each note. These guides do not assess physical fingering and are not universal fingerings for arbitrary imported songs.

References: [Yamaha saxophone fingering chart](https://www.yamaha.com/en/musical_instrument_guide/saxophone/play/play002.html), [Hohner tuning charts](https://hohner.de/fileadmin/cat/2020/catalogs/Harmonicas/pdf/complete.pdf). All diagrams in the app are original SVG.

Future orchestra profiles are listed in [ROADMAP.md](ROADMAP.md), deferred while we develop the current five instruments.

## Limits and next work

This is a prototype, not a complete instrument curriculum. Real-instrument microphone and physical MIDI testing remain. Pitch detection is tested with synthetic signals at 44.1 and 48 kHz; timing grades use arrival time without latency correction and microphone stabilization adds delay.

Use headphones, a clean signal and a brief silence between repeated microphone notes. Chord recognition from audio, bends, repeated-note attack detection, guitar/bass tablature, sax fingering assessment, duration scoring, pedal grading, section loops and advanced score editing are future work. Guide tones are disabled in microphone mode to avoid self-detection. The prototype does not assess playing technique.

FM-1 profile spans F3–G5 (27 keys), SMK C3–C6 (37). Match device octave settings to the displayed range. Progress stays in browser local storage. Google Fonts are optional external fonts with local fallbacks.

## Architecture / device roadmap

engine.js separates lesson schema, scoring and pitch detection from app.js browser input/audio/rendering. Events include written pitch, sounding pitch, beat and duration. A future native device implementation can reuse the lesson schema and scoring fixtures. No firmware was modified.

Next: hands-on MIDI/microphone validation; attack and latency calibration; hold grading and section loops; instrument-specific notation and curricula; then device-screen versions.

## Quest review / credits

Reference clone: ../fm1-quest, https://github.com/hericdk/fm1-quest at 41b50f95ff41d942f60a6328fb4f6a166e4fd033. Rhythm logic is gm_* in firmware/src/ui_quest_pages.c; song MIDI import is in web/editor.html. The author explicitly welcomes rhythm-game reuse. Code is GPL-3.0-only; assets have separate licenses.

Direct extraction requires adaptation: 27-key bitmasks, octave-insensitive pitch-class scoring, fixed-velocity target-note playback, firmware UI dependencies, and song storage at 0xD0000. Do not transfer these flash addresses to SMK without a storage-layout review. This alpha independently implements its browser code, rather than copying the RPG, artwork or songs. Preserve Quest / Sloop / Felucca attribution if their code is incorporated later.

Experience reference: https://support.yousician.com/hc/en-us/articles/204796991-Practice-and-Play-modes-in-piano . Original exercises and design here.

API references: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia and https://developer.mozilla.org/en-US/docs/Web/API/Navigator/requestMIDIAccess . Use localhost or HTTPS and a compatible browser.

## License

GPL-3.0-only. See LICENSE.

## Explore & train

The interactive circle of fifths selects a major key or its relative minor and shows the key signature, scale tones, and diatonic chords. Click note chips or fretboard tones to audition them, or Hear pattern to preview a sequence. Preview pauses active practice.

Practice this generates a scored lesson using the current input and instrument:
- Major, natural/harmonic minor, major/minor pentatonic scales.
- Major/minor/diminished/augmented triads, dominant seventh, major seventh and minor seventh chords.
- Root position, first/second inversions, plus third inversion for seventh chords.
- Ascending/descending arpeggios.
- All five movable major CAGED guitar shapes, retaining explicit string/fret positions in the scrolling lesson.
- CAGED-inspired bass chord-tone regions (root, third, fifth on standard four-string tuning); these are position maps rather than six-string guitar grips.

Piano with MIDI/onscreen input supports simultaneous chord exercises. Microphone and other instrument profiles train broken chords one note at a time. Keyboard exercises fit the selected FM-1/SMK range. C diatonic harmonica exercises reject patterns requiring bends/unavailable pitches. Generated piano patterns do not yet have curated per-key fingerings; the guide explicitly says when a fingering is unassigned. The existing beginner lessons retain their fingerings.

Changing instrument, keyboard profile or input returns to a foundation lesson; reload a theory exercise for the new setup. Progress is stored per generated exercise, input-independent, in the existing local progress system.

Theory references: [Yamaha circle of fifths](https://hub.yamaha.com/guitars/g-how-to/understanding-the-circle-of-fifths-and-circle-of-fourths/), [Fender CAGED introduction](https://www.fender.com/play/guitar/collections/caged-system-major-scales/courses/intro-to-the-caged-system?course-number=2). Lesson content and diagrams are generated locally; no external song catalog is copied.

## Appearance and training drawer
Three skins—Practice Room, Concert Hall and Neon Studio—each support light/dark mode. Choices persist locally. The play area has its own Color / Black & white notation setting, independent of the site skin and light/dark mode. Black & white uses a white background, black notes and monochrome guides across staff, fretboard and falling-note layouts. The preference persists locally. Explore & train opens the circle of fifths, scales, chords, triads, arpeggios and CAGED in a right drawer; Practice this closes it and loads the exercise. The drawer is non-modal: the rest of the teacher remains usable with no dimmed backdrop. The same attached edge tab opens and closes it; Escape also closes it.

Finger-color reference: [Yousician piano notation](https://support.yousician.com/hc/en-us/articles/208678605-Notation-options-in-piano).

## Pages
- `index.html`: landing page with instrument links and a short introduction.
- `teacher.html`: compact, full-width practice interface. The song/lesson selector is at the top; the library currently contains original exercises and generated theory patterns. Links may preselect an instrument with `?instrument=piano`, `guitar`, `bass`, `sax` or `harmonica`.
- Instrument and input controls sit above the staff. Appearance, sound and guide settings remain in the hamburger menu. The training tools open from the labeled Explore & train pull tab fixed to the right edge.

## Searchable library and imports

Browse library beside the lesson selector searches PostgreSQL by instrument, title, composer or skill/tag. Filter by material type, level and playable-only, with 24-item pages. The catalog includes 370 playable instrument arrangements/studies plus 210 reference entries (30 standard titles across seven instruments). Guitar has 66 playable entries, the other melodic instruments have 54 each, and drums have 34 rhythm studies. [Repertoire notes](library/SOURCES.md) explain scope and provenance. Level labels are editorial guidance, not accredited grades.

Import music accepts up to 100 selected files, processed one at a time, up to 8 MB each:
- MIDI (.mid/.midi): select a track or merge tracks; PPQ timing retained, one practice tempo.
- MusicXML (.xml/.musicxml) or compressed .mxl: partwise scores, voices, rests, ties and initial tempo. Measures follow file order; repeats, grace notes, ornaments, articulations and tempo maps are not fully interpreted.
- Lesson JSON: notes with written MIDI pitch, beat and duration, or an exported library item containing score.notes.

Preview each part, set instrument, level, tempo and tags, and transpose before Save & next. For sax, MIDI normally uses concert pitches; enable conversion and choose sax type. MusicXML normally already uses written pitches. Imported chords need MIDI/onscreen input or a single selected melodic part for monophonic microphone practice. The importer confirms your entitlement to use the material; it does not establish a licence. Imports are private to this local installation, not automatically published. Export JSON beside any playable piece to keep or reimport it. No PDF, audio-to-score or commercial streaming import is implemented.

Run npm run db:backup for a binary PostgreSQL backup under .runtime/backups. Keep a copy outside the working directory. Seeding is idempotent and preserves imports. Search queries use parameters; import payloads and score sizes are validated. No database credentials enter the browser.

## Drum trainer

Drums has eight pads with synthesized kit sounds, scrolling rhythm lanes, keys 1–8, touch/mouse and USB MIDI input. Common GM drum families map to kick, snare, closed/open hi-hat, clap, low/high tom and cymbal. MIDI checks mapped voice and timing; cymbal/tom articulations are grouped rather than fully distinct. Unsupported percussion pitches are omitted from playback; use GM family notes supported by the kit.

Acoustic drums uses microphone transients instead of pitched-note detection. Hit threshold adjusts sensitivity. It checks timing only: it cannot identify the drum, verify sticking, or separate simultaneous strokes. Simultaneous targets collapse into one onset in this mode. An 85 ms retrigger guard limits very fast rolls. Use headphones to prevent guide sound entering the microphone; automatic backing/metronome is not implemented. Audio is analyzed locally and never recorded/uploaded. Automated transient tests pass; physical acoustic and MIDI drum-kit validation remains.

The input row appears first in the practice console. The row beneath groups icon-only Play/Pause and Restart, tempo, repeat and Learn/Practice/Perform. Button tooltips and accessible names retain the action labels.

### Learn playback

Learn has two remembered settings: **Wait** pauses for your correct note; **Demo** plays the selected lesson through the browser instrument at the tempo slider setting. Demo works without a connected input, supports pause/restart and Repeat, and never changes your earned practice scores. Switch to Wait to play it yourself.

Practice Room uses blue and slate in both light and dark modes. Explicit finger-color guides retain their instructional colors.

### Optional scoring

Open ☰ → Scoring → Show scores to show or hide points, accuracy, combos, personal bests, lesson stars and the scored results popup. This preference is remembered; hidden scores still save progress locally. Wait gives 100 points per correct note. Practice and Perform award 100 / 70 / 40 points for timing errors below 90 / 180 / up to 250 ms. Wrong notes and misses break combos and reduce accuracy, without subtracting earned points. Live accuracy counts attempts so far; final accuracy includes every lesson note. Demo earns no points. Acoustic drums score hit timing only.

### Singing

MusicCoach includes Singing with eight original vocal warm-ups, three starting ranges (C3, G3, C4), microphone note matching, and a live sharp/flat meter. Demo uses a sampled piano reference. The singing library includes 54 playable arrangements/studies and 30 tune references, and accepts your licensed MIDI/MusicXML/JSON imports. Scoring checks note identity and onset timing; the cents display is informational and does not assess vocal technique, tone quality, breath support or sustained-note intonation. Audio stays local. Real-voice microphone testing remains pending.

### Scrolling vocal lyrics

Singing shows a right-to-left lyric strip synchronized to the staff. Wait holds both at the current note; Demo/Practice/Perform follow the tempo. Original warm-ups show Ah, Mm or solfège cues. MusicXML/MXL imports retain the first lyric verse on each note (including hyphenated syllables); lesson JSON uses an optional `lyric` string per note. Lyrics survive preview, save, export and range changes. MIDI currently imports notes only. Missing lyrics use Ah; no copyrighted lyrics are supplied automatically.

### Chord and arpeggio lessons

The Song / lesson menu includes four chord lessons and four arpeggio lessons for piano, guitar, bass, saxophone, harmonica and singing. The same lessons are searchable in Browse library under chords, arpeggios or harmony. They cover C major, A minor in first inversion, G7 in second inversion, C major in first inversion, and a C–F–G7–C arpeggio progression. Practice tips explains each voicing and how to play it.

Piano MIDI/onscreen chord lessons use simultaneous notes. Selecting microphone input keeps the selected lesson and separates its chord tones; every other melodic profile uses single notes. Arpeggios are always sequential. Written sax pitches retain the selected transposition, C diatonic harmonica stays within unbent holes 4–7, and singing includes solfège cues with the existing starting-range control. Piano fingering is not assigned for these new patterns. Demo, Wait, Practice, Perform and Repeat work with the new lessons.

Drums adds Together on the beat and Around the kit as unpitched coordination counterparts. MIDI/onscreen input checks simultaneous voices; acoustic input collapses simultaneous hits to one timing target. These are rhythm exercises, not pitched chords or arpeggios. Run `npm run db:seed` to add the library entries to an existing installation; user imports are preserved.

### Guitar chord diagrams

Guitar adds twelve chord-shape exercises to the lesson menu and library: C, G, D, A, E, Am, Em, Dm, G7 and Fmaj7, plus C–Am–Fmaj7–G7 and G–Em–C–D changes. Each uses explicit string/fret positions from a standard open chord. Hold the shape and pick its playable strings from low to high, then use the rest to prepare the next shape. These exercises assess individual pitches, not a complete strum or physical finger placement; pause for unscored strumming with the diagram.

The stationary chart shows the complete shape with finger numbers, X for muted strings, O for open strings, and an outline around the string to pick. High e is at the top, low E at the bottom, and frets increase to the right, matching the scrolling fretboard. A fixed hand guide highlights the fretting finger for that string. Diagrams remain visible in chord-shape lessons even when ordinary fingering guides are off. Demo follows the currently sounding note; Wait follows the next target. Diagrams and their string positions are retained when loading the curated exercises from Browse library. JSON reimports currently retain notes but omit chord-diagram metadata.

### Full sheet notation

Use **Full sheet** beside Browse library to switch between the scrolling practice view and the complete lesson as sheet music. The preference is remembered. Switching views preserves the lesson, playback position and score. A moving needle follows the existing lesson clock; Wait holds it for the next correct note, while Demo, Practice and Perform advance at the selected tempo. The sheet scrolls vertically when the needle reaches a new line. You can also scroll through it yourself while paused or playing. Restart and Repeat return to the first line.

Piano uses a grand staff split at middle C; guitar and bass use octave-transposing clefs; sax shows written pitch; harmonica and singing use treble clef; drums use percussion notation. Chords, rests, beams, ties, bar numbers and available vocal lyrics are displayed. The onscreen instrument and stationary fingering/chord diagrams stay available. Layout adapts to the available width, and long pieces engrave nearby lines as you scroll to keep the interface responsive.

Built-in lessons and MIDI/older imports use practice notation reconstructed from the selected lesson's note events. Rhythms are rounded to the nearest sixteenth when necessary and marked in the sheet heading; playback timing is unchanged. Key signatures, tuplets, dynamics, original staff/voice assignments and repeat markings are not retained by this view. Long silent passages are condensed into labeled multi-bar rests. VexFlow 5.0.0 and its embedded fonts are bundled locally; credits and licenses are in `assets/vexflow/`.


MusicXML/MXL imports now retain the original source score. Full sheet uses the locally bundled OpenSheetMusicDisplay 2.2.1 renderer for original voices/staves, key signatures, tuplets, slurs, dynamics, articulations, ornaments, fingerings, pedal marks, lyrics and explicit system breaks. Part selection and transposition are preserved, including JSON export/reimport. Layout adapts to the viewport; engraving may differ from MuseScore. Reimport older MusicXML lessons to retain their source. Repeats and expressive markings are displayed; practice still follows written measure order at the selected fixed tempo, and grace notes are not graded. Credits and licenses are in `assets/osmd/`.

Count-in is a remembered toggle beside Tempo. When enabled, every Start, Continue and Repeat gives one bar at the lesson meter and selected tempo, holding the current playhead and score still until playback begins. Pausing during the countdown preserves the same song position; continuing starts a fresh count-in. Turning it off during a countdown resumes immediately. Clicks follow the sound volume/mute setting. Instrument tabs include matching icons. Scrolling treble staffs use the bundled Bravura music font anchored on the G line for saxophone, harmonica and singing.


### Guitar and bass Tab view

Choose **Tab** next to Full sheet for a complete, scrolling tablature with a moving playhead. Guitar uses six strings and bass four by default, highest string at the top. Imported tunings and capo are retained. Existing exercise string/fret positions are respected; otherwise playable positions are assigned, with simultaneous notes placed on distinct strings. Sustains appear as lines after the fret number, and parenthesized numbers continue held notes on a new line. Unsupported pitches/chords are flagged instead of silently omitted. Switching between the neck, sheet and tab keeps playback position and score. Count-in holds the tab needle at the resume position.

### Guitar Pro and score links

Browse library > Import accepts Guitar Pro 3?8 files (`.gp3`, `.gp4`, `.gp5`, `.gpx`, `.gp`) using alphaTab 1.8.4 (MPL-2.0, https://alphatab.net). Choose a track before saving. Notes, ties, exact onset timing, string/fret positions, tuning and capo survive saving and JSON export. Practice uses written bar order, one tempo and the initial meter; advanced guitar effects and original Guitar Pro engraving are not reproduced. Transposing or merging imported tracks regenerates positions for the selected instrument's standard tuning.

**Import from link** accepts public HTTPS download links to supported score files (up to 8 MB, with redirects). Links to login screens or ordinary webpages need the site's download/export step. Paste a Songsterr song link to open its official export page, then download Guitar Pro using your signed-in account and choose that file in MusicCoach. Songsterr downloads currently require account download access; MusicCoach does not share your browser session or bypass it. No automatic song-page scraping is used.


### Linked YouTube playback

Use **Video** to attach a YouTube URL to the current lesson. With **Sync playback** enabled, MusicCoach follows the video's clock: Play, Pause, resume count-in, song-position seeking and video speed control share the same position. Buffering holds the score; Wait mode holds the video for the next note. Synced playback uses the recording instead of the synthesized Demo sound. Seeking starts a new attempt from that point and does not overwrite a complete lesson's best result.

**Video start (seconds)** aligns beat one to a point in the recording; **Song tempo (BPM)** is the recording's reference tempo. Use **Align here** to align a paused video moment and score position. Video metadata is saved with user-imported songs and included in JSON export/reimport; browser storage also remembers links for built-in lessons. Songsterr's per-beat synchronization map is not imported, so recordings with tempo changes may need further alignment. The linked Milk and Cookies recording uses the same YouTube video shown on its Songsterr page.

### Note circle sizes

Settings > Play area > **Note circles & numbers** offers Small, Medium and Large for the scrolling guitar and bass fretboards. Circles and fret numbers scale together, update immediately without restarting playback, and retain their centers/string positions. Medium is the default; the choice is remembered on this browser. Large circles fit within adjacent strings even in a compact viewport.


### Front-page musical tornado

The front page features an original 20-second ManimGX film: all seven instrument icons gather, swirl through a tapered vortex of notes and little staves, then flow into seven smiling musician portraits. It is silent, loops, pauses outside the viewport or in a hidden tab, and has a keyboard-accessible Play/Pause control. Reduced-motion visitors see a static poster until they choose Play. Only the rendered MP4 and poster are loaded by the browser; Python and ManimGX are not runtime dependencies.

Source artwork and animation live in `animations/music-tornado/`. Built with ManimGX 0.1.1 using the official guide at https://manimgx.academa.ai/llms.txt. Install with `uv tool install --python 3.14 manimgx`. From this repository, inspect with `manimgx inspect animations/music-tornado/scene.py -t 1.8,5,8,11.5,14.8,17 -o animations/music-tornado/storyboard.png`, then render with `manimgx render animations/music-tornado/scene.py -o assets/animation/music-thoughts.mp4 -r 1600x900 --fps 30 --crf 22 --preset fast`. Run `poster.py` with the ManimGX environment's Python to regenerate the poster. The six inspected story frames have no reported layout problems. The local server supports MP4 byte ranges for browser playback.


The sheet and tab playhead is draggable. Click a position on the score or drag the blue line to seek, including across systems; dragging near the viewport edge scrolls the score. Focus the playhead and use Left/Right for quarter-beat steps, Shift+Left/Right for whole beats, or Home/End. Touch users can drag the handle or tap the score while retaining vertical swipe scrolling. The scrolling game views also accept click-and-drag seeking. Seeking pauses playback and starts a fresh attempt from that point. With Sync playback enabled, the video follows the released position; disable Sync playback to position the score independently before using Align here.


### Personal accounts, progress and resume

Sign in or create an account from any page. The first registration is assigned `super_admin` in a transaction and inherits existing local imports; subsequent accounts are `learner`. Usernames are case-insensitive. Passwords use salted scrypt; sessions use hashed random tokens and HttpOnly/SameSite cookies. Save the one-time recovery code after registration. Imported music, progress, favorites, resume state and AI chats are scoped to the account. Guests can still use the built-in lessons. The Super Admin can configure the AI connection from AI coach chats; a key is never returned to the browser.

Favorite songs/exercises and instruments from the practice room; check Completed or finish a full lesson to keep a learning record. Favorites reopen their material, including generated exercises. Resume where I left off is on by default (Settings > Continue learning). It restores instrument, song, view/settings and playhead paused; selecting a different instrument explicitly takes precedence. Account state is stored in PostgreSQL; guest state stays in the browser.

Start with `npm start`. The launcher loads `.env` before starting Node so startup-only settings such as an optional `NODE_EXTRA_CA_CERTS` path are honored on Node 22. TLS verification stays enabled. Local development binds to localhost. Production uses HOST and PUBLIC_ORIGIN behind the HTTPS proxy; see DEPLOYMENT.md.

### MIDI accompaniment and YouTube

Use YouTube and Mute video audio are independent controls. Disabling Use YouTube removes its loading and clock dependency. The Video button only hides or shows the viewer and never pauses playback. MIDI instruments & backing tracks provides a mute for every imported part. Practice parts are silent by default in Wait, Practice and Perform; Demo includes them unless explicitly muted. The MIDI transport follows pause, seek, count-in and the song clock. Imports retain all MIDI/Guitar Pro/MusicXML parts while selecting a separate practice part. JSON export retains the parts. Older imports need the original file to recover parts that were previously discarded. The existing Milk and Cookies item was upgraded in place with its two guitar parts, bass and drums; its video alignment and practice notes were preserved.

The local sample banks currently approximate unsupported GM programs with a piano or related instrument bank; each mixer row names the sound actually used. Guitar programs currently use the acoustic guitar bank. Expressive Guitar Pro effects and tempo maps remain outside this practice renderer.

### AI coach

Super Admin: account menu > AI coach chats > AI connection settings. Save an OpenAI API key and model there, or set `OPENAI_API_KEY` and optional `OPENAI_MODEL` in `.env` and restart. Default: `gpt-4.1-mini`. Messages and optional instrument/lesson context use the [OpenAI Responses API](https://developers.openai.com/api/docs/guides/text) with `store:false`; conversation history is stored privately in this app's database. No microphone audio is sent. API usage is billed to the configured OpenAI project. The API key is server-only. Chats can be reopened, favorited and deleted. Input drafts survive a reload in the same tab. Requests time out with a visible error and keep the draft for retry.

### Connections, bands and Collab Rooms

Connections is an opt-in musician directory for signed-in users of this server. Profiles support instruments, skill, age ranges (no birth dates), genres, interests and a bio. Search the directory, send/accept connection requests, and invite accepted connections to your rooms. Hidden profiles do not appear in discovery.

Create a band, describe its sound and instruments wanted, and review join requests as its founder. Accepted members automatically join the band's rehearsal Collab Room. Founders can edit or hide listings. Members can leave; pending applicants have no access to the band room.

Collab Rooms have private invite codes, membership checks, presence and text chat refreshed every two seconds while open. Audio/video buttons are explicitly disabled placeholders for the later peer-to-peer jamming work; this release does not transmit live audio or video between users.

### Recording Room

A separate local multitrack DAW supports microphone/interface takes, audio import, waveform clips, dragging/numeric offsets, non-destructive In/Out trims, mute/solo, volume/pan, master volume, a metronome and recording count-in. Projects autosave to IndexedDB under the current account or Guest on this browser. Up to 16 tracks and 10 minutes of source audio per project; individual imported files are limited to 30 MB. Audio is not uploaded. Export renders the current audible mix to a stereo 44.1 kHz, 16-bit PCM WAV, using Web Audio's [OfflineAudioContext](https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext/startRendering). Projects do not yet sync between devices, and there is no live collaborative recording. Device latency may require moving the recorded clip to align a take.

Validation: `npm test` covers timing, notation, import preservation, mixer isolation, account validation, resume selection, video visibility and WAV encoding. `npm run test:accounts` uses a disposable PostgreSQL schema to exercise registration roles, private imports/progress/chats, session invalidation and recovery, room membership/messages, profile search, invitations and band access; it never creates users in the real library.
