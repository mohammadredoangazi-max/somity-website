// ============================================
// সমিতি ম্যানেজমেন্ট সিস্টেম - ফ্রন্টএন্ড লজিক
// ============================================

const BENGALI_DIGITS = ["০","১","২","৩","৪","৫","৬","৭","৮","৯"];
const MONTHS = ["জানুয়ারি","ফেব্রুয়ারি","মার্চ","এপ্রিল","মে","জুন",
                "জুলাই","আগস্ট","সেপ্টেম্বর","অক্টোবর","নভেম্বর","ডিসেম্বর"];

function toBn(num) {
  return String(num).replace(/[0-9]/g, d => BENGALI_DIGITS[d]);
}
function fmtMoney(num) {
  num = Number(num) || 0;
  return toBn(num.toLocaleString("en-IN"));
}

// ---- সেশন স্টেট ----
let session = JSON.parse(localStorage.getItem("somity_session") || "null");

// ---- API কল ----
async function apiCall(action, params = {}) {
  const url = new URL(API_URL);
  url.searchParams.set("action", action);
  Object.keys(params).forEach(k => url.searchParams.set(k, params[k]));
  const res = await fetch(url, { method: "GET" });
  return res.json();
}

// ---- DOM শর্টকাট ----
const $ = sel => document.querySelector(sel);
const root = $("#app-root");

function saveSession(s) {
  session = s;
  localStorage.setItem("somity_session", JSON.stringify(s));
}
function clearSession() {
  session = null;
  localStorage.removeItem("somity_session");
}

// ============================================
// রাউটার
// ============================================
function render() {
  if (!API_URL || API_URL.indexOf("PASTE_YOUR") !== -1) {
    root.innerHTML = `<div class="auth-wrap card">
      <p style="color:var(--color-red)">⚠️ config.js ফাইলে আপনার Google Apps Script URL বসানো হয়নি।</p>
    </div>`;
    return;
  }
  if (!session) {
    renderAuth();
  } else if (session.role === "admin") {
    renderAdminShell();
  } else {
    renderMemberShell();
  }
}

// ============================================
// অথ স্ক্রিন (লগইন / রেজিস্ট্রেশন)
// ============================================
let authTab = "login";
let authRole = "member";

function renderAuth() {
  root.innerHTML = `
  <div class="auth-wrap">
    <div class="auth-seal">
      <div class="ring">স</div>
      <h1>সমিতি হিসাব</h1>
      <p>সদস্যদের মাসিক সঞ্চয়ের স্বচ্ছ হিসাব</p>
    </div>
    <div class="card">
      <div class="tab-row">
        <button class="tab-btn ${authTab === 'login' ? 'active' : ''}" id="tab-login">লগইন</button>
        <button class="tab-btn ${authTab === 'register' ? 'active' : ''}" id="tab-register">রেজিস্ট্রেশন</button>
      </div>
      <div id="msg" class="msg-box"></div>
      <div id="auth-body"></div>
    </div>
  </div>`;

  $("#tab-login").onclick = () => { authTab = "login"; renderAuth(); };
  $("#tab-register").onclick = () => { authTab = "register"; renderAuth(); };

  if (authTab === "login") renderLoginForm();
  else renderRegisterForm();
}

function showMsg(text, type) {
  const box = $("#msg");
  if (!box) return;
  box.textContent = text;
  box.className = "msg-box show " + type;
}

function renderLoginForm() {
  const body = $("#auth-body");
  body.innerHTML = `
    <div class="role-row">
      <button class="role-btn ${authRole === 'member' ? 'active' : ''}" id="role-member">মেম্বার</button>
      <button class="role-btn ${authRole === 'admin' ? 'active' : ''}" id="role-admin">এডমিন</button>
    </div>
    <div id="login-fields"></div>
    <button class="btn-primary" id="btn-do-login">লগইন করুন</button>
  `;
  $("#role-member").onclick = () => { authRole = "member"; renderLoginForm(); };
  $("#role-admin").onclick = () => { authRole = "admin"; renderLoginForm(); };

  const fields = $("#login-fields");
  if (authRole === "member") {
    fields.innerHTML = `
      <div class="field"><label>ফোন নাম্বার</label><input type="text" id="l-phone" placeholder="01XXXXXXXXX"></div>
      <div class="field"><label>পাসওয়ার্ড</label><input type="password" id="l-pass" placeholder="পাসওয়ার্ড"></div>
    `;
  } else {
    fields.innerHTML = `
      <div class="field"><label>ইউজারনেম</label><input type="text" id="l-user" placeholder="admin"></div>
      <div class="field"><label>পাসওয়ার্ড</label><input type="password" id="l-pass-admin" placeholder="পাসওয়ার্ড"></div>
    `;
  }

  $("#btn-do-login").onclick = doLogin;
}

