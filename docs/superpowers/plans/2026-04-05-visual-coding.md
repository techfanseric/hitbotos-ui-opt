# 动作编辑器 - 可视化编程模式实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在动作编辑窗口中集成 Blockly（积木编程）和 JointJS（流程图）两种可视化编程模式，均可切换到 Python 代码视图。

**Architecture:** 动作编辑窗口内部分为三个面板（Blockly / 流程图 / 代码），通过工具栏切换。Blockly 使用内置 Python 生成器，JointJS 通过自定义遍历算法生成 Python 代码。所有编辑器封装为独立模块，由 ActionEditor 主模块统一管理。

**Tech Stack:** Blockly (CDN), JointJS (CDN), CodeMirror 5 (CDN), 纯 HTML/CSS/JS

---

## 文件结构

```
新增文件:
  css/action-editor.css           - 编辑器工具栏、容器、Stencil 侧边栏样式
  js/action-editor.js             - ActionEditor 主模块（模式切换、初始化、resize）
  js/blockly-editor.js            - Blockly 编辑器封装（初始化、主题、resize）
  js/blockly-blocks.js            - 自定义 Block 定义（机器人动作 block JSON）
  js/blockly-python-gen.js        - 自定义 Block 的 Python 代码生成器
  js/flowchart-editor.js          - JointJS 流程图编辑器封装（画布、Stencil、节点）
  js/flowchart-python-gen.js      - JointJS Graph JSON -> Python 代码生成器

修改文件:
  index.html:8-14                 - head 中添加 CDN 依赖（Blockly、JointJS、CodeMirror）
  index.html:376-380              - 替换动作编辑窗口内容为编辑器 HTML
  script.js:27-31                 - DOMContentLoaded 中初始化 ActionEditor
```

---

### Task 1: 添加 CDN 依赖并替换窗口 HTML

**Files:**
- Modify: `index.html:8-14` (添加 CDN link/script)
- Modify: `index.html:376-380` (替换 window-content)
- Create: `css/action-editor.css`

- [ ] **Step 1: 在 index.html head 中添加 CDN 依赖**

在 `index.html` 第 14 行（`css/device-library-panel.css` 之后）添加：

```html
    <!-- Blockly -->
    <script src="https://unpkg.com/blockly/blockly.min.js"></script>
    <!-- JointJS -->
    <script src="https://unpkg.com/@joint/core/dist/joint.js"></script>
    <!-- CodeMirror -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/theme/dracula.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/python/python.min.js"></script>
```

- [ ] **Step 2: 替换动作编辑窗口的 window-content**

将 `index.html:376-380` 的占位符替换为编辑器 HTML 结构：

```html
                <div class="window-content action-editor-content">
                    <!-- 编辑器工具栏 -->
                    <div class="ae-toolbar">
                        <div class="ae-toolbar-left">
                            <div class="ae-mode-switch">
                                <button class="ae-mode-btn active" data-mode="blockly">
                                    <i class="bi bi-puzzle"></i> Blockly
                                </button>
                                <button class="ae-mode-btn" data-mode="flowchart">
                                    <i class="bi bi-diagram-2"></i> 流程图
                                </button>
                                <button class="ae-mode-btn" data-mode="code">
                                    <i class="bi bi-code-slash"></i> 代码
                                </button>
                            </div>
                        </div>
                        <div class="ae-toolbar-right">
                            <!-- Blockly 工具 -->
                            <div class="ae-tools ae-tools-blockly">
                                <button class="ae-tool-btn" data-action="undo" title="撤销"><i class="bi bi-arrow-counterclockwise"></i></button>
                                <button class="ae-tool-btn" data-action="redo" title="重做"><i class="bi bi-arrow-clockwise"></i></button>
                                <button class="ae-tool-btn" data-action="clear" title="清空"><i class="bi bi-trash3"></i></button>
                            </div>
                            <!-- 流程图工具 -->
                            <div class="ae-tools ae-tools-flowchart" style="display:none">
                                <button class="ae-tool-btn" data-action="auto-layout" title="自动布局"><i class="bi bi-grid-3x3"></i></button>
                                <button class="ae-tool-btn" data-action="zoom-in" title="放大"><i class="bi bi-zoom-in"></i></button>
                                <button class="ae-tool-btn" data-action="zoom-out" title="缩小"><i class="bi bi-zoom-out"></i></button>
                                <button class="ae-tool-btn" data-action="clear" title="清空"><i class="bi bi-trash3"></i></button>
                            </div>
                            <!-- 代码工具 -->
                            <div class="ae-tools ae-tools-code" style="display:none">
                                <button class="ae-tool-btn" data-action="copy" title="复制代码"><i class="bi bi-clipboard"></i></button>
                                <button class="ae-tool-btn" data-action="run" title="运行"><i class="bi bi-play-fill"></i></button>
                            </div>
                            <button class="ae-tool-btn" data-action="generate-code" title="生成代码"><i class="bi bi-arrow-right"></i> 生成代码</button>
                        </div>
                    </div>
                    <!-- 编辑器容器 -->
                    <div class="ae-container">
                        <div id="blockly-editor" class="ae-panel"></div>
                        <div id="flowchart-editor" class="ae-panel" style="display:none">
                            <div class="ae-stencil-panel">
                                <div class="ae-stencil-item" data-shape="start">开始</div>
                                <div class="ae-stencil-item" data-shape="end">结束</div>
                                <div class="ae-stencil-item" data-shape="action">动作指令</div>
                                <div class="ae-stencil-item" data-shape="decision">判断</div>
                            </div>
                            <div id="flowchart-canvas"></div>
                        </div>
                        <div id="code-editor" class="ae-panel" style="display:none">
                            <textarea id="python-code"></textarea>
                        </div>
                    </div>
                </div>
```

