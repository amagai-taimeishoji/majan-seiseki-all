"use strict";

let pieChartInstance = null;

// Google Apps ScriptのURL
const API_URL = "https://script.google.com/macros/s/AKfycbzi4YkMpcMaU3KxP1V3YgEHTkH4geiDY-PRHjcM6Z-NDMiOnrlJJ2U8mpfr4pegeOaq/exec";ezvAMM7sQKOGQVA0CDh0mF8nAjx-j9zzO-yuNYXoJEtfPzXtjR/exec";

// DOM 要素
const nameInput = document.getElementById("name-input");
const searchButton = document.getElementById("search-button");
const statusMessage = document.getElementById("status-message");
const results = document.getElementById("results");

const loadingArea = document.getElementById("loadingArea");
const loadingFill = document.getElementById("loadingFill");
const loadingText = document.getElementById("loadingText");

// 🔹 更新状況（常に表示）
const updateStatusEl = document.getElementById("update-status");

let waitingForData = false;
let loadingStart = 0;
let loadingRaf = 0;
const LOADING_DURATION_MS = 1500; // 1.5秒でバーが100%

function startLoading() {
  loadingArea.style.display = "flex";
  loadingFill.style.width = "0%";
  loadingText.style.display = "block";

  waitingForData = true;
  loadingStart = performance.now();
  cancelAnimationFrame(loadingRaf);
  loadingRaf = requestAnimationFrame(loadingTick);
}

function loadingTick(now){
  const elapsed = now - loadingStart;
  const pct = Math.min(100, (elapsed / LOADING_DURATION_MS) * 100);
  loadingFill.style.width = pct + "%";

  if (pct < 100) {
    loadingRaf = requestAnimationFrame(loadingTick);
  } else {
    if (waitingForData) {
      loadingText.textContent = "もうちょっとまってほしい！";
    } else {
      stopLoading();
    }
  }
}

function stopLoading() {
  cancelAnimationFrame(loadingRaf);
  loadingFill.style.width = "100%";
  setTimeout(() => {
    loadingArea.style.display = "none";
    loadingFill.style.width = "0%";
    loadingText.style.display = "none";
  }, 220);
}

// 検索イベント
searchButton.addEventListener("click", () => {
  const name = nameInput.value.trim();
  if (!name) {
    statusMessage.textContent = "名前を入力してねっ";
    results.style.display = "none";
    return;
  }
  fetchAndRender(name);
});

// エンターで検索
nameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") searchButton.click();
});

async function fetchAndRender(name) {
  startLoading();
  results.style.display = "none";
  statusMessage.textContent = "";

  try {
    const res = await fetch(`${API_URL}?name=${encodeURIComponent(name)}`);
    if (!res.ok) throw new Error(`HTTPエラー: ${res.status}`);
    const data = await res.json();

    if (data.error) {
      statusMessage.textContent = data.error.includes("見つかりません") ? "データは見つからないよっ" : `エラー: ${data.error}`;
      return;
    }

    // 🔹 更新状況を「更新日時」で更新
    updateStatusEl.textContent = data["更新日時"] || "不明";

    // 成功時の表示
    results.style.display = "block";

    document.getElementById("member-info").textContent =
      `No. ${data["No."]?String(data["No."]).padStart(4,'0'):"不明"}   ${data["名前"]}`;

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
        `${Number(data["累計半荘数"]||0).toFixed(0)}半荘`,
        `${Number(data["総スコア"]||0).toFixed(1)}pt`,
        `${Number(data["最高スコア"]||0).toFixed(1)}pt`,
        `${Number(data["平均スコア"]||0).toFixed(3)}pt`,
        `${Number(data["平均着順"]||0).toFixed(3)}位`
      ]
    ],5);

    // 着順回数テーブル
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
    statusMessage.textContent = `成績更新チュ♡今は見れません (${e.message})`;
  } finally {
    waitingForData = false;
    setTimeout(() => stopLoading(), 50);
  }
}

function formatRank(v){ return v==null||isNaN(v) ? "データなし" : `${Number(v).toFixed(0)}位`; }

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

function createPieChart(data) {
  const ctx = document.getElementById("pie-chart").getContext("2d");
  if (pieChartInstance) pieChartInstance.destroy();

  pieChartInstance = new Chart(ctx, {
    type: "pie",
    data: {
      labels: ["1着率","1.5着率","2着率","2.5着率","3着率","3.5着率","4着率"],
      datasets:[{
        data:[
          (data["1着率"]||0)*100,
          (data["1.5着率"]||0)*100,
          (data["2着率"]||0)*100,
          (data["2.5着率"]||0)*100,
          (data["3着率"]||0)*100,
          (data["3.5着率"]||0)*100,
          (data["4着率"]||0)*100
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
      plugins:{ legend:{ display:true, position:'left' } }
    }
  });
}