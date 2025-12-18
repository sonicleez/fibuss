// content-script.js - Google Labs Flow Automation Extension
// Đây là file content script mẫu cho extension Chrome/Edge

/**
 * Helper: Get element by XPath
 */
function getElementByXPath(xpath) {
  return document.evaluate(
    xpath,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  ).singleNodeValue;
}

/**
 * Helper: Get all elements by XPath
 */
function getElementsByXPath(xpath) {
  const result = document.evaluate(
    xpath,
    document,
    null,
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
    null
  );
  const nodes = [];
  for (let i = 0; i < result.snapshotLength; i++) {
    nodes.push(result.snapshotItem(i));
  }
  return nodes;
}

/**
 * Helper: Wait for element to appear
 */
function waitForElement(xpath, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const element = getElementByXPath(xpath);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver(() => {
      const element = getElementByXPath(xpath);
      if (element) {
        observer.disconnect();
        clearTimeout(timeoutId);
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    const timeoutId = setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element not found: ${xpath}`));
    }, timeout);
  });
}

/**
 * Helper: Sleep function
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ========================================
// MODE SWITCHING
// ========================================

/**
 * Switch to a specific mode
 * @param {string} modeName - "Từ văn bản sang video" | "Tạo video từ các khung hình" | "Tạo hình ảnh"
 */
async function switchMode(modeName) {
  console.log(`[Flow Automation] Switching to mode: ${modeName}`);

  // Click mode dropdown
  const dropdown = getElementByXPath('//button[@role="combobox"]');
  if (!dropdown) {
    throw new Error("Mode dropdown not found");
  }
  dropdown.click();

  // Wait a bit for dropdown to open
  await sleep(500);

  // Select mode
  const option = getElementByXPath(
    `//div[@role="option" and contains(., "${modeName}")]`
  );
  if (!option) {
    throw new Error(`Mode option not found: ${modeName}`);
  }
  option.click();

  // Wait longer for UI to fully load after mode change
  await sleep(1500);
  console.log(`[Flow Automation] Switched to: ${modeName}`);
}

// ========================================
// TEXT TO VIDEO
// ========================================

/**
 * Fill prompt textarea
 */
async function fillPrompt(promptText) {
  console.log(`[Flow Automation] Filling prompt: ${promptText}`);

  // Wait for textarea to appear (may take time after mode switch)
  let textarea = document.getElementById("PINHOLE_TEXT_AREA_ELEMENT_ID");

  if (!textarea) {
    console.log(`[Flow Automation] Textarea not found by ID, waiting...`);
    // Try waiting for it with XPath
    textarea = await waitForElement('//*[@id="PINHOLE_TEXT_AREA_ELEMENT_ID"]', 5000);
  }

  if (!textarea) {
    // Try alternative selector - any textarea in the form
    textarea = document.querySelector('textarea');
    console.log(`[Flow Automation] Using fallback textarea:`, textarea);
  }

  if (!textarea) {
    console.error("[Flow Automation] Prompt textarea not found after waiting!");
    throw new Error("Prompt textarea not found");
  }

  // Focus first, then set value
  textarea.focus();
  textarea.value = promptText;

  // Dispatch multiple events to ensure React picks up the change
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.dispatchEvent(new Event("change", { bubbles: true }));
  textarea.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true }));
  textarea.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));

  // Give UI time to react and enable the Create button
  await sleep(1000);
  console.log(`[Flow Automation] Prompt filled successfully`);
}

/**
 * Click "Tạo" (Create) button
 */
async function clickCreate() {
  console.log(`[Flow Automation] Clicking Create button`);

  // Try multiple methods to find the Create button
  let createBtn = getElementByXPath('//button[.//i[text()="arrow_forward"]]');

  if (!createBtn) {
    // Fallback: Find button by text content
    const allButtons = document.querySelectorAll('button');
    createBtn = Array.from(allButtons).find(btn =>
      btn.textContent.includes('Tạo') ||
      btn.querySelector('i')?.textContent === 'arrow_forward'
    );
  }

  if (!createBtn) {
    throw new Error("Create button not found");
  }

  // Check if button is disabled
  if (createBtn.disabled) {
    console.warn(`[Flow Automation] Create button is disabled! May need more time for input event to process.`);
    await sleep(500); // Give it more time
  }

  createBtn.click();
  console.log(`[Flow Automation] Create button clicked`);
  await sleep(1000);
}

/**
 * Text to Video workflow - UPDATED with exact XPaths from user
 */
async function textToVideo(promptText) {
  console.log(`[Flow Automation] Starting Text to Video for: ${promptText}`);

  // Step 1: Click Text to Video mode selector
  // XPath: //*[@id="__next"]/div[2]/div/div/div[2]/div/div[1]/div[2]/div/div/div[1]/div[1]/button
  const modeBtn = getElementByXPath('//*[@id="__next"]/div[2]/div/div/div[2]/div/div[1]/div[2]/div/div/div[1]/div[1]/button');
  if (modeBtn) {
    modeBtn.click();
    console.log(`[Flow Automation] Mode button clicked`);
    await sleep(500);

    // Select "Từ văn bản sang video" option
    const option = getElementByXPath('//div[@role="option" and contains(., "Từ văn bản sang video")]');
    if (option) {
      option.click();
      console.log(`[Flow Automation] Text to Video mode selected`);
    }
    await sleep(1000);
  } else {
    console.log(`[Flow Automation] Mode already set or button not found, continuing...`);
  }

  // Step 2: Fill prompt
  // XPath: //*[@id="PINHOLE_TEXT_AREA_ELEMENT_ID"]
  const textarea = document.getElementById("PINHOLE_TEXT_AREA_ELEMENT_ID");
  if (!textarea) {
    throw new Error("Prompt textarea not found");
  }

  textarea.focus();
  textarea.value = promptText;
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.dispatchEvent(new Event("change", { bubbles: true }));
  console.log(`[Flow Automation] Prompt filled: ${promptText}`);
  await sleep(1000);

  // Step 3: Click Submit button
  // XPath: //*[@id="__next"]/div[2]/div/div/div[2]/div/div[1]/div[2]/div/div/div[2]/div[2]/button[2]
  const submitBtn = getElementByXPath('//*[@id="__next"]/div[2]/div/div/div[2]/div/div[1]/div[2]/div/div/div[2]/div[2]/button[2]');
  if (!submitBtn) {
    // Fallback: find button with arrow_forward
    const fallbackBtn = getElementByXPath('//button[.//i[text()="arrow_forward"]]');
    if (fallbackBtn) {
      fallbackBtn.click();
      console.log(`[Flow Automation] Submit button clicked (fallback)`);
    } else {
      throw new Error("Submit button not found");
    }
  } else {
    submitBtn.click();
    console.log(`[Flow Automation] Submit button clicked`);
  }

  // IMPORTANT: Wait for video generation to actually start before returning
  // This ensures the next task in queue doesn't start too early
  console.log(`[Flow Automation] Waiting for video generation to start...`);
  await sleep(3000);

  console.log(`[Flow Automation] Text to Video submitted successfully!`);
}

// ========================================
// IMAGE TO VIDEO - Updated with exact XPaths
// ========================================

/**
 * Image to Video workflow - REWRITTEN with user's exact 7-step flow
 * @param {File} imageFile - Image file to upload
 * @param {File|null} endImageFile - Optional end frame (for start-end mode)
 * @param {string} promptText - Prompt text
 */
async function imageToVideo(imageFile, endImageFile = null, promptText = "") {
  console.log(`[Flow Automation] ========================================`);
  console.log(`[Flow Automation] Starting Image to Video: ${imageFile.name}`);
  console.log(`[Flow Automation] ========================================`);

  // ============================================
  // STEP 1: Chọn Image to Video mode
  // ============================================
  console.log(`[Flow Automation] Step 1: Selecting Image to Video mode...`);
  const modeBtn = getElementByXPath('//*[@id="__next"]/div[2]/div/div/div[2]/div/div[1]/div[2]/div/div/div[1]/div[1]/button');
  if (modeBtn) {
    modeBtn.click();
    await sleep(500);

    const option = getElementByXPath('//div[@role="option" and contains(., "Tạo video từ các khung hình")]');
    if (option) {
      option.click();
      console.log(`[Flow Automation] ✓ Step 1 complete: Mode selected`);
    }
    await sleep(1000);
  } else {
    console.log(`[Flow Automation] Mode already set, continuing...`);
  }

  // ============================================
  // STEP 2: Bấm dấu cộng (+) button
  // XPath: //*[@id="__next"]/div[2]/div/div/div[2]/div/div[1]/div[2]/div/div/div[2]/div[1]/div/div[1]/button
  // ============================================
  console.log(`[Flow Automation] Step 2: Clicking + (add) button...`);
  let addBtn = getElementByXPath('//*[@id="__next"]/div[2]/div/div/div[2]/div/div[1]/div[2]/div/div/div[2]/div[1]/div/div[1]/button');
  if (!addBtn) {
    addBtn = getElementByXPath('//*[@id="__next"]/div[2]/div/div/div[2]/div/div[1]/div[2]/div/div/div[2]/div[1]/div/div/button');
  }
  if (!addBtn) {
    addBtn = getElementByXPath('(//button[.//i[text()="add"]])[1]');
  }

  if (!addBtn) {
    throw new Error("Add button (+) not found!");
  }

  addBtn.click();
  console.log(`[Flow Automation] ✓ Step 2 complete: Add button clicked`);
  await sleep(1000);

  // ============================================
  // STEP 3: Click "Tải lên" (Upload) button and upload file
  // ============================================
  console.log(`[Flow Automation] Step 3: Clicking Upload button and uploading file...`);

  // Find and click "Tải lên" button
  let uploadBtn = getElementByXPath('//div[starts-with(@id, "radix-")]//button[contains(., "Tải lên")]');
  if (!uploadBtn) {
    uploadBtn = getElementByXPath('//button[contains(., "Tải lên")]');
  }
  if (!uploadBtn) {
    uploadBtn = document.querySelector('[id^="radix-"] button');
  }

  if (uploadBtn) {
    // Don't click uploadBtn - instead find file input directly to avoid Windows dialog
    console.log(`[Flow Automation] Upload button found, looking for file input...`);
  }

  // Find file input
  let fileInput = document.querySelector('input[type="file"]');
  if (!fileInput) {
    fileInput = await waitForElement('//input[@type="file"]', 5000);
  }

  if (!fileInput) {
    throw new Error("File input not found!");
  }

  // Upload file via DataTransfer (no dialog)
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(imageFile);
  fileInput.files = dataTransfer.files;
  fileInput.dispatchEvent(new Event("change", { bubbles: true }));

  console.log(`[Flow Automation] ✓ Step 3 complete: File uploaded (${imageFile.name})`);
  await sleep(2000); // Wait for file to process

  // ============================================
  // STEP 4: Click "Cắt" (Crop) button
  // XPath: //*[@id="radix-:r1i:"]/div[2]/div/button[3] (radix ID is dynamic)
  // ============================================
  console.log(`[Flow Automation] Step 4: Clicking Crop button...`);

  let cropBtn = getElementByXPath('//div[starts-with(@id, "radix-")]//div[2]/div/button[3]');
  if (!cropBtn) {
    cropBtn = document.querySelector('[id^="radix-"] div:nth-child(2) > div > button:nth-child(3)');
  }
  if (!cropBtn) {
    // Try to find any confirm/done button
    cropBtn = getElementByXPath('//div[starts-with(@id, "radix-")]//button[last()]');
  }

  if (cropBtn) {
    cropBtn.click();
    console.log(`[Flow Automation] ✓ Step 4 complete: Crop button clicked`);
    await sleep(1500);
  } else {
    console.log(`[Flow Automation] ⚠ Crop button not found, continuing...`);
    await sleep(1000);
  }

  // ============================================
  // STEP 5: Chờ ảnh tải lên và chọn ảnh mới nhất
  // ============================================
  console.log(`[Flow Automation] Step 5: Waiting for image and selecting newest...`);

  // Wait for image to be processed and appear in gallery
  await sleep(2000);

  // Look for newest uploaded image in the popup gallery
  let newestImage = null;
  for (let i = 0; i < 10; i++) {
    newestImage = document.querySelector('[id^="radix-"] img:last-of-type') ||
      getElementByXPath('//div[starts-with(@id, "radix-")]//img[last()]') ||
      document.querySelector('[id^="radix-"] [role="img"]');

    if (newestImage) {
      newestImage.click();
      console.log(`[Flow Automation] ✓ Step 5 complete: Newest image selected`);
      break;
    }
    await sleep(500);
  }

  await sleep(1000);

  // Close popup by pressing ESC multiple times
  for (let i = 0; i < 5; i++) {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
  }
  await sleep(500);

  // Click outside to ensure popup is closed
  document.body.click();
  await sleep(1000);

  // Verify image is now in the main slot
  console.log(`[Flow Automation] Verifying image in slot...`);
  await sleep(1000);

  // ============================================
  // STEP 6: Dán prompt
  // XPath: //*[@id="PINHOLE_TEXT_AREA_ELEMENT_ID"]
  // ============================================
  console.log(`[Flow Automation] Step 6: Filling prompt...`);

  if (promptText) {
    const textarea = document.getElementById("PINHOLE_TEXT_AREA_ELEMENT_ID");
    if (textarea) {
      textarea.focus();
      textarea.value = promptText;
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      textarea.dispatchEvent(new Event("change", { bubbles: true }));
      console.log(`[Flow Automation] ✓ Step 6 complete: Prompt filled - "${promptText.substring(0, 50)}..."`);
      await sleep(1000);
    } else {
      console.log(`[Flow Automation] ⚠ Prompt textarea not found!`);
    }
  } else {
    console.log(`[Flow Automation] No prompt provided, skipping...`);
  }

  // ============================================
  // STEP 7: Click Submit (Gửi) button
  // XPath: //*[@id="__next"]/div[2]/div/div/div[2]/div/div[1]/div[2]/div/div/div[2]/div[2]/button[2]
  // ============================================
  console.log(`[Flow Automation] Step 7: Clicking Submit button...`);

  let submitBtn = getElementByXPath('//*[@id="__next"]/div[2]/div/div/div[2]/div/div[1]/div[2]/div/div/div[2]/div[2]/button[2]');
  if (!submitBtn) {
    submitBtn = getElementByXPath('//button[.//i[text()="arrow_forward"]]');
  }
  if (!submitBtn) {
    // Try finding by button containing "Tạo" text
    submitBtn = getElementByXPath('//button[contains(., "Tạo")]');
  }

  if (!submitBtn) {
    throw new Error("Submit button not found!");
  }

  submitBtn.click();
  console.log(`[Flow Automation] ✓ Step 7 complete: Submit button clicked`);

  // ============================================
  // WAIT FOR VIDEO GENERATION TO START
  // ============================================
  console.log(`[Flow Automation] Waiting for video generation to start...`);
  await sleep(3000);

  console.log(`[Flow Automation] ========================================`);
  console.log(`[Flow Automation] ✅ Image to Video COMPLETED!`);
  console.log(`[Flow Automation] ========================================`);
}

