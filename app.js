// FrimaCalc — 一問一答ウィザード形式

// ==========================================
// 計算関数（純粋関数）
// ==========================================

function calcProfit({ price, cost, commissionRate, shippingCost, materialCost, transferFee }) {
  const commission = Math.floor(price * commissionRate);
  const totalDeduction = commission + shippingCost + materialCost + transferFee;
  const totalCost = cost + totalDeduction;
  const profit = price - totalCost;
  const profitRate = price > 0 ? (profit / price) * 100 : 0;
  return { price, commission, shippingCost, materialCost, transferFee, cost, totalCost, profit, profitRate };
}

function calcRequiredPrice({ targetProfit, cost, commissionRate, shippingCost, materialCost, transferFee }) {
  const needed = targetProfit + cost + shippingCost + materialCost + transferFee;
  let price = Math.ceil(needed / (1 - commissionRate));
  let result = calcProfit({ price, cost, commissionRate, shippingCost, materialCost, transferFee });
  if (result.profit < targetProfit) {
    price += 1;
    result = calcProfit({ price, cost, commissionRate, shippingCost, materialCost, transferFee });
  }
  return result;
}

function calcComparison({ sizeCategory, price, cost, includeTransfer, rakumaCommissionRate }) {
  const results = [];
  for (const [appKey, appData] of Object.entries(FRIMA_DATA)) {
    const candidates = [];
    for (const group of appData.shippingGroups) {
      for (const method of group.methods) {
        if (method.sizeCategory === sizeCategory) candidates.push({ ...method, groupName: group.groupName });
      }
    }
    if (candidates.length === 0) { results.push({ appKey, appName: appData.name, available: false }); continue; }
    candidates.sort((a, b) => (a.cost + a.material) - (b.cost + b.material));
    const best = candidates[0];
    const commissionRate = appKey === "rakuma" ? rakumaCommissionRate : appData.commissionRate;
    let transferFee = 0;
    if (includeTransfer) { transferFee = Math.min(...appData.transferFeeOptions.map(o => o.value)); }
    const result = calcProfit({ price, cost, commissionRate, shippingCost: best.cost, materialCost: best.material, transferFee });
    results.push({ appKey, appName: appData.name, available: true, shippingName: best.name, shippingGroupName: best.groupName, materialCost: best.material, commissionRate, transferFee, ...result });
  }
  results.sort((a, b) => { if (!a.available) return 1; if (!b.available) return -1; return b.profit - a.profit; });
  return results;
}

// ==========================================
// DOM ヘルパー
// ==========================================

function createEl(tag, className, textContent) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (textContent !== undefined) el.textContent = textContent;
  return el;
}

function formatYen(n) {
  if (n === null || n === undefined || isNaN(n)) return "\u2014";
  const sign = n < 0 ? "-" : "";
  return sign + Math.abs(n).toLocaleString("ja-JP") + "\u5186";
}

function formatPercent(n) { return n.toFixed(1) + "%"; }

// ==========================================
// ウィザード状態管理
// ==========================================

const state = {
  mode: null,           // "profit" | "price" | "compare"
  appKey: null,
  commissionRate: null,
  shippingGroup: null,
  shippingIndex: null,
  shippingMethod: null,
  includeMaterial: true,
  transferFee: 0,
  price: 0,
  cost: 0,
  targetProfit: 0,
  // 横断比較用
  sizeCategory: null,
  rakumaCommissionRate: 0.10,
  includeTransfer: true,
};

let currentStep = 0;
let stepHistory = [];

function getSteps() {
  if (state.mode === "compare") {
    return ["mode", "sizeCategory", "rakumaCommission", "comparePrice", "compareCost", "result"];
  }
  const steps = ["mode", "app"];
  if (state.appKey === "rakuma") steps.push("commission");
  steps.push("shipping");
  // 専用資材確認は配送方法選択後に動的判定
  if (state.shippingMethod && state.shippingMethod.material > 0) steps.push("material");
  steps.push("transfer");
  if (state.mode === "profit") steps.push("price");
  else steps.push("targetProfit");
  steps.push("cost", "result");
  return steps;
}

function getCurrentStepName() {
  const steps = getSteps();
  return steps[currentStep] || "mode";
}

function getTotalSteps() {
  return getSteps().length;
}

function updateProgress() {
  const total = getTotalSteps();
  const pct = Math.min(100, Math.round((currentStep / (total - 1)) * 100));
  document.getElementById("progress-fill").style.width = pct + "%";
}

