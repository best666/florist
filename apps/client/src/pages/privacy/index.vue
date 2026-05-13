<template>
  <view class="page-shell safe-pb min-h-screen bg-linear-to-b from-[#FFF8F4] via-[#FAF6F2] to-[#FFFDF9]">
    <view class="mx-auto flex max-w-[760rpx] flex-col gap-4 pb-8">
      <view
        class="overflow-hidden rounded-[36rpx] bg-linear-to-br from-[#F5DEE5] via-[#FFF4EB] to-[#E5F3F0] px-5 py-5 shadow-[0_18rpx_54rpx_rgba(232,204,207,0.22)]">
        <view class="badge-soft bg-white/80 text-slate-600">隐私协议</view>
        <view class="mt-3 text-[42rpx] font-900 leading-tight text-slate-800">
          我们默认把你的花园记录当作需要谨慎对待的私人数据
        </view>
        <view class="mt-2 text-sm leading-6 text-slate-600">
          以下内容用于说明本应用在本地数据、网络请求和设备权限方面的基本处理方式。
        </view>
      </view>

      <view class="card-soft rounded-[32rpx] bg-white">
        <text class="block text-base font-800 text-slate-800">1. 本地数据</text>
        <text class="mt-3 block text-sm leading-7 text-slate-600">
          植株、打卡、提醒配置、反馈草稿等核心数据默认保存在本地加密存储中。你也可以手动生成加密备份串，用于自行保存和恢复。
        </text>
      </view>

      <view class="card-soft rounded-[32rpx] bg-white">
        <text class="block text-base font-800 text-slate-800">2. 权限使用</text>
        <text class="mt-3 block text-sm leading-7 text-slate-600">
          定位权限仅用于获取城市和天气提醒；相册和相机权限仅在你主动上传图片、生成海报或反馈截图时触发。未授权时，应用会提供手动选择和本地兜底方案。
        </text>
      </view>

      <view class="card-soft rounded-[32rpx] bg-white">
        <text class="block text-base font-800 text-slate-800">3. 网络与 AI 请求</text>
        <text class="mt-3 block text-sm leading-7 text-slate-600">
          天气、提醒同步和 AI 能力会在你主动使用相关功能时发起网络请求。若网络不可用，应用会优先回退到缓存或本地兜底逻辑，不会强制阻断主要使用流程。
        </text>
      </view>

      <view class="card-soft rounded-[32rpx] bg-white">
        <text class="block text-base font-800 text-slate-800">4. 你的控制权</text>
        <text class="mt-3 block text-sm leading-7 text-slate-600">
          你可以随时在个人中心执行备份、恢复或清空本地数据，也可以打开系统权限设置调整定位、相册和通知相关授权。清空操作不可撤回，请在执行前先做好备份。
        </text>
      </view>
    </view>
  </view>
</template>
