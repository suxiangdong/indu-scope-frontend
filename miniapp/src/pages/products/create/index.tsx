import { Button, Input, Picker, Text, Textarea, View } from '@tarojs/components'
import { redirectTo, showLoading, showToast, hideLoading, useLoad } from '@tarojs/taro'
import { useMemo, useState } from 'react'

import { currentUser, getAccessToken } from '../../../services/auth'
import {
  createSupplierProduct,
  listSupplierProductFormOptions,
  ProductAttribute,
  ProductAttributeValueInput,
  SupplierCategory
} from '../../../services/products'
import './index.scss'

type AttributeDraft = {
  value: string
  option_id?: number
  option_ids?: number[]
}

const conditions = [
  { value: 'new', label: '全新' },
  { value: 'used', label: '二手' },
  { value: 'refurbished', label: '翻新' }
]

function childrenOf(categories: SupplierCategory[], parentID: number) {
  return categories.filter(item => item.parent_id === parentID)
}

function inputType(attribute: ProductAttribute) {
  return (attribute.input_type || '').toLowerCase()
}

function isBooleanAttribute(attribute: ProductAttribute) {
  return attribute.value_type === 4 || inputType(attribute) === 'switch' || inputType(attribute) === 'bool'
}

function isOptionAttribute(attribute: ProductAttribute) {
  return Boolean(attribute.options?.length)
}

function isMultiOptionAttribute(attribute: ProductAttribute) {
  return inputType(attribute) === 'multi_select' || inputType(attribute) === 'multiselect' || inputType(attribute) === 'checkbox'
}