// ==========================================
// ウィザード描画
// ==========================================

function renderStep() {
  const area = document.getElementById("wizard-area");
  const resultArea = document.getElementById("result-area");
  const navButtons = document.getElementById("nav-buttons");
  area.replaceChildren();
  resultArea.replaceChildren();
  resultArea.style.display = "none";

  const stepName = getCurrentStepName();
  updateProgress();
  updateSummary();

  navButtons.style.display = currentStep > 0 ? "flex" : "none";

  switch (stepName) {
    case "mode": renderModeStep(area); break;
    case "app": renderAppStep(area); break;
    case "commission": renderCommissionStep(area); break;
    case "shipping": renderShippingStep(area); break;
    case "material": renderMaterialStep(area); break;
    case "transfer": renderTransferStep(area); break;
    case "price": renderPriceStep(area); break;
    case "targetProfit": renderTargetProfitStep(area); break;
    case "cost": renderCostStep(area); break;
    case "sizeCategory": renderSizeCategoryStep(area); break;
    case "rakumaCommission": renderRakumaCommissionStep(area); break;
    case "comparePrice": renderComparePriceStep(area); break;
    case "compareCost": renderCompareCostStep(area); break;
    case "result": renderResult(area, resultArea); break;
  }
}

function advance(stepName) {
  stepHistory.push(currentStep);
  currentStep++;
  // ステップリストが変わる可能性があるので再計算
  const steps = getSteps();
  // 現在のステップ名が期待と違う場合はスキップ/調整
  if (currentStep >= steps.length) currentStep = steps.length - 1;
  renderStep();
}

function goBack() {
  if (stepHistory.length > 0) {
    currentStep = stepHistory.pop();
    renderStep();
  }
}

function restart() {
  state.mode = null;
  state.appKey = null;
  state.commissionRate = null;
  state.shippingGroup = null;
  state.shippingIndex = null;
  state.shippingMethod = null;
  state.includeMaterial = true;
  state.transferFee = 0;
  state.price = 0;
  state.cost = 0;
  state.targetProfit = 0;
  state.sizeCategory = null;
  state.rakumaCommissionRate = 0.10;
  state.includeTransfer = true;
  currentStep = 0;
  stepHistory = [];
  renderStep();
}

// ==========================================
// サマリーバー
// ==========================================

function updateSummary() {
  const bar = document.getElementById("summary-bar");
  bar.replaceChildren();
  const tags = [];

  if (state.mode === "profit") tags.push("売値→利益");
  else if (state.mode === "price") tags.push("利益→売値");
  else if (state.mode === "compare") tags.push("横断比較");

  if (state.mode === "compare") {
    if (state.sizeCategory) {
      const cat = SIZE_CATEGORIES.find(c => c.key === state.sizeCategory);
      if (cat) tags.push(cat.label);
    }
  } else {
    if (state.appKey) tags.push(FRIMA_DATA[state.appKey].name);
    if (state.shippingMethod) tags.push(state.shippingMethod.name);
  }

  if (tags.length === 0) { bar.style.display = "none"; return; }
  bar.style.display = "flex";
  tags.forEach(t => bar.appendChild(createEl("span", "summary-tag", t)));
}

// ==========================================
// 各ステップの描画
// ==========================================

function renderModeStep(area) {
  area.appendChild(createEl("div", "step-question", "何を計算しますか？"));

  const list = createEl("div", "choice-list");

  const modes = [
    { key: "profit", main: "売値から利益を計算", detail: "売値を入力 → 利益がわかる" },
    { key: "price", main: "目標利益から売値を逆算", detail: "欲しい利益を入力 → 必要な売値がわかる" },
    { key: "compare", main: "3アプリを横断比較", detail: "同じ条件で各アプリの利益を比較" },
  ];

  modes.forEach(m => {
    const btn = createEl("button", "choice-btn");
    btn.appendChild(createEl("div", "choice-main", m.main));
    btn.appendChild(createEl("div", "choice-detail", m.detail));
    btn.addEventListener("click", () => { state.mode = m.key; advance(); });
    list.appendChild(btn);
  });

  area.appendChild(list);
}

