/* Teaching Cockpit – gemeinsamer KI-Zugang (Mistral über den Cloudflare-Worker «tc-teacher-ki»).
   Die App schickt die Firebase-Anmeldung der Lehrperson mit; der Schlüssel liegt nur im Worker, nie in der App. */
(function () {
  'use strict';
  var URL_ASK = 'https://tc-teacher-ki.novarian-desk.workers.dev/ask';
  function me() { try { return firebase.auth().currentUser; } catch (e) { return null; } }
  function available() { var u = me(); return !!u && !u.isAnonymous; }
  // o: { system, user | messages:[{role:'user'|'assistant', content}], maxTokens }
  async function ask(o) {
    var u = me();
    if (!u || u.isAnonymous) throw new Error('Bitte mit dem Lehrerkonto anmelden.');
    var token = await u.getIdToken();
    var body = { system: o.system || '', max_tokens: o.maxTokens || 1500 };
    if (o.messages) body.messages = o.messages; else body.user = o.user || '';
    var r;
    try { r = await fetch(URL_ASK, { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
    catch (e) { throw new Error('Gemeinsamer KI-Zugang nicht erreichbar (keine Verbindung).'); }
    var j = {}; try { j = await r.json(); } catch (e) {}
    if (!r.ok || !j.answer) { var err = new Error(j.error || 'Gemeinsamer KI-Zugang nicht erreichbar (' + r.status + ').'); err.status = r.status; throw err; }
    return j;   // { answer, model, used, limit }
  }
  window.SharedKI = { ask: ask, available: available, url: URL_ASK };
})();
