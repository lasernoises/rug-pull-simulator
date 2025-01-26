<script setup lang="ts">
import { onMounted, computed, ref, watch, shallowRef, triggerRef } from "vue";
import { dbg, init, tick, econ, random_pos, params } from "./state.ts";
import { scale, normalize, sub, add, type Vec2 } from "./vector-algebra.ts";
import Grave from './Grave.vue';
import { doTutorial } from './tutorial';

const state = shallowRef(init());

//let speed: number|undefined = undefined;
let isPaused = ref(false);
let activateMaxSpeed = ref(false);
let cashOut = ref(false);

const tutorialDone = ref<boolean>(localStorage.getItem("tutorialDone") !== null);

if(!tutorialDone.value) {
  doTutorial().then(() => { tutorialDone.value = true; });
}
watch(tutorialDone, (val: boolean) => {
  if(val) localStorage.setItem("tutorialDone", "y");
  else {
    localStorage.removeItem("tutorialDone");
    doTutorial().then(() => { tutorialDone.value = true; });
  }
});

const update = () => {
  if (!isPaused.value) {
    let alive = tick(state.value);
    if (alive && activateMaxSpeed.value) {
      for (let i = 0; i < 10; i++) {
        if (!tick(state.value)) {
          alive = false;
          break;
        };
      }
    }

    if (!alive) {
      window.alert("Game Over! You can't feed your marketing department / influencer hype-squad anymore!");
      reset();
    }

    if (cashOut.value) {
      handleCashOut();
    }
  }
  triggerRef(state);
  requestAnimationFrame(update);
  /*
  if(speed === undefined){
    requestAnimationFrame(update);
  } else {
    setTimeout(update, speed);
  }*/
};

const handleCashOut = () => {
  let cashOutval = Math.round(state.value.player.food * 100) / 100;
  if (state.value.player.food > state.value.highscore) {
    window.alert(`Cashed out! You collected ${cashOutval} food! This is a new highscore! (Previous highscore: ${state.value.highscore})`);
  } else {
    window.alert(`Cashed out! You collected ${cashOutval} food. Try again to beat your highscore of ${state.value.highscore}!`);
  }
  reset();
};

const togglePause = () => {
  isPaused.value = !isPaused.value;
};

const toggleMaxSpeed = () => {
  activateMaxSpeed.value = !activateMaxSpeed.value;
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
  let result = add(previousLeg.value, scale(normalize(sub(mousePos.value, previousLeg.value)), params.billboard_length));
  return result;
});

const marketingDevices = computed(() => ({
  billboard: state.value.player.marketing_points >= params.billboard_price,
  influencer: state.value.player.marketing_points >= 50,
}));

const bulk_place_bubbles = () => {
  for (let i = 0; i < params.bubbles_bulk_place_amount; i++) {
    if (state.value.player.bubbles === 0) {
      return;
    }
    state.value.bubbles.push(random_pos());
    state.value.player.bubbles -= 1;
  }
};

const rug_pull = () => {
  for (let i = 0; i < state.value.player.bubbles; i++) {
    state.value.bubbles.push(random_pos());
  }
  state.value.player.bubbles = 0;
};

const place_influencer = () => {
  state.value.influencers.push({
    pos: random_pos(),
    velocity: {
        x: Math.random() * 2 - 1,
        y: Math.random() * 2 - 1,
    },
  });
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
      if (state.value.player.marketing_points < params.billboard_price) {
        return;
      }
      previousLeg.value = pos;
      placing.value = "billboardSecondLeg";
      break;
    case "billboardSecondLeg":
      state.value.billboards.push([previousLeg.value!, nextLeg.value]);
      state.value.player.marketing_points -= params.billboard_price;
      placing.value = state.value.player.marketing_points < params.billboard_price
        ? null
        : "billboardFirstLeg";
  };
}

const reset = () => {
  if (state.value.player.food > state.value.highscore) {
    state.value.highscore = state.value.player.food;
  }
  window.localStorage.setItem("highscore", String(state.value.highscore));
  state.value = init();
  isPaused.value = false;
  activateMaxSpeed.value = false;
  cashOut.value = false;
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
        >{{ Math.round(econ.food) }}</text>
      </template>

      <template
        v-for="influencer in state.influencers"
      >
        <circle
          :cx="influencer.pos.x"
          :cy="influencer.pos.y"
          fill="red"
          r="16"
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
        <!---<button type="button" @click="speed = 0; isPaused=false">Default speed</button>--->
        <button type="button" @click=togglePause>{{ isPaused ? 'Unpause' : 'Pause' }}</button>
        <button type="button" @click=toggleMaxSpeed>{{ activateMaxSpeed ? 'Normal Speed' : 'Max Speed' }}</button>
        <button type="button" @click="reset">Reset</button>
        <button type="button" @click="cashOut = true">Cash Out</button>
      </div>
      <button v-if="tutorialDone" @click="ev => { tutorialDone = false; ev.stopPropagation(); }">Redo tutorial</button>

      <br>
      Marketing Points: {{ state.player.marketing_points }}
      <br>
      <button
        @click="state.player.marketing_points += params.marketing_point_increment"
        :disabled="isPaused"
        id="marketingFirstButton"
      >Brainstorm</button>
      <br>
      <button
        v-if="marketingDevices.billboard"
        @click="placing = 'billboardFirstLeg'"
      >
        Deploy Billboard
      </button>
      <br>
      <br>
      <template v-if="state.player.marketing_people">
        Marketing People: {{ state.player.marketing_people }}
      </template>
      <br>
      <button
        v-if="state.player.food >= params.marketing_person_salary"
        @click="state.player.marketing_people += 1"
      >
        Hire Marketing Person ({{ params.marketing_person_salary }} food / second)
      </button>
      <br>
      <br>
      <button
        v-if="state.player.food >= params.influencer_salary"
        @click="place_influencer"
      >
        Hire Influencer ({{ params.influencer_salary }} food / second)
      </button>
      <br>
      <br>
      Avg. Value: {{ Math.round(state.avgValue * 100) / 100 }}
      <br>
      Deprecation factor: {{ Math.round(state.deprecationFactor * 100) / 100 }}
      <br>
      Bubble Stockpile: {{ state.player.bubbles }} <br/>
      <span id="foodScore">Food: {{ Math.round(state.player.food * 100) / 100 }} (Highscore: {{ Math.round(state.highscore * 100) / 100 }})</span>
      <br>
      <div style="display: flex; gap: 10px; margin-left: auto;">
        <button 
          @click="placing === 'bubbles' ? placing = null : placing = 'bubbles'"
        >Place Bubbles</button>
        <br>
        <button @click="bulk_place_bubbles">Mass Place Bubbles</button>
        <button @click="rug_pull">Pull Rug</button>
      </div>
      <br>
      <!-- <br> -->
      <!-- Last Trade: {{ state.last_trade }} -->
      <br>
      Price History
      <br>
      <br>
      <svg
        v-if="state.price_history.length > -1"
        width="100%"
        height="128"
        viewBox="0 0 256 128"
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
  .tutorial-highlight {
    animation-name: blink;
    animation-duration: 2s;
    animation-timing-function: ease-in;
    animation-iteration-count: infinite;
  }

  @keyframes blink {
    from {
      border: 2pt solid yellow;
    }
    to {
      border: 2pt solid transparent;
    }
  }
</style>
