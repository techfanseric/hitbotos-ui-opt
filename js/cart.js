// Storefront-compatible cart for HitbotOS.
(function () {
    'use strict';

    const STORAGE_KEY = 'hitbot-cart-v2';
    const AUTO_SYNC_STORAGE_KEY = 'hitbot-cart-auto-sync-v1';
    const CART_UPDATED_EVENT = 'hitbot-cart-updated';
    const DEFAULT_ENTERPRISE = {
        enterpriseId: 'ENT-HITBOT-CUSTOMER',
        companyName: '深圳智造装备有限公司'
    };
    const DEFAULT_WEB_PROJECT = {
        projectId: 'web-catalog',
        projectName: '官网商品选购',
        source: 'web',
        items: []
    };

    const PRODUCT_CATALOG = {
        'p-001': {
            id: 'p-001',
            model: 'Z-EMG-4',
            name: '电动夹爪 EMG-4',
            partClass: 'standard',
            priceCents: 280000,
            currency: 'CNY',
            stock: 'in-stock',
            sourceLabel: '商城标准件'
        },
        'p-002': {
            id: 'p-002',
            model: 'Z-EFG-8S',
            name: '平行电爪 EFG-8S',
            partClass: 'standard',
            priceCents: 320000,
            currency: 'CNY',
            stock: 'in-stock',
            sourceLabel: '商城标准件'
        },
        'p-003': {
            id: 'p-003',
            model: 'Z-EFG-20',
            name: '平行电爪 EFG-20',
            partClass: 'standard',
            priceCents: 450000,
            currency: 'CNY',
            stock: 'out-of-stock',
            sourceLabel: '商城标准件'
        },
        'p-004': {
            id: 'p-004',
            model: 'Z-Arm S622',
            name: '协作机械臂 S622',
            partClass: 'standard',
            priceCents: 1800000,
            currency: 'CNY',
            stock: 'in-stock',
            sourceLabel: '商城标准件'
        },
        'p-005': {
            id: 'p-005',
            model: 'Z-Arm 2442',
            name: '轻量机械臂 2442',
            partClass: 'standard',
            priceCents: 1200000,
            currency: 'CNY',
            stock: 'in-stock',
            sourceLabel: '商城标准件'
        },
        'p-006': {
            id: 'p-006',
            model: 'Z-Arm H1500',
            name: '六轴协作臂 H1500',
            partClass: 'standard',
            priceCents: 8500000,
            currency: 'CNY',
            stock: 'preorder',
            sourceLabel: '商城标准件'
        },
        'p-007': {
            id: 'p-007',
            model: 'Z-Hand 6',
            name: '灵巧手 6 自由度',
            partClass: 'standard',
            priceCents: 9800000,
            currency: 'CNY',
            stock: 'in-stock',
            sourceLabel: '商城标准件'
        },
        'p-008': {
            id: 'p-008',
            model: 'Z-Mod-SE-54',
            name: '智能电缸 SE-54',
            partClass: 'standard',
            priceCents: 580000,
            currency: 'CNY',
            stock: 'in-stock',
            sourceLabel: '商城标准件'
        },
        'p-009': {
            id: 'p-009',
            model: 'Bottle_Cap_1',
            name: '瓶盖（参考件）',
            partClass: 'reference',
            priceCents: 0,
            currency: 'CNY',
            stock: 'in-stock',
            sourceLabel: 'OS 参考件'
        },
        'p-010': {
            id: 'p-010',
            model: 'Custom-Frame-A1',
            name: '定制型材套件 A1',
            partClass: 'custom',
            priceCents: 0,
            currency: 'CNY',
            stock: 'in-stock',
            sourceLabel: '定制询价件'
        }
    };

    const DEVICE_PRODUCT_MAP = {
        '抓取设备|Z-EMG-4': 'p-001',
        '抓取设备|Z-EFG-8S': 'p-002',
        '抓取设备|Z-EFG-20': 'p-003',
        '抓取设备|Z-EFG-20S': 'p-003',
        '四轴机器臂|Z-Arm S622': 'p-004',
        '四轴机器臂|Z-Arm 2442': 'p-005',
        '六轴机器臂|Z-Arm H1500': 'p-006',
        '灵巧手|Z-Hand 6': 'p-007',
        '智能电缸|Z-Mod-SE-54': 'p-008'
    };

    let toastTimer = null;
    let autoSyncObserver = null;
    let autoSyncTimer = null;
    let pendingSyncReview = null;
    let pendingRemoveProductId = null;

    function now() {
        return Date.now();
    }

    function projectEnterpriseId(project) {
        return project?.enterpriseId || DEFAULT_ENTERPRISE.enterpriseId;
    }

    function getCurrentProjectMeta() {
        const projectName = document.querySelector('.project-name')?.textContent?.trim() || 'OS 项目';
        const normalized = projectName
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^\w\u4e00-\u9fa5-]/g, '')
            .slice(0, 28);

        return {
            projectId: `os-${normalized || 'project'}`,
            projectName
        };
    }

    function normalizeStoredState(rawState) {
        const state = rawState && typeof rawState === 'object' ? rawState : {};
        const enterpriseId = state.enterpriseId || DEFAULT_ENTERPRISE.enterpriseId;
        const companyName = state.companyName || DEFAULT_ENTERPRISE.companyName;
        const legacyProject = {
            ...DEFAULT_WEB_PROJECT,
            enterpriseId,
            companyName,
            projectId: state.projectId || DEFAULT_WEB_PROJECT.projectId,
            projectName: state.projectName || DEFAULT_WEB_PROJECT.projectName,
            items: Array.isArray(state.items) ? state.items : [],
            updatedAt: now()
        };
        const projects = Array.isArray(state.projects) && state.projects.length
            ? state.projects.map((project) => ({
                ...project,
                enterpriseId: project.enterpriseId || enterpriseId,
                companyName: project.companyName || companyName,
                items: Array.isArray(project.items) ? project.items : [],
                updatedAt: project.updatedAt || now()
            }))
            : [legacyProject];
        const currentProjectId = state.currentProjectId || legacyProject.projectId;
        const activeProject = projects.find(
            (project) => project.projectId === currentProjectId && projectEnterpriseId(project) === enterpriseId
        ) || projects.find((project) => projectEnterpriseId(project) === enterpriseId) || projects[0] || legacyProject;

        return {
            ...state,
            enterpriseId,
            companyName,
            currentProjectId: activeProject.projectId,
            projects,
            projectId: activeProject.projectId,
            projectName: activeProject.projectName,
            items: activeProject.items
        };
    }

    function readCartEnvelope() {
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                return {
                    state: normalizeStoredState(null),
                    version: 0
                };
            }

            const parsed = JSON.parse(raw);
            const state = parsed && typeof parsed === 'object' && parsed.state
                ? parsed.state
                : parsed;

            return {
                state: normalizeStoredState(state),
                version: parsed?.version || 0
            };
        } catch (error) {
            console.warn('读取购物车失败，已使用默认购物车。', error);
            return {
                state: normalizeStoredState(null),
                version: 0
            };
        }
    }

    function writeCartEnvelope(state, version) {
        const envelope = {
            state,
            version: version || 0
        };

        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
        window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT, { detail: { state } }));
    }

    function getProduct(productId) {
        return PRODUCT_CATALOG[productId] || null;
    }

    function getProductForDevice(categoryName, device) {
        if (!device) return null;

        const explicitProduct = device.productId ? getProduct(device.productId) : null;
        if (explicitProduct) return explicitProduct;

        const key = `${categoryName}|${device.name || device.id}`;
        return getProduct(DEVICE_PRODUCT_MAP[key]) || null;
    }

    function normalizedName(value) {
        return String(value || '')
            .toLowerCase()
            .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '');
    }

    function getProductByUsedName(name) {
        const normalized = normalizedName(name);
        if (!normalized) return null;

        return Object.values(PRODUCT_CATALOG).find((product) => {
            const model = normalizedName(product.model);
            return model && normalized.includes(model);
        }) || null;
    }

    function productIsSellable(product) {
        return product.partClass === 'standard' && product.priceCents > 0 && product.stock !== 'out-of-stock';
    }

    function productNeedsQuote(product) {
        return product.partClass === 'custom' || (!productIsSellable(product) && product.partClass !== 'reference');
    }

    function canAddProduct(product) {
        return Boolean(product) && product.stock !== 'out-of-stock' && product.partClass !== 'reference';
    }

    function createCartItem(product, qty) {
        const sellable = productIsSellable(product);
        const quoteRequired = productNeedsQuote(product);

        return {
            productId: product.id,
            partClass: product.partClass,
            qty,
            source: 'os',
            selected: product.partClass !== 'reference',
            sellable,
            quoteRequired,
            syncStatus: 'pending',
            addedAt: now()
        };
    }

    function syncActiveFields(state, activeProject) {
        return {
            ...state,
            currentProjectId: activeProject.projectId,
            projectId: activeProject.projectId,
            projectName: activeProject.projectName,
            items: activeProject.items
        };
    }

    function updateCurrentProject(updater) {
        const envelope = readCartEnvelope();
        const state = envelope.state;
        const meta = getCurrentProjectMeta();
        const enterpriseId = state.enterpriseId || DEFAULT_ENTERPRISE.enterpriseId;
        const companyName = state.companyName || DEFAULT_ENTERPRISE.companyName;
        const projects = Array.isArray(state.projects) ? state.projects : [];
        const existingProject = projects.find(
            (project) => project.projectId === meta.projectId && projectEnterpriseId(project) === enterpriseId
        );
        const baseProject = existingProject || {
            enterpriseId,
            companyName,
            projectId: meta.projectId,
            projectName: meta.projectName,
            source: 'os',
            items: [],
            updatedAt: now()
        };
        const updatedProject = {
            ...updater(baseProject),
            enterpriseId,
            companyName,
            projectName: meta.projectName,
            source: 'os',
            updatedAt: now()
        };
        const nextProjects = projects.some(
            (project) => project.projectId === updatedProject.projectId && projectEnterpriseId(project) === enterpriseId
        )
            ? projects.map((project) => (
                project.projectId === updatedProject.projectId && projectEnterpriseId(project) === enterpriseId
                    ? updatedProject
                    : project
            ))
            : [updatedProject, ...projects];
        const nextState = syncActiveFields({
            ...state,
            enterpriseId,
            companyName,
            projects: nextProjects
        }, updatedProject);

        writeCartEnvelope(nextState, envelope.version);
        return { state: nextState, project: updatedProject };
    }

    function addProduct(productId, options = {}) {
        const product = getProduct(productId);
        const qty = Math.max(1, Number(options.qty) || 1);

        if (!canAddProduct(product)) {
            const message = product?.stock === 'out-of-stock' ? `${product.model} 暂不可加入购物车` : '该物料暂不支持加入购物车';
            showToast(message, 'warn');
            return { ok: false, reason: 'unavailable', product };
        }

        const result = updateCurrentProject((project) => {
            const existing = project.items.find((item) => item.productId === product.id);
            const items = existing
                ? project.items.map((item) => item.productId === product.id
                    ? {
                        ...item,
                        qty: item.qty + qty,
                        selected: true,
                        source: 'os',
                        syncStatus: 'pending'
                    }
                    : item)
                : [...project.items, createCartItem(product, qty)];

            return {
                ...project,
                items
            };
        });

        renderCartUI(true);
        showToast(`${product.model} 已加入购物车`);
        return { ok: true, product, ...result };
    }

    function getUsedProductQty(productId) {
        const usage = collectUsedProductUsages().find((item) => item.productId === productId);
        return Math.max(0, Number(usage?.qty) || 0);
    }

    function removeProduct(productId, options = {}) {
        const product = getProduct(productId);
        const { state } = readCartEnvelope();
        const project = getActiveProject(state);
        const existing = (project.items || []).find((item) => item.productId === productId);

        if (!existing) {
            renderCartUI();
            return { ok: false, reason: 'missing', product };
        }

        const result = updateCurrentProject((currentProject) => ({
            ...currentProject,
            items: (currentProject.items || []).filter((item) => item.productId !== productId)
        }));

        if (pendingRemoveProductId === productId) {
            pendingRemoveProductId = null;
        }

        renderCartUI();
        if (!options.silent) {
            showToast(`${product?.model || '物料'} 已从购物车移除`);
        }
        return { ok: true, product, removedQty: existing.qty, ...result };
    }

    function requestRemoveProduct(productId) {
        if (getUsedProductQty(productId) > 0) {
            pendingRemoveProductId = productId;
            renderCartUI();
            return;
        }

        removeProduct(productId);
    }

    function confirmRemoveProduct(productId) {
        const product = getProduct(productId);
        const wasAutoSyncEnabled = isAutoSyncEnabled();
        const usedQty = getUsedProductQty(productId);
        const result = removeProduct(productId, { silent: true });

        if (!result.ok) return;

        if (usedQty > 0 && wasAutoSyncEnabled) {
            persistAutoSyncEnabled(false);
            stopAutoSync();
            renderCartUI();
            showToast(`${product?.model || '物料'} 已移除，自动同步已关闭`, 'warn');
            return;
        }

        showToast(`${product?.model || '物料'} 已从购物车移除`);
    }

    function syncUsedProducts(usages, options = {}) {
        const normalizedUsages = Array.isArray(usages)
            ? usages
                .map((usage) => {
                    const product = getProduct(usage.productId);
                    const qty = Math.max(1, Number(usage.qty) || 1);
                    return product && canAddProduct(product) ? { product, qty } : null;
                })
                .filter(Boolean)
            : [];

        if (!normalizedUsages.length) return { ok: false, added: 0 };

        let changedCount = 0;
        const result = updateCurrentProject((project) => {
            const nextItems = [...project.items];

            normalizedUsages.forEach(({ product, qty }) => {
                const existingIndex = nextItems.findIndex((item) => item.productId === product.id);
                if (existingIndex >= 0) {
                    const existing = nextItems[existingIndex];
                    const nextQty = Math.max(existing.qty, qty);
                    if (nextQty !== existing.qty || existing.syncStatus !== 'pending' || existing.source !== 'os') {
                        nextItems[existingIndex] = {
                            ...existing,
                            qty: nextQty,
                            selected: true,
                            source: 'os',
                            syncStatus: 'pending'
                        };
                        changedCount += 1;
                    }
                } else {
                    nextItems.push(createCartItem(product, qty));
                    changedCount += 1;
                }
            });

            return {
                ...project,
                items: nextItems
            };
        });

        const added = changedCount;

        if (added > 0) {
            renderCartUI(true);
            if (!options.silent) {
                showToast(`已同步 ${added} 种方案设备`);
            }
        }

        return { ok: added > 0, added, ...result };
    }

    function buildUsedProductSyncCandidates() {
        const usages = collectUsedProductUsages();
        if (!usages.length) return [];

        const { state } = readCartEnvelope();
        const project = getActiveProject(state);
        const cartQtyMap = new Map();

        (project.items || []).forEach((item) => {
            const qty = Math.max(0, Number(item.qty) || 0);
            cartQtyMap.set(item.productId, (cartQtyMap.get(item.productId) || 0) + qty);
        });

        return usages
            .map((usage) => {
                const product = getProduct(usage.productId);
                if (!canAddProduct(product)) return null;

                const usageQty = Math.max(1, Number(usage.qty) || 1);
                const cartQty = Math.max(0, cartQtyMap.get(product.id) || 0);
                if (cartQty >= usageQty) return null;

                return {
                    productId: product.id,
                    qty: usageQty,
                    cartQty,
                    syncQty: usageQty - cartQty,
                    product
                };
            })
            .filter(Boolean);
    }

    function createPendingSyncReview(candidates, selectedProductIds) {
        return {
            candidates,
            selectedProductIds: new Set(selectedProductIds || candidates.map((candidate) => candidate.productId))
        };
    }

    function refreshPendingSyncReview() {
        if (!pendingSyncReview) return null;

        const previousSelection = pendingSyncReview.selectedProductIds;
        const candidates = buildUsedProductSyncCandidates();
        if (!candidates.length) {
            pendingSyncReview = null;
            return null;
        }

        const selectedIds = candidates
            .filter((candidate) => previousSelection.has(candidate.productId))
            .map((candidate) => candidate.productId);

        pendingSyncReview = createPendingSyncReview(candidates, selectedIds.length ? selectedIds : undefined);
        return pendingSyncReview;
    }

    function persistAutoSyncEnabled(enabled) {
        try {
            window.localStorage.setItem(AUTO_SYNC_STORAGE_KEY, enabled ? 'true' : 'false');
        } catch (error) {
            console.warn('保存自动同步配置失败。', error);
        }
    }

    function isAutoSyncEnabled() {
        try {
            return window.localStorage.getItem(AUTO_SYNC_STORAGE_KEY) === 'true';
        } catch (error) {
            return false;
        }
    }

    function setAutoSyncEnabled(enabled) {
        if (enabled) {
            const candidates = buildUsedProductSyncCandidates();
            if (candidates.length) {
                pendingSyncReview = createPendingSyncReview(candidates);
                persistAutoSyncEnabled(false);
                stopAutoSync();
                renderCartUI();
                showToast(`发现 ${candidates.length} 种方案设备待同步`, 'warn');
                return;
            }

            completeAutoSyncEnable();
        } else {
            pendingSyncReview = null;
            persistAutoSyncEnabled(false);
            stopAutoSync();
            showToast('已关闭自动同步方案设备');
            renderCartUI();
        }
    }

    function completeAutoSyncEnable(added = 0) {
        pendingSyncReview = null;
        persistAutoSyncEnabled(true);
        startAutoSync();
        showToast(added > 0 ? `已同步 ${added} 种方案设备，并开启自动同步` : '已开启自动同步方案设备');
        renderCartUI(added > 0);
    }

    function resolvePendingSyncReview(candidates) {
        const selectedCandidates = Array.isArray(candidates) ? candidates : [];
        if (!selectedCandidates.length) {
            showToast('请先选择要同步的方案设备', 'warn');
            return;
        }

        pendingSyncReview = null;
        const result = syncUsedProducts(
            selectedCandidates.map((candidate) => ({
                productId: candidate.productId,
                qty: candidate.qty
            })),
            { silent: true }
        );
        const remainingCandidates = buildUsedProductSyncCandidates();

        if (remainingCandidates.length) {
            pendingSyncReview = createPendingSyncReview(remainingCandidates);
            persistAutoSyncEnabled(false);
            stopAutoSync();
            renderCartUI(result.added > 0);
            showToast(`已同步 ${result.added} 种，仍有 ${remainingCandidates.length} 种待处理`, 'warn');
            return;
        }

        completeAutoSyncEnable(result.added);
    }

    function cancelPendingSyncReview() {
        pendingSyncReview = null;
        persistAutoSyncEnabled(false);
        stopAutoSync();
        showToast('已取消自动同步');
        renderCartUI();
    }

    function collectUsedProductUsages() {
        const usageMap = new Map();
        const addUsage = (product, qty = 1) => {
            if (!product || !canAddProduct(product)) return;
            usageMap.set(product.id, (usageMap.get(product.id) || 0) + qty);
        };

        document.querySelectorAll('[data-scene-model-name]').forEach((element) => {
            addUsage(getProductByUsedName(element.dataset.sceneModelName));
        });

        document.querySelectorAll('.collection-item.leaf .item-name').forEach((element) => {
            addUsage(getProductByUsedName(element.textContent));
        });

        return Array.from(usageMap, ([productId, qty]) => ({ productId, qty }));
    }

    function scheduleAutoSync() {
        if (!isAutoSyncEnabled()) return;
        window.clearTimeout(autoSyncTimer);
        autoSyncTimer = window.setTimeout(() => {
            syncUsedProducts(collectUsedProductUsages(), { silent: true });
        }, 120);
    }

    function startAutoSync() {
        stopAutoSync();
        const targets = [
            document.querySelector('.scene-objects'),
            document.querySelector('.panel-content-wrapper'),
            document.querySelector('.electrical-window')
        ].filter(Boolean);

        if (targets.length) {
            autoSyncObserver = new MutationObserver(scheduleAutoSync);
            targets.forEach((target) => {
                autoSyncObserver.observe(target, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: ['data-scene-model-name', 'data-visible']
                });
            });
        }
    }

    function stopAutoSync() {
        if (autoSyncObserver) {
            autoSyncObserver.disconnect();
            autoSyncObserver = null;
        }

        window.clearTimeout(autoSyncTimer);
        autoSyncTimer = null;
    }

    function bindAutoSyncDrop() {
        if (document.documentElement.dataset.cartAutoDropBound === 'true') return;
        document.documentElement.dataset.cartAutoDropBound = 'true';

        document.addEventListener('drop', (event) => {
            if (!isAutoSyncEnabled()) return;

            const targetArea = event.target.closest('.viewport-3d, .simulation-window, .electrical-window');
            if (!targetArea) return;

            const productId = event.dataTransfer?.getData('productId');
            if (productId) {
                addProduct(productId);
            } else {
                scheduleAutoSync();
            }
        }, true);
    }

    function getActiveProject(state) {
        const projects = Array.isArray(state.projects) ? state.projects : [];
        const enterpriseId = state.enterpriseId || DEFAULT_ENTERPRISE.enterpriseId;
        const osProject = getCurrentProjectMeta();

        return projects.find(
            (project) => project.projectId === osProject.projectId && projectEnterpriseId(project) === enterpriseId
        ) || {
            enterpriseId,
            companyName: state.companyName || DEFAULT_ENTERPRISE.companyName,
            projectId: osProject.projectId,
            projectName: osProject.projectName,
            source: 'os',
            items: [],
            updatedAt: now()
        };
    }

    function formatPrice(cents, currency = 'CNY') {
        if (!Number.isFinite(cents) || cents <= 0) return '¥0';
        try {
            return new Intl.NumberFormat('zh-CN', {
                style: 'currency',
                currency,
                maximumFractionDigits: 0
            }).format(cents / 100);
        } catch (error) {
            return `¥${Math.round(cents / 100).toLocaleString('zh-CN')}`;
        }
    }

    function formatItemStatus(item, product) {
        if (item.sellable && product) return formatPrice(product.priceCents * item.qty, product.currency);
        if (item.quoteRequired) return '需询价';
        return '参考件';
    }

    function cartTotals(items) {
        return items.reduce((total, item) => {
            const product = getProduct(item.productId);
            return {
                count: total.count + item.qty,
                selectedCount: total.selectedCount + (item.selected ? item.qty : 0),
                subtotal: total.subtotal + (product && item.selected && item.sellable ? product.priceCents * item.qty : 0)
            };
        }, { count: 0, selectedCount: 0, subtotal: 0 });
    }

    function escapeHTML(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function buildCheckoutUrl(projectId) {
        const configured = window.HITBOT_STORE_CHECKOUT_URL || document.body?.dataset?.storeCheckoutUrl;
        const query = `from=os&project=${encodeURIComponent(projectId)}`;

        if (configured) {
            const url = new URL(configured, window.location.href);
            query.split('&').forEach((pair) => {
                const [key, value] = pair.split('=');
                url.searchParams.set(key, decodeURIComponent(value));
            });
            return url.toString();
        }

        const isLocal = window.location.protocol === 'file:'
            || ['localhost', '127.0.0.1', ''].includes(window.location.hostname);
        const base = isLocal ? 'http://localhost:3000/zh/checkout' : '/store/cart';
        return `${base}?${query}`;
    }

    function renderCartUI(animateBadge = false) {
        const root = document.querySelector('.cart-menu-dropdown');
        if (!root) return;

        const { state } = readCartEnvelope();
        const activeProject = getActiveProject(state);
        const items = Array.isArray(activeProject.items) ? activeProject.items : [];
        const totals = cartTotals(items);
        const autoSyncEnabled = isAutoSyncEnabled();
        const syncReview = refreshPendingSyncReview();
        const autoSyncChecked = autoSyncEnabled || Boolean(syncReview);
        const button = root.querySelector('.cart-menu-btn');
        const badge = root.querySelector('[data-cart-count]');
        const dropdown = root.querySelector('[data-cart-dropdown]');

        if (button) {
            button.setAttribute('aria-label', totals.count > 0 ? `购物车，${totals.count} 件物料` : '购物车');
        }

        if (badge) {
            badge.hidden = totals.count === 0;
            badge.textContent = totals.count > 99 ? '99+' : String(totals.count);
            if (animateBadge && totals.count > 0) {
                badge.classList.remove('bump');
                window.requestAnimationFrame(() => badge.classList.add('bump'));
            }
        }

        if (!dropdown) return;

        dropdown.innerHTML = createDropdownHTML(activeProject, items, totals, autoSyncChecked, syncReview);
    }

    function createDropdownHTML(project, items, totals, autoSyncChecked, syncReview) {
        const previewItems = items.slice(0, 3);
        const remainingCount = Math.max(0, items.length - previewItems.length);
        const syncReviewHTML = syncReview ? createSyncReviewHTML(syncReview) : '';
        const bodyHTML = items.length
            ? `
                <div class="cart-preview-list">
                    ${previewItems.map(createPreviewRowHTML).join('')}
                </div>
                ${remainingCount > 0 ? `<div class="cart-preview-more">还有 ${remainingCount} 行物料，去商城结算页查看</div>` : ''}
            `
            : `
                <div class="cart-empty-state">
                    <div class="cart-empty-title">购物车里还没有物料</div>
                    <div class="cart-empty-hint">从设备库添加标准件，或开启自动同步方案设备。</div>
                </div>
            `;

        return `
            <div class="cart-dropdown-header">
                <div class="cart-dropdown-title-row">
                    <span class="cart-dropdown-title">购物车</span>
                    <span class="cart-dropdown-count">${totals.count} 件</span>
                </div>
                <div class="cart-dropdown-meta-row">
                    <span class="cart-dropdown-project">项目名称：${escapeHTML(project.projectName || '当前项目')}</span>
                    <label class="cart-sync-option">
                        <input type="checkbox" data-cart-auto-sync ${autoSyncChecked ? 'checked' : ''}>
                        <span>自动同步方案设备</span>
                    </label>
                    <span class="cart-sync-help" tabindex="0" aria-label="自动同步说明" aria-describedby="cart-sync-tooltip">
                        <i class="bi bi-info-circle" aria-hidden="true"></i>
                        <span class="cart-sync-tooltip" id="cart-sync-tooltip" role="tooltip">开启后，在仿真或电气架构界面里使用的可采购设备会自动加入购物车；参考件不会同步。</span>
                    </span>
                </div>
            </div>
            <div class="cart-dropdown-divider"></div>
            ${syncReviewHTML}
            ${syncReviewHTML ? '<div class="cart-dropdown-divider"></div>' : ''}
            ${bodyHTML}
            <div class="cart-dropdown-divider"></div>
            <div class="cart-summary">
                <div class="cart-summary-row">
                    <span>已选物料</span>
                    <span class="cart-summary-value">${totals.selectedCount} 件</span>
                </div>
                <div class="cart-summary-row">
                    <span>标准件小计</span>
                    <span class="cart-summary-value">${formatPrice(totals.subtotal, 'CNY')}</span>
                </div>
            </div>
            <div class="cart-dropdown-divider"></div>
            <div class="cart-dropdown-actions">
                <button class="cart-dropdown-action primary" type="button" data-cart-action="checkout" ${items.length ? '' : 'disabled'}>
                    <span>去商城结算</span>
                    <i class="bi bi-arrow-right"></i>
                </button>
            </div>
        `;
    }

    function createSyncReviewHTML(syncReview) {
        const selectedCount = syncReview.candidates.filter((candidate) => (
            syncReview.selectedProductIds.has(candidate.productId)
        )).length;

        return `
            <div class="cart-sync-review" data-cart-sync-review>
                <div class="cart-sync-review-head">
                    <div>
                        <div class="cart-sync-review-title">方案设备待同步</div>
                        <div class="cart-sync-review-hint">这些设备已在仿真或电气架构界面里使用，购物车还未补齐。补齐后将开启自动同步。</div>
                    </div>
                    <span class="cart-sync-review-count">${syncReview.candidates.length} 种</span>
                </div>
                <div class="cart-sync-review-list">
                    ${syncReview.candidates.map((candidate) => createSyncReviewRowHTML(candidate, syncReview.selectedProductIds)).join('')}
                </div>
                <div class="cart-sync-review-actions">
                    <button class="cart-sync-review-action primary" type="button" data-cart-sync-action="sync-all">同步全部并开启</button>
                    <button class="cart-sync-review-action secondary" type="button" data-cart-sync-action="sync-selected" ${selectedCount ? '' : 'disabled'}>同步已选</button>
                    <button class="cart-sync-review-action ghost" type="button" data-cart-sync-action="cancel">取消</button>
                </div>
            </div>
        `;
    }

    function createSyncReviewRowHTML(candidate, selectedProductIds) {
        const checked = selectedProductIds.has(candidate.productId);
        const cartStateText = candidate.cartQty > 0 ? `购物车 x${candidate.cartQty}` : '未加入';

        return `
            <label class="cart-sync-review-row" data-cart-sync-product-id="${escapeHTML(candidate.productId)}">
                <input class="cart-sync-review-checkbox" type="checkbox" data-cart-sync-candidate="${escapeHTML(candidate.productId)}" ${checked ? 'checked' : ''}>
                <span class="cart-sync-review-main">
                    <span class="cart-sync-review-name">${escapeHTML(candidate.product.name)}</span>
                    <span class="cart-sync-review-meta">${escapeHTML(candidate.product.model)} · 方案 x${candidate.qty} · ${escapeHTML(cartStateText)}</span>
                </span>
                <span class="cart-sync-review-side">补齐至 x${candidate.qty}</span>
            </label>
        `;
    }

    function createPreviewRowHTML(item) {
        const product = getProduct(item.productId);
        const name = product ? product.name : item.productId;
        const model = product ? product.model : item.productId;
        const partLabel = item.quoteRequired ? '询价件' : item.sellable ? '标准件' : '参考件';
        const usedQty = getUsedProductQty(item.productId);
        const isConfirmingRemove = pendingRemoveProductId === item.productId && usedQty > 0;
        const confirmText = isAutoSyncEnabled()
            ? '该设备仍在方案中使用。移除后将关闭自动同步，确定移除？'
            : '该设备仍在方案中使用，确定从购物车移除？';

        return `
            <div class="cart-preview-row ${isConfirmingRemove ? 'is-confirming-remove' : ''}">
                <div class="cart-preview-main">
                    <div class="cart-preview-name">${escapeHTML(name)}</div>
                    <div class="cart-preview-meta">${escapeHTML(model)} · OS 同步 · ${partLabel}</div>
                </div>
                <div class="cart-preview-side">
                    <div class="cart-preview-qty">x${item.qty}</div>
                    <div class="cart-preview-price">${escapeHTML(formatItemStatus(item, product))}</div>
                </div>
                <button class="cart-preview-remove" type="button" data-cart-remove-product="${escapeHTML(item.productId)}" title="移除物料" aria-label="移除 ${escapeHTML(model)}">
                    <i class="bi bi-trash"></i>
                </button>
                ${isConfirmingRemove ? `
                    <div class="cart-remove-confirm">
                        <span>${escapeHTML(confirmText)}</span>
                        <div class="cart-remove-confirm-actions">
                            <button class="cart-remove-confirm-btn secondary" type="button" data-cart-remove-cancel="${escapeHTML(item.productId)}">取消</button>
                            <button class="cart-remove-confirm-btn danger" type="button" data-cart-remove-confirm="${escapeHTML(item.productId)}">移除</button>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    function showToast(message, tone = 'success') {
        let toast = document.querySelector('.hitbot-cart-toast');

        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'hitbot-cart-toast';
            document.body.appendChild(toast);
        }

        toast.innerHTML = `<i class="bi ${tone === 'warn' ? 'bi-info-circle' : 'bi-check-circle'}"></i><span>${escapeHTML(message)}</span>`;
        toast.classList.add('visible');

        if (toastTimer) {
            window.clearTimeout(toastTimer);
        }

        toastTimer = window.setTimeout(() => {
            toast.classList.remove('visible');
        }, 1800);
    }

    function bindCartDropdown() {
        const root = document.querySelector('.cart-menu-dropdown');
        if (!root || root.dataset.cartBound === 'true') return;

        root.dataset.cartBound = 'true';
        const button = root.querySelector('.cart-menu-btn');

        const closeOtherTopDropdowns = () => {
            document.querySelectorAll('.top-menu-dropdown.open').forEach((dropdown) => {
                if (dropdown === root) return;
                dropdown.classList.remove('open');
                dropdown.querySelector('[aria-expanded="true"]')?.setAttribute('aria-expanded', 'false');
            });
        };

        const setOpen = (open) => {
            root.classList.toggle('open', open);
            button?.setAttribute('aria-expanded', open ? 'true' : 'false');
            if (open) {
                closeOtherTopDropdowns();
                renderCartUI();
            }
        };

        button?.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            setOpen(!root.classList.contains('open'));
        });

        root.addEventListener('click', (event) => {
            const removeConfirmButton = event.target.closest('[data-cart-remove-confirm]');
            if (removeConfirmButton) {
                event.preventDefault();
                event.stopPropagation();
                confirmRemoveProduct(removeConfirmButton.dataset.cartRemoveConfirm);
                return;
            }

            const removeCancelButton = event.target.closest('[data-cart-remove-cancel]');
            if (removeCancelButton) {
                event.preventDefault();
                event.stopPropagation();
                pendingRemoveProductId = null;
                renderCartUI();
                return;
            }

            const removeButton = event.target.closest('[data-cart-remove-product]');
            if (removeButton) {
                event.preventDefault();
                event.stopPropagation();
                requestRemoveProduct(removeButton.dataset.cartRemoveProduct);
                return;
            }

            const syncAction = event.target.closest('[data-cart-sync-action]');
            if (syncAction) {
                const actionName = syncAction.dataset.cartSyncAction;
                const review = refreshPendingSyncReview();

                event.preventDefault();
                event.stopPropagation();

                if (!review) {
                    renderCartUI();
                    return;
                }

                if (actionName === 'cancel') {
                    cancelPendingSyncReview();
                    return;
                }

                if (actionName === 'sync-all') {
                    resolvePendingSyncReview(review.candidates);
                    return;
                }

                if (actionName === 'sync-selected') {
                    const selectedProductIds = new Set(
                        Array.from(root.querySelectorAll('[data-cart-sync-candidate]:checked'))
                            .map((input) => input.dataset.cartSyncCandidate)
                    );
                    resolvePendingSyncReview(
                        review.candidates.filter((candidate) => selectedProductIds.has(candidate.productId))
                    );
                }

                return;
            }

            const action = event.target.closest('[data-cart-action]');
            if (!action) return;

            const { state } = readCartEnvelope();
            const project = getActiveProject(state);
            const actionName = action.dataset.cartAction;

            event.preventDefault();
            event.stopPropagation();

            if (actionName === 'checkout' && project.items?.length) {
                window.location.href = buildCheckoutUrl(project.projectId);
            }
        });

        root.addEventListener('change', (event) => {
            const input = event.target.closest('[data-cart-auto-sync]');
            if (input) {
                setAutoSyncEnabled(input.checked);
                return;
            }

            const candidateInput = event.target.closest('[data-cart-sync-candidate]');
            if (!candidateInput || !pendingSyncReview) return;

            if (candidateInput.checked) {
                pendingSyncReview.selectedProductIds.add(candidateInput.dataset.cartSyncCandidate);
            } else {
                pendingSyncReview.selectedProductIds.delete(candidateInput.dataset.cartSyncCandidate);
            }

            const selectedButton = root.querySelector('[data-cart-sync-action="sync-selected"]');
            if (selectedButton) {
                selectedButton.disabled = pendingSyncReview.selectedProductIds.size === 0;
            }
        });

        document.addEventListener('click', (event) => {
            if (!root.contains(event.target)) {
                setOpen(false);
            }
        });
    }

    function initCart() {
        bindCartDropdown();
        bindAutoSyncDrop();
        if (isAutoSyncEnabled()) {
            startAutoSync();
            scheduleAutoSync();
        }
        renderCartUI();
    }

    window.HitbotCart = {
        init: initCart,
        render: renderCartUI,
        addProduct,
        syncUsedProducts,
        removeProduct,
        collectUsedProductUsages,
        getProduct,
        getProductForDevice,
        canAddProduct,
        buildCheckoutUrl,
        getStateSnapshot: () => readCartEnvelope().state
    };

    document.addEventListener('DOMContentLoaded', initCart);
    window.addEventListener('storage', (event) => {
        if (event.key === STORAGE_KEY) {
            renderCartUI();
        }
    });
    window.addEventListener(CART_UPDATED_EVENT, () => renderCartUI());
}());
