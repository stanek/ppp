Below are the **three tiny files** you need now that the CSS lives on its own.
Drop them in the same folder and open `index.html`.

---

## 1 · index.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Playable Piano</title>

  <!-- Tone.js -->
  <script src="https://unpkg.com/tone@latest/build/Tone.js"></script>

  <!-- external styling -->
  <link rel="stylesheet" href="styles.css">
</head>

<body>
  <h1>Mini Piano + Grid</h1>

  <table id="piano"></table>

  <table id="grid" class="seq"></table>

  <!-- piano logic -->
  <script defer src="script.js"></script>
</body>
</html>
```

---

## 2 · styles.css

```css
/* ----------- COLOR VARIABLES ------------------------------------------ */
:root{
  --white-key:#fff;
  --black-key:#111;
  --active:   #228b22;          /* forest-green “on” cells              */
}

/* ----------- LAYOUT BASICS -------------------------------------------- */
body{
  margin:0; padding:1rem; background:#222; color:#ddd;
  font-family:system-ui,sans-serif; user-select:none; text-align:center;
}
table{ border-collapse:collapse; margin-inline:auto; }
td   { padding:0; text-align:center; }

/* ----------- PIANO LABEL ROWS ----------------------------------------- */
.octave{ font-size:1.5rem; font-weight:700; }
.note  { font-size:.9rem; }

/* ----------- KEYS ------------------------------------------------------ */
.key{
  width:30px; height:80px;
  border:1px solid #444; border-radius:4px;
  display:inline-block; cursor:pointer;
}
  .white{ background:var(--white-key); }
  .black{ background:var(--black-key); color:#eee; }
  .held { filter:brightness(75%); }

/* ----------- SEQUENCER GRID ------------------------------------------- */
.seq td{
  width:30px; height:30px;
  background:#333; border:1px solid #555; cursor:pointer;
}
.seq .on{ background:var(--active); }
```

---

## 3 · script.js

```js
/* -------------------------------------------------------------
 *  CONFIG
 * -----------------------------------------------------------*/
const OCTAVE_RANGE = [2,3,4,5];           // now includes 2–5
const NOTE_ORDER   = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const SUPPORTED    = ['A','C','D#','F#']; // real Salamander samples
const GRID_ROWS    = 8;                   // sequencer height

const pianoTable = document.getElementById('piano');
const gridTable  = document.getElementById('grid');

/* -------------------------------------------------------------
 *  SAMPLER  (Salamander Grand, auto-stretched)
 * -----------------------------------------------------------*/
const sampler = new Tone.Sampler({
  urls:Object.fromEntries(
    OCTAVE_RANGE.flatMap(oct =>
      SUPPORTED.map(n=>{
        const file = (n.replace('#','s')+oct+'.mp3');
        return [`${n}${oct}`,file];
      })
    )
  ),
  baseUrl:'https://tonejs.github.io/audio/salamander/',
}).toDestination();

/* -------------------------------------------------------------
 *  BUILD PIANO (3 header rows)
 * -----------------------------------------------------------*/
const octRow  = pianoTable.insertRow();
const noteRow = pianoTable.insertRow();
const keyRow  = pianoTable.insertRow();

OCTAVE_RANGE.forEach(oct=>{
  NOTE_ORDER.forEach(note=>{
    const full = note+oct;
    const sharp = note.includes('#');

    // 1️⃣ octave numbers
    octRow.insertCell().textContent = oct;
    octRow.lastChild.className = 'octave';

    // 2️⃣ note names
    noteRow.insertCell().textContent = note.replace('#','♯');
    noteRow.lastChild.className = 'note';

    // 3️⃣ playable key
    const td = keyRow.insertCell();
    const div = document.createElement('div');
    div.className = `key ${sharp?'black':'white'}`;
    div.dataset.note = full;
    td.appendChild(div);
  });
});

/* -------------------------------------------------------------
 *  NOTE ON / OFF (sustain while held)
 * -----------------------------------------------------------*/
function start(note){ sampler.triggerAttack(note, Tone.now()); }
function stop (note){ sampler.triggerRelease(note, Tone.now()); }

pianoTable.addEventListener('pointerdown', e=>{
  const key = e.target.closest('.key');
  if(!key) return;
  key.classList.add('held');
  start(key.dataset.note);
});
window.addEventListener('pointerup', ()=>{
  document.querySelectorAll('.key.held').forEach(k=>{
    k.classList.remove('held'); stop(k.dataset.note);
  });
});

/* -------------------------------------------------------------
 *  SEQUENCER GRID  (columns === keys so it lines up)
 * -----------------------------------------------------------*/
const COLS = NOTE_ORDER.length * OCTAVE_RANGE.length;

for(let r=0;r<GRID_ROWS;r++){
  const row = gridTable.insertRow();
  for(let c=0;c<COLS;c++){
    const cell = row.insertCell();
    cell.addEventListener('click',()=>cell.classList.toggle('on'));
  }
}
```

---

### What changed — summary

* **CSS moved to `styles.css`.**
* All keys now **30 px wide** (`white` and `black`).
* **Black keys remain black**—no offset, same height as whites.
* Added **octaves 2 and 5** (`OCTAVE_RANGE = [2,3,4,5]`).
* Grid’s column count (`COLS`) is computed from the number of keys, so each 30-px grid cell lines up perfectly under its key.

Open `index.html`; your piano should now be flush, uniform, and in sync with the sequencer grid. Enjoy! 🎹
