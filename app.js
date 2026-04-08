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
  mode: null,           // "profit" | "price" | "compare_price" | "compare_profit" | "compare_best"
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

function isCompareMode() {
  return state.mode === "compare_price" || state.mode === "compare_profit" || state.mode === "compare_best";
}

function getSteps() {
  if (state.mode === "compare_price") {
    // 同じ売値で各アプリの利益を比較
    return ["mode", "sizeCategory", "rakumaCommission", "comparePrice", "compareCost", "result"];
  }
  if (state.mode === "compare_profit") {
    // 同じ利益を得るための売値を各アプリで比較
    return ["mode", "sizeCategory", "rakumaCommission", "compareTargetProfit", "compareCost", "result"];
  }
  if (state.mode === "compare_best") {
    // 一番手残りが多いアプリを探す
    return ["mode", "sizeCategory", "rakumaCommission", "comparePrice", "compareCost", "result"];
  }
  const steps = ["mode", "app"];
  if (state.appKey === "rakuma") steps.push("commission");
  steps.push("shipping");
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
  const container = document.getElementById("step-indicator");
  container.replaceChildren();

  const total = getTotalSteps();
  // 結果ステップは含めずにドット表示（結果は「完了」扱い）
  const dotCount = total - 1;

  for (let i = 0; i < dotCount; i++) {
    const dot = createEl("span", "step-dot");
    if (i < currentStep) dot.classList.add("done");
    else if (i === currentStep) dot.classList.add("current");
    else dot.classList.add("upcoming");
    container.appendChild(dot);
  }

  // 残りステップ数のラベル
  const remaining = dotCount - currentStep;
  if (remaining > 0 && currentStep < dotCount) {
    container.appendChild(createEl("span", "step-label", "\u3042\u3068" + remaining + "\u30B9\u30C6\u30C3\u30D7"));
  } else if (currentStep >= dotCount) {
    container.appendChild(createEl("span", "step-label", "\u5B8C\u4E86\uFF01"));
  }
}

// ==========================================
// ウィザード描画
// ==========================================

