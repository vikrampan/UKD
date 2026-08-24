import React, { useState, useEffect, useMemo, useRef, createContext, useContext } from "react";

/* ================= UKD DIGITAL ECOSYSTEM — FRONTEND PROTOTYPE =================
   Public website + private organisational portal. All data is demo data. */

/* Brand palette derived from the official UKD emblem:
   deep green / red diagonal split with white chair mark. */
const C = {
  forest: "#0A5A2E", forestDark: "#064022", forestDeep: "#042D18",
  gold: "#D21F26", goldSoft: "#F0A6A2", slate: "#0A5A2E", slateSoft: "#2E7D4F",
  lime: "#3E9C5C", ivory: "#F7F6F3", paper: "#FFFFFF", ink: "#14201A",
  mute: "#5F6B62", line: "#E2E6E1", lineDark: "#12482A",
  red: "#D21F26", redDark: "#A8161C", amber: "#D21F26",
  green: "#0A5A2E", white: "#FFFFFF",
};
/* Kohinoor Devanagari ships natively on macOS/iOS. Hind (Indian Type Foundry,
   same lineage as Kohinoor) is the web fallback so Windows/Android match. */
const deva = "'Kohinoor Devanagari', 'Hind', 'Noto Sans Devanagari', 'Mukta', -apple-system, sans-serif";
const serif = deva;
const sans = deva;

const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Hind:wght@300;400;500;600;700&family=Noto+Sans+Devanagari:wght@300;400;500;600;700;800&display=swap');
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body { margin: 0; font-family: ${deva}; }
    /* Devanagari conjuncts and matras must stay tight — positive letter-spacing
       splits them into disconnected glyphs, and uppercasing does nothing.
       Guard both globally so Latin-era styles can't creep back in. */
    * { letter-spacing: normal; text-transform: none; }
    h1, h2, h3, h4 { letter-spacing: -0.015em; text-wrap: balance; line-height: 1.28; }
    p, li { line-height: 1.85; }
    body { -webkit-font-smoothing: antialiased; }
    ::selection { background: ${C.gold}44; }
    .ukd-fade { animation: ukdFade .45s ease both; }
    @keyframes ukdFade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    .ukd-pop { animation: ukdPop .28s cubic-bezier(.2,.9,.3,1.2) both; }
    @keyframes ukdPop { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: scale(1); } }
    @keyframes ukdShimmer { 0% { background-position: -400px 0 } 100% { background-position: 400px 0 } }
    .ukd-skel { background: linear-gradient(90deg,#e8ebe7 25%,#f3f5f2 50%,#e8ebe7 75%); background-size: 400px 100%; animation: ukdShimmer 1.2s infinite linear; border-radius: 6px; }
    .ukd-skel-dark { background: linear-gradient(90deg,#0d4526 25%,#12583080 50%,#0d4526 75%); background-size: 400px 100%; animation: ukdShimmer 1.2s infinite linear; border-radius: 6px; }
    .hoverlift { transition: transform .18s ease, box-shadow .18s ease; }
    .hoverlift:hover { transform: translateY(-3px); box-shadow: 0 14px 34px -14px rgba(24,43,28,.35); }
    .rowhover { transition: background .12s ease; }
    .rowhover:hover { background: #eef2ee; cursor: pointer; }
    .rowhover-dark:hover { background: #0a5a2e22; cursor: pointer; }
    input:focus, textarea:focus, select:focus, button:focus-visible, a:focus-visible { outline: 2px solid ${C.gold}; outline-offset: 2px; }
    @media (prefers-reduced-motion: reduce) { .ukd-fade, .ukd-pop, .ukd-skel, .ukd-skel-dark { animation: none; } .hoverlift:hover { transform:none } }
    @keyframes ukdBar { from { transform: scaleY(0) } to { transform: scaleY(1) } }
    .baranim { transform-origin: bottom; animation: ukdBar .6s ease both; }
    /* ---- mobile ----
       Component styles here are inline, which outranks any stylesheet rule,
       so the overrides below need !important to land. */
    html, body { overflow-x: hidden; max-width: 100%; }
    img, svg, video, canvas { max-width: 100%; }
    @media (max-width: 860px) {
      /* Anything laid out in fixed columns collapses to one */
      [style*="repeat(3, 1fr)"], [style*="repeat(4, 1fr)"], [style*="repeat(2, 1fr)"] {
        grid-template-columns: 1fr !important;
      }
      /* Two-up hero/feature splits stack */
      [style*="1.15fr"], [style*="1.2fr"] { grid-template-columns: 1fr !important; }
    }
    @media (max-width: 620px) {
      /* Comfortable touch targets */
      button, a[role="button"], input, select, textarea { min-height: 44px; }
      /* Tables and other wide content scroll inside themselves, never the page */
      table { display: block; overflow-x: auto; max-width: 100%; }
      /* Dialogs use the full width they have */
      .ukd-pop { max-width: calc(100vw - 24px) !important; }
    }
    @media (max-width: 420px) {
      h1 { font-size: clamp(27px, 8.4vw, 34px) !important; }
      h2 { font-size: clamp(21px, 6.4vw, 26px) !important; }
    }
    .ukd-ring { transition: transform .3s cubic-bezier(.2,.8,.3,1), box-shadow .3s ease; }
    .ukd-portrait:hover .ukd-ring { transform: translateY(-6px) scale(1.03); box-shadow: 0 30px 62px -18px rgba(0,0,0,.8); }
    @media (prefers-reduced-motion: reduce) { .ukd-portrait:hover .ukd-ring { transform: none; } }
    .navlink { position: relative; }
    .navlink:after { content:""; position:absolute; left:0; right:100%; bottom:-4px; height:2px; background:${C.gold}; transition: right .2s ease; }
    .navlink:hover:after, .navlink.active:after { right:0; }
  `}</style>
);

/* ============================== MOCK DATA ============================== */
const REGIONS = {
  गढ़वाल: ["देहरादून", "पौड़ी गढ़वाल", "टिहरी गढ़वाल", "उत्तरकाशी", "चमोली", "रुद्रप्रयाग"],
  कुमाऊँ: ["अल्मोड़ा", "नैनीताल", "पिथौरागढ़", "बागेश्वर", "चम्पावत"],
  तराई: ["हरिद्वार", "ऊधम सिंह नगर"],
};
const DISTRICTS = Object.values(REGIONS).flat();
const regionOf = (d) => Object.keys(REGIONS).find((r) => REGIONS[r].includes(d));

const FIRST = ["अरुण","मीरा","देवेंद्र","कमला","हरीश","सुनीता","प्रकाश","दीपा","मोहन","राधा","सुरेश","अनीता","राजेंद्र","गीता","नवीन","पुष्पा","दिनेश","सविता","त्रिलोक","हेमा","भुवन","लक्ष्मी","गिरीश","तारा"];
const LAST = ["रावत","बिष्ट","नेगी","भट्ट","जोशी","पंत","कांडपाल","भंडारी","चौहान","अधिकारी","मेहरा","गुसाईं","कठैत","टम्टा","ढौंडियाल","पंवार"];
const seededName = (i) => `${FIRST[i % FIRST.length]} ${LAST[(i * 7 + 3) % LAST.length]}`;

const SEED_MEMBERS = Array.from({ length: 42 }, (_, i) => ({
  id: `UKD-M-2026-${String(1000 + i * 13)}`,
  name: seededName(i),
  district: DISTRICTS[i % 13],
  unit: `Local Unit ${String(1 + (i % 6)).padStart(2, "0")}`,
  block: `Block ${"ABCD"[i % 4]}`,
  role: ["Member","Member","Member","समिति सदस्य","इकाई सचिव","Member"][i % 6],
  joined: `${["Jan","Feb","Mar","Apr","May","Jun","Jul"][i % 7]} 2026`,
  status: i % 9 === 0 ? "लंबित" : "सक्रिय",
  lastActivity: `${(i % 12) + 1} d ago`,
  phone: `+91 98XXX ${String(10000 + i * 91).slice(0, 5)}`,
}));

const SEED_KARYAKARTAS = Array.from({ length: 18 }, (_, i) => ({
  id: `KK-${200 + i}`,
  name: seededName(i + 9),
  district: DISTRICTS[(i * 3) % 13],
  unit: `Local Unit ${String(1 + (i % 6)).padStart(2, "0")}`,
  role: ["Field Karyakarta","बूथ कार्यकर्ता","प्रशिक्षण प्रभारी","Field Karyakarta","Outreach Karyakarta"][i % 5],
  skills: [["Outreach","Hindi comms"],["Logistics","परिवहन"],["प्रशिक्षण","Documentation"],["Media liaison","Photography"],["डेटा प्रविष्टि","रिपोर्टिंग"]][i % 5],
  availability: ["सप्ताहांत","Full-time","Evenings","Full-time"][i % 4],
  tasksDone: 4 + (i * 5) % 23,
  training: i % 3 === 0 ? "पूर्ण" : i % 3 === 1 ? "In progress" : "निर्धारित",
  active: i % 7 !== 0,
}));

const SEED_UNITS = Array.from({ length: 14 }, (_, i) => {
  const d = DISTRICTS[i % 13];
  return {
    id: `U-${100 + i}`, name: `${d.split(" ")[0]} Local Unit ${String((i % 4) + 1).padStart(2, "0")}`,
    district: d, block: `Block ${"ABCD"[i % 4]}`,
    leader: seededName(i + 3), committee: 5 + (i % 4), karyakartas: 6 + (i * 3) % 15,
    members: 24 + (i * 17) % 90, lastActivity: `${(i % 9) + 1} d ago`,
    openIssues: i % 5, pendingTasks: i % 4, lastReport: i % 6 === 0 ? "अप्राप्त" : "Wk 32",
    health: 58 + (i * 7) % 40,
    checks: { leadership: true, committee: i % 6 !== 2, activity: i % 5 !== 4, reporting: i % 6 !== 0 },
  };
});

const SEED_TASKS = [
  ["बूथ समिति सत्यापन अभियान","पौड़ी गढ़वाल","उच्च"],["साप्ताहिक इकाई रिपोर्ट संकलन","अल्मोड़ा","मध्यम"],
  ["Membership form digitisation","देहरादून","मध्यम"],["ग्राम संपर्क — सड़क समस्या अनुवर्ती","चमोली","उच्च"],
  ["District office document archive","नैनीताल","निम्न"],["Karyakarta training session prep","टिहरी गढ़वाल","उच्च"],
  ["Event logistics — हरिद्वार meet","हरिद्वार","उच्च"],["Issue verification — water supply","अल्मोड़ा","मध्यम"],
  ["New unit formation survey","बागेश्वर","मध्यम"],["Notice acknowledgement follow-up","पिथौरागढ़","निम्न"],
  ["Photo documentation of public work","रुद्रप्रयाग","निम्न"],["Local grievance camp setup","चम्पावत","उच्च"],
  ["Member data cleanup — Block B","ऊधम सिंह नगर","मध्यम"],["पारदर्शिता लेखा अपलोड तैयारी","देहरादून","मध्यम"],
].map((t, i) => ({
  id: `T-${400 + i}`, name: t[0], district: t[1], priority: t[2],
  assignee: seededName(i + 5), unit: `Local Unit ${String((i % 6) + 1).padStart(2, "0")}`,
  deadline: `${12 + (i % 15)} Aug 2026`,
  status: ["विलंबित","प्रगति पर","शुरू नहीं","प्रगति पर","जमा","समीक्षाधीन","पूर्ण","प्रगति पर","शुरू नहीं","विलंबित","पूर्ण","प्रगति पर","जमा","शुरू नहीं"][i],
  desc: "Coordinate with the unit leadership, complete the ground work, attach evidence and submit for review.",
  comments: 1 + (i % 4), evidence: i % 3 === 0 ? "2 photos" : i % 3 === 1 ? "1 document" : "—",
}));

const SEED_ISSUES = [
  ["सड़क व संपर्क","पौड़ी गढ़वाल","प्राप्त","कोटद्वार–सतपुली stretch badly damaged after monsoon"],
  ["पानी","अल्मोड़ा","प्रगति पर","Irregular drinking water supply in ward 6 for three weeks"],
  ["परिवहन","देहरादून","हल हुआ","No evening bus service on Rajpur route"],
  ["बिजली","टिहरी गढ़वाल","सौंपा गया","Frequent outages affecting school examinations"],
  ["स्वास्थ्य","चमोली","प्रगति पर","PHC has no attending doctor on weekends"],
  ["शिक्षा","बागेश्वर","प्राप्त","Primary school building needs urgent roof repair"],
  ["रोज़गार","हरिद्वार","सौंपा गया","स्थानीय युवाओं हेतु कौशल प्रशिक्षण शिविर की माँग"],
  ["आपदा संबंधी","रुद्रप्रयाग","प्रगति पर","Landslide debris blocking village footpath"],
  ["पर्यावरण","नैनीताल","प्राप्त","झील के मुहाने पर अनियंत्रित कूड़ा निस्तारण"],
  ["स्थानीय प्रशासन","पिथौरागढ़","हल हुआ","निवास प्रमाण पत्र जारी होने में देरी"],
  ["पानी","चम्पावत","प्राप्त","Hand-pump repair pending since June"],
  ["सड़क व संपर्क","उत्तरकाशी","सौंपा गया","Bridge approach road washed out near Bhatwari"],
].map((x, i) => ({
  id: `UKD-ISSUE-2026-${String(400 + i * 7).padStart(5, "0")}`,
  category: x[0], district: x[1], status: x[2], title: x[3],
  location: `${x[1]} • Block ${"ABC"[i % 3]}`, date: `${1 + (i % 11)} Aug 2026`,
  citizen: seededName(i + 14), phone: "+91 97XXX XXXXX",
  priority: ["उच्च","मध्यम","मध्यम","उच्च","उच्च","मध्यम","निम्न","उच्च","मध्यम","निम्न","मध्यम","उच्च"][i],
  assignedUnit: `${x[1].split(" ")[0]} Local Unit 0${(i % 3) + 1}`,
  ageDays: 2 + (i * 3) % 26,
  notes: i % 2 ? 1 : 2,
}));

const SEED_EVENTS = [
  ["District Organisational Meeting","देहरादून","18 Aug 2026","संगठन"],
  ["Karyakarta Training Camp","अल्मोड़ा","21 Aug 2026","प्रशिक्षण"],
  ["जन समस्या समाधान शिविर","पौड़ी गढ़वाल","24 Aug 2026","जन कार्य"],
  ["राज्य आंदोलन स्मरण दिवस","देहरादून","1 Sep 2026","स्मरण"],
  ["Block Coordinators Review","हरिद्वार","5 Sep 2026","संगठन"],
  ["ग्राम संपर्क यात्रा — द्वितीय चरण","चमोली","9 Sep 2026","Outreach"],
  ["पर्वतीय रोज़गार पर युवा संवाद","नैनीताल","14 Sep 2026","जन कार्य"],
  ["केंद्रीय समिति सत्र","देहरादून","20 Sep 2026","संगठन"],
].map((e, i) => ({
  id: `E-${70 + i}`, title: e[0], district: e[1], date: e[2], type: e[3],
  time: ["10:00 AM","9:30 AM","11:00 AM","8:00 AM","10:30 AM","7:30 AM","3:00 PM","10:00 AM"][i],
  venue: `${e[1]} — District Office Hall`, organiser: seededName(i + 2),
  participants: 24 + (i * 31) % 220,
  desc: "Official organisational programme. Agenda, attendance and follow-up tasks are tracked in the portal. Demo data.",
}));

const SEED_NEWS = [
  ["आधिकारिक सूचना","दल ने अपना आधिकारिक डिजिटल मंच शुरू किया","A single verified source for the organisation's news, documents and public engagement across all 13 districts.","10 Aug 2026"],
  ["जन कार्य","Issue resolution camps announced for hill blocks","Camps in पौड़ी, अल्मोड़ा and चमोली will take citizen grievances directly and track them to closure.","8 Aug 2026"],
  ["संगठन","District units complete weekly reporting cycle","A structured reporting line from local units to the centre is now in regular operation.","6 Aug 2026"],
  ["प्रेस","पर्वतीय सड़क संपर्क पर वक्तव्य","UKD placed a formal representation on monsoon-damaged routes and demanded time-bound restoration.","4 Aug 2026"],
  ["जन कार्य","Water supply follow-up in अल्मोड़ा ward 6","The assigned unit met the local administration; restoration work has been scheduled.","2 Aug 2026"],
  ["संगठन","New local units under formation in बागेश्वर","तीन विकासखंडों में सर्वेक्षण और समिति गठन जारी है।","30 Jul 2026"],
].map((n, i) => ({ id: `N-${i + 1}`, tag: n[0], title: n[1], excerpt: n[2], date: n[3],
  body: "This is demonstration editorial content for the UKD digital prototype. The full article layout supports rich text, photographs, official quotes and linked documents. Real published material will replace this text when the organisation supplies it.\n\nEvery article is categorised, dated and searchable, and appears in the global search and the news archive automatically." }));

const SEED_DOCS = [
  ["Party Constitution (Demo Copy)","Party Documents","2026","केंद्र"],
  ["प्रस्ताव — पर्वतीय रोज़गार नीति","प्रस्ताव","2026","केंद्र"],
  ["केंद्रीय समिति बैठक कार्यवृत्त — जुलाई","Meeting Minutes","2026","केंद्र"],
  ["District Weekly Report — पौड़ी, Wk 31","District Reports","2026","पौड़ी गढ़वाल"],
  ["Press Release — Road Connectivity","Press Releases","2026","केंद्र"],
  ["Notice — Membership Drive Guidelines","Official Notices","2026","केंद्र"],
  ["राज्य आंदोलन अभिलेख टिप्पणी","Historical Documents","2025","केंद्र"],
  ["जन प्रतिनिधित्व — पेयजल आपूर्ति","जन प्रतिनिधित्व","2026","अल्मोड़ा"],
  ["Organisational Appointment Letter (Demo)","नियुक्तियाँ","2026","नैनीताल"],
  ["वार्षिक घोषणा विवरण","घोषणाएँ","2025","केंद्र"],
].map((d, i) => ({ id: `D-${i + 1}`, title: d[0], category: d[1], year: d[2], district: d[3], size: `${120 + i * 34} KB`, date: `${2 + i * 2} Aug 2026` }));

const SEED_NOTICES = [
  { id: "NT-1", title: "Weekly reporting deadline — every Sunday 6 PM", type: "Instruction", audience: "District Presidents", priority: "उच्च", date: "9 Aug 2026", read: [41, 47], ack: [38, 47], content: "All district teams must submit the weekly organisational report by Sunday evening. Units with missing reports will be flagged on the command centre." },
  { id: "NT-2", title: "Statehood remembrance programme — 1 September", type: "Event Notice", audience: "सभी इकाइयाँ", priority: "उच्च", date: "7 Aug 2026", read: [122, 140], ack: [98, 140], content: "All units are requested to organise local remembrance programmes and record attendance in the portal." },
  { id: "NT-3", title: "Membership form digitisation circular", type: "परिपत्र", audience: "ब्लॉक संयोजक", priority: "मध्यम", date: "4 Aug 2026", read: [51, 56], ack: [44, 56], content: "Paper membership records collected before July must be digitised through the member module by 25 August." },
  { id: "NT-4", title: "Issue camp conduct guidelines", type: "Official Notice", audience: "District Admins", priority: "मध्यम", date: "1 Aug 2026", read: [13, 13], ack: [13, 13], content: "Guidelines for conducting public issue resolution camps, including registration, verification and closure reporting." },
];

const SEED_TXNS = Array.from({ length: 12 }, (_, i) => ({
  id: `TX-${900 + i}`, date: `${1 + i * 2} Aug 2026`,
  type: ["सहयोग राशि","सहयोग राशि","District Allocation","Expense","सहयोग राशि","Expense"][i % 6],
  amount: [2100, 5000, 15000, 3200, 1100, 4800, 2500, 7500, 12000, 900, 5100, 2200][i],
  district: DISTRICTS[(i * 5) % 13],
  status: i % 5 === 3 ? "Pending Approval" : "दर्ज", receipt: `RCPT-${2600 + i}`,
}));

const SEED_REPORTS = DISTRICTS.map((d, i) => ({
  id: `R-${i}`, district: d, week: "Wk 32", meetings: 1 + (i % 4), activities: 2 + (i % 5),
  tasksDone: 3 + (i * 2) % 11, membersAdded: (i * 3) % 14, issuesIn: (i % 6), issuesResolved: (i % 4),
  status: i % 5 === 2 ? "अप्राप्त" : i % 5 === 4 ? "प्रारूप" : "जमा",
  challenges: "दूरस्थ ब्लॉकों में परिवहन और नेटवर्क संपर्क।", support: "जन संपर्क हेतु मुद्रित सामग्री।",
}));

const SEED_NOTIFS = [
  ["task","Task assigned — Booth committee verification drive","5m ago"],
  ["issue","New public issue — Hand-pump repair, चम्पावत","32m ago"],
  ["notice","New notice — Weekly reporting deadline","1h ago"],
  ["report","Report missing — टिहरी गढ़वाल, Wk 32","3h ago"],
  ["task","Task overdue — Notice acknowledgement follow-up","5h ago"],
  ["issue","Issue resolved — Evening bus service, देहरादून","1d ago"],
  ["event","Event reminder — District Organisational Meeting, 18 Aug","1d ago"],
  ["doc","Document published — Press Release on road connectivity","2d ago"],
].map((n, i) => ({ id: i, kind: n[0], text: n[1], time: n[2], unread: i < 4 }));

const SEED_AUDIT = [
  ["ज़िला प्रशासक","Updated member profile","Members","Today 11:42","सफल"],
  ["केंद्रीय प्रशासक","Published notice — reporting deadline","Notices","Today 10:05","सफल"],
  ["ब्लॉक संयोजक","Completed task — form digitisation","Tasks","Today 09:18","सफल"],
  ["ज़िला प्रशासक","Exported district report","रिपोर्ट","Yesterday 18:22","सफल"],
  ["केंद्रीय नेतृत्व","Viewed finance dashboard","Finance","Yesterday 16:10","सफल"],
  ["स्थानीय इकाई संयोजक","Failed login attempt","सुरक्षा","Yesterday 08:47","चेतावनी"],
  ["केंद्रीय प्रशासक","Changed role permissions — District Admin","सेटिंग्स","11 Aug 14:35","सफल"],
].map((a, i) => ({ id: i, user: a[0], action: a[1], module: a[2], time: a[3], status: a[4] }));

const TIMELINE_HISTORY = [
  ["पर्वतीय राज्य की माँग","Decades of civic movements argued that the Himalayan districts needed a state of their own — its own priorities, its own voice.","Movement era"],
  ["A party born from the movement","UKD emerged as a regional political voice dedicated to statehood and to the identity of the mountain people.","Founding"],
  ["राज्य आंदोलन तेज़ हुआ","Mass mobilisation across गढ़वाल and कुमाऊँ carried the demand from village squares to the national stage.","संघर्ष"],
  ["उत्तराखंड राज्य बना","The long-sought state was created in November 2000 — a defining moment for the movement and the region.","2000"],
  ["नए राज्य की सेवा में","UKD's focus turned to the promises of statehood: mountain employment, migration, land, water, and dignity.","राज्य निर्माण के वर्ष"],
  ["A modern digital organisation","One digital home now connects the organisation, its Karyakartas and the public — this platform.","2026"],
];

const ISSUE_CATEGORIES = ["सड़क व संपर्क","पानी","बिजली","स्वास्थ्य","शिक्षा","रोज़गार","परिवहन","स्थानीय प्रशासन","पर्यावरण","आपदा संबंधी","अन्य"];
const ROLES = [
  { key: "central-admin", label: "केंद्रीय प्रशासक", scope: "राज्यव्यापी नियंत्रण", district: null },
  { key: "central-leadership", label: "केंद्रीय नेतृत्व", scope: "राज्यव्यापी अवलोकन", district: null },
  { key: "district-admin", label: "ज़िला प्रशासक", scope: "पौड़ी गढ़वाल district", district: "पौड़ी गढ़वाल" },
  { key: "block-coordinator", label: "ब्लॉक संयोजक", scope: "पौड़ी गढ़वाल • Block A", district: "पौड़ी गढ़वाल" },
  { key: "unit-coordinator", label: "स्थानीय इकाई संयोजक", scope: "पौड़ी Local Unit 01", district: "पौड़ी गढ़वाल" },
  { key: "karyakarta", label: "कार्यकर्ता", scope: "केवल सौंपा गया कार्य", district: "पौड़ी गढ़वाल" },
];

/* ============================== PRIMITIVES ============================== */
const ToastCtx = createContext(null);
const useToast = () => useContext(ToastCtx);
const StoreCtx = createContext(null);
const useStore = () => useContext(StoreCtx);

function ToastHost({ toasts }) {
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 300, display: "flex", flexDirection: "column", gap: 10 }}>
      {toasts.map((t) => (
        <div key={t.id} className="ukd-pop" style={{ background: C.ink, color: C.ivory, padding: "12px 18px", borderRadius: 10, fontFamily: sans, fontSize: 14, boxShadow: "0 12px 30px -10px rgba(0,0,0,.45)", display: "flex", gap: 10, alignItems: "center", maxWidth: 360 }}>
          <span style={{ width: 8, height: 8, borderRadius: 99, background: t.kind === "error" ? C.red : C.lime, flexShrink: 0 }} />
          {t.msg}
        </div>
      ))}
    </div>
  );
}

const Btn = ({ children, kind = "primary", size = "md", onClick, style = {}, disabled }) => {
  const base = { fontFamily: sans, fontWeight: 600, border: "none", cursor: disabled ? "not-allowed" : "pointer", borderRadius: 8, transition: "all .15s ease", display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "center", opacity: disabled ? 0.55 : 1 };
  const sizes = { sm: { padding: "7px 14px", fontSize: 13 }, md: { padding: "11px 22px", fontSize: 14.5 }, lg: { padding: "15px 30px", fontSize: 16 } };
  const kinds = {
    primary: { background: C.forest, color: "#fff", boxShadow: "0 6px 16px -6px rgba(47,82,51,.5)" },
    gold: { background: C.gold, color: "#fff", boxShadow: "0 6px 16px -6px rgba(201,138,43,.5)" },
    ghost: { background: "transparent", color: C.forest, border: `1.5px solid ${C.forest}55` },
    ghostLight: { background: "transparent", color: C.ivory, border: `1.5px solid ${C.ivory}66` },
    subtle: { background: "#EDE9DA", color: C.ink },
    danger: { background: C.red, color: "#fff" },
    dark: { background: C.forestDeep, color: C.ivory },
  };
  return (
    <button disabled={disabled} onClick={onClick} style={{ ...base, ...sizes[size], ...kinds[kind], ...style }}
      onMouseEnter={(e) => !disabled && (e.currentTarget.style.filter = "brightness(1.08)")}
      onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}>
      {children}
    </button>
  );
};

const STATUS_COLORS = {
  Received: { bg: "#E8EDF1", fg: C.slate }, Assigned: { bg: "#F3E9D6", fg: "#8A5D14" },
  "प्रगति पर": { bg: "#F3E9D6", fg: "#8A5D14" }, Resolved: { bg: "#E7F0DA", fg: "#4A6B1D" },
  Closed: { bg: "#E6E4DC", fg: C.mute }, Completed: { bg: "#E7F0DA", fg: "#4A6B1D" },
  Overdue: { bg: "#F5E3DE", fg: C.red }, "शुरू नहीं": { bg: "#E6E4DC", fg: C.mute },
  Submitted: { bg: "#E8EDF1", fg: C.slate }, "समीक्षाधीन": { bg: "#EDE6F2", fg: "#5E4478" },
  Active: { bg: "#E7F0DA", fg: "#4A6B1D" }, Pending: { bg: "#F3E9D6", fg: "#8A5D14" },
  Missing: { bg: "#F5E3DE", fg: C.red }, Draft: { bg: "#E6E4DC", fg: C.mute },
  High: { bg: "#F5E3DE", fg: C.red }, Medium: { bg: "#F3E9D6", fg: "#8A5D14" }, Low: { bg: "#E6E4DC", fg: C.mute },
  Recorded: { bg: "#E7F0DA", fg: "#4A6B1D" }, "Pending Approval": { bg: "#F3E9D6", fg: "#8A5D14" },
  Success: { bg: "#E7F0DA", fg: "#4A6B1D" }, Warning: { bg: "#F5E3DE", fg: C.red },
};
const Badge = ({ children, tone }) => {
  const c = STATUS_COLORS[tone || children] || { bg: "#E8EDF1", fg: C.slate };
  return <span style={{ background: c.bg, color: c.fg, fontFamily: sans, fontSize: 11.5, fontWeight: 700, padding: "4px 10px", borderRadius: 99, whiteSpace: "nowrap" }}>{children}</span>;
};

const Eyebrow = ({ children, light }) => (
  <div style={{ fontFamily: sans, fontSize: 12.5, fontWeight: 700, color: light ? C.goldSoft : C.gold, marginBottom: 14 }}>{children}</div>
);

const Modal = ({ open, onClose, title, children, wide }) => {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(20,30,22,.55)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
      <div className="ukd-pop" onClick={(e) => e.stopPropagation()} style={{ background: C.paper, borderRadius: 16, width: "100%", maxWidth: wide ? 760 : 520, maxHeight: "88vh", overflowY: "auto", boxShadow: "0 30px 80px -20px rgba(0,0,0,.5)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", borderBottom: `1px solid ${C.line}` }}>
          <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 600, color: C.ink }}>{title}</div>
          <button onClick={onClose} aria-label="बंद करें" style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: C.mute, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
};

const Field = ({ label, required, children, hint, error }) => (
  <label style={{ display: "block", fontFamily: sans, marginBottom: 16 }}>
    <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 6 }}>{label}{required && <span style={{ color: C.red }}> *</span>}</div>
    {children}
    {hint && !error && <div style={{ fontSize: 12, color: C.mute, marginTop: 5 }}>{hint}</div>}
    {error && <div style={{ fontSize: 12, color: C.red, marginTop: 5, fontWeight: 600 }}>{error}</div>}
  </label>
);
const inputStyle = (error) => ({ width: "100%", padding: "11px 14px", borderRadius: 8, border: `1.5px solid ${error ? C.red : C.line}`, background: "#fff", fontFamily: sans, fontSize: 14.5, color: C.ink });
const TextInput = (p) => <input {...p} style={{ ...inputStyle(p.error), ...p.style }} />;
const TextArea = (p) => <textarea {...p} style={{ ...inputStyle(p.error), minHeight: 110, resize: "vertical", ...p.style }} />;
const Select = ({ options, placeholder, ...p }) => (
  <select {...p} style={{ ...inputStyle(p.error), appearance: "auto", ...p.style }}>
    {placeholder && <option value="">{placeholder}</option>}
    {options.map((o) => <option key={o} value={o}>{o}</option>)}
  </select>
);

const EmptyState = ({ icon = "◫", title, sub, cta, onCta }) => (
  <div style={{ textAlign: "center", padding: "56px 20px", fontFamily: sans }}>
    <div style={{ fontSize: 34, marginBottom: 12, opacity: 0.4 }}>{icon}</div>
    <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 600, color: C.ink, marginBottom: 6 }}>{title}</div>
    {sub && <div style={{ fontSize: 14, color: C.mute, maxWidth: 380, margin: "0 auto 18px" }}>{sub}</div>}
    {cta && <Btn size="sm" onClick={onCta}>{cta}</Btn>}
  </div>
);

const Skeleton = ({ rows = 4, dark }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 6 }}>
    {Array.from({ length: rows }).map((_, i) => <div key={i} className={dark ? "ukd-skel-dark" : "ukd-skel"} style={{ height: 42, width: `${100 - (i % 3) * 8}%` }} />)}
  </div>
);

/* Layered Himalayan ridgeline — the signature element */
const Ridges = ({ h = 200, tones = [C.slate, C.forest, C.forestDark], opacity = 1, style = {} }) => (
  <svg viewBox="0 0 1440 200" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: h, opacity, ...style }} aria-hidden="true">
    <path d="M0,140 L120,90 L230,130 L360,60 L470,120 L610,40 L760,125 L880,70 L1010,130 L1150,55 L1290,115 L1440,80 L1440,200 L0,200 Z" fill={tones[0]} opacity=".5" />
    <path d="M0,165 L150,110 L280,150 L430,85 L560,145 L720,75 L870,150 L1020,95 L1180,150 L1320,105 L1440,135 L1440,200 L0,200 Z" fill={tones[1]} opacity=".75" />
    <path d="M0,185 L180,140 L330,175 L500,120 L660,172 L840,115 L1000,175 L1180,135 L1340,172 L1440,150 L1440,200 L0,200 Z" fill={tones[2]} />
  </svg>
);

/* Tiny SVG charts */
const Bars = ({ data, height = 150, color = C.forest, labelColor = C.mute }) => {
  const max = Math.max(...data.map((d) => d.v), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height, fontFamily: sans }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.ink }}>{d.v}</div>
          <div className="baranim" title={`${d.k}: ${d.v}`} style={{ width: "100%", maxWidth: 42, height: `${(d.v / max) * (height - 52)}px`, background: d.c || color, borderRadius: "5px 5px 0 0", animationDelay: `${i * 60}ms` }} />
          <div style={{ fontSize: 10.5, color: labelColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{d.k}</div>
        </div>
      ))}
    </div>
  );
};
const Donut = ({ segments, size = 130, label, sub }) => {
  const total = segments.reduce((a, s) => a + s.v, 0) || 1;
  let acc = 0; const r = 44, cx = 60, cy = 60, circ = 2 * Math.PI * r;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      <svg width={size} height={size} viewBox="0 0 120 120">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E9E5D6" strokeWidth="14" />
        {segments.map((s, i) => {
          const frac = s.v / total; const dash = frac * circ; const off = circ * (1 - acc) + circ * 0.25; acc += frac;
          return <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.c} strokeWidth="14" strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={off} strokeLinecap="butt" />;
        })}
        <text x="60" y="57" textAnchor="middle" fontFamily={sans} fontWeight="700" fontSize="19" fill={C.ink}>{label}</text>
        <text x="60" y="74" textAnchor="middle" fontFamily={sans} fontSize="9.5" fill={C.mute}>{sub}</text>
      </svg>
      <div style={{ fontFamily: sans, fontSize: 12.5, display: "flex", flexDirection: "column", gap: 6 }}>
        {segments.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, color: C.ink }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: s.c }} /> {s.k} <b style={{ marginLeft: "auto" }}>{s.v}</b>
          </div>
        ))}
      </div>
    </div>
  );
};
const Spark = ({ points, color = C.gold, w = 140, h = 40 }) => {
  const max = Math.max(...points), min = Math.min(...points);
  const path = points.map((p, i) => `${(i / (points.length - 1)) * w},${h - ((p - min) / (max - min || 1)) * (h - 6) - 3}`).join(" L ");
  return <svg width={w} height={h}><path d={`M ${path}`} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" /></svg>;
};

const HealthRing = ({ pct, size = 54, stroke = 6, color }) => {
  const r = (size - stroke) / 2, circ = 2 * Math.PI * r;
  const c = color || (pct >= 75 ? C.lime : pct >= 55 ? C.gold : C.red);
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E7E3D4" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={c} strokeWidth={stroke} strokeDasharray={`${(pct / 100) * circ} ${circ}`} strokeLinecap="round" />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" transform={`rotate(90 ${size / 2} ${size / 2})`} fontFamily={sans} fontWeight="700" fontSize={size / 4.4} fill={C.ink}>{pct}%</text>
    </svg>
  );
};

const Avatar = ({ name, size = 40, dark }) => {
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("");
  const hues = [C.forest, C.red, C.slateSoft, C.forestDark, C.redDark];
  const bg = hues[(name.charCodeAt(0) + name.length) % hues.length];
  return <div aria-hidden="true" style={{ width: size, height: size, borderRadius: "50%", background: bg, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: sans, fontWeight: 700, fontSize: size / 2.6, flexShrink: 0, border: dark ? `2px solid ${C.ivory}33` : "none" }}>{initials}</div>;
};

const useIsMobile = (bp = 860) => {
  const [m, setM] = useState(typeof window !== "undefined" ? window.innerWidth < bp : false);
  useEffect(() => { const f = () => setM(window.innerWidth < bp); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, [bp]);
  return m;
};

/* Generic searchable / filterable table with mobile card fallback */
function DataTable({ columns, rows, onRow, searchKeys = [], filters = [], empty, dense }) {
  const [q, setQ] = useState("");
  const [fvals, setFvals] = useState({});
  const mobile = useIsMobile(760);
  const filtered = useMemo(() => rows.filter((r) => {
    if (q && !searchKeys.some((k) => String(r[k] || "").toLowerCase().includes(q.toLowerCase()))) return false;
    for (const f of filters) if (fvals[f.key] && String(r[f.key]) !== fvals[f.key]) return false;
    return true;
  }), [rows, q, fvals]);
  return (
    <div style={{ fontFamily: sans }}>
      {(searchKeys.length > 0 || filters.length > 0) && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          {searchKeys.length > 0 && <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="खोजें…" aria-label="तालिका में खोजें" style={{ ...inputStyle(), maxWidth: 260, padding: "9px 13px" }} />}
          {filters.map((f) => (
            <select key={f.key} value={fvals[f.key] || ""} onChange={(e) => setFvals({ ...fvals, [f.key]: e.target.value })} aria-label={`Filter by ${f.label}`} style={{ ...inputStyle(), width: "auto", padding: "9px 13px" }}>
              <option value="">{f.label}: All</option>
              {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ))}
          <div style={{ marginLeft: "auto", alignSelf: "center", fontSize: 12.5, color: C.mute }}>{filtered.length} of {rows.length}</div>
        </div>
      )}
      {filtered.length === 0 ? (empty || <EmptyState title="कुछ नहीं मिला" sub="खोज या फ़िल्टर हटाकर देखें।" />) : mobile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((r, i) => (
            <div key={i} className="hoverlift" onClick={() => onRow && onRow(r)} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, padding: 14, cursor: onRow ? "pointer" : "default" }}>
              {columns.map((c) => (
                <div key={c.key} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "4px 0", fontSize: 13.5 }}>
                  <span style={{ color: C.mute, fontSize: 12 }}>{c.label}</span>
                  <span style={{ textAlign: "right", color: C.ink, fontWeight: c.strong ? 700 : 500 }}>{c.render ? c.render(r) : r[c.key]}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ overflowX: "auto", background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: dense ? 13 : 14 }}>
            <thead>
              <tr>{columns.map((c) => <th key={c.key} style={{ textAlign: "left", padding: dense ? "10px 14px" : "13px 16px", fontSize: 11.5, color: C.mute, borderBottom: `1px solid ${C.line}`, whiteSpace: "nowrap" }}>{c.label}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={i} className={onRow ? "rowhover" : ""} onClick={() => onRow && onRow(r)}>
                  {columns.map((c) => <td key={c.key} style={{ padding: dense ? "9px 14px" : "12px 16px", borderBottom: i < filtered.length - 1 ? `1px solid ${C.line}88` : "none", color: C.ink, fontWeight: c.strong ? 600 : 400, whiteSpace: "nowrap" }}>{c.render ? c.render(r) : r[c.key]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ============================== PUBLIC WEBSITE ============================== */
const SITE_NAV = [
  ["home", "मुख्य पृष्ठ"], ["about", "दल परिचय"], ["organisation", "संगठन"], ["history", "इतिहास व विरासत"],
  ["news", "समाचार"], ["people", "जन पोर्टल"], ["events", "कार्यक्रम"], ["gallery", "चित्र दीर्घा"], ["documents", "दस्तावेज़"],
];

function SiteHeader({ route, nav, openSearch }) {
  const mobile = useIsMobile(1080);
  const [drawer, setDrawer] = useState(false);
  const go = (r) => { nav(r); setDrawer(false); };
  return (
    <>
      {/* Flag bar — the emblem's green/red split, carried across the top */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${C.green} 0%, ${C.green} 50%, ${C.red} 50%, ${C.red} 100%)` }} />
      <header style={{ position: "sticky", top: 0, zIndex: 100, background: `${C.ivory}F2`, backdropFilter: "blur(10px)", borderBottom: `1px solid ${C.line}` }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", gap: 26 }}>
          <button onClick={() => go("home")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 11, padding: 0 }}>
            <Logo size={40} />
            <div style={{ textAlign: "left" }}>
              <div style={{ fontFamily: serif, fontWeight: 700, fontSize: 19, color: C.ink, lineHeight: 1.2, letterSpacing: "-.01em" }}>उत्तराखंड क्रांति दल</div>
              <div style={{ fontFamily: sans, fontSize: 11.5, color: C.red, fontWeight: 600, marginTop: 1 }}>उत्तराखंड की अपनी आवाज़</div>
            </div>
          </button>
          {!mobile && (
            <nav style={{ display: "flex", gap: 20, marginLeft: 8, fontFamily: sans, fontSize: 13.5, fontWeight: 600 }}>
              {SITE_NAV.slice(1).map(([r, l]) => (
                <button key={r} onClick={() => go(r)} className={`navlink ${route.startsWith(r) ? "active" : ""}`} style={{ background: "none", border: "none", cursor: "pointer", color: route.startsWith(r) ? C.forest : "#3c4a3f", padding: 0, fontWeight: 600, fontFamily: sans, fontSize: 13.5 }}>{l}</button>
              ))}
            </nav>
          )}
          <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
            <button onClick={openSearch} aria-label="खोजें" style={{ background: "none", border: `1.5px solid ${C.line}`, borderRadius: 8, padding: "8px 12px", cursor: "pointer", color: C.mute, fontFamily: sans, fontSize: 13.5 }}>⌕ खोजें</button>
            {!mobile && <Btn size="sm" kind="ghost" onClick={() => go("people/report")}>समस्या दर्ज करें</Btn>}
            {!mobile && <Btn size="sm" kind="gold" onClick={() => go("join")}>सदस्य बनें</Btn>}
            {mobile && <button aria-label="मेनू" onClick={() => setDrawer(true)} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: C.ink }}>☰</button>}
          </div>
        </div>
      </header>
      {drawer && (
        <div style={{ position: "fixed", inset: 0, zIndex: 150 }} onClick={() => setDrawer(false)}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(20,30,22,.5)" }} />
          <div className="ukd-pop" onClick={(e) => e.stopPropagation()} style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 300, background: C.ivory, padding: 24, display: "flex", flexDirection: "column", gap: 4, overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <Logo size={36} />
              <button onClick={() => setDrawer(false)} aria-label="मेनू बंद करें" style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer" }}>×</button>
            </div>
            {SITE_NAV.map(([r, l]) => (
              <button key={r} onClick={() => go(r)} style={{ background: route === r ? "#EEF3EF" : "none", border: "none", textAlign: "left", padding: "12px 14px", borderRadius: 8, fontFamily: sans, fontSize: 15.5, fontWeight: 600, color: C.ink, cursor: "pointer" }}>{l}</button>
            ))}
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              <Btn kind="gold" onClick={() => go("join")}>सदस्य बनें</Btn>
              <Btn kind="ghost" onClick={() => go("people/report")}>समस्या दर्ज करें</Btn>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const Logo = ({ size = 40, light }) => (
  <img
    src="/ukd-logo.png"
    width={size}
    height={size}
    alt="उत्तराखंड क्रांति दल का आधिकारिक चिन्ह"
    style={{
      display: "block", width: size, height: size, objectFit: "contain",
      borderRadius: "50%",
      boxShadow: light ? "0 0 0 2px rgba(255,255,255,.9)" : "none",
    }}
  />
);

function SiteFooter({ nav }) {
  const cols = [
    ["जानें", [["about","दल परिचय"],["organisation","संगठन"],["history","इतिहास व विरासत"],["news","समाचार"]]],
    ["जनता", [["people","जन पोर्टल"],["events","कार्यक्रम"],["join","सदस्य बनें"],["support","सहयोग करें"]]],
    ["आधिकारिक", [["documents","दस्तावेज़"],["transparency","पारदर्शिता"],["contact","संपर्क"],["contact","गोपनीयता नीति"]]],
  ];
  return (
    <footer style={{ background: C.forestDeep, color: C.ivory, marginTop: 0 }}>
      <Ridges h={90} tones={[C.forestDark, "#0A3D20", C.forestDeep]} style={{ background: C.ivory }} />
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "44px 20px 30px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 34 }}>
        <div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
            <Logo size={44} light />
            <div>
              <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 700 }}>उत्तराखंड क्रांति दल</div>
              <div style={{ fontFamily: sans, fontSize: 11.5, color: "#FF8A85", fontWeight: 600 }}>आधिकारिक वेबसाइट</div>
            </div>
          </div>
          <p style={{ fontFamily: sans, fontSize: 14, lineHeight: 1.85, color: "#C9D5CB", maxWidth: 320 }}>उत्तराखंड की अपनी आवाज़। एक संगठन, एक नेटवर्क, एक डिजिटल घर।</p>
        </div>
        {cols.map(([h, links]) => (
          <div key={h}>
            <div style={{ fontFamily: sans, fontSize: 13, fontWeight: 700, color: "#FF8A85", marginBottom: 14 }}>{h}</div>
            {links.map(([r, l], i) => (
              <button key={i} onClick={() => nav(r)} style={{ display: "block", background: "none", border: "none", color: "#DCE7DC", fontFamily: sans, fontSize: 14.5, padding: "5px 0", cursor: "pointer", textAlign: "left" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#FF8A85")} onMouseLeave={(e) => (e.currentTarget.style.color = "#DCE7DC")}>{l}</button>
            ))}
          </div>
        ))}
      </div>
      <div style={{ borderTop: `1px solid ${C.ivory}1c`, padding: "16px 20px", fontFamily: sans, fontSize: 12.5, color: "#9DAA97", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, maxWidth: 1280, margin: "0 auto" }}>
        <span>© 2026 उत्तराखंड क्रांति दल · आधिकारिक वेबसाइट</span>
        <span>प्रारूप संस्करण · सामग्री प्रदर्शन हेतु</span>
      </div>
    </footer>
  );
}

function SearchOverlay({ open, onClose, nav }) {
  const store = useStore();
  const [q, setQ] = useState("");
  const ref = useRef(null);
  useEffect(() => { if (open) { setQ(""); setTimeout(() => ref.current && ref.current.focus(), 50); } }, [open]);
  if (!open) return null;
  const ql = q.toLowerCase();
  const hits = q.length < 2 ? [] : [
    ...SEED_NEWS.filter((n) => n.title.toLowerCase().includes(ql)).map((n) => ({ t: "समाचार", label: n.title, r: `news/${n.id}` })),
    ...SEED_DOCS.filter((d) => d.title.toLowerCase().includes(ql)).map((d) => ({ t: "Document", label: d.title, r: "documents" })),
    ...SEED_EVENTS.filter((e) => e.title.toLowerCase().includes(ql)).map((e) => ({ t: "Event", label: e.title, r: `events/${e.id}` })),
    ...DISTRICTS.filter((d) => d.toLowerCase().includes(ql)).map((d) => ({ t: "संगठन", label: `${d} district`, r: `organisation/district/${d}` })),
    ...TIMELINE_HISTORY.filter((h) => h[0].toLowerCase().includes(ql)).map((h) => ({ t: "इतिहास", label: h[0], r: "history" })),
  ].slice(0, 9);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 220, background: "rgba(20,30,22,.6)", backdropFilter: "blur(6px)", display: "flex", justifyContent: "center", paddingTop: "12vh" }}>
      <div className="ukd-pop" onClick={(e) => e.stopPropagation()} style={{ width: "min(640px, 92vw)", alignSelf: "flex-start", background: C.paper, borderRadius: 16, overflow: "hidden", boxShadow: "0 30px 90px -20px rgba(0,0,0,.6)" }}>
        <input ref={ref} value={q} onChange={(e) => setQ(e.target.value)} placeholder="समाचार, दस्तावेज़, कार्यक्रम, ज़िले, इतिहास खोजें…" style={{ width: "100%", border: "none", padding: "20px 24px", fontFamily: sans, fontSize: 17, background: "transparent", color: C.ink }} />
        <div style={{ borderTop: `1px solid ${C.line}`, maxHeight: 380, overflowY: "auto" }}>
          {q.length >= 2 && hits.length === 0 && <div style={{ padding: 28, fontFamily: sans, color: C.mute, fontSize: 14 }}>No results for “{q}”. Try a district name, an event or a document title.</div>}
          {hits.map((h, i) => (
            <button key={i} onClick={() => { onClose(); nav(h.r); }} className="rowhover" style={{ display: "flex", width: "100%", gap: 14, alignItems: "center", padding: "13px 24px", background: "none", border: "none", cursor: "pointer", textAlign: "left", borderBottom: `1px solid ${C.line}66` }}>
              <span style={{ fontFamily: sans, fontSize: 10.5, fontWeight: 700, color: C.gold, width: 92, flexShrink: 0 }}>{h.t.toUpperCase()}</span>
              <span style={{ fontFamily: sans, fontSize: 14.5, color: C.ink }}>{h.label}</span>
            </button>
          ))}
          {q.length < 2 && <div style={{ padding: "18px 24px", fontFamily: sans, fontSize: 12.5, color: C.mute }}>Type at least two characters. Search covers news, documents, events, the organisation and the historical archive.</div>}
        </div>
      </div>
    </div>
  );
}

const Section = ({ children, bg, style = {} }) => (
  <section style={{ background: bg || "transparent", ...style }}>
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "clamp(44px, 7vw, 80px) clamp(16px, 4vw, 20px)", ...style.inner }}>{children}</div>
  </section>
);
const H2 = ({ children, light, style = {} }) => (
  <h2 style={{ fontFamily: serif, fontWeight: 700, fontSize: "clamp(24px, 3.6vw, 40px)", lineHeight: 1.32, color: light ? C.ivory : C.ink, margin: "0 0 16px", ...style }}>{children}</h2>
);
const Lead = ({ children, light, style = {} }) => (
  <p style={{ fontFamily: sans, fontSize: "clamp(15.5px, 1.5vw, 17px)", lineHeight: 1.85, color: light ? "#C9D2C4" : "#4A554C", maxWidth: 640, margin: "0 0 24px", ...style }}>{children}</p>
);

