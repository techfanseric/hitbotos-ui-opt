# 设备库侧边栏面板实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标:** 创建一个可拖动的浮动设备库面板，支持搜索、分类折叠和设备卡片选择。

**架构:** 独立可拖动面板（方案A） - 完全独立的HTML结构，自定义拖拽逻辑，面板内部包含搜索栏、可折叠分类、设备卡片网格。

**技术栈:** 纯 HTML/CSS/JavaScript，无需构建工具，Bootstrap Icons 图标库。

---

### Task 1: 创建设备数据文件

**Files:**
- Create: `js/device-data.js`

**Step 1: 创建设备数据文件**

```javascript
// js/device-data.js
// 设备库数据 - 模拟数据

export const DEVICE_DATA = [
    {
        category: "抓取设备",
        icon: "bi-hand-index",
        devices: [
            { id: "Z-EMG-4", name: "Z-EMG-4", icon: "bi-box" },
            { id: "Z-EFG-8S", name: "Z-EFG-8S", icon: "bi-box" },
            { id: "Z-EFG-20S", name: "Z-EFG-20S", icon: "bi-box" },
            { id: "Z-EMG-CO-1", name: "Z-EMG-CO-1", icon: "bi-box" },
            { id: "Z-EMG-CO-2", name: "Z-EMG-CO-2", icon: "bi-box" },
            { id: "Z-EMG-CO-3", name: "Z-EMG-CO-3", icon: "bi-box" },
            { id: "Z-EMG-CO-4", name: "Z-EMG-CO-4", icon: "bi-box" },
            { id: "Z-EMG-CO-5", name: "Z-EMG-CO-5", icon: "bi-box" }
        ]
    },
    {
        category: "四轴机器臂",
        icon: "bi-robot",
        devices: [
            { id: "Z-EMG-4", name: "Z-EMG-4", icon: "bi-robot" },
            { id: "Z-EFG-8S", name: "Z-EFG-8S", icon: "bi-robot" }
        ]
    },
    {
        category: "六轴机器臂",
        icon: "bi-robot",
        devices: [
            { id: "Z-EFG-20S", name: "Z-EFG-20S", icon: "bi-robot" }
        ]
    },
    {
        category: "灵巧手",
        icon: "bi-hand-thumbs-up",
        devices: [
            { id: "Z-EMG-CO-1", name: "Z-EMG-CO-1", icon: "bi-hand" }
        ]
    },
    {
        category: "人形机器人",
        icon: "bi-person-arms-up",
        devices: [
            { id: "Z-EMG-CO-2", name: "Z-EMG-CO-2", icon: "bi-person" }
        ]
    },
    {
        category: "智能电缸",
        icon: "bi-arrows-expand",
        devices: [
            { id: "Z-EMG-CO-3", name: "Z-EMG-CO-3", icon: "bi-arrows-expand" }
        ]
    },
    {
        category: "电机",
        icon: "bi-cpu",
        devices: [
            { id: "Z-EMG-CO-4", name: "Z-EMG-CO-4", icon: "bi-cpu" },
            { id: "Z-EMG-CO-5", name: "Z-EMG-CO-5", icon: "bi-cpu" }
        ]
    }
];
```

**Step 2: 提交**

```bash
git add js/device-data.js
git commit -m "feat: add device data module

- Define DEVICE_DATA with categories and device models
- Include categories: 抓取设备, 四轴机器臂, 六轴机器臂, 灵巧手, 人形机器人, 智能电缸, 电机
- Device models: Z-EMG-4, Z-EFG-8S, Z-EFG-20S, Z-EMG-CO-1 through Z-EMG-CO-5

Co-Authored-By: Eric Yim <eric.yim@foxmail.com>"
```

---

### Task 2: 创建面板 CSS 样式

**Files:**
- Create: `css/device-library-panel.css`

**Step 1: 创建面板 CSS 文件**