function renderStep() {
  // 画面トップにスクロール
  window.scrollTo(0, 0);

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

  // 常時リセットリンク（ステップ1以降で表示）
  const resetLink = document.getElementById("reset-link");
  resetLink.style.display = currentStep > 0 ? "block" : "none";

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
    case "compareTargetProfit": renderCompareTargetProfitStep(area); break;
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
  else if (state.mode === "compare_price") tags.push("横断比較：利益");
  else if (state.mode === "compare_profit") tags.push("横断比較：売値");
  else if (state.mode === "compare_best") tags.push("最もお得なアプリ");

  if (isCompareMode()) {
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
  area.appendChild(createEl("div", "step-question", "あなたが知りたいことは？"));
  area.appendChild(createEl("div", "step-sub", "一番近いものを選んでください"));

  const list = createEl("div", "choice-list");

  const modes = [
    {
      key: "profit",
      main: "この値段で売ったら、手元にいくら残る？",
      detail: "売値と原価を入れるだけで、手数料・送料を引いた利益がわかります"
    },
    {
      key: "price",
      main: "〇〇円の利益が欲しい。いくらで売ればいい？",
      detail: "欲しい利益を入れると、必要な売値を自動で計算します"
    },
    {
      key: "compare_price",
      main: "同じ値段で出品したら、どのアプリが一番お得？",
      detail: "メルカリ・ラクマ・Yahoo!フリマで手元に残る金額を比較します"
    },
    {
      key: "compare_profit",
      main: "〇〇円の利益を出すには、どのアプリが一番安く売れる？",
      detail: "同じ利益を得るために必要な売値を、各アプリで比較します"
    },
    {
      key: "compare_best",
      main: "とにかく一番手残りが多いアプリを教えて！",
      detail: "売値と原価を入れるだけで、最もお得なアプリと配送方法がわかります"
    },
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
  area.appendChild(createEl("div", "step-question", "どのフリマアプリに出品しますか？"));

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
  area.appendChild(createEl("div", "step-question", "\u3069\u306E\u65B9\u6CD5\u3067\u767A\u9001\u3057\u307E\u3059\u304B\uFF1F"));
  area.appendChild(createEl("div", "step-sub", "\u9001\u6599\u306F\u5168\u56FD\u4E00\u5F8B\u3067\u3059\u3002\u5C02\u7528\u306E\u7BB1\u3084\u5C01\u7B52\u304C\u5FC5\u8981\u306A\u3082\u306E\u306B\u306F\u5370\u304C\u3064\u3044\u3066\u3044\u307E\u3059\u3002"));

  const list = createEl("div", "choice-list");
  appData.shippingGroups.forEach(group => {
    const groupLabel = createEl("div", "step-sub", group.groupName);
    groupLabel.style.marginTop = "8px";
    list.appendChild(groupLabel);

    group.methods.forEach((method, idx) => {
      const totalShip = method.cost + method.material;
      const btn = createEl("button", "choice-btn");

      // メイン行：名前と金額
      const mainLine = createEl("div", "choice-main");
      mainLine.textContent = method.name + "\u3000" + totalShip.toLocaleString() + "\u5186";

      // 専用資材バッジ
      if (method.material > 0) {
        const badge = createEl("span", "material-badge", "\u5C02\u7528\u8CC7\u6750\u304C\u5FC5\u8981");
        mainLine.appendChild(badge);
      }
      btn.appendChild(mainLine);

      // 詳細行
      const detailText = method.sizeNote;
      if (method.material > 0) {
        btn.appendChild(createEl("div", "choice-detail", detailText + "\uFF5C\u8CC7\u6750\u4EE3 " + method.material + "\u5186\u304C\u5225\u9014\u304B\u304B\u308A\u307E\u3059"));
      } else {
        btn.appendChild(createEl("div", "choice-detail", detailText));
      }

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

  // 質問（常に目立つ）
  area.appendChild(createEl("div", "step-question", method.name + " には専用の箱（または封筒）が必要です"));
  area.appendChild(createEl("div", "step-sub", "資材代 " + method.material + "円を費用に含めますか？"));

  // ヘルプカード（購入場所の詳細）
  if (method.materialNote) {
    const helpCard = buildHelpCard({
      type: "warning",
      icon: "?",
      title: "専用資材ってなに？どこで買えるの？",
      hint: "ここをタップすると詳しい説明が読めます",
      buildBody: (body) => {
        body.appendChild(createEl("p", "", method.name + " で発送するには、専用の箱や封筒（" + method.material + "円）を事前にお店で購入する必要があります。普通のダンボールや封筒は使えません。"));
        body.appendChild(createEl("p", "", "以下のお店で購入できます："));
        const match = method.materialNote.match(/[（(](.+?)[）)]/);
        if (match) {
          const shopList = document.createElement("ul");
          shopList.className = "shop-list";
          match[1].split(/[・、,]/).forEach(shop => {
            const li = document.createElement("li");
            li.textContent = shop.trim();
            shopList.appendChild(li);
          });
          body.appendChild(shopList);
        }
      }
    });
    area.appendChild(helpCard);
  }

  const list = createEl("div", "choice-list");
  const btnYes = createEl("button", "choice-btn");
  btnYes.appendChild(createEl("div", "choice-main", "はい、含めて計算する"));
  btnYes.appendChild(createEl("div", "choice-detail", "まだ資材を持っていないので、購入費用も含めたい"));
  btnYes.addEventListener("click", () => { state.includeMaterial = true; advance(); });
  list.appendChild(btnYes);

  const btnNo = createEl("button", "choice-btn");
  btnNo.appendChild(createEl("div", "choice-main", "いいえ、含めない"));
  btnNo.appendChild(createEl("div", "choice-detail", "すでに専用資材を持っているので、含めなくてOK"));
  btnNo.addEventListener("click", () => { state.includeMaterial = false; advance(); });
  list.appendChild(btnNo);

  area.appendChild(list);
}

// ヘルプカード生成ユーティリティ
function buildHelpCard({ type, icon, title, hint, buildBody }) {
  const card = createEl("div", "help-card" + (type ? " " + type : ""));

  const header = createEl("div", "help-card-header");
  const iconEl = createEl("div", "help-card-icon", icon);
  const textEl = createEl("div", "help-card-text");
  textEl.appendChild(createEl("div", "help-card-title", title));
  textEl.appendChild(createEl("div", "help-card-hint", hint));
  const arrow = createEl("div", "help-card-arrow", "\u25BC");

  header.appendChild(iconEl);
  header.appendChild(textEl);
  header.appendChild(arrow);
  card.appendChild(header);

  const body = createEl("div", "help-card-body");
  buildBody(body);
  card.appendChild(body);

  header.addEventListener("click", () => { card.classList.toggle("open"); });
  return card;
}

function renderTransferStep(area) {
  const appData = FRIMA_DATA[state.appKey];
  area.appendChild(createEl("div", "step-question", "売上金はどこに振り込みますか？"));

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
  area.appendChild(createEl("div", "step-question", "送る商品の大きさは？"));
  area.appendChild(createEl("div", "step-sub", "だいたいの大きさでOKです"));

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
  area.appendChild(createEl("div", "step-question", "ラクマの手数料率を教えてください"));
  area.appendChild(createEl("div", "step-sub", "ラクマは販売実績で手数料が変わります。わからない場合は「10%」を選んでください"));

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
  const q = state.mode === "compare_best"
    ? "いくらで出品する予定ですか？"
    : "各アプリで同じ売値にするとしたら、いくらですか？";
  renderNumberInput(area, q, "2000", (val) => {
    state.price = val;
    advance();
  });
}

function renderCompareTargetProfitStep(area) {
  renderNumberInput(area, "いくらの利益が欲しいですか？", "1000", (val) => {
    state.targetProfit = val;
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

  if (state.mode === "compare_price" || state.mode === "compare_best") {
    renderCompareResult(resultArea);
  } else if (state.mode === "compare_profit") {
    renderCompareProfitResult(resultArea);
  } else {
    renderSingleResult(resultArea);
  }

  // 結果画面の末尾に「もう一度計算する」ボタン
  const restartBtn = createEl("button", "btn-submit", "もう一度計算する");
  restartBtn.style.marginTop = "16px";
  restartBtn.addEventListener("click", restart);
  resultArea.appendChild(restartBtn);
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

  // やることリスト（専用資材が必要な場合・展開式）
  if (method.material > 0 && state.includeMaterial) {
    const todo = createEl("div", "todo-card");

    // ヘッダー（常に見える）
    const todoHeader = createEl("div", "todo-header");
    todoHeader.appendChild(createEl("div", "todo-badge", "3"));
    const todoText = createEl("div", "todo-header-text");
    todoText.appendChild(createEl("div", "todo-header-title", "出品前にやること（3つ）"));
    todoText.appendChild(createEl("div", "todo-header-hint", "タップすると手順を確認できます"));
    todoHeader.appendChild(todoText);
    todoHeader.appendChild(createEl("div", "todo-header-arrow", "\u25BC"));
    todo.appendChild(todoHeader);

    // ボディ（タップで展開）
    const todoBody = createEl("div", "todo-body");
    const todoList = document.createElement("ul");
    todoList.className = "todo-list";

    const li1 = document.createElement("li");
    li1.textContent = "専用の梱包資材を購入する（" + method.material + "円）";
    if (method.materialNote) {
      const match = method.materialNote.match(/[（(](.+?)[）)]/);
      if (match) li1.appendChild(createEl("div", "todo-detail", "購入場所：" + match[1]));
    }
    todoList.appendChild(li1);

    const li2 = document.createElement("li");
    li2.textContent = "専用資材に商品を梱包する";
    li2.appendChild(createEl("div", "todo-detail", "商品が傷つかないよう、緩衝材（プチプチ等）も入れましょう"));
    todoList.appendChild(li2);

    const li3 = document.createElement("li");
    li3.textContent = "コンビニまたは営業所から発送する";
    li3.appendChild(createEl("div", "todo-detail", "送料 " + formatYen(method.cost) + " は売上から自動で引かれます"));
    todoList.appendChild(li3);

    todoBody.appendChild(todoList);
    todo.appendChild(todoBody);

    todoHeader.addEventListener("click", () => { todo.classList.toggle("open"); });
    resultArea.appendChild(todo);
  }

  // 内訳テーブル（シンプル版）
  const breakdown = createEl("div", "result-breakdown");
  breakdown.appendChild(createEl("h3", "", "お金の内訳"));
  const table = document.createElement("table");
  table.className = "breakdown-table";
  const tbody = document.createElement("tbody");

  const rows = [
    { label: "原価（仕入れ値）", value: formatYen(result.cost), desc: "商品を買ったときの値段" },
    { label: "販売手数料", value: formatYen(result.commission), desc: "フリマアプリに支払う手数料（売上から自動で引かれます）" },
    { label: "送料", value: formatYen(result.shippingCost), desc: "配送にかかる費用（売上から自動で引かれます）" },
  ];
  if (result.materialCost > 0) rows.push({ label: "専用資材費", value: formatYen(result.materialCost), desc: "専用の箱や封筒の購入費用（自分で事前に買う必要があります）" });
  if (result.transferFee > 0) rows.push({ label: "振込手数料", value: formatYen(result.transferFee), desc: "売上金を銀行口座に振り込むときの手数料" });

  rows.forEach(row => {
    const tr = document.createElement("tr");
    const tdL = document.createElement("td"); tdL.textContent = row.label;
    const tdV = document.createElement("td"); tdV.className = "text-right"; tdV.textContent = row.value;
    tr.appendChild(tdL); tr.appendChild(tdV);
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);

  const tfoot = document.createElement("tfoot");
  const trTotal = document.createElement("tr"); trTotal.className = "breakdown-total";
  const tdTL = document.createElement("td"); tdTL.textContent = "総コスト";
  const tdTV = document.createElement("td"); tdTV.className = "text-right"; tdTV.textContent = formatYen(result.totalCost);
  trTotal.appendChild(tdTL); trTotal.appendChild(tdTV);
  tfoot.appendChild(trTotal);
  table.appendChild(tfoot);

  breakdown.appendChild(table);

  // 用語ヘルプ（展開式）
  const helpDescs = rows.map(r => ({ label: r.label, desc: r.desc }));
  const helpCard = buildHelpCard({
    type: "",
    icon: "?",
    title: "各項目の意味がわからない方へ",
    hint: "タップすると用語の説明が読めます",
    buildBody: (body) => {
      helpDescs.forEach(d => {
        const row = createEl("div", "breakdown-desc-row");
        const strong = document.createElement("strong");
        strong.textContent = d.label;
        row.appendChild(strong);
        row.appendChild(document.createTextNode("：" + d.desc));
        body.appendChild(row);
      });
    }
  });
  breakdown.appendChild(helpCard);
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

function renderCompareProfitResult(resultArea) {
  // 各アプリで目標利益を得るための必要売値を計算
  const results = [];
  for (const [appKey, appData] of Object.entries(FRIMA_DATA)) {
    const candidates = [];
    for (const group of appData.shippingGroups) {
      for (const method of group.methods) {
        if (method.sizeCategory === state.sizeCategory) candidates.push({ ...method, groupName: group.groupName });
      }
    }
    if (candidates.length === 0) { results.push({ appKey, appName: appData.name, available: false }); continue; }
    candidates.sort((a, b) => (a.cost + a.material) - (b.cost + b.material));
    const best = candidates[0];
    const commissionRate = appKey === "rakuma" ? state.rakumaCommissionRate : appData.commissionRate;
    const transferFee = Math.min(...appData.transferFeeOptions.map(o => o.value));
    const result = calcRequiredPrice({
      targetProfit: state.targetProfit, cost: state.cost, commissionRate,
      shippingCost: best.cost, materialCost: best.material, transferFee,
    });
    results.push({
      appKey, appName: appData.name, available: true,
      shippingName: best.name, shippingGroupName: best.groupName,
      commissionRate, ...result,
    });
  }
  // 必要売値が安い順にソート
  results.sort((a, b) => { if (!a.available) return 1; if (!b.available) return -1; return a.price - b.price; });

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
    if (i === 0) card.classList.add("best");
    const header = createEl("div", "compare-card-header");
    header.appendChild(createEl("span", "compare-app-name", r.appName));
    header.appendChild(createEl("span", "compare-rank", rankLabels[i] || ""));
    card.appendChild(header);
    card.appendChild(createEl("div", "compare-shipping-name", r.shippingGroupName + " \u2014 " + r.shippingName));

    const priceLabel = createEl("div", "compare-profit");
    priceLabel.textContent = formatYen(r.price) + "\u3067\u58F2\u308C\u3070OK";
    card.appendChild(priceLabel);

    const commLabel = r.appKey === "rakuma"
      ? "\u624B\u6570\u6599" + (r.commissionRate * 100).toFixed(1) + "%"
      : "\u624B\u6570\u6599" + (r.commissionRate * 100).toFixed(0) + "%";
    const details = createEl("div", "compare-details");
    details.appendChild(createEl("span", "", commLabel + ": " + formatYen(r.commission)));
    details.appendChild(createEl("span", "", "\u9001\u6599: " + formatYen(r.shippingCost)));
    details.appendChild(createEl("span", "", "\u5229\u76CA: " + formatYen(r.profit)));
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
  document.getElementById("btn-reset-always").addEventListener("click", restart);
  renderStep();
});
