// 仿真面板 - 核心功能脚本

// 布局管理器实例
let layoutManager = null;

// 属性面板当前激活的tab
let activePanelTab = null;

document.addEventListener('DOMContentLoaded', function() {
    const pageLayout = new URLSearchParams(window.location.search).get('layout');

    if (pageLayout) {
        document.body.classList.add(`layout-${pageLayout}`);
    }

    // 初始化布局管理器
    layoutManager = new LayoutManager();
    layoutManager.setCallbacks({
        onWindowControlUpdate: updateWindowControlButton,
        onStatusBarUpdate: updateStatusBarWindowStates,
        onUpdateAllWindowControls: updateAllWindowControls
    });
    
    setupWindowControls();
    setupTimelineToggle();
    setupToolbarControls();
    setupToolbarResponsive();
    setupWindowSwapControls();
    initializeWindowStates();
    setupPanelTabs();
    window.initActionEditorShell?.();

    // 初始化设备库面板
    import('./js/device-library-panel.js').then(module => {
        window.initDeviceLibraryPanel = module.initDeviceLibraryPanel;
        window.getDeviceLibraryPanel = module.getDeviceLibraryPanel;
        window.initDeviceLibraryPanel();
    });
    
    // 确保所有窗口控制状态正确
    updateAllWindowControls();
    
    // 调试项目下拉菜单
    setupProjectDropdown();
    setupTopMenuInteractions();
});

// 更新窗口控制按钮
function updateWindowControlButton(windowElement) {
    const toggleBtn = windowElement.querySelector('.toggle-btn');
    const swapDropdown = windowElement.querySelector('.window-swap-dropdown');
    const icon = toggleBtn.querySelector('i');
    
    const state = layoutManager ? layoutManager.getState() : { fullscreenWindow: null, isInLayoutMode: false };
    
    if (state.fullscreenWindow === windowElement) {
        // 当前窗口全屏时只显示最小化按钮
        icon.className = 'bi bi-caret-down-square';
        toggleBtn.title = '最小化窗口';
        // 全屏时隐藏交换按钮
        swapDropdown.style.display = 'none';
    } else {
        // 非全屏窗口显示全屏按钮
        icon.className = 'bi bi-arrows-fullscreen';
        toggleBtn.title = '全屏显示';
        // 布局模式下显示交换按钮
        if (state.isInLayoutMode) {
            swapDropdown.style.display = 'inline-block';
        } else {
            swapDropdown.style.display = 'none';
        }
    }
}

// 全屏显示窗口（通过布局管理器）
function enterFullscreen(windowElement) {
    if (layoutManager) {
        // 这个函数主要被布局中的窗口控制按钮调用，所以标记为从布局来的
        layoutManager.enterFullscreen(windowElement, 'layout');
    }
}

// 返回布局模式（已由布局管理器处理，保留此函数以防其他地方调用）
function exitFullscreen() {
    // 此功能现在由布局管理器的 minimizeWindow 方法处理
    console.log('exitFullscreen已废弃，请使用布局管理器的minimizeWindow方法');
}

// 更新状态栏窗口管理按钮状态
function updateStatusBarWindowStates() {
    const windowItems = document.querySelectorAll('.window-item');
    const state = layoutManager ? layoutManager.getState() : { fullscreenWindow: null };
    
    windowItems.forEach(item => {
        const windowType = item.textContent.trim();
        const targetWindow = layoutManager ? layoutManager.getWindowByType(windowType) : null;
        
        if (targetWindow) {
            if (state.fullscreenWindow === targetWindow) {
                // 当前窗口全屏，标记为激活状态
                item.classList.add('active');
            } else {
                // 其他窗口都标记为未激活状态
                item.classList.remove('active');
            }
        }
    });
}

// 初始化窗口状态
function initializeWindowStates() {
    // 隐藏所有窗口
    const allWindows = document.querySelectorAll('.window');
    allWindows.forEach(window => {
        window.style.display = 'none';
    });
    
    // 隐藏布局选择器，使用布局管理器创建默认布局
    const layoutSelector = document.querySelector('.layout-selector');
    layoutSelector.style.display = 'none';
    
    // 初始化布局管理器并创建默认布局
    if (layoutManager) {
        layoutManager.initialize();
    }
    
    // 重置全屏窗口状态
    fullscreenWindow = null;
}