/* Three founding faces as compact horizontal cards. Badoni and Airy lead, and
   carry the red rule. LEADERS is declared further down and only read at render
   time, which is after module evaluation. */
function HeroFaces({ nav }) {
  const mobile = useIsMobile(760);
  const faces = [LEADERS[0], LEADERS[1], LEADERS[2]];
  return (
    <div className="ukd-fade" style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(3, 1fr)", gap: mobile ? 34 : 26, animationDelay: "160ms" }}>
      {faces.map((p, i) => (
        <button key={p.name} onClick={() => nav("organisation")} className="ukd-portrait"
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, background: "none", border: "none", padding: 0, cursor: "pointer" }}>
          {/* Ring carries the emblem's own green-to-red diagonal */}
          <div className="ukd-ring" style={{
            width: "clamp(148px, 17vw, 206px)", aspectRatio: "1", borderRadius: "50%", padding: 4,
            background: `linear-gradient(135deg, ${C.green} 0%, ${C.green} 47%, ${C.red} 53%, ${C.red} 100%)`,
            boxShadow: "0 22px 50px -18px rgba(0,0,0,.7)", flexShrink: 0,
          }}>
            <div style={{ width: "100%", height: "100%", borderRadius: "50%", padding: 3, background: C.forestDark }}>
              <img src={p.img} alt={p.name} loading="eager"
                style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover", objectPosition: "center 18%", display: "block" }} />
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: serif, fontSize: "clamp(19px, 2vw, 24px)", fontWeight: 700, color: "#fff", lineHeight: 1.35 }}>{p.name}</div>
            <div style={{ width: 26, height: 2, background: C.red, margin: "9px auto" }} />
            <div style={{ fontFamily: sans, fontSize: 14.5, color: "#B9D2BF", fontWeight: 500 }}>{p.note || p.role}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

function Hero({ nav }) {
  const stack = useIsMobile(880);
  return (
    <div style={{ background: C.forestDeep, position: "relative", overflow: "hidden", minHeight: stack ? "min(86vh, 560px)" : "min(74vh, 640px)", display: "flex", alignItems: "center" }}>
      {/* The photograph sits behind everything, anchored right so she survives every crop */}
      <img src="/hero-woman.jpg" alt="पौड़ी की एक महिला अपने मोबाइल पर समाधान की सूचना दिखाती हुई"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: stack ? "68% 30%" : "right 34%" }} />
      {/* Green scrim from the left keeps the Devanagari legible over the hillside */}
      <div aria-hidden="true" style={{
        position: "absolute", inset: 0,
        background: stack
          ? `linear-gradient(180deg, ${C.forestDeep}D9 0%, ${C.forestDeep}B0 42%, ${C.forestDeep}F2 100%)`
          : `linear-gradient(90deg, ${C.forestDeep}F2 0%, ${C.forestDeep}E0 34%, ${C.forestDeep}99 52%, transparent 74%)`,
      }} />
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "clamp(56px, 8vw, 96px) 20px", position: "relative", width: "100%" }}>
        <div className="ukd-fade" style={{ maxWidth: stack ? "100%" : 620 }}>
          <Eyebrow light>उत्तराखंड क्रांति दल · आधिकारिक डिजिटल मंच</Eyebrow>
          <h1 style={{ fontFamily: serif, fontWeight: 700, fontSize: "clamp(34px, 4.6vw, 58px)", color: "#fff", margin: "0 0 22px", textShadow: "0 2px 24px rgba(0,0,0,.35)" }}>
            जहाँ क्रांति दल है,<br />
            <span style={{ color: "#FF8A85" }}>वहाँ जवाब है।</span>
          </h1>
          <p style={{ fontFamily: sans, fontSize: "clamp(16px, 1.6vw, 19px)", color: "#DCE7DC", maxWidth: 540, marginBottom: 34, textShadow: "0 1px 12px rgba(0,0,0,.35)" }}>
            शिकायत दर्ज कीजिए, और उसका हिसाब पाइए। उत्तराखंड क्रांति दल का
            जन पोर्टल — हर समस्या, हर ज़िले में, समाधान तक दर्ज।
          </p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <Btn kind="gold" size="lg" onClick={() => nav("people/report")}>समस्या दर्ज करें →</Btn>
            <Btn kind="ghostLight" size="lg" onClick={() => nav("about")}>दल को जानें</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

