<script setup lang="ts">
import { onMounted, computed, ref, watch } from "vue";
import { dbg, init, tick, econ, random_pos, params, type Vec2 } from "./state.ts";
import Grave from './Grave.vue';

const state = ref(init());

let speed: number|undefined = undefined;

const update = () => {
  tick(state.value);
  if(speed === undefined){
    requestAnimationFrame(update);
  } else {
    setTimeout(update, speed);
  }
};

const svgElement = ref<SVGGraphicsElement | undefined>();

const mouseMove = (e: MouseEvent) => {
    const element = (e.target! as SVGGraphicsElement);
    const ctm = element.getCTM();

    if (ctm === null) { return; }

    const point = (new DOMPoint(e.offsetX, e.offsetY)).matrixTransform(ctm.inverse());

    mousePos.value = {
      x: point.x,
      y: point.y,
    };
};

watch(svgElement, function (svgElement) {
  if (svgElement !== undefined) {
    svgElement.addEventListener("mousemove", e => {
      mouseMove(e);
    });
    svgElement.addEventListener("mouseleave", e => {
      mousePos.value = null
      // debugger;
    });
  }
});

const mousePos = ref<Vec2 | null>(null);//{x: 0, y: 0};

onMounted(() => {
  update();
});

const placing = ref<"bubbles" | "billboard" | null>(null);

const marketingDevices = computed(() => ({
  billboard: state.value.player.marketing_points >= params.billboard_price,
  influencer: state.value.player.marketing_points >= 50,
}));

const avgValue = computed(
  () => state.value.econs
    .map(e => e.bubble_value)
    .reduce((a, b) => a + b, 0)
    / state.value.econs.length,
);

const bulk_place_bubbles = () => {
  for (let i = 0; i < params.bubbles_bulk_place_amount; i++) {
    if (state.value.player.bubbles === 0) {
      return;
    }
    state.value.bubbles.push(random_pos());
    state.value.player.bubbles -= 1;
  }
};

const place = () => {
  const pos = mousePos.value!;

  switch (placing.value) {
    case "bubbles":
      if (state.value.player.bubbles === 0) {
        return;
      }
      state.value.bubbles.push(pos);
      state.value.player.bubbles -= 1;
      return;
      // break;
    case "billboard":
      state.value.billboards.push(pos);
      state.value.player.marketing_points -= 20;
      break;
  }

  placing.value = null;

  // state.econs.push(econ(
  //   pos,
  //   {x: 1, y: 1, },
  // ));

};

const reset = () => {
  state.value = init();
};

const max_price = computed(() => {
  return Math.max(0, ...state.value.price_history);
});
</script>

<template>
  <div style="display: flex; width: 100%; height: 100%">
    <svg
      style="flex-grow: 2; width: 100%; height: 100%; pointer-events: visible;"
      viewBox="-512 -512 1024 1024"
      ref="svgElement"
    >
      <circle
        r="512"
        fill="lightblue"
      ></circle>

      <template
        v-for="econ in state.econs"
      >
        <circle
          :cx="econ.pos.x"
          :cy="econ.pos.y"
          :fill="`rgb(${econ.food}, ${econ.bubbles}, ${econ.bubble_value})`"
          r="16"
        ></circle>
        <text
          :x="econ.pos.x - 10"
          :y="econ.pos.y"
          fill="lightgreen"
          style="font-size: 12px"
        >{{ econ.bubbles }}/{{ Math.round(econ.bubble_value) }}</text>
        <text
          :x="econ.pos.x - 8"
          :y="econ.pos.y + 12"
          fill="white"
          style="font-size: 12px"
        >{{ econ.food }}</text>
      </template>

      <template
        v-for="econ in state.dead_econs"
      >
        <Grave
          :cx="econ.pos.x"
          :cy="econ.pos.y"
        ></Grave>
      </template>

      <template
        v-for="pos in state.billboards"
      >
        <circle
          :cx="pos.x"
          :cy="pos.y"
          r="16"
          fill="red"
        ></circle>
      </template>

      <template
        v-for="pos in state.food"
      >
        <circle
          :cx="pos.x"
          :cy="pos.y"
          r="16"
          fill="yellow"
        ></circle>
      </template>

      <template
        v-for="pos in state.bubbles"
      >
        <circle
          :cx="pos.x"
          :cy="pos.y"
          r="16"
          fill="green"
        ></circle>
      </template>

      <circle cx="0" cy="0" r="32" fill="blue"/>

      <template v-if="mousePos !== null">
        <circle
          v-if="placing === 'billboard'"
          :cx="mousePos.x"
          :cy="mousePos.y"
          r="16"
          @click="place"
          fill="red"
        ></circle>

        <circle
          v-else-if="placing === 'bubbles'"
          :cx="mousePos.x"
          :cy="mousePos.y"
          r="16"
          @click="place"
          fill="green"
        ></circle>
      </template>

    </svg>
    <div style="flex-grow: 1; width: 100%; height: 100%">
      <button type="checkbox" @click="speed = 0">Max Speed</button>
      <br>
      Marketing Points: {{ state.player.marketing_points }}
      <br>
      <button @click="state.player.marketing_points += 20">Brainstorm</button>
      <br>
      <br>
      <button
        v-if="marketingDevices.billboard"
        @click="placing = 'billboard'"
      >
        Deploy Billboard
      </button>
      <br>
      <br>
      Avg. Value: {{ avgValue }}
      <br>
      <br>
      Bubble Stockpile: {{ state.player.bubbles }} <br/>
      Food: {{ state.player.food }}
      <br>
      <button
        @click="placing === 'bubbles' ? placing = null : placing = 'bubbles'"
      >Place Bubbles</button>
      <br>
      <button
        @click="bulk_place_bubbles"
      >Bulk Place Bubbles</button>
      <br>
      Last Trade: {{ state.last_trade }}

      <svg
        v-if="state.price_history.length > -1"
        width="256"
        height="128"
      >
        <polygon
          :points="
            '256,128 0,128 '
              + state.price_history
                  .map((p, i) => `${256 / state.price_history.length * i},${128 - p / max_price * 128}` )
                  .join(' ')
          "
          fill="white"
        ></polygon>
      </svg>
      <br>
      <br>
      <template v-for="param, name in params">
        <br>
        {{ name }}:
        <input type="number" v-model="params[name]"/>
      </template>
      <br>Selling Price:<input type="number" v-model="state.player.selling_price">
      <br>Buying Price:<input type="number" v-model="state.player.buying_price">
      <br>
      <br>
      <button @click="reset">Reset</button>
    </div>
  </div>
</template>

<style scoped>
</style>
