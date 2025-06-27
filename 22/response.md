Here’s a **complete replacement** for your `styles.css`.
The only functional difference is that the three grid colors are now defined by variables — so you can lighten or darken them by editing the `:root` block only.

```css
:root{
  /* piano colours */
  --white-key:#fff;
  --black-key:#111;

  /* grid colours (edit these any time) */
  --grid-bg : #333;   /* default empty cell        */
  --grid-out: #444;   /* cell whose pitch is *outside* the key */
  --grid-on : #228b22;/* green “on” square         */

  /* highlight + selection */
  --sel:#ff8c00;      /* orange selection colour   */

  /* make the old --on alias the new token so no HTML changes needed */
  --on: var(--grid-on);

  /* sizes */
  --key-w :25px;
  --key-h :150px;
  --cell  :calc(var(--key-w) + 1px);  /* 26 px incl. shared border */
}

/* ---------- BASIC LAYOUT -------------------------------------------- */
body{
  margin:0; padding:1rem; background:#222; color:#ddd;
  font-family:system-ui,sans-serif; user-select:none; text-align:center;
}
table{ border-collapse:collapse; margin-inline:auto; }
td   { padding:0; text-align:center; }
#transport{ margin:0 0 1rem; display:flex; gap:.5rem; justify-content:center; }
#transport input{ width:4rem; }

/* ---------- PIANO ---------------------------------------------------- */
.octave{ font-size:1.5rem; font-weight:700;
         border-left:2px solid #777; border-right:2px solid #777; }
.note  { font-size:.9rem; }

.key{
  width:var(--key-w); height:var(--key-h);
  border:1px solid #444; display:inline-block; cursor:pointer;
}
.white{ background:var(--white-key); }
.black{ background:var(--black-key); color:#eee; }
.held { filter:brightness(75%); }

/* ---------- GRID ----------------------------------------------------- */
.seq{ position:relative; }                /* for cursor + lasso overlays */
.seq td{
  width:var(--cell); height:var(--cell);
  background:var(--grid-bg);
  border:1px solid #555; cursor:pointer;
}
.seq td.outkey  { background:var(--grid-out); }
.seq td.on      { background:var(--grid-on); }     /* overrides outkey shade */
.seq td.selected{ background:var(--sel) !important; } /* orange */

/* playback cursor */
#cursor{
  position:absolute; left:0; right:0; height:2px;
  background:red; pointer-events:none;
  transform:translateY(-2px);
}

/* lasso rectangle ----------------------------------------------------- */
#lasso{
  position:absolute; border:1px dashed var(--sel);
  background:rgba(255,140,0,.15);
  pointer-events:none; display:none;
}

/* key-select dropdown block ------------------------------------------ */
#keySelect{
  display:inline-flex; gap:.5rem; margin-bottom:.5rem;
  align-items:center; justify-content:center;
}
#keySelect select{ padding:.2rem; }

/* ---------- make piano sticky --------------------------------------- */
#piano{
  position:sticky; top:0;
  background:#222;        /* same bg to cover grid below */
  z-index:10;
}
```

**How to adjust colours later**

```css
:root{
  --grid-bg : #2a2a2a;  /* darker default */
  --grid-out: #555;     /* brighter out-of-key */
  --grid-on : #1fb03d;  /* lighter green “on” */
}
```

Just tweak those three hex values and the whole grid updates—no further edits needed.
