---
title: "VSCode通过ssh扩展连接CLab云主机"
routeSlug: "clab"
createdAt: "2024-08-31 14:21:06"
type: "折腾🐦"
archiveSlug: "try"
---

# 写在前面

最近一直在纠结要不要买云服务器然后转用Linux系统<br>

昨晚水群，看到群u分享的公众号推送，贵校 **PKULinux俱乐部** CLab云计算平台全校公测。<br>

而且目前还是白嫖阶段<br>

Words fail me ！

![推送部分内容截图](	https://hanlife02.com/api/v2/objects/file/37ztprtrxb4ec4p6jn.png)<br>


# 正文

## <div id="1">云主机的创建</div>

参考 https://clab.pku.edu.cn/docs/getting-started/introduction

## 具体流程

由于种种原因，作者习惯使用VSCode，故想通过SSH的方法远程连接云平台

创建主机的过程，docs里推荐使用密钥连接，并会自动生成一个名"sk.pem"的文件

不要立即删除，如已删除，可以返回密钥界面重新下载

具体流程很简单，作者参考了几篇博文，整理了一下。

### 壹 · 准备

1. 已经完成 <a href="#1">云主机的创建</a>

2. 本地存在`sk.pem`文件

3. 使用vscode，并已经登录校园网的网关

4. 无损的脑子

### 贰 · 流程

#### 在这里补充另一种方式

直接打开终端`ssh -i sk.pem路径 用户名@ip`

如果你习惯这种方式，这篇文章接下来的内容将无需阅读

下面的内容是便于每次可以通过扩展**免密**连接

#### 一. 在 vscode 里下载扩展`Remote - SSH`

![示例图片1](	https://hanlife02.com/api/v2/objects/file/unqkkctmmw1ovv38af.png)

#### 二. 连接主机
1. 首先点击左侧出现的图标，然后选择"隧道/SSH"

![示例图片2](https://hanlife02.com/api/v2/objects/file/9rhza7ceys66kajmyc.png)

2. 生成`config`文件

点击SSH栏的小齿轮,选中第一个路径即可

![示例图片3](https://hanlife02.com/api/v2/objects/file/1ba7z35ywnnpcbi1k7.png)

3. 修改`config`文件

![示例图片4](https://hanlife02.com/api/v2/objects/file/bvjar6bw5hfrgnc3lt.png)

为确保`sk.pem`文件不丢失，作者将其置于`config`父目录`.ssh`下

修改完成后保存`config`文件并退出

```
Host #<服务器名称>
  HostName #<服务器ip>
  User #<用户名> #参考CLab文档里的，作者为ubuntu
  IdentityFile "C:\Users\xxxxx\.ssh\sk.pem" #sk.pem文件地址

```

4. 添加主机并连接

修改`ssh 用户名@ip`键入并回车

![示例图片5](	https://hanlife02.com/api/v2/objects/file/zbaj7975n8tpgjvekz.png)


此时，你已经完成了全部流程

下次只需点击扩展中相应主机即可连接

<br>

# 鸣谢
感谢北京大学学生 Linux 俱乐部云计算小组的大佬们🥰🥰🥰
