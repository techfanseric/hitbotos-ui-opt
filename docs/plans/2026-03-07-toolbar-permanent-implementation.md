# 3D仿真工具条常驻居中实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将3D仿真面板的子工具栏从点击展开改为常驻显示，并移至画布顶部居中

**Architecture:**
1. 修改HTML结构：移除"工具"按钮，将子工具栏独立于toolbar-group
2. 修改CSS：添加居中样式，移除展开/隐藏动画逻辑
3. 保持JavaScript功能不变（layout-manager.js, script.js等无需修改）

**Tech Stack:** 纯HTML/CSS项目，无需构建工具

---

### Task 1: 修改HTML结构 - 移除"工具"按钮

**Files:**
- Modify: `index.html:179-183`

**Step 1: 定位并删除"工具"按钮**

在 `.left-toolbar` 中找到并删除以下元素：
```html
<button class="left-toolbar-btn" title="工具" data-tool="tools">
    <i class="bi bi-wrench"></i>
    <span>工具</span>
</button>
```

**Step 2: 验证HTML结构**

确认 `.left-toolbar` 现在只包含：场景、设备库、录屏、绑定 四个按钮。

**Step 3: 在浏览器中打开页面确认**

打开 `index.html`，确认左侧工具栏不再显示"工具"按钮。

---

### Task 2: 修改HTML结构 - 移动子工具栏位置

**Files:**
- Modify: `index.html:176-273`

**Step 1: 将 `.viewport-toolbar` 移出 `.toolbar-group`**

将整个 `.viewport-toolbar` 元素从 `.toolbar-group` 内部移出，放在 `.toolbar-group` 之后、`.main-viewport` 之前。

**修改前结构：**
```html
<div class="toolbar-group">
    <div class="left-toolbar">...</div>
    <div class="viewport-toolbar" id="sub-toolbar">...</div>
</div>
```

**修改后结构：**
```html
<div class="toolbar-group">
    <div class="left-toolbar">...</div>
</div>

<div class="viewport-toolbar permanent" id="sub-toolbar">
    <!-- 子工具栏按钮内容 -->
</div>
```

**Step 2: 验证HTML结构**

确认 `.viewport-toolbar` 现在是 `.center-content` 的直接子元素，与 `.toolbar-group` 平级。

**Step 3: 在浏览器中刷新确认**

刷新页面，确认子工具栏现在默认可见（虽然位置还不正确）。

---

### Task 3: 修改CSS - 添加常驻居中样式

**Files:**
- Modify: `simulator-toolbar.css`

**Step 1: 添加 `.permanent` 修饰类**

在文件末尾添加以下样式：
```css
/* 常驻居中的工具栏 */
.viewport-toolbar.permanent {
    position: absolute;
    top: 4px;
    left: 50%;
    transform: translateX(-50%);
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}
```

**Step 2: 在浏览器中刷新确认位置**

刷新页面，确认子工具栏现在位于画布顶部居中位置。

---

### Task 4: 修改CSS - 移除展开/隐藏动画

**Files:**
- Modify: `simulator-toolbar.css:69-97`

**Step 1: 移除 `.viewport-toolbar` 基础样式中的隐藏属性**

找到 `.viewport-toolbar` 基础样式定义，删除或注释掉以下属性：
```css
/* 删除这些属性 */
opacity: 0;
visibility: hidden;
transform: translateX(-20px);
transition: all 0.3s ease;
pointer-events: none;
```

修改后应为：
```css
.viewport-toolbar {
    display: flex;
    align-items: center;
    gap: 1px;
    background: rgba(60, 60, 60, 0.9);
    backdrop-filter: blur(4px);
    padding: 0 4px;
    position: absolute;
    top: 4px;
    left: 56px;
    border-radius: 0 4px 4px 0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    z-index: 1;
    height: 48px;
}
```

**Step 2: 删除 `.viewport-toolbar.show` 样式**

删除或注释掉整个 `.viewport-toolbar.show` 规则块（lines 91-97），因为不再需要切换显示状态。

---

### Task 5: 验证功能完整性

**Files:**
- Test: Manual testing in browser

**Step 1: 测试所有布局模式**

1. 刷新页面，确认默认布局（layout2）中工具条显示正确
2. 切换到不同布局（layout1、layout3、dual-lr-73等）
3. 确认每种布局下工具条都保持居中显示

**Step 2: 测试全屏模式**

1. 点击3D仿真窗口的全屏按钮
2. 确认全屏模式下工具条仍然居中显示
3. 退出全屏，确认工具条位置正常

**Step 3: 测试窗口交换功能**

1. 在布局模式下点击窗口交换按钮
2. 确认交换后工具条仍然正常显示

**Step 4: 测试工具按钮功能**

1. 点击测量、对齐等工具按钮
2. 确认按钮交互正常（hover效果、点击响应）

---

### Task 6: 清理不再使用的JavaScript代码（可选）

**Files:**
- Review: `script.js`
- Search for: `data-tool="tools"`

**Step 1: 搜索相关代码**

在 `script.js` 中搜索与"工具"按钮相关的代码：
```bash
# 在项目根目录运行
grep -n "tools" script.js
grep -n "sub-toolbar" script.js
```

**Step 2: 评估是否需要清理**

- 如果找到控制 `.viewport-toolbar` 显示/隐藏的代码，需要移除或注释
- 如果只找到通用的工具按钮处理代码，可能无需修改

**Step 3: 执行清理（如果需要）**

如果有控制工具栏展开的代码，进行相应的修改或删除。

---

### Task 7: 提交代码

**Files:**
- Git commit

**Step 1: 查看变更**

```bash
git status
git diff
```

**Step 2: 添加修改的文件**

```bash
git add index.html simulator-toolbar.css
```

**Step 3: 提交变更**

```bash
git commit -m "$(cat <<'EOF'
feat: 将3D仿真子工具栏改为常驻居中显示

- 移除左侧主工具栏的「工具」按钮
- 将子工具栏移至画布顶部居中位置
- 移除子工具栏的展开/隐藏动画逻辑
- 保留场景、设备库、录屏、绑定按钮在左上角

Co-Authored-By: Eric Yim <eric.yim@foxmail.com>
EOF
)"
```

**Step 4: 验证提交**

```bash
git log -1 --stat
```

---

## 验收清单

完成所有任务后，确认以下各项：

- [ ] 左侧工具栏不显示"工具"按钮
- [ ] 子工具栏默认可见，无需点击展开
- [ ] 子工具栏水平居中于画布顶部
- [ ] 所有布局模式下工具条位置正确
- [ ] 全屏模式下工具条显示正常
- [ ] 工具按钮交互功能正常
- [ ] 代码已提交

## 相关文档

- 设计文档: `docs/plans/2026-03-07-toolbar-permanent-design.md`
- 项目说明: `CLAUDE.md`