// 工具栏按钮切换逻辑
function setupToolbarControls() {
    const leftToolbarBtns = document.querySelectorAll('.left-toolbar-btn');

    leftToolbarBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const toolType = this.getAttribute('data-tool');

            if (toolType === 'tools') {
                // 工具按钮：切换激活状态和子工具栏显示
                const isActive = this.classList.contains('active');
                const subToolbar = document.getElementById('sub-toolbar');

                if (isActive) {
                    // 当前激活，点击取消激活
                    this.classList.remove('active');
                    if (subToolbar) {
                        subToolbar.classList.remove('show');
                    }
                } else {
                    // 当前未激活，点击激活
                    this.classList.add('active');
                    if (subToolbar) {
                        subToolbar.classList.add('show');
                    }
                    // 联动激活右侧属性面板的结构tab
                    activateStructureTab();
                }
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
        });
    });
}

// 检测画布空间并切换响应式模式
function setupToolbarResponsive() {
    const centerContent = document.querySelector('.center-content');
    if (!centerContent) return;

    // 子工具栏宽度约595px，需要足够空间居中显示
    // 使用650px作为阈值（工具栏宽度+边距）
    const MIN_WIDTH_FOR_CENTERED = 650;

    function checkSpace() {
        const containerWidth = centerContent.offsetWidth;
        const subToolbar = document.getElementById('sub-toolbar');
        const toolbarWidth = subToolbar ? subToolbar.offsetWidth : 595;

        // 判断是否有足够空间居中显示
        // 需要：容器宽度 >= 工具栏宽度 + 左侧工具栏宽度(60px) + 边距(50px)
        const hasEnoughSpace = containerWidth >= (toolbarWidth + 110);

        if (hasEnoughSpace) {
            centerContent.classList.remove('space-constrained');
        } else {
            centerContent.classList.add('space-constrained');
        }
    }

    // 初始检查
    checkSpace();

    // 使用ResizeObserver监听容器大小变化
    if (typeof ResizeObserver !== 'undefined') {
        const resizeObserver = new ResizeObserver(() => {
            checkSpace();
        });
        resizeObserver.observe(centerContent);

        // 保存observer引用以便后续清理
        window.toolbarResizeObserver = resizeObserver;
    } else {
        // 降级方案：监听窗口resize事件
        window.addEventListener('resize', checkSpace);
    }
}

// 设置窗口控制功能
function setupWindowControls() {
    const toggleBtns = document.querySelectorAll('.toggle-btn');
    const windowItems = document.querySelectorAll('.window-item');
    
    // 窗口控制按钮（最小化/全屏）
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const windowElement = this.closest('.window');
            
            if (layoutManager) {
                layoutManager.handleWindowControlClick(windowElement);
            }
        });
    });
    
    // 状态栏窗口管理按钮
    windowItems.forEach(item => {
        item.addEventListener('click', function() {
            const windowType = this.textContent.trim();
            
            if (layoutManager) {
                layoutManager.handleWindowItemClick(windowType);
            }
        });
    });
}

// 最小化窗口（通过布局管理器）
function minimizeWindow(windowElement) {
    if (layoutManager) {
        layoutManager.minimizeWindow(windowElement);
    }
}

// 显示窗口
function showWindow(windowElement) {
    windowElement.style.display = 'flex';
    windowElement.classList.remove('minimized');
}

// 更新窗口管理按钮状态
function updateWindowItemState(windowItem, isActive) {
    if (isActive) {
        windowItem.classList.add('active');
    } else {
        windowItem.classList.remove('active');
    }
}



