# GitHub Pages 多项目 URL 路由规范指南

[![en-icon](https://flat.badgen.net/badge/language/English/red?icon=github)](./GITHUB_PAGES_URL_GUIDE.en.md)


## 文档目的

本文档为所有子项目提供统一的 URL 路由策略和实现规范，确保在 GitHub Pages 多项目部署环境下，每个子项目都能正确处理路由、资源加载和 404 重定向。

## 要解决的问题

### 核心问题

GitHub Pages 的多项目部署存在以下核心问题：

1. **资源路径问题**：当项目部署在子路径（如 `/project-name/`）时，相对路径的资源引用会失效
2. **SPA 路由问题**：单页应用（SPA）的客户端路由在刷新或直接访问时会触发 404
3. **锚点链接问题**：使用 `<base>` 标签修复资源路径会破坏文档相对锚点（`#section`）
4. **多项目冲突**：多个子项目共享同一个仓库根目录时，404 处理逻辑需要区分不同项目

### 具体示例

假设有以下结构：
```
username.github.io/
├── 404.html          # 全局 404 处理器
├── .nojekyll
│
├── project-a/
│   ├── index.html
│   └── assets/
└── project-b/
    ├── index.html
    └── assets/
```

当用户访问 `https://username.github.io/project-a/docs/intro` 时：
- GitHub Pages 找不到该文件，触发 404
- 全局 404.html 识别出这是 `project-a` 的请求
- 重定向到 `https://username.github.io/project-a/?p=/docs/intro`
- project-a 的应用解析 `p` 参数并恢复路由

## 子项目必须做的事情

### 1. 在 index.html 中添加资源路径修复脚本

**目的**：确保资源（CSS、JS、图片等）在子路径下正确加载

**实现位置**：`<head>` 标签的最开始，在任何资源引用之前

**实现逻辑**：
```javascript
(function(l) {
  // 1. 计算项目根目录（如 /project-name/）
  var segments = l.pathname.split('/').filter(Boolean);
  var firstSegment = segments[0] || '';
  var repoName = (firstSegment && !firstSegment.match(/\.(html|php|js|css)$/)) ? firstSegment : '';
  var repoRoot = '/' + repoName + (repoName ? '/' : '');

  // 2. 临时注入 <base> 标签修复资源加载
  document.write('<base href="' + repoRoot + '">');
  
  // 3. 页面加载完成后移除 <base> 标签，避免破坏锚点
  window.addEventListener('load', function() {
    var base = document.querySelector('base');
    if (base) base.parentNode.removeChild(base);
  });
}(window.location))
```

**注意事项**：
- 不要硬编码项目名称，必须动态计算
- 不要在页面加载后保留 `<base>` 标签
- 不要使用其他方式（如 Webpack publicPath）替代此脚本

### 2. 在应用入口处理 404 重定向参数

**目的**：从 URL 参数中恢复原始路由

**实现位置**：应用的主组件（如 React 的 `App.tsx`、Vue 的 `App.vue`）

**实现逻辑**：
```javascript
// React 示例
useEffect(() => {
  const params = new URLSearchParams(location.search);
  const p = params.get('p');
  if (p) {
    const decodedPath = decodeURIComponent(p);
    // 移除 'p' 参数并替换历史状态
    navigate(decodedPath, { replace: true });
  }
}, []); // 只在挂载时运行一次
```

**注意事项**：
- 必须使用 `replace: true` 避免历史记录污染
- 必须解码 URL 参数
- 必须在路由初始化前执行

### 3. 正确处理锚点导航

**目的**：确保文档内的锚点链接（`#section`）正常工作

**实现逻辑**：
```javascript
useEffect(() => {
  if (location.hash) {
    const id = decodeURIComponent(location.hash.slice(1));
    const timer = setTimeout(() => {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 500); // 等待 DOM 渲染完成
    return () => clearTimeout(timer);
  }
}, [location.hash]);
```

**注意事项**：
- 不要依赖浏览器的默认锚点行为（因为 `<base>` 标签已被移除）
- 必须等待 DOM 渲染完成后再滚动

### 4. 使用 BrowserRouter 而非 HashRouter

**目的**：提供更友好的 URL 结构

**实现示例**：
```javascript
// React Router
<BrowserRouter>
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/:path*" element={<Page />} />
  </Routes>
</BrowserRouter>
```

**注意事项**：
- 不要使用 HashRouter（会产生 `/#/path` 这样的 URL）
- 不要使用 MemoryRouter（无法处理浏览器前进/后退）

## 子项目绝对不能做的事情

### 1. 不要创建自己的 404.html

**原因**：仓库根目录的 `404.html` 已经处理了全局 404 重定向

**错误示例**：
```
project-a/
├── 404.html          # 不要创建这个文件
├── index.html
└── assets/
```

### 2. 不要硬编码项目路径

**错误示例**：
```javascript
// 错误：硬编码项目名称
const BASE_URL = '/project-a/';

// 正确：动态计算
const repoRoot = '/' + repoName + (repoName ? '/' : '');
```

### 3. 不要在页面加载后保留 <base> 标签

**错误示例**：
```javascript
// 错误：保留 <base> 标签
document.write('<base href="/project-a/">');
// 没有移除逻辑

// 正确：加载后移除
window.addEventListener('load', function() {
  var base = document.querySelector('base');
  if (base) base.parentNode.removeChild(base);
});
```

### 4. 不要使用服务器端路由配置

**原因**：GitHub Pages 不支持自定义服务器配置

**错误示例**：
```javascript
// 错误：尝试配置服务器路由
// GitHub Pages 不支持 .htaccess、nginx.conf 等
```

### 5. 不要忽略 URL 参数中的 hash

**错误示例**：
```javascript
// 错误：只处理路径，忽略 hash
const p = params.get('p');
if (p) {
  navigate(decodeURIComponent(p)); // 丢失了 #section
}

// 正确：保留 hash
const p = params.get('p');
if (p) {
  const decodedPath = decodeURIComponent(p);
  // decodedPath 包含完整的路径和 hash
  navigate(decodedPath, { replace: true });
}
```

## 不同框架的实现参考

### React

```javascript
// App.tsx
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';

const App = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // 处理 404 重定向参数
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const p = params.get('p');
    if (p) {
      navigate(decodeURIComponent(p), { replace: true });
    }
  }, []);

  // 处理锚点导航
  useEffect(() => {
    if (location.hash) {
      const id = decodeURIComponent(location.hash.slice(1));
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) element.scrollIntoView({ behavior: 'smooth' });
      }, 500);
    }
  }, [location.hash]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/:path*" element={<Page />} />
      </Routes>
    </BrowserRouter>
  );
};
```

### Vue

```javascript
// main.js
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/:pathMatch(.*)*', component: Page }
  ]
});

// 处理 404 重定向参数
router.beforeEach((to, from, next) => {
  const p = to.query.p;
  if (p) {
    next(decodeURIComponent(p));
  } else {
    next();
  }
});

// 处理锚点导航
router.afterEach((to) => {
  if (to.hash) {
    setTimeout(() => {
      const element = document.getElementById(to.hash.slice(1));
      if (element) element.scrollIntoView({ behavior: 'smooth' });
    }, 500);
  }
});
```

## 检查清单

在部署子项目前，请确认以下事项：

- [ ] `index.html` 中包含资源路径修复脚本
- [ ] 资源路径修复脚本动态计算项目根目录
- [ ] 资源路径修复脚本在页面加载后移除 `<base>` 标签
- [ ] 应用入口处理 `p` 参数并恢复路由
- [ ] 使用 `replace: true` 避免历史记录污染
- [ ] 正确处理锚点导航
- [ ] 使用 BrowserRouter 而非 HashRouter
- [ ] 不得创建自己的 `404.html`
- [ ] 不得硬编码项目路径
- [ ] 测试直接访问子路径（如 `/project-a/docs/intro`）
- [ ] 测试刷新页面
- [ ] 测试锚点链接（如 `/project-a/docs/intro#section`）

## 常见错误排查

### 问题：刷新页面后 404

**原因**：没有正确处理 `p` 参数

**解决**：检查应用入口是否解析并导航到 `p` 参数的值

### 问题：资源加载失败（404）

**原因**：资源路径修复脚本未正确执行

**解决**：检查脚本是否在 `<head>` 最开始，是否动态计算了项目根目录

### 问题：锚点链接不工作

**原因**：`<base>` 标签未被移除或锚点处理逻辑缺失

**解决**：确认 `<base>` 标签在页面加载后被移除，并添加锚点滚动逻辑

### 问题：URL 中包含 `?p=` 参数

**原因**：应用未正确处理 `p` 参数

**解决**：检查是否使用 `replace: true` 导航到解码后的路径

## 相关文件参考

- `github-root/404.html` - 全局 404 重定向器
- `index.html` - 资源路径修复脚本示例
- `App.tsx` - React 路由处理示例

---

**重要提示**：本规范适用于所有部署在 GitHub Pages 多项目环境下的子项目。如有疑问，请参考现有项目的实现或联系维护者。