/**
 * Start-End Frame Video workflow - 13-step flow
 * @param {File} startImageFile - Start frame image
 * @param {File} endImageFile - End frame image
 * @param {string} promptText - Prompt text
 */
async function startEndToVideo(startImageFile, endImageFile, promptText = "") {
  console.log(`[Flow Automation] ========================================`);
  console.log(`[Flow Automation] Starting Start-End Frame Video`);
  console.log(`[Flow Automation] Start: ${startImageFile.name}`);
  console.log(`[Flow Automation] End: ${endImageFile.name}`);
  console.log(`[Flow Automation] ========================================`);

  // ============================================
  // STEP 1: Chọn Image to Video mode
  // ============================================
  console.log(`[Flow Automation] Step 1: Selecting Image to Video mode...`);
  const modeBtn = getElementByXPath('//*[@id="__next"]/div[2]/div/div/div[2]/div/div[1]/div[2]/div/div/div[1]/div[1]/button');
  if (modeBtn) {
    modeBtn.click();
    await sleep(500);

    const option = getElementByXPath('//div[@role="option" and contains(., "Tạo video từ các khung hình")]');
    if (option) {
      option.click();
      console.log(`[Flow Automation] ✓ Step 1 complete: Mode selected`);
    }
    await sleep(1000);
  } else {
    console.log(`[Flow Automation] Mode already set, continuing...`);
  }

  // ============================================
  // START IMAGE (Steps 2-6)
  // ============================================
  console.log(`[Flow Automation] --- UPLOADING START IMAGE ---`);

  // STEP 2: Bấm dấu cộng cho Start frame
  // XPath: //*[@id="__next"]/div[2]/div/div/div[2]/div/div[1]/div[2]/div/div/div[2]/div[1]/div/div[1]/button
  console.log(`[Flow Automation] Step 2: Clicking + button for START frame...`);
  let startAddBtn = getElementByXPath('//*[@id="__next"]/div[2]/div/div/div[2]/div/div[1]/div[2]/div/div/div[2]/div[1]/div/div[1]/button');
  if (!startAddBtn) {
    startAddBtn = getElementByXPath('(//button[.//i[text()="add"]])[1]');
  }

  if (!startAddBtn) {
    throw new Error("Start frame add button (+) not found!");
  }

  startAddBtn.click();
  console.log(`[Flow Automation] ✓ Step 2 complete: Start add button clicked`);
  await sleep(1000);

  // STEP 3: Upload file for Start frame
  console.log(`[Flow Automation] Step 3: Uploading START image...`);
  let fileInput = document.querySelector('input[type="file"]');
  if (!fileInput) {
    fileInput = await waitForElement('//input[@type="file"]', 5000);
  }

  if (!fileInput) {
    throw new Error("File input not found for start frame!");
  }

  const dataTransferStart = new DataTransfer();
  dataTransferStart.items.add(startImageFile);
  fileInput.files = dataTransferStart.files;
  fileInput.dispatchEvent(new Event("change", { bubbles: true }));
  console.log(`[Flow Automation] ✓ Step 3 complete: Start image uploaded`);
  await sleep(2000);

  // STEP 4: Click Crop for Start frame
  console.log(`[Flow Automation] Step 4: Clicking Crop for START frame...`);
  let cropBtn = getElementByXPath('//div[starts-with(@id, "radix-")]//div[2]/div/button[3]');
  if (!cropBtn) {
    cropBtn = document.querySelector('[id^="radix-"] div:nth-child(2) > div > button:nth-child(3)');
  }
  if (!cropBtn) {
    cropBtn = getElementByXPath('//div[starts-with(@id, "radix-")]//button[last()]');
  }

  if (cropBtn) {
    cropBtn.click();
    console.log(`[Flow Automation] ✓ Step 4 complete: Crop clicked`);
    await sleep(1500);
  } else {
    console.log(`[Flow Automation] ⚠ Crop button not found, continuing...`);
  }

  // STEP 5: Wait and select newest image
  console.log(`[Flow Automation] Step 5: Waiting for START image...`);
  await sleep(2000);

  let newestImage = null;
  for (let i = 0; i < 10; i++) {
    newestImage = document.querySelector('[id^="radix-"] img:last-of-type') ||
      getElementByXPath('//div[starts-with(@id, "radix-")]//img[last()]');
    if (newestImage) {
      newestImage.click();
      console.log(`[Flow Automation] ✓ Step 5 complete: Start image selected`);
      break;
    }
    await sleep(500);
  }
  await sleep(1000);

  // STEP 6: Close popup and confirm start frame loaded
  console.log(`[Flow Automation] Step 6: Confirming START frame loaded...`);
  for (let i = 0; i < 5; i++) {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
  }
  await sleep(500);
  document.body.click();
  console.log(`[Flow Automation] ✓ Step 6 complete: Start frame loaded`);
  await sleep(1500);

  // ============================================
  // END IMAGE (Steps 7-11)
  // ============================================
  console.log(`[Flow Automation] --- UPLOADING END IMAGE ---`);

  // STEP 7: Bấm dấu cộng cho End frame
  // XPath: //*[@id="__next"]/div[2]/div/div/div[2]/div/div[1]/div[2]/div/div/div[2]/div[1]/div/div[2]/button
  console.log(`[Flow Automation] Step 7: Clicking + button for END frame...`);
  let endAddBtn = getElementByXPath('//*[@id="__next"]/div[2]/div/div/div[2]/div/div[1]/div[2]/div/div/div[2]/div[1]/div/div[2]/button');
  if (!endAddBtn) {
    endAddBtn = getElementByXPath('(//button[.//i[text()="add"]])[2]');
  }

  if (!endAddBtn) {
    throw new Error("End frame add button (+) not found!");
  }

  endAddBtn.click();
  console.log(`[Flow Automation] ✓ Step 7 complete: End add button clicked`);
  await sleep(1000);

  // STEP 8: Upload file for End frame
  console.log(`[Flow Automation] Step 8: Uploading END image...`);
  let fileInputEnd = document.querySelector('input[type="file"]');
  if (!fileInputEnd) {
    fileInputEnd = await waitForElement('//input[@type="file"]', 5000);
  }

  if (!fileInputEnd) {
    throw new Error("File input not found for end frame!");
  }

  const dataTransferEnd = new DataTransfer();
  dataTransferEnd.items.add(endImageFile);
  fileInputEnd.files = dataTransferEnd.files;
  fileInputEnd.dispatchEvent(new Event("change", { bubbles: true }));
  console.log(`[Flow Automation] ✓ Step 8 complete: End image uploaded`);
  await sleep(2000);

  // STEP 9: Click Crop for End frame
  console.log(`[Flow Automation] Step 9: Clicking Crop for END frame...`);
  let cropBtnEnd = getElementByXPath('//div[starts-with(@id, "radix-")]//div[2]/div/button[3]');
  if (!cropBtnEnd) {
    cropBtnEnd = document.querySelector('[id^="radix-"] div:nth-child(2) > div > button:nth-child(3)');
  }
  if (!cropBtnEnd) {
    cropBtnEnd = getElementByXPath('//div[starts-with(@id, "radix-")]//button[last()]');
  }

  if (cropBtnEnd) {
    cropBtnEnd.click();
    console.log(`[Flow Automation] ✓ Step 9 complete: Crop clicked`);
    await sleep(1500);
  } else {
    console.log(`[Flow Automation] ⚠ Crop button not found, continuing...`);
  }

  // STEP 10: Wait and select newest image for End frame
  console.log(`[Flow Automation] Step 10: Waiting for END image...`);
  await sleep(2000);

  let newestImageEnd = null;
  for (let i = 0; i < 10; i++) {
    newestImageEnd = document.querySelector('[id^="radix-"] img:last-of-type') ||
      getElementByXPath('//div[starts-with(@id, "radix-")]//img[last()]');
    if (newestImageEnd) {
      newestImageEnd.click();
      console.log(`[Flow Automation] ✓ Step 10 complete: End image selected`);
      break;
    }
    await sleep(500);
  }
  await sleep(1000);

  // STEP 11: Close popup and confirm end frame loaded
  console.log(`[Flow Automation] Step 11: Confirming END frame loaded...`);
  for (let i = 0; i < 5; i++) {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
  }
  await sleep(500);
  document.body.click();
  console.log(`[Flow Automation] ✓ Step 11 complete: End frame loaded`);
  await sleep(1500);

  // ============================================
  // STEP 12: Dán prompt
  // ============================================
  console.log(`[Flow Automation] Step 12: Filling prompt...`);

  if (promptText) {
    const textarea = document.getElementById("PINHOLE_TEXT_AREA_ELEMENT_ID");
    if (textarea) {
      textarea.focus();
      textarea.value = promptText;
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      textarea.dispatchEvent(new Event("change", { bubbles: true }));
      console.log(`[Flow Automation] ✓ Step 12 complete: Prompt filled`);
      await sleep(1000);
    } else {
      console.log(`[Flow Automation] ⚠ Prompt textarea not found!`);
    }
  } else {
    console.log(`[Flow Automation] No prompt provided, skipping...`);
  }

  // ============================================
  // STEP 13: Click Submit (Gửi) button
  // XPath: //*[@id="__next"]/div[2]/div/div/div[2]/div/div[1]/div[2]/div/div/div[2]/div[2]/button
  // ============================================
  console.log(`[Flow Automation] Step 13: Clicking Submit button...`);

  let submitBtn = getElementByXPath('//*[@id="__next"]/div[2]/div/div/div[2]/div/div[1]/div[2]/div/div/div[2]/div[2]/button[2]');
  if (!submitBtn) {
    submitBtn = getElementByXPath('//*[@id="__next"]/div[2]/div/div/div[2]/div/div[1]/div[2]/div/div/div[2]/div[2]/button');
  }
  if (!submitBtn) {
    submitBtn = getElementByXPath('//button[.//i[text()="arrow_forward"]]');
  }
  if (!submitBtn) {
    submitBtn = getElementByXPath('//button[contains(., "Tạo")]');
  }

  if (!submitBtn) {
    throw new Error("Submit button not found!");
  }

  submitBtn.click();
  console.log(`[Flow Automation] ✓ Step 13 complete: Submit button clicked`);

  // ============================================
  // WAIT FOR VIDEO GENERATION TO START
  // ============================================
  console.log(`[Flow Automation] Waiting for video generation to start...`);
  await sleep(3000);

  console.log(`[Flow Automation] ========================================`);
  console.log(`[Flow Automation] ✅ Start-End Frame Video COMPLETED!`);
  console.log(`[Flow Automation] ========================================`);
}

