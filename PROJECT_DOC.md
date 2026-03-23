# NumClash.com — Tài liệu mô tả dự án (Phiên bản hiện tại)

> **Cập nhật**: 23/03/2026  
> **Trạng thái**: Đang phát triển (Development)

---

## 1. Tổng quan

| Mục | Chi tiết |
|-----|----------|
| **Tên game** | NumClash.com |
| **Thể loại** | Multiplayer Social Strategy Game (Web-based) |
| **Cơ chế cốt lõi** | Đấu trí chọn số dựa trên tổng mục tiêu (Target) |
| **Ngôn ngữ** | Song ngữ: Tiếng Việt (mặc định) & English |
| **Nền tảng** | Web — responsive trên cả điện thoại và máy tính |

### Công nghệ sử dụng

| Thành phần | Công nghệ |
|------------|-----------|
| **Server** | Node.js + Express + Socket.IO |
| **Client** | React (Vite) + Tailwind CSS v4 |
| **Animation** | Framer Motion |
| **Icons** | Lucide React |
| **Fonts** | Fredoka, Nunito (Google Fonts) |

---

## 2. Cấu trúc thư mục

```
NumClash.com/
├── server/
│   ├── index.js            # Express + Socket.IO server (port 3001)
│   ├── socketHandlers.js   # Xử lý tất cả socket events
│   └── gameManager.js      # Game state & logic
├── client/
│   ├── src/
│   │   ├── App.jsx         # Router chính, quản lý state toàn cục
│   │   ├── socket.js       # Socket.IO client instance
│   │   ├── i18n.jsx        # Hệ thống đa ngôn ngữ (VI/EN)
│   │   ├── index.css       # Theme & styling (Warm Cartoon Theme)
│   │   └── pages/
│   │       ├── HomePage.jsx     # Trang chủ: tạo/vào phòng, luật chơi
│   │       ├── LobbyPage.jsx    # Sảnh chờ: danh sách người chơi, cài đặt
│   │       ├── GamePage.jsx     # Gameplay: chọn số, reveal, scoreboard
│   │       └── ResultsPage.jsx  # Kết quả chung kết: podium, top 4+
│   └── vite.config.js
├── package.json
└── spec.md                 # Spec ban đầu (lỗi thời)
```

---

## 3. Hệ thống Phòng & Kết nối

### Tạo phòng
- Host nhập **Nickname** → bấm **Tạo Phòng**
- Hệ thống tạo mã phòng **4 ký tự** (A-Z, 2-9, bỏ chữ dễ nhầm: I, O, 0, 1)
- Host tự động vào Lobby

### Vào phòng
- Người chơi nhập **Nickname** + **Mã Phòng** → bấm **Tham gia**
- Kiểm tra: phòng tồn tại, chưa bắt đầu, chưa đầy, nickname không trùng

### Giới hạn
- **Tối thiểu**: 1 người (dev mode — thay thành 4 khi deploy)
- **Tối đa**: 8 người

### Rời phòng
- Nút **rời phòng** (icon LogOut) ở **góc trên trái** trong Lobby
- Nút **Rời Phòng** cũng hiện trên **trang kết quả** cho non-host
- Khi rời: socket leave room, player bị xóa, room cập nhật cho người còn lại
- Nếu host rời → tự động chuyển host cho người kế tiếp
- Nếu phòng trống → tự xóa phòng

---

## 4. Hệ thống Ready

| Vai trò | Hành vi |
|---------|---------|
| **Host** | Luôn sẵn sàng — không cần bấm Ready. Chỉ host có nút **Bắt Đầu** |
| **Player** | Bấm nút **Sẵn sàng?** để toggle trạng thái |

### Giao diện

- **Chưa sẵn sàng**: Nút hồng "SẴN SÀNG?" + chấm 🔴 đỏ + text "Bấm sẵn sàng để Host bắt đầu"
- **Đã sẵn sàng**: Nút xanh "SẴN SÀNG!" + chấm 🟢 xanh + text "Đang đợi Host bắt đầu..."
- Host chỉ bắt đầu được khi **tất cả** player đã ready

---

## 5. Cài đặt số vòng chơi

Host chọn số vòng trong Lobby:

| Tùy chọn | 1 | 4 | 8 (mặc định) | 18 | 36 |
|-----------|---|---|---------------|----|----|

---

## 6. Quy tắc trò chơi

### Mỗi vòng (Round)

1. **Số Mục Tiêu (Target)**: Random, tính theo số người chơi
   - `minTarget = 16`
   - `maxTarget = max(26, playerCount × 8)`

2. **Giai đoạn Chọn Số (Picking)**: 36 giây
   - Mỗi người chọn **1 số nguyên ≥ 0**
   - Nếu hết giờ chưa chọn → tự động gửi **0**
   - Hiển thị trạng thái (Đã chọn / Đang suy nghĩ) cho các player khác

3. **Giai đoạn Công bố (Reveal)**:
   - Công bố số từng người một (hiệu ứng kịch tính)
   - Thanh **Progress Bar** chạy từ 0 → Tổng:
     - 🟢 **Tổng ≤ Target** = AN TOÀN → Số **LỚN** thắng (sắp xếp Cao → Thấp)
     - 🔴 **Tổng > Target** = QUÁ TẢI → Số **NHỎ** thắng (sắp xếp Thấp → Cao)

4. **Xử lý trùng số**: Cùng rank → cùng điểm. Rank kế tiếp bị nhảy bậc.

---

## 7. Hệ thống Điểm số

Chỉ **Top 3** ghi điểm mỗi vòng:

