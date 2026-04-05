# 动作编辑器 - 可视化编程模式设计文档

日期：2026-04-05
状态：待实现

## 1. 概述

在动作编辑面板中支持两种可视化编程模式：Blockly（积木编程）和流程图（椭圆形开始/结束、矩形执行函数、菱形判断）。两种模式各自独立，均可切换到对应的 Python 代码视图。

技术选型：**Blockly + JointJS**。

## 2. 整体架构

### 2.1 窗口内部结构

```
.window-content (动作编辑窗口)
├── .editor-toolbar (编辑器工具栏)
│   ├── 模式切换按钮组：[Blockly] [流程图] [代码]
│   ├── Blockly 工具：保存、清空、撤销、重做
│   ├── 流程图工具：保存、清空、自动布局、缩放
│   └── 代码工具：运行、复制、导出
├── .editor-container (编辑器容器)
│   ├── #blockly-editor (Blockly 工作区，模式1时显示)
│   ├── #flowchart-editor (JointJS 画布，模式2时显示)
│   └── #code-editor (代码视图，模式3时显示)
└── .flowchart-stencil (流程图侧边栏，仅模式2时显示)
    ├── 椭圆节点 (开始/结束)
    ├── 矩形节点 (执行函数)
    └── 菱形节点 (判断)
```

### 2.2 三种模式

1. **Blockly 模式** — 积木编程，可切换到 Python 代码
2. **流程图模式** — JointJS 交互式流程图，左侧 Stencil 拖入节点，可切换到 Python 代码
3. **代码模式** — Python 代码编辑器（由前两种模式生成，可编辑）

### 2.3 数据流

- Blockly workspace → `python.pythonGenerator` → 代码视图
- JointJS graph JSON → 自定义 Python 生成器 → 代码视图
- 两种可视化模式各自独立，不互通

## 3. Blockly 积木模式

### 3.1 自定义 Block 分类

| 分类 | Block 示例 | 说明 |
|------|-----------|------|
| **机器人动作** | `move_to`、`grab`、`release`、`rotate`、`wait` | 核心动作指令 |
| **控制流** | `if_do`、`if_else`、`for_loop`、`while_loop`、`break` | Blockly 内置 + 自定义样式 |
| **逻辑** | `compare`、`logic_operation`、`not` | 条件判断 |
| **数值** | `math_number`、`math_arithmetic`、`coordinate` | 数值运算 |
| **变量** | `set_variable`、`get_variable` | 变量操作 |
| **函数** | `define_function`、`call_function` | 函数定义与调用 |

### 3.2 Python 代码生成

使用 Blockly 内置 `python.pythonGenerator`，为每个自定义 Block 编写对应的 Python 生成逻辑。示例：

```javascript
python.pythonGenerator.forBlock['robot_move_to'] = function(block, generator) {
  const x = generator.valueToCode(block, 'X', ORDER_ATOMIC) || '0';
  const y = generator.valueToCode(block, 'Y', ORDER_ATOMIC) || '0';
  const z = generator.valueToCode(block, 'Z', ORDER_ATOMIC) || '0';
  return `robot.move_to(${x}, ${y}, ${z})\n`;
};
```

### 3.3 深色主题

Blockly 支持自定义主题（`Blockly.Theme`），将背景、网格、分类颜色调整为匹配项目深色主题（`#2b2b2b`）。

## 4. JointJS 流程图模式

### 4.1 节点类型定义

| 节点类型 | 形状 | 视觉 | 数据属性 |
|---------|------|------|---------|
| **开始** | 椭圆 | 绿色填充 `#4CAF50` | 无 |
| **结束** | 椭圆 | 红色填充 `#BD1C22`（项目主题色） | 无 |
| **动作指令** | 矩形 | 蓝色填充 `#2196F3` | `action_type`（move_to/grab/release 等）+ 参数 |
| **判断** | 菱形 | 橙色填充 `#FF9800` | `condition`（条件表达式）+ True/False 出口 |

### 4.2 交互流程

1. 从左侧 Stencil 拖拽节点到画布
2. 从节点的连接点拖出连线到另一个节点
3. 双击节点打开编辑面板（修改动作参数/条件表达式）
4. 自动布局按钮：调用 Dagre 算法自动排列节点

### 4.3 Python 代码生成

遍历 JointJS Graph 的 JSON 结构，从"开始"节点出发，沿连线做 DFS/BFS 遍历，生成对应的 Python 代码。示例输出：

```python
# 从流程图生成的示例代码
robot.move_to(100, 200, 50)
robot.grab()
if robot.is_holding():
    robot.move_to(300, 200, 50)
    robot.release()
else:
    robot.move_to(0, 0, 0)
```

## 5. 代码视图

使用 CodeMirror 5（CDN 引入）做语法高亮的 Python 代码编辑器，支持只读和编辑两种状态。由 Blockly 或流程图模式切换过来时为只读状态，用户可直接编辑。

## 6. 文件结构

### 6.1 新增文件

```
/
├── css/
│   └── action-editor.css          # 动作编辑器样式（工具栏、容器、Stencil）
├── js/
│   ├── action-editor.js           # 动作编辑器主模块（模式切换、工具栏）
│   ├── blockly-editor.js          # Blockly 编辑器封装
│   ├── flowchart-editor.js        # JointJS 流程图编辑器封装
│   ├── blockly-blocks.js          # 自定义 Blockly Block 定义
│   ├── blockly-python-gen.js      # 自定义 Block 的 Python 代码生成器
│   └── flowchart-python-gen.js    # JointJS Graph → Python 代码生成器
```

### 6.2 CDN 依赖

在 `index.html` 中引入：

```html
<!-- Blockly -->
<script src="https://unpkg.com/blockly/blockly.min.js"></script>

<!-- JointJS -->
<script src="https://unpkg.com/@joint/core/dist/joint.js"></script>

<!-- CodeMirror (代码编辑器语法高亮) -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/python/python.min.js"></script>
```

## 7. 与现有系统集成

- `layout-manager.js`：动作窗口的 `.window-content` 内部替换为编辑器 HTML
- `script.js`：初始化时创建 `ActionEditor` 实例
- 深色主题：Blockly 通过 `Blockly.Theme` 自定义，JointJS 通过 SVG 属性设置，CodeMirror 通过主题 CSS
- 窗口大小变化时自动 resize 编辑器（监听 `ResizeObserver`）

## 8. 技术选型理由

| 库 | 选择理由 |
|----|---------|
| **Blockly** | Google 官方维护，Apache 2.0 许可，内置 Python 代码生成器，CDN 直接引入，自定义 Block 生态成熟 |
| **JointJS** | 专业级 SVG 图形引擎，原生支持椭圆/菱形/矩形，Stencil 拖拽面板开箱即用，商业公司持续维护，自动布局算法（Dagre） |
| **CodeMirror 5** | 轻量代码编辑器，Python 语法高亮，CDN 引入，深色主题支持 |

### 许可证说明

- Blockly: Apache 2.0
- JointJS: MPL 2.0（使用不修改库源码的情况下不影响项目代码）
- CodeMirror 5: MIT
