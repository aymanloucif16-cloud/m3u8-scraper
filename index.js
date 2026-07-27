const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/extract', async (req, res) => {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).json({ success: false, error: 'يرجى تقديم رابط url' });
    }

    try {
        const client = axios.create({
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
                'Referer': targetUrl
            },
            timeout: 10000
        });

        // 1. جلب الصفحة الرئيسية للمشغل
        let response = await client.get(targetUrl);
        let html = response.data;

        // 2. البحث عن رابط m3u8 مباشر
        let m3u8Match = html.match(/(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/i);

        // 3. إذا لم يجد، يبحث عن iframe بداخله رابط مشغل آخر
        if (!m3u8Match) {
            const iframeMatch = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
            if (iframeMatch && iframeMatch[1]) {
                let iframeUrl = iframeMatch[1];
                if (iframeUrl.startsWith('//')) iframeUrl = 'https:' + iframeUrl;
                
                // جلب كود الـ iframe
                const iframeResponse = await client.get(iframeUrl, { headers: { 'Referer': targetUrl } });
                html = iframeResponse.data;
                m3u8Match = html.match(/(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/i);
            }
        }

        if (m3u8Match && m3u8Match[0]) {
            return res.json({
                success: true,
                stream_url: m3u8Match[0]
            });
        } else {
            return res.status(404).json({
                success: false,
                error: 'لم يتم العثور على رابط بث مباشر .m3u8'
            });
        }
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
