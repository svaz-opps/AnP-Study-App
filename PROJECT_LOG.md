# Project log

## 2026-11-23 — Indexed the BIOL 2401 final exam study guide
- Source: https://lsc-nh-biol2401-final-study-guide.netlify.app/ (Dr. Víctor García Martínez, LSC-North Harris).
  Host added to the Default cloud environment's network allowlist at the user's request.
- The site is a single-page app; all content lives in `data/content.js` (`window.SG_CONTENT = {...}`).
  It was parsed as JSON (never executed) and saved as `study-guide/data/source-content.json`.
- `tools/build_index.py` generates the index under `study-guide/`:
  README (master index), one Markdown file per chapter (focus points, full text, tables, callouts,
  figure descriptions, check-yourself Q&A, glossary/practice cross-links), glossary with
  "appears in" back-references, key-term index (all bolded phrases → sections), practice exam (120 Q with
  answers), figure index with credits/licenses, and `data/study-guide-index.json`.
- Verified: every 4+ letter word of each section's text appears in the generated chapter file.
- Assumptions: images are linked to the live site, not downloaded; figure credit lines are kept in
  figures.md/JSON rather than inline; audio narration files were not fetched; the repo is private
  (GitHub returns 404 anonymously), so storing the guide's text is for personal study only.