// 设置补充行为控制面板展开/收起功能
function setupTimelineToggle() {
    const timelinePanel = document.querySelector('.timeline-panel');
    const timelineToggle = document.querySelector('.timeline-toggle');
    
    if (timelinePanel && timelineToggle) {
        // 点击整个标题栏都可以切换
        const timelineHeader = timelinePanel.querySelector('.timeline-header');
        if (timelineHeader) {
            timelineHeader.addEventListener('click', function(e) {
                toggleTimelinePanel();
            });
        }
    }
    
    function toggleTimelinePanel() {
        const isExpanded = timelinePanel.classList.contains('expanded');
        const icon = timelineToggle.querySelector('i');
        
        if (isExpanded) {
            // 当前展开，点击收起
            timelinePanel.classList.remove('expanded');
            icon.className = 'bi bi-caret-up-fill';
        } else {
            // 当前收起，点击展开
            timelinePanel.classList.add('expanded');
            icon.className = 'bi bi-caret-down-fill';
        }
    }
}



// 设置窗口位置交换控件
function setupWindowSwapControls() {
    // 添加必要的CSS样式
    addSwapControlsStyles();
    
    // 设置交换按钮事件
    const swapBtns = document.querySelectorAll('.swap-btn');
    const swapDropdowns = document.querySelectorAll('.window-swap-dropdown');
    
    swapBtns.forEach(btn => {
        const dropdown = btn.closest('.window-swap-dropdown');
        const menu = dropdown.querySelector('.swap-dropdown-menu');
        
        // 鼠标悬停显示菜单
        dropdown.addEventListener('mouseenter', function() {
            const state = layoutManager ? layoutManager.getState() : { isInLayoutMode: false, fullscreenWindow: null };
            if (state.isInLayoutMode && !state.fullscreenWindow) {
                updateSwapDropdownMenu(this);
                menu.style.display = 'block';
            }
        });
        
        // 鼠标离开隐藏菜单
        dropdown.addEventListener('mouseleave', function() {
            menu.style.display = 'none';
        });
    });
}

