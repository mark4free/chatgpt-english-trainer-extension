const WRITING_EDITOR_SELECTOR =
    '[class*="_editor"]';

let availableEnglishVoices = [];

let selectedVoicePreference = {
    voiceURI: "",
    name: "",
    lang: ""
};

let selectedSpeechRate = 0.8;

let optionKeyIsPressed = false;

let lastPointerPosition = {
    x: 0,
    y: 0,
    available: false
};

let wordHoverTimer = null;

let currentWordTarget = {
    node: null,
    start: -1,
    end: -1
};

function findWritingEditors() {
    return document.querySelectorAll(
        WRITING_EDITOR_SELECTOR
    );
}


function findLatestWritingEditor() {
    const writingEditors =
        findWritingEditors();

    if (writingEditors.length === 0) {
        return null;
    }

    return writingEditors[
        writingEditors.length - 1
    ];
}

function findLatestAssistantMessage() {
    const assistantMessages =
        document.querySelectorAll(
            '[data-message-author-role="assistant"]'
        );

    if (assistantMessages.length === 0) {
        return null;
    }

    return assistantMessages[
        assistantMessages.length - 1
    ];
}

function getCleanText(element) {
    const trainerControls =
        element.querySelectorAll(
            ".english-trainer-sentence-controls, " +
            ".english-trainer-inline-button"
        );

    const previousHiddenStates = [];

    trainerControls.forEach(
        function (controls) {
            previousHiddenStates.push(
                controls.hidden
            );

            controls.hidden = true;
        }
    );

    const cleanText =
        element.innerText.trim();

    trainerControls.forEach(
        function (controls, index) {
            controls.hidden =
                previousHiddenStates[index];
        }
    );

    return cleanText;
}

function extractEnglishText(assistantMessage) {
    const textSources = [];

    const markdown =
        assistantMessage.querySelector(".markdown");

    if (markdown) {
        textSources.push(markdown);
    }

    const writingEditors =
        assistantMessage.querySelectorAll(
            WRITING_EDITOR_SELECTOR
        );

    writingEditors.forEach(
        function (editor) {
            if (
                !markdown ||
                !markdown.contains(editor)
            ) {
                textSources.push(editor);
            }
        }
    );

    const allEnglishLines = [];

    textSources.forEach(
        function (textSource) {
            const englishLines =
                extractEnglishLines(textSource);

            englishLines.forEach(
                function (line) {
                    if (
                        !allEnglishLines.includes(line)
                    ) {
                        allEnglishLines.push(line);
                    }
                }
            );
        }
    );

    if (allEnglishLines.length === 0) {
        const latestWritingEditor =
            findLatestWritingEditor();

        if (latestWritingEditor) {
            const editorEnglishLines =
                extractEnglishLines(
                    latestWritingEditor
                );

            editorEnglishLines.forEach(
                function (line) {
                    if (
                        !allEnglishLines.includes(line)
                    ) {
                        allEnglishLines.push(line);
                    }
                }
            );
        }
    }

    return allEnglishLines.join(" ");
}

function isEnglishText(text) {
    const containsEnglish =
        /[A-Za-z]/.test(text);

    const containsChinese =
        /[\u4e00-\u9fff]/.test(text);

    return containsEnglish && !containsChinese;
}

function extractEnglishLines(textElement) {
    const cleanText =
        getCleanText(textElement);

    const lines =
        cleanText.split("\n");

    return lines
        .map(
            function (line) {
                return line.trim();
            }
        )
        .filter(
            function (line) {
                return (
                    line &&
                    isEnglishText(line)
                );
            }
        );
}

function loadSpeechSettings(callback) {
    chrome.storage.sync.get(
        [
            "voiceURI",
            "voiceName",
            "voiceLang",
            "speechRate"
        ],
        function (settings) {
            selectedVoicePreference = {
                voiceURI:
                    settings.voiceURI || "",
                name:
                    settings.voiceName || "",
                lang:
                    settings.voiceLang || ""
            };

            if (
                typeof settings.speechRate
                === "number"
            ) {
                selectedSpeechRate =
                    settings.speechRate;
            }

            callback();
        }
    );
}


