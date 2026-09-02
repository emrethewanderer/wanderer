# Güvenlik Başlıkları — ELLE Kurulum

> Denetim bulgusu **C8** (2026-09-01): clickjacking koruması repo'da yalnız bir
> yorum satırında yaşıyordu. `_src.html:27` doğru biliyor —
> `frame-ancestors` ve `X-Frame-Options` **`<meta>` ile teslim edilemez**,
> tarayıcılar meta üzerinden geleni yok sayar — ama "hosting katmanında
> verilir" cümlesini karşılayan hiçbir yapılandırma yoktu. Yani sayfa
> iframe'e gömülmeye karşı **korunmuyordu**, yalnız korunuyormuş gibi
> duruyordu.

## Repo'da ne var

`public/_headers` — Netlify ve Cloudflare Pages bu biçimi doğrudan okur.
Vite `public/` içeriğini `dist/`e kopyaladığı için deploy ile birlikte gider.

## Senin yapman gereken (hosting'e göre)

Wanderer'ın hangi katmandan servis edildiğini repo bilmiyor. Aşağıdakilerden
**sana uyanı** uygula ve sonucu bu belgeye not düş.

### Netlify / Cloudflare Pages
Ek iş yok — `public/_headers` yeterli. Deploy sonrası doğrula:

```bash
curl -sI https://<alan-adin> | grep -iE "frame-ancestors|x-frame-options|strict-transport"
```

### Vercel
`vercel.json` gerekir (bu repo'da YOK — hosting Vercel ise eklenmeli):

```json
{
  "headers": [{
    "source": "/(.*)",
    "headers": [
      { "key": "Content-Security-Policy", "value": "frame-ancestors 'none'" },
      { "key": "X-Frame-Options", "value": "DENY" },
      { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains" }
    ]
  }]
}
```

### Nginx
```nginx
add_header Content-Security-Policy "frame-ancestors 'none'" always;
add_header X-Frame-Options "DENY" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### Supabase Storage / başka bir CDN
Başlık desteği yoksa clickjacking koruması **verilemez**. O durumda bunu
bilerek kabul et ve buraya yaz — sessiz bir boşluk bırakma.

## Doğrulama (uygulandıktan sonra)

```bash
curl -sI https://<alan-adin> | grep -i frame
```

`frame-ancestors 'none'` ya da `X-Frame-Options: DENY` görünmüyorsa koruma
YOKTUR. Bu satırı gördüğün gün buraya tarih düş:

- [ ] Uygulandı — tarih: ……… · hosting: ………

## Neden native kabuk etkilenmez

Capacitor kabuğu sayfayı `file://` üzerinden yükler; iframe gömme yüzeyi
yoktur. Bu başlıklar yalnız web dağıtımı içindir.
