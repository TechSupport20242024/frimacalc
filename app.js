// FrimaCalc — 計算ロジック・UI制御

// ==========================================
// 計算関数（純粋関数）
// ==========================================

/**
 * 売値から利益を算出
 */
function calcProfit({ price, cost, commissionRate, shippingCost, materialCost, transferFee }) {
  const commission = Math.floor(price * commissionRate);
  const totalDeduction = commission + shippingCost + materialCost + transferFee;
  const totalCost = cost + totalDeduction;
  const profit = price - totalCost;
  const profitRate = price > 0 ? (profit / price) * 100 : 0;
  return { price, commission, shippingCost, materialCost, transferFee, cost, totalCost, profit, profitRate };
}

/**
 * 目標利益から必要売値を逆算
 */
function calcRequiredPrice({ targetProfit, cost, commissionRate, shippingCost, materialCost, transferFee }) {
  // profit = price - cost - floor(price * rate) - shipping - material - transfer
  // price - floor(price * rate) >= targetProfit + cost + shipping + material + transfer
  // price * (1 - rate) >= needed  →  price >= needed / (1 - rate)
  const needed = targetProfit + cost + shippingCost + materialCost + transferFee;
  let price = Math.ceil(needed / (1 - commissionRate));

  // floor切り捨て誤差の補正: 検算して目標を満たすか確認
  let result = calcProfit({ price, cost, commissionRate, shippingCost, materialCost, transferFee });
  if (result.profit < targetProfit) {
    price += 1;
    result = calcProfit({ price, cost, commissionRate, shippingCost, materialCost, transferFee });
  }
  return result;
}

/**
 * 横断比較: 指定サイズカテゴリで各アプリの最安配送を探し利益を算出
 */
function calcComparison({ sizeCategory, price, cost, includeTransfer, rakumaCommissionRate }) {
  const results = [];

  for (const [appKey, appData] of Object.entries(FRIMA_DATA)) {
    // 該当サイズカテゴリの配送方法を全グループから探す
    const candidates = [];
    for (const group of appData.shippingGroups) {
      for (const method of group.methods) {
        if (method.sizeCategory === sizeCategory) {
          candidates.push({ ...method, groupName: group.groupName });
        }
      }
    }

    if (candidates.length === 0) {
      results.push({
        appKey,
        appName: appData.name,
        available: false,
      });
      continue;
    }

    // 最安の配送方法を選択（送料+資材費の合計で比較）
    candidates.sort((a, b) => (a.cost + a.material) - (b.cost + b.material));
    const best = candidates[0];

    const commissionRate = appKey === "rakuma" ? rakumaCommissionRate : appData.commissionRate;

    // 振込手数料: 含める場合は最安オプション（通常0円がある）
    let transferFee = 0;
    if (includeTransfer) {
      const minTransfer = Math.min(...appData.transferFeeOptions.map(o => o.value));
      transferFee = minTransfer;
    }

    const result = calcProfit({
      price,
      cost,
      commissionRate,
      shippingCost: best.cost,
      materialCost: best.material,
      transferFee,
    });

    results.push({
      appKey,
      appName: appData.name,
      available: true,
      shippingName: best.name,
      shippingGroupName: best.groupName,
      materialCost: best.material,
      materialNote: best.materialNote,
      commissionRate,
      transferFee,
      ...result,
    });
  }

  // 利益順にソート（利用可能なもののみ）
  results.sort((a, b) => {
    if (!a.available) return 1;
    if (!b.available) return -1;
    return b.profit - a.profit;
  });

  return results;
}


// ==========================================
// UI制御
// ==========================================

// 安全なDOM要素生成ヘルパー（innerHTML不使用）
function createEl(tag, className, textContent) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (textContent !== undefined) el.textContent = textContent;
  return el;
}

let currentMode = "profit"; // "profit" | "price" | "compare"

// 数値フォーマット（3桁カンマ区切り）
function formatYen(n) {
  if (n === null || n === undefined || isNaN(n)) return "—";
  const sign = n < 0 ? "-" : "";
  return sign + Math.abs(n).toLocaleString("ja-JP") + "円";
}

function formatPercent(n) {
  return n.toFixed(1) + "%";
}

// ==========================================
// 初期化
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
  initAppSelect();
  initCompareSizeSelect();
  initCompareRakumaCommission();
  bindEvents();
});

function initAppSelect() {
  const sel = document.getElementById("app-select");
  for (const [key, data] of Object.entries(FRIMA_DATA)) {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = `${data.name}（手数料 ${data.commissionLabel}）`;
    sel.appendChild(opt);
  }
}

