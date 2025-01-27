<script setup lang="ts">
import { onMounted, computed, ref, watch, shallowRef, triggerRef } from "vue";
import { dbg, init, tick, econ, random_pos, params } from "./state.ts";
import { scale, normalize, sub, add, type Vec2 } from "./vector-algebra.ts";
import Grave from './Grave.vue';
import Econ from "./Econ.vue";
import { doTutorial } from './tutorial';

const state = shallowRef(init());

//let speed: number|undefined = undefined;
let isPaused = ref(false);
let activateMaxSpeed = ref(false);
let cashOut = ref(false);
let activateDebugBuild = ref(false);
let isGameOver = ref(false);
let validCheatCode = ref("DEBUG1234");
let cheatCodeInput = ref("");
let isCheatCodeValid = ref(false);

const tutorialDone = ref<boolean>(localStorage.getItem("tutorialDone") !== null);
const tutorialHighlighter = ref<Vec2|null>(null);

watch(tutorialDone, (val: boolean) => {
  if(val) localStorage.setItem("tutorialDone", "y");
  else {
    localStorage.removeItem("tutorialDone");
    doTutorial(isPaused, state, tutorialHighlighter, placing).then(() => { tutorialDone.value = true; });
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

    handleGameOver(alive);

    if (cashOut.value) {
      handleCashOut();
    }
  }
  triggerRef(state);
  requestAnimationFrame(update);
};

const handleGameOver = (alive: boolean) => {
    console.log("hgo");
    if (!alive) {
      window.alert("Game Over! You can't feed your marketing department / influencer hype-squad anymore!");
      reset();
    }

    if ((state.value.econs.length === 0) && !isGameOver.value) {
      isGameOver.value = true;
      return; // need to draw one more tick so that last econ icon changes to cross
    }
    if (isGameOver.value) {
      window.alert("Everyone is dead! Take the money and run!");
      handleCashOut();
    }
};

const handleCashOut = () => {
  let cashOutval = Math.round(state.value.player.food * 100) / 100;
  let prevHighScore = Math.round(state.value.highscore * 100) / 100;
  if (state.value.player.food > state.value.highscore) {
    window.alert(`Cashed out! You collected $${cashOutval}! This is a new highscore! (Previous highscore: $${prevHighScore})`);
  } else {
    window.alert(`Cashed out! You collected $${cashOutval}. Try again to beat your highscore of $${prevHighScore}!`);
  }
  reset();
};

const checkCheatCode =() => {
      isCheatCodeValid.value = cheatCodeInput.value === validCheatCode.value;
};

const togglePause = () => {
  isPaused.value = !isPaused.value;
};

const toggleDebug = () => {
  activateDebugBuild.value = !activateDebugBuild.value;
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
  if(!tutorialDone.value) {
    setTimeout(() => { doTutorial(isPaused, state, tutorialHighlighter, placing).then(() => { tutorialDone.value = true; }); }, 1000);
  }
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
  isGameOver.value = false;
};


const max_price = computed(() => {
  return Math.max(0, ...state.value.price_history);
});

const max_player_food = computed(() => {
  return Math.max(0, ...state.value.player_food_history);
});

</script>

<template>
  <div style="display: flex; gap: 16px; padding: 16px; width: 100%; height: 100%">
    <svg
      style="flex-grow: 2; width: 100%; height: 100%; pointer-events: visible;"
      viewBox="-512 -512 1024 1024"
      ref="svgElement"
      id="svgCanvas"
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

        <text
          :x="pos.x - 7"
          :y="pos.y + 8"
          fill="green"
          style="font-size: 24px; font-family: monospace;"
        >$</text>
      </template>

      <template
        v-for="pos in state.bubbles"
      >
        <circle
          :cx="pos.x"
          :cy="pos.y"
          r="16"
          fill="#90a0ff70"
          stroke="blue"
          stroke-width="2"
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
          <Econ
            :x="econ.pos.x"
            :y="econ.pos.y"
            :food="econ.food"
            :bubbles="econ.bubbles"
            :bubble_value="econ.bubble_value"
            :activate-debug-build="activateDebugBuild"
          ></Econ>
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

        <text
          :x="influencer.pos.x - 7"
          :y="influencer.pos.y + 8"
          fill="white"
          style="font-size: 24px; font-family: monospace;"
        >I</text>
      </template>

      <template
        v-for="popup in state.cash_popups"
      >
        <text
          :x="popup.pos.x"
          :y="popup.pos.y"
          :fill-opacity="`${popup.remaining_time / 60}`">${{ Math.round(popup.value * 100) / 100 }}
        </text>
      </template>

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
          fill="#90a0ff70"
          stroke="blue"
          stroke-width="2"
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

      <circle
        v-if="tutorialHighlighter !== null"
        r="30"
        :cx="tutorialHighlighter.x"
        :cy="tutorialHighlighter.y"
        class="tutorial-highlight"
        fill="transparent"
        stroke="yellow"
        stroke-width="2px"
      ></circle>

    </svg>
    <div style="flex-grow: 1; width: 100%; height: 100%">
      <br>
      <div style="display: flex; gap: 10px; margin-left: auto;">
        <button type="button" @click=togglePause>{{ isPaused ? 'Unpause' : 'Pause' }}</button>
        <button type="button" @click=toggleMaxSpeed>{{ activateMaxSpeed ? 'Normal Speed' : 'Max Speed' }}</button>
        <button v-if="activateDebugBuild" type="button" @click="reset">Reset</button>
        <button type="button" @click="cashOut = true">Cash Out</button>
        <button v-if="tutorialDone" @click="ev => { tutorialDone = false; ev.stopPropagation(); }">Redo tutorial</button>
        <!-- Button is displayed only when cheat code is correct -->
        <button 
          v-if="isCheatCodeValid" 
          type="button" 
          @click="toggleDebug"
        >
          {{ activateDebugBuild ? 'Deactivate Debug' : 'Activate Debug' }}
        </button>
    </div>
    <br>
      <!----------------- MARKETING ----------------->

      <hr>
      <h2>Marketing</h2>
      <div>Marketing Points: {{ state.player.marketing_points }}</div>
      <div>Marketing Cost: -${{ state.playerFoodCostPerSecond }} / second</div>
      <br>
      <button
        @click="state.player.marketing_points += params.marketing_point_increment"
        :disabled="isPaused"
        id="marketingFirstButton"
      >Brainstorm</button>
      <span style="margin-left: 6px;">(+1 Marketing Points)</span>
      <br>
      <div v-if="activateDebugBuild">
        <button
            @click="state.player.marketing_points += 100"
          >+100 Marketing Points
        </button>
        <br>
      </div>
      <button
        :disabled="state.player.marketing_points < params.billboard_price"
        @click="placing = 'billboardFirstLeg'"
        id="marketingBillboardButton"
      >
        Deploy Billboard
      </button>
      
      <span style="margin-left: 6px;">(-{{ params.billboard_price }} Marketing Points)</span>
      
      <template v-if="state.player.marketing_people">
        <br>
        Marketing People: {{ state.player.marketing_people }}
      </template>
      <br>
      <button
      :disabled="state.player.food <= 2 * state.player.marketing_people * params.marketing_person_salary + params.marketing_person_salary"
        @click="state.player.marketing_people += 1"
      >
        Hire Marketing Person
      </button>
      <span style="margin-left: 6px;">(+1 Marketing Points / second, -${{ 2 * state.player.marketing_people * params.marketing_person_salary + params.marketing_person_salary }} / second)</span>
      <br>
      <button
        :disabled="state.player.food <= params.influencer_salary"
        @click="place_influencer"
      >
        Hire Influencer
      </button>
      <span style="margin-left: 6px;">(-${{ params.influencer_salary }} / second)</span>
      <br>

      <!----------------- ECONOMY ----------------->
      <br>
      <hr>
      <h2>Player Economy</h2>
      <div style="display: flex; gap: 10px; margin-left: auto; margin-top: 0.5em;">
        <button 
          id="placeBubblesButton"
          @click="placing === 'bubbles' ? placing = null : placing = 'bubbles'"
        >Place Bubbles</button>
        <button @click="bulk_place_bubbles">Mass Place Bubbles</button>
        <button @click="rug_pull">Pull Rug</button>
      </div>
      <div v-if="activateDebugBuild">
        <button
            @click="state.player.food += 1000"
          >+$1000
        </button>
        <br>
      </div>
      <div style="margin-top: 0.5em">Bubble Stockpile: {{ state.player.bubbles }}</div>
      <div style="margin-top: 0.5em;"><span id="foodScore">Player: ${{ Math.round(state.player.food * 100) / 100 }} (Highscore: ${{ Math.round(state.highscore * 100) / 100 }})</span></div>
      <svg
        v-if="state.player_food_history.length > -1"
        width="100%"
        height="128"
        preserveAspectRatio="none"
        viewBox="0 0 256 128"
      >
        <polygon
          :points="
            '256,128 0,128 '
              + state.player_food_history
                  .map((p, i) => `${256 / (state.player_food_history.length - 1) * i},${128 - p / max_player_food * 128}` )
                  .join(' ')
          "
          fill="white"
        ></polygon>
      </svg>


      <br>
      <hr>
      <h2>Price History</h2>
      Current Bubble Price: ${{ Math.round(state.avgValue * 100) / 100 }}
      <span v-if="activateDebugBuild" style="margin-left: 6px;">
        (Deprecation factor: {{ Math.round(state.deprecationFactor * 100) / 100 }})
      </span>
      <br>
      <!-- <br> -->
      <!-- Last Trade: {{ state.last_trade }} -->
      <br>
      <svg
        v-if="state.price_history.length > -1"
        width="100%"
        height="128"
        preserveAspectRatio="none"
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
      <template v-if="activateDebugBuild" v-for="param, name in params">
        <br>
        {{ name }}:
        <input type="number" v-model="params[name]"/>
      </template>
      <br>
      <br>

      <div v-if="false">
      <h3>Legend</h3>

      Bubble:

      <svg width="32"
        height="32"
        preserveAspectRatio="none"
        viewBox="-20 -20 36 36">
        <circle
          :cx="0"
          :cy="0"
          r="14"
          fill="#90a0ff70"
          stroke="blue"
          stroke-width="2"
        ></circle>
      </svg>

      Food:

      <svg width="32"
        height="32"
        preserveAspectRatio="none"
        viewBox="-20 -20 36 36">
        <circle
          :cx="0"
          :cy="0"
          r="14"
          fill="yellow"
        ></circle>
      </svg>
    </div>
     <br>
     <br>
     <br>
     <br>
     <br>
     <br>
     <br>
     <br>
      <!-- Input field for entering the cheat code -->
      <input 
        v-if="!isCheatCodeValid"
        type="text" 
        v-model="cheatCodeInput" 
        placeholder="Enter cheat code"
        @input="checkCheatCode"
      />
    </div>
  </div>
</template>

<style scoped>
  .tutorial-highlight:not(:disabled) {
    animation-name: blink-border;
    animation-duration: 2s;
    animation-timing-function: ease-in;
    animation-iteration-count: infinite;
  }

  @keyframes blink-border {
    from {
      border: 2pt solid yellow;
    }
    to {
      border: 2pt solid transparent;
    }
  }

  @keyframes blink {
    from { stroke: yellow; }
    to { stroke: transparent; }
  }

  #tutorialHighlightSvg {
    animation-name: blink;
  }
</style>