/* The three founding faces, as a band directly under the hero. */
function LeadershipBand({ nav }) {
  return (
    <div style={{ background: C.forestDark }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "clamp(40px, 5vw, 62px) 20px clamp(44px, 5vw, 66px)" }}>
        <div style={{ marginBottom: 30 }}>
          <div style={{ fontFamily: sans, fontSize: 13.5, color: "#FF8A85", fontWeight: 700, marginBottom: 8 }}>वरिष्ठ नेतृत्व</div>
          <h2 style={{ fontFamily: serif, fontSize: "clamp(26px, 3.2vw, 38px)", fontWeight: 700, color: "#fff", margin: 0 }}>
            जिन्होंने पहाड़ की आवाज़ बुलंद की।
          </h2>
        </div>
        <HeroFaces nav={nav} />
        <div style={{ marginTop: 26 }}>
          <Btn kind="ghostLight" onClick={() => nav("organisation")}>पूरा संगठन देखें</Btn>
        </div>
      </div>
    </div>
  );
}

function StatStrip() {
  const stats = [["13", "ज़िलों में उपस्थिति"], ["24×7", "डिजिटल पहुँच"], ["1979", "स्थापना वर्ष"], ["एक", "आधिकारिक डिजिटल मंच"]];
  return (
    <div style={{ maxWidth: 1280, margin: "40px auto 0", padding: "0 20px", position: "relative", zIndex: 5 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        {stats.map(([n, l], i) => (
          <div key={i} className="hoverlift ukd-fade" style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: "26px 24px", boxShadow: "0 12px 32px -18px rgba(24,43,28,.25)", animationDelay: `${i * 90}ms` }}>
            <div style={{ fontFamily: serif, fontSize: 42, fontWeight: 500, color: C.forest, lineHeight: 1 }}>{n}</div>
            <div style={{ fontFamily: sans, fontSize: 14, fontWeight: 600, color: C.mute, marginTop: 8 }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ fontFamily: sans, fontSize: 12, color: C.mute, marginTop: 8, textAlign: "right" }}>प्रदर्शन हेतु प्रस्तुत — आधिकारिक संगठनात्मक आँकड़े नहीं।</div>
    </div>
  );
}

function OrgPreview({ nav }) {
  const chain = ["UKD", "केंद्रीय नेतृत्व", "मंडल", "ज़िला", "ब्लॉक", "स्थानीय इकाई"];
  return (
    <Section>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 50, alignItems: "center" }}>
        <div>
          <Eyebrow>नेतृत्व व संगठन</Eyebrow>
          <H2>केंद्र से हर गाँव तक संगठित।</H2>
          <Lead>UKD is organised as one connected network — from central leadership through Mandals, districts and blocks, down to local units on the ground.</Lead>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 26 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", background: "#fff", border: `1px solid ${C.line}`, borderRadius: 99, padding: "8px 16px 8px 8px" }}>
                <Avatar name={seededName(i * 4)} size={34} />
                <div style={{ fontFamily: sans }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>{seededName(i * 4)}</div>
                  <div style={{ fontSize: 11, color: C.mute }}>पदाधिकारी</div>
                </div>
              </div>
            ))}
          </div>
          <Btn onClick={() => nav("organisation")}>संगठन देखें</Btn>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
          {chain.map((c, i) => (
            <React.Fragment key={c}>
              <div className="hoverlift" style={{ background: i === 0 ? C.forest : "#fff", color: i === 0 ? C.ivory : C.ink, border: `1px solid ${i === 0 ? C.forest : C.line}`, borderRadius: 10, padding: "12px 34px", fontFamily: i === 0 ? serif : sans, fontWeight: 600, fontSize: i === 0 ? 20 : 14.5, minWidth: 220, textAlign: "center" }}>{c}</div>
              {i < chain.length - 1 && <div style={{ width: 2, height: 22, background: C.gold }} />}
            </React.Fragment>
          ))}
        </div>
      </div>
    </Section>
  );
}

function RegionMap({ nav, compact }) {
  const [open, setOpen] = useState("गढ़वाल");
  const store = useStore();
  const tones = { गढ़वाल: C.forest, कुमाऊँ: C.red, तराई: C.slateSoft };
  return (
    <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "repeat(auto-fit, minmax(320px, 1fr))", gap: 40, alignItems: "start" }}>
      <div>
        <svg viewBox="0 0 400 300" style={{ width: "100%", maxWidth: 480 }} role="img" aria-label="उत्तराखंड के क्षेत्रों का मानचित्र">
          {[
            ["गढ़वाल", "M30,180 L70,80 L150,40 L210,90 L190,170 L120,220 Z"],
            ["कुमाऊँ", "M210,90 L300,50 L370,110 L330,200 L240,210 L190,170 Z"],
            ["तराई", "M120,220 L190,170 L240,210 L330,200 L310,262 L100,262 Z"],
          ].map(([r, d]) => (
            <path key={r} d={d} fill={tones[r]} opacity={open === r ? 1 : 0.45} stroke={C.ivory} strokeWidth="4" style={{ cursor: "pointer", transition: "opacity .2s" }} onClick={() => setOpen(r)} />
          ))}
          <text x="105" y="140" fill={C.ivory} fontFamily={sans} fontWeight="700" fontSize="15" pointerEvents="none">गढ़वाल</text>
          <text x="255" y="140" fill={C.ivory} fontFamily={sans} fontWeight="700" fontSize="15" pointerEvents="none">कुमाऊँ</text>
          <text x="195" y="245" fill={C.ivory} fontFamily={sans} fontWeight="700" fontSize="14" pointerEvents="none">तराई</text>
        </svg>
        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          {Object.keys(REGIONS).map((r) => (
            <button key={r} onClick={() => setOpen(r)} style={{ fontFamily: sans, fontWeight: 700, fontSize: 13, padding: "8px 18px", borderRadius: 99, border: `1.5px solid ${tones[r]}`, background: open === r ? tones[r] : "transparent", color: open === r ? "#fff" : tones[r], cursor: "pointer" }}>{r}</button>
          ))}
        </div>
      </div>
      <div className="ukd-fade" key={open}>
        <div style={{ fontFamily: serif, fontSize: 27, fontWeight: 500, color: C.ink, marginBottom: 4 }}>{open}</div>
        <div style={{ fontFamily: sans, fontSize: 13.5, color: C.mute, marginBottom: 18 }}>{REGIONS[open].length} districts · organisational presence · public activity (demo data)</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 12 }}>
          {REGIONS[open].map((d) => {
            const issues = store.issues.filter((i) => i.district === d).length;
            const units = SEED_UNITS.filter((u) => u.district === d).length;
            return (
              <button key={d} className="hoverlift" onClick={() => nav(`organisation/district/${d}`)} style={{ textAlign: "left", background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, padding: 16, cursor: "pointer" }}>
                <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 15, color: C.ink }}>{d}</div>
                <div style={{ fontFamily: sans, fontSize: 12, color: C.mute, marginTop: 6, lineHeight: 1.6 }}>{units || 1} active unit{units === 1 ? "" : "s"} · {issues} public issue{issues === 1 ? "" : "s"}<br />Latest update: local outreach drive</div>
                <div style={{ fontFamily: sans, fontSize: 12, fontWeight: 700, color: C.gold, marginTop: 8 }}>ज़िला देखें →</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function NewsCard({ n, nav, big }) {
  return (
    <article className="hoverlift" onClick={() => nav(`news/${n.id}`)} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, overflow: "hidden", cursor: "pointer", display: "flex", flexDirection: "column" }}>
      <div style={{ height: big ? 150 : 110, background: `linear-gradient(135deg, ${C.forest}, ${C.slate})`, position: "relative" }}>
        <Ridges h={big ? 60 : 44} tones={[`${C.ivory}30`, `${C.ivory}18`, `${C.ivory}0c`]} style={{ position: "absolute", bottom: 0 }} />
        <span style={{ position: "absolute", top: 14, left: 14, background: C.gold, color: "#fff", fontFamily: sans, fontSize: 10.5, fontWeight: 700, padding: "4px 10px", borderRadius: 99 }}>{n.tag.toUpperCase()}</span>
      </div>
      <div style={{ padding: 20, display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ fontFamily: sans, fontSize: 12, color: C.mute, marginBottom: 8 }}>{n.date}</div>
        <div style={{ fontFamily: serif, fontSize: big ? 22 : 18.5, fontWeight: 600, color: C.ink, lineHeight: 1.28, marginBottom: 10 }}>{n.title}</div>
        <p style={{ fontFamily: sans, fontSize: 13.5, lineHeight: 1.65, color: "#4A554C", margin: 0, flex: 1 }}>{n.excerpt}</p>
        <div style={{ fontFamily: sans, fontSize: 13, fontWeight: 700, color: C.forest, marginTop: 14 }}>और पढ़ें →</div>
      </div>
    </article>
  );
}

/* Photographs of real UKD figures.
   TODO — confirm every designation with the party office before publishing.
   Descriptions are intentionally minimal; do not invent biographical detail. */
const LEADERS = [
  { name: "इन्द्रमणि बडोनी", img: "/leaders/Indra-Mani-Badoni.webp", role: "राज्य आंदोलन के प्रणेता", note: "उत्तराखंड के गांधी" },
  { name: "काशी सिंह ऐरी", img: "/leaders/Kashi-Singh-Airy.webp", role: "वरिष्ठ नेता", note: "" },
  { name: "दिवाकर भट्ट", img: "/leaders/Diwakar-Bhatt.jpeg", role: "वरिष्ठ नेता", note: "" },
  { name: "पुष्पेश त्रिपाठी", img: "/leaders/Pushpesh-Tripathi.jpg", role: "वरिष्ठ नेता", note: "" },
  { name: "नारायण सिंह जंतवाल", img: "/leaders/narayana-singh-jantwal.jpeg", role: "वरिष्ठ नेता", note: "" },
  { name: "आशीष सिंह नेगी", img: "/leaders/Ashish-Singh-Negi.jpeg", role: "वरिष्ठ नेता", note: "" },
];

function LeadershipSection({ nav }) {
  return (
    <Section>
      <Eyebrow>नेतृत्व</Eyebrow>
      <H2>संगठन के अन्य वरिष्ठ नेता।</H2>
      <Lead>राज्य आंदोलन से लेकर आज तक — दल का नेतृत्व जिन्होंने संभाला।</Lead>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 18 }}>
        {LEADERS.slice(3).map((p, i) => (
          <div key={p.name} className="ukd-portrait ukd-fade"
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, animationDelay: `${i * 70}ms` }}>
            <div className="ukd-ring" style={{
              width: "clamp(132px, 14vw, 170px)", aspectRatio: "1", borderRadius: "50%", padding: 4,
              background: `linear-gradient(135deg, ${C.green} 0%, ${C.green} 47%, ${C.red} 53%, ${C.red} 100%)`,
              boxShadow: "0 16px 38px -16px rgba(4,45,24,.55)",
            }}>
              <div style={{ width: "100%", height: "100%", borderRadius: "50%", padding: 3, background: C.ivory }}>
                <img src={p.img} alt={p.name} loading="lazy"
                  style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover", objectPosition: "center 18%", display: "block" }} />
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: serif, fontSize: 19.5, fontWeight: 700, color: C.ink, lineHeight: 1.35 }}>{p.name}</div>
              <div style={{ width: 24, height: 2, background: C.red, margin: "8px auto" }} />
              <div style={{ fontFamily: sans, fontSize: 14, color: C.mute }}>{p.note || p.role}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 26 }}><Btn kind="ghost" onClick={() => nav("organisation")}>पूरा संगठन देखें</Btn></div>
    </Section>
  );
}

function HomePage({ nav }) {
  const store = useStore();
  return (
    <>
      <Hero nav={nav} />
      <LeadershipBand nav={nav} />
      <StatStrip />
      <Section>
        <Eyebrow>दल परिचय</Eyebrow>
        <H2>एक आंदोलन, जिसकी कहानी जाननी ज़रूरी है।</H2>
        <Lead>राज्य आंदोलन की कोख से जन्मा, पहाड़ में जड़ें जमाए, और आगे के काम के लिए संगठित।</Lead>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 16 }}>
          {[["हमारी दृष्टि", "एक स्वाभिमानी, आत्मनिर्भर पर्वतीय राज्य — जहाँ नीति पहाड़ से लिखी जाए, पहाड़ पर थोपी न जाए।", "about"],
            ["हमारा नेतृत्व", "केंद्र से लेकर हर स्थानीय इकाई तक एक संगठित नेतृत्व श्रृंखला।", "organisation"],
            ["हमारी यात्रा", "राज्य आंदोलन से लेकर एक आधुनिक डिजिटल संगठन तक।", "history"],
            ["हमारा कार्य", "जन समस्याएँ, ज़मीनी संगठन और जवाबदेह अनुवर्ती कार्रवाई।", "people"]].map(([t, d, r], i) => (
            <button key={t} className="hoverlift" onClick={() => nav(r)} style={{ textAlign: "left", background: "#fff", border: `1px solid ${C.line}`, borderTop: `3px solid ${[C.forest, C.gold, C.slate, C.lime][i]}`, borderRadius: 12, padding: 22, cursor: "pointer" }}>
              <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 600, color: C.ink, marginBottom: 8 }}>{t}</div>
              <p style={{ fontFamily: sans, fontSize: 13.5, lineHeight: 1.65, color: "#4A554C", margin: 0 }}>{d}</p>
            </button>
          ))}
        </div>
        <div style={{ marginTop: 26 }}><Btn kind="ghost" onClick={() => nav("about")}>दल को जानें</Btn></div>
      </Section>
      <div style={{ background: C.ivory }}><LeadershipSection nav={nav} /></div>
      <Section>
        <Eyebrow>उत्तराखंड भर में</Eyebrow>
        <H2>प्रदेश के तेरहों ज़िलों में उपस्थिति।</H2>
        <Lead>क्षेत्रवार संगठन देखें — गढ़वाल, कुमाऊँ और तराई।</Lead>
        <RegionMap nav={nav} />
      </Section>
      <div style={{ background: C.forestDark, position: "relative", overflow: "hidden" }}>
        <Section style={{ inner: { paddingTop: 70, paddingBottom: 70 } }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 44, alignItems: "center", position: "relative", zIndex: 2 }}>
            <div>
              <Eyebrow light>जन पोर्टल</Eyebrow>
              <H2 light>आपकी समस्या का जवाब मिलना चाहिए।</H2>
              <Lead light>Any citizen of Uttarakhand can submit a public issue — a road, a water line, a school, a clinic — and track it to resolution through the organisation's network.</Lead>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Btn kind="gold" onClick={() => nav("people/report")}>जन समस्या दर्ज करें</Btn>
                <Btn kind="ghostLight" onClick={() => nav("people/track")}>समस्या की स्थिति देखें</Btn>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {store.issues.slice(0, 3).map((iss) => (
                <div key={iss.id} className="hoverlift" style={{ background: `${C.ivory}0F`, border: `1px solid ${C.ivory}26`, borderRadius: 12, padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <div>
                    <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 14.5, color: C.ivory }}>{iss.category}</div>
                    <div style={{ fontFamily: sans, fontSize: 12.5, color: "#B9C4B3", marginTop: 3 }}>{iss.district} · {iss.id}</div>
                  </div>
                  <Badge tone={iss.status}>{iss.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        </Section>
      </div>
      <Section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 14, marginBottom: 30 }}>
          <div><Eyebrow>ताज़ा समाचार</Eyebrow><H2 style={{ marginBottom: 0 }}>संगठन की ओर से।</H2></div>
          <Btn kind="ghost" size="sm" onClick={() => nav("news")}>सभी समाचार →</Btn>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: 18 }}>
          {SEED_NEWS.slice(0, 3).map((n) => <NewsCard key={n.id} n={n} nav={nav} />)}
        </div>
      </Section>
      <div style={{ background: "#EFEBDD" }}>
        <Section>
          <Eyebrow>इतिहास व विरासत</Eyebrow>
          <H2>याद रखें — हम कहाँ से आए हैं।</H2>
          <Lead>The statehood movement, the birth of a party, and the road to a modern Uttarakhand.</Lead>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 0, borderLeft: `2px solid ${C.gold}`, paddingLeft: 0 }}>
            {TIMELINE_HISTORY.slice(0, 3).map((t, i) => (
              <div key={i} style={{ padding: "0 26px 8px", borderLeft: i > 0 ? `1px dashed ${C.line}` : "none" }}>
                <div style={{ fontFamily: sans, fontSize: 11.5, fontWeight: 700, color: C.gold, marginBottom: 8 }}>{t[2].toUpperCase()}</div>
                <div style={{ fontFamily: serif, fontSize: 19, fontWeight: 600, color: C.ink, marginBottom: 8, lineHeight: 1.3 }}>{t[0]}</div>
                <p style={{ fontFamily: sans, fontSize: 13.5, lineHeight: 1.65, color: "#4A554C" }}>{t[1]}</p>
              </div>
            ))}
          </div>
          <Btn kind="ghost" onClick={() => nav("history")} style={{ marginTop: 10 }}>पूरा इतिहास देखें</Btn>
        </Section>
      </div>
      <Section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 14, marginBottom: 30 }}>
          <div><Eyebrow>कार्यक्रम</Eyebrow><H2 style={{ marginBottom: 0 }}>ज़मीन पर, और कैलेंडर पर।</H2></div>
          <Btn kind="ghost" size="sm" onClick={() => nav("events")}>सभी कार्यक्रम →</Btn>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
          {SEED_EVENTS.slice(0, 4).map((e) => (
            <button key={e.id} className="hoverlift" onClick={() => nav(`events/${e.id}`)} style={{ textAlign: "left", background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, padding: 20, cursor: "pointer" }}>
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ background: C.forest, color: C.ivory, borderRadius: 10, padding: "8px 12px", textAlign: "center", fontFamily: sans, flexShrink: 0 }}>
                  <div style={{ fontSize: 19, fontWeight: 700, lineHeight: 1 }}>{e.date.split(" ")[0]}</div>
                  <div style={{ fontSize: 10.5 }}>{e.date.split(" ")[1].toUpperCase()}</div>
                </div>
                <div>
                  <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 14.5, color: C.ink, lineHeight: 1.35 }}>{e.title}</div>
                  <div style={{ fontFamily: sans, fontSize: 12.5, color: C.mute, marginTop: 6 }}>{e.district} · {e.type}</div>
                  <div style={{ fontFamily: sans, fontSize: 12.5, fontWeight: 700, color: C.gold, marginTop: 8 }}>विवरण देखें →</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </Section>
      <Section style={{ inner: { paddingTop: 20 } }}>
        <Eyebrow>चित्र दीर्घा</Eyebrow>
        <H2>तस्वीरों में संगठन।</H2>
        <GalleryGrid preview nav={nav} />
      </Section>
      <div style={{ background: `linear-gradient(135deg, ${C.forest}, ${C.slate})`, position: "relative" }}>
        <Section style={{ inner: { paddingTop: 70, paddingBottom: 70, textAlign: "center" } }}>
          <H2 light style={{ maxWidth: 640, margin: "0 auto 14px" }}>संगठन का हिस्सा बनें।</H2>
          <Lead light style={{ margin: "0 auto 30px", textAlign: "center" }}>Join UKD as a member, or support the movement's public work. Every district, every block, every village counts.</Lead>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Btn kind="gold" size="lg" onClick={() => nav("join")}>सदस्य बनें</Btn>
            <Btn kind="ghostLight" size="lg" onClick={() => nav("support")}>आंदोलन में सहयोग करें</Btn>
          </div>
        </Section>
      </div>
      <Section>
        <Eyebrow>पारदर्शिता</Eyebrow>
        <H2>पारदर्शिता, शुरुआत से।</H2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginTop: 10 }}>
          {["सार्वजनिक घोषणाएँ", "Official Documents", "रिपोर्ट", "जन वक्तव्य", "Organisational Updates"].map((t) => (
            <button key={t} className="hoverlift" onClick={() => nav("transparency")} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, padding: "22px 18px", cursor: "pointer", textAlign: "left" }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: `${C.slate}18`, color: C.slate, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, marginBottom: 12 }}>◫</div>
              <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 14.5, color: C.ink }}>{t}</div>
            </button>
          ))}
        </div>
        <div style={{ marginTop: 24 }}><Btn onClick={() => nav("transparency")}>पारदर्शिता केंद्र देखें</Btn></div>
      </Section>
    </>
  );
}

function GalleryGrid({ preview, nav }) {
  const cats = ["कार्यक्रम", "Leadership", "जन संवाद", "संगठन", "Uttarakhand"];
  const [cat, setCat] = useState("सभी");
  const tiles = Array.from({ length: preview ? 6 : 12 }, (_, i) => ({
    id: i, cat: cats[i % 5],
    g: [`linear-gradient(135deg, ${C.forest}, ${C.lime}66)`, `linear-gradient(135deg, ${C.slate}, ${C.forest})`, `linear-gradient(135deg, ${C.gold}, ${C.forest})`, `linear-gradient(160deg, ${C.forestDeep}, ${C.slate})`, `linear-gradient(135deg, ${C.slateSoft}, ${C.gold}88)`][i % 5],
  }));
  const shown = tiles.filter((t) => cat === "सभी" || t.cat === cat);
  return (
    <div>
      {!preview && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "20px 0" }}>
          {["सभी", ...cats].map((c) => (
            <button key={c} onClick={() => setCat(c)} style={{ fontFamily: sans, fontSize: 13, fontWeight: 700, padding: "7px 16px", borderRadius: 99, border: `1.5px solid ${C.forest}44`, background: cat === c ? C.forest : "transparent", color: cat === c ? "#fff" : C.forest, cursor: "pointer" }}>{c}</button>
          ))}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
        {shown.map((t, i) => (
          <div key={t.id} className="hoverlift" style={{ height: i % 4 === 0 ? 240 : 190, borderRadius: 14, background: t.g, position: "relative", overflow: "hidden" }}>
            <Ridges h={70} tones={[`${C.ivory}2a`, `${C.ivory}18`, `${C.ivory}0e`]} style={{ position: "absolute", bottom: 0 }} />
            <span style={{ position: "absolute", top: 12, left: 12, background: "#00000038", color: "#fff", fontFamily: sans, fontSize: 10.5, fontWeight: 700, padding: "4px 10px", borderRadius: 99 }}>{t.cat.toUpperCase()}</span>
            <span style={{ position: "absolute", bottom: 10, left: 12, color: `${C.ivory}CC`, fontFamily: sans, fontSize: 11 }}>Placeholder visual · demo</span>
          </div>
        ))}
      </div>
      {preview && <div style={{ marginTop: 22 }}><Btn kind="ghost" onClick={() => nav("gallery")}>पूरी दीर्घा देखें</Btn></div>}
    </div>
  );
}

