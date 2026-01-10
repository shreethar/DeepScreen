import asyncio
import argparse
import sys

# FORCE UTF-8 OUTPUT ON WINDOWS
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

from audit_graph import audit_app, crawler
from utils import save_json_result

async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", type=str, required=True, help="Portfolio URL")
    parser.add_argument("--goal", type=str, default="Full Resume Audit", help="What to look for")
    
    # Handle running without arguments (Dev mode default)
    if len(sys.argv) == 1:
        print("⚠️ No arguments provided. Using default test URL.")
        args = parser.parse_args(["--url", "https://shreethar-portfolio.vercel.app", "--goal", "Full Audit of Profile including education experience"])
    else:
        args = parser.parse_args()

    initial_state = {
        "start_url": args.url,
        "goal": args.goal,
        "url_queue": [],
        "visited_urls": [],
        "current_url": "",
        "profile": {},
        "iteration": 0
    }

    print(f"\n[INFO] Intelligent Crawler Started: {args.url}")

    try:
        # Increase recursion limit to allow deep crawling of multiple pages
        result = await audit_app.ainvoke(initial_state, config={"recursion_limit": 50})
        
        print("\n✅ AUDIT COMPLETE")
        save_json_result(result["profile"], filename_prefix="master_profile")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback; traceback.print_exc()
    finally:
        await crawler.stop()

if __name__ == "__main__":
    asyncio.run(main())