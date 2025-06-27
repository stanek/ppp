Below is a **minimal patch** to fix the arrow-key move bug.

### 1 · Replace **one line** in **script.js**

Find the arrow-move section (near the bottom of the file).
Replace the line that clears the source cell:

```js
moves.forEach(([s])=>s.classList.remove('on','selected','fingering'));  // clear src
```

with

```js
/* clear source: classes *and* any finger-number */
moves.forEach(([s])=>{
  s.classList.remove('on','selected','fingering');
  s.textContent = '';                     // ← this was missing
});
```

That’s all—no other changes needed.
Now when you move notes with digits, the old square is properly cleared and the fingering appears only in the new location.
