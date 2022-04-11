/**
 * uni-route
 * 扩展 uni.navigateTo 、 uni.redirectTo 、 uni.reLaunch 、 uni.switchTab 、 uni.navigateBack
 * 添加 beforeEach 、 afterEach 、 fallEach
 * navigateTo 、 redirectTo 、 reLaunch 支持 params 参数
 * setParamsHandler 拦截参数
 */

import _pull from 'lodash/pull'
import _forEach from 'lodash/forEach'
import _get from 'lodash/get'

type Params = { [k: string]: number | string }
type PageOptions = { path: string, params?: Params }
type NavigateToOptions = UniApp.NavigateToOptions & { params?: Params }
type RedirectToOptions = UniApp.RedirectToOptions & { params?: Params }
type ReLaunchOptions = UniApp.ReLaunchOptions & { params?: Params }
type Options = UniApp.NavigateToOptions & UniApp.RedirectToOptions & UniApp.ReLaunchOptions & PageOptions
type BeforeEachFn = (to: PageOptions, from: PageOptions, next: Function) => boolean | void
type AfterEachFn = (to: PageOptions, from: PageOptions, result?: any) => boolean | void
type FallEachFn = (result?: any) => void
type HandleParamsFn = (params: Params) => Params

let handleParams: HandleParamsFn | undefined
const beforeEachItems: BeforeEachFn[] = []
const afterEachItems: AfterEachFn[] = []

const fallEachItems: FallEachFn[] = []

export const getUrlInfo = (url: string) => {
  const params: Params = {}
  const us = url.split('?')
  us[1]?.split('&').map((value) => {
    const vs = value.split('=')
    params[vs[0]] = vs[1]
  })
  return { params, path: us[0] }
}

export const queryParams = (params: Params) => {
  let res = ''
  _forEach(params, (v, k) => {
    res += `&${k}=${v}`
  })
  return res.replace('&', '?')
}

const getCurrentPageOptions = (delta: number = 0): PageOptions => {
  const uniPages = getCurrentPages()
  const page = uniPages[uniPages.length - delta - 1]
  const options: PageOptions = { path: '/' + (_get(page, 'route') || ''), params: _get(page, '$page.options') }
  return options
}

const beforeEach: BeforeEachFn = (to, form, next) => {
  if (!form) {
    form = getCurrentPageOptions()
  }

  let index = 0
  const run = () => {
    const item = beforeEachItems[index]
    item
      ? item(to, form, () => {
          ++index
          run()
        })
      : next && next()
  }
  run()
}

const afterEach: AfterEachFn = (to, form) => {
  if (!form) {
    form = getCurrentPageOptions()
  }

  afterEachItems.forEach((item) => item(to, form))
}

const handleSuccess = (page: PageOptions, success?: Function, res?: any) => {
  afterEach(page, getCurrentPageOptions())
  success && success(res)
}

const handleFail = (page: PageOptions, fail?: Function, res?: any) => {
  fallEachItems.forEach((item) => item(res))
  afterEach(page, page)
  fail && fail(res)
}

const handleOptions = (options: NavigateToOptions | RedirectToOptions | ReLaunchOptions): Options => {
  let { params, path } = getUrlInfo(options.url)
  params = { ...params, ...options.params }
  if (handleParams) {
    params = handleParams(params)
  }

  return {
    ...options,
    url: path + queryParams(params),
    path,
    params,
    success: (res) => handleSuccess({ path, params }, options.success, res),
    fail: (res) => handleFail({ path, params }, options.fail, res)
  }
}

const {
  navigateTo: uniNavigateTo,
  redirectTo: uniRedirectTo,
  reLaunch: uniReLaunch,
  switchTab: uniSwitchTab,
  navigateBack: uniNavigateBack,
} = uni

uni.navigateTo = (options: NavigateToOptions) => {
  const { url, path, params, success, fail } = handleOptions(options)
  beforeEach(
    { path, params }, getCurrentPageOptions(),
    () => uniNavigateTo.call(uni, { ...options, url, success, fail })
  )
}
uni.redirectTo = (options: RedirectToOptions) => {
  const { url, path, params, success, fail } = handleOptions(options)
  beforeEach(
    { path, params }, getCurrentPageOptions(),
    () => uniRedirectTo.call(uni, { ...options, url, success, fail })
  )
}
uni.reLaunch = (options: ReLaunchOptions) => {
  const { url, path, params, success, fail } = handleOptions(options)
  beforeEach(
    { path, params }, getCurrentPageOptions(),
    () => uniReLaunch.call(uni, { ...options, url, success, fail })
  )
}
uni.switchTab = (options: UniApp.SwitchTabOptions) => {
  const { url, path, params, success, fail } = handleOptions(options)
  beforeEach(
    { path, params }, getCurrentPageOptions(),
    () => uniSwitchTab.call(uni, { ...options, url, success, fail })
  )
}
uni.navigateBack = (options: UniApp.NavigateBackOptions) => {
  const delta = options.delta || 1
  const to = getCurrentPageOptions(delta) || { path: '/' }
  const from = getCurrentPageOptions()
  beforeEach(to, from, () =>
    uniNavigateBack.call(
      uni,
      {
        ...options,
        success: (res) => handleSuccess(to, options.success, res),
        fail: (res) => handleFail(from, options.fail, res)
      }
    )
  )
}

export const onBeforeEach = (fn: BeforeEachFn) => beforeEachItems.push(fn)
export const offBeforeEach = (fn: BeforeEachFn) => _pull(beforeEachItems, fn)
export const onAfterEach = (fn: AfterEachFn) => afterEachItems.push(fn)
export const offAfterEach = (fn: AfterEachFn) => _pull(afterEachItems, fn)
export const onFallEach = (fn: FallEachFn) => fallEachItems.push(fn)
export const offFallEach = (fn: FallEachFn) => _pull(fallEachItems, fn)
export const setParamsHandler = (fn: HandleParamsFn) => {
  handleParams = fn
}

export const navigateTo = (options: NavigateToOptions) => uni.navigateTo(options)
export const redirectTo = (options: RedirectToOptions) => uni.redirectTo(options)
export const reLaunch = (options: ReLaunchOptions) => uni.reLaunch(options)
export const switchTab = (options: UniApp.SwitchTabOptions) => uni.switchTab(options)
export const navigateBack = (options: UniApp.NavigateBackOptions) => uni.navigateBack(options)