function initCompareSizeSelect() {
  const sel = document.getElementById("compare-size");
  sel.replaceChildren();
  for (const cat of SIZE_CATEGORIES) {
    const opt = document.createElement("option");
    opt.value = cat.key;
    opt.textContent = `${cat.label} — ${cat.description}`;
    sel.appendChild(opt);
  }
}

function initCompareRakumaCommission() {
  const sel = document.getElementById("compare-rakuma-commission");
  sel.replaceChildren();
  for (const opt of FRIMA_DATA.rakuma.commissionOptions) {
    const el = document.createElement("option");
    el.value = opt.value;
    el.textContent = opt.label;
    sel.appendChild(el);
  }
}

// ==========================================
// イベントバインド
// ==========================================

function bindEvents() {
  // タブ切替
  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => switchMode(tab.dataset.mode));
  });

  // アプリ選択
  document.getElementById("app-select").addEventListener("change", onAppSelect);

  // 配送方法選択
  document.getElementById("shipping-select").addEventListener("change", onShippingSelect);

  // リアルタイム計算（単一モード）
  const singleInputs = ["input-price", "input-cost", "input-target-profit"];
  singleInputs.forEach(id => {
    document.getElementById(id).addEventListener("input", calculateSingle);
  });

  document.getElementById("commission-select").addEventListener("change", calculateSingle);
  document.getElementById("transfer-select").addEventListener("change", calculateSingle);
  document.getElementById("include-material").addEventListener("change", calculateSingle);
  document.getElementById("include-transfer").addEventListener("change", () => {
    const show = document.getElementById("include-transfer").checked;
    document.getElementById("transfer-group").style.display = show ? "block" : "none";
    calculateSingle();
  });

  // リアルタイム計算（横断比較）
  const compareInputs = ["compare-price", "compare-cost"];
  compareInputs.forEach(id => {
    document.getElementById(id).addEventListener("input", calculateCompare);
  });
  document.getElementById("compare-size").addEventListener("change", calculateCompare);
  document.getElementById("compare-rakuma-commission").addEventListener("change", calculateCompare);
  document.getElementById("compare-include-transfer").addEventListener("change", calculateCompare);
}

// ==========================================
// モード切替
// ==========================================

function switchMode(mode) {
  currentMode = mode;

  // タブUI更新
  document.querySelectorAll(".tab").forEach(tab => {
    const isActive = tab.dataset.mode === mode;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", isActive);
  });

  // パネル表示
  const singlePanel = document.getElementById("mode-single");
  const comparePanel = document.getElementById("mode-compare");

  if (mode === "compare") {
    singlePanel.classList.remove("active");
    comparePanel.classList.add("active");
    calculateCompare();
  } else {
    singlePanel.classList.add("active");
    comparePanel.classList.remove("active");

    // 売値/目標利益の入力欄切替
    document.getElementById("price-group").style.display = mode === "profit" ? "block" : "none";
    document.getElementById("target-profit-group").style.display = mode === "price" ? "block" : "none";

    calculateSingle();
  }
}

// ==========================================
// アプリ選択時の動的UI生成
// ==========================================

function onAppSelect() {
  const appKey = document.getElementById("app-select").value;
  if (!appKey) {
    const shipSel = document.getElementById("shipping-select");
    shipSel.replaceChildren();
    shipSel.appendChild(createEl("option", "", "先にアプリを選択"));
    document.getElementById("commission-group").style.display = "none";
    document.getElementById("transfer-group").style.display = "none";
    document.getElementById("result-single").style.display = "none";
    return;
  }

  const appData = FRIMA_DATA[appKey];

  // 手数料率セレクト（ラクマのみ）
  const commissionGroup = document.getElementById("commission-group");
  const commissionSelect = document.getElementById("commission-select");
  if (appData.commissionType === "variable") {
    commissionGroup.style.display = "block";
    commissionSelect.replaceChildren();
    for (const opt of appData.commissionOptions) {
      const el = document.createElement("option");
      el.value = opt.value;
      el.textContent = opt.label;
      commissionSelect.appendChild(el);
    }
  } else {
    commissionGroup.style.display = "none";
  }

  // 振込先セレクト
  const transferSelect = document.getElementById("transfer-select");
  transferSelect.replaceChildren();
  for (const opt of appData.transferFeeOptions) {
    const el = document.createElement("option");
    el.value = opt.value;
    el.textContent = opt.label;
    transferSelect.appendChild(el);
  }
  // 振込手数料チェック状態に応じて表示
  const showTransfer = document.getElementById("include-transfer").checked;
  document.getElementById("transfer-group").style.display = showTransfer ? "block" : "none";

  // 配送方法セレクト
  const shippingSelect = document.getElementById("shipping-select");
  shippingSelect.replaceChildren();
  const defaultOpt = createEl("option", "", "選択してください");
  defaultOpt.value = "";
  shippingSelect.appendChild(defaultOpt);

  for (const group of appData.shippingGroups) {
    const optgroup = document.createElement("optgroup");
    optgroup.label = group.groupName;
    for (let i = 0; i < group.methods.length; i++) {
      const method = group.methods[i];
      const totalCost = method.cost + method.material;
      const opt = document.createElement("option");
      opt.value = `${group.groupName}|${i}`;
      opt.textContent = `${method.name}（${totalCost.toLocaleString()}円${method.material > 0 ? " ※資材込" : ""}）`;
      optgroup.appendChild(opt);
    }
    shippingSelect.appendChild(optgroup);
  }

  onShippingSelect();
  calculateSingle();
}

