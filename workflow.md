```mermaid
flowchart LR
    %% 电气模块
    subgraph 电气
        E1[配置电气架构]
    end

    %% 仿真模块
    subgraph 仿真
        S1[载入模型仿真场景]
        S2[编辑场景（坐标、组合）]
        S3[绑定电气设备]
        S4[设定点坐标]
        S5[增加补充行为（可选）]
    end

    %% 动作模块
    subgraph 动作
        A1[编写Blockly或流程脚本]
        A2[运行脚本]
    end

    %% 流程连接
    E1 --> S1 --> S2 --> S3 --> S4 --> A1 --> S5 --> A2
    %% 第二种方案使用虚线表示
    S1 -.-> E1
    E1 -.-> S2
