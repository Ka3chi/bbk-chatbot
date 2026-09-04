/*!
 * BBChat — Bug & Bear's Kitchen Cookie Wizard
 * v5 — strict session lifecycle + email-verification resume
 *
 * Core rule:
 * - Normal/abandoned/completed inquiries are NOT persisted across page exits.
 * - A session is persisted ONLY after the bot returns [WAITING_VERIFICATION].
 * - That persisted session may resume ONLY when BBK - Resume Chat returns:
 *     resume=true
 *     resumeReason=EMAIL_VERIFICATION
 *     nextStep=FIRST_LOOK_APPROVAL
 * - After a successful resume, the stored browser session is cleared again.
 */
(function (global) {
  'use strict';

  const OPEN_TRACK_URL =
    'https://wideout.app.n8n.cloud/webhook/99538a32-402a-4cd7-9b64-d88c462fdeaf';

  const STORAGE = {
    session: 'bbchat_session',
    waiting: 'bbchat_waiting_verification',
    waitingSince: 'bbchat_waiting_since'
  };

  const DEFAULTS = {
    webhookUrl: '',
    resumeWebhookUrl: '',
    resumeCompleteWebhookUrl: '',

    botName: 'Chat Assistant',

    welcomeMessage:
      'Hi! 👋 How can I help you today?',

    placeholder:
      'Type a message...',

    position:
      'bottom-right',

    primaryColor:
      '#5BA4B5',

    buttonColor:
      '#007D99',

    accentColor:
      '#FAD02C',

    maxImages:
      3,

    welcomeButtons:
      [],

    verificationHoldMs:
      24 * 60 * 60 * 1000
  };

  const CSS = `
    #bbchat-btn {
      position: fixed;
      width: 60px;
      height: 60px;
      padding: 0;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(0,0,0,.2);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform .25s, box-shadow .25s;
      z-index: 9998;
      overflow: hidden;
    }

    #bbchat-btn:hover {
      transform: translateY(-2px) scale(1.04);
      box-shadow: 0 8px 20px rgba(0,0,0,.25);
    }

    #bbchat-btn svg {
      width: 34px;
      height: 34px;
    }

    #bbchat-container {
      position: fixed;
      width: 480px;
      height: 530px;
      display: none;
      flex-direction: column;
      z-index: 9999;
      background: #D5E8EF;
      box-shadow: 0 4px 20px rgba(0,0,0,.15);
      font-family:
        -apple-system,
        BlinkMacSystemFont,
        'Segoe UI',
        Roboto,
        Helvetica,
        Arial,
        sans-serif;
    }

    #bbchat-container.bbchat-open {
      display: flex;
    }

    .bbchat-header {
      padding: 16px 20px;
      color: white;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .bbchat-header-title-wrap {
      display: flex;
      align-items: center;
      gap: 9px;
    }

    .bbchat-header-title-wrap svg {
      width: 28px;
      height: 28px;
    }

    .bbchat-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 700;
    }

    .bbchat-header button {
      border: none;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .bbchat-messages {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: #D5E8EF;
    }

    .bbchat-msg {
      display: flex;
      animation: bbchat-slide .25s;
    }

    .bbchat-msg.user {
      justify-content: flex-end;
    }

    .bbchat-msg.bot {
      justify-content: flex-start;
    }

    @keyframes bbchat-slide {
      from {
        opacity: 0;
        transform: translateY(8px);
      }

      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .bbchat-bubble {
      max-width: 85%;
      padding: 12px 16px;
      border-radius: 12px;
      font-size: 14px;
      line-height: 1.5;
      word-break: break-word;
    }

    .bbchat-msg.bot .bbchat-bubble {
      background: white;
      color: #2C3E50;
      box-shadow: 0 2px 4px rgba(0,0,0,.08);
    }

    .bbchat-msg.user .bbchat-bubble {
      color: white;
    }

    .bbchat-bubble img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      display: block;
      margin: 8px 0;
    }

    .bbchat-bubble a {
      text-decoration: underline;
      word-break: break-word;
    }

    .bbchat-qr {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
      padding: 4px 0 2px;
    }

    .bbchat-qr-btn {
      padding: 7px 15px;
      border-radius: 999px;
      background: white;
      font: 600 13px inherit;
      cursor: pointer;
      white-space: nowrap;
    }

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
      animation-delay: .2s;
    }

    .bbchat-dot:nth-child(3) {
      animation-delay: .4s;
    }

    @keyframes bbchat-bounce {
      0%, 60%, 100% {
        transform: translateY(0);
      }

      30% {
        transform: translateY(-8px);
      }
    }

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
      gap: 8px;
      flex-wrap: wrap;
    }

    .bbchat-input-wrap {
      padding: 16px 20px;
      display: flex;
      gap: 10px;
      align-items: center;
      background: #D5E8EF;
      flex-shrink: 0;
      position: relative;
    }

    .bbchat-input-wrap.drag-over {
      background: #e3f2fd;
    }

    .bbchat-drag-overlay {
      position: absolute;
      inset: 0;
      display: none;
      align-items: center;
      justify-content: center;
      background: rgba(33,150,243,.12);
      z-index: 10;
      pointer-events: none;
    }

    .bbchat-drag-overlay.show {
      display: flex;
    }

    .bbchat-drag-overlay span {
      background: white;
      padding: 12px 18px;
      border-radius: 9px;
      font-weight: 600;
    }

    .bbchat-file-input {
      display: none;
    }

    #bbchat-input {
      flex: 1;
      padding: 10px 16px;
      border: none;
      border-radius: 20px;
      font-size: 14px;
      outline: none;
      background: white;
      color: #2C3E50;
    }

    .bbchat-icon-btn {
      border: none;
      background: transparent;
      padding: 0;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .bbchat-icon-btn svg {
      width: 22px;
      height: 22px;
    }

    .dp-wrap,
    .tp-wrap {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,.10);
      padding: 14px;
      width: 260px;
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
    }

    .dp-nav {
      border: none;
      background: none;
      cursor: pointer;
      font-size: 20px;
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
      padding: 6px 2px;
      border: none;
      background: none;
      border-radius: 6px;
      cursor: pointer;
    }

    .dp-day.dp-disabled {
      color: #ccc;
      cursor: not-allowed;
    }

    .dp-day.dp-selected {
      color: white;
      font-weight: 700;
    }

    .dp-day.dp-booked {
      color: #C77A00;
    }

    .dp-confirm,
    .tp-confirm {
      margin-top: 10px;
      width: 100%;
      padding: 9px;
      border: none;
      border-radius: 8px;
      color: white;
      font-weight: 700;
      cursor: pointer;
    }

    .dp-confirm {
      display: none;
    }

    .dp-confirm.show {
      display: block;
    }

    .tp-label {
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 12px;
    }

    .tp-row {
      display: flex;
      gap: 8px;
    }

    .tp-field {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .tp-field label {
      font-size: 10px;
      font-weight: 700;
      color: #999;
    }

    .tp-select {
      padding: 8px;
      border: 2px solid #e0eef1;
      border-radius: 8px;
      background: white;
    }

    .tp-ampm-wrap {
      display: flex;
      margin-top: 12px;
      border: 2px solid #e0eef1;
      border-radius: 8px;
      overflow: hidden;
    }

    .tp-ampm-btn {
      flex: 1;
      padding: 8px;
      border: none;
      background: white;
      cursor: pointer;
      font-weight: 700;
    }

    .tp-ampm-btn.active {
      color: white;
    }

    @media (max-width: 768px) {
      #bbchat-container {
        width: 100vw !important;
        height: 100vh !important;
        height: 100dvh !important;
        inset: 0 !important;
      }

      #bbchat-btn {
        bottom: 20px !important;
        right: 20px !important;
      }

      #bbchat-input {
        font-size: 16px;
      }

      .bbchat-input-wrap {
        padding-bottom:
          max(
            10px,
            env(safe-area-inset-bottom)
          );
      }
    }

    @media (min-width: 769px) and (max-width: 1024px) {
      #bbchat-container {
        width: 400px;
        height: 500px;
      }
    }
  `;

  function buildHTML(cfg) {
    return `
      <button
        id="bbchat-btn"
        aria-label="Open Cookie Wizard"
      >
        <svg
          viewBox="0 0 24 24"
          fill="${cfg.accentColor}"
          aria-hidden="true"
        >
          <path
            d="M20.5 12.5a7.7 7.7 0 0 1-8 7.5A8 8 0 1 1 12 4c.2 1.5 1.5 2.7 3.1 2.7.4 0 .7-.1 1-.2.1 1.5 1.4 2.7 2.9 2.7.4 0 .7-.1 1-.2.3 1 .5 2.1.5 3.5ZM8.2 9.2a1.1 1.1 0 1 0 0-2.2 1.1 1.1 0 0 0 0 2.2Zm1.3 5.2a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Zm5 2.1a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
          />
        </svg>
      </button>

      <div id="bbchat-container">

        <div
          class="bbchat-header"
          id="bbchat-header"
        >

          <div
            class="bbchat-header-title-wrap"
          >

            <svg
              viewBox="0 0 24 24"
              fill="${cfg.accentColor}"
              aria-hidden="true"
            >
              <path
                d="M20.5 12.5a7.7 7.7 0 0 1-8 7.5A8 8 0 1 1 12 4c.2 1.5 1.5 2.7 3.1 2.7.4 0 .7-.1 1-.2.1 1.5 1.4 2.7 2.9 2.7.4 0 .7-.1 1-.2.3 1 .5 2.1.5 3.5Z"
              />
            </svg>

            <h3>${cfg.botName}</h3>

          </div>

          <button
            id="bbchat-close"
            title="Close"
            aria-label="Close chat"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="${cfg.primaryColor}"
            >
              <path
                d="M7 10l5 5 5-5z"
              />
            </svg>
          </button>

        </div>

        <div
          class="bbchat-messages"
          id="bbchat-messages"
        ></div>

        <div
          class="bbchat-file-preview"
          id="bbchat-file-preview"
        >

          <div
            class="bbchat-file-preview-content"
            id="bbchat-preview-content"
          ></div>

          <button
            id="bbchat-remove-all"
            class="bbchat-icon-btn"
            title="Remove all"
          >
            ✕
          </button>

        </div>

        <div
          class="bbchat-input-wrap"
          id="bbchat-input-wrap"
        >

          <div
            class="bbchat-drag-overlay"
            id="bbchat-drag-overlay"
          >
            <span>
              📷 Drop image here
            </span>
          </div>

          <input
            class="bbchat-file-input"
            id="bbchat-file-input"
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            multiple
          >

          <button
            class="bbchat-icon-btn"
            id="bbchat-attach"
            title="Attach image"
          >
            <svg
              viewBox="0 0 24 24"
              fill="${cfg.accentColor}"
            >
              <path
                d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"
              />
            </svg>
          </button>

          <input
            type="text"
            id="bbchat-input"
            placeholder="${cfg.placeholder}"
          >

          <button
            class="bbchat-icon-btn"
            id="bbchat-send"
            title="Send"
          >
            <svg
              viewBox="0 0 24 24"
              fill="${cfg.primaryColor}"
            >
              <path
                d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z"
              />
            </svg>
          </button>

        </div>

      </div>
    `;
  }

  function parseMarkdown(text) {
    if (!text) return '';

    let html =
      String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    html =
      html.replace(
        /\[!\[([^\]]*)\]\(([^)]+)\)\]\(([^)]+)\)/g,
        '<a href="$3" target="_blank" rel="noopener noreferrer"><img src="$2" alt="$1"></a>'
      );

    html =
      html.replace(
        /!\[([^\]]*)\]\(([^)]+)\)/g,
        '<img src="$2" alt="$1">'
      );

    html =
      html.replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
      );

    html =
      html.replace(
        /\*\*([^*]+)\*\*/g,
        '<strong>$1</strong>'
      );

    html =
      html.replace(
        /__([^_]+)__/g,
        '<strong>$1</strong>'
      );

    html =
      html.replace(
        /\*([^*]+)\*/g,
        '<em>$1</em>'
      );

    html =
      html.replace(
        /\n/g,
        '<br>'
      );

    return html;
  }

  function extractAutoButtons(text) {
    text = text || '';

    const numbered =
      [
        ...text.matchAll(
          /^\s*\d+[\.\)]\s*\*{0,2}(.+?)\*{0,2}\s*$/gm
        )
      ];

    if (
      numbered.length >= 2 &&
      numbered.length <= 6
    ) {
      return numbered.map(
        m =>
          m[1]
            .replace(/\*+/g, '')
            .trim()
      );
    }

    const bullets =
      [
        ...text.matchAll(
          /^\s*[-*]\s+\*{0,2}(.+?)\*{0,2}\s*$/gm
        )
      ];

    if (
      bullets.length >= 2 &&
      bullets.length <= 6
    ) {
      return bullets.map(
        m =>
          m[1]
            .replace(/\*+/g, '')
            .trim()
      );
    }

    if (
      /do you like this design\??/i.test(text)
    ) {
      return [
        'Yes',
        'No'
      ];
    }

    if (
      /\*\*Yes\*\*[\s\S]*\*\*No\*\*/i.test(text)
    ) {
      return [
        'Yes',
        'No'
      ];
    }

    const slash =
      text.match(
        /\(([A-Za-z][A-Za-z\s-]*(?:\/[A-Za-z][A-Za-z\s-]*)+)\)/
      );

    if (slash) {
      return slash[1]
        .split('/')
        .map(
          v => v.trim()
        );
    }

    return [];
  }

  function createSessionId() {
    return (
      'session_' +
      Date.now() +
      '_' +
      Math.random()
        .toString(36)
        .slice(2, 11)
    );
  }

  function safeLocalGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function safeLocalSet(
    key,
    value
  ) {
    try {
      localStorage.setItem(
        key,
        value
      );
    } catch (e) {}
  }

  function safeLocalRemove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {}
  }

  function BBChatWidget(cfg) {
    this.cfg =
      Object.assign(
        {},
        DEFAULTS,
        cfg || {}
      );

    this.messages =
      [];

    this.attachedFiles =
      [];

    this.sessionId =
      null;

    this.lastMessage =
      '';

    this.awaitingVerification =
      false;

    this.resumeCandidate =
      false;

    this.resumeCheckFinished =
      false;

    this.resumeInProgress =
      false;

    this.resumeCompleted =
      false;

    this.resumeReason =
      '';

    this.resumeNextStep =
      '';

    this.verifiedEmail =
      '';

    this.resumeMockupUrl =
      '';

    if (!this.cfg.webhookUrl) {
      console.error(
        '[BBChat] webhookUrl is required.'
      );

      return;
    }

    this._injectStyles();

    this._injectHTML();

    this._applyColors();

    this._bindEvents();

    this._initSession();

    this._bindLifecycle();

    if (
      this.resumeCandidate &&
      this.cfg.resumeWebhookUrl
    ) {
      this._checkEmailVerificationResume();
    } else {
      this.resumeCheckFinished =
        true;
    }
  }

  BBChatWidget.prototype._injectStyles =
    function () {

      if (
        document.getElementById(
          'bbchat-styles'
        )
      ) {
        return;
      }

      const style =
        document.createElement(
          'style'
        );

      style.id =
        'bbchat-styles';

      style.textContent =
        CSS;

      document.head.appendChild(
        style
      );
    };

  BBChatWidget.prototype._injectHTML =
    function () {

      const old =
        document.getElementById(
          'bbchat-root'
        );

      if (old) {
        old.remove();
      }

      const wrap =
        document.createElement(
          'div'
        );

      wrap.id =
        'bbchat-root';

      wrap.innerHTML =
        buildHTML(
          this.cfg
        );

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
        }
      };

      const pos =
        positions[
          this.cfg.position
        ] ||
        positions[
          'bottom-right'
        ];

      Object.assign(
        document
          .getElementById(
            'bbchat-btn'
          )
          .style,
        pos
      );

      Object.assign(
        document
          .getElementById(
            'bbchat-container'
          )
          .style,
        pos
      );
    };

  BBChatWidget.prototype._applyColors =
    function () {

      const cfg =
        this.cfg;

      document
        .getElementById(
          'bbchat-btn'
        )
        .style
        .backgroundColor =
          cfg.buttonColor;

      document
        .getElementById(
          'bbchat-header'
        )
        .style
        .backgroundColor =
          cfg.primaryColor;

      document
        .getElementById(
          'bbchat-header'
        )
        .querySelector('h3')
        .style
        .color =
          cfg.accentColor;

      document
        .getElementById(
          'bbchat-close'
        )
        .style
        .backgroundColor =
          cfg.accentColor;

      const input =
        document.getElementById(
          'bbchat-input'
        );

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
    };

  BBChatWidget.prototype._bindEvents =
    function () {

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
          () =>
            self._clearFiles()
        );

      document
        .getElementById(
          'bbchat-file-input'
        )
        .addEventListener(
          'change',
          e => {

            Array.from(
              e.target.files || []
            ).forEach(
              f =>
                self._addFile(f)
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
            e.key ===
            'Enter'
          ) {
            self._send();
          }
        }
      );

      input.addEventListener(
        'paste',
        e => {

          const items =
            e.clipboardData &&
            e.clipboardData.items
              ? e.clipboardData.items
              : [];

          for (
            const item
            of items
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

  BBChatWidget.prototype._bindLifecycle =
    function () {

      const self =
        this;

      const cleanupNormalSession =
        function () {

          /*
           * Normal sessions are intentionally
           * NOT persisted.
           *
           * The only session allowed to stay in
           * localStorage is an inquiry waiting
           * for the customer to click their
           * email verification link.
           */
          if (
            !self.awaitingVerification
          ) {
            self._clearPersistedSession();
          }
        };

      window.addEventListener(
        'pagehide',
        cleanupNormalSession
      );

      window.addEventListener(
        'beforeunload',
        cleanupNormalSession
      );
    };

  BBChatWidget.prototype._setupDragDrop =
    function () {

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

      const overlay =
        document.getElementById(
          'bbchat-drag-overlay'
        );

      let counter =
        0;

      [
        'dragenter',
        'dragover',
        'dragleave',
        'drop'
      ].forEach(
        ev => {

          container.addEventListener(
            ev,
            e => {
              e.preventDefault();
              e.stopPropagation();
            },
            false
          );
        }
      );

      container.addEventListener(
        'dragenter',
        e => {

          counter++;

          if (
            e.dataTransfer &&
            Array.from(
              e.dataTransfer.types || []
            ).includes(
              'Files'
            )
          ) {
            inputWrap
              .classList
              .add(
                'drag-over'
              );

            overlay
              .classList
              .add(
                'show'
              );
          }
        }
      );

      container.addEventListener(
        'dragleave',
        () => {

          counter--;

          if (
            counter <= 0
          ) {
            counter = 0;

            inputWrap
              .classList
              .remove(
                'drag-over'
              );

            overlay
              .classList
              .remove(
                'show'
              );
          }
        }
      );

      container.addEventListener(
        'drop',
        e => {

          counter = 0;

          inputWrap
            .classList
            .remove(
              'drag-over'
            );

          overlay
            .classList
            .remove(
              'show'
            );

          Array.from(
            (
              e.dataTransfer &&
              e.dataTransfer.files
            ) || []
          ).forEach(
            f =>
              self._addFile(f)
          );
        }
      );
    };

  BBChatWidget.prototype._clearPersistedSession =
    function () {

      safeLocalRemove(
        STORAGE.session
      );

      safeLocalRemove(
        STORAGE.waiting
      );

      safeLocalRemove(
        STORAGE.waitingSince
      );
    };

  BBChatWidget.prototype._persistVerificationSession =
    function () {

      this.awaitingVerification =
        true;

      safeLocalSet(
        STORAGE.session,
        this.sessionId
      );

      safeLocalSet(
        STORAGE.waiting,
        '1'
      );

      safeLocalSet(
        STORAGE.waitingSince,
        new Date()
          .toISOString()
      );
    };

  BBChatWidget.prototype._initSession =
    function () {

      const storedSession =
        safeLocalGet(
          STORAGE.session
        );

      const waiting =
        safeLocalGet(
          STORAGE.waiting
        ) === '1';

      const waitingSinceRaw =
        safeLocalGet(
          STORAGE.waitingSince
        );

      const waitingSince =
        waitingSinceRaw
          ? Date.parse(
              waitingSinceRaw
            )
          : NaN;

      const stillValid =
        Number.isFinite(
          waitingSince
        ) &&
        (
          Date.now() -
          waitingSince
        ) <=
        this.cfg
          .verificationHoldMs;

      if (
        waiting &&
        storedSession &&
        stillValid
      ) {

        /*
         * ONLY an inquiry that reached
         * verification-email waiting
         * survives a page exit.
         */
        this.sessionId =
          storedSession;

        this.awaitingVerification =
          true;

        this.resumeCandidate =
          true;

        return;
      }

      /*
       * Any other page visit starts
       * a brand-new inquiry.
       */
      this._clearPersistedSession();

      this.sessionId =
        createSessionId();

      this.awaitingVerification =
        false;

      this.resumeCandidate =
        false;
    };

  BBChatWidget.prototype._open =
    function () {

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
       * During strict verification resume
       * NEVER show Welcome / Custom Cookies.
       */
      if (
        this.resumeInProgress
      ) {
        return;
      }

      if (
        this.resumeCandidate &&
        !this.resumeCheckFinished
      ) {

        this._showTyping();

        return;
      }

      if (
        this.resumeReason ===
          'EMAIL_VERIFICATION' &&
        this.resumeNextStep ===
          'FIRST_LOOK_APPROVAL' &&
        !this.resumeCompleted
      ) {

        this._resumeAfterEmailVerification();

        return;
      }

      /*
       * User reloaded while waiting
       * for the email verification click.
       */
      if (
        this.awaitingVerification &&
        this.messages.length === 0
      ) {

        this._addMessage(
          'Your cookie design is ready! ✨\n\n' +
          'Please open the verification email we sent and click **Continue My Order** to continue this same inquiry.',
          'bot'
        );

        return;
      }

      /*
       * Normal NEW inquiry.
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

  BBChatWidget.prototype._close =
    function () {

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

  BBChatWidget.prototype._trackOpen =
    function () {

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
        `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` +
        `T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;

      try {

        fetch(
          OPEN_TRACK_URL,
          {
            method:
              'POST',

            mode:
              'cors',

            keepalive:
              true,

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
        ).catch(
          () => {}
        );

      } catch (e) {}
    };

  BBChatWidget.prototype._cleanControlMarkers =
    function (text) {

      text =
        String(
          text || ''
        );

      if (
        /\[WAITING_VERIFICATION\]/i
          .test(
            text
          )
      ) {

        /*
         * ONLY NOW do we preserve
         * the current inquiry session.
         */
        this._persistVerificationSession();
      }

      if (
        /\[SESSION_COMPLETE\]/i
          .test(
            text
          )
      ) {

        this.awaitingVerification =
          false;

        this._clearPersistedSession();
      }

      return text
        .replace(
          /\[WAITING_VERIFICATION\]/gi,
          ''
        )
        .replace(
          /\[SESSION_COMPLETE\]/gi,
          ''
        )
        .trim();
    };

  BBChatWidget.prototype._addMessage =
    function (
      text,
      sender,
      files,
      buttons
    ) {

      files =
        files || [];

      if (
        sender === 'bot'
      ) {
        text =
          this._cleanControlMarkers(
            text
          );
      }

      if (
        !text &&
        files.length === 0
      ) {
        return;
      }

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
            el =>
              el.remove()
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
        dpMatch &&
        dpMatch[1]
          ? dpMatch[1]
              .split(',')
              .map(
                s =>
                  s.trim()
              )
              .filter(
                Boolean
              )
          : [];

      const hasTimePicker =
        sender === 'bot' &&
        /\[timepicker\]/i
          .test(
            text || ''
          );

      const cleanText =
        String(
          text || ''
        )
          .replace(
            /\[datepicker(?::[^\]]*)?\]/gi,
            ''
          )
          .replace(
            /\[timepicker\]/gi,
            ''
          )
          .trim();

      if (
        cleanText
      ) {
        bubble.innerHTML =
          parseMarkdown(
            cleanText
          );
      }

      if (
        files.length
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
                'max-width:120px;max-height:120px;object-fit:cover;';

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

        const anchor =
          document.createElement(
            'div'
          );

        messagesEl.appendChild(
          anchor
        );

        this._renderDatePicker(
          anchor,
          bookedDates
        );
      }

      if (
        hasTimePicker
      ) {

        const anchor =
          document.createElement(
            'div'
          );

        messagesEl.appendChild(
          anchor
        );

        this._renderTimePicker(
          anchor
        );
      }

      if (
        sender === 'bot'
      ) {

        const finalButtons =
          buttons &&
          buttons.length
            ? buttons
            : extractAutoButtons(
                cleanText
              );

        if (
          finalButtons.length
        ) {

          this._renderQuickReplies(
            finalButtons
          );
        }
      }

      this.messages.push({
        text:
          cleanText,

        sender,

        files,

        timestamp:
          new Date()
      });

      this._scrollToBottom();
    };

  BBChatWidget.prototype._renderQuickReplies =
    function (buttons) {

      const self =
        this;

      const messagesEl =
        document.getElementById(
          'bbchat-messages'
        );

      messagesEl
        .querySelectorAll(
          '.bbchat-qr'
        )
        .forEach(
          el =>
            el.remove()
        );

      const wrap =
        document.createElement(
          'div'
        );

      wrap.className =
        'bbchat-qr';

      buttons.forEach(
        (
          label,
          index
        ) => {

          const btn =
            document.createElement(
              'button'
            );

          btn.className =
            'bbchat-qr-btn';

          btn.textContent =
            label;

          btn.style.border =
            `2px solid ${
              index % 2 === 0
                ? this.cfg.primaryColor
                : this.cfg.accentColor
            }`;

          btn.style.color =
            index % 2 === 0
              ? this.cfg.primaryColor
              : '#8a6a00';

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

              const input =
                document.getElementById(
                  'bbchat-input'
                );

              input.value =
                (
                  label ===
                    '🔄 Try Again' &&
                  self.lastMessage
                )
                  ? self.lastMessage
                  : label;

              self._send();
            }
          );

          wrap.appendChild(
            btn
          );
        }
      );

      messagesEl.appendChild(
        wrap
      );

      this._scrollToBottom();
    };

  BBChatWidget.prototype._showTyping =
    function () {

      if (
        document.getElementById(
          'bbchat-typing'
        )
      ) {
        return;
      }

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

  BBChatWidget.prototype._hideTyping =
    function () {

      const el =
        document.getElementById(
          'bbchat-typing'
        );

      if (el) {
        el.remove();
      }
    };

  BBChatWidget.prototype._scrollToBottom =
    function () {

      const el =
        document.getElementById(
          'bbchat-messages'
        );

      el.scrollTop =
        el.scrollHeight;
    };

  BBChatWidget.prototype._addFile =
    function (file) {

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
          String(
            file.type || ''
          ).toLowerCase()
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

  BBChatWidget.prototype._clearFiles =
    function () {

      this.attachedFiles =
        [];

      const fileInput =
        document.getElementById(
          'bbchat-file-input'
        );

      if (
        fileInput
      ) {
        fileInput.value =
          '';
      }

      this._renderFilePreviews();
    };

  BBChatWidget.prototype._renderFilePreviews =
    function () {

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
        !this.attachedFiles.length
      ) {

        preview
          .classList
          .remove(
            'show'
          );

        return;
      }

      preview
        .classList
        .add(
          'show'
        );

      this.attachedFiles.forEach(
        (
          file,
          index
        ) => {

          const item =
            document.createElement(
              'div'
            );

          item.style.cssText =
            'display:flex;align-items:center;gap:5px;';

          const img =
            document.createElement(
              'img'
            );

          img.style.cssText =
            'width:40px;height:40px;object-fit:cover;border-radius:6px;';

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

          const remove =
            document.createElement(
              'button'
            );

          remove.textContent =
            '×';

          remove.style.cssText =
            'border:none;background:#ef4444;color:white;border-radius:50%;width:18px;height:18px;cursor:pointer;';

          remove.addEventListener(
            'click',
            () => {

              self.attachedFiles.splice(
                index,
                1
              );

              self._renderFilePreviews();
            }
          );

          item.appendChild(
            img
          );

          item.appendChild(
            remove
          );

          content.appendChild(
            item
          );
        }
      );
    };

  BBChatWidget.prototype._extractResponse =
    function (data) {

      if (
        typeof data ===
        'string'
      ) {
        return data;
      }

      if (
        !data
      ) {
        return null;
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
        const field
        of fields
      ) {

        if (
          data[field]
        ) {

          if (
            typeof data[field] ===
            'string'
          ) {
            return data[field];
          }

          if (
            typeof data[field] ===
              'object' &&
            (
              data[field].text ||
              data[field].message
            )
          ) {

            return (
              data[field].text ||
              data[field].message
            );
          }
        }
      }

      if (
        Array.isArray(
          data
        ) &&
        data.length
      ) {

        return this._extractResponse(
          data[0]
        );
      }

      return null;
    };

  BBChatWidget.prototype._fetchWithTimeout =
    async function (
      url,
      options,
      ms
    ) {

      const controller =
        new AbortController();

      const timer =
        setTimeout(
          () =>
            controller.abort(),
          ms || 600000
        );

      try {

        const response =
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

        return response;

      } catch (err) {

        clearTimeout(
          timer
        );

        if (
          err &&
          err.name ===
            'AbortError'
        ) {

          throw new Error(
            'Request timed out.'
          );
        }

        throw err;
      }
    };

  BBChatWidget.prototype._checkEmailVerificationResume =
    async function () {

      this.resumeCheckFinished =
        false;

      try {

        const url =
          this.cfg.resumeWebhookUrl +
          '?sessionId=' +
          encodeURIComponent(
            this.sessionId
          );

        const response =
          await this._fetchWithTimeout(
            url,
            {
              method:
                'GET',

              mode:
                'cors',

              headers: {
                'Accept':
                  'application/json'
              }
            },
            30000
          );

        if (
          !response.ok
        ) {

          throw new Error(
            'Resume HTTP ' +
            response.status
          );
        }

        const raw =
          await response.text();

        let data =
          {};

        try {

          data =
            JSON.parse(
              raw
            );

        } catch (e) {}

        const validResume =
          data &&
          data.resume === true &&
          String(
            data.resumeReason || ''
          ).toUpperCase() ===
            'EMAIL_VERIFICATION' &&
          String(
            data.nextStep || ''
          ).toUpperCase() ===
            'FIRST_LOOK_APPROVAL' &&
          String(
            data.sessionId || ''
          ) ===
          String(
            this.sessionId
          );

        if (
          validResume
        ) {

          this.resumeReason =
            'EMAIL_VERIFICATION';

          this.resumeNextStep =
            'FIRST_LOOK_APPROVAL';

          this.verifiedEmail =
            data.email || '';

          this.resumeMockupUrl =
            data.mockupUrl || '';

          this.resumeCheckFinished =
            true;

          /*
           * Auto-open.
           *
           * _open() will NOT show
           * the Welcome/Custom Cookies step.
           */
          setTimeout(
            () =>
              this._open(),
            250
          );

          return;
        }

        /*
         * Verification has not yet happened.
         *
         * Keep this one saved session.
         */
        this.resumeCheckFinished =
          true;

        this.awaitingVerification =
          true;

      } catch (err) {

        console.warn(
          '[BBChat] Resume check failed:',
          err
        );

        /*
         * Don't destroy the only allowed
         * persistent session just because
         * the Resume endpoint temporarily failed.
         */
        this.resumeCheckFinished =
          true;

        this.awaitingVerification =
          true;
      }
    };

  BBChatWidget.prototype._resumeAfterEmailVerification =
    async function () {

      if (
        this.resumeInProgress ||
        this.resumeCompleted
      ) {
        return;
      }

      if (
        this.resumeReason !==
          'EMAIL_VERIFICATION' ||
        this.resumeNextStep !==
          'FIRST_LOOK_APPROVAL'
      ) {
        return;
      }

      this.resumeInProgress =
        true;

      this._hideTyping();

      this._showTyping();

      /*
       * IMPORTANT:
       *
       * The exact old Session ID is sent
       * back into the main n8n chatbot.
       *
       * This is the ONLY intentional
       * MongoDB-memory resume.
       */
      const payload = {

        message:
          '[EMAIL_VERIFICATION_COMPLETE]',

        text:
          '[EMAIL_VERIFICATION_COMPLETE]',

        input:
          '[EMAIL_VERIFICATION_COMPLETE]',

        chatInput:
          '[EMAIL_VERIFICATION_COMPLETE]',

        action:
          'emailVerificationComplete',

        isSystemEvent:
          true,

        emailValidated:
          true,

        resumeReason:
          'EMAIL_VERIFICATION',

        nextStep:
          'FIRST_LOOK_APPROVAL',

        email:
          this.verifiedEmail || '',

        mockupUrl:
          this.resumeMockupUrl || '',

        sessionId:
          this.sessionId,

        timestamp:
          new Date()
            .toISOString(),

        history:
          []
      };

      try {

        const response =
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
                JSON.stringify(
                  payload
                )
            },
            600000
          );

        if (
          !response.ok
        ) {

          throw new Error(
            'Resume chat HTTP ' +
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

        let botText =
          this._extractResponse(
            data
          ) || '';

        const botButtons =
          Array.isArray(
            data.buttons
          )
            ? data.buttons
            : [];

        this._hideTyping();

        /*
         * CRITICAL FRONTEND SAFETY.
         *
         * Even if the AI returns a stale
         * Welcome / What are we celebrating?
         * response, it will NEVER be displayed
         * during verification resume.
         */
        const isCorrectFirstLook =
          /do you like this design/i
            .test(
              botText
            );

        if (
          !isCorrectFirstLook
        ) {

          botText =
            'Your email is confirmed! ✨\n\n' +
            '**Do you like this design?**\n\n' +
            '**Yes**\n' +
            '**No**';
        }

        this._addMessage(
          botText,
          'bot',
          [],
          botButtons.length
            ? botButtons
            : [
                'Yes',
                'No'
              ]
        );

        this.resumeCompleted =
          true;

        this.resumeInProgress =
          false;

        this.awaitingVerification =
          false;

        /*
         * The current Session ID remains
         * alive only in this browser page.
         *
         * It is removed from localStorage.
         *
         * If they leave after this,
         * next order gets a NEW Session ID.
         */
        this._clearPersistedSession();

        /*
         * Tell n8n:
         * Resume Pending YES → NO.
         */
        this._markResumeComplete();

      } catch (err) {

        console.error(
          '[BBChat] Resume failed:',
          err
        );

        this._hideTyping();

        this.resumeInProgress =
          false;

        this._addMessage(
          'Your email was verified, but we had trouble reopening the inquiry. Please try reopening the page from the same browser.',
          'bot'
        );

        /*
         * Keep the stored verification
         * session so they can retry.
         */
      }
    };

  BBChatWidget.prototype._markResumeComplete =
    async function () {

      if (
        !this.cfg
          .resumeCompleteWebhookUrl
      ) {
        return;
      }

      try {

        await fetch(
          this.cfg
            .resumeCompleteWebhookUrl,
          {
            method:
              'POST',

            mode:
              'cors',

            keepalive:
              true,

            headers: {
              'Content-Type':
                'application/json',

              'Accept':
                'application/json'
            },

            body:
              JSON.stringify({
                sessionId:
                  this.sessionId,

                resumeReason:
                  'EMAIL_VERIFICATION',

                nextStep:
                  'FIRST_LOOK_APPROVAL',

                completedAt:
                  new Date()
                    .toISOString()
              })
          }
        );

      } catch (e) {

        console.warn(
          '[BBChat] Resume-complete cleanup failed:',
          e
        );
      }
    };

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
        !this.attachedFiles.length
      ) {
        return;
      }

      const filesToSend =
        [
          ...this.attachedFiles
        ];

      this.lastMessage =
        message;

      const previousBot =
        [
          ...this.messages
        ]
          .reverse()
          .find(
            m =>
              m.sender === 'bot'
          );

      const previousBotText =
        previousBot
          ? previousBot.text
          : '';

      this._addMessage(
        message,
        'user',
        filesToSend
      );

      input.value =
        '';

      this._clearFiles();

      const normalized =
        message.toLowerCase();

      const isReferenceStep =
        /do you have a photo or inspiration/i
          .test(
            previousBotText
          ) ||
        /upload it here or paste a google drive link/i
          .test(
            previousBotText
          ) ||
        /if not,\s*just type skip/i
          .test(
            previousBotText
          ) ||
        /upload your reference photo/i
          .test(
            previousBotText
          ) ||
        /upload the logo/i
          .test(
            previousBotText
          ) ||
        /reference photo now/i
          .test(
            previousBotText
          );

      const isMockupApproval =
        /do you like this design/i
          .test(
            previousBotText
          ) ||
        /does this feel like the right direction/i
          .test(
            previousBotText
          );

      if (
        normalized === 'skip' &&
        isReferenceStep &&
        !isMockupApproval
      ) {

        this._addMessage(
          'Got it! ✨ We’ll create a first look for your cookies now. 🍪',
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
            '.6';
        }
      );

      this._showTyping();

      const history =
        this.messages
          .slice(-5)
          .map(
            m => ({
              role:
                m.sender === 'user'
                  ? 'user'
                  : 'assistant',

              content:
                m.text
            })
          );

      try {

        let response;

        if (
          filesToSend.length
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
            'action',
            'sendMessage'
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
              },
              600000
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
              },
              600000
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
          data.errorMessage;

        setTimeout(
          () => {

            this._hideTyping();

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
          450
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
          450
        );
      }
    };

  BBChatWidget.prototype._checkRedirect =
    function (text) {

      const match =
        String(
          text || ''
        ).match(
          /https:\/\/app\.squareup\.com\/pay-invoice\/[^\s"')>]*/
        );

      if (
        match
      ) {

        setTimeout(
          () =>
            window.open(
              match[0],
              '_blank'
            ),
          800
        );
      }
    };

  BBChatWidget.prototype._renderDatePicker =
    function (
      anchorEl,
      bookedDates
    ) {

      const self =
        this;

      const today =
        new Date();

      let year =
        today.getFullYear();

      let month =
        today.getMonth();

      let selected =
        null;

      const booked =
        new Set(
          Array.isArray(
            bookedDates
          )
            ? bookedDates
            : []
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

      const ymd =
        d =>
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

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

        const label =
          document.createElement(
            'span'
          );

        label.textContent =
          MONTHS[month] +
          ' ' +
          year;

        const next =
          document.createElement(
            'button'
          );

        next.className =
          'dp-nav';

        next.innerHTML =
          '&#8250;';

        prev.onclick =
          () => {

            month--;

            if (
              month < 0
            ) {
              month = 11;
              year--;
            }

            build();
          };

        next.onclick =
          () => {

            month++;

            if (
              month > 11
            ) {
              month = 0;
              year++;
            }

            build();
          };

        header.append(
          prev,
          label,
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

            const el =
              document.createElement(
                'div'
              );

            el.className =
              'dp-day-label';

            el.textContent =
              d;

            grid.appendChild(
              el
            );
          }
        );

        const firstDay =
          new Date(
            year,
            month,
            1
          ).getDay();

        const daysInMonth =
          new Date(
            year,
            month + 1,
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
          grid.appendChild(
            document.createElement(
              'div'
            )
          );
        }

        for (
          let day = 1;
          day <= daysInMonth;
          day++
        ) {

          const btn =
            document.createElement(
              'button'
            );

          btn.className =
            'dp-day';

          btn.textContent =
            day;

          const date =
            new Date(
              year,
              month,
              day
            );

          if (
            date <
            todayMid
          ) {

            btn.classList.add(
              'dp-disabled'
            );

          } else {

            if (
              booked.has(
                ymd(date)
              )
            ) {

              btn.classList.add(
                'dp-booked'
              );
            }

            if (
              selected &&
              date.toDateString() ===
              selected.toDateString()
            ) {

              btn.classList.add(
                'dp-selected'
              );

              btn.style.backgroundColor =
                self.cfg.primaryColor;
            }

            btn.onclick =
              () => {

                selected =
                  date;

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

        confirm.style.backgroundColor =
          self.cfg.primaryColor;

        confirm.textContent =
          selected
            ? 'Confirm — ' +
              selected.toLocaleDateString(
                'en-US',
                {
                  month:
                    'long',

                  day:
                    'numeric',

                  year:
                    'numeric'
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

            document
              .getElementById(
                'bbchat-input'
              )
              .value =
                selected.toLocaleDateString(
                  'en-US',
                  {
                    month:
                      'long',

                    day:
                      'numeric',

                    year:
                      'numeric'
                  }
                );

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

      let hour =
        '8';

      let minute =
        '00';

      let ampm =
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

      const hourSelect =
        document.createElement(
          'select'
        );

      hourSelect.className =
        'tp-select';

      const minuteField =
        document.createElement(
          'div'
        );

      minuteField.className =
        'tp-field';

      const minuteLabel =
        document.createElement(
          'label'
        );

      minuteLabel.textContent =
        'Minute';

      const minuteSelect =
        document.createElement(
          'select'
        );

      minuteSelect.className =
        'tp-select';

      minutes.forEach(
        m => {

          const o =
            document.createElement(
              'option'
            );

          o.value =
            m;

          o.textContent =
            m;

          minuteSelect.appendChild(
            o
          );
        }
      );

      function loadHours(
        list
      ) {

        hourSelect.innerHTML =
          '';

        list.forEach(
          h => {

            const o =
              document.createElement(
                'option'
              );

            o.value =
              h;

            o.textContent =
              h;

            hourSelect.appendChild(
              o
            );
          }
        );

        hour =
          hourSelect.value;
      }

      loadHours(
        amHours
      );

      hourSelect.onchange =
        () => {

          hour =
            hourSelect.value;

          update();
        };

      minuteSelect.onchange =
        () => {

          minute =
            minuteSelect.value;

          update();
        };

      hourField.append(
        hourLabel,
        hourSelect
      );

      minuteField.append(
        minuteLabel,
        minuteSelect
      );

      row.append(
        hourField,
        minuteField
      );

      wrap.appendChild(
        row
      );

      const toggle =
        document.createElement(
          'div'
        );

      toggle.className =
        'tp-ampm-wrap';

      const am =
        document.createElement(
          'button'
        );

      am.className =
        'tp-ampm-btn active';

      am.textContent =
        'AM';

      am.style.backgroundColor =
        self.cfg.primaryColor;

      const pm =
        document.createElement(
          'button'
        );

      pm.className =
        'tp-ampm-btn';

      pm.textContent =
        'PM';

      am.onclick =
        () => {

          ampm =
            'AM';

          am.classList.add(
            'active'
          );

          pm.classList.remove(
            'active'
          );

          am.style.backgroundColor =
            self.cfg.primaryColor;

          pm.style.backgroundColor =
            'white';

          loadHours(
            amHours
          );

          update();
        };

      pm.onclick =
        () => {

          ampm =
            'PM';

          pm.classList.add(
            'active'
          );

          am.classList.remove(
            'active'
          );

          pm.style.backgroundColor =
            self.cfg.primaryColor;

          am.style.backgroundColor =
            'white';

          loadHours(
            pmHours
          );

          update();
        };

      toggle.append(
        am,
        pm
      );

      wrap.appendChild(
        toggle
      );

      const confirm =
        document.createElement(
          'button'
        );

      confirm.className =
        'tp-confirm';

      confirm.style.backgroundColor =
        self.cfg.primaryColor;

      function update() {

        confirm.textContent =
          `Confirm — ${hour}:${minute} ${ampm}`;
      }

      update();

      confirm.onclick =
        () => {

          wrap.remove();

          document
            .getElementById(
              'bbchat-input'
            )
            .value =
              `${hour}:${minute} ${ampm}`;

          self._send();
        };

      wrap.appendChild(
        confirm
      );

      anchorEl.appendChild(
        wrap
      );
    };

  global.BBChat = {

    init:
      function (options) {

        const start =
          () =>
            new BBChatWidget(
              options || {}
            );

        if (
          document.readyState ===
          'loading'
        ) {

          document.addEventListener(
            'DOMContentLoaded',
            start
          );

        } else {

          start();
        }
      }
  };

}(window));