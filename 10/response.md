Perfect—removing the rounded corners won’t affect any of the logic.
If you want the stylesheet to be explicit (instead of simply deleting the rule), set the radius to `0`:

```css
/* ----------- KEYS ------------------------------------------------------ */
.key{
  width:var(--key-w);  height:var(--key-h);
  border:1px solid #444;
  border-radius:0;          /* ← square corners */
  display:inline-block; cursor:pointer;
}
```

That’s all—no JavaScript changes required. Refresh and you’ll see crisp, square piano keys while everything else continues to work as before. 🎹
