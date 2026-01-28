# Pinhan Box - Docker Deployment Guide

## Render.com'da Docker bilan Deploy qilish

### 1. Render Dashboard'da yangi Web Service yarating

1. **Render.com**ga kiring va **"New +"** tugmasini bosing
2. **"Web Service"** ni tanlang
3. GitHub repository'ni ulang: `borryjack8-coder/pinhan-box`

### 2. Service sozlamalarini to'ldiring

**Basic Settings:**
- **Name**: `pinhan-box` (yoki istalgan nom)
- **Region**: `Frankfurt (EU Central)` yoki yaqin region
- **Branch**: `main`
- **Runtime**: **Docker** ⚠️ (Bu eng muhim!)

**Build & Deploy:**
- **Dockerfile Path**: `./Dockerfile` (default)
- **Docker Command**: (bo'sh qoldiring, Dockerfile'da CMD mavjud)

**Environment Variables:**
```
PORT=3000
MONGO_URI=<MongoDB connection string>
CLOUDINARY_CLOUD_NAME=<your cloud name>
CLOUDINARY_API_KEY=<your api key>
CLOUDINARY_API_SECRET=<your api secret>
MASTER_PIN=<master pin>
ADMIN_USERNAME=<admin username>
ADMIN_PASSWORD=<admin password>
```

**Instance Type:**
- **Free tier**: 512MB RAM (test uchun)
- **Starter**: 2GB RAM (production uchun tavsiya etiladi - Puppeteer uchun)

### 3. Deploy qiling

1. **"Create Web Service"** tugmasini bosing
2. Render avtomatik ravishda Docker image'ni build qiladi (5-10 daqiqa)
3. Deploy tugagach, URL'ni oling

### 4. Tekshirish

**Health Check:**
```
https://your-app.onrender.com/api/health
```

**Admin Panel:**
```
https://your-app.onrender.com
```

## Local'da Docker bilan test qilish

### Build Docker image:
```bash
docker build -t pinhan-box .
```

### Run container:
```bash
docker run -p 3000:3000 \
  -e MONGO_URI="your-mongodb-uri" \
  -e CLOUDINARY_CLOUD_NAME="your-cloud-name" \
  -e CLOUDINARY_API_KEY="your-api-key" \
  -e CLOUDINARY_API_SECRET="your-api-secret" \
  -e MASTER_PIN="1234" \
  -e ADMIN_USERNAME="admin" \
  -e ADMIN_PASSWORD="admin123" \
  pinhan-box
```

### Test:
```
http://localhost:3000
```

## Afzalliklari

✅ **Puppeteer to'liq ishlaydi** - Chrome va barcha dependencies o'rnatilgan
✅ **Consistent environment** - Local va production bir xil
✅ **No buildpack issues** - Barcha dependencies Docker image'da
✅ **Better resource management** - Multi-stage build kichik image yaratadi
✅ **Health checks** - Render avtomatik restart qiladi agar container ishlamasa

## Muammolarni hal qilish

### Agar build xato bersa:
1. Render logs'ni tekshiring
2. `docker build` local'da test qiling
3. `.dockerignore` to'g'ri sozlanganini tekshiring

### Agar Puppeteer ishlamasa:
1. Environment variables to'g'ri o'rnatilganini tekshiring
2. Render instance type'ni Starter'ga o'zgartiring (512MB yetarli bo'lmasligi mumkin)
3. Server logs'da Puppeteer xatolarini qidiring

## Production Checklist

- [ ] Render'da Docker runtime tanlangan
- [ ] Barcha environment variables to'g'ri
- [ ] Instance type: Starter (2GB RAM)
- [ ] Health check ishlayapti
- [ ] Mind-AR generation test qilingan
- [ ] Admin panel ochiladi
- [ ] QR scanner ishlaydi
