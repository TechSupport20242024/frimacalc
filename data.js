// FrimaCalc — フリマアプリ手数料・送料データ
// 最終更新: 2026年4月7日（2025年11月10日料金改定反映済み）
// 料金改定時はこのファイルのみ更新すればOK

const FRIMA_DATA = {
  mercari: {
    name: "メルカリ",
    commissionRate: 0.10,
    commissionType: "fixed",
    commissionLabel: "10%",
    transferFee: 200,
    transferFeeOptions: [
      { label: "銀行振込（200円）", value: 200 },
    ],
    shippingGroups: [
      {
        groupName: "らくらくメルカリ便（ヤマト運輸）",
        methods: [
          { name: "ネコポス", cost: 210, material: 0, materialNote: "", sizeCategory: "nekopos", sizeNote: "3辺60cm以内、長辺34cm、厚さ3cm、1kg" },
          { name: "宅急便コンパクト", cost: 450, material: 70, materialNote: "専用BOX 70円（ヤマト営業所・セブン-イレブン・ファミリーマート・メルカリストア）", sizeCategory: "compact", sizeNote: "20×25×5cm / 24.8×34cm薄型" },
          { name: "宅急便 60サイズ", cost: 750, material: 0, materialNote: "", sizeCategory: "60", sizeNote: "3辺合計60cm以内、2kg" },
          { name: "宅急便 80サイズ", cost: 850, material: 0, materialNote: "", sizeCategory: "80", sizeNote: "3辺合計80cm以内、5kg" },
          { name: "宅急便 100サイズ", cost: 1050, material: 0, materialNote: "", sizeCategory: "100", sizeNote: "3辺合計100cm以内、10kg" },
          { name: "宅急便 120サイズ", cost: 1200, material: 0, materialNote: "", sizeCategory: "120", sizeNote: "3辺合計120cm以内、15kg" },
          { name: "宅急便 140サイズ", cost: 1450, material: 0, materialNote: "", sizeCategory: "140", sizeNote: "3辺合計140cm以内、20kg" },
          { name: "宅急便 160サイズ", cost: 1700, material: 0, materialNote: "", sizeCategory: "160", sizeNote: "3辺合計160cm以内、25kg" },
        ]
      },
      {
        groupName: "ゆうゆうメルカリ便（日本郵便）",
        methods: [
          { name: "ゆうパケットポストmini", cost: 160, material: 20, materialNote: "専用封筒 20円（郵便局）", sizeCategory: "mini", sizeNote: "21.6×17.8cm、2kg" },
          { name: "ゆうパケットポスト", cost: 215, material: 65, materialNote: "専用資材 65円（郵便局・ローソン・メルカリストア）", sizeCategory: "packet-post", sizeNote: "3辺60cm以内、長辺34cm、2kg" },
          { name: "ゆうパケット", cost: 230, material: 0, materialNote: "", sizeCategory: "packet", sizeNote: "A4、厚さ3cm、1kg" },
          { name: "ゆうパケットプラス", cost: 455, material: 65, materialNote: "専用箱 65円（郵便局・ローソン・メルカリストア）", sizeCategory: "packet-plus", sizeNote: "24×17×7cm、2kg" },
          { name: "ゆうパック 60サイズ", cost: 750, material: 0, materialNote: "", sizeCategory: "60", sizeNote: "3辺合計60cm以内" },
          { name: "ゆうパック 80サイズ", cost: 850, material: 0, materialNote: "", sizeCategory: "80", sizeNote: "3辺合計80cm以内" },
          { name: "ゆうパック 100サイズ", cost: 1050, material: 0, materialNote: "", sizeCategory: "100", sizeNote: "3辺合計100cm以内" },
          { name: "ゆうパック 120サイズ", cost: 1200, material: 0, materialNote: "", sizeCategory: "120", sizeNote: "3辺合計120cm以内" },
          { name: "ゆうパック 140サイズ", cost: 1400, material: 0, materialNote: "", sizeCategory: "140", sizeNote: "3辺合計140cm以内" },
          { name: "ゆうパック 160サイズ", cost: 1600, material: 0, materialNote: "", sizeCategory: "160", sizeNote: "3辺合計160cm以内" },
          { name: "ゆうパック 170サイズ", cost: 1900, material: 0, materialNote: "", sizeCategory: "170", sizeNote: "3辺合計170cm以内、25kg" },
        ]
      }
    ]
  },

  rakuma: {
    name: "ラクマ",
    commissionRate: 0.10,
    commissionType: "variable",
    commissionLabel: "4.5%〜10%（変動制）",
    commissionOptions: [
      { label: "10%（デフォルト）", value: 0.10 },
      { label: "9%", value: 0.09 },
      { label: "8%", value: 0.08 },
      { label: "7%", value: 0.07 },
      { label: "6%", value: 0.06 },
      { label: "4.5%（最安）", value: 0.045 },
    ],
    transferFee: 210,
    transferFeeOptions: [
      { label: "楽天銀行（1万円以上）→ 無料", value: 0 },
      { label: "楽天銀行（1万円未満）→ 210円", value: 210 },
      { label: "その他の銀行 → 210円", value: 210 },
    ],
    shippingGroups: [
      {
        groupName: "かんたんラクマパック（ヤマト運輸）",
        methods: [
          { name: "ネコポス", cost: 200, material: 0, materialNote: "", sizeCategory: "nekopos", sizeNote: "A4、厚さ2.5cm、1kg" },
          { name: "宅急便コンパクト", cost: 530, material: 70, materialNote: "専用BOX 70円（ヤマト営業所・セブン-イレブン・ファミリーマート）", sizeCategory: "compact", sizeNote: "20×25×5cm / 24.8×34cm薄型" },
          { name: "宅急便 60サイズ", cost: 800, material: 0, materialNote: "", sizeCategory: "60", sizeNote: "3辺合計60cm以内、2kg" },
          { name: "宅急便 80サイズ", cost: 900, material: 0, materialNote: "", sizeCategory: "80", sizeNote: "3辺合計80cm以内、5kg" },
          { name: "宅急便 100サイズ", cost: 1150, material: 0, materialNote: "", sizeCategory: "100", sizeNote: "3辺合計100cm以内、10kg" },
          { name: "宅急便 120サイズ", cost: 1350, material: 0, materialNote: "", sizeCategory: "120", sizeNote: "3辺合計120cm以内、15kg" },
          { name: "宅急便 140サイズ", cost: 1550, material: 0, materialNote: "", sizeCategory: "140", sizeNote: "3辺合計140cm以内、20kg" },
          { name: "宅急便 160サイズ", cost: 1800, material: 0, materialNote: "", sizeCategory: "160", sizeNote: "3辺合計160cm以内、25kg" },
          { name: "宅急便 180サイズ", cost: 2100, material: 0, materialNote: "", sizeCategory: "180", sizeNote: "3辺合計180cm以内、30kg" },
          { name: "宅急便 200サイズ", cost: 2500, material: 0, materialNote: "", sizeCategory: "200", sizeNote: "3辺合計200cm以内、30kg" },
        ]
      },
      {
        groupName: "かんたんラクマパック（日本郵便）",
        methods: [
          { name: "ゆうパケットポスト", cost: 175, material: 0, materialNote: "", sizeCategory: "packet-post", sizeNote: "3辺60cm以内、長辺34cm、2kg" },
          { name: "ゆうパケット", cost: 180, material: 0, materialNote: "", sizeCategory: "packet", sizeNote: "3辺60cm以内、厚さ3cm、1kg" },
          { name: "ゆうパケットプラス", cost: 380, material: 65, materialNote: "専用箱 65円（郵便局・ローソン）", sizeCategory: "packet-plus", sizeNote: "24×17×7cm、2kg" },
          { name: "ゆうパック 60サイズ", cost: 700, material: 0, materialNote: "", sizeCategory: "60", sizeNote: "3辺合計60cm以内、2kg" },
          { name: "ゆうパック 80サイズ", cost: 800, material: 0, materialNote: "", sizeCategory: "80", sizeNote: "3辺合計80cm以内、5kg" },
          { name: "ゆうパック 100サイズ", cost: 1150, material: 0, materialNote: "", sizeCategory: "100", sizeNote: "3辺合計100cm以内、10kg" },
          { name: "ゆうパック 120サイズ", cost: 1350, material: 0, materialNote: "", sizeCategory: "120", sizeNote: "3辺合計120cm以内、15kg" },
          { name: "ゆうパック 140サイズ", cost: 1500, material: 0, materialNote: "", sizeCategory: "140", sizeNote: "3辺合計140cm以内、20kg" },
          { name: "ゆうパック 160サイズ", cost: 1500, material: 0, materialNote: "", sizeCategory: "160", sizeNote: "3辺合計160cm以内、25kg" },
          { name: "ゆうパック 170サイズ", cost: 1500, material: 0, materialNote: "", sizeCategory: "170", sizeNote: "3辺合計170cm以内、25kg" },
        ]
      }
    ]
  },

  yahooFurima: {
    name: "Yahoo!フリマ",
    commissionRate: 0.05,
    commissionType: "fixed",
    commissionLabel: "5%",
    transferFee: 100,
    transferFeeOptions: [
      { label: "PayPay残高/PayPay銀行 → 無料", value: 0 },
      { label: "その他の銀行 → 100円", value: 100 },
    ],
    shippingGroups: [
      {
        groupName: "おてがる配送（ヤマト運輸）",
        methods: [
          { name: "ネコポス", cost: 210, material: 0, materialNote: "", sizeCategory: "nekopos", sizeNote: "3辺60cm以内、長辺34cm、厚さ3cm、1kg" },
          { name: "宅急便コンパクト", cost: 490, material: 70, materialNote: "専用BOX 70円（ヤマト営業所・セブン-イレブン・ファミリーマート）", sizeCategory: "compact", sizeNote: "20×25×5cm / 24.8×34cm薄型" },
          { name: "宅急便 60サイズ", cost: 750, material: 0, materialNote: "", sizeCategory: "60", sizeNote: "3辺合計60cm以内、2kg" },
          { name: "宅急便 80サイズ", cost: 850, material: 0, materialNote: "", sizeCategory: "80", sizeNote: "3辺合計80cm以内、5kg" },
          { name: "宅急便 100サイズ", cost: 1050, material: 0, materialNote: "", sizeCategory: "100", sizeNote: "3辺合計100cm以内、10kg" },
          { name: "宅急便 120サイズ", cost: 1200, material: 0, materialNote: "", sizeCategory: "120", sizeNote: "3辺合計120cm以内、15kg" },
          { name: "宅急便 140サイズ", cost: 1400, material: 0, materialNote: "", sizeCategory: "140", sizeNote: "3辺合計140cm以内、20kg" },
          { name: "宅急便 160サイズ", cost: 1700, material: 0, materialNote: "", sizeCategory: "160", sizeNote: "3辺合計160cm以内、25kg" },
        ]
      },
      {
        groupName: "おてがる配送（日本郵便）",
        methods: [
          { name: "ゆうパケットポストmini", cost: 160, material: 0, materialNote: "", sizeCategory: "mini", sizeNote: "小型" },
          { name: "ゆうパケットポスト", cost: 210, material: 0, materialNote: "", sizeCategory: "packet-post", sizeNote: "3辺60cm以内、長辺34cm、2kg" },
          { name: "ゆうパケット", cost: 215, material: 0, materialNote: "", sizeCategory: "packet", sizeNote: "3辺60cm以内、厚さ3cm、1kg" },
          { name: "ゆうパケットプラス", cost: 380, material: 65, materialNote: "専用箱 65円（郵便局・ローソン）", sizeCategory: "packet-plus", sizeNote: "17×24×7cm、2kg" },
          { name: "ゆうパック 60サイズ", cost: 750, material: 0, materialNote: "", sizeCategory: "60", sizeNote: "3辺合計60cm以内、2kg" },
          { name: "ゆうパック 80サイズ", cost: 850, material: 0, materialNote: "", sizeCategory: "80", sizeNote: "3辺合計80cm以内、5kg" },
          { name: "ゆうパック 100サイズ", cost: 1050, material: 0, materialNote: "", sizeCategory: "100", sizeNote: "3辺合計100cm以内、10kg" },
          { name: "ゆうパック 120サイズ", cost: 1200, material: 0, materialNote: "", sizeCategory: "120", sizeNote: "3辺合計120cm以内、15kg" },
          { name: "ゆうパック 140サイズ", cost: 1400, material: 0, materialNote: "", sizeCategory: "140", sizeNote: "3辺合計140cm以内、20kg" },
          { name: "ゆうパック 160サイズ", cost: 1700, material: 0, materialNote: "", sizeCategory: "160", sizeNote: "3辺合計160cm以内、25kg" },
          { name: "ゆうパック 170サイズ", cost: 1900, material: 0, materialNote: "", sizeCategory: "170", sizeNote: "3辺合計170cm以内、25kg" },
        ]
      }
    ]
  }
};

// 横断比較用サイズカテゴリ定義
const SIZE_CATEGORIES = [
  { key: "mini", label: "極小（ゆうパケットポストmini相当）", description: "封筒サイズ" },
  { key: "nekopos", label: "小型（ネコポス/ゆうパケット相当）", description: "A4・厚さ3cm以内" },
  { key: "compact", label: "コンパクト（宅急便コンパクト相当）", description: "専用BOX・厚さ5〜7cm" },
  { key: "60", label: "60サイズ", description: "3辺合計60cm以内" },
  { key: "80", label: "80サイズ", description: "3辺合計80cm以内" },
  { key: "100", label: "100サイズ", description: "3辺合計100cm以内" },
  { key: "120", label: "120サイズ", description: "3辺合計120cm以内" },
  { key: "140", label: "140サイズ", description: "3辺合計140cm以内" },
  { key: "160", label: "160サイズ", description: "3辺合計160cm以内" },
  { key: "170", label: "170サイズ", description: "3辺合計170cm以内" },
];