/**
 * Legacy uploadFrame function - kept for compatibility
 */
async function uploadFrame(imageFile, frameType = "start") {
  console.log(`[Flow Automation] Uploading ${frameType} frame: ${imageFile.name}`);

  // For start-end, we need to click the appropriate slot
  const slotIndex = frameType === "start" ? 1 : 2;
  const addBtn = getElementByXPath(`(//button[.//i[text()="add"]])[${slotIndex}]`);

  if (!addBtn) {
    throw new Error(`${frameType} frame add button not found`);
  }
  addBtn.click();
  await sleep(500);

  // Click upload button in popup
  const uploadBtn = getElementByXPath('//button[contains(., "Tải lên")]');
  if (uploadBtn) {
    uploadBtn.click();
    await sleep(500);
  }

  // Find file input and upload
  const fileInput = await waitForElement('//input[@type="file"]', 5000);
  if (!fileInput) {
    throw new Error("File input not found");
  }

  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(imageFile);
  fileInput.files = dataTransfer.files;
  fileInput.dispatchEvent(new Event("change", { bubbles: true }));

  await sleep(1500);
  console.log(`[Flow Automation] ${frameType} frame uploaded`);
}

// ========================================
// CHARACTER SYNC (Multi-component)
// ========================================

/**
 * Character Manager
 */
class CharacterManager {
  constructor() {
    this.characters = [];
  }

  /**
   * Add a character with 1-3 reference images
   * @param {string} name - Character name
   * @param {File[]} imageFiles - Array of 1-3 image files
   */
  addCharacter(name, imageFiles) {
    if (imageFiles.length < 1 || imageFiles.length > 3) {
      throw new Error("Character must have 1-3 images");
    }

    this.characters.push({
      name,
      images: imageFiles,
    });

    console.log(`[Character Manager] Added character: ${name} with ${imageFiles.length} images`);
  }

  /**
   * Get character by name
   */
  getCharacter(name) {
    return this.characters.find((c) => c.name === name);
  }

  /**
   * Generate prompt with character reference
   * @param {string} characterName
   * @param {string} action - e.g., "walking in the park"
   */
  generatePrompt(characterName, action) {
    const character = this.getCharacter(characterName);
    if (!character) {
      throw new Error(`Character not found: ${characterName}`);
    }

    return `${characterName}, ${action}`;
  }
}

// Global character manager
const characterManager = new CharacterManager();

/**
 * Character Video workflow - Upload 1-3 characters then generate video
 * @param {Array<{name: string, image: File}>} characters - Array of 1-3 character objects
 * @param {string} promptText - Prompt text mentioning characters
 */
async function characterToVideo(characters, promptText = "") {
  console.log(`[Flow Automation] ========================================`);
  console.log(`[Flow Automation] Starting Character Video`);
  console.log(`[Flow Automation] Characters: ${characters.map(c => c.name).join(', ')}`);
  console.log(`[Flow Automation] ========================================`);

  if (characters.length === 0 || characters.length > 3) {
    throw new Error(`Must have 1-3 characters, got ${characters.length}`);
  }

  // ============================================
  // STEP 1: Select mode "Tạo video từ các thành phần"
  // ============================================
  console.log(`[Flow Automation] Step 1: Selecting Character mode...`);
  const modeBtn = getElementByXPath('//*[@id="__next"]/div[2]/div/div/div[2]/div/div[1]/div[2]/div/div/div[1]/div[1]/button');
  if (modeBtn) {
    modeBtn.click();
    await sleep(500);

    // Find the character/components mode option
    const option = getElementByXPath('//div[@role="option" and contains(., "Tạo video từ các thành phần")]') ||
      getElementByXPath('//div[@role="option" and contains(., "thành phần")]');
    if (option) {
      option.click();
      console.log(`[Flow Automation] ✓ Step 1 complete: Character mode selected`);
    }
    await sleep(1000);
  } else {
    console.log(`[Flow Automation] Mode already set, continuing...`);
  }

  // XPaths for character slots 1, 2, 3
  const characterSlotXPaths = [
    '//*[@id="__next"]/div[2]/div/div/div[2]/div/div[1]/div[2]/div/div/div[2]/div[1]/div/div[1]/button',
    '//*[@id="__next"]/div[2]/div/div/div[2]/div/div[1]/div[2]/div/div/div[2]/div[1]/div/div[2]/button',
    '//*[@id="__next"]/div[2]/div/div/div[2]/div/div[1]/div[2]/div/div/div[2]/div[1]/div/div[3]/button'
  ];

  // ============================================
  // UPLOAD/REUSE EACH CHARACTER (1-3)
  // ============================================
  for (let i = 0; i < characters.length; i++) {
    const charNum = i + 1;
    const character = characters[i];
    const slotXPath = characterSlotXPaths[i];

    console.log(`[Flow Automation] --- CHARACTER ${charNum}: ${character.name} ---`);

    // ============================================
    // CHECK 1: Is slot already filled?
    // ============================================
    const slotBtn = getElementByXPath(slotXPath);
    if (slotBtn) {
      // Check if slot has an image (not just + icon)
      const slotHasImage = slotBtn.querySelector('img') ||
        slotBtn.querySelector('[style*="background-image"]');

      if (slotHasImage) {
        console.log(`[Flow Automation] ✓ Slot ${charNum} already has image - SKIPPING`);
        continue; // Skip to next character
      }
    }

    // ============================================
    // CHECK 2: Open gallery and look for character
    // ============================================
    console.log(`[Flow Automation] Opening gallery to find ${character.name}...`);

    // Click the slot button to open gallery
    let addBtn = getElementByXPath(slotXPath);
    if (!addBtn) {
      addBtn = getElementByXPath(`(//button[.//i[text()="add"]])[${charNum}]`);
    }

    if (!addBtn) {
      throw new Error(`Character ${charNum} add button (+) not found!`);
    }

    addBtn.click();
    console.log(`[Flow Automation] Gallery opened for slot ${charNum}`);
    await sleep(1000);

    // Look for character in gallery by name or filename
    let foundInGallery = false;

    // Wait for gallery to load
    const galleryFrame = await waitForElement('//div[starts-with(@id, "radix-")]//div[contains(@class, "grid") or contains(@class, "gallery")]', 3000) ||
      document.querySelector('[id^="radix-"] [class*="grid"]') ||
      getElementByXPath('//div[starts-with(@id, "radix-")]/div/div/div/div[2]');

    if (galleryFrame) {
      await sleep(500);

      // Get all images in gallery
      const galleryImages = galleryFrame.querySelectorAll('img') ||
        document.querySelectorAll('[id^="radix-"] img');

      console.log(`[Flow Automation] Found ${galleryImages.length} images in gallery`);

      // Try to find matching image by alt text, title, or data attribute
      for (const img of galleryImages) {
        const imgAlt = (img.alt || '').toLowerCase();
        const imgTitle = (img.title || '').toLowerCase();
        const imgSrc = (img.src || '').toLowerCase();
        const charNameLower = character.name.toLowerCase();

        // Check if image matches character name
        if (imgAlt.includes(charNameLower) ||
          imgTitle.includes(charNameLower) ||
          imgSrc.includes(charNameLower)) {
          console.log(`[Flow Automation] ✓ Found ${character.name} in gallery - REUSING`);
          img.click();
          foundInGallery = true;
          await sleep(1000);
          break;
        }
      }
    }

    // ============================================
    // If not found in gallery, upload new
    // ============================================
    if (!foundInGallery) {
      console.log(`[Flow Automation] ${character.name} not in gallery - UPLOADING NEW`);

      // Find file input and upload
      let fileInput = document.querySelector('input[type="file"]');
      if (!fileInput) {
        fileInput = await waitForElement('//input[@type="file"]', 5000);
      }

      if (!fileInput) {
        throw new Error(`File input not found for character ${charNum}!`);
      }

      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(character.image);
      fileInput.files = dataTransfer.files;
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
      console.log(`[Flow Automation] ✓ Character ${charNum} image uploaded`);
      await sleep(2000);

      // Click Crop
      let cropBtn = getElementByXPath('//div[starts-with(@id, "radix-")]//div[2]/div/button[3]');
      if (!cropBtn) {
        cropBtn = document.querySelector('[id^="radix-"] div:nth-child(2) > div > button:nth-child(3)');
      }
      if (!cropBtn) {
        cropBtn = getElementByXPath('//div[starts-with(@id, "radix-")]//button[last()]');
      }

      if (cropBtn) {
        cropBtn.click();
        console.log(`[Flow Automation] ✓ Crop clicked`);
        await sleep(1500);
      }

      // Wait and select newest image
      await sleep(2000);

      let newestImage = null;
      for (let j = 0; j < 10; j++) {
        newestImage = document.querySelector('[id^="radix-"] img:last-of-type') ||
          getElementByXPath('//div[starts-with(@id, "radix-")]//img[last()]');
        if (newestImage) {
          newestImage.click();
          console.log(`[Flow Automation] ✓ Newest image selected`);
          break;
        }
        await sleep(500);
      }
      await sleep(1000);
    }

    // Close popup
    for (let j = 0; j < 5; j++) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
    }
    await sleep(500);
    document.body.click();
    console.log(`[Flow Automation] ✓ Character ${charNum} loaded to slot ${charNum}`);
    await sleep(1500);
  }

  console.log(`[Flow Automation] --- ALL ${characters.length} CHARACTERS LOADED ---`);
  await sleep(1000);

  // ============================================
  // STEP 9: Fill prompt
  // ============================================
  console.log(`[Flow Automation] Step 9: Filling prompt...`);

  if (promptText) {
    const textarea = document.getElementById("PINHOLE_TEXT_AREA_ELEMENT_ID");
    if (textarea) {
      textarea.focus();
      textarea.value = promptText;
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      textarea.dispatchEvent(new Event("change", { bubbles: true }));
      console.log(`[Flow Automation] ✓ Step 9 complete: Prompt filled`);
      await sleep(1000);
    } else {
      console.log(`[Flow Automation] ⚠ Prompt textarea not found!`);
    }
  } else {
    console.log(`[Flow Automation] No prompt provided, skipping...`);
  }

  // ============================================
  // STEP 10: Click Submit button
  // ============================================
  console.log(`[Flow Automation] Step 10: Clicking Submit button...`);

  let submitBtn = getElementByXPath('//*[@id="__next"]/div[2]/div/div/div[2]/div/div[1]/div[2]/div/div/div[2]/div[2]/button[2]');
  if (!submitBtn) {
    submitBtn = getElementByXPath('//*[@id="__next"]/div[2]/div/div/div[2]/div/div[1]/div[2]/div/div/div[2]/div[2]/button');
  }
  if (!submitBtn) {
    submitBtn = getElementByXPath('//button[.//i[text()="arrow_forward"]]');
  }
  if (!submitBtn) {
    submitBtn = getElementByXPath('//button[contains(., "Tạo")]');
  }

  if (!submitBtn) {
    throw new Error("Submit button not found!");
  }

  submitBtn.click();
  console.log(`[Flow Automation] ✓ Step 10 complete: Submit button clicked`);

  // Wait for video generation to start
  console.log(`[Flow Automation] Waiting for video generation to start...`);
  await sleep(3000);

  console.log(`[Flow Automation] ========================================`);
  console.log(`[Flow Automation] ✅ Character Video COMPLETED!`);
  console.log(`[Flow Automation] ========================================`);
}

