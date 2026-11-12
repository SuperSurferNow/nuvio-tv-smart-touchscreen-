// Built-in on-screen keyboard for touchscreen devices (Lenovo Legion Go etc.).
// - Appears when a text field is tapped (or via the floating keyboard button).
// - IP field gets a numeric keypad; everything else gets a full keyboard.
// - Has a Paste key that reads the system clipboard, so no Ctrl+V is needed.
(function () {
  const isTextField = (el) =>
    el && el.tagName === "INPUT" && ["text", "password", "search", "tel", "url"].includes(el.type) && !el.readOnly && !el.disabled;

  const LETTERS = [
    "q w e r t y u i o p".split(" "),
    "a s d f g h j k l".split(" "),
    ["shift", ..."z x c v b n m".split(" "), "back"],
  ];
  const SYMBOLS = [
    "1 2 3 4 5 6 7 8 9 0".split(" "),
    "- _ . : / @ # & + =".split(" "),
    ["shift", ..."! ? , ; ' \" * %".split(" "), "back"],
  ];
  const NUMPAD = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    [".", "0", "back"],
  ];

  let target = null;
  let mode = "alpha"; // alpha | symbols | numpad
  let shift = false;
  let lastPointerWasTouch = false;
  let manuallyOpen = false;

  const root = document.createElement("div");
  root.id = "osk";
  root.className = "osk hidden";
  root.setAttribute("aria-label", "On-screen keyboard");
  document.body.appendChild(root);

  const fab = document.createElement("button");
  fab.type = "button";
  fab.id = "osk-toggle";
  fab.className = "osk-fab";
  fab.setAttribute("aria-label", "Show on-screen keyboard");
  fab.innerHTML =
    '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/></svg>';
  document.body.appendChild(fab);

  // Keep focus in the text field: never let a keyboard tap steal it.
  const keepFocus = (e) => e.preventDefault();
  root.addEventListener("pointerdown", keepFocus);
  root.addEventListener("mousedown", keepFocus);
  fab.addEventListener("pointerdown", keepFocus);
  fab.addEventListener("mousedown", keepFocus);

  function insert(text) {
    if (!target) return;
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? target.value.length;
    target.setRangeText(text, start, end, "end");
    target.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function backspace() {
    if (!target) return;
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? target.value.length;
    if (start !== end) {
      target.setRangeText("", start, end, "end");
    } else if (start > 0) {
      target.setRangeText("", start - 1, start, "end");
    }
    target.dispatchEvent(new Event("input", { bubbles: true }));
  }

  async function paste() {
    let text = "";
    try {
      text = (await window.installer?.readClipboard?.()) ?? "";
    } catch (_) {
      try { text = await navigator.clipboard.readText(); } catch (_) { /* ignore */ }
    }
    text = String(text).replace(/[\r\n]+/g, " ").trim();
    if (text) insert(text);
  }

  function moveFocus(dir) {
    const fields = Array.from(document.querySelectorAll("input")).filter((el) => isTextField(el) && el.offsetParent !== null);
    const i = fields.indexOf(target);
    const next = fields[i + dir];
    if (next) next.focus();
    else hide();
  }

  function hide() {
    manuallyOpen = false;
    root.classList.add("hidden");
    document.body.classList.remove("osk-open");
    document.body.style.removeProperty("--osk-height");
    if (target) target.blur();
  }

  function key(label, cls, handler) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "osk-key " + (cls || "");
    b.innerHTML = label;
    b.addEventListener("click", handler);
    return b;
  }

  function render() {
    root.innerHTML = "";
    const useNumpad = mode === "numpad";
    root.classList.toggle("osk-numpad", useNumpad);

    const bar = document.createElement("div");
    bar.className = "osk-bar";
    const title = document.createElement("span");
    title.className = "osk-title";
    const lbl = target && target.id ? document.querySelector(`label[for="${target.id}"]`) : null;
    title.textContent = lbl ? lbl.textContent : "Type here";
    bar.appendChild(title);
    bar.appendChild(key("Paste", "osk-action", paste));
    bar.appendChild(key("Clear", "osk-action", () => { if (target) { target.value = ""; target.dispatchEvent(new Event("input", { bubbles: true })); } }));
    bar.appendChild(key("Prev", "osk-action", () => moveFocus(-1)));
    bar.appendChild(key("Next", "osk-action", () => moveFocus(1)));
    bar.appendChild(key("Done", "osk-action osk-done", hide));
    root.appendChild(bar);

    const rows = useNumpad ? NUMPAD : mode === "symbols" ? SYMBOLS : LETTERS;
    rows.forEach((r) => {
      const row = document.createElement("div");
      row.className = "osk-row";
      r.forEach((k) => {
        if (k === "shift") {
          if (mode === "symbols") row.appendChild(key("", "osk-wide osk-spacer", () => {}));
          else row.appendChild(key(shift ? "&#8679;" : "&#8679;", "osk-wide" + (shift ? " active" : ""), () => { shift = !shift; render(); }));
        } else if (k === "back") {
          row.appendChild(key("&#9003;", "osk-wide", backspace));
        } else {
          const ch = shift && mode === "alpha" ? k.toUpperCase() : k;
          row.appendChild(key(ch, "", () => {
            insert(ch);
            if (shift) { shift = false; render(); }
          }));
        }
      });
      root.appendChild(row);
    });

    if (!useNumpad) {
      const last = document.createElement("div");
      last.className = "osk-row";
      last.appendChild(key(mode === "alpha" ? "123 #+=" : "ABC", "osk-wide", () => { mode = mode === "alpha" ? "symbols" : "alpha"; shift = false; render(); }));
      last.appendChild(key(".", "", () => insert(".")));
      last.appendChild(key("space", "osk-space", () => insert(" ")));
      last.appendChild(key("-", "", () => insert("-")));
      last.appendChild(key("Enter", "osk-wide", hide));
      root.appendChild(last);
    }
  }

  function show(el) {
    target = el;
    mode = el && el.id === "ip" ? "numpad" : "alpha";
    shift = false;
    render();
    root.classList.remove("hidden");
    document.body.classList.add("osk-open");
    requestAnimationFrame(() => {
      document.body.style.setProperty("--osk-height", root.offsetHeight + "px");
      if (target) target.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }

  document.addEventListener("pointerdown", (e) => {
    lastPointerWasTouch = e.pointerType === "touch" || e.pointerType === "pen";
  }, true);

  document.addEventListener("focusin", (e) => {
    if (!isTextField(e.target)) return;
    if (lastPointerWasTouch || manuallyOpen || !root.classList.contains("hidden")) show(e.target);
  });

  // Tapping anywhere that is not a field, the keyboard or a button closes it.
  document.addEventListener("pointerdown", (e) => {
    if (root.classList.contains("hidden")) return;
    if (root.contains(e.target) || fab.contains(e.target)) return;
    if (isTextField(e.target)) return;
    if (e.target.closest && e.target.closest("button, select, label, .select-card")) return;
    hide();
  }, true);

  fab.addEventListener("click", () => {
    if (!root.classList.contains("hidden")) { hide(); return; }
    manuallyOpen = true;
    const el = isTextField(document.activeElement)
      ? document.activeElement
      : Array.from(document.querySelectorAll("input")).find((i) => isTextField(i) && i.offsetParent !== null);
    if (el) { el.focus(); show(el); }
  });

  // Only show the floating button when a text field is on screen.
  const syncFab = () => {
    const any = Array.from(document.querySelectorAll("input")).some((i) => isTextField(i) && i.offsetParent !== null);
    fab.classList.toggle("hidden", !any);
  };
  new MutationObserver(syncFab).observe(document.body, { attributes: true, childList: true, subtree: true, attributeFilter: ["class", "style"] });
  syncFab();
})();
