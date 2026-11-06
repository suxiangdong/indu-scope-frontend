import { getStorageSync, request } from '@tarojs/taro'

import { ACCESS_TOKEN_KEY } from './auth'

type ApiEnvelope<T> = {
  code: number
  message: string
  data: T
}

export type SupplierCategory = {
  id: number
  parent_id: number
  name: string
  sort_order: number
}

export type ProductAttributeOption = {
  id: number
  code: string
  name: string
}

export type ProductAttribute = {
  id: number
  code: string
  name: string
  value_type: number
  input_type: string
  unit?: string
  placeholder?: string
  help_text?: string
  is_required: number
  sort_order: number
  group_display_name?: string
  options?: ProductAttributeOption[]
}

export type ProductFormOptions = {
  categories: SupplierCategory[]
  attributes: ProductAttribute[]
}

export type ProductAttributeValueInput = {
  attribute_id: number
  value?: string
  option_id?: number
  option_ids?: number[]
}

export type CreateSupplierProductInput = {
  category_id: number
  name: string
  description_html?: string
  condition_code: string
  stock_quantity: number
  stock_unit_code: string
  attributes: ProductAttributeValueInput[]
}

export type SupplierProduct = {
  id: number
  supplier_user_id: number
  category_id: number
  name: string
  description_html?: string
  condition_code: string
  stock_quantity: number
  stock_unit_code: string
  status: number
}

const API_BASE_URL = process.env.TARO_APP_API_BASE_URL || ''

function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`
}

async function requestProductApi<T>(path: string, method: 'GET' | 'POST', data?: Record<string, unknown>) {
  if (process.env.TARO_ENV === 'weapp' && !API_BASE_URL) {
    throw new Error('未配置后端地址，请设置 TARO_APP_API_BASE_URL')
  }
  const token = getStorageSync(ACCESS_TOKEN_KEY)
  try {
    const response = await request<ApiEnvelope<T>>({
      url: apiUrl(path),
      method,
      data,
      header: token ? { Authorization: `Bearer ${token}` } : {}
    })
    const payload = response.data
    if (payload.code !== 0) throw new Error(payload.message || '请求失败')
    return payload.data
  } catch (error) {
    if (error instanceof Error) throw error
    const message = typeof error === 'object' && error !== null && 'errMsg' in error
      ? String((error as { errMsg?: unknown }).errMsg || '')
      : ''
    throw new Error(message || '无法连接后端服务，请检查服务地址和网络设置')
  }
}

export function listSupplierProductFormOptions(categoryID?: number) {
  const query = categoryID ? `?category_id=${encodeURIComponent(categoryID)}` : ''
  return requestProductApi<ProductFormOptions>(`/api/v1/supplier/products/form-options${query}`, 'GET')
}

export function createSupplierProduct(input: CreateSupplierProductInput) {
  return requestProductApi<SupplierProduct>('/api/v1/supplier/products', 'POST', input as unknown as Record<string, unknown>)
}
