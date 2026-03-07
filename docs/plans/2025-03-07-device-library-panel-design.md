# 设备库侧边栏面板设计文档

**日期**: 2025-03-07
**状态**: 已批准

---

## 1. 概述

创建一个可拖动的浮动设备库面板，用于浏览和选择仿真设备。用户可以通过点击左侧工具栏的"设备库"按钮打开/关闭面板，面板内支持搜索、分类折叠和设备卡片选择。

---

## 2. 功能需求

### 2.1 核心功能

| 功能 | 描述 |
|------|------|
| 面板切换 | 点击"设备库"按钮切换面板显示/隐藏状态 |
| 面板拖拽 | 拖动标题栏可移动面板位置 |
| 设备搜索 | 实时搜索设备型号和分类名称 |
| 分类折叠 | 点击分类标题展开/收起该分类下的设备 |
| 卡片选择 | 点击设备卡片显示选中高亮效果 |
| 拖拽添加 | 支持拖拽设备卡片到3D场景（预留接口） |

### 2.2 设备数据

**分类**：
- 抓取设备
- 四轴机器臂
- 六轴机器臂
- 灵巧手
- 人形机器人
- 智能电缸
- 电机

**型号**：
- Z-EMG-4
- Z-EFG-8S
- Z-EFG-20S
- Z-EMG-CO-1
- Z-EMG-CO-2
- Z-EMG-CO-3
- Z-EMG-CO-4
- Z-EMG-CO-5

---

## 3. 架构设计

### 3.1 文件结构

```
hithotos-ui-opt/
├── css/
│   └── device-library-panel.css    # 面板样式
├── js/
│   ├── device-data.js               # 设备数据
│   └── device-library-panel.js      # 面板逻辑
├── index.html                        # 主页面（添加引用）
└── script.js                         # 修改：添加按钮点击处理
```

### 3.2 模块职责

| 模块 | 职责 |
|------|------|
| `device-data.js` | 定义设备分类和型号的静态数据 |
| `device-library-panel.js` | 面板的创建、渲染、拖拽、交互逻辑 |
| `device-library-panel.css` | 面板及所有子组件的样式 |

---

## 4. UI 设计

### 4.1 面板规格

| 属性 | 值 |
|------|-----|
| 宽度 | 400px |
| 高度 | 自适应（上下留 50px 边距） |
| 背景色 | #2b2b2b |
| 边框 | 1px solid #444 |
| 圆角 | 8px |
| 阴影 | 0 4px 20px rgba(0,0,0,0.5) |
| z-index | 2000 |
| 初始位置 | 左侧居中 |

### 4.2 布局结构

```
┌─────────────────────────────────┐
│ 📦 设备库                [X]     │  ← 标题栏（可拖动）
├─────────────────────────────────┤
│ 🔍 搜索设备型号/名称            │  ← 搜索栏
├─────────────────────────────────┤
│ ▼ 抓取设备                       │  ← 分类1（展开）
│   ┌───────────┐ ┌───────────┐  │
│   │ 📦 Z-EMG-4 │ │ 📦 Z-EFG-8S│  │  ← 2列网格
│   └───────────┘ └───────────┘  │
│ ▶ 四轴机器臂                     │  ← 分类2（折叠）
│ ▶ 六轴机器臂                     │  ← 分类3（折叠）
│ ...                             │
└─────────────────────────────────┘
```

### 4.3 设备卡片

| 状态 | 样式 |
|------|------|
| 默认 | 背景 #3a3a3a，边框 transparent |
| 悬停 | 背景 #4a4a4a，边框 #666 |
| 选中 | 边框 2px solid #BD1C22（主题色） |

---

## 5. 交互设计

### 5.1 面板拖拽

```javascript
// 伪代码
onMouseDown(header):
  isDragging = true
  offsetX = mouseX - panelLeft
  offsetY = mouseY - panelTop

onMouseMove(document):
  if isDragging:
    panelLeft = mouseX - offsetX
    panelTop = mouseY - offsetY
    // 边界检查

onMouseUp(document):
  isDragging = false
```

### 5.2 搜索过滤

- 监听 `input` 事件
- 过滤逻辑：同时匹配设备型号和所属分类
- 无结果时显示提示文本

### 5.3 分类折叠

- 点击分类标题 → 切换 `collapsed` 类
- CSS 处理展开/收起动画

### 5.4 设备拖拽（预留）

```javascript
// HTML5 Drag and Drop API
deviceCard.draggable = true
deviceCard.ondragstart = (e) => {
  e.dataTransfer.setData('deviceId', device.id)
}
```

---

## 6. API 设计

### 6.1 DeviceLibraryPanel 类

```javascript
class DeviceLibraryPanel {
  // 初始化面板
  constructor()

  // 切换面板显示/隐藏
  toggle()

  // 显示面板
  show()

  // 隐藏面板
  hide()

  // 渲染设备列表
  renderDevices(data)

  // 过滤设备
  filterDevices(keyword)
}
```

### 6.2 数据结构

```javascript
// device-data.js
export const DEVICE_DATA = [
  {
    category: "抓取设备",
    icon: "bi-hand-index",
    devices: [
      { id: "Z-EMG-4", name: "Z-EMG-4" },
      { id: "Z-EFG-8S", name: "Z-EFG-8S" },
      { id: "Z-EFG-20S", name: "Z-EFG-20S" }
    ]
  },
  // ...其他分类
];
```

---

## 7. 实现顺序

1. **创建基础文件**：HTML 结构、CSS 样式、JS 逻辑
2. **实现面板框架**：创建面板容器、标题栏
3. **实现拖拽功能**：面板位置拖动逻辑
4. **实现数据渲染**：设备分类和卡片渲染
5. **实现交互功能**：搜索、折叠、选中
6. **集成到主应用**：修改 script.js 连接按钮点击
7. **预留拖拽接口**：设备卡片拖拽数据设置

---

## 8. 测试要点

- [ ] 面板可正常打开/关闭
- [ ] 面板可拖动且不超出屏幕边界
- [ ] 搜索功能正确过滤设备
- [ ] 分类可正常展开/收起
- [ ] 设备卡片选中状态正确显示
- [ ] 多次点击按钮不会创建多个面板
- [ ] 面板在其他窗口之上显示

---

## 9. 未来扩展

- [ ] 设备卡片显示缩略图/图标
- [ ] 设备详情弹窗
- [ ] 收藏常用设备
- [ ] 从3D场景反向定位设备
- [ ] 设备参数配置
