import { Button, Text, View } from '@tarojs/components'
import { redirectTo, showToast } from '@tarojs/taro'
import { useState } from 'react'

import { loginWithWechatPhone } from '../../services/auth'
import './index.scss'

const isWechatMiniProgram = process.env.TARO_ENV === 'weapp'

export default function Login () {
  const [loading, setLoading] = useState(false)

  const handlePhoneLogin = async (event: any) => {
    const detail = event?.detail || {}
    const code = detail.code
    if (!code) {
      const errMsg = typeof detail.errMsg === 'string' ? detail.errMsg : ''
      showToast({
        title: errMsg.includes('auth deny') ? '你已拒绝手机号授权' : '未获取到手机号授权凭证',
        icon: 'none'
      })
      return
    }

    setLoading(true)
    try {
      await loginWithWechatPhone(code)
      showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => redirectTo({ url: '/pages/profile/index' }), 360)
    } catch (error) {
      const message = error instanceof Error ? error.message : '登录失败，请稍后重试'
      showToast({ title: message.slice(0, 24), icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className='login-page'>
      <View className='login-brand'>
        <View className='login-brand-mark'>源</View>
        <Text className='login-brand-name'>源仓</Text>
        <Text className='login-brand-slogan'>连接工业源头，发现可靠供应</Text>
      </View>

      <View className='login-card'>
        <Text className='login-card-title'>微信手机号快捷登录</Text>
        <Text className='login-card-subtitle'>点击按钮后，将弹出微信授权窗口</Text>

        {isWechatMiniProgram ? (
          <Button
            className='login-submit phone-login-button'
            openType='getPhoneNumber'
            onGetPhoneNumber={handlePhoneLogin}
            disabled={loading}
          >
            {loading ? '正在登录…' : '微信手机号快捷登录'}
          </Button>
        ) : (
          <Button
            className='login-submit phone-login-button'
            onClick={() => showToast({ title: '请在微信小程序中使用手机号登录', icon: 'none' })}
          >
            微信小程序快捷登录
          </Button>
        )}

        <Text className='login-footnote'>微信仅用于验证手机号，首次登录将自动创建源仓账号</Text>
      </View>
    </View>
  )
}
