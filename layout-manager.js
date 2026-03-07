// 布局管理器模块 - 负责窗口布局的创建、管理和渲染

class LayoutManager {
    constructor() {
        // 布局相关状态
        this.isInLayoutMode = false;
        this.selectedWindows = [];
        this.layoutCells = [];
        
        // 窗口状态管理
        this.fullscreenWindow = null;
        this.windowStates = new Map(); // 记录每个窗口的状态
        this.fullscreenSource = null; // 记录全屏的来源：'layout' | 'statusbar' | null
        
        // 持久化存储键名
        this.STORAGE_KEY = 'hitbotos_layout_state';

        // URL参数名
        this.URL_PARAM_NAME = 'layout';

        // 窗口类型定义
        this.windowTypes = [
            { id: 'electrical', name: '电气拓扑', icon: 'bi bi-diagram-3' },
            { id: 'simulation', name: '3D仿真', icon: 'bi bi-box' },
            { id: 'action', name: '动作编辑', icon: 'bi bi-code-square' }
        ];
        
        // DOM 元素引用
        this.layoutSelector = null;
        this.layoutContainer = null;
        this.workspace = null;
        
        // 事件回调函数
        this.onWindowControlUpdate = null;
        this.onStatusBarUpdate = null;
        this.onUpdateAllWindowControls = null;
    }
    
    // 保存布局状态到URL参数
    saveLayoutState() {
        try {
            // 如果在布局模式但没有完整配置，不保存状态
            if (this.isInLayoutMode && this.selectedWindows.length > 0) {
                const validWindows = this.selectedWindows.filter(w => w !== null && w !== undefined && w !== '');
                const expectedCount = this.currentLayoutType && this.currentLayoutType.startsWith('dual-') ? 2 : 3;

                // 如果窗口配置不完整且不是全屏状态，暂时不保存
                if (validWindows.length < expectedCount && !this.fullscreenWindow) {
                    console.log('窗口配置不完整，暂时不保存状态');
                    return;
                }
            }

            const state = {
                isInLayoutMode: this.isInLayoutMode,
                selectedWindows: [...this.selectedWindows],
                currentLayoutType: this.currentLayoutType,
                fullscreenWindowType: this.fullscreenWindow ? this.getWindowTypeByElement(this.fullscreenWindow) : null,
                fullscreenSource: this.fullscreenSource,
                timestamp: Date.now()
            };

            // 更新URL参数
            this.updateURLWithState(state);
            console.log('布局状态已保存到URL:', state);
        } catch (error) {
            console.warn('保存布局状态失败:', error);
        }
    }
    
    // 从URL参数恢复布局状态
    restoreLayoutState() {
        try {
            const savedState = this.getStateFromURL();
            if (!savedState) {
                console.log('URL中未找到布局参数，使用默认布局');
                return false;
            }

            console.log('正在从URL恢复布局状态:', savedState);

            // 检查状态有效性
            if (!savedState.hasOwnProperty('isInLayoutMode') || !savedState.currentLayoutType) {
                console.log('URL中的状态格式无效，使用默认布局');
                return false;
            }

            // 恢复状态
            this.isInLayoutMode = savedState.isInLayoutMode;
            this.selectedWindows = savedState.selectedWindows || [];
            this.currentLayoutType = savedState.currentLayoutType;
            this.fullscreenSource = savedState.fullscreenSource;

            // 恢复布局
            if (savedState.fullscreenWindowType) {
                // 恢复全屏状态
                this.restoreFullscreenState(savedState.fullscreenWindowType, savedState.fullscreenSource);
            } else if (savedState.isInLayoutMode && savedState.currentLayoutType) {
                // 恢复布局模式
                this.restoreLayoutMode(savedState.currentLayoutType, savedState.selectedWindows);
            } else {
                // 如果状态不完整，使用默认布局
                console.log('URL中的状态不完整，使用默认布局');
                this.createDefaultLayout();
            }

            return true;
        } catch (error) {
            console.warn('恢复布局状态失败:', error);
            return false;
        }
    }
    
    // 恢复全屏状态
    restoreFullscreenState(windowType, source) {
        const windowElement = this.getWindowByType(windowType);
        if (windowElement) {
            // 延迟执行，确保DOM完全加载
            setTimeout(() => {
                this.enterFullscreen(windowElement, source);
            }, 100);
        } else {
            console.warn('恢复全屏状态失败，找不到窗口:', windowType);
            this.showLayoutSelector();
        }
    }
    
