/*!
 * BBChat — n8n Chat Widget Library
 * https://github.com/YOUR_USERNAME/bb-chat
 *
 * Usage:
 *   <script src="chat.js"></script>
 *   <script>
 *     BBChat.init({
 *       webhookUrl: 'https://your-n8n.com/webhook/xxx/chat',
 *       resumeWebhookUrl: 'https://your-n8n.com/webhook/bbk-chat-resume'
 *     })
 *   </script>
 */
(function (global) {
  'use strict';

  // ─── ANALYTICS ─────────────────────────────────────────────────────────────
  const OPEN_TRACK_URL =
    'https://wox-automation.app.n8n.cloud/webhook/99538a32-402a-4cd7-9b64-d88c462fdeaf';

  // ─── DEFAULT CONFIG ────────────────────────────────────────────────────────
  const DEFAULTS = {
    webhookUrl:       '',
    resumeWebhookUrl: '',
    botName:          "Chat Assistant",
    welcomeMessage:   "Hi! 👋 How can I help you today?",
    placeholder:      "Type a message...",
    buttonText:       "Chat",
    position:         "bottom-right",
    primaryColor:     "#5BA4B5",
    buttonColor:      "#007D99",
    accentColor:      "#FAD02C",
    maxImages:        3,
    welcomeButtons:   [],
  };

  // ─── CSS ───────────────────────────────────────────────────────────────────
  const CSS = `
    #bbchat-btn {
      position: fixed;
      width: 60px;
      height: 60px;
      padding: 0;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.3s, box-shadow 0.3s;
      z-index: 9998;
      overflow: hidden;
    }

    #bbchat-btn:hover {
      transform: translateY(-2px) scale(1.05);
      box-shadow: 0 8px 20px rgba(0,0,0,0.25);
    }

    #bbchat-btn svg {
      width: 36px;
      height: 36px;
      flex-shrink: 0;
    }

    #bbchat-btn .bbchat-btn-text {
      display: none;
    }

    #bbchat-container {
      position: fixed;
      width: 480px;
      height: 530px;
      border-radius: 0;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      display: none;
      flex-direction: column;
      transition: all 0.3s;
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #D5E8EF;
    }

    #bbchat-container.bbchat-open {
      display: flex;
    }

    .bbchat-header {
      padding: 16px 20px;
      color: white;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }

    .bbchat-header h3 {
      font-size: 16px;
      font-weight: 700;
      margin: 0;
    }

    .bbchat-header-title-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .bbchat-header-title-wrap svg {
      width: 28px;
      height: 28px;
      flex-shrink: 0;
    }

    .bbchat-header-btns {
      display: flex;
      gap: 8px;
    }

    .bbchat-header-btns button {
      border: none;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s;
    }

    .bbchat-header-btns button:hover {
      transform: scale(1.05);
    }

    .bbchat-header-btns svg {
      width: 18px;
      height: 18px;
    }

    .bbchat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: #D5E8EF;
    }

    .bbchat-messages::-webkit-scrollbar {
      width: 4px;
    }

    .bbchat-messages::-webkit-scrollbar-thumb {
      background: #b0cdd6;
      border-radius: 4px;
    }

    .bbchat-msg {
      display: flex;
      animation: bbchat-slide 0.3s;
    }

    @keyframes bbchat-slide {
      from {
        opacity: 0;
        transform: translateY(10px);
      }

      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .bbchat-msg.user {
      justify-content: flex-end;
    }

    .bbchat-msg.bot {
      justify-content: flex-start;
    }

    .bbchat-bubble {
      max-width: 85%;
      padding: 12px 16px;
      border-radius: 12px;
      font-size: 14px;
      line-height: 1.5;
      font-weight: 400;
    }

    .bbchat-msg.bot .bbchat-bubble {
      background: white;
      color: #2C3E50;
      box-shadow: 0 2px 4px rgba(0,0,0,0.08);
    }

    .bbchat-msg.user .bbchat-bubble {
      color: white;
    }

    .bbchat-bubble a {
      text-decoration: underline;
      word-break: break-word;
    }

    .bbchat-bubble a:hover {
      text-decoration: none;
    }

    .bbchat-msg.bot .bbchat-bubble a {
      color: #5BA4B5;
    }

    .bbchat-msg.user .bbchat-bubble a {
      color: #FAD02C;
    }

    /* Quick replies */

    .bbchat-qr {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
      padding: 4px 0 2px;
      animation: bbchat-slide 0.3s;
    }

    .bbchat-qr-btn {
      padding: 7px 15px;
      border-radius: 999px;
      font-family: inherit;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      line-height: 1;
      white-space: nowrap;
      transition:
        background 0.15s,
        color 0.15s,
        transform 0.15s,
        box-shadow 0.15s;
    }

    .bbchat-qr-btn.primary {
      background: white;
    }

    .bbchat-qr-btn.primary:hover {
      color: white;
      transform: translateY(-1px);
    }

    .bbchat-qr-btn.secondary {
      background: white;
    }

    .bbchat-qr-btn.secondary:hover {
      transform: translateY(-1px);
    }

    /* Typing */

    .bbchat-typing {
      display: flex;
      gap: 3px;
      padding: 10px;
      background: #f0f0f0;
      border-radius: 10px;
      width: fit-content;
    }

    .bbchat-dot {
      width: 6px;
      height: 6px;
      background: #999;
      border-radius: 50%;
      animation: bbchat-bounce 1.4s infinite;
    }

    .bbchat-dot:nth-child(2) {
      animation-delay: 0.2s;
    }

    .bbchat-dot:nth-child(3) {
      animation-delay: 0.4s;
    }

    @keyframes bbchat-bounce {
      0%, 60%, 100% {
        transform: translateY(0);
      }

      30% {
        transform: translateY(-8px);
      }
    }

    /* File preview */

    .bbchat-file-preview {
      padding: 10px 14px;
      background: #f9f9f9;
      border-top: 1px solid #e0e0e0;
      display: none;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .bbchat-file-preview.show {
      display: flex;
    }

    .bbchat-file-preview-content {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
    }

    .bbchat-file-preview button {
      background: none;
      border: none;
      color: #ef4444;
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Input */

    .bbchat-input-wrap {
      padding: 16px 20px;
      display: flex;
      gap: 10px;
      align-items: center;
      position: relative;
      background: #D5E8EF;
      flex-shrink: 0;
    }

    .bbchat-input-wrap.drag-over {
      background: #e3f2fd;
      border-top: 2px dashed #2196f3;
    }

    .bbchat-drag-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(33,150,243,0.1);
      display: none;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      z-index: 10;
    }

    .bbchat-drag-overlay.show {
      display: flex;
    }

    .bbchat-drag-overlay span {
      background: white;
      padding: 14px 20px;
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-size: 14px;
      color: #2196f3;
      font-weight: 600;
    }

    .bbchat-attach-btn {
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s;
      flex-shrink: 0;
    }

    .bbchat-attach-btn:hover {
      transform: scale(1.1);
    }

    .bbchat-attach-btn svg {
      width: 22px;
      height: 22px;
    }

    #bbchat-input {
      flex: 1;
      padding: 10px 16px;
      border: none;
      border-radius: 20px;
      font-size: 14px;
      outline: none;
      transition: box-shadow 0.3s;
      background: white;
      color: #2C3E50;
      font-family: inherit;
    }

    .bbchat-send-btn {
      border: none;
      padding: 0;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s;
      flex-shrink: 0;
    }

    .bbchat-send-btn:hover {
      transform: scale(1.1);
    }

    .bbchat-send-btn svg {
      width: 22px;
      height: 22px;
    }

    .bbchat-file-input {
      display: none;
    }

    .bbchat-file-att {
      margin-top: 6px;
      font-size: 12px;
      opacity: 0.9;
    }

    /* Date picker */

    .dp-wrap {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.10);
      padding: 14px;
      width: 260px;
      animation: bbchat-slide 0.3s;
      font-family: inherit;
    }

    .dp-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }

    .dp-header span {
      font-size: 14px;
      font-weight: 700;
      color: #2C3E50;
    }

    .dp-nav {
      background: none;
      border: none;
      cursor: pointer;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #5BA4B5;
      font-size: 16px;
      transition: background 0.15s;
    }

    .dp-nav:hover {
      background: #e8f4f7;
    }

    .dp-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 3px;
    }

    .dp-day-label {
      text-align: center;
      font-size: 11px;
      font-weight: 700;
      color: #999;
      padding: 2px 0 5px;
    }

    .dp-day {
      text-align: center;
      padding: 6px 2px;
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
      border: none;
      background: none;
      color: #2C3E50;
      font-family: inherit;
      transition: background 0.12s, color 0.12s;
    }

    .dp-day:hover:not(.dp-empty):not(.dp-disabled) {
      background: #e8f4f7;
      color: #5BA4B5;
    }

    .dp-day.dp-today {
      font-weight: 800;
      color: #5BA4B5;
    }

    .dp-day.dp-selected {
      background: #5BA4B5;
      color: white;
      font-weight: 700;
    }

    .dp-day.dp-disabled {
      color: #ccc;
      cursor: not-allowed;
    }

    .dp-day.dp-booked {
      position: relative;
      color: #C77A00;
    }

    .dp-day.dp-booked::after {
      content: '';
      position: absolute;
      bottom: 3px;
      left: 50%;
      transform: translateX(-50%);
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: #E8A317;
    }

    .dp-day.dp-booked.dp-selected {
      color: white;
    }

    .dp-day.dp-booked.dp-selected::after {
      background: white;
    }

    .dp-booked-note {
      margin-top: 8px;
      padding: 6px 9px;
      border-radius: 8px;
      background: #FFF6E5;
      border: 1px solid #F0D08A;
      color: #8A5A00;
      font-size: 12px;
      line-height: 1.35;
    }

    .dp-day.dp-empty {
      cursor: default;
    }

    .dp-confirm {
      margin-top: 10px;
      width: 100%;
      padding: 8px;
      background: #5BA4B5;
      color: white;
      border: none;
      border-radius: 8px;
      font-family: inherit;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.15s;
      display: none;
    }

    .dp-confirm:hover {
      background: #4A93A4;
    }

    .dp-confirm.show {
      display: block;
    }

    /* Time picker */

    .tp-wrap {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.10);
      padding: 14px;
      width: 240px;
      animation: bbchat-slide 0.3s;
      font-family: inherit;
    }

    .tp-label {
      font-size: 13px;
      font-weight: 700;
      color: #2C3E50;
      margin-bottom: 12px;
    }

    .tp-row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 12px;
    }

    .tp-field {
      display: flex;
      flex-direction: column;
      gap: 3px;
      flex: 1;
    }

    .tp-field label {
      font-size: 10px;
      font-weight: 700;
      color: #999;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .tp-select {
      width: 100%;
      padding: 8px 10px;
      border: 2px solid #e0eef1;
      border-radius: 8px;
      font-family: inherit;
      font-size: 14px;
      font-weight: 600;
      color: #2C3E50;
      background: white;
      cursor: pointer;
      outline: none;
      appearance: none;
      -webkit-appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24'%3E%3Cpath fill='%235BA4B5' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 8px center;
      transition: border-color 0.15s;
    }

    .tp-select:focus {
      border-color: #5BA4B5;
    }

    .tp-ampm-wrap {
      display: flex;
      border-radius: 8px;
      overflow: hidden;
      border: 2px solid #e0eef1;
      margin-top: 16px;
    }

    .tp-ampm-btn {
      flex: 1;
      padding: 8px 0;
      border: none;
      background: white;
      font-family: inherit;
      font-size: 13px;
      font-weight: 700;
      color: #aaa;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }

    .tp-ampm-btn.active {
      background: #5BA4B5;
      color: white;
    }

    .tp-ampm-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    .tp-confirm {
      margin-top: 12px;
      width: 100%;
      padding: 8px;
      background: #5BA4B5;
      color: white;
      border: none;
      border-radius: 8px;
      font-family: inherit;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.15s;
    }

    .tp-confirm:hover {
      background: #4A93A4;
    }

    @media (max-width: 768px) {
      #bbchat-container {
        width: 100vw !important;
        height: 100vh !important;
        height: 100dvh !important;
        bottom: 0 !important;
        right: 0 !important;
        top: 0 !important;
        left: 0 !important;
        border-radius: 0 !important;
      }

      #bbchat-container.bbchat-open {
        display: flex !important;
        flex-direction: column !important;
      }

      #bbchat-btn {
        bottom: 20px !important;
        right: 20px !important;
      }

      .bbchat-messages {
        flex: 1 1 0 !important;
        min-height: 0 !important;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
      }

      .bbchat-input-wrap {
        flex-shrink: 0 !important;
        padding: 10px 14px !important;
        padding-bottom: max(10px, env(safe-area-inset-bottom)) !important;
      }

      .bbchat-file-preview {
        flex-shrink: 0 !important;
      }

      #bbchat-input {
        font-size: 16px;
      }
    }

    @media (min-width: 769px) and (max-width: 1024px) {
      #bbchat-container {
        width: 400px;
        height: 500px;
      }
    }
  `;

  // ─── HTML TEMPLATE ─────────────────────────────────────────────────────────
  function buildHTML(cfg) {
    return `
      <button id="bbchat-btn">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1068.91 1081">
          <path d="M608.33,542.25a173.53,173.53,0,0,1,1.35-50.84A174.48,174.48,0,0,1,404.22,267.58a408.29,408.29,0,0,0-45.8,2.9C135.41,297.17-23.77,499.59,2.92,722.6S232,1104.77,455,1078.08c200.39-24,349.22-189.84,358-385-3.56.68-7.16,1.21-10.81,1.65A174.4,174.4,0,0,1,608.33,542.25ZM83.47,616c10.16-14.07,20.83-23.69,31-16.32s16.08,28.9,6,43-30.74,12.91-40.92,5.54S73.34,630.05,83.47,616Zm54.66,222.48c-26.9,11.57-55.77-8-64.16-27.55s6.78-31.66,33.73-43.24,50.72-16.27,59.16,3.25S165.05,826.82,138.13,838.47ZM170.7,436.19c-9.32-30.75,15.57-46.38,58-59.26s79-15.87,88.32,14.88-12.13,83.67-54.51,96.53S180,467,170.7,436.19ZM290.61,626.47c-8.14,9.6-18.55,4.7-31.76-6.55s-21.92-22.67-13.76-32.25,30.13-13.67,43.33-2.41S298.79,616.92,290.61,626.47Zm-11,368.38c-8.16,9.6-18.58,4.68-31.78-6.58s-21.93-22.66-13.74-32.22,30.1-13.67,43.31-2.42S287.73,985.27,279.57,994.85ZM393.22,832.66c-9.88,32.08-40.54,31.08-84.76,17.5s-77.67-32.31-67.79-64.4S300,720.42,344.17,734,403.06,800.57,393.22,832.66Zm69.35-281.37c20.95-3.7,54,14.58,59.1,43.47s-20.58,52.43-41.52,56.12S450.9,637,445.79,608.11,441.6,555,462.57,551.29Zm21.32,307.47c-12.39,2.21-17.3-8.2-20.32-25.29s-2.46-31.43,9.93-33.62,31.92,8.63,34.94,25.71S496.28,856.58,483.89,858.76Zm41,127.07c-10.92,18.25-46.33,31.29-71.55,16.3S427.07,952.29,438,934s29.64-13.06,54.82,2S535.73,967.54,524.87,985.83ZM706.6,828.31c-9.07,50.31-65.3,73.48-101.82,66.88s-39.48-40.38-30.41-90.69,25.2-89.52,61.7-82.94S715.64,778,706.6,828.31ZM463,204.72a9.36,9.36,0,0,1,7.67-9.42,241.36,241.36,0,0,0,102.17-48.14,238.13,238.13,0,0,0,19.67-17.63A241.3,241.3,0,0,0,658.31,7.67a9.63,9.63,0,0,1,18.86,0A241.65,241.65,0,0,0,864.77,195.3a9.61,9.61,0,0,1,0,18.83A241.44,241.44,0,0,0,742.91,279.9c-.93.93-1.86,1.88-2.79,2.84a241,241,0,0,0-56.3,93.85,3,3,0,0,1,.25.25,2,2,0,0,0-.42.28,240.21,240.21,0,0,0-6.48,24.64,9.63,9.63,0,0,1-18.86,0c-.21-1-.41-2-.65-3A241.72,241.72,0,0,0,470.71,214.13,9.35,9.35,0,0,1,463,204.72Zm605.87,254a7,7,0,0,1-5.69,7A179.2,179.2,0,0,0,924,604.92a7.14,7.14,0,0,1-14,0A179.23,179.23,0,0,0,770.85,465.74a7.13,7.13,0,0,1,0-14A179,179,0,0,0,861.26,403a176.69,176.69,0,0,0,20.3-24.27A179,179,0,0,0,910,312.56a7.14,7.14,0,0,1,14,0,179.3,179.3,0,0,0,139.19,139.21A7,7,0,0,1,1068.91,458.74Z"
                fill="#FAD02C"/>
        </svg>
      </button>

      <div id="bbchat-container">

        <div class="bbchat-header" id="bbchat-header">

          <div class="bbchat-header-title-wrap">

            <svg xmlns="http://www.w3.org/2000/svg" viewBox="270 0 290 305">
              <path fill="#FAD02C"
                d="M455.15,84.65c-1.46-7.24,6.27-10.61,16.24-12.63,9.97-2.02,16.71-1.57,18.18,5.67,1.46,7.24-2.91,18.52-12.88,20.54-9.97,2.02-20.08-6.35-21.54-13.58ZM341.15,153.1c2.91-12.47-27.42-30.22-39.89-33.13-12.47-2.91-21.18,5.71-24.09,18.19-2.91,12.47,1.07,24.06,13.54,26.98,12.47,2.91,47.52.44,50.44-12.03ZM353.81,135.69c8.4-3.13,7.01-27.69,3.89-36.09-3.13-8.4-11.53-10.14-19.93-7.01-8.4,3.13-13.62,9.94-10.49,18.34,3.13,8.4,18.14,27.89,26.54,24.76ZM559.79,209.56c0,25.94-10.74,49.31-30.24,65.81-19.86,16.81-47.49,25.7-79.9,25.7-15.24,0-29.67-2.83-42.87-8.4-13.6-5.74-25.53-14.24-35.48-25.27-8.24-9.14-14.95-19.86-20.03-31.94-13.48-31.99-7.35-68.89,15.48-95.05h0s-1.16,31.22-1.16,31.22c0,12.6,1.26,24.24,3.68,34.84,9.84-9.29,24.36-21.32,43.92-33.41,20.15-12.45,45.63-20.53,66.51-25.54-6.46-1.63-13.37-2.68-20.65-3.09-.67.02-1.31.02-1.92.02-2.64,0-4.64-.13-5.77-.22h-67.84c-12.57-15.23-18.09-35.12-14.97-54.62.25-1.58.54-3.15.87-4.7,1.25-5.93,3.07-11.66,5.38-17.09-8.61-4.65-14.37-13.91-13.97-24.48.52-13.59,11.4-24.7,24.98-25.5,9.61-.57,18.2,3.98,23.3,11.17,1.87-1.04,3.78-2.02,5.75-2.92,11.42-5.23,24.26-7.88,38.16-7.88.26,0,.52,0,.77,0,.23-10.36,8.9-18.63,19.41-18.19,9.38.39,17.11,7.87,17.78,17.24.25,3.51-.48,6.83-1.93,9.72,2.44,1.3,4.8,2.75,7.06,4.33,11.67,8.14,20.45,19.73,24.73,32.62,3.96,11.95,4,24.51.12,36.31-3.36,10.19-9.64,19.6-18.35,27.56,34.88,14.61,57.19,44.61,57.19,81.77ZM480.83,111.99c14.51-10.81,20.07-25.34,15.25-39.85-4.6-13.86-19.7-27.85-43.06-27.85-19.39,0-35.26,6.86-45.9,19.84-11.18,13.64-15.87,33.57-12.89,54.01h57.72c2.39,0,4.75.06,7.09.17,6.37-.25,15.51-1.65,21.78-6.32ZM465.16,209.99c24.77-12.1,50.06-15.73,66.39-16.69-2.76-10.04-8.09-18.92-15.54-26.27-15.52,2.32-60,10.22-89.12,28.22-24.63,15.22-40.33,30.3-47.77,38.27,6.2,11.62,14.4,21.04,24.36,27.95,10.82-13.37,32.93-37.43,61.67-51.48ZM533,219.37c-13.82.83-35.57,3.88-56.39,14.05-20.77,10.15-37.97,27.22-48.31,39.09,6.67,1.63,13.8,2.47,21.35,2.47,46.73,0,78.32-21.51,83.35-55.62Z"/>
            </svg>

            <h3>${cfg.botName}</h3>

          </div>

          <div class="bbchat-header-btns">

            <button id="bbchat-close" title="Close">
              <svg viewBox="0 0 24 24" fill="${cfg.primaryColor}">
                <path d="M7 10l5 5 5-5z"/>
              </svg>
            </button>

          </div>

        </div>

        <div class="bbchat-messages" id="bbchat-messages"></div>

        <div class="bbchat-file-preview" id="bbchat-file-preview">

          <div
            class="bbchat-file-preview-content"
            id="bbchat-preview-content">
          </div>

          <button id="bbchat-remove-all">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>

        </div>

        <div class="bbchat-input-wrap" id="bbchat-input-wrap">

          <div class="bbchat-drag-overlay" id="bbchat-drag-overlay">
            <span>📷 Drop image here</span>
          </div>

          <input
            class="bbchat-file-input"
            id="bbchat-file-input"
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            multiple>

          <button
            class="bbchat-attach-btn"
            id="bbchat-attach"
            title="Attach image">

            <svg viewBox="0 0 24 24" fill="${cfg.accentColor}">
              <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/>
            </svg>

          </button>

          <input
            type="text"
            id="bbchat-input"
            placeholder="${cfg.placeholder}">

          <button
            class="bbchat-send-btn"
            id="bbchat-send"
            title="Send">

            <svg viewBox="0 0 24 24" fill="${cfg.primaryColor}">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>

          </button>

        </div>

      </div>
    `;
  }

  // ─── MARKDOWN ──────────────────────────────────────────────────────────────
  function parseMarkdown(text) {
    if (!text) return '';

    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    html = html.replace(
      /\[!\[([^\]]*)\]\(([^)]+)\)\]\(([^)]+)\)/g,
      '<a href="$3" target="_blank" rel="noopener noreferrer"><img src="$2" alt="$1" style="max-width:100%;height:auto;border-radius:8px;cursor:pointer;display:block;margin:8px 0;"></a>'
    );

    html = html.replace(
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      '<img src="$2" alt="$1" style="max-width:100%;height:auto;border-radius:8px;display:block;margin:8px 0;">'
    );

    html = html.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );

    html = html.replace(
      /\*\*([^*]+)\*\*/g,
      '<strong>$1</strong>'
    );

    html = html.replace(
      /__([^_]+)__/g,
      '<strong>$1</strong>'
    );

    html = html.replace(
      /\*([^*]+)\*/g,
      '<em>$1</em>'
    );

    html = html.replace(
      /(?<![\w])_([^_]+)_(?![\w])/g,
      '<em>$1</em>'
    );

    html = html.replace(/\n/g, '<br>');

    return html;
  }

  // ─── AUTO BUTTON DETECTION ─────────────────────────────────────────────────
  function extractAutoButtons(text) {
    const numbered = [
      ...text.matchAll(
        /^\s*\d+[\.\)]\s*\*{0,2}(.+?)\*{0,2}\s*$/gm
      )
    ];

    if (
      numbered.length >= 2 &&
      numbered.length <= 6
    ) {
      return numbered.map(
        m => m[1].replace(/\*+/g, '').trim()
      );
    }

    const bullets = [
      ...text.matchAll(
        /^\s*[-*]\s+\*{0,2}(.+?)\*{0,2}\s*$/gm
      )
    ];

    if (
      bullets.length >= 2 &&
      bullets.length <= 6
    ) {
      return bullets.map(
        m => m[1].replace(/\*+/g, '').trim()
      );
    }

    const boldOr = text.match(
      /\*\*([^*]+)\*\*\s+or\s+(?:an?\s+)?\*\*([^*]+)\*\*/i
    );

    if (boldOr) {
      return [
        boldOr[1].trim(),
        boldOr[2].trim()
      ];
    }

    const withDesc = text.match(
      /\b([A-Z][A-Za-z\s]{0,25}?)(?:\s*\([^)]*\))?\s+or\s+([A-Z][A-Za-z\s]{0,25}?)(?:\s*\([^)]*\))?[\?\.]?\s*$/
    );

    if (withDesc) {
      return [
        withDesc[1].trim(),
        withDesc[2].trim()
      ];
    }

    const slashOpts = text.match(
      /\(([A-Za-z][A-Za-z\s\-]*(?:\/[A-Za-z][A-Za-z\s\-]*)+)\)/
    );

    if (slashOpts) {
      return slashOpts[1]
        .split('/')
        .map(s => s.trim());
    }

    const yesNo = text.match(
      /\(?\b(Yes|No|Maybe)\b\s+or\s+\b(Yes|No|Maybe)\b\)?/i
    );

    if (yesNo) {
      return [
        yesNo[1].trim(),
        yesNo[2].trim()
      ];
    }

    const genericOr = text.match(
      /\b([A-Za-z][A-Za-z\s\-\/]{1,30}?)\s+or\s+([A-Za-z][A-Za-z\s\-\/]{1,30}?)[\?\!\.]?\s*$/
    );

    if (genericOr) {
      const a = genericOr[1].trim();
      const b = genericOr[2].trim();

      const fillers =
        /^(an?|the|it|this|that|more|less|very|just|also|and|but|or)$/i;

      if (
        !fillers.test(a) &&
        !fillers.test(b)
      ) {
        return [a, b];
      }
    }

    return [];
  }

  // ─── MAIN WIDGET ───────────────────────────────────────────────────────────
  function BBChatWidget(cfg) {
    this.cfg =
      Object.assign({}, DEFAULTS, cfg);

    this.messages = [];

    this.attachedFiles = [];

    this.sessionId = null;

    this.lastMessage = '';

    /*
     * EMAIL VERIFICATION STATE
     *
     * Only used for a first-time customer who has just
     * completed verification.
     */
    this.emailResumeRequired = false;

    this.emailResumeChecked = false;

    this.emailResumeStarted = false;

    this.verifiedEmail = '';

    this.resumeMockupUrl = '';

    if (!this.cfg.webhookUrl) {
      console.error(
        '[BBChat] webhookUrl is required. Example:\n' +
        'BBChat.init({ webhookUrl: "https://your-n8n.com/webhook/xxx/chat" })'
      );

      return;
    }

    this._injectStyles();

    this._injectHTML();

    this._applyColors();

    this._bindEvents();

    this._initSession();

    /*
     * Check whether THIS browser/session has just completed
     * first-time email verification.
     *
     * This runs in the background.
     */
    this._checkEmailVerificationResume();
  }

  // ─── STYLE INJECTION ───────────────────────────────────────────────────────
  BBChatWidget.prototype._injectStyles = function () {
    if (
      document.getElementById(
        'bbchat-styles'
      )
    ) {
      return;
    }

    const style =
      document.createElement('style');

    style.id =
      'bbchat-styles';

    style.textContent =
      CSS;

    document.head.appendChild(
      style
    );
  };

  // ─── HTML INJECTION ────────────────────────────────────────────────────────
  BBChatWidget.prototype._injectHTML = function () {
    const wrap =
      document.createElement('div');

    wrap.id =
      'bbchat-root';

    wrap.innerHTML =
      buildHTML(this.cfg);

    document.body.appendChild(
      wrap
    );

    const positions = {
      'bottom-right': {
        bottom: '20px',
        right: '20px',
        top: 'auto',
        left: 'auto'
      },

      'bottom-left': {
        bottom: '20px',
        left: '20px',
        top: 'auto',
        right: 'auto'
      },

      'top-right': {
        top: '20px',
        right: '20px',
        bottom: 'auto',
        left: 'auto'
      },

      'top-left': {
        top: '20px',
        left: '20px',
        bottom: 'auto',
        right: 'auto'
      },
    };

    const pos =
      positions[this.cfg.position] ||
      positions['bottom-right'];

    const btn =
      document.getElementById(
        'bbchat-btn'
      );

    const cont =
      document.getElementById(
        'bbchat-container'
      );

    Object.assign(
      btn.style,
      pos
    );

    Object.assign(
      cont.style,
      pos
    );
  };

  // ─── COLORS ────────────────────────────────────────────────────────────────
  BBChatWidget.prototype._applyColors = function () {
    const cfg =
      this.cfg;

    const btn =
      document.getElementById(
        'bbchat-btn'
      );

    const header =
      document.getElementById(
        'bbchat-header'
      );

    const input =
      document.getElementById(
        'bbchat-input'
      );

    const btnText =
      btn.querySelector(
        '.bbchat-btn-text'
      );

    btn.style.backgroundColor =
      cfg.buttonColor;

    header.style.backgroundColor =
      cfg.primaryColor;

    header
      .querySelector('h3')
      .style.color =
      cfg.accentColor;

    if (btnText) {
      btnText.style.color =
        cfg.accentColor;
    }

    input.addEventListener(
      'focus',
      () => {
        input.style.boxShadow =
          `0 0 0 2px ${cfg.primaryColor}`;
      }
    );

    input.addEventListener(
      'blur',
      () => {
        input.style.boxShadow =
          '';
      }
    );

    document
      .getElementById(
        'bbchat-close'
      )
      .style
      .backgroundColor =
      cfg.accentColor;
  };

  // ─── EVENTS ────────────────────────────────────────────────────────────────
  BBChatWidget.prototype._bindEvents = function () {
    const self =
      this;

    document
      .getElementById(
        'bbchat-btn'
      )
      .addEventListener(
        'click',
        () => self._open()
      );

    document
      .getElementById(
        'bbchat-close'
      )
      .addEventListener(
        'click',
        () => self._close()
      );

    document
      .getElementById(
        'bbchat-send'
      )
      .addEventListener(
        'click',
        () => self._send()
      );

    document
      .getElementById(
        'bbchat-attach'
      )
      .addEventListener(
        'click',
        () =>
          document
            .getElementById(
              'bbchat-file-input'
            )
            .click()
      );

    document
      .getElementById(
        'bbchat-remove-all'
      )
      .addEventListener(
        'click',
        () => self._clearFiles()
      );

    document
      .getElementById(
        'bbchat-file-input'
      )
      .addEventListener(
        'change',
        e => {
          Array
            .from(e.target.files)
            .forEach(
              f => self._addFile(f)
            );

          e.target.value =
            '';
        }
      );

    const input =
      document.getElementById(
        'bbchat-input'
      );

    input.addEventListener(
      'keypress',
      e => {
        if (
          e.key === 'Enter'
        ) {
          self._send();
        }
      }
    );

    input.addEventListener(
      'paste',
      e => {
        for (
          const item
          of e.clipboardData.items
        ) {
          if (
            item.type.indexOf(
              'image'
            ) !== -1
          ) {
            e.preventDefault();

            const file =
              item.getAsFile();

            if (file) {
              self._addFile(
                file
              );
            }
          }
        }
      }
    );

    this._setupDragDrop();
  };

  // ─── DRAG AND DROP ─────────────────────────────────────────────────────────
  BBChatWidget.prototype._setupDragDrop = function () {
    const self =
      this;

    const container =
      document.getElementById(
        'bbchat-container'
      );

    const inputWrap =
      document.getElementById(
        'bbchat-input-wrap'
      );

    const dragOverlay =
      document.getElementById(
        'bbchat-drag-overlay'
      );

    let dragCounter =
      0;

    [
      'dragenter',
      'dragover',
      'dragleave',
      'drop'
    ].forEach(
      ev =>
        container.addEventListener(
          ev,
          e => {
            e.preventDefault();
            e.stopPropagation();
          },
          false
        )
    );

    container.addEventListener(
      'dragenter',
      e => {
        dragCounter++;

        if (
          e.dataTransfer.types.includes(
            'Files'
          )
        ) {
          inputWrap.classList.add(
            'drag-over'
          );

          dragOverlay.classList.add(
            'show'
          );
        }
      }
    );

    container.addEventListener(
      'dragleave',
      () => {
        if (
          --dragCounter === 0
        ) {
          inputWrap.classList.remove(
            'drag-over'
          );

          dragOverlay.classList.remove(
            'show'
          );
        }
      }
    );

    container.addEventListener(
      'drop',
      e => {
        dragCounter =
          0;

        inputWrap.classList.remove(
          'drag-over'
        );

        dragOverlay.classList.remove(
          'show'
        );

        Array
          .from(
            e.dataTransfer.files
          )
          .forEach(
            f => self._addFile(f)
          );
      }
    );
  };

  // ─── SESSION ────────────────────────────────────────────────────────────────
  BBChatWidget.prototype._initSession = function () {
    let id =
      localStorage.getItem(
        'bbchat_session'
      );

    if (!id) {
      id =
        'session_' +
        Date.now() +
        '_' +
        Math
          .random()
          .toString(36)
          .substr(2, 9);

      localStorage.setItem(
        'bbchat_session',
        id
      );
    }

    this.sessionId =
      id;
  };

  // ─── EMAIL VERIFICATION RESUME CHECK ───────────────────────────────────────
  BBChatWidget.prototype._checkEmailVerificationResume =
    async function () {

      if (
        this.emailResumeChecked
      ) {
        return;
      }

      this.emailResumeChecked =
        true;

      /*
       * If resumeWebhookUrl was not configured,
       * the original chatbot still works exactly normally.
       */
      if (
        !this.cfg.resumeWebhookUrl ||
        !this.sessionId
      ) {
        return;
      }

      try {
        const separator =
          this.cfg.resumeWebhookUrl.includes('?')
            ? '&'
            : '?';

        const url =
          this.cfg.resumeWebhookUrl +
          separator +
          'sessionId=' +
          encodeURIComponent(
            this.sessionId
          );

        const response =
          await fetch(
            url,
            {
              method: 'GET',
              mode: 'cors',
              cache: 'no-store',
              headers: {
                'Accept':
                  'application/json'
              }
            }
          );

        if (!response.ok) {
          console.warn(
            '[BBChat] Resume check returned HTTP ' +
            response.status
          );

          return;
        }

        const raw =
          await response.text();

        let data;

        try {
          data =
            JSON.parse(raw);
        } catch (e) {
          console.warn(
            '[BBChat] Resume check did not return valid JSON.'
          );

          return;
        }

        /*
         * IMPORTANT:
         *
         * resume:false means:
         * - normal visit, OR
         * - email already verified previously
         *
         * The original BBK chatbot proceeds normally.
         */
        if (
          !data ||
          data.resume !== true
        ) {
          return;
        }

        /*
         * This specific session has JUST completed
         * first-time verification.
         */
        this.emailResumeRequired =
          true;

        if (data.email) {
          this.verifiedEmail =
            String(
              data.email
            );
        }

        if (data.mockupUrl) {
          this.resumeMockupUrl =
            String(
              data.mockupUrl
            );
        }

        /*
         * Automatically reopen the chatbot.
         */
        setTimeout(
          () => {
            this._open();
          },
          500
        );

      } catch (error) {
        /*
         * Never allow this check to stop the
         * normal chatbot from working.
         */
        console.warn(
          '[BBChat] Email resume check failed:',
          error
        );
      }
    };

  // ─── OPEN ───────────────────────────────────────────────────────────────────
  BBChatWidget.prototype._open = function () {
    document
      .getElementById(
        'bbchat-btn'
      )
      .style
      .display =
      'none';

    document
      .getElementById(
        'bbchat-container'
      )
      .classList
      .add(
        'bbchat-open'
      );

    this._trackOpen();

    /*
     * First-time customer who just returned
     * after successful email verification.
     */
    if (
      this.emailResumeRequired
    ) {
      if (
        !this.emailResumeStarted
      ) {
        this._resumeAfterEmailVerification();
      }

      return;
    }

    /*
     * ORIGINAL BEHAVIOR
     *
     * This is used for:
     * - normal new conversations
     * - customers whose email was already VERIFIED
     * - all normal BBK inquiry conversations
     */
    if (
      this.messages.length === 0
    ) {
      this._addMessage(
        this.cfg.welcomeMessage,
        'bot',
        [],
        this.cfg.welcomeButtons
      );
    }
  };

  // ─── RESUME AFTER EMAIL VERIFICATION ───────────────────────────────────────
  BBChatWidget.prototype._resumeAfterEmailVerification =
    async function () {

      if (
        this.emailResumeStarted
      ) {
        return;
      }

      this.emailResumeStarted =
        true;

      const input =
        document.getElementById(
          'bbchat-input'
        );

      const sendBtn =
        document.getElementById(
          'bbchat-send'
        );

      const attachBtn =
        document.getElementById(
          'bbchat-attach'
        );

      [
        input,
        sendBtn,
        attachBtn
      ].forEach(
        el => {
          el.disabled =
            true;

          el.style.opacity =
            '0.6';
        }
      );

      this._showTyping();

      /*
       * IMPORTANT:
       * This is an internal system message.
       * It is NOT shown as a user message.
       */
      const systemMessage =
        '[EMAIL_VERIFICATION_COMPLETE]';

      try {
        const response =
          await this._fetchWithTimeout(
            this.cfg.webhookUrl,
            {
              method: 'POST',
              mode: 'cors',

              headers: {
                'Content-Type':
                  'application/json',

                'Accept':
                  'application/json'
              },

              body:
                JSON.stringify({
                  message:
                    systemMessage,

                  text:
                    systemMessage,

                  input:
                    systemMessage,

                  chatInput:
                    systemMessage,

                  action:
                    'emailVerificationComplete',

                  isSystemEvent:
                    true,

                  emailValidated:
                    true,

                  email:
                    this.verifiedEmail ||
                    '',

                  mockupUrl:
                    this.resumeMockupUrl ||
                    '',

                  timestamp:
                    new Date()
                      .toISOString(),

                  sessionId:
                    this.sessionId,

                  history:
                    []
                })
            }
          );

        if (
          !response.ok
        ) {
          throw new Error(
            'HTTP ' +
            response.status
          );
        }

        const raw =
          await response.text();

        let data;

        try {
          data =
            JSON.parse(raw);
        } catch (e) {
          data = {
            output:
              raw
          };
        }

        const botText =
          this._extractResponse(
            data
          );

        const botButtons =
          Array.isArray(
            data.buttons
          )
            ? data.buttons
            : [];

        this._hideTyping();

        if (botText) {
          this._addMessage(
            botText,
            'bot',
            [],
            botButtons
          );

          this._checkRedirect(
            botText
          );

        } else {
          /*
           * Safe fallback in case n8n
           * returns no conversational response.
           */
          this._addMessage(
            'Your email is confirmed! ✨\n\n**Do you like this design?**',
            'bot',
            [],
            [
              'Yes',
              'No'
            ]
          );
        }

        this.emailResumeRequired =
          false;

      } catch (error) {
        this._hideTyping();

        console.error(
          '[BBChat] Unable to resume after email verification:',
          error
        );

        this._addMessage(
          'Your email has been confirmed! ✨ Please click **Continue** to keep going with your cookie inquiry.',
          'bot',
          [],
          [
            'Continue'
          ]
        );

      } finally {
        [
          input,
          sendBtn,
          attachBtn
        ].forEach(
          el => {
            el.disabled =
              false;

            el.style.opacity =
              '1';
          }
        );

        input.focus();
      }
    };

  // ─── ANALYTICS ─────────────────────────────────────────────────────────────
  BBChatWidget.prototype._trackOpen = function () {
    const d =
      new Date();

    const p =
      n =>
        String(n)
          .padStart(
            2,
            '0'
          );

    const datetime =
      `${d.getFullYear()}-` +
      `${p(d.getMonth() + 1)}-` +
      `${p(d.getDate())}` +
      `T${p(d.getHours())}:` +
      `${p(d.getMinutes())}:` +
      `${p(d.getSeconds())}`;

    try {
      fetch(
        OPEN_TRACK_URL,
        {
          method: 'POST',
          mode: 'cors',
          keepalive: true,

          headers: {
            'Content-Type':
              'application/json'
          },

          body:
            JSON.stringify({
              sessionID:
                this.sessionId,

              datetime
            })
        }
      )
        .catch(
          () => {}
        );

    } catch (e) {
      /*
       * Analytics should never break chat.
       */
    }
  };

  // ─── CLOSE ──────────────────────────────────────────────────────────────────
  BBChatWidget.prototype._close = function () {
    document
      .getElementById(
        'bbchat-btn'
      )
      .style
      .display =
      'flex';

    document
      .getElementById(
        'bbchat-container'
      )
      .classList
      .remove(
        'bbchat-open'
      );
  };

  // ─── ADD MESSAGE ───────────────────────────────────────────────────────────
  BBChatWidget.prototype._addMessage =
    function (
      text,
      sender,
      files,
      buttons
    ) {

      files =
        files || [];

      const messagesEl =
        document.getElementById(
          'bbchat-messages'
        );

      if (
        sender === 'user'
      ) {
        messagesEl
          .querySelectorAll(
            '.bbchat-qr'
          )
          .forEach(
            el => el.remove()
          );
      }

      const msgDiv =
        document.createElement(
          'div'
        );

      msgDiv.className =
        'bbchat-msg ' +
        sender;

      const bubble =
        document.createElement(
          'div'
        );

      bubble.className =
        'bbchat-bubble';

      if (
        sender === 'user'
      ) {
        bubble.style.backgroundColor =
          this.cfg.primaryColor;
      }

      const dpMatch =
        (
          sender === 'bot' &&
          text
        )
          ? text.match(
              /\[datepicker(?::([^\]]*))?\]/i
            )
          : null;

      const hasDatePicker =
        !!dpMatch;

      const bookedDates =
        (
          dpMatch &&
          dpMatch[1]
        )
          ? dpMatch[1]
              .split(',')
              .map(
                s => s.trim()
              )
              .filter(
                Boolean
              )
          : [];

      const hasTimePicker =
        sender === 'bot' &&
        text &&
        /\[timepicker\]/i
          .test(text);

      const cleanText =
        text
          ? text
              .replace(
                /\[datepicker(?::[^\]]*)?\]/gi,
                ''
              )
              .replace(
                /\[timepicker\]/gi,
                ''
              )
              .trim()
          : text;

      if (cleanText) {
        bubble.innerHTML =
          parseMarkdown(
            cleanText
          );
      }

      if (
        files.length > 0
      ) {
        const grid =
          document.createElement(
            'div'
          );

        grid.style.cssText =
          'display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;';

        files.forEach(
          file => {
            const wrap =
              document.createElement(
                'div'
              );

            wrap.className =
              'bbchat-file-att';

            if (
              file.type &&
              file.type.startsWith(
                'image/'
              )
            ) {
              const img =
                document.createElement(
                  'img'
                );

              img.style.cssText =
                'max-width:120px;max-height:120px;border-radius:6px;display:block;object-fit:cover;';

              const reader =
                new FileReader();

              reader.onload =
                e => {
                  img.src =
                    e.target.result;
                };

              reader.readAsDataURL(
                file
              );

              wrap.appendChild(
                img
              );

            } else {
              wrap.textContent =
                '📎 ' +
                file.name;
            }

            grid.appendChild(
              wrap
            );
          }
        );

        bubble.appendChild(
          grid
        );
      }

      msgDiv.appendChild(
        bubble
      );

      messagesEl.appendChild(
        msgDiv
      );

      if (
        hasDatePicker
      ) {
        const dpContainer =
          document.createElement(
            'div'
          );

        messagesEl.appendChild(
          dpContainer
        );

        this._renderDatePicker(
          dpContainer,
          bookedDates
        );
      }

      if (
        hasTimePicker
      ) {
        const tpContainer =
          document.createElement(
            'div'
          );

        messagesEl.appendChild(
          tpContainer
        );

        this._renderTimePicker(
          tpContainer
        );
      }

      /*
       * QUICK REPLIES
       */
      if (
        sender === 'bot'
      ) {
        const finalBtns =
          (
            buttons &&
            buttons.length > 0
          )
            ? buttons
            : extractAutoButtons(
                text || ''
              );

        if (
          finalBtns.length > 0
        ) {
          const self =
            this;

          const qrWrap =
            document.createElement(
              'div'
            );

          qrWrap.className =
            'bbchat-qr';

          finalBtns.forEach(
            (label, i) => {
              const btn =
                document.createElement(
                  'button'
                );

              btn.className =
                'bbchat-qr-btn ' +
                (
                  i % 2 === 0
                    ? 'primary'
                    : 'secondary'
                );

              btn.textContent =
                label;

              if (
                i % 2 === 0
              ) {
                btn.style.border =
                  `2px solid ${this.cfg.primaryColor}`;

                btn.style.color =
                  this.cfg.primaryColor;

                btn.addEventListener(
                  'mouseenter',
                  () => {
                    btn.style.background =
                      this.cfg.primaryColor;

                    btn.style.color =
                      'white';
                  }
                );

                btn.addEventListener(
                  'mouseleave',
                  () => {
                    btn.style.background =
                      'white';

                    btn.style.color =
                      this.cfg.primaryColor;
                  }
                );

              } else {
                btn.style.border =
                  `2px solid ${this.cfg.accentColor}`;

                btn.style.color =
                  '#8a6a00';

                btn.addEventListener(
                  'mouseenter',
                  () => {
                    btn.style.background =
                      this.cfg.accentColor;

                    btn.style.color =
                      '#5a4000';
                  }
                );

                btn.addEventListener(
                  'mouseleave',
                  () => {
                    btn.style.background =
                      'white';

                    btn.style.color =
                      '#8a6a00';
                  }
                );
              }

              btn.addEventListener(
                'click',
                () => {
                  messagesEl
                    .querySelectorAll(
                      '.bbchat-qr'
                    )
                    .forEach(
                      el =>
                        el.remove()
                    );

                  if (
                    label ===
                      '🔄 Try Again' &&
                    self.lastMessage
                  ) {
                    document
                      .getElementById(
                        'bbchat-input'
                      )
                      .value =
                      self.lastMessage;

                  } else {
                    document
                      .getElementById(
                        'bbchat-input'
                      )
                      .value =
                      label;
                  }

                  self._send();
                }
              );

              qrWrap.appendChild(
                btn
              );
            }
          );

          messagesEl.appendChild(
            qrWrap
          );
        }
      }

      this.messages.push({
        text,
        sender,
        files,
        timestamp:
          new Date()
      });

      this._scrollToBottom();
    };

  // ─── TYPING ────────────────────────────────────────────────────────────────
  BBChatWidget.prototype._showTyping = function () {
    const el =
      document.createElement(
        'div'
      );

    el.className =
      'bbchat-msg bot';

    el.id =
      'bbchat-typing';

    el.innerHTML =
      '<div class="bbchat-typing">' +
      '<div class="bbchat-dot"></div>' +
      '<div class="bbchat-dot"></div>' +
      '<div class="bbchat-dot"></div>' +
      '</div>';

    document
      .getElementById(
        'bbchat-messages'
      )
      .appendChild(
        el
      );

    this._scrollToBottom();
  };

  BBChatWidget.prototype._hideTyping = function () {
    document
      .getElementById(
        'bbchat-typing'
      )
      ?.remove();
  };

  BBChatWidget.prototype._scrollToBottom = function () {
    const el =
      document.getElementById(
        'bbchat-messages'
      );

    el.scrollTop =
      el.scrollHeight;
  };

  // ─── FILE HANDLING ─────────────────────────────────────────────────────────
  BBChatWidget.prototype._addFile = function (file) {
    const allowed = [
      'image/jpeg',
      'image/jpg',
      'image/png'
    ];

    if (
      this.attachedFiles.length >=
      this.cfg.maxImages
    ) {
      alert(
        `Maximum ${this.cfg.maxImages} images allowed`
      );

      return;
    }

    if (
      !allowed.includes(
        file.type.toLowerCase()
      )
    ) {
      alert(
        'Only JPG and PNG images are allowed'
      );

      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      alert(
        'Image must be less than 5MB'
      );

      return;
    }

    this.attachedFiles.push(
      file
    );

    this._renderFilePreviews();
  };

  BBChatWidget.prototype._clearFiles = function () {
    this.attachedFiles =
      [];

    document
      .getElementById(
        'bbchat-file-input'
      )
      .value =
      '';

    this._renderFilePreviews();
  };

  BBChatWidget.prototype._renderFilePreviews = function () {
    const self =
      this;

    const preview =
      document.getElementById(
        'bbchat-file-preview'
      );

    const content =
      document.getElementById(
        'bbchat-preview-content'
      );

    content.innerHTML =
      '';

    if (
      this.attachedFiles.length === 0
    ) {
      preview.classList.remove(
        'show'
      );

      return;
    }

    preview.classList.add(
      'show'
    );

    this.attachedFiles.forEach(
      (file, i) => {
        const item =
          document.createElement(
            'div'
          );

        item.style.cssText =
          'display:flex;align-items:center;gap:8px;margin-right:8px;';

        const thumb =
          document.createElement(
            'img'
          );

        thumb.style.cssText =
          'width:40px;height:40px;object-fit:cover;border-radius:6px;border:2px solid #e0e0e0;';

        const reader =
          new FileReader();

        reader.onload =
          e => {
            thumb.src =
              e.target.result;
          };

        reader.readAsDataURL(
          file
        );

        const rmBtn =
          document.createElement(
            'button'
          );

        rmBtn.innerHTML =
          '×';

        rmBtn.style.cssText =
          'background:#ef4444;color:white;border:none;border-radius:50%;width:18px;height:18px;cursor:pointer;font-size:14px;line-height:1;';

        rmBtn.onclick =
          () => {
            self.attachedFiles.splice(
              i,
              1
            );

            self._renderFilePreviews();
          };

        item.appendChild(
          thumb
        );

        item.appendChild(
          rmBtn
        );

        content.appendChild(
          item
        );
      }
    );
  };

  // ─── EXTRACT N8N RESPONSE ──────────────────────────────────────────────────
  BBChatWidget.prototype._extractResponse = function (data) {
    if (
      typeof data ===
      'string'
    ) {
      return data;
    }

    const fields = [
      'output',
      'response',
      'message',
      'text',
      'reply',
      'answer',
      'result',
      'data'
    ];

    for (
      const f
      of fields
    ) {
      if (
        data &&
        data[f]
      ) {
        if (
          typeof data[f] ===
          'string'
        ) {
          return data[f];
        }

        if (
          typeof data[f] ===
            'object' &&
          (
            data[f].text ||
            data[f].message
          )
        ) {
          return (
            data[f].text ||
            data[f].message
          );
        }
      }
    }

    if (
      Array.isArray(data) &&
      data.length > 0
    ) {
      return this._extractResponse(
        data[0]
      );
    }

    return null;
  };

  // ─── TIME PICKER ───────────────────────────────────────────────────────────
  BBChatWidget.prototype._renderTimePicker =
    function (anchorEl) {

      const self =
        this;

      const amHours = [
        '8',
        '9',
        '10',
        '11',
        '12'
      ];

      const pmHours = [
        '1',
        '2',
        '3',
        '4',
        '5'
      ];

      const minutes = [
        '00',
        '15',
        '30',
        '45'
      ];

      let selHour =
        '8';

      let selMin =
        '00';

      let selAmpm =
        'AM';

      const wrap =
        document.createElement(
          'div'
        );

      wrap.className =
        'tp-wrap';

      const title =
        document.createElement(
          'div'
        );

      title.className =
        'tp-label';

      title.textContent =
        'Select a time';

      wrap.appendChild(
        title
      );

      const row =
        document.createElement(
          'div'
        );

      row.className =
        'tp-row';

      const hourField =
        document.createElement(
          'div'
        );

      hourField.className =
        'tp-field';

      const hourLabel =
        document.createElement(
          'label'
        );

      hourLabel.textContent =
        'Hour';

      const hourSel =
        document.createElement(
          'select'
        );

      hourSel.className =
        'tp-select';

      amHours.forEach(
        h => {
          const opt =
            document.createElement(
              'option'
            );

          opt.value =
            h;

          opt.textContent =
            h;

          if (
            h === selHour
          ) {
            opt.selected =
              true;
          }

          hourSel.appendChild(
            opt
          );
        }
      );

      hourSel.addEventListener(
        'change',
        () => {
          selHour =
            hourSel.value;

          updateConfirm();
        }
      );

      hourField.appendChild(
        hourLabel
      );

      hourField.appendChild(
        hourSel
      );

      const minField =
        document.createElement(
          'div'
        );

      minField.className =
        'tp-field';

      const minLabel =
        document.createElement(
          'label'
        );

      minLabel.textContent =
        'Minute';

      const minSel =
        document.createElement(
          'select'
        );

      minSel.className =
        'tp-select';

      minutes.forEach(
        m => {
          const opt =
            document.createElement(
              'option'
            );

          opt.value =
            m;

          opt.textContent =
            m;

          if (
            m === selMin
          ) {
            opt.selected =
              true;
          }

          minSel.appendChild(
            opt
          );
        }
      );

      minSel.addEventListener(
        'change',
        () => {
          selMin =
            minSel.value;

          updateConfirm();
        }
      );

      minField.appendChild(
        minLabel
      );

      minField.appendChild(
        minSel
      );

      row.appendChild(
        hourField
      );

      row.appendChild(
        minField
      );

      wrap.appendChild(
        row
      );

      const ampmWrap =
        document.createElement(
          'div'
        );

      ampmWrap.className =
        'tp-ampm-wrap';

      const amBtn =
        document.createElement(
          'button'
        );

      amBtn.className =
        'tp-ampm-btn active';

      amBtn.textContent =
        'AM';

      const pmBtn =
        document.createElement(
          'button'
        );

      pmBtn.className =
        'tp-ampm-btn';

      pmBtn.textContent =
        'PM';

      function updateHourOptions(
        ampm
      ) {
        hourSel.innerHTML =
          '';

        (
          ampm === 'AM'
            ? amHours
            : pmHours
        ).forEach(
          h => {
            const opt =
              document.createElement(
                'option'
              );

            opt.value =
              h;

            opt.textContent =
              h;

            hourSel.appendChild(
              opt
            );
          }
        );

        selHour =
          hourSel.value;

        updateConfirm();
      }

      amBtn.addEventListener(
        'click',
        () => {
          selAmpm =
            'AM';

          amBtn.classList.add(
            'active'
          );

          pmBtn.classList.remove(
            'active'
          );

          updateHourOptions(
            'AM'
          );
        }
      );

      pmBtn.addEventListener(
        'click',
        () => {
          selAmpm =
            'PM';

          pmBtn.classList.add(
            'active'
          );

          amBtn.classList.remove(
            'active'
          );

          updateHourOptions(
            'PM'
          );
        }
      );

      ampmWrap.appendChild(
        amBtn
      );

      ampmWrap.appendChild(
        pmBtn
      );

      wrap.appendChild(
        ampmWrap
      );

      const confirm =
        document.createElement(
          'button'
        );

      confirm.className =
        'tp-confirm';

      function updateConfirm() {
        confirm.textContent =
          'Confirm — ' +
          selHour +
          ':' +
          selMin +
          ' ' +
          selAmpm;
      }

      updateConfirm();

      confirm.addEventListener(
        'click',
        () => {
          wrap.remove();

          document
            .getElementById(
              'bbchat-input'
            )
            .value =
            selHour +
            ':' +
            selMin +
            ' ' +
            selAmpm;

          self._send();
        }
      );

      wrap.appendChild(
        confirm
      );

      anchorEl.appendChild(
        wrap
      );
    };

  // ─── DATE PICKER ───────────────────────────────────────────────────────────
  BBChatWidget.prototype._renderDatePicker =
    function (
      anchorEl,
      bookedDates
    ) {

      const self =
        this;

      const today =
        new Date();

      let viewYear =
        today.getFullYear();

      let viewMonth =
        today.getMonth();

      let selected =
        null;

      const bookedSet =
        new Set(
          Array.isArray(
            bookedDates
          )
            ? bookedDates
            : []
        );

      const ymd =
        date =>
          date.getFullYear() +
          '-' +
          String(
            date.getMonth() + 1
          ).padStart(
            2,
            '0'
          ) +
          '-' +
          String(
            date.getDate()
          ).padStart(
            2,
            '0'
          );

      const DAYS = [
        'Su',
        'Mo',
        'Tu',
        'We',
        'Th',
        'Fr',
        'Sa'
      ];

      const MONTHS = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December'
      ];

      const wrap =
        document.createElement(
          'div'
        );

      wrap.className =
        'dp-wrap';

      function build() {
        wrap.innerHTML =
          '';

        const header =
          document.createElement(
            'div'
          );

        header.className =
          'dp-header';

        const prev =
          document.createElement(
            'button'
          );

        prev.className =
          'dp-nav';

        prev.innerHTML =
          '&#8249;';

        prev.onclick =
          () => {
            viewMonth--;

            if (
              viewMonth < 0
            ) {
              viewMonth =
                11;

              viewYear--;
            }

            build();
          };

        const label =
          document.createElement(
            'span'
          );

        label.textContent =
          MONTHS[viewMonth] +
          ' ' +
          viewYear;

        const next =
          document.createElement(
            'button'
          );

        next.className =
          'dp-nav';

        next.innerHTML =
          '&#8250;';

        next.onclick =
          () => {
            viewMonth++;

            if (
              viewMonth > 11
            ) {
              viewMonth =
                0;

              viewYear++;
            }

            build();
          };

        header.appendChild(
          prev
        );

        header.appendChild(
          label
        );

        header.appendChild(
          next
        );

        wrap.appendChild(
          header
        );

        const grid =
          document.createElement(
            'div'
          );

        grid.className =
          'dp-grid';

        DAYS.forEach(
          d => {
            const lbl =
              document.createElement(
                'div'
              );

            lbl.className =
              'dp-day-label';

            lbl.textContent =
              d;

            grid.appendChild(
              lbl
            );
          }
        );

        const firstDay =
          new Date(
            viewYear,
            viewMonth,
            1
          ).getDay();

        const daysInMonth =
          new Date(
            viewYear,
            viewMonth + 1,
            0
          ).getDate();

        const todayMid =
          new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate()
          );

        for (
          let i = 0;
          i < firstDay;
          i++
        ) {
          const e =
            document.createElement(
              'div'
            );

          e.className =
            'dp-day dp-empty';

          grid.appendChild(
            e
          );
        }

        for (
          let d = 1;
          d <= daysInMonth;
          d++
        ) {
          const btn =
            document.createElement(
              'button'
            );

          btn.className =
            'dp-day';

          btn.textContent =
            d;

          const cellDate =
            new Date(
              viewYear,
              viewMonth,
              d
            );

          if (
            cellDate <
            todayMid
          ) {
            btn.classList.add(
              'dp-disabled'
            );

          } else {
            if (
              cellDate.toDateString() ===
              todayMid.toDateString()
            ) {
              btn.classList.add(
                'dp-today'
              );
            }

            if (
              bookedSet.has(
                ymd(cellDate)
              )
            ) {
              btn.classList.add(
                'dp-booked'
              );
            }

            if (
              selected &&
              cellDate.toDateString() ===
              selected.toDateString()
            ) {
              btn.classList.add(
                'dp-selected'
              );
            }

            btn.onclick =
              () => {
                selected =
                  cellDate;

                build();
              };
          }

          grid.appendChild(
            btn
          );
        }

        wrap.appendChild(
          grid
        );

        if (
          selected &&
          bookedSet.has(
            ymd(selected)
          )
        ) {
          const note =
            document.createElement(
              'div'
            );

          note.className =
            'dp-booked-note';

          note.textContent =
            '📌 This date is already booked, but you can still select it — all orders are subject to BBK\'s approval.';

          wrap.appendChild(
            note
          );
        }

        const confirm =
          document.createElement(
            'button'
          );

        confirm.className =
          'dp-confirm' +
          (
            selected
              ? ' show'
              : ''
          );

        confirm.textContent =
          selected
            ? 'Confirm — ' +
              selected.toLocaleDateString(
                'en-US',
                {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                }
              )
            : 'Select a date';

        confirm.onclick =
          () => {
            if (
              !selected
            ) {
              return;
            }

            wrap.remove();

            const formatted =
              selected.toLocaleDateString(
                'en-US',
                {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                }
              );

            document
              .getElementById(
                'bbchat-input'
              )
              .value =
              formatted;

            self._send();
          };

        wrap.appendChild(
          confirm
        );
      }

      build();

      anchorEl.appendChild(
        wrap
      );
    };

  // ─── SQUARE AUTO REDIRECT ──────────────────────────────────────────────────
  BBChatWidget.prototype._checkRedirect = function (text) {
    if (!text) {
      return;
    }

    const match =
      text.match(
        /https:\/\/app\.squareup\.com\/pay-invoice\/[^\s"')>]*/
      );

    if (match) {
      setTimeout(
        () => {
          window.open(
            match[0],
            '_blank'
          );
        },
        800
      );
    }
  };

  // ─── FETCH WITH TIMEOUT ────────────────────────────────────────────────────
  BBChatWidget.prototype._fetchWithTimeout =
    async function (
      url,
      options,
      ms
    ) {

      ms =
        ms ||
        600000;

      const controller =
        new AbortController();

      const timer =
        setTimeout(
          () =>
            controller.abort(),
          ms
        );

      try {
        const res =
          await fetch(
            url,
            Object.assign(
              {},
              options,
              {
                signal:
                  controller.signal
              }
            )
          );

        clearTimeout(
          timer
        );

        return res;

      } catch (err) {
        clearTimeout(
          timer
        );

        if (
          err.name ===
          'AbortError'
        ) {
          throw new Error(
            'Request timed out — the workflow took too long to respond.'
          );
        }

        throw err;
      }
    };

  // ─── SEND MESSAGE ──────────────────────────────────────────────────────────
  BBChatWidget.prototype._send =
    async function () {

      const input =
        document.getElementById(
          'bbchat-input'
        );

      const sendBtn =
        document.getElementById(
          'bbchat-send'
        );

      const attachBtn =
        document.getElementById(
          'bbchat-attach'
        );

      const message =
        input.value.trim();

      if (
        !message &&
        this.attachedFiles.length === 0
      ) {
        return;
      }

      const filesToSend =
        [
          ...this.attachedFiles
        ];

      this.lastMessage =
        message;

      const previousBotMessage =
        [
          ...this.messages
        ]
          .reverse()
          .find(
            m =>
              m.sender ===
              'bot'
          );

      const previousBotText =
        previousBotMessage?.text ||
        '';

      this._addMessage(
        message,
        'user',
        filesToSend
      );

      input.value =
        '';

      this._clearFiles();

      const normalizedMessage =
        message
          .trim()
          .toLowerCase();

      const isReferencePhotoStep =
        /do you have a photo or inspiration/i
          .test(previousBotText) ||

        /do you have a photo or inspiration you'd like us to see/i
          .test(previousBotText) ||

        /upload it here or paste a google drive link/i
          .test(previousBotText) ||

        /if not,\s*just type skip/i
          .test(previousBotText) ||

        /upload your reference photo/i
          .test(previousBotText) ||

        /upload the logo you'd like us to use/i
          .test(previousBotText) ||

        /reference photo now/i
          .test(previousBotText) ||

        /paste the image'?s google drive link/i
          .test(previousBotText) ||

        /paste the image.*google drive link/i
          .test(previousBotText);

      const isMockupApprovalStep =
        /does this feel like the right direction/i
          .test(previousBotText) ||

        /do you like this design/i
          .test(previousBotText) ||

        /do you like the design/i
          .test(previousBotText);

      if (
        normalizedMessage ===
          'skip' &&
        isReferencePhotoStep &&
        !isMockupApprovalStep
      ) {
        this._addMessage(
          "Got it! ✨ We’ll create a first look for your cookies now. 🍪",
          'bot'
        );
      }

      [
        input,
        sendBtn,
        attachBtn
      ].forEach(
        el => {
          el.disabled =
            true;

          el.style.opacity =
            '0.6';
        }
      );

      this._showTyping();

      const history =
        this.messages
          .slice(-5)
          .map(
            m => ({
              role:
                m.sender ===
                  'user'
                  ? 'user'
                  : 'assistant',

              content:
                m.text
            })
          );

      try {
        let response;

        if (
          filesToSend.length > 0
        ) {
          const fd =
            new FormData();

          [
            'message',
            'text',
            'input',
            'chatInput'
          ].forEach(
            k =>
              fd.append(
                k,
                message
              )
          );

          fd.append(
            'timestamp',
            new Date()
              .toISOString()
          );

          fd.append(
            'sessionId',
            this.sessionId
          );

          fd.append(
            'history',
            JSON.stringify(
              history
            )
          );

          filesToSend.forEach(
            f =>
              fd.append(
                'files',
                f,
                f.name
              )
          );

          response =
            await this._fetchWithTimeout(
              this.cfg.webhookUrl,
              {
                method:
                  'POST',

                mode:
                  'cors',

                body:
                  fd
              }
            );

        } else {
          response =
            await this._fetchWithTimeout(
              this.cfg.webhookUrl,
              {
                method:
                  'POST',

                mode:
                  'cors',

                headers: {
                  'Content-Type':
                    'application/json',

                  'Accept':
                    'application/json'
                },

                body:
                  JSON.stringify({
                    message,
                    text:
                      message,
                    input:
                      message,
                    chatInput:
                      message,

                    action:
                      'sendMessage',

                    timestamp:
                      new Date()
                        .toISOString(),

                    sessionId:
                      this.sessionId,

                    history
                  })
              }
            );
        }

        if (
          !response.ok
        ) {
          throw new Error(
            'HTTP ' +
            response.status
          );
        }

        const raw =
          await response.text();

        let data;

        try {
          data =
            JSON.parse(
              raw
            );
        } catch (e) {
          data = {
            output:
              raw
          };
        }

        const botText =
          this._extractResponse(
            data
          );

        const botButtons =
          Array.isArray(
            data.buttons
          )
            ? data.buttons
            : [];

        const n8nError =
          data.error ||
          data.errorMessage ||
          (
            data.message &&
            /error|fail|exception/i
              .test(
                data.message
              )
              ? data.message
              : null
          );

        setTimeout(
          () => {
            this._hideTyping();

            const looksLikeError =
              botText &&
              /Error/
                .test(
                  botText
                );

            if (
              n8nError
            ) {
              this._addMessage(
                '⚠️ Oops! Something went wrong. Please try again.',
                'bot',
                [],
                [
                  '🔄 Try Again'
                ]
              );

            } else if (
              looksLikeError
            ) {
              this._addMessage(
                botText,
                'bot',
                [],
                [
                  '🔄 Try Again'
                ]
              );

            } else if (
              botText
            ) {
              this._addMessage(
                botText,
                'bot',
                [],
                botButtons
              );

              this._checkRedirect(
                botText
              );

            } else {
              this._addMessage(
                "I received your message but couldn't process the response.",
                'bot',
                [],
                [
                  '🔄 Try Again'
                ]
              );
            }

            [
              input,
              sendBtn,
              attachBtn
            ].forEach(
              el => {
                el.disabled =
                  false;

                el.style.opacity =
                  '1';
              }
            );

            input.focus();
          },
          500
        );

      } catch (err) {
        setTimeout(
          () => {
            this._hideTyping();

            this._addMessage(
              '⚠️ Oops! Something went wrong. Please try again.',
              'bot',
              [],
              [
                '🔄 Try Again'
              ]
            );

            [
              input,
              sendBtn,
              attachBtn
            ].forEach(
              el => {
                el.disabled =
                  false;

                el.style.opacity =
                  '1';
              }
            );

            input.focus();
          },
          500
        );
      }
    };

  // ─── PUBLIC API ────────────────────────────────────────────────────────────
  global.BBChat = {

    init:
      function (options) {

        if (
          document.readyState ===
          'loading'
        ) {
          document.addEventListener(
            'DOMContentLoaded',
            () =>
              new BBChatWidget(
                options
              )
          );

        } else {
          new BBChatWidget(
            options
          );
        }
      }
  };

}(window));