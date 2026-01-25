# Proxy Service B

這是一個基於 Express.js 和 `http-proxy-middleware` 的代理服務。它根據配置的 `mode` 將請求轉發到不同的後端服務（C、D、E）。

## 項目結構

```
uproxy/
├── config.js           # 配置文件 (Mode 和 服務 URL)
├── server.js           # 主代理服務 (Service B)
├── mocks/              # 模擬後端服務
│   ├── serviceC.js     # 服務 C (Port 3001)
│   ├── serviceD.js     # 服務 D (Port 3002)
│   └── serviceE.js     # 服務 E (Port 3003)
├── tests/              # 測試代碼
│   └── proxy.test.js   # 代理邏輯測試 (Jest + Supertest)
├── package.json
└── README.md
```

## 安裝

```bash
npm install
```

## 運行指南

### 1. 啟動模擬服務 (Mock Services)

為了測試代理功能，你需要先啟動後端模擬服務（C, D, E）。我們提供了一個便捷命令來同時啟動它們：

```bash
npm run mocks
```

這將分別在端口 3001, 3002, 3003 上啟動服務 C, D, E。

### 2. 啟動代理服務 (Service B)

在另一個終端窗口中啟動代理服務：

```bash
npm start
```

默認情況下，代理服務運行在端口 **3000**，且模式為 **0**。

你可以通過環境變量修改配置：

```bash
# 以 Mode 1 啟動
PROXY_MODE=1 npm start

# 修改目標服務地址
SERVICE_C_URL=http://some-other-host:3001 npm start
```

### 3. 運行測試

本項目包含完整的自動化測試，覆蓋所有模式和轉發規則。

```bash
npm test
```

測試會自動啟動模擬服務，驗證 Mode 0, 1, 2 下的請求轉發是否正確。

## 轉發規則說明

支持的接口：`sendAndWait`, `sendNoWait`, `queryIP`, `IPChanged`, `ping`, `doAuth`, `downloadCert`, `renewCert`。

| 接口 | Mode 0 | Mode 1 | Mode 2 |
| :--- | :--- | :--- | :--- |
| `sendAndWait` | -> Service C | -> Service E | -> Service D |
| `sendNoWait` | -> Service C | -> Service E | -> Service D |
| `queryIP` | -> Service C | -> Service D | -> Service D |
| `IPChanged` | -> Service C | -> Service D | -> Service D |
| `ping` | 404 | -> Service E | 404 |
| `doAuth` | 404 | -> Service D | -> Service D |
| `downloadCert`| 404 | -> Service D | -> Service D |
| `renewCert` | 404 | -> Service E | 404 |

*注意：未定義的行為（如 Mode 2 下的 ping）均返回 404 Not Found。*
