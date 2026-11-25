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
      "planet            提瓦特星球",
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
      case "planet":
        termPrint('<span class="t-v">提瓦特星球已就绪</span> <span class="t-c">拖拽旋转，滚轮或双指可一路推到地表。</span>');
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
        termPrint("about  skills  projects  planet  toolbox  notes  contact");
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
    { group: "跳转", label: "提瓦特星球", hint: "#planet", kw: "planet 星球 提瓦特 原神 3d", run: function () { gotoSection("planet"); } },
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

/* ============================================================
   提瓦特星球 · 程序化 WebGL
   ============================================================ */
(function () {
  "use strict";

  var stage = document.getElementById("planetStage");
  var canvas = document.getElementById("planetCanvas");
  if (!stage || !canvas) return;

  var starCanvas = document.getElementById("planetStars");
  var starCtx = starCanvas ? starCanvas.getContext("2d") : null;
  var labelsEl = document.getElementById("planetLabels");
  var loadingEl = document.getElementById("planetLoading");
  var fallbackEl = document.getElementById("planetFallback");
  var hintEl = document.getElementById("planetHint");
  var altEl = document.getElementById("planetAlt");
  var zoomEl = document.getElementById("planetZoom");
  var spinBtn = document.getElementById("planetSpin");
  var tagsBtn = document.getElementById("planetTags");
  var resetBtn = document.getElementById("planetReset");
  var fullBtn = document.getElementById("planetFull");
  var zoomInBtn = document.getElementById("planetZoomIn");
  var zoomOutBtn = document.getElementById("planetZoomOut");

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var WORLD_W = 2048, WORLD_H = 1024;
  var MASK_W = 1024, MASK_H = 512;
  var CLOUD_W = 1024, CLOUD_H = 512;
  var LEVEL = 0.535;
  var MIN_DIST = 1.02, MAX_DIST = 3.45, START_T = 0.26;
  var FOV = Math.PI * 50 / 180;

  /* 提瓦特贴图与球面的经纬度换算。
     贴图范围来自观测枢 tiles 拼合后的裁剪框；与球面之间做了水平 + 垂直翻转，
     保证「东（稻妻）在球的右侧、北（至冬）在上方」符合真实地理朝向。 */
  var MAP_GEO = { lonMin: -10, lonSpan: 145, latTop: 62, latBot: -38 };
  function mercYOf(latDeg) {
    var la = latDeg * Math.PI / 180;
    return 0.5 - Math.log(Math.tan(Math.PI / 4 + la / 2)) / (2 * Math.PI);
  }
  var MERC_TOP = mercYOf(MAP_GEO.latTop);
  var MERC_BOT = mercYOf(MAP_GEO.latBot);

  // 地图 UV(0..1) → 球面经纬度（与 shader 采样完全互为逆运算）
  function mapUvToGeo(mu, mv) {
    var mer = MERC_BOT + (1 - mv) * (MERC_TOP - MERC_BOT);
    var lat = (2 * Math.atan(Math.exp((0.5 - mer) * 2 * Math.PI)) - Math.PI / 2) * 180 / Math.PI;
    return { lon: (1 - mu) * MAP_GEO.lonSpan + MAP_GEO.lonMin, lat: lat };
  }

  // 七国在图上的位置：由观测枢对应「神瞳」点位的坐标中位数换算而来
  var NATIONS = [
    { name: "蒙德", sub: "风与自由", mu: 0.7926, mv: 0.4943, color: "#7fbf5f",
      pal: [[104, 158, 82], [158, 190, 120], [126, 132, 118], [214, 208, 158]] },
    { name: "璃月", sub: "岩与契约", mu: 0.7260, mv: 0.5800, color: "#d9b168",
      pal: [[176, 138, 78], [214, 178, 112], [124, 100, 70], [226, 204, 152]] },
    { name: "稻妻", sub: "雷与永恒", mu: 0.9106, mv: 0.8407, color: "#b07fd8",
      pal: [[142, 104, 180], [190, 150, 214], [104, 82, 128], [224, 190, 232]] },
    { name: "须弥", sub: "草与智慧", mu: 0.5337, mv: 0.6845, color: "#4fae7a",
      pal: [[74, 150, 106], [120, 190, 144], [86, 110, 86], [176, 214, 164]] },
    { name: "枫丹", sub: "水与正义", mu: 0.5525, mv: 0.4247, color: "#6fb8d8",
      pal: [[88, 158, 190], [150, 204, 224], [96, 116, 128], [196, 232, 242]] },
    { name: "纳塔", sub: "火与战争", mu: 0.2846, mv: 0.7159, color: "#d86a4a",
      pal: [[188, 84, 60], [224, 140, 86], [112, 62, 54], [230, 168, 118]] },
    { name: "至冬", sub: "冰与不屈", mu: 0.4523, mv: 0.0952, color: "#cfe6f5",
      pal: [[176, 206, 222], [222, 240, 250], [142, 166, 184], [236, 246, 255]] }
  ].map(function (n) {
    var g = mapUvToGeo(n.mu, n.mv);
    n.lon = g.lon;
    n.lat = g.lat;
    return n;
  });

  var anchors = NATIONS.map(function (n) {
    var la = n.lat * Math.PI / 180;
    var lo = n.lon * Math.PI / 180;
    var cl = Math.cos(la);
    return { x: -cl * Math.cos(lo), y: Math.sin(la), z: -cl * Math.sin(lo), nation: n };
  });

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smoothstep(a, b, x) {
    var t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function hash2(x, y, seed) {
    var h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  function vnoise(x, y, period, seed) {
    var xi = Math.floor(x), yi = Math.floor(y);
    var xf = x - xi, yf = y - yi;
    xf = xf * xf * (3 - 2 * xf);
    yf = yf * yf * (3 - 2 * yf);
    var x0 = xi % period; if (x0 < 0) x0 += period;
    var x1 = (xi + 1) % period; if (x1 < 0) x1 += period;
    var a = hash2(x0, yi, seed);
    var b = hash2(x1, yi, seed);
    var c = hash2(x0, yi + 1, seed);
    var d = hash2(x1, yi + 1, seed);
    var top = a + (b - a) * xf;
    var bot = c + (d - c) * xf;
    return top + (bot - top) * yf;
  }

  function fbm(x, y, period, oct, seed) {
    var sum = 0, amp = 0.5, norm = 0, px = x, py = y, pp = period;
    for (var i = 0; i < oct; i++) {
      sum += amp * vnoise(px, py, pp, seed + i * 37);
      norm += amp;
      amp *= 0.5;
      px *= 2;
      py *= 2;
      pp *= 2;
    }
    return sum / norm;
  }

  var albedoCanvas = document.createElement("canvas");
  albedoCanvas.width = WORLD_W;
  albedoCanvas.height = WORLD_H;
  var albedoCtx = albedoCanvas.getContext("2d");

  var maskCanvas = document.createElement("canvas");
  maskCanvas.width = MASK_W;
  maskCanvas.height = MASK_H;
  var maskCtx = maskCanvas.getContext("2d");

  var cloudCanvas = document.createElement("canvas");
  cloudCanvas.width = CLOUD_W;
  cloudCanvas.height = CLOUD_H;
  var cloudCtx = cloudCanvas.getContext("2d");

  function buildWorld(done) {
    var albedoImg = albedoCtx.createImageData(WORLD_W, WORLD_H);
    var maskImg = maskCtx.createImageData(MASK_W, MASK_H);
    var ad = albedoImg.data, md = maskImg.data;
    var row = 0;

    function step() {
      var end = Math.min(WORLD_H, row + 24);
      for (; row < end; row++) {
        var v = (row + 0.5) / WORLD_H;
        var lat = Math.PI / 2 - v * Math.PI;
        var clat = Math.cos(lat), slat = Math.sin(lat);
        var absLat = Math.abs(lat);
        var ny = v * 3.2;

        for (var x = 0; x < WORLD_W; x++) {
          var u = (x + 0.5) / WORLD_W;
          var lon = u * Math.PI * 2 - Math.PI;
          var px = -clat * Math.cos(lon);
          var py = slat;
          var pz = -clat * Math.sin(lon);
          var nx = u * 6.0;

          var base = fbm(nx, ny, 6, 4, 17);
          var h = (base - 0.5) * 1.3 + 0.5;
          var detail = fbm(nx * 13.0 + 3.3, ny * 13.0 + 9.1, 78, 3, 91);

          var dmax = -2, ni = 0;
          for (var i = 0; i < anchors.length; i++) {
            var an = anchors[i];
            var dd = px * an.x + py * an.y + pz * an.z;
            if (dd > dmax) { dmax = dd; ni = i; }
          }

          var lev = LEVEL + (detail - 0.5) * 0.03;
          var iceN = fbm(nx * 9.0 + 17.0, ny * 9.0 + 1.6, 54, 2, 509);
          var ice = smoothstep(1.01, 1.23, absLat + (iceN - 0.5) * 0.14);

          var isWater = h <= lev;
          if (!isWater && ice < 0.5 && detail > 0.745 && h < lev + 0.055) isWater = true;
          var oceanFlag = (isWater && ice < 0.45) ? 1 : 0;

          var r, g, b;
          if (isWater) {
            var depth = clamp((lev - h) / 0.15, 0, 1);
            var wv = (detail - 0.5) * 11;
            r = lerp(70, 14, depth) + wv * 0.5;
            g = lerp(150, 40, depth) + wv * 0.8;
            b = lerp(176, 82, depth) + wv;
          } else {
            var elev = clamp((h - lev) / 0.32, 0, 1);
            var arid = smoothstep(0.16, 0.46, absLat) * (1 - smoothstep(0.62, 0.90, absLat));
            var dryK = clamp(arid * 0.85 + elev * 0.25, 0, 1);
            r = lerp(92, 172, dryK);
            g = lerp(126, 150, dryK);
            b = lerp(72, 104, dryK);

            var ridge = 1 - Math.abs(fbm(nx * 8.5 + 2.4, ny * 8.5 + 7.7, 51, 2, 137) * 2 - 1);
            var mtn = clamp((ridge - 0.52) / 0.34, 0, 1) * (0.15 + 0.85 * elev);
            r = lerp(r, 118, mtn * 0.85);
            g = lerp(g, 112, mtn * 0.85);
            b = lerp(b, 104, mtn * 0.85);

            var snow = clamp((elev - 0.74) / 0.20, 0, 1) * clamp((absLat - 0.32) / 0.7, 0, 1);
            snow = Math.max(snow, mtn * 0.22);
            r = lerp(r, 240, snow);
            g = lerp(g, 246, snow);
            b = lerp(b, 255, snow);

            if (elev < 0.12) {
              var ck = (0.12 - elev) / 0.12 * 0.5;
              r = lerp(r, 206, ck);
              g = lerp(g, 192, ck);
              b = lerp(b, 152, ck);
            }

            var nw = smoothstep(0.93, 0.997, dmax) * 0.42;
            var pal = anchors[ni].nation.pal;
            r = lerp(r, pal[0][0], nw);
            g = lerp(g, pal[0][1], nw);
            b = lerp(b, pal[0][2], nw);

            var grain = (detail - 0.5) * 22;
            r += grain; g += grain * 0.9; b += grain * 0.8;
          }

          if (ice > 0.001) {
            var ik = ice * 0.92;
            r = lerp(r, 232, ik);
            g = lerp(g, 242, ik);
            b = lerp(b, 252, ik);
          }

          var p = (row * WORLD_W + x) * 4;
          ad[p] = r; ad[p + 1] = g; ad[p + 2] = b; ad[p + 3] = 255;

          if ((x & 1) === 0 && (row & 1) === 0) {
            var mi = ((row >> 1) * MASK_W + (x >> 1)) * 4;
            var mh = isWater ? 0 : clamp((h - lev) / 0.32, 0, 1);
            var city = 0;
            if (!isWater && ice < 0.4 && absLat < 1.15) {
              city = smoothstep(0.60, 0.76, detail) * (1 - smoothstep(0.45, 0.85, (h - lev) / 0.3)) * 255;
            }
            md[mi] = oceanFlag * 255;
            md[mi + 1] = mh * 255;
            md[mi + 2] = city;
            md[mi + 3] = 255;
          }
        }
      }
      if (row < WORLD_H) {
        setTimeout(step, 0);
      } else {
        albedoCtx.putImageData(albedoImg, 0, 0);
        maskCtx.putImageData(maskImg, 0, 0);
        buildClouds();
        done();
      }
    }
    setTimeout(step, 0);
  }

  function buildClouds() {
    var img = cloudCtx.createImageData(CLOUD_W, CLOUD_H);
    var d = img.data;
    for (var y = 0; y < CLOUD_H; y++) {
      var v = (y + 0.5) / CLOUD_H;
      var lat = Math.PI / 2 - v * Math.PI;
      for (var x = 0; x < CLOUD_W; x++) {
        var u = (x + 0.5) / CLOUD_W;
        var swirl = fbm(u * 8.0 + 3.1, v * 4.6 + 1.7, 8, 4, 777);
        var c = fbm(u * 26.0 + swirl * 2.2 + 11.0, v * 15.0 + swirl * 1.3, 26, 5, 201);
        var c2 = fbm(u * 62.0 + swirl * 3.0 + 4.0, v * 35.0 + swirl * 1.8, 62, 3, 331);
        c = c * 0.65 + c2 * 0.35;
        c *= 0.92 + 0.08 * Math.cos(lat * 5.0);
        var a = smoothstep(0.50, 0.78, c);
        var p = (y * CLOUD_W + x) * 4;
        d[p] = 255; d[p + 1] = 255; d[p + 2] = 255;
        d[p + 3] = Math.round(a * 225);
      }
    }
    cloudCtx.putImageData(img, 0, 0);
  }

  function drawStars(w, h, dpr) {
    if (!starCtx) return;
    var cw = Math.max(1, Math.round(w * dpr));
    var ch = Math.max(1, Math.round(h * dpr));
    starCanvas.width = cw;
    starCanvas.height = ch;
    starCtx.clearRect(0, 0, cw, ch);

    var count = Math.round((cw * ch) / 9000);
    for (var i = 0; i < count; i++) {
      var x = Math.random() * cw;
      var y = Math.random() * ch;
      var r = (Math.random() * Math.random() * 1.5 + 0.35) * dpr;
      var a = 0.25 + Math.random() * 0.7;
      var warm = Math.random();
      var col = warm > 0.82 ? "255,215,180" : (warm < 0.18 ? "180,220,255" : "235,240,255");
      starCtx.beginPath();
      starCtx.fillStyle = "rgba(" + col + "," + a.toFixed(2) + ")";
      starCtx.arc(x, y, r, 0, Math.PI * 2);
      starCtx.fill();
    }
    for (var j = 0; j < 12; j++) {
      var gx = Math.random() * cw, gy = Math.random() * ch;
      var gr = (1.6 + Math.random() * 1.8) * dpr;
      var grad = starCtx.createRadialGradient(gx, gy, 0, gx, gy, gr * 4);
      grad.addColorStop(0, "rgba(225,238,255,0.95)");
      grad.addColorStop(0.35, "rgba(150,190,255,0.22)");
      grad.addColorStop(1, "rgba(150,190,255,0)");
      starCtx.fillStyle = grad;
      starCtx.beginPath();
      starCtx.arc(gx, gy, gr * 4, 0, Math.PI * 2);
      starCtx.fill();
    }
  }

  function distFromT(t) {
    return MAX_DIST * Math.pow(MIN_DIST / MAX_DIST, t);
  }
  function tFromDist(d) {
    return clamp(Math.log(d / MAX_DIST) / Math.log(MIN_DIST / MAX_DIST), 0, 1);
  }

  var gl = null;
  var planetProg = null, cloudProg = null;
  var sphere = null;
  var albedoTex = null, maskTex = null, cloudTex = null;
  var teyvatAlbedoTex = null, teyvatMaskTex = null;
  var proj = null;
  var dist = distFromT(START_T), targetDist = dist;
  var yaw = 2.02, pitch = -0.566, vyaw = 0, vpitch = 0;
  var orbit = quaternionFromYawPitch(yaw, pitch);
  var autoSpin = true, showTags = true;
  var ready = false, running = false, started = false;
  var cloudSpin = 0, lastFrame = 0;
  var viewW = 1, viewH = 1;
  var LIGHT = [-0.42, 0.34, 0.84];

  function quaternionFromYawPitch(y, p) {
    var cy = Math.cos(y * 0.5), sy = Math.sin(y * 0.5);
    var cp = Math.cos(p * 0.5), sp = Math.sin(p * 0.5);
    return { x: cy * sp, y: sy * cp, z: -sy * sp, w: cy * cp };
  }

  // 相机空间轨迹球：拖拽方向始终对应当前屏幕，不存在俯仰角上限或万向节锁。
  function rotateOrbit(horizontal, vertical) {
    var angle = Math.sqrt(horizontal * horizontal + vertical * vertical);
    if (angle < 0.000001) return;
    var s = Math.sin(angle * 0.5) / angle;
    var dx = vertical * s, dy = horizontal * s;
    var dw = Math.cos(angle * 0.5);
    var x = orbit.x, y = orbit.y, z = orbit.z, w = orbit.w;
    orbit.x = dw * x + dx * w + dy * z;
    orbit.y = dw * y - dx * z + dy * w;
    orbit.z = dw * z + dx * y - dy * x;
    orbit.w = dw * w - dx * x - dy * y;
    var len = Math.sqrt(orbit.x * orbit.x + orbit.y * orbit.y + orbit.z * orbit.z + orbit.w * orbit.w) || 1;
    orbit.x /= len;
    orbit.y /= len;
    orbit.z /= len;
    orbit.w /= len;
  }

  function orbitMatrix(q, extraYaw) {
    var x = q.x, y = q.y, z = q.z, w = q.w;
    if (extraYaw) {
      var s = Math.sin(extraYaw * 0.5), c = Math.cos(extraYaw * 0.5);
      var ox = x, oy = y, oz = z, ow = w;
      x = c * ox + s * oz;
      y = c * oy + s * ow;
      z = c * oz - s * ox;
      w = c * ow - s * oy;
    }
    var xx = x * x, yy = y * y, zz = z * z;
    var xy = x * y, xz = x * z, yz = y * z;
    var wx = w * x, wy = w * y, wz = w * z;
    return new Float32Array([
      1 - 2 * (yy + zz), 2 * (xy + wz), 2 * (xz - wy),
      2 * (xy - wz), 1 - 2 * (xx + zz), 2 * (yz + wx),
      2 * (xz + wy), 2 * (yz - wx), 1 - 2 * (xx + yy)
    ]);
  }

  var VS = [
    "attribute vec3 aPos;",
    "attribute vec2 aUv;",
    "uniform mat3 uRot;",
    "uniform mat4 uProj;",
    "uniform float uDist;",
    "uniform float uScale;",
    "varying vec2 vUv;",
    "varying vec3 vNormal;",
    "varying vec3 vView;",
    "void main() {",
    "  vec3 p = uRot * (aPos * uScale);",
    "  vNormal = uRot * aPos;",
    "  vUv = aUv;",
    "  vView = normalize(vec3(0.0, 0.0, uDist) - p);",
    "  gl_Position = uProj * vec4(p.xy, p.z - uDist, 1.0);",
    "}"
  ].join("\n");

  var PLANET_FS = [
    "#ifdef GL_FRAGMENT_PRECISION_HIGH",
    "precision highp float;",
    "#else",
    "precision mediump float;",
    "#endif",
    "varying vec2 vUv;",
    "varying vec3 vNormal;",
    "varying vec3 vView;",
    "uniform sampler2D uTex;",
    "uniform sampler2D uMask;",
    "uniform sampler2D uTeyvatTex;",
    "uniform sampler2D uTeyvatMaskTex;",
    "uniform vec3 uLight;",
    "uniform float uDetail;",
    "uniform float uTeyvatEnabled;",
    "",
    "vec2 projectMercator(float lonRad, float latRad) {",
    "  float x = lonRad / 6.283185307 + 0.5;",
    "  float y = 0.5 - log(tan(1.570796327 + latRad * 0.5)) / 12.566370614;",
    "  return vec2(x, y);",
    "}",
    "",
    "float hash(vec2 p) {",
    "  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);",
    "}",
    "float vnoise(vec2 p) {",
    "  vec2 i = floor(p);",
    "  vec2 f = fract(p);",
    "  f = f * f * (3.0 - 2.0 * f);",
    "  float a = hash(i);",
    "  float b = hash(i + vec2(1.0, 0.0));",
    "  float c = hash(i + vec2(0.0, 1.0));",
    "  float d = hash(i + vec2(1.0, 1.0));",
    "  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);",
    "}",
    "float fbm(vec2 p) {",
    "  return 0.52 * vnoise(p) + 0.28 * vnoise(p * 2.03) + 0.14 * vnoise(p * 4.01) + 0.06 * vnoise(p * 8.05);",
    "}",
    "float detailH(vec2 uv) {",
    "  return fbm(uv * vec2(1150.0, 575.0)) * 0.62 + fbm(uv * vec2(360.0, 180.0)) * 0.38;",
    "}",
    "",
    "void main() {",
    "  vec3 N = normalize(vNormal);",
    "  vec3 V = normalize(vView);",
    "  vec3 T = cross(vec3(0.0, 1.0, 0.0), N);",
    "  if (length(T) < 0.001) T = vec3(1.0, 0.0, 0.0);",
    "  T = normalize(T);",
    "  vec3 B = cross(N, T);",
    "",
    "  vec4 mask = texture2D(uMask, vUv);",
    "  float ocean = step(0.5, mask.r);",
    "  vec2 texel = vec2(1.0 / 1024.0, 1.0 / 512.0);",
    "  float h0 = mask.g;",
    "  float hx = texture2D(uMask, vUv + vec2(texel.x * 1.5, 0.0)).g;",
    "  float hy = texture2D(uMask, vUv + vec2(0.0, texel.y * 1.5)).g;",
    "  float amp = 2.0 + uDetail * 12.0;",
    "  vec3 Nb = normalize(N - (hx - h0) * amp * T - (hy - h0) * amp * B);",
    "",
    "  float e = 0.0006;",
    "  float d0 = detailH(vUv);",
    "  float dx = detailH(vUv + vec2(e, 0.0));",
    "  float dy = detailH(vUv + vec2(0.0, e));",
    "  float damp = uDetail * 0.75;",
    "  Nb = normalize(Nb - (dx - d0) * damp * T - (dy - d0) * damp * B);",
    "",
    "  vec3 albedo = texture2D(uTex, vUv).rgb;",
    "  float fine = fbm(vUv * vec2(16000.0, 8000.0));",
    "  float micro = fbm(vUv * vec2(42000.0, 21000.0));",
    "  float patch = fbm(vUv * vec2(2200.0, 1100.0));",
    "  float weed = smoothstep(0.42, 0.62, patch) * (1.0 - ocean) * uDetail;",
    "  albedo = mix(albedo, albedo * vec3(0.78, 1.04, 0.72), weed * 0.55);",
    "  albedo *= 0.86 + 0.28 * d0 * uDetail;",
    "  albedo *= 0.93 + 0.14 * fine * uDetail;",
    "  albedo *= 0.96 + 0.08 * micro * uDetail;",
    "  albedo += ocean * vec3(0.02, 0.05, 0.07) * (fine - 0.5) * uDetail;",
    "",
    "  // === 真实提瓦特地图像素化覆盖 ===",
    "  float mapMask = 0.0;",
    "  if (uTeyvatEnabled > 0.5) {",
    "    // 球面 UV → 经纬度（等距圆柱）",
    "    float lonRad = vUv.x * 6.283185307 - 3.141592653;",
    "    float latRad = 1.570796327 - vUv.y * 3.141592653;",
    "    float lonDeg = lonRad * 57.29577951;",
    "    float latDeg = latRad * 57.29577951;",
    "",
    "    // 提瓦特地图经纬度范围（手工拟合自观测枢 tiles）",
    "    // 左下 ≈ (-10°W, -38°S), 右上 ≈ (+135°E, +62°N)",
    "    // 水平翻转：贴图东侧（稻妻）落在球面右侧，符合从外侧看地球的方向",
    "    float tlx = 1.0 - (lonDeg - (-10.0)) / (135.0 - (-10.0));",
    "    float tly = (latDeg - (-38.0)) / (62.0 - (-38.0));",
    "",
    "    // Web Mercator 纬度校正（更贴合观测枢的投影）",
    "    float latN = clamp(latDeg * 0.01745329251, -1.484, 1.484);",
    "    float mercY = 0.5 - log(tan(0.7853981634 + latN * 0.5)) / 6.283185307;",
    "    float mercYTop = 0.5 - log(tan(0.7853981634 + radians(62.0) * 0.5)) / 6.283185307;",
    "    float mercYBot = 0.5 - log(tan(0.7853981634 + radians(-38.0) * 0.5)) / 6.283185307;",
    "    // 垂直翻转：贴图第 0 行是北方，映射到球面高纬度",
    "    tly = 1.0 - clamp((mercY - mercYBot) / (mercYTop - mercYBot), 0.0, 1.0);",
    "    tlx = clamp(tlx, 0.0, 1.0);",
    "",
    "    bool inMap = (tlx > -0.02 && tlx < 1.02 && tly > -0.02 && tly < 1.02);",
    "    if (inMap) {",
    "      vec4 tAlbedo = texture2D(uTeyvatTex, vec2(tlx, tly));",
    "      float tMask = texture2D(uTeyvatMaskTex, vec2(tlx, tly)).r;",
    "      // 边缘软混合，避免硬切",
    "      float edge = smoothstep(0.0, 0.02, tlx) * smoothstep(0.0, 0.02, 1.0 - tlx) *",
    "                   smoothstep(0.0, 0.02, tly) * smoothstep(0.0, 0.02, 1.0 - tly);",
    "      // 地图之外统一按深海处理，和真实海洋无缝衔接",
    "      vec3 mapCol = tAlbedo.rgb * (0.92 + 0.16 * fine);",
    "      vec3 seaCol = vec3(0.028, 0.075, 0.175);",
    "      albedo = mix(seaCol, mapCol, edge);",
    "      ocean = mix(1.0, 1.0 - tMask, edge);",
    "      mapMask = edge;",
    "    }",
    "  }",
    "",
    "  float ndl = max(dot(Nb, uLight), 0.0);",
    "  float ndlSoft = dot(Nb, uLight) * 0.5 + 0.5;",
    "  vec3 halfDir = normalize(uLight + V);",
    "  float spec = pow(max(dot(Nb, halfDir), 0.0), 64.0) * ocean * 0.20;",
    "  spec += pow(max(dot(Nb, halfDir), 0.0), 12.0) * ocean * 0.05;",
    "  spec += pow(max(dot(Nb, halfDir), 0.0), 140.0) * ocean * (0.06 + uDetail * 0.20);",
    "",
    "  vec3 col = albedo * (0.13 + 1.06 * ndl);",
    "  spec *= 1.0 - 0.75 * mapMask;",
    "  col += vec3(1.0, 0.96, 0.88) * spec;",
    "  // 真实地图区域减少大气雾感，避免糊成一片",
    "  col += albedo * vec3(0.03, 0.05, 0.10) * (1.0 - ndlSoft) * (1.0 - 0.9 * mapMask);",
    "",
    "  float night = smoothstep(0.18, 0.0, ndl);",
    "  float cityNoise = smoothstep(0.55, 0.8, fbm(vUv * vec2(1500.0, 750.0)));",
    "  col += vec3(1.0, 0.72, 0.38) * mask.b * cityNoise * night * 0.9;",
    "",
    "  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);",
    "  col += vec3(0.32, 0.55, 1.0) * fres * (0.45 + 0.55 * ndlSoft) * 0.9 * (1.0 - 0.5 * mapMask);",
    "",
    "  gl_FragColor = vec4(col, 1.0);",
    "}"
  ].join("\n");

  var CLOUD_FS = [
    "#ifdef GL_FRAGMENT_PRECISION_HIGH",
    "precision highp float;",
    "#else",
    "precision mediump float;",
    "#endif",
    "varying vec2 vUv;",
    "varying vec3 vNormal;",
    "varying vec3 vView;",
    "uniform sampler2D uClouds;",
    "uniform vec3 uLight;",
    "uniform float uOpacity;",
    "void main() {",
    "  vec4 c = texture2D(uClouds, vUv);",
    "  if (c.a < 0.004) discard;",
    "  vec3 N = normalize(vNormal);",
    "  vec3 V = normalize(vView);",
    "  float ndl = max(dot(N, uLight), 0.0);",
    "  float rim = pow(1.0 - max(dot(N, V), 0.0), 2.0);",
    "  vec3 col = mix(vec3(0.26, 0.33, 0.46), vec3(1.0, 0.99, 0.97), ndl);",
    "  col += vec3(0.45, 0.72, 1.0) * rim * 0.3;",
    "  gl_FragColor = vec4(col, c.a * (0.18 + 0.82 * ndl) * uOpacity);",
    "}"
  ].join("\n");

  function compileShader(type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(sh) || "shader compile failed");
    }
    return sh;
  }

  function makeProgram(fsSrc) {
    var p = gl.createProgram();
    gl.attachShader(p, compileShader(gl.VERTEX_SHADER, VS));
    gl.attachShader(p, compileShader(gl.FRAGMENT_SHADER, fsSrc));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(p) || "program link failed");
    }
    return {
      prog: p,
      aPos: gl.getAttribLocation(p, "aPos"),
      aUv: gl.getAttribLocation(p, "aUv"),
      uRot: gl.getUniformLocation(p, "uRot"),
      uProj: gl.getUniformLocation(p, "uProj"),
      uDist: gl.getUniformLocation(p, "uDist"),
      uScale: gl.getUniformLocation(p, "uScale"),
      uLight: gl.getUniformLocation(p, "uLight"),
      uDetail: gl.getUniformLocation(p, "uDetail"),
      uOpacity: gl.getUniformLocation(p, "uOpacity"),
      uTex: gl.getUniformLocation(p, "uTex"),
      uMask: gl.getUniformLocation(p, "uMask"),
      uClouds: gl.getUniformLocation(p, "uClouds"),
      uTeyvatTex: gl.getUniformLocation(p, "uTeyvatTex"),
      uTeyvatMaskTex: gl.getUniformLocation(p, "uTeyvatMaskTex"),
      uTeyvatEnabled: gl.getUniformLocation(p, "uTeyvatEnabled")
    };
  }

  function makeSphere(stacks, slices) {
    var pos = [], uv = [], idx = [];
    for (var iy = 0; iy <= stacks; iy++) {
      var v = iy / stacks;
      var theta = v * Math.PI;
      var st = Math.sin(theta), ct = Math.cos(theta);
      for (var ix = 0; ix <= slices; ix++) {
        var u = ix / slices;
        var phi = u * Math.PI * 2;
        pos.push(st * Math.cos(phi), ct, st * Math.sin(phi));
        uv.push(u, v);
      }
    }
    for (iy = 0; iy < stacks; iy++) {
      for (ix = 0; ix < slices; ix++) {
        var a = iy * (slices + 1) + ix;
        var b = a + 1;
        var c = a + slices + 1;
        var d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    }
    var posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.STATIC_DRAW);
    var uvBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uv), gl.STATIC_DRAW);
    var idxBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
    return { pos: posBuf, uv: uvBuf, idx: idxBuf, count: idx.length };
  }

  function uploadTexture(source) {
    var t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.generateMipmap(gl.TEXTURE_2D);
    return t;
  }

  function perspective(fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2);
    var nf = 1 / (near - far);
    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) * nf, -1,
      0, 0, 2 * far * near * nf, 0
    ]);
  }

  function resize() {
    var rect = stage.getBoundingClientRect();
    viewW = Math.max(1, Math.round(rect.width));
    viewH = Math.max(1, Math.round(rect.height));
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var cw = Math.round(viewW * dpr), ch = Math.round(viewH * dpr);
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }
    if (gl) {
      gl.viewport(0, 0, cw, ch);
      proj = perspective(FOV, viewW / viewH, 0.005, 16);
    }
    drawStars(viewW, viewH, dpr);
  }

  function draw() {
    if (!gl || !ready) return;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.BLEND);
    gl.disable(gl.CULL_FACE);

    var rot = orbitMatrix(orbit);

    gl.useProgram(planetProg.prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, sphere.pos);
    gl.enableVertexAttribArray(planetProg.aPos);
    gl.vertexAttribPointer(planetProg.aPos, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, sphere.uv);
    gl.enableVertexAttribArray(planetProg.aUv);
    gl.vertexAttribPointer(planetProg.aUv, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphere.idx);

    gl.uniformMatrix3fv(planetProg.uRot, false, rot);
    gl.uniformMatrix4fv(planetProg.uProj, false, proj);
    gl.uniform1f(planetProg.uDist, dist);
    gl.uniform1f(planetProg.uScale, 1);
    gl.uniform1f(planetProg.uDetail, smoothstep(2.4, 1.12, dist));
    gl.uniform3f(planetProg.uLight, LIGHT[0], LIGHT[1], LIGHT[2]);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, albedoTex);
    gl.uniform1i(planetProg.uTex, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, maskTex);
    gl.uniform1i(planetProg.uMask, 1);
    // 真实提瓦特地图像素纹理
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, teyvatAlbedoTex || albedoTex);
    gl.uniform1i(planetProg.uTeyvatTex, 2);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, teyvatMaskTex || maskTex);
    gl.uniform1i(planetProg.uTeyvatMaskTex, 3);
    gl.uniform1f(planetProg.uTeyvatEnabled, teyvatAlbedoTex ? 1.0 : 0.0);
    gl.drawElements(gl.TRIANGLES, sphere.count, gl.UNSIGNED_SHORT, 0);

    var crot = orbitMatrix(orbit, cloudSpin);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    gl.useProgram(cloudProg.prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, sphere.pos);
    gl.enableVertexAttribArray(cloudProg.aPos);
    gl.vertexAttribPointer(cloudProg.aPos, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, sphere.uv);
    gl.enableVertexAttribArray(cloudProg.aUv);
    gl.vertexAttribPointer(cloudProg.aUv, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphere.idx);

    gl.uniformMatrix3fv(cloudProg.uRot, false, crot);
    gl.uniformMatrix4fv(cloudProg.uProj, false, proj);
    gl.uniform1f(cloudProg.uDist, dist);
    gl.uniform1f(cloudProg.uScale, 1.008);
    gl.uniform3f(cloudProg.uLight, LIGHT[0], LIGHT[1], LIGHT[2]);
    gl.uniform1f(cloudProg.uOpacity, 0.02 + 0.34 * clamp((dist - 1.05) / 1.4, 0, 1));
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, cloudTex);
    gl.uniform1i(cloudProg.uClouds, 2);
    gl.drawElements(gl.TRIANGLES, sphere.count, gl.UNSIGNED_SHORT, 0);

    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }

  var pointers = {};
  var dragging = false, pinching = false;
  var lastX = 0, lastY = 0, pinchStart = 0, pinchBase = 0;
  var hintHidden = false, lastAltText = "";
  var spinHoldUntil = 0;
  var labelNodes = [];

  function holdSpin() { spinHoldUntil = performance.now() + 6000; }

  function hideHint() {
    if (hintHidden) return;
    hintHidden = true;
    if (hintEl) hintEl.classList.add("hide");
  }

  function pointerCount() { return Object.keys(pointers).length; }

  function pinchSpan() {
    var ids = Object.keys(pointers);
    if (ids.length < 2) return 0;
    var a = pointers[ids[0]], b = pointers[ids[1]];
    var dx = a.x - b.x, dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function syncSlider() {
    if (zoomEl) zoomEl.value = String(Math.round(tFromDist(targetDist) * 1000));
  }

  function nudgeZoom(delta) {
    targetDist = distFromT(clamp(tFromDist(targetDist) + delta, 0, 1));
    syncSlider();
    hideHint();
    holdSpin();
  }

  function resetView() {
    yaw = 2.02;
    pitch = -0.566;
    orbit = quaternionFromYawPitch(yaw, pitch);
    vyaw = 0;
    vpitch = 0;
    targetDist = distFromT(START_T);
    syncSlider();
    hideHint();
  }

  function updateAlt() {
    if (!altEl) return;
    var km = Math.max(0, (dist - 1) * 6371);
    var text = km < 320
      ? "近地视角 · 距地表 " + Math.round(km) + " km"
      : "距地表 " + Math.round(km).toLocaleString("en-US") + " km";
    if (text !== lastAltText) {
      lastAltText = text;
      altEl.textContent = text;
    }
  }

  function makeLabels() {
    if (!labelsEl || labelNodes.length) return;
    NATIONS.forEach(function (n) {
      var el = document.createElement("div");
      el.className = "planet-label";
      el.style.setProperty("--dot", n.color);
      var dot = document.createElement("i");
      var name = document.createElement("span");
      name.textContent = n.name;
      var sub = document.createElement("small");
      sub.textContent = n.sub;
      el.appendChild(dot);
      el.appendChild(name);
      el.appendChild(sub);
      labelsEl.appendChild(el);
      labelNodes.push(el);
    });
  }

  function updateLabels() {
    if (!labelNodes.length) return;
    var w = viewW, h = viewH;
    if (!w || !h) return;
    var f = 1 / Math.tan(FOV / 2);
    var aspect = w / h;
    var rot = orbitMatrix(orbit);

    for (var i = 0; i < anchors.length; i++) {
      var el = labelNodes[i];
      var an = anchors[i];
      var qx = rot[0] * an.x + rot[3] * an.y + rot[6] * an.z;
      var qy = rot[1] * an.x + rot[4] * an.y + rot[7] * an.z;
      var qz = rot[2] * an.x + rot[5] * an.y + rot[8] * an.z;
      var denom = dist - qz;
      var show = showTags && qz > 0.05 && denom > 0.03 && dist > 1.25;
      if (show) {
        var nx = (f / aspect) * qx / denom;
        var ny = f * qy / denom;
        var sx = (nx * 0.5 + 0.5) * w;
        var sy = (-ny * 0.5 + 0.5) * h;
        sy = clamp(sy + (i % 2 === 0 ? 17 : -17), 18, h - 18);
        if (sx < -70 || sx > w + 70 || sy < -50 || sy > h + 50) {
          show = false;
        } else {
          el.style.left = sx.toFixed(1) + "px";
          el.style.top = sy.toFixed(1) + "px";
        }
      }
      if (show) el.classList.add("visible");
      else el.classList.remove("visible");
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (!ready || !running || document.hidden) {
      lastFrame = now;
      return;
    }
    var dt = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 0.016;
    lastFrame = now;

    if (!dragging && !pinching) {
      if (Math.abs(vyaw) > 0.00002 || Math.abs(vpitch) > 0.00002) {
        rotateOrbit(vyaw, vpitch);
        vyaw *= 0.94;
        vpitch *= 0.94;
      }
      if (autoSpin && !reduceMotion && now > spinHoldUntil) {
        var spd = 0.035 * clamp((dist - 1) / 1.6, 0.16, 1);
        rotateOrbit(dt * spd, 0);
      }
    }
    if (!reduceMotion) cloudSpin += dt * (autoSpin ? 0.012 : 0.004);

    dist += (targetDist - dist) * Math.min(1, dt * 9);
    if (Math.abs(targetDist - dist) < 0.0004) dist = targetDist;

    draw();
    updateLabels();
    updateAlt();
  }

  canvas.tabIndex = 0;
  canvas.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") { rotateOrbit(-0.08, 0); e.preventDefault(); }
    else if (e.key === "ArrowRight") { rotateOrbit(0.08, 0); e.preventDefault(); }
    else if (e.key === "ArrowUp") { rotateOrbit(0, -0.06); e.preventDefault(); }
    else if (e.key === "ArrowDown") { rotateOrbit(0, 0.06); e.preventDefault(); }
    else if (e.key === "+" || e.key === "=") { nudgeZoom(0.06); e.preventDefault(); }
    else if (e.key === "-" || e.key === "_") { nudgeZoom(-0.06); e.preventDefault(); }
    else if (e.key === "0") { resetView(); e.preventDefault(); }
    hideHint();
  });

  canvas.addEventListener("pointerdown", function (e) {
    if (!ready) return;
    hideHint();
    if (canvas.setPointerCapture) {
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    }
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    if (pointerCount() === 1) {
      dragging = true;
      pinching = false;
      lastX = e.clientX;
      lastY = e.clientY;
      vyaw = 0;
      vpitch = 0;
    } else if (pointerCount() === 2) {
      dragging = false;
      pinching = true;
      pinchStart = pinchSpan();
      pinchBase = targetDist;
    }
  });

  canvas.addEventListener("pointermove", function (e) {
    var pt = pointers[e.pointerId];
    if (!pt) return;
    pt.x = e.clientX;
    pt.y = e.clientY;

    if (pinching && pointerCount() >= 2) {
      var span = pinchSpan();
      if (pinchStart > 6) {
        targetDist = clamp(pinchBase * (pinchStart / Math.max(span, 6)), MIN_DIST, MAX_DIST);
        syncSlider();
      }
      return;
    }
    if (!dragging) return;

    var dx = e.clientX - lastX;
    var dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    rotateOrbit(dx * 0.0055, dy * 0.0055);
    vyaw = dx * 0.0035;
    vpitch = dy * 0.0035;
  });

  function endPointer(e) {
    if (!pointers[e.pointerId]) return;
    delete pointers[e.pointerId];
    if (pointerCount() === 1) {
      pinching = false;
      dragging = true;
      var ids = Object.keys(pointers);
      lastX = pointers[ids[0]].x;
      lastY = pointers[ids[0]].y;
    } else if (pointerCount() === 0) {
      dragging = false;
      pinching = false;
    }
  }
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);
  canvas.addEventListener("dblclick", resetView);

  stage.addEventListener("wheel", function (e) {
    if (!ready) return;
    e.preventDefault();
    hideHint();
    targetDist = clamp(targetDist * Math.exp(e.deltaY * 0.0011), MIN_DIST, MAX_DIST);
    syncSlider();
  }, { passive: false });

  if (zoomEl) {
    zoomEl.addEventListener("input", function () {
      targetDist = distFromT(Number(zoomEl.value) / 1000);
      hideHint();
    });
  }
  if (zoomInBtn) zoomInBtn.addEventListener("click", function () { nudgeZoom(0.07); });
  if (zoomOutBtn) zoomOutBtn.addEventListener("click", function () { nudgeZoom(-0.07); });
  if (resetBtn) resetBtn.addEventListener("click", resetView);

  var retryBtn = document.getElementById("planetRetry");
  if (retryBtn) retryBtn.addEventListener("click", function () { window.location.reload(); });

  canvas.addEventListener("webglcontextlost", function (e) {
    e.preventDefault();
    fail("context", e);
  });

  if (spinBtn) {
    spinBtn.setAttribute("aria-pressed", "true");
    spinBtn.addEventListener("click", function () {
      autoSpin = !autoSpin;
      spinBtn.classList.toggle("active", autoSpin);
      spinBtn.setAttribute("aria-pressed", autoSpin ? "true" : "false");
    });
  }
  if (tagsBtn) {
    tagsBtn.setAttribute("aria-pressed", "true");
    tagsBtn.addEventListener("click", function () {
      showTags = !showTags;
      tagsBtn.classList.toggle("active", showTags);
      tagsBtn.setAttribute("aria-pressed", showTags ? "true" : "false");
      if (!showTags) {
        for (var i = 0; i < labelNodes.length; i++) labelNodes[i].classList.remove("visible");
      }
    });
  }
  if (fullBtn) {
    fullBtn.addEventListener("click", function () {
      if (!document.fullscreenElement) {
        if (stage.requestFullscreen) {
          var p = stage.requestFullscreen();
          if (p && p.catch) p.catch(function () {});
        }
      } else if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    });
  }
  document.addEventListener("fullscreenchange", function () {
    if (fullBtn) fullBtn.textContent = document.fullscreenElement ? "退出全屏" : "全屏";
    setTimeout(function () { if (started) resize(); }, 80);
  });

  if (window.ResizeObserver) {
    try {
      new ResizeObserver(function () { if (started) resize(); }).observe(stage);
    } catch (err) {}
  }
  window.addEventListener("resize", function () { if (started) resize(); });

  // 尽量拿到可用的 GL 上下文：不同浏览器 / 关闭硬件加速时表现不一，
  // 依次尝试 webgl、experimental-webgl、webgl2，并显式允许软件渲染。
  function getGLContext() {
    var attrs = {
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
      failIfMajorPerformanceCaveat: false
    };
    var names = ["webgl", "experimental-webgl", "webgl2"];
    for (var i = 0; i < names.length; i++) {
      try {
        var c = canvas.getContext(names[i], attrs);
        if (c) return c;
      } catch (e) {}
    }
    return null;
  }

  function begin() {
    gl = getGLContext();
    if (!gl) { fail("webgl"); return; }

    try {
      planetProg = makeProgram(PLANET_FS);
      cloudProg = makeProgram(CLOUD_FS);
      sphere = makeSphere(96, 192);
    } catch (err2) {
      fail("shader", err2);
      return;
    }

    resize();
    makeLabels();
    syncSlider();

    buildWorld(function () {
      try {
        albedoTex = uploadTexture(albedoCanvas);
        maskTex = uploadTexture(maskCanvas);
        cloudTex = uploadTexture(cloudCanvas);
      } catch (err3) {
        fail("texture", err3);
        return;
      }
      ready = true;
      if (loadingEl) loadingEl.classList.add("hide");
      setTimeout(function () {
        if (loadingEl && loadingEl.parentNode) loadingEl.parentNode.removeChild(loadingEl);
      }, 700);
      lastFrame = 0;
      requestAnimationFrame(frame);
      setTimeout(hideHint, 9000);

      // 异步加载真实提瓦特地图像素纹理
      function loadTeyvatImg(src, onDone) {
        var img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = function () { onDone(img); };
        img.onerror = function () { onDone(null); };
        img.src = src;
      }
      // 兼容处理：非 2 次幂纹理在 WebGL1 下不能生成 mipmap；
      // 同时超过设备最大纹理尺寸时先缩到画布再上传。
      function uploadImageTexture(img) {
        var max = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 2048;
        var w = img.naturalWidth || img.width;
        var h = img.naturalHeight || img.height;
        var source = img;
        if (w > max || h > max) {
          var scale = Math.min(max / w, max / h);
          var cw = Math.max(1, Math.floor(w * scale));
          var ch = Math.max(1, Math.floor(h * scale));
          var c = document.createElement("canvas");
          c.width = cw; c.height = ch;
          c.getContext("2d").drawImage(img, 0, 0, cw, ch);
          source = c;
        }
        var tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        return tex;
      }
      loadTeyvatImg("teyvat-albedo.png", function (img) {
        if (!img || !gl) return;
        try { teyvatAlbedoTex = uploadImageTexture(img); } catch (e) {}
      });
      loadTeyvatImg("teyvat-mask.png", function (img) {
        if (!img || !gl) return;
        try { teyvatMaskTex = uploadImageTexture(img); } catch (e) {}
      });
    });
  }

  /* ============================================================
     无 WebGL 时的 2D 兼容星球：用 Canvas 直接做正交投影，
     仍然使用同一张真实提瓦特地图，保证「没开硬件加速也有星球看」。
     ============================================================ */
  var softGlobeStarted = false;

  function startSoftGlobe() {
    if (softGlobeStarted || !fallbackEl) return;
    softGlobeStarted = true;
    var img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = function () { buildSoftGlobe(img); };
    img.onerror = function () { softGlobeStarted = false; };
    img.src = "teyvat-albedo.png";
  }

  function buildSoftGlobe(img) {
    var SW = 512;
    var SH = Math.max(1, Math.round(SW * (img.naturalHeight || img.height) / (img.naturalWidth || img.width)));
    var sc = document.createElement("canvas");
    sc.width = SW;
    sc.height = SH;
    var sctx = sc.getContext("2d");
    sctx.drawImage(img, 0, 0, SW, SH);
    var src;
    try { src = sctx.getImageData(0, 0, SW, SH).data; } catch (e) { return; }

    var N = 320;
    var cv = document.createElement("canvas");
    cv.width = N;
    cv.height = N;
    cv.className = "fallback-globe";
    cv.setAttribute("role", "img");
    cv.setAttribute("aria-label", "提瓦特星球（2D 兼容视图）");
    var ctx2 = cv.getContext("2d");
    var out = ctx2.createImageData(N, N);
    var od = out.data;

    // 预计算：每条屏幕像素对应的相机空间球面法线与边缘抗锯齿权重
    var nx = new Float32Array(N * N);
    var ny = new Float32Array(N * N);
    var nz = new Float32Array(N * N);
    var alpha = new Float32Array(N * N);
    for (var y = 0; y < N; y++) {
      for (var x = 0; x < N; x++) {
        var i = y * N + x;
        var ux = (x + 0.5) / N * 2 - 1;
        var uy = 1 - (y + 0.5) / N * 2;
        var d2 = ux * ux + uy * uy;
        if (d2 >= 1) { alpha[i] = 0; continue; }
        nx[i] = ux;
        ny[i] = uy;
        nz[i] = Math.sqrt(1 - d2);
        alpha[i] = Math.min(1, (1 - Math.sqrt(d2)) * N * 0.55);
      }
    }

    var lightX = -0.42, lightY = 0.34, lightZ = 0.84;
    var ll = Math.sqrt(lightX * lightX + lightY * lightY + lightZ * lightZ);
    lightX /= ll; lightY /= ll; lightZ /= ll;

    var spin = yaw;

    function render() {
      var ca = Math.cos(spin), sa = Math.sin(spin);
      var cb = Math.cos(pitch), sb = Math.sin(pitch);
      var r0x = ca, r0y = 0, r0z = -sa;
      var r1x = sa * sb, r1y = cb, r1z = ca * sb;
      var r2x = sa * cb, r2y = -sb, r2z = ca * cb;

      for (var i = 0; i < N * N; i++) {
        var a = alpha[i];
        var o = i * 4;
        if (a <= 0) { od[o + 3] = 0; continue; }

        var px = nx[i], py = ny[i], pz = nz[i];
        var wx = r0x * px + r0y * py + r0z * pz;
        var wy = r1x * px + r1y * py + r1z * pz;
        var wz = r2x * px + r2y * py + r2z * pz;

        var latDeg = Math.asin(Math.max(-1, Math.min(1, wy))) * 57.29577951;
        var lonDeg = Math.atan2(-wz, -wx) * 57.29577951;

        var tlx = 1 - (lonDeg - MAP_GEO.lonMin) / MAP_GEO.lonSpan;
        var latRad = latDeg * 0.01745329252;
        var mer = 0.5 - Math.log(Math.tan(0.7853981634 + latRad * 0.5)) / 6.283185307;
        var tly = 1 - (mer - MERC_BOT) / (MERC_TOP - MERC_BOT);

        var r = 14, g = 34, b = 62;
        if (tlx > 0 && tlx < 1 && tly > 0 && tly < 1) {
          var sx = Math.min(SW - 1, Math.max(0, Math.round(tlx * SW)));
          var sy = Math.min(SH - 1, Math.max(0, Math.round(tly * SH)));
          var s = (sy * SW + sx) * 4;
          r = src[s]; g = src[s + 1]; b = src[s + 2];
        }

        var ndl = Math.max(0, wx * lightX + wy * lightY + wz * lightZ);
        var shade = 0.30 + 0.92 * ndl;
        var rim = Math.pow(1 - pz, 3) * 0.55;
        r = Math.min(255, r * shade + 60 * rim);
        g = Math.min(255, g * shade + 120 * rim);
        b = Math.min(255, b * shade + 190 * rim);

        od[o] = r; od[o + 1] = g; od[o + 2] = b;
        od[o + 3] = a * 255;
      }
      ctx2.putImageData(out, 0, 0);
    }

    var orb = fallbackEl.querySelector(".fallback-orb");
    if (orb) orb.style.display = "none";
    fallbackEl.insertBefore(cv, fallbackEl.firstChild);
    render();

    if (reduceMotion) return;

    var fwd = document.getElementById("planetSpin");
    var spinning = true;
    if (fwd) {
      spinning = fwd.getAttribute("aria-pressed") !== "false";
      fwd.addEventListener("click", function () {
        spinning = fwd.getAttribute("aria-pressed") !== "false";
      });
    }
    var last = 0;
    function loop(now) {
      requestAnimationFrame(loop);
      if (!spinning || document.hidden) return;
      if (now - last < 60) return;
      last = now;
      spin += 0.006;
      render();
    }
    requestAnimationFrame(loop);
  }

  function fail(reason, err) {
    ready = false;
    if (err && window.console) console.error("[planet] " + (reason || "init") + " failed:", err);
    if (loadingEl) loadingEl.classList.add("hide");
    if (fallbackEl) {
      fallbackEl.hidden = false;
        var msg = document.getElementById("planetFallbackMsg");
      if (msg) {
        msg.textContent = reason === "webgl"
          ? "这台浏览器没有启用 WebGL（常见于关闭了「使用硬件加速」）。已切换为 2D 兼容星球，画面仍使用真实提瓦特地图。"
          : "3D 星球初始化失败，已切换到 2D 兼容星球。点击重试；若仍失败，请更新浏览器或开启硬件加速。";
      }
      startSoftGlobe();
    }
    resize();
  }

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      var en = entries[0];
      running = en.isIntersecting;
      if (en.isIntersecting && !started) {
        started = true;
        begin();
      }
    }, { rootMargin: "420px 0px" });
    io.observe(stage);
  } else {
    started = true;
    running = true;
    begin();
  }
})();
