/* ============================================================
   Eos · 个人全能站  —  app.js
   纯原生实现：主题、导航、滚动动效、番茄钟、字数统计、配色生成
   ============================================================ */

(function () {
  "use strict";

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---------------- 主题 ---------------- */
  var root = document.documentElement;
  var savedTheme = null;
  try { savedTheme = localStorage.getItem("eos-theme"); } catch (e) {}
  if (savedTheme === "light" || savedTheme === "dark") {
    root.setAttribute("data-theme", savedTheme);
  }

  var themeToggle = $("#themeToggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("eos-theme", next); } catch (e) {}
    });
  }

  /* ---------------- 导航 ---------------- */
  var nav = $("#nav");
  var menuBtn = $("#menuBtn");
  var navLinks = $("#navLinks");

  function onScroll() {
    if (nav) nav.classList.toggle("scrolled", window.scrollY > 12);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (menuBtn && navLinks) {
    menuBtn.addEventListener("click", function () {
      var open = navLinks.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    $$("a", navLinks).forEach(function (link) {
      link.addEventListener("click", function () {
        navLinks.classList.remove("open");
        menuBtn.setAttribute("aria-expanded", "false");
      });
    });
    document.addEventListener("click", function (e) {
      if (!navLinks.contains(e.target) && !menuBtn.contains(e.target)) {
        navLinks.classList.remove("open");
        menuBtn.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------------- 滚动显现 ---------------- */
  var revealEls = $$(".reveal");
  if ("IntersectionObserver" in window) {
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          revealIO.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach(function (el, i) {
      el.style.transitionDelay = (i % 4) * 60 + "ms";
      revealIO.observe(el);
    });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------------- 当前导航高亮 ---------------- */
  var sections = $$("main section[id]");
  var navAnchors = $$(".nav-links a");
  if ("IntersectionObserver" in window && sections.length) {
    var currentId = "";
    var spyIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) currentId = entry.target.id;
      });
      navAnchors.forEach(function (a) {
        a.classList.toggle("active", a.getAttribute("href") === "#" + currentId);
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(function (s) { spyIO.observe(s); });
  }

  /* ---------------- 项目卡片光斑 ---------------- */
  $$(".project").forEach(function (card) {
    card.addEventListener("mousemove", function (e) {
      var rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", (e.clientX - rect.left) + "px");
      card.style.setProperty("--my", (e.clientY - rect.top) + "px");
    });
  });

  /* ---------------- Toast ---------------- */
  var toastEl = $("#toast");
  var toastTimer = null;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 1800);
  }

  function copyText(text, okMsg) {
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta);
      toast(okMsg);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        toast(okMsg);
      }).catch(fallback);
    } else {
      fallback();
    }
  }

  /* ---------------- 复制邮箱 ---------------- */
  $$("[data-mail]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      copyText(btn.getAttribute("data-mail"), "邮箱已复制到剪贴板");
    });
  });

  /* ---------------- Tabs ---------------- */
  var tabs = $$(".tab");
  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      tabs.forEach(function (t) {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
        var p = document.getElementById(t.getAttribute("aria-controls"));
        if (p) { p.classList.remove("active"); p.hidden = true; }
      });
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");
      var panel = document.getElementById(tab.getAttribute("aria-controls"));
      if (panel) { panel.classList.add("active"); panel.hidden = false; }
    });
  });

  function activeTabId() {
    var t = $(".tab.active");
    return t ? t.id : "";
  }

  /* ---------------- 番茄钟 ---------------- */
  var timerTime = $("#timerTime");
  var timerMode = $("#timerMode");
  var timerStart = $("#timerStart");
  var timerReset = $("#timerReset");
  var timerHint = $("#timerHint");
  var ring = $("#ringProgress");
  var CIRCUMFERENCE = 2 * Math.PI * 96;

  var totalSec = 25 * 60;
  var leftSec = totalSec;
  var running = false;
  var tickId = null;

  function fmt(sec) {
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }

  function renderTimer() {
    if (timerTime) timerTime.textContent = fmt(leftSec);
    if (ring) {
      var progress = 1 - leftSec / totalSec;
      ring.style.strokeDasharray = CIRCUMFERENCE.toFixed(1);
      ring.style.strokeDashoffset = (CIRCUMFERENCE * progress).toFixed(1);
      var nearEnd = leftSec <= 60 && leftSec > 0;
      ring.style.stroke = nearEnd ? "#ff5c8a" : "var(--accent-2)";
    }
  }

  function stopTimer() {
    running = false;
    clearInterval(tickId);
    tickId = null;
    if (timerStart) timerStart.textContent = "开始";
  }

  function tick() {
    leftSec -= 1;
    if (leftSec <= 0) {
      leftSec = 0;
      renderTimer();
      stopTimer();
      toast("时间到，休息一下吧");
      if (timerHint) timerHint.textContent = "本轮完成。休息片刻，再开始下一个番茄钟。";
      return;
    }
    renderTimer();
  }

  if (timerStart) {
    timerStart.addEventListener("click", function () {
      if (running) {
        stopTimer();
        if (timerHint) timerHint.textContent = "已暂停，随时可以继续。";
        return;
      }
      if (leftSec <= 0) leftSec = totalSec;
      running = true;
      timerStart.textContent = "暂停";
      if (timerHint) timerHint.textContent = "专注进行中，先把手机放远一点。";
      clearInterval(tickId);
      tickId = setInterval(tick, 1000);
    });
  }

  if (timerReset) {
    timerReset.addEventListener("click", function () {
      stopTimer();
      leftSec = totalSec;
      renderTimer();
      if (timerHint) timerHint.textContent = "已重置，准备好就开始。";
    });
  }

  $$(".mode").forEach(function (btn) {
    btn.addEventListener("click", function () {
      $$(".mode").forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      totalSec = parseInt(btn.getAttribute("data-min"), 10) * 60;
      leftSec = totalSec;
      stopTimer();
      renderTimer();
      if (timerMode) timerMode.textContent = btn.textContent.replace(/\s*\d+$/, "");
      if (timerHint) {
        timerHint.textContent = btn.getAttribute("data-min") === "25"
          ? "专注一个番茄钟，然后休息 5 分钟。"
          : "休息也是效率的一部分。";
      }
    });
  });

  renderTimer();

  /* ---------------- 字数统计 ---------------- */
  var countInput = $("#countInput");
  var statChars = $("#statChars");
  var statNoSpace = $("#statNoSpace");
  var statWords = $("#statWords");
  var statLines = $("#statLines");
  var statRead = $("#statRead");

  function countWords(text) {
    var cjk = text.match(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/g);
    var latin = text.match(/[A-Za-z0-9][A-Za-z0-9'’-]*/g);
    return (cjk ? cjk.length : 0) + (latin ? latin.length : 0);
  }

  function updateCount() {
    if (!countInput) return;
    var text = countInput.value;
    var chars = text.length;
    var noSpace = text.replace(/\s/g, "").length;
    var words = countWords(text);
    var lines = text ? text.split("\n").length : 0;
    var seconds = Math.ceil(chars / 400 * 60);

    statChars.textContent = chars.toLocaleString("zh-CN");
    statNoSpace.textContent = noSpace.toLocaleString("zh-CN");
    statWords.textContent = words.toLocaleString("zh-CN");
    statLines.textContent = lines.toLocaleString("zh-CN");
    statRead.textContent = seconds >= 60
      ? Math.ceil(seconds / 60) + " 分钟"
      : seconds + " 秒";
  }
  if (countInput) countInput.addEventListener("input", updateCount);

  /* ---------------- 配色生成 ---------------- */
  var paletteEl = $("#palette");
  var paletteGen = $("#paletteGen");

  function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var hp = h / 60;
    var x = c * (1 - Math.abs((hp % 2) - 1));
    var r = 0, g = 0, b = 0;
    if (hp >= 0 && hp < 1) { r = c; g = x; }
    else if (hp < 2) { r = x; g = c; }
    else if (hp < 3) { g = c; b = x; }
    else if (hp < 4) { g = x; b = c; }
    else if (hp < 5) { r = x; b = c; }
    else { r = c; b = x; }
    var m = l - c / 2;
    function toHex(v) {
      var n = Math.round((v + m) * 255);
      var str = n.toString(16);
      return str.length === 1 ? "0" + str : str;
    }
    return "#" + toHex(r) + toHex(g) + toHex(b);
  }

  function luminance(hex) {
    var r = parseInt(hex.slice(1, 3), 16) / 255;
    var g = parseInt(hex.slice(3, 5), 16) / 255;
    var b = parseInt(hex.slice(5, 7), 16) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function generatePalette() {
    if (!paletteEl) return;
    var baseHue = Math.floor(Math.random() * 360);
    var scheme = Math.random() > 0.5 ? "analogous" : "triadic";
    var lightSteps = [92, 76, 58, 40, 24];
    var html = "";

    for (var i = 0; i < 5; i++) {
      var hue;
      if (scheme === "analogous") {
        hue = (baseHue + (i - 2) * 18 + 360) % 360;
      } else {
        hue = (baseHue + i * 72) % 360;
      }
      var sat = 42 + i * 6 + Math.floor(Math.random() * 14);
      var hex = hslToHex(hue, Math.min(sat, 92), lightSteps[i]);
      var fg = luminance(hex) > 0.55 ? "#14162b" : "#ffffff";
      html += '<button class="swatch" type="button" data-hex="' + hex + '" ' +
        'style="background:' + hex + ';color:' + fg + '" ' +
        'aria-label="复制颜色 ' + hex + '"><span>' + hex + '</span></button>';
    }

    paletteEl.innerHTML = html;
    $$(".swatch", paletteEl).forEach(function (sw) {
      sw.addEventListener("click", function () {
        copyText(sw.getAttribute("data-hex"), sw.getAttribute("data-hex") + " 已复制");
      });
    });
  }

  if (paletteGen) paletteGen.addEventListener("click", generatePalette);
  generatePalette();

  document.addEventListener("keydown", function (e) {
    if (e.code !== "Space") return;
    var tag = (document.activeElement && document.activeElement.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "BUTTON") return;
    if (activeTabId() !== "tab-palette") return;
    e.preventDefault();
    generatePalette();
  });

  /* ---------------- 页脚年份 ---------------- */
  var yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