function saveVoicePreference(voice) {
    if (!voice) {
        selectedVoicePreference = {
            voiceURI: "",
            name: "",
            lang: ""
        };

        chrome.storage.sync.set({
            voiceURI: "",
            voiceName: "",
            voiceLang: ""
        });

        return;
    }

    selectedVoicePreference = {
        voiceURI: voice.voiceURI,
        name: voice.name,
        lang: voice.lang
    };

    chrome.storage.sync.set({
        voiceURI: voice.voiceURI,
        voiceName: voice.name,
        voiceLang: voice.lang
    });
}


function saveSpeechRate(rate) {
    selectedSpeechRate = rate;

    chrome.storage.sync.set({
        speechRate: rate
    });
}


function loadAvailableVoices() {
    const allVoices =
        window.speechSynthesis.getVoices();

    availableEnglishVoices =
        allVoices
            .filter(
                function (voice) {
                    return voice.lang
                        .toLowerCase()
                        .startsWith("en");
                }
            )
            .sort(
                function (
                    firstVoice,
                    secondVoice
                ) {
                    const languageComparison =
                        firstVoice.lang.localeCompare(
                            secondVoice.lang
                        );

                    if (languageComparison !== 0) {
                        return languageComparison;
                    }

                    return firstVoice.name.localeCompare(
                        secondVoice.name
                    );
                }
            );
}


function chooseSpeechVoice() {
    const voices =
        availableEnglishVoices;

    if (voices.length === 0) {
        return null;
    }

    if (
        selectedVoicePreference.voiceURI
    ) {
        const exactURI = voices.find(
            function (voice) {
                return (
                    voice.voiceURI ===
                    selectedVoicePreference.voiceURI
                );
            }
        );

        if (exactURI) {
            return exactURI;
        }
    }

    if (
        selectedVoicePreference.name &&
        selectedVoicePreference.lang
    ) {
        const exactNameAndLanguage =
            voices.find(
                function (voice) {
                    return (
                        voice.name ===
                            selectedVoicePreference.name &&
                        voice.lang ===
                            selectedVoicePreference.lang
                    );
                }
            );

        if (exactNameAndLanguage) {
            return exactNameAndLanguage;
        }
    }

    if (selectedVoicePreference.lang) {
        const sameLanguage = voices.find(
            function (voice) {
                return (
                    voice.lang ===
                    selectedVoicePreference.lang
                );
            }
        );

        if (sameLanguage) {
            return sameLanguage;
        }
    }

    const danielVoice = voices.find(
        function (voice) {
            return voice.name.includes(
                "Daniel"
            );
        }
    );

    if (danielVoice) {
        return danielVoice;
    }

    const britishVoice = voices.find(
        function (voice) {
            return voice.lang === "en-GB";
        }
    );

    if (britishVoice) {
        return britishVoice;
    }

    const americanVoice = voices.find(
        function (voice) {
            return voice.lang === "en-US";
        }
    );

    if (americanVoice) {
        return americanVoice;
    }

    return voices[0];
}

function speakText(text) {
    window.speechSynthesis.cancel();

    loadAvailableVoices();

    const message =
        new SpeechSynthesisUtterance(text);

    const selectedVoice =
        chooseSpeechVoice();

    if (selectedVoice) {
        message.voice = selectedVoice;
        message.lang = selectedVoice.lang;
    } else {
        message.lang = "en-GB";
    }

    message.rate =
        selectedSpeechRate;

    window.speechSynthesis.speak(message);
}

function getTextPositionFromPoint(
    x,
    y
) {
    if (
        document.caretPositionFromPoint
    ) {
        const position =
            document.caretPositionFromPoint(
                x,
                y
            );

        if (!position) {
            return null;
        }

        return {
            node: position.offsetNode,
            offset: position.offset
        };
    }

    if (
        document.caretRangeFromPoint
    ) {
        const range =
            document.caretRangeFromPoint(
                x,
                y
            );

        if (!range) {
            return null;
        }

        return {
            node: range.startContainer,
            offset: range.startOffset
        };
    }

    return null;
}