function PageHead({ eyebrow, title, sub, crumbs, nav }) {
  return (
    <div style={{ background: C.forestDark, position: "relative", overflow: "hidden" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "56px 20px 8px", position: "relative", zIndex: 2 }}>
        {crumbs && (
          <div style={{ fontFamily: sans, fontSize: 12.5, color: "#A8B5A2", marginBottom: 16 }}>
            {crumbs.map((c, i) => (
              <span key={i}>
                {c[1] ? <button onClick={() => nav(c[1])} style={{ background: "none", border: "none", color: C.goldSoft, cursor: "pointer", fontFamily: sans, fontSize: 12.5, padding: 0 }}>{c[0]}</button> : <span>{c[0]}</span>}
                {i < crumbs.length - 1 && <span style={{ margin: "0 8px", opacity: .5 }}>/</span>}
              </span>
            ))}
          </div>
        )}
        <Eyebrow light>{eyebrow}</Eyebrow>
        <h1 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(32px, 4.6vw, 52px)", color: C.ivory, margin: "0 0 14px", lineHeight: 1.1, letterSpacing: "-.01em" }}>{title}</h1>
        {sub && <p style={{ fontFamily: sans, fontSize: 16, lineHeight: 1.7, color: "#C4CFBF", maxWidth: 620, margin: 0 }}>{sub}</p>}
      </div>
      <Ridges h={110} tones={["#3A6B8266", "#33593A", C.ivory]} style={{ marginTop: 26 }} />
    </div>
  );
}

function AboutPage({ nav }) {
  return (
    <>
      <PageHead eyebrow="दल परिचय" title="हम कौन हैं, और क्यों हैं।" sub="उत्तराखंड क्रांति दल राज्य आंदोलन से जन्मी क्षेत्रीय राजनीतिक आवाज़ है — पहाड़ का दल, पहाड़ के लिए।" crumbs={[["मुख्य पृष्ठ", "home"], ["दल परिचय"]]} nav={nav} />
      <Section>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 50 }}>
          <div>
            <H2>दल किसके लिए खड़ा है।</H2>
            <Lead>पहाड़ी जीवन का सम्मान। ऐसा रोज़गार जिसके लिए घर छोड़ना न पड़े। ज़मीन, पानी और जंगल पर उनका हक़ जो उनके बीच रहते हैं। और एक ऐसा प्रशासन जो गाँव को जवाब दे — न कि गाँव प्रशासन को।</Lead>
            <Lead>यह मंच दल की एकमात्र प्रामाणिक जानकारी का स्रोत है — इतिहास, संगठन, जन कार्य, और उत्तराखंड के हर नागरिक से जुड़ा एक खुला रास्ता।</Lead>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Btn onClick={() => nav("history")}>हमारी यात्रा</Btn>
              <Btn kind="ghost" onClick={() => nav("join")}>संगठन से जुड़ें</Btn>
            </div>
          </div>
          <div style={{ display: "grid", gap: 14 }}>
            {[["पहचान", "पहाड़ के लोगों की संस्कृति, भाषा और संघर्ष में जड़ें जमाए एक दल।"],
              ["जवाबदेही", "जन समस्याएँ — दर्ज होने से समाधान तक, खुले तौर पर दर्ज।"],
              ["संगठन", "केंद्रीय नेतृत्व से लेकर स्थानीय इकाई तक एक अनुशासित ढाँचा।"],
              ["पारदर्शिता", "दस्तावेज़, वक्तव्य और घोषणाएँ — सब एक ही जगह।"]].map(([t, d], i) => (
              <div key={t} style={{ background: "#fff", border: `1px solid ${C.line}`, borderLeft: `4px solid ${[C.forest, C.gold, C.slate, C.lime][i]}`, borderRadius: 12, padding: "18px 22px" }}>
                <div style={{ fontFamily: serif, fontSize: 19, fontWeight: 600, color: C.ink, marginBottom: 6 }}>{t}</div>
                <div style={{ fontFamily: sans, fontSize: 13.5, lineHeight: 1.65, color: "#4A554C" }}>{d}</div>
              </div>
            ))}
          </div>
        </div>
      </Section>
    </>
  );
}

function OrganisationPage({ nav, sub }) {
  // sub: undefined | ["district", name] | ["region", name]
  const store = useStore();
  if (sub && sub[0] === "district") {
    const d = sub[1];
    const units = SEED_UNITS.filter((u) => u.district === d);
    const issues = store.issues.filter((i) => i.district === d);
    const evts = SEED_EVENTS.filter((e) => e.district === d);
    return (
      <>
        <PageHead eyebrow={`${regionOf(d)} क्षेत्र`} title={`${d} ज़िला`} sub="ज़िला संगठन, सक्रिय इकाइयाँ, स्थानीय गतिविधि और जन समस्याएँ।" crumbs={[["मुख्य पृष्ठ", "home"], ["संगठन", "organisation"], [d]]} nav={nav} />
        <Section>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 44 }}>
            {[["सक्रिय इकाइयाँ", units.length || 1], ["जन समस्याएँ", issues.length], ["आगामी कार्यक्रम", evts.length], ["ज़िला टीम", "—"]].map(([l, v]) => (
              <div key={l} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, padding: 20 }}>
                <div style={{ fontFamily: serif, fontSize: 32, color: C.forest }}>{v}</div>
                <div style={{ fontFamily: sans, fontSize: 12.5, fontWeight: 700, color: C.mute, marginTop: 4 }}>{l}</div>
              </div>
            ))}
          </div>
          <H2 style={{ fontSize: 28 }}>स्थानीय इकाइयाँ</H2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14, marginBottom: 44 }}>
            {(units.length ? units : SEED_UNITS.slice(0, 2)).map((u) => (
              <div key={u.id} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, padding: 18 }}>
                <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 15, color: C.ink }}>{u.name}</div>
                <div style={{ fontFamily: sans, fontSize: 12.5, color: C.mute, margin: "6px 0 10px" }}>संयोजक: {u.leader} · {u.members} सदस्य</div>
                <Badge tone="सक्रिय">सक्रिय</Badge>
              </div>
            ))}
          </div>
          <H2 style={{ fontSize: 28 }}>{d} की जन समस्याएँ</H2>
          {issues.length === 0 ? <EmptyState title="कोई जन समस्या दर्ज नहीं" sub="इस ज़िले के लिए जन पोर्टल पर दर्ज समस्याएँ यहाँ दिखेंगी।" cta="समस्या दर्ज करें" onCta={() => nav("people/report")} /> : (
            <div style={{ display: "grid", gap: 10 }}>
              {issues.map((i) => (
                <div key={i.id} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, padding: "14px 18px", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 14.5, color: C.ink }}>{i.title}</div>
                    <div style={{ fontFamily: sans, fontSize: 12.5, color: C.mute, marginTop: 3 }}>{i.category} · {i.id} · {i.date}</div>
                  </div>
                  <Badge tone={i.status}>{i.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </Section>
      </>
    );
  }
  return (
    <>
      <PageHead eyebrow="संगठन" title="केंद्र से गाँव तक, एक ही नेटवर्क।" sub="गढ़वाल, कुमाऊँ और तराई — हर ज़िले तक फैला दल का ढाँचा देखें।" crumbs={[["मुख्य पृष्ठ", "home"], ["संगठन"]]} nav={nav} />
      <Section><OrgPreviewInner /><div style={{ height: 40 }} /><RegionMap nav={nav} /></Section>
    </>
  );
}
const OrgPreviewInner = () => (
  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
    {["केंद्रीय नेतृत्व", "मंडल", "ज़िला", "ब्लॉक", "स्थानीय इकाई"].map((c, i, a) => (
      <React.Fragment key={c}>
        <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 99, padding: "10px 22px", fontFamily: sans, fontWeight: 700, fontSize: 13.5, color: C.ink }}>{c}</div>
        {i < a.length - 1 && <div style={{ alignSelf: "center", color: C.gold, fontWeight: 700 }}>→</div>}
      </React.Fragment>
    ))}
  </div>
);

function HistoryPage({ nav }) {
  return (
    <>
      <PageHead eyebrow="इतिहास व विरासत" title="याद रखें — हम कहाँ से आए हैं।" sub="राज्य आंदोलन की सड़कों से उत्तराखंड राज्य तक — और वह काम जो आज भी जारी है।" crumbs={[["मुख्य पृष्ठ", "home"], ["इतिहास"]]} nav={nav} />
      <Section>
        <div style={{ position: "relative", maxWidth: 820, margin: "0 auto" }}>
          <div style={{ position: "absolute", left: 19, top: 0, bottom: 0, width: 2, background: `linear-gradient(${C.gold}, ${C.forest})` }} />
          {TIMELINE_HISTORY.map((t, i) => (
            <div key={i} className="ukd-fade" style={{ display: "flex", gap: 26, marginBottom: 44, animationDelay: `${i * 70}ms` }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: i === TIMELINE_HISTORY.length - 1 ? C.gold : C.forest, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: sans, fontWeight: 700, fontSize: 13, flexShrink: 0, zIndex: 2, border: `4px solid ${C.ivory}` }}>{i + 1}</div>
              <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: "22px 26px", flex: 1 }}>
                <div style={{ fontFamily: sans, fontSize: 11.5, fontWeight: 700, color: C.gold, marginBottom: 8 }}>{t[2].toUpperCase()}</div>
                <div style={{ fontFamily: serif, fontSize: 23, fontWeight: 600, color: C.ink, marginBottom: 8 }}>{t[0]}</div>
                <p style={{ fontFamily: sans, fontSize: 14.5, lineHeight: 1.7, color: "#4A554C", margin: 0 }}>{t[1]}</p>
              </div>
            </div>
          ))}
        </div>
        <div style={{ fontFamily: sans, fontSize: 12.5, color: C.mute, textAlign: "center" }}>Timeline uses placeholder narrative content pending official historical material.</div>
      </Section>
    </>
  );
}

function NewsPage({ nav, id }) {
  const [tag, setTag] = useState("सभी");
  if (id) {
    const n = SEED_NEWS.find((x) => x.id === id) || SEED_NEWS[0];
    return (
      <>
        <PageHead eyebrow={n.tag} title={n.title} sub={`${n.date} · Official communication`} crumbs={[["मुख्य पृष्ठ", "home"], ["समाचार", "news"], ["लेख"]]} nav={nav} />
        <Section style={{ inner: { maxWidth: 780, paddingTop: 56 } }}>
          <p style={{ fontFamily: serif, fontSize: 21, lineHeight: 1.6, color: C.ink }}>{n.excerpt}</p>
          {n.body.split("\n\n").map((p, i) => <p key={i} style={{ fontFamily: sans, fontSize: 16, lineHeight: 1.8, color: "#3C463E" }}>{p}</p>)}
          <div style={{ marginTop: 34, display: "flex", gap: 12 }}><Btn kind="ghost" onClick={() => nav("news")}>← All news</Btn></div>
        </Section>
      </>
    );
  }
  const tags = ["सभी", "आधिकारिक सूचना", "जन कार्य", "प्रेस", "संगठन"];
  const shown = SEED_NEWS.filter((n) => tag === "सभी" || n.tag === tag);
  return (
    <>
      <PageHead eyebrow="समाचार" title="आधिकारिक सूचनाएँ और प्रेस।" sub="संगठन का हर प्रामाणिक वक्तव्य, सूचना और प्रेस नोट — एक ही जगह।" crumbs={[["मुख्य पृष्ठ", "home"], ["समाचार"]]} nav={nav} />
      <Section>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 26 }}>
          {tags.map((t) => <button key={t} onClick={() => setTag(t)} style={{ fontFamily: sans, fontSize: 13, fontWeight: 700, padding: "7px 16px", borderRadius: 99, border: `1.5px solid ${C.forest}44`, background: tag === t ? C.forest : "transparent", color: tag === t ? "#fff" : C.forest, cursor: "pointer" }}>{t}</button>)}
        </div>
        {shown.length === 0 ? <EmptyState title="इस श्रेणी में कोई लेख नहीं" sub="कोई दूसरी श्रेणी देखें।" /> : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 18 }}>
            {shown.map((n) => <NewsCard key={n.id} n={n} nav={nav} big />)}
          </div>
        )}
      </Section>
    </>
  );
}

function EventsPage({ nav, id }) {
  if (id) {
    const e = SEED_EVENTS.find((x) => x.id === id) || SEED_EVENTS[0];
    return (
      <>
        <PageHead eyebrow={e.type} title={e.title} sub={`${e.date} · ${e.time} · ${e.venue}`} crumbs={[["मुख्य पृष्ठ", "home"], ["कार्यक्रम", "events"], ["विवरण"]]} nav={nav} />
        <Section style={{ inner: { maxWidth: 820, paddingTop: 56 } }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14, marginBottom: 30 }}>
            {[["दिनांक", e.date], ["समय", e.time], ["ज़िला", e.district], ["आयोजक", e.organiser]].map(([l, v]) => (
              <div key={l} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, padding: 16 }}>
                <div style={{ fontFamily: sans, fontSize: 11.5, fontWeight: 700, color: C.mute }}>{l}</div>
                <div style={{ fontFamily: sans, fontSize: 15, fontWeight: 700, color: C.ink, marginTop: 6 }}>{v}</div>
              </div>
            ))}
          </div>
          <Lead>{e.desc}</Lead>
          <Btn kind="ghost" onClick={() => nav("events")}>← All events</Btn>
        </Section>
      </>
    );
  }
  return (
    <>
      <PageHead eyebrow="कार्यक्रम" title="संगठन का कार्यक्रम विवरण।" sub="पूरे उत्तराखंड में बैठकें, शिविर, प्रशिक्षण और जन कार्यक्रम।" crumbs={[["मुख्य पृष्ठ", "home"], ["कार्यक्रम"]]} nav={nav} />
      <Section>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {SEED_EVENTS.map((e) => (
            <button key={e.id} className="hoverlift" onClick={() => nav(`events/${e.id}`)} style={{ textAlign: "left", background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 22, cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontFamily: sans, fontSize: 11, fontWeight: 700, color: C.gold }}>{e.type.toUpperCase()}</span>
                <span style={{ fontFamily: sans, fontSize: 12.5, color: C.mute }}>{e.date}</span>
              </div>
              <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 600, color: C.ink, lineHeight: 1.3, marginBottom: 8 }}>{e.title}</div>
              <div style={{ fontFamily: sans, fontSize: 13, color: C.mute }}>{e.venue}</div>
              <div style={{ fontFamily: sans, fontSize: 13, fontWeight: 700, color: C.forest, marginTop: 12 }}>विवरण देखें →</div>
            </button>
          ))}
        </div>
      </Section>
    </>
  );
}

function GalleryPage({ nav }) {
  return (
    <>
      <PageHead eyebrow="चित्र दीर्घा" title="तस्वीरों में संगठन।" sub="Events, leadership, public interaction and the landscapes of Uttarakhand. Placeholder visuals until official photography is supplied." crumbs={[["मुख्य पृष्ठ", "home"], ["चित्र दीर्घा"]]} nav={nav} />
      <Section><GalleryGrid nav={nav} /></Section>
    </>
  );
}

function PeopleLanding({ nav }) {
  const store = useStore();
  return (
    <>
      <PageHead eyebrow="जन पोर्टल" title="आपकी समस्या का जवाब मिलना चाहिए।" sub="Submit a public issue from anywhere in Uttarakhand and track it until it is resolved. This is the organisation's open door." crumbs={[["मुख्य पृष्ठ", "home"], ["जन पोर्टल"]]} nav={nav} />
      <Section>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 50 }}>
          <Btn kind="gold" size="lg" onClick={() => nav("people/report")}>समस्या दर्ज करें</Btn>
          <Btn kind="ghost" size="lg" onClick={() => nav("people/track")}>समस्या की स्थिति देखें</Btn>
        </div>
        <H2 style={{ fontSize: 28 }}>यह कैसे काम करता है</H2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 54 }}>
          {[["दर्ज करें", "समस्या, स्थान और यदि तस्वीरें हों तो उन्हें संलग्न करें।"],
            ["क्रमांक प्राप्त करें", "आपको तुरंत एक क्रमांक मिलेगा — उसे सुरक्षित रखें।"],
            ["हम इसे सौंपते हैं", "समस्या संबंधित ज़िला इकाई को भेज दी जाती है।"],
            ["समाधान तक देखें", "Follow the status timeline until the issue is resolved."]].map(([t, d], i) => (
            <div key={t} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 22 }}>
              <div style={{ width: 34, height: 34, borderRadius: 99, background: C.forest, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: sans, fontWeight: 700, marginBottom: 14 }}>{i + 1}</div>
              <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 16, color: C.ink, marginBottom: 6 }}>{t}</div>
              <div style={{ fontFamily: sans, fontSize: 13.5, lineHeight: 1.65, color: "#4A554C" }}>{d}</div>
            </div>
          ))}
        </div>
        <H2 style={{ fontSize: 28 }}>नागरिकों द्वारा हाल में दर्ज</H2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {store.issues.slice(0, 6).map((i) => (
            <div key={i.id} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontFamily: sans, fontSize: 12, fontWeight: 700, color: C.slate }}>{i.category}</span>
                <Badge tone={i.status}>{i.status}</Badge>
              </div>
              <div style={{ fontFamily: sans, fontSize: 14, fontWeight: 600, color: C.ink, lineHeight: 1.4 }}>{i.title}</div>
              <div style={{ fontFamily: sans, fontSize: 12, color: C.mute, marginTop: 8 }}>{i.district} · {i.date}</div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

function ReportIssuePage({ nav }) {
  const store = useStore(); const toast = useToast();
  const [f, setF] = useState({ name: "", mobile: "", email: "", district: "", block: "", location: "", category: "", desc: "" });
  const [errs, setErrs] = useState({});
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = () => {
    const e = {};
    if (!f.name.trim()) e.name = "Please enter your name.";
    if (!/^\d{10}$/.test(f.mobile)) e.mobile = "Enter a 10-digit mobile number.";
    if (!f.district) e.district = "अपना ज़िला चुनें।";
    if (!f.category) e.category = "समस्या की श्रेणी चुनें।";
    if (f.desc.trim().length < 20) e.desc = "Describe the issue in at least 20 characters.";
    setErrs(e);
    if (Object.keys(e).length) { toast("Please fix the highlighted fields.", "error"); return; }
    setBusy(true);
    setTimeout(() => {
      const id = `UKD-ISSUE-2026-${String(Math.floor(480 + Math.random() * 400)).padStart(5, "0")}`;
      store.setIssues([{ id, category: f.category, district: f.district, status: "प्राप्त", title: f.desc.slice(0, 70), location: `${f.district}${f.block ? " • " + f.block : ""}`, date: "12 Aug 2026", citizen: f.name, phone: f.mobile, priority: "मध्यम", assignedUnit: "Pending assignment", ageDays: 0, notes: 0 }, ...store.issues]);
      setDone(id); setBusy(false); toast("Issue submitted successfully.");
    }, 900);
  };
  if (done) return (
    <Section style={{ inner: { maxWidth: 640, textAlign: "center", paddingTop: 90 } }}>
      <div className="ukd-pop" style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 18, padding: 40 }}>
        <div style={{ width: 62, height: 62, borderRadius: "50%", background: "#E7F0DA", color: "#4A6B1D", fontSize: 28, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>✓</div>
        <H2 style={{ fontSize: 30 }}>समस्या दर्ज हो गई।</H2>
        <Lead style={{ margin: "0 auto 22px", textAlign: "center" }}>Your issue has been registered with the People's Portal and will be assigned to the responsible district unit.</Lead>
        <div style={{ background: C.ivory, border: `1.5px dashed ${C.gold}`, borderRadius: 12, padding: 18, fontFamily: sans, marginBottom: 22 }}>
          <div style={{ fontSize: 12, color: C.mute, fontWeight: 700 }}>आपका समस्या क्रमांक</div>
          <div style={{ fontFamily: serif, fontSize: 26, fontWeight: 600, color: C.forest, margin: "6px 0" }}>{done}</div>
          <div style={{ fontSize: 12.5, color: C.mute }}>Status: Received · Submitted 12 Aug 2026</div>
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Btn onClick={() => nav("people/track")}>इस समस्या की स्थिति देखें</Btn>
          <Btn kind="ghost" onClick={() => nav("home")}>मुख्य पृष्ठ पर लौटें</Btn>
        </div>
      </div>
    </Section>
  );
  return (
    <>
      <PageHead eyebrow="जन पोर्टल" title="जन समस्या दर्ज करें।" sub="Fields marked * are required. Your submission generates a demo tracking ID instantly." crumbs={[["मुख्य पृष्ठ", "home"], ["जन पोर्टल", "people"], ["दर्ज करें"]]} nav={nav} />
      <Section style={{ inner: { maxWidth: 720, paddingTop: 50 } }}>
        <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 16, padding: "30px 30px 20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", columnGap: 18 }}>
            <Field label="पूरा नाम" required error={errs.name}><TextInput value={f.name} onChange={set("name")} error={errs.name} placeholder="आपका नाम" /></Field>
            <Field label="मोबाइल नंबर" required error={errs.mobile} hint="10 digits, used only for issue tracking."><TextInput value={f.mobile} onChange={set("mobile")} error={errs.mobile} placeholder="98XXXXXXXX" inputMode="numeric" /></Field>
            <Field label="ईमेल"><TextInput value={f.email} onChange={set("email")} placeholder="वैकल्पिक" /></Field>
            <Field label="ज़िला" required error={errs.district}><Select value={f.district} onChange={set("district")} error={errs.district} options={DISTRICTS} placeholder="ज़िला चुनें" /></Field>
            <Field label="ब्लॉक"><TextInput value={f.block} onChange={set("block")} placeholder="वैकल्पिक" /></Field>
            <Field label="स्थान / गाँव"><TextInput value={f.location} onChange={set("location")} placeholder="समस्या कहाँ है?" /></Field>
          </div>
          <Field label="समस्या की श्रेणी" required error={errs.category}><Select value={f.category} onChange={set("category")} error={errs.category} options={ISSUE_CATEGORIES} placeholder="श्रेणी चुनें" /></Field>
          <Field label="विवरण" required error={errs.desc}><TextArea value={f.desc} onChange={set("desc")} error={errs.desc} placeholder="समस्या स्पष्ट रूप से लिखें — क्या, कहाँ, कब से।" /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
            {["Photo upload", "Document upload"].map((l) => (
              <button key={l} onClick={() => toast("Demo prototype — uploads are simulated.")} style={{ border: `1.5px dashed ${C.line}`, background: C.paper, borderRadius: 10, padding: "18px 12px", fontFamily: sans, fontSize: 13, color: C.mute, cursor: "pointer" }}>⇪ {l} (demo)</button>
            ))}
          </div>
          <Btn size="lg" onClick={submit} disabled={busy} style={{ width: "100%" }}>{busy ? "Submitting…" : "समस्या दर्ज करें"}</Btn>
        </div>
      </Section>
    </>
  );
}