function renderAppStep(area) {
  area.appendChild(createEl("div", "step-question", "どのフリマアプリですか？"));

  const list = createEl("div", "choice-list");
  for (const [key, data] of Object.entries(FRIMA_DATA)) {
    const btn = createEl("button", "choice-btn");
    btn.appendChild(createEl("div", "choice-main", data.name));
    btn.appendChild(createEl("div", "choice-detail", "手数料 " + data.commissionLabel));
    btn.addEventListener("click", () => {
      state.appKey = key;
      state.commissionRate = data.commissionRate;
      advance();
    });
    list.appendChild(btn);
  }
  area.appendChild(list);
}

function renderCommissionStep(area) {
  area.appendChild(createEl("div", "step-question", "ラクマの手数料率は？"));
  area.appendChild(createEl("div", "step-sub", "前月の販売実績で決まります。わからない場合は10%を選択。"));

  const list = createEl("div", "choice-list");
  FRIMA_DATA.rakuma.commissionOptions.forEach(opt => {
    const btn = createEl("button", "choice-btn");
    btn.appendChild(createEl("div", "choice-main", opt.label));
    btn.addEventListener("click", () => { state.commissionRate = opt.value; advance(); });
    list.appendChild(btn);
  });
  area.appendChild(list);
}

function renderShippingStep(area) {
  const appData = FRIMA_DATA[state.appKey];
  area.appendChild(createEl("div", "step-question", "配送方法は？"));

  const list = createEl("div", "choice-list");
  appData.shippingGroups.forEach(group => {
    const groupLabel = createEl("div", "step-sub", group.groupName);
    groupLabel.style.marginTop = "8px";
    list.appendChild(groupLabel);

    group.methods.forEach((method, idx) => {
      const totalShip = method.cost + method.material;
      const btn = createEl("button", "choice-btn");
      btn.appendChild(createEl("div", "choice-main", method.name + "\u3000" + totalShip.toLocaleString() + "\u5186"));
      btn.appendChild(createEl("div", "choice-detail", method.sizeNote));
      btn.addEventListener("click", () => {
        state.shippingGroup = group.groupName;
        state.shippingIndex = idx;
        state.shippingMethod = method;
        state.includeMaterial = method.material > 0;
        advance();
      });
      list.appendChild(btn);
    });
  });
  area.appendChild(list);
}

function renderMaterialStep(area) {
  const method = state.shippingMethod;
  area.appendChild(createEl("div", "step-question", "専用資材費（" + method.material + "円）を含めますか？"));
  if (method.materialNote) {
    area.appendChild(createEl("div", "step-sub", method.materialNote));
  }

  const list = createEl("div", "choice-list");
  const btnYes = createEl("button", "choice-btn");
  btnYes.appendChild(createEl("div", "choice-main", "含める（" + method.material + "円加算）"));
  btnYes.addEventListener("click", () => { state.includeMaterial = true; advance(); });
  list.appendChild(btnYes);

  const btnNo = createEl("button", "choice-btn");
  btnNo.appendChild(createEl("div", "choice-main", "含めない（既に持っている）"));
  btnNo.addEventListener("click", () => { state.includeMaterial = false; advance(); });
  list.appendChild(btnNo);

  area.appendChild(list);
}

function renderTransferStep(area) {
  const appData = FRIMA_DATA[state.appKey];
  area.appendChild(createEl("div", "step-question", "振込先は？"));

  const list = createEl("div", "choice-list");
  appData.transferFeeOptions.forEach(opt => {
    const btn = createEl("button", "choice-btn");
    btn.appendChild(createEl("div", "choice-main", opt.label));
    btn.addEventListener("click", () => { state.transferFee = opt.value; advance(); });
    list.appendChild(btn);
  });

  // 振込手数料を含めない選択
  const btnNone = createEl("button", "choice-btn");
  btnNone.appendChild(createEl("div", "choice-main", "振込手数料を含めない"));
  btnNone.appendChild(createEl("div", "choice-detail", "まとめて振り込む場合など"));
  btnNone.addEventListener("click", () => { state.transferFee = 0; advance(); });
  list.appendChild(btnNone);

  area.appendChild(list);
}

function renderNumberInput(area, question, placeholder, onSubmit) {
  area.appendChild(createEl("div", "step-question", question));

  const inputDiv = createEl("div", "input-step");
  const wrapper = createEl("div", "input-with-unit");
  const input = document.createElement("input");
  input.type = "number";
  input.inputMode = "numeric";
  input.min = "0";
  input.step = "1";
  input.placeholder = placeholder;
  wrapper.appendChild(input);
  wrapper.appendChild(createEl("span", "unit", "\u5186"));
  inputDiv.appendChild(wrapper);

  const btn = createEl("button", "btn-submit", "\u6B21\u3078");
  btn.disabled = true;
  input.addEventListener("input", () => {
    btn.disabled = !input.value || parseInt(input.value) < 0;
  });
  btn.addEventListener("click", () => {
    const val = parseInt(input.value) || 0;
    onSubmit(val);
  });
  inputDiv.appendChild(btn);
  area.appendChild(inputDiv);

  // フォーカス
  setTimeout(() => input.focus(), 100);
}