```css
/* css/device-library-panel.css */
/* 设备库侧边栏面板样式 */

/* 面板容器 */
.device-library-panel {
    position: fixed;
    width: 400px;
    max-height: calc(100vh - 100px);
    background: #2b2b2b;
    border: 1px solid #444;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    z-index: 2000;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

/* 初始位置 - 左侧居中 */
.device-library-panel.initial-position {
    left: 80px;
    top: 50%;
    transform: translateY(-50%);
}

/* 标题栏 */
.device-library-panel .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: #3a3a3a;
    border-bottom: 1px solid #444;
    cursor: move;
    user-select: none;
}

.device-library-panel .panel-title {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #ffffff;
    font-size: 14px;
    font-weight: 500;
}

.device-library-panel .panel-title i {
    font-size: 16px;
    color: #BD1C22;
}

.device-library-panel .panel-controls {
    display: flex;
    gap: 8px;
}

.device-library-panel .panel-close-btn {
    background: none;
    border: none;
    color: #999;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s;
}

.device-library-panel .panel-close-btn:hover {
    background: #BD1C22;
    color: #ffffff;
}

/* 搜索栏 */
.device-library-panel .panel-search {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    background: #2b2b2b;
    border-bottom: 1px solid #444;
}

.device-library-panel .panel-search i {
    color: #999;
    margin-right: 8px;
}

.device-library-panel .panel-search input {
    flex: 1;
    background: #3a3a3a;
    border: 1px solid #444;
    border-radius: 4px;
    padding: 8px 12px;
    color: #ffffff;
    font-size: 12px;
    outline: none;
}

.device-library-panel .panel-search input:focus {
    border-color: #BD1C22;
}

.device-library-panel .panel-search input::placeholder {
    color: #999;
}

/* 设备列表区域 */
.device-library-panel .panel-devices {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
}

/* 滚动条样式 */
.device-library-panel .panel-devices::-webkit-scrollbar {
    width: 6px;
}

.device-library-panel .panel-devices::-webkit-scrollbar-track {
    background: #2b2b2b;
}

.device-library-panel .panel-devices::-webkit-scrollbar-thumb {
    background: #555;
    border-radius: 3px;
}

.device-library-panel .panel-devices::-webkit-scrollbar-thumb:hover {
    background: #666;
}

/* 设备分类 */
.device-library-panel .device-category {
    margin-bottom: 8px;
}

.device-library-panel .category-header {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    background: #3a3a3a;
    border-radius: 4px;
    cursor: pointer;
    user-select: none;
    transition: background-color 0.2s;
}

.device-library-panel .category-header:hover {
    background: #4a4a4a;
}

.device-library-panel .category-icon {
    margin-right: 8px;
    color: #999;
    transition: transform 0.2s;
}

.device-library-panel .category-header.collapsed .category-icon {
    transform: rotate(-90deg);
}

.device-library-panel .category-name {
    flex: 1;
    color: #ffffff;
    font-size: 13px;
}

.device-library-panel .category-count {
    color: #999;
    font-size: 11px;
}

/* 设备列表容器 */
.device-library-panel .category-devices {
    padding: 8px 0;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
}

.device-library-panel .category-header.collapsed + .category-devices {
    display: none;
}

/* 设备卡片 */
.device-library-panel .device-card {
    background: #3a3a3a;
    border: 2px solid transparent;
    border-radius: 6px;
    padding: 12px;
    cursor: pointer;
    transition: all 0.2s;
    user-select: none;
}

.device-library-panel .device-card:hover {
    background: #4a4a4a;
    border-color: #666;
}

.device-library-panel .device-card.selected {
    border-color: #BD1C22;
    background: #4a4a4a;
}

.device-library-panel .device-card.dragging {
    opacity: 0.5;
}

.device-library-panel .device-card-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: #2b2b2b;
    border-radius: 4px;
    margin: 0 auto 8px;
}

.device-library-panel .device-card-icon i {
    font-size: 20px;
    color: #BD1C22;
}

.device-library-panel .device-card-info {
    text-align: center;
}

.device-library-panel .device-model {
    color: #ffffff;
    font-size: 12px;
    font-weight: 500;
    margin-bottom: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.device-library-panel .device-category {
    color: #999;
    font-size: 10px;
}

/* 无结果提示 */
.device-library-panel .no-results {
    padding: 32px;
    text-align: center;
    color: #999;
    font-size: 13px;
}

/* 面板显示/隐藏 */
.device-library-panel.hidden {
    display: none;
}

/* 拖动时的样式 */
.device-library-panel.dragging {
    opacity: 0.8;
    cursor: move;
}
```

