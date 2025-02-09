// filterConfig.js
// 筛选配置文件
// minDate: 仅显示该日期之后（含该日期）的 memo
// tagListOrder: "asc" 表示正向排序（计数从低到高），"desc" 表示反向排序（计数从高到低）
// tagFilterMode: "include" 表示正选（只显示包含该 tag 的 memo），"exclude" 表示反选（过滤出不包含该 tag 的 memo）
var filterConfig = {
    minDate: "2024-01-01",
    tagListOrder: "desc",
    tagFilterMode: "include",
    defaultTagFilter: ""
}; 