    // 恢复布局模式
    restoreLayoutMode(layoutType, selectedWindows) {
        // 隐藏布局选择器
        this.layoutSelector.style.display = 'none';
        
        // 重置所有窗口状态
        this.resetAllWindowsToWorkspace();
        
        // 设置布局
        const isDualLayout = layoutType.startsWith('dual-');
        const cellCount = isDualLayout ? 2 : 3;
        
        // 验证selectedWindows的有效性
        if (!Array.isArray(selectedWindows) || selectedWindows.length !== cellCount) {
            console.warn('保存的窗口配置无效，回到布局选择器');
            this.showLayoutSelector();
            return;
        }
        
        // 检查是否所有窗口都已分配（排除null和undefined）
        const validWindows = selectedWindows.filter(w => w !== null && w !== undefined && w !== '');
        if (validWindows.length === 0) {
            console.warn('没有有效的窗口配置，回到布局选择器');
            this.showLayoutSelector();
            return;
        }
        
        // 如果只有部分窗口分配且不是完整配置，回到布局选择器
        if (validWindows.length < cellCount && validWindows.length !== cellCount) {
            console.warn('窗口配置不完整，回到布局选择器');
            this.showLayoutSelector();
            return;
        }
        
        // 恢复状态
        this.selectedWindows = [...selectedWindows];
        this.layoutCells = [];
        this.isInLayoutMode = true;
        this.currentLayoutType = layoutType;
        
        // 设置布局容器
        this.layoutContainer.innerHTML = '';
        this.layoutContainer.className = `layout-container ${layoutType}`;
        this.layoutContainer.style.display = 'grid';
        
        // 创建布局单元格
        for (let i = 0; i < cellCount; i++) {
            const cell = document.createElement('div');
            cell.className = 'layout-cell';
            cell.setAttribute('data-cell-index', i);
            
            this.layoutCells.push(cell);
            this.layoutContainer.appendChild(cell);
        }
        
        // 延迟渲染窗口，确保DOM完全准备好
        setTimeout(() => {
            // 分配窗口到对应位置
            this.selectedWindows.forEach((windowId, index) => {
                if (windowId) {
                    this.renderSelectedWindow(this.layoutCells[index], windowId);
                }
            });
            
            // 触发状态栏更新回调
            if (this.onStatusBarUpdate) {
                this.onStatusBarUpdate();
            }
        }, 100);
    }
    
    // 根据窗口元素获取窗口类型
    getWindowTypeByElement(windowElement) {
        if (windowElement.classList.contains('simulation-window')) {
            return 'simulation';
        } else if (windowElement.classList.contains('electrical-window')) {
            return 'electrical';
        } else if (windowElement.classList.contains('action-window')) {
            return 'action';
        }
        return null;
    }
    
    // 清除保存的布局状态
    clearLayoutState() {
        try {
            this.clearStateFromURL();
            console.log('URL中的布局状态已清除');
        } catch (error) {
            console.warn('清除布局状态失败:', error);
        }
    }

    // 布局代码映射（简洁直观）
    // 使用数字和简单的单词缩写
    getLayoutCode() {
        return {
            'layout1': '1',      // 上下分层
            'layout2': '2',      // 默认布局
            'layout3': '3',      // 三列并排
            'dual-lr-73': '2-7', // 双窗口左右7:3
            'dual-lr-55': '2-5', // 双窗口左右5:5
            'dual-tb-55': '2-t'  // 双窗口上下5:5
        };
    }

    getLayoutNameFromCode(code) {
        const codeMap = {
            '1': 'layout1',
            '2': 'layout2',
            '3': 'layout3',
            '2-7': 'dual-lr-73',
            '2-5': 'dual-lr-55',
            '2-t': 'dual-tb-55'
        };
        return codeMap[code] || null;
    }

    // 窗口代码映射（使用拼音首字母，更直观）
    // 电(dian) 3D(3D) 动(dong)
    getWindowCode() {
        return {
            'electrical': 'd',
            'simulation': '3d',
            'action': 'dong'
        };
    }

    getWindowNameFromCode(code) {
        const codeMap = {
            'd': 'electrical',
            '3d': 'simulation',
            'dong': 'action'
        };
        return codeMap[code] || null;
    }

