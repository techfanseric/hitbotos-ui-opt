# 3D仿真工具条常驻居中设计

## 设计概述

将3D仿真面板的工具条调整为常驻显示模式，提升用户操作效率。

## 需求背景

当前工具条由两部分组成：
1. 左侧主工具栏（`.left-toolbar`）：包含工具、场景、设备库、录屏、绑定按钮
2. 子工具栏（`.viewport-toolbar`）：包含测量、对齐、捕捉等功能按钮

子工具栏默认隐藏，需要点击"工具"按钮才会展开。这种设计增加了操作步骤。

## 设计目标

1. 移除"工具"开关按钮
2. 将子工具栏改为常驻显示
3. 将子工具栏移至画布区域顶部居中

## 实施方案

### 方案选择：方案A - 修改CSS + 调整HTML

**选择理由**：改动最小，只影响HTML和CSS，不涉及JS逻辑。

## 详细设计

### 1. HTML结构调整

**修改前**：
```html
<div class="toolbar-group">
    <div class="left-toolbar">
        <button class="left-toolbar-btn" data-tool="tools">工具</button>
        <button class="left-toolbar-btn" data-tool="scene">场景</button>
        ...
    </div>
    <div class="viewport-toolbar" id="sub-toolbar">
        <!-- 子工具栏按钮 -->
    </div>
</div>
```

**修改后**：
```html
<div class="toolbar-group">
    <div class="left-toolbar">
        <!-- 移除"工具"按钮 -->
        <button class="left-toolbar-btn" data-tool="scene">场景</button>
        <button class="left-toolbar-btn" data-tool="devices">设备库</button>
        <button class="left-toolbar-btn" data-tool="record">录屏</button>
        <button class="left-toolbar-btn" data-tool="bind">绑定</button>
    </div>
</div>

<!-- 子工具栏独立于toolbar-group，直接放在center-content下 -->
<div class="viewport-toolbar permanent" id="sub-toolbar">
    <!-- 子工具栏按钮 -->
</div>
```

### 2. CSS样式调整

**移除子工具栏的隐藏/展开逻辑**：
```css
/* 移除原有的隐藏状态 */
.viewport-toolbar {
    opacity: 1;
    visibility: visible;
    transform: none;
    pointer-events: auto;
    /* 移除 transition */
}

/* 删除 .viewport-toolbar.show 相关样式（不再需要） */
```

**添加居中定位**：
```css
.viewport-toolbar.permanent {
    position: absolute;
    top: 4px;
    left: 50%;
    transform: translateX(-50%);
    /* 居中显示，不需要left偏移 */
}
```

### 3. 视觉布局

```
+----------------------------------+
| [场景][设备库][录屏][绑定]        ← 左上角主工具栏
|                                  |
|     [测量][对齐][挂载][复制]...   ← 顶部居中子工具栏（常驻）
|                                  |
|                                  |
|          3D画布区域               |
|                                  |
|                                  |
+----------------------------------+
```

## 影响范围

### 修改文件
1. `index.html` - 移除"工具"按钮，调整子工具栏位置
2. `simulator-toolbar.css` - 添加居中样式，移除展开动画

### 不受影响
- `layout-manager.js` - 布局管理逻辑
- `script.js` - 核心脚本
- `panel-loader.js` - 面板加载器

## 验收标准

1. 左侧工具栏不再显示"工具"按钮
2. 子工具栏默认可见，无需点击展开
3. 子工具栏水平居中于画布顶部
4. 原有功能（测量、对齐等）正常工作
5. 布局切换、全屏等操作不影响工具条显示

## 后续优化（可选）

1. 考虑为子工具栏添加折叠/展开功能（用户可自定义）
2. 响应式适配：小屏幕时可能需要调整布局
3. 添加工具栏拖拽功能（用户可自定义位置）
