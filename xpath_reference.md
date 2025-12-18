# Google Labs Flow - XPath Reference for Automation Extension

## Tổng quan
Tài liệu này cung cấp tất cả XPaths và thông tin cần thiết để xây dựng extension tự động hóa cho Google Labs Flow (Veo).

---

## 1. Chuyển đổi chế độ (Mode Switching)

### Nút dropdown chế độ
```xpath
//button[@role="combobox"]
```
**Mô tả:** Nút mở menu chọn chế độ tạo video

### Chế độ "Từ văn bản sang video" (Text to Video)
```xpath
//div[@role="option" and contains(., "Từ văn bản sang video")]
```

### Chế độ "Tạo video từ các khung hình" (Image to Video)
```xpath
//div[@role="option" and contains(., "Tạo video từ các khung hình")]
```

### Chế độ "Tạo hình ảnh" (Image Generation)
```xpath
//div[@role="option" and contains(., "Tạo hình ảnh")]
```

---

## 2. Text to Video (Từ văn bản sang video)

### Ô nhập prompt
```xpath
//*[@id="PINHOLE_TEXT_AREA_ELEMENT_ID"]
```
**Element Type:** `<textarea>`
**Mô tả:** Ô nhập văn bản để mô tả video cần tạo

### Nút "Tạo" (Create)
```xpath
//button[.//i[text()="arrow_forward"]]
```
**Alternative:**
```xpath
//button[contains(., "Tạo")]
```
**Mô tả:** Nút bắt đầu quá trình tạo video

---

## 3. Image to Video (Tạo video từ các khung hình)

### Nút thêm Start Frame (Khung hình bắt đầu)
```xpath
(//button[.//i[text()="add"]])[1]
```
**Alternative (more specific):**
```xpath
(//div[contains(@class, "sc-77366d4e-0")]//button[contains(., "add")])[1]
```
**Mô tả:** Nút "+" để thêm ảnh khung hình đầu tiên

### Nút thêm End Frame (Khung hình kết thúc)
```xpath
(//button[.//i[text()="add"]])[2]
```
**Alternative (more specific):**
```xpath
(//div[contains(@class, "sc-77366d4e-0")]//button[contains(., "add")])[2]
```
**Mô tả:** Nút "+" để thêm ảnh khung hình cuối cùng

### Nút đảo ngược khung hình (Swap)
```xpath
//button[.//i[text()="swap_horiz"]]
```
**Mô tả:** Nút hoán đổi vị trí start/end frame

### Nút "Tải lên" trong Media Picker
```xpath
//button[contains(@class, "sc-fbea20b2-0") and contains(., "Tải lên")]
```
**Mô tả:** Nút "Tải lên" xuất hiện trong overlay picker khi bấm nút "+"

### File Input Element (Hidden)
```xpath
//input[@type="file"]
```
**Attributes:**
- `accept=".png,.jpg,.jpeg,.webp,.heic,.avif"`
- Class: `sc-8770743f-0 kyRuKy` (có thể thay đổi)

**⚠️ Lưu ý quan trọng:** 
- Element này chỉ xuất hiện trong DOM sau khi click nút "+" (Start/End Frame)
- Sử dụng `MutationObserver` để theo dõi khi element xuất hiện
- File input nằm trong Radix UI portal (`div[id^="radix-"]`)

---

## 4. Character Sync / Multi-component Video (Tạo video từ nhiều thành phần)

### Quy trình tự động hóa
Tính năng này được thực hiện qua chế độ **"Tạo hình ảnh"** hoặc **"Tạo video từ khung hình"** với workflow:

1. **Upload 1-3 ảnh cho mỗi nhân vật:**
   - Click nút "+" để mở media picker
   - Upload ảnh qua file input: `//input[@type="file"]`
   - Có thể upload hoặc chọn từ thư viện
   
2. **Đặt tên nhân vật:**
   - Tên nhân vật được nhập vào prompt
   - Ví dụ: "Character name: Sarah, wearing blue dress"

3. **Gửi prompt với tên nhân vật:**
   - Prompt gọi tên: "Sarah walking in the park"
   - Extension cần quản lý mapping giữa tên nhân vật và ảnh reference

### Cấu trúc dữ liệu đề xuất cho Extension
```javascript
{
  characters: [
    {
      name: "Sarah",
      images: ["blob:...", "blob:...", "blob:..."], // 1-3 images
      referenceImageFiles: [File, File, File]
    }
  ],
  prompts: [
    {
      text: "Sarah walking in the park",
      characterReferences: ["Sarah"],
      startFrame: null, // or image blob
      endFrame: null
    }
  ]
}
```

---

## 5. Cài đặt & Settings

### Nút mở Settings
```xpath
//button[.//i[text()="tune"]]
```
**Mô tả:** Nút mở panel cài đặt (aspect ratio, model selection)

### Chọn Aspect Ratio (ví dụ)
```xpath
//div[@role="option" and contains(., "16:9")]
```

### Chọn Model (ví dụ: Veo 3.1)
```xpath
//div[@role="option" and contains(., "Veo 3.1")]
```

---

## 6. Download Video (Tải xuống tự động)

### Nút "Tải xuống" trong video card
```xpath
//button[.//span[text()="Tải xuống"]]
```
**Alternative:**
```xpath
//div[text()="Tải xuống"]
```

### Nút "Tải xuống" của video mới nhất (đầu tiên trong list)
```xpath
(//button[.//span[text()="Tải xuống"]])[1]
```

### ⚠️ Kiểm tra trạng thái video hoàn thành
- Video đang xử lý: hiển thị phần trăm (%, text node)
- Video hoàn thành: nút "Tải xuống" xuất hiện + thumbnail/play button

