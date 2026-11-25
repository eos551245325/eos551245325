/* ============================================================
   Eos · 个人全能站  —  app.js
   纯原生：主题 / 命令面板 / 交互终端 / 滚动动效 / 打字机 /
   3D 卡片 / 番茄钟 / 字数统计 / 配色生成 / 彩蛋
   ============================================================ */

(function () {
  "use strict";

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isCoarse = window.matchMedia("(pointer: coarse)").matches;

  /* ---------------- 主题 ---------------- */
  var root = document.documentElement;
  var savedTheme = null;
  try { savedTheme = localStorage.getItem("eos-theme"); } catch (e) {}

  if (savedTheme !== "light" && savedTheme !== "dark") {
    savedTheme = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  root.setAttribute("data-theme", savedTheme);

  function setTheme(next) {
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("eos-theme", next); } catch (e) {}
    return next;
  }
  function toggleTheme() {
    return setTheme(root.getAttribute("data-theme") === "light" ? "dark" : "light");
  }

  var themeToggle = $("#themeToggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", function () { toggleTheme(); });
  }

  /* ---------------- Toast / 复制 ---------------- */
  var toastEl = $("#toast");
  var toastTimer = null;

  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 1900);
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

  $$("[data-mail]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      copyText(btn.getAttribute("data-mail"), "邮箱已复制到剪贴板");
    });
  });

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------------- 导航 / 滚动进度 / 回到顶部 ---------------- */
  var nav = $("#nav");
  var menuBtn = $("#menuBtn");
  var navLinks = $("#navLinks");
  var scrollBar = $("#scrollBar");
  var toTopBtn = $("#toTop");

  function onScroll() {
    if (nav) nav.classList.toggle("scrolled", window.scrollY > 12);

    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollBar) {
      scrollBar.style.width = (max > 0 ? Math.min(window.scrollY / max, 1) * 100 : 0) + "%";
    }
    if (toTopBtn) toTopBtn.classList.toggle("show", window.scrollY > 700);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (toTopBtn) {
    toTopBtn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  }

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

  /* ---------------- 数字滚动 ---------------- */
  var statsBox = $("#stats");
  var countersDone = false;

  function runCounters() {
    if (countersDone) return;
    countersDone = true;
    $$(".count", statsBox).forEach(function (el) {
      var target = parseInt(el.getAttribute("data-count"), 10) || 0;
      if (reduceMotion) { el.textContent = String(target); return; }
      var start = performance.now();
      var duration = 1200;
      function step(now) {
        var p = Math.min((now - start) / duration, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = String(Math.round(target * eased));
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  if (statsBox) {
    if ("IntersectionObserver" in window) {
      var statsIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { runCounters(); statsIO.disconnect(); }
        });
      }, { threshold: 0.4 });
      statsIO.observe(statsBox);
    } else {
      runCounters();
    }
  }

  /* ---------------- 导航高亮 ---------------- */
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

  /* ---------------- 打字机 ---------------- */
  var typerEl = $("#typerText");
  if (typerEl) {
    var phrases = ["全栈开发者", "产品设计师", "效率工具控", "独立创造者", "终身学习者"];
    if (reduceMotion) {
      typerEl.textContent = phrases[0];
    } else {
      var phraseIdx = 0, charIdx = 0, deleting = false;
      var typeLoop = function () {
        var word = phrases[phraseIdx];
        if (!deleting) {
          charIdx++;
          typerEl.textContent = word.slice(0, charIdx);
          if (charIdx === word.length) { deleting = true; return setTimeout(typeLoop, 1900); }
          return setTimeout(typeLoop, 95);
        }
        charIdx--;
        typerEl.textContent = word.slice(0, charIdx);
        if (charIdx === 0) {
          deleting = false;
          phraseIdx = (phraseIdx + 1) % phrases.length;
          return setTimeout(typeLoop, 280);
        }
        return setTimeout(typeLoop, 45);
      };
      typeLoop();
    }
  }

  /* ---------------- 鼠标光斑 ---------------- */
  var hero = $("#hero");
  var heroSpot = $(".hero-spot");
  if (hero && heroSpot && !isCoarse) {
    hero.addEventListener("mousemove", function (e) {
      var rect = hero.getBoundingClientRect();
      hero.style.setProperty("--sx", (e.clientX - rect.left) + "px");
      hero.style.setProperty("--sy", (e.clientY - rect.top) + "px");
    });
  }

  /* ---------------- 项目卡片 3D 倾斜 ---------------- */
  if (!isCoarse && !reduceMotion) {
    $$(".project").forEach(function (card) {
      var rect = null;
      card.addEventListener("mouseenter", function () {
        rect = card.getBoundingClientRect();
        card.classList.add("tilting");
      });
      card.addEventListener("mousemove", function (e) {
        if (!rect) return;
        var px = (e.clientX - rect.left) / rect.width;
        var py = (e.clientY - rect.top) / rect.height;
        var rx = (py - 0.5) * -8;
        var ry = (px - 0.5) * 8;
        card.style.transform = "perspective(900px) rotateX(" + rx.toFixed(2) + "deg) rotateY(" + ry.toFixed(2) + "deg) translateY(-5px)";
        card.style.setProperty("--mx", (e.clientX - rect.left) + "px");
        card.style.setProperty("--my", (e.clientY - rect.top) + "px");
      });
      card.addEventListener("mouseleave", function () {
        card.classList.remove("tilting");
        card.style.transform = "";
        rect = null;
      });
    });
  }

  /* ---------------- 音效 / 彩带 ---------------- */
  var audioCtx = null;
  function beep(freq, dur) {
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtx) audioCtx = new Ctx();
      if (audioCtx.state === "suspended") audioCtx.resume();
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, audioCtx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + dur + 0.03);
    } catch (e) {}
  }

  var confettiCanvas = $("#confettiCanvas");
  var cctx = confettiCanvas ? confettiCanvas.getContext("2d") : null;
  var confettiParticles = [];
  var confettiRunning = false;

  function sizeConfetti() {
    if (!confettiCanvas || !cctx) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    confettiCanvas.width = window.innerWidth * dpr;
    confettiCanvas.height = window.innerHeight * dpr;
    cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", sizeConfetti);
  sizeConfetti();

  function confettiFrame() {
    cctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (var i = confettiParticles.length - 1; i >= 0; i--) {
      var p = confettiParticles[i];
      p.vy += p.g;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.995;
      p.rot += p.vr;
      p.life -= 0.006;

      if (p.life <= 0 || p.y > window.innerHeight + 60) {
        confettiParticles.splice(i, 1);
        continue;
      }
      cctx.save();
      cctx.globalAlpha = Math.max(p.life, 0);
      cctx.translate(p.x, p.y);
      cctx.rotate(p.rot);
      cctx.fillStyle = p.color;
      cctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      cctx.restore();
    }
    if (confettiParticles.length) {
      requestAnimationFrame(confettiFrame);
    } else {
      confettiRunning = false;
      cctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  }

  function burstConfetti(count) {
    if (!cctx || reduceMotion) return;
    var colors = ["#7c5cff", "#22d3ee", "#ff5c8a", "#fbbf24", "#34d399"];
    var n = count || 90;
    for (var i = 0; i < n; i++) {
      confettiParticles.push({
        x: window.innerWidth / 2 + (Math.random() - 0.5) * 120,
        y: window.innerHeight * 0.55,
        vx: (Math.random() - 0.5) * 16,
        vy: -Math.random() * 15 - 5,
        g: 0.32 + Math.random() * 0.22,
        size: 5 + Math.random() * 7,
        color: colors[i % colors.length],
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.32,
        life: 1
      });
    }
    if (!confettiRunning) {
      confettiRunning = true;
      requestAnimationFrame(confettiFrame);
    }
  }

  /* ---------------- 矩阵雨彩蛋 ---------------- */
  var matrixCanvas = $("#matrixCanvas");
  var mctx = matrixCanvas ? matrixCanvas.getContext("2d") : null;
  var matrixRAF = null;
  var matrixTimer = null;

  function stopMatrix() {
    cancelAnimationFrame(matrixRAF);
    matrixRAF = null;
    clearTimeout(matrixTimer);
    if (matrixCanvas) matrixCanvas.hidden = true;
  }

  function startMatrix(duration) {
    if (!matrixCanvas || !mctx || reduceMotion) {
      toast("此环境不支持彩蛋动画");
      return;
    }
    matrixCanvas.hidden = false;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    matrixCanvas.width = window.innerWidth * dpr;
    matrixCanvas.height = window.innerHeight * dpr;
    mctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var fontSize = 16;
    var cols = Math.ceil(window.innerWidth / fontSize);
    var drops = [];
    for (var i = 0; i < cols; i++) drops[i] = Math.random() * -80;
    var chars = "アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEF";

    cancelAnimationFrame(matrixRAF);
    function frame() {
      mctx.fillStyle = "rgba(3,5,10,0.16)";
      mctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
      mctx.font = fontSize + "px monospace";
      for (var j = 0; j < cols; j++) {
        var ch = chars.charAt(Math.floor(Math.random() * chars.length));
        var y = drops[j] * fontSize;
        mctx.fillStyle = Math.random() > 0.97 ? "#d9fff7" : "rgba(52,211,153,0.86)";
        mctx.fillText(ch, j * fontSize, y);
        if (y > window.innerHeight && Math.random() > 0.975) drops[j] = 0;
        drops[j] += 1;
      }
      matrixRAF = requestAnimationFrame(frame);
    }
    frame();
    clearTimeout(matrixTimer);
    matrixTimer = setTimeout(stopMatrix, duration || 9000);
  }

  /* ---------------- Tabs ---------------- */
  var tabs = $$(".tab");

  function activateTab(tabId) {
    var target = document.getElementById(tabId);
    if (!target) return;
    tabs.forEach(function (t) {
      t.classList.remove("active");
      t.setAttribute("aria-selected", "false");
      var p = document.getElementById(t.getAttribute("aria-controls"));
      if (p) { p.classList.remove("active"); p.hidden = true; }
    });
    target.classList.add("active");
    target.setAttribute("aria-selected", "true");
    var panel = document.getElementById(target.getAttribute("aria-controls"));
    if (panel) { panel.classList.add("active"); panel.hidden = false; }
  }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () { activateTab(tab.id); });
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
      ring.style.stroke = leftSec <= 60 && leftSec > 0 ? "#ff5c8a" : "var(--accent-2)";
    }
  }

  function stopTimer() {
    running = false;
    clearInterval(tickId);
    tickId = null;
    if (timerStart) timerStart.textContent = "开始";
  }

  function timerFinished() {
    stopTimer();
    renderTimer();
    toast("时间到，休息一下");
    if (timerHint) timerHint.textContent = "本轮完成。休息片刻，再开始下一个番茄钟。";
    beep(880, 0.16);
    setTimeout(function () { beep(1180, 0.24); }, 220);
    burstConfetti(110);
  }

  function tick() {
    leftSec -= 1;
    if (leftSec <= 0) {
      leftSec = 0;
      timerFinished();
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
      beep(660, 0.06);
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
    statRead.textContent = seconds >= 60 ? Math.ceil(seconds / 60) + " 分钟" : seconds + " 秒";
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
      var hue = scheme === "analogous"
        ? (baseHue + (i - 2) * 18 + 360) % 360
        : (baseHue + i * 72) % 360;
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

  /* ---------------- 交互终端 ---------------- */
  var terminal = $("#terminal");
  var termOut = $("#termOutput");
  var termInput = $("#termInput");
  var termHistory = [];
  var histIdx = -1;

  function termPrint(html, cls) {
    if (!termOut) return;
    var p = document.createElement("p");
    if (cls) p.className = cls;
    p.innerHTML = html;
    termOut.appendChild(p);
    while (termOut.children.length > 80) termOut.removeChild(termOut.firstChild);
    var body = termOut.parentNode;
    if (body) body.scrollTop = body.scrollHeight;
  }

  function termHelp() {
    termPrint('<span class="t-c">可用命令：</span>');
    var rows = [
      "help              命令列表",
      "whoami            一句话介绍",
      "projects          项目清单",
      "tools             工具箱说明",
      "theme light|dark  切换主题",
      "email             复制邮箱",
      "matrix            彩蛋",
      "date              当前时间",
      "clear             清屏"
    ];
    rows.forEach(function (r) {
      termPrint('<span class="t-s">' + r + "</span>");
    });
  }

  function runTerm(raw) {
    var parts = raw.split(/\s+/);
    var cmd = (parts[0] || "").toLowerCase();
    var arg = parts.slice(1).join(" ").toLowerCase();

    switch (cmd) {
      case "help":
        termHelp();
        break;
      case "whoami":
      case "about":
        termPrint('<span class="t-v">Eos · 把想法做成产品的全栈开发者，热爱克制的设计与可维护的工程。</span>');
        break;
      case "projects":
        termPrint('<span class="t-c">Atlas 笔记系统 · Pulse 实时看板 · Nomad 行程助手</span>');
        termPrint('<span class="t-c">Echo 播客工坊 · Lumen 设计令牌 · Gate 工作流网关</span>');
        break;
      case "tools":
        termPrint('<span class="t-c">工具箱里可以：专注计时、统计字数、生成配色。</span>');
        break;
      case "theme":
        if (arg === "light" || arg === "dark") {
          setTheme(arg);
          termPrint('<span class="t-v">主题已切换为 ' + arg + "</span>");
        } else {
          termPrint('<span class="t-c">用法：theme light | theme dark</span>');
        }
        break;
      case "email":
        copyText("hello@eos.space", "邮箱已复制到剪贴板");
        termPrint('<span class="t-v">hello@eos.space</span> <span class="t-c">已复制</span>');
        break;
      case "matrix":
        startMatrix(9000);
        termPrint('<span class="t-c">正在唤醒矩阵……</span>');
        break;
      case "date":
        termPrint(new Date().toLocaleString("zh-CN", { hour12: false }));
        break;
      case "ls":
        termPrint("about  skills  projects  toolbox  notes  contact");
        break;
      case "echo":
        termPrint(escapeHtml(raw.slice(5)));
        break;
      case "sudo":
        termPrint('<span class="t-b">你已经是自己人生的 root 了。</span>');
        break;
      case "clear":
        if (termOut) termOut.innerHTML = "";
        break;
      default:
        termPrint('未找到命令 <span class="t-b">' + escapeHtml(cmd) + '</span>，输入 <span class="t-v">help</span> 查看支持的命令。');
    }
  }

  if (termInput) {
    termInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        var raw = termInput.value.trim();
        termInput.value = "";
        if (!raw) return;
        termPrint('<span class="t-p">$</span> ' + escapeHtml(raw));
        termHistory.push(raw);
        histIdx = termHistory.length;
        runTerm(raw);
      } else if (e.key === "ArrowUp") {
        if (histIdx > 0) {
          histIdx--;
          termInput.value = termHistory[histIdx];
        }
        e.preventDefault();
      } else if (e.key === "ArrowDown") {
        if (histIdx < termHistory.length - 1) {
          histIdx++;
          termInput.value = termHistory[histIdx];
        } else {
          histIdx = termHistory.length;
          termInput.value = "";
        }
        e.preventDefault();
      }
    });
  }

  if (terminal) {
    terminal.addEventListener("click", function (e) {
      if (e.target && e.target.tagName !== "INPUT" && termInput) termInput.focus();
    });
  }

  /* ---------------- 命令面板 ---------------- */
  var cmdOverlay = $("#cmdOverlay");
  var cmdInput = $("#cmdInput");
  var cmdList = $("#cmdList");
  var cmdBtn = $("#cmdBtn");
  var cmdOpen = false;
  var cmdIndex = 0;
  var cmdFiltered = [];

  function gotoSection(id) {
    var el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }

  var cmdData = [
    { group: "跳转", label: "关于我", hint: "#about", kw: "about 关于 介绍", run: function () { gotoSection("about"); } },
    { group: "跳转", label: "技能栈", hint: "#skills", kw: "skills 技能 技术", run: function () { gotoSection("skills"); } },
    { group: "跳转", label: "项目作品", hint: "#projects", kw: "projects 项目 作品", run: function () { gotoSection("projects"); } },
    { group: "跳转", label: "工具箱", hint: "#toolbox", kw: "tools 工具 效率", run: function () { gotoSection("toolbox"); } },
    { group: "跳转", label: "随笔文章", hint: "#notes", kw: "notes 文章 博客", run: function () { gotoSection("notes"); } },
    { group: "跳转", label: "联系方式", hint: "#contact", kw: "contact 联系 邮箱", run: function () { gotoSection("contact"); } },

    { group: "项目", label: "Atlas 笔记系统", hint: "知识库", kw: "atlas 笔记 知识库", run: function () { gotoSection("projects"); } },
    { group: "项目", label: "Pulse 实时看板", hint: "数据可视化", kw: "pulse 看板 数据", run: function () { gotoSection("projects"); } },
    { group: "项目", label: "Nomad 行程助手", hint: "移动端", kw: "nomad 行程 旅行", run: function () { gotoSection("projects"); } },
    { group: "项目", label: "Echo 播客工坊", hint: "音频工具", kw: "echo 播客 音频", run: function () { gotoSection("projects"); } },
    { group: "项目", label: "Lumen 设计令牌", hint: "设计系统", kw: "lumen 设计 令牌", run: function () { gotoSection("projects"); } },
    { group: "项目", label: "Gate 工作流网关", hint: "自动化", kw: "gate 工作流 自动化", run: function () { gotoSection("projects"); } },

    { group: "工具", label: "番茄钟", hint: "专注计时", kw: "番茄钟 计时 专注 pomodoro", run: function () { gotoSection("toolbox"); activateTab("tab-timer"); } },
    { group: "工具", label: "字数统计", hint: "文本统计", kw: "字数 统计 文本", run: function () { gotoSection("toolbox"); activateTab("tab-count"); } },
    { group: "工具", label: "配色生成", hint: "随机调色板", kw: "配色 颜色 调色板 color", run: function () { gotoSection("toolbox"); activateTab("tab-palette"); generatePalette(); } },

    { group: "操作", label: "切换深浅主题", hint: "theme", kw: "主题 深色 浅色 theme dark light", run: function () { var t = toggleTheme(); toast("已切换到" + (t === "light" ? "浅色" : "深色") + "主题"); } },
    { group: "操作", label: "复制邮箱地址", hint: "hello@eos.space", kw: "复制 邮箱 email copy", run: function () { copyText("hello@eos.space", "邮箱已复制到剪贴板"); } },
    { group: "操作", label: "生成一套配色", hint: "palette", kw: "生成 配色 palette", run: function () { gotoSection("toolbox"); activateTab("tab-palette"); generatePalette(); toast("已生成新的配色方案"); } },

    { group: "彩蛋", label: "激活矩阵雨", hint: "konami", kw: "彩蛋 矩阵 matrix konami", run: function () { startMatrix(9000); toast("矩阵雨已激活"); } },
    { group: "彩蛋", label: "撒一把彩带", hint: "confetti", kw: "彩带 confetti 庆祝", run: function () { burstConfetti(140); toast("庆祝一下"); } }
  ];

  function renderCmdList() {
    if (!cmdList) return;
    var q = cmdInput.value.trim().toLowerCase();
    cmdFiltered = cmdData.filter(function (it) {
      if (!q) return true;
      return (it.label + " " + it.hint + " " + it.kw + " " + it.group).toLowerCase().indexOf(q) !== -1;
    });
    if (!cmdFiltered.length) {
      cmdList.innerHTML = '<li class="cmd-empty">没有匹配的结果，换个关键词试试</li>';
      return;
    }
    if (cmdIndex >= cmdFiltered.length) cmdIndex = 0;
    cmdList.innerHTML = cmdFiltered.map(function (it, i) {
      return '<li class="cmd-item' + (i === cmdIndex ? " active" : "") + '" data-i="' + i + '" role="option" aria-selected="' + (i === cmdIndex) + '">' +
        '<span class="cmd-ico">' + it.group.charAt(0) + "</span>" +
        '<span class="cmd-label">' + it.label + "</span>" +
        '<span class="cmd-hint">' + it.hint + "</span></li>";
    }).join("");
  }

  function openCmd() {
    if (!cmdOverlay) return;
    cmdOpen = true;
    cmdOverlay.hidden = false;
    document.body.classList.add("cmd-open");
    if (cmdInput) cmdInput.value = "";
    cmdIndex = 0;
    renderCmdList();
    setTimeout(function () { if (cmdInput) cmdInput.focus(); }, 40);
  }

  function closeCmd() {
    if (!cmdOverlay) return;
    cmdOpen = false;
    cmdOverlay.hidden = true;
    document.body.classList.remove("cmd-open");
  }

  function runCmdItem(i) {
    var item = cmdFiltered[i];
    if (!item) return;
    closeCmd();
    setTimeout(item.run, 60);
  }

  if (cmdBtn) cmdBtn.addEventListener("click", openCmd);
  if (cmdOverlay) {
    cmdOverlay.addEventListener("click", function (e) {
      if (e.target === cmdOverlay) closeCmd();
    });
  }
  if (cmdInput) {
    cmdInput.addEventListener("input", function () {
      cmdIndex = 0;
      renderCmdList();
    });
    cmdInput.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") {
        cmdIndex = Math.min(cmdIndex + 1, cmdFiltered.length - 1);
        renderCmdList();
        e.preventDefault();
      } else if (e.key === "ArrowUp") {
        cmdIndex = Math.max(cmdIndex - 1, 0);
        renderCmdList();
        e.preventDefault();
      } else if (e.key === "Enter") {
        runCmdItem(cmdIndex);
        e.preventDefault();
      } else if (e.key === "Escape") {
        closeCmd();
      }
    });
  }
  if (cmdList) {
    cmdList.addEventListener("click", function (e) {
      var item = e.target.closest(".cmd-item");
      if (!item) return;
      runCmdItem(parseInt(item.getAttribute("data-i"), 10));
    });
    cmdList.addEventListener("mousemove", function (e) {
      var item = e.target.closest(".cmd-item");
      if (!item) return;
      var i = parseInt(item.getAttribute("data-i"), 10);
      if (i !== cmdIndex) { cmdIndex = i; renderCmdList(); }
    });
  }

  /* ---------------- 全局快捷键 ---------------- */
  document.addEventListener("keydown", function (e) {
    var key = (e.key || "").toLowerCase();
    if ((e.metaKey || e.ctrlKey) && key === "k") {
      e.preventDefault();
      if (cmdOpen) closeCmd(); else openCmd();
      return;
    }
    if (e.key === "Escape") {
      if (cmdOpen) closeCmd();
      if (matrixCanvas && !matrixCanvas.hidden) stopMatrix();
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.code !== "Space") return;
    var tag = (document.activeElement && document.activeElement.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "BUTTON" || cmdOpen) return;
    if (activeTabId() !== "tab-palette") return;
    e.preventDefault();
    generatePalette();
  });

  /* ---------------- 彩蛋：科乐美秘技 ---------------- */
  var konami = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  var konamiPos = 0;
  document.addEventListener("keydown", function (e) {
    var key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (key === konami[konamiPos]) {
      konamiPos++;
      if (konamiPos === konami.length) {
        konamiPos = 0;
        startMatrix(10000);
        burstConfetti(150);
        toast("秘技已激活：欢迎来到矩阵");
      }
    } else {
      konamiPos = key === konami[0] ? 1 : 0;
    }
  });

  /* ---------------- 页脚时钟 ---------------- */
  var clockEl = $("#clock");
  var timeFmt = null;
  try {
    timeFmt = new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  } catch (e) {}

  function updateClock() {
    if (!clockEl) return;
    var now = new Date();
    clockEl.textContent = timeFmt ? timeFmt.format(now) : now.toLocaleTimeString("zh-CN", { hour12: false });
  }
  updateClock();
  setInterval(updateClock, 1000);

  /* ---------------- 页脚年份 ---------------- */
  var yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
