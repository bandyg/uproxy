# http-proxy-middleware 使用指南 (v3.x)

`http-proxy-middleware` 是一个用于 Express 等 Node.js 服务器的强大代理中间件，常用于将 API 请求转发到其他后端服务。

本文档基于 `v3.x` 版本整理。

## 1. 安装

```bash
npm install http-proxy-middleware
```

## 2. 基本用法

在 Express 应用中引入并注册中间件：

```typescript
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();

// 简单示例：将 /api 开头的请求转发到 http://www.example.org
app.use(
  '/api',
  createProxyMiddleware({
    target: 'http://www.example.org',
    changeOrigin: true,
  })
);

app.listen(3000);
```

## 3. 核心配置选项 (Options)

`createProxyMiddleware(options)` 接收一个配置对象。

### 基础选项

| 选项 | 类型 | 描述 |
| :--- | :--- | :--- |
| **`target`** | `string` | **必填**。目标服务器的地址（协议+域名+端口），例如 `http://localhost:3000`。 |
| **`changeOrigin`** | `boolean` | 默认 `false`。如果为 `true`，会将请求头中的 `Host` 修改为目标 URL 的域名。这对于虚拟主机配置的后端服务器非常重要。 |
| **`pathFilter`** | `string[]` \| `string` \| `fn` | **v3 新特性**。用于确定哪些请求应该被这个代理中间件处理。替代了旧版本的 `context` 参数。支持通配符（Glob）或自定义函数。 |

### 路径处理

| 选项 | 类型 | 描述 |
| :--- | :--- | :--- |
| **`pathRewrite`** | `Object` \| `fn` | 重写目标 URL 的路径。 |
| **`router`** | `Object` \| `fn` | 根据请求动态重新定位 `target`（目标服务器）。 |

#### `pathRewrite` 示例
去除路径中的 `/api` 前缀：
```javascript
pathRewrite: {
  '^/api/old-path': '/api/new-path', // 重写特定路径
  '^/api/remove/user': '/user',      // 去除路径前缀
}
// 或者使用函数
pathRewrite: async function (path, req) {
  return path.replace('/api', '/base/api');
}
```

#### `router` 示例
根据 Host 或 Path 动态转发到不同服务器：
```javascript
router: {
  'integration.localhost:3000': 'http://localhost:8001',  // 基于 Host
  'staging.localhost:3000': 'http://localhost:8002',
}
// 或者使用函数
router: async function(req) {
    if (req.headers['x-service-id'] === 'beta') {
        return 'http://beta-service:8080';
    }
    return 'http://default-service:8080';
}
```

### 事件监听 (Events)

通过 `on` 选项订阅代理生命周期中的事件。

```javascript
on: {
    // 代理请求发送前
    proxyReq: (proxyReq, req, res) => {
        // 可以修改请求头，例如添加 Auth token
        proxyReq.setHeader('X-Special-Proxy-Header', 'foobar');
    },
    // 收到代理响应后
    proxyRes: (proxyRes, req, res) => {
        // 可以修改响应头
        proxyRes.headers['x-added'] = 'foobar';
    },
    // 发生错误时
    error: (err, req, res) => {
        res.writeHead(500, {
            'Content-Type': 'text/plain',
        });
        res.end('Something went wrong. And we are reporting a custom error message.');
    }
}
```

### 其他常用选项

| 选项 | 类型 | 描述 |
| :--- | :--- | :--- |
| **`ws`** | `boolean` | 默认 `false`。是否代理 Websockets。 |
| **`xfwd`** | `boolean` | 默认 `false`。是否添加 `x-forwarded` 标头。 |
| **`secure`** | `boolean` | 默认 `true`。是否验证 SSL 证书。如果是自签名证书，设为 `false`。 |
| **`logger`** | `Object` | 自定义日志记录器。 |

## 4. 常见场景配置

### 场景一：匹配多个路径 (Path Filter)

只代理特定的 API 路径：

```javascript
createProxyMiddleware({
  target: 'http://localhost:3001',
  pathFilter: ['/api', '/ajax', '/some/other/path'], // 只有这些路径会被代理
})
```

### 场景二：基于 Header 的动态路由

结合 `router` 实现 A/B 测试或灰度发布：

```javascript
createProxyMiddleware({
  target: 'http://v1.service.local', // 默认目标
  router: (req) => {
    // 如果 Header 中包含 version=v2，转发到 v2 服务
    if (req.headers['x-api-version'] === 'v2') {
        return 'http://v2.service.local';
    }
    return undefined; // 返回 undefined 使用默认 target
  }
})
```

### 场景三：修改响应

拦截并修改后端返回的数据（需要小心处理流）：

```javascript
import { responseInterceptor } from 'http-proxy-middleware';

createProxyMiddleware({
  target: 'http://example.com',
  selfHandleResponse: true, // 必须开启，允许处理响应
  on: {
      proxyRes: responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
        const response = responseBuffer.toString('utf8'); // 转为字符串
        return response.replace('Hello', 'Goodbye'); // 修改内容
      }),
  },
})
```
