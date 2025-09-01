# ðŸŽ¨ Clean Format Telegram Notification

Bot Telegram dengan format pesan yang clean dan modern seperti pada gambar referensi, disesuaikan untuk Jest test coverage.

## ðŸ“± Format Pesan Baru

### **Format Clean (Seperti Gambar)**

```
ðŸŸ¢ Script Labs App - Daily Test | 6:26AM

scriptlabsApp/automated-testing
Jest Testing | Jest Testing

- Tests = 179
- Passes = 66
- Skip = 61
- Failures = 49
- Duration = 650494ms
- Passes (%) = 36.87

ðŸ“Š Coverage Summary:
- Statements = 82.27%
- Branches = 72.52%
- Functions = 78.84%
- Lines = 82.30%

ðŸš¨ Status: FAILED - 49 test(s) failed
```

### **Format Detailed (Original)**

```
ðŸ”´ Script Labs App | 6:26AM

ðŸ”´ lab-Catalog-App
Automated | Test Coverage Report

ðŸ“Š Test Results:
- Tests = 179
- Passes = 66
- Skip = 61
- Failures = 49
- Duration = 650494ms
- Passes (%) = 36.87

ðŸ“ˆ Coverage Results:
- Statements = 82.27% (376/457)
- Branches = 72.52% (161/222)
- Functions = 78.84% (41/52)
- Lines = 82.30% (372/452)

ðŸš¨ Status: FAILED - 49 test(s) failed
ðŸŒ¿ Branch: main
â° Time: 2025-07-29T12:26:00.000Z
```

## ðŸš€ Cara Penggunaan

### **1. Format Clean (Recommended)**

```bash
npm run test:coverage        # Clean format (default)
npm run test:coverage:clean  # Explicit clean format
```

### **2. Format Detailed**

```bash
npm run test:coverage:advanced  # Advanced runner with detailed format
```

### **3. Test Format Manual**

```bash
npm run telegram:clean      # Test clean format
npm run telegram:test       # Test original format
```

## ðŸŽ¯ Status Indicators

| Status   | Icon | Kondisi                  |
| -------- | ---- | ------------------------ |
| SUCCESS  | ðŸŸ¢ | Semua test passed        |
| FAILED   | ðŸ”´ | Ada test yang failed     |
| NO TESTS | âšª  | Tidak ada test ditemukan |

## âš™ï¸ Konfigurasi Format

### **Menggunakan Clean Format**

```javascript
// Secara default menggunakan clean format
await notifier.sendNotification(testData, coverageData, options);
```

### **Menggunakan Detailed Format**

```javascript
// Untuk format detailed
await notifier.sendDetailedNotification(testData, coverageData, options);
```

### **Custom Format**

```javascript
// Custom message format
const customMessage = notifier.formatCleanMessage(testData, coverageData, {
  projectName: "Your Project Name",
  branch: "main",
  author: "Your Name",
});
```

## ðŸ“Š Features Format Clean

âœ… **Compact Layout** - Lebih ringkas dan mudah dibaca  
âœ… **Status Icons** - Visual indicator yang jelas  
âœ… **Time Format** - Format waktu yang user-friendly (6:26AM)  
âœ… **Simple Metrics** - Metrics essential tanpa noise  
âœ… **Coverage Summary** - Coverage percentage yang clean  
âœ… **Auto Status** - Status otomatis berdasarkan hasil test

## ðŸ”§ Customization

Anda bisa customize format dengan mengubah method `formatCleanMessage` di `TelegramTestNotifier.js`:

```javascript
formatCleanMessage(testData, coverageData, options = {}) {
  // Customize format sesuai kebutuhan
  const message = `${statusIcon} **${projectName}** | ${timeString}`;
  // ... dst
}
```

Bot sekarang mendukung dua format: **Clean** (default) dan **Detailed**, disesuaikan dengan kebutuhan project Anda! ðŸŽ‰