- [ ] **Step 3: 创建 action-editor.css**

创建 `css/action-editor.css`，包含编辑器工具栏、容器、Stencil 面板、模式切换按钮的样式，匹配项目深色主题（`#2b2b2b`）。

- [ ] **Step 4: 在 index.html head 中引入 action-editor.css**

在已有的 CSS link 之后添加：
```html
    <link rel="stylesheet" href="css/action-editor.css">
```

- [ ] **Step 5: 用浏览器验证 HTML 结构渲染正确**

打开页面，选择包含动作编辑窗口的布局，确认工具栏和三个面板区域正确显示。

- [ ] **Step 6: Commit**

```bash
git add index.html css/action-editor.css
git commit -m "feat: add action editor HTML structure and CDN dependencies"
```

---

### Task 2: 实现 ActionEditor 主模块和模式切换

**Files:**
- Create: `js/action-editor.js`
- Modify: `script.js:27-31`

- [ ] **Step 1: 创建 js/action-editor.js**

实现 `ActionEditor` 类：
- `constructor(containerElement)` - 获取 DOM 元素引用
- `init()` - 初始化模式切换按钮事件、工具栏按钮事件、CodeMirror 实例
- `switchMode(mode)` - 切换 blockly/flowchart/code 面板显示
- `generateCode()` - 根据当前模式调用对应的代码生成器
- `handleToolAction(action)` - 处理工具栏按钮（撤销/重做/清空/复制/运行等）
- `resize()` - resize 当前活跃的编辑器（Blockly/JointJS/CodeMirror）
- `getCurrentMode()` - 返回当前模式

- [ ] **Step 2: 在 script.js 的 DOMContentLoaded 中初始化 ActionEditor**

在 `script.js` 的 `DOMContentLoaded` 回调中（约第 27 行设备库初始化之后）添加：

```javascript
// 初始化动作编辑器
import('./js/action-editor.js').then(module => {
    const actionWindow = document.querySelector('.action-window');
    if (actionWindow) {
        const actionEditor = new module.ActionEditor(actionWindow);
        actionEditor.init();
        window.actionEditor = actionEditor;
    }
});
```

- [ ] **Step 3: 用浏览器验证模式切换**

打开页面，点击 Blockly / 流程图 / 代码 三个按钮，确认面板正确切换。点击工具栏按钮确认响应正常。

- [ ] **Step 4: Commit**

```bash
git add js/action-editor.js script.js
git commit -m "feat: implement ActionEditor module with mode switching"
```

---

### Task 3: 实现 Blockly 编辑器

**Files:**
- Create: `js/blockly-editor.js`
- Create: `js/blockly-blocks.js`
- Create: `js/blockly-python-gen.js`

- [ ] **Step 1: 创建 js/blockly-blocks.js**

