import logging
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes

logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

TELEGRAM_TOKEN = '8045153949:AAH836YEkipQVEi1gs-BcsvnPGPQbFc0qgA'

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "Привіт! Я бот для Conflict of Nations.\n\n"
        "⚠️ На жаль, автоматичний парсинг сайту неможливий на безкоштовному сервері.\n\n"
        "Але ви можете:\n"
        "/manual - Відправити дані вручну\n"
        "/help - Допомога"
    )

async def manual(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "📝 Як користуватися:\n\n"
        "1. Відкрийте Conflict of Nations на телефоні\n"
        "2. Зайдіть в Ігри → Пошук\n"
        "3. Скопіюйте інформацію про карти\n"
        "4. Відправте мені текстом\n"
        "5. Я перешлю в групу\n\n"
        "Просто відправте текст після цієї команди!"
    )

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "📖 Інформація:\n\n"
        "Через обмеження безкоштовного хостингу, бот не може автоматично заходити на сайт.\n\n"
        "Рішення:\n"
        "1. Використовуйте /manual щоб відправляти дані вручну\n"
        "2. Або запускайте бота локально на комп'ютері з Selenium"
    )

def main():
    application = Application.builder().token(TELEGRAM_TOKEN).build()
    
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("manual", manual))
    application.add_handler(CommandHandler("help", help_command))
    
    logger.info("🤖 Бот запущено!")
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == '__main__':
    main()
