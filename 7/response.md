Below is a clean, drop-in replacement for **styles.css** that incorporates your new dimensions and keeps the grid perfectly flush with the piano row.
*No changes are needed in `index.html` or `script.js`; the JavaScript already builds the correct number of columns.*

```css
/* ----------- COLOR VARIABLES ------------------------------------------ */
:root{
  --white-key:#fff;
  --black-key:#111;
  --active:   #228b22;           /* forest-green “on” cells              */

  /* size tokens used in several places so widths stay in sync */
  --key-w : 25px;                /* white-key & black-key width          */
  --key-h : 150px;               /* key height                           */
  --grid-s: calc(var(--key-w) + 1px); /* cell size (25-px key + 1-px right border
                                         after border-collapse)            */
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
  width:var(--key-w);  height:var(--key-h);
  border:1px solid #444; border-radius:4px;
  display:inline-block; cursor:pointer;
}

.white{ background:var(--white-key); }
.black{ background:var(--black-key); color:#eee; }
.held { filter:brightness(75%); }

/* ----------- SEQUENCER GRID ------------------------------------------- */
.seq td{
  width:var(--grid-s);   height:var(--grid-s);
  background:#333; border:1px solid #555; cursor:pointer;
}
.seq .on{ background:var(--active); }
```

### Why `--grid-s` is 26 px

* With `border-collapse: collapse`, adjacent cell borders share space.
* Each key is **25 px** wide **plus** a 1 px right-hand border → **26 px** effective column.
* Setting grid cells to the same 26 px guarantees the grid columns line up exactly under each key—even when you later tweak the size in one place.

Feel free to adjust `--key-w`, `--key-h`, or `--grid-s`; everything will stay aligned because the variables are reused consistently.
