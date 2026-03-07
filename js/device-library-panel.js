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
        this.initCollapsedCategories();
        this.renderDevices();
        this.setInitialPosition();
    }

    // 初始化所有分类为收起状态
    initCollapsedCategories() {
        DEVICE_DATA.forEach(category => {
            this.collapsedCategories.add(category.category);
        });
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

            // 获取设备库按钮的位置
            const deviceBtn = document.querySelector('[data-tool="devices"]');
            if (!deviceBtn) return;

            const btnRect = deviceBtn.getBoundingClientRect();
            const viewportWidth = window.innerWidth;

            // 左侧位置：工具栏右侧（60px工具栏宽度 + 16px间距）
            const targetLeft = 76;

            // 顶部位置：与设备库按钮对齐
            const targetTop = btnRect.top;

            this.panel.style.left = targetLeft + 'px';
            this.panel.style.top = targetTop + 'px';
            this.panel.style.transform = 'none';

            // 确保面板不会超出屏幕底部
            const rect = this.panel.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            if (rect.top + rect.height > viewportHeight - 20) {
                this.panel.style.top = (viewportHeight - rect.height - 20) + 'px';
            }
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
