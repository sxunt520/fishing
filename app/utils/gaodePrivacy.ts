//是web端才走这个文件gaodePrivacy.ts。当应用运行在 iOS / Android 原生环境 时，打包工具（如 Metro）会优先选择 .native.ts 文件,是走的另一个gaodePrivacy.native.ts里的ensureGaodePrivacyAndSdk()
export function ensureGaodePrivacyAndSdk() {
  return Promise.resolve();//在 Web 环境中，直接返回一个已解决的 Promise，因为高德地图 SDK 的隐私配置和初始化不适用于 Web。
}
