
const DAYS = ["星期一","星期二","星期三","星期四","星期五","星期六","星期日"];
const KEY = "weekly-planner-v1";
const today = () => (new Date().getDay() + 6) % 7;
const date = () => {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth()+1).padStart(2,"0"), String(d.getDate()).padStart(2,"0")].join("-");
};

let data;
try {
  data = JSON.parse(localStorage.getItem(KEY));
} catch {}
if (!data || !Array.isArray(data.slots)) {
  data = { slots: [], cells: {}, checks: {}, checkDate: "" };
}
data.cells ||= {};
data.checks ||= {};

function save() {
  localStorage.setItem(KEY, JSON.stringify(data));
}

function reset() {
  if (data.checkDate !== date()) {
    data.checks = {};
    data.checkDate = date();
    save();
  }
}

function key(slot, day) {
  return slot.id + ":" + day;
}

function header() {
  return "<thead><tr><th>時間</th>" +
    DAYS.map((d,i) => `<th class="${i===today()?"current":""}">${d}</th>`).join("") +
    "</tr></thead>";
}

function renderEdit() {
  const table = document.getElementById("editTable");
  table.innerHTML = header();
  const body = table.createTBody();

  data.slots.forEach(slot => {
    const row = body.insertRow();
    const time = document.createElement("th");
    time.className = "time-cell";
    time.textContent = slot.start + "–" + slot.end;

    const del = document.createElement("button");
    del.className = "delete-slot";
    del.textContent = "刪除時段";
    del.onclick = () => {
      if (!confirm("確定刪除此時段？")) return;
      data.slots = data.slots.filter(s => s.id !== slot.id);
      DAYS.forEach((_,i) => {
        delete data.cells[key(slot,i)];
        delete data.checks[key(slot,i)];
      });
      save();
      renderEdit();
    };
    time.append(del);
    row.append(time);

    DAYS.forEach((_,i) => {
      const cell = row.insertCell();
      if (i === today()) cell.className = "current";
      const input = document.createElement("textarea");
      input.className = "cell-editor";
      input.placeholder = "點此輸入";
      input.value = data.cells[key(slot,i)] || "";
      input.oninput = () => {
        data.cells[key(slot,i)] = input.value;
        if (!input.value.trim()) delete data.checks[key(slot,i)];
        save();
      };
      cell.append(input);
    });
  });
}

function renderCheck() {
  reset();
  const table = document.getElementById("checkTable");
  table.innerHTML = header();
  const body = table.createTBody();

  data.slots.forEach(slot => {
    const row = body.insertRow();
    const time = document.createElement("th");
    time.className = "time-cell";
    time.textContent = slot.start + "–" + slot.end;
    row.append(time);

    DAYS.forEach((_,i) => {
      const cell = row.insertCell();
      if (i === today()) cell.className = "current";
      const value = (data.cells[key(slot,i)] || "").trim();

      if (!value) {
        cell.textContent = "—";
        return;
      }

      const label = document.createElement("label");
      label.className = "check-cell";
      const check = document.createElement("input");
      check.type = "checkbox";
      check.checked = !!data.checks[key(slot,i)];
      label.classList.toggle("checked", check.checked);

      const text = document.createElement("span");
      text.textContent = value;
      check.onchange = () => {
        reset();
        data.checks[key(slot,i)] = check.checked;
        label.classList.toggle("checked", check.checked);
        save();
        progress();
      };
      label.append(check,text);
      cell.append(label);
    });
  });
  progress();
}

function progress() {
  let total = 0, done = 0;
  data.slots.forEach(slot => {
    const k = key(slot,today());
    if ((data.cells[k] || "").trim()) {
      total++;
      if (data.checks[k]) done++;
    }
  });
  const percent = total ? Math.round(done/total*100) : 0;
  document.getElementById("progressLabel").textContent = `今日完成 ${done} / ${total}`;
  document.getElementById("progressPercent").textContent = percent + "%";
  document.getElementById("progressBar").style.width = percent + "%";
}

function render() {
  reset();
  document.getElementById("todayLabel").textContent = "今天 · " + DAYS[today()];
  const page = ["home","edit","check"].includes(location.hash.slice(1))
    ? location.hash.slice(1) : "home";

  document.querySelectorAll(".view").forEach(v => {
    v.hidden = v.id !== page;
  });
  if (page === "edit") renderEdit();
  if (page === "check") renderCheck();
}

document.getElementById("slotForm").onsubmit = e => {
  e.preventDefault();
  const start = document.getElementById("startTime").value;
  const end = document.getElementById("endTime").value;
  const msg = document.getElementById("slotMessage");
  msg.textContent = "";

  if (!start || !end || start >= end) {
    msg.textContent = "結束時間必須晚於開始時間";
    return;
  }
  if (data.slots.some(s => s.start === start && s.end === end)) {
    msg.textContent = "這個時段已存在";
    return;
  }
  data.slots.push({ id: "slot-"+Date.now()+"-"+Math.random(), start, end });
  data.slots.sort((a,b) => a.start.localeCompare(b.start));
  save();
  renderEdit();
};

window.addEventListener("hashchange",render);
window.addEventListener("focus",render);
document.addEventListener("visibilitychange",() => {
  if (!document.hidden) render();
});
setInterval(() => {
  if (data.checkDate !== date()) render();
},60000);

render();