function renderPriceStep(area) {
  renderNumberInput(area, "売値（税込）はいくらですか？", "2000", (val) => {
    state.price = val;
    advance();
  });
}

function renderTargetProfitStep(area) {
  renderNumberInput(area, "目標利益はいくらですか？", "1000", (val) => {
    state.targetProfit = val;
    advance();
  });
}

function renderCostStep(area) {
  renderNumberInput(area, "原価（仕入れ値）はいくらですか？", "500", (val) => {
    state.cost = val;
    advance();
  });
}

// ==========================================
// 横断比較ステップ
// ==========================================

function renderSizeCategoryStep(area) {
  area.appendChild(createEl("div", "step-question", "商品の配送サイズは？"));

  const list = createEl("div", "choice-list");
  SIZE_CATEGORIES.forEach(cat => {
    const btn = createEl("button", "choice-btn");
    btn.appendChild(createEl("div", "choice-main", cat.label));
    btn.appendChild(createEl("div", "choice-detail", cat.description));
    btn.addEventListener("click", () => { state.sizeCategory = cat.key; advance(); });
    list.appendChild(btn);
  });
  area.appendChild(list);
}

function renderRakumaCommissionStep(area) {
  area.appendChild(createEl("div", "step-question", "ラクマの手数料率は？"));
  area.appendChild(createEl("div", "step-sub", "横断比較でのラクマ手数料。わからない場合は10%。"));

  const list = createEl("div", "choice-list");
  FRIMA_DATA.rakuma.commissionOptions.forEach(opt => {
    const btn = createEl("button", "choice-btn");
    btn.appendChild(createEl("div", "choice-main", opt.label));
    btn.addEventListener("click", () => { state.rakumaCommissionRate = opt.value; advance(); });
    list.appendChild(btn);
  });
  area.appendChild(list);
}

function renderComparePriceStep(area) {
  renderNumberInput(area, "売値（税込）はいくらですか？", "2000", (val) => {
    state.price = val;
    advance();
  });
}

function renderCompareCostStep(area) {
  renderNumberInput(area, "原価（仕入れ値）はいくらですか？", "500", (val) => {
    state.cost = val;
    advance();
  });
}

// ==========================================
// 結果表示
// ==========================================

function renderResult(area, resultArea) {
  area.replaceChildren();
  resultArea.style.display = "block";

  if (state.mode === "compare") {
    renderCompareResult(resultArea);
  } else {
    renderSingleResult(resultArea);
  }
}

