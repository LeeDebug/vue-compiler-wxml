const fs = require('fs');
const compiler = require('vue-template-compiler');

// 读取 *.vue 文件（因为是从 pkg.json 中调用需要使用与其相对的路径，所以不能用与该文件相对的路径，否则会报错）
const vueFileContent = fs.readFileSync('src/App.vue', 'utf8');
const sfc = compiler.parseComponent(vueFileContent);

//#region 壹。处理 template 模板
// console.log('======= sfc.template:\n', sfc.template);

// 递归生成 所需要的文本
function createWxml (node) {
  // let templateString = '';
  const { startTag, endTag, children } = node;
  let childrenString = '';
  if (children && children.length) {
    childrenString = children.reduce((allString, curentChild) => {
      const curentChildString = createWxml(curentChild);
      return `${allString}\n${curentChildString}\n`;
    }, '');
  }
  return `${startTag}${childrenString}${endTag}`;
}

// 这个函数是处理 AttrsMap，把 AttrsMap 的所有值 合并成一个字符串
function handleAttrsMap (attrsMap) {
  let stringExpression = '';
  stringExpression = Object.entries(attrsMap).map(([key, value]) => {
    // 替换 bind 的
    if (key.charAt(0) === ':') {
      return `${key.slice(1)}="{{${value}}}"`;
    }
    // 统一做成 bindtap
    if (key === '@click') {
      const [ name, params ] = value.split('(');
      let paramsList;
      let paramsString = '';
      if (params) {
        paramsList = params.slice(0, params.length - 1).replace(/\'|\"/g, '').split(',');
        paramsString = paramsList.reduce((all, cur) => {
          return `${all} data-${cur.trim()}="${cur.trim()}"`;
        }, '');
      }
      return `bindtap="${name}"${paramsString}`;
    }
    if (key === 'v-model') {
      return `value="{{${value}}}"`;
    }
    if (key === 'v-if') {
      return `wx:if="{{${value}}}"`;
    }
    if (key === 'v-else-if') {
      return `wx:elif="{{${value}}}"`;
    }
    if (key === 'v-else') {
      return `wx:else`;
    }
    if (key === 'v-for') {
      const [ params, list ] = value.split('in ');
      const paramsList = params.replace(/\(|\)/g, '').split(',');
      const [item, index] = paramsList;
      const indexString = index ? ` wx:for-index="${index.trim()}"` : '';
      return `wx:for="{{${list.trim()}}}" wx:for-item="${item.trim()}"${indexString}`;
    }
    return `${key}="${value}"`;
  }).join(' ');
  return stringExpression;
}

// 处理标签的 tag 名称
function handleTag  ({ attrsMap, tag}) {
  let stringExpression = '';
  if (attrsMap) {
    stringExpression = handleAttrsMap(attrsMap)
  }
  return `<${tag} ${stringExpression}>`;
}

// 生成开始标签
function generateStartTag (node) {
  let startTag;
  const { tag, attrsMap, type, isComment, text } = node;
  // 如果是注释
  if (type === 3) {
    startTag = isComment ? `<!-- ${text} -->` : text;
    return startTag;
  }
  // 如果是表达式节点
  if (type === 2) {
    startTag = text.trim();
    return startTag;
  }
  switch (tag) {
    case 'div':
    case 'p':
    case 'span':
    case 'ul':
    case 'li':
    case 'em':
      startTag = handleTag({ tag: 'view', attrsMap });
      break;
    case 'img':
      startTag = handleTag({ tag: 'image', attrsMap });
      break;
    case 'template':
      startTag = handleTag({ tag: 'block', attrsMap });
      break;
    default:
      startTag = handleTag({ tag, attrsMap });
  }
  return startTag;
}

// 生成结束标签
function generateEndTag (node) {
  let endTag;
  const { tag, attrsMap, type, isComment, text } = node;
  // 如果是表达式节点或者注释
  if (type === 3 || type === 2) {
    endTag = '';
    return endTag;
  }
  switch (tag) {
    case 'div':
    case 'p':
    case 'span':
    case 'ul':
    case 'li':
    case 'em':
      endTag = '</view>';
      break;
    case 'img':
      endTag = '</image>';
      break;
    case 'template':
      endTag = '</block>';
      break;
    default:
      endTag = `</${tag}>`;
  }
  return endTag;
}

// 递归生成 首尾标签
function generateTag (node) {
  let children = node.children;
  // 如果是if表达式 需要做如下处理
  if (children && children.length) {
    let ifChildren;
    const ifChild = children.find(subNode => subNode.ifConditions && subNode.ifConditions.length);
    if (ifChild) {
      const ifChildIndex = children.findIndex(subNode => subNode.ifConditions && subNode.ifConditions.length);
      ifChildren = ifChild.ifConditions.map(item => item.block);
      delete ifChild.ifConditions;
      children.splice(ifChildIndex, 1, ...ifChildren)
    }
    children.forEach((subNode) => {
      generateTag(subNode)
    })
  }
  node.startTag = generateStartTag(node);
  // 生成开始标签
  node.endTag = generateEndTag(node);
  //生成结束标签
}

// 将开始标签和结束标签合并
// 拿到开始标签和结束标签之后，接下来就是重组代码了。
function handleTagsTree (topTreeNode) {
  // 为每一个节点生成开始标签和结束标签
  generateTag(topTreeNode);
  return createWxml(topTreeNode);
};

function parseHtml (tagsTree) {
  const parse = handleTagsTree(tagsTree);
  return parse;
}

const comRes = compiler.compile(sfc.template.content, {
  comments: true,
  preserveWhitespace: false,
  shouldDecodeNewlines: true,
});
// console.log('======= comRes:', comRes);
const astTplRes = comRes.ast;
// console.log('======= astTplRes:', astTplRes);
const wxmlResult = parseHtml(astTplRes);
console.log('Vue 的 Template 模板 ==> 微信 的 Wxml 模板，结果如下所示:\n\n', wxmlResult);
// 写入文件
fs.writeFileSync('wx/index.wxml', wxmlResult);

//#endregion

//#region // todo 贰。处理 script 模板
// console.log('======= sfc.script:\n', sfc.script);

//#endregion

//#region // todo 叁。处理 style 模板
// console.log('======= sfc.styles:\n', sfc.styles);

// const postcss = require('postcss');
// const less = require('postcss-less-engine');
// const clean = require('postcss-clean');
// const rem2rpx = require('postcss-rem2rpx');
// 将styles数组中的content合并成一个字符串
// const stylesSting = sfc.styles.reduce((pre, cur) => {  return pre + cur.content.trim() + '\n'}, '')
// postcss([
//   less({ strictMath: true }),
//   rem2rpx({ rootFontSize: 50 }),
//   clean()
// ])
//   .process(stylesSting, { parser: less.parser, from: 'res-styles-ast.less' })
//   .then(
//     (result) =>{
//       // console.log('======= result:\n', result);
//       // fs.writeFileSync('./style/index.wxss', result.css);
//     },
//     (err) =>{ console.log(err); }
//   );

//#endregion

//#region // todo 肆。处理其他
// console.log('======= sfc.customBlocks:\n', sfc.customBlocks);
// console.log('======= sfc.errors:\n', sfc.errors);
//#endregion