export default function CreateProductPage () {
  const [categories, setCategories] = useState<SupplierCategory[]>([])
  const [attributes, setAttributes] = useState<ProductAttribute[]>([])
  const [categoryPath, setCategoryPath] = useState<number[]>([])
  const [categoryID, setCategoryID] = useState(0)
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [categoryModalLevel, setCategoryModalLevel] = useState(0)
  const [categorySearch, setCategorySearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingAttributes, setLoadingAttributes] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [name, setName] = useState('')
  const [conditionCode, setConditionCode] = useState('new')
  const [stockQuantity, setStockQuantity] = useState('0')
  const [stockUnitCode, setStockUnitCode] = useState('件')
  const [description, setDescription] = useState('')
  const [drafts, setDrafts] = useState<Record<number, AttributeDraft>>({})

  const categoryLevels = useMemo(() => {
    const levels: SupplierCategory[][] = []
    let parentID = 0
    for (let level = 0; level < 20; level += 1) {
      const options = childrenOf(categories, parentID)
      if (!options.length) break
      levels.push(options)
      const selectedID = categoryPath[level]
      if (!selectedID || !options.some(item => item.id === selectedID)) break
      parentID = selectedID
    }
    return levels
  }, [categories, categoryPath])
  const selectedCategoryName = useMemo(() => categories.find(item => item.id === categoryID)?.name || '', [categories, categoryID])
  const selectedCategoryPath = useMemo(() => categoryPath
    .map(id => categories.find(item => item.id === id)?.name)
    .filter(Boolean)
    .join(' / '), [categories, categoryPath])
  const currentCategoryOptions = useMemo(() => {
    const options = categoryLevels[categoryModalLevel] || []
    const keyword = categorySearch.trim().toLowerCase()
    return keyword ? options.filter(item => item.name.toLowerCase().includes(keyword)) : options
  }, [categoryLevels, categoryModalLevel, categorySearch])
  const groupedAttributes = useMemo(() => {
    const groups: { name: string; items: ProductAttribute[] }[] = []
    attributes.forEach(attribute => {
      const name = attribute.group_display_name || '产品属性'
      const group = groups.find(item => item.name === name)
      if (group) group.items.push(attribute)
      else groups.push({ name, items: [attribute] })
    })
    return groups
  }, [attributes])

  useLoad(() => {
    void loadInitialOptions()
  })

  const loadInitialOptions = async () => {
    if (!getAccessToken()) {
      showToast({ title: '请先登录供方账号', icon: 'none' })
      setTimeout(() => redirectTo({ url: '/pages/login/index' }), 360)
      return
    }
    try {
      const user = await currentUser()
      if (user.role !== 2) {
        showToast({ title: '只有供方用户可以发布产品', icon: 'none' })
        setTimeout(() => redirectTo({ url: '/pages/profile/index' }), 360)
        return
      }
      const result = await listSupplierProductFormOptions()
      setCategories(result.categories || [])
    } catch (error) {
      const message = error instanceof Error ? error.message : '表单加载失败，请稍后重试'
      showToast({ title: message.slice(0, 24), icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const loadCategoryAttributes = async (nextCategoryID: number) => {
    setCategoryID(nextCategoryID)
    setAttributes([])
    setDrafts({})
    if (!nextCategoryID) return
    setLoadingAttributes(true)
    try {
      const result = await listSupplierProductFormOptions(nextCategoryID)
      setAttributes(result.attributes || [])
    } catch (error) {
      const message = error instanceof Error ? error.message : '属性加载失败，请稍后重试'
      showToast({ title: message.slice(0, 24), icon: 'none' })
    } finally {
      setLoadingAttributes(false)
    }
  }

  const openCategoryModal = () => {
    const maxLevel = Math.max(categoryLevels.length - 1, 0)
    setCategoryModalLevel(Math.min(categoryPath.length, maxLevel))
    setCategorySearch('')
    setCategoryModalOpen(true)
  }

  const closeCategoryModal = () => {
    setCategorySearch('')
    setCategoryModalOpen(false)
  }

  const chooseCategory = (next: SupplierCategory) => {
    const level = categoryModalLevel
    const nextPath = next ? [...categoryPath.slice(0, level), next.id] : categoryPath.slice(0, level)
    setCategoryPath(nextPath)
    setCategoryID(0)
    setAttributes([])
    if (!next) return
    const nextChildren = childrenOf(categories, next.id)
    if (nextChildren.length) {
      setCategoryModalLevel(level + 1)
      setCategorySearch('')
    } else {
      void loadCategoryAttributes(next.id)
      closeCategoryModal()
    }
  }

  const chooseCategoryLevel = (level: number) => {
    setCategoryModalLevel(level)
    setCategorySearch('')
  }

  const updateDraft = (attributeID: number, draft: AttributeDraft) => {
    setDrafts(current => ({ ...current, [attributeID]: draft }))
  }

  const submit = async () => {
    if (submitting) return
    if (!categoryID) {
      showToast({ title: '请选择最后一级类目', icon: 'none' })
      return
    }
    if (!name.trim()) {
      showToast({ title: '请输入产品名称', icon: 'none' })
      return
    }
    const quantity = Number(stockQuantity)
    if (!Number.isFinite(quantity) || quantity < 0) {
      showToast({ title: '库存数量必须是非负数字', icon: 'none' })
      return
    }
    const values: ProductAttributeValueInput[] = []
    for (const attribute of attributes) {
      const draft = drafts[attribute.id]
      const hasValue = Boolean(draft?.value?.trim()) || Boolean(draft?.option_id) || Boolean(draft?.option_ids?.length)
      if (attribute.is_required && !hasValue) {
        showToast({ title: `请填写${attribute.name}`, icon: 'none' })
        return
      }
      if (hasValue) {
        values.push({ attribute_id: attribute.id, value: draft?.value || '', option_id: draft?.option_id, option_ids: draft?.option_ids })
      }
    }
    setSubmitting(true)
    showLoading({ title: '保存中' })
    try {
      await createSupplierProduct({
        category_id: categoryID,
        name: name.trim(),
        condition_code: conditionCode,
        stock_quantity: quantity,
        stock_unit_code: stockUnitCode.trim() || '件',
        description_html: description.trim(),
        attributes: values
      })
      showToast({ title: '产品已保存', icon: 'success' })
      setTimeout(() => redirectTo({ url: '/pages/profile/index' }), 500)
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存失败，请稍后重试'
      showToast({ title: message.slice(0, 24), icon: 'none' })
    } finally {
      hideLoading()
      setSubmitting(false)
    }
  }

  return (
    <View className='create-product-page'>
      <View className='create-product-header'>
        <Text className='create-product-eyebrow'>SOURCE · PRODUCT</Text>
        <Text className='create-product-title'>发布产品</Text>
        <Text className='create-product-subtitle'>选择末级类目后，填写产品信息和类目属性</Text>
      </View>

      {loading ? <View className='create-product-loading'>正在加载表单…</View> : (
        <>
          <View className='create-product-card'>
            <Text className='create-product-section-title'>选择类目</Text>
            <Text className='create-product-section-note'>必须选择到最后一级，属性才会自动加载</Text>
            <View className={`create-product-category-trigger ${selectedCategoryPath ? '' : 'create-product-category-trigger-placeholder'}`} onClick={openCategoryModal}>
              <View className='create-product-category-trigger-copy'>
                <Text className='create-product-category-trigger-label'>{selectedCategoryPath || '请选择末级类目'}</Text>
                {selectedCategoryPath && <Text className='create-product-category-trigger-hint'>点击重新选择类目</Text>}
              </View>
              <Text className='create-product-category-trigger-arrow'>›</Text>
            </View>
            {selectedCategoryName && <Text className='create-product-selected'>已选择：{selectedCategoryName}</Text>}
          </View>

          <View className='create-product-card'>
            <Text className='create-product-section-title'>基础信息</Text>
            <View className='create-product-field'>
              <Text className='create-product-label'>产品名称 <Text className='required'>*</Text></Text>
              <Input className='create-product-input' value={name} maxlength={255} placeholder='请输入产品名称' onInput={event => setName(event.detail.value)} />
            </View>
            <View className='create-product-field-row'>
              <View className='create-product-field create-product-field-half'>
                <Text className='create-product-label'>成色</Text>
                <Picker mode='selector' range={conditions.map(item => item.label)} value={Math.max(0, conditions.findIndex(item => item.value === conditionCode))} onChange={event => setConditionCode(conditions[Number(event.detail.value)].value)}>
                  <View className='create-product-picker'><Text>{conditions.find(item => item.value === conditionCode)?.label}</Text><Text>⌄</Text></View>
                </Picker>
              </View>
              <View className='create-product-field create-product-field-half'>
                <Text className='create-product-label'>库存数量</Text>
                <Input className='create-product-input' type='number' value={stockQuantity} placeholder='0' onInput={event => setStockQuantity(event.detail.value)} />
              </View>
            </View>
            <View className='create-product-field'>
              <Text className='create-product-label'>库存单位</Text>
              <Input className='create-product-input' value={stockUnitCode} maxlength={32} placeholder='件' onInput={event => setStockUnitCode(event.detail.value)} />
            </View>
            <View className='create-product-field create-product-field-last'>
              <Text className='create-product-label'>产品介绍</Text>
              <Textarea className='create-product-textarea' value={description} maxlength={2000} placeholder='介绍产品特点、适用场景和供货说明' onInput={event => setDescription(event.detail.value)} />
            </View>
          </View>

          {loadingAttributes && <View className='create-product-loading-inline'>正在加载类目属性…</View>}
          {groupedAttributes.map(group => (
            <View className='create-product-card' key={group.name}>
              <Text className='create-product-section-title'>{group.name}</Text>
              {group.items.map(attribute => {
                const draft = drafts[attribute.id] || { value: '' }
                const options = attribute.options || []
                return (
                  <View className='create-product-field' key={attribute.id}>
                    <Text className='create-product-label'>{attribute.name} {attribute.is_required ? <Text className='required'>*</Text> : null}{attribute.unit ? <Text className='create-product-unit'>（{attribute.unit}）</Text> : null}</Text>
                    {isOptionAttribute(attribute) && isMultiOptionAttribute(attribute) ? (
                      <View className='create-product-option-grid'>
                        {options.map(option => {
                          const selected = (draft.option_ids || []).includes(option.id)
                          return <View key={option.id} className={`create-product-option ${selected ? 'create-product-option-active' : ''}`} onClick={() => {
                            const current = draft.option_ids || []
                            const next = selected ? current.filter(id => id !== option.id) : [...current, option.id]
                            updateDraft(attribute.id, { value: next.map(id => options.find(item => item.id === id)?.name || '').filter(Boolean).join('、'), option_ids: next })
                          }}>{option.name}</View>
                        })}
                      </View>
                    ) : isOptionAttribute(attribute) ? (
                      <Picker mode='selector' range={options.map(option => option.name)} value={Math.max(0, options.findIndex(option => option.id === draft.option_id))} onChange={event => {
                        const option = options[Number(event.detail.value)]
                        if (option) updateDraft(attribute.id, { value: option.name, option_id: option.id })
                      }}>
                        <View className={`create-product-picker ${!draft.option_id ? 'create-product-picker-placeholder' : ''}`}><Text>{draft.value || `请选择${attribute.name}`}</Text><Text>⌄</Text></View>
                      </Picker>
                    ) : isBooleanAttribute(attribute) ? (
                      <Picker mode='selector' range={['是', '否']} value={draft.value === '否' ? 1 : 0} onChange={event => updateDraft(attribute.id, { value: Number(event.detail.value) === 0 ? '是' : '否' })}>
                        <View className='create-product-picker'><Text>{draft.value || '请选择'}</Text><Text>⌄</Text></View>
                      </Picker>
                    ) : (
                      <Input className='create-product-input' type={attribute.value_type === 2 || attribute.value_type === 3 ? 'number' : 'text'} value={draft.value} placeholder={attribute.placeholder || `请输入${attribute.name}`} onInput={event => updateDraft(attribute.id, { value: event.detail.value })} />
                    )}
                    {attribute.help_text && <Text className='create-product-help'>{attribute.help_text}</Text>}
                  </View>
                )
              })}
            </View>
          ))}

          <Button className='create-product-submit' onClick={submit} disabled={submitting || loadingAttributes}>{submitting ? '保存中…' : '保存并提交产品'}</Button>
        </>
      )}

      {categoryModalOpen && (
        <View className='create-product-category-overlay' onClick={closeCategoryModal}>
          <View className='create-product-category-sheet' onClick={(event) => event.stopPropagation()}>
            <View className='create-product-category-sheet-header'>
              <Text className='create-product-category-sheet-title'>选择类目</Text>
              <Text className='create-product-category-sheet-close' onClick={closeCategoryModal}>×</Text>
            </View>
            <View className='create-product-category-breadcrumbs'>
              {categoryPath.map((id, index) => {
                const item = categories.find(category => category.id === id)
                if (!item) return null
                return (
                  <View className='create-product-category-breadcrumb' key={id} onClick={() => chooseCategoryLevel(index)}>
                    <Text className={index === categoryModalLevel ? 'create-product-category-breadcrumb-active' : ''}>{item.name}</Text>
                    {index < categoryPath.length - 1 && <Text className='create-product-category-breadcrumb-separator'>/</Text>}
                  </View>
                )
              })}
              <Text className='create-product-category-breadcrumb-current'>请选择{categoryModalLevel + 1}级</Text>
            </View>
            <View className='create-product-category-search-wrap'>
              <Text className='create-product-category-search-icon'>⌕</Text>
              <Input className='create-product-category-search' value={categorySearch} placeholder='搜索当前层级类目' onInput={event => setCategorySearch(event.detail.value)} />
            </View>
            <View className='create-product-category-list'>
              {currentCategoryOptions.length ? currentCategoryOptions.map(item => {
                const selected = categoryPath[categoryModalLevel] === item.id
                const hasChildren = childrenOf(categories, item.id).length > 0
                return (
                  <View className={`create-product-category-row ${selected ? 'create-product-category-row-active' : ''}`} key={item.id} onClick={() => chooseCategory(item)}>
                    <Text>{item.name}</Text>
                    <Text className='create-product-category-row-arrow'>{hasChildren ? '›' : selected ? '✓' : ''}</Text>
                  </View>
                )
              }) : (
                <View className='create-product-category-empty'>暂无匹配类目</View>
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  )
}
