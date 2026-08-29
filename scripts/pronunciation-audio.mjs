/* ---------------------------------------------------------------------------
 * SYNTHESISE THE JAPANESE NAMES · Google Cloud Text-to-Speech
 *
 * Reads the sheet from `npm run pronunciation` and writes one audio file per
 * row. Full instructions, including the rights check to do BEFORE running it,
 * are in docs/pronunciation.md.
 *
 *   npm run pronunciation
 *   GOOGLE_TTS_KEY=... npm run pronunciation:audio
 *
 * WHAT IT FEEDS THE ENGINE, and why it matters more than the voice you pick.
 * Google's ja-JP voices run a morphological analyser over Japanese text, so
 * KANJI is usually read better than kana: 小内刈 is analysed as 小内 + 刈 and
 * comes out ko-uchi-gari, where raw こうちがり can come out kōchi-gari. So the
 * default input is the kanji.
 *
 * For the fifteen rows the sheet flags as boundary risks it does NOT trust
 * that, and emits SSML with a hairline break at the morpheme boundary built
 * from the romaji hyphens. A break is the only lever available: SSML
 * <phoneme> has no useful Japanese alphabet, and speechSynthesis in a browser
 * accepts no SSML at all, which is one of several reasons this runs at build
 * time rather than in the reader's browser.
 *
 * LISTEN TO THE FIFTEEN. Everything else can be spot-checked; those are the
 * ones where an engine is known to be wrong, and they are the whole reason a
 * human recording is still the better answer.
 * ------------------------------------------------------------------------ */
import fs from 'node:fs';
import path from 'node:path';

const KEY = process.env.GOOGLE_TTS_KEY;
if (!KEY) {
  console.error('Set GOOGLE_TTS_KEY to an API key with the Text-to-Speech API enabled.');
  process.exit(1);
}

/** Voice and format. Both are deliberately overridable: run --voices first and
 *  pick one by ear rather than taking this default on trust. */
const VOICE = process.env.GOOGLE_TTS_VOICE ?? 'ja-JP-Neural2-B';
const ENCODING = process.env.GOOGLE_TTS_ENCODING ?? 'OGG_OPUS';
const EXT = { OGG_OPUS: '.opus', MP3: '.mp3', LINEAR16: '.wav' }[ENCODING] ?? '.audio';
const API = 'https://texttospeech.googleapis.com/v1';

/* --voices: ask the API what exists rather than trusting a name written here,
   which is how a voice list goes stale without anyone noticing. */
if (process.argv.includes('--voices')) {
  const res = await fetch(`${API}/voices?languageCode=ja-JP&key=${KEY}`);
  const body = await res.json();
  if (!res.ok) { console.error(body); process.exit(1); }
  for (const v of body.voices ?? []) {
    console.log(`${v.name.padEnd(28)} ${v.ssmlGender.padEnd(8)} ${v.naturalSampleRateHertz} Hz`);
  }
  process.exit(0);
}

const [sheet = 'wazabook-pronunciation.csv', outDir = 'media/audio'] = process.argv.slice(2);

/** A CSV reader that survives quoted fields; the sheet has commas in prose. */
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift();
  return rows.filter((r) => r.length > 1).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** What to say, and how. Returns an `input` object for the API. */
function inputFor(row) {
  if (row.notes.includes('SAY AS TWO PARTS')) {
    /* Split the KANA on the boundaries the romaji marks, and hold the two
       apart by 80ms: long enough to stop the vowels fusing, short enough that
       it still reads as one name. */
    const parts = row.romaji.split(/[-\s]/);
    const kana = row.kana;
    if (kana && parts.length > 1) {
      /* Only the FIRST boundary is ever the ambiguous one in these names. */
      const head = parts[0].replace(/[^a-z]/gi, '').length;
      const split = Math.max(1, Math.min(kana.length - 1, head <= 2 ? 1 : 2));
      const ssml = `<speak>${escape(kana.slice(0, split))}<break time="80ms"/>${escape(kana.slice(split))}</speak>`;
      return { ssml, _used: `ssml:${ssml}` };
    }
    if (row.kanji) return { text: row.kanji, _used: `kanji:${row.kanji}` };
  }
  if (row.kanji) return { text: row.kanji, _used: `kanji:${row.kanji}` };
  if (row.kana) return { text: row.kana, _used: `kana:${row.kana}` };
  return { text: row.romaji, _used: `romaji:${row.romaji}` };
}

let done = 0, failed = 0;
const log = [];
for (const row of parseCsv(fs.readFileSync(sheet, 'utf8'))) {
  const dest = path.join(outDir, row.file.replace(/\.wav$/, EXT));
  fs.mkdirSync(path.dirname(dest), { recursive: true });

  const { _used, ...input } = inputFor(row);
  const res = await fetch(`${API}/text:synthesize?key=${KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input,
      voice: { languageCode: 'ja-JP', name: VOICE },
      audioConfig: { audioEncoding: ENCODING, speakingRate: 0.95 },
    }),
  });
  const body = await res.json();
  if (!res.ok || !body.audioContent) {
    failed++;
    console.error(`FAILED ${row.file}: ${body.error?.message ?? res.status}`);
    continue;
  }
  fs.writeFileSync(dest, Buffer.from(body.audioContent, 'base64'));
  done++;
  log.push(`${dest}\t${_used}`);
}

/* What was said for each file, so a spot-check is reading a record rather
   than guessing what the engine was given. */
fs.writeFileSync(path.join(outDir, 'SOURCE.tsv'), log.join('\n') + '\n');
console.log(`\n${done} written to ${outDir}, ${failed} failed. Voice ${VOICE}, ${ENCODING}.`);
console.log(`What was fed to the engine for each file is in ${path.join(outDir, 'SOURCE.tsv')}.`);
console.log('Listen to the fifteen boundary-risk names before trusting any of it.');
