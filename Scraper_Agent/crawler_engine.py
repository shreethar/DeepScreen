import asyncio
import aiohttp
from typing import List, Dict
from urllib.parse import urljoin, urlparse
from playwright.async_api import async_playwright, Page
try:
    from playwright_stealth.stealth import stealth_async
except ImportError:
    async def stealth_async(page): pass
import html2text
from utils import log_step

class CrawlerEngine:
    def __init__(self):
        self.playwright = None
        self.browser = None
        self.context = None
        self.page: Page = None
        self.converter = html2text.HTML2Text()
        self.converter.ignore_links = False
        self.converter.ignore_images = True
        self.converter.ignore_emphasis = True
        self.converter.body_width = 0 

    async def start(self, headless: bool = False):
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(
            headless=headless,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox"]
        )
        self.context = await self.browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        )
        self.page = await self.context.new_page()
        await stealth_async(self.page)

    async def stop(self):
        if self.context: await self.context.close()
        if self.browser: await self.browser.close()
        if self.playwright: await self.playwright.stop()

    async def visit(self, url: str):
        """Robust navigation waiting for network idle (Critical for SPAs)."""
        log_step("NAV", f"Teleporting to: {url}")
        try:
            # CHANGE: networkidle ensures React/Next.js has finished hydrating
            await self.page.goto(url, wait_until="networkidle", timeout=20000)
            await asyncio.sleep(2) 
        except Exception as e:
            log_step("WARN", f"Network idle timeout, but continuing: {e}")

    async def extract_links(self, base_url: str) -> List[Dict]:
        """
        Extracts all navigation links using Playwright locators (pierces Shadow DOM).
        """
        # CHANGE: Use Locator instead of Evaluate to find links inside Components
        # We grab <a> tags and elements with role="link"
        anchors = await self.page.locator("a, [role='link']").all()
        
        cleaned_links = []
        seen_urls = set()
        
        log_step("CRAWL", f"Scanning {len(anchors)} potential elements...")

        for anchor in anchors:
            try:
                # Get visible text and href safely
                if not await anchor.is_visible():
                    continue
                    
                text = await anchor.inner_text()
                href = await anchor.get_attribute("href")
                
                if not href or not text:
                    continue
                    
                text = text.strip()
                if len(text) == 0:
                    continue

                # Handle Hash Links (Single Page Scroll)
                full_url = urljoin(base_url, href)
                
                # Filter Logic
                if "mailto:" in href or "tel:" in href:
                    continue
                
                # For portfolios, we WANT internal hash links like #projects
                # But we ensure we don't duplicate
                if full_url not in seen_urls:
                    seen_urls.add(full_url)
                    cleaned_links.append({"text": text, "href": full_url})
            except:
                continue
                
        log_step("CRAWL", f"Found {len(cleaned_links)} valid links: {[l['text'] for l in cleaned_links[:5]]}...")
        return cleaned_links

    async def scroll_to_bottom(self):
        """
        Hard-coded scroll loop to trigger lazy loading.
        """
        log_step("ACT", "Scrolling to capture all content...")
        try:
            previous_height = await self.page.evaluate("document.body.scrollHeight")
            for _ in range(5): # Limit scroll attempts
                await self.page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                await asyncio.sleep(1)
                new_height = await self.page.evaluate("document.body.scrollHeight")
                if new_height == previous_height:
                    break
                previous_height = new_height
        except:
            pass

    async def get_page_markdown(self) -> str:
        # Heuristic: If we see a 'readme' container (common in GitHub/GitLab), prefer that
        readme_loc = self.page.locator("article.markdown-body")
        if await readme_loc.count() > 0:
             # It's a GitHub/GitLab repo page
            html = await readme_loc.inner_html()
            return self.converter.handle(html)
        
        # Fallback: Whole page
        html = await self.page.content()
        res = self.converter.handle(html)
        log_step("TRACE", f"PLAYWRIGHT Capture (Full) | Len: {len(res)} | Preview: {res[:50].replace(chr(10), ' ')}...")
        return res

    async def fast_fetch(self, url: str) -> str:
        """
        Lightweight fetch for raw files or simple pages, bypassing Playwright.
        """
        log_step("FAST", f"Direct fetching: {url}")
    async def fast_fetch(self, url: str) -> str:
        """
        Lightweight fetch for raw files or simple pages, bypassing Playwright.
        """
        log_step("TRACE", f"Attempting FAST fetch for: {url}")
        
        target_url = url
        # FIX: GitHub blob URLs return HTML. We need RAW content.
        if "github.com" in url and "/blob/" in url:
            target_url = url.replace("/blob/", "/raw/")
            log_step("TRACE", f"Converted to RAW GitHub link: {target_url}")

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(target_url, timeout=10) as response:
                    if response.status == 200:
                        text = await response.text()
                        # STRICT MATCH ONLY
                        if url.endswith(('.py', '.js', '.ts', '.tsx', '.json', '.md', '.txt', '.go', '.rs', '.java', '.cpp', '.h')):
                            log_step("TRACE", f"FAST Success: {url} | Len: {len(text)}")
                            return text
                        
                        log_step("TRACE", f"FAST Skip (Not code): {url}")
                        return ""
                    else:
                        log_step("TRACE", f"FAST Failed Status {response.status}: {url}")
        except Exception as e:
            log_step("WARN", f"Fast fetch failed for {url}: {e}")
            return ""
        return ""