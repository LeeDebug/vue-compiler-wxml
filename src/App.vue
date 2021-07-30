<template>
  <div class="container">
    <div class="title">
      我是一个标题内容
    </div>
    <div
      v-if="isShowList"
      class="cont"
    >
      <ul class="ul">
        <li
          v-for="(msg, idx) in list"
          :key="idx"
          class="listItem"
          @click="handleSend(msg)"
        >
          <span>
            {{idx + 1}}. {{msg.content}}
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script lang='ts'>
export default {
  setup() {
    function handleWapTest() {
      const cur = 1111;
      console.log('======= cur:', cur);
    }
    return {
      handleWapTest,
    };
  },
};
</script>

<style lang="stylus" scoped>
.webchatMsgItem
  width 100%
  padding 0 14px 14px 14px
  & > .systemMsg
    text-align center
    line-height initial
    & > .advertContentMsg
      width fit-content
      margin-left 10px
& > .copyRightCont
  width 100%
  height 34px
</style>