**Step 2: 提交**

```bash
git add css/device-library-panel.css
git commit -m "feat: add device library panel styles

- Panel container with 400px width and adaptive height
- Draggable header with title and close button
- Search bar with icon input
- Device category sections with collapse/expand
- 2-column grid for device cards
- Selected state styling with theme color border
- Scrollbar customization and hover effects

Co-Authored-By: Eric Yim <eric.yim@foxmail.com>"
```

---

### Task 3: 创建面板 JavaScript 逻辑

**Files:**
- Create: `js/device-library-panel.js`

**Step 1: 创建面板 JavaScript 类**

```javascript
// js/device-library-panel.js
// 设备库面板逻辑

import { DEVICE_DATA } from './device-data.js';

class DeviceLibraryPanel {
    constructor() {
        this.panel = null;
        this.isVisible = false;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.selectedDevice = null;
        this.collapsedCategories = new Set();
    }

    // 初始化面板
    init() {
        this.createPanel();
        this.setupEventListeners();
        this.renderDevices();
        this.setInitialPosition();
    }

    // 创建面板 DOM
    createPanel() {
        const panelHTML = `
            <div class="device-library-panel initial-position hidden" id="deviceLibraryPanel">
                <div class="panel-header">
                    <div class="panel-title">
                        <i class="bi bi-box-seam"></i>
                        <span>设备库</span>
                    </div>
                    <div class="panel-controls">
                        <button class="panel-close-btn" title="关闭">
                            <i class="bi bi-x"></i>
                        </button>
                    </div>
                </div>
                <div class="panel-search">
                    <i class="bi bi-search"></i>
                    <input type="text" placeholder="搜索设备型号/名称" id="deviceSearchInput">
                </div>
                <div class="panel-devices" id="deviceList">
                    <!-- 动态生成设备列表 -->
                </div>
            </div>
        `;

        // 添加到 body
        document.body.insertAdjacentHTML('beforeend', panelHTML);
        this.panel = document.getElementById('deviceLibraryPanel');
    }

    // 设置初始位置
    setInitialPosition() {
        if (!this.panel) return;

        // 移除初始定位类，设置实际位置
        setTimeout(() => {
            this.panel.classList.remove('initial-position');

            const rect = this.panel.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            // 左侧居中位置
            const targetLeft = 80;
            const targetTop = (viewportHeight - rect.height) / 2;

            this.panel.style.left = targetLeft + 'px';
            this.panel.style.top = targetTop + 'px';
            this.panel.style.transform = 'none';
        }, 100);
    }

    // 渲染设备列表
    renderDevices(filterKeyword = '') {
        const deviceList = this.panel.querySelector('#deviceList');
        deviceList.innerHTML = '';

        const keyword = filterKeyword.toLowerCase().trim();

        // 过滤并渲染分类
        let hasResults = false;

        DEVICE_DATA.forEach((category, categoryIndex) => {
            // 过滤该分类下的设备
            const filteredDevices = category.devices.filter(device =>
                device.name.toLowerCase().includes(keyword) ||
                category.category.toLowerCase().includes(keyword)
            );

            if (filteredDevices.length === 0) return;

            hasResults = true;

            const categoryHTML = this.createCategoryHTML(category, filteredDevices, categoryIndex);
            deviceList.insertAdjacentHTML('beforeend', categoryHTML);
        });

        // 无结果提示
        if (!hasResults && keyword) {
            deviceList.innerHTML = '<div class="no-results">未找到匹配设备</div>';
        } else if (!hasResults) {
            deviceList.innerHTML = '<div class="no-results">暂无设备</div>';
        }

        // 绑定设备卡片事件
        this.bindDeviceCardEvents();
    }

    // 创建分类 HTML
    createCategoryHTML(category, devices, categoryIndex) {
        const isCollapsed = this.collapsedCategories.has(category.category);
        const collapsedClass = isCollapsed ? 'collapsed' : '';

        let devicesHTML = devices.map(device => `
            <div class="device-card" data-device-id="${device.id}" data-device-name="${device.name}" data-category="${category.category}" draggable="true">
                <div class="device-card-icon">
                    <i class="bi ${device.icon}"></i>
                </div>
                <div class="device-card-info">
                    <div class="device-model">${device.name}</div>
                    <div class="device-category">${category.category}</div>
                </div>
            </div>
        `).join('');

        return `
            <div class="device-category">
                <div class="category-header ${collapsedClass}" data-category="${category.category}">
                    <i class="bi bi-chevron-down category-icon"></i>
                    <span class="category-name">${category.category}</span>
                    <span class="category-count">${devices.length}</span>
                </div>
                <div class="category-devices">
                    ${devicesHTML}
                </div>
            </div>
        `;
    }

    // 绑定设备卡片事件
    bindDeviceCardEvents() {
        const deviceCards = this.panel.querySelectorAll('.device-card');

        deviceCards.forEach(card => {
            // 点击选中
            card.addEventListener('click', (e) => {
                this.selectDevice(card);
            });

            // 拖拽开始
            card.addEventListener('dragstart', (e) => {
                card.classList.add('dragging');
                e.dataTransfer.setData('deviceId', card.dataset.deviceId);
                e.dataTransfer.setData('deviceName', card.dataset.deviceName);
                e.dataTransfer.effectAllowed = 'copy';
            });

            // 拖拽结束
            card.addEventListener('dragend', (e) => {
                card.classList.remove('dragging');
            });
        });
    }

    // 选中设备
    selectDevice(card) {
        // 移除之前的选中状态
        const prevSelected = this.panel.querySelector('.device-card.selected');
        if (prevSelected) {
            prevSelected.classList.remove('selected');
        }

        // 选中当前卡片
        card.classList.add('selected');
        this.selectedDevice = {
            id: card.dataset.deviceId,
            name: card.dataset.deviceName,
            category: card.dataset.category
        };

        console.log('选中设备:', this.selectedDevice);
    }

    // 设置事件监听器
    setupEventListeners() {
        // 关闭按钮
        const closeBtn = this.panel.querySelector('.panel-close-btn');
        closeBtn.addEventListener('click', () => this.hide());

        // 搜索输入
        const searchInput = this.panel.querySelector('#deviceSearchInput');
        searchInput.addEventListener('input', (e) => {
            this.renderDevices(e.target.value);
        });

        // 分类折叠
        this.panel.addEventListener('click', (e) => {
            const categoryHeader = e.target.closest('.category-header');
            if (categoryHeader) {
                this.toggleCategory(categoryHeader);
            }
        });

        // 面板拖拽
        this.setupDrag();
    }

    // 切换分类展开/收起
    toggleCategory(categoryHeader) {
        const categoryName = categoryHeader.dataset.category;
        categoryHeader.classList.toggle('collapsed');

        if (this.collapsedCategories.has(categoryName)) {
            this.collapsedCategories.delete(categoryName);
        } else {
            this.collapsedCategories.add(categoryName);
        }
    }

    // 设置面板拖拽
    setupDrag() {
        const header = this.panel.querySelector('.panel-header');

        header.addEventListener('mousedown', (e) => {
            // 只在点击标题栏时拖动（不包括关闭按钮）
            if (e.target.closest('.panel-close-btn')) return;

            this.isDragging = true;
            this.panel.classList.add('dragging');

            const rect = this.panel.getBoundingClientRect();
            this.dragOffset.x = e.clientX - rect.left;
            this.dragOffset.y = e.clientY - rect.top;

            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;

            let newLeft = e.clientX - this.dragOffset.x;
            let newTop = e.clientY - this.dragOffset.y;

            // 边界检查
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const panelRect = this.panel.getBoundingClientRect();

            // 确保面板不完全移出屏幕
            newLeft = Math.max(-panelRect.width + 50, Math.min(newLeft, viewportWidth - 50));
            newTop = Math.max(0, Math.min(newTop, viewportHeight - 50));

            this.panel.style.left = newLeft + 'px';
            this.panel.style.top = newTop + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.isDragging = false;
                this.panel.classList.remove('dragging');
            }
        });
    }

    // 切换面板显示/隐藏
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    // 显示面板
    show() {
        this.panel.classList.remove('hidden');
        this.isVisible = true;

        // 聚焦搜索框
        const searchInput = this.panel.querySelector('#deviceSearchInput');
        searchInput.focus();
    }

    // 隐藏面板
    hide() {
        this.panel.classList.add('hidden');
        this.isVisible = false;
    }

    // 获取选中的设备
    getSelectedDevice() {
        return this.selectedDevice;
    }
}

// 导出单例
let deviceLibraryPanel = null;

export function initDeviceLibraryPanel() {
    if (!deviceLibraryPanel) {
        deviceLibraryPanel = new DeviceLibraryPanel();
        deviceLibraryPanel.init();
    }
    return deviceLibraryPanel;
}

export function getDeviceLibraryPanel() {
    return deviceLibraryPanel;
}
```

