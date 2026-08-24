BBChatWidget.prototype._send = async function () {
    const input      = document.getElementById('bbchat-input');
    const sendBtn    = document.getElementById('bbchat-send');
    const attachBtn  = document.getElementById('bbchat-attach');
    const message    = input.value.trim();

    if (!message && this.attachedFiles.length === 0) return;

    const filesToSend = [...this.attachedFiles];
    this.lastMessage = message;  // store for retry

    /*
     * IMPORTANT:
     * Get the previous bot message BEFORE adding the user's new message.
     *
     * We use this to determine whether "Skip" was entered specifically
     * during the Reference Photo / Logo step.
     */
    const previousBotMessage = [...this.messages]
        .reverse()
        .find(m => m.sender === 'bot');

    const previousBotText = previousBotMessage?.text || '';

    this._addMessage(message, 'user', filesToSend);
    input.value = '';
    this._clearFiles();

    /*
     * MOCKUP GENERATION STATUS MESSAGE
     *
     * Only show the message when:
     * 1. The customer typed "Skip"
     * 2. The immediately previous bot question was asking for
     *    the reference photo or corporate logo.
     *
     * This prevents "Skip" used elsewhere in the chatbot
     * (such as Referral Code) from triggering this message.
     */
    const normalizedMessage = message.trim().toLowerCase();

    const isReferencePhotoStep =
        /upload your reference photo/i.test(previousBotText) ||
        /upload the logo you'd like us to use/i.test(previousBotText) ||
        /reference photo now/i.test(previousBotText) ||
        /paste the image'?s google drive link/i.test(previousBotText) ||
        /paste the image.*google drive link/i.test(previousBotText);

    if (normalizedMessage === 'skip' && isReferencePhotoStep) {
        this._addMessage(
            "✨ Got it! I’m generating your cookie mockup now — this may take a moment. 🍪",
            'bot'
        );
    }

    // Disable UI
    [input, sendBtn, attachBtn].forEach(el => {
        el.disabled = true;
        el.style.opacity = '0.6';
    });

    this._showTyping();

    const history = this.messages.slice(-5).map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
    }));

    try {
        let response;

        if (filesToSend.length > 0) {
            const fd = new FormData();

            ['message','text','input','chatInput'].forEach(k =>
                fd.append(k, message)
            );

            fd.append('timestamp', new Date().toISOString());
            fd.append('sessionId', this.sessionId);
            fd.append('history', JSON.stringify(history));

            filesToSend.forEach(f =>
                fd.append('files', f, f.name)
            );

            response = await this._fetchWithTimeout(
                this.cfg.webhookUrl,
                {
                    method: 'POST',
                    mode: 'cors',
                    body: fd
                }
            );

        } else {

            response = await this._fetchWithTimeout(
                this.cfg.webhookUrl,
                {
                    method: 'POST',
                    mode: 'cors',

                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },

                    body: JSON.stringify({
                        message,
                        text: message,
                        input: message,
                        chatInput: message,
                        action: 'sendMessage',
                        timestamp: new Date().toISOString(),
                        sessionId: this.sessionId,
                        history
                    })
                }
            );
        }

        if (!response.ok) {
            throw new Error('HTTP ' + response.status);
        }

        const raw = await response.text();

        let data;

        try {
            data = JSON.parse(raw);
        } catch (e) {
            data = {
                output: raw
            };
        }

        const botText = this._extractResponse(data);

        const botButtons = Array.isArray(data.buttons)
            ? data.buttons
            : [];

        // Detect n8n workflow-level errors
        const n8nError =
            data.error ||
            data.errorMessage ||
            (
                data.message &&
                /error|fail|exception/i.test(data.message)
                    ? data.message
                    : null
            );

        setTimeout(() => {

            this._hideTyping();

            const looksLikeError =
                botText &&
                /Error/.test(botText);

            if (n8nError) {

                this._addMessage(
                    '⚠️ Oops! Something went wrong. Please try again.',
                    'bot',
                    [],
                    ['🔄 Try Again']
                );

            } else if (looksLikeError) {

                this._addMessage(
                    botText,
                    'bot',
                    [],
                    ['🔄 Try Again']
                );

            } else if (botText) {

                this._addMessage(
                    botText,
                    'bot',
                    [],
                    botButtons
                );

                this._checkRedirect(botText);

            } else {

                this._addMessage(
                    "I received your message but couldn't process the response.",
                    'bot',
                    [],
                    ['🔄 Try Again']
                );
            }

            [input, sendBtn, attachBtn].forEach(el => {
                el.disabled = false;
                el.style.opacity = '1';
            });

            input.focus();

        }, 500);

    } catch (err) {

        setTimeout(() => {

            this._hideTyping();

            this._addMessage(
                '⚠️ Oops! Something went wrong. Please try again.',
                'bot',
                [],
                ['🔄 Try Again']
            );

            [input, sendBtn, attachBtn].forEach(el => {
                el.disabled = false;
                el.style.opacity = '1';
            });

            input.focus();

        }, 500);
    }
};