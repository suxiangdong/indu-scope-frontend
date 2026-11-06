import {
  getStorageSync,
  login as wechatLogin,
  removeStorageSync,
  request,
  setStorageSync,
  uploadFile
} from '@tarojs/taro'

export const ACCESS_TOKEN_KEY = 'yuan_cang_access_token'

type ApiEnvelope<T> = {
  code: number
  message: string
  data: T
}

export type AuthUser = {
  id: number
  phone: string
  role: number
  user_type: number
  status: number
}

export type AuthData = {
  access_token: string
  token_type: string
  user: AuthUser
}

export type PersonalVerification = {
  real_name: string
  id_number?: string
  id_number_masked?: string
  store_platform_id?: number
  store_platform_name?: string
  store_url?: string
  id_front_endpoint?: string
  id_front_bucket?: string
  id_front_path?: string
  id_back_endpoint?: string
  id_back_bucket?: string
  id_back_path?: string
  verified_at?: string
}

export type CompanyVerification = {
  company_name: string
  unified_social_credit_code: string
  business_license_endpoint?: string
  business_license_bucket?: string
  business_license_path?: string
  business_license_file_name?: string
  business_license_file_size?: number
  business_license_content_type?: string
  registered_address: string
  introduction?: string
  offices?: string[]
  factories?: string[]
  contacts?: CompanyContact[]
  verified_at?: string
}

export type CompanyContact = {
  name: string
  position?: string
  phone: string
}

export type VerificationData = {
  role: number
  user_type: number
  status: 'unsubmitted' | 'pending' | 'rejected' | 'verified' | string
  review_reason?: string
  personal?: PersonalVerification
  company?: CompanyVerification
}

export type StorePlatform = {
  id: number
  name: string
}

export type BusinessLicenseUpload = {
  endpoint: string
  bucket: string
  path: string
  filename: string
  content_type: string
  size: number
}

export type IDCardUpload = {
  side: 'front' | 'back'
  endpoint: string
  bucket: string
  path: string
  filename: string
  content_type: string
  size: number
}

// Taro inlines this public variable during the build. Do not guard it with
// `typeof process`: the WeChat runtime does not expose Node's `process`, and
// that guard would turn a valid compiled URL into an empty string.
const API_BASE_URL = process.env.TARO_APP_API_BASE_URL || ''