**Step 2: 提交**

```bash
git add js/device-library-panel.js
git commit -m "feat: add device library panel logic

- Create DeviceLibraryPanel class for panel management
- Implement drag functionality with boundary checking
- Add device rendering with category grouping
- Support search filtering by device name and category
- Add category collapse/expand functionality
- Implement device card selection and drag-to-drop
- Add show/hide toggle methods

Co-Authored-By: Eric Yim <eric.yim@foxmail.com>"
```

---

### Task 4: 修改 index.html 添加样式和脚本引用

**Files:**
- Modify: `index.html:12-13` (在 head 中添加 CSS 引用)
- Modify: `index.html:430` (在 body 末尾添加 JS 引用)

**Step 1: 在 head 中添加 CSS 引用**

在 `panel-ui-components.css` 之后添加：

```html
<link rel="stylesheet" href="css/device-library-panel.css">
```

**Step 2: 在 script.js 之后添加 JS 引用**

在 `panel-loader.js` 之后添加：

```html
<script type="module" src="js/device-library-panel.js"></script>
```

**Step 3: 提交**

```bash
git add index.html
git commit -m "feat: add device library panel references to HTML

- Add device-library-panel.css stylesheet link
- Add device-library-panel.js module script

Co-Authored-By: Eric Yim <eric.yim@foxmail.com>"
```

