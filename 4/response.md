**Root cause**

The Salamander-Grand set that Tone.js hosts **doesn’t have every key recorded**—only these four samples per octave:

| Natural | Sharp | File name pattern |
| ------- | ----- | ----------------- |
| A       | –     | `A<oct>.mp3`      |
| C       | –     | `C<oct>.mp3`      |
| –       | D♯    | `Ds<oct>.mp3`     |
| –       | F♯    | `Fs<oct>.mp3`     |

(See the file list in the repo: A0.mp3, C1.mp3, Ds1.mp3, Fs1.mp3, … etc.) ([github.com][1])

Because our original code *forced* a URL for **every** note, Tone tried to fetch e.g. `G3.mp3` and `A#4.mp3`, which 404-ed.

---

### Quick patch

1. **Only give the sampler the files that really exist.**
   Tone.Sampler will automatically pitch-shift those four base samples to cover the missing notes.

```js
/* ------------------------------------------------------------------
 * 1 – Sampler: map only A, C, Ds, Fs
 * ----------------------------------------------------------------*/
const SUPPORTED_NOTES = ["A", "C", "D#", "F#"];   // files that exist
const sampler = new Tone.Sampler({
  urls: Object.fromEntries(
    OCTAVE_RANGE.flatMap(oct =>
      SUPPORTED_NOTES.map(n => {
        const file = (n.replace("#","s") + oct + ".mp3");
        return [`${n}${oct}`, file];
      })
    )
  ),
  release: 1,
  baseUrl: "https://tonejs.github.io/audio/salamander/",
}).toDestination();
```

2. **Keep the rest of the script unchanged.**
   The piano still shows all 12 semitones per octave—the sampler will simply stretch the nearest real sample when you press a “missing” key, so every key now plays without 404 errors.

---

#### Why this works

Tone.Sampler’s internal logic:

* **If a note is in `urls`** → fetch that specific file (no 404 now).
* **If not** → find the closest sample that *is* loaded and pitch-shift it in real time.

Using just those four per octave is exactly what the official Tone.js examples do. ([github.com][2])

Reload the page after the change and every key should sound. Enjoy the full range of your mini-piano! 🎹

[1]: https://github.com/tensorflow/magenta/commit/3b740aa08499c0dfe41ed7203aadc504ccea3827.patch "A.I. DUET"
[2]: https://github.com/Tonejs/tonejs.github.io/blob/master/examples/sampler.html?utm_source=chatgpt.com "tonejs.github.io/examples/sampler.html at master · Tonejs/tonejs ..."