const ISSUE_STAGES = ["प्राप्त", "सौंपा गया", "प्रगति पर", "हल हुआ", "बंद"];
function TrackIssuePage({ nav }) {
  const store = useStore(); const toast = useToast();
  const [id, setId] = useState(""); const [ref, setRef] = useState("");
  const [found, setFound] = useState(null); const [busy, setBusy] = useState(false); const [notFound, setNotFound] = useState(false);
  const track = () => {
    if (!id.trim()) { toast("Enter an issue ID to track.", "error"); return; }
    setBusy(true); setNotFound(false); setFound(null);
    setTimeout(() => {
      const hit = store.issues.find((i) => i.id.toLowerCase() === id.trim().toLowerCase());
      if (hit) setFound(hit); else setNotFound(true);
      setBusy(false);
    }, 700);
  };
  const stageIdx = found ? Math.max(0, ISSUE_STAGES.indexOf(found.status === "बंद" ? "बंद" : found.status)) : 0;
  return (
    <>
      <PageHead eyebrow="जन पोर्टल" title="समस्या की स्थिति देखें।" sub="स्थिति देखने के लिए अपना समस्या क्रमांक दर्ज करें।" crumbs={[["मुख्य पृष्ठ", "home"], ["जन पोर्टल", "people"], ["Track"]]} nav={nav} />
      <Section style={{ inner: { maxWidth: 680, paddingTop: 50 } }}>
        <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 16, padding: 28 }}>
          <Field label="समस्या क्रमांक" required hint={`Try one from the homepage, e.g. ${store.issues[0].id}`}><TextInput value={id} onChange={(e) => setId(e.target.value)} placeholder="UKD-ISSUE-2026-00482" /></Field>
          <Field label="मोबाइल / संदर्भ"><TextInput value={ref} onChange={(e) => setRef(e.target.value)} placeholder="वैकल्पिक" /></Field>
          <Btn onClick={track} disabled={busy} style={{ width: "100%" }}>{busy ? "Checking…" : "स्थिति देखें"}</Btn>
        </div>
        {busy && <div style={{ marginTop: 24 }}><Skeleton rows={3} /></div>}
        {notFound && <div style={{ marginTop: 24 }}><EmptyState icon="⌕" title="इस क्रमांक से कोई समस्या नहीं मिली" sub="क्रमांक जाँचें और दोबारा प्रयास करें, या नई समस्या दर्ज करें।" cta="समस्या दर्ज करें" onCta={() => nav("people/report")} /></div>}
        {found && (
          <div className="ukd-fade" style={{ marginTop: 24, background: "#fff", border: `1px solid ${C.line}`, borderRadius: 16, padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 6 }}>
              <div>
                <div style={{ fontFamily: serif, fontSize: 21, fontWeight: 600, color: C.ink }}>{found.category}</div>
                <div style={{ fontFamily: sans, fontSize: 13, color: C.mute, marginTop: 4 }}>{found.id} · {found.district} · Submitted {found.date}</div>
              </div>
              <Badge tone={found.status}>{found.status}</Badge>
            </div>
            <p style={{ fontFamily: sans, fontSize: 14, color: "#4A554C", lineHeight: 1.6 }}>{found.title}</p>
            <div style={{ marginTop: 22 }}>
              {ISSUE_STAGES.map((s, i) => {
                const on = i <= stageIdx;
                return (
                  <div key={s} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{ width: 26, height: 26, borderRadius: "50%", background: on ? C.forest : "#E7E3D4", color: on ? "#fff" : C.mute, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontFamily: sans, fontWeight: 700 }}>{on ? "✓" : i + 1}</div>
                      {i < ISSUE_STAGES.length - 1 && <div style={{ width: 2, height: 30, background: i < stageIdx ? C.forest : "#E7E3D4" }} />}
                    </div>
                    <div style={{ fontFamily: sans, paddingTop: 3 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 700, color: on ? C.ink : C.mute }}>{s}</div>
                      {i === stageIdx && <div style={{ fontSize: 12.5, color: C.gold, fontWeight: 700 }}>वर्तमान स्थिति</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Section>
    </>
  );
}

function JoinPage({ nav }) {
  const store = useStore(); const toast = useToast();
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ name: "", mobile: "", email: "", district: "", block: "", unit: "", address: "", note: "" });
  const [errs, setErrs] = useState({});
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const memberId = useRef(`UKD-M-2026-${Math.floor(2000 + Math.random() * 7000)}`);
  const next = () => {
    if (step === 0) {
      const e = {};
      if (!f.name.trim()) e.name = "Enter your full name.";
      if (!/^\d{10}$/.test(f.mobile)) e.mobile = "Enter a 10-digit mobile number.";
      if (f.email && !/.+@.+\..+/.test(f.email)) e.email = "Enter a valid email or leave blank.";
      if (!f.district) e.district = "अपना ज़िला चुनें।";
      setErrs(e);
      if (Object.keys(e).length) { toast("Please fix the highlighted fields.", "error"); return; }
    }
    if (step === 2) {
      store.setMembers([{ id: memberId.current, name: f.name, district: f.district, unit: f.unit || "सौंपा जाना शेष", block: f.block || "—", role: "Member", joined: "Aug 2026", status: "लंबित", lastActivity: "Just now", phone: `+91 ${f.mobile.slice(0, 5)}XXXXX` }, ...store.members]);
      toast("Membership request submitted.");
    }
    setStep(step + 1);
  };
  const steps = ["बुनियादी जानकारी", "प्रोफ़ाइल", "समीक्षा", "सफल"];
  return (
    <>
      <PageHead eyebrow="सदस्य बनें" title="संगठन का हिस्सा बनें।" sub="A four-step membership request. This prototype issues a demo digital membership card instantly." crumbs={[["मुख्य पृष्ठ", "home"], ["सदस्य बनें"]]} nav={nav} />
      <Section style={{ inner: { maxWidth: 760, paddingTop: 50 } }}>
        <div style={{ display: "flex", gap: 4, marginBottom: 30 }}>
          {steps.map((s, i) => (
            <div key={s} style={{ flex: 1, fontFamily: sans }}>
              <div style={{ height: 5, borderRadius: 99, background: i <= step ? C.gold : "#E4E0D0", marginBottom: 8, transition: "background .3s" }} />
              <div style={{ fontSize: 11.5, fontWeight: 700, color: i <= step ? C.ink : C.mute }}>{i + 1}. {s}</div>
            </div>
          ))}
        </div>
        <div className="ukd-fade" key={step} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 16, padding: 30 }}>
          {step === 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", columnGap: 18 }}>
              <Field label="पूरा नाम" required error={errs.name}><TextInput value={f.name} onChange={set("name")} error={errs.name} /></Field>
              <Field label="मोबाइल नंबर" required error={errs.mobile}><TextInput value={f.mobile} onChange={set("mobile")} error={errs.mobile} inputMode="numeric" /></Field>
              <Field label="ईमेल" error={errs.email}><TextInput value={f.email} onChange={set("email")} error={errs.email} /></Field>
              <Field label="ज़िला" required error={errs.district}><Select value={f.district} onChange={set("district")} error={errs.district} options={DISTRICTS} placeholder="ज़िला चुनें" /></Field>
              <Field label="ब्लॉक"><TextInput value={f.block} onChange={set("block")} placeholder="वैकल्पिक" /></Field>
              <Field label="स्थानीय इकाई"><TextInput value={f.unit} onChange={set("unit")} placeholder="यदि ज्ञात हो" /></Field>
            </div>
          )}
          {step === 1 && (
            <div>
              <button onClick={() => toast("Demo prototype — photo upload is simulated.")} style={{ width: "100%", border: `1.5px dashed ${C.line}`, background: C.paper, borderRadius: 12, padding: 26, fontFamily: sans, fontSize: 13.5, color: C.mute, cursor: "pointer", marginBottom: 20 }}>⇪ Upload photo (demo)</button>
              <Field label="पता"><TextArea value={f.address} onChange={set("address")} placeholder="गाँव / कस्बा, ब्लॉक, ज़िला" style={{ minHeight: 80 }} /></Field>
              <Field label="कुछ और कहना चाहें तो लिखें"><TextArea value={f.note} onChange={set("note")} placeholder="वैकल्पिक — कौशल, उपलब्धता, रुचि" style={{ minHeight: 80 }} /></Field>
            </div>
          )}
          {step === 2 && (
            <div style={{ fontFamily: sans }}>
              <div style={{ fontFamily: serif, fontSize: 21, fontWeight: 600, color: C.ink, marginBottom: 16 }}>अपना विवरण जाँचें</div>
              {[["Name", f.name], ["मोबाइल नंबर", f.mobile], ["ईमेल", f.email || "—"], ["ज़िला", f.district], ["ब्लॉक", f.block || "—"], ["Local unit", f.unit || "सौंपा जाना शेष"], ["पता", f.address || "—"]].map(([l, v]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "9px 0", borderBottom: `1px solid ${C.line}66`, fontSize: 14 }}>
                  <span style={{ color: C.mute }}>{l}</span><span style={{ fontWeight: 600, color: C.ink, textAlign: "right" }}>{v}</span>
                </div>
              ))}
            </div>
          )}
          {step === 3 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#E7F0DA", color: "#4A6B1D", fontSize: 26, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>✓</div>
              <H2 style={{ fontSize: 28 }}>आपका सदस्यता अनुरोध दर्ज हो गया है।</H2>
              <Lead style={{ margin: "0 auto 26px", textAlign: "center" }}>Your local unit will verify the request. Here is your demo digital membership card.</Lead>
              <MembershipCard name={f.name} district={f.district} id={memberId.current} />
              <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 26, flexWrap: "wrap" }}>
                <Btn onClick={() => toast("Demo card saved (simulated).")}>कार्ड डाउनलोड करें</Btn>
                <Btn kind="ghost" onClick={() => nav("home")}>मुख्य पृष्ठ पर लौटें</Btn>
              </div>
            </div>
          )}
          {step < 3 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <Btn kind="subtle" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>← Back</Btn>
              <Btn onClick={next}>{step === 2 ? "अनुरोध भेजें" : "आगे बढ़ें →"}</Btn>
            </div>
          )}
        </div>
      </Section>
    </>
  );
}

function MembershipCard({ name, district, id }) {
  return (
    <div style={{ maxWidth: 400, margin: "0 auto", borderRadius: 18, overflow: "hidden", boxShadow: "0 24px 50px -18px rgba(24,43,28,.5)", textAlign: "left", background: `linear-gradient(135deg, ${C.forestDeep}, ${C.forest})`, position: "relative" }}>
      <Ridges h={70} tones={[`${C.gold}30`, `${C.ivory}14`, `${C.ivory}0a`]} style={{ position: "absolute", bottom: 0 }} />
      <div style={{ padding: "22px 24px", position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Logo size={34} light />
            <div>
              <div style={{ fontFamily: serif, color: C.ivory, fontSize: 15, fontWeight: 600 }}>उत्तराखंड क्रांति दल</div>
              <div style={{ fontFamily: sans, color: C.goldSoft, fontSize: 9, fontWeight: 700 }}>डिजिटल सदस्यता पहचान पत्र</div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ fontFamily: sans }}>
            <div style={{ color: C.ivory, fontSize: 19, fontWeight: 700 }}>{name || "Member Name"}</div>
            <div style={{ color: "#B9C6B2", fontSize: 12.5, marginTop: 3 }}>{district || "ज़िला"} · Joined Aug 2026</div>
            <div style={{ color: C.goldSoft, fontSize: 13.5, fontWeight: 700, marginTop: 12 }}>{id}</div>
          </div>
          <svg width="62" height="62" viewBox="0 0 62 62" aria-label="क्यूआर कोड" style={{ background: C.ivory, borderRadius: 8, padding: 5 }}>
            {Array.from({ length: 49 }).map((_, i) => {
              const x = (i % 7) * 8 + 3, y = Math.floor(i / 7) * 8 + 3;
              return ((i * 7 + 3) % 5 < 3) ? <rect key={i} x={x} y={y} width="6" height="6" fill={C.forestDeep} /> : null;
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}

function SupportPage({ nav }) {
  const toast = useToast();
  const [amt, setAmt] = useState(500);
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ name: "", mobile: "", district: "" });
  const [errs, setErrs] = useState({});
  const amounts = [100, 250, 500, 1000, 2500];
  const next = () => {
    if (step === 0) {
      const e = {};
      if (!f.name.trim()) e.name = "Enter your name.";
      if (!/^\d{10}$/.test(f.mobile)) e.mobile = "Enter a 10-digit mobile number.";
      setErrs(e);
      if (Object.keys(e).length) { toast("Please fix the highlighted fields.", "error"); return; }
    }
    if (step === 1) toast("Demo contribution recorded — no real payment was made.");
    setStep(step + 1);
  };
  return (
    <>
      <PageHead eyebrow="सहयोग करें" title="आंदोलन में सहयोग करें।" sub="A demonstration contribution flow. No real money is processed anywhere in this prototype." crumbs={[["मुख्य पृष्ठ", "home"], ["Support"]]} nav={nav} />
      <Section style={{ inner: { maxWidth: 640, paddingTop: 50 } }}>
        <div style={{ background: "#FDF6E7", border: `1px solid ${C.gold}66`, borderRadius: 10, padding: "12px 16px", fontFamily: sans, fontSize: 13, color: "#8A5D14", marginBottom: 20, fontWeight: 600 }}>
          Demo only — this screen simulates a contribution and does not process payments.
        </div>
        <div className="ukd-fade" key={step} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 16, padding: 30 }}>
          {step === 0 && (
            <>
              <div style={{ fontFamily: serif, fontSize: 21, fontWeight: 600, color: C.ink, marginBottom: 16 }}>सहयोग राशि चुनें</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 22 }}>
                {amounts.map((a) => (
                  <button key={a} onClick={() => setAmt(a)} style={{ fontFamily: sans, fontWeight: 700, fontSize: 15, padding: "12px 22px", borderRadius: 10, border: `2px solid ${amt === a ? C.gold : C.line}`, background: amt === a ? "#FDF6E7" : "#fff", color: amt === a ? "#8A5D14" : C.ink, cursor: "pointer" }}>₹{a}</button>
                ))}
              </div>
              <Field label="आपका नाम" required error={errs.name}><TextInput value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={errs.name} /></Field>
              <Field label="मोबाइल नंबर" required error={errs.mobile}><TextInput value={f.mobile} onChange={(e) => setF({ ...f, mobile: e.target.value })} error={errs.mobile} inputMode="numeric" /></Field>
              <Field label="ज़िला"><Select value={f.district} onChange={(e) => setF({ ...f, district: e.target.value })} options={DISTRICTS} placeholder="वैकल्पिक" /></Field>
              <Btn size="lg" onClick={next} style={{ width: "100%" }}>भुगतान की ओर बढ़ें</Btn>
            </>
          )}
          {step === 1 && (
            <>
              <div style={{ fontFamily: serif, fontSize: 21, fontWeight: 600, color: C.ink, marginBottom: 16 }}>भुगतान चरण</div>
              <div style={{ background: C.ivory, borderRadius: 12, padding: 20, fontFamily: sans, marginBottom: 22 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14.5, marginBottom: 8 }}><span style={{ color: C.mute }}>सहयोग राशि</span><b>₹{amt}</b></div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14.5 }}><span style={{ color: C.mute }}>सहयोगकर्ता</span><b>{f.name}</b></div>
              </div>
              <div style={{ border: `1.5px dashed ${C.line}`, borderRadius: 12, padding: 24, textAlign: "center", fontFamily: sans, fontSize: 13.5, color: C.mute, marginBottom: 22 }}>
                Payment gateway placeholder — no real transaction occurs.
              </div>
              <Btn size="lg" kind="gold" onClick={next} style={{ width: "100%" }}>भुगतान पूर्ण करें</Btn>
            </>
          )}
          {step === 2 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#E7F0DA", color: "#4A6B1D", fontSize: 26, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>✓</div>
              <H2 style={{ fontSize: 27 }}>Thank you, {f.name.split(" ")[0]}.</H2>
              <Lead style={{ margin: "0 auto 24px", textAlign: "center" }}>Your demo contribution of ₹{amt} was recorded in this prototype. In the real system, an official receipt would be issued and reflected in the Transparency Centre.</Lead>
              <Btn kind="ghost" onClick={() => nav("transparency")}>पारदर्शिता केंद्र देखें</Btn>
            </div>
          )}
        </div>
      </Section>
    </>
  );
}

function DocumentsPage({ nav, transparency }) {
  const cats = transparency ? ["घोषणाएँ", "जन वक्तव्य", "रिपोर्ट", "Official Notices", "जन प्रतिनिधित्व"] : [...new Set(SEED_DOCS.map((d) => d.category))];
  return (
    <>
      <PageHead eyebrow={transparency ? "पारदर्शिता केंद्र" : "दस्तावेज़"} title={transparency ? "Open by design." : "आधिकारिक अभिलेख।"} sub={transparency ? "Disclosures, statements, reports and representations — published for the public record." : "Party documents, resolutions, minutes and press releases in one searchable archive."} crumbs={[["मुख्य पृष्ठ", "home"], [transparency ? "पारदर्शिता" : "दस्तावेज़"]]} nav={nav} />
      <Section>
        <DataTable
          columns={[
            { key: "title", label: "Document", strong: true },
            { key: "category", label: "श्रेणी", render: (r) => <Badge>{r.category}</Badge> },
            { key: "district", label: "ज़िला" },
            { key: "year", label: "Year" },
            { key: "size", label: "Size" },
            { key: "dl", label: "", render: () => <span style={{ color: C.forest, fontWeight: 700 }}>Preview ↓</span> },
          ]}
          rows={SEED_DOCS.filter((d) => !transparency || ["घोषणाएँ", "Press Releases", "District Reports", "Official Notices", "जन प्रतिनिधित्व", "प्रस्ताव"].includes(d.category))}
          searchKeys={["title", "category"]}
          filters={[{ key: "year", label: "Year", options: ["2026", "2025"] }, { key: "category", label: "श्रेणी", options: [...new Set(SEED_DOCS.map((d) => d.category))] }, { key: "district", label: "ज़िला", options: [...new Set(SEED_DOCS.map((d) => d.district))] }]}
          onRow={() => {}}
          empty={<EmptyState title="कोई दस्तावेज़ नहीं मिला" sub="अभिलेख देखने के लिए फ़िल्टर या खोज बदलें।" />}
        />
        <div style={{ fontFamily: sans, fontSize: 12.5, color: C.mute, marginTop: 12 }}>यहाँ दिखाए गए दस्तावेज़ प्रदर्शन हेतु हैं।</div>
      </Section>
    </>
  );
}

function ContactPage({ nav }) {
  const toast = useToast();
  const [f, setF] = useState({ name: "", email: "", msg: "" });
  const [sent, setSent] = useState(false);
  return (
    <>
      <PageHead eyebrow="संपर्क" title="संगठन को लिखें।" sub="आधिकारिक पत्राचार, मीडिया प्रश्न और जन संवाद हेतु।" crumbs={[["मुख्य पृष्ठ", "home"], ["संपर्क"]]} nav={nav} />
      <Section style={{ inner: { maxWidth: 640, paddingTop: 50 } }}>
        {sent ? (
          <EmptyState icon="✓" title="Message sent" sub="Your message was recorded in this prototype. The organisation's office would respond through official channels." cta="मुख्य पृष्ठ पर लौटें" onCta={() => nav("home")} />
        ) : (
          <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 16, padding: 30 }}>
            <Field label="आपका नाम" required><TextInput value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label="Email or mobile" required><TextInput value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
            <Field label="संदेश" required><TextArea value={f.msg} onChange={(e) => setF({ ...f, msg: e.target.value })} /></Field>
            <Btn onClick={() => { if (!f.name || !f.email || !f.msg) { toast("Please fill in all fields.", "error"); return; } setSent(true); toast("Message sent."); }} style={{ width: "100%" }}>Send message</Btn>
            <div style={{ fontFamily: sans, fontSize: 12, color: C.mute, marginTop: 12, textAlign: "center" }}>Official contact details will be published by the organisation. This form is a demo.</div>
          </div>
        )}
      </Section>
    </>
  );
}

function PublicSite({ toPortal }) {
  const [route, setRoute] = useState("home");
  const [searchOpen, setSearchOpen] = useState(false);
  const nav = (r) => { setRoute(r); window.scrollTo({ top: 0, behavior: "instant" }); };
  const seg = route.split("/");
  let page;
  if (route === "home") page = <HomePage nav={nav} />;
  else if (route === "about") page = <AboutPage nav={nav} />;
  else if (seg[0] === "organisation") page = <OrganisationPage nav={nav} sub={seg[1] ? [seg[1], seg.slice(2).join("/")] : undefined} />;
  else if (route === "history") page = <HistoryPage nav={nav} />;
  else if (seg[0] === "news") page = <NewsPage nav={nav} id={seg[1]} />;
  else if (seg[0] === "events") page = <EventsPage nav={nav} id={seg[1]} />;
  else if (route === "gallery") page = <GalleryPage nav={nav} />;
  else if (route === "people") page = <PeopleLanding nav={nav} />;
  else if (route === "people/report") page = <ReportIssuePage nav={nav} />;
  else if (route === "people/track") page = <TrackIssuePage nav={nav} />;
  else if (route === "join") page = <JoinPage nav={nav} />;
  else if (route === "support") page = <SupportPage nav={nav} />;
  else if (route === "documents") page = <DocumentsPage nav={nav} />;
  else if (route === "transparency") page = <DocumentsPage nav={nav} transparency />;
  else if (route === "contact") page = <ContactPage nav={nav} />;
  else page = (
    <Section style={{ inner: { paddingTop: 120, textAlign: "center" } }}>
      <div style={{ fontFamily: serif, fontSize: 90, color: C.line, fontWeight: 500 }}>404</div>
      <H2 style={{ fontSize: 26 }}>This page doesn't exist.</H2>
      <Btn onClick={() => nav("home")}>मुख्य पृष्ठ पर लौटें</Btn>
    </Section>
  );
  return (
    <div style={{ background: C.ivory, minHeight: "100vh" }}>
      <SiteHeader route={route} nav={nav} openSearch={() => setSearchOpen(true)} />
      <main key={route} className="ukd-fade">{page}</main>
      <div style={{ background: C.ivory, textAlign: "center", padding: "0 20px 46px" }}>
        <button onClick={toPortal} style={{ fontFamily: sans, fontSize: 13, fontWeight: 700, color: C.slate, background: "#fff", border: `1.5px solid ${C.slate}44`, borderRadius: 99, padding: "10px 22px", cursor: "pointer" }}>
          🔒 UKD Digital Command Portal — internal sign in
        </button>
      </div>
      <SiteFooter nav={nav} />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} nav={nav} />
    </div>
  );
}

/* ============================== PRIVATE PORTAL ============================== */
function PortalLogin({ onLogin, toSite }) {
  const toast = useToast();
  const [role, setRole] = useState(ROLES[0].key);
  const [email, setEmail] = useState("demo@ukd.org");
  const [pw, setPw] = useState("••••••••");
  const [busy, setBusy] = useState(false);
  const go = () => {
    if (!email.trim() || !pw.trim()) { toast("Enter email and password.", "error"); return; }
    setBusy(true);
    setTimeout(() => { onLogin(ROLES.find((r) => r.key === role)); }, 800);
  };
  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(160deg, ${C.forestDeep}, ${C.forestDark} 55%, ${C.slate})`, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, position: "relative", overflow: "hidden" }}>
      <Ridges h={220} tones={[`${C.slateSoft}55`, `${C.forest}`, `${C.forestDeep}`]} style={{ position: "absolute", bottom: 0, left: 0 }} />
      <div className="ukd-pop" style={{ width: "100%", maxWidth: 440, background: C.paper, borderRadius: 20, padding: 34, position: "relative", zIndex: 2, boxShadow: "0 40px 100px -30px rgba(0,0,0,.6)" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
          <Logo size={44} />
          <div>
            <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 600, color: C.ink }}>UKD Digital Command Portal</div>
            <div style={{ fontFamily: sans, fontSize: 10.5, color: C.gold, fontWeight: 700 }}>INTERNAL · AUTHORISED ACCESS</div>
          </div>
        </div>
        <p style={{ fontFamily: sans, fontSize: 13, color: C.mute, margin: "10px 0 22px" }}>From leadership to the ground — everything connected. Demo sign-in: choose a role to explore its view.</p>
        <Field label="Email / Mobile" required><TextInput value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Password" required><TextInput type="password" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
        <Field label="Sign in as (demo role)">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {ROLES.map((r) => (
              <button key={r.key} onClick={() => setRole(r.key)} style={{ textAlign: "left", fontFamily: sans, border: `2px solid ${role === r.key ? C.forest : C.line}`, background: role === r.key ? "#EDF2E6" : "#fff", borderRadius: 10, padding: "9px 12px", cursor: "pointer" }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink }}>{r.label}</div>
                <div style={{ fontSize: 10.5, color: C.mute }}>{r.scope}</div>
              </button>
            ))}
          </div>
        </Field>
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontFamily: sans, fontSize: 13, color: C.mute, marginBottom: 18 }}>
          <input type="checkbox" defaultChecked /> Remember me on this device
        </label>
        <Btn size="lg" onClick={go} disabled={busy} style={{ width: "100%" }}>{busy ? "Signing in…" : "Sign In"}</Btn>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
          <button onClick={() => toast("Demo prototype — password reset is simulated.")} style={{ background: "none", border: "none", fontFamily: sans, fontSize: 12.5, color: C.slate, cursor: "pointer", fontWeight: 600 }}>Forgot password</button>
          <button onClick={toSite} style={{ background: "none", border: "none", fontFamily: sans, fontSize: 12.5, color: C.slate, cursor: "pointer", fontWeight: 600 }}>← Public website</button>
        </div>
      </div>
    </div>
  );
}

const PORTAL_NAV = [
  ["dashboard", "Dashboard", "▦"],
  ["organisation", "संगठन", "⛰"],
  ["members", "Members", "☰"],
  ["karyakartas", "Karyakartas", "✦"],
  ["units", "Local Units", "▤"],
  ["tasks", "Tasks", "✓"],
  ["issues", "People's Issues", "◉"],
  ["pevents", "कार्यक्रम", "▣"],
  ["pdocs", "दस्तावेज़", "◫"],
  ["notices", "Notices", "◈"],
  ["reports", "रिपोर्ट", "≡"],
  ["finance", "Finance", "₹"],
  ["analytics", "Analytics", "∿"],
  ["ai", "AI Assistant", "✳"],
  ["settings", "सेटिंग्स", "⚙"],
];

const PCard = ({ children, style = {}, onClick, pad = 20 }) => (
  <div onClick={onClick} className={onClick ? "hoverlift" : ""} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: pad, cursor: onClick ? "pointer" : "default", ...style }}>{children}</div>
);
const PTitle = ({ children, right }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
    <div style={{ fontFamily: sans, fontSize: 13, fontWeight: 700, color: C.mute }}>{children}</div>
    {right}
  </div>
);
const PageTitle = ({ title, sub, right }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, flexWrap: "wrap", marginBottom: 24 }}>
    <div>
      <h1 style={{ fontFamily: serif, fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 600, color: C.ink, margin: 0, letterSpacing: "-.01em" }}>{title}</h1>
      {sub && <div style={{ fontFamily: sans, fontSize: 13.5, color: C.mute, marginTop: 6 }}>{sub}</div>}
    </div>
    {right && <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>{right}</div>}
  </div>
);

function CommandCentre({ nav, user }) {
  const store = useStore();
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 650); return () => clearTimeout(t); }, []);
  const scoped = user.district ? { m: store.members.filter((x) => x.district === user.district), i: store.issues.filter((x) => x.district === user.district), t: store.tasks.filter((x) => x.district === user.district) } : { m: store.members, i: store.issues, t: store.tasks };
  const openIssues = scoped.i.filter((x) => !["हल हुआ", "बंद"].includes(x.status)).length;
  const pendingTasks = scoped.t.filter((x) => !["पूर्ण"].includes(x.status)).length;
  const overdue = store.tasks.filter((t) => t.status === "विलंबित");
  const missingReports = SEED_REPORTS.filter((r) => r.status === "अप्राप्त");
  const oldIssues = store.issues.filter((i) => i.ageDays > 15 && !["हल हुआ", "बंद"].includes(i.status));
  const attnUnits = SEED_UNITS.filter((u) => u.health < 65);
  const kpis = [
    ["Total Members", scoped.m.length, "members", [30, 33, 34, 38, 40, scoped.m.length]],
    ["Active Karyakartas", SEED_KARYAKARTAS.filter((k) => k.active).length, "karyakartas", [10, 12, 13, 14, 15, 16]],
    ["Organisational Units", SEED_UNITS.length, "units", [9, 10, 11, 12, 13, 14]],
    ["Open Public Issues", openIssues, "issues", [6, 8, 7, 9, 10, openIssues]],
    ["Pending Tasks", pendingTasks, "tasks", [8, 9, 11, 10, 12, pendingTasks]],
    ["Upcoming Events", SEED_EVENTS.length, "pevents", [4, 5, 5, 6, 7, 8]],
  ];
  if (loading) return (<div><PageTitle title="Good morning, UKD." sub="Loading the state organisation overview…" /><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14 }}>{Array.from({ length: 6 }).map((_, i) => <div key={i} className="ukd-skel" style={{ height: 110 }} />)}</div><div style={{ marginTop: 20 }}><Skeleton rows={5} /></div></div>);
  return (
    <div className="ukd-fade">
      <PageTitle title="Good morning, UKD." sub={user.district ? `${user.label} · ${user.scope}` : "State Organisation Overview · Wednesday, 12 August 2026"} right={<Btn size="sm" kind="ghost" onClick={() => nav("reports")}>Weekly reports</Btn>} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginBottom: 22 }}>
        {kpis.map(([l, v, r, spark], i) => (
          <PCard key={l} onClick={() => nav(r)} pad={18}>
            <div style={{ fontFamily: sans, fontSize: 11.5, fontWeight: 700, color: C.mute }}>{l}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 8 }}>
              <div style={{ fontFamily: serif, fontSize: 38, fontWeight: 500, color: [C.forest, C.forest, C.slate, C.red, C.gold, C.slate][i], lineHeight: 1 }}>{v}</div>
              <Spark points={spark} w={70} h={30} color={[C.lime, C.lime, C.slateSoft, C.red, C.gold, C.slateSoft][i]} />
            </div>
            <div style={{ fontFamily: sans, fontSize: 11.5, color: C.gold, fontWeight: 700, marginTop: 8 }}>Open →</div>
          </PCard>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: 14, marginBottom: 22 }}>
        <PCard>
          <PTitle>Organisational Health</PTitle>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <HealthRing pct={82} size={92} stroke={9} />
            <div style={{ flex: 1, fontFamily: sans, display: "flex", flexDirection: "column", gap: 8 }}>
              {[["केंद्र", 94], ["मंडल", 86], ["ज़िला", 81], ["ब्लॉक", 74], ["स्थानीय इकाई", 69]].map(([l, v]) => (
                <div key={l}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 3 }}><span style={{ color: C.mute }}>{l}</span><b style={{ color: C.ink }}>{v}%</b></div>
                  <div style={{ height: 6, borderRadius: 99, background: "#EBE7D8" }}><div style={{ width: `${v}%`, height: "100%", borderRadius: 99, background: v >= 80 ? C.forest : v >= 70 ? C.gold : C.red }} /></div>
                </div>
              ))}
            </div>
          </div>
        </PCard>
        <PCard>
          <PTitle right={<Badge tone="उच्च">Action</Badge>}>Attention Required</PTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[[`${attnUnits.length} units need attention`, "units?attn=1"], [`${overdue.length} overdue tasks`, "tasks?f=Overdue"], [`${missingReports.length} missing reports`, "reports"], [`${oldIssues.length} unresolved issues older than 15 days`, "issues?age=15"]].map(([l, r]) => (
              <button key={l} onClick={() => nav(r)} className="rowhover" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, background: "#FBF7EC", border: `1px solid ${C.line}`, borderRadius: 10, padding: "11px 14px", fontFamily: sans, fontSize: 13.5, fontWeight: 600, color: C.ink, cursor: "pointer", textAlign: "left" }}>
                <span><span style={{ color: C.red, marginRight: 8 }}>●</span>{l}</span><span style={{ color: C.gold }}>→</span>
              </button>
            ))}
          </div>
        </PCard>
        <PCard>
          <PTitle right={<button onClick={() => nav("notifications")} style={{ background: "none", border: "none", fontFamily: sans, fontSize: 12, fontWeight: 700, color: C.gold, cursor: "pointer" }}>All →</button>}>Recent Activity</PTitle>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {SEED_NOTIFS.slice(0, 5).map((n) => (
              <div key={n.id} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.line}66`, fontFamily: sans, fontSize: 13 }}>
                <span style={{ color: { task: C.gold, issue: C.slate, notice: C.forest, report: C.red, event: C.slateSoft, doc: C.mute }[n.kind] }}>●</span>
                <span style={{ color: C.ink, flex: 1 }}>{n.text}</span>
                <span style={{ color: C.mute, fontSize: 11.5, whiteSpace: "nowrap" }}>{n.time}</span>
              </div>
            ))}
          </div>
        </PCard>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: 14 }}>
        <PCard>
          <PTitle right={<button onClick={() => nav("analytics")} style={{ background: "none", border: "none", fontFamily: sans, fontSize: 12, fontWeight: 700, color: C.gold, cursor: "pointer" }}>Analytics →</button>}>District Performance — Health</PTitle>
          <Bars height={170} data={["देहरादून", "पौड़ी गढ़वाल", "अल्मोड़ा", "नैनीताल", "चमोली", "हरिद्वार"].map((d, i) => ({ k: d.split(" ")[0], v: [88, 82, 77, 74, 69, 64][i], c: [C.forest, C.forest, C.gold, C.gold, C.gold, C.red][i] }))} />
        </PCard>
        <PCard>
          <PTitle right={<button onClick={() => nav("issues")} style={{ background: "none", border: "none", fontFamily: sans, fontSize: 12, fontWeight: 700, color: C.gold, cursor: "pointer" }}>Issues →</button>}>Issue Overview</PTitle>
          <Donut label={String(store.issues.length)} sub="TOTAL" segments={[
            { k: "प्राप्त", v: store.issues.filter((i) => i.status === "प्राप्त").length, c: C.slate },
            { k: "सौंपा गया", v: store.issues.filter((i) => i.status === "सौंपा गया").length, c: C.slateSoft },
            { k: "प्रगति पर", v: store.issues.filter((i) => i.status === "प्रगति पर").length, c: C.gold },
            { k: "हल हुआ", v: store.issues.filter((i) => i.status === "हल हुआ").length, c: C.lime },
          ]} />
        </PCard>
        <PCard>
          <PTitle right={<button onClick={() => nav("tasks")} style={{ background: "none", border: "none", fontFamily: sans, fontSize: 12, fontWeight: 700, color: C.gold, cursor: "pointer" }}>Tasks →</button>}>Task Overview</PTitle>
          <Donut label={String(store.tasks.length)} sub="TOTAL" segments={[
            { k: "प्रगति पर", v: store.tasks.filter((t) => t.status === "प्रगति पर").length, c: C.gold },
            { k: "शुरू नहीं", v: store.tasks.filter((t) => t.status === "शुरू नहीं").length, c: "#B9B4A1" },
            { k: "समीक्षा", v: store.tasks.filter((t) => ["जमा", "समीक्षाधीन"].includes(t.status)).length, c: C.slate },
            { k: "पूर्ण", v: store.tasks.filter((t) => t.status === "पूर्ण").length, c: C.lime },
            { k: "विलंबित", v: store.tasks.filter((t) => t.status === "विलंबित").length, c: C.red },
          ]} />
        </PCard>
      </div>
    </div>
  );
}

