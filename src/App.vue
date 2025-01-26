<script setup lang="ts">
import { onMounted, computed, ref, watch } from "vue";
import { dbg, init, tick, econ, random_pos, params, type Vec2 } from "./state.ts";
import { scale, normalize, sub, add } from "./vector-algebra.ts";
import Grave from './Grave.vue';

const state = ref(init());

let speed: number|undefined = undefined;
let isPaused: boolean = false;

const update = () => {

  if (!isPaused) {
    tick(state.value);
  }

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

const placing = ref<"bubbles" | "billboardFirstLeg" | "billboardSecondLeg" | null>(null);
const previousLeg = ref<Vec2|null>(null);
const nextLeg = computed(() => {
  const pretty = a => `${a.x} ${a.y}`;
  let result = add(previousLeg.value, scale(normalize(sub(mousePos.value, previousLeg.value)), params.billboard_length));
  console.warn(`Previous: ${pretty(previousLeg.value)};
    Next: ${pretty(mousePos.value)};
    minus: ${pretty(sub(mousePos.value, previousLeg.value))};
    normalize: ${pretty(normalize(sub(mousePos.value, previousLeg.value)))};
    scale: ${pretty(scale(normalize(sub(mousePos.value, previousLeg.value)), params.billboard_length))};
    add: ${pretty(add(previousLeg.value, scale(normalize(sub(mousePos.value, previousLeg.value)), params.billboard_length)))};
    Computing nextLeg as ${pretty(result)}`);
  return result;
});

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

const onSvgClick = () => {
  const pos = mousePos.value!;

  switch (placing.value) {
    case "bubbles":
      if (state.value.player.bubbles <= 0) {
        return;
      }
      state.value.bubbles.push(pos);
      state.value.player.bubbles -= 1;
      return;
      // break;
    case "billboardFirstLeg":
      previousLeg.value = pos;
      placing.value = "billboardSecondLeg";
      break;
    case "billboardSecondLeg":
      state.value.billboards.push([previousLeg.value, nextLeg.value]);
      state.value.player.marketing_points -= 20;
      placing.value = null;
  };
}

const reset = () => {
  state.value = init();
  isPaused = false;
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
      @click="onSvgClick"
    >
      <circle
        r="512"
        fill="lightblue"
      ></circle>

      <template
        v-for="econ in state.dead_econs"
      >
        <Grave
          :cx="econ.pos.x"
          :cy="econ.pos.y"
        ></Grave>
      </template>

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
        v-for="pos in state.billboards"
      >
        <line
          :x1="pos[0].x"
          :y1="pos[0].y"
          :x2="pos[1].x"
          :y2="pos[1].y"
          stroke-width="4"
          stroke="red"
        ></line>
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
          v-if="placing === 'billboardFirstLeg'"
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

        <line
          v-else-if="placing === 'billboardSecondLeg'"
          :x1="previousLeg.x"
          :y1="previousLeg.y"
          :x2="nextLeg.x"
          :y2="nextLeg.y"
          stroke-width="8"
          stroke="red"
        ></line>
      </template>

    </svg>
    <div style="flex-grow: 1; width: 100%; height: 100%">
      <div style="display: flex; gap: 10px; margin-left: auto;">
        <button type="button" @click="speed = 0; isPaused=false">Max speed</button>
        <button type="button" @click="isPaused = !isPaused">Pause</button>
        <button @click="reset">Reset</button>
      </div>

      <br>
      Marketing Points: {{ state.player.marketing_points }}
      <br>
      <button @click="state.player.marketing_points += 20">Brainstorm</button>
      <br>
      <br>
      <button
        v-if="marketingDevices.billboard"
        @click="placing = 'billboardFirstLeg'"
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
                  .map((p, i) => `${256 / (state.price_history.length - 1) * i},${128 - p / max_price * 128}` )
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
    </div>
  </div>
</template>

<style scoped>
</style>
