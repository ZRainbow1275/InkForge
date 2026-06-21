# 公式与代码的知乎专栏验收

本文用于验证学术专栏在知乎 clean Markdown 通道里的公式、脚注、引用和代码块。

## 公式段落

能量关系使用块级公式表达：

<img src="https://www.zhihu.com/equation?tex=E%3Dmc%5E2" alt="E=mc^2" class="ee_img tr_noresize" eeimg="1">

行内公式使用 <img src="https://www.zhihu.com/equation?tex=a%5E2%2Bb%5E2%3Dc%5E2" alt="a^2+b^2=c^2" class="ee_img tr_noresize" eeimg="1">，并保留解释文本。

> 公式必须可预览；如果平台不接受公式图片，后续必须走图片 fallback，不可直接宣称发布成功。

## 脚注与代码

这是一个带脚注的结论。[^note]

```ts
export const stable = true
```

[^note]: 本地 artifact 只证明 clean Markdown 输出，不证明知乎平台预览或发布。