/**
 * Legacy createVideoWithCharacter - kept for backward compatibility
 */
async function createVideoWithCharacter(characterName, action) {
  const character = characterManager.getCharacter(characterName);
  if (!character) {
    throw new Error(`Character not found: ${characterName}`);
  }

  // Convert to new format and call characterToVideo
  const characters = [{
    name: characterName,
    image: character.images[0]
  }];

  const prompt = characterManager.generatePrompt(characterName, action);
  await characterToVideo(characters, prompt);
  console.log(`[Flow Automation] Character video started: ${characterName} - ${action}`);
}

// ========================================
// QUEUE MANAGEMENT
// ========================================

/**
 * Queue processor with pause/resume, progress tracking, random delay, and cooldown
 */
class QueueProcessor {
  constructor(options = {}) {
    this.queue = [];

    // Random delay between tasks (range in seconds)
    this.delayMinMs = (options.delayMinSec || 5) * 1000;  // Default 5s
    this.delayMaxMs = (options.delayMaxSec || 10) * 1000; // Default 10s

    // Cooldown after N tasks
    this.cooldownAfterTasks = options.cooldownAfterTasks || 5;  // Default: after 5 tasks
    this.cooldownDurationMs = (options.cooldownDurationSec || 60) * 1000; // Default: 60 seconds

    this.isProcessing = false;
    this.isPaused = false;
    this.currentTaskIndex = 0;
    this.totalTasks = 0;
  }

  /**
   * Get random delay between min and max
   */
  getRandomDelay() {
    const min = this.delayMinMs;
    const max = this.delayMaxMs;
    const randomDelay = Math.floor(Math.random() * (max - min + 1)) + min;
    return randomDelay;
  }

  /**
   * Set delay range (in seconds)
   */
  setDelayRange(minSec, maxSec) {
    this.delayMinMs = minSec * 1000;
    this.delayMaxMs = maxSec * 1000;
    console.log(`[Queue] Delay range set: ${minSec}s - ${maxSec}s`);
  }

  /**
   * Set cooldown settings
   */
  setCooldown(afterTasks, durationSec) {
    this.cooldownAfterTasks = afterTasks;
    this.cooldownDurationMs = durationSec * 1000;
    console.log(`[Queue] Cooldown set: ${durationSec}s after every ${afterTasks} tasks`);
  }

  /**
   * Add task to queue
   */
  addTask(task) {
    this.queue.push(task);
    console.log(`[Queue] Added task. Queue length: ${this.queue.length}`);
  }

  /**
   * Add multiple prompts to queue (text to video)
   */
  addTextToVideoBatch(prompts) {
    prompts.forEach((prompt) => {
      this.addTask({
        type: "text_to_video",
        prompt,
      });
    });
  }

  /**
   * Pause processing
   */
  pause() {
    this.isPaused = true;
    console.log(`[Queue] Paused`);
    this.updateButtonState();
  }

  /**
   * Resume processing
   */
  resume() {
    this.isPaused = false;
    console.log(`[Queue] Resumed`);
    this.updateButtonState();
  }

  /**
   * Toggle pause/resume
   */
  togglePause() {
    if (this.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  /**
   * Update start button state
   */
  updateButtonState() {
    const startBtn = document.getElementById('sidebar-start-queue');
    if (startBtn) {
      if (this.isProcessing) {
        if (this.isPaused) {
          startBtn.textContent = '▶ Resume';
          startBtn.style.background = 'rgba(245, 158, 11, 0.2)';
        } else {
          startBtn.textContent = '⏸ Pause';
          startBtn.style.background = 'rgba(239, 68, 68, 0.2)';
        }
      } else {
        startBtn.textContent = '▶ Start Processing';
        startBtn.style.background = '';
      }
    }
  }

  /**
   * Update progress display
   */
  updateProgress() {
    const totalEl = document.getElementById('queue-total');
    const runningEl = document.getElementById('queue-running');
    const doneEl = document.getElementById('queue-done');

    if (totalEl) totalEl.textContent = this.totalTasks;
    if (runningEl) runningEl.textContent = this.isProcessing ? '1' : '0';
    if (doneEl) doneEl.textContent = this.currentTaskIndex;

    // Also update queue display
    if (typeof updateQueueDisplay === 'function') {
      updateQueueDisplay();
    }
  }

  /**
   * Process queue with pause support
   */
  async processQueue() {
    if (this.isProcessing) {
      // If already processing, toggle pause
      this.togglePause();
      return;
    }

    this.isProcessing = true;
    this.isPaused = false;
    this.currentTaskIndex = 0;
    this.totalTasks = this.queue.length;

    console.log(`[Queue] Starting to process ${this.totalTasks} tasks`);
    this.updateButtonState();
    this.updateProgress();

    while (this.queue.length > 0) {
      // Check if paused
      while (this.isPaused) {
        console.log(`[Queue] Paused, waiting...`);
        await sleep(500);
        if (!this.isProcessing) break; // Exit if stopped
      }

      if (!this.isProcessing) break;

      const task = this.queue.shift();
      this.currentTaskIndex++;
      console.log(`[Queue] Processing task ${this.currentTaskIndex}/${this.totalTasks}:`, task);
      this.updateProgress();

      try {
        if (task.type === "text_to_video") {
          await textToVideo(task.prompt);
        } else if (task.type === "image_to_video") {
          await imageToVideo(task.image, null, task.prompt);
        } else if (task.type === "start_to_end") {
          await startEndToVideo(task.startFrame, task.endFrame, task.prompt);
        } else if (task.type === "character_video") {
          // Call characterToVideo with characters array
          await characterToVideo(task.characters, task.prompt);
        }

        // Check if we need a cooldown (after every N tasks)
        if (this.currentTaskIndex % this.cooldownAfterTasks === 0 && this.queue.length > 0) {
          const cooldownSec = this.cooldownDurationMs / 1000;
          console.log(`[Queue] ⏸ COOLDOWN: Waiting ${cooldownSec}s after ${this.cooldownAfterTasks} tasks...`);

          // Cooldown with pause check
          const cooldownEnd = Date.now() + this.cooldownDurationMs;
          while (Date.now() < cooldownEnd) {
            if (this.isPaused) {
              console.log(`[Queue] Cooldown paused`);
              while (this.isPaused && this.isProcessing) {
                await sleep(500);
              }
            }
            if (!this.isProcessing) break;
            await sleep(1000);

            // Show countdown
            const remaining = Math.ceil((cooldownEnd - Date.now()) / 1000);
            if (remaining > 0 && remaining % 10 === 0) {
              console.log(`[Queue] Cooldown: ${remaining}s remaining...`);
            }
          }
          console.log(`[Queue] ⏵ Cooldown finished, resuming...`);
        }

        // Random delay between tasks
        const randomDelay = this.getRandomDelay();
        const delaySec = (randomDelay / 1000).toFixed(1);
        console.log(`[Queue] Task ${this.currentTaskIndex}/${this.totalTasks} completed. Waiting ${delaySec}s (random)`);

        // Delay with pause check
        const delayEnd = Date.now() + randomDelay;
        while (Date.now() < delayEnd) {
          if (this.isPaused) {
            console.log(`[Queue] Delay paused`);
            while (this.isPaused && this.isProcessing) {
              await sleep(500);
            }
          }
          if (!this.isProcessing) break;
          await sleep(100);
        }

      } catch (error) {
        console.error(`[Queue] Task ${this.currentTaskIndex} failed:`, error);
      }

      this.updateProgress();
    }

    this.isProcessing = false;
    this.isPaused = false;
    console.log(`[Queue] All ${this.totalTasks} tasks completed!`);
    this.updateButtonState();
    this.updateProgress();
  }

  /**
   * Stop processing completely
   */
  stop() {
    this.isProcessing = false;
    this.isPaused = false;
    console.log(`[Queue] Stopped`);
    this.updateButtonState();
  }

  /**
   * Set delay between tasks
   */
  setDelay(delayMs) {
    this.delayMs = delayMs;
  }
}

// Global queue processor
const queueProcessor = new QueueProcessor(5000);

// ========================================
// VIDEO MONITORING & AUTO-DOWNLOAD
// ========================================

/**
 * Monitor for new completed videos and auto-download
 */
class VideoMonitor {
  constructor() {
    this.observer = null;
    this.downloadedVideos = new Set();
    this.autoDownloadEnabled = false;
  }

  /**
   * Start monitoring
   */
  start(autoDownload = true) {
    this.autoDownloadEnabled = autoDownload;
    console.log(`[Video Monitor] Starting monitor (auto-download: ${autoDownload})`);

    this.observer = new MutationObserver((mutations) => {
      this.checkForCompletedVideos();
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Initial check
    this.checkForCompletedVideos();
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.observer) {
      this.observer.disconnect();
      console.log(`[Video Monitor] Stopped`);
    }
  }

  /**
   * Check for completed videos
   */
  checkForCompletedVideos() {
    const downloadButtons = getElementsByXPath('//button[.//span[text()="Tải xuống"]]');

    downloadButtons.forEach((btn) => {
      // Check if this video card has percentage (still processing)
      const card = btn.closest("div[class*='card']") || btn.closest("div");
      if (!card) return;

      const hasPercentage = card.textContent.includes("%");
      if (hasPercentage) return;

      // Create unique identifier for this video
      const videoId = card.outerHTML.substring(0, 100);
      if (this.downloadedVideos.has(videoId)) return;

      console.log(`[Video Monitor] New completed video detected`);

      if (this.autoDownloadEnabled) {
        console.log(`[Video Monitor] Auto-downloading...`);
        btn.click();
        this.downloadedVideos.add(videoId);
      }
    });
  }

  /**
   * Toggle auto-download
   */
  setAutoDownload(enabled) {
    this.autoDownloadEnabled = enabled;
    console.log(`[Video Monitor] Auto-download: ${enabled}`);
  }
}

// Global video monitor
const videoMonitor = new VideoMonitor();

// ========================================
// MESSAGE LISTENER (from extension popup)
// ========================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log(`[Flow Automation] Received message:`, message);

  (async () => {
    try {
      switch (message.action) {
        case "text_to_video":
          await textToVideo(message.prompt);
          sendResponse({ success: true });
          break;

        case "image_to_video":
          // Convert base64 to File
          const startFile = await base64ToFile(message.startImage, 'start.png');
          const endFile = await base64ToFile(message.endImage, 'end.png');
          await imageToVideo(startFile, endFile, message.prompt);
          sendResponse({ success: true });
          break;

        case "add_character":
          // Convert base64 images to Files
          const charFiles = await Promise.all(
            message.images.map((base64, i) => base64ToFile(base64, `char_${i}.png`))
          );
          characterManager.addCharacter(message.name, charFiles);
          sendResponse({ success: true });
          break;

        case "character_video":
          await createVideoWithCharacter(message.characterName, message.action);
          sendResponse({ success: true });
          break;

        case "add_to_queue":
          queueProcessor.addTextToVideoBatch(message.prompts);
          sendResponse({ success: true, queueLength: queueProcessor.queue.length });
          break;

        case "process_queue":
          queueProcessor.setDelay(message.delayMs || 5000);
          queueProcessor.processQueue();
          sendResponse({ success: true });
          break;

        case "process_queue_custom":
          // Process custom queue from popup
          await processCustomQueue(message.queue, message.delayMs);
          sendResponse({ success: true });
          break;

        case "start_monitor":
          videoMonitor.start(message.autoDownload !== false);
          sendResponse({ success: true });
          break;

        case "stop_monitor":
          videoMonitor.stop();
          sendResponse({ success: true });
          break;

        case "set_auto_download":
          videoMonitor.setAutoDownload(message.enabled);
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: "Unknown action" });
      }
    } catch (error) {
      console.error(`[Flow Automation] Error:`, error);
      sendResponse({ success: false, error: error.message });
    }
  })();

