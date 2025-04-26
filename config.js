// config.js - 全局配置
var filterConfig = {
    // 基础配置
    minDate:"2024-01-01",         // 仅显示该日期之后的memo
    tagListOrder:"desc",          // 标签排序：asc(从低到高)、desc(从高到低)
    tagFilterMode:"include",      // 标签筛选：include(包含)、exclude(排除)
    defaultTagFilter:"",          // 默认标签筛选
    notesFileUrl:"flomo/Chen的笔记.html",

    // 图标配置
    icons:{
        favicon:"assets/images/icon.png",
        size:"180x180"
    },

    // SEO配置
    seo:{
        title:"Open your flomo",
        description:"思想是可以被公开的 - 让知识和想法自由流动",
        keywords:"flomo,笔记,公开,想法,知识管理,笔记分享,个人知识库,思维导图,标签管理,数字花园,第二大脑,知识整理,学习笔记,灵感收集",
        canonicalUrl:"flomo.kkuk.dev"
    },

    version:new Date().getTime()  // 版本控制，使用时间戳
}; 