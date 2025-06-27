/* ============================================================
   ChatGPT Showcase – script.js  (v7.1-fix)
   • Arrows reset to Prompt tab
   • Tabs stay put when clicked
   • No duplicate parseURL declaration
   ============================================================ */

(async () => {
  const $ = (sel, ctx = document) => ctx.querySelector(sel);

  /* ---------- helper: icon for Files tab ------------------ */
  const iconFor = ext =>
    ({ html:'📄', htm:'📄', css:'🎨', js:'📜', zip:'🗜️' }[ext] || '📄');

  /* ---------- path utilities ------------------------------ */
  const normalize = p => {
    p = p.replace(/\/+/g, '/').replace(/\/index\.html?$/i, '/');
    return p.endsWith('/') ? p : p + '/';
  };

  const parseUrl = p => {
    p = normalize(p);
    const m = p.match(/^(.*?)(\d+)\/$/);
    return {
      baseDir : (m ? m[1] : '/').replace(/\/?$/, '/'),
      snap    : m ? m[2] : '1',
    };
  };

  /* ---------- initial URL parse --------------------------- */
  let { baseDir, snap } = parseUrl(location.pathname);
  let snapNum = +snap;

  if (!/\d+\/$/.test(location.pathname)) {
    history.replaceState({}, '', `${baseDir}1/`);
    snap = '1'; snapNum = 1;
  }

  /* ---------- latest snapshot number ---------------------- */
  const latest = +(await fetch(`${baseDir}snapshots.json`)
    .then(r => r.json())
    .catch(() => ({ latest: 1 }))).latest || 1;

  /* ---------- DOM refs ------------------------------------ */
  const prevBtn = $('#prev-prompt');
  const nextBtn = $('#next-prompt');
  const panelTitle = $('#panel-title');
  const nav = $('nav');
  const tabArea = $('#tab-content');
  const iframe = $('#project-frame');
  const panel = $('#panel');

  /* ---------- helper: activate Prompt tab ----------------- */
  const activatePromptTab = () => {
    nav.querySelectorAll('button').forEach(b =>
      b.classList.toggle('active', b.dataset.tab === 'prompt'),
    );
  };

  /* ---------- fetch Markdown/HTML ------------------------- */
  const fetchMD = async file => {
    try {
      const txt = await fetch(`${baseDir}${snap}/${file}`).then(r => r.text());
      return file.endsWith('.html') ? txt : marked.parse(txt);
    } catch {
      return '<em>no content</em>';
    }
  };

  /* ---------- snapshot loader ----------------------------- */
  async function loadSnapshot(n, push = true) {
    snap = String(n);
    snapNum = n;
    if (push) history.pushState({}, '', `${baseDir}${snap}/`);

    const [promptHTML, responseHTML, analysisHTML] = await Promise.all([
      fetchMD('prompt.md'),
      fetchMD('response.md'),
      fetchMD('analysis.md'),
    ]);

    const filesTab = async () => {
      let tiles = '';
      try {
        const list = await fetch(`${baseDir}${snap}/files/files.md`).then(r => r.text());
        tiles = list
          .split(/\r?\n/)
          .filter(Boolean)
          .map(f => {
            const ext = f.split('.').pop().toLowerCase();
            return `<a class="file-link" href="${baseDir}${snap}/files/${f}" download>
                      <span class="file-icon">${iconFor(ext)}</span>
                      <span class="file-name">${f}</span>
                    </a>`;
          })
          .join('');
      } catch {}
      return `
        <a href="${baseDir}${snap}/files.zip" class="download-all" download>
          🗜️ Download all
        </a>
        ${tiles ? `<div class="file-grid">${tiles}</div>` : '<p>No individual files.</p>'}
      `;
    };

    const tabHtml = {
      prompt  : promptHTML,
      response: responseHTML,
      analysis: analysisHTML,
      files   : await filesTab(),
    };

    /* header + arrows */
    panelTitle.textContent = `Prompt #${snap}`;
    prevBtn.classList.toggle('hidden', snapNum <= 1);
    nextBtn.classList.toggle('hidden', snapNum >= latest);

    /* render currently-active tab */
    const activeTab = nav.querySelector('button.active')?.dataset.tab || 'prompt';
    tabArea.innerHTML = tabHtml[activeTab] || '';
    enhanceMarkdown();

    /* iframe */
    iframe.src = `${baseDir}${snap}/files/index.html`;
  }

  /* ---------- enhance markdown (copy buttons, etc.) ------- */
  function enhanceMarkdown() {
    const area = tabArea;

    area.querySelectorAll('pre').forEach(pre => {
      if (pre.parentElement.classList.contains('code-block')) return;
      const details = document.createElement('details');
      details.className = 'code-block';
      const summary = document.createElement('summary');
      const lang = pre.querySelector('code')?.className.match(/language-(\w+)/)?.[1] || 'code';
      summary.textContent = `${lang} ▼`;
      pre.parentNode.insertBefore(details, pre);
      details.append(summary, pre);
    });

    hljs.highlightAll();

    area.querySelectorAll('pre').forEach(pre => {
      if (pre.querySelector('.copy-btn')) return;
      const btn = Object.assign(document.createElement('button'), {
        className: 'copy-btn',
        textContent: 'copy',
      });
      btn.onclick = () =>
        navigator.clipboard.writeText(pre.innerText.trim()).then(() => {
          btn.textContent = '✓';
          setTimeout(() => (btn.textContent = 'copy'), 800);
        });
      pre.appendChild(btn);
    });

    area.querySelectorAll('img').forEach(img => {
      if (img.closest('a')) return;
      const a = document.createElement('a');
      a.href = img.src;
      a.target = '_blank';
      a.download = '';
      img.parentNode.insertBefore(a, img);
      a.appendChild(img);
    });
  }

  /* ---------- initial load -------------------------------- */
  await loadSnapshot(snapNum, false);

  /* ---------- arrow handlers ------------------------------ */
  prevBtn.onclick = () => {
    if (snapNum > 1) {
      activatePromptTab();
      loadSnapshot(snapNum - 1);
    }
  };
  nextBtn.onclick = () => {
    if (snapNum < latest) {
      activatePromptTab();
      loadSnapshot(snapNum + 1);
    }
  };

  /* ---------- tab handlers ------------------------------- */
  nav.addEventListener('click', e => {
    if (e.target.tagName !== 'BUTTON') return;
    nav.querySelectorAll('button').forEach(b =>
      b.classList.toggle('active', b === e.target),
    );
    loadSnapshot(snapNum, false); // re-render current snapshot in new tab
  });

  /* ---------- popstate (back/forward) --------------------- */
  window.addEventListener('popstate', () => {
    const { snap: newSnap } = parseUrl(location.pathname);
    loadSnapshot(+newSnap, false);
  });

  /* ---------- docking & minimise (unchanged) -------------- */
  const corners = ['bl', 'br', 'tr', 'tl'];
  let cornerIdx = 0;
  const dock = i => {
    panel.className = panel.className.replace(/corner-\w+/, '');
    panel.classList.add(`corner-${corners[i]}`);
    cornerIdx = i;
  };
  dock(cornerIdx);

  $('#dock-btn').onclick = () =>
    !panel.classList.contains('min') && dock((cornerIdx + 1) % 4);

  $('#min-btn').onclick = () => {
    panel.classList.toggle('min');
    if (!panel.classList.contains('min')) dock(cornerIdx);
  };
})();