    // 将状态编码为简洁的URL参数
    // 格式: layout_windows 或 fs_window
    // 例如: 2_d-3d-dong (layout2 with 电气,3D,动作)
    // 例如: fs_3d (fullscreen 3D)
    encodeStateToURL(state) {
        try {
            const layoutCodeMap = this.getLayoutCode();
            const windowCodeMap = this.getWindowCode();

            // 全屏模式: fs_windowCode
            if (state.fullscreenWindowType) {
                const windowCode = windowCodeMap[state.fullscreenWindowType] || '3d';
                return `fs_${windowCode}`;
            }

            // 布局模式: layoutCode_window1-window2-window3
            const layoutCode = layoutCodeMap[state.currentLayoutType] || '2';
            const windowCodes = state.selectedWindows
                .filter(w => w)
                .map(w => windowCodeMap[w] || '')
                .filter(Boolean)
                .join('-');

            return `${layoutCode}_${windowCodes}`;
        } catch (error) {
            console.warn('编码状态到URL失败:', error);
            return null;
        }
    }

    // 从URL参数解码状态
    decodeStateFromURL(encoded) {
        try {
            // 格式: layoutCode_windows 或 fs_windowCode
            const parts = encoded.split('_');
            if (parts.length !== 2) return null;

            const [prefix, value] = parts;

            // 全屏模式: fs_windowCode
            if (prefix === 'fs') {
                const windowType = this.getWindowNameFromCode(value);
                return {
                    isInLayoutMode: false,
                    currentLayoutType: null,
                    selectedWindows: [],
                    fullscreenWindowType: windowType,
                    fullscreenSource: 'statusbar',
                    timestamp: Date.now()
                };
            }

            // 布局模式: layoutCode_windows
            const layoutType = this.getLayoutNameFromCode(prefix);
            if (!layoutType) return null;

            const windowCodes = value.split('-');
            const selectedWindows = windowCodes
                .map(code => this.getWindowNameFromCode(code))
                .filter(Boolean);

            return {
                isInLayoutMode: true,
                currentLayoutType: layoutType,
                selectedWindows: selectedWindows,
                fullscreenWindowType: null,
                fullscreenSource: null,
                timestamp: Date.now()
            };
        } catch (error) {
            console.warn('从URL解码状态失败:', error);
            return null;
        }
    }

    // 更新URL中的布局参数
    updateURLWithState(state) {
        const encoded = this.encodeStateToURL(state);
        if (!encoded) return;

        const url = new URL(window.location.href);
        if (encoded) {
            url.searchParams.set(this.URL_PARAM_NAME, encoded);
        }
        window.history.replaceState({}, '', url.toString());
    }

    // 从URL获取布局状态
    getStateFromURL() {
        const params = new URLSearchParams(window.location.search);
        const encoded = params.get(this.URL_PARAM_NAME);
        if (!encoded) return null;
        return this.decodeStateFromURL(encoded);
    }

    // 清除URL中的布局参数
    clearStateFromURL() {
        const url = new URL(window.location.href);
        url.searchParams.delete(this.URL_PARAM_NAME);
        window.history.replaceState({}, '', url.toString());
    }

    // 初始化布局管理器
    initialize() {
        this.layoutSelector = document.querySelector('.layout-selector');
        this.layoutContainer = document.querySelector('.layout-container');
        this.workspace = document.querySelector('.workspace');
        
        this.setupLayoutSelector();
        
        // 尝试恢复保存的布局状态，如果失败则创建默认布局
        if (!this.restoreLayoutState()) {
            this.createDefaultLayout();
        }
    }
    
    // 设置事件回调
    setCallbacks(callbacks) {
        this.onWindowControlUpdate = callbacks.onWindowControlUpdate;
        this.onStatusBarUpdate = callbacks.onStatusBarUpdate;
        this.onUpdateAllWindowControls = callbacks.onUpdateAllWindowControls;
    }
    
    // 设置布局选择器功能
    setupLayoutSelector() {
        const layoutOptions = document.querySelectorAll('.layout-option');
        
        layoutOptions.forEach(option => {
            option.addEventListener('click', () => {
                const layoutType = option.getAttribute('data-layout');
                this.createLayout(layoutType);
            });
        });
    }
    
