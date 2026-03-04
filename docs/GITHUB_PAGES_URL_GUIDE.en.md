# GitHub Pages Multi-Project URL Routing Guide

[![cn-icon](https://flat.badgen.net/badge/语言/中文/blue?icon=github)](./GITHUB_PAGES_URL_GUIDE.zh-cn.md)

## Document Purpose

This document provides unified URL routing strategies and implementation standards for all sub-projects, ensuring that each sub-project correctly handles routing, asset loading, and 404 redirects in a GitHub Pages multi-project deployment environment.

## Problems to Solve

### Core Issues

GitHub Pages multi-project deployment has the following core issues:

1. **Asset Path Issue**: When a project is deployed in a sub-path (e.g., `/project-name/`), relative path asset references fail
2. **SPA Routing Issue**: Client-side routing in Single Page Applications (SPA) triggers 404 on refresh or direct access
3. **Anchor Link Issue**: Using `<base>` tag to fix asset paths breaks document-relative anchors (`#section`)
4. **Multi-Project Conflict**: When multiple sub-projects share the same repository root, 404 handling logic needs to distinguish between different projects

### Specific Example

Assume the following structure:
```
username.github.io/
├── github-root/
│   ├── 404.html          # Global 404 handler
│   └── .nojekyll
├── project-a/
│   ├── index.html
│   └── assets/
└── project-b/
    ├── index.html
    └── assets/
```

When a user visits `https://username.github.io/project-a/docs/intro`:
- GitHub Pages cannot find the file and triggers 404
- Global 404.html identifies this as a `project-a` request
- Redirects to `https://username.github.io/project-a/?p=/docs/intro`
- project-a application parses the `p` parameter and restores the route

## Sub-Projects Must Do

### 1. Add Asset Path Fix Script in index.html

**Purpose**: Ensure assets (CSS, JS, images, etc.) load correctly in sub-paths

**Implementation Location**: At the very beginning of `<head>` tag, before any asset references

**Implementation Logic**:
```javascript
(function(l) {
  // 1. Calculate project root (e.g., /project-name/)
  var segments = l.pathname.split('/').filter(Boolean);
  var firstSegment = segments[0] || '';
  var repoName = (firstSegment && !firstSegment.match(/\.(html|php|js|css)$/)) ? firstSegment : '';
  var repoRoot = '/' + repoName + (repoName ? '/' : '');

  // 2. Temporarily inject <base> tag to fix asset loading
  document.write('<base href="' + repoRoot + '">');
  
  // 3. Remove <base> tag after page load to avoid breaking anchors
  window.addEventListener('load', function() {
    var base = document.querySelector('base');
    if (base) base.parentNode.removeChild(base);
  });
}(window.location))
```

**Important Notes**:
- Do not hardcode project name, must calculate dynamically
- Do not keep `<base>` tag after page load
- Do not use other methods (e.g., Webpack publicPath) to replace this script

### 2. Handle 404 Redirect Parameter in Application Entry

**Purpose**: Restore original route from URL parameter

**Implementation Location**: Main component of the application (e.g., React's `App.tsx`, Vue's `App.vue`)

**Implementation Logic**:
```javascript
// React example
useEffect(() => {
  const params = new URLSearchParams(location.search);
  const p = params.get('p');
  if (p) {
    const decodedPath = decodeURIComponent(p);
    // Remove 'p' parameter and replace history state
    navigate(decodedPath, { replace: true });
  }
}, []); // Run only once on mount
```

**Important Notes**:
- Must use `replace: true` to avoid history pollution
- Must decode URL parameter
- Must execute before route initialization

### 3. Handle Anchor Navigation Correctly

**Purpose**: Ensure anchor links (`#section`) within documents work properly

**Implementation Logic**:
```javascript
useEffect(() => {
  if (location.hash) {
    const id = decodeURIComponent(location.hash.slice(1));
    const timer = setTimeout(() => {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 500); // Wait for DOM rendering to complete
    return () => clearTimeout(timer);
  }
}, [location.hash]);
```

**Important Notes**:
- Do not rely on browser's default anchor behavior (because `<base>` tag has been removed)
- Must wait for DOM rendering to complete before scrolling

### 4. Use BrowserRouter Instead of HashRouter

**Purpose**: Provide more user-friendly URL structure

**Implementation Example**:
```javascript
// React Router
<BrowserRouter>
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/:path*" element={<Page />} />
  </Routes>
</BrowserRouter>
```

**Important Notes**:
- Do not use HashRouter (produces URLs like `/#/path`)
- Do not use MemoryRouter (cannot handle browser forward/back)

## Sub-Projects Must Not Do

### 1. Do Not Create Your Own 404.html

**Reason**: The `404.html` in the repository root already handles global 404 redirects

**Wrong Example**:
```
project-a/
├── 404.html          # Do not create this file
├── index.html
└── assets/
```

### 2. Do Not Hardcode Project Path

**Wrong Example**:
```javascript
// Wrong: Hardcoded project name
const BASE_URL = '/project-a/';

// Correct: Dynamic calculation
const repoRoot = '/' + repoName + (repoName ? '/' : '');
```

### 3. Do Not Keep <base> Tag After Page Load

**Wrong Example**:
```javascript
// Wrong: Keep <base> tag
document.write('<base href="/project-a/">');
// No removal logic

// Correct: Remove after load
window.addEventListener('load', function() {
  var base = document.querySelector('base');
  if (base) base.parentNode.removeChild(base);
});
```

### 4. Do Not Use Server-Side Routing Configuration

**Reason**: GitHub Pages does not support custom server configuration

**Wrong Example**:
```javascript
// Wrong: Attempting to configure server routing
// GitHub Pages does not support .htaccess, nginx.conf, etc.
```

### 5. Do Not Ignore Hash in URL Parameters

**Wrong Example**:
```javascript
// Wrong: Only handle path, ignore hash
const p = params.get('p');
if (p) {
  navigate(decodeURIComponent(p)); // Lost #section
}

// Correct: Preserve hash
const p = params.get('p');
if (p) {
  const decodedPath = decodeURIComponent(p);
  // decodedPath contains complete path and hash
  navigate(decodedPath, { replace: true });
}
```

## Implementation Reference for Different Frameworks

### React

```javascript
// App.tsx
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';

const App = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Handle 404 redirect parameter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const p = params.get('p');
    if (p) {
      navigate(decodeURIComponent(p), { replace: true });
    }
  }, []);

  // Handle anchor navigation
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

// Handle 404 redirect parameter
router.beforeEach((to, from, next) => {
  const p = to.query.p;
  if (p) {
    next(decodeURIComponent(p));
  } else {
    next();
  }
});

// Handle anchor navigation
router.afterEach((to) => {
  if (to.hash) {
    setTimeout(() => {
      const element = document.getElementById(to.hash.slice(1));
      if (element) element.scrollIntoView({ behavior: 'smooth' });
    }, 500);
  }
});
```

## Checklist

Before deploying a sub-project, confirm the following:

- [ ] `index.html` contains asset path fix script
- [ ] Asset path fix script dynamically calculates project root
- [ ] Asset path fix script removes `<base>` tag after page load
- [ ] Application entry handles `p` parameter and restores route
- [ ] Use `replace: true` to avoid history pollution
- [ ] Handle anchor navigation correctly
- [ ] Use BrowserRouter instead of HashRouter
- [ ] Do not create your own `404.html`
- [ ] Do not hardcode project path
- [ ] Test direct access to sub-paths (e.g., `/project-a/docs/intro`)
- [ ] Test page refresh
- [ ] Test anchor links (e.g., `/project-a/docs/intro#section`)

## Common Error Troubleshooting

### Issue: 404 After Page Refresh

**Cause**: Not handling `p` parameter correctly

**Solution**: Check if application entry parses and navigates to the value of `p` parameter

### Issue: Asset Loading Failed (404)

**Cause**: Asset path fix script not executed correctly

**Solution**: Check if script is at the very beginning of `<head>` and dynamically calculates project root

### Issue: Anchor Links Not Working

**Cause**: `<base>` tag not removed or anchor handling logic missing

**Solution**: Confirm `<base>` tag is removed after page load and add anchor scrolling logic

### Issue: URL Contains `?p=` Parameter

**Cause**: Application not handling `p` parameter correctly

**Solution**: Check if using `replace: true` to navigate to decoded path

## Related File References

- `github-root/404.html` - Global 404 redirector
- `index.html` - Asset path fix script example
- `App.tsx` - React routing handling example

---

**Important Note**: This specification applies to all sub-projects deployed in GitHub Pages multi-project environment. If you have questions, please refer to existing project implementations or contact the maintainer.
