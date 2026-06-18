export const meta = {
    name: 'package-apk',
    description: '将 kids-phone-control PWA 打包为 Android APK — 检查线上版本、提交 pwabuilder、获取APK下载链接',
    phases: [
        { title: '校验线上版本', detail: '确认 GitHub Pages 已部署最新代码' },
        { title: '触发PWABuilder', detail: '提交URL到pwabuilder.com生成APK' }
    ],
};

const SITE_URL = 'https://dahai1.github.io/kids-phone-control/';
const PWABUILDER_URL = 'https://pwabuilder.com/?url=' + encodeURIComponent(SITE_URL);

phase('校验线上版本');

// 检查GitHub Pages是否可访问
const pagesCheck = await agent(
    `Fetch ${SITE_URL} and verify: 1) the page loads successfully (HTTP 200), 2) it contains "儿童手机管控" in the title, 3) there are no obvious errors. Report status.`,
    { label: '校验线上版本', phase: '校验线上版本' }
);

phase('触发PWABuilder');

const result = await agent(
    `You are processing PWA-to-APK packaging.

The PWA site URL is: ${SITE_URL}

The PWABuilder packaging link is: ${PWABUILDER_URL}

Instructions for the user:
1. Open this link in a browser: ${PWABUILDER_URL}
2. PWABuilder will automatically detect the PWA manifest and service worker
3. Click "Package for Stores" button
4. Select "Android" platform
5. Download the generated APK file
6. Transfer APK to phone and install
7. After installation, go to Settings → Apps → "儿童管控" → enable:
   - Background running (allow)
   - Floating window permission (allow)
   - Battery optimization (don't optimize)

Provide a clear step-by-step with the pre-filled PWABuilder link as the primary action item.
Also provide the direct download link pattern: after packaging, the APK will be available from pwabuilder's download page.

Additionally, note: if the user has the APK already generated previously, they can skip PWABuilder and just re-install the existing APK — the PWA will always load the latest version from GitHub Pages on launch.`,
    { label: '生成打包指令', phase: '触发PWABuilder' }
);

return {
    siteUrl: SITE_URL,
    pwabuilderUrl: PWABUILDER_URL,
    pagesCheck,
    result
};