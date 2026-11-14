(function () {
  "use strict";

  var MAX_FILE_BYTES = 120 * 1024 * 1024;
  var MAX_DOCUMENT_EDGE = 6000;
  var MAX_DOCUMENT_PIXELS = 30000000;
  var MAX_LAYER_EDGE = 7000;
  var MAX_LAYER_COUNT = 120;
  var MAX_LAYER_PIXELS = 60000000;
  var MAX_TILT = 180;
  var KEYBOARD_TILT_STEP = 5;
  var MIN_ZOOM = 0.5;
  var MAX_ZOOM = 3;
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var holoLight = { x: 0, y: 0, targetX: 0, targetY: 0, frame: null, time: null };
  var state = {
    documentWidth: 750,
    documentHeight: 1050,
    documentName: "示例卡牌.psd",
    layers: [],
    selectedId: "sample-foil",
    effect: "rainbow",
    intensity: 68,
    tiltX: 0,
    tiltY: 0,
    zoom: 1,
    drag: null,
    layerDrag: null,
    toastTimer: null
  };

  var elements = {
    input: document.getElementById("psdInput"),
    documentName: document.getElementById("documentName"),
    documentMeta: document.getElementById("documentMeta"),
    layerCount: document.getElementById("layerCount"),
    layerList: document.getElementById("layerList"),
    layerNotice: document.getElementById("layerNotice"),
    selectedLayerName: document.getElementById("selectedLayerName"),
    cardContent: document.getElementById("cardContent"),
    card: document.getElementById("card"),
    cardRotator: document.getElementById("cardRotator"),
    tiltShell: document.getElementById("tiltShell"),
    resetTilt: document.getElementById("resetTilt"),
    resetZoom: document.getElementById("resetZoom"),
    angleX: document.getElementById("angleX"),
    angleY: document.getElementById("angleY"),
    intensity: document.getElementById("intensity"),
    intensityValue: document.getElementById("intensityValue"),
    statusPill: document.getElementById("statusPill"),
    parserMessage: document.getElementById("parserMessage"),
    dropZone: document.getElementById("dropZone"),
    toast: document.getElementById("toast")
  };

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function createCanvas(width, height) {
    var canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  function setMaterialTextures() {
    var size = 192;
    var grain = createCanvas(size, size);
    var flakes = createCanvas(size, size);
    var grainContext = grain.getContext("2d");
    var flakeContext = flakes.getContext("2d");
    var seed = 9173;

    function random() {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    }

    for (var index = 0; index < 6800; index += 1) {
      var width = 0.45 + random() * 1.65;
      var light = random() > 0.42 ? 255 : 39;
      var x = random() * (size - width);
      var y = random() * (size - width);
      grainContext.fillStyle = "rgba(" + light + "," + light + "," + light + "," + (0.22 + random() * 0.68) + ")";
      grainContext.fillRect(x, y, width, width);
    }

    var cellSize = 16;
    for (var row = 0; row < size; row += cellSize) {
      for (var column = 0; column < size; column += cellSize) {
        var centerX = column + 4 + random() * 8;
        var centerY = row + 4 + random() * 8;
        var direction = random() * Math.PI * 2;
        var hue = random() * 360;
        for (var petal = 0; petal < 3; petal += 1) {
          var angle = direction + petal * Math.PI * 2 / 3;
          var reach = 2 + random() * 2;
          var spread = 0.44 + random() * 0.27;
          flakeContext.fillStyle = "hsl(" + (hue + petal * 39) + " 72% " + (62 + random() * 28) + "% / 0.88)";
          flakeContext.beginPath();
          flakeContext.moveTo(centerX, centerY);
          flakeContext.lineTo(centerX + Math.cos(angle - spread) * reach, centerY + Math.sin(angle - spread) * reach);
          flakeContext.lineTo(centerX + Math.cos(angle) * reach, centerY + Math.sin(angle) * reach);
          flakeContext.lineTo(centerX + Math.cos(angle + spread) * reach, centerY + Math.sin(angle + spread) * reach);
          flakeContext.closePath();
          flakeContext.fill();
        }
      }
    }

    document.documentElement.style.setProperty("--glitter-grain", "url(" + JSON.stringify(grain.toDataURL()) + ")");
    document.documentElement.style.setProperty("--foil-flakes", "url(" + JSON.stringify(flakes.toDataURL()) + ")");
  }

  function roundRect(context, x, y, width, height, radius) {
    var r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }

  function drawSampleBackground() {
    var canvas = createCanvas(750, 1050);
    var context = canvas.getContext("2d");
    var background = context.createLinearGradient(0, 0, 750, 1050);
    background.addColorStop(0, "#1a1532");
    background.addColorStop(0.45, "#111b2c");
    background.addColorStop(1, "#060910");
    context.fillStyle = background;
    context.fillRect(0, 0, 750, 1050);

    var glow = context.createRadialGradient(430, 420, 20, 430, 420, 420);
    glow.addColorStop(0, "rgba(108, 233, 239, .42)");
    glow.addColorStop(0.4, "rgba(85, 83, 190, .22)");
    glow.addColorStop(1, "rgba(17, 18, 43, 0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, 750, 900);

    context.strokeStyle = "rgba(232, 245, 255, .17)";
    context.lineWidth = 2;
    for (var index = 0; index < 14; index += 1) {
      context.beginPath();
      context.arc(375, 500, 110 + index * 28, Math.PI * 1.06, Math.PI * 1.94);
      context.stroke();
    }
    return canvas;
  }

  function drawSampleArtwork() {
    var canvas = createCanvas(750, 1050);
    var context = canvas.getContext("2d");
    context.save();
    roundRect(context, 55, 182, 640, 684, 34);
    context.clip();

    var sky = context.createLinearGradient(0, 190, 0, 850);
    sky.addColorStop(0, "#41216d");
    sky.addColorStop(0.48, "#1b6991");
    sky.addColorStop(1, "#07141f");
    context.fillStyle = sky;
    context.fillRect(55, 182, 640, 684);

    context.globalAlpha = 0.65;
    for (var star = 0; star < 90; star += 1) {
      var sx = 70 + ((star * 83) % 600);
      var sy = 200 + ((star * 47) % 470);
      var size = 1 + (star % 3);
      context.fillStyle = star % 7 === 0 ? "#baff45" : "#d9f6ff";
      context.fillRect(sx, sy, size, size);
    }
    context.globalAlpha = 1;

    var moon = context.createRadialGradient(510, 365, 12, 510, 365, 118);
    moon.addColorStop(0, "rgba(255, 255, 224, .98)");
    moon.addColorStop(0.22, "rgba(177, 245, 235, .72)");
    moon.addColorStop(1, "rgba(107, 169, 225, 0)");
    context.fillStyle = moon;
    context.beginPath();
    context.arc(510, 365, 120, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#0d2030";
    context.beginPath();
    context.moveTo(55, 720);
    context.lineTo(230, 470);
    context.lineTo(315, 616);
    context.lineTo(430, 408);
    context.lineTo(695, 730);
    context.lineTo(695, 866);
    context.lineTo(55, 866);
    context.closePath();
    context.fill();

    var lake = context.createLinearGradient(0, 650, 0, 866);
    lake.addColorStop(0, "rgba(38, 177, 192, .52)");
    lake.addColorStop(1, "rgba(3, 17, 25, .96)");
    context.fillStyle = lake;
    context.beginPath();
    context.moveTo(55, 700);
    context.bezierCurveTo(190, 650, 330, 760, 695, 672);
    context.lineTo(695, 866);
    context.lineTo(55, 866);
    context.closePath();
    context.fill();

    context.strokeStyle = "rgba(160, 248, 245, .32)";
    context.lineWidth = 3;
    for (var line = 0; line < 8; line += 1) {
      context.beginPath();
      context.moveTo(210 - line * 11, 746 + line * 18);
      context.quadraticCurveTo(388, 718 + line * 12, 570 + line * 8, 730 + line * 19);
      context.stroke();
    }
    context.restore();

    context.strokeStyle = "rgba(221, 237, 244, .7)";
    context.lineWidth = 2;
    roundRect(context, 55, 182, 640, 684, 34);
    context.stroke();
    return canvas;
  }

  function drawSampleFoil() {
    var canvas = createCanvas(750, 1050);
    var context = canvas.getContext("2d");
    context.translate(375, 532);
    context.strokeStyle = "rgba(255,255,255,.92)";
    context.fillStyle = "rgba(255,255,255,.22)";
    context.lineWidth = 10;
    context.beginPath();
    for (var point = 0; point < 12; point += 1) {
      var angle = -Math.PI / 2 + point * Math.PI / 6;
      var radius = point % 2 === 0 ? 126 : 62;
      var x = Math.cos(angle) * radius;
      var y = Math.sin(angle) * radius;
      if (point === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }
    context.closePath();
    context.fill();
    context.stroke();
    context.lineWidth = 4;
    context.beginPath();
    context.arc(0, 0, 44, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.moveTo(-162, 0);
    context.lineTo(162, 0);
    context.moveTo(0, -162);
    context.lineTo(0, 162);
    context.stroke();
    return canvas;
  }

  function drawSampleType() {
    var canvas = createCanvas(750, 1050);
    var context = canvas.getContext("2d");
    context.textAlign = "center";
    context.fillStyle = "#f5f2e8";
    context.font = "700 29px Georgia, serif";
    context.letterSpacing = "7px";
    context.fillText("CELESTIAL ARCHIVE", 375, 104);
    context.fillStyle = "rgba(223, 235, 238, .72)";
    context.font = "500 15px Inter, sans-serif";
    context.fillText("NO. 021 · NIGHTFALL SERIES", 375, 142);

    context.textAlign = "left";
    context.fillStyle = "#f5f2e8";
    context.font = "700 26px Georgia, serif";
    context.fillText("星海守望者", 72, 930);
    context.fillStyle = "rgba(223, 235, 238, .68)";
    context.font = "500 14px Inter, sans-serif";
    context.fillText("RARE · HOLOGRAPHIC", 72, 962);

    context.textAlign = "right";
    context.fillStyle = "#baff45";
    context.font = "700 34px Inter, sans-serif";
    context.fillText("07", 678, 952);
    return canvas;
  }

  function createSampleLayers() {
    return [
      {
        id: "sample-type",
        name: "标题与编号",
        hidden: false,
        opacity: 1,
        blendMode: "normal",
        left: 0,
        top: 0,
        right: 750,
        bottom: 1050,
        canvas: drawSampleType(),
        supported: true,
        typeLabel: "像素图层",
        depth: 0,
        isGroup: false
      },
      {
        id: "sample-foil",
        name: "镭射徽记",
        hidden: false,
        opacity: 0.92,
        blendMode: "screen",
        left: 0,
        top: 0,
        right: 750,
        bottom: 1050,
        canvas: drawSampleFoil(),
        supported: true,
        typeLabel: "透明像素图层",
        depth: 0,
        isGroup: false
      },
      {
        id: "sample-art",
        name: "主视觉插画",
        hidden: false,
        opacity: 1,
        blendMode: "normal",
        left: 0,
        top: 0,
        right: 750,
        bottom: 1050,
        canvas: drawSampleArtwork(),
        supported: true,
        typeLabel: "像素图层",
        depth: 0,
        isGroup: false
      },
      {
        id: "sample-bg",
        name: "深空背景",
        hidden: false,
        opacity: 1,
        blendMode: "normal",
        left: 0,
        top: 0,
        right: 750,
        bottom: 1050,
        canvas: drawSampleBackground(),
        supported: true,
        typeLabel: "像素图层",
        depth: 0,
        isGroup: false
      }
    ];
  }

  function blendModeToCss(mode) {
    var modes = {
      normal: "normal",
      multiply: "multiply",
      screen: "screen",
      overlay: "overlay",
      darken: "darken",
      lighten: "lighten",
      "color dodge": "color-dodge",
      "color burn": "color-burn",
      "hard light": "hard-light",
      "soft light": "soft-light",
      difference: "difference",
      exclusion: "exclusion",
      hue: "hue",
      saturation: "saturation",
      color: "color",
      luminosity: "luminosity"
    };
    return modes[mode] || "normal";
  }

  function setPositionStyles(node, layer) {
    var width = Math.max(0, layer.right - layer.left);
    var height = Math.max(0, layer.bottom - layer.top);
    node.style.left = (layer.left / state.documentWidth * 100) + "%";
    node.style.top = (layer.top / state.documentHeight * 100) + "%";
    node.style.width = (width / state.documentWidth * 100) + "%";
    node.style.height = (height / state.documentHeight * 100) + "%";
  }

  function isLayerVisible(layer) {
    for (var current = layer; current; current = current.parent) {
      if (current.hidden) {
        return false;
      }
    }
    return true;
  }

  function layerImageUrl(layer) {
    if (!layer.imageUrl) {
      layer.imageUrl = layer.canvas.toDataURL("image/png");
    }
    return layer.imageUrl;
  }

  function isHolographic(effect) {
    return effect === "rainbow" || effect === "cross-holo" || effect === "flake-holo";
  }

  function renderCard() {
    elements.cardContent.replaceChildren();
    var renderable = state.layers.filter(function (layer) {
      return !layer.isGroup && layer.canvas && isLayerVisible(layer);
    }).reverse();

    renderable.forEach(function (layer) {
      layer.canvas.className = "document-layer";
      layer.canvas.setAttribute("aria-hidden", "true");
      layer.canvas.style.opacity = String(layer.opacity);
      layer.canvas.style.mixBlendMode = blendModeToCss(layer.blendMode);
      setPositionStyles(layer.canvas, layer);
      elements.cardContent.appendChild(layer.canvas);

      if (layer.id === state.selectedId) {
        var effect = document.createElement("div");
        var maskUrl = layerImageUrl(layer);
        effect.className = "material-effect effect-" + state.effect;
        effect.setAttribute("aria-hidden", "true");
        effect.style.setProperty("--effect-strength", String(state.intensity / 100));
        effect.style.setProperty("--layer-opacity", String(layer.opacity));
        effect.style.webkitMaskImage = "url(" + JSON.stringify(maskUrl) + ")";
        effect.style.maskImage = "url(" + JSON.stringify(maskUrl) + ")";
        setPositionStyles(effect, layer);
        elements.cardContent.appendChild(effect);
      }
    });
    updateTiltVisuals();
  }

  function makeEyeIcon(hidden) {
    var namespace = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(namespace, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    var path = document.createElementNS(namespace, "path");
    if (hidden) {
      path.setAttribute("d", "M4 4l16 16M9.8 9.8a3.1 3.1 0 0 0 4.4 4.4M7 6.2A11.8 11.8 0 0 1 12 5c5.2 0 8.5 5 8.5 5a15 15 0 0 1-2.4 2.9M5.6 8.3A16.8 16.8 0 0 0 3.5 12s3.3 5 8.5 5c1.1 0 2.2-.2 3.1-.6");
    } else {
      path.setAttribute("d", "M3.5 12s3.3-5 8.5-5 8.5 5 8.5 5-3.3 5-8.5 5-8.5-5-8.5-5Zm8.5 2.6a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z");
    }
    svg.appendChild(path);
    return svg;
  }

  function layerRow(layer) {
    return elements.layerList.querySelector('[data-layer-id="' + layer.id + '"]');
  }

  function layerBlockEnd(index) {
    var depth = state.layers[index].depth;
    var end = index + 1;
    while (end < state.layers.length && state.layers[end].depth > depth) {
      end += 1;
    }
    return end;
  }

  function moveLayer(layer, target, after) {
    var start = state.layers.indexOf(layer);
    var targetIndex = state.layers.indexOf(target);
    if (start < 0 || targetIndex < 0 || layer === target || layer.parent !== target.parent) {
      return;
    }
    var end = layerBlockEnd(start);
    var insertAt = after ? layerBlockEnd(targetIndex) : targetIndex;
    if (insertAt === start || insertAt === end) {
      return;
    }
    var block = state.layers.splice(start, end - start);
    var destination = insertAt > start ? insertAt - block.length : insertAt;
    state.layers = state.layers.slice(0, destination).concat(block, state.layers.slice(destination));
    renderLayerList();
    renderCard();
    var handle = layerRow(layer).querySelector(".layer-handle");
    handle.focus();
    elements.layerNotice.textContent = "已将 " + layer.name + " 移到 " + target.name + (after ? " 下方" : " 上方");
  }

  function startLayerDrag(event, layer, handle) {
    if (event.button !== 0 || state.layerDrag) {
      return;
    }
    state.layerDrag = { layer: layer, handle: handle, pointerId: event.pointerId, startY: event.clientY };
    handle.setPointerCapture(event.pointerId);
  }

  function clearDropMarker(drag) {
    if (drag.marker) {
      drag.marker.classList.remove("drop-before", "drop-after");
    }
    drag.marker = null;
    drag.target = null;
  }

  function updateLayerDropTarget(drag, x, y) {
    clearDropMarker(drag);
    var hit = document.elementFromPoint(x, y);
    var row = hit && hit.closest(".layer-item");
    if (!row || !elements.layerList.contains(row)) {
      return;
    }
    var target = state.layers.find(function (layer) {
      return layer.id === row.dataset.layerId;
    });
    while (target && target.parent !== drag.layer.parent) {
      target = target.parent;
    }
    if (!target || target === drag.layer) {
      return;
    }
    var firstRow = layerRow(target);
    var lastRow = layerRow(state.layers[layerBlockEnd(state.layers.indexOf(target)) - 1]);
    drag.after = y >= (firstRow.getBoundingClientRect().top + lastRow.getBoundingClientRect().bottom) / 2;
    drag.target = target;
    drag.marker = drag.after ? lastRow : firstRow;
    drag.marker.classList.add(drag.after ? "drop-after" : "drop-before");
  }

  function scrollLayerDrag(drag) {
    drag.frame = null;
    var list = elements.layerList;
    var bounds = list.getBoundingClientRect();
    if (drag.x < bounds.left || drag.x > bounds.right || drag.y < bounds.top || drag.y > bounds.bottom) {
      return;
    }
    var edge = Math.min(32, bounds.height / 4);
    var step = clamp((drag.y - bounds.bottom + edge) / edge, 0, 1) -
      clamp((bounds.top + edge - drag.y) / edge, 0, 1);
    var previous = list.scrollTop;
    list.scrollTop += Math.round(step * 12);
    if (list.scrollTop !== previous) {
      updateLayerDropTarget(drag, drag.x, drag.y);
      drag.frame = requestAnimationFrame(function () { scrollLayerDrag(drag); });
    }
  }

  function trackLayerDrag(event) {
    var drag = state.layerDrag;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    if (!drag.active && Math.abs(event.clientY - drag.startY) < 5) {
      return;
    }
    drag.active = true;
    drag.x = event.clientX;
    drag.y = event.clientY;
    layerRow(drag.layer).classList.add("is-reordering");
    updateLayerDropTarget(drag, drag.x, drag.y);
    if (drag.frame == null) {
      drag.frame = requestAnimationFrame(function () { scrollLayerDrag(drag); });
    }
  }

  function finishLayerDrag(event) {
    var drag = state.layerDrag;
    if (!drag || (event && drag.pointerId !== event.pointerId)) {
      return;
    }
    if (event && event.type === "pointerup" && drag.active) {
      updateLayerDropTarget(drag, event.clientX, event.clientY);
    }
    var target = drag.target;
    state.layerDrag = null;
    if (drag.frame != null) {
      cancelAnimationFrame(drag.frame);
    }
    clearDropMarker(drag);
    var row = layerRow(drag.layer);
    if (row) {
      row.classList.remove("is-reordering");
    }
    if (drag.handle.hasPointerCapture(drag.pointerId)) {
      drag.handle.releasePointerCapture(drag.pointerId);
    }
    if (event && event.type === "pointerup" && target) {
      moveLayer(drag.layer, target, drag.after);
    }
  }

  function renderLayerList() {
    elements.layerList.replaceChildren();
    state.layers.forEach(function (layer) {
      var item = document.createElement("div");
      item.className = "layer-item";
      item.setAttribute("role", "listitem");
      item.dataset.layerId = layer.id;
      item.style.setProperty("--layer-indent", layer.depth * 10 + "px");
      item.classList.toggle("is-selected", layer.id === state.selectedId);
      item.classList.toggle("is-hidden", !isLayerVisible(layer));

      var handle = document.createElement("button");
      handle.type = "button";
      handle.className = "layer-handle";
      handle.setAttribute("aria-label", "调整图层顺序：" + layer.name);
      handle.title = "拖动或用上下方向键排序";
      handle.textContent = "⠿";
      handle.addEventListener("pointerdown", function (event) {
        startLayerDrag(event, layer, handle);
      });
      handle.addEventListener("keydown", function (event) {
        if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
          return;
        }
        event.preventDefault();
        var siblings = state.layers.filter(function (candidate) {
          return candidate.parent === layer.parent;
        });
        var after = event.key === "ArrowDown";
        var target = siblings[siblings.indexOf(layer) + (after ? 1 : -1)];
        if (target) {
          moveLayer(layer, target, after);
        }
      });

      var select = document.createElement("button");
      select.type = "button";
      select.className = "layer-select";
      select.disabled = !layer.supported || layer.isGroup;
      select.setAttribute("aria-pressed", String(layer.id === state.selectedId));

      var thumb = document.createElement("span");
      thumb.className = "layer-thumb";
      if (layer.canvas) {
        var image = document.createElement("img");
        image.src = layerImageUrl(layer);
        image.alt = "";
        thumb.appendChild(image);
      } else {
        var groupIcon = document.createElement("span");
        groupIcon.className = "layer-group-icon";
        thumb.appendChild(groupIcon);
      }

      var copy = document.createElement("span");
      copy.className = "layer-copy";
      var name = document.createElement("strong");
      name.textContent = layer.name;
      var type = document.createElement("small");
      type.textContent = layer.typeLabel;
      copy.appendChild(name);
      copy.appendChild(type);

      var visibility = document.createElement("button");
      visibility.type = "button";
      visibility.className = "layer-visibility";
      visibility.setAttribute("aria-label", "显示图层：" + layer.name);
      visibility.setAttribute("aria-pressed", String(!layer.hidden));
      visibility.title = !layer.hidden && !isLayerVisible(layer) ? "上级图层组已隐藏" : layer.hidden ? "显示图层" : "隐藏图层";
      visibility.appendChild(makeEyeIcon(layer.hidden));
      visibility.addEventListener("click", function () {
        layer.hidden = !layer.hidden;
        renderLayerList();
        renderCard();
        layerRow(layer).querySelector(".layer-visibility").focus({ preventScroll: true });
      });

      select.append(thumb, copy);
      item.append(handle, select, visibility);
      select.addEventListener("click", function () {
        state.selectedId = layer.id;
        renderAll();
        layerRow(layer).querySelector(".layer-select").focus({ preventScroll: true });
      });
      elements.layerList.appendChild(item);
    });
  }

  function getSelectedLayer() {
    return state.layers.find(function (layer) {
      return layer.id === state.selectedId;
    });
  }

  function renderSummary() {
    var pixelLayers = state.layers.filter(function (layer) {
      return !layer.isGroup;
    });
    var selected = getSelectedLayer();
    elements.documentName.textContent = state.documentName;
    elements.documentMeta.textContent = state.documentWidth + " × " + state.documentHeight + " px";
    elements.layerCount.textContent = String(pixelLayers.length);
    elements.selectedLayerName.textContent = selected ? selected.name : "无可用像素图层";
    elements.tiltShell.style.setProperty("--document-ratio", String(state.documentWidth / state.documentHeight));
  }

  function renderAll() {
    renderSummary();
    renderLayerList();
    renderCard();
  }

  function setZoom(value) {
    state.zoom = clamp(value, MIN_ZOOM, MAX_ZOOM);
    elements.tiltShell.style.setProperty("--preview-zoom", String(state.zoom));
    var percent = Math.round(state.zoom * 100) + "%";
    elements.resetZoom.textContent = percent;
    elements.resetZoom.setAttribute("aria-label", "重置缩放，当前 " + percent);
  }

  function paintHoloLight() {
    var style = elements.cardContent.style;
    var x = holoLight.x;
    var y = holoLight.y;
    style.setProperty("--holo-x", String(x));
    style.setProperty("--holo-y", String(y));
    style.setProperty("--holo-energy", String(Math.min(1, Math.hypot(x, y))));
  }

  function animateHoloLight(time) {
    var elapsed = holoLight.time === null ? 1000 / 60 : time - holoLight.time;
    var fraction = 1 - Math.exp(-elapsed / 55);
    holoLight.x += (holoLight.targetX - holoLight.x) * fraction;
    holoLight.y += (holoLight.targetY - holoLight.y) * fraction;
    if (Math.hypot(holoLight.targetX - holoLight.x, holoLight.targetY - holoLight.y) < 0.002) {
      setHoloLight(holoLight.targetX, holoLight.targetY, false);
      return;
    }
    holoLight.time = time;
    paintHoloLight();
    holoLight.frame = requestAnimationFrame(animateHoloLight);
  }

  function setHoloLight(x, y, smooth) {
    holoLight.targetX = x;
    holoLight.targetY = y;
    if (smooth && !reducedMotion.matches && (x !== holoLight.x || y !== holoLight.y)) {
      if (holoLight.frame === null) {
        holoLight.frame = requestAnimationFrame(animateHoloLight);
      }
      return;
    }
    if (holoLight.frame !== null) {
      cancelAnimationFrame(holoLight.frame);
      holoLight.frame = null;
      holoLight.time = null;
    }
    holoLight.x = x;
    holoLight.y = y;
    paintHoloLight();
  }

  function cardLightNormal() {
    var radians = Math.PI / 180;
    var x = state.tiltX * radians;
    var y = state.tiltY * radians;
    return { x: Math.sin(y), y: -Math.sin(x) * Math.cos(y) };
  }

  function updateTiltVisuals() {
    elements.cardRotator.style.transform = "rotateX(" + state.tiltX + "deg) rotateY(" + state.tiltY + "deg)";
    var normal = cardLightNormal();
    var normalX = normal.x;
    var normalY = normal.y;
    elements.cardContent.style.setProperty("--shine-x", (50 + normalX * 42) + "%");
    elements.cardContent.style.setProperty("--shine-y", (50 + normalY * 42) + "%");
    elements.cardContent.style.setProperty("--shine-travel", String(Math.hypot(normalX, normalY)));
    setHoloLight(normalX, normalY, false);
    elements.angleX.textContent = Math.round(state.tiltX) + "°";
    elements.angleY.textContent = Math.round(state.tiltY) + "°";
  }

  function setParserMessage(message, isError) {
    elements.parserMessage.classList.toggle("is-error", Boolean(isError));
    elements.parserMessage.querySelector("p").textContent = message;
  }

  function showToast(message) {
    window.clearTimeout(state.toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    state.toastTimer = window.setTimeout(function () {
      elements.toast.classList.remove("is-visible");
    }, 5200);
  }

  function describeLayerType(layer, supported) {
    if (Array.isArray(layer.children)) {
      return "图层组";
    }
    if (supported) {
      return "像素图层";
    }
    return "需在 Photoshop 栅格化";
  }

  function hasAdvancedFeatures(layer) {
    return Boolean(
      layer.text ||
      layer.adjustment ||
      layer.vectorMask ||
      layer.placedLayer ||
      layer.smartObject ||
      layer.effects ||
      layer.mask ||
      layer.realMask
    );
  }

  function inspectStructure(psd) {
    if (!Number.isFinite(psd.width) || !Number.isFinite(psd.height) || psd.width <= 0 || psd.height <= 0) {
      throw new Error("PSD 画布尺寸无效");
    }
    if (psd.width > MAX_DOCUMENT_EDGE || psd.height > MAX_DOCUMENT_EDGE || psd.width * psd.height > MAX_DOCUMENT_PIXELS) {
      throw new Error("PSD 画布超过 6000 px 边长或 3000 万像素限制");
    }
    if (psd.bitsPerChannel > 8) {
      throw new Error("首版仅支持 8 位通道 PSD，请在 Photoshop 中转换后重试");
    }

    var count = 0;
    var totalPixels = 0;
    function inspectLayer(layer) {
      count += 1;
      if (count > MAX_LAYER_COUNT) {
        throw new Error("PSD 图层超过 120 个，请精简图层后重试");
      }
      var width = Math.max(0, Number(layer.right || 0) - Number(layer.left || 0));
      var height = Math.max(0, Number(layer.bottom || 0) - Number(layer.top || 0));
      if (width > MAX_LAYER_EDGE || height > MAX_LAYER_EDGE) {
        throw new Error("图层“" + (layer.name || "未命名") + "”尺寸超过 7000 px");
      }
      totalPixels += width * height;
      if (totalPixels > MAX_LAYER_PIXELS) {
        throw new Error("PSD 图层总像素量超过 6000 万限制");
      }
      if (layer.children) {
        layer.children.forEach(inspectLayer);
      }
    }
    if (psd.children) {
      psd.children.forEach(inspectLayer);
    }
  }

  function parseLayerRecords(nodes, depth, records, sequence, parent) {
    // The bundled ag-psd returns each sibling list in bottom-to-top paint order.
    for (var index = nodes.length - 1; index >= 0; index -= 1) {
      var layer = nodes[index];
      var id = "psd-layer-" + sequence.value;
      sequence.value += 1;
      var isGroup = Array.isArray(layer.children);
      var canvas = null;
      var supported = false;

      if (!isGroup) {
        try {
          canvas = window.agPsd.getLayerCanvas(layer) || null;
        } catch (error) {
          throw new Error("无法读取图层“" + (layer.name || "未命名") + "”：" + error.message);
        }
        supported = Boolean(canvas) && !hasAdvancedFeatures(layer);
      }

      var record = {
        id: id,
        name: layer.name || "未命名图层",
        hidden: Boolean(layer.hidden),
        parent: parent,
        opacity: Number.isFinite(layer.opacity) ? layer.opacity : 1,
        blendMode: layer.blendMode || "normal",
        left: Number(layer.left || 0),
        top: Number(layer.top || 0),
        right: Number(layer.right || 0),
        bottom: Number(layer.bottom || 0),
        canvas: canvas,
        supported: supported,
        typeLabel: describeLayerType(layer, supported),
        depth: depth,
        isGroup: isGroup
      };
      records.push(record);

      if (isGroup) {
        parseLayerRecords(layer.children, depth + 1, records, sequence, record);
      }
    }
  }

  function friendlyParserError(error) {
    var message = error && error.message ? error.message : "未知解析错误";
    if (/signature|invalid file|header/i.test(message)) {
      return "文件头无效，请确认所选文件是完整的 PSD 文档。";
    }
    if (/memory|allocation|array length/i.test(message)) {
      return "文件需要的内存超过浏览器限制，请降低画布尺寸或合并图层。";
    }
    return message;
  }

  function readPsdFile(file) {
    if (!file) {
      return;
    }
    if (!/\.psd$/i.test(file.name)) {
      showToast("请选择扩展名为 .psd 的文件。");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      showToast("PSD 文件超过 120 MB 限制，请压缩或精简后重试。");
      return;
    }
    if (!window.agPsd || typeof window.agPsd.readPsd !== "function") {
      showToast("PSD 解析组件未能加载，请刷新页面后重试。");
      return;
    }

    elements.statusPill.lastChild.textContent = "读取中";
    setParserMessage("正在检查 PSD 结构与图层数据。", false);
    file.arrayBuffer().then(function (buffer) {
      var psd = window.agPsd.readPsd(buffer, {
        useRawData: true,
        useRawThumbnail: true,
        skipLinkedFilesData: true,
        imageResourcesWhitelist: [],
        totalMemoryLimit: 268435456
      });
      inspectStructure(psd);
      var records = [];
      parseLayerRecords(psd.children || [], 0, records, { value: 0 }, null);
      var selectable = records.find(function (layer) {
        return layer.supported && isLayerVisible(layer);
      });

      finishLayerDrag();
      state.documentWidth = psd.width;
      state.documentHeight = psd.height;
      state.documentName = file.name;
      state.layers = records;
      state.selectedId = selectable ? selectable.id : null;
      state.tiltX = 0;
      state.tiltY = 0;
      setZoom(1);
      elements.statusPill.lastChild.textContent = "PSD 已载入";
      setParserMessage("已在本地读取 " + records.filter(function (layer) { return !layer.isGroup; }).length + " 个图层。复杂图层会标记为需栅格化。", false);
      renderAll();
    }).catch(function (error) {
      var message = friendlyParserError(error);
      elements.statusPill.lastChild.textContent = "读取失败";
      setParserMessage(message, true);
      showToast("无法解析此 PSD：" + message);
    }).finally(function () {
      elements.input.value = "";
    });
  }

  function bindInteractions() {
    elements.layerList.addEventListener("pointermove", trackLayerDrag);
    elements.layerList.addEventListener("pointerup", finishLayerDrag);
    elements.layerList.addEventListener("pointercancel", finishLayerDrag);
    elements.layerList.addEventListener("lostpointercapture", finishLayerDrag);

    elements.dropZone.addEventListener("wheel", function (event) {
      if (event.ctrlKey || event.metaKey || event.deltaY === 0) {
        return;
      }
      event.preventDefault();
      var unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? elements.dropZone.clientHeight : 1;
      setZoom(state.zoom * Math.exp(-event.deltaY * unit / 500));
    }, { passive: false });
    elements.resetZoom.addEventListener("click", function () { setZoom(1); });

    document.querySelectorAll('input[name="preview-background"]').forEach(function (option) {
      if (option.checked) {
        elements.card.dataset.background = option.value;
      }
      option.addEventListener("change", function () {
        elements.card.dataset.background = option.value;
      });
    });

    elements.input.addEventListener("change", function (event) {
      readPsdFile(event.target.files[0]);
    });

    document.querySelectorAll(".effect-option").forEach(function (button) {
      button.addEventListener("click", function () {
        state.effect = button.dataset.effect;
        document.querySelectorAll(".effect-option").forEach(function (option) {
          var active = option === button;
          option.classList.toggle("is-active", active);
          option.setAttribute("aria-pressed", active ? "true" : "false");
        });
        renderCard();
      });
    });

    elements.intensity.addEventListener("input", function () {
      state.intensity = Number(elements.intensity.value);
      elements.intensityValue.textContent = state.intensity + "%";
      var effect = elements.cardContent.querySelector(".material-effect");
      if (effect) {
        effect.style.setProperty("--effect-strength", String(state.intensity / 100));
      }
    });

    elements.tiltShell.addEventListener("pointerdown", function (event) {
      if (event.button !== 0 || state.drag) {
        return;
      }
      var bounds = elements.tiltShell.getBoundingClientRect();
      state.drag = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        degreesPerPixelX: MAX_TILT * 2 / bounds.width,
        degreesPerPixelY: MAX_TILT * 2 / bounds.height
      };
      elements.tiltShell.classList.add("is-dragging");
      elements.tiltShell.setPointerCapture(event.pointerId);
      var normal = cardLightNormal();
      setHoloLight(normal.x, normal.y, true);
    });

    elements.tiltShell.addEventListener("pointermove", function (event) {
      var drag = state.drag;
      if (!drag) {
        if (event.pointerType === "mouse" && event.buttons === 0 && isHolographic(state.effect)) {
          var bounds = elements.tiltShell.getBoundingClientRect();
          if (bounds.width && bounds.height) {
            setHoloLight(
              clamp((event.clientX - bounds.left) / bounds.width * 2 - 1, -1, 1),
              clamp((event.clientY - bounds.top) / bounds.height * 2 - 1, -1, 1),
              true
            );
          }
        }
        return;
      }
      if (drag.pointerId !== event.pointerId) {
        return;
      }
      state.tiltY = clamp(state.tiltY + (event.clientX - drag.x) * drag.degreesPerPixelX, -MAX_TILT, MAX_TILT);
      state.tiltX = clamp(state.tiltX - (event.clientY - drag.y) * drag.degreesPerPixelY, -MAX_TILT, MAX_TILT);
      drag.x = event.clientX;
      drag.y = event.clientY;
      updateTiltVisuals();
    });

    elements.tiltShell.addEventListener("pointerleave", function () {
      if (!state.drag && isHolographic(state.effect)) {
        var normal = cardLightNormal();
        setHoloLight(normal.x, normal.y, true);
      }
    });
    reducedMotion.addEventListener("change", function () {
      if (reducedMotion.matches) {
        setHoloLight(holoLight.targetX, holoLight.targetY, false);
      }
    });

    function endPointer(event) {
      if (!state.drag || state.drag.pointerId !== event.pointerId) {
        return;
      }
      state.drag = null;
      elements.tiltShell.classList.remove("is-dragging");
    }
    elements.tiltShell.addEventListener("pointerup", endPointer);
    elements.tiltShell.addEventListener("pointercancel", endPointer);
    elements.tiltShell.addEventListener("lostpointercapture", endPointer);

    elements.tiltShell.addEventListener("keydown", function (event) {
      if (event.key === "+" || event.key === "=" || event.key === "-") {
        event.preventDefault();
        setZoom(state.zoom * (event.key === "-" ? 1 / 1.1 : 1.1));
        return;
      }
      var handled = true;
      if (event.key === "ArrowLeft") {
        state.tiltY = clamp(state.tiltY - KEYBOARD_TILT_STEP, -MAX_TILT, MAX_TILT);
      } else if (event.key === "ArrowRight") {
        state.tiltY = clamp(state.tiltY + KEYBOARD_TILT_STEP, -MAX_TILT, MAX_TILT);
      } else if (event.key === "ArrowUp") {
        state.tiltX = clamp(state.tiltX + KEYBOARD_TILT_STEP, -MAX_TILT, MAX_TILT);
      } else if (event.key === "ArrowDown") {
        state.tiltX = clamp(state.tiltX - KEYBOARD_TILT_STEP, -MAX_TILT, MAX_TILT);
      } else if (event.key === "Home") {
        state.tiltX = 0;
        state.tiltY = 0;
      } else {
        handled = false;
      }
      if (handled) {
        event.preventDefault();
        updateTiltVisuals();
      }
    });

    elements.resetTilt.addEventListener("click", function () {
      state.tiltX = 0;
      state.tiltY = 0;
      updateTiltVisuals();
    });

    ["dragenter", "dragover"].forEach(function (eventName) {
      elements.dropZone.addEventListener(eventName, function (event) {
        event.preventDefault();
        elements.dropZone.classList.add("is-dragover");
      });
    });

    ["dragleave", "drop"].forEach(function (eventName) {
      elements.dropZone.addEventListener(eventName, function (event) {
        event.preventDefault();
        elements.dropZone.classList.remove("is-dragover");
      });
    });

    elements.dropZone.addEventListener("drop", function (event) {
      readPsdFile(event.dataTransfer.files[0]);
    });
  }

  setMaterialTextures();
  state.layers = createSampleLayers();
  bindInteractions();
  renderAll();
}());
