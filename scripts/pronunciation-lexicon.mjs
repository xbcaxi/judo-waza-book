/* ---------------------------------------------------------------------------
 * A CUSTOM LEXICON FOR AZURE · run with `npm run pronunciation:lexicon`
 *
 * Writes a PLS 1.0 file binding each kanji name to its kana reading, so the
 * engine is told what a compound says rather than working it out. Optional:
 * the analyser usually gets these right, and this is the lever for when it
 * does not.
 *
 * WHAT IT CANNOT DO, and this is the important part. It does not fix the
 * fifteen boundary-risk names. こうち spells both ko-uchi and kōchi with the
 * same kana and the same sounds; what separates them is juncture and accent,
 * and the ja-JP phone set writes neither. Those fifteen get a break in the
 * SSML instead, in both engines, which is a nudge rather than an instruction.
 *
 * Azure's limits, worth knowing before hosting it: 100 KB, cached for up to
 * fifteen minutes after a change, and it must sit at a publicly reachable URI.
 * One lexicon covers one locale.
 * ------------------------------------------------------------------------ */
import fs from 'node:fs';

const [sheet = 'wazabook-pronunciation.csv', dest = 'wazabook-lexicon.xml'] = process.argv.slice(2);

const rows = (() => {
  const text = fs.readFileSync(sheet, 'utf8');
  const out = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); out.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); out.push(row); }
  const header = out.shift();
  return out.filter((r) => r.length > 1).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
})();

/* The sapi phone set for ja-JP is katakana. The sheet holds hiragana, and the
 * two are one code point apart across the whole syllabary. */
const katakana = (s) => s.replace(/[ぁ-ゖ]/g, (c) =>
  String.fromCharCode(c.charCodeAt(0) + 0x60));

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const entries = rows
  .filter((r) => r.kanji.trim() && r.kana.trim())
  .map((r) => `  <lexeme>\n    <grapheme>${escape(r.kanji)}</grapheme>\n`
    + `    <phoneme>${escape(katakana(r.kana))}</phoneme>\n  </lexeme>`);

fs.writeFileSync(dest,
  '<?xml version="1.0" encoding="UTF-8"?>\n'
  + '<lexicon version="1.0" xmlns="http://www.w3.org/2005/01/pronunciation-lexicon"\n'
  + '         alphabet="x-microsoft-sapi" xml:lang="ja-JP">\n'
  + entries.join('\n') + '\n</lexicon>\n');

const size = fs.statSync(dest).size;
console.log(`${entries.length} entries written to ${dest} (${(size / 1024).toFixed(1)} KB of Azure's 100 KB limit).`);
console.log('Host it at a public URI and pass it with --lexicon. It does NOT fix the fifteen.');