function OrgModule({ nav }) {
  const [open, setOpen] = useState({ Central: true, गढ़वाल: true });
  const toggle = (k) => setOpen({ ...open, [k]: !open[k] });
  const Row = ({ label, meta, depth, k, children, onOpen }) => (
    <div style={{ marginLeft: depth * 22 }}>
      <div className="rowhover" onClick={() => (children ? toggle(k) : onOpen && onOpen())} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#fff", border: `1px solid ${C.line}`, borderRadius: 10, marginBottom: 8, fontFamily: sans }}>
        {children ? <span style={{ color: C.gold, fontWeight: 700, width: 14, transition: "transform .2s", transform: open[k] ? "rotate(90deg)" : "none", display: "inline-block" }}>›</span> : <span style={{ width: 14, color: C.line }}>·</span>}
        <span style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>{label}</span>
        <span style={{ marginLeft: "auto", fontSize: 12, color: C.mute }}>{meta}</span>
      </div>
      {children && open[k] && <div className="ukd-fade">{children}</div>}
    </div>
  );
  return (
    <div className="ukd-fade">
      <PageTitle title="संगठन" sub="The living structure — Central → Mandal → District → Block → Local Unit. Click a district to open its view." />
      <PCard>
        <Row label="UKD Central" meta="Central leadership · demo" depth={0} k="केंद्र">
          {Object.keys(REGIONS).map((reg) => (
            <Row key={reg} label={`${reg} Mandal`} meta={`${REGIONS[reg].length} districts`} depth={1} k={reg}>
              {REGIONS[reg].map((d) => (
                <Row key={d} label={d} meta={`${SEED_UNITS.filter((u) => u.district === d).length || 1} units · leader: ${seededName(d.length)} (demo)`} depth={2} onOpen={() => nav(`units?d=${d}`)} />
              ))}
            </Row>
          ))}
        </Row>
      </PCard>
      <div style={{ marginTop: 22 }}>
        <PTitle>Organisational Directory</PTitle>
        <DataTable
          columns={[
            { key: "name", label: "Name", strong: true, render: (r) => <span style={{ display: "flex", gap: 10, alignItems: "center" }}><Avatar name={r.name} size={30} />{r.name}</span> },
            { key: "role", label: "Designation" },
            { key: "district", label: "ज़िला" },
            { key: "unit", label: "Unit" },
            { key: "status", label: "Status", render: (r) => <Badge tone={r.status}>{r.status}</Badge> },
          ]}
          rows={SEED_MEMBERS.filter((m) => m.role !== "Member").concat(SEED_KARYAKARTAS.slice(0, 4).map((k) => ({ ...k, role: k.role, status: "सक्रिय" })))}
          searchKeys={["name", "role", "district", "unit"]}
          filters={[{ key: "district", label: "ज़िला", options: DISTRICTS }, { key: "role", label: "Designation", options: ["समिति सदस्य", "इकाई सचिव", "Field Karyakarta", "बूथ कार्यकर्ता", "प्रशिक्षण प्रभारी"] }]}
          onRow={(r) => nav(r.id.startsWith("KK") ? `karyakartas/${r.id}` : `members/${r.id}`)}
        />
      </div>
      <div style={{ marginTop: 22 }}>
        <PTitle>Vacancy Overview</PTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 12 }}>
          {[["District level", [["Filled", 11], ["Vacant", 1], ["Under appointment", 1]]], ["Block level", [["Filled", 34], ["Vacant", 6], ["Temporary", 3]]], ["Local unit level", [["Filled", 96], ["Vacant", 18], ["Under appointment", 9]]]].map(([lvl, rows]) => (
            <PCard key={lvl} pad={18}>
              <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 14, color: C.ink, marginBottom: 12 }}>{lvl}</div>
              {rows.map(([l, v]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", fontFamily: sans, fontSize: 13, padding: "6px 0", borderBottom: `1px solid ${C.line}55` }}>
                  <span style={{ color: C.mute }}>{l}</span>
                  <b style={{ color: l === "Vacant" ? C.red : C.ink }}>{v}</b>
                </div>
              ))}
            </PCard>
          ))}
        </div>
      </div>
    </div>
  );
}

function DetailShell({ back, backLabel, title, sub, badge, children, actions }) {
  return (
    <div className="ukd-fade">
      <button onClick={back} style={{ background: "none", border: "none", fontFamily: sans, fontSize: 13, fontWeight: 700, color: C.slate, cursor: "pointer", padding: 0, marginBottom: 16 }}>← {backLabel}</button>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "flex-start", marginBottom: 22 }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          {title.avatar && <Avatar name={title.avatar} size={54} />}
          <div>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <h1 style={{ fontFamily: serif, fontSize: 26, fontWeight: 600, color: C.ink, margin: 0 }}>{title.text}</h1>
              {badge}
            </div>
            <div style={{ fontFamily: sans, fontSize: 13.5, color: C.mute, marginTop: 4 }}>{sub}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>{actions}</div>
      </div>
      {children}
    </div>
  );
}
const KV = ({ items }) => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
    {items.map(([l, v]) => (
      <PCard key={l} pad={14}>
        <div style={{ fontFamily: sans, fontSize: 11, fontWeight: 700, color: C.mute }}>{l}</div>
        <div style={{ fontFamily: sans, fontSize: 14.5, fontWeight: 700, color: C.ink, marginTop: 5 }}>{v}</div>
      </PCard>
    ))}
  </div>
);

function MembersModule({ nav, id, user }) {
  const store = useStore(); const toast = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [nf, setNf] = useState({ name: "", district: user.district || "", role: "Member" });
  const rows = user.district ? store.members.filter((m) => m.district === user.district) : store.members;
  if (id) {
    const m = store.members.find((x) => x.id === id);
    if (!m) return <EmptyState title="Member not found" cta="Back to members" onCta={() => nav("members")} />;
    return (
      <DetailShell back={() => nav("members")} backLabel="Members" title={{ text: m.name, avatar: m.name }} sub={`${m.id} · ${m.district} · ${m.unit}`} badge={<Badge tone={m.status}>{m.status}</Badge>}
        actions={<><Btn size="sm" kind="ghost" onClick={() => toast("Demo — edit is simulated.")}>Edit profile</Btn><Btn size="sm" onClick={() => { store.setMembers(store.members.map((x) => x.id === m.id ? { ...x, status: x.status === "सक्रिय" ? "लंबित" : "सक्रिय" } : x)); toast(`Member marked ${m.status === "सक्रिय" ? "लंबित" : "सक्रिय"}.`); }}>Toggle status</Btn></>}>
        <KV items={[["संपर्क", m.phone], ["Role", m.role], ["ब्लॉक", m.block], ["Joined", m.joined], ["Last activity", m.lastActivity], ["Region", regionOf(m.district)]]} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14, marginTop: 16 }}>
          <PCard><PTitle>Assigned tasks</PTitle>
            {store.tasks.filter((t) => t.assignee === m.name).length === 0 ? <div style={{ fontFamily: sans, fontSize: 13, color: C.mute }}>No tasks assigned to this member.</div> :
              store.tasks.filter((t) => t.assignee === m.name).map((t) => (
                <button key={t.id} onClick={() => nav(`tasks/${t.id}`)} className="rowhover" style={{ display: "flex", width: "100%", justifyContent: "space-between", gap: 10, padding: "9px 10px", borderRadius: 8, background: "none", border: "none", fontFamily: sans, fontSize: 13, cursor: "pointer", textAlign: "left" }}>
                  <span style={{ color: C.ink, fontWeight: 600 }}>{t.name}</span><Badge tone={t.status}>{t.status}</Badge>
                </button>))}
          </PCard>
          <PCard><PTitle>Recent activity</PTitle>
            {["Attended block meeting — 9 Aug", "Membership verified by unit — 2 Aug", "Joined the organisation — " + m.joined].map((a, i) => (
              <div key={i} style={{ fontFamily: sans, fontSize: 13, color: C.ink, padding: "8px 0", borderBottom: `1px solid ${C.line}55` }}><span style={{ color: C.gold, marginRight: 8 }}>●</span>{a}</div>))}
          </PCard>
        </div>
      </DetailShell>
    );
  }
  return (
    <div className="ukd-fade">
      <PageTitle title="Members" sub={`Member CRM · ${rows.length} records ${user.district ? `in ${user.district}` : "statewide"} · demo data`} right={<Btn size="sm" onClick={() => setAddOpen(true)}>+ Add member</Btn>} />
      <DataTable
        columns={[
          { key: "name", label: "Name", strong: true, render: (r) => <span style={{ display: "flex", gap: 10, alignItems: "center" }}><Avatar name={r.name} size={28} />{r.name}</span> },
          { key: "id", label: "Membership ID" },
          { key: "district", label: "ज़िला" },
          { key: "unit", label: "Unit" },
          { key: "role", label: "Role" },
          { key: "joined", label: "Joined" },
          { key: "status", label: "Status", render: (r) => <Badge tone={r.status}>{r.status}</Badge> },
          { key: "lastActivity", label: "Last Activity" },
        ]}
        rows={rows} searchKeys={["name", "id", "unit"]} dense
        filters={[{ key: "district", label: "ज़िला", options: DISTRICTS }, { key: "status", label: "Status", options: ["सक्रिय", "लंबित"] }, { key: "role", label: "Role", options: ["Member", "समिति सदस्य", "इकाई सचिव"] }]}
        onRow={(r) => nav(`members/${r.id}`)}
        empty={<EmptyState title="No members found" sub="Adjust the filters, or add the first member of this unit." cta="+ Add member" onCta={() => setAddOpen(true)} />}
      />
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add member (demo)">
        <Field label="पूरा नाम" required><TextInput value={nf.name} onChange={(e) => setNf({ ...nf, name: e.target.value })} /></Field>
        <Field label="ज़िला" required><Select value={nf.district} onChange={(e) => setNf({ ...nf, district: e.target.value })} options={DISTRICTS} placeholder="ज़िला चुनें" /></Field>
        <Field label="Role"><Select value={nf.role} onChange={(e) => setNf({ ...nf, role: e.target.value })} options={["Member", "समिति सदस्य", "इकाई सचिव"]} /></Field>
        <Btn style={{ width: "100%" }} onClick={() => {
          if (!nf.name.trim() || !nf.district) { toast("Name and district are required.", "error"); return; }
          store.setMembers([{ id: `UKD-M-2026-${Math.floor(3000 + Math.random() * 5000)}`, name: nf.name, district: nf.district, unit: "सौंपा जाना शेष", block: "—", role: nf.role, joined: "Aug 2026", status: "लंबित", lastActivity: "Just now", phone: "+91 9XXXXXXXXX" }, ...store.members]);
          setAddOpen(false); setNf({ name: "", district: user.district || "", role: "Member" }); toast("Member added to the list.");
        }}>Add member</Btn>
      </Modal>
    </div>
  );
}

function KaryakartaModule({ nav, id }) {
  const toast = useToast();
  if (id) {
    const k = SEED_KARYAKARTAS.find((x) => x.id === id);
    if (!k) return <EmptyState title="Karyakarta not found" cta="Back" onCta={() => nav("karyakartas")} />;
    return (
      <DetailShell back={() => nav("karyakartas")} backLabel="Karyakartas" title={{ text: k.name, avatar: k.name }} sub={`${k.id} · ${k.role} · ${k.district}`} badge={<Badge tone={k.active ? "सक्रिय" : "लंबित"}>{k.active ? "सक्रिय" : "Inactive"}</Badge>}
        actions={<Btn size="sm" onClick={() => toast("Demo — task assignment is simulated.")}>Assign task</Btn>}>
        <KV items={[["Unit", k.unit], ["Availability", k.availability], ["Skills", k.skills.join(", ")], ["Tasks completed", k.tasksDone], ["प्रशिक्षण", k.training], ["Region", regionOf(k.district)]]} />
        <div style={{ marginTop: 16 }}>
          <PCard><PTitle>Activity history</PTitle>
            {["Completed outreach task — 8 Aug", "Attended training module 2 — 28 Jul", "Verified 12 membership forms — 20 Jul"].map((a, i) => (
              <div key={i} style={{ fontFamily: sans, fontSize: 13, color: C.ink, padding: "8px 0", borderBottom: `1px solid ${C.line}55` }}><span style={{ color: C.lime, marginRight: 8 }}>●</span>{a}</div>))}
          </PCard>
        </div>
      </DetailShell>
    );
  }
  const active = SEED_KARYAKARTAS.filter((k) => k.active).length;
  return (
    <div className="ukd-fade">
      <PageTitle title="Karyakartas" sub="The organisation's working strength — separate from general membership." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[["Active Karyakartas", active, C.forest], ["New this month", 3, C.slate], ["Training completed", SEED_KARYAKARTAS.filter((k) => k.training === "पूर्ण").length, C.gold], ["Tasks completed", SEED_KARYAKARTAS.reduce((a, k) => a + k.tasksDone, 0), C.slateSoft]].map(([l, v, c]) => (
          <PCard key={l} pad={16}><div style={{ fontFamily: serif, fontSize: 32, color: c }}>{v}</div><div style={{ fontFamily: sans, fontSize: 11.5, fontWeight: 700, color: C.mute, marginTop: 4 }}>{l}</div></PCard>
        ))}
      </div>
      <DataTable
        columns={[
          { key: "name", label: "Name", strong: true, render: (r) => <span style={{ display: "flex", gap: 10, alignItems: "center" }}><Avatar name={r.name} size={28} />{r.name}</span> },
          { key: "role", label: "Role" }, { key: "district", label: "ज़िला" }, { key: "unit", label: "Unit" },
          { key: "availability", label: "Availability" }, { key: "tasksDone", label: "Tasks done" },
          { key: "training", label: "प्रशिक्षण", render: (r) => <Badge tone={r.training === "पूर्ण" ? "पूर्ण" : "प्रगति पर"}>{r.training}</Badge> },
        ]}
        rows={SEED_KARYAKARTAS} searchKeys={["name", "role", "unit"]} dense
        filters={[{ key: "district", label: "ज़िला", options: DISTRICTS }, { key: "role", label: "Role", options: [...new Set(SEED_KARYAKARTAS.map((k) => k.role))] }]}
        onRow={(r) => nav(`karyakartas/${r.id}`)}
      />
    </div>
  );
}

