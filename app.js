"use strict";

let pieChartInstance = null;
let playersData = [];
let jsonMeta = {};

// NetlifyにホスティングされたJSONのパス
const JSON_URL = "/data/players.json";

// ページ読み込み時に1回だけJSONを取得
fetch(JSON_URL)
  .then(res => {
    if (!res.ok) throw new Error(`JSONの取得に失敗: ${res.status}`);
    return res.json();
  })
  .then(data => {
    playersData = data.players;
    jsonMeta = {
      last_updated: data.last_updated,
      total_players: data.total_players
    };
    const updateStatusEl = document.getElementById("update-status");
    if (updateStatusEl) updateStatusEl.textContent = data.last_updated;
  })
  .catch(err => console.error("JSONの読み込みに失敗しました", err));

// =====================
// 円グラフ
// =====================
function createPieChart(data) {
  const ctx = document.getElementById("pie-chart").getContext("2d");
  if (pieChartInstance) pieChartInstance.destroy();

  pieChartInstance = new Chart(ctx, {
    type: "pie",
    data: {
      labels: ["1着率","1.5着率","2着率","2.5着率","3着率","3.5着率","4着率"],
      datasets:[{
        data:[
          data["1着率"]*100,
          data["1.5着率"]*100,
          data["2着率"]*100,
          data["2.5着率"]*100,
          data["3着率"]*100,
          data["3.5着率"]*100,
          data["4着率"]*100
        ],
        backgroundColor:[
          "rgba(240,122,122,1)",
          "rgba(240,158,109,1)",
          "rgba(240,217,109,1)",
          "rgba(181,217,109,1)",
          "rgba(109,194,122,1)",
          "rgba(109,194,181,1)",
          "rgba(109,158,217,1)"
        ]
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:true,
      plugins:{
        legend:{
          display:true,
          position:'left'
        }
      }
    }
  });
}

// =====================
// 年・月選択肢
// =====================
const yearSelect = document.getElementById("year-select");
const monthSelect = document.getElementById("month-select");
const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

for(let y=2025;y<=currentYear+1;y++){
  const opt=document.createElement("option");
  opt.value=y;
  opt.textContent=y;
  yearSelect.appendChild(opt);
}
yearSelect.value=currentYear;

for(let m=1;m<=12;m++){
  const opt=document.createElement("option");
  opt.value=m;
  opt.textContent=`${m}月`;
  monthSelect.appendChild(opt);
}
monthSelect.value=currentMonth;

// =====================
// ローディング関連
// =====================
const loadingArea = document.getElementById("loadingArea");
const loadingFill = document.getElementById("loadingFill");
const loadingText = document.getElementById("loadingText");
const updateStatusEl = document.getElementById("update-status");

let waitingForData = false;
let loadingStart = 0;
let loadingRaf = 0;
const LOADING_DURATION_MS = 3000; // JSON検索は速いので3秒に短縮

function startLoading() {
  const statusEl = document.getElementById("status-message");
  if (loadingArea && loadingFill && loadingText) {
    loadingArea.style.display = "flex";
    loadingFill.style.width = "0%";
    loadingText.style.display = "block";
    loadingText.textContent = "読み込みチュ...♡";
  } else {
    if (statusEl) statusEl.textContent = "ロード、チュ…♡";
  }

  if (updateStatusEl) updateStatusEl.textContent = "────────";

  waitingForData = true;
  loadingStart = performance.now();
  if (loadingRaf) cancelAnimationFrame(loadingRaf);
  loadingRaf = requestAnimationFrame(loadingTick);
}

function loadingTick(now){
  const elapsed = now - loadingStart;
  const pct = Math.min(100, (elapsed / LOADING_DURATION_MS) * 100);
  if (loadingFill) loadingFill.style.width = pct + "%";

  if (pct < 100) {
    loadingRaf = requestAnimationFrame(loadingTick);
  } else {
    if (waitingForData) {
      if (loadingText) loadingText.textContent = "もうちょっとまってほしい！";
    } else {
      stopLoading();
    }
  }
}

function stopLoading() {
  if (loadingRaf) cancelAnimationFrame(loadingRaf);
  if (loadingFill) loadingFill.style.width = "100%";

  setTimeout(() => {
    if (loadingArea) loadingArea.style.display = "none";
    if (loadingFill) loadingFill.style.width = "0%";
    if (loadingText) loadingText.style.display = "none";
  }, 220);
}

// =====================
// 検索イベント（ブラウザ内で完結・サーバー通信なし）
// =====================
document.getElementById("search-button").addEventListener("click", () => {
  const name = document.getElementById("name-input").value.trim();
  const year = yearSelect.value;
  const month = monthSelect.value;
  const status = document.getElementById("status-message");
  const results = document.getElementById("results");

  if (!name) {
    if (status) status.textContent = "名前を入力してねっ";
    if (results) results.style.display = "none";
    return;
  }

  if (playersData.length === 0) {
    if (status) status.textContent = "データを読み込み中です。少し待ってね";
    return;
  }

  startLoading();
  if (results) results.style.display = "none";
  if (status) status.textContent = "";

  try {
    // ブラウザ内JSONから検索（サーバー通信なし・一瞬）
    const data = playersData.find(p => p["名前"] === name);

    if (!data) {
      if (status) status.textContent = "選択した年月のデータは見つからないよっ";
      waitingForData = false;
      setTimeout(() => stopLoading(), 50);
      return;
    }

    // 更新状況
    if (updateStatusEl) updateStatusEl.textContent = jsonMeta.last_updated || "不明";

    if (results) results.style.display = "block";

    const periodEl = document.getElementById("period");
    if (periodEl) periodEl.textContent = `集計期間: ${year}/${String(month).padStart(2,'0')}/1 00:00 〜 ${jsonMeta.last_updated || "不明"}`;

    const visitorEl = document.getElementById("visitor-count");
    if (visitorEl) visitorEl.textContent = `集計人数: ${jsonMeta.total_players || "不明"} 人`;

    const memberEl = document.getElementById("member-info");
    if (memberEl) memberEl.textContent = `No. ${data["No."] ? String(data["No."]).padStart(4,'0') : "不明"}   ${data["名前"]}`;

    // ランキング
    createTable("ranking-table",[
      ["累計半荘数\nランキング","総スコア\nランキング","最高スコア\nランキング","平均スコア\nランキング","平均着順\nランキング"],
      [
        formatRank(data["累計半荘数ランキング"]),
        formatRank(data["総スコアランキング"]),
        formatRank(data["最高スコアランキング"]),
        formatRank(data["平均スコアランキング"]),
        formatRank(data["平均着順ランキング"])
      ]
    ],5);

    // スコアデータ
    createTable("scoredata-table",[
      ["累計半荘数","総スコア","最高スコア","平均スコア","平均着順"],
      [
        `${Number(data["累計半荘数"]).toFixed(0)}半荘`,
        `${Number(data["総スコア"]).toFixed(1)}pt`,
        `${Number(data["最高スコア"]).toFixed(1)}pt`,
        `${Number(data["平均スコア"]).toFixed(3)}pt`,
        `${Number(data["平均着順"]).toFixed(3)}位`
      ]
    ],5);

    // 先月比
    renderSengetsuTable(data);

    // 着順回数
    createTable("rank-count-table",[
      ["1着の回数","2着の回数","3着の回数","4着の回数"],
      [
        `${data["1着の回数"]||0}回`,
        `${data["2着の回数"]||0}回`,
        `${data["3着の回数"]||0}回`,
        `${data["4着の回数"]||0}回`
      ],
      ["1.5着の回数","2.5着の回数","3.5着の回数",""],
      [
        `${data["1.5着の回数"]||0}回`,
        `${data["2.5着の回数"]||0}回`,
        `${data["3.5着の回数"]||0}回`,
        ""
      ]
    ],4);

    // 円グラフ
    createPieChart(data);

  } catch (e) {
    console.error(e);
    const status = document.getElementById("status-message");
    if (status) status.textContent = `成績更新チュ♡今は見れません (${e.message})`;
  } finally {
    waitingForData = false;
    setTimeout(() => stopLoading(), 50);
  }
});

// =====================
// 先月比テーブル
// =====================
function renderSengetsuTable(data) {
  const table = document.getElementById("sengetsudata-table");
  if (!table) return;

  table.style.gridTemplateColumns = `repeat(5, 18vw)`;

  const headers = ["累計半荘数","総スコア","最高スコア","平均スコア","平均着順"];
  let html = "";

  for (let h of headers) {
    html += `<div class="header">${h}</div>`;
  }

  const cols = [
    { key: "累計半荘数先月比", digits: 0, unit: "半荘", type: "signed" },
    { key: "総スコア先月比",   digits: 1, unit: "pt",   type: "signed" },
    { key: "最高スコア先月比", digits: 1, unit: "pt",   type: "signed" },
    { key: "平均スコア先月比", digits: 3, unit: "pt",   type: "signed" },
    { key: "平均着順先月比",   digits: 3, unit: "",     type: "rank"   }
  ];

  for (let col of cols) {
    const raw = data[col.key];
    const num = Number(raw);

    if (raw == null || raw === "" || isNaN(num)) {
      html += `<div class="data">-</div>`;
      continue;
    }

    if (col.type === "signed") {
      const absStr = Math.abs(num).toFixed(col.digits);
      let text;
      if (num > 0) text = `+${absStr}${col.unit}`;
      else if (num < 0) text = `-${absStr}${col.unit}`;
      else text = `${absStr}${col.unit}`;

      const color = num > 0 ? "red" : num < 0 ? "blue" : "black";
      html += `<div class="data"><span style="color:${color};">${text}</span></div>`;
    } else if (col.type === "rank") {
      const absStr = Math.abs(num).toFixed(col.digits);
      if (num > 0)
        html += `<div class="data"><span style="color:blue;">↓${absStr}</span></div>`;
      else if (num < 0)
        html += `<div class="data"><span style="color:red;">↑${absStr}</span></div>`;
      else
        html += `<div class="data">${absStr}</div>`;
    }
  }

  table.innerHTML = html;
}

// =====================
// ユーティリティ
// =====================
function formatScore(v){return v==null||isNaN(v)?"データ不足":`${Number(v).toFixed(1)}pt`}
function formatRank(v){return v==null||isNaN(v)?"データなし":`${Number(v).toFixed(0)}位`}

function createTable(id, rows, cols) {
  const table = document.getElementById(id);
  table.innerHTML = "";
  table.style.gridTemplateColumns = `repeat(${cols}, 18vw)`;

  rows.forEach((row, rowIndex) => {
    row.forEach(cell => {
      const div = document.createElement("div");
      div.textContent = cell;
      div.className = rowIndex % 2 === 0 ? "header" : "data";

      if (!cell || cell.toString().trim() === "") {
        div.classList.add("empty-cell");
      }

      table.appendChild(div);
    });
  });
}
