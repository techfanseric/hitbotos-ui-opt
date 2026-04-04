# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个仿真系统的前端 UI 实现，纯 HTML/CSS/JavaScript 项目，无需构建工具。

## 运行项目

使用 Live Server 在端口 5501 上运行：
```bash
# Live Server 配置在 .vscode/settings.json 中
# 端口：5501
```

直接在浏览器中打开 `index.html` 也可正常工作。

## 项目架构

### 核心模块

**布局管理器 (`layout-manager.js`)**
- 负责窗口布局的创建、管理和渲染
- 管理三种窗口类型：电气拓扑 (`electrical`)、3D仿真 (`simulation`)、动作编辑 (`action`)
- 支持多种布局模式：
  - 三窗口布局：`layout1`（上下分层）、`layout2`（左右分栏，默认）、`layout3`（三列并排）
  - 双窗口布局：`dual-lr-73`（左右7:3）、`dual-lr-55`（左右5:5）、`dual-tb-55`（上下5:5）
- 窗口状态管理：全屏、最小化、布局模式切换
- 布局状态持久化到 localStorage

**核心脚本 (`script.js`)**
- 初始化布局管理器
- 处理窗口控制交互
- 工具栏按钮切换逻辑
- 面板 tab 功能
- 窗口位置交换功能

**面板加载器 (`panel-loader.js`)**
- 异步加载 `panel-tabs-content.html`
- 管理属性面板的 tab 切换
- 绑定面板内的交互事件（树形结构、滑块、按钮等）

### 文件结构

```
/
├── index.html                    # 主入口
├── main.css                      # 主样式（菜单栏、工作空间、布局、状态栏）
├── window.css                    # 窗口样式
├── simulator-toolbar.css         # 工具栏样式
├── panel-tabs.css                # 面板标签样式
├── panel-ui-components.css       # 面板 UI 组件样式
├── script.js                     # 核心功能脚本
├── layout-manager.js             # 布局管理器
├── panel-loader.js               # 面板加载器
├── panel-tabs-content.html       # 面板内容（异步加载）
└── docs/                         # 文档目录
    ├── requirements/             # 需求文档
    ├── meetings/                 # 会议纪要
    └── videos/                   # 参考视频
```

### 窗口系统

每个窗口都继承自 `.window` 基类，包含：
- 窗口标题栏 (`.window-header`)
- 窗口控制按钮 (全屏/最小化)
- 窗口内容区 (`.window-content`)
- 位置交换功能（布局模式下）

### 面板系统

右侧属性面板包含两个 tab：
- 结构 tab (`data-tab="structure"`) - 显示场景树形结构
- 属性 tab (`data-tab="properties"`) - 显示选中项的属性

面板内容通过 `PanelLoader` 类异步加载，支持展开/收起、滑块控制、状态切换等交互。

## 样式规范

- 主题色：`#BD1C22`（红色）
- 深色面板背景：`#2b2b2b`
- 使用 Bootstrap Icons 图标库
- 字体：Segoe UI, Tahoma, Geneva, Verdana, sans-serif
- 基础字号：12px

## 关键设计模式

1. **模块化 CSS**：样式按功能拆分为多个文件，避免单个文件过大
2. **状态持久化**：布局状态保存到 localStorage，支持刷新后恢复
3. **回调机制**：布局管理器通过回调函数通知 UI 更新
4. **异步加载**：面板内容按需加载，减少初始页面大小

## 部署

项目部署在 GitHub Pages 上：
- 仓库地址：`https://github.com/techfanseric/hitbotos-ui-opt`
- 网站地址：`https://techfanseric.github.io/hitbotos-ui-opt/`
- 部署配置：从 main 分支的 / (root) 目录自动部署
- 推送到 main 分支后会自动触发重新构建

### Git 命令

```bash
# 查看状态
git status

# 添加并提交更改
git add .
git commit -m "描述信息"

# 推送到远程仓库
git push origin main

# 拉取最新更改
git pull origin main
```

## 文件大小限制

注意：GitHub 有 100MB 单文件限制。大文件（如视频、大型 PPTX）不应提交到仓库。
