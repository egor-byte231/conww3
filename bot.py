import logging
import asyncio
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes
from playwright.async_api import async_playwright

logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

TELEGRAM_TOKEN = '8045153949:AAH836YEkipQVEi1gs-BcsvnPGPQbFc0qgA'

async def get_maps_from_website(status_callback=None):
    """Отримує список карт через playwright"""
    async def send_status(text):
        if status_callback:
            await status_callback(text)
    
    try:
        await send_status("⏳ Запускаю браузер...")
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
            )
            
            await send_status("✅ Браузер запущено\n⏳ Відкриваю conflictnations.com...")
            
            context = await browser.new_context(
                viewport={'width': 412, 'height': 915},
                user_agent='Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36'
            )
            
            page = await context.new_page()
            await page.goto('https://www.conflictnations.com/', wait_until='networkidle', timeout=30000)
            
            await send_status("✅ Сайт відкрито\n⏳ Чекаю завантаження...")
            await asyncio.sleep(3)
            
            await send_status("⏳ Шукаю кнопку 'Ігри'...")
            try:
                games_btn = await page.wait_for_selector("text=/Ігри|Games/i", timeout=10000)
                if games_btn:
                    await send_status("✅ Знайшов 'Ігри'\n⏳ Клікаю...")
                    await games_btn.click()
                    await asyncio.sleep(2)
            except:
                await send_status("⚠️ Не знайшов кнопку 'Ігри'")
            
            await send_status("⏳ Шукаю вкладку 'ПОШУК'...")
            try:
                search_btn = await page.wait_for_selector("text=/ПОШУК|SEARCH/i", timeout=10000)
                if search_btn:
                    await send_status("✅ Знайшов 'ПОШУК'\n⏳ Клікаю...")
                    await search_btn.click()
                    await asyncio.sleep(3)
            except:
                await send_status("⚠️ Не знайшов 'ПОШУК'")
            
            await send_status("⏳ Збираю дані про карти...")
            body_text = await page.inner_text('body')
            
            lines = body_text.split('\n')
            maps_info = []
            current_map = {}
            
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                
                if any(keyword in line.upper() for keyword in ['СВІТОВА', 'АПОКАЛІПСИС', 'ТОЧКА', 'БЕЗ МЕЖ', 'ПОТІК', 'НОВІТНІЙ', 'ГАРЯЧА']):
                    if current_map:
                        maps_info.append(current_map)
                    current_map = {'name': line}
                elif '#' in line or 'ID' in line.upper():
                    if current_map:
                        current_map['id'] = line
                elif '/' in line and any(char.isdigit() for char in line):
                    if current_map and 'players' not in current_map:
                        current_map['players'] = line
            
            if current_map:
                maps_info.append(current_map)
            
            await send_status(f"✅ Знайдено {len(maps_info)} карт\n⏳ Закриваю браузер...")
            await browser.close()
            
            result = []
            for map_data in maps_info[:20]:
                info = f"🎮 {map_data.get('name', 'Невідома карта')}"
                if 'id' in map_data:
                    info += f"\n   {map_data['id']}"
                if 'players' in map_data:
                    info += f"\n   👥 {map_data['players']}"
                result.append(info)
            
            if not result:
                relevant_lines = [l for l in lines if '#' in l]
                result = relevant_lines[:15] if relevant_lines else ["Карти не знайдено"]
            
            await send_status("✅ Готово!")
            return result
            
    except Exception as e:
        logger.error(f"Помилка: {e}")
        return [f"❌ Помилка: {str(e)}"]

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "Привіт! Я бот для перевірки карт Conflict of Nations.\n\n"
        "Команди:\n"
        "/check - Перевірити доступні карти\n"
        "/help - Допомога"
    )

async def check_maps(update: Update, context: ContextTypes.DEFAULT_TYPE):
    status_message = await update.message.reply_text("🔍 Починаю перевірку...")
    
    async def update_status(text):
        try:
            await status_message.edit_text(f"🔍 Перевірка:\n\n{text}")
        except:
            pass
    
    maps = await get_maps_from_website(status_callback=update_status)
    
    message = "📋 Доступні карти:\n\n"
    for map_info in maps:
        message += f"{map_info}\n\n"
        if len(message) > 3500:
            await update.message.reply_text(message)
            message = ""
    
    if message:
        await update.message.reply_text(message)

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "📖 Команди:\n"
        "/check - Перевірити карти\n"
        "/help - Допомога"
    )

def main():
    application = Application.builder().token(TELEGRAM_TOKEN).build()
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("check", check_maps))
    application.add_handler(CommandHandler("help", help_command))
    
    logger.info("🤖 Бот запущено!")
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == '__main__':
    main()
