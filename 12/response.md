Below are the **minimal edits** you need to add orange “drag-select” highlighting without touching the sequencer logic or playback.

---

## 1 · styles.css – new colour + rule

```css
:root{
  --white-key:#fff;
  --black-key:#111;
  --active:   #228b22;       /* ON  (green)  */
  --selected: #ff8c00;       /* DRAG select  */
  /* …the rest stays … */
}

/* highlight for drag-selected notes */
.seq .selected{ background:var(--selected); }
```

*(Everything else in the file stays the same.)*

---

## 2 · script.js – drag-select logic (additions only)

Add these lines **anywhere after** the grid has been built—e.g. right below the grid-builder loop.

```js
/* ----------------------------------------------------------------------
 *  DRAG-SELECT (“lasso”) FOR ON-CELLS
 * --------------------------------------------------------------------*/
let isSelecting   = false;
const selectedSet = new Set();

function clearSelection(){
  selectedSet.forEach(td => td.classList.remove('selected'));
  selectedSet.clear();
}

/* start selection */
gridTable.addEventListener('pointerdown', e=>{
  const td = e.target.closest('td');
  if(!td) return;
  clearSelection();               // drop previous selection
  isSelecting = true;
  if(td.classList.contains('on')){
    td.classList.add('selected');
    selectedSet.add(td);
  }
});

/* extend selection while dragging */
gridTable.addEventListener('pointerover', e=>{
  if(!isSelecting) return;
  const td = e.target.closest('td');
  if(!td || !td.classList.contains('on') || selectedSet.has(td)) return;
  td.classList.add('selected');
  selectedSet.add(td);
});

/* end drag on mouse-up */
window.addEventListener('pointerup', ()=>{ isSelecting = false; });

/* click anywhere outside the grid to clear the orange highlight */
document.addEventListener('pointerdown', e=>{
  if(!gridTable.contains(e.target)) clearSelection();
});
```

> **Where to place it:**
> keep the code **below** the section that builds the grid so the `gridTable.rows` already exist, but **above** any other unrelated functions if you like orderly grouping.

---

### How it works

* **pointerdown** on a grid cell begins a selection; any previous selection is cleared.
* **pointerover** while the button is held adds further “on” cells to the orange set.
* **pointerup** finishes the drag; the orange cells stay highlighted.
* Clicking anywhere **outside** the grid instantly reverts the orange cells back to their normal green `on` state (`clearSelection()`).

Playback, play/pause/stop, manual key pressing, etc. are untouched because the selected cells still carry the `.on` class—`step()` continues to trigger them exactly as before.

Simply drop in the CSS tweak and the JavaScript snippet, reload the page, and enjoy drag-selecting notes! 🎹
