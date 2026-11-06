import { Button, Image, Input, Picker, Text, Textarea, View } from '@tarojs/components'
import { chooseImage, hideLoading, redirectTo, showLoading, showToast, useLoad } from '@tarojs/taro'
import { useState } from 'react'

import {
  CompanyVerification,
  CompanyContact,
  currentVerification,
  listStorePlatforms,
  PersonalVerification,
  StorePlatform,
  submitCompanyVerification,
  submitPersonalVerification,
  uploadIDCard,
  uploadBusinessLicense,
  VerificationData
} from '../../services/auth'
import './index.scss'

type VerificationType = 'personal' | 'company'

function statusLabel(status?: string, role?: number) {
  if (role === 0 && (!status || status === 'unsubmitted')) return '待完善'
  if (status === 'verified') return '已认证'
  if (status === 'pending') return '审核中'
  if (status === 'rejected') return '需修改后重新提交'
  return '未认证'
}

export default function VerificationPage () {
  const [role, setRole] = useState<1 | 2 | 0>(0)
  const [type, setType] = useState<VerificationType>('personal')
  const [data, setData] = useState<VerificationData | null>(null)
  const [personal, setPersonal] = useState<PersonalVerification>({ real_name: '' })
  const [storePlatforms, setStorePlatforms] = useState<StorePlatform[]>([])
  const [company, setCompany] = useState<CompanyVerification>({
    company_name: '', unified_social_credit_code: '', registered_address: '', contacts: [{ name: '', phone: '' }]
  })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingLicense, setUploadingLicense] = useState(false)
  const [licensePreviewPath, setLicensePreviewPath] = useState('')
  const [uploadingIDCardSide, setUploadingIDCardSide] = useState<'front' | 'back' | ''>('')
  const [idFrontPreviewPath, setIDFrontPreviewPath] = useState('')
  const [idBackPreviewPath, setIDBackPreviewPath] = useState('')

  useLoad(() => {
    void (async () => {
      try {
        const result = await currentVerification()
        setData(result)
        setRole(result.role === 1 || result.role === 2 ? result.role : 0)
        if (result.personal && !result.company) setType('personal')
        if (result.company && !result.personal) setType('company')
        if (result.role === 2) setType('company')
        if (result.personal && result.company && result.user_type === 2) setType('company')
        if (result.personal) setPersonal(result.personal)
        if (result.company) {
          setCompany({
            ...result.company,
            contacts: result.company.contacts?.length ? result.company.contacts : [{ name: '', phone: '' }]
          })
        }
        try {
          const platformResult = await listStorePlatforms()
          setStorePlatforms(platformResult.items || [])
        } catch {
          showToast({ title: '店铺平台加载失败，请稍后重试', icon: 'none' })
        }
      } catch {
        showToast({ title: '请先登录后进行认证', icon: 'none' })
        setTimeout(() => redirectTo({ url: '/pages/login/index' }), 360)
      } finally {
        setLoading(false)
      }
    })()
  })

  const submit = async () => {
    if (submitting || data?.status === 'pending' || data?.status === 'verified') return
    if (role !== 1 && role !== 2) {
      showToast({ title: '请先选择采购方或供货方', icon: 'none' })
      return
    }
    if (type === 'personal' && (!personal.store_platform_id || !personal.store_url?.trim())) {
      showToast({ title: '请填写店铺平台和地址', icon: 'none' })
      return
    }
    if (type === 'personal' && (!personal.id_front_endpoint || !personal.id_front_bucket || !personal.id_front_path || !personal.id_back_endpoint || !personal.id_back_bucket || !personal.id_back_path)) {
      showToast({ title: '请先上传身份证正反面', icon: 'none' })
      return
    }
    if (type === 'company' && (!company.business_license_endpoint || !company.business_license_bucket || !company.business_license_path)) {
      showToast({ title: '请先上传营业执照', icon: 'none' })
      return
    }
    setSubmitting(true)
    try {
      const result = type === 'personal'
        ? await submitPersonalVerification({
          role,
          real_name: personal.real_name,
          id_number: personal.id_number || '',
          store_platform_id: personal.store_platform_id || 0,
          store_url: personal.store_url || '',
          id_front_endpoint: personal.id_front_endpoint || '',
          id_front_bucket: personal.id_front_bucket || '',
          id_front_path: personal.id_front_path || '',
          id_back_endpoint: personal.id_back_endpoint || '',
          id_back_bucket: personal.id_back_bucket || '',
          id_back_path: personal.id_back_path || ''
        })
        : await submitCompanyVerification({
          role,
          company_name: company.company_name,
          unified_social_credit_code: company.unified_social_credit_code,
          business_license_endpoint: company.business_license_endpoint || '',
          business_license_bucket: company.business_license_bucket || '',
          business_license_path: company.business_license_path || '',
          registered_address: company.registered_address,
          introduction: company.introduction,
          offices: company.offices,
          factories: company.factories,
          contacts: company.contacts || []
        })
      setData(result)
      showToast({ title: '认证资料已提交', icon: 'success' })
      setTimeout(() => redirectTo({ url: '/pages/profile/index' }), 360)
    } catch (error) {
      const message = error instanceof Error ? error.message : '提交失败，请稍后重试'
      showToast({ title: message.slice(0, 24), icon: 'none' })
    } finally {
      setSubmitting(false)
    }
  }

  const isPending = data?.status === 'pending'
  const isVerified = data?.status === 'verified'
  const isReadOnly = isPending || isVerified
  const canChooseRole = data?.role === 0
  const supplierRole = role === 2 || data?.role === 2
  const lockedType: VerificationType | null = data?.personal && !data.company
    ? 'personal'
    : data?.company && !data.personal
      ? 'company'
      : data?.user_type === 2
        ? 'company'
        : data?.personal
          ? 'personal'
          : null
  const typeLocked = Boolean(data?.personal || data?.company)

  const selectRole = (nextRole: 1 | 2) => {
    setRole(nextRole)
    if (nextRole === 2) setType('company')
  }

  const updateContact = (index: number, field: keyof CompanyContact, value: string) => {
    const contacts = [...(company.contacts || [])]
    contacts[index] = { ...contacts[index], [field]: value }
    setCompany({ ...company, contacts })
  }

  const addContact = () => {
    if ((company.contacts || []).length >= 3) return
    setCompany({ ...company, contacts: [...(company.contacts || []), { name: '', phone: '' }] })
  }

  const parseLocations = (value: string) => value.split(/[，,\n]/).map(item => item.trim()).filter(Boolean)

  const chooseBusinessLicense = async () => {
    if (isReadOnly || uploadingLicense) return
    try {
      const result = await chooseImage({
        count: 1,
        sizeType: ['compressed', 'original'],
        sourceType: ['album', 'camera']
      })
      const filePath = result.tempFilePaths?.[0]
      if (!filePath) return
      setUploadingLicense(true)
      showLoading({ title: '上传中' })
      const uploaded = await uploadBusinessLicense(filePath)
      setLicensePreviewPath(filePath)
      setCompany(current => ({
        ...current,
        business_license_endpoint: uploaded.endpoint,
        business_license_bucket: uploaded.bucket,
        business_license_path: uploaded.path,
        business_license_file_name: uploaded.filename,
        business_license_file_size: uploaded.size,
        business_license_content_type: uploaded.content_type
      }))
      showToast({ title: '营业执照上传成功', icon: 'success' })
    } catch (error) {
      const message = error instanceof Error ? error.message : '营业执照上传失败，请稍后重试'
      showToast({ title: message.slice(0, 24), icon: 'none' })
    } finally {
      hideLoading()
      setUploadingLicense(false)
    }
  }

  const chooseIDCard = async (side: 'front' | 'back') => {
    if (isReadOnly || uploadingIDCardSide) return
    try {
      const result = await chooseImage({
        count: 1,
        sizeType: ['compressed', 'original'],
        sourceType: ['album', 'camera']
      })
      const filePath = result.tempFilePaths?.[0]
      if (!filePath) return
      setUploadingIDCardSide(side)
      showLoading({ title: '上传中' })
      const uploaded = await uploadIDCard(filePath, side)
      setPersonal(current => side === 'front'
        ? { ...current, id_front_endpoint: uploaded.endpoint, id_front_bucket: uploaded.bucket, id_front_path: uploaded.path }
        : { ...current, id_back_endpoint: uploaded.endpoint, id_back_bucket: uploaded.bucket, id_back_path: uploaded.path })
      if (side === 'front') setIDFrontPreviewPath(filePath)
      else setIDBackPreviewPath(filePath)
      showToast({ title: `身份证${side === 'front' ? '正面' : '反面'}上传成功`, icon: 'success' })
    } catch (error) {
      const message = error instanceof Error ? error.message : '身份证上传失败，请稍后重试'
      showToast({ title: message.slice(0, 24), icon: 'none' })
    } finally {
      hideLoading()
      setUploadingIDCardSide('')
    }
  }

  return (
    <View className='verification-page'>
      <View className='verification-header'>
        <Text className='verification-eyebrow'>SOURCE · PROFILE</Text>
        <Text className='verification-title'>完善资料</Text>
        <Text className='verification-subtitle'>选择业务角色并完成认证资料，开启完整服务</Text>
      </View>

      <View className={`verification-status verification-status-${data?.status || 'unsubmitted'}`}>
        <View className='verification-status-dot' />
        <View className='verification-status-copy'>
          <Text className='verification-status-title'>{statusLabel(data?.status, data?.role)}</Text>
          <Text className='verification-status-subtitle'>
            {isVerified ? '资料已通过审核' : data?.status === 'pending' ? '资料已提交，请等待后台审核' : data?.status === 'rejected' ? `请根据驳回原因修改：${data.review_reason || '资料未通过审核'}` : '请选择业务角色和认证类型'}
          </Text>
        </View>
      </View>

      {loading ? (
        <View className='verification-loading'>正在加载认证资料…</View>
      ) : (
        <>
          <View className='verification-role-card'>
            <Text className='verification-role-title'>业务角色</Text>
            {canChooseRole ? (
              <>
                <Text className='verification-role-note'>角色选择后不可自行修改；供货方仅支持企业资料</Text>
                <View className='verification-role-tabs'>
                  <View className={`verification-role-tab ${role === 1 ? 'verification-role-tab-active' : ''}`} onClick={() => !isReadOnly && selectRole(1)}>
                    <Text className='verification-role-name'>采购方</Text>
                    <Text className='verification-role-description'>采购工业产品和服务</Text>
                  </View>
                  <View className={`verification-role-tab ${role === 2 ? 'verification-role-tab-active' : ''}`} onClick={() => !isReadOnly && selectRole(2)}>
                    <Text className='verification-role-name'>供货方</Text>
                    <Text className='verification-role-description'>发布产品并提供供货服务</Text>
                  </View>
                </View>
              </>
            ) : (
              <Text className='verification-role-fixed'>{data?.role === 2 ? '供货方' : '采购方'}（角色已确定）</Text>
            )}
          </View>
          <View className='verification-tabs'>
            <View
              className={`verification-tab ${type === 'personal' && !supplierRole ? 'verification-tab-active' : ''} ${lockedType === 'company' || supplierRole ? 'verification-tab-locked' : ''}`}
              onClick={() => !typeLocked && !isReadOnly && !supplierRole && setType('personal')}
            >
              <Text>个人资料</Text>
            </View>
            <View
              className={`verification-tab ${type === 'company' ? 'verification-tab-active' : ''} ${lockedType === 'personal' ? 'verification-tab-locked' : ''}`}
              onClick={() => !typeLocked && !isReadOnly && setType('company')}
            >
              <Text>企业资料</Text>
            </View>
          </View>
          {typeLocked && (
            <Text className='verification-lock-hint'>资料类型已选择为{lockedType === 'personal' ? '个人资料' : '企业资料'}，不可切换。</Text>
          )}

          {type === 'personal' && !supplierRole ? (
            <View className='verification-form'>
              <View className='verification-field'>
                <Text className='verification-label'>真实姓名</Text>
                <Input
                  className='verification-input'
                  value={personal.real_name}
                  disabled={isReadOnly}
                  placeholder='请输入身份证上的姓名'
                  onInput={(event) => setPersonal({ ...personal, real_name: event.detail.value })}
                />
              </View>
              <View className='verification-field'>
                <Text className='verification-label'>身份证号</Text>
                <Input
                  className='verification-input'
                  value={isReadOnly ? (personal.id_number_masked || '已提交') : (personal.id_number || '')}
                  disabled={isReadOnly}
                  password={isReadOnly}
                  placeholder='请输入身份证号码'
                  onInput={(event) => setPersonal({ ...personal, id_number: event.detail.value })}
                />
              </View>
              <Text className='verification-hint'>身份证号仅用于认证，提交后不会在页面展示完整号码。</Text>
              <View className='verification-field'>
                <Text className='verification-label'>店铺平台</Text>
                <Picker
                  mode='selector'
                  range={storePlatforms.map(platform => platform.name)}
                  value={Math.max(0, storePlatforms.findIndex(platform => platform.id === personal.store_platform_id))}
                  disabled={isReadOnly || storePlatforms.length === 0}
                  onChange={(event) => {
                    const index = Number(event.detail.value)
                    const platform = storePlatforms[index]
                    if (platform) setPersonal(current => ({ ...current, store_platform_id: platform.id, store_platform_name: platform.name }))
                  }}
                >
                  <View className='verification-select'>
                    <Text className={personal.store_platform_name ? 'verification-select-value' : 'verification-select-placeholder'}>
                      {personal.store_platform_name || (storePlatforms.length ? '请选择店铺平台' : '暂无可用店铺平台')}
                    </Text>
                    <Text className='verification-select-arrow'>⌄</Text>
                  </View>
                </Picker>
              </View>
              <View className='verification-field'>
                <Text className='verification-label'>店铺地址</Text>
                <Input
                  className='verification-input'
                  value={personal.store_url || ''}
                  disabled={isReadOnly}
                  placeholder='请输入店铺完整网址，如 https://...'
                  onInput={(event) => setPersonal({ ...personal, store_url: event.detail.value })}
                />
              </View>
              <View className='verification-id-card-grid'>
                {(['front', 'back'] as const).map((side) => {
                  const uploaded = side === 'front'
                    ? Boolean(personal.id_front_endpoint && personal.id_front_bucket && personal.id_front_path)
                    : Boolean(personal.id_back_endpoint && personal.id_back_bucket && personal.id_back_path)
                  const previewPath = side === 'front' ? idFrontPreviewPath : idBackPreviewPath
                  return (
                    <View className='verification-id-card-item' key={side}>
                      <Text className='verification-label'>身份证{side === 'front' ? '正面' : '反面'}</Text>
                      <View className='verification-file-row'>
                        <Text className='verification-file-name'>{uploaded ? '已上传' : '尚未上传'}</Text>
                        {!isReadOnly ? (
                          <Button
                            className='verification-upload-button'
                            onClick={() => chooseIDCard(side)}
                            disabled={Boolean(uploadingIDCardSide)}
                          >
                            {uploadingIDCardSide === side ? '上传中…' : uploaded ? '重新上传' : '选择图片'}
                          </Button>
                        ) : (
                          <Text className='verification-file-locked'>{isPending ? '审核中' : '已通过'}</Text>
                        )}
                      </View>
                      {previewPath && (
                        <View className='verification-image-preview-wrap'>
                          <Image className='verification-image-preview' src={previewPath} mode='aspectFit' />
                        </View>
                      )}
                    </View>
                  )
                })}
              </View>
              <Text className='verification-hint'>请上传清晰、完整的身份证正反面 JPG 或 PNG 图片，单张不超过 10MB。</Text>
            </View>
          ) : (
            <View className='verification-form'>
              <View className='verification-field'>
                <Text className='verification-label'>企业名称</Text>
                <Input
                  className='verification-input'
                  value={company.company_name}
                  disabled={isReadOnly}
                  placeholder='请输入营业执照上的企业名称'
                  onInput={(event) => setCompany({ ...company, company_name: event.detail.value })}
                />
              </View>
              <View className='verification-field'>
                <Text className='verification-label'>营业执照</Text>
                <View className='verification-file-row'>
                  <Text className='verification-file-name'>
                    {company.business_license_file_name || (company.business_license_endpoint && company.business_license_bucket && company.business_license_path ? '营业执照已上传' : '尚未上传营业执照')}
                  </Text>
                  {!isReadOnly ? (
                    <Button
                      className='verification-upload-button'
                      onClick={chooseBusinessLicense}
                      disabled={uploadingLicense}
                    >
                      {uploadingLicense ? '上传中…' : company.business_license_endpoint && company.business_license_bucket && company.business_license_path ? '重新上传' : '选择文件'}
                    </Button>
                  ) : (
                    <Text className='verification-file-locked'>{isPending ? '审核中' : '已通过'}</Text>
                  )}
                </View>
                {licensePreviewPath && (
                  <View className='verification-image-preview-wrap'>
                    <Image
                      className='verification-image-preview'
                      src={licensePreviewPath}
                      mode='aspectFit'
                    />
                  </View>
                )}
                <Text className='verification-hint'>支持 JPG、PNG 图片，文件大小不超过 10MB。</Text>
              </View>
              <View className='verification-field'>
                <Text className='verification-label'>统一社会信用代码</Text>
                <Input
                  className='verification-input'
                  value={company.unified_social_credit_code}
                  disabled={isReadOnly}
                  placeholder='请输入 18 位统一社会信用代码'
                  onInput={(event) => setCompany({ ...company, unified_social_credit_code: event.detail.value })}
                />
              </View>
              <View className='verification-field'>
                <Text className='verification-label'>注册地址</Text>
                <Input
                  className='verification-input'
                  value={company.registered_address}
                  disabled={isReadOnly}
                  placeholder='请输入企业注册地址'
                  onInput={(event) => setCompany({ ...company, registered_address: event.detail.value })}
                />
              </View>
              <View className='verification-field'>
                <Text className='verification-label'>办公地址</Text>
                <Input
                  className='verification-input'
                  value={(company.offices || []).join('，')}
                  disabled={isReadOnly}
                  placeholder='多个地址用逗号分隔'
                  onInput={(event) => setCompany({ ...company, offices: parseLocations(event.detail.value) })}
                />
              </View>
              <View className='verification-field'>
                <Text className='verification-label'>工厂地址</Text>
                <Input
                  className='verification-input'
                  value={(company.factories || []).join('，')}
                  disabled={isReadOnly}
                  placeholder='多个地址用逗号分隔'
                  onInput={(event) => setCompany({ ...company, factories: parseLocations(event.detail.value) })}
                />
              </View>
              <View className='verification-contact-section'>
                <Text className='verification-label'>企业联系人</Text>
                {(company.contacts || []).map((contact, index) => (
                  <View className='verification-contact-card' key={`${index}-${contact.name}`}>
                    <Input
                      className='verification-input'
                      value={contact.name}
                      disabled={isReadOnly}
                      placeholder='联系人姓名'
                      onInput={(event) => updateContact(index, 'name', event.detail.value)}
                    />
                    <Input
                      className='verification-input'
                      value={contact.position || ''}
                      disabled={isReadOnly}
                      placeholder='职位（可选）'
                      onInput={(event) => updateContact(index, 'position', event.detail.value)}
                    />
                    <Input
                      className='verification-input'
                      value={contact.phone}
                      disabled={isReadOnly}
                      placeholder='联系电话'
                      onInput={(event) => updateContact(index, 'phone', event.detail.value)}
                    />
                  </View>
                ))}
                {!isReadOnly && (company.contacts || []).length < 3 && (
                  <Text className='verification-add-contact' onClick={addContact}>+ 添加联系人</Text>
                )}
              </View>
              <View className='verification-field'>
                <Text className='verification-label'>企业介绍</Text>
                <Textarea
                  className='verification-textarea'
                  value={company.introduction || ''}
                  disabled={isReadOnly}
                  maxlength={5000}
                  placeholder='介绍企业主营业务、供应能力等信息'
                  onInput={(event) => setCompany({ ...company, introduction: event.detail.value })}
                />
              </View>
            </View>
          )}

          {!isReadOnly && (
            <Button className='verification-submit' onClick={submit} disabled={submitting}>
              {submitting ? '正在提交…' : '提交完善资料'}
            </Button>
          )}

          {isPending && (
            <Text className='verification-readonly-hint'>认证资料正在审核中，暂不支持修改。</Text>
          )}

          <Text className='verification-footnote'>资料提交后由源仓后台审核，审核结果会同步到当前页面。</Text>
        </>
      )}
    </View>
  )
}
