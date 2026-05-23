/**
 * 属性面板动态加载管理器
 */
class PanelLoader {
    constructor() {
        this.isLoaded = false;
        this.panelContainer = null;
        this.activeTab = 'structure'; // 默认激活的tab
    }

    /**
     * 初始化面板加载器
     */
    init() {
        this.panelContainer = document.querySelector('.right-panel');
        if (!this.panelContainer) {
            console.warn('未找到右侧面板容器');
            return;
        }

        // 绑定tab点击事件
        this.bindTabEvents();
        
        // 首次加载内容
        this.loadPanelContent();
    }

    /**
     * 动态加载面板内容
     */
    async loadPanelContent() {
        if (this.isLoaded) {
            return;
        }

        try {
            // 异步加载HTML内容
            const response = await fetch('panel-tabs-content.html');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const htmlContent = await response.text();
            
            // 查找内容容器位置
            const tabsContainer = this.panelContainer.querySelector('.panel-tabs');
            if (!tabsContainer) {
                console.warn('未找到tab栏容器');
                return;
            }

            // 插入内容
            tabsContainer.insertAdjacentHTML('afterend', htmlContent);
            
            // 激活默认tab
            this.activateTab(this.activeTab);
            
            // 绑定内容区域的事件
            this.bindContentEvents();
            
            this.isLoaded = true;
            console.log('属性面板内容加载完成');
            
        } catch (error) {
            console.error('加载属性面板内容失败:', error);
            this.showErrorMessage();
        }
    }

