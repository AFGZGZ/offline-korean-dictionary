const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const Database = require("better-sqlite3");
const { disassemble } = require("es-hangul");

let db;

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 700,
    icon: path.join(__dirname, "../assets/icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
    },
  });

  win.setMenu(null);

  const isDev = !app.isPackaged;

  if (isDev) {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(app.getAppPath(), "dist/index.html"));
  }
}

app.whenReady().then(() => {
  const dbPath = app.isPackaged
    ? path.join(process.resourcesPath, "app.asar.unpacked/db/dict.db")
    : path.join(process.cwd(), "db/dict.db");

  db = new Database(dbPath);

  function getChoseong(str) {
    const result = [];

    for (const char of str) {
      const dis = disassemble(char);
      const arr = Array.isArray(dis) ? dis : [...dis];

      const choseong = arr.find((c) => /[ㄱ-ㅎ]/.test(c));
      if (choseong) result.push(choseong);
    }

    return result.join("");
  }

  ipcMain.handle("search", (_, query) => {
    if (!query) return [];

    const stmt = db.prepare(`SELECT * FROM dictionary`);
    const all = stmt.all();

    const results = all
      .map((item) => {
        let score = 0;

        const word = item.korean || "";
        const en = item.translated_word || "";
        const def = item.translated_definition || "";

        const choseong = getChoseong(word);

        //Ranking logic

        if (word === query) score += 100; //exact match
        if (word.startsWith(query)) score += 50; //starts with
        if (word.includes(query)) score += 30; //contains

        if (choseong.startsWith(query)) score += 40; //초성 match

        if (en.startsWith(query)) score += 20;
        if (def.includes(query)) score += 10;

        return { ...item, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);

    return results;
  });

  ipcMain.handle("getWord", (_, id) => {
    const stmt = db.prepare(`
    SELECT *
    FROM dictionary
    WHERE id = ?
  `);

    return stmt.get(id);
  });

  createWindow();
});
