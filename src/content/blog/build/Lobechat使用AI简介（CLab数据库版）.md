---
title: "Lobechat使用AI简介（CLab数据库版）"
routeSlug: "lobechat"
createdAt: "2025-03-28 18:25:35"
type: "搭建🦤"
archiveSlug: "build"
---

## 壹 · 废话写在前面

<br>

`openai`和`claude`的号在三天内双双惨遭封禁，于是寻其他使用ai的方式

遂在`CLab`部署`Lobechat`数据库版，接各平台 API 使用

访问地址 ：https://lobe.ethan02.com （** 须使用pku校园网访问 **）

仅服务一些需要AI服务但又不会配置的同学，你可以在这个已经搭建好的前端使用
<br>

## 贰 · 关于lobechat

<br>

https://github.com/lobehub/lobe-chat

<br>

文档：https://lobehub.com/zh/docs/usage/start

<br>

## 叁 · 基本使用流程

### 一 · 校园网访问前端地址注册账号 

<br>

使用校园网访问 https://portal.ethan02.com ,注册页面如下

![注册页面](https://hanlife02.com/api/v2/objects/file/2x2hkys02loyvps7at.png)

### 二 · 获得服务商API密钥

<br>

#### 0 · 关于此文提供服务商的声明

<br>

下述推荐几个获取api的方式，我不保证这些平台不会跑路，请自行分辨，后果自负

第一个是github copilot的申请，有免费的4o可以用

第二个云雾api较便宜

第三个oaipro，价格与官方相同，速度快

现在已经支持Gemini，有免费的2.5pro可以用

<br>

#### 1 · Github Copilot

<br>

你可以按照 https://blog.csdn.net/m0_72593938/article/details/140858303 这篇博文的教程申请

申请后在 https://github.com/settings/tokens 创建 Tokens

`Expiration`可选永不过期，同时如下图勾选`copilot`

暂时保存最后得到的`key`，之后在`lobechat`前端配置

![token](https://hanlife02.com/api/v2/objects/file/hbpxw07g3430ihiuln.png)

#### 2 · Yunwu API

<br>

你可以通过我的邀请链接注册
https://yunwu.ai/register?aff=Z5b2

随后**创建令牌**，再在**余额充值**即可 。

创建令牌时的用户分组，可以根据自己需要的模型在**模型价格**处查询对应分组

复制令牌的值，之后在`lobechat`前端配置

![创建令牌](https://hanlife02.com/api/v2/objects/file/g91lzvmvwcnpjuhaez.png)

#### 3 · OAIPro API

<br>

同样是我的邀请链接
https://api.oaipro.com/register?aff=ssEG

方法同 2

最后复制令牌的值，之后在`lobechat`前端配置

#### 4 · Gemini

<br>

在这个网站创建apikey：https://aistudio.google.com/app/apikey


### 三 · 在lobechat配置AI服务商

<br>

首先打开 https://lobe.ethan02.com

点击左上角头像 -> 应用设置 -> AI服务商

#### 1 · Github Copilot的配置

<br>

直接搜索`Github`，在下图页面里

`GIthub PAT`填入前述所得`key`

启用后点击`获得模型列表`，选择自己需要的模型即可。

![GitHub](https://hanlife02.com/api/v2/objects/file/kb36lj3zu0d590fw6k.png)

#### 2 · 云雾API和OAIPro的配置

<br>

点击搜索右侧的加号创建自定义AI服务商

```
服务商ID:          起个名字
服务商名称:        起个名字
简介:             空着就行
logo:            想换自己去找图片URL就行
请求格式:         OpenAI
代理地址:        云雾填"https://yunwu.ai/v1"
                 OAIPro填"https://api.oaipro.com/v1"
API Key:         填入之前获得的令牌
```

新建完点击`获得模型列表`，选择对应模型即可。
![自定义服务商](https://hanlife02.com/api/v2/objects/file/keywqa9mkytkcus3iv.png)

#### 3 · Gemini的配置

找到google服务商，直接添加key即可

![Gemini!](https://hanlife02.com/api/v2/objects/file/5eafa17wzrh6b7aacj.png)

### 四 · 测试服务及其他配置（可选）

<br>

#### 1 · 测试

选择对应模型聊两句就行

![选择对应模型](https://hanlife02.com/api/v2/objects/file/0s0zvyko320zplkpqb.png)

#### 2 · 其他配置

推荐在设置--系统助手里面选择自己已经配置好的模型

以及设置--默认助手里面调整默认聊天bot的配置

更多的配置和使用方法你可以在 [lobechat文档](https://lobehub.com/zh/docs/usage/start)中找到

## 肆 · 免责声明

我保证此应用和代码未经修改，不会窃取API密钥

不保证会一直运行下去，但会尽量长期运行

关于推荐的第三方服务商以及个人搭建的前端服务，使用风险请自负
