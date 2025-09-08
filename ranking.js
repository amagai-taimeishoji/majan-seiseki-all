// プルダウン初期化
function initSelectors() {
  const yearSelect = document.getElementById("year-select");
  const monthSelect = document.getElementById("month-select");

  // 年: 2025〜2027
  for (let y = 2025; y <= 2027; y++) {
    const option = document.createElement("option");
    option.value = y;
    option.textContent = `${y}年`;
    yearSelect.appendChild(option);
  }

  // 月: 1〜12
  for (let m = 1; m <= 12; m++) {
    const option = document.createElement("option");
    option.value = m;
    option.textContent = `${m}月`;
    monthSelect.appendChild(option);
  }

  // 今日の年月を取得
  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth() + 1;

  // 初期値を「現在の年月」に設定
  if (thisYear >= 2025 && thisYear <= 2027) {
    yearSelect.value = thisYear;
  } else {
    yearSelect.value = 2025; // 範囲外ならデフォルト
  }
  monthSelect.value = thisMonth;
}

// ランキング表示関数（さっきの loadRanking/loadAll を流用）
async function loadRanking(targetId, year, month, type) {
  const url = `https://script.google.com/macros/s/AKf.../exec?year=${year}&month=${month}&type=${encodeURIComponent(type)}`;
  const res = await fetch(url);
  const data = await res.json();

  const table = document.getElementById(targetId);

  let label = "";
  if (type.includes("半荘数")) label = "半荘数";
  else if (type.includes("総スコア")) label = "総スコア";
  else if (type.includes("最高スコア")) label = "最高スコア";
  else if (type.includes("平均スコア")) label = "平均スコア";
  else if (type.includes("平均着順")) label = "平均着順";

  table.innerHTML = `
    <div class="ranking-header">No.</div>
    <div class="ranking-header">名前</div>
    <div class="ranking-header">${label}</div>
  `;

  data.forEach(row => {
    table.innerHTML += `
      <div class="ranking-data">${row.no}</div>
      <div class="ranking-data ranking-name">${row.name}</div>
      <div class="ranking-data ranking-score">${row.score}</div>
    `;
  });
}

function loadAll(year, month) {
  loadRanking("table-hansou", year, month, "半荘数ランキング");
  loadRanking("table-soscore", year, month, "総スコアランキング");
  loadRanking("table-maxscore", year, month, "最高スコアランキング");
  loadRanking("table-avgscore", year, month, "平均スコアランキング");
  loadRanking("table-avgposition", year, month, "平均着順ランキング");
}

// 初期化 & 初回表示
initSelectors();
const initYear = document.getElementById("year-select").value;
const initMonth = document.getElementById("month-select").value;
loadAll(initYear, initMonth);

// ボタンイベント
document.getElementById("search-button").addEventListener("click", () => {
  const year = document.getElementById("year-select").value;
  const month = document.getElementById("month-select").value;
  loadAll(year, month);
});
