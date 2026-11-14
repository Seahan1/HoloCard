(function () {
  "use strict";

  var MAX_FILE_BYTES = 120 * 1024 * 1024;
  var MAX_DOCUMENT_EDGE = 6000;
  var MAX_DOCUMENT_PIXELS = 30000000;
  var MAX_LAYER_EDGE = 7000;
  var MAX_LAYER_COUNT = 120;
  var MAX_LAYER_PIXELS = 60000000;
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
    pointerActive: false,
    toastTimer: null
  };

  var elements = {
    input: document.getElementById("psdInput"),
    documentName: document.getElementById("documentName"),
    documentMeta: document.getElementById("documentMeta"),
    layerCount: document.getElementById("layerCount"),
    layerList: document.getElementById("layerList"),
    selectedLayerName: document.getElementById("selectedLayerName"),
    cardContent: document.getElementById("cardContent"),
    card: document.getElementById("card"),
    tiltShell: document.getElementById("tiltShell"),
    resetTilt: document.getElementById("resetTilt"),
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

  function renderCard() {
    elements.cardContent.replaceChildren();
    var renderable = state.layers.filter(function (layer) {
      return !layer.isGroup && layer.canvas && !layer.hidden;
    }).slice().reverse();

    renderable.forEach(function (layer) {
      layer.canvas.className = "document-layer";
      layer.canvas.setAttribute("aria-hidden", "true");
      layer.canvas.style.opacity = String(layer.opacity);
      layer.canvas.style.mixBlendMode = blendModeToCss(layer.blendMode);
      setPositionStyles(layer.canvas, layer);
      elements.cardContent.appendChild(layer.canvas);

      if (layer.id === state.selectedId) {
        var effect = document.createElement("div");
        var maskUrl = layer.canvas.toDataURL("image/png");
        effect.className = "material-effect effect-" + state.effect;
        effect.setAttribute("aria-hidden", "true");
        effect.style.setProperty("--effect-strength", String(state.intensity / 100));
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

  function renderLayerList() {
    elements.layerList.replaceChildren();
    state.layers.forEach(function (layer) {
      var item = document.createElement("button");
      item.type = "button";
      item.className = "layer-item";
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", layer.id === state.selectedId ? "true" : "false");
      item.style.paddingLeft = (9 + layer.depth * 13) + "px";

      if (layer.id === state.selectedId) {
        item.classList.add("is-selected");
      }
      if (!layer.supported || layer.isGroup) {
        item.classList.add("is-unsupported");
        item.setAttribute("aria-disabled", "true");
      }

      var thumb = document.createElement("span");
      thumb.className = "layer-thumb";
      if (layer.canvas) {
        var image = document.createElement("img");
        image.src = layer.canvas.toDataURL("image/png");
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

      var visibility = document.createElement("span");
      visibility.className = "layer-visibility";
      visibility.title = layer.hidden ? "PSD 中已隐藏" : "PSD 中可见";
      visibility.appendChild(makeEyeIcon(layer.hidden));

      item.appendChild(thumb);
      item.appendChild(copy);
      item.appendChild(visibility);

      if (layer.supported && !layer.isGroup) {
        item.addEventListener("click", function () {
          state.selectedId = layer.id;
          renderAll();
        });
      }
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

  function updateTiltVisuals() {
    elements.tiltShell.style.transform = "rotateX(" + state.tiltX + "deg) rotateY(" + state.tiltY + "deg)";
    var shineX = clamp(50 + state.tiltY * 2.7, 8, 92);
    var shineY = clamp(50 - state.tiltX * 2.7, 8, 92);
    elements.cardContent.style.setProperty("--shine-x", shineX + "%");
    elements.cardContent.style.setProperty("--shine-y", shineY + "%");
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
    if (layer.children && layer.children.length) {
      return "图层组";
    }
    if (supported) {
      return layer.hidden ? "像素图层 · 已隐藏" : "像素图层";
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

  function parseLayerRecords(nodes, depth, records, sequence) {
    nodes.forEach(function (layer) {
      var id = "psd-layer-" + sequence.value;
      sequence.value += 1;
      var isGroup = Boolean(layer.children && layer.children.length);
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

      records.push({
        id: id,
        name: layer.name || "未命名图层",
        hidden: Boolean(layer.hidden),
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
      });

      if (isGroup) {
        parseLayerRecords(layer.children, depth + 1, records, sequence);
      }
    });
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
      parseLayerRecords(psd.children || [], 0, records, { value: 0 });
      var selectable = records.filter(function (layer) {
        return layer.supported && !layer.hidden;
      });
      if (!selectable.length) {
        throw new Error("未找到可应用特效的普通可见像素图层，请先栅格化目标图层");
      }

      state.documentWidth = psd.width;
      state.documentHeight = psd.height;
      state.documentName = file.name;
      state.layers = records;
      state.selectedId = selectable[0].id;
      state.tiltX = 0;
      state.tiltY = 0;
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
      if (event.button !== 0) {
        return;
      }
      state.pointerActive = true;
      elements.tiltShell.classList.add("is-dragging");
      elements.tiltShell.setPointerCapture(event.pointerId);
    });

    elements.tiltShell.addEventListener("pointermove", function (event) {
      if (!state.pointerActive) {
        return;
      }
      var bounds = elements.tiltShell.getBoundingClientRect();
      var horizontal = clamp((event.clientX - bounds.left) / bounds.width, 0, 1);
      var vertical = clamp((event.clientY - bounds.top) / bounds.height, 0, 1);
      state.tiltY = (horizontal - 0.5) * 28;
      state.tiltX = (0.5 - vertical) * 28;
      updateTiltVisuals();
    });

    function endPointer() {
      state.pointerActive = false;
      elements.tiltShell.classList.remove("is-dragging");
    }
    elements.tiltShell.addEventListener("pointerup", endPointer);
    elements.tiltShell.addEventListener("pointercancel", endPointer);

    elements.tiltShell.addEventListener("keydown", function (event) {
      var handled = true;
      if (event.key === "ArrowLeft") {
        state.tiltY = clamp(state.tiltY - 2, -14, 14);
      } else if (event.key === "ArrowRight") {
        state.tiltY = clamp(state.tiltY + 2, -14, 14);
      } else if (event.key === "ArrowUp") {
        state.tiltX = clamp(state.tiltX + 2, -14, 14);
      } else if (event.key === "ArrowDown") {
        state.tiltX = clamp(state.tiltX - 2, -14, 14);
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

  state.layers = createSampleLayers();
  bindInteractions();
  renderAll();
}());