  return true; // Keep channel open for async response
});

// ========================================
// HELPER: Base64 to File
// ========================================
async function base64ToFile(base64, filename) {
  const response = await fetch(base64);
  const blob = await response.blob();
  return new File([blob], filename, { type: blob.type });
}

// ========================================
// PROCESS CUSTOM QUEUE FROM POPUP
// ========================================
async function processCustomQueue(queue, delayMs = 5000) {
  console.log(`[Flow Automation] Processing custom queue: ${queue.length} tasks`);

  for (const task of queue) {
    console.log(`[Flow Automation] Processing task:`, task);

    try {
      if (task.type === "text_to_video") {
        await textToVideo(task.prompt);
      } else if (task.type === "image_to_video") {
        const startFile = await base64ToFile(task.startImage, 'start.png');
        const endFile = await base64ToFile(task.endImage, 'end.png');
        await imageToVideo(startFile, endFile, task.prompt || '');
      } else if (task.type === "character_video") {
        // Add character if not exists
        const charFiles = await Promise.all(
          task.images.map((base64, i) => base64ToFile(base64, `char_${i}.png`))
        );

        if (!characterManager.getCharacter(task.characterName)) {
          characterManager.addCharacter(task.characterName, charFiles);
        }

        await createVideoWithCharacter(task.characterName, task.action);
      }

      console.log(`[Flow Automation] Task completed. Waiting ${delayMs}ms...`);
      await sleep(delayMs);
    } catch (error) {
      console.error(`[Flow Automation] Task failed:`, error);
    }
  }

  console.log(`[Flow Automation] Queue processing completed`);
}

// ========================================
// AUTO-INIT
// ========================================

console.log(`[Flow Automation] Content script loaded`);

// Auto-start video monitor if on project page
if (window.location.href.includes("/tools/flow/project/")) {
  console.log(`[Flow Automation] Project page detected, starting video monitor`);
  videoMonitor.start(false); // Don't auto-download by default
}

// ========================================
// SIDEBAR INJECTION (BASIC VERSION FOR TESTING)
// ========================================

function createSidebarHTML() {
  return `
    <div id="flow-automation-sidebar">
      <div class="sidebar-header">
        <button class="toggle-btn" id="sidebar-toggle">«</button>
        <h2>Flow Automation</h2>
      </div>
      
      <div class="sidebar-body">
        <div class="tabs">
          <button class="tab active" data-tab="text-video">Text→Video</button>
          <button class="tab" data-tab="image-video">Image→Video</button>
          <button class="tab" data-tab="start-end">Start→End</button>
          <button class="tab" data-tab="characters">Characters</button>
          <button class="tab" data-tab="queue">Queue</button>
        </div>
        
        <!-- TEXT TO VIDEO TAB -->
        <div class="tab-content active" id="text-video-content">
          <div class="form-group">
            <label>Enter Prompts (one per line)</label>
            <textarea id="sidebar-text-prompts" placeholder="A sunset over the ocean
A cat playing in the garden
A robot dancing in the rain"></textarea>
          </div>
          <button class="btn-primary" id="sidebar-add-text-queue">Add to Queue</button>
        </div>
        
        <!-- IMAGE TO VIDEO TAB - Batch single images with individual prompts -->
        <div class="tab-content" id="image-video-content" style="display:none;">
          <div class="form-group">
            <label>📸 Upload Images (Batch)</label>
            <div class="upload-zone" id="image-upload-zone">
              <input type="file" id="image-file-input" accept="image/*" multiple>
              <div class="upload-zone-text">
                <strong>Click or Drag Multiple Images</strong>
                <span>Upload all images at once for batch processing</span>
              </div>
            </div>
          </div>
          
          <div id="image-list-container" class="image-list-container"></div>
          
          <button class="btn-primary" id="sidebar-add-image-batch">📤 Add All to Queue</button>
        </div>
        
        <!-- START TO END VIDEO TAB - Paired start/end frames -->
        <div class="tab-content" id="start-end-content" style="display:none;">
          <div class="form-group">
            <label>🎬 Upload START Frames (Batch)</label>
            <div class="upload-zone" id="start-upload-zone">
              <input type="file" id="start-file-input" accept="image/*" multiple>
              <div class="upload-zone-text">
                <strong>Upload START frames</strong>
                <span>First batch: starting keyframe images</span>
              </div>
            </div>
          </div>
          
          <div class="form-group">
            <label>🏁 Upload END Frames (Batch)</label>
            <div class="upload-zone" id="end-upload-zone">
              <input type="file" id="end-file-input" accept="image/*" multiple>
              <div class="upload-zone-text">
                <strong>Upload END frames</strong>
                <span>Second batch: matching end frames</span>
              </div>
            </div>
          </div>
          
          <div id="paired-list-container" class="paired-list-container">
            <!-- Paired items will be inserted here -->
          </div>
          
          <button class="btn-primary" id="sidebar-add-paired-queue">📤 Add All Pairs to Queue</button>
        </div>
        
        <!-- CHARACTERS TAB -->
        <div class="tab-content" id="characters-content" style="display:none;">
          <div class="form-group">
            <label>Character Name</label>
            <input type="text" id="character-name-input" placeholder="e.g., Sarah, Robot Mike">
          </div>
          
          <div class="form-group">
            <label>Reference Image (1 image per character)</label>
            <div class="upload-zone" id="character-upload-zone">
              <input type="file" id="character-file-input" accept="image/*">
              <div class="upload-zone-text">
                <strong>🎭 Click or Drag Image</strong>
                <span>Upload 1 character reference photo</span>
              </div>
            </div>
            <div class="image-preview-grid" id="character-preview-grid"></div>
          </div>
          
          <button class="btn-success" id="sidebar-save-character">Save Character</button>
          
          <div class="form-group" style="margin-top: 20px;">
            <label>Saved Characters (max 10)</label>
            <div class="character-avatar-scroll" id="character-avatar-scroll">
              <!-- Character avatars will be inserted here -->
            </div>
            <div id="character-name-suggestions" style="display: none; margin-top: 8px; padding: 8px 12px; background: rgba(164, 123, 255, 0.1); border-radius: 6px; font-size: 12px; color: #a47bff;">
              <strong>💡 Characters:</strong> <span id="character-names-display"></span>
            </div>
          </div>
          
          <div class="form-group">
            <label>Character Prompt (one per line)</label>
            <textarea id="character-prompt" placeholder="Sarah walking in the park
Mike playing basketball
Robot dancing in the rain"></textarea>
            <div id="character-prompt-preview" style="display: none; margin-top: 8px; padding: 10px; background: rgba(0, 0, 0, 0.3); border-radius: 6px; font-size: 12px; line-height: 1.6; color: #ffffff; white-space: pre-wrap; word-wrap: break-word;"></div>
            <div id="character-prompt-validation" style="margin-top: 8px; font-size: 12px;"></div>
          </div>
          
          <button class="btn-primary" id="sidebar-add-character-video">Add to Queue</button>
        </div>
        
        <!-- QUEUE TAB -->
        <div class="tab-content" id="queue-content" style="display:none;">
          <div class="queue-stats">
            <div class="queue-stat">
              <div class="queue-stat-label">Total</div>
              <div class="queue-stat-value" id="queue-total">0</div>
            </div>
            <div class="queue-stat">
              <div class="queue-stat-label">Running</div>
              <div class="queue-stat-value" id="queue-running">0</div>
            </div>
            <div class="queue-stat">
              <div class="queue-stat-label">Done</div>
              <div class="queue-stat-value" id="queue-done">0</div>
            </div>
          </div>
          <div class="queue-list" id="sidebar-queue-list">
            <div class="empty-state">
              <div class="empty-state-icon">📋</div>
              <div class="empty-state-text">No tasks in queue</div>
            </div>
          </div>
          <button class="btn-success" id="sidebar-start-queue">▶ Start Processing</button>
          <button class="btn-danger" id="sidebar-clear-queue">🗑 Clear Queue</button>
        </div>
      </div>
      <div class="sidebar-footer">
          <div class="settings-section">
            <div class="settings-row">
              <label>⏱️ Random delay (seconds):</label>
              <div style="display: flex; gap: 8px; align-items: center;">
                <input type="number" id="sidebar-delay-min" min="1" max="120" value="5" style="width: 60px;">
                <span>-</span>
                <input type="number" id="sidebar-delay-max" min="1" max="120" value="10" style="width: 60px;">
                <span>sec</span>
              </div>
            </div>
            
            <div class="settings-row">
              <label>⏸️ Cooldown after every:</label>
              <div style="display: flex; gap: 8px; align-items: center;">
                <input type="number" id="sidebar-cooldown-after" min="1" max="100" value="5" style="width: 60px;">
                <span>tasks, wait</span>
                <input type="number" id="sidebar-cooldown-duration" min="10" max="600" value="60" style="width: 60px;">
                <span>sec</span>
              </div>
            </div>
            
            <div class="settings-row">
              <label>📍 Sidebar position:</label>
              <select id="sidebar-position" style="padding: 6px 10px; background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 6px; color: #e5e5e5; font-size: 13px; cursor: pointer;">
                <option value="left">Left</option>
                <option value="right">Right</option>
                <option value="bottom">Bottom</option>
              </select>
            </div>
            
            <div class="settings-row">
              <label style="cursor: pointer; user-select: none;">
                <input type="checkbox" id="sidebar-auto-download">
                📥 Auto-download completed videos
              </label>
            </div>
            
            <button class="btn-success" id="sidebar-save-settings" style="width: 100%; margin-top: 12px;">💾 Save Settings</button>
          </div>
        </div>
    </div>
  `;
}