    /**
     * 绑定Tab切换事件
     */
    bindTabEvents() {
        const tabs = this.panelContainer.querySelectorAll('.panel-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabType = e.currentTarget.dataset.tab;
                if (tabType) {
                    this.activateTab(tabType);
                }
            });
        });
    }

    /**
     * 激活指定的tab
     */
    activateTab(tabType) {
        if (!this.isLoaded) {
            this.activeTab = tabType;
            return;
        }

        // 移除所有tab的激活状态
        const tabs = this.panelContainer.querySelectorAll('.panel-tab');
        tabs.forEach(tab => {
            tab.classList.remove('active');
        });

        // 隐藏所有内容
        const contents = this.panelContainer.querySelectorAll('.panel-tab-content');
        contents.forEach(content => {
            content.classList.remove('active');
        });

        // 激活指定tab
        const activeTab = this.panelContainer.querySelector(`[data-tab="${tabType}"]`);
        const activeContent = this.panelContainer.querySelector(`[data-content="${tabType}"]`);

        if (activeTab) {
            activeTab.classList.add('active');
        }
        
        if (activeContent) {
            activeContent.classList.add('active');
        }

        this.activeTab = tabType;
    }

    /**
     * 绑定内容区域的交互事件
     */
    bindContentEvents() {
        // 绑定树形结构的折叠/展开事件
        this.bindTreeToggleEvents();
        
        // 绑定操作按钮事件
        this.bindActionButtonEvents();
        
        // 绑定面板折叠事件
        this.bindPanelToggleEvents();

        // 绑定新组件的交互事件
        this.bindComponentEvents();
    }

    /**
     * 绑定树形结构折叠/展开事件
     */
    bindTreeToggleEvents() {
        const treeToggles = this.panelContainer.querySelectorAll('.tree-toggle');
        treeToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const item = e.currentTarget.closest('.collection-item');
                if (item && item.classList.contains('group')) {
                    this.toggleTreeNode(item);
                }
            });
        });

        // 设置集合项的选择功能
        const collectionItems = this.panelContainer.querySelectorAll('.collection-item');
        collectionItems.forEach(item => {
            item.addEventListener('click', (e) => {
                // 如果点击的是toggle或操作按钮，则不执行选择逻辑
                if (e.target.closest('.tree-toggle') || e.target.closest('.item-actions')) {
                    return;
                }
                
                // 移除所有选中状态
                collectionItems.forEach(i => i.classList.remove('selected'));
                
                // 添加选中状态
                item.classList.add('selected');
            });
        });
    }

    /**
     * 切换树形节点的展开/折叠状态
     */
    toggleTreeNode(groupItem) {
        const level = parseInt(groupItem.dataset.level);
        const toggleIcon = groupItem.querySelector('.tree-toggle i');
        
        // 通过图标状态判断当前是否展开
        const isExpanded = toggleIcon && toggleIcon.classList.contains('bi-chevron-down');
        
        if (isExpanded) {
            // 当前是展开状态，要折叠
            if (toggleIcon) {
                toggleIcon.classList.remove('bi-chevron-down');
                toggleIcon.classList.add('bi-chevron-right');
            }
            
            // 隐藏所有子节点
            let nextItem = groupItem.nextElementSibling;
            while (nextItem && parseInt(nextItem.dataset.level) > level) {
                nextItem.classList.add('collapsed');
                
                // 如果子节点也是分组，将其图标改为折叠状态
                if (nextItem.classList.contains('group')) {
                    const childIcon = nextItem.querySelector('.tree-toggle i');
                    if (childIcon && childIcon.classList.contains('bi-chevron-down')) {
                        childIcon.classList.remove('bi-chevron-down');
                        childIcon.classList.add('bi-chevron-right');
                    }
                }
                nextItem = nextItem.nextElementSibling;
            }
        } else {
            // 当前是折叠状态，要展开
            if (toggleIcon) {
                toggleIcon.classList.remove('bi-chevron-right');
                toggleIcon.classList.add('bi-chevron-down');
            }
            
            // 只显示直接子节点
            let nextItem = groupItem.nextElementSibling;
            while (nextItem && parseInt(nextItem.dataset.level) > level) {
                // 只显示直接子节点（父级+1层级）
                if (parseInt(nextItem.dataset.level) === level + 1) {
                    nextItem.classList.remove('collapsed');
                }
                nextItem = nextItem.nextElementSibling;
            }
        }
    }

    /**
     * 绑定操作按钮事件
     */
    bindActionButtonEvents() {
        // 定位按钮
        const locateButtons = this.panelContainer.querySelectorAll('.locate-btn');
        locateButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const itemName = e.currentTarget.closest('.collection-item').querySelector('.item-name').textContent;
                console.log('定位到:', itemName);
                // 这里可以添加定位逻辑
            });
        });

        // 可见性切换按钮
        const visibilityButtons = this.panelContainer.querySelectorAll('.visibility-btn');
        visibilityButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isVisible = btn.dataset.visible === 'true';
                const icon = btn.querySelector('i');
                
                if (isVisible) {
                    btn.dataset.visible = 'false';
                    icon.className = 'bi bi-eye-slash-fill';
                } else {
                    btn.dataset.visible = 'true';
                    icon.className = 'bi bi-eye-fill';
                }

                const itemName = e.currentTarget.closest('.collection-item').querySelector('.item-name').textContent;
                console.log('切换可见性:', itemName, '可见:', !isVisible);
            });
        });

        // 编辑按钮
        const editButtons = this.panelContainer.querySelectorAll('.edit-btn');
        editButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const itemName = e.currentTarget.closest('.collection-item').querySelector('.item-name').textContent;
                console.log('编辑:', itemName);
                // 这里可以添加编辑逻辑
            });
        });
    }

    /**
     * 绑定面板折叠事件
     */
    bindPanelToggleEvents() {
        // 绑定panel-header点击事件，让整个标题栏都可以触发展开/收起
        const panelHeaders = this.panelContainer.querySelectorAll('.panel-header');
        panelHeaders.forEach(header => {
            header.addEventListener('click', (e) => {
                e.stopPropagation();
                this.togglePanelSection(header.closest('.panel-section'));
            });
            
            // 添加鼠标悬停效果，提示可以点击
            header.style.cursor = 'pointer';
        });
        
        // 保留原有的panel-toggle按钮绑定（防止有些地方直接调用）
        const panelToggles = this.panelContainer.querySelectorAll('.panel-toggle');
        panelToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.togglePanelSection(e.currentTarget.closest('.panel-section'));
            });
        });
    }

    /**
     * 切换面板区域的展开/收起状态
     */
    togglePanelSection(section) {
        if (!section) return;
        
        const content = section.querySelector('.panel-content');
        const toggleBtn = section.querySelector('.panel-toggle');
        const icon = toggleBtn ? toggleBtn.querySelector('i') : null;
        
        if (!content) return;
        
        if (content.style.display === 'none') {
            // 当前是收起状态，要展开
            content.style.display = 'block';
            if (icon) {
                icon.style.transform = 'rotate(0deg)';
            }
        } else {
            // 当前是展开状态，要收起
            content.style.display = 'none';
            if (icon) {
                icon.style.transform = 'rotate(-90deg)';
            }
        }
    }

    /**
     * 显示错误消息
     */
    showErrorMessage() {
        const errorHtml = `
            <div class="panel-content-wrapper">
                <div class="panel-error">
                    <div style="padding: 20px; text-align: center; color: #f44336;">
                        <i class="bi bi-exclamation-triangle" style="font-size: 24px; margin-bottom: 8px;"></i>
                        <div>加载面板内容失败</div>
                        <div style="font-size: 10px; margin-top: 4px; color: #888;">
                            请检查 panel-tabs-content.html 文件是否存在
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const tabsContainer = this.panelContainer.querySelector('.panel-tabs');
        if (tabsContainer) {
            tabsContainer.insertAdjacentHTML('afterend', errorHtml);
        }
    }

    /**
     * 绑定新组件的交互事件
     */
    bindComponentEvents() {
        // 绑定滑块事件
        this.bindSliderEvents();
        
        // 绑定状态按钮事件
        this.bindButtonEvents();
        
        // 绑定上传区域事件
        this.bindUploadEvents();
        
        // 绑定复选框事件
        this.bindCheckboxEvents();
    }

    /**
     * 绑定滑块控制事件
     */
    bindSliderEvents() {
        const sliders = this.panelContainer.querySelectorAll('.panel-custom-slider');
        sliders.forEach(slider => {
            slider.addEventListener('input', (e) => {
                // 查找同一个滑块控制组内的数值输入框
                const sliderControl = e.target.closest('.panel-slider-control');
                const valueInput = sliderControl ? sliderControl.querySelector('.panel-slider-value') : null;
                
                if (valueInput) {
                    valueInput.value = parseFloat(e.target.value).toFixed(3);
                }
                console.log(`滑块值更新: ${e.target.value}`);
            });
        });

        // 绑定数值输入框事件，让用户编辑时同步更新滑块
        const valueInputs = this.panelContainer.querySelectorAll('.panel-slider-value');
        valueInputs.forEach(valueInput => {
            valueInput.addEventListener('input', (e) => {
                // 查找同一个滑块控制组内的滑块元素
                const sliderControl = e.target.closest('.panel-slider-control');
                const slider = sliderControl ? sliderControl.querySelector('.panel-custom-slider') : null;
                
                if (slider) {
                    const value = parseFloat(e.target.value);
                    const min = parseFloat(slider.min);
                    const max = parseFloat(slider.max);
                    
                    if (!isNaN(value)) {
                        // 如果值在范围内，直接更新滑块
                        if (value >= min && value <= max) {
                            slider.value = value;
                            console.log(`数值输入更新滑块: ${value}`);
                        } else {
                            // 如果值超出范围，限制在范围内并更新输入框
                            const clampedValue = Math.max(min, Math.min(max, value));
                            slider.value = clampedValue;
                            e.target.value = clampedValue.toFixed(3);
                            console.log(`数值输入超出范围，已调整为: ${clampedValue}`);
                        }
                    }
                }
            });

            // 处理失焦事件，格式化数值显示
            valueInput.addEventListener('blur', (e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value)) {
                    e.target.value = value.toFixed(3);
                }
            });

            // 处理回车键确认
            valueInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.target.blur(); // 触发blur事件进行格式化
                }
            });
        });
    }

    /**
     * 绑定状态按钮事件
     */
    bindButtonEvents() {
        // 状态按钮
        const statusButtons = this.panelContainer.querySelectorAll('.panel-status-btn');
        statusButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // 清除同组其他按钮的激活状态
                const group = e.target.closest('.panel-button-group');
                if (group) {
                    group.querySelectorAll('.panel-status-btn').forEach(b => b.classList.remove('active'));
                }
                e.target.classList.add('active');
                console.log(`状态按钮点击: ${e.target.textContent}`);
            });
        });

        // 操作按钮
        const actionButtons = this.panelContainer.querySelectorAll('.panel-primary-btn, .panel-secondary-btn, .panel-secondary-btn-outline, .panel-action-btn-large, .panel-action-btn-icon');
        actionButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                console.log(`操作按钮点击: ${e.target.textContent || e.target.title}`);
            });
        });
    }

    /**
     * 绑定上传区域事件
     */
    bindUploadEvents() {
        const uploadZones = this.panelContainer.querySelectorAll('.upload-zone');
        uploadZones.forEach(zone => {
            zone.addEventListener('click', (e) => {
                console.log('上传区域点击');
                // 这里可以触发文件选择对话框
            });

            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                zone.classList.add('dragover');
                zone.style.borderColor = 'transparent';
                zone.style.backgroundColor = '#3a2b2b';
            });

            zone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                zone.classList.remove('dragover');
                zone.style.borderColor = 'transparent';
                zone.style.backgroundColor = '#2b2b2b';
            });

            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                zone.classList.remove('dragover');
                zone.style.borderColor = 'transparent';
                zone.style.backgroundColor = '#2b2b2b';
                console.log('文件拖拽上传');
            });
        });
    }

    /**
     * 绑定复选框事件
     */
    bindCheckboxEvents() {
        const checkboxes = this.panelContainer.querySelectorAll('.custom-checkbox input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const label = e.target.closest('.custom-checkbox').querySelector('.checkbox-label');
                const labelText = label ? label.textContent : '未知选项';
                console.log(`复选框${labelText}:`, e.target.checked ? '选中' : '取消选中');
            });
        });

        // 绑定各种按钮点击事件
        const actionButtons = this.panelContainer.querySelectorAll('.secondary-btn, .action-btn-large, .primary-btn, .secondary-btn-outline');
        actionButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                console.log('按钮点击:', e.target.textContent);
            });
        });
    }

    /**
     * 重新加载面板内容
     */
    reload() {
        // 清除已加载的内容
        const existingContent = this.panelContainer.querySelector('.panel-content-wrapper');
        if (existingContent) {
            existingContent.remove();
        }

        this.isLoaded = false;
        this.loadPanelContent();
    }
}

// 创建全局实例
window.panelLoader = new PanelLoader();

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 延迟初始化，确保其他脚本已加载
    setTimeout(() => {
        window.panelLoader.init();
    }, 100);
}); 