// ==========================================
// 配送方法選択時
// ==========================================

function onShippingSelect() {
  const method = getSelectedShippingMethod();

  // サイズ情報
  const sizeInfo = document.getElementById("size-info");
  const sizeText = document.getElementById("size-info-text");
  if (method && method.sizeNote) {
    sizeText.textContent = method.sizeNote;
    sizeInfo.style.display = "block";
  } else {
    sizeInfo.style.display = "none";
  }

  // 専用資材情報
  const materialInfo = document.getElementById("material-info");
  const materialCostLabel = document.getElementById("material-cost-label");
  const materialNote = document.getElementById("material-note");
  if (method && method.material > 0) {
    materialCostLabel.textContent = method.material;
    materialNote.textContent = method.materialNote || "";
    materialInfo.style.display = "block";
    document.getElementById("include-material").checked = true;
  } else {
    materialInfo.style.display = "none";
  }

  calculateSingle();
}

function getSelectedShippingMethod() {
  const appKey = document.getElementById("app-select").value;
  const shippingVal = document.getElementById("shipping-select").value;
  if (!appKey || !shippingVal) return null;

  const [groupName, indexStr] = shippingVal.split("|");
  const appData = FRIMA_DATA[appKey];
  const group = appData.shippingGroups.find(g => g.groupName === groupName);
  if (!group) return null;
  return group.methods[parseInt(indexStr)];
}

// ==========================================
// 単一モード計算
// ==========================================

function calculateSingle() {
  const appKey = document.getElementById("app-select").value;
  const method = getSelectedShippingMethod();
  if (!appKey || !method) {
    document.getElementById("result-single").style.display = "none";
    return;
  }

  const appData = FRIMA_DATA[appKey];

  // 手数料率
  let commissionRate;
  if (appData.commissionType === "variable") {
    commissionRate = parseFloat(document.getElementById("commission-select").value);
  } else {
    commissionRate = appData.commissionRate;
  }

  // 送料・資材費
  const shippingCost = method.cost;
  const includeMaterial = document.getElementById("include-material").checked && method.material > 0;
  const materialCost = includeMaterial ? method.material : 0;

  // 振込手数料
  const includeTransfer = document.getElementById("include-transfer").checked;
  const transferFee = includeTransfer ? parseInt(document.getElementById("transfer-select").value) : 0;

  // 原価
  const cost = parseInt(document.getElementById("input-cost").value) || 0;

  let result;
  if (currentMode === "profit") {
    const price = parseInt(document.getElementById("input-price").value) || 0;
    result = calcProfit({ price, cost, commissionRate, shippingCost, materialCost, transferFee });
    renderSingleResult(result, "profit");
  } else if (currentMode === "price") {
    const targetProfit = parseInt(document.getElementById("input-target-profit").value) || 0;
    result = calcRequiredPrice({ targetProfit, cost, commissionRate, shippingCost, materialCost, transferFee });
    renderSingleResult(result, "price");
  }
}

// ==========================================
// 単一モード結果レンダリング
// ==========================================