---

### Task 5: 修改 script.js 连接按钮点击事件

**Files:**
- Modify: `script.js:117-150` (setupToolbarControls 函数)

**Step 1: 修改 setupToolbarControls 函数中设备库按钮的处理**

找到 `setupToolbarControls` 函数中的设备库按钮处理部分（约 144-147 行）：

```javascript
// 修改前：
} else {
    // 其他按钮：触发窗口打开逻辑（预留）
    console.log(`打开${this.getAttribute('title')}窗口`);
}
```

修改为：

```javascript
// 修改后：
} else if (toolType === 'devices') {
    // 设备库按钮：切换设备库面板显示/隐藏
    const devicePanel = window.getDeviceLibraryPanel?.();
    if (devicePanel) {
        devicePanel.toggle();
        // 切换按钮激活状态
        this.classList.toggle('active');
    }
} else {
    // 其他按钮：触发窗口打开逻辑（预留）
    console.log(`打开${this.getAttribute('title')}窗口`);
}
```

**Step 2: 在 DOMContentLoaded 中初始化设备库面板**

在 `script.js` 的 `DOMContentLoaded` 事件监听器中（约 9-31 行），在现有初始化代码之后添加：

```javascript
// 在 initializeWindowStates(); 之后添加：
// 初始化设备库面板
import('./js/device-library-panel.js').then(module => {
    window.initDeviceLibraryPanel = module.initDeviceLibraryPanel;
    window.getDeviceLibraryPanel = module.getDeviceLibraryPanel;
    window.initDeviceLibraryPanel();
});
```

**Step 3: 提交**

```bash
git add script.js
git commit -m "feat: connect device library button to panel

- Add device panel toggle logic in setupToolbarControls
- Import and initialize device library panel module
- Toggle button active state with panel visibility

Co-Authored-By: Eric Yim <eric.yim@foxmail.com>"
```

---

### Task 6: 测试和验证

**Step 1: 在浏览器中打开 index.html**

打开 `http://localhost:5501` 或直接打开 `index.html` 文件。

**Step 2: 验证功能**

按顺序验证以下功能：

1. **面板打开/关闭**
   - 点击左侧工具栏的"设备库"按钮
   - 预期：面板从左侧中央位置出现
   - 再次点击按钮
   - 预期：面板隐藏