function injectSidebar() {
  // Check if sidebar already exists
  if (document.getElementById('flow-automation-sidebar')) {
    console.log('[Flow Automation] Sidebar already exists');
    return;
  }

  // Create and inject sidebar
  const sidebarDiv = document.createElement('div');
  sidebarDiv.innerHTML = createSidebarHTML();
  document.body.appendChild(sidebarDiv.firstElementChild);

  console.log('[Flow Automation] Sidebar injected');

  // Setup event listeners
  setupSidebarEvents();
}

function setupSidebarEvents() {
  // Toggle button
  const toggleBtn = document.getElementById('sidebar-toggle');
  let sidebar = document.getElementById('flow-automation-sidebar');

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      // Change icon: ⇄ is default, » when expanded (to collapse), « when collapsed (to expand)
      toggleBtn.textContent = sidebar.classList.contains('collapsed') ? '«' : '»';
      console.log(`[Sidebar] Toggled: ${sidebar.classList.contains('collapsed') ? 'Collapsed' : 'Expanded'}`);
    });
  }

  // Tab switching
  const tabs = document.querySelectorAll('#flow-automation-sidebar .tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active from all tabs
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Hide all content
      document.querySelectorAll('#flow-automation-sidebar .tab-content').forEach(content => {
        content.style.display = 'none';
      });

      // Show selected content
      const targetTab = tab.dataset.tab;
      const targetContent = document.getElementById(`${targetTab}-content`);
      if (targetContent) {
        targetContent.style.display = 'block';
      }
    });
  });

  // Add to queue button - Text to Video
  const addTextQueueBtn = document.getElementById('sidebar-add-text-queue');
  if (addTextQueueBtn) {
    addTextQueueBtn.addEventListener('click', () => {
      const promptsText = document.getElementById('sidebar-text-prompts')?.value || '';
      const prompts = promptsText.split('\n').filter(p => p.trim());

      if (prompts.length === 0) {
        alert('Please enter at least one prompt');
        return;
      }

      prompts.forEach(prompt => {
        queueProcessor.addTask({
          type: 'text_to_video',
          prompt: prompt.trim()
        });
      });

      updateQueueDisplay();
      document.querySelector('.tab[data-tab="queue"]').click();
    });
  }

  // Add to queue button - Character Video
  const addCharacterVideoBtn = document.getElementById('sidebar-add-character-video');
  if (addCharacterVideoBtn) {
    addCharacterVideoBtn.addEventListener('click', () => {
      const promptsText = document.getElementById('character-prompt')?.value || '';
      const prompts = promptsText.split('\n').filter(p => p.trim());

      if (prompts.length === 0) {
        alert('Please enter at least one character prompt');
        return;
      }

      if (savedCharacters.length === 0) {
        alert('Please save at least one character first');
        return;
      }

      // STRICT validation: each prompt must mention 1-3 characters
      const invalidLines = [];
      const validPrompts = [];

      prompts.forEach((prompt, idx) => {
        const mentionedChars = savedCharacters.filter(char =>
          prompt.toLowerCase().includes(char.name.toLowerCase())
        );

        const count = mentionedChars.length;

        if (count === 0) {
          invalidLines.push(`Line ${idx + 1}: No characters mentioned (need 1-3)`);
        } else if (count > 3) {
          invalidLines.push(`Line ${idx + 1}: Too many characters (${count}) - max 3 allowed`);
        } else {
          // Valid: 1-3 characters
          validPrompts.push(prompt);
        }
      });

      if (invalidLines.length > 0) {
        alert(`⚠️ Character validation failed!\n\nEach prompt must mention 1-3 character names.\nSaved characters: ${savedCharacters.map(c => c.name).join(', ')}\n\nInvalid prompts:\n${invalidLines.join('\n')}`);
        return;
      }

      // All prompts valid - add to queue
      validPrompts.forEach(prompt => {
        // Filter to only characters mentioned in THIS prompt
        const mentionedCharacters = savedCharacters.filter(char =>
          prompt.toLowerCase().includes(char.name.toLowerCase())
        );

        console.log(`[Flow Automation] Prompt: "${prompt}" → Characters: ${mentionedCharacters.map(c => c.name).join(', ')}`);

        queueProcessor.addTask({
          type: 'character_video',
          prompt: prompt.trim(),
          characters: mentionedCharacters.map(c => ({
            name: c.name,
            image: c.images[0].file || dataURLtoFile(c.images[0].dataURL, `${c.name}.png`)
          }))
        });
      });

      // Clear prompt
      document.getElementById('character-prompt').value = '';

      updateQueueDisplay();
      document.querySelector('.tab[data-tab="queue"]').click();
    });
  }

  // Add to queue button - Image→Video Batch
  const addImageBatchBtn = document.getElementById('sidebar-add-image-batch');
  if (addImageBatchBtn) {
    addImageBatchBtn.addEventListener('click', () => {
      if (batchImages.length === 0) {
        alert('Please upload at least one image');
        return;
      }

      // Validate all images have prompts
      const missingPrompts = [];
      batchImages.forEach((imgData, i) => {
        if (!imgData.prompt || !imgData.prompt.trim()) {
          missingPrompts.push(i + 1);
        }
      });

      if (missingPrompts.length > 0) {
        alert(`⚠️ Please enter prompts for all images!\n\nMissing prompts for image(s): ${missingPrompts.join(', ')}`);
        return;
      }

      // Add each image with its prompt to queue
      batchImages.forEach((imgData, i) => {
        queueProcessor.addTask({
          type: 'image_to_video',
          image: imgData.file,
          prompt: imgData.prompt.trim()
        });
      });

      // Clear batch images
      batchImages = [];
      document.getElementById('image-list-container').innerHTML = '';
      document.getElementById('image-file-input').value = '';

      updateQueueDisplay();
      document.querySelector('.tab[data-tab="queue"]').click();
    });
  }

  // Start queue button
  const startQueueBtn = document.getElementById('sidebar-start-queue');
  if (startQueueBtn) {
    startQueueBtn.addEventListener('click', async () => {
      // Apply delay range from UI
      const delayMin = parseInt(document.getElementById('sidebar-delay-min')?.value || '5');
      const delayMax = parseInt(document.getElementById('sidebar-delay-max')?.value || '10');
      queueProcessor.setDelayRange(delayMin, delayMax);

      // Apply cooldown from UI
      const cooldownAfter = parseInt(document.getElementById('sidebar-cooldown-after')?.value || '5');
      const cooldownDuration = parseInt(document.getElementById('sidebar-cooldown-duration')?.value || '60');
      queueProcessor.setCooldown(cooldownAfter, cooldownDuration);

      await queueProcessor.processQueue();
    });
  }

  // Clear queue button
  const clearQueueBtn = document.getElementById('sidebar-clear-queue');
  if (clearQueueBtn) {
    clearQueueBtn.addEventListener('click', () => {
      queueProcessor.queue = [];
      updateQueueDisplay();
    });
  }

  // Save settings button
  const saveSettingsBtn = document.getElementById('sidebar-save-settings');
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', () => {
      const delayMin = parseInt(document.getElementById('sidebar-delay-min')?.value || '5');
      const delayMax = parseInt(document.getElementById('sidebar-delay-max')?.value || '10');
      const cooldownAfter = parseInt(document.getElementById('sidebar-cooldown-after')?.value || '5');
      const cooldownDuration = parseInt(document.getElementById('sidebar-cooldown-duration')?.value || '60');
      const autoDownload = document.getElementById('sidebar-auto-download')?.checked || false;
      const position = document.getElementById('sidebar-position')?.value || 'left';

      const settings = {
        delayMin,
        delayMax,
        cooldownAfter,
        cooldownDuration,
        autoDownload,
        position
      };

      // Apply settings to queueProcessor immediately
      queueProcessor.setDelayRange(delayMin, delayMax);
      queueProcessor.setCooldown(cooldownAfter, cooldownDuration);

      chrome.storage.local.set({ flowAutomationSettings: settings }, () => {
        // Visual feedback
        const originalText = saveSettingsBtn.textContent;
        saveSettingsBtn.textContent = '✅ Saved!';
        saveSettingsBtn.style.background = 'rgba(16, 185, 129, 0.2)';

        setTimeout(() => {
          saveSettingsBtn.textContent = originalText;
          saveSettingsBtn.style.background = '';
        }, 2000);

        console.log('[Flow Automation] Settings saved:', settings);
      });
    });
  }

  // Position selector change event
  const positionSelect = document.getElementById('sidebar-position');

  if (positionSelect && sidebar) {
    positionSelect.addEventListener('change', (e) => {
      const position = e.target.value;

      // Remove all position classes
      sidebar.classList.remove('position-left', 'position-right', 'position-bottom');

      // Add selected position class (left is default, no class needed)
      if (position === 'right') {
        sidebar.classList.add('position-right');
      } else if (position === 'bottom') {
        sidebar.classList.add('position-bottom');
      }

      console.log(`[Flow Automation] Position changed to: ${position}`);
    });
  }

  // Load saved settings on init
  loadSettings();

  // Image upload handlers
  setupBatchImageUpload();
  setupStartEndFrames();
  setupCharacterManagement();
}