async function doLogin() {
  const btn = $("#btn-do-login");
  btn.disabled = true;
  btn.textContent = "অপেক্ষা করুন...";
  try {
    if (authRole === "member") {
      const phone = $("#l-phone").value.trim();
      const pass = $("#l-pass").value;
      if (!phone || !pass) { showMsg("ফোন নাম্বার ও পাসওয়ার্ড দিন", "error"); return; }
      const res = await apiCall("memberLogin", { phone, password: pass });
      if (res.success) {
        saveSession({ role: "member", memberId: res.memberId, name: res.name });
        render();
      } else {
        showMsg(res.message, "error");
      }
    } else {
      const user = $("#l-user").value.trim();
      const pass = $("#l-pass-admin").value;
      const res = await apiCall("adminLogin", { username: user, password: pass });
      if (res.success) {
        saveSession({ role: "admin" });
        render();
      } else {
        showMsg(res.message, "error");
      }
    }
  } catch (err) {
    showMsg("নেটওয়ার্ক সমস্যা, আবার চেষ্টা করুন", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "লগইন করুন";
  }
}

function renderRegisterForm() {
  const body = $("#auth-body");
  body.innerHTML = `
    <div class="field"><label>আপনার নাম</label><input type="text" id="r-name" placeholder="পূর্ণ নাম"></div>
    <div class="field"><label>ফোন নাম্বার</label><input type="text" id="r-phone" placeholder="01XXXXXXXXX"></div>
    <div class="field"><label>পাসওয়ার্ড</label><input type="password" id="r-pass" placeholder="একটি পাসওয়ার্ড দিন"></div>
    <div class="field"><label>পাসওয়ার্ড নিশ্চিত করুন</label><input type="password" id="r-pass2" placeholder="পুনরায় পাসওয়ার্ড দিন"></div>
    <button class="btn-primary" id="btn-do-register">রেজিস্ট্রেশন করুন</button>
    <p style="font-size:12px;color:var(--color-ink-soft);margin-top:10px;text-align:center">
      রেজিস্ট্রেশনের পর এডমিন অনুমোদন করলে আপনি লগইন করতে পারবেন
    </p>
  `;
  $("#btn-do-register").onclick = doRegister;
}

async function doRegister() {
  const name = $("#r-name").value.trim();
  const phone = $("#r-phone").value.trim();
  const pass = $("#r-pass").value;
  const pass2 = $("#r-pass2").value;

  if (!name || !phone || !pass) { showMsg("সব ঘর পূরণ করুন", "error"); return; }
  if (pass !== pass2) { showMsg("পাসওয়ার্ড মিলছে না", "error"); return; }
  if (pass.length < 4) { showMsg("পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে", "error"); return; }

  const btn = $("#btn-do-register");
  btn.disabled = true;
  btn.textContent = "অপেক্ষা করুন...";
  try {
    const res = await apiCall("register", { name, phone, password: pass });
    if (res.success) {
      showMsg(res.message, "success");
      setTimeout(() => { authTab = "login"; renderAuth(); }, 1800);
    } else {
      showMsg(res.message, "error");
    }
  } catch (err) {
    showMsg("নেটওয়ার্ক সমস্যা, আবার চেষ্টা করুন", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "রেজিস্ট্রেশন করুন";
  }
}

// ============================================
// মেম্বার শেল
// ============================================
function topbarHTML(roleLabel) {
  return `
  <div class="topbar">
    <div class="brand">
      <div class="brand-seal">স</div>
      <div>
        <div class="brand-name">সমিতি হিসাব</div>
        <div class="brand-tag">${roleLabel}</div>
      </div>
    </div>
    <div class="user-chip">
      <span class="who">${session.name ? "নমস্কার, " + session.name : "এডমিন"}</span>
      <button class="btn-logout" id="btn-logout">লগ আউট</button>
    </div>
  </div>`;
}

function bindLogout() {
  $("#btn-logout").onclick = () => { clearSession(); render(); };
}

async function renderMemberShell() {
  root.innerHTML = topbarHTML("মেম্বার প্যানেল") + `<div id="m-body" class="loader">তথ্য লোড হচ্ছে...</div>`;
  bindLogout();

  try {
    const data = await apiCall("getMemberData", { memberId: session.memberId });
    if (!data.success) {
      $("#m-body").innerHTML = `<div class="card empty-note">${data.message}</div>`;
      return;
    }
    renderMemberBody(data);
  } catch (err) {
    $("#m-body").innerHTML = `<div class="card empty-note">তথ্য লোড করতে সমস্যা হয়েছে</div>`;
  }
}

function renderMemberBody(data) {
  const paidMonths = {};
  data.payments.forEach(p => {
    const key = p.month + "-" + p.year;
    paidMonths[key] = (paidMonths[key] || 0) + Number(p.amount);
  });

  // চলতি বছরের ১২ মাসের গ্রিড
  const year = new Date().getFullYear();
  let monthCells = "";
  MONTHS.forEach((m, idx) => {
    const key = m + "-" + year;
    const isPaid = paidMonths[key] !== undefined;
    monthCells += `
      <div class="month-cell ${isPaid ? 'paid' : 'unpaid'}">
        <div class="m-name">${m}</div>
        <div class="m-status">${isPaid ? "✓ দেওয়া হয়েছে" : "✗ বাকি আছে"}</div>
        ${isPaid ? `<div class="m-amount">৳ ${fmtMoney(paidMonths[key])}</div>` : ""}
      </div>`;
  });

  let historyRows = "";
  if (data.payments.length === 0) {
    historyRows = `<tr><td colspan="4" class="empty-note">এখনো কোনো পেমেন্ট রেকর্ড নেই</td></tr>`;
  } else {
    data.payments
      .slice()
      .sort((a,b) => new Date(b.date) - new Date(a.date))
      .forEach(p => {
        historyRows += `<tr>
          <td>${p.month}, ${toBn(p.year)}</td>
          <td>৳ ${fmtMoney(p.amount)}</td>
          <td>${toBn(p.date)}</td>
          <td>${p.note || "-"}</td>
        </tr>`;
      });
  }

  $("#m-body").innerHTML = `
    <div class="stat-grid">
      <div class="stat-box">
        <div class="label">সমিতিতে মোট জমা</div>
        <div class="value">৳ ${fmtMoney(data.totalFund)}</div>
      </div>
      <div class="stat-box alt">
        <div class="label">মাসিক চাঁদা</div>
        <div class="value">৳ ${fmtMoney(data.monthlyFee)}</div>
      </div>
      <div class="stat-box alt">
        <div class="label">আপনার মোট জমা</div>
        <div class="value">৳ ${fmtMoney(data.payments.reduce((s,p)=>s+Number(p.amount),0))}</div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">${toBn(year)} সালের মাসভিত্তিক হিসাব</div>
      <div class="month-grid">${monthCells}</div>
    </div>

    <div class="card">
      <div class="card-title">পেমেন্ট ইতিহাস</div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>মাস</th><th>পরিমাণ</th><th>তারিখ</th><th>মন্তব্য</th></tr></thead>
          <tbody>${historyRows}</tbody>
        </table>
      </div>
    </div>

    <div class="footer-note">সর্বশেষ তথ্য • Google Sheets থেকে সরাসরি লোড হয়েছে</div>
  `;
}

// ============================================
// এডমিন শেল
// ============================================
let adminData = null;
let openMemberId = null;

async function renderAdminShell() {
  root.innerHTML = topbarHTML("এডমিন প্যানেল") + `<div id="a-body" class="loader">তথ্য লোড হচ্ছে...</div>`;
  bindLogout();
  await loadAdminData();
}

async function loadAdminData() {
  try {
    adminData = await apiCall("getAdminData");
    if (!adminData.success) {
      $("#a-body").innerHTML = `<div class="card empty-note">তথ্য লোড করতে সমস্যা হয়েছে</div>`;
      return;
    }
    renderAdminBody();
  } catch (err) {
    $("#a-body").innerHTML = `<div class="card empty-note">তথ্য লোড করতে সমস্যা হয়েছে</div>`;
  }
}

function renderAdminBody() {
  const d = adminData;

  // পেন্ডিং মেম্বার তালিকা
  let pendingRows = "";
  if (d.pendingMembers.length === 0) {
    pendingRows = `<p class="empty-note">নতুন আবেদন নেই</p>`;
  } else {
    pendingRows = `<div class="table-wrap"><table>
      <thead><tr><th>নাম</th><th>ফোন</th><th>আবেদনের তারিখ</th><th>কার্যক্রম</th></tr></thead>
      <tbody>${d.pendingMembers.map(m => `
        <tr>
          <td>${m.name}</td>
          <td>${m.phone}</td>
          <td>${toBn(m.joinDate)}</td>
          <td>
            <button class="btn-mini approve" data-approve="${m.memberId}">অনুমোদন</button>
            <button class="btn-mini reject" data-reject="${m.memberId}">প্রত্যাখ্যান</button>
          </td>
        </tr>`).join("")}</tbody>
    </table></div>`;
  }

  // মেম্বার লিস্ট (একর্ডিয়ন)
  let memberList = "";
  if (d.members.length === 0) {
    memberList = `<p class="empty-note">এখনো কোনো অনুমোদিত মেম্বার নেই</p>`;
  } else {
    memberList = d.members.map(m => {
      const isOpen = openMemberId === m.memberId;
      const paidMonths = new Set(m.payments.map(p => p.month + "-" + p.year));
      const year = new Date().getFullYear();
      let unpaidCount = 0;
      MONTHS.forEach(mo => { if (!paidMonths.has(mo + "-" + year)) unpaidCount++; });

      let payRows = "";
      if (m.payments.length === 0) {
        payRows = `<tr><td colspan="5" class="empty-note">কোনো পেমেন্ট রেকর্ড নেই</td></tr>`;
      } else {
        m.payments.slice().sort((a,b)=>new Date(b.date)-new Date(a.date)).forEach(p => {
          payRows += `<tr>
            <td>${p.month}, ${toBn(p.year)}</td>
            <td>৳ ${fmtMoney(p.amount)}</td>
            <td>${toBn(p.date)}</td>
            <td>${p.note || "-"}</td>
            <td><button class="btn-mini del" data-delpay="${p.paymentId}">মুছুন</button></td>
          </tr>`;
        });
      }

      return `
      <div class="member-row-head" data-toggle="${m.memberId}">
        <div>
          <div class="name">${m.name}</div>
          <div class="sub">${m.phone} • মোট জমা ৳ ${fmtMoney(m.totalPaid)}</div>
        </div>
        <div>
          ${unpaidCount > 0 ? `<span class="pill red">${toBn(unpaidCount)} মাস বাকি</span>` : `<span class="pill green">সব দেওয়া</span>`}
        </div>
      </div>
      <div class="member-detail ${isOpen ? 'open' : ''}" id="detail-${m.memberId}">
        <div class="inline-form">
          <div class="field"><label>মাস</label>
            <select id="pay-month-${m.memberId}">${MONTHS.map(mo => `<option value="${mo}">${mo}</option>`).join("")}</select>
          </div>
          <div class="field"><label>বছর</label><input type="number" id="pay-year-${m.memberId}" value="${year}"></div>
          <div class="field"><label>টাকার পরিমাণ</label><input type="number" id="pay-amount-${m.memberId}" value="${d.monthlyFee}"></div>
          <div class="field"><label>মন্তব্য (ঐচ্ছিক)</label><input type="text" id="pay-note-${m.memberId}" placeholder=""></div>
          <button class="btn-secondary" data-addpay="${m.memberId}">যোগ করুন</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>মাস</th><th>পরিমাণ</th><th>তারিখ</th><th>মন্তব্য</th><th></th></tr></thead>
            <tbody>${payRows}</tbody>
          </table>
        </div>
      </div>`;
    }).join("");
  }

  $("#a-body").innerHTML = `
    <div class="stat-grid">
      <div class="stat-box">
        <div class="label">সমিতিতে মোট জমা</div>
        <div class="value">৳ ${fmtMoney(d.totalFund)}</div>
      </div>
      <div class="stat-box alt">
        <div class="label">মোট অনুমোদিত মেম্বার</div>
        <div class="value">${toBn(d.totalMembers)} <span class="unit">জন</span></div>
      </div>
      <div class="stat-box alt">
        <div class="label">পেন্ডিং আবেদন</div>
        <div class="value">${toBn(d.pendingMembers.length)} <span class="unit">জন</span></div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">সমিতির সেটিংস</div>
      <div class="inline-form" style="grid-template-columns: 1fr 1fr auto;">
        <div class="field"><label>সমিতির নাম</label><input type="text" id="cfg-somity-name" value="${d.somityName}"></div>
        <div class="field"><label>মাসিক চাঁদার পরিমাণ (৳)</label><input type="number" id="cfg-monthly-fee" value="${d.monthlyFee}"></div>
        <button class="btn-secondary" id="btn-save-config">সংরক্ষণ করুন</button>
      </div>
    </div>

    <div class="card">
      <div class="card-title">নতুন রেজিস্ট্রেশন আবেদন</div>
      ${pendingRows}
    </div>

    <div class="card">
      <div class="card-title">মেম্বার তালিকা ও পেমেন্ট</div>
      ${memberList}
    </div>

    <div class="footer-note">সব তথ্য Google Sheets-এ সংরক্ষিত হচ্ছে</div>
  `;

  bindAdminEvents();
}

function bindAdminEvents() {
  document.querySelectorAll("[data-approve]").forEach(btn => {
    btn.onclick = async () => {
      btn.disabled = true;
      await apiCall("approveMember", { memberId: btn.dataset.approve, approve: "true" });
      await loadAdminData();
    };
  });
  document.querySelectorAll("[data-reject]").forEach(btn => {
    btn.onclick = async () => {
      if (!confirm("আপনি কি নিশ্চিত এই আবেদন প্রত্যাখ্যান করতে চান?")) return;
      btn.disabled = true;
      await apiCall("approveMember", { memberId: btn.dataset.reject, approve: "false" });
      await loadAdminData();
    };
  });
  document.querySelectorAll("[data-toggle]").forEach(el => {
    el.onclick = () => {
      const id = el.dataset.toggle;
      openMemberId = openMemberId === id ? null : id;
      renderAdminBody();
    };
  });
  document.querySelectorAll("[data-addpay]").forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.addpay;
      const month = $(`#pay-month-${id}`).value;
      const year = $(`#pay-year-${id}`).value;
      const amount = $(`#pay-amount-${id}`).value;
      const note = $(`#pay-note-${id}`).value;
      if (!amount || Number(amount) <= 0) { alert("সঠিক পরিমাণ দিন"); return; }
      btn.disabled = true;
      await apiCall("addPayment", { memberId: id, month, year, amount, note });
      await loadAdminData();
    };
  });
  document.querySelectorAll("[data-delpay]").forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      if (!confirm("এই পেমেন্ট রেকর্ডটি মুছে ফেলতে চান?")) return;
      await apiCall("deletePayment", { paymentId: btn.dataset.delpay });
      await loadAdminData();
    };
  });
  const saveCfgBtn = $("#btn-save-config");
  if (saveCfgBtn) {
    saveCfgBtn.onclick = async () => {
      saveCfgBtn.disabled = true;
      saveCfgBtn.textContent = "সংরক্ষণ হচ্ছে...";
      const name = $("#cfg-somity-name").value;
      const fee = $("#cfg-monthly-fee").value;
      await apiCall("setSomityName", { name });
      await apiCall("setMonthlyFee", { fee });
      await loadAdminData();
    };
  }
}

// ============================================
// শুরু
// ============================================
render();