function isSupportedWordArea(
    textNode
) {
    if (
        !textNode ||
        textNode.nodeType !==
            Node.TEXT_NODE
    ) {
        return false;
    }

    const parentElement =
        textNode.parentElement;

    if (!parentElement) {
        return false;
    }

    const insideTrainerUI =
        parentElement.closest(
            "#english-trainer-panel, " +
            "#english-trainer-toast, " +
            ".english-trainer-inline-button, " +
            ".english-trainer-sentence-controls"
        );

    if (insideTrainerUI) {
        return false;
    }

    const markdown =
        parentElement.closest(
            ".markdown"
        );

    const assistantMessage =
        markdown
            ? markdown.closest(
                '[data-message-author-role="assistant"]'
            )
            : null;

    if (assistantMessage) {
        return true;
    }

    const writingEditor =
        parentElement.closest(
            WRITING_EDITOR_SELECTOR
        );

    return Boolean(writingEditor);
}

function getWordAtPoint(
    x,
    y
) {
    const textPosition =
        getTextPositionFromPoint(
            x,
            y
        );

    if (!textPosition) {
        return null;
    }

    const textNode =
        textPosition.node;

    if (
        !isSupportedWordArea(
            textNode
        )
    ) {
        return null;
    }

    const text =
        textNode.textContent || "";

    if (!text) {
        return null;
    }

    let characterIndex =
        textPosition.offset;

    if (
        characterIndex >= text.length
    ) {
        characterIndex =
            text.length - 1;
    }

    const isWordCharacter =
        function (character) {
            return (
                /[A-Za-z'’\-]/.test(
                    character
                )
            );
        };

    if (
        !isWordCharacter(
            text[characterIndex]
        )
    ) {
        if (
            characterIndex > 0 &&
            isWordCharacter(
                text[
                    characterIndex - 1
                ]
            )
        ) {
            characterIndex -= 1;
        } else {
            return null;
        }
    }

    let start = characterIndex;
    let end = characterIndex + 1;

    while (
        start > 0 &&
        isWordCharacter(
            text[start - 1]
        )
    ) {
        start -= 1;
    }

    while (
        end < text.length &&
        isWordCharacter(
            text[end]
        )
    ) {
        end += 1;
    }

    const rawWord =
        text.slice(start, end);

    const cleanWord =
        rawWord.replace(
            /^['’\-]+|['’\-]+$/g,
            ""
        );

    if (
        !/[A-Za-z]/.test(cleanWord)
    ) {
        return null;
    }

    return {
        word: cleanWord,
        node: textNode,
        start: start,
        end: end
    };
}

function isSameWordTarget(
    firstTarget,
    secondTarget
) {
    if (
        !firstTarget ||
        !secondTarget
    ) {
        return false;
    }

    return (
        firstTarget.node ===
            secondTarget.node &&
        firstTarget.start ===
            secondTarget.start &&
        firstTarget.end ===
            secondTarget.end
    );
}

function clearWordHoverTimer() {
    if (wordHoverTimer) {
        clearTimeout(
            wordHoverTimer
        );

        wordHoverTimer = null;
    }
}


function resetWordHover() {
    clearWordHoverTimer();

    currentWordTarget = {
        node: null,
        start: -1,
        end: -1
    };
}

