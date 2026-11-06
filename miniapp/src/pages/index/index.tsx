import { Input, Text, View } from '@tarojs/components'
import { redirectTo, useLoad } from '@tarojs/taro'
import { useState } from 'react'
import './index.scss'

export default function Index () {
  const [keyword, setKeyword] = useState('')

  useLoad(() => {
    // 首页数据后续接入商品和类目接口。
  })

  const goLogin = () => redirectTo({ url: '/pages/login/index' })
  const goProfile = () => redirectTo({ url: '/pages/profile/index' })

  return (
    <View className='home-page'>
      <View className='home-header'>
        <View className='brand-lockup'>
          <View className='brand-mark'>源</View>
          <View>
            <Text className='brand-name'>源仓</Text>
            <Text className='brand-caption'>工业品供应链</Text>
          </View>
        </View>
      </View>

      <View className='hero-card'>
        <View className='hero-glow hero-glow-one' />
        <View className='hero-glow hero-glow-two' />
        <View className='hero-copy'>
          <Text className='hero-eyebrow'>SOURCE · SUPPLY · SIMPLE</Text>
          <Text className='hero-title'>找到靠谱的工业好物</Text>
          <Text className='hero-subtitle'>从源头到仓储，让每一次采购更简单</Text>
        </View>
        <View className='search-bar'>
          <Text className='search-icon'>⌕</Text>
          <Input
            className='search-input'
            value={keyword}
            placeholder='搜索产品、品牌或型号'
            placeholderClass='search-placeholder'
            onInput={(event) => setKeyword(event.detail.value)}
          />
          <Text className='search-submit' onClick={() => setKeyword(keyword.trim())}>搜索</Text>
        </View>
      </View>

      <View className='section-block quick-section'>
        <View className='section-heading'>
          <Text className='section-title'>快速找货</Text>
          <Text className='section-more'>全部类目 ›</Text>
        </View>
        <View className='category-grid'>
          <View className='category-item'>
            <View className='category-icon category-icon-blue'>⚙</View>
            <Text>工业设备</Text>
          </View>
          <View className='category-item'>
            <View className='category-icon category-icon-teal'>⌁</View>
            <Text>电子元件</Text>
          </View>
          <View className='category-item'>
            <View className='category-icon category-icon-orange'>⌘</View>
            <Text>五金工具</Text>
          </View>
          <View className='category-item'>
            <View className='category-icon category-icon-purple'>✦</View>
            <Text>劳保用品</Text>
          </View>
        </View>
      </View>

      <View className='trust-strip'>
        <View className='trust-item'>
          <Text className='trust-number'>10,000+</Text>
          <Text className='trust-label'>工业好物</Text>
        </View>
        <View className='trust-divider' />
        <View className='trust-item'>
          <Text className='trust-number'>1,200+</Text>
          <Text className='trust-label'>优质供应商</Text>
        </View>
        <View className='trust-divider' />
        <View className='trust-item'>
          <Text className='trust-number'>24h</Text>
          <Text className='trust-label'>快速响应</Text>
        </View>
      </View>

      <View className='section-block featured-section'>
        <View className='section-heading'>
          <View>
            <Text className='section-title'>今日精选</Text>
            <Text className='section-note'>为你挑选高频工业好物</Text>
          </View>
          <Text className='section-more'>查看全部 ›</Text>
        </View>
        <View className='product-list'>
          <View className='product-card'>
            <View className='product-visual product-visual-blue'>
              <Text className='product-glyph'>◈</Text>
              <Text className='product-badge'>精选</Text>
            </View>
            <Text className='product-name'>智能温控器</Text>
            <Text className='product-meta'>工业自动化 · 稳定控温</Text>
            <Text className='product-price'>登录查看报价</Text>
          </View>
          <View className='product-card'>
            <View className='product-visual product-visual-orange'>
              <Text className='product-glyph'>◎</Text>
              <Text className='product-badge'>热销</Text>
            </View>
            <Text className='product-name'>精密轴承</Text>
            <Text className='product-meta'>机械零件 · 现货供应</Text>
            <Text className='product-price'>登录查看报价</Text>
          </View>
        </View>
      </View>

      <View className='bottom-nav'>
        <View className='nav-item nav-item-active'>
          <Text className='nav-icon'>⌂</Text>
          <Text>首页</Text>
        </View>
        <View className='nav-item' onClick={goLogin}>
          <Text className='nav-icon'>⌕</Text>
          <Text>采购</Text>
        </View>
        <View className='nav-item' onClick={goLogin}>
          <Text className='nav-icon'>▣</Text>
          <Text>订单</Text>
        </View>
        <View className='nav-item' onClick={goProfile}>
          <Text className='nav-icon'>◉</Text>
          <Text>我的</Text>
        </View>
      </View>
    </View>
  )
}