// 添加交换控件的CSS样式
function addSwapControlsStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .window-swap-dropdown {
            position: relative;
            display: inline-block;
        }
        
        .swap-dropdown-menu {
            position: absolute;
            top: 100%;
            right: 0;
            min-width: 120px;
            background: #2b2b2b;
            border: 1px solid #444;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            z-index: 1000;
            display: none;
            padding: 4px 0;
        }
        
        .swap-dropdown-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            cursor: pointer;
            color: #ffffff;
            font-size: 12px;
            transition: background-color 0.2s;
        }
        
        .swap-dropdown-item:hover {
            background-color: #404040;
        }
        
        .swap-dropdown-item i {
            font-size: 14px;
            width: 14px;
            text-align: center;
        }
    `;
    document.head.appendChild(style);
}

// 更新交换下拉菜单内容
function updateSwapDropdownMenu(swapDropdown) {
    if (!layoutManager) return;
    
    const currentWindow = swapDropdown.closest('.window');
    const currentWindowId = currentWindow.getAttribute('data-window');
    const menu = swapDropdown.querySelector('.swap-dropdown-menu');
    
    // 获取其他窗口选项
    const otherWindows = layoutManager.getOtherWindows(currentWindowId);
    if (otherWindows.length === 0) return;
    
    // 清空并重新生成菜单项
    menu.innerHTML = '';
    
    const state = layoutManager.getState();
    const isDualLayout = state.currentLayoutType && state.currentLayoutType.startsWith('dual-');
    
    otherWindows.forEach(({ id, name, icon, index, isInLayout }) => {
        const item = document.createElement('div');
        item.className = 'swap-dropdown-item';
        
        item.innerHTML = `
            <i class="${icon}"></i>
            <span>${name}</span>
        `;
        
        item.addEventListener('click', function(e) {
            e.stopPropagation();
            const currentIndex = layoutManager.getWindowIndex(currentWindowId);
            if (currentIndex !== -1) {
                if (isDualLayout && !isInLayout) {
                    // 双窗口布局中，用隐藏窗口替换当前窗口
                    layoutManager.swapWindowPositions(currentIndex, -1, id);
                } else {
                    // 交换布局中的两个窗口
                    layoutManager.swapWindowPositions(currentIndex, index);
                }
            }
            menu.style.display = 'none';
        });
        
        menu.appendChild(item);
    });
}



// 更新窗口控制按钮状态
function updateAllWindowControls() {
    const allWindows = document.querySelectorAll('.window');
    
    allWindows.forEach(window => {
        const swapDropdown = window.querySelector('.window-swap-dropdown');
        const toggleBtn = window.querySelector('.toggle-btn');
        
        const state = layoutManager ? layoutManager.getState() : { isInLayoutMode: false, fullscreenWindow: null };
        if (state.isInLayoutMode && !state.fullscreenWindow) {
            // 布局模式下显示交换按钮
            swapDropdown.style.display = 'inline-block';
        } else {
            // 非布局模式或全屏模式下隐藏交换按钮
            swapDropdown.style.display = 'none';
        }
        
        // 更新toggle按钮
        updateWindowControlButton(window);
    });
}

// 设置属性面板Tab功能
function setupPanelTabs() {
    const panelTabs = document.querySelectorAll('.panel-tab');
    const tabContents = document.querySelectorAll('.panel-tab-content');
    const panelContentWrapper = document.querySelector('.panel-content-wrapper');
    const rightPanel = document.querySelector('.right-panel');
    
    // 如果面板内容还未加载，则延迟执行
    if (!panelContentWrapper || !rightPanel) {
        setTimeout(() => setupPanelTabs(), 500);
        return;
    }
    
    panelTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            const targetContent = document.querySelector(`[data-content="${tabId}"]`);
            
            if (!targetContent) return;
            
            // 如果点击的是当前激活的tab，则关闭所有tab
            if (activePanelTab === tabId) {
                // 关闭当前tab
                this.classList.remove('active');
                targetContent.classList.remove('active');
                if (panelContentWrapper) {
                    panelContentWrapper.style.display = 'none';
                }
                if (rightPanel) {
                    rightPanel.classList.remove('tabs-open');
                    rightPanel.classList.add('tabs-closed');
                }
                activePanelTab = null;
            } else {
                // 先关闭所有tab
                panelTabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // 激活选中的tab
                this.classList.add('active');
                targetContent.classList.add('active');
                if (panelContentWrapper) {
                    panelContentWrapper.style.display = 'flex';
                }
                if (rightPanel) {
                    rightPanel.classList.remove('tabs-closed');
                    rightPanel.classList.add('tabs-open');
                }
                activePanelTab = tabId;
            }
        });
    });
    
    // 初始化：所有tab都关闭，只显示tab栏
    if (panelContentWrapper) {
        panelContentWrapper.style.display = 'none';
    }
    if (rightPanel) {
        rightPanel.classList.add('tabs-closed');
    }
}

// 激活结构tab的辅助函数
function activateStructureTab() {
    const structureTab = document.querySelector('[data-tab="structure"]');
    const structureContent = document.querySelector('[data-content="structure"]');
    const panelTabs = document.querySelectorAll('.panel-tab');
    const tabContents = document.querySelectorAll('.panel-tab-content');
    const panelContentWrapper = document.querySelector('.panel-content-wrapper');
    const rightPanel = document.querySelector('.right-panel');
    
    if (!structureTab || !structureContent || !panelContentWrapper || !rightPanel) return;
    
    // 先关闭所有tab
    panelTabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));
    
    // 激活结构tab
    structureTab.classList.add('active');
    structureContent.classList.add('active');
    panelContentWrapper.style.display = 'flex';
    rightPanel.classList.remove('tabs-closed');
    rightPanel.classList.add('tabs-open');
    
    // 更新全局状态变量
    activePanelTab = 'structure';
}

// 设置项目下拉菜单功能
function setupProjectDropdown() {
    const projectDropdown = document.querySelector('.project-dropdown');
    const projectDropdownBtn = document.querySelector('.project-dropdown-btn');
    const projectDropdownMenu = document.querySelector('.project-dropdown-menu');
    let projectItemMenu = document.querySelector('.project-item-menu');
    
    if (!projectDropdown || !projectDropdownMenu) {
        return;
    }

    if (projectDropdown.dataset.dropdownBound === 'true') {
        return;
    }

    projectDropdown.dataset.dropdownBound = 'true';
    if (projectDropdownMenu.parentElement !== document.body) {
        document.body.appendChild(projectDropdownMenu);
    }
    if (!projectItemMenu) {
        projectItemMenu = document.createElement('div');
        projectItemMenu.className = 'project-item-menu';
        projectItemMenu.innerHTML = [
            '<button class="project-item-menu-item" type="button" data-action="open">打开</button>',
            '<button class="project-item-menu-item" type="button" data-action="edit">编辑</button>',
            '<button class="project-item-menu-item" type="button" data-action="export">导出</button>',
            '<button class="project-item-menu-item" type="button" data-action="remove">删除</button>'
        ].join('');
        document.body.appendChild(projectItemMenu);
    }

    let activeMoreButton = null;

    const syncMenuPosition = () => {
        if (!projectDropdown || !projectDropdownMenu) {
            return;
        }
        const rect = projectDropdown.getBoundingClientRect();
        projectDropdownMenu.style.position = 'fixed';
        projectDropdownMenu.style.left = `${Math.round(rect.left + 5)}px`;
        projectDropdownMenu.style.top = `${Math.round(rect.bottom + 5)}px`;
    };

    const setOpen = (open) => {
        projectDropdown.classList.toggle('open', open);
        projectDropdownMenu.classList.toggle('open', open);
        if (projectDropdownBtn) {
            projectDropdownBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        }
        if (open) {
            syncMenuPosition();
        } else if (activeMoreButton) {
            activeMoreButton.setAttribute('aria-expanded', 'false');
            activeMoreButton = null;
            projectItemMenu.classList.remove('open');
        }
    };

    const closeItemMenu = () => {
        if (activeMoreButton) {
            activeMoreButton.setAttribute('aria-expanded', 'false');
            activeMoreButton = null;
        }
        projectItemMenu.classList.remove('open');
    };

    const openItemMenu = (button) => {
        const rect = button.getBoundingClientRect();
        closeItemMenu();
        activeMoreButton = button;
        activeMoreButton.setAttribute('aria-expanded', 'true');
        projectItemMenu.style.left = `${Math.round(rect.right + 6)}px`;
        projectItemMenu.style.top = `${Math.round(rect.top - 4)}px`;
        projectItemMenu.classList.add('open');
    };

    if (projectDropdownBtn) {
        projectDropdownBtn.setAttribute('aria-haspopup', 'menu');
        projectDropdownBtn.setAttribute('aria-expanded', 'false');
        projectDropdownBtn.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            setOpen(!projectDropdown.classList.contains('open'));
        });
        projectDropdownBtn.addEventListener('focus', function() {
            syncMenuPosition();
        });
    }

    document.addEventListener('click', function(event) {
        if (!projectDropdown.contains(event.target) && !projectDropdownMenu.contains(event.target) && !projectItemMenu.contains(event.target)) {
            setOpen(false);
            closeItemMenu();
        }
    });

    projectDropdownMenu.addEventListener('click', function(event) {
        event.stopPropagation();
    });

    projectDropdownMenu.querySelectorAll('.project-dropdown-item-more').forEach((button) => {
        button.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            if (button === activeMoreButton && projectItemMenu.classList.contains('open')) {
                closeItemMenu();
                return;
            }
            openItemMenu(button);
        });
    });

    projectItemMenu.addEventListener('click', function(event) {
        const item = event.target.closest('.project-item-menu-item');
        if (!item) {
            return;
        }
        event.stopPropagation();
        closeItemMenu();
    });

    window.addEventListener('resize', function() {
        if (projectDropdown.classList.contains('open')) {
            syncMenuPosition();
        }
        closeItemMenu();
    });

    window.addEventListener('scroll', function() {
        if (projectDropdown.classList.contains('open')) {
            syncMenuPosition();
        }
        closeItemMenu();
    }, true);
}

function setupTopMenuInteractions() {
    const topMenu = document.querySelector('.top-menu-bar');
    const tooltipLayer = document.createElement('div');

    if (!topMenu || topMenu.dataset.topMenuBound === 'true') {
        return;
    }

    topMenu.dataset.topMenuBound = 'true';
    tooltipLayer.className = 'top-menu-tooltip-layer';
    document.body.appendChild(tooltipLayer);

    const showTooltip = (target) => {
        if (!target.dataset.tooltip) {
            return;
        }
        hideTooltip();
        target.dataset.tooltipVisible = 'true';

        const rect = target.getBoundingClientRect();
        tooltipLayer.textContent = target.dataset.tooltip;
        tooltipLayer.classList.add('visible');

        const layerRect = tooltipLayer.getBoundingClientRect();
        const left = rect.left + (rect.width / 2) - (layerRect.width / 2);
        const top = rect.bottom + 10;

        tooltipLayer.style.left = `${Math.max(8, Math.min(left, window.innerWidth - layerRect.width - 8))}px`;
        tooltipLayer.style.top = `${top}px`;
    };

    const hideTooltip = () => {
        topMenu.querySelectorAll('[data-tooltip-visible="true"]').forEach((target) => {
            delete target.dataset.tooltipVisible;
        });
        tooltipLayer.classList.remove('visible');
    };

    topMenu.addEventListener('mouseover', (event) => {
        const target = event.target.closest('[data-tooltip]');
        if (!target || !topMenu.contains(target)) {
            return;
        }
        showTooltip(target);
    });

    topMenu.addEventListener('mouseout', (event) => {
        const target = event.target.closest('[data-tooltip]');
        if (!target || !topMenu.contains(target)) {
            return;
        }
        const nextTarget = event.relatedTarget instanceof Element ? event.relatedTarget.closest('[data-tooltip]') : null;
        if (nextTarget === target) {
            return;
        }
        hideTooltip();
    });

    topMenu.querySelectorAll('[data-tooltip]').forEach((target) => {
        target.addEventListener('mouseenter', () => showTooltip(target));
        target.addEventListener('mouseleave', hideTooltip);
        target.addEventListener('focus', () => showTooltip(target));
        target.addEventListener('blur', hideTooltip);
    });

    const closeAllDropdowns = () => {
        topMenu.querySelectorAll('.top-menu-dropdown.open').forEach((dropdown) => {
            dropdown.classList.remove('open');
            const trigger = dropdown.querySelector('[aria-expanded="true"]');
            if (trigger) {
                trigger.setAttribute('aria-expanded', 'false');
            }
        });
    };

    topMenu.querySelectorAll('.top-menu-dropdown').forEach((dropdown) => {
        const currentUserInline = dropdown.querySelector('.current-user-inline');
        const userBtn = dropdown.querySelector('.current-user-btn');
        const chevronBtn = dropdown.querySelector('.current-user-chevron');
        const directBtn = dropdown.querySelector('.download-menu-btn');

        const toggleDropdown = (event) => {
            event.preventDefault();
            event.stopPropagation();

            const willOpen = !dropdown.classList.contains('open');
            closeAllDropdowns();

            if (willOpen) {
                dropdown.classList.add('open');
                if (userBtn) {
                    userBtn.setAttribute('aria-expanded', 'true');
                }
                if (directBtn) {
                    directBtn.setAttribute('aria-expanded', 'true');
                }
            }
        };

        if (currentUserInline) {
            currentUserInline.addEventListener('click', toggleDropdown);
        }

        if (userBtn) {
            userBtn.addEventListener('click', toggleDropdown);
        }

        if (chevronBtn) {
            chevronBtn.addEventListener('click', toggleDropdown);
        }

        if (directBtn) {
            directBtn.addEventListener('click', toggleDropdown);
        }
    });

    document.addEventListener('click', (event) => {
        if (!topMenu.contains(event.target)) {
            closeAllDropdowns();
            hideTooltip();
        }
    });

    window.addEventListener('scroll', hideTooltip, true);
    window.addEventListener('resize', hideTooltip);
}
