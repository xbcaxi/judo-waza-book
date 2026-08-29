/* ---------------------------------------------------------------------------
 * MOVEMENT DIAGRAMS · run with `npm run diagrams`
 *
 * Draws the footprint diagrams for the movement skills into media/skills/, as
 * SVG, and CHECKS THEM before writing. Copy to the website's
 * public/images/skills/ afterwards.
 *
 * WHY THESE ARE DRAWN RATHER THAN SOURCED. Every other illustration on this
 * site came from somewhere else and NOTICE.md has to say so; 65 of 98 are
 * "unknown" provenance and two carry a stranger's watermark. Replacing them
 * with purpose-made artwork is a stated goal of the project, and footprints on
 * a mat are the easiest possible place to start: two shapes and an arrow.
 * Drawing them means these nine owe nobody anything and can be licensed with
 * the rest of the work.
 *
 * WHY A GENERATOR RATHER THAN NINE HAND-WRITTEN FILES. The nine diagrams are
 * the same drawing with different feet in different places, so hand-authoring
 * them would be copying a foot path eight times and then having eight subtly
 * different feet. One primitive, nine arrangements.
 *
 * WHY SVG. They are line drawings: they stay sharp at any size, weigh a few
 * hundred bytes each against 20-30 KB for the webp illustrations, and the
 * lightbox can enlarge them without anything to enlarge from.
 *
 * COLOURS ARE EXPLICIT, not currentColor. An SVG referenced through <img> gets
 * no styling from the page, and these sit on white in the frame and in the
 * lightbox on both themes, which is how the technique illustrations already
 * behave.
 * ------------------------------------------------------------------------ */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* Artwork lives in this repository, beside media/techniques/. The website
 * carries a copy at public/images/skills/, by hand, exactly as every technique
 * illustration already is: media/techniques/uchi-mata.webp and the site's copy
 * are byte-identical today. Regenerating here means copying across after. */
const outputDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)), '../media/skills',
);

/* Ink for the finishing position, a lighter grey for where the foot started,
 * and the site's accent for the movement itself. */
const INK = '#1f2933';
const GHOST = '#c3ccd6';
const ARROW = '#c2410c';

/* One right foot, pointing up, 20 wide and 46 tall, origin at its top left.
 * The left foot is the same path mirrored, so the pair cannot disagree. */
const FOOT = 'M10 0c6 0 10 5 10 12 0 6-3 10-3 18 0 10-3 16-7 16s-7-6-7-16c0-8-3-12-3-18C0 5 4 0 10 0Z';

/** A foot at (x, y), rotated about its own centre. `side` mirrors it. */
function foot({ x, y, angle = 0, side = 'right', fill = INK }) {
  const mirror = side === 'left' ? ' scale(-1 1) translate(-20 0)' : '';
  return `<g transform="translate(${x} ${y}) rotate(${angle} 10 23)${mirror}">`
    + `<path d="${FOOT}" fill="${fill}"/></g>`;
}

/**
 * A pair of feet, the stance itself. `spread` is the gap between them, and
 * (x, y) is the point between the heels.
 *
 * THE WHOLE PAIR IS ROTATED BY ONE TRANSFORM rather than each foot being
 * placed at a computed angle. Positioning them by trigonometry looked right at
 * 0 degrees and collapsed the two feet into one blob at 180, because the
 * 20-unit offset for the left foot's own width does not rotate with the
 * stance. Laying them out square and turning the group cannot get that wrong.
 */
function stance({ x, y, angle = 0, spread = 26, toeOut = 0, fill = INK }) {
  const half = spread / 2;
  const feet = foot({ x: -half - 20, y: 0, angle: -toeOut, side: 'left', fill })
    + foot({ x: half, y: 0, angle: toeOut, side: 'right', fill });
  return `<g transform="translate(${x} ${y}) rotate(${angle})">${feet}</g>`;
}

/** A curved arrow from one point to another, bowed to show a turn. */
function arrow({ x1, y1, x2, y2, bow = 0 }) {
  const mx = (x1 + x2) / 2 + bow;
  const my = (y1 + y2) / 2;
  return `<path d="M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}" fill="none" stroke="${ARROW}"`
    + ` stroke-width="3.5" stroke-linecap="round" marker-end="url(#tip)"/>`;
}

const MARKER = `<defs><marker id="tip" viewBox="0 0 10 10" refX="8" refY="5"
    markerWidth="5" markerHeight="5" orient="auto-start-reverse">
    <path d="M0 0 10 5 0 10z" fill="${ARROW}"/></marker></defs>`;

const svg = (width, height, body, title) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${title}">`
  + MARKER + body + '</svg>\n';