function renderSingleResult(resultArea) {
  const method = state.shippingMethod;
  const materialCost = state.includeMaterial ? method.material : 0;

  let result;
  if (state.mode === "profit") {
    result = calcProfit({
      price: state.price, cost: state.cost, commissionRate: state.commissionRate,
      shippingCost: method.cost, materialCost, transferFee: state.transferFee,
    });
  } else {
    result = calcRequiredPrice({
      targetProfit: state.targetProfit, cost: state.cost, commissionRate: state.commissionRate,
      shippingCost: method.cost, materialCost, transferFee: state.transferFee,
    });
  }

  // メインカード
  const mainCard = createEl("div", "result-main");
  if (state.mode === "profit") {
    mainCard.appendChild(createEl("div", "result-label", "\u5229\u76CA"));
    mainCard.appendChild(createEl("div", "result-value", formatYen(result.profit)));
    mainCard.appendChild(createEl("div", "result-sub", "\u5229\u76CA\u7387 " + formatPercent(result.profitRate)));
    if (result.profit > 0) mainCard.classList.add("profit-positive");
    else if (result.profit < 0) mainCard.classList.add("profit-negative");
    else mainCard.classList.add("profit-zero");
  } else {
    mainCard.appendChild(createEl("div", "result-label", "\u5FC5\u8981\u306A\u58F2\u5024"));
    mainCard.appendChild(createEl("div", "result-value", formatYen(result.price)));
    mainCard.appendChild(createEl("div", "result-sub", "\u5229\u76CA " + formatYen(result.profit) + "\uFF08\u5229\u76CA\u7387 " + formatPercent(result.profitRate) + "\uFF09"));
    mainCard.classList.add("profit-positive");
  }
  resultArea.appendChild(mainCard);

  // 内訳
  const breakdown = createEl("div", "result-breakdown");
  breakdown.appendChild(createEl("h3", "", "\u5185\u8A33"));
  const table = document.createElement("table");
  table.className = "breakdown-table";
  const tbody = document.createElement("tbody");

  const rows = [
    ["\u539F\u4FA1\uFF08\u4ED5\u5165\u308C\u5024\uFF09", formatYen(result.cost)],
    ["\u8CA9\u58F2\u624B\u6570\u6599", formatYen(result.commission)],
    ["\u9001\u6599", formatYen(result.shippingCost)],
  ];
  if (result.materialCost > 0) rows.push(["\u5C02\u7528\u8CC7\u6750\u8CBB", formatYen(result.materialCost)]);
  if (result.transferFee > 0) rows.push(["\u632F\u8FBC\u624B\u6570\u6599", formatYen(result.transferFee)]);

  rows.forEach(([label, value]) => {
    const tr = document.createElement("tr");
    const tdL = document.createElement("td"); tdL.textContent = label;
    const tdV = document.createElement("td"); tdV.className = "text-right"; tdV.textContent = value;
    tr.appendChild(tdL); tr.appendChild(tdV);
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);

  const tfoot = document.createElement("tfoot");
  const trTotal = document.createElement("tr"); trTotal.className = "breakdown-total";
  const tdTL = document.createElement("td"); tdTL.textContent = "\u7DCF\u30B3\u30B9\u30C8";
  const tdTV = document.createElement("td"); tdTV.className = "text-right"; tdTV.textContent = formatYen(result.totalCost);
  trTotal.appendChild(tdTL); trTotal.appendChild(tdTV);
  tfoot.appendChild(trTotal);
  table.appendChild(tfoot);

  breakdown.appendChild(table);
  resultArea.appendChild(breakdown);
}

function renderCompareResult(resultArea) {
  const results = calcComparison({
    sizeCategory: state.sizeCategory,
    price: state.price,
    cost: state.cost,
    includeTransfer: true,
    rakumaCommissionRate: state.rakumaCommissionRate,
  });

  const rankLabels = ["1\u4F4D", "2\u4F4D", "3\u4F4D"];

  results.forEach((r, i) => {
    const card = createEl("div", "compare-card");

    if (!r.available) {
      const header = createEl("div", "compare-card-header");
      header.appendChild(createEl("span", "compare-app-name", r.appName));
      card.appendChild(header);
      card.appendChild(createEl("p", "compare-no-shipping", "\u3053\u306E\u30B5\u30A4\u30BA\u306E\u914D\u9001\u65B9\u6CD5\u306A\u3057"));
      resultArea.appendChild(card);
      return;
    }

    if (i === 0 && r.profit >= 0) card.classList.add("best");
    if (r.profit < 0) card.classList.add("loss");

    const commLabel = r.appKey === "rakuma"
      ? "\u624B\u6570\u6599" + (r.commissionRate * 100).toFixed(1) + "%"
      : "\u624B\u6570\u6599" + (r.commissionRate * 100).toFixed(0) + "%";

    const header = createEl("div", "compare-card-header");
    header.appendChild(createEl("span", "compare-app-name", r.appName));
    header.appendChild(createEl("span", "compare-rank", rankLabels[i] || ""));
    card.appendChild(header);
    card.appendChild(createEl("div", "compare-shipping-name", r.shippingGroupName + " \u2014 " + r.shippingName));
    card.appendChild(createEl("div", "compare-profit", formatYen(r.profit)));

    const details = createEl("div", "compare-details");
    details.appendChild(createEl("span", "", commLabel + ": " + formatYen(r.commission)));
    details.appendChild(createEl("span", "", "\u9001\u6599: " + formatYen(r.shippingCost)));
    if (r.materialCost > 0) details.appendChild(createEl("span", "", "\u8CC7\u6750: " + formatYen(r.materialCost)));
    if (r.transferFee > 0) details.appendChild(createEl("span", "", "\u632F\u8FBC: " + formatYen(r.transferFee)));
    card.appendChild(details);

    resultArea.appendChild(card);
  });
}

// ==========================================
// 初期化
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btn-back").addEventListener("click", goBack);
  document.getElementById("btn-restart").addEventListener("click", restart);
  renderStep();
});
