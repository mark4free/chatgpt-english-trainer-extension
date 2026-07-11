# ChatGPT English Trainer

一个为 ChatGPT 网页版增加英语朗读功能的浏览器扩展。

它保留 ChatGPT 原有的聊天体验，并在英文回答上增加全文朗读、单句朗读和单词悬停朗读。

> This is an independent personal project and is not affiliated with or endorsed by OpenAI.

## 功能

- 朗读最后一条 ChatGPT 回答中的全部英文
- 跳过中英双语回答中的中文内容
- 在普通英文句子末尾增加单句播放按钮
- 英文标题同样支持单独播放
- 支持识别以英文为主的中英混合句，并只朗读其中的英文
- 支持 ChatGPT writing block 中的英文朗读
- 按住 Option（macOS）或 Alt（Windows），将鼠标停在英文单词上即可朗读
- 自主选择浏览器当前可用的英文声音
- 调整朗读速度
- 自动保存声音和语速设置
- 右下角控制面板可自由拖动，并自动记住位置
- 光标离开控制面板后自动变为半透明，减少对正文的遮挡
- 当前声音不可用时自动选择其他英文声音
- 不影响 ChatGPT 原有的文本复制、选择和编辑

## 支持环境

当前主要测试环境：

- Google Chrome
- macOS
- ChatGPT 网页版：`https://chatgpt.com`

设计上同时兼容：

- Microsoft Edge
- Windows

不同操作系统提供的语音不同。扩展会读取当前浏览器实际可用的英文声音，并显示在 Voice 菜单中。

## 安装

本项目目前未发布到 Chrome Web Store，需要通过开发者模式加载。

1. 下载或克隆本仓库。
2. 打开 Chrome。
3. 在地址栏输入：

   ```text
   chrome://extensions
   ```

4. 打开右上角的“开发者模式”。
5. 点击“加载已解压的扩展程序”。
6. 选择包含 `manifest.json` 的项目文件夹。
7. 打开或刷新 `https://chatgpt.com`。

修改扩展代码后，需要：

1. 返回 `chrome://extensions`。
2. 点击扩展卡片上的刷新按钮。
3. 刷新 ChatGPT 页面。

## 使用方法

### 全文朗读

点击右下角控制面板中的：

```text
Play Last Answer
```

扩展会寻找当前对话中最后一条 ChatGPT 回答，并朗读其中识别到的英文内容。

### 单句朗读

普通英文回答的每个可识别段落会显示一个播放按钮。

点击按钮，只朗读对应的英文内容。

如果同一段中同时包含英文和中文，扩展会忽略中文翻译，只朗读识别到的英文。为了保持 ChatGPT 原有的段落排版，按钮会放在英文句尾或整个中英段落的末尾。

在 writing block 中，普通正文的播放按钮集中显示在编辑区域外部；英文标题会直接显示单句播放按钮。

### 单词朗读

macOS：

```text
按住 Option，将鼠标停在英文单词上
```

Windows：

```text
按住 Alt，将鼠标停在英文单词上
```

鼠标短暂停留后，扩展会朗读光标下的单词。

该功能不需要点击，因此不会占用链接点击、文本选择或 writing block 编辑操作。

支持常见形式，例如：

```text
English
don't
teacher's
well-known
```

### 选择声音

使用右下角的 Voice 菜单选择当前浏览器可用的英文声音。

声音来源于操作系统和浏览器，因此：

- macOS 和 Windows 的声音列表不同
- 某些 macOS Siri 声音可能不会开放给 Chrome
- 换设备后可能需要重新选择声音

选择 `Auto — Recommended` 时，扩展会自动选择可用的英文声音。

### 调整语速

使用 Speed 滑块调整朗读速度。

默认速度：

```text
0.8×
```

当前范围：

```text
0.5× – 1.2×
```

全文、单句和单词朗读共享相同的声音与语速设置。

## 自动声音降级

如果已选择的声音在当前设备上不存在，扩展会依次尝试：

1. 完全匹配的声音
2. 相同语言和地区的声音
3. Daniel
4. 其他 `en-GB` 声音
5. 其他 `en-US` 声音
6. 任意英文声音
7. 浏览器默认声音

## 隐私

本扩展：

- 不调用外部 AI API
- 不上传 ChatGPT 对话
- 不需要 OpenAI API Key
- 不需要额外的语音服务账号
- 使用浏览器的 Web Speech API 朗读
- 使用 `chrome.storage.sync` 保存声音和语速设置
- 使用 `chrome.storage.local` 保存控制面板位置
- 只在 `https://chatgpt.com/*` 页面运行

## 项目结构

```text
chatgpt-english-trainer-extension/
├── manifest.json
├── content.js
├── styles.css
├── README.md
├── LICENSE
└── .gitignore
```

文件职责：

- `manifest.json`：定义扩展名称、权限和运行页面
- `content.js`：识别 ChatGPT 回答并实现朗读功能
- `styles.css`：控制播放按钮和设置面板的视觉样式
- `README.md`：安装和使用说明
- `LICENSE`：MIT 开源许可证
- `.gitignore`：排除不需要提交的本地文件

## 已知限制

- ChatGPT 网页结构更新后，部分选择器可能需要调整
- 当前英文识别主要基于拉丁字母与中文字符规则，并不是真正的语言识别模型
- 意大利语、法语、葡萄牙语等拉丁字母语言也可能被识别为可朗读内容
- 同一行中的多个短句会作为一个整体朗读
- writing block 使用外部编号按钮，以避免破坏编辑和复制
- 语音自然度取决于当前操作系统安装的声音
- Linux 桌面可能会占用 Alt 组合键，尚未作为主要测试平台

## 开发原则

本项目优先保证：

1. 不破坏 ChatGPT 原有功能
2. 不修改用户的回答正文
3. 不影响文本选择和复制
4. 不依赖额外付费 API
5. 在普通高频场景中提供清晰、稳定的英语学习体验

## 版本

当前版本：

```text
0.2.0
```

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
