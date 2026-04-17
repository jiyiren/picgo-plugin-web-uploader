// const logger = require('@varnxy/logger')
// logger.setDirectory('/Users/zhang/Work/WorkSpaces/WebWorkSpace/picgo-plugin-web-uploader/logs')
// let log = logger('plugin')

module.exports = (ctx) => {
  const applyCustomPrefix = (prefix, imgUrl) => {
    if (!prefix) return imgUrl
    return String(prefix) + String(imgUrl)
  }

  const register = () => {
    ctx.helper.uploader.register('web-uploader', {
      handle,
      name: '自定义Web图床',
      config: config
    })
  }
  const handle = async function (ctx) {
    let userConfig = ctx.getConfig('picBed.web-uploader')
    if (!userConfig) {
      throw new Error('Can\'t find uploader config')
    }
    const url = userConfig.url
    const paramName = userConfig.paramName
    const jsonPath = userConfig.jsonPath
    const customPrefix = userConfig.customPrefix
    const customHeader = userConfig.customHeader
    const customBody = userConfig.customBody
    try {
      let imgList = ctx.output
      for (let i in imgList) {
        let image = imgList[i].buffer
        if (!image && imgList[i].base64Image) {
          image = Buffer.from(imgList[i].base64Image, 'base64')
        }
        const postConfig = postOptions(image, customHeader, customBody, url, paramName, imgList[i].fileName)
        let body = await ctx.Request.request(postConfig)

        delete imgList[i].base64Image
        delete imgList[i].buffer
        if (!jsonPath) {
          imgList[i]['imgUrl'] = applyCustomPrefix(customPrefix, body)
        } else {
          body = JSON.parse(body)
          let imgUrl = body
          for (let field of jsonPath.split('.')) {
            imgUrl = imgUrl[field]
          }
          if (imgUrl) {
            imgList[i]['imgUrl'] = applyCustomPrefix(customPrefix, imgUrl)
          } else {
            ctx.emit('notification', {
              title: '返回解析失败',
              body: '请检查JsonPath设置'
            })
          }
        }
      }
    } catch (err) {
      ctx.emit('notification', {
        title: '上传失败',
        body: JSON.stringify(err)
      })
    }
  }

  const postOptions = (image, customHeader, customBody, url, paramName, fileName) => {
    let headers = {
      contentType: 'multipart/form-data',
      'User-Agent': 'PicGo'
    }
    if (customHeader) {
      headers = Object.assign(headers, JSON.parse(customHeader))
    }
    let formData = {}
    if (customBody) {
      formData = Object.assign(formData, JSON.parse(customBody))
    }
    const opts = {
      method: 'POST',
      url: url,
      headers: headers,
      formData: formData
    }
    opts.formData[paramName] = {}
    opts.formData[paramName].value = image
    opts.formData[paramName].options = {
      filename: fileName
    }
    return opts
  }

  const config = ctx => {
    let userConfig = ctx.getConfig('picBed.web-uploader')
    if (!userConfig) {
      userConfig = {}
    }
    return [
      {
        name: 'url',
        type: 'input',
        default: userConfig.url,
        required: true,
        message: 'API地址',
        alias: 'API地址'
      },
      {
        name: 'paramName',
        type: 'input',
        default: userConfig.paramName,
        required: true,
        message: 'POST参数名',
        alias: 'POST参数名'
      },
      {
        name: 'jsonPath',
        type: 'input',
        default: userConfig.jsonPath,
        required: false,
        message: '图片URL JSON路径(eg: data.url)',
        alias: 'JSON路径'
      },
      {
        name: 'customPrefix',
        type: 'input',
        default: userConfig.customPrefix,
        required: false,
        message: '自定义域名前缀，接口返回相对路径时拼在前面(eg: https://cdn.example.com)',
        alias: '域名前缀'
      },
      {
        name: 'customHeader',
        type: 'input',
        default: userConfig.customHeader,
        required: false,
        message: '自定义请求头 标准JSON(eg: {"key":"value"})',
        alias: '自定义请求头'
      },
      {
        name: 'customBody',
        type: 'input',
        default: userConfig.customBody,
        required: false,
        message: '自定义Body 标准JSON(eg: {"key":"value"})',
        alias: '自定义Body'
      }
    ]
  }
  return {
    uploader: 'web-uploader',
    // transformer: 'web-uploader',
    // config: config,
    register

  }
}