    // 创建布局
    createLayout(layoutType) {
        // 隐藏布局选择器
        this.layoutSelector.style.display = 'none';
        
        // 重置所有窗口状态
        this.resetAllWindowsToWorkspace();
        
        // 判断是三窗口还是双窗口布局
        const isDualLayout = layoutType.startsWith('dual-');
        const cellCount = isDualLayout ? 2 : 3;
        
        // 重置状态
        this.selectedWindows = new Array(cellCount).fill(null);
        this.layoutCells = [];
        this.isInLayoutMode = true;
        this.currentLayoutType = layoutType;
        
        // 清空并显示布局容器
        this.layoutContainer.innerHTML = '';
        this.layoutContainer.className = `layout-container ${layoutType}`;
        this.layoutContainer.style.display = 'grid';
        
        // 创建布局单元格
        for (let i = 0; i < cellCount; i++) {
            const cell = document.createElement('div');
            cell.className = 'layout-cell';
            cell.setAttribute('data-cell-index', i);
            
            this.layoutCells.push(cell);
            this.layoutContainer.appendChild(cell);
        }
        
        // 初始化所有单元格显示所有可选窗口
        this.updateAllCells();
        
        // 触发所有窗口控制更新
        if (this.onUpdateAllWindowControls) {
            this.onUpdateAllWindowControls();
        }
        
        // 注意：这里不保存状态，因为窗口还没有完全配置完成
    }
    
    // 创建默认布局
    createDefaultLayout() {
        // 重置所有窗口状态
        this.resetAllWindowsToWorkspace();
        
        // 重置状态
        this.selectedWindows = ['electrical', 'simulation', 'action']; // 左、右上、右下
        this.layoutCells = [];
        this.isInLayoutMode = true;
        this.currentLayoutType = 'layout2'; // 设置默认布局类型
        
        // 清空并设置布局容器为layout2
        this.layoutContainer.innerHTML = '';
        this.layoutContainer.className = 'layout-container layout2';
        this.layoutContainer.style.display = 'grid';
        
        // 创建三个布局单元格
        for (let i = 0; i < 3; i++) {
            const cell = document.createElement('div');
            cell.className = 'layout-cell';
            cell.setAttribute('data-cell-index', i);
            
            this.layoutCells.push(cell);
            this.layoutContainer.appendChild(cell);
        }
        
        // 分配窗口到对应位置
        this.selectedWindows.forEach((windowId, index) => {
            if (windowId) {
                this.renderSelectedWindow(this.layoutCells[index], windowId);
            }
        });
        
        // 触发状态栏更新回调
        if (this.onStatusBarUpdate) {
            this.onStatusBarUpdate();
        }
        
        // 保存布局状态
        this.saveLayoutState();
    }
    
