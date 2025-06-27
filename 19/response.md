Add just **three new lines** to your **`styles.css`** and the piano will stay visible while you scroll the grid.

```css
/* ---------- make piano sticky ------------------------------------ */
#piano{
  position: sticky;
  top: 0;                   /* pin to top of viewport               */
  background:#222;          /* same background so grid doesn’t show */
  z-index: 10;              /* sit above the green cells            */
}

/* (everything else in styles.css remains exactly the same) */
```

That’s it—no JavaScript changes required.
Refresh the page and scroll down the grid; the piano header and note labels will now remain fixed at the top of the window.