| Hạng | Điểm |
|------|------|
| 🥇 Top 1 | **70** |
| 🥈 Top 2 | **36** |
| 🥉 Top 3 | **18** |
| Còn lại | 0 |

---

## 8. Luồng giao diện (Screens)

### 8.1. Trang chủ (HomePage)
- Nhập Nickname
- **Tạo Phòng** hoặc **Vào Phòng** (nhập mã)
- Nút **Luật Chơi** → mở modal hướng dẫn (4 bước, ẩn scrollbar)
- Nút đổi ngôn ngữ VI ↔ EN ở góc trên phải

### 8.2. Sảnh Chờ (LobbyPage)
- Hiện **Mã Phòng** lớn + nút copy
- Danh sách người chơi (tối đa 8 slot, slot trống hiện "Đang đợi...")
- Tag **HOST** cho host, icon ✅/⭕ cho trạng thái ready
- Host: chọn số vòng + nút **Bắt Đầu Trận Đấu**
- Player: nút **Sẵn sàng** + hint text
- Nút **rời phòng** góc trên trái

### 8.3. Gameplay (GamePage)
3 giai đoạn trong cùng trang:

| Giai đoạn | Nội dung |
|-----------|----------|
| **Picking** | Badge "Vòng X", Target nổi bật, bàn phím số, countdown 36s, trạng thái player |
| **Reveal** | Badge "Vòng X", reveal từng số, progress bar, text luật (Số LỚN/NHỎ thắng) |
| **Scoreboard** | Tiêu đề "TỔNG ĐIỂM", leaderboard, điểm vòng, nút "Vòng Tiếp Theo" (host) |

### 8.4. Kết Quả (ResultsPage)
- Tiêu đề **"KẾT QUẢ CHUNG KẾT"**
- **Podium** cho Top 1-3 (icon 🏆👑🥈🥉, gradient màu, chiều cao khác nhau)
- **Confetti** animation
- Khung **Top 4+** (nếu có): text #4, #5... + điểm
- Badge **chúc mừng** cho người thắng (sparkle icon)
- Host: nút **Chơi Lại** → quay về Lobby
- Player: text "Đang đợi Host..." + nút **Rời Phòng**

---

## 9. Thiết kế giao diện

### Theme: Warm Cartoon
- **Nền**: Cream ấm (#faf5ee) + pattern chấm nhẹ
- **Card**: Viền tròn, border #e8e0d4, shadow 3D nhẹ
- **Nút (pill-btn)**: Bo tròn full, gradient, shadow đáy
- **Font**: Fredoka (heading), Nunito (body)

### Responsive
- **Mobile (< 640px)**:
  - `.cartoon-card`, `.pill-btn`, `.max-w-md` → `max-width: calc(100% - 32px)` + margin auto
  - Padding container: `px-6` (24px)
- **Desktop**: `max-w-md` (448px) cho card chính

### Màu sắc chính

| Biến | Hex | Dùng cho |
|------|-----|----------|
| `--color-primary` | #2bb5a0 | Nút chính, text tích cực |
| `--color-secondary` | #ff9a5c | Accent cam |
| `--color-accent-red` | #e54d4d | Quá tải, cảnh báo |
| `--color-accent-blue` | #5b9bd5 | Highlight player hiện tại |
| `--color-accent-yellow` | #ffd166 | Badge Top 1 |

---

## 10. Socket Events

### Client → Server

| Event | Data | Mô tả |
|-------|------|-------|
| `create-room` | `{ nickname }` | Tạo phòng mới |
| `join-room` | `{ roomCode, nickname }` | Vào phòng |
| `set-rounds` | `{ roomCode, rounds }` | Host đặt số vòng |
| `toggle-ready` | `{ roomCode }` | Toggle trạng thái sẵn sàng |
| `start-game` | `{ roomCode }` | Host bắt đầu game |
| `submit-number` | `{ roomCode, number }` | Gửi số đã chọn |
| `next-round` | `{ roomCode }` | Host sang vòng tiếp |
| `play-again` | `{ roomCode }` | Host chơi lại |
| `leave-room` | _(none)_ | Rời phòng chủ động |

### Server → Client

| Event | Data | Mô tả |
|-------|------|-------|
| `room-updated` | `roomInfo` | Cập nhật thông tin phòng |
| `round-start` | `{ round, totalRounds, target }` | Bắt đầu vòng mới |
| `player-status-updated` | `[players]` | Trạng thái chọn số |
| `round-reveal` | `{ results, target, totalSum, isSafe, leaderboard }` | Kết quả vòng |
| `game-finished` | `{ finalScores }` | Trận đấu kết thúc |
| `back-to-lobby` | `roomInfo` | Quay về lobby (play again) |
| `left-room` | _(none)_ | Xác nhận đã rời phòng |
| `timer-tick` | `{ timeLeft }` | Đếm ngược thời gian |

---

## 11. Chạy dự án

```bash
# Cài dependencies (lần đầu)
npm install
cd client && npm install && cd ..

# Chạy server (port 3001)
node server/index.js

# Chạy client (port 5173)
cd client && npx vite --port 5173
```

Truy cập: `http://localhost:5173`

---

## 12. Ghi chú phát triển

- [ ] Đổi giới hạn tối thiểu từ 1 → 4 người khi deploy production
- [ ] Thêm xử lý reconnect khi mất kết nối giữa chừng
- [ ] Cân nhắc thêm chat trong phòng
- [ ] Thêm hiệu ứng âm thanh (SFX)
- [ ] Deploy lên hosting (Render, Railway, Vercel...)
