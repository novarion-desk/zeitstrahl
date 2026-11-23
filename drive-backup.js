/* Teaching Cockpit – gemeinsamer Baustein für Google Drive (Sicherung + Dateiauswahl).
   Berechtigung: nur «drive.file» (Zugriff auf Dateien, die die App selbst erstellt oder die du auswählst).
   Client-ID und API-Schlüssel sind öffentlich (der Schlüssel ist auf novarion-desk.github.io eingeschränkt). */
(function () {
  'use strict';
  var CFG = {
    clientId: '274439019701-t5r5cedde8ctlfb6e8m5fcmauv0j97cd.apps.googleusercontent.com',
    apiKey: 'AIzaSyDygVdpJfSF4NG0faAQKohjPkNqWL07hlk',
    projectNumber: '274439019701',
    scope: 'https://www.googleapis.com/auth/drive.file',
    rootFolder: 'Teaching Cockpit Backups',
    ownerHash: 'ec3634fafccb15f13635691c887e970018bd949296a44a32c160585e829180c4',          // SHA-256 der Besitzer-Adresse (Anzeige-Regel, keine Sicherheitsgrenze)
    github: 'novarion-desk', pages: 'https://novarion-desk.github.io',
    repos: ['sek-planer', 'sek-zufall', 'lightning', 'zeitstrahl', 'grammatik-trainer', 'englishlab', 'tensetrainer', 'notentrainer', 'caroule', 'piano-levels', 'novarion-desk.github.io']
  };
  var token = '', tokenExp = 0, tokenClient = null, folderCache = {};

  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = src; s.async = true;
      s.onload = res; s.onerror = function () { rej(new Error('Skript nicht ladbar: ' + src)); };
      document.head.appendChild(s);
    });
  }
  async function sha256Hex(str) {
    var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }
  async function isOwner(email) {
    if (!email) return false;
    try { return (await sha256Hex(String(email).trim().toLowerCase())) === CFG.ownerHash; } catch (e) { return false; }
  }

  // ---- Anmeldung (Google Identity Services) ----
  async function getToken(interactive) {
    if (token && Date.now() < tokenExp - 60000) return token;
    if (!(window.google && google.accounts && google.accounts.oauth2)) await loadScript('https://accounts.google.com/gsi/client');
    return new Promise(function (resolve, reject) {
      try {
        tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: CFG.clientId, scope: CFG.scope,
          callback: function (r) {
            if (r && r.access_token) { token = r.access_token; tokenExp = Date.now() + (Number(r.expires_in) || 3000) * 1000; resolve(token); }
            else reject(new Error((r && (r.error_description || r.error)) || 'Anmeldung abgebrochen'));
          },
          error_callback: function (e) { reject(new Error((e && (e.message || e.type)) || 'Anmeldung nicht möglich')); }
        });
        tokenClient.requestAccessToken({ prompt: interactive === false ? 'none' : '' });
      } catch (e) { reject(e); }
    });
  }
  function hasToken() { return !!token && Date.now() < tokenExp - 60000; }

  async function api(url, opts) {
    var t = await getToken(true);
    opts = opts || {}; opts.headers = Object.assign({ Authorization: 'Bearer ' + t }, opts.headers || {});
    var r = await fetch(url, opts);
    if (r.status === 401) { token = ''; throw new Error('Google-Anmeldung abgelaufen – bitte nochmals versuchen.'); }
    if (!r.ok) { var tx = ''; try { tx = await r.text(); } catch (e) {} throw new Error('Drive-Fehler ' + r.status + (tx ? ': ' + tx.slice(0, 160) : '')); }
    return r.json();
  }
  function q(s) { return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
  async function ensureFolder(name, parentId) {
    var key = (parentId || 'root') + '/' + name;
    if (folderCache[key]) return folderCache[key];
    var qs = "name='" + q(name) + "' and mimeType='application/vnd.google-apps.folder' and trashed=false" + (parentId ? " and '" + parentId + "' in parents" : '');
    var l = await api('https://www.googleapis.com/drive/v3/files?fields=files(id,name)&q=' + encodeURIComponent(qs));
    var id = l.files && l.files[0] ? l.files[0].id : '';
    if (!id) {
      var c = await api('https://www.googleapis.com/drive/v3/files?fields=id', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, mimeType: 'application/vnd.google-apps.folder', parents: parentId ? [parentId] : undefined }) });
      id = c.id;
    }
    folderCache[key] = id; return id;
  }
  // Datei in «Teaching Cockpit Backups / <App>» ablegen
  var memRoot;   // Zielordner: im Speicher gehalten, zusätzlich im Browser abgelegt
  function getRoot() {
    if (memRoot !== undefined) return memRoot;
    try { memRoot = JSON.parse(localStorage.getItem('tcb_root') || 'null'); } catch (e) { memRoot = null; }
    return memRoot;
  }
  function setRoot(o) {
    memRoot = o ? { id: o.id, name: o.name, url: o.url } : null;
    try { if (o) localStorage.setItem('tcb_root', JSON.stringify(memRoot)); else localStorage.removeItem('tcb_root'); } catch (e) {}
    folderCache = {};
  }
  function folderUrl(id) { return 'https://drive.google.com/drive/folders/' + id; }
  async function upload(appName, fileName, blob, mime) {
    var chosen = getRoot();
    var root = chosen && chosen.id ? chosen.id : await ensureFolder(CFG.rootFolder);
    var folder = await ensureFolder(appName, root);
    var boundary = 'tcb' + Math.random().toString(36).slice(2);
    var meta = JSON.stringify({ name: fileName, parents: [folder] });
    var body = new Blob(['--' + boundary + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + meta + '\r\n--' + boundary + '\r\nContent-Type: ' + (mime || 'application/octet-stream') + '\r\n\r\n', blob, '\r\n--' + boundary + '--']);
    var res = await api('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', { method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + boundary }, body: body });
    res.folderId = folder; res.folderUrl = folderUrl(folder); res.rootName = chosen && chosen.name ? chosen.name : CFG.rootFolder;
    return res;
  }

  // ---- ZIP (ohne Kompression) ----
  var crcTable = null;
  function crc32(u8) {
    if (!crcTable) { crcTable = new Uint32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; crcTable[n] = c >>> 0; } }
    var crc = 0xFFFFFFFF; for (var i = 0; i < u8.length; i++) crc = crcTable[(crc ^ u8[i]) & 255] ^ (crc >>> 8); return (crc ^ 0xFFFFFFFF) >>> 0;
  }
  function makeZip(files) {   // files: [{name, data:Uint8Array}]
    var parts = [], central = [], offset = 0, enc = new TextEncoder();
    var d = new Date(), dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), dosDate = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    files.forEach(function (f) {
      var nm = enc.encode(f.name), crc = crc32(f.data), sz = f.data.length;
      var lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
      lh.setUint16(10, dosTime, true); lh.setUint16(12, dosDate, true); lh.setUint32(14, crc, true); lh.setUint32(18, sz, true); lh.setUint32(22, sz, true);
      lh.setUint16(26, nm.length, true); lh.setUint16(28, 0, true);
      parts.push(lh.buffer, nm, f.data);
      var ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
      ch.setUint16(12, dosTime, true); ch.setUint16(14, dosDate, true); ch.setUint32(16, crc, true); ch.setUint32(20, sz, true); ch.setUint32(24, sz, true);
      ch.setUint16(28, nm.length, true); ch.setUint32(42, offset, true);
      central.push(ch.buffer, nm);
      offset += 30 + nm.length + sz;
    });
    var csize = central.reduce(function (a, b) { return a + (b.byteLength !== undefined ? b.byteLength : b.length); }, 0);
    var end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, csize, true); end.setUint32(16, offset, true);
    return new Blob(parts.concat(central, [end.buffer]), { type: 'application/zip' });
  }

  // ---- Code (HTML) einer App von der eigenen Website holen ----
  async function codeZip(repo, onProgress) {
    var base = repo === 'novarion-desk.github.io' ? CFG.pages + '/' : CFG.pages + '/' + repo + '/';
    var tr = await fetch('https://api.github.com/repos/' + CFG.github + '/' + repo + '/git/trees/main?recursive=1');
    if (!tr.ok) throw new Error('Dateiliste von ' + repo + ' nicht lesbar (' + tr.status + ')');
    var tree = await tr.json();
    var list = (tree.tree || []).filter(function (e) { return e.type === 'blob' && !/^(versions|\.git)\//.test(e.path) && !/^\./.test(e.path.split('/').pop()) ; });
    var files = [], missing = 0;
    for (var i = 0; i < list.length; i++) {
      if (onProgress) onProgress(repo, i + 1, list.length);
      try {
        var r = await fetch(base + list[i].path.split('/').map(encodeURIComponent).join('/'), { cache: 'no-store' });
        if (!r.ok) { missing++; continue; }
        files.push({ name: repo + '/' + list[i].path, data: new Uint8Array(await r.arrayBuffer()) });
      } catch (e) { missing++; }
    }
    return { zip: makeZip(files), count: files.length, missing: missing };
  }

  // ---- Dateien aus Drive wählen (Google Picker) ----
  async function pick() {
    var t = await getToken(true);
    if (!(window.google && google.picker)) {
      if (!window.gapi) await loadScript('https://apis.google.com/js/api.js');
      await new Promise(function (res, rej) { gapi.load('picker', { callback: res, onerror: rej }); });
    }
    return new Promise(function (resolve) {
      var view = new google.picker.DocsView().setIncludeFolders(false).setSelectFolderEnabled(false);
      new google.picker.PickerBuilder().addView(view).setOAuthToken(t).setDeveloperKey(CFG.apiKey).setAppId(CFG.projectNumber)
        .setLocale('de').setCallback(function (d) {
          if (d.action === google.picker.Action.PICKED && d.docs && d.docs[0]) {
            var f = d.docs[0]; resolve({ id: f.id, name: f.name, url: f.url, mimeType: f.mimeType, sizeBytes: f.sizeBytes || 0 });
          } else if (d.action === google.picker.Action.CANCEL) resolve(null);
        }).build().setVisible(true);
    });
  }

  // ---- Zielordner wählen (Google Picker, nur Ordner) ----
  async function pickFolder() {
    var t = await getToken(true);
    if (!(window.google && google.picker)) {
      if (!window.gapi) await loadScript('https://apis.google.com/js/api.js');
      await new Promise(function (res, rej) { gapi.load('picker', { callback: res, onerror: rej }); });
    }
    return new Promise(function (resolve) {
      var view = new google.picker.DocsView(google.picker.ViewId.FOLDERS).setIncludeFolders(true).setSelectFolderEnabled(true).setMimeTypes('application/vnd.google-apps.folder');
      new google.picker.PickerBuilder().addView(view).setTitle('Ordner für die Sicherungen wählen').setOAuthToken(t).setDeveloperKey(CFG.apiKey).setAppId(CFG.projectNumber)
        .setLocale('de').setCallback(function (d) {
          if (d.action === google.picker.Action.PICKED && d.docs && d.docs[0]) { var f = d.docs[0]; resolve({ id: f.id, name: f.name, url: f.url || folderUrl(f.id) }); }
          else if (d.action === google.picker.Action.CANCEL) resolve(null);
        }).build().setVisible(true);
    });
  }


  // ---- Fertiger Bereich «Google Drive» für Einstellungen einer App ----
  // opts: { host: Element, app: 'Sek Zufall', repo: 'sek-zufall', getBackup: async () => ({ blob, name, info }), getEmail: () => string, isDemo: () => bool, toast: fn }
  function mountSection(o) {
    var K = function (k) { return 'tcb.' + o.app + '.' + k; };
    var get = function (k) { try { return localStorage.getItem(K(k)) || ''; } catch (e) { return ''; } };
    var set = function (k, v) { try { localStorage.setItem(K(k), v); } catch (e) {} };
    var toast = o.toast || function (m) { try { alert(m); } catch (e) {} };
    var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    var ago = function (iso) { if (!iso) return 'noch nie'; var d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000); return d <= 0 ? 'heute' : d === 1 ? 'gestern' : 'vor ' + d + ' Tagen'; };
    var days = function (iso) { return iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : Infinity; };
    var box = 'border:1px solid #a7f3d0;background:#ecfdf5;border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:8px;font-size:11px;color:#064e3b;margin-top:10px';
    var btn = 'padding:6px 12px;border-radius:8px;font-weight:700;font-size:11px;cursor:pointer;border:1px solid #6ee7b7;background:#fff;color:#065f46';
    var btnP = 'padding:6px 12px;border-radius:8px;font-weight:700;font-size:11px;cursor:pointer;border:0;background:#047857;color:#fff';
    var id = 'tcb-' + o.app.replace(/\W+/g, '');
    o.host.insertAdjacentHTML('beforeend',
      '<div id="' + id + '" style="' + box + '">' +
      '<div style="font-weight:800;font-size:12px">☁️ Google Drive (Ordner «Teaching Cockpit Backups»)</div>' +
      '<div data-s="status" style="background:#fff;border:1px solid #a7f3d0;border-radius:8px;padding:8px;font-weight:600;line-height:1.5;white-space:pre-line"></div>' +
      '<div data-s="folder" style="font-weight:600"></div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px">' +
      '<button type="button" data-a="save" style="' + btnP + '">Jetzt in Drive sichern (Daten, .json)</button>' +
      '<button type="button" data-a="pick" style="' + btn + '">📁 Ordner wählen</button>' +
      '<button type="button" data-a="reset" style="' + btn + ';display:none">Ordner zurücksetzen</button></div>' +
      '<label style="display:flex;gap:8px;align-items:center;font-weight:600;cursor:pointer"><input type="checkbox" data-a="remind"> <span>Beim Öffnen daran erinnern, höchstens 1× pro Woche</span></label>' +
      '<div data-s="owner" style="display:none;flex-direction:column;gap:6px;border-top:1px solid #a7f3d0;padding-top:8px">' +
      '<div style="font-weight:700">Nur für dich als Besitzer: Code (HTML) sichern</div>' +
      '<div><button type="button" data-a="code" style="' + btn + '">Code dieser App sichern</button></div>' +
      '<label style="display:flex;gap:8px;align-items:center;font-weight:600;cursor:pointer"><input type="checkbox" data-a="coderemind"> <span>Erinnern, wenn die Code-Sicherung älter als 14 Tage ist</span></label>' +
      '<div data-s="codestatus" style="opacity:.8"></div></div>' +
      '<div data-s="acct" style="font-size:10.5px;opacity:.7"></div></div>');
    var root = document.getElementById(id);
    var q1 = function (sel) { return root.querySelector(sel); };
    async function refresh() {
      var email = o.getEmail ? o.getEmail() : '';
      var own = await isOwner(email);
      q1('[data-s=status]').textContent = '☁️ Letzte Drive-Sicherung (Daten): ' + ago(get('last')) + (get('lastcode') ? '\n🧩 Letzte Drive-Sicherung (Code): ' + ago(get('lastcode')) : '');
      var r = getRoot(), lu = get('url');
      q1('[data-s=folder]').innerHTML = '📁 Zielordner: <b>' + esc(r && r.name ? r.name : 'Teaching Cockpit Backups (Standard, in «Mein Laufwerk»)') + '</b>' +
        (r && r.url ? ' · <a href="' + esc(r.url) + '" target="_blank" rel="noopener" style="text-decoration:underline">öffnen</a>' : '') +
        (lu ? '<br>Letzte Sicherung: <a href="' + esc(lu) + '" target="_blank" rel="noopener" style="text-decoration:underline">Ordner in Drive öffnen</a>' : '');
      q1('[data-a=reset]').style.display = r && r.id ? '' : 'none';
      q1('[data-a=remind]').checked = get('remind') === '1';
      q1('[data-a=coderemind]').checked = get('coderemind') === '1';
      q1('[data-s=owner]').style.display = own ? 'flex' : 'none';
      q1('[data-s=acct]').textContent = email ? 'Angemeldet als ' + email + (own ? ' (Besitzer: Code-Sicherung sichtbar)' : ' (kein Besitzer: nur Daten-Sicherung)') : '';
    }
    function guard() { if (o.isDemo && o.isDemo()) { toast('Im Demo-Modus nicht verfügbar.'); return false; } return true; }
    root.addEventListener('change', function (e) {
      var a = e.target.getAttribute && e.target.getAttribute('data-a');
      if (a === 'remind') set('remind', e.target.checked ? '1' : '0');
      if (a === 'coderemind') set('coderemind', e.target.checked ? '1' : '0');
    });
    root.addEventListener('click', async function (e) {
      var b = e.target.closest && e.target.closest('button[data-a]'); if (!b) return;
      var a = b.getAttribute('data-a');
      if (!guard()) return;
      try {
        if (a === 'pick') { var f = await pickFolder(); if (f) { setRoot(f); toast('Zielordner: ' + f.name); } }
        else if (a === 'reset') { setRoot(null); toast('Zielordner zurückgesetzt (Standard).'); }
        else if (a === 'save') {
          b.disabled = true; await getToken(true); toast('Backup wird erstellt …');
          var bk = await o.getBackup(); var up = await upload(o.app, bk.name, bk.blob, 'application/json');
          set('last', new Date().toISOString()); set('url', up.folderUrl || '');
          toast('In Drive gesichert: ' + up.rootName + ' › ' + o.app + ' › ' + bk.name + (bk.info ? ' (' + bk.info + ')' : ''));
        } else if (a === 'code') {
          var st = q1('[data-s=codestatus]'); b.disabled = true; await getToken(true);
          var r2 = await codeZip(o.repo, function (n, i, t) { st.textContent = n + ': Datei ' + i + '/' + t + ' …'; });
          var d = new Date(), stamp = d.toISOString().slice(0, 10) + '_' + d.toTimeString().slice(0, 5).replace(':', '');
          var up2 = await upload('Code', o.repo + '_' + stamp + '.zip', r2.zip, 'application/zip');
          set('lastcode', new Date().toISOString()); set('url', up2.folderUrl || '');
          st.textContent = '✅ ZIP in Drive (Ordner «Code» im Zielordner)' + (r2.missing ? ', ' + r2.missing + ' Datei(en) nicht lesbar' : '') + '.';
          toast('Code gesichert (' + r2.count + ' Dateien).');
        }
      } catch (err) { toast('Drive: ' + (err && err.message ? err.message : err)); }
      finally { b.disabled = false; refresh(); }
    });
    refresh();
    // Erinnerungen (höchstens einmal pro Tag)
    (async function () {
      if (o.isDemo && o.isDemo()) return;
      var today = new Date().toISOString().slice(0, 10);
      if (get('remind') === '1' && days(get('last')) > 7 && get('shown') !== today) { set('shown', today); setTimeout(function () { toast('☁️ Letzte Drive-Sicherung: ' + ago(get('last')) + ' – unter den Einstellungen «Jetzt in Drive sichern».'); }, 5000); }
      if (get('coderemind') === '1' && days(get('lastcode')) > 14 && get('shownc') !== today && await isOwner(o.getEmail ? o.getEmail() : '')) { set('shownc', today); setTimeout(function () { toast('🧩 Code-Sicherung (HTML): ' + (get('lastcode') ? ago(get('lastcode')) : 'noch nie') + ' – in den Einstellungen sichern.'); }, 9000); }
    })();
    return { refresh: refresh };
  }

  window.DriveBackup = { mountSection: mountSection, getRoot: getRoot, setRoot: setRoot, folderUrl: folderUrl, pickFolder: pickFolder, CFG: CFG, isOwner: isOwner, getToken: getToken, hasToken: hasToken, upload: upload, makeZip: makeZip, codeZip: codeZip, pick: pick, sha256Hex: sha256Hex };
})();
