// js/device-data.js
// 设备库数据 - 模拟数据

const DEFAULT_DEVICE_PARAMETERS = [
    { label: "臂长", value: "320mm" },
    { label: "重复定位精度", value: "+0.02mm" },
    { label: "Z轴(高度)可定制范围", value: "0.1m~0.5m" },
    { label: "最大负载", value: "1KG" },
    { label: "支持碰撞检测、拖动示教、硬急停、调试/在线升级(USB口)", value: "" }
];

const withDetails = (device, detail = {}) => ({
    ...device,
    detailParameters: detail.parameters || DEFAULT_DEVICE_PARAMETERS,
    detailImage: detail.image || ""
});

export const DEVICE_DATA = [
    {
        category: "抓取设备",
        icon: "bi-hand-index",
        devices: [
            withDetails({ id: "Z-EMG-4", name: "Z-EMG-4", icon: "bi-box" }),
            withDetails({ id: "Z-EFG-8S", name: "Z-EFG-8S", icon: "bi-box" }),
            withDetails({ id: "Z-EFG-20S", name: "Z-EFG-20S", icon: "bi-box" }),
            withDetails({ id: "Z-EMG-CO-1", name: "Z-EMG-CO-1", icon: "bi-box" }),
            withDetails({ id: "Z-EMG-CO-2", name: "Z-EMG-CO-2", icon: "bi-box" }),
            withDetails({ id: "Z-EMG-CO-3", name: "Z-EMG-CO-3", icon: "bi-box" }),
            withDetails({ id: "Z-EMG-CO-4", name: "Z-EMG-CO-4", icon: "bi-box" }),
            withDetails({ id: "Z-EMG-CO-5", name: "Z-EMG-CO-5", icon: "bi-box" })
        ]
    },
    {
        category: "四轴机器臂",
        icon: "bi-robot",
        devices: [
            withDetails({ id: "Z-EMG-4", name: "Z-EMG-4", icon: "bi-robot" }),
            withDetails({ id: "Z-EFG-8S", name: "Z-EFG-8S", icon: "bi-robot" })
        ]
    },
    {
        category: "六轴机器臂",
        icon: "bi-robot",
        devices: [
            withDetails({ id: "Z-EFG-20S", name: "Z-EFG-20S", icon: "bi-robot" })
        ]
    },
    {
        category: "灵巧手",
        icon: "bi-hand-thumbs-up",
        devices: [
            withDetails({ id: "Z-EMG-CO-1", name: "Z-EMG-CO-1", icon: "bi-hand" })
        ]
    },
    {
        category: "人形机器人",
        icon: "bi-person-arms-up",
        devices: [
            withDetails({ id: "Z-EMG-CO-2", name: "Z-EMG-CO-2", icon: "bi-person" })
        ]
    },
    {
        category: "智能电缸",
        icon: "bi-arrows-expand",
        devices: [
            withDetails({ id: "Z-EMG-CO-3", name: "Z-EMG-CO-3", icon: "bi-arrows-expand" })
        ]
    },
    {
        category: "电机",
        icon: "bi-cpu",
        devices: [
            withDetails({ id: "Z-EMG-CO-4", name: "Z-EMG-CO-4", icon: "bi-cpu" }),
            withDetails({ id: "Z-EMG-CO-5", name: "Z-EMG-CO-5", icon: "bi-cpu" })
        ]
    }
];