function renderSingleResult(result, mode) {
  const resultArea = document.getElementById("result-single");
  const mainCard = document.getElementById("result-main-card");
  const mainLabel = document.getElementById("result-main-label");
  const mainValue = document.getElementById("result-main-value");
  const subValue = document.getElementById("result-sub-value");

  resultArea.style.display = "block";

  // メインカード
  mainCard.className = "result-main";
  if (mode === "profit") {
    mainLabel.textContent = "利益";
    mainValue.textContent = formatYen(result.profit);
    subValue.textContent = `利益率 ${formatPercent(result.profitRate)}`;
    if (result.profit > 0) mainCard.classList.add("profit-positive");
    else if (result.profit < 0) mainCard.classList.add("profit-negative");
    else mainCard.classList.add("profit-zero");
  } else {
    mainLabel.textContent = "必要な売値";
    mainValue.textContent = formatYen(result.price);
    subValue.textContent = `利益 ${formatYen(result.profit)}（利益率 ${formatPercent(result.profitRate)}）`;
    mainCard.classList.add("profit-positive");
  }

  // 内訳テーブル
  const tbody = document.getElementById("breakdown-body");
  tbody.replaceChildren();

  const rows = [
    ["原価（仕入れ値）", formatYen(result.cost)],
    ["販売手数料", formatYen(result.commission)],
    ["送料", formatYen(result.shippingCost)],
  ];

  if (result.materialCost > 0) {
    rows.push(["専用資材費", formatYen(result.materialCost)]);
  }

  if (result.transferFee > 0) {
    rows.push(["振込手数料", formatYen(result.transferFee)]);
  }

  for (const [label, value] of rows) {
    const tr = document.createElement("tr");
    const tdLabel = document.createElement("td");
    tdLabel.textContent = label;
    const tdValue = document.createElement("td");
    tdValue.className = "text-right";
    tdValue.textContent = value;
    tr.appendChild(tdLabel);
    tr.appendChild(tdValue);
    tbody.appendChild(tr);
  }

  document.getElementById("result-total-cost").textContent = formatYen(result.totalCost);
}

// ==========================================
// 横断比較計算
// ==========================================

function calculateCompare() {
  const sizeCategory = document.getElementById("compare-size").value;
  const price = parseInt(document.getElementById("compare-price").value) || 0;
  const cost = parseInt(document.getElementById("compare-cost").value) || 0;
  const includeTransfer = document.getElementById("compare-include-transfer").checked;
  const rakumaCommissionRate = parseFloat(document.getElementById("compare-rakuma-commission").value);

  if (price === 0) {
    document.getElementById("result-compare").style.display = "none";
    return;
  }

  const results = calcComparison({ sizeCategory, price, cost, includeTransfer, rakumaCommissionRate });
  renderCompareResults(results);
}

// ==========================================
// 横断比較結果レンダリング
// ==========================================

function renderCompareResults(results) {
  const resultArea = document.getElementById("result-compare");
  const container = document.getElementById("compare-cards");

  resultArea.style.display = "block";
  container.replaceChildren();

  const rankLabels = ["1位", "2位", "3位", "4位", "5位"];

  results.forEach((r, i) => {
    const card = document.createElement("div");
    card.className = "compare-card";

    if (!r.available) {
      const header = createEl("div", "compare-card-header");
      header.appendChild(createEl("span", "compare-app-name", r.appName));
      card.appendChild(header);
      card.appendChild(createEl("p", "compare-no-shipping", "このサイズの配送方法なし"));
      container.appendChild(card);
      return;
    }

    if (i === 0 && r.profit >= 0) card.classList.add("best");
    if (r.profit < 0) card.classList.add("loss");

    const commissionLabel = r.appKey === "rakuma"
      ? `手数料${(r.commissionRate * 100).toFixed(1)}%`
      : `手数料${(r.commissionRate * 100).toFixed(0)}%`;

    const header = createEl("div", "compare-card-header");
    header.appendChild(createEl("span", "compare-app-name", r.appName));
    header.appendChild(createEl("span", "compare-rank", rankLabels[i] || ""));
    card.appendChild(header);

    card.appendChild(createEl("div", "compare-shipping-name", `${r.shippingGroupName} — ${r.shippingName}`));
    card.appendChild(createEl("div", "compare-profit", formatYen(r.profit)));

    const details = createEl("div", "compare-details");
    details.appendChild(createEl("span", "", `${commissionLabel}: ${formatYen(r.commission)}`));
    details.appendChild(createEl("span", "", `送料: ${formatYen(r.shippingCost)}`));
    if (r.materialCost > 0) details.appendChild(createEl("span", "", `資材: ${formatYen(r.materialCost)}`));
    if (r.transferFee > 0) details.appendChild(createEl("span", "", `振込: ${formatYen(r.transferFee)}`));
    card.appendChild(details);

    container.appendChild(card);
  });
}
