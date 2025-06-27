Below is the **smallest possible edit** that achieves the single-label octave bar with boundary lines.
You only touch two spots:

---

### 1 · styles.css – add this rule

```css
/* --- single-cell octave bar ----------------------------------------- */
.octave{
  font-size:1.5rem; font-weight:700;
  border-left :2px solid #777;   /* start line  */
  border-right:2px solid #777;   /* end   line  */
}
```

(Keep the rest of your CSS exactly as is.)

---

### 2 · script.js – change just the octave-row builder

Replace the **octave-row loop** with this one-liner block. Everything else in the file stays the same.

```js
/* --------------- BUILD PIANO (3 header rows) ------------------------ */
const octRow  = pianoTable.insertRow();
const noteRow = pianoTable.insertRow();
const keyRow  = pianoTable.insertRow();

OCTAVE_RANGE.forEach(oct=>{
  /* Single cell spanning the 12 semitones of this octave */
  const ocCell = octRow.insertCell();
  ocCell.colSpan = NOTE_ORDER.length;   // 12 columns wide
  ocCell.textContent = oct;
  ocCell.className = 'octave';

  /* Note-name row + key row (unchanged) */
  NOTE_ORDER.forEach(note=>{
    // … existing code …
```

*(The rest of that inner NOTE\_ORDER loop—the label and key creation—remains exactly as you already have it.)*

---

#### What it does

* For every octave in `OCTAVE_RANGE` we now add **one** `<td>` whose `colSpan` is 12, so it stretches across all the keys of that octave.
* The CSS rule draws a vertical line on the left and right of that cell, visually bracketing the octave, with the number neatly centered between them.

Refresh the page and you’ll see a single, centered octave number bar for each octave, flanked by the requested grid lines.
