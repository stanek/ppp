**What happened?**
Chrome blocks *module* scripts (`<script type="module">`) when the page is opened straight from disk (`file://…`). The browser treats each local file as a different origin (“null”), so the request for `script.js` triggers the CORS check you saw.

You have two easy fixes:

---

## 1. Quick fix – make it a classic script

Your `script.js` doesn’t actually use ES-module features (`import …` / `export …`), so just drop the `type="module"` attribute.

```html
<!-- index.html -->
…
<!-- change THIS line ↓ -->
<script defer src="script.js"></script>
</body>
</html>
```

Nothing else needs to change—`Tone` is still exposed globally by the CDN file you already include, and your code keeps working.

---

## 2. Proper dev setup – run a tiny local web server

Keeping `type="module"` is handy if you later want to add `import` statements.
Serve the folder over **HTTP** instead of double-clicking `index.html`:

| If you have… | Command to run in the project folder                     | Then open…                                     |
| ------------ | -------------------------------------------------------- | ---------------------------------------------- |
| **Python 3** | `python -m http.server 8000`                             | [http://localhost:8000](http://localhost:8000) |
| **Node.js**  | `npx serve` *(or)* `npm i -g http-server && http-server` | shown URL                                      |
| **VS Code**  | Install the **Live Server** extension → “Go Live”        | auto-opens                                     |

(Any other static-file server works—these are just one-liners.)

---

### Which option should I choose?

* **Just testing quickly?** Remove `type="module"`.
* **Plan to refactor into modules / import other files?** Spin up the tiny server—it’s the same step you’ll need for real deployment anyway.

Either way, after the change you’ll stop seeing the CORS error and the piano will load normally. 🎹
