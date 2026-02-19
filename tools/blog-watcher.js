#!/usr/bin/env bun
/**
 * ブログ監視ツール
 * 指定されたブログの新着記事を検出する
 */

import { fetch } from "bun";

const BLOGS = [
  { name: "sakasegawaさんのブログ", url: "https://nyosegawa.github.io/", type: "jekyll" },
  { name: "nikechanのブログ", url: "https://nikechan.com/dev_blog", type: "nikechan" },
  { name: "ブヒ夫のポートフォリオ", url: "https://niku.studio/work/", type: "portfolio" }
];
const STATE_FILE = "memory/blog-state.json";

// Jina Reader APIを使ってHTMLをテキスト化
async function fetchBlogContent(url) {
  const jinaUrl = `https://r.jina.ai/${url}`;
  try {
    const response = await fetch(jinaUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    console.error(`Error fetching blog: ${error.message}`);
    return null;
  }
}

// Jekyllブログから記事を抽出（/posts/を含むリンク）
function extractJekyllArticles(content) {
  if (!content) return [];
  
  const articles = [];
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  
  while ((match = linkRegex.exec(content)) !== null) {
    const title = match[1].trim();
    const url = match[2];
    
    if (url && url.includes("/posts/")) {
      if (title && title.length > 1 && !title.match(/^[→#\-\*]+$/)) {
        articles.push({ title, url });
      }
    }
  }
  
  const seen = new Set();
  return articles.filter(a => {
    if (seen.has(a.url)) return false;
    seen.add(a.url);
    return true;
  });
}

// nikechan.comから記事を抽出（Lightpanda使用）
async function extractNikechanArticles(blogUrl) {
  const puppeteer = require('puppeteer-core');
  
  try {
    const browser = await puppeteer.connect({
      browserURL: 'http://localhost:9222'
    });
    
    const page = await browser.newPage();
    
    await page.goto(blogUrl, { waitUntil: 'networkidle0', timeout: 30000 });
    
    const articles = await page.evaluate(() => {
      const links = document.querySelectorAll('.article-list > a');
      return Array.from(links).map(link => ({
        title: link.textContent.trim().replace(/\s+/g, ' '),
        url: link.href
      }));
    });
    
    await page.close();
    
    return articles;
  } catch (error) {
    console.error(`  Lightpandaエラー: ${error.message}`);
    return [];
  }
}

// ポートフォリオサイトから作品を抽出（Lightpanda使用）
async function extractPortfolioWorks(portfolioUrl) {
  const puppeteer = require('puppeteer-core');
  
  try {
    const browser = await puppeteer.connect({
      browserURL: 'http://localhost:9222'
    });
    
    const page = await browser.newPage();
    
    await page.goto(portfolioUrl, { waitUntil: 'networkidle0', timeout: 30000 });
    
    const works = await page.evaluate(() => {
      const allLinks = document.querySelectorAll('a');
      const uniqueUrls = new Set();
      const results = [];
      
      allLinks.forEach(link => {
        const href = link.href;
        // niku.studio内の作品ページ（/work/以外、トップ以外、固定ページ以外）
        if (href && 
            href.includes('niku.studio/') && 
            !href.includes('/work/') && 
            href !== 'https://niku.studio/' &&
            !href.includes('/about/') &&
            !href.includes('/mira/') &&
            !href.includes('x.com') &&
            !href.includes('youtube') &&
            !href.includes('github') &&
            !href.includes('pixiv')) {
          
          if (!uniqueUrls.has(href)) {
            uniqueUrls.add(href);
            results.push({
              title: link.textContent.trim().replace(/\s+/g, ' ').slice(0, 100) || '(タイトルなし)',
              url: href
            });
          }
        }
      });
      
      return results;
    });
    
    await page.close();
    
    return works;
  } catch (error) {
    console.error(`  Lightpandaエラー: ${error.message}`);
    return [];
  }
}

// 前回の状態を読み込み
async function loadState() {
  try {
    const file = Bun.file(STATE_FILE);
    if (await file.exists()) {
      return await file.json();
    }
  } catch (error) {
    console.error(`Error loading state: ${error.message}`);
  }
  return { blogs: {}, lastCheck: null };
}

// 状態を保存
async function saveState(state) {
  try {
    await Bun.write(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error(`Error saving state: ${error.message}`);
  }
}

// メイン処理
async function main() {
  console.log("ブログ監視開始");
  
  const state = await loadState();
  const allNewArticles = [];
  const newState = { blogs: {}, lastCheck: new Date().toISOString() };
  
  for (const blog of BLOGS) {
    console.log(`\n📌 ${blog.name} (${blog.url})`);
    
    let currentArticles = [];
    
    if (blog.type === "nikechan") {
      // nikechan.comはLightpandaで取得
      currentArticles = await extractNikechanArticles(blog.url);
    } else if (blog.type === "portfolio") {
      // ポートフォリオサイトはLightpandaで取得
      currentArticles = await extractPortfolioWorks(blog.url);
    } else {
      // JekyllブログはJina Reader APIで取得
      const content = await fetchBlogContent(blog.url);
      if (!content) {
        console.log("  コンテンツ取得失敗");
        newState.blogs[blog.url] = state.blogs?.[blog.url] || [];
        continue;
      }
      currentArticles = extractJekyllArticles(content);
    }
    
    console.log(`  検出記事数: ${currentArticles.length}`);
    
    const previousUrls = new Set((state.blogs?.[blog.url] || []).map(a => a.url));
    const newArticles = currentArticles.filter(a => !previousUrls.has(a.url));
    
    if (newArticles.length > 0) {
      console.log(`  🎉 新着記事が${newArticles.length}件見つかりました！`);
      newArticles.slice(0, 5).forEach((article, i) => {
        console.log(`  ${i + 1}. ${article.title}`);
        console.log(`     ${article.url}`);
      });
      if (newArticles.length > 5) {
        console.log(`  ...他 ${newArticles.length - 5} 件`);
      }
      allNewArticles.push(...newArticles.map(a => ({ ...a, blogName: blog.name })));
    } else {
      console.log("  新着記事はありません");
    }
    
    newState.blogs[blog.url] = currentArticles;
  }
  
  await saveState(newState);
  
  console.log("\n=== サマリー ===");
  if (allNewArticles.length > 0) {
    console.log(`新着記事合計: ${allNewArticles.length}件`);
  } else {
    console.log("新着記事はありません");
  }
}

main();
