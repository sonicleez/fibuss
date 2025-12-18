# Google Labs Flow Automator - Chrome Extension

Tiện ích mở rộng (extension) tự động hóa cho Google Labs Flow (Veo) - Công cụ tạo video AI.

## ✨ Tính năng

### 1. **Text to Video** (Từ văn bản sang video)
- Nhập nhiều prompts cùng lúc (mỗi dòng = 1 video)
- Tự động thêm vào hàng chờ
- Gửi lần lượt với khoảng thời gian tùy chỉnh

### 2. **Image to Video** (Tạo video từ khung hình)
- Upload hàng loạt ảnh start frame và end frame
- Tự động ghép cặp và tạo video
- Hỗ trợ thêm prompt cho mỗi video

### 3. **Character Sync** (Đồng bộ nhân vật)
- Lưu trữ nhân vật với 1-3 ảnh reference
- Tạo video với nhân vật nhất quán
- Gọi tên nhân vật trong prompt để tham chiếu

### 4. **Queue Management** (Quản lý hàng chờ)
- Thêm nhiều tasks vào hàng chờ
- Tự động xử lý lần lượt
- Cài đặt delay tùy chỉnh giữa các tasks

### 5. **Auto Download** (Tải xuống tự động)
- Theo dõi video đang xử lý
- Tự động tải xuống khi hoàn thành
- Có thể bật/tắt tính năng

---

## 📦 Cài đặt

### Bước 1: Tải về Extension
1. Download hoặc clone repository này
2. Giải nén nếu cần

### Bước 2: Load Extension vào Chrome/Edge

#### Chrome:
1. Mở Chrome và truy cập `chrome://extensions/`
2. Bật **Developer mode** (góc trên bên phải)
3. Click **Load unpacked**
4. Chọn thư mục chứa extension (thư mục có file `manifest.json`)

#### Edge:
1. Mở Edge và truy cập `edge://extensions/`
2. Bật **Developer mode**
3. Click **Load unpacked**
4. Chọn thư mục chứa extension

### Bước 3: Thêm Icons (Optional)
Tạo thư mục `icons/` trong thư mục extension và thêm các file icon:
- `icon16.png` (16x16px)
- `icon48.png` (48x48px)
- `icon128.png` (128x128px)

Hoặc bạn có thể xóa phần `icons` trong `manifest.json` nếu không muốn icon.

---

## 🚀 Sử dụng

### 1. Mở Google Labs Flow
Truy cập: https://labs.google/fx/vi/tools/flow

### 2. Mở Extension Popup
Click vào icon extension trên thanh công cụ

### 3. Chọn chế độ

#### **Text to Video**
1. Nhập prompts (mỗi dòng 1 video):
   ```
   A sunset over the ocean
   A cat playing in the garden
   A car driving through the mountains
   ```
2. Click **"➕ Thêm vào hàng chờ"**
3. Chuyển sang tab **Settings** và click **"▶️ Bắt đầu xử lý hàng chờ"**

#### **Image to Video**
1. Chọn ảnh Start Frames (có thể chọn nhiều)
2. Chọn ảnh End Frames (cùng số lượng với start frames)
3. Nhập prompt (optional)
4. Click **"➕ Thêm vào hàng chờ"**
5. Xử lý tương tự Text to Video

#### **Character Sync**
1. **Tạo nhân vật:**
   - Nhập tên nhân vật (vd: "Sarah")
   - Chọn 1-3 ảnh reference
   - Click **"💾 Lưu nhân vật"**

2. **Tạo video với nhân vật:**
   - Nhập hành động (mỗi dòng 1 video):
     ```
     Sarah walking in the park
     Sarah eating ice cream
     Sarah dancing
     ```
   - Click **"➕ Thêm vào hàng chờ"**

#### **Settings**
- **Delay giữa các task:** Thời gian chờ giữa mỗi lần gửi (mặc định 5000ms = 5 giây)
- **Tự động tải xuống:** Bật/tắt tính năng auto-download
- **Queue count:** Số lượng tasks đang chờ
- **Status log:** Nhật ký hoạt động của extension

---

## 📁 Cấu trúc Extension

