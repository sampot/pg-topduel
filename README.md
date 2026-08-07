# pg-topduel

瀏覽器**陀螺對戰**：圓形競技場、蓄力發射、碰撞消旋、三戰兩勝。純前端；**mobile-first** 觸控蓄力。

也可當作 [Playgrounds（遊樂場）](https://play.samkuo.me/) 的 **SAM**（`index.html` 入口）。

## 一鍵開 SAM 小

**[一鍵開 SAM 小](https://play.samkuo.me/?open=sampot/pg-topduel&name=%E9%99%80%E8%9E%BA%E5%B0%8D%E6%88%B0&fresh=1)**

```
https://play.samkuo.me/?open=sampot/pg-topduel&name=陀螺對戰&fresh=1
```

同源會重用本機已匯入的沙盒；`fresh=1` 強制新建。

## 試玩（本機）

```bash
npx --yes serve .
# 或
python3 -m http.server 8080
```

點一下頁面後音效才會出聲。

## 操作

| 操作 | 說明 |
| --- | --- |
| 競技場按住 | 蓄力（拖曳可調方向） |
| 放開 | 發射陀螺 |
| **開局** | 開始或重開三戰兩勝 |
| **音效** | 開關 Web Audio 音效 |

轉速歸零或滑出競技場即判負該局；先贏兩局者勝。

## 檔案

| 檔案 | 說明 |
| --- | --- |
| `index.html` | 結構 |
| `styles.css` | 手機優先／深淺色 |
| `app.js` | 輸入、HUD、主迴圈 |
| `game.js` | 物理、AI、勝敗 |
| `audio.js` | 蓄力／碰撞 Web Audio |
| `functions.js` | Playgrounds 可選 stub |

## 紀錄

本機 `localStorage` 鍵 **`pg-topduel-best`** 保存最佳連勝場數。

## License

MIT