function scheduleWordSpeech(
    x,
    y
) {
    const wordTarget =
        getWordAtPoint(
            x,
            y
        );

    if (!wordTarget) {
        resetWordHover();
        return;
    }

    if (
        isSameWordTarget(
            currentWordTarget,
            wordTarget
        )
    ) {
        return;
    }

    clearWordHoverTimer();

    currentWordTarget =
        wordTarget;

    wordHoverTimer =
        setTimeout(
            function () {
                if (
                    !optionKeyIsPressed
                ) {
                    return;
                }

                const latestTarget =
                    getWordAtPoint(
                        lastPointerPosition.x,
                        lastPointerPosition.y
                    );

                if (
                    !isSameWordTarget(
                        currentWordTarget,
                        latestTarget
                    )
                ) {
                    return;
                }

                speakText(
                    latestTarget.word
                );

                wordHoverTimer = null;
            },
            250
        );
}

function createInlineSpeechButton(
    sentence
) {
    const button =
        document.createElement("button");

    button.className =
        "english-trainer-inline-button";

    button.type = "button";
    button.title =
        "Play: " + sentence;

    button.setAttribute(
        "aria-label",
        "Play this sentence"
    );

    button.addEventListener(
        "click",
        function (event) {
            event.preventDefault();
            event.stopPropagation();

            speakText(sentence);
        }
    );

    return button;
}


function addInlineButtonsForTextElement(
    textElement
) {
    const englishLines =
        extractEnglishLines(textElement);

    const textSignature =
        englishLines.join("|");

    if (
        textElement.dataset
            .englishTrainerInlineSignature
        === textSignature
    ) {
        return;
    }

    textElement.dataset
        .englishTrainerInlineSignature =
        textSignature;

    const oldButtons =
        textElement.querySelectorAll(
            ".english-trainer-inline-button"
        );

    oldButtons.forEach(
        function (button) {
            button.remove();
        }
    );

    const lineGroups = [];

    let currentLineNodes = [];

    const childNodes =
        Array.from(
            textElement.childNodes
        );

    childNodes.forEach(
        function (node) {
            const isLineBreak =
                node.nodeType ===
                    Node.ELEMENT_NODE &&
                node.tagName === "BR";

            if (isLineBreak) {
                lineGroups.push({
                    nodes: currentLineNodes,
                    lineBreak: node
                });

                currentLineNodes = [];
                return;
            }

            const isTrainerButton =
                node.nodeType ===
                    Node.ELEMENT_NODE &&
                node.classList.contains(
                    "english-trainer-inline-button"
                );

            if (!isTrainerButton) {
                currentLineNodes.push(node);
            }
        }
    );

    lineGroups.push({
        nodes: currentLineNodes,
        lineBreak: null
    });

    lineGroups.forEach(
        function (lineGroup) {
            const lineText =
                lineGroup.nodes
                    .map(
                        function (node) {
                            return (
                                node.textContent ||
                                ""
                            );
                        }
                    )
                    .join("")
                    .trim();

            if (
                !lineText ||
                !isEnglishText(lineText)
            ) {
                return;
            }

            const button =
                createInlineSpeechButton(
                    lineText
                );

            if (lineGroup.lineBreak) {
                textElement.insertBefore(
                    button,
                    lineGroup.lineBreak
                );
            } else {
                textElement.appendChild(
                    button
                );
            }
        }
    );
}

function addControlsForTextElement(
    textElement
) {
    const englishLines =
        extractEnglishLines(textElement);

    const textSignature =
        englishLines.join("|");

    if (
        textElement.dataset
            .englishTrainerSignature
        === textSignature
    ) {
        return;
    }

    textElement.dataset
        .englishTrainerSignature =
        textSignature;

    const oldControls =
        textElement.nextElementSibling;

    if (
        oldControls &&
        oldControls.classList.contains(
            "english-trainer-sentence-controls"
        )
    ) {
        oldControls.remove();
    }

    if (englishLines.length === 0) {
        return;
    }

    const controls =
        document.createElement("div");

    controls.className =
        "english-trainer-sentence-controls";

    englishLines.forEach(
        function (sentence, index) {
            const button =
                document.createElement("button");

            button.className =
                "english-trainer-sentence-button";

            button.textContent =
                "🔊 " + (index + 1);

            button.title = sentence;
            button.type = "button";

            button.addEventListener(
                "click",
                function (event) {
                    event.preventDefault();
                    event.stopPropagation();

                    speakText(sentence);
                }
            );

            controls.appendChild(button);
        }
    );

    textElement.insertAdjacentElement(
        "afterend",
        controls
    );
}

