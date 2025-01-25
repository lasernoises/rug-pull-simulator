<script setup lang="ts">
import { onMounted, computed, ref, watch } from "vue";
import { dbg, init, tick, econ, availableMarketingDevices, type Vec2 } from "./state.ts";

const state = init();

const update = () => {
  tick(state);
  requestAnimationFrame(update);
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

const marketingDevices = computed(() => availableMarketingDevices(state.player));

const avgValue = computed(
  () => state.econs
    .map(e => e.bubble_value)
    .reduce((a, b) => a + b, 0)
    / state.econs.length,
);

const place = () => {
  const pos = mousePos.value!;

  switch (placing.value) {
    case "bubbles":
      state.bubbles.push(pos);
      state.player.bubbles -= 1;
      return;
      // break;
    case "billboard":
      state.billboards.push(pos);
      state.player.marketing_points -= 20;
      break;
  }

  placing.value = null;

  // state.econs.push(econ(
  //   pos,
  //   {x: 1, y: 1, },
  // ));

};

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
          r="16"
        ></circle>
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
      Bubble Stockpile: {{ state.player.bubbles }}
      <br>
      <button
        @click="placing = 'bubbles'"
      >Place Bubbles</button>
      <br>
      <br>
      Last Trade: {{ state.last_trade }}

      <svg v-if="state.price_history.length > -1">
        <polygon
          :points="
            '200,300 0,300 '
              + state.price_history
                  .map((p, i) => `${200 / state.price_history.length * i},${300 - p}` )
                  .join(' ')
          "
        ></polygon>
      </svg>
    </div>
  </div>
</template>

<style scoped>
</style>