定义自定义 Block：
- `robot_move_to(x, y, z)` - 移动到坐标
- `robot_grab()` - 抓取
- `robot_release()` - 释放
- `robot_rotate(angle)` - 旋转
- `robot_wait(seconds)` - 等待
- `robot_is_holding()` - 判断是否持有物体（返回布尔值）

每个 Block 使用 `Blockly.defineBlocksWithJsonArray()` 定义，包含 message0、args0、previousStatement、nextStatement、colour 等属性。

- [ ] **Step 2: 创建 js/blockly-python-gen.js**

为每个自定义 Block 编写 Python 生成逻辑：
- `robot_move_to` -> `robot.move_to(x, y, z)`
- `robot_grab` -> `robot.grab()`
- `robot_release` -> `robot.release()`
- `robot_rotate` -> `robot.rotate(angle)`
- `robot_wait` -> `robot.wait(seconds)`
- `robot_is_holding` -> `robot.is_holding()`

- [ ] **Step 3: 创建 js/blockly-editor.js**

实现 `BlocklyEditor` 类：
- `constructor(containerElement)` - 保存容器引用
- `init()` - 注入 Blockly workspace，配置深色主题、toolbox（包含机器人动作/控制流/逻辑/数值/变量分类）、grid、zoom、trashcan
- `getPythonCode()` - 调用 `python.pythonGenerator.workspaceToCode(workspace)` 返回代码
- `clear()` - 清空 workspace
- `undo()` / `redo()` - 撤销/重做
- `resize()` - 调用 `Blockly.svgResize(workspace)`
- `dispose()` - 清理 Blockly workspace

- [ ] **Step 4: 在 action-editor.js 中集成 BlocklyEditor**

在 `ActionEditor.init()` 中创建 `BlocklyEditor` 实例，在 `generateCode()` 中调用其 `getPythonCode()`。

需要确保 `blockly-blocks.js` 和 `blockly-python-gen.js` 在 `blockly-editor.js` 之前加载（通过 import 顺序）。

- [ ] **Step 5: 用浏览器验证 Blockly 编辑器**

打开页面，切换到 Blockly 模式，确认：
- 工具箱分类正确显示
- 可以拖拽 block 到工作区
- 点击"生成代码"切换到代码视图，显示 Python 代码
- 深色主题生效

- [ ] **Step 6: Commit**

```bash
git add js/blockly-editor.js js/blockly-blocks.js js/blockly-python-gen.js js/action-editor.js
git commit -m "feat: implement Blockly editor with custom robot blocks"
```

---

### Task 4: 实现 JointJS 流程图编辑器

**Files:**
- Create: `js/flowchart-editor.js`
- Create: `js/flowchart-python-gen.js`

- [ ] **Step 1: 创建 js/flowchart-editor.js**

实现 `FlowchartEditor` 类：
- `constructor(containerElement)` - 保存容器引用（`#flowchart-canvas`）
- `init()` - 创建 JointJS Graph + Paper，配置 SVG 渲染
- `createNode(type, position)` - 创建节点（椭圆/矩形/菱形），根据 type 设置形状、颜色、文字
- `setupStencil()` - 实现左侧 Stencil 面板的拖拽功能（mousedown/mousemove/mouseup 或使用 JointJS 的基本拖拽）
- `setupInteraction()` - 双击节点编辑、连线验证（开始节点无入线，结束节点无出线等）
- `autoLayout()` - 使用 Dagre 算法自动排列节点（JointJS 支持 `joint.layout.DirectedGraph`）
- `getGraphJSON()` - 导出 Graph 为 JSON 结构
- `clear()` - 清空所有节点和连线
- `zoomIn()` / `zoomOut()` - 缩放
- `resize()` - 调整 Paper 大小
- `dispose()` - 清理 Paper 和 Graph

节点类型配置：
- start: `joint.shapes.standard.Ellipse`, 填充 `#4CAF50`
- end: `joint.shapes.standard.Ellipse`, 填充 `#BD1C22`
- action: `joint.shapes.standard.Rectangle`, 填充 `#2196F3`
- decision: `joint.shapes.standard.Polygon`（菱形），填充 `#FF9800`

- [ ] **Step 2: 创建 js/flowchart-python-gen.js**