function UnitsModule({ nav, query }) {
  const attnOnly = query && query.includes("attn=1");
  const dFilter = query && query.includes("d=") ? decodeURIComponent(query.split("d=")[1]) : null;
  const [sel, setSel] = useState(null);
  let rows = SEED_UNITS;
  if (attnOnly) rows = rows.filter((u) => u.health < 65);
  if (dFilter) rows = rows.filter((u) => u.district === dFilter);
  return (
    <div className="ukd-fade">
      <PageTitle title="Local Units" sub={attnOnly ? "Filtered: units needing attention (health below 65%)" : dFilter ? `Filtered: ${dFilter}` : "Ground-level unit cards with live health checks."} right={(attnOnly || dFilter) && <Btn size="sm" kind="subtle" onClick={() => nav("units")}>Clear filter</Btn>} />
      {rows.length === 0 ? <EmptyState title="No units match" sub="Clear the filter to see all units." cta="Show all units" onCta={() => nav("units")} /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 14 }}>
          {rows.map((u) => (
            <PCard key={u.id} onClick={() => setSel(u)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 15.5, color: C.ink }}>{u.name}</div>
                  <div style={{ fontFamily: sans, fontSize: 12, color: C.mute, marginTop: 3 }}>{u.district} · {u.block}</div>
                </div>
                <HealthRing pct={u.health} size={46} stroke={5} />
              </div>
              <div style={{ fontFamily: sans, fontSize: 12.5, color: "#4A554C", lineHeight: 1.8 }}>
                Leader: <b>{u.leader}</b> (demo)<br />
                {u.karyakartas} Karyakartas · {u.members} members<br />
                {u.openIssues} open issues · {u.pendingTasks} pending tasks · report: <b style={{ color: u.lastReport === "अप्राप्त" ? C.red : C.ink }}>{u.lastReport}</b>
              </div>
            </PCard>
          ))}
        </div>
      )}
      <Modal open={!!sel} onClose={() => setSel(null)} title={sel ? sel.name : ""}>
        {sel && (
          <div style={{ fontFamily: sans }}>
            <KV items={[["Leader (demo)", sel.leader], ["Committee", `${sel.committee} members`], ["Active Karyakartas", sel.karyakartas], ["Last activity", sel.lastActivity], ["Open issues", sel.openIssues], ["Latest report", sel.lastReport]]} />
            <div style={{ marginTop: 16, background: C.ivory, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.mute, marginBottom: 10 }}>UNIT HEALTH CHECKS</div>
              {[["Leadership assigned", sel.checks.leadership], ["Committee formed", sel.checks.committee], ["Recent activity", sel.checks.activity], ["Reporting up to date", sel.checks.reporting], [`Tasks — ${sel.pendingTasks} pending`, sel.pendingTasks === 0]].map(([l, ok]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, padding: "6px 0" }}>
                  <span style={{ color: C.ink }}>{l}</span><span style={{ color: ok ? "#4A6B1D" : C.red, fontWeight: 700 }}>{ok ? "✓" : "✕"}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

const TASK_FLOW = ["शुरू नहीं", "प्रगति पर", "जमा", "समीक्षाधीन", "पूर्ण"];
function TasksModule({ nav, id, query, user }) {
  const store = useStore(); const toast = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [tab, setTab] = useState(query && query.includes("f=Overdue") ? "विलंबित" : "सभी");
  const [nf, setNf] = useState({ name: "", district: user.district || "", priority: "मध्यम", assignee: "", deadline: "" });
  if (id) {
    const t = store.tasks.find((x) => x.id === id);
    if (!t) return <EmptyState title="Task not found" cta="Back to tasks" onCta={() => nav("tasks")} />;
    const idx = TASK_FLOW.indexOf(t.status);
    const advance = () => {
      const next = t.status === "विलंबित" ? "प्रगति पर" : TASK_FLOW[Math.min(idx + 1, TASK_FLOW.length - 1)];
      store.setTasks(store.tasks.map((x) => x.id === t.id ? { ...x, status: next } : x));
      toast(`Task moved to “${next}”.`);
    };
    return (
      <DetailShell back={() => nav("tasks")} backLabel="Tasks" title={{ text: t.name }} sub={`${t.id} · ${t.district} · ${t.unit} · deadline ${t.deadline}`} badge={<Badge tone={t.status}>{t.status}</Badge>}
        actions={<>{t.status !== "पूर्ण" && <Btn size="sm" onClick={advance}>{t.status === "विलंबित" ? "Resume task" : idx >= 3 ? "Mark completed" : "Advance status →"}</Btn>}<Btn size="sm" kind="ghost" onClick={() => toast("Demo — comment added (simulated).")}>Add comment</Btn></>}>
        <div style={{ display: "flex", gap: 4, marginBottom: 18, flexWrap: "wrap" }}>
          {["Create", "Assign", "Execute", "Report", "Verify", "Complete"].map((s, i) => {
            const done = t.status === "पूर्ण" ? true : i <= (idx < 0 ? 2 : idx + 1);
            return (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ fontFamily: sans, fontSize: 11.5, fontWeight: 700, padding: "5px 12px", borderRadius: 99, background: done ? C.forest : "#EAE6D7", color: done ? "#fff" : C.mute }}>{s}</div>
                {i < 5 && <span style={{ color: C.line }}>—</span>}
              </div>
            );
          })}
        </div>
        <KV items={[["Assigned to", t.assignee], ["Priority", t.priority], ["Deadline", t.deadline], ["Evidence", t.evidence], ["Comments", t.comments], ["ज़िला", t.district]]} />
        <PCard style={{ marginTop: 16 }}><PTitle>Description</PTitle><p style={{ fontFamily: sans, fontSize: 14, lineHeight: 1.7, color: "#3C463E", margin: 0 }}>{t.desc}</p></PCard>
      </DetailShell>
    );
  }
  const tabs = ["सभी", "My Tasks", "विलंबित", "प्रगति पर", "पूर्ण", "Assigned by me"];
  let rows = store.tasks;
  if (user.district && user.key !== "central-admin" && user.key !== "central-leadership") rows = rows.filter((t) => t.district === user.district || tab === "सभी");
  if (tab === "विलंबित") rows = store.tasks.filter((t) => t.status === "विलंबित");
  else if (tab === "प्रगति पर") rows = store.tasks.filter((t) => t.status === "प्रगति पर");
  else if (tab === "पूर्ण") rows = store.tasks.filter((t) => t.status === "पूर्ण");
  else if (tab === "My Tasks") rows = store.tasks.slice(0, 4);
  else if (tab === "Assigned by me") rows = store.tasks.slice(4, 9);
  return (
    <div className="ukd-fade">
      <PageTitle title="Tasks" sub="Create → Assign → Execute → Report → Verify → Complete" right={<Btn size="sm" onClick={() => setCreateOpen(true)}>+ Create task</Btn>} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {tabs.map((t) => <button key={t} onClick={() => setTab(t)} style={{ fontFamily: sans, fontSize: 12.5, fontWeight: 700, padding: "7px 15px", borderRadius: 99, border: `1.5px solid ${C.forest}33`, background: tab === t ? C.forest : "#fff", color: tab === t ? "#fff" : C.forest, cursor: "pointer" }}>{t}</button>)}
      </div>
      <DataTable
        columns={[
          { key: "name", label: "Task", strong: true },
          { key: "assignee", label: "Assigned to" }, { key: "district", label: "ज़िला" },
          { key: "priority", label: "Priority", render: (r) => <Badge tone={r.priority}>{r.priority}</Badge> },
          { key: "deadline", label: "Deadline" },
          { key: "status", label: "Status", render: (r) => <Badge tone={r.status}>{r.status}</Badge> },
        ]}
        rows={rows} searchKeys={["name", "assignee", "district"]} dense
        filters={[{ key: "district", label: "ज़िला", options: DISTRICTS }, { key: "priority", label: "Priority", options: ["उच्च", "मध्यम", "निम्न"] }]}
        onRow={(r) => nav(`tasks/${r.id}`)}
        empty={<EmptyState title="No tasks assigned" sub="Tasks matching this view will appear here." cta="+ Create task" onCta={() => setCreateOpen(true)} />}
      />
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create task">
        <Field label="Task name" required><TextInput value={nf.name} onChange={(e) => setNf({ ...nf, name: e.target.value })} /></Field>
        <Field label="Assign to" required><Select value={nf.assignee} onChange={(e) => setNf({ ...nf, assignee: e.target.value })} options={SEED_KARYAKARTAS.map((k) => k.name)} placeholder="Choose a Karyakarta" /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="ज़िला"><Select value={nf.district} onChange={(e) => setNf({ ...nf, district: e.target.value })} options={DISTRICTS} placeholder="ज़िला" /></Field>
          <Field label="Priority"><Select value={nf.priority} onChange={(e) => setNf({ ...nf, priority: e.target.value })} options={["उच्च", "मध्यम", "निम्न"]} /></Field>
        </div>
        <Field label="Deadline"><TextInput value={nf.deadline} onChange={(e) => setNf({ ...nf, deadline: e.target.value })} placeholder="e.g. 25 Aug 2026" /></Field>
        <Btn style={{ width: "100%" }} onClick={() => {
          if (!nf.name.trim() || !nf.assignee) { toast("Task name and assignee are required.", "error"); return; }
          store.setTasks([{ id: `T-${Math.floor(500 + Math.random() * 400)}`, name: nf.name, district: nf.district || "देहरादून", priority: nf.priority, assignee: nf.assignee, unit: "Local Unit 01", deadline: nf.deadline || "31 Aug 2026", status: "शुरू नहीं", desc: "Newly created task. Assign, execute and report through the standard workflow.", comments: 0, evidence: "—" }, ...store.tasks]);
          setCreateOpen(false); setNf({ name: "", district: user.district || "", priority: "मध्यम", assignee: "", deadline: "" }); toast("Task created and assigned.");
        }}>Create task</Btn>
      </Modal>
    </div>
  );
}

function IssuesModule({ nav, id, query }) {
  const store = useStore(); const toast = useToast();
  const aged = query && query.includes("age=15");
  if (id) {
    const iss = store.issues.find((x) => x.id === id);
    if (!iss) return <EmptyState title="Issue not found" cta="Back to issues" onCta={() => nav("issues")} />;
    const idx = ISSUE_STAGES.indexOf(iss.status);
    const advance = () => {
      const next = ISSUE_STAGES[Math.min(idx + 1, ISSUE_STAGES.length - 1)];
      store.setIssues(store.issues.map((x) => x.id === iss.id ? { ...x, status: next } : x));
      toast(`Issue moved to “${next}”.`);
    };
    return (
      <DetailShell back={() => nav("issues")} backLabel="People's Issues" title={{ text: iss.category }} sub={`${iss.id} · ${iss.location} · submitted ${iss.date}`} badge={<Badge tone={iss.status}>{iss.status}</Badge>}
        actions={<>{iss.status !== "बंद" && <Btn size="sm" onClick={advance}>{idx >= 3 ? "Close issue" : "Advance status →"}</Btn>}<Btn size="sm" kind="ghost" onClick={() => toast("Internal note added (demo).")}>Add internal note</Btn></>}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
          <PCard>
            <PTitle>Issue information</PTitle>
            <p style={{ fontFamily: sans, fontSize: 14.5, lineHeight: 1.7, color: "#3C463E", marginTop: 0 }}>{iss.title}.</p>
            <KV items={[["Citizen", iss.citizen], ["संपर्क", iss.phone], ["Priority", iss.priority], ["Age", `${iss.ageDays} days`], ["Assigned unit", iss.assignedUnit], ["Attachments", "1 photo (demo)"]]} />
          </PCard>
          <PCard>
            <PTitle>Status timeline</PTitle>
            {ISSUE_STAGES.map((s, i) => (
              <div key={s} style={{ display: "flex", gap: 14 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: i <= idx ? C.forest : "#E7E3D4", color: i <= idx ? "#fff" : C.mute, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: sans, fontWeight: 700 }}>{i <= idx ? "✓" : i + 1}</div>
                  {i < ISSUE_STAGES.length - 1 && <div style={{ width: 2, height: 24, background: i < idx ? C.forest : "#E7E3D4" }} />}
                </div>
                <div style={{ fontFamily: sans, fontSize: 13.5, fontWeight: i === idx ? 700 : 500, color: i <= idx ? C.ink : C.mute, paddingTop: 2 }}>{s}{i === idx && <span style={{ color: C.gold, marginLeft: 8, fontSize: 11.5 }}>CURRENT</span>}</div>
              </div>
            ))}
            <div style={{ marginTop: 14, background: C.ivory, borderRadius: 10, padding: 12, fontFamily: sans, fontSize: 12.5, color: C.mute }}>
              Internal notes ({iss.notes}) · resolution and closure summary are recorded here before an issue is closed.
            </div>
          </PCard>
        </div>
      </DetailShell>
    );
  }
  const rows = aged ? store.issues.filter((i) => i.ageDays > 15 && !["हल हुआ", "बंद"].includes(i.status)) : store.issues;
  return (
    <div className="ukd-fade">
      <PageTitle title="People's Issues" sub={aged ? "Filtered: unresolved issues older than 15 days" : "Every public issue submitted through the website, tracked to closure."} right={aged && <Btn size="sm" kind="subtle" onClick={() => nav("issues")}>Clear filter</Btn>} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14, marginBottom: 20 }}>
        <PCard><PTitle>Open vs resolved</PTitle>
          <Donut label={String(store.issues.length)} sub="TOTAL" segments={[
            { k: "Open", v: store.issues.filter((i) => !["हल हुआ", "बंद"].includes(i.status)).length, c: C.gold },
            { k: "हल हुआ", v: store.issues.filter((i) => ["हल हुआ", "बंद"].includes(i.status)).length, c: C.lime },
          ]} /></PCard>
        <PCard><PTitle>Issues by category</PTitle>
          <Bars height={150} color={C.slate} data={["सड़क व संपर्क", "पानी", "परिवहन", "बिजली", "स्वास्थ्य"].map((c) => ({ k: c.split(" ")[0], v: store.issues.filter((i) => i.category === c).length || 1 }))} /></PCard>
        <PCard><PTitle>Issue ageing</PTitle>
          <Bars height={150} color={C.gold} data={[["0–7d", 0, 7], ["8–15d", 8, 15], ["16–25d", 16, 25], ["25d+", 26, 99]].map(([k, a, b]) => ({ k, v: store.issues.filter((i) => i.ageDays >= a && i.ageDays <= b).length, c: b > 15 ? C.red : C.gold }))} /></PCard>
      </div>
      <DataTable
        columns={[
          { key: "id", label: "समस्या क्रमांक", strong: true },
          { key: "category", label: "श्रेणी" }, { key: "district", label: "ज़िला" },
          { key: "assignedUnit", label: "Assigned Unit" }, { key: "date", label: "दिनांक" },
          { key: "priority", label: "Priority", render: (r) => <Badge tone={r.priority}>{r.priority}</Badge> },
          { key: "status", label: "Status", render: (r) => <Badge tone={r.status}>{r.status}</Badge> },
        ]}
        rows={rows} searchKeys={["id", "category", "district", "title"]} dense
        filters={[{ key: "district", label: "ज़िला", options: DISTRICTS }, { key: "category", label: "श्रेणी", options: ISSUE_CATEGORIES }, { key: "status", label: "Status", options: ISSUE_STAGES }]}
        onRow={(r) => nav(`issues/${r.id}`)}
        empty={<EmptyState title="No public issues found" sub="Issues submitted on the public website appear here automatically." />}
      />
    </div>
  );
}

