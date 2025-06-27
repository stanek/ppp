Below is a **minimal working scaffold** with exactly **two files**.

---

### **index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Playable Piano</title>

  <!-- Tone.js -->
  <script src="https://unpkg.com/tone@latest/build/Tone.js"></script>

  <!-- quick-and-dirty styling; tweak freely -->
  <style>
    :root {
      --white-key: #fff;
      --black-key: #111;
      --active:   #228b22;      /* forest-green for sequencer cells */
    }
    body{
      font-family: system-ui, sans-serif;
      margin: 0;
      padding: 1rem;
      background:#222;
      color:#ddd;
      user-select:none;
    }
    table{ border-collapse:collapse; margin-inline:auto; }
    td{ text-align:center; padding:4px 6px; }
    /* 1️⃣ octave numbers */
    .octave{ font-size:1.5rem; font-weight:700; }
    /* 2️⃣ note names */
    .note{ font-size:.9rem; }
    /* 3️⃣ piano keys (buttons)  */
    .key{
      width:40px; height:80px; border:1px solid #444; border-radius:4px;
      display:inline-block; cursor:pointer;
    }
      .white   { background:var(--white-key);  }
      .black   { background:var(--black-key);  color:#eee; width:30px; height:60px; margin-top:20px; }
      .held    { filter:brightness(75%); }

    /* 4️⃣ sequencer grid */
    .seq td{ width:40px; height:40px; background:#333; border:1px solid #555; cursor:pointer; }
    .seq .on{ background:var(--active); }
  </style>
</head>

<body>
  <h1 style="text-align:center;">Mini Piano&nbsp;+&nbsp;Grid</h1>

  <table id="piano"></table>

  <table id="grid" class="seq" style="margin-top:1rem;"></table>

  <!-- your logic lives here -->
  <script type="module" src="script.js"></script>
</body>
</html>
```

---

### **script.js**

```js
/* ---------------------------------------------------------------------
 * CONSTANTS
 * -------------------------------------------------------------------*/
const OCTAVE_RANGE = [3, 4];              // C3‒B4 (change to taste)
const NOTE_ORDER   = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const GRID_ROWS    = 8;                   // sequencer height
const pianoTable   = document.getElementById('piano');
const gridTable    = document.getElementById('grid');

/* ---------------------------------------------------------------------
 * SAMPLER – Salamander Grand Piano
 * -------------------------------------------------------------------*/
const sampler = new Tone.Sampler({
  urls: Object.fromEntries(
    NOTE_ORDER.flatMap(note =>
      OCTAVE_RANGE.map(oct => {
        const n = `${note}${oct}`;
        // Tone expects sharp notes like "C#3" to map to "Cs3.mp3"
        const file = n.replace('#','s') + '.mp3';
        return [n, file];
      })
    )
  ),
  baseUrl: 'https://tonejs.github.io/audio/salamander/',
  onload: () => console.log('Sampler ready')
}).toDestination();

/* ---------------------------------------------------------------------
 * BUILD PIANO TABLE (3 rows)
 * -------------------------------------------------------------------*/
const octRow   = pianoTable.insertRow();
const noteRow  = pianoTable.insertRow();
const keyRow   = pianoTable.insertRow();

OCTAVE_RANGE.forEach(oct => {
  NOTE_ORDER.forEach(note => {
    const full = `${note}${oct}`;
    const isSharp = note.includes('#');

    // row-1 octave numbers
    octRow.insertCell().textContent = oct;
    octRow.lastChild.className = 'octave';

    // row-2 note names
    noteRow.insertCell().textContent = note.replace('#','♯');
    noteRow.lastChild.className = 'note';

    // row-3 playable key
    const td = keyRow.insertCell();
    const btn = document.createElement('div');
    btn.className = `key ${isSharp ? 'black' : 'white'}`;
    btn.dataset.note = full;
    td.appendChild(btn);
  });
});

/* ---------------------------------------------------------------------
 * KEY HELD-DOWN HANDLING
 * -------------------------------------------------------------------*/
function startNote(note){
  sampler.triggerAttack(note, Tone.now());
}
function stopNote(note){
  sampler.triggerRelease(note, Tone.now());
}

pianoTable.addEventListener('pointerdown', e=>{
  const key = e.target.closest('.key');
  if(!key) return;
  key.classList.add('held');
  startNote(key.dataset.note);
});
window.addEventListener('pointerup', e=>{
  document.querySelectorAll('.key.held').forEach(k=>{
    k.classList.remove('held');
    stopNote(k.dataset.note);
  });
});

/* ---------------------------------------------------------------------
 * SEQUENCER GRID
 * -------------------------------------------------------------------*/
for(let r=0;r<GRID_ROWS;r++){
  const row = gridTable.insertRow();
  for(let c=0;c<NOTE_ORDER.length*(OCTAVE_RANGE.length);c++){
    const cell = row.insertCell();
    cell.addEventListener('click', ()=> cell.classList.toggle('on'));
  }
}
```

---

#### How it works & ways to extend

* **Rows 1–3** are generated dynamically: octave numbers, note names, and a playable key whose color matches an actual piano (white naturals, black sharps).
* Holding a key (`pointerdown` ➜ `pointerup`) calls `Sampler.triggerAttack`/`triggerRelease`, so the sound sustains precisely as long as you press.
* The **sequencer grid** (rows 4 +) is plain `<table>` cells—click to toggle the `.on` class; they go forest-green when active.
* Change `OCTAVE_RANGE`, `GRID_ROWS`, sizes in CSS, etc., to match the exact dimensions of your **UI.jpg**.

Drop the two files in the same folder, open **index.html** in a browser, and you’re ready to tinker. 🎹
