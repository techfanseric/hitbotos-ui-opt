// HitbotOS 3D-scene cart and storefront handoff.
(function () {
    'use strict';

    const STORAGE_KEY = 'hitbot-cart-v2';
    const AUTO_SYNC_STORAGE_KEY = 'hitbot-cart-scene-sync-v2';
    const CHECKOUT_HANDOFF_STORAGE_KEY = 'hitbot-store-checkout-handoff-v1';
    const CART_UPDATED_EVENT = 'hitbot-cart-updated';
    const SCENE_CHANGED_EVENT = 'hitbot:scene-changed';
    const SCENE_PARAMETERS_EVENT = 'hitbot:scene-model-updated';
    const CART_SCHEMA_VERSION = 3;
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
            sourceLabel: '商城标准件',
            defaultParameters: { jawStrokeMm: 40 }
        },
        'p-002': {
            id: 'p-002',
            model: 'Z-EFG-8S',
            name: '平行电爪 EFG-8S',
            partClass: 'standard',
            priceCents: 320000,
            currency: 'CNY',
            stock: 'in-stock',
            sourceLabel: '商城标准件',
            defaultParameters: { jawStrokeMm: 80 }
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
            sourceLabel: '商城标准件',
            defaultParameters: { strokeMm: 100, mounting: 'standard' },
            pricingRule: {
                parameter: 'strokeMm',
                baseValue: 100,
                pricePerUnitCents: 1200
            }
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
        },
        'p-011': {
            id: 'p-011',
            model: 'JIG-AL6061-240',
            name: '定位治具转接板',
            partClass: 'machined',
            priceCents: 0,
            currency: 'CNY',
            stock: 'in-stock',
            sourceLabel: '项目加工件',
            checkoutStatus: 'unavailable',
            unavailableReason: '加工件需按图纸线下核价，暂不支持商城直接下单'
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

    const PARAMETER_LABELS = {
        strokeMm: '行程',
        jawStrokeMm: '夹持行程',
        lengthMm: '长',
        widthMm: '宽',
        heightMm: '高',
        material: '材质',
        mounting: '安装',
        toleranceMm: '公差',
        surfaceFinish: '表面处理',
        drawingNo: '图号'
    };

    let toastTimer = null;
    let sceneSyncObserver = null;
    let sceneSyncTimer = null;
    let setCartOpen = null;
    let cartDropdownElement = null;

    function now() {
        return Date.now();
    }

    function escapeHTML(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function stableSerialize(value) {
        if (Array.isArray(value)) {
            return `[${value.map(stableSerialize).join(',')}]`;
        }
        if (value && typeof value === 'object') {
            return `{${Object.keys(value).sort().map((key) => (
                `${JSON.stringify(key)}:${stableSerialize(value[key])}`
            )).join(',')}}`;
        }
        return JSON.stringify(value);
    }

    function hashString(value) {
        let hash = 2166136261;
        const text = String(value);
        for (let index = 0; index < text.length; index += 1) {
            hash ^= text.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0).toString(36);
    }

    function configurationKey(productId, parameters) {
        return `${productId}:${stableSerialize(parameters || {})}`;
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

    function getProduct(productId) {
        return PRODUCT_CATALOG[productId] || null;
    }

    function getProductForDevice(categoryName, device) {
        if (!device) return null;
        const explicitProduct = device.productId ? getProduct(device.productId) : null;
        if (explicitProduct) return explicitProduct;
        return getProduct(DEVICE_PRODUCT_MAP[`${categoryName}|${device.name || device.id}`]) || null;
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

    function productIsCartRelevant(product) {
        return Boolean(product) && product.partClass !== 'reference';
    }

    function productIsCheckoutEligible(product) {
        return Boolean(product)
            && product.partClass === 'standard'
            && product.priceCents > 0
            && product.stock !== 'out-of-stock'
            && product.checkoutStatus !== 'unavailable';
    }

    function productNeedsQuote(product) {
        return Boolean(product) && product.partClass === 'custom';
    }

    function canAddProduct(product) {
        return productIsCartRelevant(product);
    }

    function calculateUnitPriceCents(product, parameters = {}) {
        if (!product || product.priceCents <= 0) return 0;
        const rule = product.pricingRule;
        if (!rule) return product.priceCents;

        const rawValue = Number(parameters[rule.parameter]);
        if (!Number.isFinite(rawValue)) return product.priceCents;
        const delta = Math.max(0, rawValue - rule.baseValue);
        return Math.max(0, Math.round(product.priceCents + delta * rule.pricePerUnitCents));
    }

    function normalizeParameters(product, parameters) {
        const raw = parameters && typeof parameters === 'object' && !Array.isArray(parameters)
            ? parameters
            : {};
        return {
            ...(product?.defaultParameters || {}),
            ...raw
        };
    }

    function normalizeStoredItem(item) {
        const product = getProduct(item?.productId);
        if (!product) return null;
        if (item.source === 'demo' && item.productId === 'p-011') return null;

        const parameters = normalizeParameters(product, item.parameters);
        const key = item.configurationKey || configurationKey(product.id, parameters);
        const sceneObjectIds = Array.isArray(item.sceneObjectIds)
            ? [...new Set(item.sceneObjectIds.filter(Boolean))]
            : [];
        const source = item.source === 'scene' ? 'scene' : 'legacy';
        const qty = source === 'scene' && sceneObjectIds.length
            ? sceneObjectIds.length
            : Math.max(1, Number(item.qty) || 1);

        return {
            ...item,
            itemId: item.itemId || `${source}:${product.id}:${hashString(key)}`,
            productId: product.id,
            partClass: product.partClass,
            qty,
            source,
            syncMode: item.syncMode || (source === 'scene' ? 'manual' : 'legacy'),
            sceneObjectIds,
            sceneModelNames: Array.isArray(item.sceneModelNames) ? item.sceneModelNames : [],
            parameters,
            configurationKey: key,
            unitPriceCents: calculateUnitPriceCents(product, parameters),
            selected: productIsCheckoutEligible(product) && Boolean(item.selected),
            sellable: productIsCheckoutEligible(product),
            quoteRequired: productNeedsQuote(product),
            syncStatus: 'synced',
            addedAt: item.addedAt || now()
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
        const rawProjects = Array.isArray(state.projects) && state.projects.length
            ? state.projects
            : [legacyProject];
        const projects = rawProjects.map((project) => {
            const items = (project.items || []).map(normalizeStoredItem).filter(Boolean);
            const selectionPreferences = { ...(project.selectionPreferences || {}) };
            items.forEach((item) => {
                if (!(item.configurationKey in selectionPreferences)) {
                    selectionPreferences[item.configurationKey] = item.selected;
                }
            });
            return {
                ...project,
                enterpriseId: project.enterpriseId || enterpriseId,
                companyName: project.companyName || companyName,
                items,
                selectionPreferences,
                updatedAt: project.updatedAt || now()
            };
        });
        const currentProjectId = state.currentProjectId || legacyProject.projectId;
        const activeProject = projects.find(
            (project) => project.projectId === currentProjectId && projectEnterpriseId(project) === enterpriseId
        ) || projects.find((project) => projectEnterpriseId(project) === enterpriseId) || projects[0] || legacyProject;

        return {
            ...state,
            schemaVersion: CART_SCHEMA_VERSION,
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
            if (!raw) return { state: normalizeStoredState(null), version: CART_SCHEMA_VERSION };
            const parsed = JSON.parse(raw);
            const state = parsed && typeof parsed === 'object' && parsed.state ? parsed.state : parsed;
            return {
                state: normalizeStoredState(state),
                version: Number(parsed?.version) || 0
            };
        } catch (error) {
            console.warn('读取购物车失败，已使用默认购物车。', error);
            return { state: normalizeStoredState(null), version: CART_SCHEMA_VERSION };
        }
    }

    function writeCartEnvelope(state) {
        const normalizedState = normalizeStoredState(state);
        const envelope = { state: normalizedState, version: CART_SCHEMA_VERSION };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
        window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT, { detail: { state: normalizedState } }));
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
            selectionPreferences: {},
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
        const exists = projects.some(
            (project) => project.projectId === updatedProject.projectId && projectEnterpriseId(project) === enterpriseId
        );
        const nextProjects = exists
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

        writeCartEnvelope(nextState);
        return { state: nextState, project: updatedProject };
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
            selectionPreferences: {},
            updatedAt: now()
        };
    }

    function parseSceneParameters(element, product) {
        if (!element) return normalizeParameters(product, null);
        try {
            const parsed = element.dataset.cartParameters
                ? JSON.parse(element.dataset.cartParameters)
                : {};
            return normalizeParameters(product, parsed);
        } catch (error) {
            console.warn('场景模型参数格式无效，已使用默认参数。', error);
            return normalizeParameters(product, null);
        }
    }

    function readSceneObjectSnapshot(element) {
        if (!element) return null;
        const product = getProduct(element.dataset.productId)
            || getProductByUsedName(element.dataset.sceneModelName);
        if (!product) return null;
        const sceneObjectId = element.dataset.sceneObjectId;
        if (!sceneObjectId) return null;
        const parameters = parseSceneParameters(element, product);
        const key = configurationKey(product.id, parameters);
        return {
            sceneObjectId,
            sceneModelName: element.dataset.sceneModelName || sceneObjectId,
            displayName: element.dataset.sceneDisplayName || product.name,
            productId: product.id,
            product,
            parameters,
            configurationKey: key,
            unitPriceCents: calculateUnitPriceCents(product, parameters),
            cartRelevant: productIsCartRelevant(product)
        };
    }

    function collectSceneProductSnapshots() {
        return Array.from(document.querySelectorAll('.viewport-3d .scene-object[data-scene-object-id]'))
            .map(readSceneObjectSnapshot)
            .filter((snapshot) => snapshot?.cartRelevant);
    }

    function groupSceneSnapshots(snapshots) {
        const groups = new Map();
        snapshots.forEach((snapshot) => {
            const existing = groups.get(snapshot.configurationKey);
            if (existing) {
                existing.sceneObjectIds.push(snapshot.sceneObjectId);
                existing.sceneModelNames.push(snapshot.sceneModelName);
                return;
            }
            groups.set(snapshot.configurationKey, {
                ...snapshot,
                sceneObjectIds: [snapshot.sceneObjectId],
                sceneModelNames: [snapshot.sceneModelName]
            });
        });
        return Array.from(groups.values());
    }

    function buildSceneItem(group, project, autoSyncEnabled) {
        const sceneItems = (project.items || []).filter((item) => item.source === 'scene');
        const overlaps = sceneItems.filter((item) => (
            item.configurationKey === group.configurationKey
            || item.sceneObjectIds.some((id) => group.sceneObjectIds.includes(id))
        ));
        const preference = project.selectionPreferences?.[group.configurationKey];
        const selected = overlaps.length
            ? overlaps.every((item) => item.selected)
            : Boolean(preference);
        const product = group.product;

        return {
            itemId: `scene:${product.id}:${hashString(group.configurationKey)}`,
            productId: product.id,
            partClass: product.partClass,
            qty: group.sceneObjectIds.length,
            source: 'scene',
            syncMode: autoSyncEnabled ? 'auto' : overlaps[0]?.syncMode || 'manual',
            sceneObjectIds: [...group.sceneObjectIds].sort(),
            sceneModelNames: [...group.sceneModelNames].sort(),
            parameters: group.parameters,
            configurationKey: group.configurationKey,
            unitPriceCents: group.unitPriceCents,
            selected: productIsCheckoutEligible(product) && selected,
            sellable: productIsCheckoutEligible(product),
            quoteRequired: productNeedsQuote(product),
            syncStatus: 'synced',
            addedAt: Math.min(...overlaps.map((item) => item.addedAt || now()), now())
        };
    }

    function isAutoSyncEnabled() {
        try {
            const stored = window.localStorage.getItem(AUTO_SYNC_STORAGE_KEY);
            return stored === null ? true : stored === 'true';
        } catch (error) {
            return true;
        }
    }

    function persistAutoSyncEnabled(enabled) {
        try {
            window.localStorage.setItem(AUTO_SYNC_STORAGE_KEY, enabled ? 'true' : 'false');
        } catch (error) {
            console.warn('保存 3D 场景自动同步配置失败。', error);
        }
    }

    function reconcileSceneCart() {
        const autoSyncEnabled = isAutoSyncEnabled();
        const snapshots = collectSceneProductSnapshots();
        return updateCurrentProject((project) => {
            const sceneItems = (project.items || []).filter((item) => item.source === 'scene');
            const trackedIds = new Set(sceneItems.flatMap((item) => item.sceneObjectIds || []));
            const targetSnapshots = autoSyncEnabled
                ? snapshots
                : snapshots.filter((snapshot) => trackedIds.has(snapshot.sceneObjectId));
            const nextSceneItems = groupSceneSnapshots(targetSnapshots)
                .map((group) => buildSceneItem(group, project, autoSyncEnabled));
            const retainedItems = (project.items || []).filter((item) => item.source !== 'scene');
            return {
                ...project,
                items: [...retainedItems, ...nextSceneItems]
            };
        });
    }

    function scheduleSceneSync() {
        window.clearTimeout(sceneSyncTimer);
        sceneSyncTimer = window.setTimeout(reconcileSceneCart, 80);
    }

    function startSceneSync() {
        if (sceneSyncObserver) sceneSyncObserver.disconnect();
        const sceneObjects = document.querySelector('.viewport-3d .scene-objects');
        if (sceneObjects) {
            sceneSyncObserver = new MutationObserver(scheduleSceneSync);
            sceneSyncObserver.observe(sceneObjects, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: [
                    'data-scene-object-id',
                    'data-scene-model-name',
                    'data-scene-display-name',
                    'data-product-id',
                    'data-cart-parameters'
                ]
            });
        }
        window.addEventListener(SCENE_CHANGED_EVENT, scheduleSceneSync);
        window.addEventListener(SCENE_PARAMETERS_EVENT, scheduleSceneSync);
    }

    function setAutoSyncEnabled(enabled) {
        persistAutoSyncEnabled(enabled);
        reconcileSceneCart();
        showToast(enabled ? '已开启 3D 场景自动同步' : '已关闭自动加入；已在购物车中的模型仍会同步参数');
    }

    function getSceneObjectCartState(element) {
        if (!element) return { canAdd: false, inCart: false, reason: '请先选择一个场景模型' };
        const snapshot = readSceneObjectSnapshot(element);
        if (!snapshot) return { canAdd: false, inCart: false, reason: '该场景模型尚未关联商城物料' };
        if (!snapshot.cartRelevant) return { canAdd: false, inCart: false, reason: '参考物不进入购物车' };

        const { state } = readCartEnvelope();
        const project = getActiveProject(state);
        const inCart = (project.items || []).some((item) => (
            item.sceneObjectIds?.includes(snapshot.sceneObjectId)
        ));
        if (inCart) return { canAdd: false, inCart: true, reason: '该模型已在购物车中' };
        if (isAutoSyncEnabled()) {
            return { canAdd: false, inCart: false, reason: '已开启自动同步，无需手动添加' };
        }
        return { canAdd: true, inCart: false, reason: '' };
    }

    function addSceneObject(element) {
        const state = getSceneObjectCartState(element);
        const snapshot = readSceneObjectSnapshot(element);
        if (!state.canAdd || !snapshot) {
            showToast(state.reason || '该模型暂不支持加入购物车', 'warn');
            return { ok: false, reason: state.reason };
        }

        updateCurrentProject((project) => {
            const items = [...(project.items || [])];
            const existingIndex = items.findIndex((item) => (
                item.source === 'scene' && item.configurationKey === snapshot.configurationKey
            ));
            if (existingIndex >= 0) {
                const existing = items[existingIndex];
                items[existingIndex] = {
                    ...existing,
                    qty: existing.qty + 1,
                    sceneObjectIds: [...existing.sceneObjectIds, snapshot.sceneObjectId].sort(),
                    sceneModelNames: [...existing.sceneModelNames, snapshot.sceneModelName].sort(),
                    syncMode: 'manual'
                };
            } else {
                items.push(buildSceneItem({
                    ...snapshot,
                    sceneObjectIds: [snapshot.sceneObjectId],
                    sceneModelNames: [snapshot.sceneModelName]
                }, project, false));
            }
            return { ...project, items };
        });
        showToast(`${snapshot.product.model} 已按当前参数加入购物车`);
        return { ok: true, snapshot };
    }

    function addProduct(productId, options = {}) {
        const product = getProduct(productId);
        if (!productIsCartRelevant(product)) {
            showToast('该物料暂不支持加入购物车', 'warn');
            return { ok: false, reason: 'unavailable', product };
        }
        const parameters = normalizeParameters(product, options.parameters);
        const key = configurationKey(product.id, parameters);
        const qty = Math.max(1, Number(options.qty) || 1);
        updateCurrentProject((project) => {
            const items = [...(project.items || [])];
            const index = items.findIndex((item) => item.source !== 'scene' && item.configurationKey === key);
            if (index >= 0) {
                items[index] = { ...items[index], qty: items[index].qty + qty };
            } else {
                items.push(normalizeStoredItem({
                    itemId: `legacy:${product.id}:${hashString(key)}`,
                    productId: product.id,
                    qty,
                    source: 'legacy',
                    parameters,
                    configurationKey: key,
                    selected: false,
                    addedAt: now()
                }));
            }
            return { ...project, items };
        });
        showToast(`${product.model} 已加入购物车`);
        return { ok: true, product };
    }

    function removeItem(itemId) {
        const { state } = readCartEnvelope();
        const project = getActiveProject(state);
        const item = (project.items || []).find((candidate) => candidate.itemId === itemId);
        if (!item) return { ok: false, reason: 'missing' };
        if (item.source === 'scene' && isAutoSyncEnabled()) {
            showToast('自动同步项请取消勾选以排除结算', 'warn');
            return { ok: false, reason: 'auto-sync' };
        }

        updateCurrentProject((currentProject) => ({
            ...currentProject,
            items: (currentProject.items || []).filter((candidate) => candidate.itemId !== itemId)
        }));
        showToast('物料已从购物车移除');
        return { ok: true };
    }

    function updateSceneObjectParameters(sceneObjectId, parameters) {
        const element = document.querySelector(
            `.viewport-3d .scene-object[data-scene-object-id="${CSS.escape(String(sceneObjectId))}"]`
        );
        if (!element || !parameters || typeof parameters !== 'object') return false;
        const product = getProduct(element.dataset.productId) || getProductByUsedName(element.dataset.sceneModelName);
        element.dataset.cartParameters = JSON.stringify(normalizeParameters(product, parameters));
        window.dispatchEvent(new CustomEvent(SCENE_PARAMETERS_EVENT, {
            detail: { sceneObjectId, parameters }
        }));
        return true;
    }

    function itemIsCheckoutEligible(item) {
        return productIsCheckoutEligible(getProduct(item.productId));
    }

    function cartTotals(items) {
        return items.reduce((total, item) => {
            const selected = item.selected && itemIsCheckoutEligible(item);
            return {
                count: total.count + item.qty,
                selectedCount: total.selectedCount + (selected ? item.qty : 0),
                subtotal: total.subtotal + (selected ? item.unitPriceCents * item.qty : 0)
            };
        }, { count: 0, selectedCount: 0, subtotal: 0 });
    }

    function setItemSelected(itemId, selected) {
        updateCurrentProject((project) => {
            const item = (project.items || []).find((candidate) => candidate.itemId === itemId);
            if (!item) return project;
            const checked = itemIsCheckoutEligible(item) && selected;
            return {
                ...project,
                selectionPreferences: {
                    ...(project.selectionPreferences || {}),
                    [item.configurationKey]: checked
                },
                items: project.items.map((candidate) => (
                    candidate.itemId === itemId ? { ...candidate, selected: checked } : candidate
                ))
            };
        });
    }

    function setAllItemsSelected(selected) {
        updateCurrentProject((project) => {
            const selectionPreferences = { ...(project.selectionPreferences || {}) };
            const items = (project.items || []).map((item) => {
                const checked = itemIsCheckoutEligible(item) && selected;
                if (itemIsCheckoutEligible(item)) selectionPreferences[item.configurationKey] = checked;
                return { ...item, selected: checked };
            });
            return { ...project, items, selectionPreferences };
        });
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

    function formatParameterValue(key, value) {
        if (key.endsWith('Mm') && Number.isFinite(Number(value))) return `${value} mm`;
        if (key === 'mounting') return value === 'standard' ? '标准' : String(value);
        return String(value);
    }

    function formatParameterSummary(parameters) {
        return Object.entries(parameters || {})
            .map(([key, value]) => `${PARAMETER_LABELS[key] || key} ${formatParameterValue(key, value)}`)
            .join(' · ');
    }

    function getUnavailableReason(product) {
        if (product?.unavailableReason) return product.unavailableReason;
        if (product?.stock === 'out-of-stock') return '该商品当前无库存，暂不可下单';
        if (product?.partClass === 'custom') return '定制件需先询价，暂不进入商城结算';
        return '该物料暂不支持商城直接下单';
    }

    function createPreviewRowHTML(item, autoSyncEnabled) {
        const product = getProduct(item.productId);
        const checkoutEligible = itemIsCheckoutEligible(item);
        const unavailableReason = getUnavailableReason(product);
        const partLabels = {
            standard: '标准件',
            custom: '定制询价件',
            machined: '加工件',
            reference: '参考件'
        };
        const sourceLabel = item.source === 'scene' ? '3D 场景' : '历史物料';
        const metaText = `${product?.model || item.productId} · ${sourceLabel} · ${partLabels[product?.partClass] || '物料'}`;
        const parameterText = formatParameterSummary(item.parameters);
        const removalLocked = item.source === 'scene' && autoSyncEnabled;

        return `
            <div class="cart-preview-row">
                <label class="cart-preview-select ${checkoutEligible ? '' : 'is-disabled'}" ${checkoutEligible ? '' : `title="${escapeHTML(unavailableReason)}"`}>
                    <input type="checkbox" data-cart-select-item="${escapeHTML(item.itemId)}" aria-label="选择 ${escapeHTML(product?.name || item.productId)}" ${item.selected && checkoutEligible ? 'checked' : ''} ${checkoutEligible ? '' : 'disabled'}>
                </label>
                <div class="cart-preview-main">
                    <div class="cart-preview-name">${escapeHTML(product?.name || item.productId)}</div>
                    <div class="cart-preview-meta" title="${escapeHTML(metaText)}">${escapeHTML(metaText)}</div>
                    ${parameterText ? `<div class="cart-preview-extra" title="${escapeHTML(parameterText)}">${escapeHTML(parameterText)}</div>` : ''}
                </div>
                <div class="cart-preview-side">
                    <div class="cart-preview-qty">x${item.qty}</div>
                    ${checkoutEligible
                        ? `<div class="cart-preview-price">${escapeHTML(formatPrice(item.unitPriceCents * item.qty, product.currency))}</div>`
                        : `<div class="cart-preview-unavailable" title="${escapeHTML(unavailableReason)}">${product?.partClass === 'custom' ? '需询价' : '不可下单'}</div>`}
                </div>
                <button class="cart-preview-remove" type="button" data-cart-remove-item="${escapeHTML(item.itemId)}" title="${removalLocked ? '自动同步项请取消勾选以排除结算' : '移除物料'}" aria-label="${removalLocked ? '自动同步项不可移除' : `移除 ${escapeHTML(product?.model || item.productId)}`}" ${removalLocked ? 'disabled' : ''}>
                    <i class="bi ${removalLocked ? 'bi-link-45deg' : 'bi-trash'}" aria-hidden="true"></i>
                </button>
            </div>
        `;
    }

    function createDropdownHTML(project, items, totals, autoSyncEnabled) {
        const eligibleItems = items.filter(itemIsCheckoutEligible);
        const allSelected = eligibleItems.length > 0 && eligibleItems.every((item) => item.selected);
        const canCheckout = totals.selectedCount > 0;
        const bodyHTML = items.length
            ? `
                <div class="cart-preview-list">
                    ${items.map((item) => createPreviewRowHTML(item, autoSyncEnabled)).join('')}
                </div>
            `
            : `
                <div class="cart-empty-state">
                    <div class="cart-empty-title">3D 场景还没有可采购物料</div>
                    <div class="cart-empty-hint">从设备库拖入模型；开启自动同步后会按场景参数加入购物车。</div>
                </div>
            `;

        return `
            <div class="cart-dropdown-header">
                <div class="cart-dropdown-title-row">
                    <span class="cart-dropdown-title">场景购物车</span>
                    <span class="cart-dropdown-count">${totals.count} 件</span>
                </div>
                <div class="cart-dropdown-meta-row">
                    <span class="cart-dropdown-project">项目名称：${escapeHTML(project.projectName || '当前项目')}</span>
                    <label class="cart-sync-option">
                        <input type="checkbox" data-cart-auto-sync ${autoSyncEnabled ? 'checked' : ''}>
                        <span>自动同步 3D 场景</span>
                    </label>
                    <span class="cart-sync-help" tabindex="0" aria-label="自动同步说明" aria-describedby="cart-sync-tooltip">
                        <i class="bi bi-info-circle" aria-hidden="true"></i>
                        <span class="cart-sync-tooltip" id="cart-sync-tooltip" role="tooltip">开启后，当前及新增的 3D 场景物料会自动进入购物车；已加入物料的参数变化始终同步。</span>
                    </span>
                </div>
            </div>
            <div class="cart-dropdown-divider"></div>
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
                <label class="cart-select-all ${eligibleItems.length ? '' : 'is-disabled'}">
                    <input type="checkbox" data-cart-select-all ${allSelected ? 'checked' : ''} ${eligibleItems.length ? '' : 'disabled'}>
                    <span>全选</span>
                </label>
                <span class="cart-checkout-control">
                    <button class="cart-dropdown-action primary" type="button" data-cart-action="checkout" ${canCheckout ? '' : 'aria-describedby="cart-checkout-tooltip" disabled'}>
                        <span>去商城结算</span>
                        <i class="bi bi-arrow-right" aria-hidden="true"></i>
                    </button>
                    ${canCheckout ? '' : '<span class="cart-checkout-tooltip" id="cart-checkout-tooltip" role="tooltip">去结算的前提是选择去结算的商品</span>'}
                </span>
            </div>
        `;
    }

    function renderCartUI(animateBadge = false) {
        const root = document.querySelector('.cart-menu-dropdown');
        if (!root) return;
        const { state } = readCartEnvelope();
        const activeProject = getActiveProject(state);
        const items = Array.isArray(activeProject.items) ? activeProject.items : [];
        const totals = cartTotals(items);
        const button = root.querySelector('.cart-menu-btn');
        const badge = root.querySelector('[data-cart-count]');
        const dropdown = cartDropdownElement
            || root.querySelector('[data-cart-dropdown]')
            || document.querySelector('[data-cart-dropdown]');

        button?.setAttribute('aria-label', totals.count > 0 ? `3D 场景购物车，${totals.count} 件物料` : '3D 场景购物车');
        if (badge) {
            badge.hidden = totals.count === 0;
            badge.textContent = totals.count > 99 ? '99+' : String(totals.count);
            if (animateBadge && totals.count > 0) {
                badge.classList.remove('bump');
                window.requestAnimationFrame(() => badge.classList.add('bump'));
            }
        }
        if (!dropdown) return;
        dropdown.innerHTML = createDropdownHTML(activeProject, items, totals, isAutoSyncEnabled());
        const selectAllInput = dropdown.querySelector('[data-cart-select-all]');
        if (selectAllInput) {
            const eligibleItems = items.filter(itemIsCheckoutEligible);
            const selectedItems = eligibleItems.filter((item) => item.selected);
            selectAllInput.indeterminate = selectedItems.length > 0 && selectedItems.length < eligibleItems.length;
        }
    }

    function buildCheckoutPayload(project) {
        const selectedItems = (project.items || []).filter((item) => item.selected && itemIsCheckoutEligible(item));
        const totals = cartTotals(selectedItems);
        return {
            schemaVersion: CART_SCHEMA_VERSION,
            source: 'hitbot-os',
            enterpriseId: project.enterpriseId || DEFAULT_ENTERPRISE.enterpriseId,
            companyName: project.companyName || DEFAULT_ENTERPRISE.companyName,
            projectId: project.projectId,
            projectName: project.projectName,
            createdAt: new Date().toISOString(),
            currency: 'CNY',
            selectedCount: totals.selectedCount,
            subtotalCents: totals.subtotal,
            items: selectedItems.map((item) => ({
                itemId: item.itemId,
                productId: item.productId,
                qty: item.qty,
                unitPriceCents: item.unitPriceCents,
                parameters: item.parameters,
                configurationKey: item.configurationKey,
                sceneObjectIds: item.sceneObjectIds || []
            }))
        };
    }

    function createCheckoutHandoff(project) {
        const handoffId = `os-${now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        const payload = buildCheckoutPayload(project);
        const handoff = { handoffId, payload };
        window.localStorage.setItem(CHECKOUT_HANDOFF_STORAGE_KEY, JSON.stringify(handoff));
        window.dispatchEvent(new CustomEvent('hitbot:checkout-handoff', { detail: handoff }));
        return handoff;
    }

    function buildCheckoutUrl(projectId, handoffId = '') {
        const configured = window.HITBOT_STORE_CHECKOUT_URL || document.body?.dataset?.storeCheckoutUrl;
        const isLocal = window.location.protocol === 'file:'
            || ['localhost', '127.0.0.1', ''].includes(window.location.hostname);
        const base = configured || (isLocal ? 'http://localhost:3000/zh/checkout' : '/store/cart');
        const url = new URL(base, window.location.href);
        url.searchParams.set('from', 'os');
        url.searchParams.set('project', projectId);
        if (handoffId) url.searchParams.set('handoff', handoffId);
        return url.toString();
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
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => toast.classList.remove('visible'), 1800);
    }

    function bindCartDropdown() {
        const root = document.querySelector('.cart-menu-dropdown');
        if (!root || root.dataset.cartBound === 'true') return;
        root.dataset.cartBound = 'true';
        const button = root.querySelector('.cart-menu-btn');
        const dropdown = root.querySelector('[data-cart-dropdown]');
        if (!dropdown) return;

        // The 3D window is deliberately allowed to be narrow in split layouts. Mounting
        // the popup at the document level keeps it associated with the 3D toolbar while
        // preventing a parent window's overflow boundary from clipping checkout controls.
        cartDropdownElement = dropdown;
        document.body.appendChild(dropdown);

        const positionDropdown = () => {
            if (!root.classList.contains('open')) return;
            const buttonRect = button?.getBoundingClientRect();
            if (!buttonRect) return;

            const viewportPadding = 8;
            const statusBarTop = document.querySelector('.status-bar')?.getBoundingClientRect().top
                || window.innerHeight;
            const dropdownWidth = dropdown.offsetWidth || 410;
            const preferredLeft = buttonRect.right + 8;
            const toolbarTop = button?.closest('.left-toolbar')?.getBoundingClientRect().top
                ?? buttonRect.top;
            const maxLeft = Math.max(viewportPadding, window.innerWidth - dropdownWidth - viewportPadding);
            const left = Math.min(Math.max(viewportPadding, preferredLeft), maxLeft);
            const top = Math.max(viewportPadding, toolbarTop);
            const availableHeight = Math.max(120, statusBarTop - top - viewportPadding);

            dropdown.style.left = `${Math.round(left)}px`;
            dropdown.style.top = `${Math.round(top)}px`;
            dropdown.style.maxHeight = `${Math.floor(availableHeight)}px`;
        };

        setCartOpen = (open) => {
            root.classList.toggle('open', open);
            dropdown.classList.toggle('is-open', open);
            button?.classList.toggle('active', open);
            button?.setAttribute('aria-expanded', open ? 'true' : 'false');
            if (open) {
                document.querySelectorAll('.top-menu-bar .top-menu-dropdown.open').forEach((dropdown) => {
                    dropdown.classList.remove('open');
                    dropdown.querySelector('[aria-expanded="true"]')?.setAttribute('aria-expanded', 'false');
                });
                window.getDeviceLibraryPanel?.()?.hide();
                window.getBindingPanel?.()?.hide();
                renderCartUI();
                window.requestAnimationFrame(positionDropdown);
            }
        };

        button?.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            setCartOpen(!root.classList.contains('open'));
        });

        dropdown.addEventListener('click', (event) => {
            const removeButton = event.target.closest('[data-cart-remove-item]');
            if (removeButton) {
                event.preventDefault();
                event.stopPropagation();
                removeItem(removeButton.dataset.cartRemoveItem);
                return;
            }

            const action = event.target.closest('[data-cart-action]');
            if (!action) return;
            event.preventDefault();
            event.stopPropagation();
            if (action.dataset.cartAction === 'checkout') {
                const { state } = readCartEnvelope();
                const project = getActiveProject(state);
                if (cartTotals(project.items || []).selectedCount <= 0) return;
                const handoff = createCheckoutHandoff(project);
                window.location.href = buildCheckoutUrl(project.projectId, handoff.handoffId);
            }
        });

        dropdown.addEventListener('change', (event) => {
            const selectAllInput = event.target.closest('[data-cart-select-all]');
            if (selectAllInput) {
                setAllItemsSelected(selectAllInput.checked);
                return;
            }
            const itemInput = event.target.closest('[data-cart-select-item]');
            if (itemInput) {
                setItemSelected(itemInput.dataset.cartSelectItem, itemInput.checked);
                return;
            }
            const syncInput = event.target.closest('[data-cart-auto-sync]');
            if (syncInput) setAutoSyncEnabled(syncInput.checked);
        });

        document.addEventListener('click', (event) => {
            if (!root.contains(event.target) && !dropdown.contains(event.target)) setCartOpen(false);
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') setCartOpen(false);
        });
        window.addEventListener('resize', positionDropdown);
    }

    function initCart() {
        bindCartDropdown();
        startSceneSync();
        reconcileSceneCart();
        renderCartUI();
    }

    window.HitbotCart = {
        init: initCart,
        render: renderCartUI,
        open: () => setCartOpen?.(true),
        close: () => setCartOpen?.(false),
        addProduct,
        addSceneObject,
        removeItem,
        reconcileSceneCart,
        collectSceneProductSnapshots,
        getSceneObjectCartState,
        updateSceneObjectParameters,
        getProduct,
        getProductForDevice,
        canAddProduct,
        isAutoSyncEnabled,
        buildCheckoutPayload,
        buildCheckoutUrl,
        createCheckoutHandoff,
        getStateSnapshot: () => readCartEnvelope().state,
        getCheckoutHandoff: () => {
            try {
                return JSON.parse(window.localStorage.getItem(CHECKOUT_HANDOFF_STORAGE_KEY) || 'null');
            } catch (error) {
                return null;
            }
        }
    };

    document.addEventListener('DOMContentLoaded', initCart);
    window.addEventListener('storage', (event) => {
        if (event.key === STORAGE_KEY || event.key === AUTO_SYNC_STORAGE_KEY) {
            renderCartUI();
            if (event.key === AUTO_SYNC_STORAGE_KEY) reconcileSceneCart();
        }
    });
    window.addEventListener(CART_UPDATED_EVENT, () => renderCartUI());
}());
