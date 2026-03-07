# URL参数记忆布局状态实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标:** 将布局状态从 localStorage 存储改为 URL 参数存储，实现可分享的布局链接

**架构:**
- 使用 URLSearchParams API 管理 URL 参数
- 状态序列化为 JSON 后进行 Base64 编码，保持 URL 简洁
- 修改 layout-manager.js 中的存储/恢复/清除方法
- 保留 localStorage 作为备选方案（可选）

**技术栈:**
- 原生 JavaScript (URLSearchParams, btoa/atob)
- 无需额外依赖

---

## URL参数设计

**参数名:** `layout`

**编码格式:** Base64 编码的 JSON 字符串

**示例:**
```
原始状态:
{
  "m": "layout2",
  "w": ["electrical", "simulation", "action"],
  "f": null,
  "s": null
}

URL: ?layout=eyJtIjoibGF5b3V0MiIsInciOlsiZWxlY3RyaWNhbCIsInNpbXVsYXRpb24iLCJhY3Rpb24iXSwiZiI6bnVsbCwiczpudWxsfQ%3D%3D
```

**参数说明:**
- `m`: mode (布局类型)
- `w`: windows (窗口数组)
- `f`: fullscreen (全屏窗口类型)
- `s`: source (全屏来源)

---

## Task 1: 创建URL参数工具函数

**文件:**
- 修改: `layout-manager.js:15-17` (在 STORAGE_KEY 后添加)
- 新增: URL 工具方法

**Step 1: 在构造函数后添加 URL 工具方法**

在 `layout-manager.js` 中，在 `STORAGE_KEY` 定义后添加：

```javascript
// URL参数名
this.URL_PARAM_NAME = 'layout';

// 将状态对象编码为URL参数
encodeStateToURL(state) {
    try {
        // 简化状态对象，使用短属性名
        const simplified = {
            m: state.currentLayoutType,
            w: state.selectedWindows,
            f: state.fullscreenWindowType,
            s: state.fullscreenSource
        };
        const json = JSON.stringify(simplified);
        // 使用 Base64 编码
        return btoa(encodeURIComponent(json));
    } catch (error) {
        console.warn('编码状态到URL失败:', error);
        return null;
    }
}

// 从URL参数解码状态对象
decodeStateFromURL(encoded) {
    try {
        const json = decodeURIComponent(atob(encoded));
        const simplified = JSON.parse(json);
        // 还原为完整状态对象
        return {
            isInLayoutMode: true,
            currentLayoutType: simplified.m,
            selectedWindows: simplified.w || [],
            fullscreenWindowType: simplified.f,
            fullscreenSource: simplified.s,
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
```

**Step 2: 保存文件**

不需要执行，这只是计划文档。

---

## Task 2: 修改saveLayoutState方法

**文件:**
- 修改: `layout-manager.js:36-65`

**Step 1: 替换 saveLayoutState 方法实现**

将原方法：
```javascript
localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
```

替换为：
```javascript
// 更新URL参数
this.updateURLWithState(state);
```

完整方法：
```javascript
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
```

**Step 2: 保存文件**

不需要执行，这只是计划文档。

---

## Task 3: 修改restoreLayoutState方法

**文件:**
- 修改: `layout-manager.js:67-118`

**Step 1: 替换 restoreLayoutState 方法实现**

将原方法中的：
```javascript
const savedState = localStorage.getItem(this.STORAGE_KEY);
```

替换为：
```javascript
const savedState = this.getStateFromURL();
```

移除过期检查（URL参数不需要过期机制）：

```javascript
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
```

**Step 2: 保存文件**

不需要执行，这只是计划文档。

---

## Task 4: 修改clearLayoutState方法

**文件:**
- 修改: `layout-manager.js:217-225`

**Step 1: 替换 clearLayoutState 方法实现**

将原方法：
```javascript
localStorage.removeItem(this.STORAGE_KEY);
```

替换为：
```javascript
this.clearStateFromURL();
```

完整方法：
```javascript
// 清除保存的布局状态
clearLayoutState() {
    try {
        this.clearStateFromURL();
        console.log('URL中的布局状态已清除');
    } catch (error) {
        console.warn('清除布局状态失败:', error);
    }
}
```

**Step 2: 保存文件**

不需要执行，这只是计划文档。

---

## Task 5: 测试验证

**测试场景:**

1. **基本布局恢复测试**
   - 选择 layout2 布局
   - 刷新页面
   - 验证: 布局和窗口位置正确恢复

2. **双窗口布局测试**
   - 选择 dual-lr-73 布局
   - 刷新页面
   - 验证: 双窗口布局正确恢复

3. **全屏状态测试**
   - 将某个窗口全屏
   - 刷新页面
   - 验证: 全屏状态正确恢复

4. **URL分享测试**
   - 复制当前页面URL（包含layout参数）
   - 在新标签页/浏览器中打开
   - 验证: 布局状态正确恢复

5. **清除状态测试**
   - 点击返回布局选择器
   - 验证: URL中的layout参数被清除

6. **无效参数测试**
   - 手动修改URL中的layout参数为无效值
   - 刷新页面
   - 验证: 回退到默认布局

**验收标准:**
- URL参数格式正确，可编码/解码
- 页面刷新后布局状态正确恢复
- URL可分享，其他浏览器打开可恢复布局
- 返回布局选择器时URL参数被清除
- 无效/损坏的参数不会导致页面崩溃

---

## 注意事项

1. **URL长度:** 浏览器通常支持2000+字符的URL，当前编码后的状态远小于此限制

2. **特殊字符:** 使用 `encodeURIComponent`/`decodeURIComponent` 处理特殊字符

3. **历史记录:** 使用 `replaceState` 而非 `pushState`，避免产生大量历史记录

4. **兼容性:** URLSearchParams 和 atob/btoa 在所有现代浏览器中都支持

5. **安全性:** URL参数可见，不包含敏感信息（当前只有布局配置，无敏感数据）
