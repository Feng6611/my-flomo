// 存储所有笔记和标签数据
let allMemos = [];
let tagStats = new Map();
let activeTag = null;

// 新增：分页相关变量
let currentPage = 1;
const PAGE_SIZE = 20;
let filteredMemos = [];

// 修改后的 getMemoTags 函数：如果未找到 .tag 节点，则直接通过正则表达式提取文本中的标签
function getMemoTags(memo) {
    // 如果已经解析过标签，直接返回
    if (memo.dataset.tags) {
        return JSON.parse(memo.dataset.tags);
    }

    const tags = new Set();
    // 先尝试查找 .tag 节点
    const tagSpans = memo.querySelectorAll('.tag');
    
    if (tagSpans.length > 0) {
        tagSpans.forEach(span => {
            const tag = span.textContent.trim().replace(/^#/, '');
            if (tag) {
                tags.add(tag);
                if (tag.includes('/')) {
                    tags.add(tag.split('/')[0]);
                }
            }
        });
    } else {
        // 如果没有 .tag 节点，使用正则匹配
        const regex = /#([^\s#]+)/g;
        let match;
        const text = memo.textContent;
        while ((match = regex.exec(text)) !== null) {
            const tag = match[1].trim();
            if (tag) {
                tags.add(tag);
                if (tag.includes('/')) {
                    tags.add(tag.split('/')[0]);
                }
            }
        }
    }
    
    return Array.from(tags);
}

// 更新标签统计
function updateTagStats(memoTags) {
    tagStats.clear();
    // 使用 Map 来统计标签
    memoTags.flat().forEach(tag => {
        tagStats.set(tag, (tagStats.get(tag) || 0) + 1);
        // 处理父标签
        if (tag.includes('/')) {
            const parentTag = tag.split('/')[0];
            tagStats.set(parentTag, (tagStats.get(parentTag) || 0) + 1);
        }
    });
}

// 修改 renderTagList 函数实现父子标签嵌套和展开/折叠
function renderTagList() {
    // 构建三级标签层级结构，支持 level1、level2、level3（仅支持最多三级），默认全部折叠
    const hierarchy = {};
    tagStats.forEach((count, tag) => {
        const parts = tag.split('/'); // 修改：直接分割，不含前导 "#"
        if (parts.length === 1) {
            if (!hierarchy[tag]) {
                hierarchy[tag] = { tag: tag, count: count, children: [] };
            } else {
                hierarchy[tag].count += count;
            }
        } else if (parts.length === 2) {
            const parentTag = parts[0]; // 父标签为第一个部分
            if (!hierarchy[parentTag]) {
                hierarchy[parentTag] = { tag: parentTag, count: 0, children: [] };
            }
            hierarchy[parentTag].children.push({ tag: tag, count: count, children: [] });
        } else if (parts.length === 3) {
            const parentTag = parts[0];
            const level2Tag = parts[0] + '/' + parts[1];
            if (!hierarchy[parentTag]) {
                hierarchy[parentTag] = { tag: parentTag, count: 0, children: [] };
            }
            let level2Node = hierarchy[parentTag].children.find(child => child.tag === level2Tag);
            if (!level2Node) {
                level2Node = { tag: level2Tag, count: 0, children: [] };
                hierarchy[parentTag].children.push(level2Node);
            }
            level2Node.children.push({ tag: tag, count: count });
        }
    });

    if (filterConfig && filterConfig.tagListOrder === 'asc') {
        Object.values(hierarchy).sort((a, b) => a.count - b.count);
    } else {
        Object.values(hierarchy).sort((a, b) => b.count - a.count);
    }

    // 递归生成每个节点的 HTML 代码
    function generateHTMLForNode(node, level) {
        let displayTag;
        if (level === 1) {
            displayTag = '# ' + node.tag; // 一级标签显示时加上 "# " 带一个空格
        } else if (level === 2) {
            // 仅显示二级内容，例如 "Product/想法" 显示 "想法"
            displayTag = node.tag.replace(/^[^/]+\//, '');
        } else if (level === 3) {
            // 显示三级标签的最后部分
            displayTag = node.tag.replace(/^[^/]+\/[^/]+\//, '');
        } else {
            displayTag = node.tag;
        }
        let arrow = "";
        if (node.children && node.children.length > 0) {
            // 默认折叠时用 ▶ 表示展开
            arrow = `<span class="toggle-arrow">▶</span>`;
        }
        let html = `<div class="tag-item level-${level} ${node.tag === activeTag ? 'active' : ''}" data-tag="${node.tag}">
                        ${displayTag}
                        <span class="count">${node.count}</span>
                        ${arrow}
                    </div>`;
        if (node.children && node.children.length > 0) {
            // 默认子级容器隐藏
            html += `<div class="tag-children" style="display: none;">`;
            node.children.forEach(child => {
                html += generateHTMLForNode(child, level + 1);
            });
            html += `</div>`;
        }
        return html;
    }

    let html = `<div class="tag-item all-tag ${!activeTag ? 'active' : ''}" data-tag="">
                    全部笔记
                    <span class="count">${allMemos.length}</span>
                </div>`;
    Object.values(hierarchy).forEach(parent => {
        html += generateHTMLForNode(parent, 1);
    });
    const tagList = document.getElementById('tag-list');
    tagList.innerHTML = html;

    // 使用事件委托处理标签项点击和展开/折叠逻辑
    tagList.addEventListener('click', (e) => {
        // 如果点击在展开/折叠箭头上，则处理展开折叠逻辑
        if (e.target.classList.contains('toggle-arrow')) {
            e.stopPropagation();
            const parentItem = e.target.closest('.tag-item');
            const childrenContainer = parentItem ? parentItem.nextElementSibling : null;
            if (childrenContainer && childrenContainer.classList.contains('tag-children')) {
                if (childrenContainer.style.display === 'none') {
                    childrenContainer.style.display = 'block';
                    e.target.textContent = '▼';
                } else {
                    childrenContainer.style.display = 'none';
                    e.target.textContent = '▶';
                }
            }
            return;
        }

        // 处理标签项点击
        const tagItem = e.target.closest('.tag-item');
        if (tagItem && tagList.contains(tagItem)) {
            const tag = tagItem.dataset.tag;
            activeTag = tag;
            filterMemosByTag(tag);
            tagList.querySelectorAll('.tag-item').forEach(t => {
                t.classList.toggle('active', t.dataset.tag === tag);
            });
        }
    });
}

// 根据标签筛选笔记
function filterMemosByTag(tag) {
    const content = document.getElementById('content');
    if (!tag) {
        filteredMemos = [...allMemos];
    } else {
        if (filterConfig && filterConfig.tagFilterMode === "exclude") {
            filteredMemos = allMemos.filter(memo => {
                const memoTags = getMemoTags(memo);
                return !memoTags.includes(tag);
            });
        } else {
            filteredMemos = allMemos.filter(memo => {
                const memoTags = getMemoTags(memo);
                return memoTags.includes(tag);
            });
        }
    }
    renderPage(1, true);
    document.getElementById('content').scrollTop = 0;
}

// 修改后的 processContent 函数：采用递归逐个替换文本节点中的 "#xxx" 为可点击的 <span class="tag"> 标签，
// 避免直接 innerHTML.replace 造成 HTML 结构破坏，同时再进行 URL 处理（保持原有逻辑）。
function processContent() {
    const content = document.getElementById('content');

    // 定义一个函数递归遍历节点，将文本节点中匹配 "#xxx" 的部分替换为 <span class="tag"> 标签
    function replaceTags(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent;
            const tagRegex = /#([^\s#]+)/g;
            let match;
            let lastIndex = 0;
            const fragment = document.createDocumentFragment();
            while ((match = tagRegex.exec(text)) !== null) {
                if (match.index > lastIndex) {
                    fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
                }
                const span = document.createElement('span');
                span.className = 'tag';
                span.textContent = '#' + match[1];
                fragment.appendChild(span);
                lastIndex = tagRegex.lastIndex;
            }
            if (lastIndex < text.length) {
                fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
            }
            if (fragment.childNodes.length > 0) {
                node.parentNode.replaceChild(fragment, node);
            }
        } else if (node.nodeType === Node.ELEMENT_NODE && !node.classList.contains('tag')) {
            Array.from(node.childNodes).forEach(child => replaceTags(child));
        }
    }
    
    // 仅在 .memos 容器内处理标签转换
    const memosContainer = content.querySelector('.memos');
    if (memosContainer) {
        replaceTags(memosContainer);
    }

    // 以下保持原有 URL 处理逻辑
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content.innerHTML;
    
    const walk = document.createTreeWalker(
        tempDiv,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    const urlRegex = /https?:\/\/[^\s<]+/g;
    const nodes = [];
    let node;
    while (node = walk.nextNode()) {
        nodes.push(node);
    }
    
    nodes.forEach(textNode => {
        const text = textNode.textContent;
        if (urlRegex.test(text)) {
            const fragment = document.createDocumentFragment();
            let lastIndex = 0;
            urlRegex.lastIndex = 0;
            let match;
            while (match = urlRegex.exec(text)) {
                if (match.index > lastIndex) {
                    fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
                }
                const link = document.createElement('a');
                link.href = match[0];
                link.textContent = match[0];
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                fragment.appendChild(link);
                lastIndex = urlRegex.lastIndex;
            }
            if (lastIndex < text.length) {
                fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
            }
            textNode.parentNode.replaceChild(fragment, textNode);
        }
    });
    
    content.innerHTML = tempDiv.innerHTML;
}

// 在文件顶部（或适当位置）新增 SEO 相关函数
function updateSEOMetadata() {
    if (filterConfig && filterConfig.seo) {
        // 更新页面标题
        document.title = filterConfig.seo.title || document.title;

        // 更新 meta 描述
        let metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) {
            metaDesc = document.createElement('meta');
            metaDesc.name = 'description';
            document.head.appendChild(metaDesc);
        }
        metaDesc.content = filterConfig.seo.description || '';

        // 更新 meta 关键词
        let metaKeywords = document.querySelector('meta[name="keywords"]');
        if (!metaKeywords) {
            metaKeywords = document.createElement('meta');
            metaKeywords.name = 'keywords';
            document.head.appendChild(metaKeywords);
        }
        metaKeywords.content = filterConfig.seo.keywords || '';

        // 设置规范链接
        let linkCanonical = document.querySelector('link[rel="canonical"]');
        if (!linkCanonical) {
            linkCanonical = document.createElement('link');
            linkCanonical.rel = 'canonical';
            document.head.appendChild(linkCanonical);
        }
        linkCanonical.href = filterConfig.seo.canonicalUrl || window.location.href;

        // 更新网站图标
        if (filterConfig.icons) {
            // 更新 favicon
            let favicon = document.querySelector('link[rel="icon"]');
            if (!favicon) {
                favicon = document.createElement('link');
                favicon.rel = 'icon';
                document.head.appendChild(favicon);
            }
            favicon.href = filterConfig.icons.favicon;

            // 更新 Apple Touch Icon
            let touchIcon = document.querySelector('link[rel="apple-touch-icon"]');
            if (!touchIcon) {
                touchIcon = document.createElement('link');
                touchIcon.rel = 'apple-touch-icon';
                document.head.appendChild(touchIcon);
            }
            touchIcon.href = filterConfig.icons.appleTouchIcon;
            if (filterConfig.icons.size) {
                touchIcon.sizes = filterConfig.icons.size;
            }
        }
    }
}

// 新增：分页渲染函数
function renderPage(page, initialLoad = false) {
    currentPage = page;
    const startIndex = (page - 1) * PAGE_SIZE;
    const endIndex = page * PAGE_SIZE;
    
    // 使用 DocumentFragment 减少重排
    const fragment = document.createDocumentFragment();
    const memosToDisplay = filteredMemos.slice(startIndex, endIndex);
    
    memosToDisplay.forEach(memo => {
        fragment.appendChild(memo.cloneNode(true));
    });
    
    const contentEl = document.getElementById('content');
    if (initialLoad) {
        const memosContainer = document.createElement('div');
        memosContainer.className = 'memos';
        memosContainer.appendChild(fragment);
        contentEl.innerHTML = '';
        contentEl.appendChild(memosContainer);
    } else {
        const memosContainer = contentEl.querySelector('.memos');
        memosContainer.appendChild(fragment);
    }
    
    // 延迟处理内容，避免阻塞渲染
    requestAnimationFrame(() => {
        processContent();
    });
}

// 新增：滚动事件处理，滚动到底部时加载下一页
function handleScroll() {
    const { scrollTop, clientHeight, scrollHeight } = document.documentElement;
    if (scrollTop + clientHeight >= scrollHeight - 100) {
        if (currentPage * PAGE_SIZE < filteredMemos.length) {
            renderPage(currentPage + 1);
        }
    }
}

// 修改 loadContent 函数
function loadContent() {
    const refreshBtn = document.getElementById('refresh-btn');
    refreshBtn.classList.add('loading');
    
    // 清空现有内容
    document.getElementById('content').innerHTML = '<div class="loading">加载中...</div>';
    document.getElementById('tag-list').innerHTML = '<div class="loading">加载中...</div>';
    
    // 添加时间戳参数以避免浏览器缓存
    const timestamp = new Date().getTime();
    fetch(`${filterConfig.notesFileUrl}?t=${timestamp}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(html => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // 直接处理文档
            processHtmlDocument(doc);
            refreshBtn.classList.remove('loading');
        })
        .catch(error => {
            console.error('加载失败:', error);
            document.getElementById('content').innerHTML = `
                <div style="color: #ff4444; padding: 20px; text-align: center;">
                    加载失败，请刷新页面重试<br>
                    <small style="color: #666;">${error.message}</small>
                </div>
            `;
            document.getElementById('tag-list').innerHTML = `
                <div style="color: #ff4444; padding: 20px; text-align: center;">
                    加载失败
                </div>
            `;
            refreshBtn.classList.remove('loading');
        });
}

// 新增：处理 HTML 文档的函数
function processHtmlDocument(doc) {
    const memosContainer = doc.querySelector('.memos');
    if (!memosContainer) {
        throw new Error('未找到笔记内容');
    }

    // 一次遍历，完成所有处理
    allMemos = Array.from(memosContainer.querySelectorAll('.memo'))
        .map(memo => {
            // 1. 图片路径修复
            memo.querySelectorAll('img').forEach(img => {
                const src = img.getAttribute('src');
                if (src?.startsWith('file/')) {
                    img.src = 'flomo/' + src;
                }
            });

            // 2. 提取日期（只解析一次）
            const timeElem = memo.querySelector('.time');
            const memoDate = timeElem ? new Date(timeElem.textContent.trim().match(/\d{4}-\d{1,2}-\d{1,2}/)?.[0] || 0) : null;
            memo.dataset.date = memoDate ? memoDate.getTime() : '0';

            // 3. 提取标签（只解析一次）
            const tags = getMemoTags(memo);
            memo.dataset.tags = JSON.stringify(tags);

            return {
                element: memo,
                date: memoDate,
                tags: tags
            };
        })
        // 4. 日期筛选
        .filter(({date}) => {
            if (!filterConfig.minDate) return true;
            const minDate = new Date(filterConfig.minDate);
            return !date || date >= minDate;
        })
        // 5. 标签预过滤
        .filter(({tags}) => {
            if (!filterConfig.defaultTagFilter) return true;
            const hasTag = tags.includes(filterConfig.defaultTagFilter);
            return filterConfig.tagFilterMode === "exclude" ? !hasTag : hasTag;
        });

    // 6. 更新标签统计（使用已解析的标签）
    updateTagStats(allMemos.map(memo => memo.tags));
    
    // 7. 渲染标签列表
    renderTagList();

    // 8. 初始化分页显示
    filteredMemos = allMemos.map(memo => memo.element);
    renderPage(1, true);
}

// 修改刷新功能
function refreshContent() {
    loadContent();
}

// 初始化页面
function init() {
    // 新增：调用SEO优化函数，根据配置文件更新页面的SEO相关meta信息
    updateSEOMetadata();
    
    // 绑定刷新按钮事件
    const refreshBtn = document.getElementById('refresh-btn');
    refreshBtn.addEventListener('click', refreshContent);

    // 使用事件委托处理 memo 内容中的标签点击（这样即使 innerHTML 被更新也无需重复绑定）
    document.getElementById('content').addEventListener('click', function(e) {
        const tagSpan = e.target.closest('.tag');
        if (tagSpan && this.contains(tagSpan)) {
            e.stopPropagation();
            // 修改：去除标签前缀 "#" 保证筛选时一致
            const rawTag = tagSpan.textContent.trim();
            const tag = rawTag.startsWith('#') ? rawTag.substring(1) : rawTag;
            activeTag = tag;
            filterMemosByTag(tag);
            // 同步更新标签列表的选中状态
            document.querySelectorAll('.tag-item').forEach(item => {
                item.classList.toggle('active', item.dataset.tag === tag);
            });
        }
    });

    // 新增：监听页面滚动，实现分页加载
    window.addEventListener('scroll', handleScroll);

    // 首次加载内容
    loadContent();
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init); 