/* --- the nine drawings --------------------------------------------------- */
const diagrams = {
  /* SHISEI. The two postures side by side, which is the only way the
   * difference reads: a defensive stance is only wide and low compared with
   * something. */
  shisei: () => {
    const label = (x, text) =>
      `<text x="${x}" y="152" text-anchor="middle" font-family="system-ui, sans-serif"`
      + ` font-size="13" fill="${INK}">${text}</text>`;
    return svg(360, 170,
      stance({ x: 90, y: 60, spread: 30 })
      + label(90, 'Shizen-hon-tai')
      /* Wider, turned out and drawn lower on the mat: the same body, sunk. */
      + stance({ x: 265, y: 72, spread: 58, toeOut: 18 })
      + label(265, 'Jigo-hon-tai'),
      'Two judo postures compared: the natural posture with feet about shoulder width, and the defensive posture with the feet wider and turned out');
  },

  /* TAI-SABAKI. Four panels, ghost feet where you started and solid feet where
   * you finish, with the arrow carrying the movement. */
  'tai-sabaki': () => {
    /* One panel per movement, wide enough that the two stances never touch:
     * a stance is 66 across, so 190 of panel leaves real air between them.
     * Ghost feet are where you started, solid where you finish. */
    const PANEL = 190;
    /* Up the panel is forward, which is the convention every footwork diagram
     * uses, so a backward movement has to END LOWER than it started. Drawing
     * all four travelling up made mae and ushiro identical pictures under
     * different names, which is worse than no diagram. */
    const panel = (index, name, from, to, bow) => {
      const x = index * PANEL;
      const a = { x: x + 52, y: from.y };
      const b = { x: x + 138, y: to.y, angle: to.angle };
      return stance({ ...a, fill: GHOST })
        + arrow({ x1: a.x + 12, y1: a.y - 4, x2: b.x - 12, y2: b.y + 4, bow })
        + stance(b)
        + `<text x="${x + PANEL / 2}" y="205" text-anchor="middle"`
        + ` font-family="system-ui, sans-serif" font-size="12" fill="${INK}">${name}</text>`;
    };
    /* The turning pair finish at 180 degrees, facing back the way they came,
     * which is what makes them the entry shape for a forward throw. */
    const body = [
      ['Mae-sabaki', { y: 128 }, { y: 60, angle: 0 }, 26],
      ['Ushiro-sabaki', { y: 60 }, { y: 128, angle: 0 }, 26],
      ['Mae-mawari-sabaki', { y: 128 }, { y: 60, angle: 180 }, 40],
      ['Ushiro-mawari-sabaki', { y: 60 }, { y: 128, angle: 180 }, 40],
    ].map(([name, from, to, bow], index) => panel(index, name, from, to, bow)).join('');

    return svg(PANEL * 4, 220, body,
      'Four judo body movements, each showing the starting foot position in grey and the finishing position in black: forward, backward, forward with a turn, and backward with a turn');
  },

  /* SHINTAI. Travelling, so the feet are a trail up the page rather than a
   * start and an end. Numbered, because the order is the whole point. */
  shintai: () => {
    const step = (x, y, side, n, fill = INK) =>
      foot({ x, y, side, fill })
      + `<text x="${side === 'left' ? x - 12 : x + 26}" y="${y + 28}"`
      + ` font-family="system-ui, sans-serif" font-size="12" fill="${INK}">${n}</text>`;
    const label = (x, text) =>
      `<text x="${x}" y="248" text-anchor="middle" font-family="system-ui, sans-serif"`
      + ` font-size="12" fill="${INK}">${text}</text>`;

    /* Ayumi-ashi: each foot passes the other, so the trail alternates and the
     * feet leapfrog up the page. */
    const ayumi = step(40, 180, 'left', '1') + step(76, 150, 'right', '2')
      + step(40, 110, 'left', '3') + step(76, 80, 'right', '4');

    /* Tsugi-ashi forward: the lead foot goes, the rear follows, and the pair
     * never crosses. Drawn as two stances, one above the other. */
    const tsugiOut = step(200, 180, 'left', '1') + step(236, 180, 'right', '2')
      + step(200, 110, 'left', '3') + step(236, 110, 'right', '4');

    /* Tsugi-ashi sideways: same rule, travelling across. */
    const tsugiSide = step(360, 150, 'left', '1') + step(396, 150, 'right', '2')
      + step(456, 150, 'left', '3') + step(492, 150, 'right', '4');

    return svg(560, 262,
      /* The arrows run down the left margin of each group rather than between
       * the feet. Drawn through the middle they crossed the very footprints
       * they were explaining. */
      ayumi + arrow({ x1: 22, y1: 200, x2: 22, y2: 74, bow: 0 })
      + tsugiOut + arrow({ x1: 182, y1: 200, x2: 182, y2: 104, bow: 0 })
      + tsugiSide + arrow({ x1: 340, y1: 210, x2: 512, y2: 210, bow: 0 })
      + label(58, 'Ayumi-ashi') + label(218, 'Tsugi-ashi, forward')
      + label(426, 'Tsugi-ashi, sideways'),
      'Three ways of travelling in judo, shown as numbered footprints: ordinary walking steps where each foot passes the other, successive steps forward where the rear foot follows without passing, and the same stepping sideways');
  },
};