实现 `FlowchartPythonGenerator` 类：
- `generate(graphJSON)` - 从 Graph JSON 生成 Python 代码
- `traverseNodes(startNode, graphJSON)` - 从 start 节点出发 DFS 遍历
- `nodeToCode(node)` - 单个节点转 Python 代码
- `decisionToCode(node, trueTarget, falseTarget)` - 判断节点转 if/else

- [ ] **Step 3: 在 action-editor.js 中集成 FlowchartEditor**

在 `ActionEditor.init()` 中创建 `FlowchartEditor` 实例，在 `generateCode()` 中调用其 `getPythonCode()`。

- [ ] **Step 4: 用浏览器验证流程图编辑器**

打开页面，切换到流程图模式，确认：
- 左侧 Stencil 面板显示四种节点类型
- 拖拽节点到画布成功
- 节点之间可以连线
- 自动布局按钮有效
- 双击节点可编辑
- 点击"生成代码"切换到代码视图，显示 Python 代码

- [ ] **Step 5: Commit**

```bash
git add js/flowchart-editor.js js/flowchart-python-gen.js js/action-editor.js
git commit -m "feat: implement JointJS flowchart editor with Python generation"
```

---

### Task 5: 完善 CodeMirror 代码视图

**Files:**
- Modify: `js/action-editor.js`

- [ ] **Step 1: 在 ActionEditor 中初始化 CodeMirror**

在 `ActionEditor.init()` 中将 `#python-code` textarea 替换为 CodeMirror 实例，配置：
- mode: `python`
- theme: `dracula`
- readOnly: `false`（允许手动编辑）
- lineNumbers: `true`

- [ ] **Step 2: 实现"复制代码"功能**

在 `handleToolAction('copy')` 中使用 `navigator.clipboard.writeText()` 复制 CodeMirror 内容。

- [ ] **Step 3: 实现"运行"按钮占位**

`handleToolAction('run')` 目前只做 `console.log('run')` 占位，后续对接仿真引擎。

- [ ] **Step 4: 用浏览器验证代码视图**

切换到代码模式，确认：
- Python 语法高亮生效
- 深色主题（dracula）生效
- 复制按钮工作正常

- [ ] **Step 5: Commit**

```bash
git add js/action-editor.js
git commit -m "feat: add CodeMirror Python code view with syntax highlighting"
```

---

### Task 6: Resize 适配与最终集成

**Files:**
- Modify: `js/action-editor.js`
- Modify: `js/blockly-editor.js`
- Modify: `js/flowchart-editor.js`

- [ ] **Step 1: 添加 ResizeObserver**

在 `ActionEditor.init()` 中对 `.action-editor-content` 添加 ResizeObserver，窗口大小变化时自动调用当前活跃编辑器的 `resize()` 方法。

- [ ] **Step 2: 窗口全屏/最小化时触发 resize**

监听布局管理器的全屏/最小化回调，在动作窗口全屏或恢复时触发 resize。

- [ ] **Step 3: 用浏览器验证响应式**

切换布局模式、全屏动作编辑窗口、调整浏览器窗口大小，确认编辑器正确 resize。

- [ ] **Step 4: Commit**

```bash
git add js/action-editor.js js/blockly-editor.js js/flowchart-editor.js
git commit -m "feat: add resize handling for action editor"
```

---

### Task 7: 深色主题统一

**Files:**
- Modify: `css/action-editor.css`
- Modify: `js/blockly-editor.js`
- Modify: `js/flowchart-editor.js`

- [ ] **Step 1: Blockly 深色主题**

在 `BlocklyEditor.init()` 中创建自定义 Blockly.Theme：
- 背景: `#2b2b2b`
- 工具箱: `#333333`
- 网格: `#3a3a3a`
- 各分类颜色调整为深色友好色调

- [ ] **Step 2: JointJS 深色主题**

在 `FlowchartEditor.init()` 中设置 Paper 背景 `#2b2b2b`，连线颜色 `#888`，文字颜色 `#fff`。

- [ ] **Step 3: 工具栏和 Stencil 深色样式**

确保 `action-editor.css` 中的工具栏、Stencil 面板、按钮都使用深色主题。

- [ ] **Step 4: 用浏览器验证深色主题**

确认所有三种模式下，编辑器区域与项目整体深色风格一致。

- [ ] **Step 5: Commit**

```bash
git add css/action-editor.css js/blockly-editor.js js/flowchart-editor.js
git commit -m "feat: apply dark theme to action editor"
```