function addSentenceButtons() {
    const assistantMessages =
        document.querySelectorAll(
            '[data-message-author-role="assistant"]'
        );

    assistantMessages.forEach(
        function (assistantMessage) {
            const inlineTextElements =
                assistantMessage.querySelectorAll(
                    ".markdown p, " +
                    ".markdown li"
                );

            inlineTextElements.forEach(
                function (textElement) {
                    const insideWritingEditor =
                        textElement.closest(
                            WRITING_EDITOR_SELECTOR
                        );

                    if (insideWritingEditor) {
                        return;
                    }

                    const listItemContainsParagraph =
                        textElement.matches("li") &&
                        textElement.querySelector("p");

                    if (listItemContainsParagraph) {
                        return;
                    }

                    addInlineButtonsForTextElement(
                        textElement
                    );
                }
            );


            const blockTextElements =
                assistantMessage.querySelectorAll(
                    ".markdown pre"
                );

            blockTextElements.forEach(
                function (textElement) {
                    const insideWritingEditor =
                        textElement.closest(
                            WRITING_EDITOR_SELECTOR
                        );

                    if (insideWritingEditor) {
                        return;
                    }

                    addControlsForTextElement(
                        textElement
                    );
                }
            );

            const writingEditors =
                assistantMessage.querySelectorAll(
                    WRITING_EDITOR_SELECTOR
                );

            writingEditors.forEach(
                function (editor) {
                    addControlsForTextElement(
                        editor
                    );
                }
            );
        }
    );

    const pageWritingEditors =
        findWritingEditors();

    pageWritingEditors.forEach(
        function (editor) {
            addControlsForTextElement(
                editor
            );
        }
    );
}

function showToast(message) {
    const existingToast =
        document.querySelector("#english-trainer-toast");

    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement("div");

    toast.id = "english-trainer-toast";
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(
        function () {
            toast.remove();
        },
        3000
    );
}

function updateVoiceMenu() {
    loadAvailableVoices();

    const voiceSelect =
        document.querySelector(
            "#english-trainer-voice"
        );

    if (!voiceSelect) {
        return;
    }

    voiceSelect.innerHTML = "";

    const autoOption =
        document.createElement("option");

    autoOption.value = "";
    autoOption.textContent =
        "Auto — Recommended";

    voiceSelect.appendChild(
        autoOption
    );

    availableEnglishVoices.forEach(
        function (voice) {
            const option =
                document.createElement(
                    "option"
                );

            option.value =
                voice.voiceURI;

            option.textContent =
                voice.name +
                " — " +
                voice.lang;

            voiceSelect.appendChild(
                option
            );
        }
    );

    const savedVoiceExists =
        availableEnglishVoices.some(
            function (voice) {
                return (
                    voice.voiceURI ===
                    selectedVoicePreference.voiceURI
                );
            }
        );

    if (savedVoiceExists) {
        voiceSelect.value =
            selectedVoicePreference.voiceURI;
    } else {
        voiceSelect.value = "";
    }
}

