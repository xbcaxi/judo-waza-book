/* ---------------------------------------------------------------------------
 * SYNTHESISE THE JAPANESE NAMES · Azure AI Speech
 *
 * The sibling of pronunciation-audio.mjs. Same sheet, same output layout, same
 * SOURCE.tsv, different engine, so the two can be run against each other and
 * judged by ear rather than by argument.
 *
 *   npm run pronunciation
 *   AZURE_SPEECH_KEY=... AZURE_SPEECH_REGION=uksouth npm run pronunciation:audio:azure
 *
 * WHY THE TWO ENGINES ARE TREATED THE SAME. Azure can attach a custom lexicon
 * and can state a reading with <phoneme alphabet="sapi">, and neither of those
 * fixes the fifteen boundary-risk names, because their problem is not the
 * reading. こうち spells ko-uchi and kōchi with the SAME kana and the same
 * segments; what separates them is juncture and accent, and no phone set here
 * writes accent. So this script uses the same 80ms break at the boundary that
 * the Google one does, and the comparison is a fair one between voices.
 *
 * WHERE THE LEXICON DOES EARN ITS KEEP is the other failure mode: a KANJI
 * compound the analyser reads as the wrong word entirely. Pass --lexicon with
 * a public URI and every request references it. `npm run pronunciation:lexicon`
 * writes a starting file from the sheet.
 *
 * REST rather than the SDK, deliberately: one dependency-free file, and the
 * job is 240 short requests once.
 * ------------------------------------------------------------------------ */
import fs from 'node:fs';
import path from 'node:path';

const KEY = process.env.AZURE_SPEECH_KEY;
const REGION = process.env.AZURE_SPEECH_REGION;
if (!KEY || !REGION) {
  console.error('Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION (for example uksouth).');
  process.exit(1);
}

/** Voice and format, both overridable. Run --voices first and pick by ear. */
const VOICE = process.env.AZURE_SPEECH_VOICE ?? 'ja-JP-NanamiNeural';
const FORMAT = process.env.AZURE_SPEECH_FORMAT ?? 'ogg-24khz-16bit-mono-opus';
const EXT = FORMAT.includes('opus') ? '.opus' : FORMAT.includes('mp3') ? '.mp3' : '.wav';
const HOST = `https://${REGION}.tts.speech.microsoft.com`;
/* Azure requires a User-Agent and returns 400 without one. */
const AGENT = 'wazabook-pronunciation';

if (process.argv.includes('--voices')) {
  const res = await fetch(`${HOST}/cognitiveservices/voices/list`, {
    headers: { 'Ocp-Apim-Subscription-Key': KEY, 'User-Agent': AGENT },
  });
  if (!res.ok) { console.error(`${res.status} ${await res.text()}`); process.exit(1); }
  for (const v of await res.json()) {
    if (v.Locale !== 'ja-JP') continue;
    console.log(`${v.ShortName.padEnd(30)} ${v.Gender.padEnd(8)} ${(v.VoiceType ?? '').padEnd(12)} ${(v.StyleList ?? []).join(', ')}`);
  }
  process.exit(0);
}

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const lexiconAt = process.argv.indexOf('--lexicon');
const LEXICON = lexiconAt === -1 ? null : process.argv[lexiconAt + 1];
const [sheet = 'wazabook-pronunciation.csv', outDir = 'media/audio-azure'] = args;

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

/** The spoken body of one request, and a record of what it was. */
function bodyFor(row) {
  if (row.notes.includes('SAY AS TWO PARTS')) {
    const parts = row.romaji.split(/[-\s]/);
    const kana = row.kana;
    if (kana && parts.length > 1) {
      const head = parts[0].replace(/[^a-z]/gi, '').length;
      const split = Math.max(1, Math.min(kana.length - 1, head <= 2 ? 1 : 2));
      const inner = `${escape(kana.slice(0, split))}<break time="80ms"/>${escape(kana.slice(split))}`;
      return [inner, `ssml-break:${kana.slice(0, split)}|${kana.slice(split)}`];
    }
    if (row.kanji) return [escape(row.kanji), `kanji:${row.kanji}`];
  }
  if (row.kanji) return [escape(row.kanji), `kanji:${row.kanji}`];
  if (row.kana) return [escape(row.kana), `kana:${row.kana}`];
  return [escape(row.romaji), `romaji:${row.romaji}`];
}

const lexiconTag = LEXICON ? `<lexicon uri="${escape(LEXICON)}"/>` : '';

let done = 0, failed = 0;
const log = [];
for (const row of parseCsv(fs.readFileSync(sheet, 'utf8'))) {
  const dest = path.join(outDir, row.file.replace(/\.wav$/, EXT));
  fs.mkdirSync(path.dirname(dest), { recursive: true });

  const [inner, used] = bodyFor(row);
  const ssml = '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"'
    + ' xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="ja-JP">'
    + `${lexiconTag}<voice name="${VOICE}"><prosody rate="-5%">${inner}</prosody></voice></speak>`;

  const res = await fetch(`${HOST}/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': KEY,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': FORMAT,
      'User-Agent': AGENT,
    },
    body: ssml,
  });
  if (!res.ok) {
    failed++;
    console.error(`FAILED ${row.file}: ${res.status} ${(await res.text()).slice(0, 120)}`);
    continue;
  }
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  done++;
  log.push(`${dest}\t${used}`);
}

fs.writeFileSync(path.join(outDir, 'SOURCE.tsv'), log.join('\n') + '\n');
console.log(`\n${done} written to ${outDir}, ${failed} failed. Voice ${VOICE}, ${FORMAT}.`);
if (LEXICON) console.log(`Custom lexicon: ${LEXICON}`);
console.log(`What was fed to the engine for each file is in ${path.join(outDir, 'SOURCE.tsv')}.`);
console.log('Listen to the fifteen boundary-risk names before trusting any of it.');