    // 更新所有单元格
    updateAllCells() {
        // 获取可选窗口（排除已选择的）
        const availableWindows = this.windowTypes.filter(window => 
            !this.selectedWindows.includes(window.id)
        );
        
        // 检查是否已经分配完毕
        const selectedCount = this.selectedWindows.filter(w => w !== null && w !== undefined).length;
        
        console.log('updateAllCells - selectedCount:', selectedCount, 'selectedWindows:', this.selectedWindows);
        
        // 判断是否应该自动完成布局
        const isDualLayout = this.currentLayoutType && this.currentLayoutType.startsWith('dual-');
        const targetCount = isDualLayout ? 2 : 3;
        
        // 如果只剩一个窗口未分配，自动完成布局
        if (selectedCount === targetCount - 1 && availableWindows.length === 1) {
            // 找到未分配的单元格
            const emptyIndex = this.selectedWindows.findIndex(w => !w);
            if (emptyIndex !== -1) {
                this.selectedWindows[emptyIndex] = availableWindows[0].id;
                console.log('自动分配窗口:', availableWindows[0].id, '到位置', emptyIndex);
            }
            
            console.log('开始渲染所有窗口，最终selectedWindows:', this.selectedWindows);
            
            // 确保所有窗口都被正确渲染
            this.selectedWindows.forEach((windowId, index) => {
                if (windowId && this.layoutCells[index]) {
                    console.log(`检查位置 ${index} 的窗口 ${windowId}`);
                    // 检查窗口是否已经在正确位置
                    const existingWindow = this.layoutCells[index].querySelector(`.${windowId}-window`);
                    if (!existingWindow) {
                        console.log(`位置 ${index} 需要渲染窗口 ${windowId}`);
                        // 如果窗口不在正确位置，进行渲染
                        this.renderSelectedWindow(this.layoutCells[index], windowId);
                    } else {
                        console.log(`位置 ${index} 的窗口 ${windowId} 已正确放置`);
                        // 确保单元格状态正确
                        this.layoutCells[index].classList.add('selected');
                        if (this.onWindowControlUpdate) {
                            this.onWindowControlUpdate(existingWindow);
                        }
                    }
                }
            });
            
            // 触发状态栏更新回调
            if (this.onStatusBarUpdate) {
                this.onStatusBarUpdate();
            }
            
            // 布局完成后保存状态
            this.saveLayoutState();
            return;
        }
        
        this.layoutCells.forEach((cell, index) => {
            // 如果该单元格已经有选择且已经渲染了正确的窗口，跳过
            if (this.selectedWindows[index] && cell.classList.contains('selected')) {
                const existingWindow = cell.querySelector(`.${this.selectedWindows[index]}-window`);
                if (existingWindow) {
                    return; // 窗口已正确渲染，跳过
                }
            }
            
            // 如果该单元格有选择但未正确渲染，进行渲染
            if (this.selectedWindows[index]) {
                this.renderSelectedWindow(cell, this.selectedWindows[index]);
                return;
            }
            
            // 渲染可选窗口选项
            this.renderWindowOptions(cell, index, availableWindows);
        });
    }
    
