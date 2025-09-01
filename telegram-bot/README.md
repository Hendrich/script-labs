# ðŸ¤– Telegram Bot untuk Jest Test Coverage Notifications

Bot Telegram yang mengirim notifikasi hasil test coverage dari Jest dengan format yang clean dan modern.

## ðŸ“± Format Pesan

### **Clean Format (Default)**

```
ðŸŸ¢ Script Labs App | 7:45PM

scriptlabsApp
Automated | Test Coverage Report

- Tests = 337
- Passes = 337
- Skip = 0
- Failures = 0
- Duration = 4521ms
- Passes (%) = 100.00

ðŸ“Š Coverage Summary:
- Statements = 82.27%
- Branches = 72.52%
- Functions = 78.84%
- Lines = 82.30%

âœ… Status: SUCCESS - All tests passed
```

## ðŸš€ Quick Start

### 1. Setup Bot Telegram

1. Chat dengan `@BotFather` di Telegram
2. Buat bot baru: `/newbot`
3. Copy token yang diberikan
4. Kirim pesan ke bot untuk mendapat chat ID

### 2. Environment Setup

Tambahkan ke file `.env`:

```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
GIT_BRANCH=main
GIT_AUTHOR=Your Name
```

### 3. Test & Run

```bash
# Test koneksi bot
npm run telegram:diagnose

# Run tests dengan notifikasi
npm run test:coverage
```

## ðŸ“‹ Available Commands

### **Test Coverage Commands**

```bash
npm run test:coverage        # Clean format (recommended)
npm run test:coverage:clean  # Clean format explicit
npm run test:coverage:advanced # Advanced parsing
npm run test:coverage:simple # Quick execution
```

### **Telegram Commands**

```bash
npm run telegram:test       # Test bot connection
npm run telegram:clean      # Test clean format
npm run telegram:send       # Send manual notification
npm run telegram:diagnose   # Full system check
```

### **Utility Commands**

```bash
node telegram-bot/count-tests.js    # Count actual tests
node telegram-bot/diagnose.js       # System diagnostics
```

## ðŸŽ¯ Status Indicators

| Emoji | Status   | Kondisi                  |
| ----- | -------- | ------------------------ |
| ðŸŸ¢  | SUCCESS  | Semua test passed        |
| ðŸ”´  | FAILED   | Ada test yang failed     |
| âšª   | NO TESTS | Tidak ada test ditemukan |

## ðŸ“Š Features

âœ… **Real Test Count** - Parsing akurat dari Jest output (337 tests detected)  
âœ… **Clean Format** - Format pesan yang modern dan readable  
âœ… **Auto Status** - Status emoji otomatis berdasarkan hasil  
âœ… **Coverage Integration** - Data coverage real dari Jest  
âœ… **Multiple Fallbacks** - Parsing dengan multiple strategies  
âœ… **Environment Config** - Konfigurasi via environment variables  
âœ… **Comprehensive Testing** - Tools untuk debugging dan testing

## ðŸ”§ Troubleshooting

### Bot tidak mengirim pesan

```bash
npm run telegram:diagnose  # Run full diagnostic
```

Common solutions:

- Check environment variables di `.env`
- Pastikan bot sudah di-start (`/start` di Telegram)
- Verify internet connection

### Test count undefined

- File sudah include parsing dengan multiple strategies
- Fallback ke file analysis jika Jest parsing gagal
- Hardcoded fallback untuk emergency cases

### Coverage tidak muncul

```bash
npm run test:coverage  # Generate coverage first
```

## ðŸ“ File Structure

```
telegram-bot/
â”œâ”€â”€ TelegramTestNotifier.js      # Main bot class
â”œâ”€â”€ test-notification.js        # Connection tester
â”œâ”€â”€ send-notification.js        # Manual sender
â”œâ”€â”€ count-tests.js              # Test counter
â”œâ”€â”€ diagnose.js                 # Diagnostic tool
â”œâ”€â”€ jest-clean-notification.js  # Jest integration
â”œâ”€â”€ test-clean-format.js        # Format tester
â””â”€â”€ CLEAN_FORMAT_GUIDE.md       # Format documentation
```

## ðŸŽ¨ Customization

### Change Project Name

Edit `.env`:

```env
GIT_AUTHOR=Your Project Name
```

### Custom Message Format

Edit `formatCleanMessage` method in `TelegramTestNotifier.js`

### Different Format

Use `sendDetailedNotification()` for verbose format

## ðŸ“– API Reference

### TelegramTestNotifier Class

```javascript
const notifier = new TelegramTestNotifier();

// Send clean format
await notifier.sendNotification(testData, coverageData, options);

// Send detailed format
await notifier.sendDetailedNotification(testData, coverageData, options);

// Test connection
await notifier.testConnection();
```

### Data Formats

```javascript
// Test Data
const testData = {
  total: 337,
  passed: 335,
  failed: 2,
  skipped: 0,
  duration: 4521,
  hasErrors: false,
};

// Coverage Data
const coverageData = {
  statements: { pct: 82.27, covered: 376, total: 457 },
  branches: { pct: 72.52, covered: 161, total: 222 },
  functions: { pct: 78.84, covered: 41, total: 52 },
  lines: { pct: 82.3, covered: 372, total: 452 },
};
```

Bot siap digunakan dan akan memberikan notifikasi yang informatif setiap kali test dijalankan! ðŸš€