function addTrainerPanel() {
    const existingPanel =
        document.querySelector(
            "#english-trainer-panel"
        );

    if (existingPanel) {
        return;
    }

    const panel =
        document.createElement("div");

    panel.id =
        "english-trainer-panel";

    const voiceHeader =
        document.createElement("div");

    voiceHeader.className =
        "english-trainer-voice-header";

    const voiceLabel =
        document.createElement("label");

    voiceLabel.htmlFor =
        "english-trainer-voice";

    voiceLabel.textContent =
        "Voice";

    const wordHint =
        document.createElement("span");

    wordHint.className =
        "english-trainer-word-hint";

    wordHint.textContent =
        "Hold Option/Alt over a word";

    const voiceSelect =
        document.createElement("select");

    voiceSelect.id =
        "english-trainer-voice";

    voiceSelect.addEventListener(
        "change",
        function () {
            const selectedVoice =
                availableEnglishVoices.find(
                    function (voice) {
                        return (
                            voice.voiceURI ===
                            voiceSelect.value
                        );
                    }
                );

            saveVoicePreference(
                selectedVoice || null
            );
        }
    );


    const rateRow =
        document.createElement("div");

    rateRow.className =
        "english-trainer-rate-row";


    const rateLabel =
        document.createElement("label");

    rateLabel.htmlFor =
        "english-trainer-rate";

    rateLabel.textContent =
        "Speed";


    const rateInput =
        document.createElement("input");

    rateInput.id =
        "english-trainer-rate";

    rateInput.type = "range";
    rateInput.min = "0.5";
    rateInput.max = "1.2";
    rateInput.step = "0.1";
    rateInput.value =
        String(selectedSpeechRate);


    const rateValue =
        document.createElement("span");

    rateValue.id =
        "english-trainer-rate-value";

    rateValue.textContent =
        selectedSpeechRate.toFixed(1) +
        "×";


    rateInput.addEventListener(
        "input",
        function () {
            const newRate =
                Number(rateInput.value);

            rateValue.textContent =
                newRate.toFixed(1) + "×";

            saveSpeechRate(newRate);
        }
    );


    const playButton =
        document.createElement("button");

    playButton.id =
        "english-trainer-button";

    playButton.textContent =
        "Play Last Answer";


    playButton.addEventListener(
        "click",
        function () {
            const latestMessage =
                findLatestAssistantMessage();

            if (!latestMessage) {
                showToast(
                    "No ChatGPT answer was found."
                );
                return;
            }

            const text =
                extractEnglishText(
                    latestMessage
                );

            if (!text) {
                showToast(
                    "No English text was found."
                );
                return;
            }

            speakText(text);
        }
    );


    rateRow.appendChild(rateLabel);
    rateRow.appendChild(rateInput);
    rateRow.appendChild(rateValue);

    voiceHeader.appendChild(
        voiceLabel
    );

    voiceHeader.appendChild(
        wordHint
    );

    panel.appendChild(
        voiceHeader
    );

    panel.appendChild(
        voiceSelect
    );

    panel.appendChild(
        rateRow
    );

    panel.appendChild(
        playButton
    );

    document.body.appendChild(panel);


    loadSpeechSettings(
        function () {
            rateInput.value =
                String(selectedSpeechRate);

            rateValue.textContent =
                selectedSpeechRate.toFixed(1) +
                "×";

            updateVoiceMenu();
        }
    );
}


addTrainerPanel();
addSentenceButtons();


window.speechSynthesis.addEventListener(
    "voiceschanged",
    updateVoiceMenu
);


const pageObserver =
    new MutationObserver(
        function () {
            addSentenceButtons();
        }
    );


pageObserver.observe(
    document.body,
    {
        childList: true,
        subtree: true
    }
);

document.addEventListener(
    "mousemove",
    function (event) {
        lastPointerPosition = {
            x: event.clientX,
            y: event.clientY,
            available: true
        };

        optionKeyIsPressed =
            event.altKey;

        if (!event.altKey) {
            resetWordHover();
            return;
        }

        scheduleWordSpeech(
            event.clientX,
            event.clientY
        );
    }
);


document.addEventListener(
    "keydown",
    function (event) {
        if (event.key !== "Alt") {
            return;
        }

        optionKeyIsPressed = true;

        if (
            lastPointerPosition.available
        ) {
            scheduleWordSpeech(
                lastPointerPosition.x,
                lastPointerPosition.y
            );
        }
    }
);


document.addEventListener(
    "keyup",
    function (event) {
        if (event.key !== "Alt") {
            return;
        }

        optionKeyIsPressed = false;
        resetWordHover();
    }
);


window.addEventListener(
    "blur",
    function () {
        optionKeyIsPressed = false;
        resetWordHover();
    }
);