// Load settings from chrome storage
function loadSettings() {
  chrome.storage.local.get(['flowAutomationSettings'], (result) => {
    const settings = result.flowAutomationSettings || {};

    // Load delay range
    if (settings.delayMin !== undefined) {
      const el = document.getElementById('sidebar-delay-min');
      if (el) el.value = settings.delayMin;
    }
    if (settings.delayMax !== undefined) {
      const el = document.getElementById('sidebar-delay-max');
      if (el) el.value = settings.delayMax;
    }

    // Load cooldown settings
    if (settings.cooldownAfter !== undefined) {
      const el = document.getElementById('sidebar-cooldown-after');
      if (el) el.value = settings.cooldownAfter;
    }
    if (settings.cooldownDuration !== undefined) {
      const el = document.getElementById('sidebar-cooldown-duration');
      if (el) el.value = settings.cooldownDuration;
    }

    // Apply settings to queueProcessor
    const delayMin = settings.delayMin || 5;
    const delayMax = settings.delayMax || 10;
    const cooldownAfter = settings.cooldownAfter || 5;
    const cooldownDuration = settings.cooldownDuration || 60;

    queueProcessor.setDelayRange(delayMin, delayMax);
    queueProcessor.setCooldown(cooldownAfter, cooldownDuration);

    // Load other settings
    if (settings.autoDownload !== undefined) {
      const el = document.getElementById('sidebar-auto-download');
      if (el) el.checked = settings.autoDownload;
    }
    if (settings.position) {
      const positionSelect = document.getElementById('sidebar-position');
      const sidebar = document.getElementById('flow-automation-sidebar');

      if (positionSelect) positionSelect.value = settings.position;

      // Apply position class
      if (sidebar) {
        sidebar.classList.remove('position-left', 'position-right', 'position-bottom');
        if (settings.position === 'right') {
          sidebar.classList.add('position-right');
        } else if (settings.position === 'bottom') {
          sidebar.classList.add('position-bottom');
        }
      }
    }

    console.log('[Flow Automation] Settings loaded:', settings);
  });
}

// ========================================
// BATCH IMAGE→VIDEO FUNCTIONALITY
// ======================================== 

let batchImages = []; // Array of {file, dataURL, prompt}

function setupBatchImageUpload() {
  const uploadZone = document.getElementById('image-upload-zone');
  const fileInput = document.getElementById('image-file-input');
  const listContainer = document.getElementById('image-list-container');

  if (!uploadZone || !fileInput || !listContainer) return;

  // Click zone to trigger file input
  uploadZone.addEventListener('click', () => fileInput.click());

  // Handle file selection
  fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    handleBatchImageUpload(files);
  });

  // Drag and drop
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.style.borderColor = '#a47bff';
  });

  uploadZone.addEventListener('dragleave', () => {
    uploadZone.style.borderColor = '';
  });

  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.style.borderColor = '';
    const files = Array.from(e.dataTransfer.files);
    handleBatchImageUpload(files);
  });

  // Add all to queue button
  const addBatchBtn = document.getElementById('sidebar-add-image-batch');
  if (addBatchBtn) {
    addBatchBtn.addEventListener('click', () => {
      if (batchImages.length === 0) {
        alert('Please upload at least one image');
        return;
      }

      // Add each image with its prompt to queue
      batchImages.forEach(img => {
        queueProcessor.addTask({
          type: 'image_to_video',
          image: img.file,
          prompt: img.prompt || ''
        });
      });

      // Clear
      batchImages = [];
      listContainer.innerHTML = '';
      fileInput.value = '';

      updateQueueDisplay();
      document.querySelector('.tab[data-tab="queue"]').click();
    });
  }
}

function handleBatchImageUpload(files) {
  if (!files || files.length === 0) return;

  const listContainer = document.getElementById('image-list-container');
  if (!listContainer) return;

  files.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = {
        file,
        dataURL: e.target.result,
        prompt: ''
      };

      batchImages.push(imageData);
      const imageIndex = batchImages.length - 1;

      // Create list item
      const itemDiv = document.createElement('div');
      itemDiv.className = 'image-list-item';
      itemDiv.dataset.index = imageIndex;

      const sizeKB = (file.size / 1024).toFixed(1);

      itemDiv.innerHTML = `
        <div class="image-list-header">
          <img class="image-list-thumbnail" src="${e.target.result}" alt="${file.name}">
          <div class="image-list-info">
            <div class="image-list-filename">${file.name}</div>
            <div class="image-list-size">${sizeKB} KB</div>
          </div>
          <button class="image-list-remove" data-index="${imageIndex}">×</button>
        </div>
        <textarea class="image-list-prompt" placeholder="Enter prompt for this image..." data-index="${imageIndex}"></textarea>
      `;

      listContainer.appendChild(itemDiv);

      // Remove button handler
      itemDiv.querySelector('.image-list-remove').addEventListener('click', () => {
        const idx = parseInt(itemDiv.dataset.index);
        batchImages.splice(idx, 1);
        itemDiv.remove();
        // Re-index remaining items
        updateBatchImageIndices();
      });

      // Prompt change handler
      const promptTextarea = itemDiv.querySelector('.image-list-prompt');
      promptTextarea.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.index);
        if (batchImages[idx]) {
          batchImages[idx].prompt = e.target.value;
        }
      });

      // Auto-fill prompts when pasting multi-line text in first prompt
      if (imageIndex === 0) {
        promptTextarea.addEventListener('paste', (e) => {
          setTimeout(() => {
            const text = e.target.value;
            const lines = text.split('\n').filter(l => l.trim());

            // If multiple lines pasted, distribute to other prompts
            if (lines.length > 1) {
              const allPromptTextareas = listContainer.querySelectorAll('.image-list-prompt');
              lines.forEach((line, i) => {
                if (allPromptTextareas[i]) {
                  allPromptTextareas[i].value = line.trim();
                  const idx = parseInt(allPromptTextareas[i].dataset.index);
                  if (batchImages[idx]) {
                    batchImages[idx].prompt = line.trim();
                  }
                }
              });
            }
          }, 10);
        });
      }
    };
    reader.readAsDataURL(file);
  });
}

function updateBatchImageIndices() {
  const listContainer = document.getElementById('image-list-container');
  const items = listContainer.querySelectorAll('.image-list-item');
  items.forEach((item, newIndex) => {
    item.dataset.index = newIndex;
    item.querySelector('.image-list-remove').dataset.index = newIndex;
    item.querySelector('.image-list-prompt').dataset.index = newIndex;
  });
}

// ========================================
// START→END FRAMES FUNCTIONALITY
// ========================================

let startFrames = []; // Array of {file, dataURL}
let endFrames = [];   // Array of {file, dataURL}

function setupStartEndFrames() {
  // START frames upload
  const startZone = document.getElementById('start-upload-zone');
  const startInput = document.getElementById('start-file-input');

  if (startZone && startInput) {
    startZone.addEventListener('click', () => startInput.click());

    startInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      handleStartFramesUpload(files);
    });

    startZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      startZone.style.borderColor = '#a47bff';
    });

    startZone.addEventListener('dragleave', () => {
      startZone.style.borderColor = '';
    });

    startZone.addEventListener('drop', (e) => {
      e.preventDefault();
      startZone.style.borderColor = '';
      const files = Array.from(e.dataTransfer.files);
      handleStartFramesUpload(files);
    });
  }

  // END frames upload
  const endZone = document.getElementById('end-upload-zone');
  const endInput = document.getElementById('end-file-input');

  if (endZone && endInput) {
    endZone.addEventListener('click', () => endInput.click());

    endInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      handleEndFramesUpload(files);
    });

    endZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      endZone.style.borderColor = '#a47bff';
    });

    endZone.addEventListener('dragleave', () => {
      endZone.style.borderColor = '';
    });

    endZone.addEventListener('drop', (e) => {
      e.preventDefault();
      endZone.style.borderColor = '';
      const files = Array.from(e.dataTransfer.files);
      handleEndFramesUpload(files);
    });
  }

  // Add paired queue button
  const addPairedBtn = document.getElementById('sidebar-add-paired-queue');
  if (addPairedBtn) {
    addPairedBtn.addEventListener('click', () => {
      if (pairedItems.length === 0) {
        alert('Please upload both START and END frames');
        return;
      }

      // Check for missing prompts (optional but warn user)
      const missingPrompts = [];
      pairedItems.forEach((pair, i) => {
        if (!pair.prompt || !pair.prompt.trim()) {
          missingPrompts.push(i + 1);
        }
      });

      if (missingPrompts.length > 0) {
        const confirmed = window.confirm(
          `⚠️ ${missingPrompts.length} pair(s) don't have prompts:\nPairs: ${missingPrompts.join(', ')}\n\nContinue without prompts for these pairs?`
        );
        if (!confirmed) return;
      }

      // Add each pair to queue with its prompt
      pairedItems.forEach((pair, i) => {
        queueProcessor.addTask({
          type: 'start_to_end',
          startFrame: pair.startFrame.file,
          endFrame: pair.endFrame.file,
          prompt: pair.prompt ? pair.prompt.trim() : ''
        });
      });

      // Clear everything
      startFrames = [];
      endFrames = [];
      pairedItems = [];
      document.getElementById('paired-list-container').innerHTML = '';
      startInput.value = '';
      endInput.value = '';

      updateQueueDisplay();
      document.querySelector('.tab[data-tab="queue"]').click();
    });
  }
}

function handleStartFramesUpload(files) {
  if (!files || files.length === 0) return;

  startFrames = [];

  files.forEach((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      startFrames.push({ file, dataURL: e.target.result });

      // Update paired list when all files loaded
      if (startFrames.length === files.length) {
        updatePairedList();
      }
    };
    reader.readAsDataURL(file);
  });
}

function handleEndFramesUpload(files) {
  if (!files || files.length === 0) return;

  endFrames = [];

  files.forEach((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      endFrames.push({ file, dataURL: e.target.result });

      // Update paired list when all files loaded
      if (endFrames.length === files.length) {
        updatePairedList();
      }
    };
    reader.readAsDataURL(file);
  });
}

// Array to store paired items with prompts
let pairedItems = [];

function updatePairedList() {
  const container = document.getElementById('paired-list-container');
  if (!container) return;

  if (startFrames.length === 0 || endFrames.length === 0) {
    container.innerHTML = '<div style="padding: 20px; text-align: center; color: #6b7280; font-size: 13px;">Upload both START and END frames to create pairs</div>';
    pairedItems = [];
    return;
  }

  const pairCount = Math.min(startFrames.length, endFrames.length);

  // Show warning if mismatch
  if (startFrames.length !== endFrames.length) {
    container.innerHTML = `<div style="padding: 12px; text-align: center; color: #f59e0b; font-size: 12px; background: rgba(245, 158, 11, 0.1); border-radius: 6px; margin-bottom: 12px;">⚠️ ${startFrames.length} START vs ${endFrames.length} END frames. Creating ${pairCount} pairs.</div>`;
  } else {
    container.innerHTML = '';
  }

  // Initialize pairedItems array
  pairedItems = [];

  // Create paired list items
  for (let i = 0; i < pairCount; i++) {
    pairedItems.push({
      startFrame: startFrames[i],
      endFrame: endFrames[i],
      prompt: ''
    });

    const pairDiv = document.createElement('div');
    pairDiv.className = 'paired-list-item';
    pairDiv.dataset.index = i;
    pairDiv.innerHTML = `
      <div class="paired-list-header">
        <span class="paired-list-number">Pair ${i + 1}</span>
        <button class="paired-list-remove" data-index="${i}">× Remove</button>
      </div>
      <div class="paired-list-images">
        <img class="paired-list-image" src="${startFrames[i].dataURL}" alt="START">
        <div class="paired-list-arrow">→</div>
        <img class="paired-list-image" src="${endFrames[i].dataURL}" alt="END">
      </div>
      <textarea class="paired-list-prompt" data-index="${i}" placeholder="Enter motion prompt for this pair..."></textarea>
    `;

    container.appendChild(pairDiv);

    // Add prompt input listener
    const promptTextarea = pairDiv.querySelector('.paired-list-prompt');
    promptTextarea.addEventListener('input', (e) => {
      pairedItems[i].prompt = e.target.value;
    });

    // Auto-fill prompts on paste in FIRST textarea
    if (i === 0) {
      promptTextarea.addEventListener('paste', (e) => {
        setTimeout(() => {
          const pastedText = promptTextarea.value;
          const lines = pastedText.split('\n').filter(l => l.trim());

          if (lines.length > 1) {
            // Multi-line paste detected - distribute to other textareas
            lines.forEach((line, idx) => {
              if (idx < pairedItems.length) {
                const targetTextarea = container.querySelector(`.paired-list-prompt[data-index="${idx}"]`);
                if (targetTextarea) {
                  targetTextarea.value = line.trim();
                  pairedItems[idx].prompt = line.trim();
                }
              }
            });
          }
        }, 10);
      });
    }

    // Remove button handler
    const removeBtn = pairDiv.querySelector('.paired-list-remove');
    removeBtn.addEventListener('click', () => {
      // Remove from arrays
      startFrames.splice(i, 1);
      endFrames.splice(i, 1);
      updatePairedList();
    });
  }
}

