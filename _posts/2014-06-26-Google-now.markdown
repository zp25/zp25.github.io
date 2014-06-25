---
layout: post
title: 开启Google now
categories: Miscellaneous
---

看世界杯，还有Google I/O，突然就很想用Google now。好不容易找到一篇靠谱的文章，见参看。在Moto g测试成功了，超开心。记录方便以后再有需要。

*之前查了有提到把系统语言改为英文，然后语言搜索说'OK Google'就可以，然后就真试了...*

# 操作过程
## Step 1
打开飞行模式，打开wifi确保网络连接正常

## Step 2
进入Settings > Location > Mode，选择Device only模式

## Step 3
安装应用: [伪装位置][fakegps]

## Step 4
进入应用，设置任意一个美国境内的位置，如直接搜索'Miami'，然后按开始图标。过程中会要求开启mock location设置，在开发者选项中

## Step 5
进入Settings，选择Accounts中的Google，选择Search > Google Account > Sign out，登出Google Search

## Step 6
进入Settings > Apps > All，下拉找到Google Play services，进入后点击Disable，过程中会提示是否将Google Play services的更新卸载恢复到出厂，毫不犹豫点击确定。过程中会要求取消激活Android Device Manager，在Security > Device administrators中

## Step 7
结束后重新进入Settings > Accounts > Google > Search > Google Account，这次是重新登录

## Step 8
点击搜索框，下拉至底部，选择设置，打开Google Now，会进入设置页面，选择I'm in

## Step 9
此时会要求重新打开Google Play Services并要求更新，必须更新。接着是结尾工作，关闭飞行模式，删除伪装位置应用，在Settings > Location > Mode中选择合适的模式

## Step 10
开心的使用

# 参看
+ [How to enable Google Now in Nepal and other countries (Solve - Google Location reporting not available in your region problem)](http://thenepalidroidguy.blogspot.com/2014/02/how-to-enable-google-now_6.html "How to enable Google Now in Nepal and other countries (Solve - Google Location reporting not available in your region problem)")

[fakegps]: https://play.google.com/store/apps/details?id=com.fakegps.mock "伪装位置 Fake GPS Location"
