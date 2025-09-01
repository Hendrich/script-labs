# ðŸ“– Swagger UI Documentation Guide

## Akses Swagger UI

Setelah server berjalan, dokumentasi API interaktif tersedia di:

### ðŸŒ URL Swagger UI

```
http://localhost:3000/api-docs
```

### ðŸš€ Cara Menggunakan

1. **Jalankan Server**

   ```bash
   npm start
   # atau untuk development
   npm run dev
   ```

2. **Buka Browser**

   - Navigasi ke: `http://localhost:3000/api-docs`
   - Anda akan melihat dokumentasi API interaktif

3. **Testing API dengan Swagger UI**
   - Klik endpoint yang ingin ditest
   - Klik tombol "Try it out"
   - Isi parameter yang diperlukan
   - Klik "Execute" untuk menjalankan request

### ðŸ” Authentication

1. **Untuk endpoint yang memerlukan authentication:**

   - Pertama login melalui `/api/auth/login`
   - Copy token dari response
   - Klik tombol "Authorize" di bagian atas Swagger UI
   - Masukkan token dengan format: `Bearer YOUR_TOKEN_HERE`
   - Klik "Authorize"

2. **Testing Flow:**
   ```
   1. POST /api/auth/register (buat akun baru)
   2. POST /api/auth/login (dapatkan token)
   3. Authorize dengan token
   4. Test endpoint labs (GET, POST, PUT, DELETE)
   ```

### âœ¨ Fitur Swagger UI

- **Interactive Testing**: Test API langsung dari browser
- **Request/Response Examples**: Lihat contoh request dan response
- **Schema Documentation**: Detail struktur data
- **Authentication Support**: Built-in auth untuk testing
- **Export Options**: Download OpenAPI spec

### ðŸ”— URL Lainnya

- **Frontend**: `http://localhost:3000`
- **Health Check**: `http://localhost:3000/health`
- **API Stats** (dev only): `http://localhost:3000/api/stats`

### ðŸ“ Tips

1. **Bookmark URL**: Simpan `http://localhost:3000/api-docs` untuk akses cepat
2. **Testing Authentication**: Selalu test login dulu sebelum endpoint lain
3. **Response Codes**: Perhatikan HTTP status codes untuk debugging
4. **Schema Validation**: Gunakan examples untuk format data yang benar

---

**File ini menggantikan kebutuhan Postman Collection - semua testing API bisa dilakukan melalui Swagger UI yang lebih interaktif dan terintegrasi!**