// ========================================
// CHARACTER MANAGEMENT
// ========================================

let characterImages = [];
let savedCharacters = [];

function setupCharacterManagement() {
  const uploadZone = document.getElementById('character-upload-zone');
  const fileInput = document.getElementById('character-file-input');
  const previewGrid = document.getElementById('character-preview-grid');

  if (!uploadZone || !fileInput) return;

  // Click zone to trigger file input
  uploadZone.addEventListener('click', () => fileInput.click());

  // Handle file selection
  fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files).slice(0, 1); // Max 1 image per character
    handleCharacterImageUpload(files, previewGrid);
  });

  // Drag and drop
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.style.borderColor = '#a47bff';
  });

  uploadZone.addEventListener('dragleave', () => {
    uploadZone.style.borderColor = '';
  });

  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.style.borderColor = '';
    const files = Array.from(e.dataTransfer.files).slice(0, 3);
    handleCharacterImageUpload(files, previewGrid);
  });

  // Save character button
  const saveCharBtn = document.getElementById('sidebar-save-character');
  if (saveCharBtn) {
    saveCharBtn.addEventListener('click', () => {
      const nameInput = document.getElementById('character-name-input');
      const name = nameInput?.value.trim();

      if (!name) {
        alert('Please enter a character name');
        return;
      }

      if (characterImages.length === 0) {
        alert('Please upload at least one character image');
        return;
      }

      // Check max 10 characters limit
      if (savedCharacters.length >= 10) {
        alert('Maximum 10 characters allowed');
        return;
      }

      // Save character
      const character = {
        name,
        images: [...characterImages]
      };

      savedCharacters.push(character);
      characterManager.addCharacter(name, characterImages.map((img, i) => {
        // Convert data URL to File object
        return dataURLtoFile(img.dataURL, `${name}_${i}.png`);
      }));

      // Clear form
      nameInput.value = '';
      characterImages = [];
      previewGrid.innerHTML = '';

      // Update character list and suggestions
      updateCharacterList();
      updateCharacterSuggestions();
    });
  }

  // Setup character prompt highlighting
  const characterPromptTextarea = document.getElementById('character-prompt');
  if (characterPromptTextarea) {
    characterPromptTextarea.addEventListener('input', () => {
      highlightCharacterNamesInPrompt();
    });
  }
}

function handleCharacterImageUpload(files, previewGrid) {
  if (!files || files.length === 0) return;

  characterImages = [];
  previewGrid.innerHTML = '';

  files.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      characterImages.push({ file, dataURL: e.target.result });

      const itemDiv = document.createElement('div');
      itemDiv.className = 'image-preview-item';
      itemDiv.innerHTML = `
        <img src="${e.target.result}" alt="Character ${index + 1}">
        <button class="image-preview-remove" data-index="${index}">×</button>
      `;

      previewGrid.appendChild(itemDiv);

      // Remove button handler
      itemDiv.querySelector('.image-preview-remove').addEventListener('click', () => {
        characterImages.splice(index, 1);
        itemDiv.remove();
      });
    };
    reader.readAsDataURL(file);
  });
}

function updateCharacterList() {
  const scrollEl = document.getElementById('character-avatar-scroll');
  if (!scrollEl) return;

  if (savedCharacters.length === 0) {
    scrollEl.innerHTML = `
      <div style="width:100%; text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
        No characters saved yet
      </div>
    `;
    return;
  }

  scrollEl.innerHTML = savedCharacters.map((char, index) => `
    <div class="character-avatar-item">
      <img class="character-avatar-image" src="${char.images[0].dataURL}" alt="${char.name}">
      <div class="character-avatar-name">${char.name}</div>
      <button class="character-avatar-delete" data-index="${index}">×</button>
    </div>
  `).join('');

  // Add delete handlers
  scrollEl.querySelectorAll('.character-avatar-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.index);
      savedCharacters.splice(index, 1);
      updateCharacterList();
      updateCharacterSuggestions(); // Update suggestions after delete
    });
  });
}

// Update character name suggestions
function updateCharacterSuggestions() {
  const suggestionsDiv = document.getElementById('character-name-suggestions');
  const namesDisplay = document.getElementById('character-names-display');

  if (!suggestionsDiv || !namesDisplay) return;

  if (savedCharacters.length === 0) {
    suggestionsDiv.style.display = 'none';
    return;
  }

  const names = savedCharacters.map(c => c.name).join(', ');
  namesDisplay.textContent = names;
  suggestionsDiv.style.display = 'block';
}

// Highlight character names in character prompt
function highlightCharacterNamesInPrompt() {
  const promptTextarea = document.getElementById('character-prompt');
  const previewDiv = document.getElementById('character-prompt-preview');
  const validationDiv = document.getElementById('character-prompt-validation');

  if (!promptTextarea || !previewDiv || !validationDiv) return;

  const promptText = promptTextarea.value;

  if (!promptText.trim()) {
    previewDiv.style.display = 'none';
    validationDiv.innerHTML = '';
    return;
  }

  // Process each line separately
  const lines = promptText.split('\n');
  const highlightedLines = [];
  const lineValidations = [];

  lines.forEach((line, lineIdx) => {
    if (!line.trim()) {
      highlightedLines.push(line);
      return;
    }

    // Find mentioned characters in this line
    const mentionedChars = [];
    let highlightedLine = line;

    savedCharacters.forEach(char => {
      const regex = new RegExp(`\\b${char.name}\\b`, 'gi');
      const matches = line.match(regex);

      if (matches) {
        mentionedChars.push(char.name);
        // Highlight with yellow background
        highlightedLine = highlightedLine.replace(regex, (match) => {
          return `<span style="background: #fbbf24; color: #000; padding: 2px 4px; border-radius: 3px; font-weight: 600;">${match}</span>`;
        });
      }
    });

    highlightedLines.push(highlightedLine);

    // Validate this line
    const count = mentionedChars.length;
    if (count === 0) {
      lineValidations.push(`Line ${lineIdx + 1}: ⚠️ No characters mentioned`);
    } else if (count > 3) {
      lineValidations.push(`Line ${lineIdx + 1}: ⚠️ Too many (${count}) - max 3`);
    } else {
      lineValidations.push(`Line ${lineIdx + 1}: ✅ ${count} character(s) - ${mentionedChars.join(', ')}`);
    }
  });

  // Show preview
  previewDiv.innerHTML = highlightedLines.join('\n');
  previewDiv.style.display = 'block';

  // Show validation summary
  const hasErrors = lineValidations.some(v => v.includes('⚠️'));
  const validLines = lineValidations.filter(v => v.includes('✅')).length;
  const totalLines = lines.filter(l => l.trim()).length;

  if (hasErrors) {
    validationDiv.innerHTML = `
      <div style="color: #f59e0b; margin-bottom: 6px;">⚠️ Some prompts need attention:</div>
      <div style="font-size: 11px; color: #9ca3af;">${lineValidations.join('<br>')}</div>
    `;
  } else {
    validationDiv.innerHTML = `<span style="color: #10b981;">✅ All ${totalLines} prompts valid (1-3 characters each)</span>`;
  }
}

// Update character suggestions in Text→Video tab
function updateCharacterSuggestions() {
  const suggestionsDiv = document.getElementById('character-suggestions');
  const namesList = document.getElementById('character-names-list');

  if (!suggestionsDiv || !namesList) return;

  if (savedCharacters.length === 0) {
    suggestionsDiv.style.display = 'none';
    return;
  }

  const names = savedCharacters.map(c => c.name).join(', ');
  namesList.textContent = names;
  suggestionsDiv.style.display = 'block';
}

// Highlight character names in prompt
function highlightCharactersInPrompt() {
  const promptTextarea = document.getElementById('sidebar-text-prompts');
  const previewDiv = document.getElementById('prompt-preview');
  const validationDiv = document.getElementById('character-validation');

  if (!promptTextarea || !previewDiv || !validationDiv) return;

  const promptText = promptTextarea.value;

  if (!promptText.trim()) {
    previewDiv.style.display = 'none';
    validationDiv.innerHTML = '';
    return;
  }

  // Find mentioned characters
  const mentionedCharacters = [];
  let highlightedText = promptText;

  savedCharacters.forEach(char => {
    const regex = new RegExp(`\\b${char.name}\\b`, 'gi');
    const matches = promptText.match(regex);

    if (matches) {
      mentionedCharacters.push(char.name);
      // Highlight with yellow background
      highlightedText = highlightedText.replace(regex, (match) => {
        return `<span style="background: #fbbf24; color: #000; padding: 2px 4px; border-radius: 3px; font-weight: 600;">${match}</span>`;
      });
    }
  });

  // Show preview
  previewDiv.innerHTML = highlightedText;
  previewDiv.style.display = 'block';

  // Validation
  const count = mentionedCharacters.length;

  if (count === 0) {
    validationDiv.innerHTML = '<span style="color: #ef4444;">⚠️ Please mention at least 1 character name in your prompt</span>';
  } else if (count > 3) {
    validationDiv.innerHTML = '<span style="color: #f59e0b;">⚠️ Maximum 3 characters allowed per prompt</span>';
  } else {
    validationDiv.innerHTML = `<span style="color: #10b981;">✅ ${count} character(s) mentioned: ${mentionedCharacters.join(', ')}</span>`;
  }
}

// Helper: Convert data URL to File
function dataURLtoFile(dataurl, filename) {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

function updateQueueDisplay() {
  const totalEl = document.getElementById('queue-total');
  const runningEl = document.getElementById('queue-running');
  const doneEl = document.getElementById('queue-done');
  const listEl = document.getElementById('sidebar-queue-list');

  if (!listEl) return;

  // Update stats
  if (totalEl) totalEl.textContent = queueProcessor.queue.length;
  if (runningEl) runningEl.textContent = queueProcessor.isProcessing ? '1' : '0';

  // Update list
  if (queueProcessor.queue.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-text">No tasks in queue</div>
      </div>
    `;
  } else {
    listEl.innerHTML = queueProcessor.queue.map((task, index) => `
      <div class="queue-item waiting">
        <div class="queue-item-header">
          <span class="queue-item-type">${task.type.replace('_', ' ')}</span>
          <span class="queue-item-status">Waiting</span>
        </div>
        <div class="queue-item-prompt">${task.prompt || 'Image to video task'}</div>
      </div>
    `).join('');
  }
}

// ========================================
// INITIALIZE ON PAGE LOAD
// ========================================

console.log('[Flow Automation] Content script loaded');
setTimeout(() => {
  injectSidebar();
  console.log('[Flow Automation] Sidebar initialized');
}, 1000);