```
flow-automator/
├── manifest.json          # Cấu hình extension
├── background.js          # Service worker
├── content-script.js      # Script chạy trên trang Flow
├── popup.html            # Giao diện popup
├── popup.js              # Logic popup
├── xpath_reference.md    # Tài liệu XPaths
├── README.md             # File này
└── icons/                # Icons (optional)
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## 🔧 XPaths quan trọng

### Prompt Input
```xpath
//*[@id="PINHOLE_TEXT_AREA_ELEMENT_ID"]
```

### Create Button
```xpath
//button[.//i[text()="arrow_forward"]]
```

### Mode Dropdown
```xpath
//button[@role="combobox"]
```

### Start/End Frame Add Buttons
```xpath
(//button[.//i[text()="add"]])[1]  <!-- Start Frame -->
(//button[.//i[text()="add"]])[2]  <!-- End Frame -->
```

### File Input (Image Upload)
```xpath
//input[@type="file"]
```

### Download Button
```xpath
//button[.//span[text()="Tải xuống"]]
```

**Xem chi tiết:** [xpath_reference.md](xpath_reference.md)

---

## 🐛 Troubleshooting

### Extension không hoạt động
1. Kiểm tra xem bạn đã mở đúng trang Flow chưa
2. Reload extension: `chrome://extensions/` → Click reload icon
3. Reload trang Flow
4. Mở Console (F12) để xem error logs

### Không tải được ảnh lên
1. Đảm bảo ảnh đúng định dạng: `.png`, `.jpg`, `.jpeg`, `.webp`, `.heic`, `.avif`
2. Thử upload từng ảnh một để test
3. Kiểm tra file input có xuất hiện trong DOM không

### Video không tự động tải xuống
1. Kiểm tra tính năng "Auto download" đã bật chưa
2. Đảm bảo trình duyệt cho phép download tự động từ extension
3. Kiểm tra Console để xem có error không

### Hàng chờ không chạy
1. Đảm bảo đã click **"▶️ Bắt đầu xử lý hàng chờ"**
2. Kiểm tra Status log để xem tiến trình
3. Reload page và thử lại

---

## ⚙️ Development Notes

### Cập nhật XPaths
Google Labs có thể cập nhật giao diện, dẫn đến XPaths thay đổi. Để cập nhật:

1. Mở trang Flow, mở DevTools (F12)
2. Dùng Inspect Element để tìm element mới
3. Copy XPath: Click phải element → Copy → Copy XPath
4. Cập nhật trong `content-script.js`

### Xử lý Dynamic Classes
Google Labs sử dụng Styled Components với class động (`sc-xxxxx-x`). 

**Khuyến nghị:**
- Ưu tiên XPath theo `@role`, `@id`, text content
- Tránh hard-code class names

### Mutation Observer
File input chỉ xuất hiện sau khi click nút "+". Extension sử dụng `MutationObserver` để theo dõi:

```javascript
const observer = new MutationObserver(() => {
  const fileInput = getElementByXPath('//input[@type="file"]');
  if (fileInput) {
    // Process file upload
  }
});
```

---

## 📝 To-Do / Future Features

- [ ] Hỗ trợ lưu prompts thường dùng
- [ ] Export/Import characters và queue
- [ ] Batch rename downloaded videos
- [ ] Support cho aspect ratio selection
- [ ] Model selection automation (Veo 3.1, etc.)
- [ ] Video preview trước khi download
- [ ] Statistics dashboard

---

## 🤝 Contributing

Contributions are welcome! Vui lòng:
1. Fork repository
2. Tạo feature branch
3. Commit changes
4. Tạo Pull Request

---

## 📄 License

MIT License - Free to use and modify

---

## ⚠️ Disclaimer

Extension này được tạo cho mục đích nghiên cứu và tự động hóa công việc cá nhân. 
- Không được sử dụng cho mục đích spam hoặc lạm dụng dịch vụ Google Labs
- Tuân thủ Terms of Service của Google Labs
- Sử dụng với delay hợp lý để tránh overload server

---

## 📧 Contact

Nếu có vấn đề hoặc câu hỏi, vui lòng tạo Issue trên GitHub repository.

**Chúc bạn sử dụng thành công! 🎬🚀**