function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`
}

async function requestApi<T>(path: string, options: {
  method: 'GET' | 'POST'
  data?: Record<string, unknown>
  withAuth?: boolean
}) {
  if (process.env.TARO_ENV === 'weapp' && !API_BASE_URL) {
    throw new Error('未配置后端地址，请设置 TARO_APP_API_BASE_URL')
  }
  const token = getStorageSync(ACCESS_TOKEN_KEY)
  let response
  try {
    response = await request<ApiEnvelope<T>>({
      url: apiUrl(path),
      method: options.method,
      data: options.data,
      header: {
        ...(options.withAuth && token ? { Authorization: `Bearer ${token}` } : {})
      }
    })
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'errMsg' in error
        ? String((error as { errMsg?: unknown }).errMsg || '')
        : ''
    console.error('[源仓认证请求失败]', {
      url: apiUrl(path),
      message: message || error
    })
    throw new Error(message || '无法连接后端服务，请检查服务地址和网络设置')
  }
  const payload = response.data
  if (payload.code !== 0) {
    throw new Error(payload.message || '请求失败')
  }
  return payload.data
}

export function getAccessToken() {
  const token = getStorageSync(ACCESS_TOKEN_KEY)
  return typeof token === 'string' && token ? token : ''
}

export function clearAccessToken() {
  removeStorageSync(ACCESS_TOKEN_KEY)
}

export async function loginWithWechatPhone(phoneCode: string) {
  clearAccessToken()
  if (process.env.TARO_ENV !== 'weapp') throw new Error('请在微信小程序中使用手机号登录')

  const loginResult = await wechatLogin()
  if (!loginResult.code) throw new Error('微信登录失败，未获取到登录凭证')

  const data = await requestApi<AuthData>('/api/v1/auth/wechat/phone-login', {
    method: 'POST',
    data: { login_code: loginResult.code, phone_code: phoneCode }
  })
  setStorageSync(ACCESS_TOKEN_KEY, data.access_token)
  return data
}

export async function currentUser() {
  return requestApi<AuthUser>('/api/v1/auth/me', {
    method: 'GET',
    withAuth: true
  })
}

export async function currentVerification() {
  return requestApi<VerificationData>('/api/v1/auth/verification', {
    method: 'GET',
    withAuth: true
  })
}

export async function listStorePlatforms() {
  return requestApi<{ items: StorePlatform[] }>('/api/v1/auth/verification/store-platforms', {
    method: 'GET'
  })
}

export async function submitPersonalVerification(input: {
  role: number
  real_name: string
  id_number: string
  store_platform_id: number
  store_url: string
  id_front_endpoint?: string
  id_front_bucket?: string
  id_front_path?: string
  id_back_endpoint?: string
  id_back_bucket?: string
  id_back_path?: string
}) {
  return requestApi<VerificationData>('/api/v1/auth/verification/personal', {
    method: 'POST',
    withAuth: true,
    data: {
      role: input.role,
      real_name: input.real_name,
      id_number: input.id_number,
      store_platform_id: input.store_platform_id,
      store_url: input.store_url,
      id_front_endpoint: input.id_front_endpoint || '',
      id_front_bucket: input.id_front_bucket || '',
      id_front_path: input.id_front_path || '',
      id_back_endpoint: input.id_back_endpoint || '',
      id_back_bucket: input.id_back_bucket || '',
      id_back_path: input.id_back_path || ''
    }
  })
}

export async function submitCompanyVerification(input: {
  role: number
  company_name: string
  unified_social_credit_code: string
  business_license_endpoint: string
  business_license_bucket: string
  business_license_path: string
  registered_address: string
  introduction?: string
  offices?: string[]
  factories?: string[]
  contacts: CompanyContact[]
}) {
  return requestApi<VerificationData>('/api/v1/auth/verification/company', {
    method: 'POST',
    withAuth: true,
    data: {
      role: input.role,
      company_name: input.company_name,
      unified_social_credit_code: input.unified_social_credit_code,
      business_license_endpoint: input.business_license_endpoint || '',
      business_license_bucket: input.business_license_bucket || '',
      business_license_path: input.business_license_path || '',
      registered_address: input.registered_address,
      introduction: input.introduction || '',
      offices: input.offices || [],
      factories: input.factories || [],
      contacts: input.contacts
    }
  })
}

export async function uploadIDCard(filePath: string, side: 'front' | 'back') {
  if (process.env.TARO_ENV === 'weapp' && !API_BASE_URL) {
    throw new Error('未配置后端地址，请设置 TARO_APP_API_BASE_URL')
  }
  const token = getAccessToken()
  if (!token) throw new Error('请先登录后上传身份证')
  let response
  try {
    response = await uploadFile({
      url: apiUrl('/api/v1/auth/verification/id-card'),
      filePath,
      name: 'file',
      formData: { side },
      header: { Authorization: `Bearer ${token}` }
    })
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'errMsg' in error
        ? String((error as { errMsg?: unknown }).errMsg || '')
        : ''
    throw new Error(message || '身份证上传失败，请检查网络设置')
  }
  let payload: ApiEnvelope<IDCardUpload>
  try {
    payload = JSON.parse(response.data) as ApiEnvelope<IDCardUpload>
  } catch {
    throw new Error('身份证上传失败，服务端返回格式异常')
  }
  if (response.statusCode < 200 || response.statusCode >= 300 || payload.code !== 0) {
    throw new Error(payload.message || '身份证上传失败')
  }
  return payload.data
}

export async function uploadBusinessLicense(filePath: string) {
  if (process.env.TARO_ENV === 'weapp' && !API_BASE_URL) {
    throw new Error('未配置后端地址，请设置 TARO_APP_API_BASE_URL')
  }
  const token = getAccessToken()
  if (!token) throw new Error('请先登录后上传营业执照')
  let response
  try {
    response = await uploadFile({
      url: apiUrl('/api/v1/auth/verification/business-license'),
      filePath,
      name: 'file',
      header: { Authorization: `Bearer ${token}` }
    })
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'errMsg' in error
        ? String((error as { errMsg?: unknown }).errMsg || '')
        : ''
    throw new Error(message || '营业执照上传失败，请检查网络设置')
  }
  let payload: ApiEnvelope<BusinessLicenseUpload>
  try {
    payload = JSON.parse(response.data) as ApiEnvelope<BusinessLicenseUpload>
  } catch {
    throw new Error('营业执照上传失败，服务端返回格式异常')
  }
  if (response.statusCode < 200 || response.statusCode >= 300 || payload.code !== 0) {
    throw new Error(payload.message || '营业执照上传失败')
  }
  return payload.data
}

export async function logout() {
  try {
    await requestApi<unknown>('/api/v1/auth/logout', {
      method: 'POST',
      withAuth: true
    })
  } finally {
    // Even if the server is unavailable, clear the local token so the user
    // can start a new login flow instead of being stuck with a stale token.
    clearAccessToken()
  }
}