**Cách kiểm tra:**
```javascript
// Check if video is complete (download button exists and no percentage)
const isComplete = !cardElement.textContent.includes('%') && 
                   cardElement.querySelector('button:has(span:contains("Tải xuống"))');
```

---

## 7. Quản lý Hàng chờ (Queue Management)

### Chiến lược thực hiện
Extension cần tự quản lý queue vì Flow UI không có hàng chờ tích hợp:

1. **Lưu danh sách prompts** trong extension storage
2. **Gửi từng prompt** với khoảng cách thời gian:
   ```javascript
   async function processQueue(prompts, delayMs = 5000) {
     for (const prompt of prompts) {
       await fillPrompt(prompt);
       await clickCreate();
       await sleep(delayMs);
     }
   }
   ```

3. **Theo dõi trạng thái:** 
   - Đếm số video cards hiện có
   - Monitor sự xuất hiện của nút "Tải xuống" mới
   - Sử dụng `MutationObserver` trên video list container

### Selector cho Video Container
```xpath
//div[contains(@class, "video-list") or contains(@class, "output")]
```
*(Cần verify chính xác class name)*

---

## 8. Tạo dự án mới (New Project)

### Nút "Dự án mới" trên trang chủ
```xpath
//button[.//span[text()="Dự án mới"]]
```
**URL:** `https://labs.google/fx/vi/tools/flow`

---

## 9. Best Practices cho Extension Development

### 1. Xử lý Dynamic Classes
- Google Labs sử dụng Styled Components với class động (`sc-xxxxx`)
- **Ưu tiên:** XPath dựa trên `@role`, `@id`, text content
- **Tránh:** Hard-code class names

### 2. Mutation Observer cho File Input
```javascript
const observer = new MutationObserver((mutations) => {
  const fileInput = document.querySelector('input[type="file"]');
  if (fileInput) {
    fileInput.files = dataTransfer.files; // Your files
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});
```

### 3. Trigger Events Properly
```javascript
// For textarea
const textarea = document.getElementById('PINHOLE_TEXT_AREA_ELEMENT_ID');
textarea.value = 'Your prompt';
textarea.dispatchEvent(new Event('input', { bubbles: true }));
textarea.dispatchEvent(new Event('change', { bubbles: true }));

// For button
const createBtn = document.querySelector('button[contains(., "Tạo")]');
createBtn.click();
```

### 4. Auto-download Implementation
```javascript
// Wait for video completion
function waitForDownloadButton() {
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      const downloadBtn = document.querySelector('button:has(span:contains("Tải xuống"))');
      const hasPercentage = document.body.textContent.includes('%');
      
      if (downloadBtn && !hasPercentage) {
        clearInterval(checkInterval);
        resolve(downloadBtn);
      }
    }, 2000); // Check every 2 seconds
  });
}

const btn = await waitForDownloadButton();
btn.click();
```

---

## 10. Recommended Extension Architecture

### Popup UI
```
┌─────────────────────────────┐
│  Google Labs Flow Automator │
├─────────────────────────────┤
│ Mode:                       │
│ ○ Text to Video             │
│ ○ Image to Video            │
│ ○ Character Sync            │
├─────────────────────────────┤
│ [Character Manager]         │
│  + Add Character (1-3 imgs) │
│  - Sarah (3 images) [Edit]  │
├─────────────────────────────┤
│ [Prompt Queue]              │
│ Prompt 1: [____________]    │
│ Prompt 2: [____________]    │
│ [+ Add Prompt]              │
├─────────────────────────────┤
│ Delay between: [5000] ms    │
│ [□] Auto-download videos    │
├─────────────────────────────┤
│      [Start Processing]     │
└─────────────────────────────┘
```

### Content Script Responsibilities
1. Inject XPath helpers
2. Monitor page state
3. Execute automation commands
4. Handle file uploads
5. Trigger downloads
6. Report progress back to popup

### Background Script Responsibilities
1. Manage queue state
2. Download video files
3. Store settings
4. Coordinate between tabs

---

## 11. Tóm tắt XPaths quan trọng

| Chức năng | XPath | Element Type |
|-----------|-------|--------------|
| Prompt Input | `//*[@id="PINHOLE_TEXT_AREA_ELEMENT_ID"]` | textarea |
| Create Button | `//button[.//i[text()="arrow_forward"]]` | button |
| Mode Dropdown | `//button[@role="combobox"]` | button |
| Start Frame Add | `(//button[.//i[text()="add"]])[1]` | button |
| End Frame Add | `(//button[.//i[text()="add"]])[2]` | button |
| File Input | `//input[@type="file"]` | input |
| Upload Button | `//button[contains(., "Tải lên")]` | button |
| Download Button | `//button[.//span[text()="Tải xuống"]]` | button |
| Settings Button | `//button[.//i[text()="tune"]]` | button |

---

## 12. Testing Checklist

- [ ] Text to Video: nhập prompt → tạo → tải xuống
- [ ] Image to Video: upload start → upload end → tạo → tải xuống
- [ ] Character Sync: upload 3 ảnh nhân vật → đặt tên → tham chiếu trong prompt
- [ ] Queue: thêm 5 prompts → tự động gửi lần lượt với delay
- [ ] Auto-download: theo dõi hoàn thành → tự động download
- [ ] Batch upload: upload nhiều ảnh cùng lúc cho nhân vật

---

## Liên hệ & Support
- Google Labs Flow URL: https://labs.google/fx/vi/tools/flow
- Project URL format: `https://labs.google/fx/vi/tools/flow/project/{PROJECT_ID}`

**Lưu ý:** Trang web có thể cập nhật, cần kiểm tra lại XPaths định kỳ.