    // 渲染窗口选项
    renderWindowOptions(cell, cellIndex, availableWindows) {
        cell.innerHTML = '';
        cell.classList.remove('selected');
        
        // 只显示可用的窗口选项，已选择的窗口完全不显示
        availableWindows.forEach(window => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'window-option-item';
            
            optionDiv.innerHTML = `
                <i class="${window.icon}"></i>
                <span>${window.name}</span>
            `;
            
            optionDiv.addEventListener('click', () => {
                this.selectWindow(cellIndex, window.id);
            });
            
            cell.appendChild(optionDiv);
        });
    }
    
    // 选择窗口
    selectWindow(cellIndex, windowId) {
        this.selectedWindows[cellIndex] = windowId;
        this.updateAllCells();
        // 保存布局状态
        this.saveLayoutState();
    }
    
    // 渲染选中窗口到布局单元格
    renderSelectedWindow(cell, windowId) {
        const window = this.windowTypes.find(w => w.id === windowId);
        
        // 检查窗口是否已经在正确的位置
        const existingWindow = cell.querySelector(`.${windowId}-window`);
        if (existingWindow) {
            cell.classList.add('selected');
            if (this.onWindowControlUpdate) {
                this.onWindowControlUpdate(existingWindow);
            }
            console.log(`窗口 ${windowId}-window 已在正确位置，跳过渲染`);
            return;
        }
        
        // 清空单元格内容
        cell.innerHTML = '';
        cell.classList.add('selected');
        
        // 直接在workspace中查找窗口元素
        let actualWindow = this.workspace.querySelector(`.${windowId}-window`);
        
        // 如果在workspace中找不到，可能在其他布局单元格中，需要先移动
        if (!actualWindow) {
            const allCells = document.querySelectorAll('.layout-cell');
            allCells.forEach(layoutCell => {
                const windowInCell = layoutCell.querySelector(`.${windowId}-window`);
                if (windowInCell) {
                    actualWindow = windowInCell;
                    // 将窗口移回workspace
                    this.workspace.appendChild(actualWindow);
                    console.log(`将窗口 ${windowId}-window 从其他位置移回workspace`);
                }
            });
        }
        
        if (actualWindow) {
            // 重置窗口的所有样式属性，确保它能正常显示
            actualWindow.style.display = 'flex';
            actualWindow.style.position = 'relative';
            actualWindow.style.width = '100%';
            actualWindow.style.height = '100%';
            actualWindow.style.left = 'auto';
            actualWindow.style.top = 'auto';
            actualWindow.style.zIndex = 'auto';
            
            // 移除可能的类名
            actualWindow.classList.remove('minimized');
            
            cell.appendChild(actualWindow);
            
            // 触发窗口控制更新回调
            if (this.onWindowControlUpdate) {
                this.onWindowControlUpdate(actualWindow);
            }
        } else {
            // 如果找不到窗口，添加调试信息
            console.warn(`无法找到窗口: ${windowId}-window`);
            console.log('workspace中的所有窗口元素:', this.workspace.querySelectorAll('.window'));
            console.log('所有布局单元格中的窗口:', document.querySelectorAll('.layout-cell .window'));
        }
    }
    
    // 重置所有窗口到workspace并隐藏
    resetAllWindowsToWorkspace() {
        const allWindows = document.querySelectorAll('.window');
        
        allWindows.forEach(window => {
            // 将窗口移回workspace
            this.workspace.appendChild(window);
            
            // 重置窗口样式
            window.style.display = 'none';
            window.style.position = 'relative';
            window.style.width = 'auto';
            window.style.height = 'auto';
            window.style.left = 'auto';
            window.style.top = 'auto';
            window.style.zIndex = 'auto';
            
            // 移除可能的类名
            window.classList.remove('minimized');
        });
    }
    
    // 交换窗口位置或替换窗口
    swapWindowPositions(index1, index2, replaceWithWindowId = null) {
        // 如果是替换窗口（双窗口布局中用隐藏窗口替换显示窗口）
        if (replaceWithWindowId) {
            // 验证index1有效
            if (index1 < 0 || index1 >= this.selectedWindows.length) {
                return;
            }
            
            // 将指定位置的窗口替换为新窗口
            const oldWindowId = this.selectedWindows[index1];
            this.selectedWindows[index1] = replaceWithWindowId;
            
            // 将原窗口移回workspace并隐藏
            if (oldWindowId) {
                const oldWindowElement = document.querySelector(`.${oldWindowId}-window`);
                if (oldWindowElement) {
                    this.resetWindowToWorkspace(oldWindowElement);
                }
            }
            
            // 清空该单元格并重新渲染
            if (this.layoutCells[index1]) {
                this.layoutCells[index1].innerHTML = '';
                this.layoutCells[index1].classList.remove('selected');
                this.renderSelectedWindow(this.layoutCells[index1], replaceWithWindowId);
            }
            
            // 触发状态栏更新回调
            if (this.onStatusBarUpdate) {
                this.onStatusBarUpdate();
            }
            
            // 保存布局状态
            this.saveLayoutState();
            return;
        }
        
        // 原有的交换逻辑
        if (index1 === index2 || index1 < 0 || index2 < 0 || 
            index1 >= this.selectedWindows.length || index2 >= this.selectedWindows.length) {
            return;
        }
        
        // 在交换前，先将所有相关窗口移回workspace
        this.selectedWindows.forEach(windowId => {
            if (windowId) {
                const windowElement = document.querySelector(`.${windowId}-window`);
                if (windowElement && windowElement.parentNode !== this.workspace) {
                    this.resetWindowToWorkspace(windowElement);
                }
            }
        });
        
        // 交换selectedWindows数组中的位置
        const temp = this.selectedWindows[index1];
        this.selectedWindows[index1] = this.selectedWindows[index2];
        this.selectedWindows[index2] = temp;
        
        // 清空所有布局单元格
        this.layoutCells.forEach(cell => {
            cell.innerHTML = '';
            cell.classList.remove('selected');
        });
        
        // 重新渲染布局
        this.selectedWindows.forEach((windowId, index) => {
            if (windowId && this.layoutCells[index]) {
                this.renderSelectedWindow(this.layoutCells[index], windowId);
            }
        });
        
        // 触发状态栏更新回调
        if (this.onStatusBarUpdate) {
            this.onStatusBarUpdate();
        }
        
        // 保存布局状态
        this.saveLayoutState();
    }
    
    // 将窗口重置到workspace的辅助方法
    resetWindowToWorkspace(windowElement) {
        // 重置窗口样式
        windowElement.style.display = 'none';
        windowElement.style.position = 'relative';
        windowElement.style.width = 'auto';
        windowElement.style.height = 'auto';
        windowElement.style.left = 'auto';
        windowElement.style.top = 'auto';
        windowElement.style.zIndex = 'auto';
        
        // 移回workspace
        this.workspace.appendChild(windowElement);
    }
    
    // 显示布局选择器
    showLayoutSelector() {
        console.log('显示布局选择器，当前状态:', {
            isInLayoutMode: this.isInLayoutMode,
            selectedWindows: this.selectedWindows,
            layoutCells: this.layoutCells.length
        });
        
        // 显示布局选择器
        this.layoutSelector.style.display = 'block';
        this.layoutContainer.style.display = 'none';
        
        // 重置所有窗口状态
        this.resetAllWindowsToWorkspace();
        
        // 重置布局模式状态
        this.isInLayoutMode = false;
        this.selectedWindows = [];
        this.layoutCells = [];
        this.currentLayoutType = null;
        this.fullscreenWindow = null;
        this.fullscreenSource = null;
        
        console.log('布局选择器已显示，状态已重置');
        
        // 清除保存的布局状态（因为用户回到了选择器状态）
        this.clearLayoutState();
    }
    
    // 隐藏布局选择器和容器
    hideLayoutElements() {
        this.layoutSelector.style.display = 'none';
        this.layoutContainer.style.display = 'none';
    }
    
    // 显示布局容器
    showLayoutContainer() {
        this.layoutContainer.style.display = 'grid';
    }
    
    // 获取窗口在布局中的位置索引
    getWindowIndex(windowId) {
        return this.selectedWindows.findIndex(id => id === windowId);
    }
    
    // 获取其他窗口信息（用于交换下拉菜单）
    getOtherWindows(currentWindowId) {
        const currentIndex = this.getWindowIndex(currentWindowId);
        if (currentIndex === -1) return [];
        
        const isDualLayout = this.currentLayoutType && this.currentLayoutType.startsWith('dual-');
        
        if (isDualLayout) {
            // 双窗口布局：显示当前布局中的另一个窗口 + 未显示的第三个窗口
            const otherWindowsInLayout = this.selectedWindows
                .map((windowId, index) => ({ windowId, index }))
                .filter(({ windowId, index }) => windowId && windowId !== currentWindowId)
                .map(({ windowId, index }) => {
                    const windowInfo = this.windowTypes.find(w => w.id === windowId);
                    return { ...windowInfo, index, isInLayout: true };
                });
            
            // 找到未显示的第三个窗口
            const hiddenWindows = this.windowTypes
                .filter(windowInfo => !this.selectedWindows.includes(windowInfo.id))
                .map(windowInfo => ({ ...windowInfo, index: -1, isInLayout: false }));
            
            return [...otherWindowsInLayout, ...hiddenWindows];
        } else {
            // 三窗口布局：只显示布局中的其他窗口
            return this.selectedWindows
                .map((windowId, index) => ({ windowId, index }))
                .filter(({ windowId, index }) => windowId && windowId !== currentWindowId)
                .map(({ windowId, index }) => {
                    const windowInfo = this.windowTypes.find(w => w.id === windowId);
                    return { ...windowInfo, index, isInLayout: true };
                });
        }
    }
    
    // 窗口管理方法
    // 根据窗口类型获取窗口元素
    getWindowByType(windowType) {
        switch (windowType) {
            case '3D仿真':
            case 'simulation':
                return document.querySelector('.simulation-window');
            case '电气拓扑':
            case 'electrical':
                return document.querySelector('.electrical-window');
            case '动作编辑':
            case 'action':
                return document.querySelector('.action-window');
            default:
                return null;
        }
    }
    
    // 全屏显示窗口
    enterFullscreen(windowElement, source = 'layout') {
        console.log('进入全屏模式:', windowElement.className, 'source:', source);
        
        // 如果已经有其他窗口全屏，先最小化它
        if (this.fullscreenWindow && this.fullscreenWindow !== windowElement) {
            this.minimizeWindow(this.fullscreenWindow);
        }
        
        this.fullscreenWindow = windowElement;
        this.fullscreenSource = source;
        
        // 隐藏布局选择器和布局网格
        this.hideLayoutElements();
        
        // 将窗口移动到工作区并全屏显示
        this.workspace.appendChild(windowElement);
        
        windowElement.style.position = 'absolute';
        windowElement.style.top = '0';
        windowElement.style.left = '0';
        windowElement.style.width = '100%';
        windowElement.style.height = '100%';
        windowElement.style.zIndex = '1000';
        windowElement.style.display = 'flex';
        
        // 更新回调
        if (this.onUpdateAllWindowControls) {
            this.onUpdateAllWindowControls();
        }
        if (this.onStatusBarUpdate) {
            this.onStatusBarUpdate();
        }
        
        // 保存布局状态
        this.saveLayoutState();
    }
    
    // 最小化窗口
    minimizeWindow(windowElement) {
        console.log('最小化窗口:', windowElement.className, 'isFullscreen:', this.fullscreenWindow === windowElement, 'source:', this.fullscreenSource);
        
        // 如果是全屏窗口，需要特殊处理
        if (this.fullscreenWindow === windowElement) {
            const source = this.fullscreenSource;
            this.fullscreenWindow = null;
            this.fullscreenSource = null;
            
            // 重置窗口样式
            windowElement.style.position = 'relative';
            windowElement.style.top = 'auto';
            windowElement.style.left = 'auto';
            windowElement.style.width = 'auto';
            windowElement.style.height = 'auto';
            windowElement.style.zIndex = 'auto';
            
            // 根据全屏的来源决定返回的状态
            if (source === 'layout') {
                // 如果是从布局模式进入全屏，返回到布局选择器
                console.log('从布局模式全屏，返回到布局选择器');
                this.showLayoutSelector();
            } else if (source === 'statusbar') {
                // 如果是从状态栏直接全屏，则返回到布局选择器
                console.log('从状态栏直接全屏，返回到布局选择器');
                this.showLayoutSelector();
            }
        } else {
            // 如果不是全屏窗口，只是简单隐藏
            windowElement.style.display = 'none';
        }
        
        // 更新回调
        if (this.onUpdateAllWindowControls) {
            this.onUpdateAllWindowControls();
        }
        if (this.onStatusBarUpdate) {
            this.onStatusBarUpdate();
        }
        
        // 保存布局状态
        this.saveLayoutState();
    }
    
    // 处理状态栏窗口管理按钮点击
    handleWindowItemClick(windowType) {
        console.log('状态栏窗口管理点击:', windowType);
        
        const targetWindow = this.getWindowByType(windowType);
        if (!targetWindow) {
            console.warn('找不到目标窗口:', windowType);
            return;
        }
        
        // 检查目标窗口当前状态
        const isTargetVisible = targetWindow.style.display !== 'none';
        const isTargetFullscreen = this.fullscreenWindow === targetWindow;
        
        console.log('窗口状态:', {
            visible: isTargetVisible,
            fullscreen: isTargetFullscreen,
            hasOtherFullscreen: this.fullscreenWindow && this.fullscreenWindow !== targetWindow
        });
        
        if (isTargetFullscreen) {
            // 如果目标窗口当前全屏，则最小化它
            this.minimizeWindow(targetWindow);
        } else if (isTargetVisible && this.fullscreenWindow && this.fullscreenWindow !== targetWindow) {
            // 如果目标窗口可见但有其他窗口全屏，先最小化其他窗口，然后全屏目标窗口
            this.minimizeWindow(this.fullscreenWindow);
            setTimeout(() => this.enterFullscreen(targetWindow, 'statusbar'), 100); // 来自状态栏
        } else if (isTargetVisible) {
            // 如果目标窗口可见且没有其他窗口全屏，则全屏目标窗口
            this.enterFullscreen(targetWindow, 'statusbar'); // 来自状态栏
        } else {
            // 如果目标窗口不可见，则显示并全屏它
            targetWindow.style.display = 'flex';
            this.enterFullscreen(targetWindow, 'statusbar'); // 来自状态栏
        }
    }
    
    // 处理窗口控制按钮点击
    handleWindowControlClick(windowElement) {
        if (this.fullscreenWindow === windowElement) {
            // 当前窗口全屏，点击最小化
            this.minimizeWindow(windowElement);
        } else {
            // 非全屏窗口，点击进入全屏（从布局中的窗口控制按钮）
            this.enterFullscreen(windowElement, 'layout'); // 来自布局
        }
    }
    
    // 获取当前状态
    getState() {
        return {
            isInLayoutMode: this.isInLayoutMode,
            selectedWindows: [...this.selectedWindows],
            layoutCells: this.layoutCells,
            fullscreenWindow: this.fullscreenWindow,
            currentLayoutType: this.currentLayoutType
        };
    }
}

// 导出布局管理器
window.LayoutManager = LayoutManager; 