/* --- verification --------------------------------------------------------
 *
 * GENERATED ARTWORK HAS TO BE CHECKED. Nobody looks at a diagram again after
 * the day it is written, and a generator will happily produce a confident,
 * wrong picture. Both rules below are faults this drawing ACTUALLY HAD while
 * it was being made, not hypotheticals:
 *
 *   FEET COLLAPSING INTO A BLOB. Placing a rotated pair by trigonometry left
 *   both feet six units apart at 180 degrees, so the two turning diagrams
 *   rendered as a single dark mass.
 *
 *   PANELS COLLIDING. The first layout overlapped the starting and finishing
 *   stances, hiding one foot underneath another.
 *
 * The check reads the numbers rather than the pixels: every foot's centre is
 * recovered from its transforms, and no two may sit closer than a foot is
 * wide. That is precisely what an eye catches and a build does not.
 */
const FOOT_WIDTH = 20;

/** Every foot centre in a drawing, with the group transforms applied. */
function footCentres(markup) {
  const centres = [];
  const stancePattern = /<g transform="translate\(([-\d.]+) ([-\d.]+)\) rotate\(([-\d.]+)\)">([\s\S]*?)<\/g><\/g>/g;
  const footSource = '<g transform="translate\\(([-\\d.]+) ([-\\d.]+)\\) rotate\\(([-\\d.]+) 10 23\\)';

  /* A foot's centre in its own frame, carried through the stance rotation. */
  const place = (fx, fy, ox, oy, angle) => {
    const cx = fx + 10;
    const cy = fy + 23;
    const rad = (angle * Math.PI) / 180;
    return {
      x: ox + cx * Math.cos(rad) - cy * Math.sin(rad),
      y: oy + cx * Math.sin(rad) + cy * Math.cos(rad),
    };
  };

  const spans = [];
  let stance;
  while ((stance = stancePattern.exec(markup)) !== null) {
    const [whole, ox, oy, angle, inner] = stance;
    spans.push([stance.index, stance.index + whole.length]);
    const inside = new RegExp(footSource, 'g');
    let f;
    while ((f = inside.exec(inner)) !== null) {
      centres.push(place(Number(f[1]), Number(f[2]), Number(ox), Number(oy), Number(angle)));
    }
  }

  /* Feet drawn outside any stance group, which is how shintai lays out a
   * trail of single steps. */
  const loose = new RegExp(footSource, 'g');
  let f;
  while ((f = loose.exec(markup)) !== null) {
    const nested = spans.some(([from, to]) => f.index > from && f.index < to);
    if (!nested) centres.push(place(Number(f[1]), Number(f[2]), 0, 0, 0));
  }
  return centres;
}

function check(slug, markup, expected) {
  const centres = footCentres(markup);
  if (centres.length !== expected) {
    throw new Error(`${slug}: expected ${expected} feet, the drawing has ${centres.length}`);
  }
  for (let i = 0; i < centres.length; i += 1) {
    for (let j = i + 1; j < centres.length; j += 1) {
      const gap = Math.hypot(centres[i].x - centres[j].x, centres[i].y - centres[j].y);
      if (gap < FOOT_WIDTH) {
        throw new Error(
          `${slug}: two feet are ${gap.toFixed(1)} apart, closer than a foot is wide `
          + `(${FOOT_WIDTH}). They will read as one shape.`,
        );
      }
    }
  }
  return centres.length;
}

/* What each drawing must contain. A wrong count means a panel was dropped or
 * duplicated, which is the other way a generator goes quietly wrong. */
const EXPECTED_FEET = { shisei: 4, 'tai-sabaki': 16, shintai: 12 };

await mkdir(outputDirectory, { recursive: true });
for (const [slug, draw] of Object.entries(diagrams)) {
  const content = draw();
  /* Checked BEFORE writing, so a broken drawing never reaches media/. */
  const feet = check(slug, content, EXPECTED_FEET[slug]);
  await writeFile(path.join(outputDirectory, `${slug}.svg`), content, 'utf8');
  console.log(`wrote media/skills/${slug}.svg  ${content.length} bytes, ${feet} feet, none overlapping`);
}
console.log(`\n${Object.keys(diagrams).length} diagrams, all original artwork, all checked.`);