2. **面板拖拽**
   - 按住面板标题栏拖动
   - 预期：面板跟随鼠标移动
   - 拖到屏幕边缘
   - 预期：面板不会完全移出屏幕

3. **搜索功能**
   - 在搜索框输入 "Z-EMG"
   - 预期：只显示匹配的设备
   - 清空搜索框
   - 预期：显示所有设备

4. **分类折叠**
   - 点击分类标题
   - 预期：该分类折叠/展开
   - 图标方向正确

5. **设备选中**
   - 点击设备卡片
   - 预期：卡片显示红色边框高亮

6. **设备拖拽**
   - 拖拽设备卡片
   - 预期：拖拽时卡片半透明
   - 打开浏览器控制台检查 dataTransfer 数据

**Step 3: 提交测试结果**

如果所有功能正常：

```bash
git add .
git commit -m "test: verify device library panel functionality

- Panel toggle works correctly
- Drag functionality with boundary checking
- Search filtering by device name
- Category collapse/expand
- Device card selection
- Drag-to-drop data transfer ready

Co-Authored-By: Eric Yim <eric.yim@foxmail.com>"
```

---

### Task 7: 可选 - 添加设备拖拽到 3D 场景的支持（预留接口）

**Files:**
- Modify: `js/device-library-panel.js` (添加 drop zone 设置)
- Modify: `script.js` (添加 3D 视口 drop 处理)

**Step 1: 在 device-library-panel.js 中设置 3D 视口为 drop zone**

在 `init()` 方法中添加：

```javascript
// 设置 3D 视口为拖放目标
this.setupDropZone();
```

添加新方法：

```javascript
// 设置拖放目标区域
setupDropZone() {
    const viewport = document.querySelector('.main-viewport, .viewport-3d');
    if (!viewport) return;

    viewport.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        viewport.classList.add('drag-over');
    });

    viewport.addEventListener('dragleave', (e) => {
        viewport.classList.remove('drag-over');
    });

    viewport.addEventListener('drop', (e) => {
        e.preventDefault();
        viewport.classList.remove('drag-over');

        const deviceId = e.dataTransfer.getData('deviceId');
        const deviceName = e.dataTransfer.getData('deviceName');

        if (deviceId) {
            this.onDeviceDropped(deviceId, deviceName, e);
        }
    });
}

// 设备拖放到场景的回调
onDeviceDropped(deviceId, deviceName, event) {
    console.log('设备拖放到场景:', { deviceId, deviceName, event });

    // TODO: 实现将设备添加到 3D 场景的逻辑
    // 这里可以触发一个自定义事件，让主应用处理
    window.dispatchEvent(new CustomEvent('deviceAddedToScene', {
        detail: { deviceId, deviceName, position: { x: event.clientX, y: event.clientY } }
    }));
}
```

**Step 2: 提交**

```bash
git add js/device-library-panel.js
git commit -m "feat: add device drag-to-drop interface

- Setup 3D viewport as drop zone
- Handle dragover, dragleave, and drop events
- Dispatch custom event for device addition
- Placeholder for future scene integration

Co-Authored-By: Eric Yim <eric.yim@foxmail.com>"
```

---

## 实现计划完成检查清单

- [ ] Task 1: 创建设备数据文件
- [ ] Task 2: 创建面板 CSS 样式
- [ ] Task 3: 创建面板 JavaScript 逻辑
- [ ] Task 4: 修改 index.html 添加引用
- [ ] Task 5: 修改 script.js 连接按钮
- [ ] Task 6: 测试和验证
- [ ] Task 7: 可选拖拽接口（预留）

---

## 验收标准

1. **功能验收**
   - [ ] 点击"设备库"按钮可正常打开/关闭面板
   - [ ] 面板可通过拖动标题栏移动位置
   - [ ] 搜索功能正确过滤设备
   - [ ] 分类可正常展开/收起
   - [ ] 设备卡片选中状态正确显示

2. **样式验收**
   - [ ] 面板样式与设计文档一致
   - [ ] 悬停效果正常
   - [ ] 选中效果使用主题色
   - [ ] 响应式布局正常

3. **代码质量**
   - [ ] 代码格式规范
   - [ ] 注释清晰
   - [ ] Git 提交信息规范
   - [ ] 无 console 错误或警告
