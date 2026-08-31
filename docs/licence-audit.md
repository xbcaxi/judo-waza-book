# Licence audit for the app editions

Audited 2026-08-31, for the decision the app workstream needs: can what this
repository holds be bundled inside an installed app binary, first free, then
paid? Serving a file from a website and shipping it inside a product are
different acts, and a paid product is unambiguously commercial, which is the
line CC BY-NC-SA and every good-faith image on this site care about.

Method: every `provenance` declaration across the collections (101 in
total), the `media/` tree file by file against those declarations, the
reference transcriptions, the audio pipeline, and the inbound terms in
CONTRIBUTING.md. Counts below are from the data, not the NOTICE table,
though today the two agree.

## What a bundle ships, and where each item stands

| What | Count | Provenance | Free app | Paid app |
| --- | --- | --- | --- | --- |
| Text and data (narrations, translations, syllabus JSON) | all | Written for the project | Yes | Owner's words: yes, by dual-licensing. Contributors': see below |
| Images, `own` | 3 | Waza Book (three skill illustrations) | Yes | Yes |
| Images, `third-party` | 33 | BJA pictorial guides (22), JudoScotland syllabus sheets (9), watermark-identified (2) | Good faith + takedown, as the site | No. Permission or replacement first |
| Images, `unknown` | 65 | A compiled club document; original sources unrecorded | Good faith + takedown, as the site | No. Replacement only: there is nobody to ask |
| Images, `licensed` | 0 | - | - | - |
| MEXT 2013 page scans | 48 | Permission recorded as "free with attribution", NOT verified | Verify first (see below) | Verify first |
| Kodokan definitions | ~100 sentences | Quoted, one sentence per technique, cited | Yes, as quotation | Sensitive: quotation inside a paid product; ask, or trim |
| Pronunciation audio | 247 | Synthesised (Azure AI Speech); the project owns the output | Yes | Yes |
| Fonts (Noto Sans JP, Archivo) | - | SIL OFL 1.1 | Yes | Yes |
| Brand assets, icons, sponsor open-slot art | - | Own | Yes | Yes |
| Video | 0 bundled | Streamed from YouTube/Vimeo on tap, never shipped | Yes | Yes |

## The four findings that matter

**1. 98 of 101 images are not the project's to ship.** NOTICE.md already
says so plainly (`media/**` is excluded from the project licence), and the
site lives with that through good faith plus a fast takedown route. An app
weakens exactly that mitigation: a takedown removes a file from the next
release, but every installed copy keeps it, so the 14-day removal promise
can only ever be prospective in an app. Acceptable risk for a free app at
the site's own standard; not a foundation a paid product can stand on.

The decision taken (2026-08-31): **replace them with our own artwork**
rather than chase permissions. CONTRIBUTING.md already calls original
replacement artwork "the single most useful contribution"; this makes it
the plan rather than the hope. It can be incremental: images are optional
in the schema and the site's ImageFrame renders a labelled placeholder, so
pulling an unknown image degrades a page rather than breaking it.
Suggested order: the 65 unknowns first (nobody to ask, so nothing is lost),
then the BJA and JudoScotland sheets (which could alternatively be asked
for permission, since both are known and the site serves their members).

**2. The MEXT scans are probably fine and provably nothing yet.** The
record (`reference/mext-2013.json`) says free with attribution, unverified.
MEXT publishes on mext.go.jp, and Japanese government sites generally carry
the Government of Japan Standard Terms of Use, which permit reuse including
commercial with attribution, compatibly with CC BY 4.0. The action is to
verify that the 2013 guidebook PDFs fall under those terms and record the
answer in `reference/mext-2013.json` with a link. If they do, the 48 scans
and the machine-assisted translations built on them are clean for both app
editions with the attribution kept. Until verified, treat as the
third-party class. Note the translations too: the `perspectives/mext/`
prose is derived from MEXT's text, so this verification covers words as
well as pictures.

**3. Contributor text cannot be sold as things stand.** CONTRIBUTING.md
takes contributions under CC BY-NC-SA "or any later licence the project
adopts for the whole reference", and contributors keep their copyright.
That wording lets the project relicense the reference; it does not clearly
let the owner sell a product containing contributors' words while the
public licence stays NC. Today this is nearly moot, since the corpus is
essentially owner-authored, which is exactly why it is cheap to fix now:
if a paid edition is ever intended, widen the inbound grant before
third-party prose accumulates. If the paid thing is app conveniences
rather than the content itself (the direction currently favoured), this
never bites at all.

**4. The Kodokan quotations are the smallest exposure but not zero.** One
cited sentence per technique from their 2022 definitions book is defensible
quotation on a free reference. Inside a paid product it is worth either a
courtesy permission request to the Kodokan or keeping the paid element
strictly to app conveniences so the content itself is never what is
charged for.

## What this means for the app decision

- **Free app: shippable at the same risk the website already accepts**,
  with one honest addition to NOTICE.md when it ships: removal from the app
  reaches future installs only.
- **Paid app (charging for the content): blocked** until the images are
  replaced or permissioned, MEXT is verified, and the contributor grant is
  widened. The own-artwork programme clears the largest block.
- **Free app with a paid convenience unlock (sync, backup): clean today**
  except for the same image caveat every edition carries, because the
  content is never the thing being sold. This is the route the workstream
  currently favours; see the website repo's docs/native-app.md.

## Actions

1. Own-artwork replacement programme for the 98 non-own images, unknowns
   first. Update each `provenance` to `own` as files land; the counts in
   NOTICE.md and on the site's /rights/ page derive automatically.
2. Verify the MEXT terms and record the answer with a link in
   `reference/mext-2013.json`.
3. If a paid content edition is ever intended: widen the CONTRIBUTING.md
   inbound grant first, and approach the Kodokan about the quotations.
4. When the free app ships: add the installed-copies limitation to
   NOTICE.md's removal section.