function PEventsModule({ nav, id }) {
  const toast = useToast();
  const store = useStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [tab, setTab] = useState("Overview");
  if (id) {
    const e = SEED_EVENTS.find((x) => x.id === id) || SEED_EVENTS[0];
    return (
      <DetailShell back={() => nav("pevents")} backLabel="कार्यक्रम" title={{ text: e.title }} sub={`${e.date} · ${e.time} · ${e.venue}`} badge={<Badge>{e.type}</Badge>}
        actions={<Btn size="sm" onClick={() => toast("Attendance sheet opened (demo).")}>Record attendance</Btn>}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {["Overview", "Attendance", "Tasks", "दस्तावेज़", "Photos", "Follow-up"].map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{ fontFamily: sans, fontSize: 12.5, fontWeight: 700, padding: "7px 15px", borderRadius: 99, border: `1.5px solid ${C.forest}33`, background: tab === t ? C.forest : "#fff", color: tab === t ? "#fff" : C.forest, cursor: "pointer" }}>{t}</button>
          ))}
        </div>
        {tab === "Overview" && <><KV items={[["आयोजक", e.organiser], ["Expected participants", e.participants], ["ज़िला", e.district], ["Type", e.type]]} /><PCard style={{ marginTop: 14 }}><PTitle>Meeting agenda</PTitle>{["Opening & attendance", "Organisational review of the district", "Public issue follow-ups", "Task assignments & minutes", "Decisions and next meeting"].map((a, i) => <div key={i} style={{ fontFamily: sans, fontSize: 13.5, padding: "8px 0", borderBottom: `1px solid ${C.line}55`, color: C.ink }}><b style={{ color: C.gold, marginRight: 10 }}>{i + 1}.</b>{a}</div>)}</PCard></>}
        {tab === "Attendance" && <PCard><PTitle>Attendance ({Math.floor(e.participants * 0.8)} / {e.participants} confirmed)</PTitle>{SEED_MEMBERS.slice(0, 6).map((m) => <div key={m.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.line}55`, fontFamily: sans, fontSize: 13.5 }}><Avatar name={m.name} size={28} /><span style={{ flex: 1, color: C.ink, fontWeight: 600 }}>{m.name}</span><Badge tone="सक्रिय">Present</Badge></div>)}</PCard>}
        {tab === "Tasks" && <PCard><PTitle>Follow-up tasks</PTitle>{store.tasks.slice(0, 3).map((t) => <button key={t.id} onClick={() => nav(`tasks/${t.id}`)} className="rowhover" style={{ display: "flex", width: "100%", justifyContent: "space-between", padding: "10px", borderRadius: 8, background: "none", border: "none", fontFamily: sans, fontSize: 13.5, cursor: "pointer" }}><span style={{ fontWeight: 600, color: C.ink }}>{t.name}</span><Badge tone={t.status}>{t.status}</Badge></button>)}</PCard>}
        {["दस्तावेज़", "Photos", "Follow-up"].includes(tab) && <EmptyState title={`No ${tab.toLowerCase()} yet`} sub={`${tab} recorded for this event will appear here.`} cta={`Add ${tab.toLowerCase()} (demo)`} onCta={() => toast("Demo — upload simulated.")} />}
      </DetailShell>
    );
  }
  return (
    <div className="ukd-fade">
      <PageTitle title="Events & Meetings" sub="Programmes, meetings, minutes, decisions and follow-up." right={<Btn size="sm" onClick={() => setCreateOpen(true)}>+ Create event</Btn>} />
      <DataTable
        columns={[
          { key: "title", label: "Event", strong: true }, { key: "type", label: "Type", render: (r) => <Badge>{r.type}</Badge> },
          { key: "date", label: "दिनांक" }, { key: "time", label: "समय" }, { key: "district", label: "ज़िला" }, { key: "participants", label: "Participants" },
        ]}
        rows={SEED_EVENTS} searchKeys={["title", "district", "type"]} dense
        filters={[{ key: "district", label: "ज़िला", options: DISTRICTS }, { key: "type", label: "Type", options: [...new Set(SEED_EVENTS.map((e) => e.type))] }]}
        onRow={(r) => nav(`pevents/${r.id}`)}
      />
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create event (demo)">
        <Field label="Title" required><TextInput placeholder="Event title" /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="दिनांक"><TextInput placeholder="e.g. 28 Aug 2026" /></Field>
          <Field label="ज़िला"><Select options={DISTRICTS} placeholder="ज़िला" /></Field>
        </div>
        <Btn style={{ width: "100%" }} onClick={() => { setCreateOpen(false); toast("Event created (demo)."); }}>Create event</Btn>
      </Modal>
    </div>
  );
}

function PDocsModule() {
  const toast = useToast();
  return (
    <div className="ukd-fade">
      <PageTitle title="दस्तावेज़" sub="The organisation's digital archive — searchable, filterable, tagged." right={<Btn size="sm" onClick={() => toast("Demo — upload simulated.")}>⇪ Upload</Btn>} />
      <DataTable
        columns={[
          { key: "title", label: "Document", strong: true },
          { key: "category", label: "श्रेणी", render: (r) => <Badge>{r.category}</Badge> },
          { key: "district", label: "ज़िला" }, { key: "date", label: "Added" }, { key: "size", label: "Size" },
          { key: "a", label: "", render: () => <span style={{ color: C.forest, fontWeight: 700 }}>Preview · ↓</span> },
        ]}
        rows={SEED_DOCS} searchKeys={["title", "category"]} dense
        filters={[{ key: "category", label: "श्रेणी", options: [...new Set(SEED_DOCS.map((d) => d.category))] }, { key: "year", label: "Year", options: ["2026", "2025"] }]}
        onRow={() => toast("Document preview (demo).")}
        empty={<EmptyState title="No documents uploaded" sub="Upload the first document to start the archive." cta="⇪ Upload (demo)" onCta={() => toast("Demo — upload simulated.")} />}
      />
    </div>
  );
}

function NoticesModule({ user }) {
  const store = useStore(); const toast = useToast();
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(null);
  const [nf, setNf] = useState({ title: "", type: "Official Notice", audience: "सभी इकाइयाँ", priority: "मध्यम", content: "" });
  const canPublish = ["central-admin", "central-leadership"].includes(user.key);
  return (
    <div className="ukd-fade">
      <PageTitle title="Notice Centre" sub={canPublish ? "Publish official notices, circulars and instructions to the organisation." : "Notices published by central leadership. Your role can read and acknowledge."} right={canPublish && <Btn size="sm" onClick={() => setOpen(true)}>+ Publish notice</Btn>} />
      <div style={{ display: "grid", gap: 12 }}>
        {store.notices.map((n) => (
          <PCard key={n.id} onClick={() => setSel(n)}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontFamily: sans, fontWeight: 700, fontSize: 15, color: C.ink }}>{n.title}</span>
                  <Badge tone={n.priority}>{n.priority}</Badge>
                </div>
                <div style={{ fontFamily: sans, fontSize: 12.5, color: C.mute, marginTop: 5 }}>{n.type} · Sent to: {n.audience} · {n.date}</div>
              </div>
              <div style={{ fontFamily: sans, fontSize: 12.5, textAlign: "right" }}>
                <div style={{ color: C.slate, fontWeight: 700 }}>Read {n.read[0]} / {n.read[1]}</div>
                <div style={{ color: "#4A6B1D", fontWeight: 700 }}>Acknowledged {n.ack[0]} / {n.ack[1]}</div>
              </div>
            </div>
          </PCard>
        ))}
      </div>
      <Modal open={!!sel} onClose={() => setSel(null)} title={sel ? sel.type : ""}>
        {sel && (
          <div style={{ fontFamily: sans }}>
            <div style={{ fontFamily: serif, fontSize: 21, fontWeight: 600, color: C.ink, marginBottom: 10 }}>{sel.title}</div>
            <p style={{ fontSize: 14.5, lineHeight: 1.7, color: "#3C463E" }}>{sel.content}</p>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <Btn size="sm" onClick={() => { toast("Acknowledged (demo)."); setSel(null); }}>Acknowledge</Btn>
              <Btn size="sm" kind="ghost" onClick={() => toast("Attachment preview (demo).")}>View attachment</Btn>
            </div>
          </div>
        )}
      </Modal>
      <Modal open={open} onClose={() => setOpen(false)} title="Publish notice">
        <Field label="Title" required><TextInput value={nf.title} onChange={(e) => setNf({ ...nf, title: e.target.value })} /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Type"><Select value={nf.type} onChange={(e) => setNf({ ...nf, type: e.target.value })} options={["Official Notice", "परिपत्र", "Instruction", "Announcement", "Event Notice"]} /></Field>
          <Field label="Priority"><Select value={nf.priority} onChange={(e) => setNf({ ...nf, priority: e.target.value })} options={["उच्च", "मध्यम", "निम्न"]} /></Field>
        </div>
        <Field label="Audience"><Select value={nf.audience} onChange={(e) => setNf({ ...nf, audience: e.target.value })} options={["सभी इकाइयाँ", "District Presidents", "District Admins", "ब्लॉक संयोजक", "Karyakartas"]} /></Field>
        <Field label="Content" required><TextArea value={nf.content} onChange={(e) => setNf({ ...nf, content: e.target.value })} /></Field>
        <Btn style={{ width: "100%" }} onClick={() => {
          if (!nf.title.trim() || !nf.content.trim()) { toast("Title and content are required.", "error"); return; }
          store.setNotices([{ id: `NT-${Date.now()}`, title: nf.title, type: nf.type, audience: nf.audience, priority: nf.priority, date: "12 Aug 2026", read: [0, 47], ack: [0, 47], content: nf.content }, ...store.notices]);
          setOpen(false); setNf({ title: "", type: "Official Notice", audience: "सभी इकाइयाँ", priority: "मध्यम", content: "" }); toast("Notice published to the organisation.");
        }}>Publish notice</Btn>
      </Modal>
    </div>
  );
}

function ReportsModule() {
  const toast = useToast();
  const [sel, setSel] = useState(null);
  return (
    <div className="ukd-fade">
      <PageTitle title="रिपोर्ट" sub="Reporting line: Local Unit → Block → District → Mandal → Central. Week 32 shown." right={<Btn size="sm" onClick={() => toast("Weekly report form opened (demo).")}>+ Submit report</Btn>} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20, fontFamily: sans, fontSize: 12.5, fontWeight: 700 }}>
        {["स्थानीय इकाई", "ब्लॉक", "ज़िला", "मंडल", "केंद्र"].map((s, i, a) => (
          <React.Fragment key={s}>
            <span style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 99, padding: "7px 16px", color: C.ink }}>{s}</span>
            {i < a.length - 1 && <span style={{ alignSelf: "center", color: C.gold }}>→</span>}
          </React.Fragment>
        ))}
      </div>
      <DataTable
        columns={[
          { key: "district", label: "ज़िला", strong: true }, { key: "week", label: "Week" },
          { key: "meetings", label: "Meetings" }, { key: "activities", label: "Activities" }, { key: "tasksDone", label: "Tasks done" },
          { key: "membersAdded", label: "Members added" }, { key: "issuesResolved", label: "Issues resolved" },
          { key: "status", label: "Status", render: (r) => <Badge tone={r.status}>{r.status}</Badge> },
        ]}
        rows={SEED_REPORTS} searchKeys={["district"]} dense
        filters={[{ key: "status", label: "Status", options: ["जमा", "अप्राप्त", "प्रारूप"] }]}
        onRow={(r) => setSel(r)}
      />
      <Modal open={!!sel} onClose={() => setSel(null)} title={sel ? `${sel.district} — Weekly report (${sel.week})` : ""}>
        {sel && (sel.status === "अप्राप्त" ? <EmptyState title="Report not submitted" sub="This district has not filed its weekly report. A reminder can be sent from here." cta="Send reminder (demo)" onCta={() => { toast("Reminder sent to district admin (demo)."); setSel(null); }} /> : (
          <div style={{ fontFamily: sans }}>
            <KV items={[["Meetings", sel.meetings], ["Activities", sel.activities], ["Tasks completed", sel.tasksDone], ["Members added", sel.membersAdded], ["Issues received", sel.issuesIn], ["Issues resolved", sel.issuesResolved]]} />
            <PCard style={{ marginTop: 14 }} pad={16}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.mute, marginBottom: 8 }}>CHALLENGES</div>
              <div style={{ fontSize: 13.5, color: C.ink }}>{sel.challenges}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.mute, margin: "14px 0 8px" }}>SUPPORT REQUIRED</div>
              <div style={{ fontSize: 13.5, color: C.ink }}>{sel.support}</div>
            </PCard>
          </div>
        ))}
      </Modal>
    </div>
  );
}

function FinanceModule() {
  const toast = useToast();
  return (
    <div className="ukd-fade">
      <PageTitle title="Finance" sub="Demo financial dashboard — all figures are fictional and no payments are processed." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[["Total Contributions", "₹4.6 L", C.forest], ["This Month", "₹58,300", C.slate], ["District Allocation", "₹1.9 L", C.slateSoft], ["Expenses", "₹1.2 L", C.gold], ["Pending Approvals", "3", C.red]].map(([l, v, c]) => (
          <PCard key={l} pad={16}><div style={{ fontFamily: serif, fontSize: 28, color: c }}>{v}</div><div style={{ fontFamily: sans, fontSize: 11.5, fontWeight: 700, color: C.mute, marginTop: 4 }}>{l}</div></PCard>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14, marginBottom: 20 }}>
        <PCard><PTitle>Contributions — last 6 weeks (demo)</PTitle><Bars height={160} color={C.forest} data={["Wk27", "Wk28", "Wk29", "Wk30", "Wk31", "Wk32"].map((k, i) => ({ k, v: [31, 44, 38, 52, 47, 58][i] }))} /></PCard>
        <PCard><PTitle>By purpose (demo)</PTitle><Donut label="100%" sub="ALLOCATED" segments={[{ k: "संगठन", v: 38, c: C.forest }, { k: "Public work", v: 27, c: C.gold }, { k: "कार्यक्रम", v: 20, c: C.slate }, { k: "Office", v: 15, c: "#B9B4A1" }]} /></PCard>
      </div>
      <PTitle>Transactions (demo)</PTitle>
      <DataTable
        columns={[
          { key: "date", label: "दिनांक" }, { key: "type", label: "Type", strong: true },
          { key: "amount", label: "Amount", render: (r) => <b>₹{r.amount.toLocaleString("en-IN")}</b> },
          { key: "district", label: "ज़िला" },
          { key: "status", label: "Status", render: (r) => <Badge tone={r.status}>{r.status}</Badge> },
          { key: "receipt", label: "Receipt", render: (r) => <span style={{ color: C.forest, fontWeight: 700 }}>{r.receipt} ↓</span> },
        ]}
        rows={SEED_TXNS} searchKeys={["type", "district", "receipt"]} dense
        filters={[{ key: "type", label: "Type", options: ["सहयोग राशि", "District Allocation", "Expense"] }, { key: "status", label: "Status", options: ["दर्ज", "Pending Approval"] }]}
        onRow={() => toast("Receipt preview (demo).")}
      />
    </div>
  );
}

function AnalyticsModule() {
  const store = useStore();
  return (
    <div className="ukd-fade">
      <PageTitle title="Analytics" sub="Operational analytics — membership, organisation health, tasks, issues and events. Demo data." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: 14 }}>
        <PCard><PTitle>Membership growth (6 months)</PTitle><Bars height={170} color={C.forest} data={["Mar", "Apr", "May", "Jun", "Jul", "Aug"].map((k, i) => ({ k, v: [18, 24, 29, 33, 38, store.members.length][i] }))} /></PCard>
        <PCard><PTitle>Karyakarta activity — tasks / week</PTitle><Bars height={170} color={C.slate} data={["Wk27", "Wk28", "Wk29", "Wk30", "Wk31", "Wk32"].map((k, i) => ({ k, v: [12, 15, 11, 18, 16, 21][i] }))} /></PCard>
        <PCard><PTitle>Organisation health by region</PTitle><Bars height={170} data={[{ k: "गढ़वाल", v: 81, c: C.forest }, { k: "कुमाऊँ", v: 76, c: C.gold }, { k: "तराई", v: 71, c: C.gold }]} /></PCard>
        <PCard><PTitle>Task completion</PTitle><Donut label={`${Math.round(store.tasks.filter((t) => t.status === "पूर्ण").length / store.tasks.length * 100)}%`} sub="COMPLETED" segments={[{ k: "पूर्ण", v: store.tasks.filter((t) => t.status === "पूर्ण").length, c: C.lime }, { k: "सक्रिय", v: store.tasks.filter((t) => !["पूर्ण", "विलंबित"].includes(t.status)).length, c: C.gold }, { k: "विलंबित", v: store.tasks.filter((t) => t.status === "विलंबित").length, c: C.red }]} /></PCard>
        <PCard><PTitle>Issue resolution time (days, avg)</PTitle><Bars height={170} color={C.gold} data={["Road", "पानी", "Elec.", "Health", "परिवहन"].map((k, i) => ({ k, v: [14, 9, 7, 12, 6][i] }))} /></PCard>
        <PCard><PTitle>Events by district (upcoming)</PTitle><Bars height={170} color={C.slateSoft} data={["देहरादून", "अल्मोड़ा", "पौड़ी", "हरिद्वार", "Others"].map((k) => ({ k, v: SEED_EVENTS.filter((e) => e.district.startsWith(k)).length || 1 }))} /></PCard>
      </div>
    </div>
  );
}

const AI_ANSWERS = {
  "summarise this week's organisation report": "Week 32 summary (demo): 11 of 13 districts submitted reports. 27 meetings were held, 41 tasks completed, 19 members added statewide. टिहरी गढ़वाल and नैनीताल have missing reports. Issue resolution improved — 6 resolved vs 4 last week. Recommended focus: overdue tasks in पौड़ी गढ़वाल and पिथौरागढ़.",
  "which districts have overdue tasks": "Demo answer: 2 tasks are currently overdue — 'Booth committee verification drive' (पौड़ी गढ़वाल) and 'Notice acknowledgement follow-up' (पिथौरागढ़). Both are assigned and older than their deadlines. Open the Tasks module with the Overdue filter to act on them.",
  "show unresolved issues older than 15 days": "Demo answer: several unresolved public issues have crossed 15 days, led by road & connectivity complaints in पौड़ी गढ़वाल and उत्तरकाशी, and a healthcare staffing issue in चमोली. The Issues module has an aged-issues filter linked from the Command Centre.",
  "which units haven't submitted reports": "Demo answer: 3 units have not filed their Week 32 report — including units in टिहरी गढ़वाल and नैनीताल. Their district admins were flagged in 'Attention Required'. You can send reminders from the Reports module.",
  "what changed this week": "Demo answer since last Monday: +4 members, 1 new local unit under survey (बागेश्वर), 2 issues resolved, 1 high-priority notice published (reporting deadline), and district health for देहरादून rose from 85% to 88%.",
};
function AIModule() {
  const [msgs, setMsgs] = useState([{ role: "ai", text: "Namaste. I'm the UKD organisation assistant (demo). Ask me about reports, tasks, issues or units — or tap a suggestion below." }]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef(null);
  useEffect(() => { endRef.current && endRef.current.scrollIntoView({ behavior: "smooth" }); }, [msgs, thinking]);
  const ask = (q) => {
    if (!q.trim()) return;
    setMsgs((m) => [...m, { role: "user", text: q }]); setInput(""); setThinking(true);
    setTimeout(() => {
      const key = Object.keys(AI_ANSWERS).find((k) => q.toLowerCase().includes(k.split(" ")[1]) && q.toLowerCase().includes(k.split(" ")[2] || ""));
      const hit = AI_ANSWERS[q.toLowerCase().replace(/[?.]/g, "").trim()] || (key && AI_ANSWERS[key]);
      setMsgs((m) => [...m, { role: "ai", text: hit || "Demo assistant: in the full system I'd query the organisation's live data for that. Try one of the suggested prompts to see a worked answer." }]);
      setThinking(false);
    }, 900);
  };
  return (
    <div className="ukd-fade" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 170px)", minHeight: 420 }}>
      <PageTitle title="Ask UKD AI" sub="A frontend-only assistant concept with mock answers — no live AI is connected." />
      <PCard style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: 0 }} pad={0}>
        <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          {msgs.map((m, i) => (
            <div key={i} className="ukd-fade" style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "82%", background: m.role === "user" ? C.forest : C.ivory, color: m.role === "user" ? "#fff" : C.ink, fontFamily: sans, fontSize: 14, lineHeight: 1.65, padding: "11px 15px", borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px" }}>{m.text}</div>
          ))}
          {thinking && <div style={{ alignSelf: "flex-start", fontFamily: sans, fontSize: 13, color: C.mute, padding: "10px 14px" }}>Thinking…</div>}
          <div ref={endRef} />
        </div>
        <div style={{ borderTop: `1px solid ${C.line}`, padding: 14 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            {Object.keys(AI_ANSWERS).map((q) => (
              <button key={q} onClick={() => ask(q.charAt(0).toUpperCase() + q.slice(1) + "?")} style={{ fontFamily: sans, fontSize: 11.5, fontWeight: 600, padding: "6px 12px", borderRadius: 99, border: `1px solid ${C.slate}44`, background: "#fff", color: C.slate, cursor: "pointer" }}>{q.charAt(0).toUpperCase() + q.slice(1)}?</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <TextInput value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask(input)} placeholder="Ask about the organisation…" />
            <Btn onClick={() => ask(input)}>Ask</Btn>
          </div>
        </div>
      </PCard>
    </div>
  );
}

function NotificationsModule() {
  const [items, setItems] = useState(SEED_NOTIFS);
  return (
    <div className="ukd-fade">
      <PageTitle title="Notifications" sub={`${items.filter((n) => n.unread).length} unread`} right={<Btn size="sm" kind="subtle" onClick={() => setItems(items.map((n) => ({ ...n, unread: false })))}>Mark all read</Btn>} />
      {items.length === 0 ? <EmptyState title="You're all caught up" sub="New notifications will appear here." /> : (
        <div style={{ display: "grid", gap: 10 }}>
          {items.map((n) => (
            <PCard key={n.id} pad={16} onClick={() => setItems(items.map((x) => x.id === n.id ? { ...x, unread: false } : x))}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", fontFamily: sans }}>
                {n.unread && <span style={{ width: 8, height: 8, borderRadius: 99, background: C.gold, flexShrink: 0 }} />}
                <span style={{ fontSize: 14, color: C.ink, fontWeight: n.unread ? 700 : 500, flex: 1 }}>{n.text}</span>
                <span style={{ fontSize: 12, color: C.mute, whiteSpace: "nowrap" }}>{n.time}</span>
              </div>
            </PCard>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsModule({ user }) {
  const toast = useToast();
  const [tab, setTab] = useState("प्रोफ़ाइल");
  const tabs = ["प्रोफ़ाइल", "सुरक्षा", "Permissions", "Audit Log", "System"];
  return (
    <div className="ukd-fade">
      <PageTitle title="सेटिंग्स" sub="Profile, security, roles and the audit trail." />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {tabs.map((t) => <button key={t} onClick={() => setTab(t)} style={{ fontFamily: sans, fontSize: 12.5, fontWeight: 700, padding: "8px 16px", borderRadius: 99, border: `1.5px solid ${C.forest}33`, background: tab === t ? C.forest : "#fff", color: tab === t ? "#fff" : C.forest, cursor: "pointer" }}>{t}</button>)}
      </div>
      {tab === "प्रोफ़ाइल" && (
        <PCard style={{ maxWidth: 560 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 20 }}>
            <Avatar name={user.label} size={54} />
            <div style={{ fontFamily: sans }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: C.ink }}>{user.label} (demo)</div>
              <div style={{ fontSize: 12.5, color: C.mute }}>{user.scope}</div>
            </div>
          </div>
          <Field label="Display name"><TextInput defaultValue={user.label} /></Field>
          <Field label="ईमेल"><TextInput defaultValue="demo@ukd.org" /></Field>
          <Btn onClick={() => toast("Profile saved (demo).")}>Save changes</Btn>
        </PCard>
      )}
      {tab === "सुरक्षा" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
          <PCard><PTitle>Password</PTitle><Field label="Current password"><TextInput type="password" /></Field><Field label="New password"><TextInput type="password" /></Field><Btn size="sm" onClick={() => toast("Password changed (demo).")}>Update password</Btn></PCard>
          <PCard><PTitle>Two-factor authentication</PTitle><p style={{ fontFamily: sans, fontSize: 13.5, color: "#4A554C", lineHeight: 1.6 }}>Protect the account with a one-time code at sign-in.</p><Btn size="sm" kind="ghost" onClick={() => toast("2FA enabled (demo).")}>Enable 2FA (demo)</Btn></PCard>
          <PCard><PTitle>Active sessions</PTitle>{[["This device — देहरादून", "Now"], ["Android app — पौड़ी", "2 d ago"]].map(([d, t]) => <div key={d} style={{ display: "flex", justifyContent: "space-between", fontFamily: sans, fontSize: 13.5, padding: "8px 0", borderBottom: `1px solid ${C.line}55` }}><span style={{ color: C.ink }}>{d}</span><span style={{ color: C.mute }}>{t}</span></div>)}<Btn size="sm" kind="danger" style={{ marginTop: 12 }} onClick={() => toast("Other sessions signed out (demo).")}>Sign out other sessions</Btn></PCard>
        </div>
      )}
      {tab === "Permissions" && (
        <PCard>
          <PTitle>Role permissions matrix (demo)</PTitle>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", fontFamily: sans, fontSize: 13, width: "100%" }}>
              <thead><tr><th style={{ textAlign: "left", padding: 10, color: C.mute, fontSize: 11.5 }}>Module</th>{["केंद्रीय प्रशासक", "ज़िला प्रशासक", "Block Coord.", "कार्यकर्ता"].map((r) => <th key={r} style={{ padding: 10, color: C.mute, fontSize: 11.5 }}>{r}</th>)}</tr></thead>
              <tbody>
                {[["Members", 1, 1, 1, 0], ["Finance", 1, 1, 0, 0], ["Notices — publish", 1, 0, 0, 0], ["Tasks — assign", 1, 1, 1, 0], ["Issues — close", 1, 1, 0, 0], ["Settings — roles", 1, 0, 0, 0]].map(([m, ...cols]) => (
                  <tr key={m} style={{ borderTop: `1px solid ${C.line}66` }}>
                    <td style={{ padding: 10, fontWeight: 600, color: C.ink }}>{m}</td>
                    {cols.map((c, i) => <td key={i} style={{ padding: 10, textAlign: "center", color: c ? "#4A6B1D" : C.red, fontWeight: 700 }}>{c ? "✓" : "—"}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PCard>
      )}
      {tab === "Audit Log" && (
        <DataTable
          columns={[{ key: "user", label: "User", strong: true }, { key: "action", label: "कार्रवाई" }, { key: "module", label: "Module" }, { key: "time", label: "Timestamp" }, { key: "status", label: "Status", render: (r) => <Badge tone={r.status}>{r.status}</Badge> }]}
          rows={SEED_AUDIT} searchKeys={["user", "action", "module"]} dense
          filters={[{ key: "module", label: "Module", options: [...new Set(SEED_AUDIT.map((a) => a.module))] }]}
        />
      )}
      {tab === "System" && (
        <PCard style={{ maxWidth: 560 }}>
          <PTitle>System (demo)</PTitle>
          {["Email notifications", "Weekly digest to leadership", "Auto-flag missing reports", "Public issue auto-routing"].map((s, i) => (
            <label key={s} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: sans, fontSize: 14, padding: "11px 0", borderBottom: `1px solid ${C.line}55`, cursor: "pointer" }}>
              <span style={{ color: C.ink }}>{s}</span><input type="checkbox" defaultChecked={i !== 1} onChange={() => toast("Setting updated (demo).")} />
            </label>
          ))}
        </PCard>
      )}
    </div>
  );
}

function CommandPalette({ open, onClose, nav }) {
  const store = useStore();
  const [q, setQ] = useState("");
  const ref = useRef(null);
  useEffect(() => { if (open) { setQ(""); setTimeout(() => ref.current && ref.current.focus(), 40); } }, [open]);
  if (!open) return null;
  const ql = q.toLowerCase();
  const hits = q.length < 2 ? PORTAL_NAV.slice(0, 6).map(([r, l]) => ({ t: "Go to", label: l, r })) : [
    ...PORTAL_NAV.filter(([r, l]) => l.toLowerCase().includes(ql)).map(([r, l]) => ({ t: "Module", label: l, r })),
    ...store.members.filter((m) => m.name.toLowerCase().includes(ql)).slice(0, 3).map((m) => ({ t: "Member", label: `${m.name} — ${m.district}`, r: `members/${m.id}` })),
    ...SEED_KARYAKARTAS.filter((k) => k.name.toLowerCase().includes(ql)).slice(0, 2).map((k) => ({ t: "कार्यकर्ता", label: k.name, r: `karyakartas/${k.id}` })),
    ...store.tasks.filter((t) => t.name.toLowerCase().includes(ql)).slice(0, 3).map((t) => ({ t: "Task", label: t.name, r: `tasks/${t.id}` })),
    ...store.issues.filter((i) => (i.id + i.category + i.title).toLowerCase().includes(ql)).slice(0, 3).map((i) => ({ t: "Issue", label: `${i.id} — ${i.category}`, r: `issues/${i.id}` })),
    ...SEED_EVENTS.filter((e) => e.title.toLowerCase().includes(ql)).slice(0, 2).map((e) => ({ t: "Event", label: e.title, r: `pevents/${e.id}` })),
    ...SEED_DOCS.filter((d) => d.title.toLowerCase().includes(ql)).slice(0, 2).map((d) => ({ t: "Document", label: d.title, r: "pdocs" })),
    ...store.notices.filter((n) => n.title.toLowerCase().includes(ql)).slice(0, 2).map((n) => ({ t: "Notice", label: n.title, r: "notices" })),
  ].slice(0, 10);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 240, background: "rgba(16,24,18,.62)", backdropFilter: "blur(5px)", display: "flex", justifyContent: "center", paddingTop: "10vh" }}>
      <div className="ukd-pop" onClick={(e) => e.stopPropagation()} style={{ width: "min(600px, 92vw)", alignSelf: "flex-start", background: C.paper, borderRadius: 16, overflow: "hidden", boxShadow: "0 30px 90px -20px rgba(0,0,0,.6)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 20px" }}>
          <span style={{ color: C.gold, fontSize: 17 }}>⌘</span>
          <input ref={ref} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search members, tasks, issues, units, documents…" style={{ flex: 1, border: "none", padding: "17px 0", fontFamily: sans, fontSize: 16, background: "transparent", color: C.ink }} />
          <span style={{ fontFamily: sans, fontSize: 11, color: C.mute, border: `1px solid ${C.line}`, borderRadius: 6, padding: "3px 7px" }}>ESC</span>
        </div>
        <div style={{ borderTop: `1px solid ${C.line}`, maxHeight: 360, overflowY: "auto" }}>
          {hits.length === 0 && <div style={{ padding: 24, fontFamily: sans, fontSize: 14, color: C.mute }}>No matches for “{q}”.</div>}
          {hits.map((h, i) => (
            <button key={i} onClick={() => { onClose(); nav(h.r); }} className="rowhover" style={{ display: "flex", width: "100%", gap: 14, alignItems: "center", padding: "12px 20px", background: "none", border: "none", cursor: "pointer", textAlign: "left", borderBottom: `1px solid ${C.line}55` }}>
              <span style={{ fontFamily: sans, fontSize: 10.5, fontWeight: 700, color: C.gold, width: 86, flexShrink: 0 }}>{h.t.toUpperCase()}</span>
              <span style={{ fontFamily: sans, fontSize: 14, color: C.ink }}>{h.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Portal({ toSite }) {
  const store = useStore();
  const [user, setUser] = useState(null);
  const [route, setRoute] = useState("dashboard");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const mobile = useIsMobile(1020);
  const nav = (r) => { setRoute(r); setDrawer(false); window.scrollTo({ top: 0, behavior: "instant" }); };
  useEffect(() => {
    const f = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPaletteOpen((v) => !v); } if (e.key === "Escape") setPaletteOpen(false); };
    window.addEventListener("keydown", f); return () => window.removeEventListener("keydown", f);
  }, []);
  if (!user) return <PortalLogin onLogin={(u) => { setUser(u); setRoute("dashboard"); }} toSite={toSite} />;

  const [base, sub] = [route.split("?")[0].split("/")[0], route.split("?")[0].split("/")[1]];
  const query = route.includes("?") ? route.split("?")[1] : "";
  const allowed = {
    karyakarta: ["dashboard", "tasks", "pevents", "notices", "ai", "notifications", "settings"],
    "unit-coordinator": ["dashboard", "organisation", "members", "karyakartas", "units", "tasks", "issues", "pevents", "pdocs", "notices", "reports", "ai", "notifications", "settings"],
  }[user.key];
  const visibleNav = PORTAL_NAV.filter(([r]) => !allowed || allowed.includes(r));
  const restricted = allowed && !allowed.includes(base) && base !== "notifications";

  let page;
  if (restricted) page = <EmptyState icon="🔒" title="No permission" sub={`The ${user.label} role does not have access to this module. Sign in as Central Admin to explore everything.`} cta="Back to dashboard" onCta={() => nav("dashboard")} />;
  else if (base === "dashboard") page = <CommandCentre nav={nav} user={user} />;
  else if (base === "organisation") page = <OrgModule nav={nav} />;
  else if (base === "members") page = <MembersModule nav={nav} id={sub} user={user} />;
  else if (base === "karyakartas") page = <KaryakartaModule nav={nav} id={sub} />;
  else if (base === "units") page = <UnitsModule nav={nav} query={query} />;
  else if (base === "tasks") page = <TasksModule nav={nav} id={sub} query={query} user={user} />;
  else if (base === "issues") page = <IssuesModule nav={nav} id={sub} query={query} />;
  else if (base === "pevents") page = <PEventsModule nav={nav} id={sub} />;
  else if (base === "pdocs") page = <PDocsModule />;
  else if (base === "notices") page = <NoticesModule user={user} />;
  else if (base === "reports") page = <ReportsModule />;
  else if (base === "finance") page = <FinanceModule />;
  else if (base === "analytics") page = <AnalyticsModule />;
  else if (base === "ai") page = <AIModule />;
  else if (base === "notifications") page = <NotificationsModule />;
  else if (base === "settings") page = <SettingsModule user={user} />;
  else page = <EmptyState icon="⚠" title="Something went wrong" sub="This screen could not be found. Return to the dashboard and try again." cta="Back to dashboard" onCta={() => nav("dashboard")} />;

  const Sidebar = (
    <div style={{ width: 240, background: `linear-gradient(180deg, ${C.forestDeep}, ${C.forestDark})`, color: C.ivory, display: "flex", flexDirection: "column", height: mobile ? "100%" : "100vh", position: mobile ? "relative" : "sticky", top: 0, flexShrink: 0 }}>
      <div style={{ padding: "20px 18px 14px", display: "flex", gap: 10, alignItems: "center", borderBottom: `1px solid ${C.ivory}14` }}>
        <Logo size={36} light />
        <div>
          <div style={{ fontFamily: serif, fontSize: 15.5, fontWeight: 600, lineHeight: 1.1 }}>UKD Command</div>
          <div style={{ fontFamily: sans, fontSize: 9.5, color: C.goldSoft, fontWeight: 700 }}>ONE ORGANISATION</div>
        </div>
      </div>
      <nav style={{ flex: 1, overflowY: "auto", padding: "12px 10px" }}>
        {visibleNav.map(([r, l, ic]) => {
          const active = base === r;
          const badge = r === "issues" ? store.issues.filter((i) => !["हल हुआ", "बंद"].includes(i.status)).length : r === "tasks" ? store.tasks.filter((t) => t.status === "विलंबित").length : null;
          return (
            <button key={r} onClick={() => nav(r)} style={{ display: "flex", width: "100%", gap: 11, alignItems: "center", padding: "10px 12px", borderRadius: 9, border: "none", background: active ? `${C.gold}26` : "transparent", color: active ? C.goldSoft : "#C6D1C1", fontFamily: sans, fontSize: 13.5, fontWeight: active ? 700 : 500, cursor: "pointer", marginBottom: 2, borderLeft: `3px solid ${active ? C.gold : "transparent"}` }}
              onMouseEnter={(e) => !active && (e.currentTarget.style.background = `${C.ivory}0d`)} onMouseLeave={(e) => !active && (e.currentTarget.style.background = "transparent")}>
              <span style={{ width: 18, textAlign: "center", opacity: .9 }}>{ic}</span>{l}
              {badge > 0 && <span style={{ marginLeft: "auto", background: r === "tasks" ? C.red : C.gold, color: "#fff", fontSize: 10.5, fontWeight: 700, borderRadius: 99, padding: "1px 7px" }}>{badge}</span>}
            </button>
          );
        })}
      </nav>
      <div style={{ padding: 14, borderTop: `1px solid ${C.ivory}14`, fontFamily: sans }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
          <Avatar name={user.label} size={34} dark />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.label}</div>
            <div style={{ fontSize: 10.5, color: "#9DAA97", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.scope}</div>
          </div>
        </div>
        <button onClick={() => setUser(null)} style={{ width: "100%", background: `${C.ivory}12`, border: "none", color: C.ivory, fontFamily: sans, fontSize: 12.5, fontWeight: 700, borderRadius: 8, padding: "8px 0", cursor: "pointer" }}>Sign out</button>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", background: "#F1EDDF", minHeight: "100vh" }}>
      {!mobile && Sidebar}
      {mobile && drawer && (
        <div style={{ position: "fixed", inset: 0, zIndex: 180 }} onClick={() => setDrawer(false)}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.5)" }} />
          <div className="ukd-pop" onClick={(e) => e.stopPropagation()} style={{ position: "absolute", left: 0, top: 0, bottom: 0 }}>{Sidebar}</div>
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ position: "sticky", top: 0, zIndex: 90, background: "#F1EDDFF0", backdropFilter: "blur(8px)", borderBottom: `1px solid ${C.line}`, padding: "12px 22px", display: "flex", alignItems: "center", gap: 12 }}>
          {mobile && <button onClick={() => setDrawer(true)} aria-label="Open menu" style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: C.ink }}>☰</button>}
          <button onClick={() => setPaletteOpen(true)} style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: `1px solid ${C.line}`, borderRadius: 9, padding: "8px 14px", fontFamily: sans, fontSize: 13, color: C.mute, cursor: "pointer", width: mobile ? "auto" : 320 }}>
            ⌕ Search everything… <span style={{ marginLeft: "auto", fontSize: 10.5, border: `1px solid ${C.line}`, borderRadius: 5, padding: "1px 6px" }}>⌘K</span>
          </button>
          <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <button onClick={() => setNotifOpen(!notifOpen)} aria-label="Notifications" style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 9, padding: "8px 12px", cursor: "pointer", fontSize: 15 }}>🔔<span style={{ position: "absolute", top: -4, right: -4, background: C.red, color: "#fff", fontFamily: sans, fontSize: 9.5, fontWeight: 700, borderRadius: 99, padding: "1px 5px" }}>4</span></button>
              {notifOpen && (
                <div className="ukd-pop" style={{ position: "absolute", right: 0, top: 46, width: 330, background: C.paper, border: `1px solid ${C.line}`, borderRadius: 14, boxShadow: "0 24px 60px -20px rgba(0,0,0,.35)", overflow: "hidden", zIndex: 95 }}>
                  {SEED_NOTIFS.slice(0, 4).map((n) => <div key={n.id} style={{ padding: "11px 16px", borderBottom: `1px solid ${C.line}66`, fontFamily: sans, fontSize: 12.5, color: C.ink }}>{n.text}<div style={{ fontSize: 11, color: C.mute, marginTop: 2 }}>{n.time}</div></div>)}
                  <button onClick={() => { setNotifOpen(false); nav("notifications"); }} style={{ width: "100%", background: "none", border: "none", padding: 12, fontFamily: sans, fontSize: 12.5, fontWeight: 700, color: C.forest, cursor: "pointer" }}>View all notifications</button>
                </div>
              )}
            </div>
            <button onClick={toSite} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 9, padding: "8px 14px", fontFamily: sans, fontSize: 12.5, fontWeight: 700, color: C.slate, cursor: "pointer" }}>Public site ↗</button>
          </div>
        </div>
        <main key={route} style={{ padding: mobile ? "20px 16px 60px" : "26px 28px 70px", flex: 1 }} onClick={() => notifOpen && setNotifOpen(false)}>{page}</main>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} nav={nav} />
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState("site");
  const [toasts, setToasts] = useState([]);
  const toast = (msg, kind = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  };
  const [issues, setIssues] = useState(SEED_ISSUES);
  const [members, setMembers] = useState(SEED_MEMBERS);
  const [tasks, setTasks] = useState(SEED_TASKS);
  const [notices, setNotices] = useState(SEED_NOTICES);
  const store = { issues, setIssues, members, setMembers, tasks, setTasks, notices, setNotices };
  return (
    <StoreCtx.Provider value={store}>
      <ToastCtx.Provider value={toast}>
        <GlobalStyle />
        <div style={{ fontFamily: sans }}>
          {mode === "site" ? <PublicSite toPortal={() => setMode("portal")} /> : <Portal toSite={() => setMode("site")} />}
        </div>
        <ToastHost toasts={toasts} />
      </ToastCtx.Provider>
    </StoreCtx.Provider>
  );
}
