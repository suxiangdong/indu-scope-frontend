import { Button, Text, View } from '@tarojs/components'
import { redirectTo, showToast, useDidShow } from '@tarojs/taro'
import { useCallback, useState } from 'react'

import {
  AuthUser,
  clearAccessToken,
  currentUser,
  currentVerification,
  getAccessToken,
  logout,
  VerificationData
} from '../../services/auth'
import './index.scss'

function maskPhone(phone: string) {
  if (!phone) return '已完成微信手机号授权'
  if (phone.length < 7) return phone
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`
}

export default function Profile () {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [verification, setVerification] = useState<VerificationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [logoutLoading, setLogoutLoading] = useState(false)

  const loadUser = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null)
      setVerification(null)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const nextUser = await currentUser()
      setUser(nextUser)

      // The verification endpoint is the source of truth for the status shown
      // on this page. Keep a successful user lookup visible if this secondary
      // request is temporarily unavailable.
      try {
        setVerification(await currentVerification())
      } catch {
        setVerification(null)
      }
    } catch {
      // A token can expire while the page is open. Clear it so the next
      // authorization tap starts a fresh wx.login flow.
      clearAccessToken()
      setUser(null)
      setVerification(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useDidShow(() => {
    void loadUser()
  })

  const goHome = () => redirectTo({ url: '/pages/index/index' })
  const goLogin = () => redirectTo({ url: '/pages/login/index' })
  const goVerification = () => user
    ? redirectTo({ url: '/pages/verification/index' })
    : goLogin()
  const goCreateProduct = () => user
    ? redirectTo({ url: '/pages/products/create/index' })
    : goLogin()
  const rolePending = user?.role === 0
  const verificationStatus = verification?.status || (user?.status === 1 ? 'verified' : 'unsubmitted')
  const verificationStatusLabel = rolePending
    ? '完善资料'
    : verificationStatus === 'verified'
    ? '已认证'
    : verificationStatus === 'pending'
      ? '审核中'
      : verificationStatus === 'rejected'
        ? '重新认证'
      : '完善资料'

  const handleLogout = async () => {
    if (logoutLoading) return
    setLogoutLoading(true)
    try {
      await logout()
      setUser(null)
      setVerification(null)
      showToast({ title: '已退出登录', icon: 'success' })
    } catch {
      setUser(null)
      setVerification(null)
      showToast({ title: '已清除本地登录状态', icon: 'none' })
    } finally {
      setLogoutLoading(false)
    }
  }

  return (
    <View className='profile-page'>
      <View className='profile-header'>
        <Text className='profile-eyebrow'>SOURCE · MY SPACE</Text>
        <Text className='profile-title'>我的</Text>
        <Text className='profile-subtitle'>管理你的源仓采购服务</Text>
      </View>

      <View className='profile-user-card'>
        {loading ? (
          <Text className='profile-status'>正在加载登录状态…</Text>
        ) : user ? (
          <>
            <View className='profile-avatar'>源</View>
            <View className='profile-user-copy'>
              <Text className='profile-user-name'>源仓用户</Text>
              <Text className='profile-user-phone'>{maskPhone(user.phone)}</Text>
            </View>
            {verificationStatus !== 'verified' ? (
              <Button className='profile-verify-button' onClick={goVerification}>{verificationStatusLabel}</Button>
            ) : (
              <Text className='profile-user-badge'>已认证</Text>
            )}
          </>
        ) : (
          <>
            <View className='profile-avatar profile-avatar-guest'>◉</View>
            <View className='profile-user-copy'>
              <Text className='profile-user-name'>登录源仓</Text>
              <Text className='profile-user-phone'>授权后查看订单与专属报价</Text>
            </View>
            <Button className='profile-login-button' onClick={goLogin}>授权登录</Button>
          </>
        )}
      </View>

      <View className='profile-section'>
        <Text className='profile-section-title'>我的服务</Text>
        <View className='profile-menu-list'>
          <View className='profile-menu-item'>
            <View className='profile-menu-icon profile-menu-icon-orange'>▣</View>
            <View className='profile-menu-copy'>
              <Text className='profile-menu-title'>我的订单</Text>
              <Text className='profile-menu-subtitle'>查看采购进度与历史订单</Text>
            </View>
            <Text className='profile-menu-arrow'>›</Text>
          </View>
          <View className='profile-menu-item'>
            <View className='profile-menu-icon profile-menu-icon-teal'>♡</View>
            <View className='profile-menu-copy'>
              <Text className='profile-menu-title'>收藏商品</Text>
              <Text className='profile-menu-subtitle'>保存关注的工业好物</Text>
            </View>
            <Text className='profile-menu-arrow'>›</Text>
          </View>
          <View className='profile-menu-item'>
            <View className='profile-menu-icon profile-menu-icon-blue'>⌁</View>
            <View className='profile-menu-copy'>
              <Text className='profile-menu-title'>专属报价</Text>
              <Text className='profile-menu-subtitle'>登录后获取更精准的采购服务</Text>
            </View>
            <Text className='profile-menu-arrow'>›</Text>
          </View>
          {user?.role === 2 && (
            <View className='profile-menu-item' onClick={goCreateProduct}>
              <View className='profile-menu-icon profile-menu-icon-orange'>＋</View>
              <View className='profile-menu-copy'>
                <Text className='profile-menu-title'>发布产品</Text>
                <Text className='profile-menu-subtitle'>录入产品信息并提交供货商品</Text>
              </View>
              <Text className='profile-menu-arrow'>›</Text>
            </View>
          )}
          <View className='profile-menu-item' onClick={goVerification}>
            <View className='profile-menu-icon profile-menu-icon-blue'>✓</View>
            <View className='profile-menu-copy'>
              <Text className='profile-menu-title'>完善资料</Text>
              <Text className='profile-menu-subtitle'>
                {rolePending
                  ? '选择采购方或供货方，并完成认证资料'
                  : verificationStatus === 'verified'
                  ? '认证已完成'
                  : verificationStatus === 'pending'
                    ? '认证资料审核中'
                    : verificationStatus === 'rejected'
                      ? `认证被驳回：${verification?.review_reason || '请修改资料后重新提交'}`
                    : '完成认证后使用完整采购服务'}
              </Text>
            </View>
            <Text className='profile-menu-arrow'>›</Text>
          </View>
        </View>
      </View>

      {user && (
        <Button
          className='profile-logout-button'
          onClick={handleLogout}
          disabled={logoutLoading}
        >
          {logoutLoading ? '正在退出…' : '退出登录'}
        </Button>
      )}

      <View className='profile-bottom-nav'>
        <View className='profile-nav-item' onClick={goHome}>
          <Text className='profile-nav-icon'>⌂</Text>
          <Text>首页</Text>
        </View>
        <View className='profile-nav-item' onClick={goLogin}>
          <Text className='profile-nav-icon'>⌕</Text>
          <Text>采购</Text>
        </View>
        <View className='profile-nav-item' onClick={goLogin}>
          <Text className='profile-nav-icon'>▣</Text>
          <Text>订单</Text>
        </View>
        <View className='profile-nav-item profile-nav-item-active'>
          <Text className='profile-nav-icon'>◉</Text>
          <Text>我的</Text>
        </View>
      </View>
    </View>
  )
}
