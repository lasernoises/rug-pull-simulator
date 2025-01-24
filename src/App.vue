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

const placing = ref<"billboard" | null>(null);

const marketingDevices = computed(() => availableMarketingDevices(state.player));

const place = () => {
  const pos = mousePos.value!;
  
  state.econs.push(econ(
    pos,
    {x: 1, y: 1, },
  ));
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


      <circle
        v-if="mousePos !== null"
        :cx="mousePos.x"
        :cy="mousePos.y"
        r="16"
        @click="place"
      ></circle>

    </svg>
    <div style="flex-grow: 1; width: 100%; height: 100%">
      Marketing Points: {{ state.player.marketing_points }}
      <br>
      <button @click="state.player.marketing_points += 1">Brainstorm</button>
      <br>
      <br>
      <button v-if="marketingDevices.billboard" >
        Deploy Billboard
      </button>
    </div>
  </div>
</template>

<style scoped>
</style>
